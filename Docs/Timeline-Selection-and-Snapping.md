# Timeline selection and snapping — completed in 1.5.4

New requirements from the user's goal-objective.md, 2026-09-06. Earlier completed work remains in Completed-Plan-Items.md; these revised interactions supersede conflicting older behavior.

- [x] Fix immediate Shift-click transcript ranges and preserve the entire anchor phrase when selecting backwards on the timeline. Test both directions across both views without delays.
- [x] Treat a grouped phrase as a selectable/editable unit in transcript and timeline. Ctrl-click targets an individual member; double-click edits the group normally and an individual word with Ctrl. Preserve source IDs, timings, undo and saved group structure.
- [x] Add timeline Snapping toggle for word/phrase boundaries, neighboring speech, deletion and clip edges. Apply it to text timing, deletion resizing and clip trimming. Keep legal bounds and source provenance; allow fine adjustment when disabled.
- [x] Add Settings > Shortcuts for configurable new actions (including Snapping), conflict validation, reset, persistent bindings and real menu hints. Keep standard save/open/undo/redo/delete/restore/split shortcuts fixed.
- [x] Keep deletion handles and selected outline in the clip-handle style, but red.
- [x] Allow increasing/decreasing timeline text-lane height; persist the preference and keep waveform/ruler layout correct.
- [x] Add marquee selection in the timeline text lane, synchronized with transcript. Word-lane interactions must not seek; seeking stays on ruler/waveform. Preserve Shift range selection and edge manipulation.
- [x] Extend maximum timeline zoom substantially for accurate edge placement, including short videos; keep responsive rendering, scrolling and pointer-anchored zoom.
- [x] Review GitHub issues against shipped behavior and close only verified completed issues. Retain unresolved/revised requirements in this plan.
- [x] Verify the integrated changes, update UI/workflow documentation, and produce a current local installer.


## Current interaction contract

- Transcript click selects the whole projected phrase and seeks to the clicked word. Ctrl-click selects an individual member. Normal double-click edits the phrase; Ctrl-double-click edits the individual word. Space outside correction controls playback; typing does not replace selected text until correction is opened.
- Shift-click extends the canonical selection in either direction, retaining the entire anchor phrase. Timeline and transcript share the same IDs. Grouping preserves source words and timestamps; cut/clip boundaries constrain projected groups.
- Timeline text clicks, Shift ranges and rectangular marquee selection never seek. Start a marquee on empty text-lane space; Shift preserves the existing selection. Use the ruler or waveform to seek.
- Snapping defaults on, with N as the default shortcut. Text timing, deletion resizing and clip trimming snap to neighboring word, cut, clip and source boundaries within eight screen pixels, respecting legal limits. Turn it off for free adjustment.
- Settings > Shortcuts configures nonstandard menu actions; menu badges reflect saved bindings. Conflicts and reserved editing/navigation keys are rejected. Backspace/Delete clears a binding and Reset restores defaults. Shortcuts do not run while editing text, composing input or operating a modal/menu.
- Deletion edges use the same thin handles as clips, colored red. The text-lane separator resizes the lane from 28 to 160 pixels; Up/Down also adjusts it. Preferences persist locally.
- Zoom supports up to 20,000 pixels per source second, bounded by a 16-million-pixel scroll surface and a 65,536 zoom multiplier. Word and waveform drawing remains limited to the viewport.

## Verification

All 49 repository test files passed with zero skipped files on 2026-09-06, including range-anchor and snapping/shortcut regressions. Renderer and Electron TypeScript checks passed. Full ESLint completed with zero errors and two existing warnings (ProjectLibrary image and TanStack Virtual compiler compatibility).

Isolated Electron runtime checks exercised six immediate forward/backward Shift ranges, phrase and Ctrl-member selection/correction, backward selection retaining the entire grouped anchor, marquee synchronization without seeking, keyboard lane resizing, reserved/duplicate shortcut rejection and rebinding, actual deletion snapping to 6.545 seconds versus free placement at 6.559794 seconds, red handles, maximum zoom, and saved group/preferences after reopening. These are test-profile checks, not a claim that the user's installed app or original projects were modified.

GitHub issues #1–#8 were reviewed against implementation and prior acceptance records: Save controls, deletion resizing, silence blocks, Russian support, phrase merge/split, model descriptions, separate UI/transcription language, and import-before-transcription setup. Their completed work is also covered by Completed-Plan-Items.md, Import-and-Retranscription.md and the transcript acceptance audit.

Subtitles over the video remain deferred in PLAN.md. Finishing stays in an NLE.

Release verification: production UI and Electron builds and the Windows x64/ARM64 NSIS installer completed successfully for 1.5.4. Final test-profile runtime confirmed pointer lane resizing from 40 to 56 pixels, reserved/duplicate shortcut rejection, and the rebound action. GitHub issues #1–#8 are confirmed closed.
