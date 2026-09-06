"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useEditorStore } from "@/lib/store";
import type { Word } from "@/lib/types";

export interface TranscriptSelectionInfo {
  ids: number[];
  anyDeleted: boolean;
  anyKept: boolean;
}

/** While dragging: paint marks only. On mouseup / keyboard: sync to React. */
type SelectionSyncMode = "paint" | "commit";

function sameIds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** Walk up from a Range boundary to the nearest word span inside `container`. */
function wordElFromNode(
  node: Node | null,
  container: HTMLElement
): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== container) {
    if (n instanceof HTMLElement && n.dataset.wid != null) return n;
    n = n.parentNode;
  }
  return null;
}

function wordElsInRange(
  container: HTMLElement,
  range: Range
): HTMLElement[] {
  const all = container.querySelectorAll<HTMLElement>("[data-wid]");
  if (all.length === 0) return [];

  const startEl = wordElFromNode(range.startContainer, container);
  const endEl = wordElFromNode(range.endContainer, container);

  if (startEl && endEl) {
    // Contiguous span between Range endpoints — cheaper than intersectsNode
    // on every word (the hot path during drag).
    const out: HTMLElement[] = [];
    let marking = false;
    for (const el of all) {
      const atBoundary = el === startEl || el === endEl;
      if (atBoundary) {
        out.push(el);
        if (startEl === endEl) break;
        if (marking) break;
        marking = true;
      } else if (marking) {
        out.push(el);
      }
    }
    return out;
  }

  // Fallback when a boundary isn't inside a word span.
  return Array.from(all).filter((el) => range.intersectsNode(el));
}

function selectionInfoFromWordEls(
  els: HTMLElement[],
  cutOutIds: Set<number>
): TranscriptSelectionInfo | null {
  if (els.length === 0) return null;

  const ids: number[] = [];
  let anyDeleted = false;
  let anyKept = false;
  for (const el of els) {
    const id = Number(el.dataset.wid);
    ids.push(id);
    if (cutOutIds.has(id)) anyDeleted = true;
    else anyKept = true;
  }

  return {
    ids,
    anyDeleted,
    anyKept,
  };
}

/**
 * Transcript text selection: imperative `data-sel` marks while dragging,
 * React/Zustand sync on mouseup (or immediately for keyboard selection).
 */
export function useTranscriptSelection({
  containerRef,
  scrollRef,
  cutOutIds,
  /**
   * When true, native selectioncollapse (e.g. focusing a popover input) must
   * not clear the transcript selection — used by Correct / Speaker pickers.
   */
  freezeSelectionRef,
  renderRevision,
}: {
  containerRef: RefObject<HTMLElement | null>;
  scrollRef: RefObject<HTMLElement | null>;
  cutOutIds: Set<number>;
  freezeSelectionRef: RefObject<boolean>;
  renderRevision?: string;
}) {
  const selectedWordIds = useEditorStore((s) => s.selectedWordIds);
  const setSelectedWords = useEditorStore((s) => s.setSelectedWords);

  const [selection, setSelection] = useState<TranscriptSelectionInfo | null>(
    null
  );

  const markedRef = useRef<Set<HTMLElement>>(new Set());
  // Single-word click has no native range; collapsed selectionchange must not wipe it.
  const clickSelectionRef = useRef(false);
  // Between mousedown and mouseup, selectionchange only paints marks.
  const mouseDownRef = useRef(false);
  const dragStartRef = useRef<number|null>(null);
  const dragClickRef = useRef<{id:number;until:number}|null>(null);
  // Mirrored into a ref so the event handlers below stay stable across edits.
  const cutOutIdsRef = useRef(cutOutIds);
  useEffect(() => {
    cutOutIdsRef.current = cutOutIds;
  }, [cutOutIds]);

  const clearMarks = useCallback(() => {
    for (const el of markedRef.current) el.removeAttribute("data-sel");
    markedRef.current.clear();
  }, []);

  const applyMarks = useCallback(
    (els: HTMLElement[]) => {
      const marked = new Set<HTMLElement>();
      for (const el of els) {
        el.setAttribute("data-sel", "");
        marked.add(el);
      }
      for (const el of markedRef.current) {
        if (!marked.has(el)) el.removeAttribute("data-sel");
      }
      markedRef.current = marked;
    },
    []
  );

  const syncToReact = useCallback(
    (info: TranscriptSelectionInfo | null) => {
      setSelection(info);
      const ids = info?.ids ?? [];
      const prev = useEditorStore.getState().selectedWordIds;
      if (!sameIds(prev, ids)) setSelectedWords(ids);
    },
    [setSelectedWords]
  );

  const clearSelection = useCallback(() => {
    clearMarks();
    clickSelectionRef.current = false;
    setSelection(null);
    setSelectedWords([]);
    window.getSelection()?.removeAllRanges();
  }, [clearMarks, setSelectedWords]);

  /** Hide the toolbar and drop click-selection; keep marks (e.g. for correct). */
  const releaseToolbar = useCallback(() => {
    clickSelectionRef.current = false;
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleWordClick = useCallback(
    (word: Word, el: HTMLElement) => {
      if(dragClickRef.current?.id===word.id&&Date.now()<dragClickRef.current.until)return;
      const nativeSel = window.getSelection();
      // Drag ends with a click on the word under the cursor — leave the range alone.
      if (nativeSel && !nativeSel.isCollapsed) return;

      const container = containerRef.current;
      if (!container) return;
      applyMarks([el]);
      clickSelectionRef.current = true;
      const cutOut = cutOutIdsRef.current.has(word.id);
      setSelection({
        ids: [word.id],
        anyDeleted: cutOut,
        anyKept: !cutOut,
      });
      useEditorStore.getState().selectWordRange([word.id]);
    },
    [applyMarks, containerRef]
  );

  // Paint marks on selectionchange; commit to React only when the mouse is up.
  useEffect(() => {
    const clearEmptySelection = (mode: SelectionSyncMode) => {
      if (clickSelectionRef.current) return;
      clearMarks();
      if (mode === "commit") syncToReact(null);
      else setSelection(null);
    };

    const updateFromNativeSelection = (mode: SelectionSyncMode) => {
      if (freezeSelectionRef.current) return;
      const container = containerRef.current;
      const sel = window.getSelection();

      if (!container || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        clearEmptySelection(mode);
        return;
      }

      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        clearEmptySelection(mode);
        return;
      }

      clickSelectionRef.current = false;
      const els = wordElsInRange(container, range);
      applyMarks(els);
      let info = selectionInfoFromWordEls(els, cutOutIdsRef.current);
      if(info && els.length>1) {
        const state=useEditorStore.getState();
        const first=state.words.findIndex(w=>w.id===Number(els[0].dataset.wid));
        const last=state.words.findIndex(w=>w.id===Number(els[els.length-1].dataset.wid));
        const ids=state.words.slice(first,last+1).filter(w=>state.showDeleted||!cutOutIdsRef.current.has(w.id)).map(w=>w.id);
        info={ids,anyDeleted:ids.some(id=>cutOutIdsRef.current.has(id)),anyKept:ids.some(id=>!cutOutIdsRef.current.has(id))};
      }

      if (mode === "paint") {
        // Hide a stale toolbar while dragging; marks stay imperative.
        setSelection(null);
        return;
      }
      syncToReact(info);
    };

    const onSelectionChange = () => {
      updateFromNativeSelection(mouseDownRef.current ? "paint" : "commit");
    };

    const onMouseDown = (event:MouseEvent) => {
      mouseDownRef.current = true;
      const target=(event.target as HTMLElement|null)?.closest<HTMLElement>('[data-wid]');
      dragStartRef.current=target&&containerRef.current?.contains(target)?Number(target.dataset.wid):null;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!mouseDownRef.current) return;
      mouseDownRef.current = false;
      const anchor=dragStartRef.current;dragStartRef.current=null;
      const endpoint=(e.target as HTMLElement|null)?.closest<HTMLElement>('[data-wid]');
      if(anchor!==null&&endpoint&&containerRef.current?.contains(endpoint)&&Number(endpoint.dataset.wid)!==anchor){
        const state=useEditorStore.getState(),end=Number(endpoint.dataset.wid);
        const a=state.words.findIndex(word=>word.id===anchor),b=state.words.findIndex(word=>word.id===end);
        if(a>=0&&b>=0){
          const ids=state.words.slice(Math.min(a,b),Math.max(a,b)+1).filter(word=>state.showDeleted||!cutOutIdsRef.current.has(word.id)).map(word=>word.id);
          // Browser selection can collapse when scrolling across virtual gaps.
          // The source-word endpoints still define the complete intended range.
          clickSelectionRef.current=true;dragClickRef.current={id:end,until:Date.now()+150};
          window.getSelection()?.removeAllRanges();
          syncToReact({ids,anyDeleted:ids.some(id=>cutOutIdsRef.current.has(id)),anyKept:ids.some(id=>!cutOutIdsRef.current.has(id))});
          return;
        }
      }
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        updateFromNativeSelection("commit");
        return;
      }

      // Collapsed: mouseup on a word is owned by the click handler.
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-wid]")) return;
      if (clickSelectionRef.current) return;
      clearMarks();
      syncToReact(null);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      if (!clickSelectionRef.current) clearMarks();
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [clearMarks, applyMarks, syncToReact, containerRef, freezeSelectionRef]);

  // Clear a click-selection when mousedown lands outside words/toolbar (in-panel only).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!clickSelectionRef.current || freezeSelectionRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target || !scrollRef.current?.contains(target)) return;
      if (target.closest("[data-wid], [data-transcript-toolbar]")) return;
      clearSelection();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clearSelection, scrollRef, freezeSelectionRef]);

  // Mirror a selection made elsewhere (timeline wordbar) into this panel.
  useEffect(() => {
    if (freezeSelectionRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const shown = selection?.ids ?? [];
    if (sameIds(shown, selectedWordIds)) return;

    const selectedSet=new Set(selectedWordIds);
    const els=Array.from(container.querySelectorAll<HTMLElement>("[data-wid]")).filter(el=>selectedSet.has(Number(el.dataset.wid)));
    clearMarks();
    if (els.length === 0) {
      clickSelectionRef.current = false;
      setSelection(null);
      return;
    }
    applyMarks(els);
    clickSelectionRef.current = true;
    setSelection({
      ids: selectedWordIds,
      anyDeleted: selectedWordIds.some((id) => cutOutIds.has(id)),
      anyKept: selectedWordIds.some((id) => !cutOutIds.has(id)),
    });
  }, [
    selectedWordIds,
    renderRevision,
    selection,
    cutOutIds,
    clearMarks,
    applyMarks,
    containerRef,
    freezeSelectionRef,
  ]);

  return {
    selection,
    clearSelection,
    clearMarks,
    handleWordClick,
    releaseToolbar,
  };
}
