"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { buildTranscriptSearchIndex, searchTranscript } from '@/lib/transcript-search';

export default function TranscriptSearch(){
  const words=useEditorStore(s=>s.words);
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[position,setPosition]=useState(-1);
  const input=useRef<HTMLInputElement>(null);
  const index=useMemo(()=>buildTranscriptSearchIndex(words),[words]);
  const matches=useMemo(()=>searchTranscript(index,query),[index,query]);
  const current=matches.length?Math.max(0,Math.min(position,matches.length-1)):0;
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'){event.preventDefault();setOpen(true);requestAnimationFrame(()=>{input.current?.focus();input.current?.select();});}};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[]);
  const select=(at:number)=>{if(!matches.length)return;const next=(at+matches.length)%matches.length;setPosition(next);const s=useEditorStore.getState();s.setSelectedWords(matches[next]);};
  if(!open)return <button title="Find in transcript (Ctrl+F)" aria-label="Find in transcript" className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={()=>{setOpen(true);requestAnimationFrame(()=>input.current?.focus());}}><Search size={15}/></button>;
  return <div className="flex min-w-0 items-center gap-1 text-xs">
    <input ref={input} aria-label="Search transcript" placeholder="Find words or a phrase…" value={query} onChange={e=>{setQuery(e.target.value);setPosition(-1);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();select(e.shiftKey?current-1:position+1);}if(e.key==='Escape'){setOpen(false);}}} className="min-w-0 w-40 rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"/>
    <span role="status" className="whitespace-nowrap text-zinc-500">{matches.length?`${current+1}/${matches.length}`:'0 matches'}</span>
    <button aria-label="Previous match" disabled={!matches.length} onClick={()=>select(current-1)}><ChevronUp size={14}/></button>
    <button aria-label="Go to match" disabled={!matches.length} onClick={()=>select(current)}><Search size={14}/></button>
    <button aria-label="Next match" disabled={!matches.length} onClick={()=>select(position+1)}><ChevronDown size={14}/></button>
    <button aria-label="Close search" onClick={()=>setOpen(false)}><X size={14}/></button>
  </div>;
}
