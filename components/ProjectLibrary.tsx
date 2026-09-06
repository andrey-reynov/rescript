"use client";
import {useI18n,useForkI18n} from "./I18nProvider";
import {localizeRuntimeMessage} from "@/lib/i18n";
import Button from './Button';
import { useState } from 'react';
import { FolderOpen, Film, Music, History, X } from 'lucide-react';
import type { ProjectMeta } from '@/lib/projects';

export default function ProjectLibrary({projects,busyId,onOpen}:{projects:ProjectMeta[];busyId:string|null;onOpen:(id:string)=>void}) {
  const f=useForkI18n(); const {t,locale}=useI18n();
  const [error,setError]=useState<string|null>(null);
  const [recovery,setRecovery]=useState<{id:string;snapshots:string[]}|null>(null);
  return <section className="mt-6" aria-label={f("Project library")}>
    <div className="mb-4 flex items-center justify-between"><h1 className="text-xl font-semibold">{f("Your projects")}</h1><span className="text-xs text-zinc-500">{f('{count} saved · newest first',{count:projects.length})}</span></div>
    {error&&<p role="alert" className="mb-3 text-sm text-red-600">{f(localizeRuntimeMessage(error,t))}</p>}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(project=><article key={project.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <button disabled={busyId!==null||project.missing} onClick={()=>onOpen(project.id)} className="block w-full text-left disabled:opacity-60" aria-label={f('Open {name}',{name:project.name})}>
          <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {project.thumbnail ? <img src={project.thumbnail} alt="" className="h-full w-full object-cover"/> : project.mediaKind==='audio'?<Music size={36} className="text-zinc-400"/>:<Film size={36} className="text-zinc-400"/>}
            {busyId===project.id&&<span className="absolute rounded bg-black/70 px-3 py-1 text-sm text-white">{f("Opening…")}</span>}
          </div>
          <div className="px-3 pt-3"><h2 title={project.name} className="truncate text-sm font-semibold">{project.name}</h2><p className="mt-1 text-xs text-zinc-500">{project.missing?f('Project needs recovery'):f('Updated {date}',{date:new Date(project.updatedAt).toLocaleString(locale)})}</p></div>
        </button>
        <div className="flex items-center gap-2 px-3 pb-3 pt-2"><p title={project.filePath} className="min-w-0 flex-1 truncate text-[11px] text-zinc-400">{project.filePath||(project.legacy?f('Older project · locate original media to migrate'):f('Browser storage'))}</p>
          {typeof window!=='undefined'&&window.rescriptDesktop?.projects&&!project.legacy&&<>
            <Button variant="icon" aria-label={f("Show project location")} title={f("Show project location")} onClick={()=>void window.rescriptDesktop!.projects.show(project.id).catch(e=>setError(String(e)))}><FolderOpen size={15}/></Button>
            <Button variant="icon" title={f("Recovery snapshots")} aria-label={f('Recovery snapshots for {name}',{name:project.name})} onClick={()=>void window.rescriptDesktop!.projects.snapshots(project.id).then(snapshots=>setRecovery({id:project.id,snapshots})).catch(e=>setError(String(e)))}><History size={15}/></Button>
          </>}
        </div>
      </article>)}
    </div>
    {recovery&&<div role="dialog" aria-modal="true" aria-label={f("Recovery snapshots")} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"><div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white p-5 dark:bg-zinc-900">
      <div className="flex shrink-0 items-center justify-between gap-3"><h2 className="font-semibold">{f("Recovery snapshots")}</h2><Button variant="icon" aria-label={f("Close revisions")} onClick={()=>setRecovery(null)}><X size={16}/></Button></div><p className="my-2 shrink-0 text-sm text-zinc-500">{f("Restore a prior saved revision. The current file is retained as a recovery backup.")}</p>
      <div className="min-h-0 overflow-y-auto" aria-label={f("Revision list")}>
      {!recovery.snapshots.length&&<p className="my-4 text-sm">{f("No snapshots yet. Snapshots appear after subsequent saves.")}</p>}
      {recovery.snapshots.map((snapshot,i)=><button key={snapshot} className="my-1 block w-full rounded border p-2 text-left text-sm" onClick={()=>{void window.rescriptDesktop!.projects.restore(recovery.id,snapshot).then(()=>{setRecovery(null);onOpen(recovery.id);}).catch(e=>setError(String(e)));}}>{f('Restore {revision}',{revision:i===0?f('latest previous revision'):f('revision {number}',{number:snapshot.replace('.json','')})})}</button>)}
      </div>
    </div></div>}
  </section>;
}
