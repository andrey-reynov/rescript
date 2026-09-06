import {getWordCutRanges} from '../lib/edits';
import type {ManualCut} from '../lib/types';
import type { ProjectData } from './project-files';
import { mergeChunkReplacement, type JobState, type JobWord } from './transcription-jobs';

/** Publish each committed batch once, preserving edits in all other batches. */
export function publishTranscriptionProgress(data:ProjectData,job:JobState,generated:JobWord[]):ProjectData {
  if(!job.transcribe)return data;
  if(job.replacementRange){
    // A range replacement commits atomically, including a valid empty result.
    if(job.status!=='complete'||data.transcriptionResultKey===job.key)return data;
    const {start,end}=job.replacementRange;
    const existing=data.words as JobWord[];
    const keep=existing.filter(word=>word.end<=start||word.start>=end);
    let id=existing.reduce((max,word)=>Math.max(max,word.id),-1)+1;
    const replacement=generated.map(word=>({...word,id:id++,start:Math.max(start,word.start),end:Math.min(end,word.end)})).filter(word=>word.end>word.start);
    // Deleted-word ranges belong to the edit, not the replacement recognizer.
    // Materialize them before removing/reordering words; otherwise even retained
    // deleted words can accidentally bridge a newly empty replacement interval.
    const wordCuts=getWordCutRanges(existing,data.duration);
    let manualCuts=data.manualCuts;
    if(wordCuts.length){
      const previous=(data.manualCuts??[]) as ManualCut[];
      let nextId=previous.reduce((max,cut)=>Math.max(max,cut.id),0)+1;
      manualCuts=[...previous,...wordCuts.map(range=>({...range,id:nextId++}))];
    }
    const retained=wordCuts.length?keep.map(word=>word.deleted?{...word,deleted:false}:word):keep;
    const keepIds=new Set(keep.map(w=>w.id));
    return {...data,manualCuts,transcriptionPreservedCuts:wordCuts,phrases:(data.phrases??[]).map(g=>({...g,wordIds:g.wordIds.filter(id=>keepIds.has(id))})).filter(g=>g.wordIds.length>1),words:[...retained,...replacement].sort((a,b)=>a.start-b.start),transcriptionResultKey:job.key,transcriptionChunks:job.completed,transcriptionComplete:true};
  }
  if(data.source==='import')return data;
  const applied=data.transcriptionResultKey===job.key?data.transcriptionChunks??[]:[];
  const missing=job.completed.filter(index=>!applied.includes(index)&&(!job.replacementChunks||job.replacementChunks.includes(index)));
  if(!missing.length)return data;
  const existing=data.transcriptionResultKey===job.key||job.replacementChunks?data.words as JobWord[]:[];
  return {...data,words:mergeChunkReplacement(existing,generated,missing),transcriptionResultKey:job.key,
    transcriptionChunks:[...job.completed].sort((a,b)=>a-b),transcriptionComplete:job.status==='complete'};
}
