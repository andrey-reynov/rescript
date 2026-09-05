# v0.2 — Language & Transcript Model

Status: language selection and Russian interface implemented and validated. Speech-block editing, alternate views, and explicit translation mode remain planned.

## Deliver

- Project-level language selector: Auto, Russian, English, and other backend-supported languages. Separate **Transcribe original language** from explicit **Translate** mode; make the translation target/capabilities clear. Default to preserving source language.
- Store requested/detected language, mode, model, and relevant settings with jobs so resume cannot silently mix incompatible outputs. UI localization, including Russian interface strings, is lower priority.
- Make timestamped speech blocks the primary objects, each with a stable ID. Speaker is optional metadata, including Unknown; do not require a speaker assignment to edit.
- Provide continuous-text, speech-block, and speaker-oriented views over the same data.
- Support merge blocks, split block, assign/reassign speaker, set Unknown, and flatten/hide speaker labels without destroying timestamps. Keep label hiding separate from explicit metadata changes.
- Preserve underlying timed spans and internal gaps when merging; define how split/merge handles text and timing. Excessive or inaccurate diarization must be repairable without retranscription.

## Acceptance criteria

- A Russian sample produces Russian text in Transcribe mode with both Auto and explicit Russian settings; English translation occurs only when requested. Save/resume preserves the chosen mode.
- Switching views or hiding speakers does not alter text, source timestamps, or edit decisions.
- On a deliberately mislabelled two-person transcript, users can merge/split speech and reassign/remove speaker metadata; changes survive undo/redo and reopening without timing loss.

## Implementation guidance

Inspect lib/languages.ts, model capabilities, transcription task selection, and the current word-based store before modifying the schema. Existing language choices do not yet include all required options. Use stable block IDs with underlying timed word/span references and optional speaker IDs. Preserve source-time gaps when merging. Define migrations, undo behavior, and how manual corrections survive selective retranscription. Treat views as projections over shared data; never reconstruct timing from speaker grouping.

## Language delivery — 2026-09-05

- New projects default to Automatic; Russian and existing language choices remain selectable independently of interface language. Saved projects retain their previous choice. Whisper explicitly uses `transcribe`, preserving spoken language.
- Automatic predicts the Whisper language token per VAD speech region. The installed transformers.js 4.2.0 defaults an omitted language to English, so omission alone is insufficient. A bounded language-token generation pass runs before transcription, with the existing GPU-to-CPU fallback. Detection examines up to 30 seconds of each region; rapid code-switching inside an uninterrupted region is not guaranteed.
- Whisper words retain detected/requested language metadata. Checkpoint identity includes language, model, explicit transcription task and pipeline version. Language changes invalidate incompatible transcript results while reusing source PCM; restart retains matching checkpoints.
- Parakeet v3 supports Russian and detects language automatically. Its current API does not force a selected language; the selector explains that Whisper is required for that.
- Russian/Automatic do not run an English-only CTC aligner. They retain model timestamps and existing speech-envelope/VAD refinement. Dedicated Russian forced alignment remains future work.
- Russian UI is available in Settings and through Russian system-language detection, including project management, export controls and native menus. Interface switching does not translate source names or transcript contents. Branding is Rescript by Reynov; model names and formats remain unchanged.

### Validation

- Real Whisper Base desktop jobs: Russian-only audio in Automatic and explicit Russian both produced Cyrillic words with timestamps and persisted language settings; an English → pause → Russian recording produced both languages in one project. The short Russian sample contained recognition mistakes; this verifies source-language behavior, not perfect transcription accuracy.
- Reopened the completed Russian project in the rebuilt desktop editor; checked Russian UI, native File menu, waveform and transcript.
- Automated checks cover Russian locale matching, explicit UI preference overrides, catalog/placeholder completeness, branding preservation, progress localization, and Russian checkpoint restart/settings invalidation. Renderer and Electron type checks pass.

Fixtures: Russian sample from [bond005 model documentation](https://huggingface.co/bond005/wav2vec2-large-ru-golos-with-lm/blob/main/README.md), plus the repository example audio. Fixtures and isolated test projects are not shipped. Parakeet capabilities are documented in the [NVIDIA model card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3); the real-audio acceptance run used Whisper Base.

Expanded local model choices, MacWhisper comparison, and runtime acceptance results are documented in [Transcription Models](../Transcription-Models.md).
