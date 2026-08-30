#pragma once
#include "prism/codec/wavelet.h"
#include "prism/codec/container.h"
#include "prism/types.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

// WAVELET_FLAG (bit 7 of the container flags) is defined in prism/codec/container.h
// (the flag authority). When set, the standard v1 model section is replaced by a
// compact wavelet header + bitplane rANS payload. The v1 production path is
// otherwise untouched (invariant I26).

// residual_mode (WaveletHeader) bit flags. Bit 0 = residual (predictor path),
// bit 1 = Route 5 autoregressive rANS frontend (replaces the bitplane coder),
// bit 2 = R6-B transmitted-histogram backbone (bitplane coder, two-pass static
// per-subband histogram blended with the adaptive EMA; see bitplane.h).
constexpr uint8_t ROUTE5_FLAG = 2;
constexpr uint8_t R6B_FLAG = 4;
constexpr uint8_t R6C_FLAG = 8; // R6-C: per-fine-context CLUSTER transmitted histogram
constexpr uint8_t R6D_FLAG = 16; // R6-D: true JXL-Modular property tree with per-leaf transmitted histogram
constexpr uint8_t R7A_FLAG = 32; // R7-A: in-subband MED/gradient value predictor (residual path)
constexpr uint8_t R7B_FLAG = 64; // R7-B: per-level adaptive wavelet filter selection
constexpr uint8_t P1_FLAG = 128; // P1: spatial predictor (JXL-style adaptive bank) BEFORE wavelet
constexpr uint16_t P2_FLAG = 256; // P2: learned MLP spatial predictor (17->64->32->1) BEFORE wavelet
// residual_mode is now uint16_t (16 bits). All 8 original bits claimed:
// 1 (RESIDUAL) | 2 (ROUTE5) | 4 (R6B) | 8 (R6C) | 16 (R6D) | 32 (R7A) | 64 (R7B) | 128 (P1)
// Bit 8 = P2_FLAG (256).

struct WaveletHeader {
    uint8_t filter_id = X_FILTER_ID_53; // 0 Haar, 1 Le Gall 5/3, 2 Reversible 9/7
    uint8_t levels = X_DEFAULT_LEVELS;
    uint8_t maxbits = 0;
    uint16_t residual_mode = 0;          // X6a (L1): bit0 = residual (code r = c - c_hat)
    uint32_t total_symbols = 0;
    // Subband table, in forward() order: one entry per subband.
    std::vector<uint8_t> orient; // Subband::Orient as u8
    std::vector<uint8_t> level;
    std::vector<uint16_t> w;
    std::vector<uint16_t> h;
    // Number of subbands per plane (== 3*levels + 1) for split on decode.
    uint16_t subbands_per_plane = 0;
    uint8_t num_planes = 0;
    // Per-plane symbol counts (bitplane codestream is encoded per plane).
    std::vector<uint32_t> plane_symbols;
    // Per-subband maxbits (each subband/code-block carries its own bitplane
    // range, EBCOT-style, so tiny AC bands are not forced to emit the global
    // LL bit-depth as wasted all-zero significance bits).
    std::vector<uint8_t> sub_maxbits;
    // Per-subband rANS stream byte length, in forward() order, so the decoder
    // can slice the per-plane concatenated payload without self-delimiting.
    std::vector<uint32_t> sub_bytes;
    // X6c hyperprior: per-subband probability-calibration code (quantised factor
    // into a small codebook, see pred_scale_from_code). One entry per subband in
    // forward() order. Empty means "all neutral (factor 1.0)". The factor
    // multiplies the learned model's predicted P(0) so a per-subband (or
    // per-plane) calibration gain is transmitted as a tiny side stream; no full
    // model is sent (invariant I29 holds).
    std::vector<uint8_t> sub_scale_code;
    // R6-B (Route 6 lever B): transmitted per-subband histogram for the static
    // backbone. Layout: for each subband (forward() order) R6B_CLASSES * 2
    // uint16 counts [cnt0_0, cnt1_0, cnt0_1, cnt1_1, ...]. Only present when
    // residual_mode carries R6B_FLAG. Overhead is a few KB/image (<< 0.01 bpp,
    // spec R6-B sub-gate L3b), so no full model is transmitted (I29 holds).
    //
    // NOTE: counts are clamped to the 16-bit range [0, 0xFFFF] on serialization;
    // extremely large images with a single subband exceeding 65535 accumulated
    // symbols are saturated rather than truncated, so no count silently wraps.
    std::vector<uint16_t> sub_hist;
    // R6-C (Route 6 lever C): per-fine-context CLUSTER transmitted histogram.
    // kb is the number of probability buckets per symtype (NB = 3*kb clusters);
    // cluster_hist holds NB*2 uint32 counts [c0_0, c1_0, c0_1, c1_1, ...] for a
    // GLOBAL (all-subband) set of clusters. Only present when residual_mode
    // carries R6C_FLAG. Counts are transmitted as uint32 so the decoder rebuilds
    // the EXACT same static backbone the encoder used (a 16-bit on-wire form
    // would clamp counts > 65535 and desync the rANS stream on large planes where
    // a single cluster sees millions of symbols). Overhead = NB*2*4 bytes/image
    // (e.g. kb=256 -> 6KB, << 0.01 bpp), so no full model is transmitted
    // (invariant I29 holds).
    uint16_t r6c_kb = 0;
    std::vector<uint32_t> cluster_hist;
    // R6-D (Route 6 lever D): true JXL-Modular property tree. r6d_k leaves; r6d_p0
    // holds K*3 transmitted P(0)*M values (sign entries neutral), delta-coded then
    // varans-coded in the header. The tree itself is baked (route6d_tree.inc),
    // zero bytes. r6d_w is the transmitted-histogram blend weight (W*200, W in
    // [0,1]) so decode reproduces encode's exact blended probabilities. Overhead
    // = K*3*2 bytes/image (K=2048 -> ~12KB, ~0.01 bpp), so invariant I29 holds.
    uint16_t r6d_k = 0;
    uint8_t r6d_w = 140; // default W = 0.7
    std::vector<uint16_t> r6d_p0; // [K*3], present iff residual_mode & R6D_FLAG
    // R7-A (Route 7 lever A): in-subband value predictor kind. 0 = MED (LOCO-I
    // median edge detector), 1 = GRADIENT (JXL gradient predictor). Present iff
    // residual_mode & R7A_FLAG. Zero transmitted side-info beyond this tag: the
    // predictor is recomputed from reconstructed same-subband neighbours at both
    // ends, so the rANS stream round-trips byte-exact (invariant I29).
    uint8_t r7a_pred = 0;
    // R7-B (Route 7 lever B): per-subband filter id (forward() order), present iff
    // residual_mode & R7B_FLAG. Overhead = nsub * 2 bits (<= 0.001 bpp). When empty
    // (R7B not set), decode uses the single header filter_id for every level.
    std::vector<uint8_t> sub_filter;
};

struct WaveletFrame {
    WaveletHeader hdr;
    std::vector<uint8_t> payload; // bitplane rANS stream
};

// Serialize a wavelet frame onto the v1 envelope (magic PRSM, version 1,
// width/height/bd/nc/ct/flags(WAVELET_FLAG)/effort, wavelet header, payload,
// crc32_all). Returns the full byte stream (this IS the NET: no model tables).
std::vector<uint8_t> wavelet_container_encode(const Raster& raster,
                                              const WaveletHeader& hdr,
                                              const std::vector<uint8_t>& payload);

// Parse a wavelet frame from bytes. Throws on bad magic / crc mismatch.
WaveletFrame wavelet_container_decode(const std::vector<uint8_t>& bytes);

// Full FRAME-WAVELET pipeline (per the architect blueprint): raster -> bytes.
// Applies YCoCg-R, lifts every plane, bitplane-codes the subbands. net_out is
// set to the total encoded byte count (payload + header, zero model tables).
std::vector<uint8_t> frame_wavelet_encode(const Raster& raster, WaveletFilter filter,
                                           int levels, size_t& net_out);

// FRAME-WAVELET-RESIDUAL (X6a, lever L1): like frame_wavelet_encode but codes the
// learned-coefficient residual r = c - c_hat instead of c (RESIDUAL_FLAG set in
// the header). Predictor weights are baked constants (zero transmitted bytes,
// invariant I29); the round trip stays byte-exact.
std::vector<uint8_t> frame_wavelet_encode_residual(const Raster& raster,
                                                    WaveletFilter filter, int levels,
                                                    size_t& net_out);

// FRAME-WAVELET-ROUTE5 (issue #130): the autoregressive learned rANS frontend.
// Codes the predictor residual r = c - c_hat through the Route5Coder (hybrid-uint
// token categorical rANS with a baked neural net) instead of the bitplane coder.
// ROUTE5_FLAG (residual_mode bit 1) is set so decode dispatches the same path.
// Zero model bytes transmitted (invariant I29).
std::vector<uint8_t> frame_wavelet_encode_route5(const Raster& raster,
                                                 WaveletFilter filter, int levels,
                                                 size_t& net_out);

// FRAME-WAVELET-R6B (issue #130, Route 6 lever B): the two-pass
// transmitted-histogram backbone. Codes the learned-coefficient residual
// r = c - c_hat through the BitplaneCoder::encode_static (R6-B static histogram
// blended with the adaptive EMA) instead of the adaptive-only bitplane coder.
// R6B_FLAG (residual_mode bit 2) is set so decode dispatches the same path and
// parses the transmitted per-subband histogram. Zero full-model bytes transmitted
// (invariant I29); only the tiny histogram header is sent.
std::vector<uint8_t> frame_wavelet_encode_r6b(const Raster& raster,
                                               WaveletFilter filter, int levels,
                                               size_t& net_out);

// FRAME-WAVELET-R6C (issue #130, Route 6 lever C): the per-fine-context CLUSTER
// transmitted-histogram backbone. Codes the learned-coefficient residual
// r = c - c_hat through BitplaneCoder::encode_static_cluster (a transmitted
// static P(0) per learned context CLUSTER, NB = 3*kb, blended with the adaptive
// EMA) instead of the coarse per-subband-class R6-B backbone. R6C_FLAG set so
// decode parses the transmitted cluster histogram. Zero full-model bytes
// transmitted (invariant I29); only the tiny cluster histogram header is sent.
std::vector<uint8_t> frame_wavelet_encode_r6c(const Raster& raster,
                                                WaveletFilter filter, int levels,
                                                int kb, size_t& net_out);

// FRAME-WAVELET-R6D (issue #130, Route 6 lever D): the TRUE JXL-Modular property
// tree with transmitted per-leaf histograms. Codes the learned-coefficient
// residual r = c - c_hat through BitplaneCoder::encode_static_tree (a baked
// property-tree leaf over RAW neighbour magnitudes keyed to a transmitted per-leaf
// P(0), blended with the adaptive EMA) instead of the MLP-cluster R6-C backbone.
// R6D_FLAG set so decode parses the transmitted per-leaf histogram. Zero full-model
// bytes transmitted (invariant I29); only the tiny per-leaf histogram header is
// sent. W is the transmitted-histogram blend weight (default 0.7, may be swept).
std::vector<uint8_t> frame_wavelet_encode_r6d(const Raster& raster,
                                                WaveletFilter filter, int levels,
                                                int k, float W, size_t& net_out);

// FRAME-WAVELET-R7 (issue #130, Route 7): in-subband value prediction + adaptive
// transform. R7-A codes the residual r = c - InSubbandPredictor(c) (a JXL-style
// predictor transform over same-subband raster neighbours) through the existing
// byte-exact bitplane coder instead of c, removing local coefficient mean for
// free (zero side-info). R7-B optionally selects the wavelet filter per
// decomposition level by REAL rANS bytes and transmits only the tiny per-level
// tag. Zero full-model bytes transmitted (invariant I29). use_gradient selects
// the MED (false) vs GRADIENT (true) predictor; adaptive_filter enables R7-B.
std::vector<uint8_t> frame_wavelet_encode_r7(const Raster& raster,
                                              WaveletFilter filter, int levels,
                                              size_t& net_out,
                                              bool use_gradient = false,
                                              bool adaptive_filter = false);

// FRAME-WAVELET-P1 (issue #130, Option A): spatial-domain predictor BEFORE wavelet.
// Applies the JXL-style adaptive spatial predictor bank (P1: median + gradient +
// slope) on each color-transformed plane to compute spatial residuals, then
// wavelet-transforms and bitplane-codes the residuals. On decode, the inverse
// wavelet yields spatial residuals which are reconstructed to pixels via the same
// causal predictor. P1_FLAG (residual_mode bit 7) is set. The spatial predictor
// state is NOT transmitted (both sides compute identically from causal neighbours;
// invariant I29).
std::vector<uint8_t> frame_wavelet_encode_p1(const Raster& raster,
                                              WaveletFilter filter, int levels,
                                              size_t& net_out);

// FRAME-WAVELET-P2 (issue #130, Option A): learned MLP spatial predictor BEFORE wavelet.
// P2_FLAG (residual_mode bit 8) is set. Baked weights (17->64->32->1, 3425 params),
// zero transmitted bytes (invariant I29). Byte-exact round-trip.
std::vector<uint8_t> frame_wavelet_encode_p2(const Raster& raster,
                                              WaveletFilter filter, int levels,
                                              size_t& net_out);

// bytes -> raster (inverse of the above).
Raster frame_wavelet_decode(const std::vector<uint8_t>& bytes);

// FRAME-WAVELET payload only (bitplane rANS stream, no container header). Used
// by the X1 decorrelation gate so the wavelet domain is compared apples-to-apples
// against the FRAME-SPATIAL control under the IDENTICAL entropy backend.
size_t frame_wavelet_payload(const Raster& raster, WaveletFilter filter, int levels,
                             uint8_t& maxbits_out);

// FRAME-SPATIAL control (X1): YCoCg-R -> MED residual per plane -> SAME bitplane
// rANS coder (each plane wrapped as a single LL subband). This isolates the
// decorrelation gain of the wavelet transform from the entropy backend, which is
// shared with FRAME-WAVELET. Returns total rANS payload bytes.
size_t frame_spatial_payload(const Raster& raster);

} // namespace prism::codec
