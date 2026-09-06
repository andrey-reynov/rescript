# Transcript acceptance audit

This is an evidence map for PLAN item 13, not a reduction in scope. The detailed specification remains authoritative. Earlier completed plan items retain their original requirements in Completed-Plan-Items.md.

| Requirement | Evidence inspected | Result |
|---|---|---|
| Speaker labels do not define clips; optional attribution survives | transcriptBlocks uses cut/split boundaries only; transcript-structure-test now exercises 120 distinct labels with exactly two retained clips and one deletion; installed legacy migration defaulted to clip view and retained speaker IDs (stage 30) | Verified |
| Delete/resize/restore, textless duration, partial-word provenance | Structure/presentation tests cover midpoint ownership and unchanged source timing; deletion-resize tests plus real pointer/save/reopen evidence in stage 12; installed textless deletion and Undo in stage 33 | Verified |
| Restoring deletion retains explicit splits; duplicate split creates no empty clip | transcript-structure-test restore case; transcript-state-test repeated split rejection; stage 18 split/reopen/join runtime | Verified |
| Group/Ungroup remains presentation-only | Structure tests cover immutable word data, cross-cut/split rejection and stable projections; stage 18 real grouping, reopen, seek and ungroup | Verified |
| Shared forward/backward selection and partial phrase highlighting | Stages 31 and 38 actual pointers, hidden-word scope, fixed anchor, unchanged playback; transcript-state-test | Verified |
| Ctrl-click/Go to word and both context-menu targets | Stage 39 verifies clicked-word Go to word within/outside multi-selection, no seek on context opening, and paused Ctrl-click. Stages 13/31 verify waveform and partial-phrase context behavior | Verified |
| Selection versus caret keyboard behavior | Stages 16/17/28 verify replacement, character deletion, cancellation and empty text recovery; stage 34 verifies naming input routing. Initial OS composition input and full keyboard interaction audit remain open | Open |
| Independent views, hidden text and skip controls | playback-toggle-test compares exported NLE timeline before/after toggles; stages 9/11 verify all layouts, actual playback and reopen | Verified |
| Structures/corrections/provenance survive history, save and migration | Stage 40 verifies combined correction/name/group history, exact saved structures and rendered reopen state; stage 30 verifies legacy migration without retranscription; stages 34/35 cover name and timing history | Verified |
| Default toolbar removed; legacy toolbar obeys viewport | Stage 10's 10,000-word resize/offscreen/return action checks; source gates legacy toolbar on speaker view | Verified |
| Long-project selection/grouping/correction under virtualization | Stage 6 verifies bounded DOM and selected offscreen endpoints. Offscreen committed correction/group persistence and pointer-update behavior still require the complete check | Open |

Additional specification gates: verify initial IME entry without destructive shortcuts; exercise multi-batch selected realignment and preserve atomic failure/cancel behavior. Timing remains approximate after text edits and measured alignment remains an estimate; this update does not promise finished subtitle production. Source-anchored names retain both labels when clips merge; an explicit rename replaces the merged label, while an unchanged name field creates no edit. Partially cut words use midpoint ownership with the same stable ID and original span.

Do not mark item 13 or the overall plan complete until every open gate is resolved and the final current-tree checks pass.
