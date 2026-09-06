"use client";
import {useEffect,useState} from 'react';
import {useEditorStore} from '@/lib/store';
import type {SilenceJob} from '@/types/silence-api';
export function useSilenceAnalysis(){
 const id=useEditorStore(s=>s.projectId);const [job,setJob]=useState<SilenceJob|null>(null),[error,setError]=useState('');
 useEffect(()=>{const api=window.rescriptDesktop?.silence;if(!api||!id)return;let disposed=false,loaded='';
  const sync=async()=>{try{const next=await api.read(id);if(disposed)return;setJob(next);useEditorStore.setState({silenceJob:next});if(next?.status==='complete'&&loaded!==next.key){const result=await api.result(id);if(!disposed&&useEditorStore.getState().projectId===id){useEditorStore.setState({acousticAnalysis:result});loaded=next.key;}}}catch(error){if(!disposed)setError(String(error));}};
  void sync();const unsubscribe=api.onChanged(changed=>{if(changed===id)void sync();});return()=>{disposed=true;unsubscribe();};
 },[id]);
 const start=async()=>{if(!id)return;setError('');try{await window.rescriptDesktop!.silence.start(id);}catch(error){setError(String(error));}};
 const pause=async()=>{if(!id)return;try{await window.rescriptDesktop!.silence.pause(id);}catch(error){setError(String(error));}};
 return {job,error,start,pause};
}
