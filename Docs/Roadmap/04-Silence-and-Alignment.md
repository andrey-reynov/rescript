# v0.3 — Silence & Alignment

Status: planned; audit existing behavior before implementation.

## Deliver

- Maintain two independent interval sets: **amplitude-below-threshold silence** and **VAD/no-speech regions**. Quiet speech and loud non-speech are possible; neither detector’s intervals are guaranteed to contain the other’s.
- Visualize both detectors in the transcript and timeline. Use **blue for one detector, yellow for the other, and green for overlap**. Provide a configurable, labelled legend because the original color-to-detector description was ambiguous. Initial mapping: blue = amplitude silence; yellow = VAD/no speech; green = intersection. Include labels/patterns so meaning is not color-only.
- Do not equate either detector or overlap with deletion. Add configurable commentary autocut: detector/source choice, thresholds, minimum durations, pre/post speech handles, and merge-gap rules. Preview the proposal and allow reversal and manual overrides.
- Preserve full source references and available handles so users can extend cut edges to restore gameplay before/after speech, including later in an NLE.
- Support manual timestamp/alignment editing, draggable start/end boundaries, keyboard nudging, and re-aligning a selected block. Show changes against audio playback/waveform.
- Separate **speech timestamps** (where speech occurs) from **editing ranges** (what footage is retained). Extending footage must not falsely lengthen speech or subtitles; realignment must not silently replace deliberate edit ranges.

## Acceptance criteria

- Fixtures containing quiet speech, loud gameplay without speech, and true silence show independent detector regions and correct green intersections in both views. Changing the legend mapping does not change detection or cuts.
- Autocut settings produce inspectable ranges with expected handles and gap merging; merely enabling visualization deletes nothing.
- Correct a known 1–2 second alignment offset manually and through selected-block realignment. Unselected blocks remain unchanged; corrections persist and can be undone.
- Extend a retained clip into previously omitted source footage up to the source limits. Text/speech timing remains distinct from the extended edit range.

## Implementation guidance

Inspect lib/silences.ts, lib/vad.ts, alignment modules, lib/edits.ts, and timeline controls. Store detector results independently from proposed edit ranges. Use interval intersection for overlap coloring, and union expanded speech/KEEP intervals when generating retained ranges. Clamp handles to source bounds. Apply explicit source-to-edited-time conversion and avoid repeated rounding. Reproduce the reported alignment offset before attributing it to gameplay audio; test extraction and chunk timebases as well as alignment quality.
