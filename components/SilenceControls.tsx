"use client";
import {useMemo,useState,useRef,useEffect,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import Button from './Button';
import Dropdown from './Dropdown';
import {useEditorStore} from '@/lib/store';
import {silenceDetections,detectionCuts,type SilenceSettings,type DetectionKind} from '@/lib/silence-analysis';
import {useSilenceAnalysis} from '@/hooks/useSilenceAnalysis';
import {useForkI18n} from './I18nProvider';
export default function SilenceControls({children}:{children:(open:()=>void)=>ReactNode}){
 const dialog=useRef<HTMLElement>(null);
 const f=useForkI18n();const [open,setOpen]=useState(false),[selection,setSelection]=useState('overlap');
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>previous?.focus();},[open]);
 const settings=useEditorStore(s=>s.silenceSettings),analysis=useEditorStore(s=>s.acousticAnalysis),duration=useEditorStore(s=>s.duration),id=useEditorStore(s=>s.projectId),hasAudio=useEditorStore(s=>s.hasAudio),jobState=useEditorStore(s=>s.jobState);
 const {job,error,start,pause}=useSilenceAnalysis();
 const detections=useMemo(()=>silenceDetections(analysis,settings),[analysis,settings]);
 const selected=selection==='amplitude'?detections.amplitude:selection==='noSpeech'?detections.noSpeech:detections.ranges.filter(range=>selection==='either'||range.kind==='overlap');
 const cuts=detectionCuts(selected,settings,duration);const change=(value:Partial<SilenceSettings>)=>useEditorStore.getState().setSilenceSettings(value);
 const field=(key:'absoluteDb'|'relativePercent'|'vadThreshold'|'minDuration'|'preHandle'|'postHandle'|'mergeGap',label:string,min:number,max:number,step:number)=><label className="flex flex-col gap-1 text-xs">{f(label)}<input type="number" aria-label={f(label)} min={min} max={max} step={step} value={settings[key]} onChange={event=>change({[key]:Number(event.target.value)})} className="w-full rounded-lg border border-zinc-200 bg-transparent p-2 dark:border-zinc-700"/></label>;
 return <>{children(()=>setOpen(true))}{open&&createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={()=>setOpen(false)}>
  <section ref={dialog} role="dialog" aria-modal="true" aria-label={f('Silence detection')} className="max-h-[88vh] w-[520px] max-w-[94vw] overflow-auto rounded-xl bg-white p-5 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100" onClick={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}if(event.key==='Tab'){const targets=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(element=>element.getBoundingClientRect().width>0);const index=targets.indexOf(document.activeElement as HTMLElement);if(event.shiftKey&&index<=0){event.preventDefault();targets.at(-1)?.focus();}else if(!event.shiftKey&&index===targets.length-1){event.preventDefault();targets[0]?.focus();}}}}>
   <div className="mb-3 flex justify-between"><h2 className="font-semibold">{f('Silence detection')}</h2><Button variant="icon" aria-label={f('Close')} onClick={()=>setOpen(false)}><X size={16}/></Button></div>
   <p className="mb-3 text-xs text-zinc-500">{f('Volume and speech are separate detectors. Detection never deletes audio.')}</p>
   <div className="flex gap-2"><Button disabled={!id||!hasAudio||jobState==='running'||jobState==='preparing'||job?.status==='running'||!window.rescriptDesktop?.silence} onClick={()=>void start()}>{f(job?.status==='paused'||job?.status==='error'?'Resume detection':'Analyze audio')}</Button>{job?.status==='running'&&<Button onClick={()=>void pause()}>{f('Pause')}</Button>}</div>
   {job&&<p role="status" className="mt-2 text-xs">{f(job.message)} · {Math.round(job.progress*100)}%</p>}
   {(error||job?.status==='error')&&<p role="alert" className="mt-2 text-xs text-red-600">{error||job?.message}</p>}
   {!window.rescriptDesktop?.silence&&<p className="mt-2 text-xs">{f('Install the desktop app for saved audio analysis.')}</p>}
   <div className="my-4 grid grid-cols-2 gap-3"><div className="text-xs">{f('Volume threshold')}<Dropdown label={f('Volume threshold')} value={settings.thresholdMode} onChange={value=>change({thresholdMode:value as 'absolute'|'relative'})} options={[{value:'absolute',label:f('Absolute (dBFS)')},{value:'relative',label:f('Percent of average')}]}/></div>
    {settings.thresholdMode==='absolute'?field('absoluteDb','Threshold (dBFS)',-96,0,1):field('relativePercent','Average volume (%)',0,100,1)}
    {field('vadThreshold','Speech probability',0,1,.05)}{field('minDuration','Minimum region (seconds)',0,30,.05)}
   </div>
   <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.visible} onChange={event=>change({visible:event.target.checked})}/>{f('Show detected regions')}</label>
   <div className="my-3 flex flex-wrap gap-3">{(['amplitude','noSpeech','overlap'] as DetectionKind[]).map(kind=><label key={kind} className="flex items-center gap-1 text-xs"><input type="color" aria-label={f(kind==='amplitude'?'Amplitude silence':kind==='noSpeech'?'No speech':'Overlap')} value={settings.colors[kind]} onChange={event=>change({colors:{...settings.colors,[kind]:event.target.value}})} className="h-6 w-7"/>{f(kind==='amplitude'?'Amplitude silence':kind==='noSpeech'?'No speech':'Overlap')}</label>)}</div>
   <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700"><h3 className="text-sm font-medium">{f('Auto Cut')}</h3><Dropdown label={f('Regions to delete')} value={selection} onChange={setSelection} options={[{value:'overlap',label:f('Overlap only')},{value:'amplitude',label:f('Amplitude silence')},{value:'noSpeech',label:f('No speech')},{value:'either',label:f('Either detector')}]}/>
    <div className="mb-3 grid grid-cols-3 gap-2">{field('preHandle','Before speech (seconds)',0,5,.05)}{field('postHandle','After speech (seconds)',0,5,.05)}{field('mergeGap','Merge gaps (seconds)',0,5,.05)}</div>
    <Button disabled={!cuts.length} onClick={()=>{useEditorStore.getState().cutRanges(cuts);setOpen(false);}}>{f('Delete detected regions')} ({cuts.length})</Button>
   </div>
  </section>
 </div>,document.body)}</>;
}
