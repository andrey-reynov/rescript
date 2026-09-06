# Next Update Plan

Pending features only. Completed acceptance records are retained in [Completed-Plan-Items.md](Completed-Plan-Items.md). Keep existing item numbers when removing completed work.

GitHub issues reviewed on 2026-09-06 from [andrey-reynov/rescript](https://github.com/andrey-reynov/rescript/issues). Open issue status is not proof that implementation is missing; entries below retain only pending scope or explicit verification work. Existing items 1–3 remain first; imported issue order does not change release milestones.

## Features

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

