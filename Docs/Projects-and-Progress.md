# Opening projects and processing progress

Saved desktop projects open directly against the original source media. Playback and transcript editing can begin while background audio preparation runs.

After migrating an older project, preparation may run once to create the audio cache and waveform. The saved transcript and edits are retained; this does not request transcription again.

The status shows separate stages: reading source media (percentage of source bytes read), building waveform (percentage of source audio prepared), and transcription when requested. Percentages restart when the stage changes. Operations without a known total show activity instead of an invented percentage. After ten seconds without a reported update, the status also shows how long ago progress last changed; that alone does not prove a stall.

The waveform fills in as each minute of audio is saved. Pause processing retains completed audio checkpoints; Resume processing continues preparation. Reading the source may repeat after resuming, but saved decoding work is reused. Later openings reuse the finished waveform cache.

The waveform is rendered as a cached bitmap for the current timeline view. Zooming and scrolling refresh it at the appropriate resolution; hovering does not rebuild it. No extra PNG or JPEG is required.

Use File > Close Project to save pending edits and return to the project manager. This menu item has no keyboard shortcut. Preparation labels are limited to two words: Reading media, Preparing audio, and Restarting decoder.
