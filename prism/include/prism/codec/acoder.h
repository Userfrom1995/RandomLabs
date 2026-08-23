#pragma once
#include <cstdint>
#include <vector>
#include <cstddef>

namespace prism::codec {

// FIFO adaptive binary range coder (Section 0, B5+).
// Resolves the M0 LIFO/adaptive deferral: rANS is LIFO and cannot round-trip
// a running adaptive model (decoder pops reverse). This coder is FIFO -
// decoder reads bins in the same order encoder wrote them, so per-context
// adaptive 16-bit probabilities stay synchronized.
//
// Each bin uses a 16-bit probability P0 = prob/65536 (prob in 1..65535).
// After coding the bin the prob is adapted toward the observed bit with a
// JXL WNC-style learning rate (shift 5, clamped to open interval). The
// binary decomposition of a residual is the same Elias-gamma family as rANS
// (sign + zero-flag + unary length + remainder bits), so the format stays
// comparable.

struct ACModels {
    std::vector<uint16_t> sign;
    std::vector<uint16_t> zero;
    std::vector<uint16_t> q;   // unary quotient bits
    std::vector<uint16_t> rem; // remainder bits
    explicit ACModels(int n = 1) {
        sign.assign(n, 32768);
        zero.assign(n, 32768);
        q.assign(n, 32768);
        rem.assign(n, 32768);
    }
    void ensure(int n) {
        if ((int)sign.size() < n) {
            sign.resize(n, 32768);
            zero.resize(n, 32768);
            q.resize(n, 32768);
            rem.resize(n, 32768);
        }
    }
};

class AEncoder {
public:
    AEncoder();
    void put_bin(uint16_t& prob, bool bit);
    void encode_residual(ACModels& m, int cx, int32_t e);
    std::vector<uint8_t> flush_and_emit();
private:
    uint32_t low_;
    uint32_t high_;
    int pending_;
    // bit writer (LSB-first, matches BitWriter)
    std::vector<uint8_t> out_;
    size_t bit_pos_ = 0;
    void ensure_bits(size_t extra);
    void write_bit(bool b);
};

class ADecoder {
public:
    void init(const uint8_t* data, size_t len);
    void init(const std::vector<uint8_t>& d) { init(d.data(), d.size()); }
    bool get_bin(uint16_t& prob);
    int32_t decode_residual(ACModels& m, int cx);
private:
    uint32_t low_ = 0;
    uint32_t high_ = 0xFFFFFFFF;
    uint32_t code_ = 0;
    // bit reader (LSB-first)
    const uint8_t* data_ = nullptr;
    size_t len_ = 0;
    size_t bit_pos_ = 0;
    bool read_bit();
};

// High-level plane helpers (FIFO, adaptive, context = residual-DIFF)
std::vector<uint8_t> acoder_encode_plane(const std::vector<int32_t>& residuals,
                                         uint32_t w, uint32_t h,
                                         int num_contexts = 1);
std::vector<int32_t> acoder_decode_plane(const std::vector<uint8_t>& bytes,
                                         size_t num_residuals,
                                         uint32_t w, uint32_t h,
                                         int num_contexts = 1);

// Leaf-context helpers for B7 Squeeze+MA-tree (mandatory llc_class/sibling_class)
std::vector<uint8_t> acoder_encode_plane_leaves(const std::vector<int32_t>& residuals,
                                                const std::vector<uint16_t>& leaf_ids,
                                                int num_leaves);
std::vector<int32_t> acoder_decode_plane_leaves(const std::vector<uint8_t>& bytes,
                                                size_t num_residuals,
                                                const std::vector<uint16_t>& leaf_ids,
                                                int num_leaves);
// decoder that recomputes leaf ids on the fly from features is handled in prism.cpp;
// this helper is for testing with precomputed leaf sequences
std::vector<int32_t> acoder_decode_plane_leaves_stream(const std::vector<uint8_t>& bytes,
                                                       size_t num_residuals,
                                                       int num_leaves,
                                                       const std::vector<uint16_t>& leaf_seq);

// Bit-level helpers for the H(p)+epsilon gate (adaptive, not fixed)
std::vector<uint8_t> acoder_encode_bits_adaptive(const std::vector<uint8_t>& bits);
std::vector<uint8_t> acoder_decode_bits_adaptive(const std::vector<uint8_t>& bytes, size_t n);

// Fixed-prob raw helpers (for comparison, not used by adaptive path)
std::vector<uint8_t> acoder_encode_bits(const std::vector<uint8_t>& bits, uint16_t prob);
std::vector<uint8_t> acoder_decode_bits(const std::vector<uint8_t>& bytes, size_t n, uint16_t prob);

// Residual-DIFF quantization (JPEG-LS residual_context)
int quant_residual(int32_t r);
int residual_diff_context(int32_t dL, int32_t dU, int32_t dUL); // 0..342
uint8_t activity_class(uint32_t w, uint32_t h, size_t idx,
                       const std::vector<uint16_t>& plane,
                       int32_t pred);

} // namespace prism::codec
