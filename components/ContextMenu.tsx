"use client";
import {useEffect,useLayoutEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {Check} from 'lucide-react';
import {Shortcut} from './Button';
import type {MenuAction} from './ActionMenu';
import {useForkI18n} from './I18nProvider';

export default function ContextMenu({point,actions,onClose,label}:{point:{x:number;y:number};actions:MenuAction[];onClose:()=>void;label:string}){
 const f=useForkI18n(),ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const menu=ref.current;if(!menu)return;const bounds=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(point.x,window.innerWidth-bounds.width-8))+'px';menu.style.top=Math.max(8,Math.min(point.y,window.innerHeight-bounds.height-8))+'px';menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();},[point]);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))onClose();};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}};window.addEventListener('pointerdown',close);window.addEventListener('keydown',key,true);window.addEventListener('resize',onClose);return()=>{window.removeEventListener('pointerdown',close);window.removeEventListener('keydown',key,true);window.removeEventListener('resize',onClose);};},[onClose]);
 return createPortal(<div ref={ref} role="menu" aria-label={label} style={{left:point.x,top:point.y}} className="fixed z-[150] max-h-[80vh] w-72 max-w-[90vw] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900" onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{const rows=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],at=rows.indexOf(document.activeElement as HTMLButtonElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();rows[e.key==='Home'?0:e.key==='End'?rows.length-1:(at+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length]?.focus();}}}>
 {actions.length?actions.map(a=><button type="button" key={a.id} role={a.checked===undefined?'menuitem':'menuitemcheckbox'} aria-checked={a.checked} disabled={a.disabled} onClick={()=>{onClose();a.run();}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800">{a.icon}<span className="flex-1">{a.label}</span>{a.shortcut&&<Shortcut>{a.shortcut}</Shortcut>}{a.checked&&<Check size={13}/>}</button>):<div role="menuitem" aria-disabled="true" className="px-3 py-2 text-xs text-zinc-400">{f('No actions yet')}</div>}
 </div>,document.body);
}
