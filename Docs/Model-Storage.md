# Model storage and management

Settings → Models lists transcription models, shared language descriptions, installed status, download sizes/progress, and Download/Delete actions. Browser-only builds explain that folder management requires the desktop app.

The initial location is `Rescript Models` inside Electron userData. Choose folder selects a parent and creates a dedicated `Rescript Models` child. This changes future downloads only; the manifest continues to resolve installed files in earlier folders. Relocate models explicitly imports legacy CacheStorage/IndexedDB entries and moves all managed artifacts to the selected default.

`electron/model-storage.ts` owns the manifest and streams downloads to temporary files. Publication requires the expected byte count, file synchronization, and a checksum. Each relocation verifies both source and copy before atomically publishing the new location. Old copies are removed only after publication and verification. Per-file commits preserve usable files after interruption; retry finishes remaining copies/cleanup. Relocation errors survive restart. Delete operates only on registered model artifacts and never on project directories or source media.

The native process rejects deletion/relocation during active or starting processing, downloads, or imports. Job startup rejects an in-progress storage mutation. Model loading and Settings share the same manifest, artifact list and configured directory. `app://localhost/__model` serves only registered speech model artifacts. Whisper uses a custom cache adapter; Parakeet uses direct artifact URLs. Alignment/VAD/diarization auxiliary caches retain their existing behavior and are not exposed as transcription models.

Legacy cached models migrate in 4 MiB bridge chunks before inference or an explicit Settings operation. Their cache copies are discarded only after native publication. New downloads are owned by the native process and remain independent of Settings visibility. The hidden processing runner reports download progress before inference. CPU fallback may require the alternate artifact variant.

Verification: `tests/model-storage-test.ts` covers downloads, concurrency, availability, mutation locks, relocation/restart without network, failure preservation, import bounds, and project isolation. `tests/model-capabilities-test.ts` covers supported speech versus language forcing and pre-job rejection. Runtime checks use an isolated profile, real cached/downloaded Whisper files, and Settings controls.

Completed acceptance: Implementation-Progress.md stages 24–26, 29, and 36–37 record transfer failures/retry, actual Parakeet inference and offline relocation, killed-process recovery, renderer import cancellation, and installed Settings actions. Shared native mutation/start guards and focused storage tests cover concurrent callers. The full plan audit is separate and recorded in stage 44.
