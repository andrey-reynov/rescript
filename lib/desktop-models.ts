import {MODELS,MODEL_ORDER,type ModelId} from './models';
import {requiredModelFiles,modelFileUrl} from './model-files';
export async function modelGpuAvailable(){try{return !!await (navigator as Navigator&{gpu?:{requestAdapter():Promise<unknown>}}).gpu?.requestAdapter();}catch{return false;}}
async function parakeetDb(){
 if(!indexedDB.databases||!(await indexedDB.databases()).some(db=>db.name==='parakeet-cache-db'))return null;
 return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('parakeet-cache-db');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}
let migration:Promise<void>|null=null;
/** Move legacy cached blobs in bounded pieces; only remove a cache copy after native publication. */
export async function importLegacyModels(ids:ModelId[]=MODEL_ORDER,onProgress?:(message:string,value:number)=>void){
 if(!window.rescriptDesktop?.models)return;
 if(migration)await migration;
 const task=(async()=>{
  const bridge=window.rescriptDesktop!.models;const db=await parakeetDb();
  const cache=await caches.open('transformers-cache');
  try{for(const id of ids){const model=MODELS[id];for(const file of new Set([...requiredModelFiles(id,false),...requiredModelFiles(id,true)])){
   const url=modelFileUrl(id,file);const key=model.backend==='parakeet'?'hf-'+model.repoId+'-main--'+file:'';
   let blob:Blob|undefined;
   if(model.backend==='whisper'){const response=await cache.match(url);if(response)blob=await response.blob();}
   else if(db?.objectStoreNames.contains('file-store'))blob=await new Promise<Blob|undefined>((resolve,reject)=>{const request=db.transaction('file-store').objectStore('file-store').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
   if(!blob)continue;
   const token=await bridge.importStart(id,file,blob.size);
   if(token){try{for(let offset=0;offset<blob.size;offset+=4*1024**2){await bridge.importAppend(token,offset,new Uint8Array(await blob.slice(offset,offset+4*1024**2).arrayBuffer()));onProgress?.('Moving cached model',Math.min(1,(offset+4*1024**2)/blob.size));}await bridge.importFinish(token);}catch(error){await bridge.importCancel(token);throw error;}}
   // Already published files also make the duplicate legacy entry unnecessary.
   if(model.backend==='whisper')await cache.delete(url);
   else if(db)await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('file-store','readwrite');transaction.objectStore('file-store').delete(key);transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});
  }}}finally{db?.close();}
 })();migration=task;try{await task;}finally{if(migration===task)migration=null;}
}

/** Downloads happen in the native process; the hidden runner reports their progress. */
export async function prepareDesktopModel(id:ModelId,gpu:boolean,onProgress:(message:string,value:number|null)=>void){
 const bridge=window.rescriptDesktop?.models;if(!bridge)return;
 await importLegacyModels([id],onProgress);
 if((await bridge.status(gpu)).models[id].available)return;
 await bridge.download(id,gpu);
 while(true){const state=await bridge.status(gpu);const progress=state.downloads.find(item=>item.model===id);
  if(state.models[id].available)return;
  if(progress?.state==='error')throw Error(progress.error||'Model download failed. Retry the download.');
  if(progress){const fraction=progress.total?Math.min(1,progress.loaded/progress.total):0;onProgress('Downloading model',(progress.completed+fraction)/progress.count);}
  await new Promise(resolve=>setTimeout(resolve,300));
 }
}
