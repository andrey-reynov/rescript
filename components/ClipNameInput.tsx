"use client";
import {useRef,useState} from 'react';
import {Pencil} from 'lucide-react';
import {isCompositionKey} from '@/lib/keyboard';
import ActionMenu from './ActionMenu';
import {useForkI18n} from './I18nProvider';

/** The displayed name becomes an input only while explicitly renaming. */
export default function ClipNameInput({value,fallback,label,onCommit}:{value:string;fallback:string;label:string;onCommit:(name:string)=>void}){
 const f=useForkI18n();
 const [draft,setDraft]=useState<string|null>(null);
 const canceled=useRef(false);
 const begin=()=>{canceled.current=false;setDraft(value||fallback);};
 return <div className="flex min-w-0 items-center gap-1">
  {draft===null?<button type="button" className="truncate rounded px-1 text-xs font-medium text-indigo-500 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40" title={f('Rename clip')} onClick={begin}>{value||fallback}</button>:<input aria-label={label} autoFocus value={draft}
   onFocus={event=>event.currentTarget.select()}
   onChange={event=>setDraft(event.target.value)}
   onBlur={event=>{const name=event.currentTarget.value.trim();setDraft(null);if(!canceled.current&&name!==(value||fallback))onCommit(name);}}
   onKeyDown={event=>{event.stopPropagation();if(isCompositionKey(event.nativeEvent))return;if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}else if(event.key==='Escape'){event.preventDefault();canceled.current=true;event.currentTarget.blur();}}}
   className="min-w-0 max-w-full rounded border border-indigo-400 bg-transparent px-1 text-xs outline-none"/>}
  <ActionMenu label={label} actions={[{id:'rename',label:f('Rename clip'),icon:<Pencil size={13}/>,run:begin}]}/>
 </div>;
}
