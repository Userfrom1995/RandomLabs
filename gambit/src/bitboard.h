#pragma once

#include <cstdint>
#include <string>

#include "types.h"

namespace gambit {

using Bitboard = uint64_t;

constexpr Bitboard BB_SQ_A1 = 1ULL << SQ_A1;
constexpr Bitboard FILE_A_BB = 0x0101010101010101ULL;
constexpr Bitboard FILE_H_BB = 0x8080808080808080ULL;
constexpr Bitboard RANK_1_BB = 0x00000000000000FFULL;
constexpr Bitboard RANK_8_BB = 0xFF00000000000000ULL;
constexpr Bitboard RANK_2_BB = 0x000000000000FF00ULL;
constexpr Bitboard RANK_7_BB = 0x00FF000000000000ULL;
constexpr Bitboard RANK_4_BB = 0x00000000FF000000ULL;
constexpr Bitboard RANK_5_BB = 0x000000FF00000000ULL;

inline Bitboard square_bb(Square sq) { return 1ULL << int(sq); }
inline Bitboard rank_bbs(int rank) { return 0xFFULL << (rank * 8); }
inline int popcount(Bitboard b) { return __builtin_popcountll(b); }
inline int lsb(Bitboard b) { return __builtin_ctzll(b); }
inline int msb(Bitboard b) { return 63 - __builtin_clzll(b); }
inline Square pop_lsb(Bitboard& b) {
  int sq = lsb(b);
  b &= b - 1;
  return Square(sq);
}
inline bool multiple(Bitboard b) { return b && (b & (b - 1)); }

constexpr Bitboard between_bb_impl(Bitboard a, Bitboard b) {
  // squares strictly between two squares on the same line
  Bitboard delta = b - a;
  Bitboard line =
      (delta & 0x0080808080808080ULL)
          ? (a | b) & 0x8080808080808080ULL
          : (delta & 0x00000000000000FFULL)
                ? (a | b) & 0x00000000000000FFULL
                : (delta & 0x00FF00FF00FF00FFULL)
                      ? (a | b) & 0x00FF00FF00FF00FFULL
                      : (delta & 0x0101010101010101ULL) ? (a | b) & 0x0101010101010101ULL
                                                        : 0;
  return (line - a) & ~((a - line) ^ line);
}

// Precomputed attack tables, filled by init_bitboards().
extern Bitboard KNIGHT_ATTACKS[64];
extern Bitboard KING_ATTACKS[64];
extern Bitboard PAWN_ATTACKS[2][64];

// Ray tables: RAYS[dir][sq] is the bitboard of squares strictly in that
// direction from sq (not including sq), stopping at the board edge.
// Directions: 0=N, 1=E, 2=S, 3=W, 4=NE, 5=NW, 6=SE, 7=SW.
extern Bitboard RAYS[8][64];

void init_bitboards();

inline Bitboard knight_attacks(Square sq) { return KNIGHT_ATTACKS[sq]; }
inline Bitboard king_attacks(Square sq) { return KING_ATTACKS[sq]; }
inline Bitboard pawn_attacks(Color c, Square sq) { return PAWN_ATTACKS[c][sq]; }

Bitboard rook_attacks(Square sq, Bitboard occ);
Bitboard bishop_attacks(Square sq, Bitboard occ);
inline Bitboard queen_attacks(Square sq, Bitboard occ) {
  return rook_attacks(sq, occ) | bishop_attacks(sq, occ);
}

}  // namespace gambit