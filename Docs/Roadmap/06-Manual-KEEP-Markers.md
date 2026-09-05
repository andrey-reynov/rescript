# Later — Manual KEEP Markers

Status: planned. Integrate with commentary autocut and project persistence.

## Goal and scope

Let users protect a gameplay highlight or meaningful non-speech interval even when automatic detection would omit it.

- Create, name, resize, and remove KEEP ranges; support a keyboard action for marking moments.
- Display protected ranges in transcript/timeline navigation.
- Persist marker IDs and source-time boundaries independently of generated cuts.
- Give explicit KEEP ranges precedence over automatically proposed deletions.
- Make manual editing of protected footage deliberate and understandable; do not silently discard protection.

## Acceptance criteria

- Mark a firefight with no commentary, regenerate autocut, and verify the entire protected interval remains.
- Adjust or remove the marker and regenerate; the new proposal reflects the change.
- Save/load and undo/redo preserve marker boundaries and semantics.
- Protected regions can extend beyond speech while speech timestamps stay unchanged.

## Implementation guidance

Combine KEEP ranges with proposed retained intervals before producing final cuts. Specify behavior for overlap, source boundaries, linked tracks, and manual overrides. Protection should depend on original source coordinates, so earlier edits cannot shift a marker onto unrelated footage.
