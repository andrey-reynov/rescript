"use client";

import { useCallback, useEffect, useRef } from "react";
import { en } from "@/lib/i18n/messages/en";
import { isModelId } from "@/lib/models";
import { reportError } from "@/lib/diagnostics";
import { useEditorStore } from "@/lib/store";

import type { WorkerResponse } from "@/lib/types";

let activeWorker: Worker | null = null;

/** Stop an in-flight ASR job (e.g. after importing a transcript). */
export function cancelTranscription() {
  if(typeof window!=='undefined'&&window.rescriptDesktop?.jobs) {
    const id=useEditorStore.getState().projectId;
    if(id)void window.rescriptDesktop.jobs.pause(id).catch(()=>{});
  }
  activeWorker?.terminate();
  activeWorker = null;
}

/** Owns the transcription web worker and pipes its messages into the store. */
export function useTranscriber() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      activeWorker?.terminate();
      activeWorker = null;
      workerRef.current = null;
    };
  }, []);

  const transcribe = useCallback((audio: Float32Array, duration: number) => {
    const store = useEditorStore.getState();
    if (!isModelId(store.source)) {
      store.setError(en["error.selectModel"]);
      return;
    }
    const model = store.source;
    const transcriptLanguage = store.transcriptLanguage;
    store.setStatus("transcribing");
    store.setProgress({ message: en["progress.loadingSpeechModel"], value: null });

    // Always start a fresh worker so a prior cancel can't leave us without one.
    cancelTranscription();
    workerRef.current = new Worker(
      new URL("../workers/transcription.worker.ts", import.meta.url),
      { type: "module" }
    );
    activeWorker = workerRef.current;
    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const s = useEditorStore.getState();
      // An imported transcript sets skipTranscription; ignore late ASR results.
      if (s.skipTranscription) return;
      const msg = event.data;
      switch (msg.type) {
        case "progress":
          s.setProgress({ message: msg.message, value: msg.value });
          break;
        case "partial":
          s.setPartialText(msg.text);
          break;
        case "complete":
          s.setWords(msg.words);
          s.setStatus("ready");
          s.setPartialText("");
          break;
        case "error":
          s.setError(msg.message);
          // Retried network failures already have a user-facing message.
          if (msg.cause !== "network") {
            // Worker errors cross a postMessage boundary, so the original stack
            // is already gone here; keep the message in local diagnostics.
            reportError(new Error(msg.message), "transcription");
          }
          break;
      }
    };
    workerRef.current.onerror = (err) => {
      const s = useEditorStore.getState();
      if (s.skipTranscription) return;
      s.setError(err.message || en["error.workerCrashed"]);
      reportError(
        new Error(err.message || en["error.workerCrashed"]),
        "transcription-worker"
      );
    };

    // Transfer, not copy: the worker takes ownership of the PCM and `audio` is
    // detached here. Nothing on the main thread reads it afterwards — the
    // waveform draws from the envelope the store built in setAudio — and on a
    // long recording the copy this replaces was hundreds of megabytes held for
    // the length of the run.
    workerRef.current.postMessage(
      { audio, duration, model, language: transcriptLanguage },
      [audio.buffer]
    );
  }, []);

  return { transcribe, cancel: cancelTranscription };
}
