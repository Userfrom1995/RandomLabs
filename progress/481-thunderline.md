# Progress - Thunderline (original rock-and-roll song, reproducible production)

- **Issue:** #481
- **Branch:** opencode/issue481-20260929105322
- **Status:** in-progress
- **Blueprint:** `ideas/2026-09-29-thunderline-rock-and-roll-song.md`

## Phase Roadmap

- **Active Phase:** Phase 2: Deterministic Render Engine and Master Audio (Complete, ready for review)
- **Phase 1: Composition Source and Lead Sheet:** [x] `score/song.json` (tempo map, key/meter, chord grid, melody pitches plus rhythm, original lyrics bound to phrases, arrangement map, master seed), [x] `score/mix.json` constants, [x] `score/blocklist.txt`, [x] MIDI plus printable sheet export path defined, [x] schema/parse test green (PR 1 target, Refs #481)
- **Phase 2: Deterministic Render Engine and Master Audio:** [x] stdlib-only `tools/render.py` synth voices (drums, bass, rhythm guitar, lead guitar, formant vocal), [x] `dist/master.wav` plus `dist/preview.wav` fallback render (no ffmpeg on PATH; ogg path wired for when it exists), [x] fixed WAV headers, [x] double-render hash test green (PR 2 target, Refs #481)
- **Phase 3: Stems and Reproducibility Audit:** [ ] four isolated stem buses (`vocals`, `guitars`, `bass`, `drums`), [ ] `tools/audit.py` (hash, peak/duration, lyric coverage, stem-null consistency, IP scan), [ ] `bash thunderline/repro.sh` green end to end (PR 3 target, Refs #481)
- **Phase 4: Pages Player and Lyric Sync:** [ ] `thunderline/index.html` plus `player/player.js` plus `player/player.css`, [ ] play/pause/seek, synced lyric display, stem mute/solo, volume, downloads, [ ] 390 px usable, accessible controls, empty/loading/error states, [ ] headless end-to-end play test green (PR 4 target, Refs #481)
- **Phase 5: Song Story Docs and Final Integration:** [ ] `thunderline/README.md` plus `thunderline/docs/` (story, chord/arrangement notes, mix notes, reproduction steps, original-work license) as one unified product view, [ ] full `repro.sh` green, [ ] final listen-and-iterate pass, [ ] Evaluator craft gate (Final PR, Closes #481)

- **Current step:** Phase 2 complete: stdlib-only `tools/render.py` renders the 156 s master in ~13 s (44.1 kHz mono 16-bit, peak at the 0.89 ceiling, zero clipped samples, no DC offset), four isolated stem buses, `manifest.json` provenance, and a preview (ffmpeg ogg when present, deterministic 22.05 kHz WAV fallback otherwise). Double-render SHA-256 identical across master, all stems, and preview. Section RMS shows no dead air and a final-chorus lift (0.211 vs ~0.17 verses). 36 tests green (14 score + 9 render + 13 tester pins). Stems ship pre-limiter by design so rare drum-transient int16 saturation in the stem WAV is documented, not a defect; the master is clean. `dist/` binaries stay gitignored (repo already ignores `dist/` and `*.wav`); Pages shipping is a Phase 4/5 decision.
- **Next steps:** Review Phase 2, then Builder implements Phase 3: Stems and Reproducibility Audit on the next run.

## Agent Log

- **2026-09-29, Architect:** Blueprint plus Phase Epic written (composition source, deterministic render, stems, Pages player, unified docs). Five capability-named phases; Refs #481 until the final master lands. Handing to the Builder for Phase 1.
- **2026-09-29, Builder:** Phase 1 built on the epic branch (resume mode, no restart). 104-bar extension of the binding skeleton (all skeleton sections at required lengths; choruses to 12, final to 16, plus verse3 and 8-bar intro/outro) so 160 BPM lands at 156 s. `export_score.py` plus 14-test gate green, double-export hashes identical, blocklist scan clean. Ready for review.
- **2026-09-29, Builder:** Phase 2 built on `opencode/issue481-thunderline-phase-2` from latest main (Phase 1 already merged). `tools/render.py` (stdlib only, seeded per-voice RNG streams, wavetable voices, formant vocal, one-pass bus EQ, soft-knee limiter) plus 9-test `tests/test_render.py` gate. Full suite green (36 tests). Ready for review.
