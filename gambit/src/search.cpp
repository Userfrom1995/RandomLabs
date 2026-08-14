#include "search.h"

#include <algorithm>
#include <chrono>
#include <cstdio>
#include <cstring>

#include "eval.h"
#include "movegen.h"

namespace gambit {

namespace {

constexpr int INF = 30000;
constexpr int MATE = 29000;
constexpr int TEMPO = 15;

int now_ms() {
  using namespace std::chrono;
  return int(duration_cast<milliseconds>(
                 steady_clock::now().time_since_epoch())
                 .count());
}

int piece_value(PieceType pt) { return eval::material_value(pt); }

// MVV-LVA ordering score.
int move_score(Move m) {
  int score = 0;
  if (m.is_capture()) {
    score += 10000 + 10 * piece_value(m.captured()) - piece_value(m.moving());
  }
  return score;
}

}  // namespace

std::string score_str(int score) {
  char buf[64];
  if (score >= MATE - MAX_PLY) {
    int m = (MATE - score + 1) / 2;
    std::snprintf(buf, sizeof buf, "mate %d", m);
  } else if (score <= -MATE + MAX_PLY) {
    int m = (MATE + score + 1) / 2;
    std::snprintf(buf, sizeof buf, "mate -%d", m);
  } else {
    std::snprintf(buf, sizeof buf, "cp %d", score);
  }
  return buf;
}

int Search::evaluate(const Position& pos) const {
  int score = 0;
  for (int sq = 0; sq < 64; ++sq) {
    Piece p = pos.piece_on(Square(sq));
    if (p == NO_PIECE) continue;
    Color c = color_of(p);
    PieceType pt = type_of(p);
    const auto& table = eval::pst(pt);
    int bonus = table[c == WHITE ? 63 - sq : sq];
    score += c == WHITE ? piece_value(pt) + bonus : -(piece_value(pt) + bonus);
  }
  return pos.side_to_move() == WHITE ? score + TEMPO : -score + TEMPO;
}

bool Search::abort_condition(int ply) const {
  if (stop_.load()) return true;
  if (hard_limit_ms_ > 0 && (now_ms() - start_time_) >= hard_limit_ms_) {
    return true;
  }
  (void)ply;
  return false;
}

int Search::quiescence(Position& pos, int alpha, int beta, int ply) {
  if (abort_condition(ply)) return 0;
  ++nodes_;

  if (pos.is_draw()) return 0;

  int stand_pat = evaluate(pos);
  if (stand_pat >= beta) return beta;
  if (stand_pat > alpha) alpha = stand_pat;

  auto moves = generate_captures(pos);
  // Sort by MVV-LVA.
  std::sort(moves.begin(), moves.end(), [&](Move a, Move b) {
    return move_score(a) > move_score(b);
  });

  for (Move m : moves) {
    if (!pos.is_legal(m)) continue;
    pos.make(m);
    int score = -quiescence(pos, -beta, -alpha, ply + 1);
    pos.unmake(m);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

int Search::negamax(Position& pos, int alpha, int beta, int depth, int ply) {
  if (abort_condition(ply)) return 0;
  ++nodes_;

  // Mate-distance pruning at search roots.
  int alpha_orig = alpha;
  if (alpha < -MATE + ply) alpha = -MATE + ply;
  if (beta > MATE - ply) beta = MATE - ply;
  if (alpha >= beta) return alpha;

  if (pos.is_draw()) return 0;

  bool in_check = pos.is_check();
  int extension = in_check ? 1 : 0;

  if (depth <= 0) return quiescence(pos, alpha, beta, ply);

  uint64_t key = pos.key();
  TTEntry entry;
  bool has_tt = tt_.probe(key, entry);
  if (has_tt && entry.depth >= depth && ply > 0) {
    int tt_score = entry.score;
    if (tt_score >= MATE - MAX_PLY) tt_score -= ply;
    else if (tt_score <= -MATE + MAX_PLY) tt_score += ply;
    if (entry.bound == TT_BOUND_EXACT ||
        (entry.bound == TT_BOUND_LOWER && tt_score >= beta) ||
        (entry.bound == TT_BOUND_UPPER && tt_score <= alpha)) {
      return tt_score;
    }
  }

  auto moves = generate_moves(pos);
  if (moves.empty()) {
    return in_check ? -MATE + ply : 0;
  }

  // Move ordering: TT move first, then killers, then captures, then rest.
  Move tt_move = has_tt ? entry.move : MOVE_NONE;
  std::sort(moves.begin(), moves.end(), [&](Move a, Move b) {
    int sa = (a == tt_move) ? 200000 : 0;
    int sb = (b == tt_move) ? 200000 : 0;
    if (sa == sb) {
      sa = (a == killers_[ply][0]) ? 100000 : (a == killers_[ply][1]) ? 90000 : 0;
      sb = (b == killers_[ply][0]) ? 100000 : (b == killers_[ply][1]) ? 90000 : 0;
    }
    if (sa == sb) {
      sa = move_score(a);
      sb = move_score(b);
    }
    return sa > sb;
  });

  Move best_move = MOVE_NONE;
  int best_score = -INF;
  int move_count = 0;

  for (Move m : moves) {
    if (!pos.is_legal(m)) continue;
    ++move_count;
    pos.make(m);

    int score;
    if (move_count == 1) {
      score = -negamax(pos, -beta, -alpha, depth - 1 + extension, ply + 1);
    } else {
      // LMR: reduce late quiet moves.
      int new_depth = depth - 1 + extension;
      if (move_count >= 4 && !m.is_capture() && depth >= 3 && !in_check) {
        new_depth -= 1;
      }
      score = -negamax(pos, -alpha - 1, -alpha, new_depth, ply + 1);
      if (score > alpha && score < beta) {
        score = -negamax(pos, -beta, -alpha, depth - 1 + extension, ply + 1);
      }
    }
    pos.unmake(m);

    if (stop_.load()) return 0;

    if (score > best_score) {
      best_score = score;
      best_move = m;
      // Update PV for this ply: this move followed by the child's PV.
      pv_table_[ply][ply] = m;
      pv_length_[ply] = pv_length_[ply + 1];
      if (pv_length_[ply] <= ply) pv_length_[ply] = ply + 1;
      for (int i = ply + 1; i < pv_length_[ply]; ++i) {
        pv_table_[ply][i] = pv_table_[ply + 1][i];
      }
    }
    if (score > alpha) {
      alpha = score;
      if (score >= beta) {
        // Fail high: store the killer for quiet moves.
        if (!m.is_capture()) {
          if (killers_[ply][0] != m) {
            killers_[ply][1] = killers_[ply][0];
            killers_[ply][0] = m;
          }
        }
        break;
      }
    }
  }

  if (move_count == 0) {
    // Every pseudo-legal move was illegal: mate or stalemate.
    pv_length_[ply] = ply;
    return in_check ? -MATE + ply : 0;
  }

  // Store in TT.
  int bound;
  if (best_score >= beta) bound = TT_BOUND_LOWER;
  else if (best_score <= alpha_orig) bound = TT_BOUND_UPPER;
  else bound = TT_BOUND_EXACT;

  int store_score = best_score;
  if (store_score >= MATE - MAX_PLY) store_score += ply;
  else if (store_score <= -MATE + MAX_PLY) store_score -= ply;

  tt_.store(key, best_move, store_score, depth, bound, 0);
  return best_score;
}

SearchResult Search::run(Position pos, const SearchOptions& opts) {
  stop_.store(false);
  nodes_ = 0;
  tbhits_ = 0;
  start_time_ = now_ms();
  std::memset(killers_, 0, sizeof killers_);
  for (int i = 0; i < MAX_PLY; ++i) pv_length_[i] = 0;

  int64_t budget_ms = opts.movetime_ms;
  if (budget_ms <= 0) {
    int64_t my_time = pos.side_to_move() == WHITE ? opts.wtime_ms : opts.btime_ms;
    int64_t inc = pos.side_to_move() == WHITE ? opts.winc_ms : opts.binc_ms;
    if (my_time > 0) {
      int64_t base = my_time / 30 + inc / 2;
      budget_ms = std::min<int64_t>(base, my_time / 3);
      budget_ms = std::max<int64_t>(budget_ms, 20);
    }
  }
  if (opts.infinite) budget_ms = 0;
  hard_limit_ms_ = budget_ms > 0 ? budget_ms : 0;

  int max_depth = opts.depth > 0 ? opts.depth : (opts.depth == 0 && budget_ms == 0 ? opts.max_depth : 64);

  Move best_move = MOVE_NONE;
  int best_score = 0;
  int completed_depth = 0;
  std::vector<Move> best_pv;

  for (int d = 1; d <= max_depth && !stop_.load(); ++d) {
    int alpha = -INF, beta = INF;
    pv_length_[0] = 0;
    int score = negamax(pos, alpha, beta, d, 0);
    if (stop_.load()) break;

    best_move = pv_table_[0][0];
    best_score = score;
    completed_depth = d;
    best_pv.clear();
    for (int i = 0; i < pv_length_[0]; ++i) best_pv.push_back(pv_table_[0][i]);

    // Optional: early stop if mate found.
    if (score >= MATE - MAX_PLY || score <= -MATE + MAX_PLY) {
      if (budget_ms <= 0 || score >= MATE - 5) break;
    }

    if (hard_limit_ms_ > 0 && (now_ms() - start_time_) >= hard_limit_ms_) break;
  }

  if (best_move.is_zero()) {
    // No move completed (instant abort): fall back to the first legal move.
    auto legals = generate_legal_moves(pos);
    if (!legals.empty()) best_move = legals[0];
  }

  result_.bestmove = best_move;
  result_.score = best_score;
  result_.depth = completed_depth;
  result_.nodes = nodes_;
  result_.time_ms = now_ms() - start_time_;
  result_.pv = best_pv;
  result_.aborted = stop_.load();
  return result_;
}

}  // namespace gambit