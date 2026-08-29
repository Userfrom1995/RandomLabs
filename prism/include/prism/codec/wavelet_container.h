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

struct WaveletHeader {
    uint8_t filter_id = X_FILTER_ID_53; // 0 Haar, 1 Le Gall 5/3, 2 Reversible 9/7
    uint8_t levels = X_DEFAULT_LEVELS;
    uint8_t maxbits = 0;
    uint8_t residual_mode = 0;          // X6a (L1): bit0 = residual (code r = c - c_hat)
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
    std::vector<uint16_t> sub_hist;
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
