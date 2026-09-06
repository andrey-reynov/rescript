"use client";
import {useState} from 'react';
import {useEditorStore} from '@/lib/store';
import {assertModelLanguage,isModelId,modelSupportsLanguage} from '@/lib/models';
import ModelPicker from './ModelPicker';
import TranscriptionLanguagePicker from './TranscriptionLanguagePicker';
import {flushProjectAutosave,scheduleProjectAutosave} from '@/lib/autosave';
import {useTranscriber} from '@/hooks/useTranscriber';
import {extractAudio} from '@/lib/ffmpeg';
import {useForkI18n} from './I18nProvider';

export default function TranscriptionSetup(){
 const f=useForkI18n();
 const status=useEditorStore(s=>s.status), job=useEditorStore(s=>s.jobState);
 const words=useEditorStore(s=>s.words);
 const source=useEditorStore(s=>s.source),language=useEditorStore(s=>s.transcriptLanguage);
 const model=isModelId(source)?source:'base';
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const {transcribe}=useTranscriber();
 const start=async()=>{
  setBusy(true);setError('');
  try{
   const s=useEditorStore.getState();if(!isModelId(s.source))throw Error('Select a speech model.');
   assertModelLanguage(s.source,s.transcriptLanguage);
   useEditorStore.setState({skipTranscription:false});scheduleProjectAutosave();await flushProjectAutosave();
   if(window.rescriptDesktop?.jobs)await window.rescriptDesktop.jobs.start(useEditorStore.getState().projectId!,s.source,s.transcriptLanguage,true);
   else {const audio=await extractAudio(s.videoFile!);if(audio)transcribe(audio,audio.length/16000);}
  }catch(e){setError(e instanceof Error?e.message:'Could not start transcription.');}finally{setBusy(false);}
 };
 if(words.length)return null;
 return <div className="relative z-20 mt-10 shrink-0 border-b border-zinc-200 p-3 dark:border-zinc-800">
  <div className="mb-2 text-xs text-zinc-500">{f('Choose a model and transcription language when your audio is ready.')}</div>
  <div className="flex flex-wrap items-center gap-2">
   <div className="grid w-full gap-3 sm:grid-cols-2">
    <div className="min-w-0 text-xs">{f('Transcription model')}<ModelPicker value={model} language={language} onChange={id=>useEditorStore.getState().setSource(id)} disabled={busy||job==='running'||job==='preparing'}/></div>
    <div className="min-w-0 text-xs">{f('Transcription language')}<TranscriptionLanguagePicker model={model} value={language} onChange={id=>useEditorStore.getState().setTranscriptLanguage(id)} disabled={busy||job==='running'||job==='preparing'}/></div>
   </div>
   <button disabled={busy||!modelSupportsLanguage(model,language)||status!=='ready'||job==='running'||job==='preparing'} onClick={()=>void start()} className="rounded bg-zinc-900 px-3 py-2 text-xs text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">{f('Start transcription')}</button>
  </div>{error&&<p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
 </div>;
}
