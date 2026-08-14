#include "movegen.h"

namespace gambit {

namespace {

std::string square_name(int sq) {
  std::string s;
  s += char('a' + file_of(Square(sq)));
  s += char('1' + rank_of(Square(sq)));
  return s;
}

char promo_char(PieceType pt) {
  switch (pt) {
    case KNIGHT: return 'n';
    case BISHOP: return 'b';
    case ROOK: return 'r';
    case QUEEN: return 'q';
    default: return ' ';
  }
}

}  // namespace

std::string Move::uci() const {
  std::string s = square_name(from()) + square_name(to());
  if (is_promotion()) s += promo_char(promo());
  return s;
}

namespace {

inline Move make_pawn_move(int from, int to, MoveFlag flag, PieceType promo,
                           PieceType captured, Color us) {
  (void)us;
  return Move::make(from, to, flag, promo, captured, PAWN);
}

template <typename F>
void generate_pawn_moves(const Position& pos, Color us, F&& emit) {
  Bitboard pawns = pos.pieces(us, PAWN);
  Bitboard occ = pos.pieces();
  Bitboard empty = ~occ;
  Bitboard enemy = pos.pieces(~us);

  int up = us == WHITE ? 8 : -8;
  int promo_rank = us == WHITE ? RANK_8 : RANK_1;
  int double_rank = us == WHITE ? RANK_2 : RANK_7;

  // Single pushes.
  Bitboard single = us == WHITE ? (pawns << 8) & empty : (pawns >> 8) & empty;
  Bitboard promos_src = single & rank_bbs(promo_rank);
  Bitboard single_promos = promos_src;
  Bitboard single_rest = single & ~single_promos;

  while (single_promos) {
    int to = pop_lsb(single_promos);
    int from = to - up;
    emit(make_pawn_move(from, to, MF_PROMOTION, QUEEN, NO_PIECE_TYPE, us));
    emit(make_pawn_move(from, to, MF_PROMOTION, ROOK, NO_PIECE_TYPE, us));
    emit(make_pawn_move(from, to, MF_PROMOTION, BISHOP, NO_PIECE_TYPE, us));
    emit(make_pawn_move(from, to, MF_PROMOTION, KNIGHT, NO_PIECE_TYPE, us));
  }
  while (single_rest) {
    int to = pop_lsb(single_rest);
    emit(make_pawn_move(to - up, to, MF_NORMAL, NO_PIECE_TYPE, NO_PIECE_TYPE, us));
  }

  // Double pushes from the second rank.
  Bitboard double_push_src =
      us == WHITE ? ((pawns & rank_bbs(double_rank)) << 8) & empty
                  : ((pawns & rank_bbs(double_rank)) >> 8) & empty;
  Bitboard double_rest =
      us == WHITE ? (double_push_src << 8) & empty : (double_push_src >> 8) & empty;
  while (double_rest) {
    int to = pop_lsb(double_rest);
    emit(make_pawn_move(to - 2 * up, to, MF_DOUBLE_PUSH, NO_PIECE_TYPE, NO_PIECE_TYPE, us));
  }

  // Captures: diagonal pawn attacks against enemy pieces.
  Bitboard p = pawns;
  while (p) {
    int from = pop_lsb(p);
    Bitboard atk = pawn_attacks(us, Square(from)) & enemy;
    Bitboard promo_caps = atk & rank_bbs(promo_rank);
    Bitboard rest_caps = atk & ~promo_caps;
    while (promo_caps) {
      int to = pop_lsb(promo_caps);
      emit(make_pawn_move(from, to, MF_PROMOTION, QUEEN, type_of(pos.piece_on(Square(to))), us));
      emit(make_pawn_move(from, to, MF_PROMOTION, ROOK, type_of(pos.piece_on(Square(to))), us));
      emit(make_pawn_move(from, to, MF_PROMOTION, BISHOP, type_of(pos.piece_on(Square(to))), us));
      emit(make_pawn_move(from, to, MF_PROMOTION, KNIGHT, type_of(pos.piece_on(Square(to))), us));
    }
    while (rest_caps) {
      int to = pop_lsb(rest_caps);
      emit(make_pawn_move(from, to, MF_NORMAL, NO_PIECE_TYPE, type_of(pos.piece_on(Square(to))), us));
    }
  }

  // En passant.
  Square ep = pos.ep_square();
  if (ep != SQ_NONE) {
    Bitboard attackers = pawn_attacks(~us, ep) & pawns;
    while (attackers) {
      int from = pop_lsb(attackers);
      emit(make_pawn_move(from, ep, MF_EN_PASSANT, NO_PIECE_TYPE, PAWN, us));
    }
  }
}

template <typename F>
void generate_piece_moves(const Position& pos, Color us, PieceType pt, F&& emit) {
  Bitboard pieces = pos.pieces(us, pt);
  Bitboard occ = pos.pieces();
  Bitboard empty = ~occ;
  Bitboard enemy = pos.pieces(~us);
  while (pieces) {
    int from = pop_lsb(pieces);
    Bitboard targets;
    switch (pt) {
      case KNIGHT: targets = knight_attacks(Square(from)); break;
      case KING: targets = king_attacks(Square(from)); break;
      case BISHOP: targets = bishop_attacks(Square(from), occ); break;
      case ROOK: targets = rook_attacks(Square(from), occ); break;
      case QUEEN: targets = queen_attacks(Square(from), occ); break;
      default: targets = 0; break;
    }
    Bitboard moves = targets & (empty | enemy);
    while (moves) {
      int to = pop_lsb(moves);
      PieceType captured =
          (targets & enemy) & (1ULL << to) ? type_of(pos.piece_on(Square(to)))
                                           : NO_PIECE_TYPE;
      emit(Move::make(from, to, MF_NORMAL, NO_PIECE_TYPE, captured, pt));
    }
  }
}

template <typename F>
void generate_castling(const Position& pos, Color us, F&& emit) {
  int rights = pos.castling();
  int cr_oo = us == WHITE ? WHITE_OO : BLACK_OO;
  int cr_ooo = us == WHITE ? WHITE_OOO : BLACK_OOO;
  Square king_from = pos.king_square(us);
  Bitboard occ = pos.pieces();

  // Kingside.
  if (rights & cr_oo) {
    Square rook_sq = us == WHITE ? SQ_H1 : SQ_H8;
    Square f = us == WHITE ? SQ_F1 : SQ_F8;
    Square g = us == WHITE ? SQ_G1 : SQ_G8;
    if ((occ & square_bb(rook_sq)) && !(occ & (square_bb(f) | square_bb(g))) &&
        !pos.is_square_attacked(king_from, ~us) &&
        !pos.is_square_attacked(f, ~us) && !pos.is_square_attacked(g, ~us)) {
      emit(Move::make(king_from, g, MF_CASTLE, NO_PIECE_TYPE, NO_PIECE_TYPE, KING));
    }
  }
  // Queenside.
  if (rights & cr_ooo) {
    Square rook_sq = us == WHITE ? SQ_A1 : SQ_A8;
    Square b = us == WHITE ? SQ_B1 : SQ_B8;
    Square c = us == WHITE ? SQ_C1 : SQ_C8;
    Square d = us == WHITE ? SQ_D1 : SQ_D8;
    if ((occ & square_bb(rook_sq)) && !(occ & (square_bb(b) | square_bb(c) | square_bb(d))) &&
        !pos.is_square_attacked(king_from, ~us) &&
        !pos.is_square_attacked(d, ~us) && !pos.is_square_attacked(c, ~us)) {
      emit(Move::make(king_from, c, MF_CASTLE, NO_PIECE_TYPE, NO_PIECE_TYPE, KING));
    }
  }
}

}  // namespace

std::vector<Move> generate_moves(const Position& pos) {
  std::vector<Move> moves;
  Color us = pos.side_to_move();
  generate_pawn_moves(pos, us, [&](Move m) { moves.push_back(m); });
  generate_piece_moves(pos, us, KNIGHT, [&](Move m) { moves.push_back(m); });
  generate_piece_moves(pos, us, BISHOP, [&](Move m) { moves.push_back(m); });
  generate_piece_moves(pos, us, ROOK, [&](Move m) { moves.push_back(m); });
  generate_piece_moves(pos, us, QUEEN, [&](Move m) { moves.push_back(m); });
  generate_piece_moves(pos, us, KING, [&](Move m) { moves.push_back(m); });
  generate_castling(pos, us, [&](Move m) { moves.push_back(m); });
  return moves;
}

std::vector<Move> generate_captures(const Position& pos) {
  std::vector<Move> moves;
  Color us = pos.side_to_move();
  generate_pawn_moves(pos, us, [&](Move m) {
    if (m.is_capture()) moves.push_back(m);
  });
  generate_piece_moves(pos, us, KNIGHT, [&](Move m) {
    if (m.is_capture()) moves.push_back(m);
  });
  generate_piece_moves(pos, us, BISHOP, [&](Move m) {
    if (m.is_capture()) moves.push_back(m);
  });
  generate_piece_moves(pos, us, ROOK, [&](Move m) {
    if (m.is_capture()) moves.push_back(m);
  });
  generate_piece_moves(pos, us, QUEEN, [&](Move m) {
    if (m.is_capture()) moves.push_back(m);
  });
  generate_piece_moves(pos, us, KING, [&](Move m) {
    if (m.is_capture()) moves.push_back(m);
  });
  return moves;
}

std::vector<Move> generate_legal_moves(const Position& pos) {
  std::vector<Move> legal;
  for (Move m : generate_moves(pos)) {
    if (pos.is_legal(m)) legal.push_back(m);
  }
  return legal;
}

Move parse_move(const Position& pos, const std::string& s) {
  if (s.size() < 4 || s.size() > 5) return MOVE_NONE;
  auto sq_of = [&](char f, char r) {
    if (f < 'a' || f > 'h' || r < '1' || r > '8') return -1;
    return int((r - '1') * 8 + (f - 'a'));
  };
  int from = sq_of(s[0], s[1]);
  int to = sq_of(s[2], s[3]);
  if (from < 0 || to < 0) return MOVE_NONE;

  PieceType promo = NO_PIECE_TYPE;
  if (s.size() == 5) {
    switch (s[4]) {
      case 'n': promo = KNIGHT; break;
      case 'b': promo = BISHOP; break;
      case 'r': promo = ROOK; break;
      case 'q': promo = QUEEN; break;
      default: return MOVE_NONE;
    }
  }

  for (Move m : generate_moves(pos)) {
    if (m.from() == from && m.to() == to && m.promo() == promo) return m;
  }
  return MOVE_NONE;
}

}  // namespace gambit