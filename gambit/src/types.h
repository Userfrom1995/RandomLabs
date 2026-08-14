#pragma once

#include <cstdint>
#include <string>

namespace gambit {

constexpr int MAX_PLY = 64;

enum Color : int {
  WHITE = 0,
  BLACK = 1,
  NO_COLOR = 2,
};

inline Color operator~(Color c) { return c == WHITE ? BLACK : WHITE; }

enum PieceType : int {
  NO_PIECE_TYPE = 0,
  PAWN = 1,
  KNIGHT = 2,
  BISHOP = 3,
  ROOK = 4,
  QUEEN = 5,
  KING = 6,
};

// Piece encoding: bits 0-2 are the piece type, bit 3 is the color.
// NO_PIECE (0) means the square is empty.
enum Piece : int {
  NO_PIECE = 0,
  W_PAWN = 1,
  W_KNIGHT = 2,
  W_BISHOP = 3,
  W_ROOK = 4,
  W_QUEEN = 5,
  W_KING = 6,
  B_PAWN = 9,
  B_KNIGHT = 10,
  B_BISHOP = 11,
  B_ROOK = 12,
  B_QUEEN = 13,
  B_KING = 14,
};

inline PieceType type_of(Piece p) { return PieceType(p & 7); }
inline Color color_of(Piece p) { return Color((p >> 3) & 1); }
inline Piece make_piece(Color c, PieceType t) { return Piece((c << 3) | t); }

// Squares: a1 = 0, b1 = 1, ... h8 = 63.
enum Square : int {
  SQ_A1, SQ_B1, SQ_C1, SQ_D1, SQ_E1, SQ_F1, SQ_G1, SQ_H1,
  SQ_A2, SQ_B2, SQ_C2, SQ_D2, SQ_E2, SQ_F2, SQ_G2, SQ_H2,
  SQ_A3, SQ_B3, SQ_C3, SQ_D3, SQ_E3, SQ_F3, SQ_G3, SQ_H3,
  SQ_A4, SQ_B4, SQ_C4, SQ_D4, SQ_E4, SQ_F4, SQ_G4, SQ_H4,
  SQ_A5, SQ_B5, SQ_C5, SQ_D5, SQ_E5, SQ_F5, SQ_G5, SQ_H5,
  SQ_A6, SQ_B6, SQ_C6, SQ_D6, SQ_E6, SQ_F6, SQ_G6, SQ_H6,
  SQ_A7, SQ_B7, SQ_C7, SQ_D7, SQ_E7, SQ_F7, SQ_G7, SQ_H7,
  SQ_A8, SQ_B8, SQ_C8, SQ_D8, SQ_E8, SQ_F8, SQ_G8, SQ_H8,
  SQ_NONE = 64,
};

constexpr int FILE_A = 0, FILE_B = 1, FILE_C = 2, FILE_D = 3,
              FILE_E = 4, FILE_F = 5, FILE_G = 6, FILE_H = 7;
constexpr int RANK_1 = 0, RANK_2 = 1, RANK_3 = 2, RANK_4 = 3,
              RANK_5 = 4, RANK_6 = 5, RANK_7 = 6, RANK_8 = 7;

inline Square make_square(int file, int rank) { return Square(rank * 8 + file); }
inline int file_of(Square sq) { return int(sq) & 7; }
inline int rank_of(Square sq) { return int(sq) >> 3; }
inline bool is_ok_sq(Square sq) { return int(sq) >= 0 && int(sq) < 64; }

// Castling rights bitmask.
enum CastlingRights : int {
  NO_CASTLING = 0,
  WHITE_OO = 1,
  WHITE_OOO = 2,
  BLACK_OO = 4,
  BLACK_OOO = 8,
  ANY_CASTLING = 15,
};

// Move flags, stored in bits 15-17.
enum MoveFlag : int {
  MF_NORMAL = 0,
  MF_DOUBLE_PUSH = 1,
  MF_EN_PASSANT = 2,
  MF_CASTLE = 3,
  MF_PROMOTION = 4,
};

class Move {
 public:
  Move() : data_(0) {}
  explicit constexpr Move(uint32_t data) : data_(data) {}

  // Layout:
  //   bits 0-5   from square
  //   bits 6-11  to square
  //   bits 12-14 promotion piece type
  //   bits 15-17 flag
  //   bits 18-20 captured piece type
  //   bits 21-23 moving piece type
  static Move make(int from, int to, MoveFlag flag, PieceType promo,
                   PieceType captured, PieceType moving) {
    uint32_t d = uint32_t(from) | (uint32_t(to) << 6) |
                 (uint32_t(promo) << 12) | (uint32_t(flag) << 15) |
                 (uint32_t(captured) << 18) | (uint32_t(moving) << 21);
    return Move(d);
  }

  bool operator==(const Move& o) const { return data_ == o.data_; }
  bool operator!=(const Move& o) const { return data_ != o.data_; }

  int from() const { return data_ & 63; }
  int to() const { return (data_ >> 6) & 63; }
  PieceType promo() const { return PieceType((data_ >> 12) & 7); }
  MoveFlag flag() const { return MoveFlag((data_ >> 15) & 7); }
  PieceType captured() const { return PieceType((data_ >> 18) & 7); }
  PieceType moving() const { return PieceType((data_ >> 21) & 7); }

  bool is_normal() const { return flag() == MF_NORMAL; }
  bool is_double_push() const { return flag() == MF_DOUBLE_PUSH; }
  bool is_en_passant() const { return flag() == MF_EN_PASSANT; }
  bool is_castle() const { return flag() == MF_CASTLE; }
  bool is_promotion() const { return flag() == MF_PROMOTION; }
  bool is_capture() const { return captured() != NO_PIECE_TYPE; }
  bool is_zero() const { return data_ == 0; }

  uint32_t data() const { return data_; }

  std::string uci() const;

 private:
  uint32_t data_;
};

constexpr Move MOVE_NONE = Move(0);

}  // namespace gambit