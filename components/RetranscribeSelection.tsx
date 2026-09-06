"use client";
import Dropdown from "./Dropdown";
import ModelPicker from "./ModelPicker";
import {useState,type ReactNode} from 'react';
import Button from './Button';
import {useShallow} from 'zustand/react/shallow';
import {createPortal} from 'react-dom';
import {useEditorStore} from '@/lib/store';
import {getClipSegments,getKeepRanges} from '@/lib/edits';
import {useCutRanges} from '@/hooks/useCutRanges';
import {isModelId,modelSupportsLanguage,type ModelId} from '@/lib/models';
import {TRANSCRIPT_LANGUAGES,TRANSCRIPT_LANGUAGE_ORDER,type TranscriptLanguage} from '@/lib/languages';
import {flushProjectAutosave} from '@/lib/autosave';
import {useForkI18n} from './I18nProvider';

export default function RetranscribeSelection({children,scope='selection'}:{scope?:'selection'|'all';children?:(action:{open:()=>void;disabled:boolean})=>ReactNode}){
 const f=useForkI18n();
 const s=useEditorStore(useShallow(s=>({words:s.words,selectedWordIds:s.selectedWordIds,selectedClipIndex:s.selectedClipIndex,duration:s.duration,sceneBoundaries:s.sceneBoundaries,source:s.source,transcriptLanguage:s.transcriptLanguage,projectId:s.projectId,jobState:s.jobState})));const cuts=useCutRanges();
 const [range,setRange]=useState<{start:number;end:number}|null>(null);
 const [model,setModel]=useState<ModelId>('base'),[language,setLanguage]=useState<TranscriptLanguage>('auto');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const selected=s.words.filter(w=>s.selectedWordIds.includes(w.id));
 const clip=getClipSegments(getKeepRanges(cuts,s.duration),s.sceneBoundaries).find(c=>c.index===s.selectedClipIndex);
 const selection=scope==='all'?(s.duration>0?{start:0,end:s.duration}:null):selected.length?{start:Math.min(...selected.map(w=>w.start)),end:Math.max(...selected.map(w=>w.end))}:clip;
 const open=()=>{if(!selection)return;setRange({start:selection.start,end:selection.end});setModel(isModelId(s.source)?s.source:'base');setLanguage(s.transcriptLanguage);setError('');};
 const run=async()=>{
  if(!range)return;setBusy(true);setError('');
  try{await flushProjectAutosave();if(scope==='all')await window.rescriptDesktop!.jobs.transcribeAll(s.projectId!,model,language);else await window.rescriptDesktop!.jobs.transcribeRange(s.projectId!,range.start,range.end,model,language);setRange(null);}
  catch(e){setError(e instanceof Error?e.message:'Retranscription failed.');}finally{setBusy(false);}
 };
 if(typeof window==='undefined'||!window.rescriptDesktop)return children?children({open:()=>{},disabled:true}):null;
 return <>{children?children({open,disabled:!selection||s.jobState==='running'||s.jobState==='preparing'}):<Button disabled={!selection||s.jobState==='running'||s.jobState==='preparing'} onClick={open}>{f('Retranscribe')}</Button>}
 {range&&createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={()=>{if(!busy)setRange(null);}}>
  <div role="dialog" aria-modal="true" aria-label={f(scope==='all'?'Retranscribe all':'Retranscribe selection')} onClick={e=>e.stopPropagation()} className="w-96 rounded-xl bg-white p-5 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100">
   <h2 className="mb-2 font-semibold">{f(scope==='all'?'Retranscribe all':'Retranscribe selection')}</h2>
   <p className="mb-4 text-sm">{scope==='all'?f('Full audio'):`${range.start.toFixed(2)}–${range.end.toFixed(2)} s`}</p>
   <div className="text-xs">{f('Transcription model')}<ModelPicker disabled={busy} value={model} language={language} onChange={next=>{setModel(next);if(!modelSupportsLanguage(next,language))setLanguage('en');}}/></div>
   <div className="text-xs">{f('Transcription language')}<Dropdown label={f('Transcription language')} disabled={busy} value={language} onChange={value=>setLanguage(value as TranscriptLanguage)} options={TRANSCRIPT_LANGUAGE_ORDER.map(id=>({value:id,label:id==='auto'?f('Automatic'):TRANSCRIPT_LANGUAGES[id].nativeLabel,disabled:!modelSupportsLanguage(model,id)}))}/></div>
   <p className="my-3 text-xs text-zinc-500">{f(scope==='all'?'The full transcript will be replaced. Timeline cuts stay unchanged.':'Only this source range will be replaced. Timeline cuts stay unchanged.')}</p>
   {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
   <div className="mt-4 flex justify-end gap-3"><Button disabled={busy} onClick={()=>setRange(null)}>{f('Cancel')}</Button><Button disabled={busy||!modelSupportsLanguage(model,language)} onClick={()=>void run()}>{f('Transcribe')}</Button></div>
  </div>
 </div>,document.body)}</>;
}
