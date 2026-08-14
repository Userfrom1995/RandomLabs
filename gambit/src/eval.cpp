#include "eval.h"

#include <array>

namespace gambit {
namespace eval {

namespace {

// Standard "Simplified Evaluation Function" tables (Chess Programming Wiki),
// written in rank-8-to-rank-1 order.
constexpr std::array<int, 64> PAWN_TABLE = {
    0,   0,   0,   0,   0,   0,   0,   0,
    50,  50,  50,  50,  50,  50,  50,  50,
    10,  10,  20,  30,  30,  20,  10,  10,
    5,   5,   10,  25,  25,  10,  5,   5,
    0,   0,   0,   20,  20,  0,   0,   0,
    5,   -5,  -10, 0,   0,   -10, -5,  5,
    5,   10,  10,  -20, -20, 10,  10,  5,
    0,   0,   0,   0,   0,   0,   0,   0,
};

constexpr std::array<int, 64> KNIGHT_TABLE = {
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0,   0,   0,   0,   -20, -40,
    -30, 0,   10,  15,  15,  10,  0,   -30,
    -30, 5,   15,  20,  20,  15,  5,   -30,
    -30, 0,   15,  20,  20,  15,  0,   -30,
    -30, 5,   10,  15,  15,  10,  5,   -30,
    -40, -20, 0,   5,   5,   0,   -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
};

constexpr std::array<int, 64> BISHOP_TABLE = {
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0,   0,   0,   0,   0,   0,   -10,
    -10, 0,   5,   10,  10,  5,   0,   -10,
    -10, 5,   5,   10,  10,  5,   5,   -10,
    -10, 0,   10,  10,  10,  10,  0,   -10,
    -10, 10,  10,  10,  10,  10,  10,  -10,
    -10, 5,   0,   0,   0,   0,   5,   -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
};

constexpr std::array<int, 64> ROOK_TABLE = {
    0,  0,  0,  0,  0,  0,  0,  0,
    5,  10, 10, 10, 10, 10, 10, 5,
    -5, 0,  0,  0,  0,  0,  0,  -5,
    -5, 0,  0,  0,  0,  0,  0,  -5,
    -5, 0,  0,  0,  0,  0,  0,  -5,
    -5, 0,  0,  0,  0,  0,  0,  -5,
    -5, 0,  0,  0,  0,  0,  0,  -5,
    0,  0,  0,  5,  5,  0,  0,  0,
};

constexpr std::array<int, 64> QUEEN_TABLE = {
    -20, -10, -10, -5,  -5,  -10, -10, -20,
    -10, 0,   0,   0,   0,   0,   0,   -10,
    -10, 0,   5,   5,   5,   5,   0,   -10,
    -5,  0,   5,   5,   5,   5,   0,   -5,
    0,   0,   5,   5,   5,   5,   0,   -5,
    -10, 5,   5,   5,   5,   5,   0,   -10,
    -10, 0,   5,   0,   0,   0,   0,   -10,
    -20, -10, -10, -5,  -5,  -10, -10, -20,
};

constexpr std::array<int, 64> KING_TABLE = {
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20,  20,  0,   0,   0,   0,   20,  20,
    20,  30,  10,  0,   0,   10,  30,  20,
};

}  // namespace

const std::array<int, 64>& pst(PieceType pt) {
  switch (pt) {
    case PAWN: return PAWN_TABLE;
    case KNIGHT: return KNIGHT_TABLE;
    case BISHOP: return BISHOP_TABLE;
    case ROOK: return ROOK_TABLE;
    case QUEEN: return QUEEN_TABLE;
    default: return KING_TABLE;
  }
}

int material_value(PieceType pt) {
  switch (pt) {
    case PAWN: return PAWN_VALUE;
    case KNIGHT: return KNIGHT_VALUE;
    case BISHOP: return BISHOP_VALUE;
    case ROOK: return ROOK_VALUE;
    case QUEEN: return QUEEN_VALUE;
    default: return 0;
  }
}

}  // namespace eval
}  // namespace gambit