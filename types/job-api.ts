import type { ProjectDocument } from '../electron/project-files';
import type { JobState, JobChunk, StoredPeaks } from '../electron/transcription-jobs';
import type { Word } from '../lib/types';
export interface DesktopJobs {
  start(id:string,model:string,language:string,transcribe:boolean):Promise<JobState>;
  read(id:string):Promise<(JobState&{progress?:{message:string;value:number|null}})|null>;
  pause(id:string):Promise<JobState>;
  transcribeAll(id:string,model:string,language:string):Promise<JobState>;
  transcribeRange(id:string,start:number,end:number,model:string,language:string):Promise<JobState>;
  retryChunks(id:string,indices:number[]):Promise<JobState>;
  fork(sourceId:string,destinationId:string):Promise<JobState|null>;
  result(id:string):Promise<{words:Word[];waveform:StoredPeaks|null;project:ProjectDocument}>;
  onChanged(callback:(id:string)=>void):()=>void;
}
export interface ProcessingBridge {
  take():Promise<{job:JobState;project:ProjectDocument}>;
  preparation():Promise<{index:number;sampleCount:number;finished:boolean}>;
  prepareChunk(index:number,bytes:Uint8Array,finished:boolean):Promise<{index:number;sampleCount:number;finished:boolean}>;
  completePreparedAudio():Promise<JobState>;
  beginAudio():Promise<void>;
  appendAudio(bytes:Uint8Array):Promise<void>;
  audioReady(peaks:StoredPeaks):Promise<JobState>;
  preferCpu():Promise<JobState>;
  next():Promise<JobChunk|null>;
  checkpoint(key:string,chunk:Omit<JobChunk,'audio'>,words:Word[]):Promise<JobState>;
  progress(message:string,value:number|null):Promise<void>;
  fail(message:string):Promise<void>;
}
