import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { atomicJson, ProjectFiles } from './project-files';
export interface JobWord { id:number; text:string; start:number; end:number; speaker:number; deleted:boolean; }
type Word = JobWord;

export const JOB_CHUNK_SECONDS=60;
const RATE=16000;
const PAD_SECONDS=2;
export interface JobState {
  projectId:string;
  key:string;
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
    const doc=await this.projects.read(id);await this.projects.mediaPath(id);
    const key=createHash('sha256').update(JSON.stringify({fingerprint:doc.media.fingerprint,model,language,version:1,chunk:JOB_CHUNK_SECONDS,transcribe})).digest('hex').slice(0,24);
    const old=await this.read(id);
    const job:JobState=old?.key===key?{...old,status:'running',message:'Resuming completed checkpoints'}:{projectId:id,key,model,language,transcribe,status:'preparing',message:'Preparing audio',completed:[],total:0,sampleCount:0,sourceFingerprint:doc.media.fingerprint,updatedAt:Date.now()};
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
  async audioFile(id:string){return path.join(await this.cache(id),'audio.f32');}
  beginAudio(id:string):Promise<void>{return this.serial(async()=>{
    const cache=await this.cache(id);await fs.mkdir(cache,{recursive:true});
    await fs.writeFile(path.join(cache,'audio.pending'),'');
  });}
  appendAudio(id:string,bytes:Uint8Array):Promise<void>{return this.serial(async()=>{
    if(bytes.byteLength>8*1024*1024)throw new Error('Audio input must be sent in bounded chunks.');
    await fs.appendFile(path.join(await this.cache(id),'audio.pending'),bytes);
  });}
  audioReady(id:string,peaks:StoredPeaks):Promise<JobState>{return this.serial(async()=>{
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
  });}
  async waveform(id:string):Promise<StoredPeaks|null>{try{return JSON.parse(await fs.readFile(path.join(await this.cache(id),'waveform.json'),'utf8'));}catch{return null;}}
  async next(id:string):Promise<JobChunk|null>{
    const job=await this.read(id);if(!job||job.status!=='running')return null;
    const index=Array.from({length:job.total},(_,i)=>i).find(i=>!job.completed.includes(i));
    if(index===undefined)return null;
    const coreStart=index*JOB_CHUNK_SECONDS,coreEnd=Math.min((index+1)*JOB_CHUNK_SECONDS,job.sampleCount/RATE);
    const from=Math.max(0,Math.round((coreStart-PAD_SECONDS)*RATE));
    const to=Math.min(job.sampleCount,Math.round((coreEnd+PAD_SECONDS)*RATE));
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
  setStatus(id:string,status:JobState['status'],message:string):Promise<JobState>{return this.serial(async()=>{const job=await this.read(id);if(!job)throw Error('Job missing');job.status=status;job.message=message;return this.write(job);});}
  async words(id:string):Promise<Word[]>{const job=await this.read(id);if(!job)return [];const dir=await this.resultDirectory(job);const words:Word[]=[];for(const index of await this.completed(job)){const row=JSON.parse(await fs.readFile(path.join(dir,`${index}.json`),'utf8'));words.push(...row.words);}return words;}
}
