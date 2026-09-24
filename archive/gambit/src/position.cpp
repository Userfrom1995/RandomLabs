#include "position.h"

#include <cctype>
#include <sstream>

#include "zobrist.h"

namespace gambit {

namespace {

constexpr Bitboard LIGHT_SQUARES = 0x55AA55AA55AA55AAULL;
constexpr Bitboard DARK_SQUARES = 0xAA55AA55AA55AA55ULL;

int char_to_piece(char c) {
  switch (std::tolower(c)) {
    case 'p': return PAWN;
    case 'n': return KNIGHT;
    case 'b': return BISHOP;
    case 'r': return ROOK;
    case 'q': return QUEEN;
    case 'k': return KING;
    default: return NO_PIECE_TYPE;
  }
}

char piece_char(Piece p) {
  const char* table = " PNBRQK";
  char c = table[type_of(p)];
  return color_of(p) == WHITE ? c : char(std::tolower(c));
}

int char_to_castling(char c) {
  switch (c) {
    case 'K': return WHITE_OO;
    case 'Q': return WHITE_OOO;
    case 'k': return BLACK_OO;
    case 'q': return BLACK_OOO;
    default: return NO_CASTLING;
  }
}

int char_to_file(char c) { return c - 'a'; }
int char_to_rank(char c) { return c - '1'; }

}  // namespace

Position::Position() { clear(); }

void Position::clear() {
  for (int i = 0; i < 64; ++i) board_[i] = NO_PIECE;
  for (auto& b : by_type_) b = 0;
  for (auto& b : by_color_) b = 0;
  occ_ = 0;
  stm_ = WHITE;
  ep_square_ = SQ_NONE;
  castling_ = NO_CASTLING;
  halfmove_ = 0;
  fullmove_ = 1;
  key_ = 0;
  states_.clear();
  key_history_.clear();
}

void Position::put_piece(Piece p, Square sq) {
  board_[sq] = p;
  by_type_[type_of(p)] |= square_bb(sq);
  by_color_[color_of(p)] |= square_bb(sq);
  occ_ |= square_bb(sq);
  key_ ^= ZOBRIST.piece[p][sq];
}

void Position::remove_piece(Square sq) {
  Piece p = board_[sq];
  if (p == NO_PIECE) return;
  board_[sq] = NO_PIECE;
  by_type_[type_of(p)] &= ~square_bb(sq);
  by_color_[color_of(p)] &= ~square_bb(sq);
  occ_ &= ~square_bb(sq);
  key_ ^= ZOBRIST.piece[p][sq];
}

bool Position::set_from_fen(const std::string& fen) {
  clear();
  std::istringstream ss(fen);
  std::string board_part, stm_part, cast_part, ep_part, half_part, full_part;
  if (!(ss >> board_part >> stm_part >> cast_part >> ep_part)) return false;

  int file = 0, rank = 7;  // FEN starts at rank 8
  for (char c : board_part) {
    if (c == '/') {
      if (file != 8) return false;
      file = 0;
      --rank;
      if (rank < 0) return false;
    } else if (std::isdigit(c)) {
      file += c - '0';
      if (file > 8) return false;
    } else {
      int pt = char_to_piece(c);
      if (pt == NO_PIECE_TYPE || file > 7) return false;
      Color col = std::isupper(c) ? WHITE : BLACK;
      put_piece(make_piece(col, PieceType(pt)), make_square(file, rank));
      ++file;
    }
  }
  if (rank != 0 || file != 8) return false;

  if (stm_part == "w") stm_ = WHITE;
  else if (stm_part == "b") stm_ = BLACK;
  else return false;

  if (cast_part == "-") castling_ = NO_CASTLING;
  else {
    castling_ = NO_CASTLING;
    for (char c : cast_part) {
      int cr = char_to_castling(c);
      if (cr == NO_CASTLING) return false;
      castling_ |= cr;
    }
  }

  if (ep_part == "-") ep_square_ = SQ_NONE;
  else {
    if (ep_part.size() != 2) return false;
    int f = char_to_file(ep_part[0]);
    int r = char_to_rank(ep_part[1]);
    if (f < 0 || f > 7 || r < 0 || r > 7) return false;
    ep_square_ = make_square(f, r);
  }

  if (!(ss >> half_part)) return false;
  halfmove_ = std::stoi(half_part);
  if (halfmove_ < 0) return false;
  if (!(ss >> full_part)) fullmove_ = 1;
  else fullmove_ = std::stoi(full_part);
  if (fullmove_ < 1) return false;

  // Build the initial key: pieces, castling, ep file, side to move.
  key_ = 0;
  for (int sq = 0; sq < 64; ++sq) {
    Piece p = board_[sq];
    if (p != NO_PIECE) key_ ^= ZOBRIST.piece[p][sq];
  }
  if (castling_ != NO_CASTLING) key_ ^= ZOBRIST.castling[castling_];
  if (ep_square_ != SQ_NONE) key_ ^= ZOBRIST.ep[file_of(ep_square_)];
  if (stm_ == BLACK) key_ ^= ZOBRIST.side;
  return true;
}

std::string Position::fen() const {
  std::ostringstream os;
  for (int r = 7; r >= 0; --r) {
    int empty = 0;
    for (int f = 0; f < 8; ++f) {
      Square sq = make_square(f, r);
      Piece p = board_[sq];
      if (p == NO_PIECE) {
        ++empty;
      } else {
        if (empty) {
          os << empty;
          empty = 0;
        }
        os << piece_char(p);
      }
    }
    if (empty) os << empty;
    if (r > 0) os << '/';
  }
  os << ' ' << (stm_ == WHITE ? "w" : "b");
  os << ' ';
  if (castling_ == NO_CASTLING) os << '-';
  else {
    if (castling_ & WHITE_OO) os << 'K';
    if (castling_ & WHITE_OOO) os << 'Q';
    if (castling_ & BLACK_OO) os << 'k';
    if (castling_ & BLACK_OOO) os << 'q';
  }
  os << ' ';
  if (ep_square_ == SQ_NONE) os << '-';
  else os << char('a' + file_of(ep_square_)) << char('1' + rank_of(ep_square_));
  os << ' ' << halfmove_ << ' ' << fullmove_;
  return os.str();
}

bool Position::is_square_attacked(Square sq, Color by) const {
  if (PAWN_ATTACKS[~by][sq] & pieces(by, PAWN)) return true;
  if (KNIGHT_ATTACKS[sq] & pieces(by, KNIGHT)) return true;
  if (KING_ATTACKS[sq] & pieces(by, KING)) return true;
  Bitboard occ = pieces();
  if (rook_attacks(sq, occ) & (pieces(by, ROOK) | pieces(by, QUEEN))) return true;
  if (bishop_attacks(sq, occ) & (pieces(by, BISHOP) | pieces(by, QUEEN)))
    return true;
  return false;
}

void Position::update_castling_rights(Square from, Square to, Piece moved) {
  if (type_of(moved) == KING) {
    if (color_of(moved) == WHITE) castling_ &= ~(WHITE_OO | WHITE_OOO);
    else castling_ &= ~(BLACK_OO | BLACK_OOO);
  }
  if (from == SQ_A1) castling_ &= ~WHITE_OOO;
  if (from == SQ_H1) castling_ &= ~WHITE_OO;
  if (from == SQ_A8) castling_ &= ~BLACK_OOO;
  if (from == SQ_H8) castling_ &= ~BLACK_OO;
  if (to == SQ_A1) castling_ &= ~WHITE_OOO;
  if (to == SQ_H1) castling_ &= ~WHITE_OO;
  if (to == SQ_A8) castling_ &= ~BLACK_OOO;
  if (to == SQ_H8) castling_ &= ~BLACK_OO;
}

void Position::make(Move m) {
  int from = m.from();
  int to = m.to();
  Color us = stm_;
  Piece moving = make_piece(us, m.moving());
  Piece captured = m.captured() == NO_PIECE_TYPE
                       ? NO_PIECE
                       : make_piece(~us, m.captured());

  states_.push_back({m, key_, castling_, ep_square_, halfmove_, captured});

  // Remove the previous ep-square contribution from the key.
  if (ep_square_ != SQ_NONE) key_ ^= ZOBRIST.ep[file_of(ep_square_)];
  // Remove the previous castling contribution.
  if (castling_ != NO_CASTLING) key_ ^= ZOBRIST.castling[castling_];

  remove_piece(Square(from));

  if (m.is_en_passant()) {
    Square captured_sq = us == WHITE ? Square(to - 8) : Square(to + 8);
    remove_piece(captured_sq);
    put_piece(make_piece(us, PAWN), Square(to));
  } else if (m.is_castle()) {
    put_piece(moving, Square(to));
    bool king_side = file_of(Square(to)) > file_of(Square(from));
    if (us == WHITE) {
      if (king_side) {
        remove_piece(SQ_H1);
        put_piece(make_piece(WHITE, ROOK), SQ_F1);
      } else {
        remove_piece(SQ_A1);
        put_piece(make_piece(WHITE, ROOK), SQ_D1);
      }
    } else {
      if (king_side) {
        remove_piece(SQ_H8);
        put_piece(make_piece(BLACK, ROOK), SQ_F8);
      } else {
        remove_piece(SQ_A8);
        put_piece(make_piece(BLACK, ROOK), SQ_D8);
      }
    }
  } else {
    if (captured != NO_PIECE) remove_piece(Square(to));
    PieceType placed = m.is_promotion() ? m.promo() : m.moving();
    put_piece(make_piece(us, placed), Square(to));
  }

  update_castling_rights(Square(from), Square(to), moving);

  ep_square_ = SQ_NONE;
  if (m.is_double_push())
    ep_square_ = us == WHITE ? Square(from + 8) : Square(from - 8);

  if (m.moving() == PAWN || captured != NO_PIECE) halfmove_ = 0;
  else ++halfmove_;

  stm_ = ~stm_;
  if (stm_ == WHITE) ++fullmove_;

  // Add the new castling and ep-square contributions.
  if (castling_ != NO_CASTLING) key_ ^= ZOBRIST.castling[castling_];
  if (ep_square_ != SQ_NONE) key_ ^= ZOBRIST.ep[file_of(ep_square_)];
  key_ ^= ZOBRIST.side;  // flip side to move

  key_history_.push_back(key_);
}

void Position::unmake(Move m) {
  if (states_.empty()) return;
  State st = states_.back();
  states_.pop_back();

  int from = m.from();
  int to = m.to();
  Color us = ~stm_;  // the side that made the move
  Piece moving = make_piece(us, m.moving());

  remove_piece(Square(to));

  if (m.is_en_passant()) {
    put_piece(moving, Square(from));
    Square captured_sq = us == WHITE ? Square(to - 8) : Square(to + 8);
    put_piece(make_piece(~us, PAWN), captured_sq);
  } else if (m.is_castle()) {
    put_piece(moving, Square(from));
    bool king_side = file_of(Square(to)) > file_of(Square(from));
    if (us == WHITE) {
      if (king_side) {
        remove_piece(SQ_F1);
        put_piece(make_piece(WHITE, ROOK), SQ_H1);
      } else {
        remove_piece(SQ_D1);
        put_piece(make_piece(WHITE, ROOK), SQ_A1);
      }
    } else {
      if (king_side) {
        remove_piece(SQ_F8);
        put_piece(make_piece(BLACK, ROOK), SQ_H8);
      } else {
        remove_piece(SQ_D8);
        put_piece(make_piece(BLACK, ROOK), SQ_A8);
      }
    }
  } else {
    put_piece(moving, Square(from));
    if (st.captured != NO_PIECE) put_piece(st.captured, Square(to));
  }

  stm_ = ~stm_;
  key_ = st.key;
  castling_ = st.castling;
  ep_square_ = Square(st.ep);
  halfmove_ = st.halfmove;
  if (stm_ == BLACK) --fullmove_;  // a black move completed a full move
  key_history_.pop_back();
}

bool Position::is_legal(Move m) const {
  Position copy = *this;
  copy.make(m);
  // After make, stm_ is the opponent; the mover's king must not be attacked.
  Color mover = ~copy.side_to_move();
  return !copy.is_square_attacked(copy.king_square(mover), copy.side_to_move());
}

bool Position::insufficient_material() const {
  int knights = popcount(pieces(KNIGHT));
  int bishops = popcount(pieces(BISHOP));
  int queens = popcount(pieces(QUEEN));
  int rooks = popcount(pieces(ROOK));
  int pawns = popcount(pieces(PAWN));
  if (pawns == 0 && rooks == 0 && queens == 0) {
    if (knights + bishops <= 1) return true;
    if (knights == 0 && bishops == 2) {
      Bitboard bb = pieces(BISHOP);
      if (bb == (bb & LIGHT_SQUARES) || bb == (bb & DARK_SQUARES)) return true;
    }
  }
  return false;
}

bool Position::is_draw() const {
  if (insufficient_material()) return true;
  if (halfmove_ >= 100) return true;
  // Threefold repetition: count occurrences of the current key across the
  // reversible part of the game. The current position's key is the last
  // element of the history, so it counts as the first occurrence.
  uint64_t cur = key_;
  int count = 0;
  size_t start = key_history_.size();
  size_t max_steps = std::min<size_t>(key_history_.size(), (size_t)halfmove_ + 1);
  for (size_t i = 1; i <= max_steps; ++i) {
    size_t idx = start - i;
    if (key_history_[idx] == cur) {
      ++count;
      if (count >= 3) return true;
    }
  }
  return false;
}

}  // namespace gambit
