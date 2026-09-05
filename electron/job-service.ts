import { BrowserWindow, ipcMain, powerSaveBlocker, type IpcMainInvokeEvent } from 'electron';
import { ProjectFiles } from './project-files';
import { TranscriptionJobs, type JobState, type JobChunk, type StoredPeaks } from './transcription-jobs';
import type { JobWord as Word } from './transcription-jobs';

/** A separate hidden renderer owns inference; the editor can close or crash independently. */
export function installJobService(projects:ProjectFiles,devUrl:string|null,preload:string,trusted:(event:IpcMainInvokeEvent)=>boolean) {
  const jobs=new TranscriptionJobs(projects);
  let runner:BrowserWindow|null=null, activeId:string|null=null, blocker:number|null=null;
  let starting=false;
  const progress=new Map<string,{message:string;value:number|null}>();
  const notify=(id:string)=>{for(const win of BrowserWindow.getAllWindows())if(win!==runner&&!win.webContents.isDestroyed())win.webContents.send('job:changed',id);};
  const release=()=>{if(blocker!==null&&powerSaveBlocker.isStarted(blocker))powerSaveBlocker.stop(blocker);blocker=null;};
  const closeRunner=()=>{const old=runner;runner=null;activeId=null;if(old&&!old.isDestroyed())old.destroy();release();};
  const finish=async(id:string)=>{
    const job=await jobs.read(id);if(!job||job.status!=='complete')return;
    const doc=await projects.read(id);
    if(job.transcribe&&!doc.data.transcriptionComplete&&doc.data.source!=='import') {
      await projects.save(id,{...doc.data,words:await jobs.words(id),transcriptionComplete:true,duration:doc.data.duration||job.sampleCount/16000});
    }
    notify(id);closeRunner();
  };
  const launch=async(id:string)=>{
    if(runner&&activeId===id)return;
    if(runner)throw new Error('Another project is processing. Pause it before starting this project.');
    activeId=id;blocker=powerSaveBlocker.start('prevent-app-suspension');
    const win=new BrowserWindow({show:false,width:400,height:300,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:false,backgroundThrottling:false}});
    runner=win;
    win.webContents.on('render-process-gone',(_event,details)=>{
      if(runner!==win)return;
      console.error('Background processing renderer exited',details);
      closeRunner();void jobs.setStatus(id,'error','The processing worker stopped. Completed batches are saved; resume to continue.').then(()=>notify(id));
    });
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    await win.loadURL(`${devUrl??'app://localhost'}/processing/?project=${encodeURIComponent(id)}`);
  };
  const ui=(channel:string,fn:(event:IpcMainInvokeEvent,...args:never[])=>unknown)=>ipcMain.handle(`job:${channel}`,(event,...args)=>{if(!trusted(event))throw Error('Untrusted job request');return fn(event,...args as never[]);});
  const worker=(channel:string,fn:(id:string,...args:never[])=>unknown)=>ipcMain.handle(`processing:${channel}`,(event,...args)=>{if(!runner||event.sender!==runner.webContents||!activeId)throw Error('Inactive processing worker');return fn(activeId,...args as never[]);});
  ui('start',async(_event,id:string,model:string,language:string,transcribe:boolean)=>{
    if(!transcribe){const previous=await jobs.read(id);if(previous?.status==='complete'){notify(id);return previous;}}
    if(starting)throw Error('A processing job is starting. Try again.');
    if(runner){if(activeId===id)return jobs.read(id);throw Error('Another project is processing. Pause it first.');}
    if(typeof model!=='string'||typeof language!=='string'||typeof transcribe!=='boolean')throw Error('Invalid job settings');
    starting=true;
    try{
      const job=await jobs.start(id,model,language,transcribe);
      if(job.status==='complete')await finish(id);else await launch(id);
      notify(id);return job;
    }finally{starting=false;}
  });
  ui('read',async(_event,id:string)=>{const job=await jobs.read(id);return job?{...job,progress:progress.get(id)}:null;});
  ui('pause',async(_event,id:string)=>{if(activeId===id)closeRunner();const job=await jobs.setStatus(id,'paused','Paused — completed batches are saved');notify(id);return job;});
  ui('result',async(_event,id:string)=>({words:await jobs.words(id),waveform:await jobs.waveform(id)}));
  worker('take',async id=>({job:await jobs.read(id),project:await projects.read(id)}));
  worker('begin-audio',id=>jobs.beginAudio(id));
  worker('append-audio',(id,bytes:Uint8Array)=>jobs.appendAudio(id,bytes));
  worker('audio-ready',async(id,peaks:StoredPeaks)=>{const job=await jobs.audioReady(id,peaks);notify(id);if(job.status==='complete')await finish(id);return job;});
  worker('next',id=>jobs.next(id));
  worker('checkpoint',async(id,key:string,chunk:Omit<JobChunk,'audio'>,words:Word[])=>{const job=await jobs.checkpoint(id,key,chunk,words);notify(id);if(job.status==='complete')await finish(id);return job;});
  worker('progress',(id,message:string,value:number|null)=>{progress.set(id,{message,value});notify(id);});
  worker('fail',async(id,message:string)=>{await jobs.setStatus(id,'error',message);notify(id);closeRunner();});
  return {jobs,stop:closeRunner,runner:()=>runner};
}
