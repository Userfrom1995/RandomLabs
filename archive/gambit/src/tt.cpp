#include "tt.h"

#include <algorithm>

namespace gambit {

void TranspositionTable::resize_mb(int mb) {
  size_t target = (size_t(mb) * 1024 * 1024) / sizeof(TTEntry);
  size_t size = 1;
  while (size <= target && size <= (size_t(1) << 26)) size <<= 1;
  size >>= 1;
  if (size < 1) size = 1;
  size_ = size;
  mask_ = size_ - 1;
  num_bits_ = 0;
  while ((size_t(1) << num_bits_) < size_) ++num_bits_;
  entries_.resize(size_);
  clear();
}

void TranspositionTable::clear() {
  std::fill(entries_.begin(), entries_.end(), TTEntry());
}

void TranspositionTable::store(uint64_t key, Move move, int score, int depth,
                               int bound, int age) {
  uint64_t idx = key & mask_;
  TTEntry& e = entries_[idx];
  // Replacement: always replace (crude but effective), preferring deeper
  // entries with the same key.
  if (e.key == key && e.depth > depth && e.bound != TT_BOUND_EXACT) {
    // Keep the deeper entry; optionally update the move/score if better.
    if (e.move.is_zero() && !move.is_zero()) e.move = move;
    return;
  }
  e.key = key;
  e.move = move;
  e.score = int32_t(score);
  e.depth = int16_t(depth);
  e.bound = uint8_t(bound);
  e.age = uint8_t(age);
}

bool TranspositionTable::probe(uint64_t key, TTEntry& out) const {
  TTEntry e = entries_[key & mask_];
  if (e.key != key) return false;
  out = e;
  return true;
}

}  // namespace gambit
