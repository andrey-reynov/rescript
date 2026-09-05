# v0.2 — Language & Transcript Model

Status: planned; audit existing behavior before implementation.

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
