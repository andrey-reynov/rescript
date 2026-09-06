"use client";
import {useId,useRef,useState,type ReactNode} from 'react';
import {Shortcut} from './Button';
import {Check,ChevronDown} from 'lucide-react';
import Popover,{PopoverContent,PopoverTrigger} from './Popover';
export type DropdownOption={value:string;label:string;description?:string;shortcut?:string;meta?:ReactNode;icon?:ReactNode;disabled?:boolean;group?:string};
/** Shared full-width selection control. Popups stay inside modal/top-layer dialogs. */
export default function Dropdown({label,value,options,onChange,disabled=false}:{label:string;value:string;options:DropdownOption[];onChange:(value:string)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false),[width,setWidth]=useState(0);const root=useRef<HTMLDivElement>(null);const list=useRef<HTMLDivElement>(null);const id=useId();
 const selected=options.find(o=>o.value===value);
 const show=()=>{setWidth(root.current?.getBoundingClientRect().width??0);setOpen(true);requestAnimationFrame(()=>(list.current?.querySelector<HTMLButtonElement>('button[aria-selected="true"]:not(:disabled)')??list.current?.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus());};
 const close=()=>{setOpen(false);root.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus();};
 return <div ref={root} className="relative my-2 w-full min-w-0"><Popover open={open} onOpenChange={next=>{setOpen(next);if(!next&&list.current?.contains(document.activeElement))root.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus();}} portal={false} placement="bottom-start" escapeStopPropagation>
  <PopoverTrigger><button type="button" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={()=>open?close():show()} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();show();}}} className="flex w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-left text-[13px] font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
   {selected?.icon}<span className="min-w-0 flex-1 truncate">{selected?.label??value}</span><ChevronDown size={14} className="shrink-0 text-zinc-400"/>
  </button></PopoverTrigger>
  <PopoverContent id={id} role="listbox" aria-label={label} className="z-50 max-w-[90vw]" style={{width}}>
   <div ref={list} className="max-h-[40vh] overflow-y-auto p-1" onKeyDown={e=>{
    const buttons=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
   }}>
   {options.map((option,index)=><div key={option.value}>
    {(index===0||option.group!==options[index-1].group)&&<>{index>0&&<div role="separator" className="my-1 border-t border-zinc-100 dark:border-zinc-800"/>}<p className="px-3 pb-1 pt-2.5 text-[11px] font-medium tracking-wide text-zinc-400 dark:text-zinc-500">{option.group??label}</p></>}
    <button type="button" role="option" aria-selected={option.value===value} disabled={option.disabled} onClick={()=>{onChange(option.value);close();}} className={`my-0.5 flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-40 ${option.value===value?'bg-zinc-100 dark:bg-zinc-800':'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'}`}>
     <span className="flex w-full items-center gap-2">{option.icon}<span className="min-w-0 flex-1 text-[13px] font-medium">{option.label}</span>{option.meta}{option.shortcut&&<Shortcut>{option.shortcut}</Shortcut>}{option.value===value&&<Check size={13} className="shrink-0 text-zinc-400"/>}</span>
     {option.description&&<span className="text-[11px] text-zinc-500">{option.description}</span>}
    </button>
   </div>)}
   </div>
  </PopoverContent>
 </Popover></div>;
}
