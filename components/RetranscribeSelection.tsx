"use client";
import {isCompositionKey} from '@/lib/keyboard';
import {compatibleLanguage} from '@/lib/model-capabilities';
import TranscriptionLanguagePicker from "./TranscriptionLanguagePicker";
import ModelPicker from "./ModelPicker";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Button from './Button';
import {useShallow} from 'zustand/react/shallow';
import {createPortal} from 'react-dom';
import {useEditorStore} from '@/lib/store';
import {getClipSegments,getKeepRanges} from '@/lib/edits';
import {useCutRanges} from '@/hooks/useCutRanges';
import {MODELS,assertModelLanguage,isModelId,modelSupportsLanguage,type ModelId} from '@/lib/models';
import {type TranscriptLanguage} from '@/lib/languages';
import {flushProjectAutosave} from '@/lib/autosave';
import {useForkI18n} from './I18nProvider';

export default function RetranscribeSelection({children,scope='selection'}:{scope?:'selection'|'all';children?:(action:{open:()=>void;disabled:boolean})=>ReactNode}){
 const f=useForkI18n();
 const s=useEditorStore(useShallow(s=>({words:s.words,selectedWordIds:s.selectedWordIds,selectedClipIndex:s.selectedClipIndex,duration:s.duration,sceneBoundaries:s.sceneBoundaries,source:s.source,transcriptLanguage:s.transcriptLanguage,projectId:s.projectId,jobState:s.jobState})));const cuts=useCutRanges();
 const [range,setRange]=useState<{start:number;end:number;projectId:string}|null>(null);
 const [model,setModel]=useState<ModelId>('base'),[language,setLanguage]=useState<TranscriptLanguage>('auto');
 const root=useRef<HTMLDivElement>(null),submitting=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const selected=s.words.filter(w=>s.selectedWordIds.includes(w.id));
 const clip=getClipSegments(getKeepRanges(cuts,s.duration),s.sceneBoundaries).find(c=>c.index===s.selectedClipIndex);
 const selection=scope==='all'?(s.duration>0?{start:0,end:s.duration}:null):selected.length?{start:Math.min(...selected.map(w=>w.start)),end:Math.max(...selected.map(w=>w.end))}:clip;
 const conflicting=s.jobState==='running'||s.jobState==='preparing';
 const disabled=!selection||!s.projectId||conflicting;
 const open=()=>{if(disabled||!selection||!s.projectId)return;const next=isModelId(s.source)?s.source:'base';setRange({start:selection.start,end:selection.end,projectId:s.projectId});setModel(next);setLanguage(compatibleLanguage(MODELS[next].capabilities,s.transcriptLanguage));setError('');};
 useEffect(()=>{
  if(!range)return;
  const previous=document.activeElement as HTMLElement|null;
  const frame=requestAnimationFrame(()=>root.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus());
  return()=>{cancelAnimationFrame(frame);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[range]);
 useEffect(()=>{if(busy)root.current?.focus();},[busy]);
 const run=async()=>{
  if(!range||submitting.current||conflicting)return;submitting.current=true;setBusy(true);setError('');
  try{assertModelLanguage(model,language);await flushProjectAutosave();if(useEditorStore.getState().projectId!==range.projectId)throw Error('The open project changed. Reopen the transcription dialog.');if(scope==='all')await window.rescriptDesktop!.jobs.transcribeAll(range.projectId,model,language);else await window.rescriptDesktop!.jobs.transcribeRange(range.projectId,range.start,range.end,model,language);setRange(null);}
  catch(e){setError(f((e instanceof Error?e.message:'Retranscription failed.').replace(/^Error invoking remote method '[^']+': Error: /,'')));requestAnimationFrame(()=>root.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());}finally{submitting.current=false;setBusy(false);}
 };
 if(typeof window==='undefined'||!window.rescriptDesktop)return children?children({open:()=>{},disabled:true}):null;
 return <>{children?children({open,disabled}):<Button disabled={disabled} onClick={open}>{f('Retranscribe')}</Button>}
 {range&&createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={()=>{if(!busy)setRange(null);}}>
  <div ref={root} role="dialog" aria-modal="true" aria-busy={busy} tabIndex={-1} onKeyDown={event=>{
   if(isCompositionKey(event.nativeEvent))return;
   if(event.key==='Escape'&&!busy){event.preventDefault();event.stopPropagation();setRange(null);}
   if(event.key==='Tab'){
    const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length>0);
    const first=controls[0],last=controls.at(-1);
    if(!first){event.preventDefault();return;}
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  }} aria-label={f(scope==='all'?'Retranscribe all':'Retranscribe selection')} onClick={e=>e.stopPropagation()} className="w-96 rounded-xl bg-white p-5 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100">
   <h2 className="mb-2 font-semibold">{f(scope==='all'?'Retranscribe all':'Retranscribe selection')}</h2>
   <p className="mb-4 text-sm">{scope==='all'?f('Full audio'):`${range.start.toFixed(2)}–${range.end.toFixed(2)} s`}</p>
   <div className="text-xs">{f('Transcription model')}<ModelPicker disabled={busy} value={model} language={language} onChange={next=>{setModel(next);setLanguage(compatibleLanguage(MODELS[next].capabilities,language));}}/></div>
   <div className="text-xs">{f('Transcription language')}<TranscriptionLanguagePicker model={model} disabled={busy} value={language} onChange={setLanguage}/></div>
   <p className="my-3 text-xs text-zinc-500">{f(scope==='all'?'The full transcript will be replaced. Timeline cuts stay unchanged.':'Only this source range will be replaced. Timeline cuts stay unchanged.')}</p>
   {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
   <div className="mt-4 flex justify-end gap-3"><Button disabled={busy} onClick={()=>setRange(null)}>{f('Cancel')}</Button><Button disabled={busy||conflicting||!modelSupportsLanguage(model,language)} onClick={()=>void run()}>{f('Transcribe')}</Button></div>
  </div>
 </div>,document.body)}</>;
}
