"use client";
import { useEffect } from 'react';
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
    const response=await fetch(`app://localhost/__media/${encodeURIComponent(job.projectId)}`);
    if(!response.ok)throw Error('Original source is unavailable. Relink it from the project library.');
    const blob=await response.blob();
    const file=new File([blob],project.media.name,{type:blob.type});
    let preparation=await bridge.preparation();
    try {
      while(!preparation.finished){
        await bridge.progress('Preparing audio · '+preparation.index+' minutes saved',project.data.duration>0?Math.min(1,preparation.sampleCount/16000/project.data.duration):null);
        // Repeated FFmpeg exec calls retain arena memory in this WASM build.
        // Recreate it periodically; the mounted File and committed audio survive.
        if(preparation.index>0&&preparation.index%16===0)await releaseFFmpeg();
        const interval={start:preparation.index*60,duration:60};
        let pcm:Float32Array;
        try {pcm=await extractAudio(file,interval)??new Float32Array(0);}
        catch {
          await releaseFFmpeg();
          await bridge.progress('Restarting audio decoder at saved minute '+preparation.index,null);
          pcm=await extractAudio(file,interval)??new Float32Array(0);
        }
        preparation=await bridge.prepareChunk(preparation.index,new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength),pcm.length<16000*60);
      }
    } finally {await releaseFFmpeg();}
    job=await bridge.completePreparedAudio();
  }
  if(job.status==='complete')return;
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
        const request:WorkerRequest={audio,preferWasm:job.preferWasm,duration:audio.length/16000,model:job.model as ModelId,language:job.language as TranscriptLanguage};
        worker.postMessage(request,[audio.buffer]);
      });
      } catch(error) {
        if(error instanceof Error&&error.cause==='gpu'&&!job.preferWasm){
          worker.terminate();job=await bridge.preferCpu();
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
