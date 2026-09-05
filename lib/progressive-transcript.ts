import type { EditSnapshot, Word } from './types';

/** New speech must also exist in older undo snapshots, without changing their edits. */
export function extendTranscriptHistory(history:EditSnapshot[],previous:Word[],next:Word[]):EditSnapshot[]{
  const known=new Set(previous.map(word=>word.id));const added=next.filter(word=>!known.has(word.id));
  if(!added.length)return history;
  return history.map(snapshot=>{const ids=new Set(snapshot.words.map(word=>word.id));return {...snapshot,words:[...snapshot.words,...added.filter(word=>!ids.has(word.id))].sort((a,b)=>a.start-b.start||a.id-b.id)};});
}
