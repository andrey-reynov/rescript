# Later — Optional Visual Navigation

Status: planned; lower priority than reliable transcript/audio editing.

## Goal and scope

Add lightweight filmstrip/thumbnails so users can find visual gameplay events or walkthrough sections without listening through the recording.

- Make the filmstrip optional and preserve the transcript-first workflow.
- Clicking a thumbnail seeks playback and synchronizes transcript/timeline navigation.
- Show the distinction between original-source positions and positions in the edited cut.
- Load thumbnails progressively and cache them as disposable project assets.

## Acceptance criteria

- Users can locate a visible gameplay moment, seek to it, and reach the corresponding transcript/audio position.
- Navigation remains correct around deleted ranges.
- Enabling the filmstrip does not cause full-video decoding, unbounded memory growth, or long-project UI freezes.
- Hiding it does not change edits, markers, or project data.

## Implementation guidance

Generate thumbnails in bounded background work and render only the visible area. Reuse source-time mapping and invalidate caches when source identity changes. This is navigation support, not a move toward a full visual effects editor.
