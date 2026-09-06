"use client";
import Dropdown from './Dropdown';
import {MODELS,modelSupportsLanguage,type ModelId} from '@/lib/models';
import {TRANSCRIPT_LANGUAGES,TRANSCRIPT_LANGUAGE_ORDER,type TranscriptLanguage} from '@/lib/languages';
import {useForkI18n} from './I18nProvider';
export default function TranscriptionLanguagePicker({model,value,onChange,disabled=false}:{model:ModelId;value:TranscriptLanguage;onChange:(value:TranscriptLanguage)=>void;disabled?:boolean}){
 const f=useForkI18n();const capabilities=MODELS[model].capabilities;
 return <><Dropdown label={f('Transcription language')} disabled={disabled} value={value} onChange={id=>{if(modelSupportsLanguage(model,id))onChange(id as TranscriptLanguage);}} options={TRANSCRIPT_LANGUAGE_ORDER.map(id=>({value:id,label:id==='auto'?f(capabilities.languageSelection==='fixed'?'English (fixed)':'Automatic'):TRANSCRIPT_LANGUAGES[id].nativeLabel,disabled:!modelSupportsLanguage(model,id)}))}/>
 {capabilities.languageSelection==='automatic'&&<p className="mt-1 text-xs text-zinc-500">{f('This model detects language automatically. Choose Automatic.')}</p>}
 {!modelSupportsLanguage(model,value)&&<p role="alert" className="mt-1 text-xs text-red-600">{f('This model does not support the selected transcription language.')}</p>}</>;
}
