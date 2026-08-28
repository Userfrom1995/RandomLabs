// V0 sandbox tokenization profiles (spec addendum 18.3 verbatim; structural
// pins D1-D8 from .github/agents/decisions/builder/2026-08-25T16-20-00 plus
// pin D13 recorded there before any measurement).
// FORMAT-UNWIRED: nothing here touches any container or production path.

#include "prism/codec/tokenize.h"
#include <stdexcept>

namespace prism::codec::sandbox {

int32_t zigzag_fold(int32_t r) {
    // Classic zigzag: 0, -1, 1, -2, 2, ... -> 0, 1, 2, 3, 4, ...
    return (int32_t)(((uint32_t)r << 1) ^ (uint32_t)(r >> 31));
}

int32_t zigzag_unfold(int32_t u) {
    return (int32_t)((u >> 1) ^ (uint32_t)(-(int32_t)(u & 1)));
}

size_t kind_key_count(TokProfile p, EvKind k) {
    switch (k) {
        case EvKind::ZERO_FLAG:
        case EvKind::SIGN:
        case EvKind::TOKEN:
            return 1;
        case EvKind::RAWBITS:
            return p == TokProfile::ZFFCTRL
                ? throw std::runtime_error("kind unused for this profile")
                : (size_t)1;
        case EvKind::QPOS:
            if (p != TokProfile::ZFFCTRL)
                throw std::runtime_error("kind unused for this profile");
            return (size_t)Q_POS_MAX;
        case EvKind::REM:
            if (p != TokProfile::ZFFCTRL)
                throw std::runtime_error("kind unused for this profile");
            return (size_t)REM_L_MAX * (REM_L_MAX + 1) / 2 + REM_OVERFLOW_BINS;
        case EvKind::ESCQ:
            if (p == TokProfile::ZFFCTRL)
                throw std::runtime_error("kind unused for this profile");
            return (size_t)hyb_esc_contexts(p) * Q_POS_MAX;
    }
    throw std::runtime_error("kind_key_count: unknown kind");
}

void tokenize_sample(TokProfile p, int32_t r, std::vector<TokEvent>& out) {
    // Table keys cap at Q_POS_MAX - 1 for unary streams (pin D5) while the
    // EVENT COUNT stays exact so detokenize_sample round-trips every input;
    // only the transmitted table shape collapses deep supports.
    const uint32_t cap = Q_POS_MAX - 1;
    switch (p) {
    case TokProfile::ZFFCTRL: {
        uint32_t mag = (uint32_t)(r < 0 ? -(int64_t)r : (int64_t)r);
        out.push_back({EvKind::ZERO_FLAG, 0u, mag == 0 ? 1u : 0u});
        if (mag == 0) break;
        out.push_back({EvKind::SIGN, 0u, r < 0 ? 1u : 0u});
        int L = 31 - __builtin_clz(mag);
        for (int k = 0; k < L; ++k)
            out.push_back({EvKind::QPOS,
                           (uint32_t)k < cap ? (uint32_t)k : cap, 0u});
        out.push_back({EvKind::QPOS,
                       (uint32_t)L < cap ? (uint32_t)L : cap, 1u});
        uint32_t rem = mag - (1u << L);
        for (int pos = 0; pos < L; ++pos) {
            uint32_t key = (L <= REM_L_MAX)
                ? (uint32_t)(L * (L - 1) / 2 + pos)
                : (uint32_t)REM_L_MAX * (REM_L_MAX + 1) / 2;   // overflow (D5)
            out.push_back({EvKind::REM, key, (rem >> (L - 1 - pos)) & 1u});
        }
        break;
    }
    case TokProfile::HYB_A:
    case TokProfile::HYB_B:
    case TokProfile::HYB_C: {
        // Pin D13: the fold fixes the unsigned token ladder; the sample's
        // sign rides the dedicated SIGN bin right after each nonzero token
        // (addendum 18.3 closing rule + L-C5), so u = |r| here.
        uint32_t u = (uint32_t)(r < 0 ? -(int64_t)r : (int64_t)r);
        int t_esc = hyb_t_esc(p);
        if (u == 0) {
            out.push_back({EvKind::TOKEN, 0u, 0u});            // ZERO token
            break;
        }
        out.push_back({EvKind::TOKEN, 0u,
                       u < (uint32_t)t_esc ? u : (uint32_t)t_esc});
        out.push_back({EvKind::SIGN, 0u, r < 0 ? 1u : 0u});
        if (u < (uint32_t)t_esc) break;                        // direct token
        uint32_t m = u - (uint32_t)t_esc + 1u;                 // pin D1: >= 1
        int q = 31 - __builtin_clz(m);                         // bitlen(m)-1
        // Escape contexts are visited PROGRESSIVELY: continuation position
        // k codes in context min(k, T_ESC-1), so the terminator lands in
        // context min(q, T_ESC-1) exactly as pinned in D2 - and the decode
        // side, which learns q only at the terminator, can mirror it.
        for (int k = 0; k <= q; ++k) {
            uint32_t ectx = (p == TokProfile::HYB_A)
                ? 0u
                : (uint32_t)(k < t_esc ? k : t_esc - 1);
            out.push_back({EvKind::ESCQ,
                           ectx * Q_POS_MAX +
                               ((uint32_t)k < cap ? (uint32_t)k : cap),
                           k < q ? 0u : 1u});
        }
        // Low q bits of m raw and unmodeled (pin D3): one RAWBITS event
        // carrying key = q and value = the literal low bits; backends append
        // exactly q bits to the payload and no table entry exists.
        uint32_t low = m & ((q >= 32) ? ~0u : ((1u << q) - 1u));
        out.push_back({EvKind::RAWBITS, (uint32_t)q, low});
        break;
    }
    default:
        throw std::runtime_error("tokenize_sample: unknown profile");
    }
}

int32_t detokenize_sample(TokProfile p, const std::vector<TokEvent>& events,
                          size_t& pos) {
    auto next = [&]() -> const TokEvent& { return events.at(pos++); };
    switch (p) {
    case TokProfile::ZFFCTRL: {
        bool zero = next().value != 0;
        if (zero) return 0;
        bool neg = next().value != 0;
        int L = 0;
        while (next().value == 0) ++L;                 // terminator consumed
        uint32_t mag = 1u << L;
        for (int b = 0; b < L; ++b)
            mag |= next().value << (L - 1 - b);
        return neg ? -(int32_t)mag : (int32_t)mag;
    }
    case TokProfile::HYB_A:
    case TokProfile::HYB_B:
    case TokProfile::HYB_C: {
        int t_esc = hyb_t_esc(p);
        uint32_t sym = next().value;
        if (sym == 0) return 0;
        bool neg = next().value != 0;
        if (sym < (uint32_t)t_esc) return neg ? -(int32_t)sym : (int32_t)sym;
        int q = 0;
        while (next().value == 0) ++q;                 // escape quotient
        const TokEvent& raw = next();                  // pin D3 literal bits
        uint32_t m = (1u << q) | (raw.value & ((q >= 32) ? ~0u
                                                         : ((1u << q) - 1u)));
        uint32_t u = (uint32_t)t_esc - 1u + m;
        return neg ? -(int32_t)u : (int32_t)u;
    }
    default:
        throw std::runtime_error("detokenize_sample: unknown profile");
    }
}

bool parse_profile(const std::string& s, TokProfile& out) {
    if (s == "ZFFCTRL") { out = TokProfile::ZFFCTRL; return true; }
    if (s == "HYB-A" || s == "ESCA") { out = TokProfile::HYB_A; return true; }
    if (s == "HYB-B" || s == "ESCB") { out = TokProfile::HYB_B; return true; }
    if (s == "HYB-C" || s == "ESCC") { out = TokProfile::HYB_C; return true; }
    return false;
}

const char* profile_name(TokProfile p) {
    switch (p) {
        case TokProfile::ZFFCTRL: return "ZFFCTRL";
        case TokProfile::HYB_A: return "HYB-A";
        case TokProfile::HYB_B: return "HYB-B";
        case TokProfile::HYB_C: return "HYB-C";
    }
    return "?";
}

} // namespace prism::codec::sandbox
