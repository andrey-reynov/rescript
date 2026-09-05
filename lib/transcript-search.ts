import type { Word } from './types';

export interface TranscriptSearchIndex { text:string; offsets:number[]; words:Word[]; }
export function buildTranscriptSearchIndex(words:Word[]):TranscriptSearchIndex {
  const offsets:number[]=[];let length=0;
  const parts=words.map(word=>{offsets.push(length);const text=word.text.toLocaleLowerCase();length+=text.length+1;return text;});
  return {text:parts.join(' '),offsets,words};
}
/** Match phrases across rendering rows; timestamps and hidden DOM are irrelevant. */
export function searchTranscript(index:TranscriptSearchIndex,query:string):number[][] {
  const needle=query.trim().toLocaleLowerCase();if(!needle)return [];
  const wordAt=(offset:number)=>{let lo=0,hi=index.offsets.length;while(lo<hi){const mid=(lo+hi)>>>1;if(index.offsets[mid]<=offset)lo=mid+1;else hi=mid;}return Math.max(0,lo-1);};
  const matches:number[][]=[];let from=0;
  while(from<index.text.length){const at=index.text.indexOf(needle,from);if(at<0)break;
    matches.push(index.words.slice(wordAt(at),wordAt(at+needle.length-1)+1).map(word=>word.id));from=at+needle.length;
  }
  return matches;
}
