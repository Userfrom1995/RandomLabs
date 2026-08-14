#include "zobrist.h"

namespace gambit {

ZobristTables ZOBRIST;

namespace {
uint64_t splitmix64(uint64_t& x) {
  uint64_t z = (x += 0x9E3779B97F4A7C15ULL);
  z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
  z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
  return z ^ (z >> 31);
}
}  // namespace

void init_zobrist() {
  uint64_t seed = 0x123456789ABCDEF0ULL;
  for (int p = 0; p < 16; ++p)
    for (int s = 0; s < 64; ++s) ZOBRIST.piece[p][s] = splitmix64(seed);
  for (int c = 0; c < 16; ++c) ZOBRIST.castling[c] = splitmix64(seed);
  for (int f = 0; f < 8; ++f) ZOBRIST.ep[f] = splitmix64(seed);
  ZOBRIST.side = splitmix64(seed);
}

}  // namespace gambit