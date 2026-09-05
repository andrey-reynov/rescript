import { app, dialog, ipcMain, shell, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ProjectFiles, sourceReference, type ProjectData } from "./project-files";

export function installProjectIpc(getWindow: (event: IpcMainInvokeEvent) => BrowserWindow | null) {
  const projects = new ProjectFiles(path.join(app.getPath("userData"),"project-library.json"), path.join(app.getPath("documents"),"Rescript Projects"));
  const handle = (name: string, fn: (event: IpcMainInvokeEvent, ...args: never[]) => unknown) => {
    ipcMain.handle(`project:${name}`, (event,...args) => {
      if (!getWindow(event)) throw new Error("Untrusted project request.");
      return fn(event,...args as never[]);
    });
  };
  const data = (input: ProjectData) => {
    if (!input || typeof input.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(input.id) || typeof input.name !== 'string' || !input.name.trim() || !Array.isArray(input.words) || !['video','audio'].includes(input.mediaKind) || !Number.isFinite(input.duration)) throw new Error('Invalid project data.');
    return input;
  };
  handle('folder',()=>projects.folder());
  handle('choose-folder',async event=>{
    const result=await dialog.showOpenDialog(getWindow(event)!,{title:'Default project folder',defaultPath:await projects.folder(),properties:['openDirectory','createDirectory']});
    if(result.canceled) return null;
    await projects.setFolder(result.filePaths[0]);
    return projects.folder();
  });
  handle('list',()=>projects.list());
  handle('create',async (_event,input:ProjectData,sourcePath:string)=>{
    if(!sourcePath) throw new Error('Choose the source file from disk to create a desktop project.');
    return projects.create(data(input),await sourceReference(sourcePath));
  });
  handle('save',(_event,id:string,input:ProjectData)=>projects.save(id,data(input)));
  handle('read',async (_event,id:string)=>({...(await projects.read(id)),filePath:await projects.fileFor(id)}));
  handle('media',async (_event,id:string)=>{await projects.mediaPath(id);return `app://localhost/__media/${encodeURIComponent(id)}`;});
  handle('open',async event=>{
    const result=await dialog.showOpenDialog(getWindow(event)!,{title:'Open project',defaultPath:await projects.folder(),filters:[{name:'Rescript project',extensions:['rescript']}],properties:['openFile']});
    if(result.canceled) return null;
    return (await projects.register(result.filePaths[0])).id;
  });
  handle('save-as',async (event,id:string,input:ProjectData)=>{
    const old=await projects.read(id);
    const result=await dialog.showSaveDialog(getWindow(event)!,{title:'Save Project As',defaultPath:path.join(await projects.folder(),`${input.name.replace(/[<>:"/\\|?*]/g,'_')}-copy.rescript`),filters:[{name:'Rescript project',extensions:['rescript']}]});
    if(result.canceled || !result.filePath) return null;
    return projects.create({...data(input),id:randomUUID()},old.media,result.filePath);
  });
  handle('relink',async (event,id:string)=>{
    const old=await projects.read(id);
    const result=await dialog.showOpenDialog(getWindow(event)!,{title:`Locate original source: ${old.media.name}`,properties:['openFile']});
    if(result.canceled) return null;
    return projects.relink(id,result.filePaths[0]);
  });
  handle('snapshots',(_event,id:string)=>projects.snapshots(id));
  handle('restore',(_event,id:string,snapshot:string)=>projects.restore(id,snapshot));
  handle('show',async (_event,id:string)=>{shell.showItemInFolder(await projects.fileFor(id));});
  return projects;
}
