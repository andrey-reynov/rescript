# Local transcription models

Catalog researched 2026-09-05. Model weights are never bundled with the installer. Selecting a model only changes the selection; starting transcription downloads the chosen model if absent. Download sizes are approximate and depend on CPU/GPU precision. Test downloads use an isolated profile.

## MacWhisper comparison

The [developer's product page](https://goodsnooze.gumroad.com/l/macwhisper) lists Tiny English, Tiny, Base, Small, Medium, Large v2/v3, distilled models and Parakeet v2/v3. Its [WhisperKit guide](https://docs.macwhisper.com/article/29-switching-to-a-whisperkit-model) also recommends Turbo. Its [CLI documentation](https://docs.macwhisper.com/article/57-macwhisper-command-line-tool) identifies whisper.cpp, WhisperKit, ParakeetKit and macOS-managed Apple speech engines.

ReScript already used NVIDIA Parakeet TDT 0.6B v3 through parakeet.js, with ysdede's ONNX export. MacWhisper's smaller Core ML/WhisperKit packages are different runtime/quantization variants, not extra model families. Identical family names do not promise identical output, speed, segmentation or word alignment.

## Catalog

| Model | Language | Approx. download | Status |
| --- | --- | --- | --- |
| Whisper Tiny | Multilingual | 120 MB | Experimental |
| Whisper Tiny English | English | 120 MB | Real-audio test passed |
| Whisper Base | Multilingual | 200 MB | Existing; Russian/bilingual tested |
| Whisper Small | Multilingual | 600 MB | Existing |
| Whisper Medium | Multilingual | 800 MB | Bilingual real-audio test passed; CPU only |
| Whisper Large v2 | Multilingual | 1.2 GB | Experimental |
| Whisper Large v3 | Multilingual | 1.6 GB | Experimental; CPU only |
| Whisper Large v3 Turbo | Multilingual | 770 MB | Bilingual real-audio test passed |
| Distil-Whisper Small | English | 540 MB | Experimental |
| Distil-Whisper Large v3 | English | 770 MB | Experimental; CPU only |
| Distil-Whisper Large v3.5 | English | 660 MB | Experimental; additional compatible distilled variant |
| Parakeet TDT 0.6B v2 | English | 0.7–1.3 GB | Experimental |
| Parakeet TDT 0.6B v3 | Multilingual, including Russian | 0.7–1.3 GB | Existing |

English-trained distilled models remain English-only even when their tokenizer supports language tokens. Selecting an English-only model selects English visibly; other explicit languages are disabled and rejected by the worker before weight downloads. Automatic is accepted for English recordings but cannot make these models multilingual. Use Parakeet v3 or multilingual Whisper for Russian/bilingual audio.

## Investigated but not enabled

- Distil-Medium.en and Distil-Large v2: published ONNX generation configurations checked in this pass have no alignment-head metadata. ReScript requires reliable word timestamps for clicking/cutting; do not invent heads or silently substitute sentence timing. These need a verified export or a dedicated alignment integration.
- Apple speech: macOS 26+ OS-managed engine; unavailable on Windows.
- WhisperKit/Core ML/Argmax Pro packaged variants: Apple runtime or separate licensed SDK integration; cannot load their files in the current ONNX worker. Use the corresponding public model family above.
- MacWhisper cloud transcription providers: remote services, not downloadable local models. Adding them would be a separate opt-in online feature.

## Implementation notes

The catalog in lib/models.ts is the single source of model IDs, backend, language limits, precision and UI order. Runtime predicates check actual registered entries; inactive CrisperWhisper entries no longer pass as usable models. Legacy IDs base/small/parakeet are retained for existing projects.

Large encoders avoid fp32 allocations. Older q8-only exports explicitly use CPU rather than trying an unsupported WebGPU quantization. Experimental labels distinguish manifest compatibility from real-audio acceptance. Parakeet v2/v3 have separate loaders, cache lookups and unload targets. English-only Whisper must omit both language and task parameters when its generation config is non-multilingual; multilingual Whisper always requests original-language transcription.

The model menu scrolls independently from the language submenu. Adding catalog entries must not trigger prefetching or include weights in public/models or the installer.

The [manifest snapshot](Model-Manifest-Validation.json) records verified upstream revisions and per-device file sizes. Recheck metadata without downloading weights with `pnpm exec tsx scripts/check-model-catalog.ts`. This is a compatibility check, not an inference benchmark.

## Runtime acceptance

Isolated desktop tests downloaded three model families: Tiny English, Medium and Turbo (Medium was tested with both GPU/fp16 and CPU/int8 encoders). Tiny English transcribed the English fixture with timed words. Turbo produced both English and Russian in the mixed-language fixture, including “Нейронные сети это хорошо.” Medium dropped substantial speech with its GPU/fp16 encoder configuration; retrying the same saved batch with CPU/int8 preserved the full English and Russian text. The shipped catalog therefore forces CPU for Medium and avoids the failing GPU configuration. This isolates a working configuration, not a proven root cause. Word timestamps still need human review, especially around silence; the short fixture is not a long-gameplay accuracy benchmark.

Metadata validation alone does not establish transcription quality for the remaining experimental entries.

UI acceptance: all 13 entries are selectable; the model list scrolls within the desktop window; choosing Parakeet v2 selects and saves English, disables Russian, and creates no Parakeet model cache. Existing project/checkpoint, language, alignment and VAD regression tests pass.

Final smoke check: a fresh explicit-Russian Medium project, without a job-level CPU override, produced “Нейронные сети это хорошо.” using the shipped CPU-only catalog configuration. Windows installer build completed without bundling downloaded weights.
