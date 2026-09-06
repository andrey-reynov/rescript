import type {Word} from './types';
import type {TranscriptBlock} from './transcript-structure';

export interface AlignmentSelection {words:Word[];start:number;end:number}

/** Capture exactly the visible, contiguous source words the user requested. */
export function alignmentSelection(words:Word[],ids:number[],blocks:TranscriptBlock[]):AlignmentSelection {
 const wanted=new Set(ids),selected=words.filter(word=>wanted.has(word.id));
 if(!selected.length||selected.length!==wanted.size)throw Error('Select text to realign.');
 const first=words.indexOf(selected[0]),last=words.indexOf(selected.at(-1)!);
 if(last-first+1!==selected.length)throw Error('Select consecutive text to realign.');
 const start=Math.min(...selected.map(word=>word.start)),end=Math.max(...selected.map(word=>word.end));
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||selected.some(word=>word.deleted||!word.text.trim())||!blocks.some(block=>block.kind==='clip'&&block.start<=start&&block.end>=end))throw Error('Realign visible words within one retained clip.');
 return {words:structuredClone(selected),start,end};
}

/** Publish only measured timings. A failed/stale/partial result changes nothing.
 * No text, speaker, phrase identity, deletion flag or original provenance comes
 * from the worker: it can supply timings for the captured IDs only. */
export function applyAlignment(words:Word[],selection:AlignmentSelection,result:Word[],blocks:TranscriptBlock[]):Word[]{
 const current=alignmentSelection(words,selection.words.map(word=>word.id),blocks);
 if(JSON.stringify(current)!==JSON.stringify(selection))throw Error('Selected text changed. Run alignment again.');
 if(result.length!==selection.words.length)throw Error('Alignment did not return every selected word.');
 let end=selection.start;
 for(let i=0;i<result.length;i++){
  const word=result[i],original=selection.words[i];
  if(word.id!==original.id||word.text!==original.text||!Number.isFinite(word.start)||!Number.isFinite(word.end)||word.start<end||word.end<=word.start||word.end>selection.end)throw Error('Alignment returned invalid word timings.');
  end=word.end;
 }
 const measured=new Map(result.map(word=>[word.id,word]));
 return words.map(word=>{
  const timing=measured.get(word.id);if(!timing)return word;
  const provenance=word.correction??{sourceWordIds:[word.id],sourceStart:word.start,sourceEnd:word.end,originalText:word.text,timing:'approximate' as const};
  return {...word,start:timing.start,end:timing.end,correction:{...provenance,timing:'aligned'}};
 });
}
