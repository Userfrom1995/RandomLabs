# Progress — Gambit

- **Issue:** #51
- **Branch:** opencode/issue51-20260814094408
- **Status:** in-progress
- **Updated:** 2026-08-14T10:00:00Z

## Checklist
- [x] scaffold + progress file + Makefile + README skeleton
- [x] bitboard core: types, attack tables, move encoding, position + make/unmake, zobrist
- [x] move generation (all pieces, castling, ep, promotion) + legal filtering
- [x] perft verification against known node counts
- [ ] search: negamax alpha-beta, quiescence, transposition table, iterative deepening, eval
- [ ] UCI protocol interface
- [ ] CLI: play / analyze / perft / divide / test / uci modes
- [ ] tests: perft suite, make/unmake symmetry, FEN round-trip, search sanity
- [ ] README + docs/ (index.md + index.html) + ideas/ entry + landing page update
- [ ] final build clean, tests pass, PR with Closes #51

## Current step
Core engine complete: bitboard attack tables, move encoding, position with
make/unmake + zobrist, full legal move generation, perft verified against the
standard suite (startpos to depth 5, kiwipete, pos3, pos4, pos5 all pass).
Make/unmake symmetry also verified. Next: search.

## Next steps
1. Evaluation (material + PSTs).
2. Transposition table + negamax alpha-beta + quiescence + iterative deepening.
3. UCI interface + CLI (play/analyze/perft/divide/test) + main.
4. Test suite (perft, symmetry, FEN round-trip, search sanity).
5. README + docs/ + ideas/ + landing page.

## Agent log
- 2026-08-14 (build run 1) — orientation: read builder.md, AGENTS.md, FACTORY.md,
  README, the granite example (structure, docs layout, ideas file), and the root
  index.html. Branch opencode/issue51-20260814094408 exists at main with no PR;
  fresh build for #51. Scaffolded gambit/ with the planned layout and this file.
- 2026-08-14 (build run 2) — core engine: wrote types.h (colors, pieces, squares,
  move encoding), bitboard.h/.cpp (attack tables, sliding attacks via ray
  precompute), zobrist.h/.cpp, position.h/.cpp (FEN, make/unmake, zobrist key,
  attack/check, draw detection), movegen.h/.cpp (pawn/knight/bishop/rook/queen/
  king/castle/en-passant/promotion + legal filter), perft.h/.cpp. Debugged:
  sliding-attack blocker logic (nearest blocker is lsb/msb by direction sign),
  transposed DIR_DELTAS (file/rank order), castling rook-occupancy check, is_legal
  king-side check. Full perft suite passes; make/unmake symmetry passes.
