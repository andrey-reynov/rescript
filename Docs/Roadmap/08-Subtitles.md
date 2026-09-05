# Later — Subtitle Generation & Editing

Status: planned. Depends on a stable transcript model and source-to-edit time mapping.

## Goal and scope

Generate subtitles from the transcript and let users correct wording, split captions, adjust timing, and choose which speech appears as captions.

- Reuse transcript text and speech timing as the initial source.
- Keep caption-specific edits separate where necessary; do not silently overwrite deliberate caption changes during retranscription.
- Map captions onto the edited timeline, excluding removed footage.
- Support subtitle preview and suitable subtitle exports. Inspect existing export capabilities before extending them.
- Keep advanced caption animation/compositing outside the core scope.

## Acceptance criteria

- Captions follow the retained spoken content after cuts and gap removal.
- Editing text and splitting a caption produces the intended preview/export.
- Correcting speech alignment updates derived timing predictably; extending a footage handle does not stretch the spoken caption.
- Save/load and undo/redo retain caption edits.
- Russian text exports correctly, and captions do not run beyond the relevant retained interval.

## Implementation guidance

Use stable transcript references with explicit caption overrides. Define behavior when a referenced block is split, merged, deleted, or retranscribed. Validate timestamp rounding and subtitle boundaries against actual playback and exported files.
