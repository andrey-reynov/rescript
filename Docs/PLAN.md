# Next Update Plan

Pending features only. Completed acceptance records are retained in [Completed-Plan-Items.md](Completed-Plan-Items.md). Keep existing item numbers when removing completed work.

GitHub issues reviewed on 2026-09-06 from [andrey-reynov/rescript](https://github.com/andrey-reynov/rescript/issues). Open issue status is not proof that implementation is missing; entries below retain only pending scope or explicit verification work. Existing items 1–3 remain first; imported issue order does not change release milestones.

## Features

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

### 8. Russian support and independent language settings: remaining verification

**Status:** Existing UI and transcription language controls are separate and Russian UI exists; verify the remaining end-to-end acceptance criteria rather than reimplementing those controls.

**Tracking:** [#4 — Add Russian language support](https://github.com/andrey-reynov/rescript/issues/4), [#7 — Separate UI language from transcription language and verify Russian UI](https://github.com/andrey-reynov/rescript/issues/7). Issue #4 has no description; use #7 and the agreed source-language requirements to define verification.

**Remaining work / acceptance criteria:**

- Verify English UI with Russian transcription and Russian UI with English transcription; changing either setting must not change the other.
- Verify Russian speech stays Russian instead of being translated to English, with a compatible model.
- Verify Russian localization in the editor, Project Manager, and native menus in a freshly installed build, including preference persistence after restart.
- Verify migration preserves existing project language and UI locale preferences.
- Apply item 7's model-specific Automatic/forced-language limitations consistently; fix only failures uncovered by these checks.

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

