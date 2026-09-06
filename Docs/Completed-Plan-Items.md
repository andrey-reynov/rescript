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

