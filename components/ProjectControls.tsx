"use client";
import {useI18n,useForkI18n} from "./I18nProvider";
import {localizeRuntimeMessage} from "@/lib/i18n";
import { useEffect, useState } from 'react';
import { Save, FolderOpen, Copy, Download, FolderInput, X, Pause, Play, AudioLines } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import RetranscribeSelection from './RetranscribeSelection';
import ActionMenu from './ActionMenu';
import { flushProjectAutosave, saveProjectAs, closeCurrentProject } from '@/lib/autosave';

export default function ProjectControls({mode='status'}:{mode?:'status'|'menu'}) {
  const f=useForkI18n(); const {t}=useI18n();
  const file=useEditorStore(s=>s.videoFile);
  const state=useEditorStore(s=>s.saveState);
  const status=useEditorStore(s=>s.status);
  const silenceJob=useEditorStore(s=>s.silenceJob);
  const job=useEditorStore(s=>s.jobState);
  const error=useEditorStore(s=>s.saveError);
  const progress=useEditorStore(s=>s.progress);
  const processingError=useEditorStore(s=>s.error);
  const progressKey=JSON.stringify([job,progress.message,progress.value]);
  const [activity,setActivity]=useState({key:'',seconds:0});
  const quietSeconds=activity.key===progressKey?activity.seconds:0;
  useEffect(()=>{
    if(mode==='menu')return;
    if(job!=='preparing'&&job!=='running')return;
    const since=Date.now();const timer=setInterval(()=>setActivity({key:progressKey,seconds:Math.floor((Date.now()-since)/1000)}),1000);
    return()=>clearInterval(timer);
  },[job,progressKey,mode]);
  const [busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState<string|null>(null);
  const act=async(action:()=>Promise<void>)=>{setBusy(true);setActionError(null);try{await action();}catch(e){setActionError(e instanceof Error?e.message:'Project action failed.');}finally{setBusy(false);}};
  useEffect(()=>{
    if(mode!=='menu')return;
    const handler=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
        event.preventDefault();void act(event.shiftKey?saveProjectAs:flushProjectAutosave);
      }
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[mode]);
  if(!file)return null;
  if(mode==='menu')return <div className="relative"><RetranscribeSelection scope="all">{retranscribe=><ActionMenu label={f('Project actions')} actions={[
    {id:'save',label:f('Save'),icon:<Save size={14}/>,shortcut:'Ctrl/⌘ S',disabled:busy,run:()=>void act(flushProjectAutosave)},
    ...(typeof window!=='undefined'&&window.rescriptDesktop?[
     {id:'open',label:f('Open project…'),icon:<FolderInput size={14}/>,shortcut:'Ctrl/⌘ O',disabled:busy,run:()=>void act(async()=>{await flushProjectAutosave();const id=await window.rescriptDesktop!.projects.open();if(id)await useEditorStore.getState().openProject(id);})},
     {id:'save-as',label:f('Save As…'),icon:<Copy size={14}/>,shortcut:'Ctrl/⌘ Shift S',disabled:busy,run:()=>void act(saveProjectAs)},
     {id:'location',label:f('Show project location'),icon:<FolderOpen size={14}/>,disabled:busy,run:()=>void act(async()=>{await flushProjectAutosave();await window.rescriptDesktop!.projects.show(useEditorStore.getState().projectId!);})},
    ]:[]),
    {id:'close',label:f('Close Project'),icon:<X size={14}/>,disabled:busy,run:()=>void act(closeCurrentProject)},
    ...(job&&job!=='complete'?[{id:'processing',label:f(job==='running'||job==='preparing'?'Pause processing':'Resume processing'),icon:job==='running'||job==='preparing'?<Pause size={14}/>:<Play size={14}/>,disabled:busy,run:()=>void act(async()=>{await flushProjectAutosave();const s=useEditorStore.getState();if(job==='running'||job==='preparing')await window.rescriptDesktop!.jobs.pause(s.projectId!);else{const previous=await window.rescriptDesktop!.jobs.read(s.projectId!);if(previous)await window.rescriptDesktop!.jobs.start(s.projectId!,previous.model,previous.language,previous.transcribe);}})}]:[]),
    ...(silenceJob&&silenceJob.status!=='complete'?[{id:'silence-processing',label:f(silenceJob.status==='running'?'Pause detection':'Resume detection'),icon:<AudioLines size={14}/>,disabled:busy,run:()=>void act(async()=>{const id=useEditorStore.getState().projectId!;if(silenceJob.status==='running')await window.rescriptDesktop!.silence.pause(id);else await window.rescriptDesktop!.silence.start(id);})}]:[]),
    {id:'retranscribe-all',label:f('Retranscribe all'),icon:<AudioLines size={14}/>,disabled:busy||retranscribe.disabled,run:retranscribe.open},
    {id:'export',label:t('editor.export'),icon:<Download size={14}/>,disabled:status!=='ready'&&status!=='exporting',run:()=>useEditorStore.getState().setExportOpen(true)},
  ]}/>}</RetranscribeSelection>{actionError&&<p role="alert" className="absolute right-0 top-full z-50 w-72 rounded bg-white p-2 text-xs text-red-600 dark:bg-zinc-900">{f(localizeRuntimeMessage(actionError,t))}</p>}</div>;
  return <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-xs">

    <span role="status" className={state==='error'?'text-red-600':'text-zinc-500'}>{state==='saved'?f('Saved'):state==='saving'?f('Saving…'):state==='error'?f('Save failed'):f('Unsaved changes · autosave within 0.5s')}</span>
    {job&&job!=='complete'&&<span role="status" className="whitespace-normal text-zinc-500">{job==='error'||job==='paused'?f(localizeRuntimeMessage(processingError,t)):<>{f(localizeRuntimeMessage(progress.message,t))}{progress.value!==null?` · ${Math.min(100,Math.max(0,Math.floor(progress.value*100)))}%`:' · '+f('Working…')}{quietSeconds>=10?' · '+f('Idle {seconds}s',{seconds:quietSeconds}):''}</>}</span>}
    {silenceJob&&silenceJob.status!=='complete'&&<span role="status" className="text-zinc-500">{f(silenceJob.message)} · {Math.floor(silenceJob.progress*100)}%</span>}
    {(error||actionError)&&<p role="alert" className="w-full text-red-600">{f(localizeRuntimeMessage(error||actionError,t))} {f("Your work is still open; retry saving before closing.")}</p>}
  </div>;
}
