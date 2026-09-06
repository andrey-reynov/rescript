"use client";
import {prepareDesktopModel,modelGpuAvailable} from '@/lib/desktop-models';
import { useEffect } from 'react';
import { readReferencedMedia } from '@/lib/media-input';
import { extractAudio, releaseFFmpeg } from '@/lib/ffmpeg';
import type { WorkerResponse, WorkerRequest, Word } from '@/lib/types';
import type { ModelId } from '@/lib/models';
import type { TranscriptLanguage } from '@/lib/languages';

let started=false;
async function processProject() {
  const bridge=window.rescriptDesktop!.processing;
  let {job}=await bridge.take();
  if(job.status==='preparing') {
    const {project}=await bridge.take();
    await bridge.progress('Reading media',0);
    const file=await readReferencedMedia({url: 'app://localhost/__media/'+encodeURIComponent(job.projectId),name:project.media.name,size:project.media.size,type:'',lastModified:project.media.modifiedAt},value=>{void bridge.progress('Reading media',value).catch(()=>{});});
    let preparation=await bridge.preparation();
    try {
      while(!preparation.finished){
        await bridge.progress('Preparing audio',project.data.duration>0?Math.min(1,preparation.sampleCount/16000/project.data.duration):null);
        // Repeated FFmpeg exec calls retain arena memory in this WASM build.
        // Recreate it periodically; the mounted File and committed audio survive.
        if(preparation.index>0&&preparation.index%16===0)await releaseFFmpeg();
        const interval={start:preparation.index*60,duration:60};
        let pcm:Float32Array;
        try {pcm=await extractAudio(file,interval)??new Float32Array(0);}
        catch {
          await releaseFFmpeg();
          await bridge.progress('Restarting decoder',null);
          pcm=await extractAudio(file,interval)??new Float32Array(0);
        }
        preparation=await bridge.prepareChunk(preparation.index,new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength),pcm.length<16000*60);
      }
    } finally {await releaseFFmpeg();}
    job=await bridge.completePreparedAudio();
  }
  if(job.status==='complete')return;
  await prepareDesktopModel(job.model as ModelId,!job.preferWasm&&await modelGpuAvailable(),(message,value)=>{void bridge.progress(message,value);});
  let worker=new Worker(new URL('../../workers/transcription.worker.ts',import.meta.url),{type:'module'});
  try {
    while(true) {
      const chunk=await bridge.next();if(!chunk)return;
      const {audio,...timing}=chunk;
      let lastProgress=0;
      let words:Word[];
      try { words=await new Promise<Word[]>((resolve,reject)=>{
        worker.onmessage=(event:MessageEvent<WorkerResponse>)=>{
          const message=event.data;
          if(message.type==='complete')resolve(message.words);
          if(message.type==='error')reject(new Error(message.message,{cause:message.cause}));
          if(message.type==='progress'&&Date.now()-lastProgress>250){lastProgress=Date.now();void bridge.progress(`Batch ${chunk.index+1}/${job.total} · ${message.message}`,message.value).catch(()=>{});}
        };
        worker.onerror=error=>reject(new Error(error.message||'Transcription worker stopped'));
        const request:WorkerRequest={audio,desktopModels:true,retainSpeechModel:true,preferWasm:job.preferWasm,duration:audio.length/16000,model:job.model as ModelId,language:job.language as TranscriptLanguage};
        worker.postMessage(request,[audio.buffer]);
      });
      } catch(error) {
        if(error instanceof Error&&error.cause==='gpu'&&!job.preferWasm){
          worker.terminate();job=await bridge.preferCpu();
          await prepareDesktopModel(job.model as ModelId,false,(message,value)=>{void bridge.progress(message,value);});
          worker=new Worker(new URL('../../workers/transcription.worker.ts',import.meta.url),{type:'module'});
          // Audio was transferred to the failed worker. Read the same unfinished
          // batch again from its source cache; completed text is never duplicated.
          continue;
        }
        throw error;
      }
      job=await bridge.checkpoint(job.key,timing,words);
      if(job.status==='complete')return;
    }
  }finally{worker.terminate();}
}

export default function ProcessingPage(){
  useEffect(()=>{if(started)return;started=true;void processProject().catch(error=>{console.error(error);void window.rescriptDesktop?.processing.fail(error instanceof Error?error.message:String(error)).catch(()=>{});});},[]);
  return <main>Background media processing</main>;
}
