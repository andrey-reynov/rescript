/**
 * WebAssembly capabilities the media pipeline hard-depends on.
 *
 * Every wasm binary the app ships is built with `-msimd128` — both ffmpeg cores
 * (`@ffmpeg/core-mt` and the single-threaded `@ffmpeg/core`, whose
 * `target_features` sections both list `+simd128`) and onnxruntime, which is
 * only distributed as `ort-wasm-simd-threaded`. So there is no non-SIMD path to
 * fall back to: without it, nothing works.
 */

/**
 * A minimal module declaring one function that returns `v128` (type byte
 * `0x7b`) and splats an `i32` into it. Neither the signature nor the body
 * decodes without SIMD, so validation alone settles the question. Byte-for-byte
 * the module `wasm-feature-detect` probes with.
 */
const SIMD_PROBE = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00,
  0x01, 0x7b, 0x03, 0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00, 0x41, 0x00,
  0xfd, 0x0f, 0xfd, 0x62, 0x0b,
]);

let cached: boolean | null = null;

/**
 * Whether this engine can compile SIMD wasm.
 *
 * Support is a property of the CPU, not just the browser version: V8 turns Wasm
 * SIMD off on x64 unless the hardware reports SSE4.1, which the older
 * Windows-on-ARM x64 emulators do not. So a current Edge on a Snapdragon
 * machine running the x64 build fails here even though the same browser is fine
 * natively.
 *
 * Checked with `validate` rather than `compile` because the "Wasm SIMD
 * unsupported" error comes out of the decoder, which both share — and because
 * `validate` is synchronous, so the UI can gate on it without a loading state.
 */
export function hasWasmSimd(): boolean {
  if (cached !== null) return cached;
  try {
    cached = WebAssembly.validate(SIMD_PROBE);
  } catch {
    // No WebAssembly at all.
    cached = false;
  }
  return cached;
}
