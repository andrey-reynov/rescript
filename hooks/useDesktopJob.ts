"use client";
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/store';
import { speakersFromWords } from '@/lib/speakers';
import { flushProjectAutosave } from '@/lib/autosave';
import { extendTranscriptHistory } from '@/lib/progressive-transcript';
import type { Word } from '@/lib/types';

/** The editor observes durable progress; it owns neither inference nor its lifetime. */
export function useDesktopJob() {
  const projectId=useEditorStore(s=>s.projectId);
  useEffect(()=>{
    const api=window.rescriptDesktop?.jobs;if(!api||!projectId)return;
    let disposed=false,syncing=false,again=false,lastApplied='';
    const current=()=>!disposed&&useEditorStore.getState().projectId===projectId;
    const sync=async()=>{
      if(syncing){again=true;return;}syncing=true;
      try {
        const job=await api.read(projectId);if(!current()||!job)return;
        useEditorStore.setState({jobState:job.status});
        const signature=job.key+':'+job.completed.join(',')+':'+(job.status==='complete')+':'+job.sampleCount;
        if((job.sampleCount>0||job.completed.length>0||job.status==='complete')&&lastApplied!==signature){
          const before=useEditorStore.getState();
          await flushProjectAutosave();if(!current())return;
          const result=await api.result(projectId);if(!current())return;
          const latest=useEditorStore.getState();
          // Do not replace an edit made while the save/read round trip was in flight.
          if(latest.words!==before.words||latest.speakers!==before.speakers){again=true;return;}
          const data=result.project.data;
          if(job.transcribe&&data.transcriptionResultKey===job.key){
            const words=data.words as Word[];
            useEditorStore.setState({words,phrases:data.phrases??[],selectedWordIds:[],selectionAnchor:null,speakers:speakersFromWords(words,latest.speakers),
              transcriptionResultKey:job.key,transcriptionChunks:data.transcriptionChunks??[],
              skipTranscription:job.status==='complete',
              past:(job.replacementChunks||job.replacementRange)?[]:extendTranscriptHistory(latest.past,latest.words,words),
              future:(job.replacementChunks||job.replacementRange)?[]:extendTranscriptHistory(latest.future,latest.words,words)});
          }
          const waveform=result.waveform;
          useEditorStore.setState({waveform:waveform?{...waveform,min:new Int8Array(waveform.min),max:new Int8Array(waveform.max)}:null,hasAudio:job.sampleCount>0});
          lastApplied=signature;
        }
        const latest=useEditorStore.getState();
        const reviewable=latest.words.length>0;
        const running=job.status==='running';
        const stopped=job.status==='paused'||job.status==='error';
        useEditorStore.setState({
          status:job.status==='complete'||reviewable?'ready':stopped?'error':running?'transcribing':'preparing',
          error:stopped?job.message:null,
          progress:{message:job.progress?.message??job.message,value:running?(job.completed.length+(job.progress?.value??0))/Math.max(1,job.total):job.progress?.value??null},
          partialText:job.completed.length?`${job.completed.length} of ${job.total} batches saved.`:''
        });
      }catch(error){if(current())useEditorStore.getState().setError(error instanceof Error?error.message:'Could not reconnect to transcription.');}
      finally{syncing=false;if(again){again=false;void sync();}}
    };
    void sync();const unsubscribe=api.onChanged(id=>{if(id===projectId)void sync();});
    return()=>{disposed=true;unsubscribe();};
  },[projectId]);
}
