import {promises as fs,createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {atomicJson} from './project-files';
import {MODELS,MODEL_ORDER,isModelId,type ModelId} from '../lib/models';
import {requiredModelFiles,modelFileUrl,modelFileFromUrl} from '../lib/model-files';
import type {ModelFileRecord,ModelStorageStatus,ModelDownload} from '../types/model-api';

interface Manifest {relocationError?:string|null;version:1;folder:string;files:Record<string,ModelFileRecord>;cleanup:{url:string;root:string}[];}
interface Transfer {url:string;temp:string;size:number;offset:number;root:string;}
export class ModelStorage {
 private manifest:Manifest|null=null;
 private initializing:Promise<Manifest>|null=null;
 private saving:Promise<unknown>=Promise.resolve();
 private pending=new Map<string,Promise<string>>();
 private transfers=new Map<string,Transfer>();
 private downloads=new Map<ModelId,ModelDownload>();
 private changing=false;
 private relocation:{completed:number;total:number}|null=null;
 private error:string|null=null;
 constructor(private stateFile:string,private initialFolder:string,private inUse:()=>boolean,private fetcher:typeof fetch=fetch){}
 get busy(){return this.changing||this.transfers.size>0;}
 private async state():Promise<Manifest>{
  if(this.initializing)return this.initializing;
  const loading=this.loadState();this.initializing=loading;try{return await loading;}catch(error){this.initializing=null;throw error;}
 }
 private async loadState(){
  if(this.manifest)return this.manifest;
  try{const state=JSON.parse(await fs.readFile(this.stateFile,'utf8')) as Manifest;if(state.version!==1||!path.isAbsolute(state.folder)||!state.files||!Array.isArray(state.cleanup))throw Error('Invalid model storage settings.');this.manifest=state;}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;this.manifest={version:1,folder:this.initialFolder,files:{},cleanup:[]};}
  return this.manifest!;
 }
 private async save(){const data=JSON.parse(JSON.stringify(await this.state()));const task=this.saving.catch(()=>{}).then(()=>atomicJson(this.stateFile,data));this.saving=task;await task;}
 private artifact(url:string){const artifact=modelFileFromUrl(url);if(!artifact)throw Error('Unknown model artifact.');return artifact;}
 /** No symlinked directory or traversal can redirect managed-file operations. */
 private async file(root:string,url:string,create=false){
  const {id,file}=this.artifact(url);
  if(!path.isAbsolute(root))throw Error('Invalid model directory.');
  const result=path.resolve(root,id,file);const relative=path.relative(path.resolve(root),result);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Invalid model path.');
  const parts=path.resolve(root,id,path.dirname(file)).split(path.sep);let current=parts.shift()!+path.sep;
  for(const part of parts){if(!part)continue;current=path.join(current,part);try{const stat=await fs.lstat(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Model directories must be real folders.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;if(create)await fs.mkdir(current);else return result;}}
  try{if((await fs.lstat(result)).isSymbolicLink())throw Error('Model files cannot be symbolic links.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  return result;
 }
 private async digest(file:string){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
 async existing(url:string):Promise<string|null>{
  this.artifact(url);const record=(await this.state()).files[url];if(!record)return null;
  try{const file=await this.file(record.root,url);const stat=await fs.stat(file);return stat.isFile()&&stat.size===record.size?file:null;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
 }
 async status(gpu:boolean):Promise<ModelStorageStatus>{
  const state=await this.state();const models={} as ModelStorageStatus['models'];
  for(const id of MODEL_ORDER){const files:string[]=[];let bytes=0,outsideDefault=false;for(const file of new Set([...requiredModelFiles(id,false),...requiredModelFiles(id,true)])){const url=modelFileUrl(id,file);if(await this.existing(url)){files.push(file);bytes+=state.files[url].size;outsideDefault ||= state.files[url].root!==state.folder;}}
   models[id]={available:requiredModelFiles(id,gpu).every(file=>files.includes(file)),files,bytes,outsideDefault};
  }
  return {folder:state.folder,busy:this.changing||this.inUse()||this.pending.size>0||this.transfers.size>0||[...this.downloads.values()].some(item=>item.state==='downloading'),relocating:!!this.relocation,relocation:this.relocation,error:this.error??state.relocationError??(state.cleanup.length?'Relocation cleanup pending. Retry relocation to remove original copies.':null),models,downloads:[...this.downloads.values()]};
 }
 private assertIdle(){if(this.inUse()||this.changing||this.pending.size||this.transfers.size||[...this.downloads.values()].some(item=>item.state==='downloading'))throw Error('Wait for model downloads or pause processing before changing model files.');}
 async setFolder(parent:string){this.assertIdle();this.changing=true;try{if(!path.isAbsolute(parent))throw Error('Choose an absolute model folder.');const state=await this.state();const folder=path.join(await fs.realpath(parent),'Rescript Models');await this.file(folder,modelFileUrl('tiny','config.json'),true);state.folder=folder;await this.save();return folder;}finally{this.changing=false;}}
 async ensure(url:string):Promise<string>{
  this.artifact(url);if(this.changing)throw Error('Model storage is being changed. Try again when it finishes.');
  if([...this.transfers.values()].some(item=>item.url===url))throw Error('Wait for cached model transfer to finish.');
  const pending=this.pending.get(url);if(pending)return pending;
  const task=this.fetchFile(url);this.pending.set(url,task);try{return await task;}finally{this.pending.delete(url);}
 }
 private async publish(url:string,temp:string,root:string,size:number){
  const sha256=await this.digest(temp);const target=await this.file(root,url,true);
  await fs.rename(temp,target);const state=await this.state();state.files[url]={root,size,sha256};await this.save();return target;
 }
 private async fetchFile(url:string){
  const existing=await this.existing(url);if(existing)return existing;
  const {id,file}=this.artifact(url);const state=await this.state();const root=state.folder;
  const target=await this.file(root,url,true);const temp=target+'.'+randomUUID()+'.part';
  const response=await this.fetcher(url,{signal:AbortSignal.timeout(30*60*1000)});
  if(!response.ok||!response.body)throw Error('Download failed: '+file+' (HTTP '+response.status+'). Retry the download.');
  const length=Number(response.headers.get('content-length'));const total=length>0?length:null;
  const handle=await fs.open(temp,'wx');let loaded=0;
  try{const reader=response.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;let offset=0;while(offset<value.length){const result=await handle.write(value,offset,value.length-offset,null);offset+=result.bytesWritten;}loaded+=value.length;const progress=this.downloads.get(id);if(progress&&progress.state==='downloading')Object.assign(progress,{file,loaded,total});}}finally{reader.releaseLock();}
   if(!loaded||(total!==null&&loaded!==total))throw Error('Incomplete model download. Retry the download.');await handle.sync();
  }catch(error){await handle.close();await fs.unlink(temp).catch(()=>{});throw error;}finally{await handle.close();}
  try{return await this.publish(url,temp,root,loaded);}catch(error){await fs.unlink(temp).catch(()=>{});throw error;}
 }
 async download(id:ModelId,gpu:boolean){
  if(!isModelId(id))throw Error('Unknown transcription model.');
  if(this.transfers.size)throw Error('Wait for cached model transfer to finish.');
  if(this.downloads.get(id)?.state==='downloading')return;
  if(this.changing)throw Error('Wait for model relocation to finish.');
  const files=requiredModelFiles(id,gpu);const progress:ModelDownload={model:id,file:'',loaded:0,total:null,completed:0,count:files.length,state:'downloading'};this.downloads.set(id,progress);
  void (async()=>{try{for(const file of files){Object.assign(progress,{file,loaded:0,total:null});await this.ensure(modelFileUrl(id,file));progress.completed++;}progress.state='complete';}catch(error){progress.state='error';progress.error=String(error);}})();
 }
 async remove(id:ModelId){
  if(!isModelId(id))throw Error('Unknown transcription model.');this.assertIdle();this.changing=true;
  try{const state=await this.state();for(const [url,record] of Object.entries(state.files)){if(this.artifact(url).id!==id)continue;const file=await this.file(record.root,url);await fs.unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});delete state.files[url];await this.save();}for(const old of [...state.cleanup]){if(this.artifact(old.url).id!==id)continue;await fs.unlink(await this.file(old.root,old.url)).catch(error=>{if(error.code!=='ENOENT')throw error;});state.cleanup.splice(state.cleanup.indexOf(old),1);await this.save();}this.downloads.delete(id);}finally{this.changing=false;}
 }
 async relocate(){
  this.assertIdle();this.changing=true;this.error=null;
  try{const state=await this.state();state.relocationError=null;await this.save();const entries=Object.entries(state.files).filter(([,record])=>record.root!==state.folder);this.relocation={completed:0,total:entries.length};
   for(const [url,record] of entries){
    const source=await this.file(record.root,url);if(await this.digest(source)!==record.sha256)throw Error('A model file is damaged. Download it again before relocating: '+this.artifact(url).file);
    const target=await this.file(state.folder,url,true);const temp=target+'.'+randomUUID()+'.part';
    await fs.copyFile(source,temp);if((await fs.stat(temp)).size!==record.size||await this.digest(temp)!==record.sha256){await fs.unlink(temp);throw Error('Relocation verification failed. Original models are preserved.');}
    const handle=await fs.open(temp,'r+');try{await handle.sync();}finally{await handle.close();}
    await fs.rename(temp,target);
    // The manifest commit switches loading only after the complete copy verifies.
    state.cleanup.push({url,root:record.root});state.files[url]={...record,root:state.folder};await this.save();this.relocation.completed++;
   }
   for(const old of [...state.cleanup]){const record=state.files[old.url];if(!record||record.root===old.root)continue;const current=await this.file(record.root,old.url);if(await this.digest(current)!==record.sha256)throw Error('Relocated model needs verification. Original copy preserved.');const previous=await this.file(old.root,old.url);await fs.unlink(previous).catch(error=>{if(error.code!=='ENOENT')throw error;});state.cleanup.splice(state.cleanup.indexOf(old),1);await this.save();}
  }catch(error){this.error=String(error)+' Retry relocation to finish remaining files.';const state=await this.state();state.relocationError=this.error;await this.save();throw error;}finally{this.changing=false;this.relocation=null;}
 }
 async importStart(id:ModelId,file:string,size:number){
  const url=modelFileUrl(id,file);this.artifact(url);if(this.changing)throw Error('Wait for relocation.');if(this.pending.has(url))await this.pending.get(url);if([...this.transfers.values()].some(item=>item.url===url))throw Error('This model file is already being transferred.');if(await this.existing(url))return null;
  if(!Number.isSafeInteger(size)||size<=0||size>8*1024**3)throw Error('Invalid cached model size.');
  const root=(await this.state()).folder;const temp=(await this.file(root,url,true))+'.'+randomUUID()+'.part';await fs.writeFile(temp,'',{flag:'wx'});const token=randomUUID();this.transfers.set(token,{url,temp,size,offset:0,root});return token;
 }
 async importAppend(token:string,offset:number,bytes:Uint8Array){const transfer=this.transfers.get(token);if(!transfer||offset!==transfer.offset||!(bytes instanceof Uint8Array)||bytes.length>4*1024**2||offset+bytes.length>transfer.size)throw Error('Invalid model transfer chunk.');await fs.appendFile(transfer.temp,bytes);transfer.offset+=bytes.length;}
 async importFinish(token:string){const transfer=this.transfers.get(token);if(!transfer||transfer.offset!==transfer.size)throw Error('Incomplete model transfer.');const handle=await fs.open(transfer.temp,'r+');try{await handle.sync();}finally{await handle.close();}await this.publish(transfer.url,transfer.temp,transfer.root,transfer.size);this.transfers.delete(token);}
 async importCancel(token:string){const transfer=this.transfers.get(token);if(transfer){await fs.unlink(transfer.temp).catch(()=>{});this.transfers.delete(token);}}
}
