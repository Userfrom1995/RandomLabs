# Progress — Gambit

- **Issue:** #51
- **Branch:** opencode/issue51-20260814094408
- **Status:** in-progress
- **Updated:** 2026-08-14T10:00:00Z

## Checklist
- [x] scaffold + progress file + Makefile + README skeleton
- [ ] bitboard core: types, attack tables, move encoding, position + make/unmake, zobrist
- [ ] move generation (all pieces, castling, ep, promotion) + legal filtering
- [ ] perft verification against known node counts
- [ ] search: negamax alpha-beta, quiescence, transposition table, iterative deepening, eval
- [ ] UCI protocol interface
- [ ] CLI: play / analyze / perft / divide / test / uci modes
- [ ] tests: perft suite, make/unmake symmetry, FEN round-trip, search sanity
- [ ] README + docs/ (index.md + index.html) + ideas/ entry + landing page update
- [ ] final build clean, tests pass, PR with Closes #51

## Current step
Scaffolding the project: directory layout, Makefile, progress file.

## Next steps
1. Core bitboard layer (types.h, bitboard attack tables, move.h).
2. Position + make/unmake + zobrist hashing.
3. Move generation + legality, perft, verify node counts.

## Agent log
- 2026-08-14 (build run 1) — orientation: read builder.md, AGENTS.md, FACTORY.md,
  README, the granite example (structure, docs layout, ideas file), and the root
  index.html. Branch opencode/issue51-20260814094408 exists at main with no PR;
  fresh build for #51. Scaffolded gambit/ with the planned layout and this file.
