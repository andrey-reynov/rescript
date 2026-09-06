# Acoustic silence and speech detection

Open **Silence detection** from the timeline tools menu. Analyze audio uses the prepared original audio; it does not require a transcript. The background worker measures frame RMS and Silero speech probability independently. A failed VAD load is an error, never a substitute amplitude detector labeled as speech detection.

The default legend is blue = low amplitude, yellow = no speech, green = both. Change the legend colors and visibility in the dialog. The narrow colored lane sits between the word blocks and waveform. Selecting a region preserves the playhead; right-click uses the waveform's source-time targeting and adds Delete detected region. A focused region supports Delete/Backspace. Resulting red deletion ranges use the existing resize/restore controls.

Amplitude threshold can be absolute dBFS or a percentage of the average frame RMS, weighted by source duration. No-speech uses a separate speech-probability threshold. Minimum duration filters each detector independently before the overlap visualization is built. Detector settings and colors persist in the project; changing them never cuts audio or reruns transcription.

**Auto Cut** acts only when Delete detected regions is pressed. Choose overlap, amplitude, no speech, or either detector. It merges gaps up to the selected duration, then retains the requested handles before/after neighboring speech. Handles are not added outside source edges. The original source and word timestamps remain intact, and a single Undo reverses the operation.

The former Remove silences transcript cleanup is now labeled **Cut transcript gaps**. It remains a word-gap operation; it must not be presented as measured acoustic silence.

## Processing and storage

- `SilenceJobs` reads bounded 60-second source chunks with 64 VAD frames of left context. Analysis never replaces the transcription job/checkpoints.
- Results checkpoint in the project's existing cache directory. Pause/restart resumes missing batches; invalid batches are recomputed. Complete results are reused on reopen. Source fingerprint guards against using another source's cached analysis.
- A separate hidden renderer owns the analysis worker, with background throttling disabled and an app-suspension blocker while running. Editor reload/close does not own its lifetime.
- Top-bar progress and pause/resume remain available when the dialog closes. Native guards prevent conflicting transcription and model-file mutations.
- The 32 ms frame data is derived cache data. Project settings and resulting edits are saved normally; moving a project without its cache requires analyzing its source again. Neither source media nor exported cuts are changed by detection itself.

## Verification

- `silence-analysis-test.ts`: loud no-speech versus quiet speech, overlap, RMS, absolute/relative thresholds, minimum duration, handles and immutable input.
- `silence-jobs-test.ts`: bounded reads, VAD context, saved checkpoints, pause/restart, corrupted-batch retry, and untouched transcript/edit data.
- `silence-state-test.ts`: explicit cuts, Undo, settings in project payload and one-hour projection responsiveness.
- Isolated runtime on 42.4106875 seconds: 1,326 actual speech probabilities, all three colors, analysis without edit changes; explicit cuts changed one existing deletion to six and Undo restored it with source word times intact. A 20% threshold persisted through reopen. A fresh analysis completed after reloading the editor.

Final release audit still includes installed-build operation, representative gameplay/music validation, and integration with the remaining editing requirements.
