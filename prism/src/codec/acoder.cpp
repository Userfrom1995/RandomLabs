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

void AEncoder::put_bin_raw(uint16_t prob, bool bit) {
    if (prob < 1) prob = 1;
    if (prob > 65534) prob = 65534;
    uint32_t p = prob;
    uint64_t range = (uint64_t)high_ - low_ + 1;
    uint64_t split = (range * p) >> 16;
    if (split == 0) split = 1;
    if (split >= range) split = range - 1;
    uint32_t mid = low_ + (uint32_t)split - 1;
    if (!bit) {
        high_ = mid;
    } else {
        low_ = mid + 1;
    }
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

void AEncoder::put_bin(uint16_t& prob, bool bit) {
    put_bin_raw(prob, bit);
    adapt_prob(prob, bit);
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

bool ADecoder::get_bin_raw(uint16_t prob) {
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

bool ADecoder::get_bin(uint16_t& prob) {
    bool bit = get_bin_raw(prob);
    adapt_prob(prob, bit);
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

// --- Backend v2 (issue #130 C1): priors, dual-rate adaptation, zero-first binarization ---

// Class-prior tables (codec constants, mirrored by the decoder; I2). Entry =
// initial P(bit == 0) for that bin stream, indexed by the directional class
// 3*min(max(qL,qU,qUL),4) + orientation (see ac_v2_prior_class). Tuned offline
// on the probe rail (benchmarks/probe_backend.sh) against pinned kodim01/kodim13
// baselines. Index 15 is currently unused (the directional key saturates at
// 14); it stays as tuning headroom.
//
// ZERO bin: bit 1 means "residual is zero", so the entry holds P(nonzero):
// flat contexts start zero-heavy, busy contexts nearly always nonzero.
const uint16_t AC_V2_PRIOR_ZERO[AC_V2_N_PRIORS] = {
    32000, 37000, 41000, 45000, 48000, 50500, 52700, 54500,
    56000, 57300, 58400, 59400, 60300, 61100, 61900, 62600
};
// SIGN bin (coded only for nonzero residuals): MED residuals skew slightly
// positive, so P(non-negative) starts just above even.
const uint16_t AC_V2_PRIOR_SIGN[AC_V2_N_PRIORS] = {
    33000, 33000, 33100, 33100, 33200, 33200, 33300, 33300,
    33400, 33400, 33500, 33500, 33600, 33600, 33700, 33700
};
// Q bin (unary quotient continuation): busier contexts carry larger
// magnitudes, so P(continue) rises with the class.
const uint16_t AC_V2_PRIOR_Q[AC_V2_N_PRIORS] = {
    7000, 9000, 11500, 14000, 16500, 19000, 21500, 23800,
    25800, 27600, 29200, 30600, 31800, 32800, 33600, 34200
};
// REM bins: magnitudes cluster near the bottom of their power-of-two bucket,
// so remainder bits lean slightly toward 0.
const uint16_t AC_V2_PRIOR_REM[AC_V2_N_PRIORS] = {
    33500, 33500, 33500, 33500, 33500, 33500, 33500, 33500,
    33500, 33500, 33500, 33500, 33500, 33500, 33500, 33500
};

uint8_t ac_v2_prior_class(int cx) {
    if (cx < 0) return 0;
    if (cx > 342) cx = 342;
    int qUL = cx % 7;
    int t = cx / 7;
    int qU = t % 7;
    int qL = t / 7;
    // Directional key (C1 offline retune): edge-energy bucket x orientation.
    // e caps at 4 because the prior tables saturate there; orientation splits
    // horizontal-edge from vertical-edge contexts the sum-key used to merge.
    int e = qL > qU ? qL : qU;
    if (qUL > e) e = qUL;
    if (e > 4) e = 4;
    int d = (qL >= qU + 2) ? 0 : ((qU >= qL + 2) ? 1 : 2);
    return (uint8_t)(e * 3 + d); // max 14, tables keep a spare slot 15
}

void ac_v2_adapt(uint16_t& pf, uint16_t& ps, bool bit) {
    if (!bit) {
        pf = (uint16_t)(pf + ((65535u - pf) >> AC_V2_FAST_SHIFT));
        ps = (uint16_t)(ps + ((65535u - ps) >> AC_V2_SLOW_SHIFT));
    } else {
        pf = (uint16_t)(pf - (pf >> AC_V2_FAST_SHIFT));
        ps = (uint16_t)(ps - (ps >> AC_V2_SLOW_SHIFT));
    }
    if (pf < 1) pf = 1;
    if (pf > 65534) pf = 65534;
    if (ps < 1) ps = 1;
    if (ps > 65534) ps = 65534;
}

namespace {
inline void v2_init_slot(BinModelV2& b, const uint16_t* table, int idx) {
    // C2b: class is keyed on the residual-DIFF part of the id. Flat ids
    // (< 343) are their own resdiff part, so flat streams are unchanged;
    // composite ids (leaf*343 + resdiff) inherit the prior of their resdiff
    // part instead of a meaningless decomposition of the composite number.
    uint16_t p = table[ac_v2_prior_class(idx % AC_V2_RESDIFF_CONTEXTS)];
    b.p_fast[idx] = p;
    b.p_slow[idx] = p;
}

inline void v2_init_kind(KindModelsV2& k, const uint16_t* table, int n, bool uniform) {
    k.ctx.p_fast.resize(n); k.ctx.p_slow.resize(n);
    for (int i = 0; i < n; ++i) {
        if (uniform) {
            // Neutral midpoint start: used when context ids carry no
            // residual-diff semantics (MA-tree LEAF contexts, C2).
            k.ctx.p_fast[i] = 32768;
            k.ctx.p_slow[i] = 32768;
        } else {
            v2_init_slot(k.ctx, table, i);
        }
    }
    // class-level states start from the same compile-time priors and adapt
    // per image; they are shared across all contexts of this kind.
    k.cls.p_fast.resize(AC_V2_N_PRIORS); k.cls.p_slow.resize(AC_V2_N_PRIORS);
    for (int i = 0; i < AC_V2_N_PRIORS; ++i) {
        k.cls.p_fast[i] = uniform ? (uint16_t)32768 : table[i];
        k.cls.p_slow[i] = uniform ? (uint16_t)32768 : table[i];
    }
}

// Code one bin through the hierarchical dual-rate model: probability mixes
// per-context and shared-class estimates; the observed bit updates both.
// The class index is keyed on the residual-DIFF part of the context id
// (C2b); see v2_init_slot - flat ids are unaffected.
inline void v2_put(AEncoder& enc, KindModelsV2& k, int cx, bool bit) {
    int cls = ac_v2_prior_class(cx % AC_V2_RESDIFF_CONTEXTS);
    uint16_t p = ac_v2_mix2(ac_v2_mix(k.ctx.p_fast[cx], k.ctx.p_slow[cx]),
                            ac_v2_mix(k.cls.p_fast[cls], k.cls.p_slow[cls]));
    enc.put_bin_raw(p, bit);
    ac_v2_adapt(k.ctx.p_fast[cx], k.ctx.p_slow[cx], bit);
    ac_v2_adapt(k.cls.p_fast[cls], k.cls.p_slow[cls], bit);
}

inline bool v2_get(ADecoder& dec, KindModelsV2& k, int cx) {
    int cls = ac_v2_prior_class(cx % AC_V2_RESDIFF_CONTEXTS);
    uint16_t p = ac_v2_mix2(ac_v2_mix(k.ctx.p_fast[cx], k.ctx.p_slow[cx]),
                            ac_v2_mix(k.cls.p_fast[cls], k.cls.p_slow[cls]));
    bool bit = dec.get_bin_raw(p);
    ac_v2_adapt(k.ctx.p_fast[cx], k.ctx.p_slow[cx], bit);
    ac_v2_adapt(k.cls.p_fast[cls], k.cls.p_slow[cls], bit);
    return bit;
}
} // namespace

void ACModelsV2::init(int n, bool uniform_priors) {
    if (n < 1) n = 1;
    v2_init_kind(sign, AC_V2_PRIOR_SIGN, n, uniform_priors);
    v2_init_kind(zero, AC_V2_PRIOR_ZERO, n, uniform_priors);
    v2_init_kind(q, AC_V2_PRIOR_Q, n, uniform_priors);
    v2_init_kind(rem, AC_V2_PRIOR_REM, n, uniform_priors);
}

void ACModelsV2::ensure(int n) {
    int old = (int)sign.ctx.p_fast.size();
    if (old >= n) return;
    sign.ctx.p_fast.resize(n); sign.ctx.p_slow.resize(n);
    zero.ctx.p_fast.resize(n); zero.ctx.p_slow.resize(n);
    q.ctx.p_fast.resize(n);    q.ctx.p_slow.resize(n);
    rem.ctx.p_fast.resize(n);  rem.ctx.p_slow.resize(n);
    for (int i = old; i < n; ++i) {
        v2_init_slot(sign.ctx, AC_V2_PRIOR_SIGN, i);
        v2_init_slot(zero.ctx, AC_V2_PRIOR_ZERO, i);
        v2_init_slot(q.ctx, AC_V2_PRIOR_Q, i);
        v2_init_slot(rem.ctx, AC_V2_PRIOR_REM, i);
    }
}

void encode_residual_v2(AEncoder& enc, ACModelsV2& m, int cx, int32_t e) {
    if (cx < 0) cx = 0;
    if (cx >= (int)m.zero.ctx.p_fast.size()) m.ensure(cx + 1);
    uint32_t mag = (uint32_t)(e < 0 ? -e : e);
    // 1) zero flag first: zeros never touch a sign or magnitude bin (P1).
    v2_put(enc, m.zero, cx, mag == 0);
    if (mag == 0) return;
    // 2) sign for nonzero samples only.
    v2_put(enc, m.sign, cx, e < 0);
    // 3) magnitude: unary quotient then MSB-first remainder bits over the
    //    same per-context model sets as v1 (naive Rice-k stays prohibited).
    int L = 31 - __builtin_clz(mag);
    for (int k = 0; k < L; ++k) v2_put(enc, m.q, cx, false);
    v2_put(enc, m.q, cx, true);
    uint32_t rem = mag - (1u << L);
    for (int k = L - 1; k >= 0; --k) v2_put(enc, m.rem, cx, ((rem >> k) & 1u) != 0);
}

int32_t decode_residual_v2(ADecoder& dec, ACModelsV2& m, int cx) {
    if (cx < 0) cx = 0;
    if (cx >= (int)m.zero.ctx.p_fast.size()) m.ensure(cx + 1);
    // Mirror of encode_residual_v2, bin for bin (I2).
    bool is_zero = v2_get(dec, m.zero, cx);
    if (is_zero) return 0;
    bool neg = v2_get(dec, m.sign, cx);
    int L = 0;
    while (!v2_get(dec, m.q, cx)) ++L;
    uint32_t rem = 0;
    for (int k = 0; k < L; ++k) {
        rem = (rem << 1) | (v2_get(dec, m.rem, cx) ? 1u : 0u);
    }
    uint32_t mag = (1u << L) + rem;
    return neg ? -(int32_t)mag : (int32_t)mag;
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

// --- Backend v2 plane helpers ---

std::vector<uint8_t> acoder_encode_plane_v2(const std::vector<int32_t>& residuals,
                                            uint32_t w, uint32_t h,
                                            int num_contexts) {
    if (residuals.empty()) {
        AEncoder enc;
        return enc.flush_and_emit();
    }
    // num_contexts <= 0 -> production residual-DIFF-343 causal contexts;
    // 1 -> single shared context; > 1 -> resdiff id folded modulo the count.
    int ctx_count = num_contexts;
    if (ctx_count <= 0) ctx_count = 343;
    ACModelsV2 models(ctx_count);
    AEncoder enc;
    (void)h;
    for (size_t i = 0; i < residuals.size(); ++i) {
        int cx = 0;
        if (ctx_count > 1) {
            uint32_t x = (w == 0) ? 0 : (uint32_t)(i % w);
            uint32_t y = (w == 0) ? 0 : (uint32_t)(i / w);
            int32_t dL = 0, dU = 0, dUL = 0;
            if (x > 0) dL = residuals[i - 1];
            if (y > 0) dU = residuals[i - w];
            if (x > 0 && y > 0) dUL = residuals[i - w - 1];
            cx = residual_diff_context(dL, dU, dUL) % ctx_count;
        }
        encode_residual_v2(enc, models, cx, residuals[i]);
    }
    return enc.flush_and_emit();
}

std::vector<int32_t> acoder_decode_plane_v2(const std::vector<uint8_t>& bytes,
                                            size_t num_residuals,
                                            uint32_t w, uint32_t h,
                                            int num_contexts) {
    if (num_residuals == 0) return {};
    if (bytes.empty()) throw std::runtime_error("acoder_decode_plane_v2: empty bytes");
    int ctx_count = num_contexts;
    if (ctx_count <= 0) ctx_count = 343;
    ACModelsV2 models(ctx_count);
    ADecoder dec;
    dec.init(bytes);
    (void)h;
    std::vector<int32_t> out;
    out.reserve(num_residuals);
    for (size_t i = 0; i < num_residuals; ++i) {
        int cx = 0;
        if (ctx_count > 1) {
            uint32_t x = (w == 0) ? 0 : (uint32_t)(i % w);
            uint32_t y = (w == 0) ? 0 : (uint32_t)(i / w);
            int32_t dL = 0, dU = 0, dUL = 0;
            if (x > 0) dL = out[i - 1];
            if (y > 0) dU = out[i - w];
            if (x > 0 && y > 0) dUL = out[i - w - 1];
            cx = residual_diff_context(dL, dU, dUL) % ctx_count;
        }
        out.push_back(decode_residual_v2(dec, models, cx));
    }
    return out;
}

std::vector<uint8_t> acoder_encode_plane_leaves_v2(const std::vector<int32_t>& residuals,
                                                   const std::vector<uint16_t>& leaf_ids,
                                                   int num_leaves,
                                                   bool uniform_priors) {
    if (residuals.empty()) { AEncoder enc; return enc.flush_and_emit(); }
    if (leaf_ids.size() != residuals.size()) throw std::runtime_error("leaf_ids size mismatch");
    // C2: no 64-context clamp on the v2 path - the model memory is linear and
    // the decoder mirrors full leaf ids (legacy v1 helpers keep their clamp,
    // and legacy trees never exceeded 16 leaves, so old streams are stable).
    int ctx = num_leaves <= 0 ? 1 : num_leaves;
    ACModelsV2 models(ctx, uniform_priors);
    AEncoder enc;
    for (size_t i = 0; i < residuals.size(); ++i) {
        int cx = leaf_ids[i] % ctx;
        encode_residual_v2(enc, models, cx, residuals[i]);
    }
    return enc.flush_and_emit();
}

std::vector<int32_t> acoder_decode_plane_leaves_v2(const std::vector<uint8_t>& bytes,
                                                   size_t num_residuals,
                                                   const std::vector<uint16_t>& leaf_ids,
                                                   int num_leaves,
                                                   bool uniform_priors) {
    if (num_residuals == 0) return {};
    if (bytes.empty()) throw std::runtime_error("acoder_decode_plane_leaves_v2: empty bytes");
    if (leaf_ids.size() != num_residuals) throw std::runtime_error("leaf_ids size mismatch decode");
    int ctx = num_leaves <= 0 ? 1 : num_leaves;
    ACModelsV2 models(ctx, uniform_priors);
    ADecoder dec;
    dec.init(bytes);
    std::vector<int32_t> out;
    out.reserve(num_residuals);
    for (size_t i = 0; i < num_residuals; ++i) {
        int cx = leaf_ids[i] % ctx;
        out.push_back(decode_residual_v2(dec, models, cx));
    }
    return out;
}

// --- Route 2 hybrid-uint binarization (issue #130 Route 2) ---

ACModelsHybrid::ACModelsHybrid(int n, int t_esc, bool uniform_priors) {
    T_ESC = t_esc;
    init(n, t_esc, uniform_priors);
}

void ACModelsHybrid::init(int n, int t_esc, bool uniform_priors) {
    if (n < 1) n = 1;
    T_ESC = t_esc;
    // Token tree: n * T_ESC context slots (T_ESC nodes per residual-DIFF context).
    // Each tree node gets its own adapted probability per context.
    v2_init_kind(token, AC_V2_PRIOR_ZERO, n * T_ESC, true);
    // Sign: same as v2 (coded only for nonzero).
    v2_init_kind(sign, AC_V2_PRIOR_SIGN, n, uniform_priors);
    // Escape quotient: same as v2's q.
    v2_init_kind(escq, AC_V2_PRIOR_Q, n, uniform_priors);
}

void ACModelsHybrid::ensure(int n) {
    int old_ctx = (int)token.ctx.p_fast.size() / T_ESC;
    if (old_ctx >= n) return;
    int old = (int)token.ctx.p_fast.size();
    int new_size = n * T_ESC;
    token.ctx.p_fast.resize(new_size); token.ctx.p_slow.resize(new_size);
    sign.ctx.p_fast.resize(n); sign.ctx.p_slow.resize(n);
    escq.ctx.p_fast.resize(n); escq.ctx.p_slow.resize(n);
    for (int i = old; i < new_size; ++i) {
        token.ctx.p_fast[i] = 32768;
        token.ctx.p_slow[i] = 32768;
    }
    for (int i = old_ctx; i < n; ++i) {
        v2_init_slot(sign.ctx, AC_V2_PRIOR_SIGN, i);
        v2_init_slot(escq.ctx, AC_V2_PRIOR_Q, i);
    }
}

namespace {

// Encode/decode raw bypass bits through the range coder at fixed P(0)=0.5.
// These bits are not adaptively coded (pin D3).
inline void encode_raw_bits(AEncoder& enc, uint32_t val, int nbits) {
    for (int k = nbits - 1; k >= 0; --k)
        enc.put_bin_raw(32768, (val >> k) & 1u);
}

inline uint32_t decode_raw_bits(ADecoder& dec, int nbits) {
    uint32_t val = 0;
    for (int k = 0; k < nbits; ++k)
        val = (val << 1) | (dec.get_bin_raw(32768) ? 1u : 0u);
    return val;
}

// Token tree put/get: uses expanded context (cx * T_ESC + tree_node) for per-node
// state, but residual-DIFF context (cx) for class computation.
inline void token_tree_put(AEncoder& enc, KindModelsV2& token, int cx, int t_esc,
                            int tree_node, bool bit) {
    int model_cx = cx * t_esc + tree_node;
    int cls = ac_v2_prior_class(cx % AC_V2_RESDIFF_CONTEXTS);
    uint16_t p = ac_v2_mix2(ac_v2_mix(token.ctx.p_fast[model_cx], token.ctx.p_slow[model_cx]),
                            ac_v2_mix(token.cls.p_fast[cls], token.cls.p_slow[cls]));
    enc.put_bin_raw(p, bit);
    ac_v2_adapt(token.ctx.p_fast[model_cx], token.ctx.p_slow[model_cx], bit);
    ac_v2_adapt(token.cls.p_fast[cls], token.cls.p_slow[cls], bit);
}

inline bool token_tree_get(ADecoder& dec, KindModelsV2& token, int cx, int t_esc,
                            int tree_node) {
    int model_cx = cx * t_esc + tree_node;
    int cls = ac_v2_prior_class(cx % AC_V2_RESDIFF_CONTEXTS);
    uint16_t p = ac_v2_mix2(ac_v2_mix(token.ctx.p_fast[model_cx], token.ctx.p_slow[model_cx]),
                            ac_v2_mix(token.cls.p_fast[cls], token.cls.p_slow[cls]));
    bool bit = dec.get_bin_raw(p);
    ac_v2_adapt(token.ctx.p_fast[model_cx], token.ctx.p_slow[model_cx], bit);
    ac_v2_adapt(token.cls.p_fast[cls], token.cls.p_slow[cls], bit);
    return bit;
}

// Encode token via balanced binary tree (T_ESC+1 symbols via T_ESC binary decisions).
// Tree structure: level 0 = zero vs nonzero; subsequent levels halve the range.
// For T_ESC=8: 8 internal nodes, max depth 4 (0: zero/nonzero, 1-3: token identification).
inline void encode_token_tree(AEncoder& enc, KindModelsV2& token, int cx,
                               int tok, int T_ESC) {
    // Level 0: zero (tok==0) vs nonzero (tok>0) - uses tree node 0.
    token_tree_put(enc, token, cx, T_ESC, 0, tok == 0);
    if (tok == 0) return;
    // Levels 1..: identify nonzero token via halving tree.
    int ord = tok;  // tok is already 1..T_ESC for nonzero
    int depth = 0;
    { int v = T_ESC; while (v > 1) { v >>= 1; ++depth; } }
    // Binary search: always emit exactly depth bits.
    int lo = 1, hi = T_ESC;
    for (int level = 0; level < depth; ++level) {
        int mid = lo + (hi - lo) / 2;
        bool bit = (ord > mid);
        token_tree_put(enc, token, cx, T_ESC, 1 + level, bit);
        if (bit) lo = mid + 1;
        else     hi = mid;
    }
}

// Decode token via binary tree. Mirror of encode_token_tree (I2).
inline int decode_token_tree(ADecoder& dec, KindModelsV2& token, int cx,
                              int T_ESC) {
    bool is_zero = token_tree_get(dec, token, cx, T_ESC, 0);
    if (is_zero) return 0;
    int depth = 0;
    { int v = T_ESC; while (v > 1) { v >>= 1; ++depth; } }
    // Binary search: always read exactly depth bits.
    int lo = 1, hi = T_ESC;
    for (int level = 0; level < depth; ++level) {
        int mid = lo + (hi - lo) / 2;
        bool bit = token_tree_get(dec, token, cx, T_ESC, 1 + level);
        if (bit) lo = mid + 1;
        else     hi = mid;
    }
    return lo;  // lo == hi == leaf token
}

} // namespace

void encode_residual_hybrid(AEncoder& enc, ACModelsHybrid& m, int cx, int32_t e) {
    if (cx < 0) cx = 0;
    int num_ctx = (int)m.token.ctx.p_fast.size() / m.T_ESC;
    if (cx >= num_ctx) m.ensure(cx + 1);
    // Absolute value for the unsigned token ladder; the sample's sign rides
    // the dedicated SIGN bin right after each nonzero token (L-C5 rule).
    uint32_t u = (uint32_t)(e < 0 ? -e : e);
    // Map to token: direct if < T_ESC, escape otherwise.
    int token = (u < (uint32_t)m.T_ESC) ? (int)u : m.T_ESC;
    // Code token via binary tree.
    encode_token_tree(enc, m.token, cx, token, m.T_ESC);
    if (token == 0) return;
    // Sign for nonzero (L-C5).
    v2_put(enc, m.sign, cx, e < 0);
    // Escape path: adaptive quotient + raw bypass bits.
    if (token == m.T_ESC) {
        uint32_t m_val = u - (uint32_t)m.T_ESC + 1;
        int q = 31 - __builtin_clz(m_val);
        // Unary quotient (adaptive, same structure as v2).
        for (int k = 0; k < q; ++k) v2_put(enc, m.escq, cx, false);
        v2_put(enc, m.escq, cx, true);
        // Raw bypass bits (literal, not adaptive - pin D3).
        uint32_t raw = m_val & ((q >= 32) ? ~0u : ((1u << q) - 1u));
        encode_raw_bits(enc, raw, q);
    }
}

int32_t decode_residual_hybrid(ADecoder& dec, ACModelsHybrid& m, int cx) {
    if (cx < 0) cx = 0;
    int num_ctx = (int)m.token.ctx.p_fast.size() / m.T_ESC;
    if (cx >= num_ctx) m.ensure(cx + 1);
    int token = decode_token_tree(dec, m.token, cx, m.T_ESC);
    if (token == 0) return 0;
    bool neg = v2_get(dec, m.sign, cx);
    if (token < m.T_ESC) {
        // Direct token: u = token.
        int32_t u = token;
        return neg ? -u : u;
    }
    // Escape path: adaptive quotient + raw bypass bits.
    int q = 0;
    while (!v2_get(dec, m.escq, cx)) ++q;
    uint32_t raw = decode_raw_bits(dec, q);
    uint32_t m_val = (1u << q) | raw;
    uint32_t u = (uint32_t)m.T_ESC - 1u + m_val;
    return neg ? -(int32_t)u : (int32_t)u;
}

std::vector<uint8_t> acoder_encode_plane_hybrid(const std::vector<int32_t>& residuals,
                                                uint32_t w, uint32_t h,
                                                int T_ESC) {
    if (residuals.empty()) {
        AEncoder enc;
        return enc.flush_and_emit();
    }
    ACModelsHybrid models(343, T_ESC);
    AEncoder enc;
    (void)h;
    for (size_t i = 0; i < residuals.size(); ++i) {
        int cx = 0;
        uint32_t x = (w == 0) ? 0 : (uint32_t)(i % w);
        uint32_t y = (w == 0) ? 0 : (uint32_t)(i / w);
        int32_t dL = 0, dU = 0, dUL = 0;
        if (x > 0) dL = residuals[i - 1];
        if (y > 0) dU = residuals[i - w];
        if (x > 0 && y > 0) dUL = residuals[i - w - 1];
        cx = residual_diff_context(dL, dU, dUL);
        encode_residual_hybrid(enc, models, cx, residuals[i]);
    }
    return enc.flush_and_emit();
}

std::vector<int32_t> acoder_decode_plane_hybrid(const std::vector<uint8_t>& bytes,
                                                size_t num_residuals,
                                                uint32_t w, uint32_t h,
                                                int T_ESC) {
    if (num_residuals == 0) return {};
    if (bytes.empty()) throw std::runtime_error("acoder_decode_plane_hybrid: empty bytes");
    ACModelsHybrid models(343, T_ESC);
    ADecoder dec;
    dec.init(bytes);
    (void)h;
    std::vector<int32_t> out;
    out.reserve(num_residuals);
    for (size_t i = 0; i < num_residuals; ++i) {
        int cx = 0;
        uint32_t x = (w == 0) ? 0 : (uint32_t)(i % w);
        uint32_t y = (w == 0) ? 0 : (uint32_t)(i / w);
        int32_t dL = 0, dU = 0, dUL = 0;
        if (x > 0) dL = out[i - 1];
        if (y > 0) dU = out[i - w];
        if (x > 0 && y > 0) dUL = out[i - w - 1];
        cx = residual_diff_context(dL, dU, dUL);
        out.push_back(decode_residual_hybrid(dec, models, cx));
    }
    return out;
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
