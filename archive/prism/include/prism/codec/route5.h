#pragma once
#include "prism/codec/wavelet.h"
#include <vector>
#include <cstdint>
#include <array>

namespace prism::codec {

// Route 5: truly autoregressive learned rANS entropy frontend (issue #130).
//
// Replaces the per-bitplane adaptive binary coder (Route 4) with a hybrid-uint
// tokenization coded by a multi-symbol (categorical) rANS. For each coefficient
// the baked neural net emits a full categorical distribution over tokens
// {zero, |c|=1..7, escape} from a 2D-causal neighbour window; the chosen token
// is coded near its entropy bound. Escapes fall back to Elias-gamma at a fixed
// 0.5 probability on the same rANS.
//
// LIFO-safety: the net distribution is a PURE function of already-decoded
// neighbour magnitudes (no rANS-stream-history state), so the decoder reproduces
// the exact encoder distribution. The rANS stream is reverse-emitted (encode)
// and reverse-recovered (decode) exactly like BitplaneRans, so a per-fine-context
// categorical EMA can adapt in forward order on BOTH sides and stay byte-exact.

constexpr int R5_T_ESC = 15;         // escape ladder: |c| >= 15 -> Elias-gamma escape
// Alphabet: 0 = zero; 1..(ESC-1) = |c| = 1..14 (direct, signed by a separate sign
// bit); ESC = escape (|c| >= ESC, Elias-gamma). 16 classes total.
constexpr int R5_ALPHA = 16;        // 16 token classes (0..15)

// Causal feature vector for token prediction (mirrors learned_ctx LCFeat, minus
// the bitplane-specific symtype/ppos; aligned 13-feature normalization).
struct R5Feat {
    uint8_t orient = 0;
    uint8_t level = 0;
    uint8_t parent_sig = 0;
    uint8_t fc = 0;
    uint8_t dg = 0;
    uint8_t nbsig = 0;
    uint8_t nmag = 0;
    uint8_t pmag = 0;
    uint8_t ownmag = 0;
    uint8_t ppos = 0;
    uint8_t lc_mag = 0;
    uint8_t lc_sig = 0;
};

// Baked categorical net: 13-input -> 32 -> 16 -> 16 logits, softmax -> 16 freqs.
float r5_net_token_logit(int i, const float x[13]);

// Per-fine-context categorical EMA blended with the net prior (addendum 26-C).
struct Route5Model {
    static constexpr int FB_ORIENT = 4;
    static constexpr int FB_LEVEL = 6;
    static constexpr int FB_PARENT = 2;
    static constexpr int FB_FC = 5;
    static constexpr int FB_DG = 5;
    static constexpr int FB_NMAG = 8;
    static constexpr int FB_OWN = 8;
    static constexpr uint32_t FINE_POOL =
        (uint32_t)FB_ORIENT * FB_LEVEL * FB_PARENT * FB_FC * FB_DG * FB_NMAG * FB_OWN;
    static constexpr int M = 1 << 16;
    static constexpr int K_PSEUDO = 64;

    Route5Model();

    static uint32_t fine_ctx(const R5Feat& f) {
        uint32_t id = 0;
        id = id * FB_ORIENT + (f.orient % FB_ORIENT);
        id = id * FB_LEVEL + (f.level % FB_LEVEL);
        id = id * FB_PARENT + (f.parent_sig ? 1u : 0u);
        id = id * FB_FC + (uint32_t)(f.fc % FB_FC);
        id = id * FB_DG + (uint32_t)(f.dg % FB_DG);
        id = id * FB_NMAG + (uint32_t)(f.nmag % FB_NMAG);
        id = id * FB_OWN + (uint32_t)(f.ownmag % FB_OWN);
        return id;
    }

    // Fill `freqs` (size R5_ALPHA) summing to M, each >= 1, from the net prior
    // blended with the per-context EMA for context `f`.
    void predict(const R5Feat& f, uint16_t freqs[R5_ALPHA]) const;

    // Advance the EMA with the actual token (causal, forward order both sides).
    void update(const R5Feat& f, uint8_t token);

    static float blend() { return g_blend; }
    static void set_blend(float v) { g_blend = v; }

private:
    std::vector<float> ema_;   // FINE_POOL * R5_ALPHA probabilities (0..1)
    std::vector<uint32_t> count_;
    static float g_blend;
};

struct Route5Coder {
    struct Result {
        std::vector<std::vector<uint8_t>> streams; // one per input subband
    };

    // Encode all subbands of a plane (in forward() order) together so PARENT
    // subband magnitudes are available as causal context (as Route 4). Each
    // subband keeps its own rANS stream.
    Result encode(const std::vector<Subband>& subbands) const;

    std::vector<Subband> decode(const std::vector<std::vector<uint8_t>>& streams,
                                const std::vector<Subband>& layout) const;

    // Build the token (and its event layout) for a signed coefficient. tokens:
    // 0 = |c|=0; 1..(ESC-1) = |c|=1..14 (direct, a separate sign bit follows);
    // ESC = escape (|c| >= ESC, Elias-gamma magnitude follows the sign bit).
    static uint8_t coeff_token(int32_t c) {
        uint32_t m = (uint32_t)(c < 0 ? -c : c);
        return (uint8_t)(m >= (uint32_t)R5_T_ESC ? R5_T_ESC : m);
    }

    // One (feature, token) training sample for the baked net.
    struct Sample {
        R5Feat feat{};
        uint8_t token = 0;
    };

    // Walk subbands in coding order and emit one Sample per coefficient (over the
    // TRUE residuals). The feature is byte-identical to the encoder/decoder walk
    // so the trained net is symmetric. `residuals` are the per-subband residual
    // fields (already computed by the caller via the baked predictor); `subs` only
    // supplies the orient/level/w/h layout and coding order.
    static void collect_samples(const std::vector<Subband>& subs,
                                 const std::vector<std::vector<int32_t>>& residuals,
                                 std::vector<Sample>& out);
};

} // namespace prism::codec
