# Later — NLE Interoperability & Export Validation

Status: planned for broader later validation. The early stereo/channel-mapping work is a separate [v0.1.5 milestone](02-NLE-Export-and-Audio-Mapping.md), placed between v0.1 and v0.2.

## Goal and scope

Hand off the transcript-driven structural edit to Resolve, Premiere, and other selected NLEs for finishing, while preserving the original media, sync, and extendable handles.

## Updated testing baseline

Later user testing confirmed that the XML reconstructs the edited timeline and automatically relinks when the original MP4 is added to the Resolve Media Pool. This supersedes the earlier unresolved relinking observation for that tested workflow. The remaining reported issue is stereo audio represented as independent mono tracks; v0.1.5 owns that improvement. Preserve filename-based relinking and original-source handles while broadening format support. These are user-reported results, not a new independent XML inspection.

## Deliver

- Inspect the actual XML format and its media references before changing the exporter.
- Validate filenames, encoded paths/URLs, source duration, frame rate, timecode, reel information where relevant, and source in/out versus timeline in/out.
- Preserve full original-source references rather than exporting only baked trimmed clips.
- Support relinking after source media moves.
- Preserve linked track identities, offsets, and channels as multi-track support develops.
- Document which NLE versions/formats were actually tested and any limitations.

## Acceptance gate

Actual import into every claimed target editor is required; well-formed XML alone is insufficient.

- Cuts and retained durations match the project at the beginning, middle, and end of a long recording.
- Audio and video remain synchronized without accumulating rounding drift.
- The source relinks after being moved, without rebuilding cuts manually.
- Dragging either clip edge outward recovers available original footage.
- Multi-track routing and sync survive export where supported.
- Import/export errors explain actionable incompatibilities.

## Implementation guidance

Start with existing timeline serializers and fixtures. Use a consistent source-time model and explicit frame/timecode conversion at the export boundary. Validate one target/format at a time using small known-cut fixtures plus a long recording. Fix evidence-backed compatibility problems before expanding formats.
