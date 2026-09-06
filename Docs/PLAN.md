# Next Update Plan

Pending features only. Completed acceptance records are retained in [Completed-Plan-Items.md](Completed-Plan-Items.md). Keep existing item numbers when removing completed work.

GitHub issues reviewed on 2026-09-06 from [andrey-reynov/rescript](https://github.com/andrey-reynov/rescript/issues). Open issue status is not proof that implementation is missing; entries below retain only pending scope or explicit verification work. Existing items 1–3 remain first; imported issue order does not change release milestones.

## Features

### 1. Retranscribe all from the top menu

**Status:** Implemented and shipped in 1.3.0; retain final full/selected modal, cancellation/error, and conflicting-job acceptance audit.

**Expected behavior:**

- Add **Retranscribe all** to the top meatballs (Project actions) menu, with an appropriate icon and the shared menu styling.
- Open the same modal used for selected-range retranscription, reusing its model and transcription-language dropdowns and regular buttons.
- Display **Full audio** instead of a numeric range such as `1540.17–1557.57 s`. Localize both new labels.
- Allow the user to change the model and language before starting. Opening or cancelling the modal must not start processing or change the transcript.
- On Transcribe, start a fresh transcription/alignment run for the entire original source audio, from zero to its full duration, regardless of the current selection or timeline cuts. Do not resume a checkpoint from the previous model/language run.
- Use the existing job progress and recovery infrastructure. Preserve source media and timeline edits; replace the full transcript only when the new result is ready.
- Disable the action when no source is loaded or a conflicting job prevents retranscription.

**Acceptance criteria:**

- The top menu opens the shared modal with **Full audio**, including when nothing is selected.
- Changing the model/language and confirming processes the full source, including regions outside the current selection and regions excluded by timeline cuts.
- Cancelling leaves the current project unchanged. Errors do not discard the existing transcript or edits.
- Selected-range retranscription retains its numeric range and existing behavior.

**Tracking:** No issue assigned yet.

### 2. Models manager in Settings

**Status:** Implemented; native/runtime checks recorded in [Implementation-Progress.md](Implementation-Progress.md). Retain final installed, Parakeet and interruption acceptance audit.

**Expected behavior:**

- Add a Models section to Settings for downloading and deleting transcription models. Show installed availability, model sizes, download progress, and actionable errors.
- Show the default model storage location and let the user choose a new default location for future downloads.
- Provide an explicit option to relocate already downloaded models to the new default location. Distinguish changing the download destination from moving existing files.
- Keep model loading, the manager, and model-picker availability checks consistent with the configured location; relocated models must remain usable without downloading them again.
- Verify relocated files before removing the old copies. A failed or interrupted relocation must preserve usable models and report what remains to be done.
- Prevent deletion or relocation of model files while an active job is using them. Model removal must not remove project media, transcripts, or edits.

**Acceptance criteria:**

- Downloading a model makes it available in the model selectors; deleting it moves it to Not downloaded.
- Future downloads use the chosen default location, which persists after restarting the app.
- Relocating installed models allows transcription from the new location without a fresh download. Failure leaves a recoverable, clearly reported state.

**Tracking:** No issue assigned yet.

### 5. Silence blocks with separate detectors

**Status:** Implemented; see [Silence-Detection.md](Silence-Detection.md) for behavior and evidence. Retain representative gameplay/music and final installed-build validation.

**Tracking:** [#3 — Add silence blocks](https://github.com/andrey-reynov/rescript/issues/3).

**Expected behavior:**

- Distinguish no-speech regions from amplitude-below-threshold silence. A gap between recognized words is not proof of acoustic silence.
- Detect/display no-speech regions and low-amplitude regions separately. Allow amplitude settings such as an absolute threshold or a configurable fraction of average level; 5–10% is an example from the issue, not a fixed requirement.
- Default legend: yellow for no speech, blue for amplitude silence, green for overlap. Keep the mapping configurable as agreed in the roadmap.
- Let the user choose whether to delete detected regions and adjust the resulting deletion boundaries. Detection alone must not delete content.

**Acceptance criteria:**

- Gameplay/music without speech can be distinguished from low-amplitude silence; overlap is shown in green.
- Detector settings and the legend are understandable, and selecting/deleting/resizing regions preserves original media and extendable handles.

### 6. Merge and split speech blocks

**Status:** Implemented baseline; structure/state tests and initial grouping runtime checks pass. Retain remaining cross-boundary, mixed-speaker, and reopen acceptance audit.

**Tracking:** [#5 — Merge and split speech blocks without losing source timestamps](https://github.com/andrey-reynov/rescript/issues/5). Roadmap: `Roadmap/03-Language-and-Transcript-Model.md`.

**Expected behavior:**

- Follow [Transcript editing workflow](Transcript-Editing-Workflow.md): distinguish phrase grouping, edit clip Split/Join, and optional speaker metadata. Merge compatible adjacent blocks in source order and split at a selected word boundary without conflating these operations.
- Use stable block IDs and preserve every word, word-level source timestamp, and source-media reference.
- Treat speaker as optional metadata. For mixed speakers, ask for an explicit choice or use Unknown; do not silently assign an incorrect speaker.
- Keep block structure separate from editing ranges. Persist changes through autosave and project save/load without retranscribing.
- Coordinate with item 3: choosing a display layout must not perform a structural merge or split.

**Acceptance criteria:**

- Merge/split introduces no missing or duplicated words; Ctrl-click / Go to word still seeks to its original source position; plain click selects without seeking.
- Existing cuts and source handles remain unchanged, mixed speaker labels remain repairable, and reopening preserves block structure.
- Cover merge/split and persistence with focused tests, including mismatched speaker labels. Diarization replacement and NLE finishing remain out of scope.

### 7. Model capability metadata and language compatibility

**Status:** Shared capability profiles and validation implemented. Retain integrated selector/bilingual verification; see [Model-Capabilities.md](Model-Capabilities.md).

**Tracking:** [#6 — Show supported languages beneath each transcription model](https://github.com/andrey-reynov/rescript/issues/6).

**Remaining work:**

- Derive descriptions and language choices from shared, model-specific capability metadata instead of generic backend/English-only checks.
- Distinguish supported spoken languages, automatic detection, and the ability to force a particular language, especially for Parakeet. Do not imply that every multilingual model accepts every explicit language.
- Reuse the same capability information in the Settings model manager (item 2), full-audio retranscription (item 1), and selected-range transcription.

**Acceptance criteria:**

- Model descriptions agree with available language choices and actual backend capabilities. Unsupported explicit choices are rejected before inference/download starts.
- Automatic detection versus forced-language limitations are clear. Descriptions remain localized/readable and preserve the existing grouped model-menu design.

### 8. Russian support and independent language settings: remaining verification

**Status:** Existing UI and transcription language controls are separate and Russian UI exists; verify the remaining end-to-end acceptance criteria rather than reimplementing those controls.

**Tracking:** [#4 — Add Russian language support](https://github.com/andrey-reynov/rescript/issues/4), [#7 — Separate UI language from transcription language and verify Russian UI](https://github.com/andrey-reynov/rescript/issues/7). Issue #4 has no description; use #7 and the agreed source-language requirements to define verification.

**Remaining work / acceptance criteria:**

- Verify English UI with Russian transcription and Russian UI with English transcription; changing either setting must not change the other.
- Verify Russian speech stays Russian instead of being translated to English, with a compatible model.
- Verify Russian localization in the editor, Project Manager, and native menus in a freshly installed build, including preference persistence after restart.
- Verify migration preserves existing project language and UI locale preferences.
- Apply item 7's model-specific Automatic/forced-language limitations consistently; fix only failures uncovered by these checks.

### 11. Waveform context menus

**Status:** Implemented and shipped in 1.3.0; retain zoom/scroll, source-edge, overlapping deletion and menu keyboard runtime audit.

**Expected behavior:**

- Right-click anywhere inside the waveform container opens the app's context menu, replacing the native browser menu there. If no actions have been implemented for that target, show a non-actionable **No actions yet** entry instead of displaying nothing.
- Right-clicking the waveform places the playhead at the clicked source time and opens the menu at the pointer. Use the current timeline zoom and horizontal scroll when converting the pointer position to source time.
- On a deletion area (red stripes), offer **Restore deletion area** (final wording may be shortened). It removes that clicked deletion range and restores its source audio/video to the edit; it does not remove original media or act on a different prior selection.
- On ordinary waveform content, offer **Split** at the clicked playhead position and **Add deletion area**.
- Add deletion area creates an approximately three-second deletion range starting at the clicked source time, clamped to the source end. Make the new range selected and resizable using item 4's deletion-boundary controls.
- Reuse shared menu styling, icons, and real shortcut badges. Preserve disabled-state rules when an implemented action cannot currently run; the empty placeholder is for targets with no implemented actions.
- Opening or dismissing the menu alone must not split, delete, or restore anything. Preserve normal left-click and Alt-click behavior.

**Acceptance criteria:**

- Right-click consistently opens the appropriate app menu throughout the waveform container; unsupported targets show No actions yet.
- At different zoom/scroll positions, right-click places the playhead at the expected source time and Split operates there.
- Right-clicking a red-striped region restores that region when its restore command is chosen.
- Add deletion area creates a bounded, resizable range of about three seconds (shorter near the source end), handles overlaps consistently with existing deletion logic, and supports undo/redo and save/reopen.
- Context menus remain within the viewport, support keyboard navigation/Escape, and close on outside click or action selection.

**Tracking:** No issue assigned yet. Depends on item 4 for deletion-range resizing.

### 13. Clip-based transcript editing and phrase grouping

**Status:** Implemented baseline, with continuous-flow and selection-scope refinements. Selected correction realignment is implemented; see [Selected-Text-Alignment.md](Selected-Text-Alignment.md). The full detailed acceptance audit remains open.

**Detailed specification:** [Transcript-Editing-Workflow.md](Transcript-Editing-Workflow.md). This consolidates the agreed large editing update and refines items 3, 4, 6, 9, 11, and 12 without duplicating their implementation.

**Scope:**

- Default to named edit clips separated by deletions or explicit splits, with Deleted/duration blocks and optional speaker metadata/view.
- Group timeline word blocks into phrases while keeping individual transcript words selectable; separate words, phrases, clips, and editing ranges.
- Synchronize selection across transcript and timeline. Click selects; Shift-click extends an inclusive range from a shared anchor without seeking.
- Support replacement typing, double-click caret correction, Backspace/Delete cutting selected timed ranges, and Enter splitting before the first selected word. Inside caret editing, deletion keys edit characters and Enter commits instead.
- Use Ctrl-click or the Go to word context action to seek without starting playback; no Alt-click requirement for transcript words.
- Remove the default floating Cut / Correct / Speaker toolbar and expose discoverable context actions. Preserve optional speaker data without allowing it to dictate edit cuts.
- Preserve original media/timing provenance, make corrected timing uncertainty explicit, and persist names/grouping/corrections with undo, autosave, and migration support.

**Implementation order:** Clip structure/views → shared selection and phrase grouping → direct editing and timing → caption-foundation validation. Full subtitle production remains later roadmap work.

**Acceptance criteria:** Use the detailed specification's checklist, including boundary changes, partial word cuts, cross-view selection, editing-state shortcuts, and long-video responsiveness.

**Tracking:** Related to [#5](https://github.com/andrey-reynov/rescript/issues/5) and [#2](https://github.com/andrey-reynov/rescript/issues/2); no separate issue assigned yet.

