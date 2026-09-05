"use client";
import { useEffect, useState } from 'react';
import { Save, FolderOpen, Copy } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { flushProjectAutosave, saveProjectAs, scheduleProjectAutosave } from '@/lib/autosave';

export default function ProjectControls() {
  const selectedWordIds=useEditorStore(s=>s.selectedWordIds);
  const name=useEditorStore(s=>s.projectName);
  const file=useEditorStore(s=>s.videoFile);
  const state=useEditorStore(s=>s.saveState);
  const job=useEditorStore(s=>s.jobState);
  const error=useEditorStore(s=>s.saveError);
  const progress=useEditorStore(s=>s.progress);
  const processingError=useEditorStore(s=>s.error);
  const progressKey=JSON.stringify([job,progress.message,progress.value]);
  const [activity,setActivity]=useState({key:'',seconds:0});
  const quietSeconds=activity.key===progressKey?activity.seconds:0;
  useEffect(()=>{
    if(job!=='preparing'&&job!=='running')return;
    const since=Date.now();const timer=setInterval(()=>setActivity({key:progressKey,seconds:Math.floor((Date.now()-since)/1000)}),1000);
    return()=>clearInterval(timer);
  },[job,progressKey]);
  const [busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState<string|null>(null);
  const act=async(action:()=>Promise<void>)=>{setBusy(true);setActionError(null);try{await action();}catch(e){setActionError(e instanceof Error?e.message:'Project action failed.');}finally{setBusy(false);}};
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
        event.preventDefault();void act(event.shiftKey?saveProjectAs:flushProjectAutosave);
      }
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[]);
  if(!file)return null;
  return <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">
    <input aria-label="Project name" value={name} onChange={e=>{useEditorStore.setState({projectName:e.target.value});scheduleProjectAutosave();}} onBlur={()=>{if(!useEditorStore.getState().projectName.trim()){useEditorStore.setState({projectName:file.name});scheduleProjectAutosave();}}} className="min-w-24 max-w-sm flex-1 rounded border border-transparent bg-transparent px-2 py-1 font-medium focus:border-zinc-400" />
    <span role="status" className={state==='error'?'text-red-600':'text-zinc-500'}>{state==='saved'?'Saved':state==='saving'?'Saving…':state==='error'?'Save failed':'Unsaved changes · autosave within 0.5s'}</span>
    {job && job!=='complete' && <button disabled={busy} className="rounded border px-2 py-1" onClick={()=>void act(async()=>{
      await flushProjectAutosave();const s=useEditorStore.getState();
      if(job==='running'||job==='preparing')await window.rescriptDesktop!.jobs.pause(s.projectId!);
      else {const previous=await window.rescriptDesktop!.jobs.read(s.projectId!);if(previous)await window.rescriptDesktop!.jobs.start(s.projectId!,previous.model,previous.language,previous.transcribe);}
    })}>{job==='running'||job==='preparing'?'Pause processing':'Resume processing'}</button>}
    {job==='complete' && selectedWordIds.length>0 && <button disabled={busy} className="rounded border px-2 py-1" title="Replace transcription in the one-minute batches containing the selected words. Other batches and manual timeline cuts stay unchanged." onClick={()=>void act(async()=>{
      await flushProjectAutosave();const s=useEditorStore.getState();const selected=new Set(s.selectedWordIds);
      const batches=[...new Set(s.words.filter(word=>selected.has(word.id)).map(word=>Math.floor(((word.start+word.end)/2)/60)))];
      await window.rescriptDesktop!.jobs.retryChunks(s.projectId!,batches);
    })}>Retranscribe selected batches</button>}
    {job&&job!=='complete'&&<span role="status" className="text-zinc-500">{job==='error'||job==='paused'?processingError:<>{progress.message}{progress.value!==null?` · ${Math.min(100,Math.max(0,Math.floor(progress.value*100)))}%`:' · Working…'}{quietSeconds>=10?` · Idle ${quietSeconds}s`:''}</>}</span>}
    <button disabled={busy} onClick={()=>void act(flushProjectAutosave)} className="flex items-center gap-1 rounded border px-2 py-1"><Save size={13}/>Save</button>
    {typeof window!=='undefined' && window.rescriptDesktop && <>
      <button disabled={busy} onClick={()=>void act(saveProjectAs)} className="flex items-center gap-1 rounded border px-2 py-1"><Copy size={13}/>Save As…</button>
      <button aria-label="Show project location" onClick={()=>void act(async()=>{await flushProjectAutosave();await window.rescriptDesktop!.projects.show(useEditorStore.getState().projectId!);})} className="rounded p-1"><FolderOpen size={15}/></button>
    </>}
    {(error||actionError)&&<p role="alert" className="w-full text-red-600">{error||actionError} Your work is still open; retry saving before closing.</p>}
  </div>;
}
