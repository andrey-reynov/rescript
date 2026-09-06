import {useSyncExternalStore} from 'react';
export const CUSTOM_COMMANDS={snapping:'Snapping','skip-deletions':'Skip deletion areas',silence:'Silence detection',retranscribe:'Retranscribe','retranscribe-all':'Retranscribe all',group:'Group into phrase',ungroup:'Ungroup',visibility:'Hide deleted words',clips:'By clip',speakers:'By speaker',continuous:'Continuous text',import:'Import transcript',export:'Export',location:'Show project location',close:'Close Project',processing:'Pause or resume processing','silence-processing':'Pause or resume detection',correct:'Correct text',realign:'Realign selected text'} as const;
export type CustomCommand=keyof typeof CUSTOM_COMMANDS;
export type TimelinePreferences={snapping:boolean;laneHeight:number;bindings:Partial<Record<CustomCommand,string>>};
const defaults:TimelinePreferences={snapping:true,laneHeight:36,bindings:{snapping:'N'}};
const key='rescript.timeline-tools.v1';
const read=()=>{try{return localStorage.getItem(key)??'';}catch{return '';}};
function parse(raw:string):TimelinePreferences{try{const value=JSON.parse(raw);return {snapping:typeof value.snapping==='boolean'?value.snapping:true,laneHeight:Math.max(28,Math.min(160,Number(value.laneHeight)||36)),bindings:{...defaults.bindings,...value.bindings}};}catch{return defaults;}}
const subscribe=(fn:()=>void)=>{window.addEventListener('storage',fn);window.addEventListener('rescript:timeline-tools',fn);return()=>{window.removeEventListener('storage',fn);window.removeEventListener('rescript:timeline-tools',fn);};};
export const getTimelinePreferences=()=>parse(read());
export function setTimelinePreferences(patch:Partial<TimelinePreferences>){localStorage.setItem(key,JSON.stringify({...getTimelinePreferences(),...patch}));window.dispatchEvent(new Event('rescript:timeline-tools'));}
export function useTimelinePreferences(){return parse(useSyncExternalStore(subscribe,read,()=>''));}
export function eventShortcut(e:{key:string;ctrlKey:boolean;metaKey:boolean;altKey:boolean;shiftKey:boolean}){if(['Control','Shift','Alt','Meta'].includes(e.key))return '';return [e.ctrlKey?'Ctrl':'',e.metaKey?'Meta':'',e.altKey?'Alt':'',e.shiftKey?'Shift':'',e.key===' '?'Space':e.key.length===1?e.key.toUpperCase():e.key].filter(Boolean).join('+');}
export function shortcutError(value:string,id:CustomCommand,bindings:TimelinePreferences['bindings']){
 if(!value)return '';
 const reserved=new Set(['F5','F11','F12','S','Space','Delete','Backspace','Enter','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Tab','Shift+Tab','@','Shift+@']);
 const parts=value.split('+'),last=parts.at(-1)!;
 if(((parts.includes('Ctrl')||parts.includes('Meta'))&&['S','O','N','Z','Y','A','C','V','X','F','W','Q','R','I','M','0','=','-',''].includes(last))||value==='Alt+F4'||reserved.has(value)||/(^|\+)(Space|Delete|Backspace|Enter|Escape|Tab|ArrowLeft|ArrowRight|ArrowUp|ArrowDown)$/.test(value)||value==='Shift+S'||/^(Ctrl|Meta)\+(Shift\+)?(S|O|Z|Y|A|C|V|X|F|W|Q|R)$/.test(value))return 'This shortcut is reserved.';
 if(Object.entries(bindings).some(([other,binding])=>other!==id&&binding===value))return 'This shortcut is already assigned.';
 return '';
}
/** Snap in screen pixels, without crossing legal bounds. Sorted candidates use binary lookup. */
export function snapTime(time:number,candidates:number[],pps:number,lo:number,hi:number,excluded:number[]=[]){
 const clamped=Math.max(lo,Math.min(hi,time));if(!(pps>0))return clamped;let left=0,right=candidates.length;
 while(left<right){const mid=(left+right)>>>1;if(candidates[mid]<clamped)left=mid+1;else right=mid;}
 let best=clamped,distance=8/pps;
 for(let i=left-1;i>=0&&clamped-candidates[i]<=distance;i--){const candidate=candidates[i];if(candidate>=lo&&candidate<=hi&&!excluded.some(x=>Math.abs(x-candidate)<1e-7)){best=candidate;distance=clamped-candidate;}}
 for(let i=left;i<candidates.length&&candidates[i]-clamped<=distance;i++){const candidate=candidates[i];if(candidate>=lo&&candidate<=hi&&!excluded.some(x=>Math.abs(x-candidate)<1e-7)){best=candidate;distance=candidate-clamped;}}
 return best;
}
