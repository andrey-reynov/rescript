"use client";
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/store';

/** Reconnects to the main-process job; owns no inference worker or job lifetime. */
export function useDesktopJob() {
  const projectId=useEditorStore(s=>s.projectId);
  useEffect(()=>{
    const api=window.rescriptDesktop?.jobs;if(!api||!projectId)return;
    let disposed=false, syncing=false, again=false, lastComplete='';
    const sync=async()=>{
      if(syncing){again=true;return;}syncing=true;
      try {
        const job=await api.read(projectId);
        if(disposed||!job||useEditorStore.getState().projectId!==projectId)return;
        const s=useEditorStore.getState();
        useEditorStore.setState({jobState:job.status});
        if(job.status==='complete') {
          const signature=`${job.key}:${job.updatedAt}`;
          if(lastComplete===signature)return;lastComplete=signature;
          const result=await api.result(projectId);
          if(disposed||useEditorStore.getState().projectId!==projectId)return;
          const latest=useEditorStore.getState();
          if(job.transcribe&&!latest.skipTranscription){latest.setWords(result.words);useEditorStore.setState({skipTranscription:true});}
          const waveform=result.waveform;
          useEditorStore.setState({waveform:waveform?{...waveform,min:new Int8Array(waveform.min),max:new Int8Array(waveform.max)}:null,hasAudio:job.sampleCount>0,error:null,partialText:''});
          latest.setStatus('ready');latest.setProgress({message:'',value:null});
        } else if(job.status==='paused'||job.status==='error') {
          s.setError(job.message);
        } else {
          const running=job.status==='running';
          useEditorStore.setState({status:running?'transcribing':'preparing',error:null,progress:{message:job.progress?.message??job.message,value:running?(job.completed.length+(job.progress?.value??0))/Math.max(1,job.total):null},partialText:job.completed.length?`${job.completed.length} of ${job.total} batches saved. You can close the editor and resume later.`:''});
        }
      }catch(error){if(!disposed)useEditorStore.getState().setError(error instanceof Error?error.message:'Could not reconnect to transcription.');}
      finally{syncing=false;if(again){again=false;void sync();}}
    };
    void sync();
    const unsubscribe=api.onChanged(id=>{if(id===projectId)void sync();});
    return()=>{disposed=true;unsubscribe();};
  },[projectId]);
}
