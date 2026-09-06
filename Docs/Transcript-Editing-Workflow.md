# Clip-based transcript editing specification

Status: implementation in progress; the acceptance checklist is not yet complete. See [Implementation-Progress.md](Implementation-Progress.md) for verified behavior. This document records the agreed workflow and guides implementation of [PLAN.md item 13](PLAN.md#13-clip-based-transcript-editing-and-phrase-grouping). It refines plan items 3, 4, 6, 9, 11, and 12; it does not mark them complete. Follow [UI-Rules.md](UI-Rules.md) for shared controls.

## Goal

Build a local-first commentary/gameplay rough-cut editor organized around spoken content. Make transcript editing, timeline editing, and later subtitle creation work from the same timed words. Keep finishing in an NLE; this is not a full Resolve replacement.

Speaker diarization must not determine the edit structure. A single commentator can be incorrectly assigned many speakers, even mid-sentence. Default to clips, retain speaker information as optional metadata, and keep an optional speaker view for compatibility.

## Objects and invariants

| Object | Meaning | What changes it |
|---|---|---|
| Word | Selectable text with a stable identity and source timing/reference | Text correction can change its displayed text; realignment can revise corrected timing |
| Phrase | A group of consecutive words displayed as one block above the waveform; a future caption unit | Explicit Group into phrase / Ungroup; clip boundaries constrain grouping |
| Clip | Retained source interval bounded by deletion areas, source edges, or explicit splits | Cut/restore, boundary resizing, Split/Join |
| Deletion area | An excluded source interval that remains recoverable | Cut, Add deletion area, resize, Restore |
| Speaker | Optional attribution metadata attached to speech | Explicit reassignment or recognition; never an editing cut by itself |

- Source timing, text grouping, and editing ranges are distinct. No grouping/view operation may rewrite original media or silently change source timestamps.
- Multiple phrases may belong to one clip. A phrase boundary is not automatically a clip boundary.
- Preserve existing word/speaker information during migration; do not retranscribe merely to introduce clips and phrases.
- Use stable IDs for persisted groups and explicit boundaries. Display numbering such as Clip 1 is not an identity.

## Default transcript: By clip

The transcript follows source order, alternating retained clips and deletion areas:

```text
Clip 1 · optional custom name
Individually selectable words in this retained section…

Deleted · 3.2 seconds
Individually selectable deleted words, if any…

Clip 2 · optional custom name
The next retained section…
```

- Use Clip 1, Clip 2, etc. as default headings and allow custom names. Selecting a clip heading selects its timeline interval; it must not implicitly cut or seek.
- Explicit splits create separate clips even with no deletion between them.
- Restoring a deletion joins the neighboring retained sections unless an explicit split still separates them.
- Expanding a deletion moves fully covered words into its Deleted block. Shrinking it moves restored words back into retained content. Recompute both views from the same editing ranges.
- Partially covered words keep their source timestamps and receive a partial-cut indication. Do not silently snap or retime them. A rendering projection may show the affected portion on either side, but both references must retain the same word identity and must not duplicate transcript data.
- A deletion with no words still shows its duration. Format long durations in minutes/seconds as appropriate.
- Hide deleted words hides the words, not the compact Deleted/duration row in By clip view. Keeping that row explains the edit gap.

## Views and visibility

Exactly one text layout is selected:

1. **By clip** (default): retained clips and compact deletion blocks as above. This replaces the ambiguous planned Per block label.
2. **By speaker**: optional attribution-oriented view. Changing speakers never creates timeline cuts; retain unknown and inaccurate labels as repairable metadata.
3. **Continuous text**: one text flow with no clip/speaker headings or artificial chapter structure in the first iteration. It is a display choice, not a destructive merge.

The transcript's far-right meatballs has separate Visibility, Text layout, and Import groups. **Hide deleted words** is a checkmark toggle independent of layout. **Skip deletion areas**, in the timeline meatballs, independently controls preview playback. Neither alters exported cuts or the other setting.

## Phrase grouping above the waveform

- Select consecutive word/phrase blocks and choose **Group into phrase** from the context menu. Display one phrase block spanning its member words instead of separate word blocks.
- The transcript still exposes every member word for selection and correction. Grouping does not turn its text into one uneditable token.
- The first iteration only groups within one retained clip; reject grouping across deletions or explicit clip splits with an understandable explanation.
- **Ungroup** restores individual timeline word blocks without altering text, timings, clips, or cuts.
- A new clip split inside a phrase also splits the phrase at that word boundary. Deletion changes must not leave a phrase spanning separate retained clips; project the surviving members into each clip without losing word identities.
- Phrase grouping provides future caption units, but this update does not promise complete subtitle export, line wrapping, or automatic caption timing quality.

## One synchronized selection

- Transcript words and timeline text blocks share one canonical selection and anchor. Do not maintain independent selections that drift apart.
- A plain click selects one word, or all words in a clicked timeline phrase block, and establishes the anchor. It does not seek.
- **Shift + left-click** selects the inclusive source-ordered range from the anchor to the target, including intermediate blocks. The anchor remains fixed while extending in either direction.
- Extend a selection from either view, including starting in one and Shift-clicking in the other. A missing anchor behaves as a plain click.
- Selecting a phrase highlights its individual words in the transcript. Selecting only some phrase words highlights the corresponding portion of its timeline block, not falsely the whole phrase.
- Source-range selection may span multiple clips/deletions. If it includes hidden deleted words, communicate that selection scope through the deletion summary; text replacement/grouping must not silently edit hidden content. For the first iteration, require a visible selection within one retained clip for those operations.
- Selection, extension, and dragging selection do not move the playhead, group phrases, or change cuts. Drag selection should be available in the transcript without seeking on each word.

## Pointer and keyboard behavior

Distinguish **timed-word selection** from **text-caret editing**. Show a visible caret/editing state so deletion keys are predictable.

| Input | Timed-word selection / default transcript interaction | While a text caret is active |
|---|---|---|
| Left-click | Select word or timeline phrase; establish anchor; do not seek | Position caret inside the active correction |
| Shift + left-click | Extend the synchronized word/block range | Standard text selection inside the correction; no media action |
| Printable typing | Replace selected word(s) with entered text and continue text editing | Insert/replace characters normally |
| Backspace / Delete | Cut selected timed source range from the edit, preserving original media | Delete characters only |
| Enter | Split the clip immediately before the first selected word | Commit correction; do not split media or insert a clip |
| Double-click a word | Enter correction for that word with a caret for spelling changes | Normal local caret/text behavior |
| Ctrl + left-click a word | Move the playhead to that word's source start without starting playback | Use the explicit seek gesture without conflating it with range selection |
| Right-click | Open contextual actions | Retain appropriate text-editing actions |

- **Go to word** in the word context menu performs the same seek as Ctrl-click. Ctrl-click replaces the proposed Alt-click gesture for transcript words; Ctrl-click is not additive/discontiguous selection.
- Enter at an existing boundary must not create an empty clip. Splitting inside a phrase creates the matching phrase and clip boundaries in both views without introducing silence or deleting audio.
- Changing speaker metadata does not act as Enter/Split and does not change editing ranges.
- Remove the floating Cut / Correct / Speaker toolbar from the default By clip view. Keep discoverable equivalents in context menus, including Cut, Correct, Split, Group/Ungroup where valid, and Go to word. Speaker assignment remains available in the optional speaker workflow.
- If any legacy floating toolbar remains in By speaker view, apply plan item 9: hide it when its selection anchor is offscreen, without clearing selection.
- Route shortcuts by focus and editing state. Do not run media shortcuts while typing in a correction, project/clip name, modal input, or during IME composition. Modifier shortcuts must not be mistaken for replacement typing.
- Context-menu actions must target the relevant selection. Right-click within an existing selection preserves it; outside selects the clicked word/block as the target, without seeking simply to open a word menu.
- Plan item 11's **waveform** right-click behavior remains distinct: it places the playhead at the clicked time before opening Split/Add deletion/Restore actions. Existing waveform Alt-click behavior is not removed by the transcript Ctrl-click decision.

## Text replacement and timing

- Typing over selected words replaces their displayed transcription, not the spoken audio or timeline cuts. Double-click allows smaller corrections rather than replacing the whole selected word immediately.
- Keep the replacement linked to the original selected source interval, from the earliest selected start to the latest selected end (including overlapping words). A changed word count has no automatically trustworthy per-word timing: mark internal replacement timing approximate until alignment is performed.
- Preserve original source provenance separately from corrected text/timing. Group membership and selections must be updated deliberately when corrected token counts change.
- Offer selected-range realignment as appropriate to the existing alignment roadmap; do not silently rerun the entire video for a spelling correction.
- Committing empty text keeps a selectable **Empty text** placeholder for the retained timed token. This label is presentation only and never becomes transcript/export text; reopening correction edits an empty value. It does not delete audio.
- Commit a correction as one meaningful undo step; keep transient caret input separate from persisted committed data. Canceling an unfinished correction must restore the prior text. Autosave committed edits and preserve them across reopening.
- Approximate timings must not be presented as measured alignment in seeking/caption workflows. Exact corrected-word timing, including insertion/deletion cases, needs focused validation before subtitle use.

## Implementation sequence

1. **Clip-based structure and views:** separate attribution from editing boundaries; project words into retained/deleted blocks; support names, explicit Split/Join, deletion resize/restore, and persistence. Refine plan items 3, 4, and 6.
2. **Shared selection and phrases:** one anchor/selection across views, Shift-click ranges, Group/Ungroup, partial phrase highlights, and boundary handling.
3. **Direct text editing:** replacement typing, double-click caret correction, focus-sensitive shortcuts, Enter splitting, Ctrl-click/Go to word, undo and corrected timing provenance. Remove the default floating toolbar as part of this phase.
4. **Caption foundation validation:** verify phrase grouping and corrected timing against the subtitle roadmap; actual richer subtitle generation/export remains later scope.

Full-audio retranscription (plan item 1) must invalidate/reconcile any obsolete word references or phrase membership explicitly. Never retain dangling group IDs or silently apply an old selection to unrelated regenerated words.

## Acceptance checklist

- [ ] A single-speaker VOD with many inaccurate speaker labels defaults to coherent edit clips without deleting the optional speaker metadata.
- [ ] Delete, resize, and restore update both views; a textless deletion still displays duration and a partial word cut does not retime speech.
- [ ] Explicit splits survive restoring an adjacent deletion; splitting at an existing boundary creates no empty clip.
- [ ] Group/Ungroup changes timeline presentation only; words stay selectable and seek to their source positions. Cross-clip grouping is rejected.
- [ ] Plain click selects without seeking. Shift-click extends forward/backward across both views and shows partial phrase selection correctly.
- [ ] Ctrl-click and Go to word move the playhead without starting playback. Word right-click preserves the selected action target; waveform right-click retains its separate behavior.
- [ ] Typing replaces one or multiple selected words. Double-click permits character corrections. Backspace cuts in timed selection but edits characters with a caret; Enter splits in timed selection but commits with a caret.
- [ ] View toggles, Hide deleted words, and Skip deletion areas remain independent and do not alter edit/export data.
- [ ] New structures, names, corrected text, and timing provenance survive undo/redo, autosave, and reopening; older projects load without retranscription or data loss.
- [ ] No floating selection toolbar remains in default clip view; any retained legacy toolbar respects viewport visibility.
- [ ] Long-video virtualization continues to work: offscreen rendering does not lose selection, group membership, or edits, and updates do not rebuild every word on each pointer event.

Implementation details requiring explicit resolution during development: deterministic ownership/rendering of partially cut words, custom-name retention when clips merge, and the corrected-token timing/allocation algorithm. These must respect the invariants above and be documented with tests; do not infer precise timing or discard names silently.
