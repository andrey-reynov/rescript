# v0.1 validation and remaining work

Status: in progress. These checks do not establish completion of v0.1.

## Verified on 2026-09-05

- Project storage tests: empty projects, serialized atomic revisions, restarting the repository, recovery after corrupting the current file, moved-media relinking, rejection of a different source, Save As outside the default folder, retaining more than ten projects, and changing the default folder.
- Transcription storage tests: bounded 60-second chunks with 2-second context, source-time offsets, overlap ownership, duplicate checkpoint submission, pause/resume, process-like service reconstruction, a result committed before its manifest, and changed model settings. These are storage tests, not actual inference/crash tests.
- Autosave tests: continuous edits cannot postpone starting a save beyond the 500 ms scheduling window; an older acknowledgement does not hide newer edits; save failures remain visible; retry works after failure; closing a project clears its displayed name, thumbnail, and processing state. Disk completion can take longer than the scheduling window.
- Isolated Electron development app: imported the supplied `assets/example.mp4`, saved a transcript edit, returned to thumbnail cards, and reopened the edit. The source recording is excluded from Git.
- Search unit tests: case-insensitive Russian text, phrases crossing virtual row boundaries, and matches outside currently rendered rows.
- Search runtime check: located word 22,499, selected it, and verified its bounds were inside the visible editor. This caught and fixed navigation based solely on estimated row positions.

## Actual inference and recovery checks

- The supplied 42.4-second example video completed local Whisper Base transcription with 45 words persisted in its project file.
- Retranscribed its selected batch, reloaded the editor during inference, and verified that the same separate processing target survived. After reopening the project, transcription finished with 45 words, a committed result identity, and the existing manual cut at 25–26 seconds preserved.
- Constructed a 127.23-second WAV by repeating the supplied clip's audio three times. After the first 60-second core batch committed, force-crashed the actual processing renderer through Chromium's crash command. The editor survived and displayed the resumable failure. Resume completed all three batches with 133 words and unique IDs. The first checkpoint's SHA-256 was unchanged before and after recovery.
- Added storage regression tests for a worker commit racing a late autosave: generated words stay authoritative while unrelated name/manual-cut edits are preserved. Acknowledged results remain editable.
- Added tests for selected-batch generations, restart, rejecting old-generation responses, preserving words/edits outside requested batches, and copying completed checkpoints into a distinct Save As project. Destination resumes at the next unfinished batch; the original remains paused.

These checks cover actual inference, renderer reload, and worker crash. Additional long-recording and full-application recovery results follow below.

## Synthetic transcript performance

Test environment: Windows, Intel Core i5-12400F, Electron development build with Next.js development server. These timings include development overhead and are not release budgets.

Fixture: 22,500 generated words with timestamps covering 150 minutes and two alternating speaker labels. Playback source was still the supplied 42.4-second example video. This is a transcript-scale test, not a representative 150-minute recording or full transcription test.

- At most 640 word elements mounted during twenty large scroll jumps.
- Scroll-to-paint samples: approximately 9–174 ms.
- Single-word deletion to paint: approximately 43 ms.
- Renderer JavaScript heap at measurement: approximately 71 MB; this excludes native, GPU, audio-decoder, inference-worker, and other process memory.
- Editing while scrolled near the end preserved scroll position after fixing an unwanted jump to the playhead.

Provisional development regression gates for this exact synthetic fixture: fewer than 2,500 mounted words, no single tested edit over 1 second, selected search result visible, and no forced return to the beginning after editing. Establish tighter release budgets from representative media tests before marking the milestone complete.

## Still required

- Forced editor crash; explicit minimize, loss-of-focus, and display-off tests.
- Representative 40–50-minute and approximately 2.5-hour media tests, including audio extraction memory, inference, playback, search, and editing. Record total process memory and release-build timings.
- Selected-batch UI currently operates on batches containing selected words; review recovery UX and verify Save As during an active job through the native dialog. Storage tests for checkpoint copying pass.
- Continue auditing autosave write volume and completion races. Partial-result delivery and legacy browser-project migration are implemented; migration still needs native end-to-end verification.
- Test native project-folder picker, Save As dialogs, graceful application exit, and installed release behavior. The File menu is wired and type-checked but still needs a native interaction test. Windows Computer Use could not see the shell-launched isolated test window; launching a dedicated isolated UI test runner timed out waiting for app approval. This leaves native dialog verification unproven.
- Confirm speaker actions preserve logical speech-group semantics after rendering virtualization. Cross-row drag selection and hide-deleted layout passed runtime checks.
- Build and validate the Windows installer, update the user-facing documentation, and audit every v0.1 acceptance criterion before declaring completion.

## Long-recording checkpoint results (2026-09-05)

Both fixtures repeat the supplied short recording as 16 kHz mono PCM WAV. They exercise real long-duration decoding and inference, but do not represent varied gameplay or transcription-accuracy benchmarks.

- 50-minute fixture: all 50 batches completed, 48,000,000 samples, 3,126 words. Elapsed time was approximately 1,227 seconds including debugging and interruptions, not an uninterrupted throughput benchmark.
- 150-minute fixture: all 150 batches completed, 144,000,000 samples, 9,355 words. Elapsed time was approximately 2,301 seconds including recovery and interruptions. The first-word deletion remained saved.
- Forced full application termination after six committed batches in the 150-minute run. Reopening and resuming preserved all six checkpoint hashes and the live transcript edit.
- Forced the isolated app GPU subprocess to exit near the end of the 50-minute run. Automatic CPU fallback completed transcription. A later GPU reset during the 150-minute run also recovered through CPU fallback.
- The initial long preparation failed after 148 minutes of audio with a decoder memory error. Resuming decoded the remaining two minutes successfully. Decoder recycling every sixteen batches and one restart/retry are now implemented; a fresh uninterrupted 150-minute preparation with recycling still needs verification.
- Sampled process-tree working sets were approximately 2.64 GB during the 50-minute run and 3.08 GB during the 150-minute run. These are development-build samples, not measured peaks. Hardware: Intel Core i5-12400F, approximately 31.8 GiB RAM.
- Audio preparation regression tests pass for bounded chunks, crash-tail truncation, duplicate delivery, pause/resume, finalization recovery, exact sample counts, and waveform generation.
- Progressive-result regression tests pass for live edits, stale autosaves, selected retry scope, and preservation of undo history as new batches arrive.
- Actual mouse drag across virtualized transcript rows selected 10,725 words. Hiding the first 160 deleted words placed word 160 first; undo restored test changes.
- Both TypeScript checks, seven relevant regression suites, and the Electron bundle build pass. Native-dialog migration, installed-release behavior, and the remaining acceptance criteria above are still open.