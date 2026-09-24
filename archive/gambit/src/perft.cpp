#include "perft.h"

#include <map>

namespace gambit {

namespace {

uint64_t perft_impl(Position& pos, int depth, PerftResult& result, bool counting) {
  if (depth == 0) return 1;

  uint64_t nodes = 0;
  std::vector<Move> moves = generate_moves(pos);

  if (depth == 1) {
    // Leaf: each legal move is one node.
    for (Move m : moves) {
      if (!pos.is_legal(m)) continue;
      ++nodes;
      if (counting) {
        result.captures += m.is_capture() ? 1 : 0;
        result.ep += m.is_en_passant() ? 1 : 0;
        result.promotions += m.is_promotion() ? 1 : 0;
        result.castles += m.is_castle() ? 1 : 0;
      }
    }
    return nodes;
  }

  for (Move m : moves) {
    if (!pos.is_legal(m)) continue;
    pos.make(m);
    uint64_t child = perft_impl(pos, depth - 1, result, counting);
    pos.unmake(m);
    nodes += child;
  }
  return nodes;
}

}  // namespace

PerftResult perft(Position& pos, int depth) {
  PerftResult result;
  result.nodes = perft_impl(pos, depth, result, true);
  return result;
}

std::vector<std::pair<Move, uint64_t>> perft_divide(Position& pos, int depth) {
  std::vector<std::pair<Move, uint64_t>> out;
  for (Move m : generate_moves(pos)) {
    if (!pos.is_legal(m)) continue;
    pos.make(m);
    PerftResult child;
    uint64_t count = perft_impl(pos, depth - 1, child, false);
    pos.unmake(m);
    out.emplace_back(m, count);
  }
  return out;
}

int64_t known_perft(const std::string& fen, int depth) {
  // Reference perft node counts from the standard CPW perft suite.
  static const std::map<std::pair<std::string, int>, int64_t> table = {
      {{"startpos", 1}, 20},
      {{"startpos", 2}, 400},
      {{"startpos", 3}, 8902},
      {{"startpos", 4}, 197281},
      {{"startpos", 5}, 4865609},

      {{"kiwipete", 1}, 48},
      {{"kiwipete", 2}, 2039},
      {{"kiwipete", 3}, 97862},
      {{"kiwipete", 4}, 4085603},

      {{"position3", 1}, 14},
      {{"position3", 2}, 191},
      {{"position3", 3}, 2812},
      {{"position3", 4}, 43238},
      {{"position3", 5}, 674624},

      {{"position4", 1}, 6},
      {{"position4", 2}, 264},
      {{"position4", 3}, 9467},
      {{"position4", 4}, 422333},

      {{"position5", 1}, 44},
      {{"position5", 2}, 1486},
      {{"position5", 3}, 62379},
      {{"position5", 4}, 2103487},
  };
  auto it = table.find({fen, depth});
  return it == table.end() ? -1 : it->second;
}

}  // namespace gambit
