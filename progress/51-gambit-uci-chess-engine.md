# Progress: Gambit

- **Issue:** #51
- **Branch:** opencode/issue51-20260814094408
- **Status:** complete
- **Updated:** 2026-08-14T11:00:00Z

## Checklist
- [x] scaffold + progress file + Makefile + README skeleton
- [x] bitboard core: types, attack tables, move encoding, position + make/unmake, zobrist
- [x] move generation (all pieces, castling, ep, promotion) + legal filtering
- [x] perft verification against known node counts
- [x] search: negamax alpha-beta, quiescence, transposition table, iterative deepening, eval
- [x] UCI protocol interface
- [x] CLI: play / analyze / perft / divide / test / uci modes
- [x] tests: perft suite, make/unmake symmetry, FEN round-trip, search sanity
- [x] README + docs/ (index.md + index.html) + ideas/ entry + landing page update
- [x] final build clean, tests pass, PR with Closes #51

## Current step
Build complete. Gambit 1.0 is done: bitboard engine, perft-verified legal
move generation, negamax alpha-beta search with quiescence, LMR, killers,
transposition table, iterative deepening, time management, UCI protocol, and
a playable CLI. Finalize pass finished the docs site, ideas entry, landing
page, and dropped committed build artifacts. Ready for review.

## Next steps
None. Awaiting review; respond to `/oc fix` findings if any.

## Agent log
- 2026-08-14 (build run 1): orientation: read builder.md, AGENTS.md, LAB.md,
  README, the granite example (structure, docs layout, ideas file), and the root
  index.html. Branch opencode/issue51-20260814094408 exists at main with no PR;
  fresh build for #51. Scaffolded gambit/ with the planned layout and this file.
- 2026-08-14 (build run 2): core engine: wrote types.h (colors, pieces, squares,
  move encoding), bitboard.h/.cpp (attack tables, sliding attacks via ray
  precompute), zobrist.h/.cpp, position.h/.cpp (FEN, make/unmake, zobrist key,
  attack/check, draw detection), movegen.h/.cpp (pawn/knight/bishop/rook/queen/
  king/castle/en-passant/promotion + legal filter), perft.h/.cpp. Debugged:
  sliding-attack blocker logic (nearest blocker is lsb/msb by direction sign),
  transposed DIR_DELTAS (file/rank order), castling rook-occupancy check, is_legal
  king-side check. Full perft suite passes; make/unmake symmetry passes.
- 2026-08-14 (build run 2, part 2): search: eval.h/.cpp (material + piece-square
  tables), tt.h/.cpp (transposition table, always-replace), search.h/.cpp
  (negamax alpha-beta, quiescence, LMR, killers, TT move ordering, iterative
  deepening, time management, mate scoring). Debugged PV-table overwrite (last
  move clobbering) and all-illegal-move handling. Verified: startpos depth 8,
  back-rank mate-in-1 finds Ra8#/Re8#.
- 2026-08-14 (build run 3): front ends and tests: uci.h/.cpp (UCI loop, background
  search thread for stop), cli.h/.cpp (print_board, SAN, parse_human_move,
  play/analyze/perft/divide/test), main.cpp dispatch, tests.h/.cpp (perft suite
  incl. startpos d5, make/unmake symmetry, FEN round-trip, legal move counts,
  search mate + startpos sanity). make test ALL PASS.
- 2026-08-14 (build run 4, finalize): dropped committed *.o artifacts and added
  *.o to .gitignore; wrote gambit/docs/index.md + index.html (docs site, no
  em dashes); wrote ideas/2026-08-14-gambit-uci-chess-engine.md; promoted Gambit
  to current project on the root landing page (Granite moved to Previous
  Projects); removed a dead is_check_suffix function flagged by -Wall. Verified:
  make clean && make has no warnings, make test ALL PASS, perft 4 = 197281,
  analyze + UCI loop smoke tested. Progress flipped to complete.
