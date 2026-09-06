"use client";
import {useEffect} from 'react';
let started=false;
async function analyze(){
 const bridge=window.rescriptDesktop!.silenceProcessing;
 const worker=new Worker(new URL('../../workers/silence.worker.ts',import.meta.url),{type:'module'});
 try{while(true){const chunk=await bridge.take();if(!chunk)return;
  const result=await new Promise<{rms:number[];speech:number[]}>((resolve,reject)=>{
   worker.onmessage=event=>{const message=event.data;if(message.type==='complete')resolve(message);else if(message.type==='error')reject(Error(message.message));else if(message.type==='progress')void bridge.progress(message.value);};
   worker.onerror=event=>reject(Error(event.message||'Speech detector stopped.'));
   worker.postMessage({audio:chunk.audio,discardFrames:chunk.discardFrames},[chunk.audio.buffer]);
  });await bridge.checkpoint(chunk.index,result.rms,result.speech);
 }}finally{worker.terminate();}
}
export default function AnalysisPage(){useEffect(()=>{if(started)return;started=true;void analyze().catch(error=>{void window.rescriptDesktop!.silenceProcessing.fail(String(error));});},[]);return <main>Background acoustic analysis</main>;}
