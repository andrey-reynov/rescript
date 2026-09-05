# Rescript by Reynov — Roadmap

## Product goal

A local-first, transcript/audio-centric rough-cut editor for commentary-heavy gameplay and long recordings: import media → transcribe → read and edit speech → make a non-destructive structural cut → finish in an NLE.

**Do not turn this into a full Resolve replacement.** Focus on reliable basic editing; leave advanced effects, compositing, grading, and finishing to Resolve, Premiere, or another NLE.

## Status and sequencing

The v0.1–v0.3 labels below are planning milestones, not replacements for the inherited application's version number (currently 1.1.12). These documents describe desired behavior, not claims that each feature is implemented.

Completed fork setup: cloned the fork, built the desktop app with the title **Rescript by Reynov**, and removed the automatic updater and upstream update feed. Updates currently require manual installation.

Repository inspection found existing IndexedDB project storage, debounced autosave, a language selector, alignment tools, and timeline exporters. Evaluate and extend these implementations before replacing them. Their presence does not establish that they meet the acceptance criteria.

| Stage | Focus | Status |
| --- | --- | --- |
| [v0.1 — Reliability & Projects](01-Reliability-and-Projects.md) | Durable projects, recovery, resumable transcription, background processing, performance | First implementation priority |
| [v0.1.5 — NLE Export & Audio Mapping](02-NLE-Export-and-Audio-Mapping.md) | Stereo/discrete/source-layout export, linked audio/video, Resolve validation | Implemented; [validation and limits](02-Validation.md) |
| [v0.2 — Language & Transcript Model](03-Language-and-Transcript-Model.md) | Source-language transcription, speech blocks, repairable speaker metadata | Planned |
| [v0.3 — Silence & Alignment](04-Silence-and-Alignment.md) | Independent detectors, reviewable autocut, timing correction, source handles | Planned |
| [Multi-track Audio](05-Multi-track-Audio.md) | Transcribe the mic; cut linked tracks synchronously | Later |
| [Manual KEEP Markers](06-Manual-KEEP-Markers.md) | Protect gameplay and non-speech moments | Later |
| [Visual Navigation](07-Visual-Navigation.md) | Optional filmstrip and thumbnails | Later |
| [Subtitles](08-Subtitles.md) | Generate and edit captions from the transcript | Later |
| [NLE Interoperability](09-NLE-Interoperability.md) | Reliable export, relinking, sync, extendable handles | Broader validation later; early audio mapping belongs to v0.1.5 |
| [Optional Fork Updates](10-Optional-Fork-Updates.md) | Opt-in updates from this fork's releases only | Explicitly deferred |

Reading order: v0.1 → v0.1.5 → v0.2 → v0.3 → v0.4+ gameplay/multi-track work. Document numbers follow this order; version labels are unchanged. Later-stage scope includes OBS mic/game/Discord tracks, chosen transcription track, synchronized cuts, KEEP markers, visual navigation, and richer subtitles. Exact later release versions remain to be decided.

## Documentation conventions

Keep detailed scope, acceptance criteria, and implementation notes in each stage document. Update its status only with validation evidence. Keep the overview synchronized with stage changes. Other documentation will live under Docs when requested; this change adds roadmap material only.

## Principles

- Run core media processing, transcription, project storage, and editing locally. External AI services may be optional; they must not be required for the core workflow.
- Preserve original media. Store source references and edit decisions, not destructive trims or compulsory duplicate media.
- Prioritize reliability and project persistence before adding editing features.
- Keep speech, speaker labels, detector results, and editing decisions distinct. Recognition errors must remain easy to correct.
- Treat automatic cuts as reviewable, reversible proposals. Silence or missing transcription is not automatically unwanted footage.
- Keep source-time coordinates authoritative; derive edited timeline positions through an explicit mapping. Preserve recoverable footage around every cut.
- Support undo/redo and persist user corrections. Background work must not silently overwrite them.

## Observed issues to reproduce

| Observation from testing | Investigation guidance |
| --- | --- |
| Transcription stopped when the app lost focus; screen-off/GPU state may also be involved. | Reproduce focus, minimize, display-off, and renderer lifecycle cases independently. GPU shutdown is a hypothesis, not an established cause. |
| Interrupted transcription had no resume. | Persist completed work and resume only incomplete/invalid chunks. |
| A long job ended in a white-screen renderer failure. | Capture renderer/worker exits, errors, RAM/VRAM usage, and relevant logs; investigate crashes, hangs, and resource exhaustion. |
| The completed transcript caused substantial computer/UI lag, including on a roughly 40–50 minute video. | Profile rendering, reactive updates, data loading, waveform generation, and memory growth. |
| Russian speech appeared as English text despite a desire for Russian transcription. | Inspect task/language settings and backend behavior; forced translation is suspected, not confirmed. |
| Alignment was about 1–2 seconds off with gameplay audio. | Check extraction offsets, sample rates, chunk offsets, timebases, and alignment quality; gameplay audio is only a suspected contributor. |
| A two-person recording received excessive incorrect labels, such as “Speaker 8.” | Treat diarization as fallible metadata, not the structural basis of editing. |
| Updated user testing: XML reconstructs the edited timeline in Resolve and automatically relinks after the original MP4 is added to the Media Pool. Stereo channels currently appear as two separate mono timeline tracks. | Preserve the working relinking flow; address stereo/discrete/source-layout representation and linked video/audio in [v0.1.5](02-NLE-Export-and-Audio-Mapping.md). These are user-reported test results. |

## Implementation guidance for future agents

1. Map the repository’s transcription lifecycle, process ownership, project storage, transcript state/rendering, media timebases, and export adapters. Reproduce the reported failures before claiming their causes.
2. Implement v0.1 first. Prefer a versioned transactional store such as SQLite if compatible with the stack; keep disposable caches separate from authoritative project data. Make migrations safe and retain recoverable backups.
3. Model source assets/tracks, timed speech blocks, optional speakers, detector intervals, edit ranges, and chunk jobs separately. Use stable IDs and a consistent source-time representation; perform explicit conversions at sample/frame/export boundaries.
4. Make chunk commits idempotent. Store source identity, source interval, settings/model identity, status, and results. Handle overlap deduplication and global timestamp offsets. Resume must detect changed media/settings and explain necessary invalidation while preserving user edits.
5. Isolate heavy processing and bound memory/concurrency. Send incremental progress to the UI; keep logs sufficient to diagnose failures without requiring cloud uploads. Distinguish screen-off from actual machine suspension.
6. Add focused regression fixtures for persistence/recovery, chunk boundaries, Russian transcription, diarization correction, silence intersections, alignment, cut handles, and NLE round trips. Test mixed gameplay audio and long projects, not only short clean speech.
7. Ship small, reviewable milestones. Report implemented behavior, validation evidence, and remaining limitations. Do not expand scope into a full NLE or claim fixes based on unverified architectural assumptions.
