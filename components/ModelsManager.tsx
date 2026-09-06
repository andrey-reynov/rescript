"use client";
import {useEffect,useState} from 'react';
import {Download,Trash2,FolderOpen,FolderSync} from 'lucide-react';
import Button from './Button';
import {MODELS,MODEL_ORDER,type ModelId} from '@/lib/models';
import type {ModelStorageStatus} from '@/types/model-api';
import {importLegacyModels,modelGpuAvailable} from '@/lib/desktop-models';
import {modelAvailability,type Availability} from '@/lib/model-availability';
import {useForkI18n} from './I18nProvider';
export default function ModelsManager(){
 const f=useForkI18n();const [state,setState]=useState<ModelStorageStatus|null>(null),[availability,setAvailability]=useState<Partial<Record<ModelId,Availability>>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[migration,setMigration]=useState<number|null>(null);
 useEffect(()=>{let disposed=false;const refresh=async()=>{try{const bridge=window.rescriptDesktop?.models;if(!bridge)return;const [status,available]=await Promise.all([bridge.status(await modelGpuAvailable()),modelAvailability()]);if(!disposed){setState(status);setAvailability(available);}}catch(error){if(!disposed)setError(String(error));}};void refresh();const timer=setInterval(()=>void refresh(),1500);return()=>{disposed=true;clearInterval(timer);};},[]);
 const run=async(action:()=>Promise<unknown>)=>{setBusy(true);setError('');try{await action();const bridge=window.rescriptDesktop!.models;setState(await bridge.status(await modelGpuAvailable()));setAvailability(await modelAvailability());window.dispatchEvent(new Event('rescript:models-changed'));}catch(error){setError(String(error));}finally{setBusy(false);setMigration(null);}};
 const migrate=(ids?:ModelId[])=>importLegacyModels(ids,(_message,value)=>setMigration(value));
 if(typeof window==='undefined'||!window.rescriptDesktop?.models)return <p className="text-sm text-zinc-500">{f('Install the desktop app to manage model folders.')}</p>;
 const bridge=window.rescriptDesktop.models;const locked=busy||!!state?.busy;
 return <section aria-label={f('Models')} className="space-y-4">
  <div><h2 className="font-medium">{f('Model folder')}</h2><p className="my-2 break-all rounded-lg border border-zinc-200 p-2 text-xs dark:border-zinc-700">{state?.folder??f('Loading…')}</p>
   <p className="mb-2 text-xs text-zinc-500">{f('Changing this folder affects future downloads. Existing models stay usable in their current folders until you relocate them.')}</p>
   <div className="flex flex-wrap gap-2"><Button disabled={locked} onClick={()=>void run(()=>bridge.chooseFolder())}><FolderOpen size={14}/>{f('Choose folder…')}</Button><Button disabled={locked} onClick={()=>void run(async()=>{await migrate();await bridge.relocate();})}><FolderSync size={14}/>{f('Relocate models')}</Button></div>
   <p className="mt-2 text-xs text-zinc-500">{f('Relocation verifies each copy before removing the original. Projects and source media stay unchanged.')}</p>
  </div>
  {migration!==null&&<p role="status" className="text-xs">{f('Moving cached model')} · {Math.round(migration*100)}%</p>}
  {state?.relocation&&<p role="status" className="text-xs">{f('Relocating models')} · {state.relocation.completed}/{state.relocation.total}</p>}
  {state?.busy&&!busy&&<p className="text-xs text-zinc-500">{f('Pause processing before deleting or relocating models.')}</p>}
  {(error||state?.error)&&<p role="alert" className="text-xs text-red-600">{f(error||state?.error||'')}</p>}
  <div className="divide-y divide-zinc-200 dark:divide-zinc-700">{MODEL_ORDER.map(id=>{
   const model=MODELS[id],installed=state?.models[id];const download=state?.downloads.find(row=>row.model===id);const active=download?.state==='downloading';
   const percentage=download?Math.round((download.completed+(download.total?Math.min(1,download.loaded/download.total):0))/download.count*100):0;
   return <div key={id} className="py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-medium">{model.label}</h3><p className="mt-1 text-xs text-zinc-500">{f(model.capabilities.description)}</p><p className="mt-1 text-xs text-zinc-500">{availability[id]===undefined?f('Checking downloads…'):availability[id]==='unknown'?f('Download status unavailable'):availability[id]==='available'?f('Downloaded'):f('Not downloaded')} · {installed?.bytes?Math.round(installed.bytes/1024**2)+' MB':model.size}{model.experimental?' · '+f('Experimental'):''}</p></div>
    <div className="flex gap-1"><Button disabled={busy||active||!!state?.relocating||availability[id]==='available'} title={f('Download model')} onClick={()=>void run(async()=>{await migrate([id]);await bridge.download(id,await modelGpuAvailable());})}><Download size={14}/>{f('Download')}</Button><Button disabled={locked||active||(!installed?.bytes&&availability[id]!=='available')} title={f('Delete model')} onClick={()=>void run(async()=>{await migrate([id]);await bridge.remove(id);})}><Trash2 size={14}/>{f('Delete')}</Button></div></div>
    {installed?.outsideDefault&&<p className="mt-1 text-xs text-zinc-500">{f('Stored in a previous folder')}</p>}
    {active&&<div role="status" className="mt-2 text-xs"><progress aria-label={model.label} value={percentage} max={100} className="w-full"/>{percentage}% · {download.file} · {Math.round(download.loaded/1024**2)} MB</div>}
    {download?.error&&<p role="alert" className="mt-2 text-xs text-red-600">{download.error}</p>}
   </div>;
  })}</div>
 </section>;
}
