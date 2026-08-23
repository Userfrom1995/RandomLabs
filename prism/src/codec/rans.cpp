// Prism rANS entropy coder (32-bit, byte-aligned).
//
// Verbatim port of Fabian 'ryg' Giesen's public-domain rans_byte.h (the
// "before-put / after-advance" renormalization). We use a FIXED per-bin
// probability model: a single running adaptive model cannot round-trip with
// rANS LIFO decoding, because the decoder's model-update order is the reverse
// of the encoder's and the two desync. Fixed per-context probabilities are
// LIFO-safe; online adaptation (causal context from already-decoded data) is
// scheduled for M1. See prism/docs or the reviewer thread for the analysis.
//
// rANS is a stack: the decoder recovers the last encoded symbol first. The
// encoder therefore processes symbols in REVERSE (last symbol first) and the
// decoder processes them forward. Residuals are modelled with an Elias-gamma
// magnitude (compact for small values, correct for any int32) plus a sign bit.

#include "prism/codec/rans.h"
#include <algorithm>
#include <stdexcept>
#include <vector>

namespace prism::codec {

namespace {
constexpr uint32_t RANS_BYTE_L = 1u << 23;   // normalization lower bound
constexpr uint32_t RANS_M = 1u << 16;        // frequency denominator (M = 2^16)
constexpr uint32_t RANS_SCALE_BITS = 16;
constexpr uint32_t RANS_MASK = RANS_M - 1;

using RansState = uint32_t;

static inline void RansEncInit(RansState* r) { *r = RANS_BYTE_L; }

static inline RansState RansEncRenorm(RansState x, uint8_t** pptr, uint32_t freq, uint32_t scale_bits) {
    uint32_t x_max = ((RANS_BYTE_L >> scale_bits) << 8) * freq;
    if (x >= x_max) {
        uint8_t* ptr = *pptr;
        do {
            *--ptr = static_cast<uint8_t>(x & 0xff);
            x >>= 8;
        } while (x >= x_max);
        *pptr = ptr;
    }
    return x;
}

static inline void RansEncPut(RansState* r, uint8_t** pptr, uint32_t start, uint32_t freq, uint32_t scale_bits) {
    RansState x = RansEncRenorm(*r, pptr, freq, scale_bits);
    *r = ((x / freq) << scale_bits) + (x % freq) + start;
}

static inline void RansEncFlush(RansState* r, uint8_t** pptr) {
    uint32_t x = *r;
    uint8_t* ptr = *pptr;
    ptr -= 4;
    ptr[0] = static_cast<uint8_t>(x >> 0);
    ptr[1] = static_cast<uint8_t>(x >> 8);
    ptr[2] = static_cast<uint8_t>(x >> 16);
    ptr[3] = static_cast<uint8_t>(x >> 24);
    *pptr = ptr;
}

static inline void RansDecInit(RansState* r, uint8_t** pptr) {
    uint32_t x;
    uint8_t* ptr = *pptr;
    x  = static_cast<uint32_t>(ptr[0] << 0);
    x |= static_cast<uint32_t>(ptr[1] << 8);
    x |= static_cast<uint32_t>(ptr[2] << 16);
    x |= static_cast<uint32_t>(ptr[3] << 24);
    ptr += 4;
    *pptr = ptr;
    *r = x;
}

static inline void RansDecAdvance(RansState* r, uint8_t** pptr, uint32_t start, uint32_t freq, uint32_t scale_bits) {
    uint32_t mask = (1u << scale_bits) - 1;
    uint32_t x = *r;
    x = freq * (x >> scale_bits) + (x & mask) - start;
    if (x < RANS_BYTE_L) {
        uint8_t* ptr = *pptr;
        do x = (x << 8) | *ptr++; while (x < RANS_BYTE_L);
        *pptr = ptr;
    }
    *r = x;
}

// Fixed probability for the residual streams in M0 (single context). The bins
// are coded at 0.5 -> 1 bit/bin, which is correct and bounded; context-modelled
// probabilities arrive with M1.
constexpr uint16_t RESIDUAL_PROB = 32768;

static inline void put_bin(RansState* st, uint8_t** pptr, uint8_t bit, uint16_t prob) {
    uint32_t start = (bit ? prob : 0);
    uint32_t freq = (bit ? (RANS_M - prob) : prob);
    RansEncPut(st, pptr, start, freq, RANS_SCALE_BITS);
}

static inline uint8_t get_bin(RansState* st, uint8_t** pptr, uint16_t prob) {
    uint32_t slot = *st & RANS_MASK;
    bool bit = (slot >= prob);
    uint32_t start = (bit ? prob : 0);
    uint32_t freq = (bit ? (RANS_M - prob) : prob);
    RansDecAdvance(st, pptr, start, freq, RANS_SCALE_BITS);
    return bit ? 1 : 0;
}

} // namespace

std::vector<uint8_t> rans_encode_bits(const std::vector<uint8_t>& bits, uint16_t prob) {
    if (prob == 0) prob = 1;
    if (prob >= RANS_M) prob = RANS_M - 1;
    std::vector<uint8_t> buf(bits.size() * 8 + 32, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state;
    RansEncInit(&state);
    for (size_t i = bits.size(); i-- > 0; ) {
        uint8_t b = bits[i];
        uint32_t start = (b ? prob : 0);
        uint32_t freq = (b ? (RANS_M - prob) : prob);
        RansEncPut(&state, &ptr, start, freq, RANS_SCALE_BITS);
    }
    RansEncFlush(&state, &ptr);
    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

std::vector<uint8_t> rans_decode_bits(const std::vector<uint8_t>& bytes, size_t num_bits, uint16_t prob) {
    if (prob == 0) prob = 1;
    if (prob >= RANS_M) prob = RANS_M - 1;
    if (bytes.size() < 4) throw std::runtime_error("rans_decode_bits: too short");
    uint8_t* d = const_cast<uint8_t*>(bytes.data());
    RansState state;
    RansDecInit(&state, &d);
    std::vector<uint8_t> out(num_bits, 0);
    for (size_t c = 0; c < num_bits; ++c) {
        uint32_t slot = state & RANS_MASK;
        bool bit = (slot >= prob);
        uint32_t start = (bit ? prob : 0);
        uint32_t freq = (bit ? (RANS_M - prob) : prob);
        RansDecAdvance(&state, &d, start, freq, RANS_SCALE_BITS);
        out[c] = bit ? 1 : 0;
    }
    return out;
}

ModelBank ModelBank::create(size_t nctx, size_t rem_bits) {
    ModelBank mb;
    mb.sign.assign(nctx, AdaptiveModel{});
    mb.zero.assign(nctx, AdaptiveModel{});
    mb.q.assign(nctx, AdaptiveModel{});
    mb.rem.assign(nctx, std::vector<AdaptiveModel>(rem_bits));
    mb.k.assign(nctx, 2);
    // Kodak-tuned priors for the 176 ResDiff+activity contexts (B5.9).
    // Derived from 24 Kodak images with MED predictor (see stats tool).
    // Zero/quotient probs are far from 0.5 (e.g. context 3 has 61% zeros,
    // high-activity contexts have <3% zeros and avgK up to 4). Starting at
    // 0.5 wastes ~0.1-0.3 bits/sample during early adaptation; these priors
    // are correct for the decoder too (shared global table, no signaling).
    static const uint16_t kZeroPrior[176] = {32768,17485,16417,40223,17556,16560,13998,32768,32768,32768,32768,32768,14422,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,12168,11908,13716,12196,11976,10568,8991,6188,5206,32768,32768,10658,9029,6219,5114,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,5408,5300,6281,5427,5259,5057,4601,4194,3593,2986,2574,4026,4333,4048,3517,2911,2494,2367,2129,2096,2320,4672,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,2388,2450,7597,2330,2426,2270,2301,2281,2322,2282,2106,2225,2179,2087,2036,1999,1964,1939,1921,1887,1848,1740,1838,1783,1859,1837,1757,1839,1871,1991,1811,1746,1799,1621,1890,2349,1498,1974,1888,1855,2049,2007,1644};
    static const uint16_t kQPrior[176] = {32768,7483,8338,4698,7461,8312,10135,32768,32768,32768,32768,32768,9922,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,15544,15823,14776,15470,15771,16588,20800,29288,36016,32768,32768,16534,20744,29146,35352,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,36027,36348,35791,35998,36274,36805,37724,38747,40898,43585,45490,41728,39206,39482,41172,43639,45572,47012,48439,49459,50689,53037,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,32768,50492,50829,49928,50609,50602,50707,50916,51363,51631,51924,52169,51784,51562,51817,52213,52656,53003,53123,53267,53560,53859,54361,54972,55459,55922,56332,56754,57147,57385,57702,57830,58090,58338,58643,58687,59063,60319,58747,58911,59093,59277,59270,60358};
    static const uint8_t kKInit[176] = {2,0,0,0,0,0,0,2,2,2,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,1,1,2,2,0,0,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,4,3,3,3,3,3,4};
    for (size_t i = 0; i < nctx && i < 176; ++i) {
        mb.zero[i].prob = kZeroPrior[i];
        mb.q[i].prob = kQPrior[i];
        mb.k[i] = kKInit[i];
    }
    // For expanded contexts (352, 704, 1408, 2816): tile with correct activity mapping
    if (nctx > 176) {
        for (size_t i = 176; i < nctx; ++i) {
            size_t src_base = 0;
            size_t act = 0;
            size_t base_id = 0;
            if (nctx == 352 || nctx == 1408) {
                size_t llc = i / 352;
                size_t rem = i % 352;
                base_id = rem % 44;
                act = rem / 44;
                size_t src_act = act >= 4 ? 3 : act;
                size_t src = base_id + src_act * 44 + llc * 176;
                src_base = src % 176;
                if (src_base >= 176) src_base = base_id + src_act*44;
            } else if (nctx == 704) {
                // 44*8*2: baseAct*2+orient, orient shares prior
                size_t baseActEdge = i;
                size_t baseAct = baseActEdge / 2;
                base_id = baseAct % 44;
                act = baseAct / 44;
                size_t src_act = act >= 4 ? 3 : act;
                src_base = base_id + src_act * 44;
            } else if (nctx == 2816) {
                // B5.39 2816 = ((44*8)*4 + zcnt)*2 + orient : baseAct=base+act*44 (0..351), zcnt 0..3, orient 0..1
                size_t orient = i % 2;
                size_t tmp = i / 2;
                size_t zcnt = tmp % 4;
                size_t baseAct = tmp / 4;
                base_id = baseAct % 44;
                act = baseAct / 44;
                (void)orient;
                size_t src_act = act >= 4 ? 3 : act;
                src_base = base_id + src_act * 44;
            } else if (nctx == 5632) {
                // B5.41 5632 = ((((44*8)*4+zcnt)*2+orient)*2+diag) : add diagonal edge
                size_t diag = i % 2;
                size_t tmp = i / 2;
                size_t orient = tmp % 2;
                size_t tmp2 = tmp / 2;
                size_t zcnt = tmp2 % 4;
                size_t baseAct = tmp2 / 4;
                base_id = baseAct % 44;
                act = baseAct / 44;
                (void)orient; (void)diag;
                size_t src_act = act >= 4 ? 3 : act;
                src_base = base_id + src_act * 44;
            } else if (nctx == 11264) {
                // B5.42 11264 = (((((44*8)*4+zcnt)*2+orient)*2+diag)*2+ssign) : sign coherence
                // B5.49 prior refinement: zcnt/orient/diag/ssign now affect zero/q/sign heuristics (was tiled)
                size_t ssign = i % 2;
                size_t tmp = i / 2;
                size_t diag = tmp % 2;
                tmp /= 2;
                size_t orient = tmp % 2;
                tmp /= 2;
                size_t zcnt = tmp % 4;
                size_t baseAct = tmp / 4;
                base_id = baseAct % 44;
                act = baseAct / 44;
                size_t src_act = act >= 4 ? 3 : act;
                src_base = base_id + src_act * 44;
            } else {
                // generic fallback: map modulo 176
                src_base = i % 176;
                base_id = src_base % 44;
                act = (src_base / 44) % 8;
            }
            if (src_base >= 176) src_base %= 176;
            int baseZero = kZeroPrior[src_base];
            int baseQ = kQPrior[src_base];
            int adjZero = 0;
            int adjQ = 0;
            // B5.49 heuristic: refine priors for expanded contexts using zcnt/orient/diag/ssign
            if (nctx == 11264) {
                size_t ssign = i % 2;
                size_t tmp2 = i / 2;
                size_t diag2 = tmp2 % 2; tmp2 /= 2;
                size_t orient2 = tmp2 % 2; tmp2 /= 2;
                size_t zcnt2 = tmp2 % 4;
                if (zcnt2 == 3) adjZero = -2800;
                else if (zcnt2 == 2) adjZero = -900;
                else if (zcnt2 == 1) adjZero = 700;
                else adjZero = 2200;
                if (orient2 == 1) adjZero += 180;
                if (diag2 == 1) adjZero += 260;
                if (ssign == 0) adjZero += 420;
                adjQ = adjZero / 2;
                // sign heuristic: same-sign region => sign more biased
                int signProb = 32768;
                if (ssign == 1) signProb = 28672;
                if (diag2 == 1) signProb += (ssign == 1 ? -400 : 400);
                if (signProb < 8192) signProb = 8192;
                if (signProb > 57344) signProb = 57344;
                mb.sign[i].prob = (uint16_t)signProb;
            } else if (nctx == 5632 || nctx == 2816) {
                size_t tmp2 = (nctx == 5632) ? (i / 2 / 2) : (i / 2);
                // for 5632 diag already, for 2816 no diag
                size_t zcnt2 = 0;
                if (nctx == 5632) {
                    size_t tmp3 = i / 2;
                    size_t orient3 = tmp3 % 2; tmp3 /= 2;
                    zcnt2 = tmp3 % 4;
                    (void)orient3;
                } else {
                    size_t tmp3 = i / 2;
                    zcnt2 = tmp3 % 4;
                }
                if (zcnt2 == 3) adjZero = -2400;
                else if (zcnt2 == 2) adjZero = -700;
                else if (zcnt2 == 1) adjZero = 600;
                else adjZero = 1800;
                adjQ = adjZero / 2;
            } else if (nctx == 704) {
                // orient only
                size_t orient2 = i % 2;
                if (orient2 == 1) adjZero = 150;
                adjQ = adjZero / 2;
            }
            int newZero = baseZero + adjZero;
            int newQ = baseQ + adjQ;
            if (newZero < 1024) newZero = 1024;
            if (newZero > 63488) newZero = 63488;
            if (newQ < 1024) newQ = 1024;
            if (newQ > 63488) newQ = 63488;
            mb.zero[i].prob = (uint16_t)newZero;
            mb.q[i].prob = (uint16_t)newQ;
            if (nctx != 11264) {
                // for non-11264 keep sign at 0.5 (already default)
                mb.sign[i].prob = 32768;
            }
            if (act == 4) mb.k[i] = (uint8_t)std::min(4, (int)kKInit[src_base] + 1);
            else if (act == 5) mb.k[i] = (uint8_t)std::min(4, (int)kKInit[src_base] + 1);
            else if (act == 6) mb.k[i] = (uint8_t)std::min(4, (int)kKInit[src_base] + 2);
            else if (act == 7) mb.k[i] = (uint8_t)std::min(4, (int)kKInit[src_base] + 2);
            else mb.k[i] = kKInit[src_base];
        }
    }
    return mb;
}

std::vector<uint16_t> compute_resdiff_context(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h) {
    size_t n = residuals.size();
    std::vector<uint16_t> cx(n, 0);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            int32_t Ra = (x > 0) ? residuals[idx - 1] : 0;
            int32_t Rb = (y > 0) ? residuals[idx - w] : 0;
            int32_t Rc = (x > 0 && y > 0) ? residuals[idx - w - 1] : 0;
            int32_t dx = Ra - Rb;
            int32_t mag = dx < 0 ? -dx : dx;
            int base = 0;
            if (mag <= 2) {
                if (dx > 0) base = (int)mag;
                else base = (int)mag + 3;
            } else {
                int q = std::min<int>(mag, 127) / 4;
                if (dx > 0) base = 6 + q;
                else base = 12 + q;
            }
            if (base < 0) base = 0;
            if (base > 43) base = 43;
            // activity bucket: 8 levels (44*8=352) plus orientation (704), zcnt (2816), diag (5632), ssign (11264) - B5.43 thresholds 3/8/15/25/50/100/180
            int sumAbs = (Ra < 0 ? -Ra : Ra) + (Rb < 0 ? -Rb : Rb) + (Rc < 0 ? -Rc : Rc);
            int act = 0;
            if (sumAbs <= 3) act = 0;
            else if (sumAbs <= 8) act = 1;
            else if (sumAbs <= 15) act = 2;
            else if (sumAbs <= 25) act = 3;
            else if (sumAbs <= 50) act = 4;
            else if (sumAbs <= 100) act = 5;
            else if (sumAbs <= 180) act = 6;
            else act = 7;
            int baseAct = base + act * 44; // 0..351
            int orient = (std::abs(Ra) > std::abs(Rb)) ? 1 : 0;
            int zcnt = (Ra == 0 ? 1 : 0) + (Rb == 0 ? 1 : 0) + (Rc == 0 ? 1 : 0); // 0..3 flatness
            int diag = (std::abs(Ra - Rc) > std::abs(Rb - Rc)) ? 1 : 0; // B5.41 diagonal edge
            int ssign = ((Ra >= 0) == (Rb >= 0)) ? 1 : 0; // B5.42 sign coherence LL
            int ctx = (((((baseAct * 4) + zcnt) * 2 + orient) * 2 + diag) * 2 + ssign); // 0..11263 B5.42
            cx[idx] = (uint16_t)ctx;
        }
    }
    return cx;
}

std::vector<uint16_t> compute_resdiff_context_with_llc(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h, const std::vector<uint16_t>& ll_plane) {
    size_t n = residuals.size();
    std::vector<uint16_t> cx(n, 0);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            int32_t Ra = (x > 0) ? residuals[idx - 1] : 0;
            int32_t Rb = (y > 0) ? residuals[idx - w] : 0;
            int32_t Rc = (x > 0 && y > 0) ? residuals[idx - w - 1] : 0;
            int32_t dx = Ra - Rb;
            int32_t mag = dx < 0 ? -dx : dx;
            int base = 0;
            if (mag <= 2) {
                if (dx > 0) base = (int)mag;
                else base = (int)mag + 3;
            } else {
                int q = std::min<int>(mag, 127) / 4;
                if (dx > 0) base = 6 + q;
                else base = 12 + q;
            }
            if (base < 0) base = 0;
            if (base > 43) base = 43;
            int sumAbs = (Ra < 0 ? -Ra : Ra) + (Rb < 0 ? -Rb : Rb) + (Rc < 0 ? -Rc : Rc);
            int act = 0;
            if (sumAbs <= 3) act = 0;
            else if (sumAbs <= 8) act = 1;
            else if (sumAbs <= 15) act = 2;
            else if (sumAbs <= 25) act = 3;
            else if (sumAbs <= 50) act = 4;
            else if (sumAbs <= 100) act = 5;
            else if (sumAbs <= 180) act = 6;
            else act = 7;
            int baseAct = base + act * 44;
            // llc bucket: 4 buckets, base 352 per llc
            uint16_t ll = (idx < ll_plane.size()) ? ll_plane[idx] : 0;
            int llc = (ll >> 6) & 0x3;
            if (ll > 1023) llc = (ll >> 14) & 0x3;
            int ctx = baseAct + llc * 352;
            cx[idx] = (uint16_t)ctx;
        }
    }
    return cx;
}

void rans_encode_residuals(const std::vector<int32_t>& residuals,
                           const std::vector<uint16_t>& cx_of,
                           ModelBank& models,
                           std::vector<uint8_t>& out) {
    size_t n = residuals.size();
    if (cx_of.size() != n) throw std::runtime_error("cx size mismatch");
    if (n == 0) {
        // Still need to emit the rANS state flush
        std::vector<uint8_t> buf(32, 0);
        uint8_t* ptr = buf.data() + buf.size();
        RansState st; RansEncInit(&st);
        RansEncFlush(&st, &ptr);
        out.assign(ptr, buf.data() + buf.size());
        return;
    }
    // First pass: forward collect bins with probs and update models to capture causal state.
    struct BinProb { uint8_t bit; uint16_t prob; };
    // For n up to 768*512=393k, bins up to ~ 64 per residual -> ~25M bins. Use vector.
    std::vector<BinProb> flat;
    flat.reserve(n * 8);
    // We need a copy of models to simulate forward updates while capturing probs.
    ModelBank cur = models;
    // Also need to capture k per residual before update
    std::vector<uint8_t> k_before(n);
    for (size_t i = 0; i < n; ++i) {
        uint16_t cx = cx_of[i];
        if (cx >= cur.nctx()) throw std::runtime_error("cx out of range");
        k_before[i] = cur.k[cx];
    }
    // Now iterate forward to push bins and update models
    for (size_t i = 0; i < n; ++i) {
        uint16_t cx = cx_of[i];
        int32_t e = residuals[i];
        bool sign = e < 0;
        uint32_t m = sign ? (uint32_t)(-(int64_t)e) : (uint32_t)e;
        uint8_t k = cur.k[cx];
        bool isZero = (m == 0);
        // zero flag first (saves 1 bit for zeros vs sign-first)
        flat.push_back({isZero ? (uint8_t)0 : 1, cur.zero[cx].prob});
        cur.zero[cx].update(isZero ? 0 : 1);
        if (isZero) {
            int curk = cur.k[cx];
            if (curk > 0) cur.k[cx] = (uint8_t)((curk * 7) / 8);
            continue;
        }
        // sign only for nonzero
        flat.push_back({sign ? (uint8_t)1 : 0, cur.sign[cx].prob});
        cur.sign[cx].update(sign ? 1 : 0);
        uint32_t q = (k == 0) ? m : (m >> k);
        uint32_t r = (k == 0) ? 0 : (m & ((1u << k) - 1u));
        // quotient unary: q zeros then a one
        for (uint32_t j = 0; j < q; ++j) {
            flat.push_back({0, cur.q[cx].prob});
            cur.q[cx].update(0);
        }
        flat.push_back({1, cur.q[cx].prob});
        cur.q[cx].update(1);
        // remainder bits MSB-first
        for (int b = (int)k - 1; b >= 0; --b) {
            uint8_t bit = (r >> b) & 1u;
            uint16_t prob = cur.rem[cx][b].prob;
            flat.push_back({bit, prob});
            cur.rem[cx][b].update(bit);
        }
        // update k via EMA
        int desired = 31 - __builtin_clz(m);
        int new_k = desired > 0 ? desired - 1 : 0;
        if (new_k > 16) new_k = 16;
        int curk = cur.k[cx];
        int updated = (curk * 3 + new_k + 2) / 4;
        if (updated < 0) updated = 0;
        if (updated > 16) updated = 16;
        cur.k[cx] = (uint8_t)updated;
    }
    // models after forward pass is final
    models = cur;
    // Second: encode flat in reverse (LIFO)
    std::vector<uint8_t> buf(flat.size() * 2 + 32, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state; RansEncInit(&state);
    for (size_t i = flat.size(); i-- > 0; ) {
        put_bin(&state, &ptr, flat[i].bit, flat[i].prob);
    }
    RansEncFlush(&state, &ptr);
    out.assign(ptr, buf.data() + buf.size());
}

void rans_decode_residuals(const std::vector<uint8_t>& in, size_t n,
                           const std::vector<uint16_t>& cx_of,
                           ModelBank& models,
                           std::vector<int32_t>& out) {
    if (n == 0) { out.clear(); return; }
    if (cx_of.size() != n) throw std::runtime_error("cx size mismatch decode");
    if (in.size() < 4) throw std::runtime_error("rans_decode_residuals: too short");
    uint8_t* d = const_cast<uint8_t*>(in.data());
    RansState state; RansDecInit(&state, &d);
    out.assign(n, 0);
    for (size_t i = 0; i < n; ++i) {
        uint16_t cx = cx_of[i];
        if (cx >= models.nctx()) throw std::runtime_error("cx out of range decode");
        uint8_t k = models.k[cx];
        uint8_t nonzero = get_bin(&state, &d, models.zero[cx].prob);
        models.zero[cx].update(nonzero ? 1 : 0);
        if (!nonzero) {
            out[i] = 0;
            if (models.k[cx] > 0) models.k[cx] = (uint8_t)((models.k[cx] * 7) / 8);
            continue;
        }
        bool sign = get_bin(&state, &d, models.sign[cx].prob) != 0;
        models.sign[cx].update(sign ? 1 : 0);
        uint32_t q = 0;
        while (get_bin(&state, &d, models.q[cx].prob) == 0) {
            models.q[cx].update(0);
            ++q;
            if (q > 100000) throw std::runtime_error("q overflow");
        }
        models.q[cx].update(1);
        uint32_t r = 0;
        for (int b = (int)k - 1; b >= 0; --b) {
            uint8_t bit = get_bin(&state, &d, models.rem[cx][b].prob);
            models.rem[cx][b].update(bit);
            r = (r << 1) | bit;
        }
        uint32_t m;
        if (k == 0) m = q;
        else m = (q << k) | r;
        int32_t e = sign ? -(int32_t)m : (int32_t)m;
        out[i] = e;
        int desired = 31 - __builtin_clz(m);
        int new_k = desired > 0 ? desired - 1 : 0;
        if (new_k > 16) new_k = 16;
        int curk = models.k[cx];
        int updated = (curk * 3 + new_k + 2) / 4;
        if (updated < 0) updated = 0;
        if (updated > 16) updated = 16;
        models.k[cx] = (uint8_t)updated;
    }
}

void rans_encode_residuals_auto(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h, ModelBank& models, std::vector<uint8_t>& out) {
    auto cx = compute_resdiff_context(residuals, w, h);
    // Ensure model size
    size_t maxcx = 0;
    for (auto v : cx) maxcx = std::max<size_t>(maxcx, v);
    if (models.nctx() <= maxcx) {
        // Expand if needed (should not happen if caller sized correctly)
        size_t new_n = maxcx + 1;
        ModelBank nb = ModelBank::create(new_n, 16);
        // copy existing
        for (size_t i = 0; i < models.nctx() && i < new_n; ++i) {
            nb.sign[i] = models.sign[i];
            nb.zero[i] = models.zero[i];
            nb.q[i] = models.q[i];
            nb.rem[i] = models.rem[i];
            nb.k[i] = models.k[i];
        }
        models = nb;
    }
    rans_encode_residuals(residuals, cx, models, out);
}

void rans_decode_residuals_auto(const std::vector<uint8_t>& in, size_t n, uint32_t w, uint32_t h, ModelBank& models, std::vector<int32_t>& out) {
    if (n == 0) { out.clear(); return; }
    if (in.size() < 4) throw std::runtime_error("rans_decode_residuals_auto: too short");
    uint8_t* d = const_cast<uint8_t*>(in.data());
    RansState state; RansDecInit(&state, &d);
    out.assign(n, 0);
    // Expand models if needed: now 44*8*4*2*2*2=11264 contexts (ResDiff + activity + orient + zcnt + diag + ssign B5.42)
    size_t need = 11264;
    if (models.nctx() < need) {
        ModelBank nb = ModelBank::create(need, 16);
        for (size_t i = 0; i < models.nctx() && i < need; ++i) {
            nb.sign[i] = models.sign[i];
            nb.zero[i] = models.zero[i];
            nb.q[i] = models.q[i];
            nb.rem[i] = models.rem[i];
            nb.k[i] = models.k[i];
        }
        models = nb;
    }
    for (size_t i = 0; i < n; ++i) {
        uint32_t x = (uint32_t)(i % w);
        uint32_t y = (uint32_t)(i / w);
        int32_t Ra = (x > 0) ? out[i - 1] : 0;
        int32_t Rb = (y > 0) ? out[i - w] : 0;
        int32_t Rc = (x > 0 && y > 0) ? out[i - w - 1] : 0;
        int32_t dx = Ra - Rb;
        int32_t mag = dx < 0 ? -dx : dx;
        int base = 0;
        if (mag <= 2) {
            if (dx > 0) base = (int)mag;
            else base = (int)mag + 3;
        } else {
            int q = std::min<int>(mag, 127) / 4;
            if (dx > 0) base = 6 + q;
            else base = 12 + q;
        }
        if (base < 0) base = 0;
        if (base > 43) base = 43;
        int sumAbs = (Ra < 0 ? -Ra : Ra) + (Rb < 0 ? -Rb : Rb) + (Rc < 0 ? -Rc : Rc);
        int act = 0;
        if (sumAbs <= 3) act = 0;
        else if (sumAbs <= 8) act = 1;
        else if (sumAbs <= 15) act = 2;
        else if (sumAbs <= 25) act = 3;
        else if (sumAbs <= 50) act = 4;
        else if (sumAbs <= 100) act = 5;
        else if (sumAbs <= 180) act = 6;
        else act = 7;
        int baseAct = base + act * 44;
        int orient = (std::abs(Ra) > std::abs(Rb)) ? 1 : 0;
        int zcnt = (Ra == 0 ? 1 : 0) + (Rb == 0 ? 1 : 0) + (Rc == 0 ? 1 : 0);
        int diag = (std::abs(Ra - Rc) > std::abs(Rb - Rc)) ? 1 : 0;
        int ssign = ((Ra >= 0) == (Rb >= 0)) ? 1 : 0;
        int ctx = (((((baseAct * 4) + zcnt) * 2 + orient) * 2 + diag) * 2 + ssign);
        if (ctx < 0) ctx = 0;
        if (ctx >= (int)models.nctx()) ctx = (int)models.nctx() - 1;
        uint16_t cx = (uint16_t)ctx;
        uint8_t k = models.k[cx];
        uint8_t nonzero = get_bin(&state, &d, models.zero[cx].prob);
        models.zero[cx].update(nonzero ? 1 : 0);
        if (!nonzero) {
            out[i] = 0;
            if (models.k[cx] > 0) models.k[cx] = (uint8_t)((models.k[cx] * 7) / 8);
            continue;
        }
        bool sign = get_bin(&state, &d, models.sign[cx].prob) != 0;
        models.sign[cx].update(sign ? 1 : 0);
        uint32_t q = 0;
        while (get_bin(&state, &d, models.q[cx].prob) == 0) {
            models.q[cx].update(0);
            ++q;
            if (q > 100000) throw std::runtime_error("q overflow");
        }
        models.q[cx].update(1);
        uint32_t r = 0;
        for (int b = (int)k - 1; b >= 0; --b) {
            uint8_t bit = get_bin(&state, &d, models.rem[cx][b].prob);
            models.rem[cx][b].update(bit);
            r = (r << 1) | bit;
        }
        uint32_t m;
        if (k == 0) m = q;
        else m = (q << k) | r;
        int32_t e = sign ? -(int32_t)m : (int32_t)m;
        out[i] = e;
        {
            int desired = 31 - __builtin_clz(m);
            int new_k = desired > 0 ? desired - 1 : 0;
            if (new_k > 16) new_k = 16;
            int curk = models.k[cx];
            int updated = (curk * 3 + new_k + 2) / 4;
            if (updated < 0) updated = 0;
            if (updated > 16) updated = 16;
            models.k[cx] = (uint8_t)updated;
        }
    }
}

void rans_encode_residuals_with_llc(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h, const std::vector<uint16_t>& ll_plane, ModelBank& models, std::vector<uint8_t>& out) {
    auto cx = compute_resdiff_context_with_llc(residuals, w, h, ll_plane);
    size_t maxcx = 0;
    for (auto v : cx) maxcx = std::max<size_t>(maxcx, v);
    if (models.nctx() <= maxcx) {
        size_t new_n = maxcx + 1;
        ModelBank nb = ModelBank::create(new_n, 16);
        for (size_t i = 0; i < models.nctx() && i < new_n; ++i) {
            nb.sign[i] = models.sign[i];
            nb.zero[i] = models.zero[i];
            nb.q[i] = models.q[i];
            nb.rem[i] = models.rem[i];
            nb.k[i] = models.k[i];
        }
        models = nb;
    }
    rans_encode_residuals(residuals, cx, models, out);
}

void rans_decode_residuals_with_llc(const std::vector<uint8_t>& in, size_t n, uint32_t w, uint32_t h, const std::vector<uint16_t>& ll_plane, ModelBank& models, std::vector<int32_t>& out) {
    if (n == 0) { out.clear(); return; }
    if (in.size() < 4) throw std::runtime_error("rans_decode_residuals_with_llc: too short");
    uint8_t* d = const_cast<uint8_t*>(in.data());
    RansState state; RansDecInit(&state, &d);
    out.assign(n, 0);
    size_t need = 1408;
    if (models.nctx() < need) {
        ModelBank nb = ModelBank::create(need, 16);
        for (size_t i = 0; i < models.nctx() && i < need; ++i) {
            nb.sign[i] = models.sign[i];
            nb.zero[i] = models.zero[i];
            nb.q[i] = models.q[i];
            nb.rem[i] = models.rem[i];
            nb.k[i] = models.k[i];
        }
        models = nb;
    }
    for (size_t i = 0; i < n; ++i) {
        uint32_t x = (uint32_t)(i % w);
        uint32_t y = (uint32_t)(i / w);
        int32_t Ra = (x > 0) ? out[i - 1] : 0;
        int32_t Rb = (y > 0) ? out[i - w] : 0;
        int32_t Rc = (x > 0 && y > 0) ? out[i - w - 1] : 0;
        int32_t dx = Ra - Rb;
        int32_t mag = dx < 0 ? -dx : dx;
        int base = 0;
        if (mag <= 2) {
            if (dx > 0) base = (int)mag;
            else base = (int)mag + 3;
        } else {
            int q = std::min<int>(mag, 127) / 4;
            if (dx > 0) base = 6 + q;
            else base = 12 + q;
        }
        if (base < 0) base = 0;
        if (base > 43) base = 43;
        int sumAbs = (Ra < 0 ? -Ra : Ra) + (Rb < 0 ? -Rb : Rb) + (Rc < 0 ? -Rc : Rc);
        int act = 0;
        if (sumAbs <= 3) act = 0;
        else if (sumAbs <= 8) act = 1;
        else if (sumAbs <= 15) act = 2;
        else if (sumAbs <= 25) act = 3;
        else if (sumAbs <= 50) act = 4;
        else if (sumAbs <= 100) act = 5;
        else if (sumAbs <= 180) act = 6;
        else act = 7;
        int baseAct = base + act * 44;
        uint16_t ll = (i < ll_plane.size()) ? ll_plane[i] : 0;
        int llc = (ll >> 6) & 0x3;
        if (ll > 1023) llc = (ll >> 14) & 0x3;
        int ctx = baseAct + llc * 352;
        if (ctx < 0) ctx = 0;
        if (ctx >= (int)models.nctx()) ctx = (int)models.nctx() - 1;
        uint16_t cx = (uint16_t)ctx;
        uint8_t k = models.k[cx];
        uint8_t nonzero = get_bin(&state, &d, models.zero[cx].prob);
        models.zero[cx].update(nonzero ? 1 : 0);
        if (!nonzero) {
            out[i] = 0;
            if (models.k[cx] > 0) models.k[cx] = (uint8_t)((models.k[cx] * 7) / 8);
            continue;
        }
        bool sign = get_bin(&state, &d, models.sign[cx].prob) != 0;
        models.sign[cx].update(sign ? 1 : 0);
        uint32_t q = 0;
        while (get_bin(&state, &d, models.q[cx].prob) == 0) {
            models.q[cx].update(0);
            ++q;
            if (q > 100000) throw std::runtime_error("q overflow");
        }
        models.q[cx].update(1);
        uint32_t r = 0;
        for (int b = (int)k - 1; b >= 0; --b) {
            uint8_t bit = get_bin(&state, &d, models.rem[cx][b].prob);
            models.rem[cx][b].update(bit);
            r = (r << 1) | bit;
        }
        uint32_t m;
        if (k == 0) m = q;
        else m = (q << k) | r;
        int32_t e = sign ? -(int32_t)m : (int32_t)m;
        out[i] = e;
        int desired = 31 - __builtin_clz(m);
        int new_k = desired > 0 ? desired - 1 : 0;
        if (new_k > 16) new_k = 16;
        int curk = models.k[cx];
        int updated = (curk * 3 + new_k + 2) / 4;
        if (updated < 0) updated = 0;
        if (updated > 16) updated = 16;
        models.k[cx] = (uint8_t)updated;
    }
}

std::vector<uint8_t> rans_encode_plane(const std::vector<int32_t>& residuals, int /*num_contexts*/) {
    std::vector<uint8_t> buf(residuals.size() * 64 + 32, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state;
    RansEncInit(&state);
    for (size_t i = residuals.size(); i-- > 0; ) {
        bool sign = residuals[i] < 0;
        uint32_t m = static_cast<uint32_t>(std::abs(residuals[i]));
        std::vector<uint8_t> seq;
        seq.push_back(sign ? 1 : 0);                 // sign bit
        if (m == 0) {
            seq.push_back(0);                        // zero flag
        } else {
            seq.push_back(1);                        // nonzero flag
            int L = 31 - __builtin_clz(m);           // floor(log2(m))
            for (int k = 0; k < L; ++k) seq.push_back(0);
            seq.push_back(1);                        // unary stop
            uint32_t rem = m - (1u << L);
            for (int k = L - 1; k >= 0; --k) seq.push_back((rem >> k) & 1u);
        }
        for (size_t j = seq.size(); j-- > 0; )       // emit reversed (LIFO)
            put_bin(&state, &ptr, seq[j], RESIDUAL_PROB);
    }
    RansEncFlush(&state, &ptr);
    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

std::vector<int32_t> rans_decode_plane(const std::vector<uint8_t>& bytes, size_t num_residuals, int /*num_contexts*/) {
    if (bytes.size() < 4) throw std::runtime_error("rans_decode_plane: too short");
    uint8_t* d = const_cast<uint8_t*>(bytes.data());
    RansState state;
    RansDecInit(&state, &d);
    std::vector<int32_t> out(num_residuals, 0);
    for (size_t c = 0; c < num_residuals; ++c) {
        bool sign = get_bin(&state, &d, RESIDUAL_PROB);
        uint8_t nonzero = get_bin(&state, &d, RESIDUAL_PROB);
        uint32_t m = 0;
        if (nonzero) {
            int L = 0;
            while (get_bin(&state, &d, RESIDUAL_PROB) == 0) ++L;   // unary prefix
            uint32_t rem = 0;
            for (int k = 0; k < L; ++k)                             // suffix bits MSB-first
                rem = (rem << 1) | get_bin(&state, &d, RESIDUAL_PROB);
            m = (1u << L) + rem;
        }
        out[c] = sign ? -static_cast<int32_t>(m) : static_cast<int32_t>(m);
    }
    return out;
}

} // namespace prism::codec
