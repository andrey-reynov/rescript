import {assertModelLanguage} from '../lib/models';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { beginPreparation, commitPreparation, readPreparation } from './audio-preparation';
import { atomicJson, ProjectFiles } from './project-files';
export interface JobWord { language?:string; id:number; text:string; start:number; end:number; speaker:number; deleted:boolean; }
type Word = JobWord;

export const JOB_CHUNK_SECONDS=60;
const RATE=16000;
const PAD_SECONDS=2;
export interface JobState {
  projectId:string;
  key:string;
  baseKey?:string;
  preferWasm?:boolean;
  replacementChunks?:number[];
  replacementRange?:{start:number;end:number};
  model:string;
  language:string;
  transcribe:boolean;
  status:'preparing'|'running'|'paused'|'error'|'complete';
  message:string;
  completed:number[];
  total:number;
  sampleCount:number;
  sourceFingerprint:string;
  updatedAt:number;
}
export interface JobChunk { index:number; start:number; coreStart:number; coreEnd:number; audio:Float32Array; }
export interface StoredPeaks {bucketSize:number;sampleCount:number;min:number[];max:number[];}

/** Source time is authoritative. Overlap belongs to exactly one core interval. */
export function mapChunkWords(chunk:Pick<JobChunk,'index'|'start'|'coreStart'|'coreEnd'>,words:Word[]):Word[] {
  return words.filter(word=>Number.isFinite(word.start)&&Number.isFinite(word.end)&&word.end>=word.start)
    .map(word=>({...word,start:word.start+chunk.start,end:word.end+chunk.start}))
    .filter(word=>{const center=(word.start+word.end)/2;return center>=chunk.coreStart&&center<chunk.coreEnd;})
    .map((word,index)=>({...word,id:chunk.index*100000+index,start:Math.max(0,word.start),deleted:false}));
}

/** Replace only requested source-time batches; keep edits and IDs everywhere else. */
export function mergeChunkReplacement(existing:Word[],generated:Word[],chunks:number[]):Word[] {
  const selected=new Set(chunks);
  const inSelected=(word:Word)=>selected.has(Math.floor(((word.start+word.end)/2)/JOB_CHUNK_SECONDS));
  const kept=existing.filter(word=>!inSelected(word));
  let nextId=existing.reduce((max,word)=>Math.max(max,word.id),-1)+1;
  const replacement=generated.filter(inSelected).map(word=>({...word,id:nextId++}));
  return [...kept,...replacement].sort((a,b)=>a.start-b.start||a.id-b.id);
}

export class TranscriptionJobs {
  private tail:Promise<unknown>=Promise.resolve();
  constructor(readonly projects:ProjectFiles) {}
  private serial<T>(fn:()=>Promise<T>):Promise<T>{const p=this.tail.catch(()=>{}).then(fn);this.tail=p;return p;}
  private async manifest(id:string){return `${await this.projects.fileFor(id)}.job.json`;}
  private async cache(id:string){return `${await this.projects.fileFor(id)}.cache`;}
  async read(id:string):Promise<JobState|null>{try{return JSON.parse(await fs.readFile(await this.manifest(id),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
  private async write(job:JobState){job.updatedAt=Date.now();await atomicJson(await this.manifest(job.projectId),job);return job;}
  async resultDirectory(job:JobState){return path.join(await this.cache(job.projectId),'transcription',job.key);}
  private async completed(job:JobState){
    const dir=await this.resultDirectory(job);await fs.mkdir(dir,{recursive:true});
    const result:number[]=[];
    for(const name of await fs.readdir(dir))if(/^\d+\.json$/.test(name)){
      try {const row=JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));const index=Number(name.slice(0,-5));if(row.key===job.key&&Array.isArray(row.words)&&index>=0&&index<job.total)result.push(index);}catch{/* Retry a damaged chunk. */}
    }
    return result.sort((a,b)=>a-b);
  }
  start(id:string,model:string,language:string,transcribe:boolean):Promise<JobState>{return this.serial(async()=>{
    if(transcribe)assertModelLanguage(model,language);
    const doc=await this.projects.read(id);await this.projects.mediaPath(id);
    const key=createHash('sha256').update(JSON.stringify({fingerprint:doc.media.fingerprint,model,language,task:"transcribe",version:2,chunk:JOB_CHUNK_SECONDS,transcribe})).digest('hex').slice(0,24);
    const old=await this.read(id);
    if(old?.replacementRange && old.model===model && old.language===language && old.sourceFingerprint===doc.media.fingerprint && transcribe && old.status!=='complete'){
      return this.write({...old,status:'running',message:'Resuming selected range'});
    }
    const job:JobState=old&&(old.baseKey??old.key)===key?{...old,status:'running',message:'Resuming completed checkpoints'}:{projectId:id,key,model,language,transcribe,status:'preparing',message:'Preparing audio',completed:[],total:0,sampleCount:0,sourceFingerprint:doc.media.fingerprint,updatedAt:Date.now()};
    try{
      const cache=await this.cache(id);
      const info=JSON.parse(await fs.readFile(path.join(cache,'audio.json'),'utf8'));
      const stat=await fs.stat(path.join(cache,'audio.f32'));
      if(info.fingerprint!==doc.media.fingerprint||stat.size!==info.sampleCount*4)throw Error('Invalid audio cache');
      job.sampleCount=info.sampleCount;job.total=transcribe?Math.ceil(info.sampleCount/(RATE*JOB_CHUNK_SECONDS)):0;
      job.completed=await this.completed(job);job.status=job.completed.length===job.total?'complete':'running';
    }catch{job.status='preparing';}
    return this.write(job);
  });}
  fork(sourceId:string,destinationId:string):Promise<JobState|null>{return this.serial(async()=>{
    if(sourceId===destinationId)throw Error('A project variant needs a distinct identity.');
    const job=await this.read(sourceId);if(!job)return null;
    if(job.status==='running'||job.status==='preparing')throw Error('Pause processing before copying its checkpoints.');
    const source=await this.projects.read(sourceId),destination=await this.projects.read(destinationId);
    if(source.media.fingerprint!==destination.media.fingerprint)throw Error('Project sources do not match.');
    const cloned:JobState={...job,projectId:destinationId};
    const sourceCache=await this.cache(sourceId),destinationCache=await this.cache(destinationId);
    await fs.mkdir(destinationCache,{recursive:true});
    for(const name of ['audio.f32','audio.json','waveform.json','audio.pending','audio-preparation.json']){
      try{await fs.copyFile(path.join(sourceCache,name),path.join(destinationCache,name));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    }
    const sourceDirectory=await this.resultDirectory(job),destinationDirectory=await this.resultDirectory(cloned);
    await fs.mkdir(destinationDirectory,{recursive:true});
    for(const index of await this.completed(job))await fs.copyFile(path.join(sourceDirectory,index+'.json'),path.join(destinationDirectory,index+'.json'));
    cloned.completed=await this.completed(cloned);
    // The destination becomes resumable only after all available checkpoints copy.
    return this.write(cloned);
  });}
  retryChunks(id:string,indices:number[]):Promise<JobState>{return this.serial(async()=>{
    const old=await this.read(id);if(!old||!old.transcribe||old.total===0)throw Error('No transcription batches are available.');
    if(old.status==='running'||old.status==='preparing')throw Error('Pause processing before selecting batches to retry.');
    if(!Array.isArray(indices)||!indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=old.total))throw Error('Select valid transcription batches.');
    const selected=[...new Set(indices)].sort((a,b)=>a-b);
    const key=randomUUID();
    const job:JobState={...old,key,baseKey:old.baseKey??old.key,status:'paused',message:'Selected batches are ready to transcribe',completed:[],replacementChunks:[...new Set([...(old.status==='complete'?[]:old.replacementChunks??[]),...selected])]};
    const oldDirectory=await this.resultDirectory(old),directory=await this.resultDirectory(job);
    await fs.mkdir(directory,{recursive:true});
    for(const index of await this.completed(old))if(!selected.includes(index)){
      const row=JSON.parse(await fs.readFile(path.join(oldDirectory,index+'.json'),'utf8'));
      await atomicJson(path.join(directory,index+'.json'),{...row,key});
      job.completed.push(index);
    }
    // Switching the manifest is the commit point. A crash while copying retains
    // the previous valid generation; committed source chunks are never deleted.
    return this.write(job);
  });}
  transcribeRange(id:string,start:number,end:number,model:string,language:string):Promise<JobState>{return this.serial(async()=>{
    assertModelLanguage(model,language);
    const old=await this.read(id),doc=await this.projects.read(id);
    if(!old || old.status==='preparing'||old.status==='running')throw Error('Wait for audio preparation or pause processing first.');
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>old.sampleCount/RATE)throw Error('Select a valid source range.');
    if(old.sourceFingerprint!==doc.media.fingerprint)throw Error('Source media changed. Prepare audio again.');
    return this.write({...old,key:randomUUID(),baseKey:undefined,model,language,transcribe:true,preferWasm:undefined,
      replacementChunks:undefined,replacementRange:{start,end},completed:[],total:Math.ceil((end-start)/JOB_CHUNK_SECONDS),status:'running',message:'Transcribing selected range'});
  });}
  async transcribeAll(id:string,model:string,language:string):Promise<JobState>{
    const previous=await this.read(id);
    if(!previous?.sampleCount)throw Error('Prepare source audio before retranscribing.');
    return this.transcribeRange(id,0,previous.sampleCount/RATE,model,language);
  }
  async audioFile(id:string){return path.join(await this.cache(id),'audio.f32');}
  preparation(id:string){return this.serial(async()=>{const doc=await this.projects.read(id);const state=await beginPreparation(await this.cache(id),doc.media.fingerprint,doc.data.duration);return {index:state.index,sampleCount:state.sampleCount,finished:state.finished};});}
  prepareChunk(id:string,index:number,bytes:Uint8Array,finished:boolean){return this.serial(async()=>{const state=await commitPreparation(await this.cache(id),index,bytes,finished);const job=await this.read(id);if(job){job.sampleCount=state.sampleCount;await this.write(job);}return {index:state.index,sampleCount:state.sampleCount,finished:state.finished};});}
  completePreparedAudio(id:string):Promise<JobState>{return this.serial(async()=>{const state=await readPreparation(await this.cache(id));if(!state.finished)throw Error('Audio preparation is incomplete');return this.finishAudio(id,state);});}
  beginAudio(id:string):Promise<void>{return this.serial(async()=>{
    const cache=await this.cache(id);await fs.mkdir(cache,{recursive:true});
    await fs.writeFile(path.join(cache,'audio.pending'),'');
  });}
  appendAudio(id:string,bytes:Uint8Array):Promise<void>{return this.serial(async()=>{
    if(bytes.byteLength>8*1024*1024)throw new Error('Audio input must be sent in bounded chunks.');
    await fs.appendFile(path.join(await this.cache(id),'audio.pending'),bytes);
  });}
  audioReady(id:string,peaks:StoredPeaks):Promise<JobState>{return this.serial(()=>this.finishAudio(id,peaks));}
  private async finishAudio(id:string,peaks:StoredPeaks):Promise<JobState>{
    const job=await this.read(id);if(!job)throw Error('Job missing');
    const cache=await this.cache(id);const temp=path.join(cache,'audio.pending');
    if((await fs.stat(temp)).size!==peaks.sampleCount*4)throw Error('Incomplete audio extraction');
    const handle=await fs.open(temp,'r+');try{await handle.sync();}finally{await handle.close();}
    await fs.rename(temp,await this.audioFile(id));
    await atomicJson(path.join(cache,'waveform.json'),peaks);
    await atomicJson(path.join(cache,'audio.json'),{fingerprint:job.sourceFingerprint,sampleCount:peaks.sampleCount});
    job.sampleCount=peaks.sampleCount;job.total=job.transcribe?Math.ceil(peaks.sampleCount/(RATE*JOB_CHUNK_SECONDS)):0;
    job.completed=await this.completed(job);job.status=job.completed.length===job.total?'complete':'running';
    job.message=job.status==='complete'?'Ready':'Transcribing in saved batches';return this.write(job);
  }
  async waveform(id:string):Promise<StoredPeaks|null>{const cache=await this.cache(id);try{return JSON.parse(await fs.readFile(path.join(cache,'waveform.json'),'utf8'));}catch{try{return await readPreparation(cache);}catch{return null;}}}
  async next(id:string):Promise<JobChunk|null>{
    const job=await this.read(id);if(!job||job.status!=='running')return null;
    const index=Array.from({length:job.total},(_,i)=>i).find(i=>!job.completed.includes(i));
    if(index===undefined)return null;
    const offset=job.replacementRange?.start??0;
    const coreStart=offset+index*JOB_CHUNK_SECONDS,coreEnd=Math.min(offset+(index+1)*JOB_CHUNK_SECONDS,job.replacementRange?.end??job.sampleCount/RATE);
    const from=Math.max(Math.round((job.replacementRange?.start??0)*RATE),Math.round((coreStart-PAD_SECONDS)*RATE));
    const to=Math.min(Math.round((job.replacementRange?.end??job.sampleCount/RATE)*RATE),Math.round((coreEnd+PAD_SECONDS)*RATE));
    const buffer=Buffer.alloc((to-from)*4);const handle=await fs.open(await this.audioFile(id),'r');
    try{const {bytesRead}=await handle.read(buffer,0,buffer.length,from*4);if(bytesRead!==buffer.length)throw Error('Audio cache is incomplete; retry preparation.');}finally{await handle.close();}
    return {index,start:from/RATE,coreStart,coreEnd,audio:new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength))};
  }
  checkpoint(id:string,key:string,chunk:Omit<JobChunk,'audio'>,words:Word[]):Promise<JobState>{return this.serial(async()=>{
    const job=await this.read(id);if(!job||job.key!==key)throw Error('Stale transcription result rejected.');
    if(chunk.index<0||chunk.index>=job.total)throw Error('Invalid chunk index');
    await atomicJson(path.join(await this.resultDirectory(job),`${chunk.index}.json`),{key,words:mapChunkWords(chunk,words)});
    job.completed=await this.completed(job);
    if(job.completed.length===job.total){job.status='complete';job.message='Transcription complete';}
    return this.write(job);
  });}
  preferCpu(id:string):Promise<JobState>{return this.serial(async()=>{const job=await this.read(id);if(!job)throw Error('Job missing');job.preferWasm=true;job.message='GPU reset — continuing on CPU from saved batches';return this.write(job);});}
  setStatus(id:string,status:JobState['status'],message:string):Promise<JobState>{return this.serial(async()=>{const job=await this.read(id);if(!job)throw Error('Job missing');job.status=status;job.message=message;return this.write(job);});}
  async words(id:string):Promise<Word[]>{const job=await this.read(id);if(!job)return [];const dir=await this.resultDirectory(job);const words:Word[]=[];for(const index of await this.completed(job)){const row=JSON.parse(await fs.readFile(path.join(dir,`${index}.json`),'utf8'));words.push(...row.words);}return words;}
}
