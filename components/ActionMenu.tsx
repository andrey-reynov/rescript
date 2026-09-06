"use client";
import {useEffect,useSyncExternalStore,useId,useRef,useState,type ReactNode} from 'react';
import {CUSTOM_COMMANDS,eventShortcut,shortcutError,type CustomCommand,useTimelinePreferences} from '@/lib/timeline-tools';
import {isTypingTarget,isCompositionKey} from '@/lib/keyboard';
import {Ellipsis,Star,Check} from 'lucide-react';
import Popover,{PopoverContent,PopoverTrigger} from './Popover';
import Button,{Shortcut} from './Button';
import {useForkI18n} from './I18nProvider';
const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener('rescript:favorites',notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener('rescript:favorites',notify);};};
export type MenuAction={id:string;label:string;icon:ReactNode;shortcut?:string;disabled?:boolean;run:()=>void;title?:string;checked?:boolean;radio?:boolean;group?:string;favoritable?:boolean};
export default function ActionMenu({label,actions:providedActions,favoritesKey,defaults=[]}:{label:string;actions:MenuAction[];favoritesKey?:string;defaults?:string[]}){
 const f=useForkI18n(),id=useId(),root=useRef<HTMLDivElement>(null),panel=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false);
 const prefs=useTimelinePreferences();
 const actions=providedActions.map(action=>action.id in CUSTOM_COMMANDS?{...action,shortcut:prefs.bindings[action.id as CustomCommand]||undefined}:action);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{
  if(e.repeat||e.defaultPrevented||isTypingTarget(e.target)||isCompositionKey(e)||(e.target as HTMLElement)?.closest?.('dialog,[role="dialog"],[role="menu"],[role="listbox"]'))return;
  const key=eventShortcut(e);const action=actions.find(a=>a.id in CUSTOM_COMMANDS&&a.shortcut===key&&!a.disabled&&!shortcutError(key,a.id as CustomCommand,prefs.bindings));
  if(action){e.preventDefault();action.run();}
 };document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[actions,prefs.bindings]);
 const saved=useSyncExternalStore(subscribe,()=>{try{return favoritesKey?localStorage.getItem(favoritesKey):null;}catch{return null;}},()=>null);
 let favorites=defaults;try{const parsed=JSON.parse(saved??'null');if(Array.isArray(parsed)&&parsed.every(v=>typeof v==='string'))favorites=parsed;}catch{}
 const toggle=(key:string)=>{const next=favorites.includes(key)?favorites.filter(v=>v!==key):[...favorites,key];try{if(favoritesKey)localStorage.setItem(favoritesKey,JSON.stringify(next));window.dispatchEvent(new Event('rescript:favorites'));}catch{}};
 const change=(next:boolean)=>{setOpen(next);if(!next&&panel.current?.contains(document.activeElement))root.current?.querySelector<HTMLButtonElement>('[aria-haspopup]')?.focus();};
 const show=()=>{change(true);requestAnimationFrame(()=>panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());};
 return <div ref={root} className="flex shrink-0 items-center gap-1">
  {favoritesKey&&actions.filter(a=>a.favoritable!==false&&favorites.includes(a.id)).map(a=><Button key={a.id} disabled={a.disabled} onClick={a.run} title={a.title??a.label} aria-label={a.label}>{a.icon}<span className="hidden sm:inline">{a.label}</span>{a.shortcut&&<span className="hidden sm:inline"><Shortcut>{a.shortcut}</Shortcut></span>}</Button>)}
  <Popover open={open} onOpenChange={change} placement="bottom-end" escapeStopPropagation>
   <PopoverTrigger><Button variant="icon" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={()=>open?change(false):show()} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();show();}}}><Ellipsis size={16}/></Button></PopoverTrigger>
   <PopoverContent id={id} role="menu" aria-label={label} className="z-[110] w-72 max-w-[90vw] p-1">
    <div ref={panel} onKeyDown={e=>{const items=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];const index=items.indexOf(document.activeElement as HTMLButtonElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}}}>
    <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-zinc-400">{label}</p>
    {actions.map((a,index)=><div key={a.id}>
     {a.group&&(index===0||a.group!==actions[index-1].group)&&<div className="mt-1 w-full border-t border-zinc-100 px-3 pb-1 pt-2 text-[11px] text-zinc-400 dark:border-zinc-800">{a.group}</div>}
     <div className="group flex items-center rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800">
     {favoritesKey&&a.favoritable!==false&&<button type="button" role="menuitemcheckbox" aria-checked={favorites.includes(a.id)} aria-label={f(favorites.includes(a.id)?'Unpin {tool}':'Pin {tool}',{tool:a.label})} title={f(favorites.includes(a.id)?'Unpin {tool}':'Pin {tool}',{tool:a.label})} onClick={()=>toggle(a.id)} className="group/icon relative ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"><span className="group-hover/icon:opacity-0 group-focus-visible/icon:opacity-0">{a.icon}</span><Star size={14} className={`absolute opacity-0 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100 ${favorites.includes(a.id)?'fill-current':''}`}/></button>}
     {favoritesKey&&a.favoritable===false&&<span className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500">{a.icon}</span>}
     <button type="button" role={a.checked===undefined?"menuitem":a.radio?"menuitemradio":"menuitemcheckbox"} aria-checked={a.checked} disabled={a.disabled} title={a.title} onClick={()=>{if(a.checked===undefined)change(false);a.run();}} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-zinc-700 disabled:opacity-35 dark:text-zinc-200">{!favoritesKey&&a.icon}<span className="flex-1">{a.label}</span>{a.shortcut&&<Shortcut>{a.shortcut}</Shortcut>}{a.checked&&<Check size={14}/>}</button>
     </div>
    </div>)}
    </div>
   </PopoverContent>
  </Popover>
 </div>;
}
