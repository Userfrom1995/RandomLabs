#pragma once

#include <vector>

#include "position.h"
#include "types.h"

namespace gambit {

// Generate all pseudo-legal moves for the side to move.
std::vector<Move> generate_moves(const Position& pos);

// Generate all legal moves (pseudo-legal, filtered for king safety).
std::vector<Move> generate_legal_moves(const Position& pos);

// Generate capture moves only (for quiescence search).
std::vector<Move> generate_captures(const Position& pos);

// Parse a move in long algebraic (UCI) notation, e.g. "e2e4" or "e7e8q".
// Returns MOVE_NONE if the string is not a legal pseudo-legal move.
Move parse_move(const Position& pos, const std::string& s);

}  // namespace gambit