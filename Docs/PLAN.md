# Next Update Plan

Pending features only. Remove completed items as they ship.

GitHub issues reviewed on 2026-09-06 from [andrey-reynov/rescript](https://github.com/andrey-reynov/rescript/issues). Open issue status is not proof that implementation is missing; entries below retain only pending scope or explicit verification work. Existing items 1–3 remain first; imported issue order does not change release milestones.

## Features

### 1. Retranscribe all from the top menu

**Status:** Planned; not implemented.

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

### 3. Transcript visibility and Import menu

**Status:** Planned; not implemented.

**Expected behavior:**

- Consolidate the transcript panel's current eye/visibility control and Import action into one meatballs menu at the far right of that panel's header.
- Use the shared Settings-style icon button and action-menu visuals from UI-Rules.md. Organize the menu with labeled groups and dividers: **Visibility**, **Text layout**, and **Import**.
- Under Visibility, provide **Hide deleted words** as one checkmark toggle: checked means deleted words are hidden; unchecked means they are shown. Clicking the same item toggles the state; this is independent of the chosen text layout.
- Under Text layout, offer three mutually exclusive choices, with exactly one selected:
  - **By clip** (default): retained sections bounded by deletions or explicit splits, with compact Deleted/duration rows.
  - **By speaker:** optional attribution view; speaker changes do not create timeline cuts.
  - **Continuous text:** one text flow without clip or speaker headings.
- See [Transcript editing workflow](Transcript-Editing-Workflow.md) for clip/deletion behavior and synchronized selection. Hide deleted words keeps compact Deleted/duration rows in By clip view.
- Keep Import in its own group and preserve the existing import workflow.
- View changes affect presentation only: retain source timestamps, speaker metadata, deletion ranges, edits, and word-to-video seeking. Do not merge transcript data destructively when displaying a single block.
- Show checked/radio states clearly, support keyboard interaction, and localize labels. Include action icons and existing shortcuts where applicable.

**Acceptance criteria:**

- The far-right meatballs replaces the standalone eye and Import controls and exposes visibly separated groups.
- Hide deleted words toggles on/off in every text layout without changing the underlying edits.
- Selecting one text layout deselects the others. Clip boundaries follow deletion areas and explicit splits, while continuous display does not destroy speaker or timing information.
- Switching views preserves working word seeking and the Import action continues to open its existing flow.

**Tracking:** No issue assigned yet.

### 4. Resize deletion regions

**Status:** Planned; GitHub issue open.

**Tracking:** [#2 — Make it possible to change the length of the deletion region](https://github.com/andrey-reynov/rescript/issues/2).

**Expected behavior:**

- Make deletion boundaries easy to adjust directly from a selected deletion region.
- Use either dedicated deletion-region handles or reveal the full-size handles of the neighboring speech regions when the deletion region is selected. The latter is the simpler option identified in the issue.
- Preserve source handles, timestamps, and synchronization while changing only editing ranges.

**Acceptance criteria:**

- Selecting a deletion region exposes clear, usable controls for its start/end instead of requiring tiny inactive neighboring grabbers.
- Resizing updates the deletion range and adjacent retained ranges consistently, including source-edge cases; undo/redo and save/reopen preserve the result.

### 5. Silence blocks with separate detectors

**Status:** Planned; GitHub issue open.

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

**Status:** Planned; GitHub issue open.

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

### 9. Hide offscreen word-selection toolbar

**Status:** Planned for any retained legacy toolbar. Item 13 removes this toolbar from the default By clip view; do not rebuild it there.

**Related specification:** [Transcript editing workflow](Transcript-Editing-Workflow.md).

**Observed bug:** Selecting a transcript word opens the Cut / Correct / Speaker toolbar. After scrolling the selected text out of view, the toolbar remains visible above other content.

**Expected behavior:**

- Keep the toolbar anchored to the visible word selection within the transcript scroll viewport.
- Hide it when its selection anchor leaves that viewport; scrolling alone must not clear the selection or change the transcript.
- Show it again when the selected anchor returns to view, provided the selection is still active.
- Investigate positioning, portal placement, scroll-container clipping, and visibility tracking as well as z-index. A z-index issue is a hypothesis, not a confirmed cause; lowering z-index alone must not leave a detached toolbar visible or interactive.

**Acceptance criteria:**

- Select a word and scroll it above or below the transcript viewport: the toolbar disappears and cannot intercept clicks while hidden.
- Scroll back: the toolbar returns at the selection, with Cut, Correct, and Speaker working normally.
- Check both viewport edges, resizing, and multi-word selections. The toolbar must not float over the transcript header, timeline, or unrelated panels when its anchor is offscreen.

**Tracking:** No issue assigned yet.

### 10. Project Manager buttons and revision modal

**Status:** Planned; not implemented.

**Expected behavior:**

- Restyle the Project Manager's **Open project…** button using the shared **Accent** button variant from UI-Rules.md.
- Add consistent hover and pressed/click feedback to the folder and revision buttons on project cards, using the shared icon-button styling. Preserve their existing actions and prevent their clicks from also opening the project card.
- In the revision modal, add an accessible **X** close button in the top-right corner using the shared icon-button style.
- Remove the bottom **Cancel** button; retain the existing non-destructive dismissal behavior through the new X button.
- Keep the modal title, close button, and description stationary. Restrict scrolling to the revision list itself, with a height bounded by the available viewport.

**Acceptance criteria:**

- Open project… matches the Accent style and retains its existing opening behavior.
- Folder and revision buttons visibly respond to hover and press, remain keyboard accessible, and trigger only their own actions.
- The revision modal closes from the top-right X without selecting or restoring a revision; no bottom Cancel button remains.
- With many revisions or a short window, only the list scrolls. The title, description, and X remain visible and usable.
- Revision selection/restoration continues to work; verify light/dark styling and visible keyboard focus.

**Tracking:** No issue assigned yet.

### 11. Waveform context menus

**Status:** Planned; not implemented.

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

### 12. Skip deletion areas playback toggle

**Status:** Planned; not implemented.

**Expected behavior:**

- Add **Skip deletion areas** to the timeline meatballs menu as a single checkmark toggle.
- Checked: playback skips deletion areas. Unchecked: playback includes those areas, allowing the user to hear deleted source content.
- Toggling affects preview playback only. Preserve deletion ranges, transcript data, and export cuts.
- Reflect the actual playback setting with a visible checkmark when on and no checkmark when off, plus an accessible checked state. Use the same checkmark convention for item 3's Hide deleted words toggle; keep the two settings independent.

**Acceptance criteria:**

- Clicking the same menu item switches between skipping and playing deleted regions, and the checkmark immediately matches playback behavior.
- Hide deleted words independently uses checked = hidden and unchecked = visible. Neither toggle changes the other or destroys edits.

**Tracking:** No issue assigned yet.

### 13. Clip-based transcript editing and phrase grouping

**Status:** Planned; not implemented.

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

