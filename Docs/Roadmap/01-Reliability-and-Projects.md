# v0.1 — Reliability & Projects

Status: in progress. See [validation evidence and remaining work](01-Validation.md).

## Deliver

- Explicit project create/save/load and Save As for variants. Persist source references, transcript blocks, speaker metadata, cut decisions, detector regions, alignment corrections, subtitle edits when supported, job state, settings, and useful UI state.
- Continuous incremental autosave, durable commits, visible save/error status, and crash recovery. Add retained recovery snapshots for corruption or accidental bulk edits; autosave alone is not version history.
- Persistent source-media identity and paths; use relative paths where useful plus stored original locations and identifying metadata. Offer relinking when files move, validate the replacement, and persist the repaired reference.
- Chunked/batched transcription with bounded concurrency, progress, immediate checkpoints, pause/cancel/resume, failed-chunk retry, and selected-chunk retranscription. Chunk duration and overlap are tunable implementation choices.
- A transcription worker independent of UI focus, minimization, display sleep, and renderer survival. UI reconnects to durable job state after restart. A worker failure must not take down the UI.
- Investigate and fix white-screen failures using evidence. Virtualize transcript rows, load data progressively, cache waveforms, and update only affected regions. Avoid a giant reactive transcript or repeated whole-project recomputation.

## Acceptance criteria

- Save, close, reopen, and recover a project with the same edits and completed transcription. Moved media can be relinked without rebuilding the edit.
- Force-stop the renderer, worker, and application separately. Completed committed chunks survive; restart retries incomplete work without duplicated text or skipped boundaries. Define and display any autosave window for uncommitted edits.
- During a long transcription, switching apps, minimizing, and turning off the display do not interrupt processing. Renderer restart does not terminate the worker. Actual OS suspension/power loss may pause computation; recovery must resume safely afterward.
- Test representative 40–50 minute and approximately 2.5-hour recordings. Scrolling, searching, playback navigation, and editing stay usable during and after transcription, with no white screen. Record test hardware, response times, and memory use; establish measured regression budgets.
- Recovery snapshots restore a consistent prior project state, and save failures are visible rather than reported as success.

## Implementation guidance

Inspect lib/projects.ts and lib/autosave.ts first: the current implementation uses IndexedDB and debounced saves, which does not by itself satisfy durable checkpoints, snapshots, or persistent external-media relinking. Evaluate a versioned transactional store such as SQLite against the actual stack. Keep caches disposable and committed project data authoritative. Inspect hooks/useTranscriber.ts and workers/transcription.worker.ts: renderer-owned Web Workers do not provide renderer-independent job lifetime. Use stable chunk IDs, idempotent commits, overlap deduplication, global timestamp offsets, and source/model/settings identity for safe resume. Test real crash boundaries and measured long-project responsiveness.
