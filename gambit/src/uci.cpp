#include "uci.h"

#include <algorithm>
#include <atomic>
#include <cstdio>
#include <cstring>
#include <iostream>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

#include "movegen.h"

namespace gambit {

namespace {

const char* ENGINE_NAME = "Gambit 1.0";
const char* ENGINE_AUTHOR = "the Random factory";

void print_uci_id() {
  std::printf("id name %s\n", ENGINE_NAME);
  std::printf("id author %s\n", ENGINE_AUTHOR);
  std::printf("uciok\n");
  std::fflush(stdout);
}

std::vector<std::string> split(const std::string& s) {
  std::istringstream ss(s);
  std::vector<std::string> out;
  std::string tok;
  while (ss >> tok) out.push_back(tok);
  return out;
}

// Parse "go" options.
SearchOptions parse_go(const std::vector<std::string>& args, size_t start) {
  SearchOptions o;
  for (size_t i = start; i < args.size(); ++i) {
    const std::string& a = args[i];
    auto next_int = [&](int64_t& out) {
      if (i + 1 < args.size()) {
        try {
          out = std::stoll(args[i + 1]);
          ++i;
          return true;
        } catch (...) {
        }
      }
      return false;
    };
    if (a == "depth") {
      int64_t v = 0;
      if (next_int(v)) o.depth = int(v);
    } else if (a == "movetime") {
      next_int(o.movetime_ms);
    } else if (a == "wtime") {
      next_int(o.wtime_ms);
    } else if (a == "btime") {
      next_int(o.btime_ms);
    } else if (a == "winc") {
      next_int(o.winc_ms);
    } else if (a == "binc") {
      next_int(o.binc_ms);
    } else if (a == "infinite") {
      o.infinite = true;
    }
  }
  return o;
}

}  // namespace

void uci_loop(TranspositionTable& tt) {
  Position pos;
  pos.set_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

  Search search(tt);
  std::thread search_thread;
  std::atomic<bool> searching{false};
  SearchResult last_result;

  auto print_bestmove = [&](const SearchResult& r) {
    std::printf("bestmove %s\n", r.bestmove.is_zero() ? "(none)" : r.bestmove.uci().c_str());
    std::fflush(stdout);
  };

  auto do_go = [&](const SearchOptions& opts) {
    if (searching.load()) {
      search.stop();
      if (search_thread.joinable()) search_thread.join();
    }
    searching.store(true);
    search_thread = std::thread([&]() {
      last_result = search.run(pos, opts);
      if (!opts.infinite) print_bestmove(last_result);
      searching.store(false);
    });
  };

  std::string line;
  while (std::getline(std::cin, line)) {
    auto args = split(line);
    if (args.empty()) continue;
    const std::string& cmd = args[0];

    if (cmd == "uci") {
      print_uci_id();
    } else if (cmd == "isready") {
      std::printf("readyok\n");
      std::fflush(stdout);
    } else if (cmd == "ucinewgame") {
      tt.clear();
      search.clear_stop();
      if (searching.load()) {
        search.stop();
        if (search_thread.joinable()) search_thread.join();
      }
    } else if (cmd == "setoption") {
      // No tunable options are exposed yet; accept and ignore.
    } else if (cmd == "position") {
      if (searching.load()) {
        search.stop();
        if (search_thread.joinable()) search_thread.join();
      }
      size_t i = 1;
      if (i < args.size() && args[i] == "startpos") {
        pos.set_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        ++i;
      } else if (i < args.size() && args[i] == "fen") {
        std::string fen;
        ++i;
        // FEN fields can be split by spaces; the move list starts at "moves".
        while (i < args.size() && args[i] != "moves") {
          fen += args[i];
          fen += ' ';
          ++i;
        }
        if (!pos.set_from_fen(fen)) {
          std::printf("info string error: bad fen\n");
          pos.set_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        }
      } else {
        std::printf("info string error: missing position\n");
      }
      if (i < args.size() && args[i] == "moves") {
        ++i;
        for (; i < args.size(); ++i) {
          Move m = parse_move(pos, args[i]);
          if (m.is_zero() || !pos.is_legal(m)) {
            std::printf("info string error: illegal move %s\n", args[i].c_str());
            break;
          }
          pos.make(m);
        }
      }
    } else if (cmd == "go") {
      SearchOptions opts = parse_go(args, 1);
      do_go(opts);
    } else if (cmd == "stop") {
      if (searching.load()) {
        search.stop();
        if (search_thread.joinable()) search_thread.join();
        print_bestmove(last_result);
      } else {
        // Nothing running; still respond so GUIs don't hang.
        std::printf("bestmove (none)\n");
        std::fflush(stdout);
      }
    } else if (cmd == "quit") {
      if (searching.load()) {
        search.stop();
        if (search_thread.joinable()) search_thread.join();
      }
      break;
    } else if (cmd == "d") {
      std::printf("%s\n", pos.fen().c_str());
      std::fflush(stdout);
    }
  }
}

}  // namespace gambit
