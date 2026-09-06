# Transcription language capabilities

`lib/model-capabilities.ts` is the shared source for spoken languages, selection mode, and localized descriptions. Every registered model references a profile; selectors and native/worker validation use it.

- Multilingual Whisper: Automatic or an explicitly selected language. Only codes supported by the installed tokenizer/backend are accepted. The UI currently offers its existing subset of languages.
- English Whisper/Distil and Parakeet v2: English only. Automatic means the fixed English configuration, not language detection; label it English (fixed).
- Parakeet v3: recognizes 25 European languages, including Russian, but the current decoder cannot be forced to a chosen language. Offer Automatic and disable explicit choices. Do not describe a Russian selection as forcing Russian when it would be ignored.

The [NVIDIA v3 model card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3) is authoritative for its 25-language list; the installed parakeet.js registry incorrectly includes Japanese, Korean and Chinese. Its `fromHub`/`transcribe` path has no language forcing option. [NVIDIA v2](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2) is English only. Whisper codes come from the installed Transformers.js `common_whisper.js`.

Switching models preserves compatible preferences, otherwise selects Automatic or fixed English. Existing projects retain their saved preference; incompatible legacy choices are shown as errors until corrected, rather than silently reinterpreted during a job. No UI-locale setting is changed. Invalid requests fail before native project access/preparation or worker model download.

Tests: `model-capabilities-test.ts`, `models-test.ts`; fresh/range transcription share the same validator. The Settings model manager must reuse these profiles.
