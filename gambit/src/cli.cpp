#include "cli.h"

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <iostream>
#include <string>
#include <vector>

#include "bitboard.h"
#include "eval.h"
#include "movegen.h"
#include "perft.h"
#include "tests.h"
#include "zobrist.h"

namespace gambit {

namespace {

const char* PIECE_GLYPHS = " PNBRQK";
const char* UNICODE_GLYPHS[12] = {
    "\u2659", "\u2658", "\u2657", "\u2656", "\u2655", "\u2654",  // white
    "\u265F", "\u265E", "\u265D", "\u265C", "\u265B", "\u265A",  // black
};

std::string square_name(int sq) {
  std::string s;
  s += char('a' + file_of(Square(sq)));
  s += char('1' + rank_of(Square(sq)));
  return s;
}

bool is_check_suffix(std::string s) {
  (void)s;
  return false;
}

std::string trim_suffixes(const std::string& s) {
  size_t n = s.size();
  while (n > 0 && (s[n - 1] == '!' || s[n - 1] == '?' || s[n - 1] == '+' ||
                   s[n - 1] == '#')) {
    --n;
  }
  return s.substr(0, n);
}

}  // namespace

void print_board(const Position& pos) {
  std::printf("\n");
  std::printf("  +------------------------+\n");
  for (int r = 7; r >= 0; --r) {
    std::printf("%d |", r + 1);
    for (int f = 0; f < 8; ++f) {
      Square sq = make_square(f, r);
      Piece p = pos.piece_on(sq);
      std::printf(" %s", p == NO_PIECE ? "." : UNICODE_GLYPHS[type_of(p) - 1 + (color_of(p) == BLACK ? 6 : 0)]);
    }
    std::printf("|\n");
  }
  std::printf("  +------------------------+\n");
  std::printf("    a b c d e f g h\n\n");
  std::printf("FEN: %s\n", pos.fen().c_str());
  std::printf("Side to move: %s\n", pos.side_to_move() == WHITE ? "white" : "black");
}

std::string move_to_san(const Position& pos, Move m) {
  if (m.is_castle()) {
    return file_of(Square(m.to())) > file_of(Square(m.from())) ? "O-O" : "O-O-O";
  }

  std::string san;
  PieceType pt = m.moving();
  if (pt != PAWN) {
    san += PIECE_GLYPHS[pt];
  }

  // Disambiguation: find other same-type pieces attacking the target.
  int from = m.from();
  int to = m.to();
  Bitboard occ = pos.pieces();
  bool need_file = false, need_rank = false, need_both = false;
  bool found_other = false;
  Color us = pos.side_to_move();

  auto same_piece_can_reach = [&](int sq) -> bool {
    // Check whether a piece of type pt on sq could reach `to` (pseudo-legal,
    // ignoring pins) and is not the source.
    if (sq == from) return false;
    Square s = Square(sq);
    Bitboard targets = 0;
    switch (pt) {
      case KNIGHT: targets = knight_attacks(s) & square_bb(Square(to)); break;
      case BISHOP: targets = bishop_attacks(s, occ) & square_bb(Square(to)); break;
      case ROOK: targets = rook_attacks(s, occ) & square_bb(Square(to)); break;
      case QUEEN: targets = queen_attacks(s, occ) & square_bb(Square(to)); break;
      case KING: targets = king_attacks(s) & square_bb(Square(to)); break;
      default: break;
    }
    if (!targets) return false;
    // The destination square must be empty or hold an enemy piece.
    Piece dest = pos.piece_on(Square(to));
    if (dest != NO_PIECE && color_of(dest) == us) return false;
    return true;
  };

  Bitboard peers = pos.pieces(us, pt);
  while (peers) {
    int sq = pop_lsb(peers);
    if (same_piece_can_reach(sq)) {
      found_other = true;
      if (file_of(Square(sq)) != file_of(Square(from))) need_file = true;
      if (rank_of(Square(sq)) != rank_of(Square(from))) need_rank = true;
    }
  }
  if (found_other && need_file && need_rank) need_both = true;

  if (m.is_capture()) {
    if (pt == PAWN) san += char('a' + file_of(Square(from)));
    san += 'x';
  } else if (pt == PAWN && m.is_en_passant()) {
    san += char('a' + file_of(Square(from)));
    san += 'x';
  }

  if (pt != PAWN) {
    if (need_both) {
      san += char('a' + file_of(Square(from)));
      san += char('1' + rank_of(Square(from)));
    } else if (need_file) {
      san += char('a' + file_of(Square(from)));
    } else if (need_rank) {
      san += char('1' + rank_of(Square(from)));
    }
  }

  san += square_name(to);
  if (m.is_promotion()) {
    san += '=';
    san += PIECE_GLYPHS[m.promo()];
  }

  // Append check/mate suffix by simulating the move.
  Position copy = pos;
  copy.make(m);
  bool gives_check = copy.is_check();
  bool mate = gives_check && generate_legal_moves(copy).empty();
  if (mate) san += '#';
  else if (gives_check) san += '+';

  return san;
}

Move parse_human_move(const Position& pos, const std::string& input) {
  std::string in = trim_suffixes(input);
  if (in.empty()) return MOVE_NONE;

  // Long algebraic (UCI) notation, e.g. e2e4, e7e8q.
  if (in.size() >= 4 && in.size() <= 5 && in[0] >= 'a' && in[0] <= 'h' &&
      in[2] >= 'a' && in[2] <= 'h') {
    Move m = parse_move(pos, in);
    if (!m.is_zero() && pos.is_legal(m)) return m;
  }

  // SAN: match against generated legal moves.
  std::string normalized;
  normalized.reserve(in.size());
  for (char c : in) {
    if (c == '=' || c == 'x') continue;  // ignore optional separators
    normalized += c;
  }

  auto legal = generate_legal_moves(pos);
  for (Move m : legal) {
    std::string san = trim_suffixes(move_to_san(pos, m));
    std::string san_norm;
    for (char c : san) {
      if (c == '=' || c == 'x') continue;
      san_norm += c;
    }
    if (san_norm == normalized) return m;
  }
  return MOVE_NONE;
}

int cli_perft(const std::vector<std::string>& args) {
  int depth = 1;
  std::string fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  // Optional: perft <depth> <fen>
  if (args.size() >= 2) {
    try {
      depth = std::stoi(args[1]);
    } catch (...) {
      std::printf("error: bad depth %s\n", args[1].c_str());
      return 1;
    }
  }
  if (args.size() >= 3) {
    fen = args[2];
  }
  Position pos;
  if (!pos.set_from_fen(fen)) {
    std::printf("error: bad fen\n");
    return 1;
  }
  PerftResult r = perft(pos, depth);
  std::printf("perft depth %d: %llu nodes\n", depth, (unsigned long long)r.nodes);
  std::printf("  captures: %llu  ep: %llu  promotions: %llu  castles: %llu\n",
              (unsigned long long)r.captures, (unsigned long long)r.ep,
              (unsigned long long)r.promotions, (unsigned long long)r.castles);
  return 0;
}

int cli_divide(const std::vector<std::string>& args) {
  int depth = 1;
  std::string fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  if (args.size() >= 2) {
    try {
      depth = std::stoi(args[1]);
    } catch (...) {
      std::printf("error: bad depth %s\n", args[1].c_str());
      return 1;
    }
  }
  if (args.size() >= 3) {
    fen = args[2];
  }
  Position pos;
  if (!pos.set_from_fen(fen)) {
    std::printf("error: bad fen\n");
    return 1;
  }
  auto div = perft_divide(pos, depth);
  uint64_t total = 0;
  for (auto& [m, n] : div) {
    std::printf("%s: %llu\n", m.uci().c_str(), (unsigned long long)n);
    total += n;
  }
  std::printf("\nTotal: %llu\n", (unsigned long long)total);
  return 0;
}

int cli_analyze(TranspositionTable& tt, const std::vector<std::string>& args) {
  int depth = 10;
  std::string fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  if (args.size() >= 2) {
    try {
      depth = std::stoi(args[1]);
    } catch (...) {
      std::printf("error: bad depth %s\n", args[1].c_str());
      return 1;
    }
  }
  if (args.size() >= 3) {
    fen = args[2];
  }
  Position pos;
  if (!pos.set_from_fen(fen)) {
    std::printf("error: bad fen\n");
    return 1;
  }
  Search search(tt);
  SearchOptions o;
  o.depth = depth;
  SearchResult r = search.run(pos, o);
  std::printf("best move: %s\n", r.bestmove.is_zero() ? "(none)" : r.bestmove.uci().c_str());
  std::printf("score:     %s\n", score_str(r.score).c_str());
  std::printf("depth:     %d\n", r.depth);
  std::printf("nodes:     %llu\n", (unsigned long long)r.nodes);
  std::printf("time:      %lld ms\n", (long long)r.time_ms);
  std::printf("pv:        ");
  for (Move m : r.pv) std::printf("%s ", m.uci().c_str());
  std::printf("\n");
  return 0;
}

int cli_play(TranspositionTable& tt, const std::vector<std::string>& args) {
  // Determine who is human vs engine: default is human plays white.
  bool human_is_white = true;
  int engine_depth = 10;
  int engine_movetime_ms = 0;
  for (size_t i = 1; i < args.size(); ++i) {
    const std::string& a = args[i];
    if (a == "--black") human_is_white = false;
    else if (a == "--white") human_is_white = true;
    else if (a == "--depth" && i + 1 < args.size()) {
      engine_depth = std::stoi(args[++i]);
    } else if (a == "--movetime" && i + 1 < args.size()) {
      engine_movetime_ms = std::stoi(args[++i]);
    }
  }

  Position pos;
  pos.set_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  Search search(tt);

  while (true) {
    print_board(pos);

    bool human_turn = (pos.side_to_move() == WHITE) == human_is_white;
    auto legal = generate_legal_moves(pos);
    if (legal.empty()) {
      std::printf(pos.is_check() ? "\nCheckmate. %s wins.\n"
                                 : "\nStalemate. Draw.\n",
                  pos.side_to_move() == WHITE ? "Black" : "White");
      return 0;
    }
    if (pos.is_draw()) {
      std::printf("\nDraw.\n");
      return 0;
    }

    if (human_turn) {
      std::printf("Your move (SAN or e2e4, 'q' to quit, 'undo' to take back, "
                  "'hint' for a suggestion): ");
      std::string line;
      if (!std::getline(std::cin, line)) return 0;
      while (line.empty()) {
        if (!std::getline(std::cin, line)) return 0;
      }
      if (line == "q" || line == "quit") return 0;
      if (line == "undo" || line == "takeback") {
        if (pos.history_ply() >= 2) {
          pos.unmake(pos.last_move());
          pos.unmake(pos.last_move());
        } else if (pos.history_ply() == 1) {
          pos.unmake(pos.last_move());
        }
        continue;
      }
      if (line == "hint") {
        SearchOptions o;
        o.depth = engine_depth;
        if (engine_movetime_ms > 0) {
          o.depth = 0;
          o.movetime_ms = engine_movetime_ms;
        }
        SearchResult r = search.run(pos, o);
        std::printf("Suggestion: %s (%s)\n", r.bestmove.uci().c_str(),
                    score_str(r.score).c_str());
        continue;
      }
      Move m = parse_human_move(pos, line);
      if (m.is_zero()) {
        std::printf("Illegal move. Try again.\n");
        continue;
      }
      pos.make(m);
    } else {
      SearchOptions o;
      o.depth = engine_depth;
      if (engine_movetime_ms > 0) {
        o.depth = 0;
        o.movetime_ms = engine_movetime_ms;
      }
      std::printf("\nGambit is thinking...\n");
      SearchResult r = search.run(pos, o);
      if (r.bestmove.is_zero()) {
        std::printf("Engine has no move. Game over.\n");
        return 0;
      }
      std::printf("Gambit plays %s (%s, depth %d)\n", r.bestmove.uci().c_str(),
                  score_str(r.score).c_str(), r.depth);
      pos.make(r.bestmove);
    }
  }
  return 0;
}

int cli_test() {
  return run_all_tests();
}

}  // namespace gambit