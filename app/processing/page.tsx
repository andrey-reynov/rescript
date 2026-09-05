"use client";
import { useEffect } from 'react';
import { extractAudio, releaseFFmpeg } from '@/lib/ffmpeg';
import { buildWaveformPeaks } from '@/lib/waveform';
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
    await bridge.progress('Extracting audio in background',null);
    const audio=await extractAudio(new File([blob],project.media.name,{type:blob.type}));
    await releaseFFmpeg();
    const pcm=audio??new Float32Array(0);
    const peaks=buildWaveformPeaks(pcm,100000);
    await bridge.beginAudio();
    for(let at=0;at<pcm.length;at+=16000*60) {
      const chunk=pcm.slice(at,Math.min(pcm.length,at+16000*60));
      await bridge.appendAudio(new Uint8Array(chunk.buffer));
    }
    job=await bridge.audioReady({...peaks,min:Array.from(peaks.min),max:Array.from(peaks.max)});
  }
  if(job.status==='complete')return;
  const worker=new Worker(new URL('../../workers/transcription.worker.ts',import.meta.url),{type:'module'});
  try {
    while(true) {
      const chunk=await bridge.next();if(!chunk)return;
      const {audio,...timing}=chunk;
      let lastProgress=0;
      const words=await new Promise<Word[]>((resolve,reject)=>{
        worker.onmessage=(event:MessageEvent<WorkerResponse>)=>{
          const message=event.data;
          if(message.type==='complete')resolve(message.words);
          if(message.type==='error')reject(new Error(message.message));
          if(message.type==='progress'&&Date.now()-lastProgress>250){lastProgress=Date.now();void bridge.progress(`Batch ${chunk.index+1}/${job.total} · ${message.message}`,message.value).catch(()=>{});}
        };
        worker.onerror=error=>reject(new Error(error.message||'Transcription worker stopped'));
        const request:WorkerRequest={audio,duration:audio.length/16000,model:job.model as ModelId,language:job.language as TranscriptLanguage};
        worker.postMessage(request,[audio.buffer]);
      });
      job=await bridge.checkpoint(job.key,timing,words);
      if(job.status==='complete')return;
    }
  }finally{worker.terminate();}
}

export default function ProcessingPage(){
  useEffect(()=>{if(started)return;started=true;void processProject().catch(error=>{console.error(error);void window.rescriptDesktop?.processing.fail(error instanceof Error?error.message:String(error)).catch(()=>{});});},[]);
  return <main>Background media processing</main>;
}
