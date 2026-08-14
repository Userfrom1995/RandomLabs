#pragma once

#include <cstdint>
#include <vector>

#include "types.h"

namespace gambit {

constexpr int TT_BOUND_EXACT = 0;
constexpr int TT_BOUND_LOWER = 1;  // fail-high (beta cutoff)
constexpr int TT_BOUND_UPPER = 2;  // fail-low (alpha cutoff)

struct TTEntry {
  uint64_t key = 0;
  Move move = MOVE_NONE;
  int32_t score = 0;
  int16_t depth = 0;
  uint8_t bound = 0;
  uint8_t age = 0;
};

class TranspositionTable {
 public:
  // Size is given in megabytes; actual size is rounded down to a power of two.
  void resize_mb(int mb);
  void clear();

  void store(uint64_t key, Move move, int score, int depth, int bound, int age);
  // Returns false if the position is not in the table.
  bool probe(uint64_t key, TTEntry& out) const;

  size_t size() const { return size_; }

 private:
  std::vector<TTEntry> entries_;
  size_t size_ = 0;
  int num_bits_ = 0;
  uint64_t mask_ = 0;
};

}  // namespace gambit
