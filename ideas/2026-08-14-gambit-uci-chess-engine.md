# Gambit

A UCI chess engine written from scratch in **C++17**: a bitboard board
representation, legal move generation verified against the standard perft
suite, and a negamax alpha-beta search with iterative deepening, quiescence,
and a transposition table. The lab's first C++ project: it plays a full
game in the terminal, speaks the UCI protocol to any chess GUI, and ships a
built-in test suite that re-verifies the move generator on every build.

## What Was Built

A self-contained chess engine (`gambit/`) with no external dependencies:

- **Bitboard core** (`src/bitboard.h`, `position.h`, `types.h`): the board is
  six piece-type bitboards, two color bitboards, and an occupancy bitboard,
  updated by make/unmake with incremental Zobrist keys. Moves are packed into
  32-bit words (from/to squares, promotion piece, flag, captured and moving
  piece types). Knight, king, and pawn attacks are precomputed tables; rook,
  bishop, and queen attacks come from ray tables with blocker detection.
- **Legal move generation** (`src/movegen.h`): pseudo-legal moves for all
  pieces including castling, en passant, and promotion, filtered for king
  safety. Verified against known perft node counts: the start position through
  depth 5 (4,865,609 nodes), kiwipete, and the classic positions 3, 4, 5, and
  6.
- **Search** (`src/search.h`): negamax with alpha-beta pruning, quiescence
  search on captures, late move reduction, killer moves, TT move ordering, and
  PV tracking. Iterative deepening with time management (fixed depth, fixed
  movetime, or clock + increment) and an atomic stop flag so a running search
  can be aborted cleanly.
- **Transposition table** (`src/tt.h`): an always-replace hash table storing
  exact/lower/upper bounds keyed by the Zobrist position hash.
- **Evaluation** (`src/eval.h`): material plus piece-square tables for every
  piece type.
- **UCI protocol** (`src/uci.h`): the standard loop (`uci`, `isready`,
  `ucinewgame`, `position`, `go`, `stop`, `quit`, `d`) with searches on a
  background thread so `stop` can interrupt them.
- **CLI** (`src/cli.h`): a human-facing mode: a Unicode board, SAN move input
  with hints and takebacks, plus `perft`, `divide`, `analyze`, and `test`
  commands.
- **Tests** (`tests/tests.cpp`): the perft suite, a make/unmake symmetry test
  across every legal move of several positions, FEN round-trips, legal-move
  counts, and search sanity (a back-rank mate in one is found, the start
  position returns a legal best move).

## Why

The lab's recent streak was Python CLIs, a WebGL solar system, and a Go
database engine. Gambit is the first **C++** project and the first into the
classic "deep algorithm" territory: chess engines pack an enormous amount of
computer science into one binary. Bitboard tricks, move-generation correctness
proven by perft, and a search tree that genuinely out-plays a casual human.
It also gives the repo its first engine that speaks a real protocol (UCI),
so it plugs into any chess GUI out of the box.

## How It Works

- **Board model.** Six piece-type bitboards, two color bitboards, an occupancy
  bitboard, plus side to move, castling rights, the en-passant square, the
  halfmove clock, and the fullmove number. A Zobrist key is updated
  incrementally on every make and restored exactly on unmake.
- **Move encoding.** Each move is one 32-bit word. The flag distinguishes
  normal moves, double pushes, en passant, castling, and promotion, so make()
  and unmake() know exactly what to update (including rook relocation for
  castling and captured-pawn removal for en passant).
- **Attack tables.** Knight, king, and pawn attack maps are precomputed once.
  Sliding pieces walk precomputed ray tables and stop at the first blocker,
  with the nearest blocker found by direction-aware lsb/msb.
- **Search.** Iterative deepening searches depth 1, 2, 3, ... until the target
  depth or the time budget runs out. Each iteration carries the previous best
  move into the transposition table for move ordering. Scores are centipawns;
  mates report as `mate N`. The atomic stop flag plus a hard time limit let
  the UCI loop abort a search and report `bestmove` immediately.
- **Perft.** The move generator is proven by counting nodes at increasing
  depths against the known reference table. `make test` re-runs the whole
  suite, so a regression in movegen fails the build.
- **Draw detection.** Fifty-move rule, threefold repetition via the key
  history, and insufficient material.

## Key Files

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
- `gambit/tests/tests.cpp`: the test suite.
- `gambit/Makefile`: build and test.
- `gambit/README.md`: quickstart; `gambit/docs/index.md` +
  `gambit/docs/index.html`: documentation site.

## Notes

- **C++ first.** The whole engine is standard C++17 with no dependencies; it
  builds with a plain `g++`/`clang++` invocation through a small Makefile.
- **Correctness is the ground truth.** Perft node counts are the reference
  for the move generator, and the test binary re-runs them on every
  `make test`. A make/unmake symmetry test additionally proves that any legal
  move applied and undone restores the exact FEN and Zobrist key.
- **Real protocol.** The default mode is a real UCI engine. `gambit` with no
  arguments speaks UCI on stdin/stdout; any GUI (Cute Chess, BanksiaGUI,
  Arena) can load it.
- **Bugs found by running it.** Two real ones were caught while building: the
  sliding-attack blocker logic picked the wrong nearest blocker (fixed with
  direction-aware lsb/msb), and the PV table overwrote the last move during
  alpha-beta re-search (fixed by copying the child PV only up to its recorded
  length). Both are covered by the test suite.
- **Name origin.** A gambit is an opening that sacrifices material for
  long-term advantage, exactly like a search that spends depth now to play
  better later. It also sounds like the lab's first swing at a compiled
  systems language.
