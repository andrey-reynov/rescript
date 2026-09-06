"use client";

import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpFromLine,
  ChevronLast,
  Eye,
  EyeOff,
  Merge,
  Pencil,
  RotateCcw,
  Scissors,
  VolumeOff,
} from "lucide-react";
import { FloatingPortal } from "@floating-ui/react";
import { useEditorStore } from "@/lib/store";
import { isDisfluencyPlaceholder } from "@/lib/disfluencies";
import ContextMenu from './ContextMenu';
import RealignSelection from './RealignSelection';
import {alignmentSelection,type AlignmentSelection} from '@/lib/correction-alignment';
import ActionMenu from './ActionMenu';
import {intervalDuration,hiddenSelectionCount} from '@/lib/transcript-presentation';
import {transcriptBlocks,correctionSelection,type TranscriptBlock} from '@/lib/transcript-structure';
import TranscriptionSetup from "./TranscriptionSetup";
import TranscriptToolsMenu from "./TranscriptToolsMenu";
import TranscriptSearch from "./TranscriptSearch";
import {
  isTranscriptFile,
  parseTranscriptFile,
  TRANSCRIPT_ACCEPT,
} from "@/lib/parseTranscript";
import type { Word } from "@/lib/types";
import TranscriptScrollIndicator from "./TranscriptScrollIndicator";
import SpeakerLabel, {
  SelectionSpeakerButton,
  SelectionSpeakerPopover,
} from "./SpeakerLabel";
import {
  getActiveSceneBoundaries,
  getKeepRanges,
  isWordCutOut,
  mapSplitsToWords,
} from "@/lib/edits";
import {useTranscriptFlow} from '@/hooks/useTranscriptFlow';
import { useTranscriptSelection } from "@/hooks/useTranscriptSelection";
import { useTranscriptPlayheadFollow } from "@/hooks/useTranscriptPlayheadFollow";
import { useWordAnchorFloating } from "@/hooks/useWordAnchorFloating";
import { useCutRanges } from "@/hooks/useCutRanges";
import { findActiveWordId, groupWordsBySpeaker } from "@/lib/transcript";
import { isTypingTarget, isCompositionKey } from "@/lib/keyboard";
import { useI18n, useForkI18n } from "./I18nProvider";
import { localizeRuntimeMessage } from "@/lib/i18n";

const WordSpan = memo(function WordSpan({
  word,
  cutOut,
  active,
  selected,
  partial=false,
  onClick,
}: {
  word: Word;
  /** True when the word is removed from the edited media (deleted or covered by a cut). */
  cutOut: boolean;
  active: boolean;
  selected: boolean;
  partial?:boolean;
  onClick: (word: Word, el: HTMLElement) => void;
}) {
  const { t } = useI18n();
  const f=useForkI18n();
  const placeholder = isDisfluencyPlaceholder(word.text);
  const emptyText = !word.text.trim();
  // The trailing space lives inside the span so that selection and deletion
  // highlights are continuous across words instead of breaking at each gap.
  return (
    <span
      data-wid={word.id}
      data-sel={selected ? "" : undefined}
      data-cut={cutOut ? "" : undefined}
      data-placeholder={placeholder ? "" : undefined}
      title={emptyText?f("Empty text · audio preserved; double-click to correct"):partial?f("Partially cut · source timing preserved"):word.correction?.timing==='approximate'?f("Approximate timing · corrected text"):placeholder ? t("transcript.hesitation") : undefined}
      onClick={(e) => {
        if(e.ctrlKey){useEditorStore.getState().seekTo(word.start);return;}
        if(e.shiftKey){e.currentTarget.closest<HTMLElement>('[data-transcript-editor]')?.focus({preventScroll:true});useEditorStore.getState().selectWordRange([word.id],true);window.getSelection()?.removeAllRanges();return;}
        e.currentTarget.closest<HTMLElement>('[data-transcript-editor]')?.focus({preventScroll:true});
        onClick(word,e.currentTarget);
      }}
      className={`${partial?'underline decoration-dotted decoration-amber-500':''} py-0.5 cursor-pointer transition-colors duration-75 ${cutOut
        ? "word-deleted bg-red-50 text-red-600 line-through decoration-red-300 dark:bg-red-950/40 dark:text-red-400 dark:decoration-red-800"
        : active
          ? "bg-neutral-200/80 text-zinc-900 dark:bg-neutral-700/80 dark:text-zinc-50"
          : placeholder
            ? "font-medium text-amber-700/90 hover:bg-amber-50 dark:text-amber-400/90 dark:hover:bg-amber-950/40"
            : "text-zinc-800 hover:bg-neutral-50 dark:text-zinc-200 dark:hover:bg-neutral-800/60"
        }`}
    >
      {emptyText?<span className="rounded border border-dashed border-current px-1 text-xs italic opacity-70">{f("Empty text")}</span>:word.text}{" "}
    </span>
  );
});

/**
 * Descript-style edit boundary: the "|" between two clips created by a split.
 * Click it to join them back together (the inverse of Split / S).
 */
const SplitMarker = memo(function SplitMarker({
  boundaryId,
  onJoin,
}: {
  boundaryId: number;
  onJoin: (id: number) => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      title={t("transcript.joinSplit")}
      aria-label={t("transcript.joinClips")}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onJoin(boundaryId)}
      className="group relative mx-0.5 inline-flex h-4 w-2 cursor-pointer select-none items-center justify-center align-middle"
    >
      <span className="h-4 w-0.5 rounded-full bg-zinc-300 transition-colors group-hover:bg-zinc-600 dark:bg-zinc-600 dark:group-hover:bg-zinc-300" />
      <span className="pointer-events-none absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900">
        <Merge size={9} />
        {t("transcript.joinClips")}
      </span>
    </button>
  );
});

export default function TranscriptPanel() {
  const f=useForkI18n();
  const [wordContext,setWordContext]=useState<{x:number;y:number;id:number}|null>(null);
  const [editError,setEditError]=useState('');
  const [realignment,setRealignment]=useState<{selection:AlignmentSelection;projectId:string}|null>(null);
  const view=useEditorStore(s=>s.transcriptView),clipNames=useEditorStore(s=>s.clipNames);
  const { t } = useI18n();
  const words = useEditorStore((s) => s.words);
  const sceneBoundaries = useEditorStore((s) => s.sceneBoundaries);
  const duration = useEditorStore((s) => s.duration);
  const status = useEditorStore((s) => s.status);
  const progress = useEditorStore((s) => s.progress);
  const partialText = useEditorStore((s) => s.partialText);
  const error = useEditorStore((s) => s.error);
  const showDeleted = useEditorStore((s) => s.showDeleted);
  const toggleShowDeleted = useEditorStore((s) => s.toggleShowDeleted);
  const deleteWords = useEditorStore((s) => s.deleteWords);
  const restoreWords = useEditorStore((s) => s.restoreWords);
  const correctWords = useEditorStore((s) => s.correctWords);
  const importWords = useEditorStore((s) => s.importWords);
  const removeSceneBoundary = useEditorStore((s) => s.removeSceneBoundary);
  const selectedWordIds = useEditorStore((s) => s.selectedWordIds);
  const playing = useEditorStore((s) => s.playing);
  const activeWordId = useEditorStore((s) => findActiveWordId(s.words, s.currentTime));

  const cuts = useCutRanges();
  const cutOutIds = useMemo(() => {
    const ids = new Set<number>();
    for (const w of words) {
      if (isWordCutOut(w, cuts)) ids.add(w.id);
    }
    return ids;
  }, [words, cuts]);

  // Splits get a joinable edit boundary in the transcript, like the timeline's
  // marker. Splits at the edge of a skipped region are inert and hidden in both.
  const splitBeforeWordId = useMemo(
    () =>
      mapSplitsToWords(
        words,
        getActiveSceneBoundaries(sceneBoundaries, getKeepRanges(cuts, duration))
      ),
    [sceneBoundaries, cuts, duration, words]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  // Bound even a single-speaker monologue to small rendering rows; source data is unchanged.
  const blocks=useMemo(()=>transcriptBlocks(words,cuts,sceneBoundaries,duration,clipNames),[words,cuts,sceneBoundaries,duration,clipNames]);
  const continuousWords=useMemo(()=>showDeleted?words:words.filter(word=>!cutOutIds.has(word.id)),[words,showDeleted,cutOutIds]);
  const flowLines=useTranscriptFlow(continuousWords,view==='continuous',containerRef);
  const turns=useMemo(()=>{
    if(view==='continuous')return flowLines.map((line,index)=>({speaker:-1,words:line,block:undefined as TranscriptBlock|undefined,key:`continuous:${line[0].id}`,sourceWordIds:line.map(word=>word.id),sourceStart:line[0].id,first:index===0}));
    const groups:Array<{speaker:number;words:Word[];block?:TranscriptBlock}>=view==='speakers'?groupWordsBySpeaker(words):blocks.map(block=>({speaker:-1,words:block.words,block}));
    return groups.flatMap((turn,groupIndex)=>{
      const sourceWordIds=turn.words.map(word=>word.id),sourceStart=turn.words[0]?.id??-1;
      const rows:Array<typeof turn & {key:string;sourceWordIds:number[];sourceStart:number;first:boolean}>=[];
      for(let i=0;i<Math.max(1,turn.words.length);i+=80){const rowWords=turn.words.slice(i,i+80);if(view==='clips'||showDeleted||rowWords.some(word=>!cutOutIds.has(word.id)))rows.push({...turn,key:`${view}:${turn.block?.id??groupIndex}:${i}`,words:rowWords,sourceWordIds,sourceStart,first:i===0});}return rows;
    });
  },[words,showDeleted,cutOutIds,blocks,view,flowLines]);
  const rowByWord=useMemo(()=>{const index=new Map<number,number>();turns.forEach((turn,row)=>turn.words.forEach(word=>index.set(word.id,row)));return index;},[turns]);
  const [dragAnchor,setDragAnchor]=useState<number|null>(null);
  const dragAnchorRef=useRef<number|null>(null),lastDragAt=useRef(0);
  useEffect(()=>{const release=()=>{if(dragAnchorRef.current!==null){lastDragAt.current=Date.now();dragAnchorRef.current=null;}setDragAnchor(null);};window.addEventListener('mouseup',release);return()=>window.removeEventListener('mouseup',release);},[]);
  const selectedIds=useMemo(()=>new Set(selectedWordIds),[selectedWordIds]);
  const pinnedRows=useMemo(()=>[selectedWordIds[0],selectedWordIds[selectedWordIds.length-1],dragAnchor??-1].map(id=>rowByWord.get(id)).filter((row):row is number=>row!==undefined),[selectedWordIds,rowByWord,dragAnchor]);
  const virtualizer=useVirtualizer({count:turns.length,getScrollElement:()=>scrollRef.current,estimateSize:()=>view==='continuous'?32:180,overscan:3,scrollMargin:72,
    getItemKey:useCallback((index:number)=>turns[index].key,[turns]),
    rangeExtractor:useCallback((range: Parameters<typeof defaultRangeExtractor>[0])=>Array.from(new Set([...defaultRangeExtractor(range),...pinnedRows])).sort((a,b)=>a-b),[pinnedRows]),
  });
  const virtualRows=virtualizer.getVirtualItems();
  const renderRevision=virtualRows.map(row=>row.index).join(',');
  const ensureWordVisible=useCallback((id:number)=>{const row=rowByWord.get(id);if(row!==undefined)virtualizer.scrollToIndex(row,{align:'center'});},[rowByWord,virtualizer]);
  const ensureWordVisibleRef=useRef(ensureWordVisible);
  useEffect(()=>{ensureWordVisibleRef.current=ensureWordVisible;},[ensureWordVisible]);
  useEffect(()=>{
    const id=selectedWordIds[0];if(id===undefined)return;
    if(selectedWordIds.length>1&&Date.now()-lastDragAt.current<200)return;
    ensureWordVisibleRef.current(id);
    // Dynamic rows are measured after mounting. Align the actual word after that
    // measurement rather than only the row's initial estimated position.
    let frame=0,attempt=0;
    const align=()=>{
      const word=containerRef.current?.querySelector<HTMLElement>('[data-wid="'+id+'"]');
      if(word)word.scrollIntoView({block:'center',inline:'nearest'});
      if(++attempt<3)frame=requestAnimationFrame(align);
    };
    frame=requestAnimationFrame(align);return()=>cancelAnimationFrame(frame);
  },[selectedWordIds]);
  // Follow explicit navigation, not row-map changes caused by editing off screen.
  useEffect(()=>{if(!playing&&activeWordId>=0&&!containerRef.current?.querySelector('[data-wid="'+activeWordId+'"]'))ensureWordVisibleRef.current(activeWordId);},[activeWordId,playing]);
  const [correcting, setCorrecting] = useState<{ ids: number[] } | null>(null);
  const [correctText, setCorrectText] = useState("");
  const [assigningSpeaker, setAssigningSpeaker] = useState<{
    ids: number[];
  } | null>(null);
  // Mirrors Correct / Speaker pickers so selection handlers freeze highlights.
  const freezeSelectionRef = useRef(false);

  const {
    selection,
    clearSelection,
    clearMarks,
    handleWordClick,
    releaseToolbar,
  } = useTranscriptSelection({
    containerRef,
    scrollRef,
    cutOutIds,
    freezeSelectionRef,
    renderRevision,
  });

  const {
    showFollowControl,
    followDirection,
    resumeFollowPlayhead,
    markUserScrollGesture,
  } = useTranscriptPlayheadFollow({
    scrollRef,
    containerRef,
    playing,
    activeWordId,
    ensureWordVisible,
  });

  // Selection and seeking are separate; explicit seek gestures handle the playhead.
  const onWordClick = useCallback(
    (word: Word, el: HTMLElement) => {
      resumeFollowPlayhead();
      handleWordClick(word, el);
    },
    [handleWordClick, resumeFollowPlayhead]
  );

  const toolbarOpen = view==='speakers' && !!(selection && !correcting && !assigningSpeaker);
  const { setFloating: setToolbarFloating, floatingStyles: toolbarStyles } =
    useWordAnchorFloating({
      open: toolbarOpen,
      wordIds: selection?.ids,
      containerRef,
      placement: "top",
      offsetMain: 8,
    });

  const deletedCount = useMemo(() => cutOutIds.size, [cutOutIds]);
  const handleImportTranscript = useCallback(
    async (files: readonly File[] | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!isTranscriptFile(file)) {
        alert(t("transcript.invalidFile"));
        return;
      }
      if (
        words.length > 0 &&
        !confirm(t("transcript.replaceConfirm"))
      ) {
        return;
      }
      try {
        const imported = await parseTranscriptFile(file);
        importWords(imported.words, imported.speakers);
      } catch (err) {
        console.error(err);
        alert(
          err instanceof Error
            ? localizeRuntimeMessage(err.message, t)
            : t("error.readTranscript")
        );
      }
    },
    [words.length, importWords, t]
  );

  const cutSelection = useCallback(() => {
    if (!selection) return;
    deleteWords(selection.ids);
    clearSelection();
  }, [selection, deleteWords, clearSelection]);

  const restoreSelection = useCallback(() => {
    if (!selection) return;
    restoreWords(selection.ids);
    clearSelection();
  }, [selection, restoreWords, clearSelection]);

  const beginCorrection=useCallback((ids:number[],replacement?:string)=>{
    if(status!=='ready')return;
    try{
      const {members}=correctionSelection(words,ids,blocks);
      freezeSelectionRef.current=true;setEditError('');
      setCorrecting({ids:members.map(word=>word.id)});
      setCorrectText(replacement??members.map(word=>word.text).join(' '));
      releaseToolbar();
    }catch(e){setEditError(e instanceof Error?e.message:String(e));}
  },[status,words,blocks,releaseToolbar]);

  const openCorrect = useCallback(() => {
    if(selection)beginCorrection(selection.ids);
  }, [selection,beginCorrection]);

  const closeCorrect = useCallback(() => {
    freezeSelectionRef.current = false;
    clearMarks();
    setCorrecting(null);
  }, [clearMarks]);

  const openSpeakerAssign = useCallback(() => {
    if (!selection) return;
    freezeSelectionRef.current = true;
    setAssigningSpeaker({ ids: selection.ids });
    releaseToolbar();
  }, [selection, releaseToolbar]);

  const closeSpeakerAssign = useCallback(() => {
    freezeSelectionRef.current = false;
    clearMarks();
    setAssigningSpeaker(null);
    clearSelection();
  }, [clearMarks, clearSelection]);

  const applyCorrection = useCallback(() => {
    if (!correcting) return;
    try{correctWords(correcting.ids, correctText);setEditError('');closeCorrect();}catch(e){setEditError(e instanceof Error?e.message:String(e));}
  }, [correcting, correctText, correctWords, closeCorrect]);

  // Escape clears the transcript selection chrome. Delete / Backspace are handled
  // globally in Editor (cut words restore; kept words / clips delete).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isCompositionKey(e)||e.key !== "Escape") return;
      if (isTypingTarget(e.target)) return;
      if (selectedWordIds.length === 0) return;
      e.preventDefault();
      clearSelection();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedWordIds, clearSelection]);

  // "@" opens the speaker picker for the current selection.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if(isCompositionKey(e))return;
      if (view!=="speakers" || e.key !== "@" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (!selection || assigningSpeaker || correcting) return;
      e.preventDefault();
      openSpeakerAssign();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [view,selection, assigningSpeaker, correcting, openSpeakerAssign]);

  const contextRun=(action:()=>void)=>()=>{try{action();setEditError('');}catch(e){setEditError(e instanceof Error?e.message:String(e));}};
  const editKey=(e:React.KeyboardEvent)=>{
    if(e.isDefaultPrevented()||isCompositionKey(e.nativeEvent)||isTypingTarget(e.target)||e.ctrlKey||e.metaKey||e.altKey||correcting||!selectedWordIds.length||status!=='ready')return;
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();useEditorStore.getState().splitBeforeSelection();}
    else if(e.key.length===1){e.preventDefault();e.stopPropagation();beginCorrection(selectedWordIds,e.key);}
  };
  const busy = status === "preparing" || status === "transcribing";

  return (
    // min-h-0 keeps this pane from growing to the transcript's full height —
    // without it the panel wrapper scrolls instead of the list below.
    <section data-transcript-editor tabIndex={-1} onKeyDown={editKey} onContextMenu={e=>{const el=(e.target as HTMLElement).closest<HTMLElement>('[data-wid]');if(!el)return;e.preventDefault();const id=Number(el.dataset.wid);if(!useEditorStore.getState().selectedWordIds.includes(id))useEditorStore.getState().selectWordRange([id]);setWordContext({x:e.clientX,y:e.clientY,id});}} onDoubleClick={e=>{const el=(e.target as HTMLElement).closest<HTMLElement>('[data-wid]');if(el)beginCorrection([Number(el.dataset.wid)]);}} className="outline-none relative flex min-h-0 min-w-0 overflow-y-hidden flex-1 flex-col bg-white dark:bg-zinc-900">
      <TranscriptionSetup />
      {/* Floats above the scroller rather than sticking inside it, so the
          rubber-band overscroll only carries the transcript, not the bar. */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-10 items-center gap-2 border-b border-zinc-100/80 bg-white/75 px-3 backdrop-blur-md sm:px-4 dark:border-zinc-800/80 dark:bg-zinc-900/75">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {t("transcript.header")}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {deletedCount > 0 && (
            <span className="rounded-md bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-600 line-clamp-1 line-through dark:bg-red-950/40 dark:text-red-400">
              {t(
                deletedCount === 1
                  ? "transcript.wordDeleted"
                  : "transcript.wordsDeleted",
                { count: deletedCount }
              )}
            </span>
          )}
          {status === "ready" && <TranscriptToolsMenu />}
          {status === "ready" && <TranscriptSearch />}
          <input ref={importInputRef} type="file" accept={TRANSCRIPT_ACCEPT} className="sr-only" onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';void handleImportTranscript(files);}}/>
          <ActionMenu label={f('Transcript options')} actions={[
            {id:'visibility',group:f('Visibility'),label:f('Hide deleted words'),icon:<EyeOff size={14}/>,checked:!showDeleted,run:toggleShowDeleted},
            ...(['clips','speakers','continuous'] as const).map(mode=>({id:mode,group:f('Text layout'),label:f(mode==='clips'?'By clip':mode==='speakers'?'By speaker':'Continuous text'),icon:<Eye size={14}/>,checked:view===mode,radio:true,run:()=>useEditorStore.getState().setTranscriptView(mode)})),
            {id:'import',group:t('common.import'),label:t('common.import'),icon:<ArrowUpFromLine size={14}/>,disabled:!['ready','error','transcribing'].includes(status),run:()=>importInputRef.current?.click()},
          ]}/>
        </div>
      </div>

      <div
        ref={scrollRef}
        onMouseDownCapture={event=>{if(event.button!==0)return;const word=(event.target as HTMLElement).closest<HTMLElement>('[data-wid]');if(word){dragAnchorRef.current=Number(word.dataset.wid);setDragAnchor(dragAnchorRef.current);}}}
        className="scrollbar-none relative min-h-0 flex-1 overflow-y-auto pt-10 scroll-pt-10"
      >
        <div ref={containerRef} className="relative mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
          {busy && (
            <div className="flex flex-col items-start gap-4">
              <div className="w-full bg-zinc-50 p-2 dark:bg-zinc-800/60">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent dark:border-neutral-400" />
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{localizeRuntimeMessage(progress.message, t)}</p>
                  {progress.value !== null && (
                    <>
                      <div className="ml-auto w-[100px] h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div
                          className="h-full rounded-full bg-neutral-500 transition-[width] duration-300 dark:bg-neutral-400"
                          style={{ width: `${progress.value * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                        {Math.round(progress.value * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              {partialText && (
                <p className="text-[15px] leading-8 text-zinc-400 dark:text-zinc-500">
                  {partialText}
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-neutral-500 align-middle" />
                </p>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-900">
              {localizeRuntimeMessage(error, t)}
            </div>
          )}

          {status === "ready" && words.length === 0 && useEditorStore.getState().transcriptionResultKey && (
              <p className="mt-2 flex items-center gap-1 text-sm font-medium text-zinc-500 dark:text-zinc-500">
                <VolumeOff size={16} /> {t("transcript.noSpeech")}
              </p>
          )}

          {status === "ready" && (
            <div className="transcript-words selection:bg-transparent" style={{height:virtualizer.getTotalSize(),position:"relative"}}>
              {virtualRows.map((virtualRow) => {
                const turn=turns[virtualRow.index];
                const visible = showDeleted
                  ? turn.words
                  : turn.words.filter((w) => !cutOutIds.has(w.id));
                if (visible.length === 0 && view!=='clips') return null;
                // First turn in the full word list has no previous speaker to borrow from.
                const canMove = turn.sourceStart !== words[0]?.id;
                return (
                  <div key={virtualRow.key} ref={virtualizer.measureElement} data-index={virtualRow.index} className={view==='continuous'?'pb-0':'pb-7'} style={{position:"absolute",top:0,left:0,width:"100%",transform:`translateY(${virtualRow.start-72}px)`}}>
                    {view==='speakers'&&turn.first&&<>                    <SpeakerLabel
                      speakerId={turn.speaker}
                      turnWordIds={turn.sourceWordIds}
                      turnStartWordId={turn.sourceStart}
                      canMove={canMove}
                    />
</>}
                    {view==='clips'&&turn.first&&turn.block&&<div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                      {turn.block.kind==='deleted'?<span className="text-red-500">{f('Deleted')} · {intervalDuration(turn.block.end-turn.block.start,f('s'))}{!showDeleted&&hiddenSelectionCount(turn.sourceWordIds,selectedIds,cutOutIds)>0&&<span role="status" className="ml-2 text-zinc-500">{f('Hidden selected words: {count}',{count:hiddenSelectionCount(turn.sourceWordIds,selectedIds,cutOutIds)})}</span>}</span>:<>
                        <button onClick={()=>{useEditorStore.getState().selectWordRange(turn.sourceWordIds);useEditorStore.getState().setSelectedClipIndex(turn.block!.clipIndex!);}}>{f('Clip {number}',{number:(turn.block.clipIndex??0)+1})}</button>
                        <input aria-label={f('Clip name')} placeholder={f('Clip name')} value={turn.block.name??''} onChange={e=>useEditorStore.getState().renameClip((turn.block!.start+turn.block!.end)/2,e.target.value)} className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 hover:border-zinc-300"/>
                        {turn.block.splitId!==undefined&&<button title={f('Join clips')} onClick={()=>removeSceneBoundary(turn.block!.splitId!)}><Merge size={13}/></button>}
                      </>}
                    </div>}
                    <p className="select-text text-[15px] leading-8">
                      {visible.map((w) => {
                        if(correcting?.ids.includes(w.id))return w.id===correcting.ids[0]?<input key={w.id} aria-label={f('Correct text')} autoFocus value={correctText} onChange={e=>setCorrectText(e.target.value)} onKeyDown={e=>{e.stopPropagation();if(isCompositionKey(e.nativeEvent))return;if(e.key==='Enter'){e.preventDefault();applyCorrection();}if(e.key==='Escape'){e.preventDefault();closeCorrect();}}} onBlur={applyCorrection} style={{width:`${Math.max(8,Math.min(65,correctText.length+2))}ch`}} className="max-w-full rounded border border-blue-500 bg-white px-1 text-[15px] leading-8 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"/>:null;
                        const split = splitBeforeWordId.get(w.id);
                        return (
                          <React.Fragment key={w.id}>
                            {view==='speakers' && split && (
                              <SplitMarker boundaryId={split.id} onJoin={removeSceneBoundary} />
                            )}
                            <WordSpan
                              word={w}
                              partial={turn.block?.partialIds.includes(w.id)}
                              cutOut={cutOutIds.has(w.id)}
                              active={w.id === activeWordId}
                              selected={selectedIds.has(w.id)}
                              onClick={onWordClick}
                            />
                          </React.Fragment>
                        );
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {toolbarOpen && selection && (
            <FloatingPortal>
              <div
                ref={setToolbarFloating}
                data-transcript-toolbar
                className="z-40 flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-black/30"
                style={toolbarStyles}
                onMouseDown={(e) => e.preventDefault()}
              >
                {selection.anyKept && (
                  <button
                    onClick={cutSelection}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-200 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <Scissors size={13} />
                    {t("transcript.cut")}
                  </button>
                )}
                {selection.anyDeleted && (
                  <button
                    onClick={restoreSelection}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                  >
                    <RotateCcw size={13} />
                    {t("common.restore")}
                  </button>
                )}
                <button
                  onClick={openCorrect}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <Pencil size={13} />
                  {t("transcript.correct")}
                </button>
                <SelectionSpeakerButton onClick={openSpeakerAssign} />
              </div>
            </FloatingPortal>
          )}

          {assigningSpeaker && (
            <SelectionSpeakerPopover
              wordIds={assigningSpeaker.ids}
              containerRef={containerRef}
              onClose={closeSpeakerAssign}
            />
          )}

        </div>
      </div>
      {/* Gradient overlay — must match the transcript panel surface */}
      <div className="absolute z-10 pointer-events-none inset-x-0 bottom-0 w-full h-20 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />
      {showFollowControl && (
        <button
          type="button"
          onClick={resumeFollowPlayhead}
          title={t("transcript.scrollWithPlayhead")}
          className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 backdrop-blur-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/95 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {followDirection === "up" && <ArrowUp size={13} />}
          {followDirection === "down" && <ArrowDown size={13} />}
          {followDirection === null && <ChevronLast size={13} />}
          {t("transcript.follow")}
        </button>
      )}
      {editError&&<div role="alert" className="absolute bottom-4 left-4 z-50 rounded bg-white p-2 text-sm text-red-600 shadow dark:bg-zinc-900" onClick={()=>setEditError('')}>{f(editError)}</div>}
      {wordContext&&<ContextMenu label={f('Text actions')} point={wordContext} onClose={()=>setWordContext(null)} actions={[
        {id:'seek',label:f('Go to word'),icon:<ArrowDown size={13}/>,shortcut:'Ctrl+Click',run:()=>{const word=words.find(w=>w.id===wordContext.id);if(word)useEditorStore.getState().seekTo(word.start);}},
        {id:'cut',label:t('transcript.cut'),icon:<Scissors size={13}/>,shortcut:'Delete',disabled:status!=='ready',run:()=>deleteWords(selectedWordIds)},
        {id:'restore',label:t('common.restore'),icon:<RotateCcw size={13}/>,disabled:!selectedWordIds.some(id=>cutOutIds.has(id)),run:()=>restoreWords(selectedWordIds)},
        {id:'correct',label:t('transcript.correct'),icon:<Pencil size={13}/>,disabled:status!=='ready',run:()=>beginCorrection(selectedWordIds)},
        {id:'realign',label:f('Realign selected text'),icon:<RotateCcw size={13}/>,disabled:status!=='ready'||!useEditorStore.getState().projectId||['running','preparing'].includes(useEditorStore.getState().jobState??''),run:contextRun(()=>{const state=useEditorStore.getState();setRealignment({selection:alignmentSelection(words,selectedWordIds,blocks),projectId:state.projectId!});})},
        {id:'split',label:f('Split clip'),icon:<Merge size={13}/>,shortcut:'Enter',disabled:status!=='ready',run:()=>{useEditorStore.getState().splitBeforeSelection();}},
        {id:'group',label:f('Group into phrase'),icon:<Merge size={13}/>,disabled:selectedWordIds.length<2,run:contextRun(()=>useEditorStore.getState().groupSelectedPhrase())},
        {id:'ungroup',label:f('Ungroup'),icon:<Merge size={13}/>,run:()=>useEditorStore.getState().ungroupSelectedPhrase()},
      ]}/>}
      {realignment&&<RealignSelection {...realignment} onClose={()=>{setRealignment(null);containerRef.current?.closest<HTMLElement>('[data-transcript-editor]')?.focus({preventScroll:true});}}/>}
      <TranscriptScrollIndicator
        scrollRef={scrollRef}
        contentRef={containerRef}
        onUserScroll={markUserScrollGesture}
      />
    </section>
  );
}
