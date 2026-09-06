import {app,dialog,ipcMain,type WebContents,type IpcMainInvokeEvent} from 'electron';
import {join} from 'node:path';
import {ModelStorage} from './model-storage';
import type {ModelId} from '../lib/models';
export function installModelIpc(trusted:(event:IpcMainInvokeEvent)=>boolean,inUse:()=>boolean){
 const storage=new ModelStorage(join(app.getPath('userData'),'model-storage.json'),join(app.getPath('userData'),'Rescript Models'),inUse);
 const handle=(name:string,fn:(...args:never[])=>unknown)=>ipcMain.handle('models:'+name,(event,...args)=>{if(!trusted(event))throw Error('Untrusted model request.');return fn(...args as never[]);});
 handle('status',(gpu:boolean)=>storage.status(gpu===true));
 handle('download',(id:ModelId,gpu:boolean)=>storage.download(id,gpu===true));
 handle('remove',(id:ModelId)=>storage.remove(id));
 handle('choose-folder',async()=>{const result=await dialog.showOpenDialog({properties:['openDirectory','createDirectory']});return result.canceled?null:storage.setFolder(result.filePaths[0]);});
 handle('relocate',()=>storage.relocate());
 const owners=new Map<WebContents,Set<string>>();
 const tokens=(owner:WebContents)=>{let set=owners.get(owner);if(!set){set=new Set();owners.set(owner,set);const clear=()=>{owner.removeListener('destroyed',clear);owner.removeListener('render-process-gone',clear);owner.removeListener('did-start-navigation',clear);const pending=owners.get(owner);owners.delete(owner);for(const token of pending??[])void storage.importCancel(token);};owner.once('destroyed',clear);owner.once('render-process-gone',clear);owner.once('did-start-navigation',clear);}return set;};
 ipcMain.handle('models:import-start',async(event,id:ModelId,file:string,size:number)=>{if(!trusted(event))throw Error('Untrusted model request.');const owned=tokens(event.sender);const token=await storage.importStart(id,file,size);if(token){if(event.sender.isDestroyed()||owners.get(event.sender)!==owned){await storage.importCancel(token);throw Error('Model import owner closed.');}owned.add(token);}return token;});
 const transfer=(name:string,fn:(token:string,...args:never[])=>Promise<void>,finish=false)=>ipcMain.handle('models:'+name,async(event,token:string,...args:unknown[])=>{if(!trusted(event)||!owners.get(event.sender)?.has(token))throw Error('Invalid model transfer owner.');await fn(token,...args as never[]);if(finish)owners.get(event.sender)?.delete(token);});
 transfer('import-append',(token:string,offset:number,bytes:Uint8Array)=>storage.importAppend(token,offset,bytes));
 transfer('import-finish',(token:string)=>storage.importFinish(token),true);
 transfer('import-cancel',(token:string)=>storage.importCancel(token),true);
 return storage;
}
