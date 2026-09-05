import { promises as fs } from 'node:fs';
import path from 'node:path';
import { atomicJson } from './project-files';
import type { StoredPeaks } from './transcription-jobs';

export interface PreparationState extends StoredPeaks { fingerprint:string; index:number; finished:boolean; }
const metadata=(cache:string)=>path.join(cache,'audio-preparation.json');
export async function readPreparation(cache:string):Promise<PreparationState>{return JSON.parse(await fs.readFile(metadata(cache),'utf8'));}

/** Discard only bytes written after the last durable preparation checkpoint. */
export async function beginPreparation(cache:string,fingerprint:string,duration:number):Promise<PreparationState>{
  await fs.mkdir(cache,{recursive:true});const pending=path.join(cache,'audio.pending');
  try {
    const state=await readPreparation(cache);
    if(state.fingerprint!==fingerprint||!Number.isInteger(state.index)||state.index<0||!Number.isInteger(state.sampleCount)||state.sampleCount<0||state.bucketSize<1||!Array.isArray(state.min)||state.min.length!==state.max.length)throw Error('Invalid preparation checkpoint');
    // Finalization may have renamed the PCM just before an application crash.
    try{await fs.access(pending);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await fs.copyFile(path.join(cache,'audio.f32'),pending);}
    if((await fs.stat(pending)).size<state.sampleCount*4)throw Error('Incomplete preparation data');
    await fs.truncate(pending,state.sampleCount*4);
    return state;
  } catch(error) {
    const code=(error as NodeJS.ErrnoException).code;
    if(code && code!=='ENOENT')throw error;
    const state:PreparationState={fingerprint,index:0,finished:false,sampleCount:0,bucketSize:Math.max(1,Math.ceil((duration>0?duration:10000)*16000/100000)),min:[],max:[]};
    await fs.writeFile(pending,'');await atomicJson(metadata(cache),state);return state;
  }
}

export async function commitPreparation(cache:string,index:number,bytes:Uint8Array,finished:boolean):Promise<PreparationState>{
  const state=await readPreparation(cache);
  if(index<state.index)return state;
  if(index!==state.index||state.finished||bytes.byteLength%4!==0||bytes.byteLength>60*16000*4)throw Error('Invalid audio preparation batch');
  const samples=bytes.byteLength/4;
  if(!finished&&samples!==60*16000)throw Error('An intermediate audio batch must cover one complete minute');
  const pending=path.join(cache,'audio.pending');
  const handle=await fs.open(pending,'r+');
  try{
    // A failed previous append never becomes part of the next committed batch.
    await handle.truncate(state.sampleCount*4);
    let written=0;while(written<bytes.length){const result=await handle.write(bytes,written,bytes.length-written,state.sampleCount*4+written);if(!result.bytesWritten)throw Error('Could not write preparation batch');written+=result.bytesWritten;}
    await handle.sync();
  }finally{await handle.close();}
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=0;i<samples;i++){
    const bucket=Math.floor((state.sampleCount+i)/state.bucketSize);
    const value=Math.round(Math.max(-1,Math.min(1,view.getFloat32(i*4,true)))*127);
    state.min[bucket]=Math.min(state.min[bucket]??0,value);state.max[bucket]=Math.max(state.max[bucket]??0,value);
  }
  state.sampleCount+=samples;state.index++;state.finished=finished;
  await atomicJson(metadata(cache),state);return state;
}
