# Gambit: a UCI chess engine in C++

**Gambit** is a UCI chess engine written from scratch in **C++17**: a
bitboard board representation, legal move generation verified against the
standard perft suite, and a negamax alpha-beta search with iterative deepening
and a transposition table. It plays a full game in the terminal, speaks the
UCI protocol to any chess GUI, and comes with a built-in test suite. It is the
lab's first C++ project.

## What it is

- **Bitboard representation.** `src/bitboard.h` models the board as 64-bit
  integers: one per piece type, one per color, plus an occupancy bitboard.
  Knight, king, and pawn attacks are precomputed tables; rook, bishop, and
  queen attacks are computed from precomputed ray tables with blocker
  detection.
- **Full legal move generation.** `src/movegen.h` generates pseudo-legal moves
  for every piece including castling, en passant, and promotion, then filters
  to fully legal moves. Correctness is verified against known perft node
  counts: the standard start position through depth 5 (4,865,609 nodes),
  kiwipete (position 2), and the classic positions 3, 4, 5, and 6.
- **Search.** `src/search.h` implements negamax with alpha-beta pruning,
  quiescence search, late move reduction, killer moves, transposition-table
  move ordering, and PV tracking. Iterative deepening with time management
  (fixed depth, fixed movetime, or clock + increment) lets the engine scale to
  whatever time you give it.
- **Transposition table.** `src/tt.h` is an always-replace hash table with
  exact/lower/upper bound entries keyed by the Zobrist position hash.
- **Evaluation.** `src/eval.h` scores material plus piece-square tables for
  pawns, knights, bishops, rooks, queens, and kings.
- **UCI protocol.** `src/uci.h` implements the standard UCI loop
  (`uci`, `isready`, `ucinewgame`, `position`, `go`, `stop`, `quit`) with
  searches run on a background thread so `stop` can interrupt them.
- **Playable CLI.** `src/cli.h` adds a human-facing mode: a Unicode board,
  SAN move input with hints and takebacks, plus `perft`, `divide`, `analyze`,
  and `test` commands.

## Using it

```sh
cd gambit
make                 # builds ./gambit
make test            # builds and runs the test suite (ALL PASS)
./gambit help
```

Commands:

```sh
./gambit                      # UCI protocol mode (default; talk to any GUI)
./gambit play [--black] [--depth N] [--movetime MS]
./gambit analyze [depth] [fen]
./gambit perft [depth] [fen]
./gambit divide [depth] [fen]
./gambit test
```

The default FEN is the standard start position. Requires a C++17 compiler
(g++ or clang++); there are no external dependencies.

## How it works

- **Move encoding.** `src/types.h` packs a move into a 32-bit word: from
  square (6 bits), to square (6 bits), promotion piece (3), flag (3),
  captured piece type (3), and moving piece type (3). The flag distinguishes
  normal moves, double pushes, en passant, castling, and promotion.
- **Board model.** `src/position.h` keeps six piece-type bitboards, two
  color bitboards, and an occupancy bitboard, plus side to move, castling
  rights, the en-passant square, the halfmove clock, and the fullmove number.
  Zobrist keys (`src/zobrist.h`) are incrementally updated on every move.
- **Make/unmake.** `make()` updates the board, occupancy, Zobrist key,
  castling rights, and history in one pass; `unmake()` restores the
  preceding state exactly. A make/unmake symmetry test walks every legal move
  of several positions and confirms the FEN and key round-trip exactly.
- **Search loop.** Iterative deepening searches depth 1, 2, 3, ... until the
  requested depth is reached or the time budget runs out. Each iteration
  carries the previous best move into the transposition table for move
  ordering. Scores are centipawns, with mate scores reported as `mate N`.
- **Draw detection.** `src/position.h` detects the fifty-move rule (via the
  halfmove clock), threefold repetition (via the Zobrist key history), and
  insufficient material.

## Design choices

- **C++17, no dependencies.** The whole engine is standard C++: no external
  libraries, no third-party headers. It builds with a plain `g++`/`clang++`
  invocation through a small Makefile.
- **Correctness first.** Perft node counts against the standard suite are the
  ground truth for the move generator, and the test binary re-runs them on
  every `make test`.
- **UCI-compatible.** The default mode is a real UCI engine, so Gambit plugs
  into any chess GUI (e.g. Cute Chess, BanksiaGUI, Arena) as well as the
  terminal.
- **Honest search.** No weakening, no force-gags: what you see on the board
  is what the search found.

## Key files

- `gambit/src/types.h`: colors, pieces, squares, castling rights, the packed
  `Move` type.
- `gambit/src/bitboard.h`, `bitboard.cpp`: bitboards, attack tables, ray
  attacks.
- `gambit/src/position.h`, `position.cpp`: FEN parsing, make/unmake, checks,
  draw detection.
- `gambit/src/movegen.h`, `movegen.cpp`: legal move generation.
- `gambit/src/perft.h`, `perft.cpp`: perft counting and divide.
- `gambit/src/eval.h`, `eval.cpp`: material + piece-square evaluation.
- `gambit/src/tt.h`, `tt.cpp`: transposition table.
- `gambit/src/search.h`, `search.cpp`: negamax, quiescence, iterative
  deepening, time management.
- `gambit/src/zobrist.h`, `zobrist.cpp`: Zobrist hashing.
- `gambit/src/uci.h`, `uci.cpp`: the UCI protocol loop.
- `gambit/src/cli.h`, `cli.cpp`: human-facing play/analyze/perft/divide/test.
- `gambit/src/main.cpp`: entry point and command dispatch.
- `gambit/tests/tests.cpp`: perft suite, make/unmake symmetry, FEN
  round-trip, search sanity.
- `gambit/README.md`: quickstart; `gambit/docs/`: this documentation.

## Source

The project lives in [`gambit/`](https://github.com/Userfrom1995/RandomLabs/tree/main/gambit)
with a [`README`](https://github.com/Userfrom1995/RandomLabs/blob/main/gambit/README.md)
and a full writeup in
[`ideas/`](https://github.com/Userfrom1995/RandomLabs/blob/main/ideas/2026-08-14-gambit-uci-chess-engine.md).
