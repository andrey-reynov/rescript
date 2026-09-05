# v0.1.5 — NLE Export & Audio Mapping

Status: planned. Dedicated milestone after v0.1 Reliability & Projects and before v0.2 Language & Transcript Model. Document 02; later roadmap documents are renumbered to retain reading order. Milestone version labels remain unchanged.

## Purpose

Make ordinary stereo source files appear in Resolve and other supported NLEs as normal linked stereo audio, while preserving discrete-channel export as an option. This is an early improvement to the core ReScript → Resolve workflow, separate from later OBS/multi-track editing.

## Latest testing baseline

The user confirmed that the exported XML reconstructs the edited timeline successfully in Resolve. Importing the original video into the Media Pool automatically relinks the timeline.

The reported XML references source audio track 1 separately from source audio track 2, producing:

```text
V1  Video
A1  Left / Channel 1
A2  Right / Channel 2
```

The preferred representation for ordinary stereo media is:

```text
V1  Video
A1  Stereo L+R
```

These are user-reported test results, not a new independent XML inspection in this documentation task. Preserve the working timeline reconstruction and relinking behavior.

## Audio Export Mode

Add an Audio Export Mode setting to NLE/XML export:

- **Stereo**
- **Discrete Channels**
- **Preserve Source Layout**

### Stereo

Default to this mode for ordinary two-channel stereo media.

- Export one stereo audio item on A1 alongside its video item on V1.
- Map source channel 1 to stereo left and source channel 2 to stereo right.
- Keep the stereo item linked/grouped with the corresponding video item.
- Describe the original source media as stereo in the destination format.
- Do not render, remix, merge source data destructively, or create another audio file merely to achieve stereo representation.
- Do not infer that every two-channel recording is semantically stereo. For unsupported layouts, expose an explicit supported choice or limitation instead of silently downmixing.

### Discrete Channels

Preserve the current behavior for users who want independent channel access:

```text
V1  Video
A1  Source channel 1
A2  Source channel 2
```

Keep source identity, channel ordering, cuts, and sync intact.

### Preserve Source Layout

Inspect the actual media layout and reproduce it as faithfully as the target format permits:

| Source layout | Intended representation |
| --- | --- |
| Two-channel stereo | Stereo |
| Mono | Mono |
| Multichannel | Corresponding source channels/tracks |

Document format limitations and any explicit fallback. Do not claim source-layout preservation based only on channel count. This option establishes a foundation for future routing without implementing full OBS editing now.

## Source structure versus timeline representation

Source audio structure and exported timeline representation are different concepts. Internally, retain the original channel identity:

```text
Source
├── Channel 1
└── Channel 2
```

The export setting controls the destination representation, not the internal source data. Exporting a project as stereo must not prevent later discrete exports or advanced routing.

## Video/audio linking and cuts

- Each video and stereo audio pair belongs to the same logical clip group.
- Each retained ReScript segment produces corresponding source and timeline ranges for video and audio.
- Resolve should recognize those items as belonging together where supported.
- Linked movement and trimming in the finishing editor should behave like ordinary video+audio clips.
- Inspect and adapt the existing grouping/link metadata rather than redesigning the export architecture.
- Preserve full original-media references and source handles so omitted footage can be recovered by extending clip edges.

## Preserve working source relinking

The user's successful sequence was:

1. Export XML from ReScript.
2. Import the XML timeline into Resolve; the source may initially be offline.
3. Import the original MP4 into Resolve's Media Pool.
4. Resolve automatically links the XML timeline to that media.

The user reports a correct source filename with a minimal path URL, such as `file://localhost/cs_challenge-.mp4`. Preserve compatibility with this tested filename-based relinking. A more robust path strategy is acceptable only if it retains portability and does not regress the working flow.

## Acceptance criteria

Use the same normal stereo MP4 and the same ReScript edit for all three modes. Choose distinguishable left/right content so channel mapping can be checked by listening, not merely by track labels.

### Stereo

- Resolve shows one video track (V1) and one stereo audio track (A1).
- Left content plays on the left and right content on the right.
- Audio follows the same cuts as video and stays synchronized throughout.
- Video and audio linking works for movement and trimming where supported.
- Importing the original source into the Media Pool relinks the timeline.
- Cut boundaries remain editable, and both edges can extend into available original media.
- No newly rendered/remixed source audio file is required.

### Discrete Channels

- Resolve shows video on V1, source channel 1 on A1, and source channel 2 on A2.
- Existing channel separation remains available with correct channel content.
- Cuts, sync, relinking, and extendable handles remain intact.

### Preserve Source Layout

- The stereo fixture imports as stereo with correct channel mapping.
- Additional mono and multichannel fixtures retain the corresponding layout to the extent the target format supports it.
- Unsupported representations produce an explicit documented limitation/fallback, not silent channel loss or remixing.

### Cross-mode and regression checks

- Switching export mode does not mutate source channels, transcript data, or project edit ranges.
- Exporting again in another mode remains possible from the same project.
- Inspect serialized channel/group metadata and import the results into Resolve; well-formed XML alone is insufficient.
- Record the tested Resolve version and export format. Validate any other editor before claiming compatibility.
- Test several cuts at the beginning, middle, and end to catch timebase, grouping, or channel-index errors.

## Implementation guidance

Start with the existing export dialog, source-media metadata, timeline serializers, and export tests. Introduce a small explicit audio-export-mode abstraction and translate it through each supported format adapter. Keep channel identity separate from target track placement. Verify the existing grouping logic and target XML semantics against real import behavior before selecting an encoding.

## Scope boundary

Do not implement full OBS/multi-track audio editing in this milestone. Track selection for transcription, microphone/game/Discord routing, and synchronized multi-track editing remain later work. This stage establishes reusable export semantics only.

Broader format support and long-term interoperability are covered by [NLE Interoperability](09-NLE-Interoperability.md).
