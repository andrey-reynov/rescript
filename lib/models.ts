import {WHISPER_CAPABILITIES,WHISPER_V3_CAPABILITIES,ENGLISH_CAPABILITIES,PARAKEET_V3_CAPABILITIES,acceptsLanguage,type ModelCapabilities} from './model-capabilities';
/** Local speech models offered on the upload screen. */
export type WhisperModel =
  | "base"
  | "small"
  | "tiny"
  | "tinyEn"
  | "medium"
  | "largeV2"
  | "largeV3"
  | "turbo"
  | "distilSmall"
  | "distilLargeV3"
  | "distilLargeV35"
  /** CrisperWhisper 2.0 Small, exported by tools/crisperwhisper-onnx. */
  // | "crisperSmall"
  /** CrisperWhisper 2.0 Turbo, published ONNX export. */
  // | "crisperTurbo";
/** NVIDIA Parakeet TDT 0.6B v2/v3 via parakeet.js (ONNX / WebGPU). */
export type ParakeetModel = "parakeet" | "parakeetV2";
export type ModelId = WhisperModel | ParakeetModel;

type DType = "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4" | "q4f16" | "bnb4";

/** Shared UI fields for every local speech backend. */
type ModelDisplay = {
  capabilities:ModelCapabilities;
  /** English-trained models cannot recognize Russian even if tokenizer is multilingual. */
  englishOnly?: boolean;
  /** Offered for opt-in testing; not yet covered by real-audio acceptance. */
  experimental?: boolean;
  label: string;
  description: string;
  /** Approximate download size shown in the UI. */
  size: string;
};

export type WhisperModelInfo = ModelDisplay & {
  backend: "whisper";
  /** Some older q8 exports only have a practical CPU configuration. */
  cpuOnly?: boolean;
  /** Hugging Face model id (ONNX export compatible with transformers.js). */
  id: string;
  /** dtype configuration per device. */
  dtype: {
    webgpu: Record<string, DType>;
    wasm: Record<string, DType>;
  };
  /**
   * A CrisperWhisper checkpoint, whose vocabulary extends past Whisper's
   * timestamp block: `[UM]`, `[UH]`, vocal events and the prompt scaffolding all
   * sit above it.
   *
   * These models only work at all because of
   * patches/@huggingface+transformers+4.2.0.patch, which bounds the timestamp
   * range at both ends. Unpatched, transformers.js reads every token above the
   * block as a timestamp: word-timestamp collation crashes on the first `[UM]`,
   * and the logits processor suppresses all text after the first `[UH]`, cutting
   * the transcript off mid-sentence with no error. See patches/README.md.
   *
   * The flag itself drives `markCrisperPromptTokensSpecial`, keeping the mode
   * tags out of transcript text even though we never send them — see the note on
   * decoder-prefix conditioning above {@link MODELS}.
   */
  crisper?: boolean;
  /**
   * Load from `public/models/<id>/` instead of the Hub. Used for exports that
   * have not been published yet — see tools/crisperwhisper-onnx.
   */
  local?: boolean;
};

export type ParakeetModelInfo = ModelDisplay & {
  backend: "parakeet";
  /** parakeet.js model key (also the weightlift registry id). */
  id: string;
  /** Hugging Face repo used by parakeet.js hub downloads / IndexedDB cache keys. */
  repoId: string;
};

export type ModelInfo = WhisperModelInfo | ParakeetModelInfo;

/** Display order for model rows in the source dropdown. */
export const MODEL_ORDER: ModelId[] = [
  "tiny", "tinyEn",
  "base",
  "small",
  "medium", "largeV2", "largeV3", "turbo",
  "distilSmall", "distilLargeV3", "distilLargeV35", "parakeetV2",
  "parakeet",
  // "crisperSmall",
  // "crisperTurbo",
];

const MEDIUM_DTYPE = {webgpu:{encoder_model:"int8",decoder_model_merged:"q4"},wasm:{encoder_model:"int8",decoder_model_merged:"q4"}} satisfies WhisperModelInfo["dtype"];
const LARGE_DTYPE = {webgpu:{encoder_model:"q4",decoder_model_merged:"q4"},wasm:{encoder_model:"q4",decoder_model_merged:"q4"}} satisfies WhisperModelInfo["dtype"];
const TURBO_DTYPE = {webgpu:{encoder_model:"q4",decoder_model_merged:"fp16"},wasm:{encoder_model:"q4",decoder_model_merged:"fp16"}} satisfies WhisperModelInfo["dtype"];
const DISTIL_DTYPE = {webgpu:{encoder_model:"q4",decoder_model_merged:"fp16"},wasm:{encoder_model:"q4",decoder_model_merged:"fp16"}} satisfies WhisperModelInfo["dtype"];
const CPU_DTYPE = {webgpu:{encoder_model:"q8",decoder_model_merged:"q8"},wasm:{encoder_model:"q8",decoder_model_merged:"q8"}} satisfies WhisperModelInfo["dtype"];
const WHISPER_DTYPE = {
  // q4 decoder: q8 fails session creation on onnxruntime-web 1.26
  // (Missing required scale … MatMulNBits).
  webgpu: { encoder_model: "fp32", decoder_model_merged: "q4" },
  wasm: { encoder_model: "fp32", decoder_model_merged: "q4" },
} satisfies WhisperModelInfo["dtype"];

/** Medium uses CPU/int8: WebGPU/fp16 dropped speech in the bilingual acceptance test. */

/**
 * The local Small export ships only q4 for the merged decoder: int8 cannot
 * reach weights inside the decoder's control-flow subgraphs, so
 * `quantize_dynamic` silently emits an un-quantised file and the export tooling
 * refuses it (see tools/crisperwhisper-onnx/README.md). This q4 pair is the
 * combination verified end-to-end — encoder and decoder loaded in onnxruntime,
 * cross-attentions returned at the right shape.
 */
// const CRISPER_SMALL_DTYPE = {
//   webgpu: { encoder_model: "q4", decoder_model_merged: "q4" },
//   wasm: { encoder_model: "q4", decoder_model_merged: "q4" },
// } satisfies WhisperModelInfo["dtype"];

/**
 * Turbo takes fp16 for the decoder rather than q4.
 *
 * Turbo collapsed after the first VAD segment on q4/q4. Bisecting against the
 * fp32 checkpoint cleared everything else: fp32 transcribes the clip in full,
 * and the q4 encoder is faithful — swapping it in under an fp32 decoder gives a
 * byte-identical transcript (cosine 0.93 against fp32 hidden states, but no
 * effect on output). That leaves the merged decoder as the only component not
 * exonerated, so it gets the precision.
 *
 * It is also cheaper: fp16 is 477 MB against q4's 600 MB, because q4 leaves the
 * embedding and lm_head — most of a 4-layer decoder's weight — unquantised.
 * fp32 would be better still but ships as a 953 MB external-data sidecar, which
 * transformers.js only fetches when `use_external_data_format` is declared, and
 * this repo's config.json does not declare it.
 */
// const CRISPER_TURBO_DTYPE = {
//   webgpu: { encoder_model: "q4", decoder_model_merged: "fp16" },
//   wasm: { encoder_model: "q4", decoder_model_merged: "fp16" },
// } satisfies WhisperModelInfo["dtype"];

/**
 * No model conditions the decoder on a prefix, and that is a measured decision
 * rather than an omission. Two mechanisms were tried and both were removed:
 *
 * **Whisper's `<|startofprev|>` filler prompt** (a short filler list — "Um, uh,
 * hmm, er, ah." — forced via `decoder_input_ids` to give "Remove fillers"
 * something to act on). Measured on an 11.5 s clip, decoding each VAD segment
 * the way the worker does, Whisper Small:
 *
 * | slice       | plain                     | + prompt                 |
 * |-------------|---------------------------|--------------------------|
 * | full 11.5 s | complete, includes "uh"   | "Nice. How does it, uh," |
 * | 2.5–5.0 s   | "Nice. How does it work?" | "Nice. How does it"      |
 * | 5.0–11.5 s  | complete sentence         | **"Um,"**                |
 *
 * The long tail segment collapses into an echo of the prompt. Medium is worse
 * (the whole clip truncates to "Nice. How does it, uh…"), Base only marginally
 * more robust. A length cap was tried first and does not help — a 20-character
 * prompt still triggers it.
 *
 * **CrisperWhisper's `[verbatim_N]` mode prefix** (its trained-in verbatim
 * selector, from `crisperwhisper==2.0.1`, `crisperwhisper/prompt.py`). Same
 * failure, same cause — the worker decodes short VAD segments, and prefix
 * conditioning collapses them. Measured against the fp32 checkpoints:
 *
 * | slice       | plain                       | + [verbatim_1..5]      |
 * |-------------|-----------------------------|------------------------|
 * | full 11.5 s | complete, includes "[UH]"   | Turbo drops "Nice."    |
 * | 2.5–5.0 s   | "Nice. How does it work?"   | "Nice. How does it-"   |
 *
 * On Small the prefix also emitted `[breath]` where the speaker hesitated while
 * plain decoding kept it as "uh".
 *
 * If either is ever re-attempted: do **not** copy upstream's `<|notimestamps|>`
 * along with the mode tags. Upstream can suppress timestamps because it derives
 * word timings itself via Viterbi over the space token's cross-attention;
 * transformers.js instead splits chunked audio *on* timestamp tokens, so
 * suppressing them accumulates one unsegmented run whose stride-overlap merge
 * can resolve to nothing — surfacing mid-transcription as "token_ids must be a
 * non-empty array of integers".
 *
 * Nothing is lost either way: every checkpoint emits its fillers unprompted
 * ("uh" on stock Whisper, `[UH]` on CrisperWhisper), and whatever a model does
 * swallow is still recovered as a timed `...` placeholder by
 * `insertDisfluencyPlaceholders`, so it stays cuttable.
 *
 * Local speech models that can run in the transcription worker.
 * Shared display fields live on every entry; backend-specific knobs
 * (`dtype` / `crisper` vs `repoId`) are gated by `backend`.
 */
export const MODELS: {[K in ModelId]: K extends ParakeetModel ? ParakeetModelInfo : WhisperModelInfo} = {
tiny: {capabilities:WHISPER_CAPABILITIES,backend:"whisper",id:"onnx-community/whisper-tiny_timestamped",label:"Whisper Tiny",size:"~120 MB",description:"Multilingual. Downloaded when transcription starts.",dtype:WHISPER_DTYPE,englishOnly:false,cpuOnly:false,experimental:true},
tinyEn: {capabilities:ENGLISH_CAPABILITIES,backend:"whisper",id:"onnx-community/whisper-tiny.en_timestamped",label:"Whisper Tiny (English)",size:"~120 MB",description:"English only. Downloaded when transcription starts.",dtype:WHISPER_DTYPE,englishOnly:true,cpuOnly:false,experimental:false},
medium: {capabilities:WHISPER_CAPABILITIES,backend:"whisper",id:"onnx-community/whisper-medium_timestamped",label:"Whisper Medium",size:"~800 MB",description:"Multilingual. Downloaded when transcription starts.",dtype:MEDIUM_DTYPE,englishOnly:false,cpuOnly:true,experimental:false},
largeV2: {capabilities:WHISPER_CAPABILITIES,backend:"whisper",id:"onnx-community/whisper-large-v2-ONNX",label:"Whisper Large v2",size:"~1.2 GB",description:"Multilingual. Downloaded when transcription starts.",dtype:LARGE_DTYPE,englishOnly:false,cpuOnly:false,experimental:true},
largeV3: {capabilities:WHISPER_V3_CAPABILITIES,backend:"whisper",id:"Xenova/whisper-large-v3",label:"Whisper Large v3",size:"~1.6 GB",description:"Multilingual. Downloaded when transcription starts.",dtype:CPU_DTYPE,englishOnly:false,cpuOnly:true,experimental:true},
turbo: {capabilities:WHISPER_V3_CAPABILITIES,backend:"whisper",id:"onnx-community/whisper-large-v3-turbo_timestamped",label:"Whisper Large v3 Turbo",size:"~770 MB",description:"Multilingual. Downloaded when transcription starts.",dtype:TURBO_DTYPE,englishOnly:false,cpuOnly:false,experimental:false},
distilSmall: {capabilities:ENGLISH_CAPABILITIES,backend:"whisper",id:"onnx-community/distil-small.en",label:"Distil-Whisper Small (English)",size:"~540 MB",description:"English only. Downloaded when transcription starts.",dtype:WHISPER_DTYPE,englishOnly:true,cpuOnly:false,experimental:true},
distilLargeV3: {capabilities:ENGLISH_CAPABILITIES,backend:"whisper",id:"distil-whisper/distil-large-v3",label:"Distil-Whisper Large v3 (English)",size:"~770 MB",description:"English only. Downloaded when transcription starts.",dtype:CPU_DTYPE,englishOnly:true,cpuOnly:true,experimental:true},
distilLargeV35: {capabilities:ENGLISH_CAPABILITIES,backend:"whisper",id:"onnx-community/distil-large-v3.5-ONNX",label:"Distil-Whisper Large v3.5 (English)",size:"~660 MB",description:"English only. Downloaded when transcription starts.",dtype:DISTIL_DTYPE,englishOnly:true,cpuOnly:false,experimental:true},
  parakeetV2: {capabilities:ENGLISH_CAPABILITIES,backend:"parakeet",id:"parakeet-tdt-0.6b-v2",repoId:"ysdede/parakeet-tdt-0.6b-v2-onnx",label:"Parakeet v2 (English)",size:"~0.7–1.3 GB",description:"English only. Use v3 for Russian or bilingual recordings.",englishOnly:true,experimental:true},
  base: {capabilities:WHISPER_CAPABILITIES,
    backend: "whisper",
    id: "onnx-community/whisper-base_timestamped",
    label: "Whisper Base",
    description: "Faster download and transcription. Good for most clips.",
    size: "~200 MB",
    dtype: WHISPER_DTYPE,
  },
  small: {capabilities:WHISPER_CAPABILITIES,
    backend: "whisper",
    id: "onnx-community/whisper-small_timestamped",
    label: "Whisper Small",
    description: "More accurate on longer or noisier audio. Larger download.",
    size: "~600 MB",
    dtype: WHISPER_DTYPE,
  },
  parakeet: {capabilities:PARAKEET_V3_CAPABILITIES,
    backend: "parakeet",
    id: "parakeet-tdt-0.6b-v3",
    repoId: "ysdede/parakeet-tdt-0.6b-v3-onnx",
    label: "Parakeet v3",
    description:
      "NVIDIA FastConformer — faster on WebGPU, strong EU-language accuracy. Auto-detects language.",
    // WASM int8 encoder + fp16 decoder ~690 MB; WebGPU fp16 + fp32 ~1.3 GB.
    size: "~1.3 GB",
  },
  // crisperSmall: {
  //   backend: "whisper",
  //   // Local folder under public/models — not published yet. Install with
  //   // `python tools/crisperwhisper-onnx/install_local.py`.
  //   id: "crisperwhisper-2.0-small-onnx",
  //   local: true,
  //   label: "CrisperWhisper Small (local)",
  //   description:
  //     "Verbatim: transcribes fillers as [UM] / [UH] instead of dropping them. Self-exported, unpublished. Non-commercial licence.",
  //   // q4 encoder 66 MB + q4 merged decoder 258 MB.
  //   size: "~324 MB",
  //   dtype: CRISPER_SMALL_DTYPE,
  //   crisper: true,
  // },
  // crisperTurbo: {
  //   backend: "whisper",
  //   id: "Masterx/CrisperWhisper2.0-turbo-ONNX",
  //   label: "CrisperWhisper Turbo",
  //   description:
  //     "Keeps fillers, on a large-v3 encoder. The largest download. Non-commercial licence.",
  //   // q4 encoder 425 MB + fp16 merged decoder 477 MB.
  //   size: "~900 MB",
  //   dtype: CRISPER_TURBO_DTYPE,
  //   crisper: true,
  // },
};

/**
 * Whether `model` is a CrisperWhisper checkpoint, and so needs the tokenizer
 * repair in {@link WhisperModelInfo.crisper}.
 */
export function isCrisperModel(model: ModelId): boolean {
  const info = MODELS[model];
  return info.backend === "whisper" && info.crisper === true;
}

/** Whether `model` loads from public/models rather than the Hub. */
export function isLocalModel(model: ModelId): boolean {
  const info = MODELS[model];
  return info.backend === "whisper" && info.local === true;
}

export function isWhisperModel(value: unknown): value is WhisperModel {
 return isModelId(value)&&MODELS[value].backend==='whisper';
}
export function isParakeetModel(value: unknown): value is ParakeetModel {
 return isModelId(value)&&MODELS[value].backend==='parakeet';
}
/** Reject incompatible explicit languages before downloading any weights. */
export function modelSupportsLanguage(model:ModelId,language:string):boolean {
 return acceptsLanguage(MODELS[model].capabilities,language);
}
/** Whether `value` is a key of {@link MODELS}. */
export function isModelId(value: unknown): value is ModelId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MODELS, value);
}

const MODEL_STORAGE_KEY = "rescript.model";

/** Read the last-selected speech model from localStorage (defaults to base). */
export function loadModelPreference(): ModelId {
  if (!browserStorage()) return "base";
  try {
    const raw = browserStorage()?.getItem(MODEL_STORAGE_KEY);
    if (isModelId(raw)) return raw;
  } catch {
    // private mode / disabled storage
  }
  return "base";
}

/** Persist the selected speech model for the next visit. */
export function saveModelPreference(model: ModelId) {
  if (!browserStorage()) return;
  try {
    browserStorage()?.setItem(MODEL_STORAGE_KEY, model);
  } catch {
    // private mode / disabled storage
  }
}

/** Validate a requested inference configuration before any job or download begins. */
export function assertModelLanguage(model:unknown,language:unknown):asserts model is ModelId {
 if(!isModelId(model))throw Error('Select a valid transcription model.');
 if(typeof language!=='string'||!modelSupportsLanguage(model,language)){
  if(MODELS[model].capabilities.languageSelection==='automatic')throw Error('This model detects language automatically. Choose Automatic.');
  throw Error('This model does not support the selected transcription language.');
 }
}

function browserStorage(){try{return (globalThis as {localStorage?:{getItem(key:string):string|null;setItem(key:string,value:string):void}}).localStorage;}catch{return undefined;}}
