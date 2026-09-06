import type {ModelId} from '../lib/models';
export interface ModelFileRecord {root:string;size:number;sha256:string;}
export interface ModelDownload {model:ModelId;file:string;loaded:number;total:number|null;completed:number;count:number;state:'downloading'|'complete'|'error';error?:string;}
export interface ModelStorageStatus {folder:string;busy:boolean;relocating:boolean;relocation:{completed:number;total:number}|null;error:string|null;models:Record<ModelId,{available:boolean;bytes:number;files:string[];outsideDefault:boolean}>;downloads:ModelDownload[];}
export interface DesktopModels {
 status(gpu:boolean):Promise<ModelStorageStatus>;
 download(id:ModelId,gpu:boolean):Promise<void>;
 remove(id:ModelId):Promise<void>;
 chooseFolder():Promise<string|null>;
 relocate():Promise<void>;
 importStart(id:ModelId,file:string,size:number):Promise<string|null>;
 importAppend(token:string,offset:number,bytes:Uint8Array):Promise<void>;
 importFinish(token:string):Promise<void>;
 importCancel(token:string):Promise<void>;
}
