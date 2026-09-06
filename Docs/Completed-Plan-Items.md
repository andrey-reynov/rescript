# Completed plan items

Acceptance records for requirements removed from the pending plan. Completion applies only to the listed scope.

## Item 10 — Project Manager buttons and revision modal

Verified 2026-09-06 in an isolated production-built Electron app. Components: `ProjectLibrary.tsx`, `RevisionDialog.tsx`, `UploadScreen.tsx`, and shared `Button.tsx`.

- Open project uses the shared Accent button. Activating it called the native project picker; selecting the fixture `.rescript` file opened the expected transcript. The picker selection was supplied by the test adapter; normal project reading/opening was unchanged.
- Folder and revision buttons use the shared icon style. Both showed the hover background and 0.95 pressed scale. Both activated from the keyboard. Folder reveal received the correct project path and neither icon opened the project card. The test adapter captured folder reveal instead of opening Explorer.
- The revision dialog has an accessible top-right X, no bottom Cancel, initial focus on X, Tab/Shift-Tab containment, visible keyboard focus, Escape dismissal, and focus return to the triggering card button. Closing without choosing a revision preserved current project data.
- At a 900×500 viewport with 20 revisions, the list had 804px of content within a 272px scroll area. Scrolling kept title, description and X at exactly the same coordinates. Light and dark screenshots were inspected after transitions settled.
- Choosing the prepared previous revision opened its expected text. The native recovery backup retained the prior current text. The fixture's original data was restored after the test.
- Simulating a snapshot disappearing after opening the list showed a localized error inside the dialog, preserved current project data, and left close/retry controls available. Focus recovered after the failed restore, and Escape closed the dialog. The snapshot fixture was restored in a finally block.
- Renderer type checks, localization tests, production build, and changed-component lint pass (the pre-existing ProjectLibrary thumbnail warning remains).

### Original requirements

**Status:** Complete; verified above.

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


## Item 12 — Skip deletion areas playback toggle

Verified 2026-09-06 with actual media playback in the isolated production-built Electron app. Original fixture data was restored afterward.

- The timeline menu exposed one checkbox item. Checked state was `true`, unchecked state `false`, and toggling the same item updated it immediately.
- With a test deletion spanning source 1–4 seconds, unchecked playback progressed normally from 2 to 2.197 seconds inside the deletion. Enabling Skip deletion areas while playback continued moved it to 4.068 seconds, after the cut. No reimport or transcription was involved.
- Hiding deleted words left Skip deletion areas checked; subsequently disabling Skip deletion areas left Hide deleted words checked. Hidden words stayed hidden across By speaker, Continuous text and By clip. By clip retained a Deleted summary; turning visibility back on displayed eight deleted word spans.
- Saved word records, deletion ranges, explicit splits, phrases, clip names and optional speaker data were identical before/after the toggles. The unchecked playback preference survived reopening the project.
- `playback-toggle-test.ts` verifies the store's start-playback behavior and independent controls, plus identical NLE timeline output across toggle combinations. ExportDialog uses the same cut ranges independently of the two preview/display settings.

### Original requirements

**Status:** Complete; verified above.

**Expected behavior:**

- Add **Skip deletion areas** to the timeline meatballs menu as a single checkmark toggle.
- Checked: playback skips deletion areas. Unchecked: playback includes those areas, allowing the user to hear deleted source content.
- Toggling affects preview playback only. Preserve deletion ranges, transcript data, and export cuts.
- Reflect the actual playback setting with a visible checkmark when on and no checkmark when off, plus an accessible checked state. Use the same checkmark convention for item 3's Hide deleted words toggle; keep the two settings independent.

**Acceptance criteria:**

- Clicking the same menu item switches between skipping and playing deleted regions, and the checkmark immediately matches playback behavior.
- Hide deleted words independently uses checked = hidden and unchecked = visible. Neither toggle changes the other or destroys edits.

**Tracking:** No issue assigned yet.


## Item 9 — Offscreen word-selection toolbar

Verified across two isolated runtime passes using a 10,000-word transcript and the optional By speaker view. This fixes visibility through Floating UI's reference clipping rather than simply lowering z-index.

- Selected word 150 and scrolled it above and below the transcript viewport: the toolbar became `visibility:hidden` with `pointer-events:none`, while word selection persisted. Returning the word to view restored the toolbar at its anchor. Extending selection to words 150–153 and scrolling offscreen also hid the toolbar.
- Resized to 900×440, allowed virtualized row measurements to settle, then scrolled the selection outside the reduced viewport. The toolbar was hidden/noninteractive and the word remained selected. Restoring the viewport and returning the word onscreen restored the toolbar.
- Used the restored toolbar's Cut: only the selected timed word became deleted. Undo restored it. Correct opened the selected word and committed a two-word replacement; Undo restored the source text. Speaker opened its picker, created an attribution label, and assigned only the selected word without modifying cuts or explicit splits.
- Switched to default By clip and selected a word: no legacy floating toolbar remained. Test fixture data was restored afterward.

### Original requirements

**Status:** Complete; verified above.

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


## Item 3 — Transcript visibility and Import menu

Verified 2026-09-06 through the isolated production-built Electron app, together with earlier continuous-view and visibility acceptance checks.

- The far-right transcript menu contains Visibility, Text layout and Import groups with separators and icons. It uses the shared Settings-style icon/menu components. ArrowDown opened/focused its first action, End reached Import, and Enter activated the file input. Russian labels were verified; localization tests pass.
- All three layouts have exclusive selected states. Hide deleted words stayed independent across layouts and preserved a compact Deleted row in By clip. Unhiding restored deleted word spans. Earlier runtime checks verified unchanged saved words, cuts, splits, names, phrases and optional speaker data across view/visibility toggles.
- Continuous text uses naturally wrapped virtualized lines (10,000-word runtime check). By clip derives boundaries from deletions/explicit splits, while By speaker remains a presentation choice. Switching each layout preserved source time; Ctrl-click sought to the word's original timestamp without starting playback in each view.
- Import activated through the new menu. Cancelling replacement preserved the existing words. Accepting an SRT loaded five expected timed words; Ctrl-click sought to 0.5 seconds without playback. The file chooser was intercepted by the test harness and confirmation decisions were supplied explicitly; file input change, parsing, state update and native project save ran normally.
- Fixed a live FileList bug: clearing the input emptied the list before processing; the handler now copies File objects first. The same file can be selected again after cancellation.
- Fixed transcript replacement erasing unrelated editing: existing effective cuts (including word-owned cuts) now persist as source-time manual ranges, while clip names, splits and view settings remain intact. Obsolete phrase/selection word references are cleared. Focused import regression tests cover those invariants; the runtime SRT test also verified preserved existing cuts/splits/names.
- Production build/type checks and import/parser/state regressions pass. Test fixture data restored after every pass. Broader clip/phrase/direct-editing behavior remains under items 6 and 13.

### Original requirements

**Status:** Complete; verified above.

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


## Item 4 — Resize deletion regions

Verified 2026-09-06 in the isolated production-built Electron app, using real pointer capture/move/release events and native project save/reopen.

- Selecting a 4–8-second deletion exposed distinct accessible start/end sliders, approximately 115px high. They were directly draggable without selecting tiny neighboring speech handles.
- Dragged start to 5 seconds and end to 10 seconds. Handle values matched within sub-microsecond coordinate rounding. Undo reverted the complete end-drag gesture to 8 seconds in one step while keeping the start at 5; Redo returned the end to 10.
- Dragged start beyond source zero: it clamped to exactly 0. Selected the second deletion and dragged its end beyond the source: it clamped to the project's 42.4-second duration. Handles remained selectable at the source edges.
- Original word IDs/text/start/end and the explicit split at source time 9 seconds were unchanged. Editing ranges, rather than media or speech timing, changed. The shared cut projection supplies adjacent retained/deleted sections in both timeline and transcript.
- Saved and reopened the project, then selected each deletion again: start 0 and end 42.4 were retained. Test fixture data restored afterward.
- `deletion-resize-test.ts` additionally covers source bounds, preserved source timestamps/splits, gesture-coalesced undo/redo and restoring deleted source. Existing project save/reopen coverage preserves the edited data.

### Original requirements

**Status:** Complete; verified above.

**Tracking:** [#2 — Make it possible to change the length of the deletion region](https://github.com/andrey-reynov/rescript/issues/2).

**Expected behavior:**

- Make deletion boundaries easy to adjust directly from a selected deletion region.
- Use either dedicated deletion-region handles or reveal the full-size handles of the neighboring speech regions when the deletion region is selected. The latter is the simpler option identified in the issue.
- Preserve source handles, timestamps, and synchronization while changing only editing ranges.

**Acceptance criteria:**

- Selecting a deletion region exposes clear, usable controls for its start/end instead of requiring tiny inactive neighboring grabbers.
- Resizing updates the deletion range and adjacent retained ranges consistently, including source-edge cases; undo/redo and save/reopen preserve the result.


## Item 11 — Waveform context menus

Verified 2026-09-06 in the isolated production-built Electron app using actual right-click events, zoom/scroll controls, keyboard menu actions and saved project data.

- Ordinary waveform right-click opened Split/Add deletion and sought to the clicked source position. A requested 5.25-second position measured 5.245 seconds at fit zoom and 5.238 seconds after two zoom steps and horizontal scrolling, within pointer-pixel resolution. Home then Enter activated Split at that position.
- Adding at 8.5 seconds created the normal three-second requested range. It overlapped an existing 10–12-second deletion and merged into 8.499–12; the combined range became selected with resize handles. Right-clicking a different 20–22-second deletion and choosing Restore removed that target while retaining the previously selected deletion.
- Near source end, a request starting about 0.7 seconds before the end was clamped to 42.4 seconds and selected/resizable. End then Enter activated Add deletion. Undo removed that operation; Redo restored it; native save/reopen retained its data. Dedicated resizing acceptance is recorded under item 4.
- Menu bounds stayed inside the viewport, including near the bottom-right source edge. Escape and outside click dismissed it. Opening/dismissing alone left words/cuts/splits unchanged. Ordinary left-click and Alt-left-click still sought to source time 6 seconds.
- Source inspection confirms the waveform container prevents the native context menu, shared menu icons/real shortcut badges and disabled states are retained, and an empty action array renders a disabled `No actions yet` row. All normal loaded-source waveform targets currently have implemented actions; the empty fallback is retained for targets without actions.
- Test fixture data restored. Existing deletion/state and timeline serialization tests cover edit preservation and undo independently of menu presentation. No application change was needed in this audit.

### Original requirements

**Status:** Complete; verified above.

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


## Item 6 acceptance complete

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


**Completion evidence:**

- Runtime native save/reopen fixture with alternating speaker metadata: grouped six words, reopened with the exact persisted phrase ID and members, split before the fourth word, reopened, joined the clips, and ungrouped. Every original word, timestamp, per-word speaker and existing manual cut stayed unchanged. Ctrl-click sought to 0.095 seconds with playback paused. Fixture restored.
- Structure regression covers grouping rejection across deletions and explicit splits, disjoint selections, complete membership after split/cut projection, stable persisted IDs and full overlapping-word bounds. Mixed phrase display metadata is Unknown; original per-word attribution remains untouched and repairable through the optional speaker workflow (action verified in item 9).
- Item 3's completed view-switching checks establish that layout changes do not alter edit structure. Existing state tests cover grouping undo/redo and persisted payload. Item 13 retains the broader direct-editing/caption-foundation acceptance scope.
