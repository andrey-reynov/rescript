"use client";
import {useEffect,useId,useRef,useState} from 'react';
import {X} from 'lucide-react';
import Button,{ICON_BUTTON} from './Button';
import {useForkI18n,useI18n} from './I18nProvider';
import {localizeRuntimeMessage} from '@/lib/i18n';

export default function RevisionDialog({projectId,snapshots,onClose,onRestored}:{projectId:string;snapshots:string[];onClose:()=>void;onRestored:()=>void}){
 const f=useForkI18n(),{t}=useI18n(),title=useId(),description=useId();
 const root=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),restoring=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const trigger=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(trigger?.isConnected)trigger.focus({preventScroll:true});};},[]);
 useEffect(()=>{if(busy)root.current?.focus();else if(error)close.current?.focus();},[busy,error]);
 const restore=async(snapshot:string)=>{
  if(restoring.current)return;restoring.current=true;setBusy(true);setError('');
  try{await window.rescriptDesktop!.projects.restore(projectId,snapshot);onRestored();}
  catch(cause){setError(f(localizeRuntimeMessage((cause instanceof Error?cause.message:String(cause)).replace(/^Error invoking remote method '[^']+': Error: /,''),t)));}
  finally{restoring.current=false;setBusy(false);}
 };
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={title} aria-describedby={description} aria-busy={busy} tabIndex={-1} className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white p-5 text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-100" onKeyDown={event=>{
   if(event.key==='Escape'&&!busy){event.preventDefault();event.stopPropagation();onClose();}
   if(event.key==='Tab'){
    const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if(!buttons.length){event.preventDefault();return;}
    const first=buttons[0],last=buttons.at(-1)!;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  }}>
   <div className="flex shrink-0 items-center justify-between gap-3"><h2 id={title} className="font-semibold">{f('Recovery snapshots')}</h2><button ref={close} type="button" aria-label={f('Close revisions')} disabled={busy} onClick={onClose} className={ICON_BUTTON}><X size={16}/></button></div>
   <p id={description} className="my-2 shrink-0 text-sm text-zinc-500">{f('Restore a prior saved revision. The current file is retained as a recovery backup.')}</p>
   {error&&<p role="alert" className="mb-2 shrink-0 text-sm text-red-600">{error}</p>}
   {busy&&<p role="status" className="mb-2 shrink-0 text-xs text-zinc-500">{f('Restoring revision…')}</p>}
   <div className="min-h-0 overflow-y-auto" aria-label={f('Revision list')}>
    {!snapshots.length&&<p className="my-4 text-sm">{f('No snapshots yet. Snapshots appear after subsequent saves.')}</p>}
    {snapshots.map((snapshot,index)=><Button key={snapshot} disabled={busy} className="my-1 h-auto min-h-9 w-full justify-start border border-zinc-200 p-2 text-left dark:border-zinc-700" onClick={()=>void restore(snapshot)}>{f('Restore {revision}',{revision:index===0?f('latest previous revision'):f('revision {number}',{number:snapshot.replace('.json','')})})}</Button>)}
   </div>
  </div>
 </div>;
}
