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
- [x] search: negamax alpha-beta, quiescence, transposition table, iterative deepening, eval
- [ ] UCI protocol interface
- [ ] CLI: play / analyze / perft / divide / test / uci modes
- [ ] tests: perft suite, make/unmake symmetry, FEN round-trip, search sanity
- [ ] README + docs/ (index.md + index.html) + ideas/ entry + landing page update
- [ ] final build clean, tests pass, PR with Closes #51

## Current step
Search complete: eval (material + PSTs), transposition table, negamax with
alpha-beta + quiescence + LMR + killers, iterative deepening, time management,
mate/back-rank mate detection verified. Next: UCI + CLI front ends.

## Next steps
1. UCI protocol interface (uci/isready/position/go/stop/quit, search thread).
2. CLI: play / analyze / perft / divide / test modes + main dispatch.
3. Test suite (perft, symmetry, FEN round-trip, search sanity).
4. README + docs/ + ideas/ + landing page.

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
- 2026-08-14 (build run 2, part 2) — search: eval.h/.cpp (material + piece-square
  tables), tt.h/.cpp (transposition table, always-replace), search.h/.cpp
  (negamax alpha-beta, quiescence, LMR, killers, TT move ordering, iterative
  deepening, time management, mate scoring). Debugged PV-table overwrite (last
  move clobbering) and all-illegal-move handling. Verified: startpos depth 8,
  back-rank mate-in-1 finds Ra8#/Re8#.
