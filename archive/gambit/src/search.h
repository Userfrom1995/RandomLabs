#pragma once

#include <atomic>
#include <chrono>
#include <cstdint>
#include <string>
#include <vector>

#include "position.h"
#include "tt.h"
#include "types.h"

namespace gambit {

struct SearchOptions {
  int depth = 0;             // 0 = use time controls
  int64_t movetime_ms = 0;   // fixed time per move
  int64_t wtime_ms = 0;
  int64_t btime_ms = 0;
  int64_t winc_ms = 0;
  int64_t binc_ms = 0;
  bool infinite = false;
  int max_depth = MAX_PLY;
};

struct SearchStats {
  uint64_t nodes = 0;
  uint64_t tbhits = 0;
  int64_t time_ms = 0;
};

struct SearchResult {
  Move bestmove = MOVE_NONE;
  int score = 0;
  int depth = 0;
  uint64_t nodes = 0;
  int64_t time_ms = 0;
  std::vector<Move> pv;
  bool aborted = false;
};

class Search {
 public:
  explicit Search(TranspositionTable& tt) : tt_(tt) {}

  // Run a search; sets stop_ to signal a running search to abort.
  SearchResult run(Position pos, const SearchOptions& opts);

  void stop() { stop_.store(true); }
  void clear_stop() { stop_.store(false); }
  bool is_stopped() const { return stop_.load(); }

 private:
  int negamax(Position& pos, int alpha, int beta, int depth, int ply);
  int quiescence(Position& pos, int alpha, int beta, int ply);
  int evaluate(const Position& pos) const;
  bool abort_condition(int ply) const;

  TranspositionTable& tt_;
  std::atomic<bool> stop_{false};
  uint64_t nodes_ = 0;
  uint64_t tbhits_ = 0;
  int start_time_ = 0;
  int64_t hard_limit_ms_ = 0;
  std::vector<Move> pv_;
  Move pv_table_[MAX_PLY][MAX_PLY];
  int pv_length_[MAX_PLY];
  Move killers_[MAX_PLY][2];
  SearchResult result_;
};

// Format a score as "cp N" or "mate N" for UCI/CLI output.
std::string score_str(int score);

}  // namespace gambit
