#pragma once

#include <array>

#include "types.h"

namespace gambit {

// Piece-square tables (white perspective, a1..h8 layout) and material values.
namespace eval {

constexpr int PAWN_VALUE = 100;
constexpr int KNIGHT_VALUE = 320;
constexpr int BISHOP_VALUE = 330;
constexpr int ROOK_VALUE = 500;
constexpr int QUEEN_VALUE = 900;

const std::array<int, 64>& pst(PieceType pt);

int material_value(PieceType pt);

}  // namespace eval

}  // namespace gambit
