import {MODELS,MODEL_ORDER,type ModelId} from './models';
export type Availability='available'|'missing'|'unknown';
export {requiredModelFiles} from './model-files';
import {requiredModelFiles} from './model-files';
async function parakeetKeys():Promise<Set<string>>{
 if(!indexedDB.databases)throw Error('Cache inventory unavailable');
 if(!(await indexedDB.databases()).some(db=>db.name==='parakeet-cache-db'))return new Set();
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open('parakeet-cache-db');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
 try{return await new Promise((resolve,reject)=>{
  if(!db.objectStoreNames.contains('file-store')){resolve(new Set());return;}
  const q=db.transaction('file-store','readonly').objectStore('file-store').getAllKeys();q.onsuccess=()=>resolve(new Set(q.result.map(String)));q.onerror=()=>reject(q.error);
 });}finally{db.close();}
}
/** Read cache inventories only. Never fetch models or load their weight bodies. */
export async function modelAvailability():Promise<Record<ModelId,Availability>>{
 let gpu=false;try{gpu=!!await (navigator as Navigator & {gpu?:{requestAdapter():Promise<unknown>}}).gpu?.requestAdapter();}catch{/* CPU fallback */}
 const native=typeof window!=='undefined'&&window.rescriptDesktop?.models?await window.rescriptDesktop.models.status(gpu):null;
 let urls:Set<string>|null=null,keys:Set<string>|null=null;
 try{const names=await caches.keys();urls=new Set();if(names.includes('transformers-cache'))for(const request of await (await caches.open('transformers-cache')).keys())urls.add(request.url);}catch{/* Unknown rather than missing */}
 try{keys=await parakeetKeys();}catch{/* Unknown rather than missing */}
 return Object.fromEntries(MODEL_ORDER.map(id=>{
  const m=MODELS[id],inventory=m.backend==='whisper'?urls:keys;
  if(native?.models[id].available)return [id,'available'];
  if(!inventory)return [id,'unknown'];
  const present=requiredModelFiles(id,gpu).every(file=>m.backend==='whisper'?inventory.has('https://huggingface.co/'+m.id+'/resolve/main/'+file):inventory.has('hf-'+m.repoId+'-main--'+file));
  return [id,present?'available':'missing'];
 })) as Record<ModelId,Availability>;
}
