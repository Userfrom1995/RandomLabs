# Progress - Thunderline (original rock-and-roll song, reproducible production)

- **Issue:** #481
- **Branch:** opencode/issue481-20260929105322
- **Status:** in-progress
- **Blueprint:** `ideas/2026-09-29-thunderline-rock-and-roll-song.md`

## Phase Roadmap

- **Active Phase:** Phase 1: Composition Source and Lead Sheet
- **Phase 1: Composition Source and Lead Sheet:** [ ] `score/song.json` (tempo map, key/meter, chord grid, melody pitches plus rhythm, original lyrics bound to phrases, arrangement map, master seed), [ ] `score/mix.json` constants, [ ] `score/blocklist.txt`, [ ] MIDI plus printable sheet export path defined, [ ] schema/parse test green (PR 1 target, Refs #481)
- **Phase 2: Deterministic Render Engine and Master Audio:** [ ] stdlib-only `tools/render.py` synth voices (drums, bass, rhythm guitar, lead guitar, formant vocal), [ ] `dist/master.wav` plus `dist/preview.ogg` render, [ ] fixed WAV headers, [ ] double-render hash test green (PR 2 target, Refs #481)
- **Phase 3: Stems and Reproducibility Audit:** [ ] four isolated stem buses (`vocals`, `guitars`, `bass`, `drums`), [ ] `tools/audit.py` (hash, peak/duration, lyric coverage, stem-null consistency, IP scan), [ ] `bash thunderline/repro.sh` green end to end (PR 3 target, Refs #481)
- **Phase 4: Pages Player and Lyric Sync:** [ ] `thunderline/index.html` plus `player/player.js` plus `player/player.css`, [ ] play/pause/seek, synced lyric display, stem mute/solo, volume, downloads, [ ] 390 px usable, accessible controls, empty/loading/error states, [ ] headless end-to-end play test green (PR 4 target, Refs #481)
- **Phase 5: Song Story Docs and Final Integration:** [ ] `thunderline/README.md` plus `thunderline/docs/` (story, chord/arrangement notes, mix notes, reproduction steps, original-work license) as one unified product view, [ ] full `repro.sh` green, [ ] final listen-and-iterate pass, [ ] Evaluator craft gate (Final PR, Closes #481)

- **Current step:** Ready for initial build (Phase 1: Composition Source and Lead Sheet)
- **Next steps:** Builder to implement Phase 1: Composition Source and Lead Sheet with real code and zero stubs

## Agent Log

- **2026-09-29, Architect:** Blueprint plus Phase Epic written (composition source, deterministic render, stems, Pages player, unified docs). Five capability-named phases; Refs #481 until the final master lands. Handing to the Builder for Phase 1.
