#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

#include "bitboard.h"
#include "cli.h"
#include "tt.h"
#include "uci.h"
#include "zobrist.h"

int main(int argc, char** argv) {
  gambit::init_bitboards();
  gambit::init_zobrist();
  gambit::TranspositionTable tt;
  tt.resize_mb(64);

  std::vector<std::string> args(argv + 1, argv + argc);
  std::string cmd = args.empty() ? "uci" : args[0];

  if (cmd == "uci" || cmd == "--uci") {
    gambit::uci_loop(tt);
    return 0;
  }
  if (cmd == "perft") {
    return gambit::cli_perft(args);
  }
  if (cmd == "divide") {
    return gambit::cli_divide(args);
  }
  if (cmd == "analyze") {
    return gambit::cli_analyze(tt, args);
  }
  if (cmd == "play") {
    return gambit::cli_play(tt, args);
  }
  if (cmd == "test") {
    return gambit::cli_test();
  }
  if (cmd == "help" || cmd == "--help" || cmd == "-h") {
    std::printf(
        "Gambit 1.0 - a UCI chess engine in C++\n"
        "\n"
        "Usage:\n"
        "  gambit [command] [args...]\n"
        "\n"
        "Commands:\n"
        "  (default)       Run in UCI protocol mode (speaks to chess GUIs)\n"
        "  play [--black] [--depth N] [--movetime MS]\n"
        "                  Play a full game against the engine\n"
        "  analyze [depth] [fen]   Analyze a position\n"
        "  perft [depth] [fen]     Verify move generation against known perft\n"
        "  divide [depth] [fen]    Perft with a per-move breakdown\n"
        "  test            Run the built-in test suite\n"
        "  help            Show this help\n"
        "\n"
        "Default FEN is the standard start position.\n");
    return 0;
  }
  std::fprintf(stderr, "Unknown command '%s'. Try 'gambit help'.\n", cmd.c_str());
  return 1;
}
