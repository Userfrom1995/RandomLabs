#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "bitboard.h"
#include "types.h"

namespace gambit {

class Position {
 public:
  Position();

  // Set up a position from FEN; returns false if the FEN is invalid.
  bool set_from_fen(const std::string& fen);
  std::string fen() const;

  void clear();
  void put_piece(Piece p, Square sq);
  void remove_piece(Square sq);

  // Make/unmake a move. The move must be pseudo-legal with correct
  // captured() and flag() fields; make() updates the position, unmake()
  // restores it.
  void make(Move m);
  void unmake(Move m);

  Color side_to_move() const { return stm_; }
  Square ep_square() const { return ep_square_; }
  int castling() const { return castling_; }
  int halfmove_clock() const { return halfmove_; }
  int fullmove_number() const { return fullmove_; }
  uint64_t key() const { return key_; }
  int history_ply() const { return (int)states_.size(); }

  Bitboard pieces() const { return occ_; }
  Bitboard pieces(Color c) const { return by_color_[c]; }
  Bitboard pieces(PieceType t) const { return by_type_[t]; }
  Bitboard pieces(Color c, PieceType t) const {
    return by_color_[c] & by_type_[t];
  }

  Piece piece_on(Square sq) const { return board_[sq]; }

  Square king_square(Color c) const {
    return Square(lsb(by_color_[c] & by_type_[KING]));
  }

  bool is_check() const { return is_square_attacked(king_square(stm_), ~stm_); }

  bool is_square_attacked(Square sq, Color by) const;

  // True if the move, played from this position, is legal.
  bool is_legal(Move m) const;

  bool is_draw() const;
  bool insufficient_material() const;

  Move last_move() const { return states_.empty() ? MOVE_NONE : states_.back().move; }

  const std::vector<uint64_t>& key_history() const { return key_history_; }

 private:
  struct State {
    Move move;
    uint64_t key;
    int castling;
    int ep;
    int halfmove;
    Piece captured;
  };

  void update_castling_rights(Square from, Square to, Piece moved);

  Piece board_[64];
  Bitboard by_type_[7];
  Bitboard by_color_[2];
  Bitboard occ_;
  Color stm_;
  Square ep_square_;
  int castling_;
  int halfmove_;
  int fullmove_;
  uint64_t key_;
  std::vector<State> states_;
  std::vector<uint64_t> key_history_;
};

}  // namespace gambit