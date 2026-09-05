# v0.1 validation and remaining work

Status: in progress. These checks do not establish completion of v0.1.

## Verified on 2026-09-05

- Project storage tests: empty projects, serialized atomic revisions, restarting the repository, recovery after corrupting the current file, moved-media relinking, rejection of a different source, Save As outside the default folder, retaining more than ten projects, and changing the default folder.
- Transcription storage tests: bounded 60-second chunks with 2-second context, source-time offsets, overlap ownership, duplicate checkpoint submission, pause/resume, process-like service reconstruction, a result committed before its manifest, and changed model settings. These are storage tests, not actual inference/crash tests.
- Autosave tests: continuous edits cannot postpone starting a save beyond the 500 ms scheduling window; an older acknowledgement does not hide newer edits; save failures remain visible; retry works after failure; closing a project clears its displayed name, thumbnail, and processing state. Disk completion can take longer than the scheduling window.
- Isolated Electron development app: imported the supplied `assets/example.mp4`, saved a transcript edit, returned to thumbnail cards, and reopened the edit. The source recording is excluded from Git.
- Search unit tests: case-insensitive Russian text, phrases crossing virtual row boundaries, and matches outside currently rendered rows.
- Search runtime check: located word 22,499, selected it, and verified its bounds were inside the visible editor. This caught and fixed navigation based solely on estimated row positions.

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

- Actual inference with the supplied clip; independent editor/worker/application crash tests with committed chunks; minimize, loss of focus, and display-off tests.
- Representative 40–50-minute and approximately 2.5-hour media tests, including audio extraction memory, inference, playback, search, and editing. Record total process memory and release-build timings.
- Selected-batch retranscription, recovery UX review, and safe Save As behavior while a job is active.
- Review project/worker completion races, source loading of large files, partial-result delivery, autosave write volume, and legacy browser-project access.
- Test native project-folder picker, Save As dialogs, graceful application exit, and installed release behavior. The File menu is wired and type-checked but its current version still needs a restarted native-app test.
- Verify transcript selection across unmounted rows and hide-deleted layout, and confirm speaker actions preserve logical speech-group semantics after rendering virtualization.
- Build and validate the Windows installer, update the user-facing documentation, and audit every v0.1 acceptance criterion before declaring completion.
