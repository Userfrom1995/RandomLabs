#include "bitboard.h"

#include <array>

namespace gambit {

Bitboard KNIGHT_ATTACKS[64];
Bitboard KING_ATTACKS[64];
Bitboard PAWN_ATTACKS[2][64];
Bitboard RAYS[8][64];

namespace {

constexpr int KNIGHT_STEPS[8][2] = {
    {1, 2}, {2, 1}, {2, -1}, {1, -2}, {-1, -2}, {-2, -1}, {-2, 1}, {-1, 2},
};

constexpr int KING_STEPS[8][2] = {
    {0, 1}, {0, -1}, {1, 0}, {-1, 0}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1},
};

// Direction index: 0=N, 1=E, 2=S, 3=W, 4=NE, 5=NW, 6=SE, 7=SW
// Deltas are {file_delta, rank_delta}.
constexpr int DIR_DELTAS[8][2] = {
    {0, 1}, {1, 0}, {0, -1}, {-1, 0}, {1, 1}, {-1, 1}, {1, -1}, {-1, -1},
};

}  // namespace

void init_bitboards() {
  for (int sq = 0; sq < 64; ++sq) {
    int f = sq & 7;
    int r = sq >> 3;

    Bitboard knight = 0;
    for (auto& [df, dr] : KNIGHT_STEPS) {
      int nf = f + df, nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        knight |= 1ULL << (nr * 8 + nf);
      }
    }
    KNIGHT_ATTACKS[sq] = knight;

    Bitboard king = 0;
    for (auto& [df, dr] : KING_STEPS) {
      int nf = f + df, nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        king |= 1ULL << (nr * 8 + nf);
      }
    }
    KING_ATTACKS[sq] = king;

    // White pawns attack diagonally upward, black pawns downward.
    Bitboard wp = 0, bp = 0;
    if (f > 0) {
      if (r < 7) wp |= 1ULL << ((r + 1) * 8 + f - 1);
      if (r > 0) bp |= 1ULL << ((r - 1) * 8 + f - 1);
    }
    if (f < 7) {
      if (r < 7) wp |= 1ULL << ((r + 1) * 8 + f + 1);
      if (r > 0) bp |= 1ULL << ((r - 1) * 8 + f + 1);
    }
    PAWN_ATTACKS[WHITE][sq] = wp;
    PAWN_ATTACKS[BLACK][sq] = bp;

    // Rays in all 8 directions.
    for (int d = 0; d < 8; ++d) {
      Bitboard ray = 0;
      int cf = f + DIR_DELTAS[d][0];
      int cr = r + DIR_DELTAS[d][1];
      while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
        ray |= 1ULL << (cr * 8 + cf);
        cf += DIR_DELTAS[d][0];
        cr += DIR_DELTAS[d][1];
      }
      RAYS[d][sq] = ray;
    }
  }
}

namespace {

// Directions whose deltas are positive (N, E, NE, NW): the first blocker
// along the ray from sq is the lowest set bit of (ray & occ). For negative
// directions (S, W, SE, SW) it is the highest set bit.
constexpr int DIR_STEP[8] = {8, 1, -8, -1, 9, 7, -7, -9};

inline int first_blocker_bit(Bitboard blockers, int d) {
  return DIR_STEP[d] > 0 ? lsb(blockers) : msb(blockers);
}

}  // namespace

Bitboard rook_attacks(Square sq, Bitboard occ) {
  // Directions N(0), E(1), S(2), W(3)
  Bitboard attacks = 0;
  for (int d = 0; d < 4; ++d) {
    Bitboard ray = RAYS[d][sq];
    Bitboard blockers = ray & occ;
    if (blockers) {
      int bs = first_blocker_bit(blockers, d);
      // All squares from sq up to and including the first blocker.
      attacks |= ray & ~RAYS[d][bs];
    } else {
      attacks |= ray;
    }
  }
  return attacks;
}

Bitboard bishop_attacks(Square sq, Bitboard occ) {
  // Directions NE(4), NW(5), SE(6), SW(7)
  Bitboard attacks = 0;
  for (int d = 4; d < 8; ++d) {
    Bitboard ray = RAYS[d][sq];
    Bitboard blockers = ray & occ;
    if (blockers) {
      int bs = first_blocker_bit(blockers, d);
      attacks |= ray & ~RAYS[d][bs];
    } else {
      attacks |= ray;
    }
  }
  return attacks;
}

}  // namespace gambit
