# Gambit: a UCI chess engine in C++

A UCI chess engine with a bitboard board representation, legal move
generation verified by perft, and an alpha-beta search with iterative
deepening and a transposition table. Plays a full game in the terminal or
speaks UCI to any chess GUI.

## Build

```sh
make            # builds ./gambit
make test       # builds and runs the test suite
make clean
```

Requires a C++17 compiler (g++/clang++). No external dependencies.

## Usage

```sh
./gambit                      # UCI protocol mode (default)
./gambit perft 5              # verify move generation against known perft counts
./gambit divide 4             # perft with per-move breakdown
./gambit play                 # play a full game against the engine
./gambit analyze 10           # analyze the start position to depth 10
./gambit test                 # run the built-in test suite
```

See [docs/](docs/) for the full documentation.

MIT licensed.
