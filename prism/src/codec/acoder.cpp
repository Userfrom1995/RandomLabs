#include "prism/codec/acoder.h"
#include <stdexcept>
#include <algorithm>
#include <cmath>

namespace prism::codec {

namespace {
constexpr uint32_t HALF = 0x80000000u;
constexpr uint32_t QUARTER = 0x40000000u;
constexpr uint32_t THREE_QUARTER = 0xC0000000u;

inline void adapt_prob(uint16_t& prob, bool bit) {
    // WNC-style: prob = P0 * 65536. Zero bit moves toward 65535, one toward 0.
    if (!bit) {
        prob += (uint16_t)((65535u - prob) >> 5);
        if (prob == 0) prob = 1;
        if (prob >= 65535) prob = 65535;
        if (prob == 0) prob = 1;
    } else {
        prob -= (uint16_t)(prob >> 5);
        if (prob == 0) prob = 1;
        if (prob >= 65535) prob = 65534;
    }
    if (prob == 0) prob = 1;
    if (prob == 65535) {} // allowed max 65535 (< 65536)
    // clamp to open interval 1..65534 to keep split in (0,range)
    if (prob == 0) prob = 1;
    if (prob > 65534) prob = 65534;
    // keep at least 1 and at most 65535-1, but 65535 is technically okay for split = range*prob>>16 may equal range for prob=65535 gives split approx range-1
    // Ensure prob in [1,65534] for safety
    if (prob < 1) prob = 1;
    if (prob > 65534) prob = 65534;
}
} // namespace

// --- AEncoder ---

AEncoder::AEncoder() : low_(0), high_(0xFFFFFFFF), pending_(0), bit_pos_(0) {}

void AEncoder::ensure_bits(size_t extra) {
    size_t need = (bit_pos_ + extra + 7) / 8;
    if (out_.size() < need) out_.resize(need, 0);
}

void AEncoder::write_bit(bool b) {
    ensure_bits(1);
    size_t byte_idx = bit_pos_ / 8;
    int bit_idx = bit_pos_ % 8;
    if (b) out_[byte_idx] |= (1u << bit_idx);
    else out_[byte_idx] &= ~(1u << bit_idx);
    bit_pos_++;
}

void AEncoder::put_bin(uint16_t& prob, bool bit) {
    if (prob < 1) prob = 1;
    if (prob > 65534) prob = 65534;
    uint32_t p = prob;
    uint64_t range = (uint64_t)high_ - low_ + 1;
    uint64_t split = (range * p) >> 16;
    if (split == 0) split = 1;
    if (split >= range) split = range - 1;
    uint32_t mid = low_ + (uint32_t)split - 1;
    uint16_t old_prob = prob;
    (void)old_prob;
    if (!bit) {
        high_ = mid;
    } else {
        low_ = mid + 1;
    }
    adapt_prob(prob, bit);
    // renormalization
    while (true) {
        if (high_ < HALF) {
            write_bit(0);
            while (pending_ > 0) { write_bit(1); pending_--; }
        } else if (low_ >= HALF) {
            write_bit(1);
            while (pending_ > 0) { write_bit(0); pending_--; }
            low_ -= HALF;
            high_ -= HALF;
        } else if (low_ >= QUARTER && high_ < THREE_QUARTER) {
            pending_++;
            low_ -= QUARTER;
            high_ -= QUARTER;
        } else {
            break;
        }
        low_ <<= 1;
        high_ <<= 1;
        high_ |= 1;
    }
}

void AEncoder::encode_residual(ACModels& m, int cx, int32_t e) {
    if (cx < 0) cx = 0;
    if (cx >= (int)m.sign.size()) m.ensure(cx + 1);
    bool sign = e < 0;
    uint32_t mag = (uint32_t)(sign ? -e : e);
    put_bin(m.sign[cx], sign);
    if (mag == 0) {
        put_bin(m.zero[cx], true);
        return;
    } else {
        put_bin(m.zero[cx], false);
    }
    int L = 31 - __builtin_clz(mag);
    for (int k = 0; k < L; ++k) put_bin(m.q[cx], false);
    put_bin(m.q[cx], true);
    uint32_t rem = mag - (1u << L);
    for (int k = L - 1; k >= 0; --k) put_bin(m.rem[cx], (rem >> k) & 1u);
}

std::vector<uint8_t> AEncoder::flush_and_emit() {
    pending_++;
    if (low_ < QUARTER) {
        write_bit(0);
        while (pending_ > 0) { write_bit(1); pending_--; }
    } else {
        write_bit(1);
        while (pending_ > 0) { write_bit(0); pending_--; }
    }
    size_t bytes = (bit_pos_ + 7) / 8;
    out_.resize(bytes);
    return out_;
}

// --- ADecoder ---

void ADecoder::init(const uint8_t* data, size_t len) {
    data_ = data;
    len_ = len;
    bit_pos_ = 0;
    low_ = 0;
    high_ = 0xFFFFFFFF;
    code_ = 0;
    for (int i = 0; i < 32; ++i) {
        code_ <<= 1;
        code_ |= (read_bit() ? 1u : 0u);
    }
}

bool ADecoder::read_bit() {
    if (bit_pos_ >= len_ * 8) return 0;
    size_t byte_idx = bit_pos_ / 8;
    int bit_idx = bit_pos_ % 8;
    bool b = (data_[byte_idx] >> bit_idx) & 1u;
    bit_pos_++;
    return b;
}

bool ADecoder::get_bin(uint16_t& prob) {
    if (prob < 1) prob = 1;
    if (prob > 65534) prob = 65534;
    uint32_t p = prob;
    uint64_t range = (uint64_t)high_ - low_ + 1;
    uint64_t split = (range * p) >> 16;
    if (split == 0) split = 1;
    if (split >= range) split = range - 1;
    uint32_t mid = low_ + (uint32_t)split - 1;
    bool bit;
    if (code_ <= mid) {
        bit = false;
        high_ = mid;
    } else {
        bit = true;
        low_ = mid + 1;
    }
    adapt_prob(prob, bit);
    while (true) {
        if (high_ < HALF) {
            // no offset
        } else if (low_ >= HALF) {
            low_ -= HALF;
            high_ -= HALF;
            code_ -= HALF;
        } else if (low_ >= QUARTER && high_ < THREE_QUARTER) {
            low_ -= QUARTER;
            high_ -= QUARTER;
            code_ -= QUARTER;
        } else {
            break;
        }
        low_ <<= 1;
        high_ <<= 1;
        high_ |= 1;
        code_ <<= 1;
        code_ |= (read_bit() ? 1u : 0u);
        code_ &= 0xFFFFFFFFu;
    }
    return bit;
}

int32_t ADecoder::decode_residual(ACModels& m, int cx) {
    if (cx < 0) cx = 0;
    if (cx >= (int)m.sign.size()) m.ensure(cx + 1);
    bool sign = get_bin(m.sign[cx]);
    bool is_zero = get_bin(m.zero[cx]);
    uint32_t mag = 0;
    if (!is_zero) {
        int L = 0;
        while (!get_bin(m.q[cx])) ++L;
        uint32_t rem = 0;
        for (int k = 0; k < L; ++k) {
            rem = (rem << 1) | (get_bin(m.rem[cx]) ? 1u : 0u);
        }
        mag = (1u << L) + rem;
    }
    return sign ? - (int32_t)mag : (int32_t)mag;
}

// --- High level helpers ---

int quant_residual(int32_t r) {
    int a = std::abs(r);
    if (a == 0) return 0;
    if (a == 1) return 1;
    if (a <= 3) return 2;
    if (a <= 7) return 3;
    if (a <= 15) return 4;
    if (a <= 31) return 5;
    return 6;
}

int residual_diff_context(int32_t dL, int32_t dU, int32_t dUL) {
    int qL = quant_residual(dL);
    int qU = quant_residual(dU);
    int qUL = quant_residual(dUL);
    return (qL * 7 + qU) * 7 + qUL; // 0..342
}

uint8_t activity_class(uint32_t w, uint32_t h, size_t idx,
                       const std::vector<uint16_t>& plane,
                       int32_t /*pred*/) {
    (void)h;
    uint32_t x = (uint32_t)(idx % w);
    uint32_t y = (uint32_t)(idx / w);
    int32_t c = (int32_t)plane[idx];
    int32_t L = (x > 0) ? (int32_t)plane[idx - 1] : c;
    int32_t T = (y > 0) ? (int32_t)plane[idx - w] : c;
    int32_t TL = (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : c;
    int32_t grad = std::abs(L - TL) + std::abs(T - TL) + std::abs(c - L);
    if (grad < 4) return 0;
    if (grad < 16) return 1;
    if (grad < 64) return 2;
    return 3;
}

std::vector<uint8_t> acoder_encode_plane(const std::vector<int32_t>& residuals,
                                         uint32_t w, uint32_t h,
                                         int num_contexts) {
    if (residuals.empty()) {
        AEncoder enc;
        return enc.flush_and_emit();
    }
    // If caller passes 1, we still expand to residual-DIFF up to 343 so the
    // adaptive model actually sees context. Otherwise use the requested count.
    int ctx_count = num_contexts;
    bool use_resdiff = true;
    if (ctx_count <= 1) ctx_count = 343;
    ACModels models(ctx_count);
    AEncoder enc;
    // Need to know spatial neighbors of residuals (causal). Residuals are stored row-major.
    for (size_t i = 0; i < residuals.size(); ++i) {
        int cx = 0;
        if (use_resdiff) {
            uint32_t x = (w == 0) ? 0 : (uint32_t)(i % w);
            uint32_t y = (w == 0) ? 0 : (uint32_t)(i / w);
            int32_t dL = 0, dU = 0, dUL = 0;
            if (x > 0) dL = residuals[i - 1];
            if (y > 0) dU = residuals[i - w];
            if (x > 0 && y > 0) dUL = residuals[i - w - 1];
            cx = residual_diff_context(dL, dU, dUL);
            if (cx >= ctx_count) cx = ctx_count - 1;
            // Mix activity as extra offset if we have extra contexts: not yet, keep within 343
            // Could widen to ctx_count = 343*4 but keep 343 for B5.
            (void)h;
        } else {
            cx = (int)(i % (size_t)ctx_count);
        }
        enc.encode_residual(models, cx, residuals[i]);
    }
    return enc.flush_and_emit();
}

std::vector<int32_t> acoder_decode_plane(const std::vector<uint8_t>& bytes,
                                         size_t num_residuals,
                                         uint32_t w, uint32_t h,
                                         int num_contexts) {
    if (num_residuals == 0) return {};
    if (bytes.size() == 0) throw std::runtime_error("acoder_decode_plane: empty bytes");
    int ctx_count = num_contexts;
    bool use_resdiff = true;
    if (ctx_count <= 1) ctx_count = 343;
    ACModels models(ctx_count);
    ADecoder dec;
    dec.init(bytes);
    std::vector<int32_t> out;
    out.reserve(num_residuals);
    for (size_t i = 0; i < num_residuals; ++i) {
        int cx = 0;
        if (use_resdiff) {
            uint32_t x = (w == 0) ? 0 : (uint32_t)(i % w);
            uint32_t y = (w == 0) ? 0 : (uint32_t)(i / w);
            int32_t dL = 0, dU = 0, dUL = 0;
            if (x > 0) dL = out[i - 1];
            if (y > 0) dU = out[i - w];
            if (x > 0 && y > 0) dUL = out[i - w - 1];
            cx = residual_diff_context(dL, dU, dUL);
            if (cx >= ctx_count) cx = ctx_count - 1;
            (void)h;
        }
        int32_t v = dec.decode_residual(models, cx);
        out.push_back(v);
    }
    return out;
}

std::vector<uint8_t> acoder_encode_plane_leaves(const std::vector<int32_t>& residuals,
                                                 const std::vector<uint16_t>& leaf_ids,
                                                 int num_leaves) {
    if (residuals.empty()) { AEncoder enc; return enc.flush_and_emit();}
    if (leaf_ids.size() != residuals.size()) throw std::runtime_error("leaf_ids size mismatch");
    int ctx = num_leaves <=0?1:num_leaves;
    if (ctx > 64) ctx = 64;
    ACModels models(ctx);
    AEncoder enc;
    for (size_t i=0;i<residuals.size();++i) {
        int cx = leaf_ids[i] % ctx;
        enc.encode_residual(models, cx, residuals[i]);
    }
    return enc.flush_and_emit();
}
std::vector<int32_t> acoder_decode_plane_leaves(const std::vector<uint8_t>& bytes,
                                                size_t num_residuals,
                                                const std::vector<uint16_t>& leaf_ids,
                                                int num_leaves) {
    if (num_residuals==0) return {};
    if (bytes.empty()) throw std::runtime_error("acoder_decode_plane_leaves: empty bytes");
    if (leaf_ids.size()!=num_residuals) throw std::runtime_error("leaf_ids size mismatch decode");
    int ctx = num_leaves <=0?1:num_leaves;
    if (ctx>64) ctx=64;
    ACModels models(ctx);
    ADecoder dec; dec.init(bytes);
    std::vector<int32_t> out; out.reserve(num_residuals);
    for (size_t i=0;i<num_residuals;++i) { int cx = leaf_ids[i]%ctx; out.push_back(dec.decode_residual(models,cx));}
    return out;
}
std::vector<int32_t> acoder_decode_plane_leaves_stream(const std::vector<uint8_t>& bytes,
                                                       size_t num_residuals,
                                                       int num_leaves,
                                                       const std::vector<uint16_t>& leaf_seq) {
    return acoder_decode_plane_leaves(bytes,num_residuals,leaf_seq,num_leaves);
}

std::vector<uint8_t> acoder_encode_bits_adaptive(const std::vector<uint8_t>& bits) {
    // Adaptive version: single context prob adapts from 0.5.
    AEncoder enc;
    uint16_t prob = 32768;
    for (uint8_t b : bits) enc.put_bin(prob, b != 0);
    return enc.flush_and_emit();
}

std::vector<uint8_t> acoder_decode_bits_adaptive(const std::vector<uint8_t>& bytes, size_t n) {
    ADecoder dec;
    dec.init(bytes);
    uint16_t prob = 32768;
    std::vector<uint8_t> out;
    out.reserve(n);
    for (size_t i = 0; i < n; ++i) out.push_back(dec.get_bin(prob) ? 1 : 0);
    return out;
}

std::vector<uint8_t> acoder_encode_bits(const std::vector<uint8_t>& bits, uint16_t prob) {
    // Fixed prob version - still uses FIFO but prob is not adapted (cloned per call)
    AEncoder enc;
    uint16_t p = prob;
    // Use a fresh prob per bit but without adaptation? We emulate fixed by not updating shared prob.
    for (uint8_t b : bits) {
        uint16_t pp = p;
        enc.put_bin(pp, b != 0);
        // don't carry forward adapted prob
    }
    return enc.flush_and_emit();
}

std::vector<uint8_t> acoder_decode_bits(const std::vector<uint8_t>& bytes, size_t n, uint16_t prob) {
    ADecoder dec;
    dec.init(bytes);
    std::vector<uint8_t> out;
    out.reserve(n);
    uint16_t p = prob;
    for (size_t i = 0; i < n; ++i) {
        uint16_t pp = p;
        out.push_back(dec.get_bin(pp) ? 1 : 0);
    }
    return out;
}

} // namespace prism::codec
