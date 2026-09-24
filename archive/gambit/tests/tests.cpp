#include <cstdio>
#include <string>
#include <vector>

#include "bitboard.h"
#include "movegen.h"
#include "perft.h"
#include "position.h"
#include "search.h"
#include "tt.h"
#include "zobrist.h"

namespace gambit {

namespace {

int failures = 0;

void expect_true(bool cond, const std::string& what) {
  if (!cond) {
    std::printf("FAIL: %s\n", what.c_str());
    ++failures;
  }
}

void expect_eq(uint64_t got, uint64_t want, const std::string& what) {
  if (got != want) {
    std::printf("FAIL: %s (got %llu, want %llu)\n", what.c_str(),
                (unsigned long long)got, (unsigned long long)want);
    ++failures;
  }
}

void expect_eq_str(const std::string& got, const std::string& want,
                   const std::string& what) {
  if (got != want) {
    std::printf("FAIL: %s (got \"%s\", want \"%s\")\n", what.c_str(),
                got.c_str(), want.c_str());
    ++failures;
  }
}

const std::string STARTPOS =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const std::vector<std::pair<std::string, std::vector<uint64_t>>> PERFT_SUITE = {
    {STARTPOS, {20, 400, 8902, 197281, 4865609}},
    {"r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
     {48, 2039, 97862, 4085603}},
    {"8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
     {14, 191, 2812, 43238, 674624}},
    {"r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
     {6, 264, 9467, 422333}},
    {"rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
     {44, 1486, 62379, 2103487}},
    {"r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
     {46, 2079, 89890, 3894594}},
};

void test_perft_suite() {
  for (auto& [fen, expected] : PERFT_SUITE) {
    for (size_t d = 1; d <= expected.size(); ++d) {
      Position pos;
      if (!pos.set_from_fen(fen)) {
        expect_true(false, "perft: parse fen: " + fen);
        continue;
      }
      PerftResult r = perft(pos, (int)d);
      expect_eq(r.nodes, expected[d - 1],
                "perft depth " + std::to_string(d) + " of " + fen.substr(0, 20));
    }
  }
}

void test_make_unmake_symmetry() {
  for (auto& [fen, _] : PERFT_SUITE) {
    Position pos;
    pos.set_from_fen(fen);
    std::string f1 = pos.fen();
    uint64_t k1 = pos.key();
    for (Move m : generate_legal_moves(pos)) {
      Position copy = pos;
      copy.make(m);
      copy.unmake(m);
      expect_eq_str(copy.fen(), f1, "symmetry fen for " + fen.substr(0, 12));
      expect_eq(copy.key(), k1, "symmetry key for " + fen.substr(0, 12));
    }
  }
}

void test_fen_roundtrip() {
  const std::vector<std::string> fens = {
      STARTPOS,
      "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
      "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
      "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
  };
  for (auto& fen : fens) {
    Position pos;
    if (!pos.set_from_fen(fen)) {
      expect_true(false, "fen parse: " + fen);
      continue;
    }
    expect_eq_str(pos.fen(), fen, "fen roundtrip: " + fen);
  }
}

void test_search_mate() {
  TranspositionTable tt;
  tt.resize_mb(8);
  Search search(tt);

  // Back-rank mate in one.
  Position m1;
  m1.set_from_fen("7k/6pp/8/8/8/8/6PP/R5K1 w - - 0 1");
  SearchOptions o;
  o.depth = 4;
  SearchResult r = search.run(m1, o);
  expect_true(r.score >= 29000 - 10, "mate in one detected: " +
                                          std::string(score_str(r.score)));
  expect_true(!r.bestmove.is_zero(), "mate search returns a move");

  // Start position: search must complete without crashing and return a legal
  // move with a finite score.
  Position s;
  s.set_from_fen(STARTPOS);
  SearchOptions o2;
  o2.depth = 4;
  SearchResult r2 = search.run(s, o2);
  expect_true(!r2.bestmove.is_zero(), "startpos search returns a move");
  expect_true(s.is_legal(r2.bestmove), "startpos best move is legal");
}

void test_legal_move_count() {
  // Hand-checked counts of legal moves.
  Position pos;
  pos.set_from_fen(STARTPOS);
  expect_eq(generate_legal_moves(pos).size(), 20, "startpos legal moves");
  pos.set_from_fen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1");
  expect_eq(generate_legal_moves(pos).size(), 14, "pos3 legal moves");
  // Checked position (white in check must resolve it).
  pos.set_from_fen("8/8/8/8/8/8/5k2/4K3 b - - 0 1");  // black to move in check
  // King can only step away from the white king's range.
  expect_true(generate_legal_moves(pos).size() > 0, "king escapes check");
}

}  // namespace

int run_all_tests() {
  failures = 0;
  test_perft_suite();
  test_make_unmake_symmetry();
  test_fen_roundtrip();
  test_search_mate();
  test_legal_move_count();
  std::printf("%s (%d failures)\n", failures ? "FAILURES" : "ALL PASS", failures);
  return failures;
}

}  // namespace gambit

#ifdef TEST_BINARY
int main() {
  gambit::init_bitboards();
  gambit::init_zobrist();
  return gambit::run_all_tests();
}
#endif
