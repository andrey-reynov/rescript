"use client";
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useEditorStore} from '@/lib/store';
import type {AlignmentSelection} from '@/lib/correction-alignment';
import {ALIGN_MODELS,alignModelFor} from '@/lib/alignModels';
import {groupWordsForAlignment} from '@/lib/forcedAlign';
import {TRANSCRIPT_LANGUAGES,type TranscriptLanguage} from '@/lib/languages';
import type {Word,WorkerRequest,WorkerResponse} from '@/lib/types';
import Button from './Button';
import Dropdown from './Dropdown';
import {useForkI18n,useI18n} from './I18nProvider';
import {localizeRuntimeMessage} from '@/lib/i18n';

export default function RealignSelection({selection,projectId,onClose}:{selection:AlignmentSelection;projectId:string;onClose:()=>void}){
 const f=useForkI18n(),{t}=useI18n();
 const initial=selection.words[0]?.language??useEditorStore.getState().transcriptLanguage;
 const [language,setLanguage]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [progress,setProgress]=useState({message:'',value:0 as number|null});
 const submitting=useRef(false);
 const rejectPending=useRef<((error:Error)=>void)|null>(null);
 const worker=useRef<Worker|null>(null),generation=useRef(0),dialog=useRef<HTMLDivElement>(null);
 const cancel=()=>{generation.current++;rejectPending.current?.(Error('Cancelled'));rejectPending.current=null;worker.current?.terminate();worker.current=null;onClose();};
 useEffect(()=>{dialog.current?.focus();const activeGeneration=generation,activeWorker=worker,pending=rejectPending;return()=>{activeGeneration.current++;pending.current?.(Error('Cancelled'));pending.current=null;activeWorker.current?.terminate();};},[]);
 const run=async()=>{
  if(submitting.current||!alignModelFor(language))return;
  submitting.current=true;dialog.current?.focus();
  const token=++generation.current;setBusy(true);setError('');setProgress({message:f('Reading audio'),value:0});
  try{
   const native=window.rescriptDesktop!;
   const source=await native.projects.read(projectId);
   if(token!==generation.current)return;
   const batches=groupWordsForAlignment(selection.words,20),result:Word[]=[];
   worker.current=new Worker(new URL('../workers/transcription.worker.ts',import.meta.url),{type:'module'});
   for(let index=0;index<batches.length;index++){
    const batch=batches[index],start=Math.min(...batch.map(word=>word.start)),end=Math.max(...batch.map(word=>word.end));
    const pcm=await native.jobs.alignmentAudio(projectId,start,end);
    if(token!==generation.current)return;
    if(pcm.fingerprint!==source.media.fingerprint)throw Error('Source media changed. Run alignment again.');
    const local=batch.map(word=>({...word,start:word.start-pcm.start,end:word.end-pcm.start}));
    const measured=await new Promise<Word[]>((resolve,reject)=>{
     const current=worker.current!;rejectPending.current=reject;
     current.onmessage=(event:MessageEvent<WorkerResponse>)=>{
      const message=event.data;if(token!==generation.current)return;
      if(message.type==='complete'){rejectPending.current=null;resolve(message.words);}
      if(message.type==='error'){rejectPending.current=null;reject(Error(message.message));}
      if(message.type==='progress')setProgress({message:localizeRuntimeMessage(message.message,t),value:message.value===null?null:(index+message.value)/batches.length});
     };
     current.onerror=event=>reject(Error(event.message||'Alignment worker stopped.'));
     const request:WorkerRequest={audio:pcm.audio,duration:pcm.audio.length/16000,model:'base',language:language as TranscriptLanguage,preferWasm:true,desktopModels:true,alignWords:local};
     current.postMessage(request,[pcm.audio.buffer]);
    });
    result.push(...measured.map(word=>({...word,start:Math.max(start,word.start+pcm.start),end:Math.min(end,word.end+pcm.start)})));
   }
   if(token!==generation.current)return;
   const latest=await native.projects.read(projectId);
   if(token!==generation.current)return;
   if(useEditorStore.getState().projectId!==projectId||latest.media.fingerprint!==source.media.fingerprint)throw Error('Source media changed. Run alignment again.');
   useEditorStore.getState().applyWordAlignment(selection,result);onClose();
  }catch(cause){if(token===generation.current)setError((cause instanceof Error?cause.message:String(cause)).replace(/^Error invoking remote method '[^']+': Error: /,''));}
  finally{if(token===generation.current){worker.current?.terminate();worker.current=null;submitting.current=false;setBusy(false);}}
 };
 const supported=!!alignModelFor(language);
 return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)cancel();}}>
  <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={f('Realign selected text')} className="w-96 max-w-[90vw] rounded-xl bg-white p-5 text-zinc-900 shadow-xl outline-none dark:bg-zinc-900 dark:text-zinc-100" onKeyDown={event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}
   if(event.key==='Tab'){const buttons=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length>0);if(!buttons.length){event.preventDefault();return;}const first=buttons[0],last=buttons.at(-1)!;if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){event.preventDefault();first.focus();}}
  }}>
   <h2 className="mb-2 font-semibold">{f('Realign selected text')}</h2>
   <p className="mb-4 text-sm">{selection.start.toFixed(2)}–{selection.end.toFixed(2)} {f('s')}</p>
   <p className="mb-3 text-xs text-zinc-500">{f('Adjust word timing against the audio. Text and timeline cuts stay unchanged.')}</p>
   <label className="text-xs">{f('Speech language')}</label>
   <Dropdown label={f('Speech language')} value={language} disabled={busy} onChange={setLanguage} options={Array.from(new Set([language,...Object.keys(ALIGN_MODELS)])).map(id=>({value:id,label:TRANSCRIPT_LANGUAGES[id as TranscriptLanguage]?.nativeLabel??id,disabled:!alignModelFor(id)}))}/>
   {!supported&&<p role="status" className="text-xs text-amber-600">{f('Automatic word alignment is unavailable for this language. Choose the actual spoken language if supported; otherwise use manual timing.')}</p>}
   <p className="my-3 text-xs text-zinc-500">{f('The alignment model downloads on first use. Cancelling keeps existing timings.')}</p>
   {busy&&<div role="status" className="my-3 text-xs">{progress.message}{progress.value!==null&&<> · {Math.round(progress.value*100)}%<progress className="mt-2 w-full" max={1} value={progress.value}/></>}</div>}
   {error&&<p role="alert" className="text-sm text-red-600">{f(error)}</p>}
   <div className="mt-4 flex justify-end gap-3"><Button onClick={cancel}>{f('Cancel')}</Button><Button disabled={busy||!supported} onClick={()=>void run()}>{f('Realign')}</Button></div>
  </div>
 </div>,document.body);
}
