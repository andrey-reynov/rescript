import type {AcousticAnalysis} from '../lib/silence-analysis';
export interface SilenceJob {key:string;fingerprint:string;sampleCount:number;total:number;completed:number[];status:'running'|'paused'|'error'|'complete';message:string;progress:number;}
export interface SilenceChunk {index:number;audio:Float32Array;discardFrames:number;}
export interface DesktopSilence {read(id:string):Promise<SilenceJob|null>;result(id:string):Promise<AcousticAnalysis|null>;start(id:string):Promise<SilenceJob>;pause(id:string):Promise<void>;onChanged(callback:(id:string)=>void):()=>void;}
export interface SilenceProcessing {take():Promise<SilenceChunk|null>;checkpoint(index:number,rms:number[],speech:number[]):Promise<void>;progress(value:number):Promise<void>;fail(message:string):Promise<void>;}
