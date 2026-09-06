# Plan implementation progress

Objective: implement all of PLAN.md and Transcript-Editing-Workflow.md. This log is evidence and remaining work, not a narrowed substitute for that objective. No release/push of these implementation stages has been requested yet.

## Coverage

| Plan item | Current state | Remaining verification/work |
|---|---|---|
| 1 Full-audio retranscription | Implemented in shared modal, IPC and job service | Final integrated regression after clip/phrase persistence is added |
| 2 Models manager | Pending | Settings downloads/deletion/location/relocation and runtime/cache integration |
| 3 Transcript views/menu | Implemented baseline clip/speaker/continuous rendering and grouped menu | Final boundary/long-video/UI audit |
| 4 Resize deletion regions | Pending | Direct handles and synchronized transcript projection |
| 5 Silence blocks | Pending | Separate amplitude/no-speech detectors, settings and visualization |
| 6 Speech block operations | Pending | Resolve through distinct clip/phrase operations in item 13 |
| 7 Capability metadata | Pending | Explicit model language/forced-language capabilities and shared UI |
| 8 Russian verification | Pending | Full bilingual/install/migration matrix |
| 9 Offscreen toolbar | Removed in default clip view; clipping middleware added for legacy toolbar | Runtime scroll test with offscreen anchor after final rebuild |
| 10 Project Manager UI | Implemented | Final visual/theme/accessibility audit with long revision lists |
| 11 Context menus | Pending | Waveform target actions, creation/resize, empty fallback |
| 12 Preview skip toggle | Implemented and persisted | Final live playback/persistence checks with edited clips |
| 13 Editing workflow | Core model/state and transcript views implemented | Timeline phrase rendering/selection, context/caret editing, boundary UI, exhaustive persistence/migration/performance audit |

## Stage one evidence

- Renderer and Electron type checks pass; static desktop build passes. Changed UI lint has no errors.
- `tests/range-transcription-test.ts`: full replacement uses a fresh job key and empty checkpoint list, covers all prepared samples, commits atomically, and preserves manual cuts. Existing selected-range checks also pass.
- Isolated desktop profile: full source 0–42.4106875 seconds transcribed with cached Tiny English; job completed with 45 words and preserved manual cuts. Opening/canceling the Full audio modal also checked; both selectors present.
- Isolated Project Manager: Open project uses Accent, card buttons use shared icon treatment, revisions have top-right X/no Cancel, and overflow is confined to the list rather than its parent.
- `tests/playback-toggle-test.ts`: starting playback skips a cut only when enabled; disabling skip retains source time and manual cuts; Hide deleted words remains independent.
- Isolated desktop menu: Skip deletion areas transitions aria-checked true → false and back without dismissing the menu. Shared checked/grouped menu support is ready for the transcript options.

Completed work must receive the broader requirement-by-requirement audit before the overall goal is marked complete. PLAN.md still contains all numbered requirements for traceability until that audit.


## Stage two evidence and next work

- Added `lib/transcript-schema.ts` and `lib/transcript-structure.ts`: distinct word/phrase/clip concepts, retained/deleted row projection, source-anchored clip names, phrase grouping/projection, shared range selection, and approximate correction timing with source provenance.
- Editor state persists phrase groups, clip names and selected view; includes those edit objects in undo/redo. Full/partial range publication prunes phrase references to replaced words; the UI clears obsolete selection on result application.
- `tests/transcript-structure-test.ts` and `tests/transcript-state-test.ts` pass: explicit split survives restore, partial cuts preserve word timing, grouping constraints, correction bounds/provenance, anchored ranges, undo/redo, and project payload fields.
- Runtime By clip is the default; grouped Visibility/Text layout/Import menu has exactly one checked layout. Continuous text renders words without clip headings. Plain word click leaves playhead unchanged; default floating toolbar absent. Ctrl-click/Shift-click transcript changes are wired, but cross-view selection and phrase rendering still need completion.
- Renderer/Electron type checks, range tests, progressive result tests, and full lint pass (only existing image/virtualizer warnings after removing new warnings).
- Next: implement timeline phrase rendering and shared selection; context menus and direct caret editing; deletion resizing/partial-cut presentation. Finish models manager/capabilities and silence detectors, then comprehensive bilingual/migration and runtime acceptance audit.

Implementation caveats still to resolve: do not allow per-row virtualization to add visible gaps to Continuous text; handle phrase grouping when source IDs are regenerated; avoid per-word/per-split scans for large videos; verify retained speaker toolbar truly hides when scrolled away. Current source is newer than the last static build only for the final clipping-middleware simplification and lint cleanup; rebuild before that runtime check. No final installer has been built for the full plan yet.
