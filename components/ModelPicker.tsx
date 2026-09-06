"use client";
import {useEffect,useState} from 'react';
import Dropdown from './Dropdown';
import {AudioLines} from 'lucide-react';
import {MODELS,MODEL_ORDER,type ModelId} from '@/lib/models';
import {modelAvailability,type Availability} from '@/lib/model-availability';
import type {TranscriptLanguage} from '@/lib/languages';
import {useForkI18n} from './I18nProvider';
export default function ModelPicker({value,onChange,disabled}:{value:ModelId;language:TranscriptLanguage;onChange:(id:ModelId)=>void;disabled:boolean}){
 const f=useForkI18n();const [availability,setAvailability]=useState<Partial<Record<ModelId,Availability>>>({});
 useEffect(()=>{let cancelled=false;const refresh=()=>{void modelAvailability().then(result=>{if(!cancelled)setAvailability(result);});};refresh();const timer=setInterval(refresh,5000);window.addEventListener('focus',refresh);window.addEventListener('rescript:models-changed',refresh);return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('rescript:models-changed',refresh);};},[]);
 const groups=[{status:'available',label:f('Downloaded')},{status:'missing',label:f('Not downloaded')},{status:'unknown',label:f('Download status unavailable')},{status:undefined,label:f('Checking downloads…')}];
 const options=groups.flatMap(group=>MODEL_ORDER.filter(id=>availability[id]===group.status).map(id=>{
  const m=MODELS[id];return {value:id,label:m.label,group:group.label,icon:<AudioLines size={14} className="shrink-0 text-zinc-400"/>,description:f(m.capabilities.description),meta:<span className="flex shrink-0 items-center gap-2 text-[10px] text-zinc-400">{m.experimental&&<span>{f('Experimental')}</span>}{group.status==='missing'&&<span>{m.size}</span>}</span>};
 }));
 return <Dropdown label={f('Transcription model')} value={value} onChange={id=>onChange(id as ModelId)} disabled={disabled} options={options}/>;
}
