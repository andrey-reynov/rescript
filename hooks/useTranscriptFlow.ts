"use client";
import {useEffect,useMemo,useState,type RefObject} from 'react';
import {transcriptFlow} from '@/lib/transcript-flow';
import type {Word} from '@/lib/types';

/** Match the transcript's 15px font and content width, including font loading and
 * panel resizing. Pointer movement/selection does not remeasure the transcript. */
export function useTranscriptFlow(words:Word[],enabled:boolean,container:RefObject<HTMLDivElement|null>){
 const [layout,setLayout]=useState({width:600,font:'15px sans-serif',revision:0});
 useEffect(()=>{
  if(!enabled||!container.current)return;
  const element=container.current;let live=true;
  const update=()=>{
   if(!live)return;const style=getComputedStyle(element);
   const width=element.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
   const font=`${style.fontStyle} ${style.fontWeight} 15px ${style.fontFamily}`;
   setLayout(previous=>previous.width===width&&previous.font===font?previous:{...previous,width,font});
  };
  const fonts=()=>{update();if(live)setLayout(previous=>({...previous,revision:previous.revision+1}));};
  const observer=new ResizeObserver(update);observer.observe(element);update();
  void document.fonts.ready.then(fonts);document.fonts.addEventListener('loadingdone',fonts);
  return()=>{live=false;observer.disconnect();document.fonts.removeEventListener('loadingdone',fonts);};
 },[enabled,container]);
 return useMemo(()=>{
  if(!enabled||typeof document==='undefined')return [];
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  if(!context)return words.map(word=>[word]);context.font=layout.font;
  const cache=new Map<string,number>();
  return transcriptFlow(words,layout.width,text=>{let size=cache.get(text);if(size===undefined){size=context.measureText(text).width;cache.set(text,size);}return size;});
 },[words,enabled,layout]);
}
