# Progress - Thunderline (original rock-and-roll song, reproducible production)

- **Issue:** #481
- **Branch:** opencode/issue481-thunderline-phase-3
- **Status:** in-progress
- **Blueprint:** `ideas/2026-09-29-thunderline-rock-and-roll-song.md`

## Phase Roadmap

- **Active Phase:** Phase 3: Stems and Reproducibility Audit (Complete, ready for review)
- **Phase 1: Composition Source and Lead Sheet:** [x] `score/song.json` (tempo map, key/meter, chord grid, melody pitches plus rhythm, original lyrics bound to phrases, arrangement map, master seed), [x] `score/mix.json` constants, [x] `score/blocklist.txt`, [x] MIDI plus printable sheet export path defined, [x] schema/parse test green (PR 1 target, Refs #481)
- **Phase 2: Deterministic Render Engine and Master Audio:** [x] stdlib-only `tools/render.py` synth voices (drums, bass, rhythm guitar, lead guitar, formant vocal), [x] `dist/master.wav` plus `dist/preview.wav` fallback render (no ffmpeg on PATH; ogg path wired for when it exists), [x] fixed WAV headers, [x] double-render hash test green (PR 2 target, Refs #481)
- **Phase 3: Stems and Reproducibility Audit:** [x] `tools/audit.py` 12-check gate (artifacts, wav-format, duration, master-levels, stems-audible, stem-null reconstruction within `stemNullToleranceRms`, manifest provenance, lyric-coverage, ip-scan, energy, score-artifacts), [x] `bash thunderline/repro.sh` green end to end (export, render, double-render bit identity, audit, full suite), [x] `tests/test_audit.py` 7-test sabotage gate green (PR 3 target, Refs #481)
- **Phase 4: Pages Player and Lyric Sync:** [ ] `thunderline/index.html` plus `player/player.js` plus `player/player.css`, [ ] play/pause/seek, synced lyric display, stem mute/solo, volume, downloads, [ ] 390 px usable, accessible controls, empty/loading/error states, [ ] headless end-to-end play test green (PR 4 target, Refs #481)
- **Phase 5: Song Story Docs and Final Integration:** [ ] `thunderline/README.md` plus `thunderline/docs/` (story, chord/arrangement notes, mix notes, reproduction steps, original-work license) as one unified product view, [ ] full `repro.sh` green, [ ] final listen-and-iterate pass, [ ] Evaluator craft gate (Final PR, Closes #481)

- **Current step:** Phase 3 complete: stdlib-only `tools/audit.py` passes 12/12 on the shipped tree (stem-null reconstruction rms 0.00142 vs 0.02 tolerance; vocal rms 0.171; final-chorus lift 0.211 vs 0.174), `bash thunderline/repro.sh` is green end to end, and `tests/test_audit.py` (7 tests) pins clean-pass plus sabotage detection (silenced stem breaks manifest/null, drifted lyrics.json breaks coverage, hostile blocklist breaks ip-scan, deleted stem breaks artifacts). Full suite: 56 tests green (14 score + 9 render + 7 audit + 26 tester pins). Score fix on this phase: the audit caught two outro lyric lines ("Thunderline rollin' home", beats 384-399) with no melody notes behind them, so the vocal bus was silent under displayed lyrics; added an 8-note original E-major outro tag (E-F#-E-C# / D#-C#-B-E resolve) to `score/song.json` (+64 lines, additive only), restoring the words-notes-render invariant. `dist/` binaries stay gitignored; Pages shipping is a Phase 4/5 decision.
- **Next steps:** Review Phase 3, then Builder implements Phase 4: Pages Player and Lyric Sync on the next run.

## Agent Log

- **2026-09-29, Architect:** Blueprint plus Phase Epic written (composition source, deterministic render, stems, Pages player, unified docs). Five capability-named phases; Refs #481 until the final master lands. Handing to the Builder for Phase 1.
- **2026-09-29, Builder:** Phase 1 built on the epic branch (resume mode, no restart). 104-bar extension of the binding skeleton (all skeleton sections at required lengths; choruses to 12, final to 16, plus verse3 and 8-bar intro/outro) so 160 BPM lands at 156 s. `export_score.py` plus 14-test gate green, double-export hashes identical, blocklist scan clean. Ready for review.
- **2026-09-29, Builder:** Phase 2 built on `opencode/issue481-thunderline-phase-2` from latest main (Phase 1 already merged). `tools/render.py` (stdlib only, seeded per-voice RNG streams, wavetable voices, formant vocal, one-pass bus EQ, soft-knee limiter) plus 9-test `tests/test_render.py` gate. Full suite green (36 tests). Ready for review.
- **2026-09-29, Builder:** Phase 3 built on `opencode/issue481-thunderline-phase-3` from latest main (Phases 1-2 merged). `tools/audit.py` (12 checks, stdlib only, pure function of the dist tree) plus `thunderline/repro.sh` (export, render, double-render hash compare, audit, suite) plus 7-test `tests/test_audit.py` sabotage gate. Audit caught a real score gap (unsung outro tag) fixed with 8 additive melody notes. Full suite green (56 tests). Ready for review.
