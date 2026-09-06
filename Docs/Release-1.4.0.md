# Rescript by Reynov 1.4.0

- Manage transcription models in Settings: download, delete, choose a default folder, and relocate existing model files with verification.
- Model descriptions and transcription language choices now follow each model's capabilities. Parakeet v3 uses automatic language detection; English-only models stay English-only.
- Analyze amplitude silence and no-speech regions independently, with configurable blue/yellow/green highlighting, background progress, pause/resume, and saved checkpoints.
- Apply silence cuts explicitly with adjustable thresholds, gap merging, source handles, and undo. Detection alone never deletes audio.
- Keep overlapping transcript words visible and show hidden selected-word counts in deleted blocks. Long deletion durations use a compact time display.

## Validation

Renderer and Electron type checks, 13 focused regression suites, and lint passed (two existing warnings). Windows installer rebuilt for this version. Earlier isolated runtime checks covered model relocation and offline reuse, real acoustic analysis, explicit cuts and undo, and analysis completion across editor reload.

## Remaining work

This release delivers the current completed changes; it does not complete every item in PLAN.md. Selected correction realignment, comprehensive installed bilingual/Parakeet and migration checks, representative gameplay/music validation, and remaining long-video and keyboard interaction audits are still planned.

Windows build is unsigned. Automatic updates remain disabled. No transcription models are bundled with the installer.
