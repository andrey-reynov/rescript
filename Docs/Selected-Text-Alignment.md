# Selected text alignment

Select consecutive visible transcript words in one retained clip, right-click, and choose **Realign selected text**. Confirm the actual speech language and click **Realign**. This action measures the existing text against the original audio; it does not recognize replacement text, diarize speakers, alter cuts, or rerun the full video.

The first use may download a separate CTC alignment model. Supported alignment languages currently follow `lib/alignModels.ts`: English, Spanish, French, German, Portuguese, and Chinese. They are distinct from transcription model capabilities. An unsupported or Automatic language remains visible with an explanation; the action stays disabled until an actually supported speech language is selected. Do not choose an incorrect language merely to enable the action. Russian word timing remains editable manually.

The modal reports model-loading and inference progress. Cancel or Escape terminates the worker and leaves the previous timings intact; closing the renderer also discards unfinished alignment. Selected audio is read from the fingerprint-checked prepared cache in small source-time batches (roughly 20 seconds, maximum 60 seconds per read). It never loads the entire original video into the alignment worker. Pause an active transcription job before starting alignment.

Publication is atomic: all selected words must receive valid measured timing. An unalignable word such as bare digits is not silently interpolated and marked aligned. A failed, cancelled, stale, or partial result changes no word. Changes to the selected words, clip bounds, or source media invalidate publication. Text, IDs, optional speakers, phrase membership, deletion flags, and original correction provenance are preserved. A successful result is one undo step and is included in autosave/project data. Aligned timing is a model estimate, not a promise that caption timing needs no review.

## Evidence

- Focused tests: strict alignment identity/bounds/stale-result validation, provenance, phrases, undo/redo, autosave payload, and refusal to present interpolated digits as measured.
- Native range tests: exact 1.25–2.75-second PCM range, fingerprint propagation, unchanged transcription manifest, negative/nonfinite/oversized/out-of-source rejection.
- Isolated app with actual cached English CTC model and example audio: selected `Hello.` changed from 0.095–0.55 to 0.21909–0.50864 seconds. Other words, cuts, splits and phrase membership were unchanged; Undo restored the original word data.
- Cancel during Reading audio preserved all words. Correcting the selected word to `1985` then aligning returned the localized failure message and retained approximate timing. The isolated test project was restored afterward.
- Modal screenshot inspected; shared dropdown/buttons, Russian labels and Escape dismissal verified. Additional multi-batch, corrected multi-word and language-specific runtime coverage remains part of the final acceptance audit.
