"use client";
import {useRef,useState} from 'react';
import {isCompositionKey} from '@/lib/keyboard';

/** Keep transient typing (including spaces) out of the persisted clip names. */
export default function ClipNameInput({value,label,onCommit}:{value:string;label:string;onCommit:(name:string)=>void}){
 const [draft,setDraft]=useState<string|null>(null);
 const canceled=useRef(false);
 return <input aria-label={label} placeholder={label} value={draft??value}
  onFocus={()=>{canceled.current=false;setDraft(value);}}
  onChange={event=>setDraft(event.target.value)}
  onBlur={event=>{const name=event.currentTarget.value.trim();setDraft(null);if(!canceled.current&&name!==value)onCommit(name);}}
  onKeyDown={event=>{event.stopPropagation();if(isCompositionKey(event.nativeEvent))return;if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}else if(event.key==='Escape'){event.preventDefault();canceled.current=true;setDraft(value);event.currentTarget.blur();}}}
  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 hover:border-zinc-300"/>;
}
