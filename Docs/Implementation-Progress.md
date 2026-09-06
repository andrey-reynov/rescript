# Plan implementation progress

Objective: implement all of PLAN.md and Transcript-Editing-Workflow.md. This log is evidence and remaining work, not a narrowed substitute for that objective. The user authorized publishing the current implementation stages as release 1.3.0. This release does not mark the full plan complete; remaining requirements stay tracked below.

## Coverage

| Plan item | Current state | Remaining verification/work |
|---|---|---|
| 1 Full-audio retranscription | Implemented in shared modal, IPC and job service | Final integrated regression after clip/phrase persistence is added |
| 2 Models manager | Implemented native storage and Settings controls | Final installed/Parakeet and interruption audit |
| 3 Transcript views/menu | Implemented baseline clip/speaker/continuous rendering and grouped menu | Final boundary/long-video/UI audit |
| 4 Resize deletion regions | Implemented direct selected-cut handles and keyboard nudges | Final pointer/edge/overlap audit |
| 5 Silence blocks | Implemented real RMS/VAD analysis, controls and timeline regions | Final gameplay/music and installed-build audit |
| 6 Speech block operations | Pending | Resolve through distinct clip/phrase operations in item 13 |
| 7 Capability metadata | Implemented shared profiles and UI/native/worker guards | Integrated selector and bilingual audit |
| 8 Russian verification | Pending | Full bilingual/install/migration matrix |
| 9 Offscreen toolbar | Removed in default clip view; clipping middleware added for legacy toolbar | Runtime scroll test with offscreen anchor after final rebuild |
| 10 Project Manager UI | Implemented | Final visual/theme/accessibility audit with long revision lists |
| 11 Context menus | Implemented waveform/word context actions and empty fallback | Final end-of-source, outside dismissal and keyboard audit |
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


## Stage three evidence and next work

- Added shared `ContextMenu` with bounded placement, icons/shortcuts, disabled rows, empty fallback and keyboard/outside dismissal. Timeline context actions target source time or word selection, with restore on deletion areas and Split/Add deletion on retained waveform.
- Direct deletion handles expose start/end sliders, pointer drag and 10 ms keyboard nudges (100 ms with Shift), preserving source timestamps and explicit splits. State changes coalesce into one drag undo step.
- Timeline projects phrase groups into consolidated chips; individual transcript words remain selectable. Ctrl-click seeks, plain/Shift-click share the canonical anchor, and selected member spans are highlighted inside phrases. Group/Ungroup are available in timeline and transcript context menus.
- Transcript supports inline replacement typing (including spaces), double-click correction, Enter commit/Escape cancel, and Enter splitting when timed words are selected. The Editor shortcut handler defers printable keys to transcript editing while maintaining timeline playback shortcuts. Correcting unchanged text is a no-op. Partial-cut and approximate-timing indicators are localized.
- `tests/deletion-resize-test.ts` passes source bounds, preserved timestamps/splits, coalesced undo/redo and restoration. Transcript structure/state tests and renderer/Electron type checks also pass; changed code lint has no errors.
- Isolated runtime: selected three word chips with Shift; transcript highlighted the same three IDs without seeking; grouped chip reduced 45 chips to 43 and retained the member IDs. Added a three-second deletion via waveform menu; both handles and the Deleted transcript block appeared.
- Isolated runtime: typed s then pelling over Hello.; input entered correction immediately (not timeline Split), committed spelling with Enter without seeking, and double-click/Escape preserved the text. Enter on another word produced a new clip heading.

Remaining full-plan work: native models manager/download storage/relocation; model language capability consistency; silence detection/settings/colors/actions; selected correction realignment/timing validation; comprehensive installed bilingual/migration checks; runtime drag/resize, restore/join and hidden-word edge cases; offscreen legacy toolbar proof; keyboard/IME/focus and long-video performance audit; final installer and full requirement audit. Timeline/deletion/editor changes are substantial progress, not proof of full plan completion.

Latest static build predates the final small tweaks for Space replacement, no-op corrections, localized partial-cut/timing tooltips, and keyboard deletion clamp/Enter parity. Rebuild before final runtime audit. Test app launched for stage three used isolated bootstrap process 29848; close it after checks rather than relying on this PID across turns.


## Stage four: model management and language capabilities

- Shared model capabilities distinguish supported spoken languages, explicit Whisper language selection, fixed-English models, and automatic-only Parakeet v3. Both transcription modals use the same language picker; job/worker guards reject incompatible requests before loading. See Model-Capabilities.md for evidence and backend limitations.
- Added native file manifests, streamed downloads, bounded legacy imports, verified per-file relocation and retained old locations for default-folder changes. Settings Models exposes download/delete/folder/relocate/progress/errors; worker model loading uses the same managed files. See Model-Storage.md.
- Type checks, static/Electron builds, full lint (existing two warnings), model/storage/job/localization tests pass.
- Isolated runtime: migrated seven Tiny English artifacts (122,390,002 bytes); full-audio job completed with 45 words and cuts preserved. Settings downloaded all seven Tiny artifacts (122,468,518 bytes), then Delete removed them and availability became false. Folder selection preserved existing Tiny English availability in its old location.
- Model capabilities and storage acceptance continue with relocation/restart, native Parakeet and final installed bilingual checks; silence detection and the remaining editing/performance requirements are still outstanding.

- Settings relocation moved Tiny English, Base, Medium and Turbo to the selected folder with no models left in prior locations. After restart with Tiny English Hub downloads blocked in both native and renderer paths, full transcription again completed (45 words, cuts preserved). Cached-import tokens are owned by their renderer and cancelled on navigation/close/crash.


## Stage five: separate acoustic detectors

- Added RMS and Silero probability analysis in saved 60-second batches, a separate background renderer, pause/resume, source fingerprint checks and damaged-batch recovery. Existing transcript jobs and edits are untouched.
- Timeline Silence detection opens configurable amplitude/VAD thresholds, minimum duration and blue/yellow/green legend. Region deletion and Auto Cut are explicit, preserve source handles, and use normal undo/resize/restore behavior. Project settings persist; derived frame data lives in the source cache.
- `silence-analysis-test.ts`, `silence-jobs-test.ts`, `silence-state-test.ts`, localization tests and both type checks pass; static/Electron builds pass. Runtime evidence is detailed in Silence-Detection.md.
- Isolated real analysis: 1,326 frames, all three colors, unchanged transcript/cuts before explicit deletion. Auto Cut + Undo preserved word timestamps; 20% threshold survived reopen. Fresh analysis completed across an editor reload. Dialog visual inspection and Escape were checked.
- Full-plan completion remains unproven. Remaining areas include selected correction realignment, installed bilingual/Parakeet/migration checks, gameplay/music detector validation, long-video/editor keyboard and boundary audits, and the final requirement-by-requirement audit.


## Stage six: continuous flow and viewport audit

- Continuous text now packs visual rows using the actual 15px transcript font and available panel width, replacing arbitrary 80-word paragraph breaks. Font loading and panel resizing reflow the display; word identities and source data remain untouched. Visible rows and selected endpoints remain virtualized.
- `transcript-flow-test.ts` verifies width-based wrapping, resize, oversized words, unchanged identities/data, and a 50,000-word projection. Renderer type checking, production static/Electron build, and changed-file lint pass (the existing TanStack compiler warning remains).
- Isolated runtime with 10,000 mixed English/Russian words: first eight rows exactly matched an ordinary browser paragraph; only 136 word spans initially and 205 after scrolling were mounted. Word 2 stayed selected offscreen without seeking (source time 0); resized layout reflowed and mounted 88 spans. Screenshot inspected. Test fixture restored afterward.
- Optional By speaker toolbar: selected word 150, scrolled above and below the viewport, returned, and extended to words 150–153. The toolbar was hidden with pointer events disabled offscreen and returned at the visible anchor; selection persisted throughout. Resize and restored toolbar actions still need a dedicated check before closing item 9.
- This stage does not complete the full plan. Selected correction realignment, installed bilingual/Parakeet/migration checks, representative gameplay/music analysis, remaining keyboard/IME and clip-boundary runtime cases, and final requirement audit remain open.


## Stage seven (in progress): selected correction alignment

- Added captured selection/result validation and atomic store publication for selected-word alignment. Only contiguous visible text within one retained clip is accepted. Invalid, partial, reordered or stale results leave existing text/timings unchanged. Worker results cannot replace text, IDs, speaker metadata, deletion flags, phrases or original correction provenance.
- Existing transcription worker now has an alignment-only request path: it uses supplied words and the language's CTC model without ASR or diarization. Strict mode rejects failed batches and words whose timings would otherwise be interpolated (for example bare digits), rather than falsely marking those words measured. Normal transcription fallback behavior is unchanged.
- Focused tests cover measured timings, invalid/partial/stale results, identity and provenance preservation, one-step undo/redo, unchanged phrase membership, autosave payload, and rejection of interpolated CTC words. Renderer/Electron type checks and changed-file lint pass.
- The user-facing selected-range action, bounded source-audio transport, progress/cancellation, language explanation and runtime inference validation are still to implement. This is a committed implementation step, not completion of the selected alignment requirement.


- Selected alignment is now available in the word context menu with a shared-style language modal, progress and cancellation. Prepared PCM reads are bounded and checked against the source fingerprint; jobs/checkpoints are not replaced. See [Selected-Text-Alignment.md](Selected-Text-Alignment.md).
- Real cached-model inference updated one selected word, preserved the remaining data and supported Undo. Cancel preserved all words; an unalignable digit correction failed explicitly and stayed approximate. Focused native/read and localization tests, both type checks, and production static/Electron builds pass. Remaining multi-batch/multi-word alignment cases and the rest of PLAN.md still require audit.


## Stage eight: Project Manager acceptance complete

- Extracted revision dialog with initial/return focus, keyboard containment and Escape, visible local restore errors, and a restore-in-progress guard. A failed restore now returns focus to usable dialog controls instead of leaving focus behind the overlay.
- Item 10 passed its full acceptance checks: Accent Open project, both card icons' hover/pressed/keyboard actions, X/no Cancel, stationary header/description with scrolling list in a short window, light/dark visuals, actual native revision restoration and recovery backup, unchanged project on dismissal, and failure recovery.
- Removed only item 10 from the pending plan. Its original requirements and detailed evidence are preserved in [Completed-Plan-Items.md](Completed-Plan-Items.md). The rest of the plan remains active.


## Stage nine: playback toggle acceptance complete

- Item 12 passed integrated real-playback checks, including enabling skip during playback within a deletion, visible checkbox states, independent Hide deleted words in all three layouts, preserved saved edit data, and preference persistence after reopening.
- Added regression coverage for unchanged exported NLE timeline output across preview/visibility toggle combinations. Removed only item 12 from the pending plan; its requirements and evidence remain in Completed-Plan-Items.md. Other transcript menu/import acceptance work remains under item 3.


## Stage ten: optional toolbar acceptance complete

- Completed item 9's remaining viewport-resize and restored-action checks on the isolated 10,000-word fixture. Hidden toolbar could not intercept clicks; selection persisted. Cut, Correct, and Speaker targeted the selection correctly after return. Speaker reassignment left cut/split data unchanged; By clip had no legacy toolbar.
- Combined with stage six's above/below-edge and multi-word checks, the item's full acceptance scope is verified. Removed item 9 from the pending plan and retained its original requirements/evidence in Completed-Plan-Items.md. Test data restored, and no application changes were necessary in this pass.


## Stage eleven: transcript menu acceptance complete

- Fixed Import losing its live FileList when resetting the input. Replacement transcript import now preserves effective editing cuts as manual source ranges, explicit splits, clip names and view preferences; stale phrase/selection references are cleared.
- Runtime menu group/icon/keyboard checks, cancellation/reselection/SRT parsing, preserved cuts, and imported-word seeking pass. Each text layout preserves the playhead and supports Ctrl-click source seeking. Combined with prior exclusive-layout/visibility/natural-flow checks, item 3 is complete and moved to Completed-Plan-Items.md.
- Import preservation regression covers word-owned deletions, manual ranges, names, boundaries, preferences and cleared stale IDs. Full plan remains active.


## Stage twelve: deletion resizing acceptance complete

- Real pointer drags selected/resized dedicated start/end handles, produced expected source-time ranges, and respected both source edges. Undo/Redo operated once per full drag. Native save/reopen retained the resized ranges; word timings and explicit splits stayed unchanged.
- Combined with the existing focused resizing tests, item 4 is complete and moved to Completed-Plan-Items.md. No application change was needed in this audit; initial harness failures came from clicking before native window resize settled. The final checks waited for layout and used live timeline coordinates. Test fixture restored afterward.


## Stage thirteen: waveform context-menu acceptance complete

- Completed zoom/scroll source-position, keyboard Split/Add, overlap merging, clicked-target Restore, source-end clamping, undo/redo/save persistence, viewport bounds, Escape/outside dismissal and unchanged left/Alt-click behavior checks.
- Item 11 moved to Completed-Plan-Items.md with its original requirements and evidence. No application change was needed. Final fixture data restored; remaining plan work remains active.

## Stage fourteen: overlapping speech correction boundaries

- Fixed correction allocation and phrase eligibility to use the minimum selected start and maximum selected end. Source-ordered words can overlap, so the final word's end is not a safe boundary. This prevents shortened correction ranges and rejects grouping/correction when an earlier selected word crosses a deletion or explicit split.
- Focused regression checks cover overlap, unchanged unselected/source words, approximate timing provenance, mixed speakers remaining Unknown, and rejection across both cuts and splits. Transcript structure/state and selected alignment tests pass.
- This closes an implementation defect under items 6/13, not their complete acceptance audit. Remaining keyboard/IME, cross-view selection and installed model/language checks remain pending.

## Stage fifteen: dragged selection anchor and hidden scope

- Drag selection now includes the complete source-ordered word range, including hidden deleted words, consistently with Shift-click. Existing deletion summaries communicate hidden selection scope; grouping/correction remain constrained to one retained clip.
- Added atomic source-span selection with the pointer-down anchor. Backwards drag no longer retains a stale anchor or substitutes the lowest selected ID. Modified pointer gestures and active caret correction are excluded from drag handling.
- State regression verifies hidden words, both anchor directions, subsequent Shift extension, clearing stale clip/cut picks, unchanged deletion flags and unchanged playhead. Type checking, focused lint and production renderer build pass.
- Real pointer runtime on the isolated project: drag 142→138 selected 138–142, then Shift-click 144 selected 142–144; drag 138→142 then Shift-click 137 selected 137–138. Playhead remained at 10 seconds. No project edit was made by this test. Cross-view/hidden-range runtime and remaining keyboard/IME acceptance remain under item 13.

## Stage sixteen: correction keyboard routing

- Shared composition guard handles both isComposing and legacy key code 229. Applied to global editor shortcuts, direct transcript typing, correction Enter/Escape, selection Escape and optional speaker shortcut. An IME confirmation must not accidentally commit, split, or clear a selection.
- Actual renderer input test replaced two selected words with English/Russian text, committed with Enter without changing cuts/splits, verified approximate provenance and saved output, then restored original words with Undo. Double-click opened existing text; native Select All/Backspace edited characters, and Escape discarded the draft without cutting media. Fixture restored.
- Simulated key-229 Enter left the correction open. This proves event routing, not full OS IME composition entry; that remains pending. The first harness attempt omitted native Select All's virtual key code; adding it made the character-deletion check pass without an app change.
- Focused composition test and production build pass. Full item 13 acceptance remains open.

## Stage seventeen: correction draft eligibility

- Shared correction selection validation now runs before opening any correction draft (typing, double-click, context action or legacy toolbar), and again during commit. Cross-cut/split, disjoint and stale-ID selections cannot hide text in an invalid draft. IDs are normalized to source order.
- Runtime cross-split selection of four words rejected typing with an explanation, retained all four selected spans and preserved saved words/cuts/splits/phrases. The valid bilingual replacement/Enter/Undo/double-click/Backspace/Escape checks passed again. Fixture restored.
- Added missing Russian translations for correction/grouping eligibility errors discovered in that runtime check. Structure/state tests and production build pass; item 13 remains open for its remaining acceptance scope.

## Stage eighteen: phrase grouping and clip structure acceptance

- Extracted timeline phrase projection and fixed geometry to include every overlapping member's source span. Mixed phrases use Unknown display metadata and retain each word's attribution unchanged.
- Regression tests cover overlap, no missing/duplicated words, projection across cuts and splits, and stable persisted group identity. Type checks, focused lint and production build pass.
- Native runtime grouped/saved/reopened six mixed-speaker words, split into two three-word phrase projections, reopened/joined, verified original-time seeking paused, and ungrouped without word/cut changes. Fixture restored.
- Item 6 is complete and moved with its original requirements to Completed-Plan-Items.md. The rest of PLAN.md remains pending.

## Stage nineteen: source cuts survive retranscription publication

- Found and fixed replacement publication losing cuts owned by deleted word IDs. Materialize their existing source ranges before replacing words; clear retained word deletion flags to prevent newly adjacent words bridging an empty replacement. Existing manual cuts remain intact, and the editor receives the published ranges with a fresh cut-ID counter.
- Protect materialized ranges and pruned phrase IDs against a queued old-generation autosave. Reassign preserved-range IDs against incoming manual cuts so a concurrent new cut remains intact. Renderer publication also checks manual cut/split reference changes during its save/read round trip.
- Native regression covers full and partial/empty replacement, exact effective cut geometry, retained names/splits, obsolete phrases, idempotent publication, paused/error atomicity, and late saves with a new manual cut. Progressive result tests and both type checks pass.
- Item 1 remains pending: integrated fresh inference/modal checks, and the explicit-import exception in ProjectFiles.save versus a retranscription of an imported transcript still needs audit. Model/language preference publication and concurrent edit behavior require end-to-end verification before closing the item.

## Stage twenty: imported transcript generation protection

- Explicit imports receive a persisted identity, carried through autosave and project load (optional for legacy files). ProjectFiles.save now distinguishes a deliberate import from an old imported-transcript save; the blanket source=import exception no longer overwrites a completed replacement result.
- Replacement jobs capture the import identity at start. A newer import invalidates publication from that older job, protecting the reverse race even if cancellation and worker completion overlap.
- Native regression covers imported and legacy-imported late saves, deliberate replacement import, and a job finishing after a newer import. Import edit-preservation, project files, progressive results and both type checks pass.
- Item 1 remains active for end-to-end modal/fresh model-language and conflict acceptance; this stage resolves the import exception identified in stage nineteen.

## Stage twenty-one: full-audio model/language persistence

- Full versus selected replacement scope is explicit in the durable job. Full completion publishes its model/language with the transcript; selected replacement leaves project defaults unchanged. Queued old-generation saves retain the completed full-run preferences. The renderer loads the authoritative project choices alongside its result.
- Regression covers scope, full settings, selected independence and stale-save protection. Both type checks, focused lint and production renderer/native builds pass.
- Real cached Whisper Base inference processed the entire 42.4106875-second source (45 words), changed project source from Tiny English to Base, kept English language, preserved the existing manual cut and a deliberately deleted first-word interval (0.095–0.55). Reopened the project and opened/cancelled the full-audio dialog with Base/English shown. Test project, job manifest and summary restored after shutting down the isolated app.
- Remaining item 1 checks include model/language changes through the modal itself, selected numeric-range/cancel/error/conflicting-job acceptance; this result does not close the whole item.

## Stage twenty-two: shared retranscription dialog acceptance

- Added initial focus, Tab wrapping, Escape dismissal, busy focus and duplicate-submit guard. Captured project ID prevents submission against a different open project. Current job state gates opening/submitting even when a conflict begins after opening. Initial model/language is normalized for compatibility. Native errors are stripped of transport boilerplate and localized.
- Runtime: full dialog displayed “Всё аудио”; selected dialog displayed “0.10–0.55 s”. Tab/Shift-Tab wrapped; Escape first closed the model dropdown, then the dialog. Cancelling either preserved saved transcript/cuts/settings and job generation.
- Temporarily moved only the isolated fixture's job manifest to exercise missing prepared audio. Submission showed an inline error, retained focus and old edit, and remained dismissible. Manifest restored exactly. Added missing Russian error translation afterward.
- Type checking, focused lint, i18n tests and production renderer build passed before runtime; final busy-focus/translation additions checked again. Active-job conflict and model/language submission through the modal remain open under item 1.

## Stage twenty-three: full retranscription acceptance complete

- Dialog model/language submission and conflict acceptance passed with real cached Base inference. Full generation covered the original 42.4106875-second source despite a one-word selection and timeline cut, and published 45 words with Base/Automatic preferences.
- Existing fixture's cut had no recognized speech, so the initial output-overlap assertion was inconclusive. Repeated with a known spoken word deleted; recognition included it while its exact deletion survived. This establishes the requested behavior directly instead of assuming speech inside the first cut.
- Together with the previous modal cancellation/error, atomic job/recovery and source-edit preservation evidence, item 1 is complete. Moved original requirements/evidence to Completed-Plan-Items.md. Test fixture restored; overall goal remains active.
