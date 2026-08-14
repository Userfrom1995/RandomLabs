#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "movegen.h"
#include "position.h"

namespace gambit {

struct PerftResult {
  uint64_t nodes = 0;
  uint64_t captures = 0;
  uint64_t ep = 0;
  uint64_t promotions = 0;
  uint64_t castles = 0;
  uint64_t checks = 0;
  uint64_t checkmates = 0;
  uint64_t takes = 0;
};

// Count nodes at the given depth. Optionally counts move categories.
PerftResult perft(Position& pos, int depth);

// Perft with per-move breakdown for the given depth.
std::vector<std::pair<Move, uint64_t>> perft_divide(Position& pos, int depth);

// Returns the expected perft node count for known test positions, or -1
// if the position is not in the reference table.
int64_t known_perft(const std::string& fen, int depth);

}  // namespace gambit