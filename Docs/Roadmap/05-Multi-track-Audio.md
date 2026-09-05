# Later — Multi-track Audio

Status: planned. Depends on durable projects, explicit source-time mapping, and editable cut ranges.

## Goal and scope

Support OBS recordings containing separate microphone, game, Discord, and stream-mix audio. Let the user choose the microphone track for transcription while edits apply synchronously to all linked audio/video tracks.

- Expose track names, channel layouts, and selection for transcription and playback.
- Store stable track identity, source offsets, sample rates, and linkage in the project.
- Preserve source handles for every linked track.
- Keep transcription-source selection separate from playback/export selection. A stream mix may duplicate other tracks, so make routing explicit.
- Use the selected commentary track for voice-based autocut; speaker identification must not be assumed reliable on mixed audio.

## Acceptance criteria

- A recording with mic, game, and Discord tracks transcribes the selected mic without accidentally using the mix.
- A cut, restoration, or edge extension stays synchronized across linked tracks.
- Known sync transients remain aligned at the beginning, middle, and end of a long recording, including after NLE export.
- Save/load preserves track routing, identities, offsets, and linkage.

## Implementation guidance

Inspect media probing and extraction before choosing a track model. Derive cuts from shared source-time edit ranges rather than independently calculating each track's edits. Test differing sample rates, nonzero offsets, and absent/silent tracks. Avoid drift from repeated timebase rounding.
