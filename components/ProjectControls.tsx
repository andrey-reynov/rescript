"use client";
import { useEffect, useState } from 'react';
import { Save, FolderOpen, Copy } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { flushProjectAutosave, saveProjectAs, scheduleProjectAutosave } from '@/lib/autosave';

export default function ProjectControls() {
  const name=useEditorStore(s=>s.projectName);
  const file=useEditorStore(s=>s.videoFile);
  const state=useEditorStore(s=>s.saveState);
  const job=useEditorStore(s=>s.jobState);
  const error=useEditorStore(s=>s.saveError);
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
      else await window.rescriptDesktop!.jobs.start(s.projectId!,s.source,s.transcriptLanguage,!s.skipTranscription);
    })}>{job==='running'||job==='preparing'?'Pause processing':'Resume processing'}</button>}
    <button disabled={busy} onClick={()=>void act(flushProjectAutosave)} className="flex items-center gap-1 rounded border px-2 py-1"><Save size={13}/>Save</button>
    {typeof window!=='undefined' && window.rescriptDesktop && <>
      <button disabled={busy} onClick={()=>void act(saveProjectAs)} className="flex items-center gap-1 rounded border px-2 py-1"><Copy size={13}/>Save As…</button>
      <button aria-label="Show project location" onClick={()=>void act(async()=>{await flushProjectAutosave();await window.rescriptDesktop!.projects.show(useEditorStore.getState().projectId!);})} className="rounded p-1"><FolderOpen size={15}/></button>
    </>}
    {(error||actionError)&&<p role="alert" className="w-full text-red-600">{error||actionError} Your work is still open; retry saving before closing.</p>}
  </div>;
}
