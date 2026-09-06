"use client";
import {useState} from 'react';
import {CUSTOM_COMMANDS,type CustomCommand,eventShortcut,shortcutError,setTimelinePreferences,useTimelinePreferences} from '@/lib/timeline-tools';
import {isCompositionKey} from '@/lib/keyboard';
import Button from './Button';
import {useForkI18n} from './I18nProvider';
export default function ShortcutsSettings(){const f=useForkI18n(),prefs=useTimelinePreferences();const [error,setError]=useState('');return <div className="space-y-3">
 <p className="text-xs text-zinc-500">{f('Click a shortcut field and press the desired keys. Standard editing shortcuts stay fixed.')}</p>
 {Object.entries(CUSTOM_COMMANDS).map(([id,label])=><label key={id} className="flex items-center justify-between gap-3 text-sm"><span>{f(label)}</span><input readOnly aria-label={f(label)} value={prefs.bindings[id as CustomCommand]??''} placeholder={f('Not assigned')} className="w-36 rounded border border-zinc-300 bg-transparent px-2 py-1 text-center dark:border-zinc-600" onKeyDown={e=>{if(e.key==='Tab'||e.key==='Escape'||isCompositionKey(e.nativeEvent))return;e.preventDefault();e.stopPropagation();const binding=e.key==='Backspace'||e.key==='Delete'?'':eventShortcut(e);if(!binding&&!['Backspace','Delete'].includes(e.key))return;const problem=shortcutError(binding,id as CustomCommand,prefs.bindings);setError(problem);if(!problem)setTimelinePreferences({bindings:{...prefs.bindings,[id]:binding}});}}/></label>)}
 {error&&<p role="alert" className="text-xs text-red-500">{f(error)}</p>}
 <p className="text-xs text-zinc-500">{f('Backspace clears a custom shortcut. Save, Open, Undo, Redo, Split, Delete, Restore and playback shortcuts are fixed.')}</p>
 <Button onClick={()=>{setTimelinePreferences({bindings:{snapping:'N'}});setError('');}}>{f('Reset shortcuts')}</Button>
 </div>;}
