"use client";

import { useSyncExternalStore } from "react";
import { hasWasmSimd } from "@/lib/wasmFeatures";

/**
 * `"no-isolation"` — no SharedArrayBuffer, so the multi-threaded cores can't
 * start. `"no-simd"` — the engine can't compile SIMD wasm, so no core can be
 * compiled at all. Both are dead ends, but they need different advice.
 */
export type MediaEngineSupport = "checking" | "ready" | "no-isolation" | "no-simd";

function detect(): Exclude<MediaEngineSupport, "checking"> {
  if (!self.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
    return "no-isolation";
  }
  if (!hasWasmSimd()) return "no-simd";
  return "ready";
}

// Module-level store: support is a property of the page and the machine, not of
// any component, and it only ever moves from "checking" to a settled value once.
let state: MediaEngineSupport = "checking";
const listeners = new Set<() => void>();
let watching = false;

function emit(next: MediaEngineSupport) {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!watching) {
    watching = true;
    // Isolation is decided by the response headers of the document itself and
    // SIMD by the engine, so both are already settled by the time any component
    // mounts — there is nothing to poll for or wait on.
    emit(detect());
  }
  return () => listeners.delete(listener);
}

/**
 * Reports whether this browser can run the media pipeline at all.
 *
 * ffmpeg.wasm and onnxruntime both need SharedArrayBuffer for threading, and
 * every wasm binary the app ships is a SIMD build (see `lib/wasmFeatures.ts`).
 *
 * Isolation comes from real COOP/COEP headers on every target: vercel.json for
 * the web app, the app:// protocol handler for Electron, and next.config.ts
 * headers() for `next dev`. So a settled value other than "ready" means the
 * browser or the CPU genuinely can't do it, not that we're still setting up —
 * the UI can say so immediately instead of showing a spinner.
 */
export function useMediaEngineSupport(): MediaEngineSupport {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => "checking" as MediaEngineSupport
  );
}
