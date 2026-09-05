# v0.1.5 validation — NLE Export & Audio Mapping

Validated 2026-09-05 on Windows with DaVinci Resolve Studio **21.0.4.5**. Tests used an isolated Resolve project and a separate Rescript profile; original editing projects were not modified.

## Delivered behavior

- Timeline export exposes Stereo, Discrete Channels and Preserve Source Layout. A single source stream explicitly identified as stereo defaults to Stereo; mono and other layouts default to Preserve.
- Source stream index, channel count, sample rate and layout are inspected independently of waveform/transcription output, retained in project saves, and restored on reopen. Exporting does not modify channels, source media, transcript or cuts. The metadata worker terminates after inspection and does not share the rendering worker.
- Resolve Stereo and single-stream multichannel Preserve use **FCPXML**. Resolve Discrete and mono use **XMEML**. Filename extensions and help text follow the selected representation. Tested XMEML stereo variants continued to import as mono, so stereo uses the format actually verified in Resolve.
- XMEML contains explicit source channel counts, per-channel indices, reciprocal video/audio links, full source duration and source in/out ranges. FCPXML uses a single linked asset per edit with explicit source channel components. No audio is rendered or remixed by NLE export.
- Ordinary waveform and ruler clicks seek without Alt. Shift-wheel pans over the toolbar and waveform without zooming. Space plays from the new position.

## Resolve acceptance results

Two sources were used: the existing 42.4-second stereo example, and a generated 12-second, 30 fps stereo MP4 with 440 Hz on the left and 880 Hz on the right. Each edit kept three regions near the beginning, middle and end.

| Check | Result |
| --- | --- |
| Stereo | V1 + one stereo A1; each segment maps source channels `[1,2]` |
| Discrete | V1 + mono A1 `[1]` and mono A2 `[2]` on every segment |
| Preserve on stereo | Same linked stereo representation as Stereo |
| Video/audio timing | Three matching segment ranges; six seconds total for the synthetic fixture, ten seconds for the original example |
| Clip linking | Every video segment reports one linked audio item in Stereo/Preserve, two in Discrete |
| Source handles | Original example reports left offsets 60/510/1050 frames and right offsets 1122/672/102 frames; full source remains available beyond both cut edges |
| Relinking | Import timeline without importing source: offline. Import the original MP4 into Media Pool: clips automatically become online, with correct channel mapping, in all three modes |
| Stereo audio content | Resolve-rendered PCM retains 440 Hz left and 880 Hz right in all three cuts, with measured cross-channel leakage below −98 dB; exact six-second duration |
| Discrete audio content | Isolated Resolve renders of A1 and A2 retain 440 Hz and 880 Hz respectively in all three cuts |
| Mono source | Discrete and Preserve both import as one mono track |
| 5.1 source | Preserve imports as one 5.1 track with channels `[1,2,3,4,5,6]`; Discrete imports as six corresponding mono tracks |

Rescript's production renderer was also exercised: all three downloads have the expected extension/content, source metadata is persisted, and words/cuts remain unchanged. Timeline click, playback and Shift-wheel behavior passed real pointer/keyboard input tests.

## Explicit limits

- **Multiple independent audio streams are rejected for now.** A two-mono-stream MP4 exposed a Resolve import limitation: channel 2 mapped to channel 0 (silence), including with Resolve's own exported XMEML. Export shows a clear error instead of silently dropping a channel. Single-stream multichannel audio is supported; full OBS routing remains a later milestone.
- An unspecified layout in one stream falls back to discrete channels with a visible explanation. No automatic downmix is performed.
- Premiere uses XMEML with stereo grouping metadata or discrete channels; larger preserved layouts require choosing Discrete. Its XML structure is regression-tested, but **Premiere was not available for a real import test**. Final Cut has the same real-application validation limitation. Neither is claimed as independently verified here.
- The existing AAF scaffold accepts two discrete channels only; other audio layouts/modes report an error. AAF binary/export regression checks and the pyaaf2 round-trip check pass.
- First inspection of an older project may read its source media to provide it to the metadata worker. Progress is shown during that read and the resulting metadata is saved, avoiding repeated inspection. This does not rebuild transcription or waveform caches.

## Rechecking changes

Run `tsx tests/audio-export-test.ts`, `tsx tests/serialize-timeline-test.ts`, and `tsx tests/ffmpeg-watchdog-test.ts`, both renderer and Electron TypeScript checks, and ESLint on the changed renderer/export modules. Build the desktop installer with publishing disabled.

For an NLE acceptance rerun, generate stereo MP4 with distinguishable left/right tones, choose source ranges 1–3, 5–7 and 9–11 seconds from a 12-second source, and export all three modes. In Resolve verify track subtypes, source mappings, linked items, matching ranges and available source offsets. Import once with the source absent from Media Pool, then add it and verify automatic relinking. Render Stereo/Preserve and each isolated Discrete track and inspect channel content. Repeat Preserve/Discrete with mono and 5.1 fixtures; verify multiple-stream rejection rather than accepting silent channels.
