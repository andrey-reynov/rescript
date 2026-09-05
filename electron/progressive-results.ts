import type { ProjectData } from './project-files';
import { mergeChunkReplacement, type JobState, type JobWord } from './transcription-jobs';

/** Publish each committed batch once, preserving edits in all other batches. */
export function publishTranscriptionProgress(data:ProjectData,job:JobState,generated:JobWord[]):ProjectData {
  if(data.source==='import'||!job.transcribe)return data;
  const applied=data.transcriptionResultKey===job.key?data.transcriptionChunks??[]:[];
  const missing=job.completed.filter(index=>!applied.includes(index)&&(!job.replacementChunks||job.replacementChunks.includes(index)));
  if(!missing.length)return data;
  const existing=data.transcriptionResultKey===job.key||job.replacementChunks?data.words as JobWord[]:[];
  return {...data,words:mergeChunkReplacement(existing,generated,missing),transcriptionResultKey:job.key,
    transcriptionChunks:[...job.completed].sort((a,b)=>a-b),transcriptionComplete:job.status==='complete'};
}
