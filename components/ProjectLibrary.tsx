"use client";
import { useState } from 'react';
import { FolderOpen, Film, Music, History } from 'lucide-react';
import type { ProjectMeta } from '@/lib/projects';

export default function ProjectLibrary({projects,busyId,onOpen}:{projects:ProjectMeta[];busyId:string|null;onOpen:(id:string)=>void}) {
  const [error,setError]=useState<string|null>(null);
  const [recovery,setRecovery]=useState<{id:string;snapshots:string[]}|null>(null);
  return <section className="mt-6" aria-label="Project library">
    <div className="mb-4 flex items-center justify-between"><h1 className="text-xl font-semibold">Your projects</h1><span className="text-xs text-zinc-500">{projects.length} saved · newest first</span></div>
    {error&&<p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(project=><article key={project.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <button disabled={busyId!==null||project.missing} onClick={()=>onOpen(project.id)} className="block w-full text-left disabled:opacity-60" aria-label={`Open ${project.name}`}>
          <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {project.thumbnail ? <img src={project.thumbnail} alt="" className="h-full w-full object-cover"/> : project.mediaKind==='audio'?<Music size={36} className="text-zinc-400"/>:<Film size={36} className="text-zinc-400"/>}
            {busyId===project.id&&<span className="absolute rounded bg-black/70 px-3 py-1 text-sm text-white">Opening…</span>}
          </div>
          <div className="px-3 pt-3"><h2 title={project.name} className="truncate text-sm font-semibold">{project.name}</h2><p className="mt-1 text-xs text-zinc-500">{project.missing?'Project needs recovery':`Updated ${new Date(project.updatedAt).toLocaleString()}`}</p></div>
        </button>
        <div className="flex items-center gap-2 px-3 pb-3 pt-2"><p title={project.filePath} className="min-w-0 flex-1 truncate text-[11px] text-zinc-400">{project.filePath||(project.legacy?'Older project · locate original media to migrate':'Browser storage')}</p>
          {typeof window!=='undefined'&&window.rescriptDesktop?.projects&&!project.legacy&&<>
            <button title="Show project location" onClick={()=>void window.rescriptDesktop!.projects.show(project.id).catch(e=>setError(String(e)))}><FolderOpen size={15}/></button>
            <button title="Recovery snapshots" aria-label={`Recovery snapshots for ${project.name}`} onClick={()=>void window.rescriptDesktop!.projects.snapshots(project.id).then(snapshots=>setRecovery({id:project.id,snapshots})).catch(e=>setError(String(e)))}><History size={15}/></button>
          </>}
        </div>
      </article>)}
    </div>
    {recovery&&<div role="dialog" aria-modal="true" aria-label="Recovery snapshots" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"><div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-xl bg-white p-5 dark:bg-zinc-900">
      <h2 className="font-semibold">Recovery snapshots</h2><p className="my-2 text-sm text-zinc-500">Restore a prior saved revision. The current file is retained as a recovery backup.</p>
      {!recovery.snapshots.length&&<p className="my-4 text-sm">No snapshots yet. Snapshots appear after subsequent saves.</p>}
      {recovery.snapshots.map((snapshot,i)=><button key={snapshot} className="my-1 block w-full rounded border p-2 text-left text-sm" onClick={()=>{void window.rescriptDesktop!.projects.restore(recovery.id,snapshot).then(()=>{setRecovery(null);onOpen(recovery.id);}).catch(e=>setError(String(e)));}}>Restore {i===0?'latest previous revision':`revision ${snapshot.replace('.json','')}`}</button>)}
      <button className="mt-4 rounded border px-4 py-2 text-sm" onClick={()=>setRecovery(null)}>Cancel</button>
    </div></div>}
  </section>;
}
