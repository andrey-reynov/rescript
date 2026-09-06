import {BrowserWindow,ipcMain,powerSaveBlocker,type IpcMainInvokeEvent} from 'electron';
import {SilenceJobs} from './silence-jobs';
import type {ProjectFiles} from './project-files';
export function installSilenceService(projects:ProjectFiles,devUrl:string|null,preload:string,trusted:(event:IpcMainInvokeEvent)=>boolean,conflicting:()=>boolean){
 const jobs=new SilenceJobs(projects);let runner:BrowserWindow|null=null,activeId:string|null=null,starting=false,blocker:number|null=null;let fraction=0;
 const notify=(id:string)=>{for(const win of BrowserWindow.getAllWindows())if(win!==runner)win.webContents.send('silence:changed',id);};
 const stop=()=>{const old=runner;runner=null;activeId=null;if(old&&!old.isDestroyed())old.destroy();if(blocker!==null&&powerSaveBlocker.isStarted(blocker))powerSaveBlocker.stop(blocker);blocker=null;};
 const ui=(name:string,fn:(id:string)=>unknown)=>ipcMain.handle('silence:'+name,(event,id:string)=>{if(!trusted(event))throw Error('Untrusted analysis request.');return fn(id);});
 ui('read',async id=>{const job=await jobs.read(id);return job?{...job,progress:activeId===id?(job.completed.length+fraction)/job.total:job.progress}:null;});
 ui('result',id=>jobs.result(id));
 ui('start',async id=>{
  if(runner&&activeId===id)return jobs.read(id);
  if(starting||runner||conflicting())throw Error('Pause other processing before detecting silence.');
  starting=true;try{const job=await jobs.start(id);if(job.status==='complete'){notify(id);return job;}activeId=id;fraction=0;blocker=powerSaveBlocker.start('prevent-app-suspension');
   const win=new BrowserWindow({show:false,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:false,backgroundThrottling:false}});runner=win;
   win.webContents.on('render-process-gone',()=>{if(runner!==win)return;stop();void jobs.fail(id,'Speech detection stopped. Resume to continue saved batches.').then(()=>notify(id));});
   win.webContents.setWindowOpenHandler(()=>({action:'deny'}));await win.loadURL((devUrl??'app://localhost')+'/analysis/');notify(id);return job;
  }catch(error){stop();await jobs.fail(id,String(error));throw error;}finally{starting=false;}
 });
 ui('pause',async id=>{if(activeId===id)stop();await jobs.pause(id);notify(id);});
 const worker=(name:string,fn:(id:string,...args:never[])=>unknown)=>ipcMain.handle('silence-worker:'+name,(event,...args)=>{if(!runner||event.sender!==runner.webContents||!activeId)throw Error('Inactive analysis worker.');return fn(activeId,...args as never[]);});
 worker('take',id=>jobs.next(id));
 worker('checkpoint',async(id,index:number,rms:number[],speech:number[])=>{const job=await jobs.checkpoint(id,index,rms,speech);fraction=0;if(job.status==='complete')stop();notify(id);});
 worker('progress',(id,value:number)=>{if(Number.isFinite(value)){fraction=Math.min(1,Math.max(0,value));notify(id);}});
 worker('fail',async(id,message:string)=>{stop();await jobs.fail(id,message);notify(id);});
 return {active:()=>starting||!!runner};
}
