"use client";
import {useI18n,useForkI18n} from "./I18nProvider";
import {localizeRuntimeMessage} from "@/lib/i18n";
import Button from './Button';
import { useState } from 'react';
import RevisionDialog from './RevisionDialog';
import { FolderOpen, Film, Music, History } from 'lucide-react';
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
    {recovery&&<RevisionDialog projectId={recovery.id} snapshots={recovery.snapshots} onClose={()=>setRecovery(null)} onRestored={()=>{setRecovery(null);onOpen(recovery.id);}}/>}
  </section>;
}
