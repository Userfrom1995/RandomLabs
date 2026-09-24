#pragma once

#include <cstdint>

#include "types.h"

namespace gambit {

// Global Zobrist tables, initialized by init_zobrist().
struct ZobristTables {
  uint64_t piece[16][64];
  uint64_t castling[16];
  uint64_t ep[8];
  uint64_t side;
};

extern ZobristTables ZOBRIST;

void init_zobrist();

}  // namespace gambit
