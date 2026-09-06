import type {PhraseGroup,ClipName,CorrectionProvenance} from './transcript-schema';
export type {TranscriptView,PhraseGroup,ClipName,CorrectionProvenance} from './transcript-schema';
import type {Word,TimeRange,SceneBoundary} from './types';

/** Names are anchored in source time, not unstable displayed clip numbers. */
export interface TranscriptBlock {id:string;kind:'clip'|'deleted';start:number;end:number;words:Word[];partialIds:number[];splitId?:number;name?:string;clipIndex?:number}

export function normalizeRanges(ranges:TimeRange[],duration:number):TimeRange[]{
 const valid=ranges.filter(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)).map(r=>({start:Math.max(0,r.start),end:Math.min(duration,r.end)})).filter(r=>r.end>r.start).sort((a,b)=>a.start-b.start);
 const result:TimeRange[]=[];for(const r of valid){const last=result.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else result.push({...r});}return result;
}

/** O(words + regions) once boundaries are sorted. Each word has one primary row.
 * Partial words belong to the region containing their midpoint; the source span
 * and partial indicator are retained, never snapped to the edit boundary. */
export function transcriptBlocks(words:Word[],cuts:TimeRange[],splits:SceneBoundary[],duration:number,names:ClipName[]=[]):TranscriptBlock[]{
 const deleted=normalizeRanges(cuts,duration);
 const points=[0,duration,...deleted.flatMap(r=>[r.start,r.end]),...splits.filter(s=>s.time>0&&s.time<duration&&!deleted.some(r=>s.time>r.start&&s.time<r.end)).map(s=>s.time)];
 const edges=[...new Set(points)].sort((a,b)=>a-b);const blocks:TranscriptBlock[]=[];let cutIndex=0,clipIndex=0;
 const splitMap=new Map(splits.map(s=>[s.time,s.id]));
 for(let i=0;i<edges.length-1;i++){
  const start=edges[i],end=edges[i+1];if(end<=start)continue;
  while(cutIndex<deleted.length&&deleted[cutIndex].end<=start)cutIndex++;
  const isDeleted=!!deleted[cutIndex]&&deleted[cutIndex].start<=start&&deleted[cutIndex].end>=end;
  blocks.push({id:`${isDeleted?'deleted':'clip'}:${start}:${end}`,kind:isDeleted?'deleted':'clip',start,end,words:[],partialIds:[],splitId:splitMap.get(start),...(!isDeleted?{clipIndex:clipIndex++}:{}),name:isDeleted?undefined:names.filter(n=>n.time>=start&&n.time<end).map(n=>n.name).filter(Boolean).join(' / ')||undefined});
 }
 let index=0;for(const word of words){const anchor=(word.start+word.end)/2;while(index<blocks.length-1&&anchor>=blocks[index].end)index++;const b=blocks[index];if(!b||anchor<b.start||anchor>b.end)continue;b.words.push(word);if(word.start<b.start||word.end>b.end)b.partialIds.push(word.id);}
 return blocks;
}

export function selectedRange(words:Word[],anchor:number,targetIds:number[]):number[]{
 const positions=new Map(words.map((w,i)=>[w.id,i]));const a=positions.get(anchor);const targets=targetIds.map(id=>positions.get(id)).filter((i):i is number=>i!==undefined);
 if(a===undefined||!targets.length)return targetIds.filter(id=>positions.has(id));
 const from=targets.reduce((x,y)=>Math.min(x,y),a),to=targets.reduce((x,y)=>Math.max(x,y),a);return words.slice(from,to+1).map(w=>w.id);
}

export function groupPhrase(words:Word[],groups:PhraseGroup[],ids:number[],blocks:TranscriptBlock[],id:string):PhraseGroup[]{
 const selected=new Set(ids),members=words.filter(w=>selected.has(w.id));
 if(members.length<2)throw Error('Select at least two words in one clip.');
 const first=words.indexOf(members[0]),last=words.indexOf(members.at(-1)!);
 if(last-first+1!==members.length)throw Error('Select consecutive words.');
 const clip=blocks.find(b=>b.kind==='clip'&&b.start<=members[0].start&&b.end>=members.at(-1)!.end);
 if(!clip||members.some(w=>w.deleted))throw Error('Group words within one retained clip.');
 const leftovers=groups.map(g=>({...g,wordIds:g.wordIds.filter(id=>!selected.has(id))})).filter(g=>g.wordIds.length>1);
 return [...leftovers,{id,wordIds:members.map(w=>w.id)}];
}

/** Projects a persisted phrase into valid contiguous pieces after cuts/splits or
 * transcription replacement. Never attaches a stale ID to a regenerated word. */
export function projectPhrases(groups:PhraseGroup[],blocks:TranscriptBlock[]):PhraseGroup[]{
 const membership=new Map<number,{block:string;position:number}>();for(const b of blocks)if(b.kind==='clip')b.words.forEach((w,position)=>{if(!b.partialIds.includes(w.id))membership.set(w.id,{block:b.id,position});});
 const result:PhraseGroup[]=[];
 for(const g of groups){let part:number[]=[],previous:ReturnType<typeof membership.get>,partIndex=0;
  const flush=()=>{if(part.length>1)result.push({id:`${g.id}:${partIndex++}`,wordIds:part});part=[];};
  for(const id of g.wordIds){const current=membership.get(id);if(!current){flush();previous=undefined;continue;}if(previous&&(current.block!==previous.block||current.position!==previous.position+1))flush();part.push(id);previous=current;}flush();
 }return result;
}

export function replaceTimedText(words:Word[],ids:number[],text:string,blocks:TranscriptBlock[]):Word[]{
 const selected=new Set(ids),members=words.filter(w=>selected.has(w.id));const tokens=text.trim().split(/\s+/u).filter(Boolean);
 if(!members.length)throw Error('Select text to correct.');
 const from=words.indexOf(members[0]),to=words.indexOf(members.at(-1)!);
 if(to-from+1!==members.length)throw Error('Select consecutive text to correct.');
 if(!blocks.some(b=>b.kind==='clip'&&b.start<=members[0].start&&b.end>=members.at(-1)!.end)||members.some(w=>w.deleted))throw Error('Correct visible words within one retained clip.');
 const start=members[0].start,end=members.at(-1)!.end;
 const inherited=members.flatMap(w=>w.correction?.sourceWordIds??[w.id]);
 const provenance:CorrectionProvenance={sourceWordIds:[...new Set(inherited)],sourceStart:Math.min(...members.map(w=>w.correction?.sourceStart??w.start)),sourceEnd:Math.max(...members.map(w=>w.correction?.sourceEnd??w.end)),originalText:members.filter((w,i)=>!w.correction||i===0||w.correction.sourceStart!==members[i-1].correction?.sourceStart||w.correction.sourceEnd!==members[i-1].correction?.sourceEnd).map(w=>w.correction?.originalText??w.text).join(' '),timing:'approximate'};
 const speaker=members.every(w=>w.speaker===members[0].speaker)?members[0].speaker:-1;
 let nextId=words.reduce((m,w)=>Math.max(m,w.id),-1)+1;
 // Empty correction retains a zero-text timed token as provenance, not a media cut.
 const replacement=(tokens.length?tokens:['']).map((token,i)=>({id:nextId++,text:token,start:start+(end-start)*i/Math.max(tokens.length,1),end:start+(end-start)*(i+1)/Math.max(tokens.length,1),speaker,deleted:false,language:members[0].language,correction:provenance}));
 return [...words.slice(0,from),...replacement,...words.slice(to+1)];
}
