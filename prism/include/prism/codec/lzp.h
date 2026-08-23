#pragma once
#include <cstdint>
#include <vector>
#include <limits>

namespace prism::codec {

// B8 LZP - Lempel-Ziv predictor pre-filter
// Hash of recent context -> predicted residual; on match emit flag + skip
// literal, else literal via entropy stage. Effort >=7, never-expand
// (keeps smaller of plain vs LZP). Flags bit1 records LZP use.

constexpr uint8_t LZP_FLAG = 0x02;
constexpr int LZP_TABLE_BITS = 12;
constexpr int LZP_TABLE_SIZE = 1 << LZP_TABLE_BITS;
constexpr int32_t LZP_EMPTY = 0x7fffffff;

inline int lzp_hash(uint16_t leaf, uint8_t activity, int32_t dL) {
    int q = 0;
    if (dL != LZP_EMPTY) {
        int a = dL < 0 ? -dL : dL;
        if (a == 0) q = 0;
        else if (a == 1) q = 1;
        else if (a <= 3) q = 2;
        else if (a <= 7) q = 3;
        else if (a <= 15) q = 4;
        else if (a <= 31) q = 5;
        else q = 6;
    }
    // mix leaf, activity, quantized dL
    int h = (int)((leaf * 31u) ^ (activity * 131u) ^ (q * 17u));
    h &= (LZP_TABLE_SIZE - 1);
    if (h < 0) h += LZP_TABLE_SIZE;
    return h;
}

} // namespace prism::codec
