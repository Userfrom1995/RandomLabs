#pragma once

#include <string>
#include <vector>

#include "position.h"
#include "search.h"
#include "tt.h"

namespace gambit {

// Print a text board with unicode pieces.
void print_board(const Position& pos);

// Convert a move to SAN (long-ish algebraic) for display and input matching.
std::string move_to_san(const Position& pos, Move m);

// Parse human input: SAN or long algebraic. Returns MOVE_NONE if invalid.
Move parse_human_move(const Position& pos, const std::string& input);

// CLI commands.
int cli_play(TranspositionTable& tt, const std::vector<std::string>& args);
int cli_analyze(TranspositionTable& tt, const std::vector<std::string>& args);
int cli_perft(const std::vector<std::string>& args);
int cli_divide(const std::vector<std::string>& args);
int cli_test();

}  // namespace gambit
