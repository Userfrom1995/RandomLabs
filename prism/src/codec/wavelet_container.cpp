// Wavelet container: rides the v1 envelope with WAVELET_FLAG set.
//
// The v1 production path (container.cpp model section) is NOT modified; this
// module is a parallel, format-frozen-at-X4-friendly writer/reader for the
// beyond-predictive frame. Byte-exact round-trip and CRC32 are preserved.

#include "prism/codec/wavelet_container.h"
#include "prism/codec/bitplane.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/codec/predictor.h"
#include "prism/codec/r7_predictor.h"
#include "prism/codec/bitplane_rans.h"
#include "prism/codec/route5.h"
#include "prism/crc32.h"
#include "prism/bitstream.h"
#include <stdexcept>
#include <vector>
#include <algorithm>
#include <cmath>
#include <limits>

namespace prism::codec {

namespace {

// X6c hyperprior: per-subband probability-calibration codebook. Code 0 is the
// neutral factor (1.0, no change); the rest are sharpen (super-1) / flatten
// (sub-1) factors that recalibrate the learned model's predicted P(0). The
// factor is transmitted as a tiny side code per subband (invariant I29: no full
// model is sent, only a scalar multiplier), so it costs a handful of bytes.
static const float kX6cScaleTab[] = {1.0f, 1.25f, 1.6f, 2.0f, 0.8f, 0.625f, 0.5f, 0.4f};
static const uint8_t kX6cScaleN = (uint8_t)(sizeof(kX6cScaleTab) / sizeof(float));

static inline float pred_scale_from_code(uint8_t c) {
    if (c >= kX6cScaleN) return 1.0f;
    return kX6cScaleTab[c];
}
static inline uint8_t pred_scale_to_code(float s) {
    uint8_t best = 0; float bd = 1e9f;
    for (uint8_t c = 0; c < kX6cScaleN; ++c) {
        float d = std::fabs(kX6cScaleTab[c] - s);
        if (d < bd) { bd = d; best = c; }
    }
    return best;
}

uint8_t filter_to_id(WaveletFilter f) {
    switch (f) {
        case WaveletFilter::Haar: return X_FILTER_ID_HAAR;
        case WaveletFilter::LeGall53: return X_FILTER_ID_53;
        case WaveletFilter::Reversible97: return X_FILTER_ID_97;
    }
    return X_FILTER_ID_53;
}
WaveletFilter id_to_filter(uint8_t id) {
    switch (id) {
        case X_FILTER_ID_HAAR: return WaveletFilter::Haar;
        case X_FILTER_ID_97: return WaveletFilter::Reversible97;
        default: return WaveletFilter::LeGall53;
    }
}
} // namespace

std::vector<uint8_t> wavelet_container_encode(const Raster& raster,
                                              const WaveletHeader& hdr,
                                              const std::vector<uint8_t>& payload) {
    std::vector<uint8_t> out;
    out.push_back('P'); out.push_back('R'); out.push_back('S'); out.push_back('M');
    out.push_back(1); // version
    write_u32_le_vec(out, raster.w);
    write_u32_le_vec(out, raster.h);
    out.push_back((uint8_t)raster.bd);
    out.push_back((uint8_t)raster.num_channels());
    out.push_back(hdr.filter_id);            // color_transform_id slot carries filter id? no:
    // NOTE: we keep color_transform_id = the transform applied to the data
    // domain (YCoCgR for BD8, None for BD16 because YCoCgR overflows u16), and
    // stash the wavelet filter id in the wavelet header below.
    out.back() = (uint8_t)((raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                        : ColorTransform::None);
    out.push_back(WAVELET_FLAG);             // flags
    out.push_back(0);                        // effort
    // Wavelet header.
    out.push_back(hdr.filter_id);
    out.push_back(hdr.levels);
    out.push_back(hdr.maxbits);
    out.push_back(hdr.residual_mode);
    write_u32_le_vec(out, hdr.total_symbols);
    write_u16_le_vec(out, hdr.subbands_per_plane);
    out.push_back(hdr.num_planes);
    for (uint8_t pi = 0; pi < hdr.num_planes; ++pi)
        write_u32_le_vec(out, hdr.plane_symbols[pi]);
    uint16_t nsub = (uint16_t)hdr.orient.size();
    write_u16_le_vec(out, nsub);
    for (uint16_t i = 0; i < nsub; ++i) {
        out.push_back(hdr.orient[i]);
        out.push_back(hdr.level[i]);
        write_u16_le_vec(out, hdr.w[i]);
        write_u16_le_vec(out, hdr.h[i]);
        out.push_back(hdr.sub_maxbits[i]);
        write_u32_le_vec(out, hdr.sub_bytes[i]);
    }
    // X6c hyperprior: per-subband probability-calibration code.
    for (uint16_t i = 0; i < nsub; ++i)
        out.push_back(i < hdr.sub_scale_code.size() ? hdr.sub_scale_code[i] : 0);
    // R6-B transmitted per-subband histogram (symmetric with decode: present
    // whenever the R6B flag is set, not merely when the vector is non-empty).
    if (hdr.residual_mode & R6B_FLAG) {
        for (uint16_t i = 0; i < nsub; ++i) {
            size_t base = (size_t)i * R6B_CLASSES * 2;
            for (int k = 0; k < R6B_CLASSES * 2; ++k) {
                uint16_t v = (base + k < hdr.sub_hist.size()) ? hdr.sub_hist[base + k] : 0;
                write_u16_le_vec(out, v);
            }
        }
    }
    // R6-C transmitted GLOBAL cluster histogram (present whenever R6C_FLAG set).
    // The histogram is written ONCE PER PLANE (all subbands of a plane share one
    // NB-context cluster space), so the total on the wire is nplanes * NB * 2,
    // matching what the decoder's nexp (= NB*2*nplanes) reads back.
    if (hdr.residual_mode & R6C_FLAG) {
        write_u16_le_vec(out, hdr.r6c_kb);
        uint32_t nexp = (uint32_t)(3u * (uint32_t)hdr.r6c_kb) * 2u *
                        (uint32_t)hdr.num_planes;
        for (uint32_t k = 0; k < nexp; ++k) {
            uint32_t v = (k < hdr.cluster_hist.size()) ? hdr.cluster_hist[k] : 0;
            write_u32_le_vec(out, v);
        }
    }
    // R7-A (Route 7 lever A): per-subband predictor mode (0=MED,1=GRADIENT),
    // present whenever R7A_FLAG is set.
    if (hdr.residual_mode & R7A_FLAG) {
        uint16_t nsub = (uint16_t)hdr.orient.size();
        for (uint16_t i = 0; i < nsub; ++i) {
            uint8_t v = (i < hdr.sub_r7a_pred.size()) ? hdr.sub_r7a_pred[i] : 0;
            out.push_back(v);
        }
    }
    // R7-B (Route 7 lever B): per-level filter id, present whenever R7B_FLAG set.
    if (hdr.residual_mode & R7B_FLAG) {
        out.push_back((uint8_t)hdr.level_filter.size());
        for (uint8_t v : hdr.level_filter) out.push_back(v);
    }
    // Payload.
    out.insert(out.end(), payload.begin(), payload.end());
    // CRC32 over everything above.
    uint32_t crc = crc32(out.data(), out.size());
    write_u32_le_vec(out, crc);
    return out;
}

WaveletFrame wavelet_container_decode(const std::vector<uint8_t>& bytes) {
    if (bytes.size() < 18) throw std::runtime_error("wavelet container: too short");
    if (bytes[0] != 'P' || bytes[1] != 'R' || bytes[2] != 'S' || bytes[3] != 'M')
        throw std::runtime_error("wavelet container: bad magic");
    if (bytes[4] != 1) throw std::runtime_error("wavelet container: unsupported version");
    size_t pos = 5;
    uint32_t w = read_u32_le_bytes(bytes.data() + pos); pos += 4;
    uint32_t h = read_u32_le_bytes(bytes.data() + pos); pos += 4;
    uint8_t bd = bytes[pos++];
    uint8_t nc = bytes[pos++];
    uint8_t ct = bytes[pos++]; (void)ct;
    uint8_t flags = bytes[pos++];
    if (!(flags & WAVELET_FLAG)) throw std::runtime_error("wavelet container: flag not set");
    pos += 1; // effort
    WaveletHeader hdr;
    hdr.filter_id = bytes[pos++];
    hdr.levels = bytes[pos++];
    hdr.maxbits = bytes[pos++];
    hdr.residual_mode = bytes[pos++];
    hdr.total_symbols = read_u32_le_bytes(bytes.data() + pos); pos += 4;
    hdr.subbands_per_plane = read_u16_le_bytes(bytes.data() + pos); pos += 2;
    hdr.num_planes = bytes[pos++];
    hdr.plane_symbols.resize(hdr.num_planes);
    for (uint8_t pi = 0; pi < hdr.num_planes; ++pi) {
        hdr.plane_symbols[pi] = read_u32_le_bytes(bytes.data() + pos); pos += 4;
    }
    uint16_t nsub = read_u16_le_bytes(bytes.data() + pos); pos += 2;
    hdr.orient.resize(nsub);
    hdr.level.resize(nsub);
    hdr.w.resize(nsub);
    hdr.h.resize(nsub);
    hdr.sub_maxbits.resize(nsub);
    hdr.sub_bytes.resize(nsub);
    for (uint16_t i = 0; i < nsub; ++i) {
        hdr.orient[i] = bytes[pos++];
        hdr.level[i] = bytes[pos++];
        hdr.w[i] = read_u16_le_bytes(bytes.data() + pos); pos += 2;
        hdr.h[i] = read_u16_le_bytes(bytes.data() + pos); pos += 2;
        hdr.sub_maxbits[i] = bytes[pos++];
        hdr.sub_bytes[i] = read_u32_le_bytes(bytes.data() + pos); pos += 4;
    }
    // X6c hyperprior: per-subband probability-calibration code.
    hdr.sub_scale_code.resize(nsub);
    for (uint16_t i = 0; i < nsub; ++i) hdr.sub_scale_code[i] = bytes[pos++];
    // R6-B transmitted per-subband histogram (only when the R6B flag is set).
    if (hdr.residual_mode & R6B_FLAG) {
        hdr.sub_hist.resize((size_t)nsub * R6B_CLASSES * 2, 0);
        for (uint16_t i = 0; i < nsub; ++i) {
            size_t base = (size_t)i * R6B_CLASSES * 2;
            for (int k = 0; k < R6B_CLASSES * 2; ++k) {
                hdr.sub_hist[base + k] = read_u16_le_bytes(bytes.data() + pos);
                pos += 2;
            }
        }
    }
    // R6-C transmitted GLOBAL cluster histogram (only when the R6C flag is set).
    // The histogram is written ONCE PER PLANE (all subbands of a plane share one
    // NB-context cluster space), so the total on the wire is nplanes * NB * 2.
    if (hdr.residual_mode & R6C_FLAG) {
        hdr.r6c_kb = read_u16_le_bytes(bytes.data() + pos); pos += 2;
        uint32_t nexp = (uint32_t)(3u * (uint32_t)hdr.r6c_kb) * 2u * (uint32_t)hdr.num_planes;
        hdr.cluster_hist.assign(nexp, 0);
        for (uint32_t k = 0; k < nexp; ++k) {
            hdr.cluster_hist[k] = read_u32_le_bytes(bytes.data() + pos);
            pos += 4;
        }
    }
    // R7-A per-subband predictor mode (only when the R7A flag is set).
    if (hdr.residual_mode & R7A_FLAG) {
        uint16_t nsub = (uint16_t)hdr.orient.size();
        hdr.sub_r7a_pred.resize(nsub, 0);
        for (uint16_t i = 0; i < nsub; ++i) hdr.sub_r7a_pred[i] = bytes[pos++];
    }
    // R7-B per-level filter id (only when the R7B flag is set).
    if (hdr.residual_mode & R7B_FLAG) {
        uint8_t nlf = bytes[pos++];
        hdr.level_filter.resize(nlf, (uint8_t)X_FILTER_ID_53);
        for (uint8_t i = 0; i < nlf; ++i) hdr.level_filter[i] = bytes[pos++];
    }
    // Payload until the trailing crc32 (4 bytes).
    if (bytes.size() < pos + 4) throw std::runtime_error("wavelet container: truncated payload");
    size_t payload_len = bytes.size() - pos - 4;
    std::vector<uint8_t> payload(bytes.begin() + pos, bytes.begin() + pos + payload_len);
    // CRC check over everything except the trailing 4 bytes.
    uint32_t crc_stored = read_u32_le_bytes(bytes.data() + bytes.size() - 4);
    uint32_t crc_calc = crc32(bytes.data(), bytes.size() - 4);
    if (crc_stored != crc_calc) throw std::runtime_error("wavelet container: crc32 mismatch");
    WaveletFrame frame;
    frame.hdr = hdr;
    frame.payload = std::move(payload);
    (void)w; (void)h; (void)bd; (void)nc;
    return frame;
}

std::vector<uint8_t> frame_wavelet_encode(const Raster& raster, WaveletFilter filter,
                                            int levels, size_t& net_out) {
    // YCoCg-R is lossless for BD8 (biased components fit in u16), but for BD16
    // its components span +-65535 which overflows the u16 plane storage after
    // the bias/mask step, so the round-trip is irrecoverably lossy. For BD16 we
    // skip the color transform and lift each channel independently (the lift
    // works in i32, so the full range is preserved exactly).
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    WaveletParams p{filter, levels};
    BitplaneCoder coder;

    std::vector<std::vector<Subband>> per_plane_subs;
    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;

    // Forward transform per plane.
    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();
        per_plane_subs.push_back(subs);
    }

    // Encode each plane: every subband (code-block) independently with its OWN
    // maxbits (EBCOT-style), so small AC bands are not forced to emit the global
    // LL bit-depth as wasted all-zero significance bits. Per-subband stream
    // lengths are recorded so the decoder can slice the concatenated payload.
    std::vector<uint8_t> all_sub_maxbits;
    std::vector<uint32_t> all_sub_bytes;
    std::vector<uint8_t> all_orient, all_level;
    std::vector<uint16_t> all_w, all_h;
    for (size_t pi = 0; pi < per_plane_subs.size(); ++pi) {
        auto& subs = per_plane_subs[pi];
        // Encode the whole plane's subbands TOGETHER (one rANS context walk over
        // the coding order) so child subbands can condition on already-coded
        // PARENT subband magnitudes. Each subband still keeps its OWN stream for
        // sliceable decoding (X3b core fix).
        // X5a: chroma (Co/Cg) subbands are conditioned on the co-located LUMA
        // (Y) subband magnitude via the learned context (no residual subtraction:
        // chroma is already far smaller than luma after YCoCg-R, so subtractive
        // prediction would inflate the residual). Luma itself gets no luma ref.
        const std::vector<std::vector<int32_t>>* luma_mag = nullptr;
        std::vector<std::vector<int32_t>> lmag_buf;
        if (pi > 0) {
            lmag_buf.resize(subs.size());
            const auto& lum_subs = per_plane_subs[0];
            for (size_t oi = 0; oi < subs.size(); ++oi) {
                lmag_buf[oi].resize(subs[oi].coeffs.size());
                const auto& lum = lum_subs[oi].coeffs;
                for (size_t ci = 0; ci < subs[oi].coeffs.size(); ++ci)
                    lmag_buf[oi][ci] = std::abs(lum[ci]);
            }
            luma_mag = &lmag_buf;
        }
        auto res = coder.encode(subs, 0, luma_mag);
        for (size_t oi = 0; oi < subs.size(); ++oi) {
            global_maxbits = std::max(global_maxbits, res.sub_maxbits[oi]);
            all_sub_maxbits.push_back(res.sub_maxbits[oi]);
            all_sub_bytes.push_back((uint32_t)res.streams[oi].size());
            all_orient.push_back((uint8_t)subs[oi].orient);
            all_level.push_back((uint8_t)subs[oi].level);
            all_w.push_back((uint16_t)subs[oi].w);
            all_h.push_back((uint16_t)subs[oi].h);
            payload.insert(payload.end(), res.streams[oi].begin(), res.streams[oi].end());
        }
        plane_symbols.push_back(res.total_symbols);
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = global_maxbits; // informational only (per-subband used on decode)
    hdr.total_symbols = 0;
    hdr.subbands_per_plane = subbands_per_plane;
    hdr.num_planes = (uint8_t)t.planes.size();
    hdr.plane_symbols = plane_symbols;
    hdr.orient = std::move(all_orient);
    hdr.level = std::move(all_level);
    hdr.w = std::move(all_w);
    hdr.h = std::move(all_h);
    hdr.sub_maxbits = std::move(all_sub_maxbits);
    hdr.sub_bytes = std::move(all_sub_bytes);

    auto out = wavelet_container_encode(t, hdr, payload);
    net_out = out.size();
    return out;
}

std::vector<uint8_t> frame_wavelet_encode_residual(const Raster& raster, WaveletFilter filter,
                                                   int levels, size_t& net_out) {
    // FRAME-WAVELET-RESIDUAL (X6a / L1): code r = c - c_hat (the residual of a
    // baked learned coefficient predictor) through the existing byte-exact
    // bitplane coder, instead of c. The predictor reads only already-reconstructed
    // coefficients, so no state is transmitted (I29) and the round trip is exact.
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    WaveletParams p{filter, levels};
    BitplaneCoder coder;
    CoefficientPredictor pred;

    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;
        std::vector<uint8_t> all_sub_maxbits, all_orient, all_level;
        std::vector<uint32_t> all_sub_bytes;
        std::vector<uint16_t> all_w, all_h;
        std::vector<uint8_t> all_scale_code; // X6c hyperprior per-subband code

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();

        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
        // recon holds the TRUE coefficients (predictor reads true c of earlier
        // coefficients; identical to what decode reconstructs), so it is never
        // modified during the pre-pass - neighbours stay at their true value.
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) recon[si] = subs[si].coeffs;

        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            R[si].coeffs.assign((size_t)subs[si].w * subs[si].h, 0);
        }
        for (int si : order) {
            const Subband& s = subs[si];
            for (int y = 0; y < s.h; ++y)
                for (int x = 0; x < s.w; ++x) {
                    int32_t c = s.coeffs[(size_t)y * s.w + x];
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                    R[si].coeffs[(size_t)y * s.w + x] = c - c_hat;
                }
        }

        size_t plane_start = payload.size();
        // X6c hyperprior: pick a per-plane probability-calibration code that
        // minimises the actual rANS payload for this plane's residual subbands,
        // then encode with it. The code is stored in the header and re-applied at
        // decode (symmetric), so the round trip stays byte-exact. No full model is
        // transmitted (invariant I29): only a scalar multiplier per subband.
        uint8_t best_code = 0;
        {
            size_t best_bytes = std::numeric_limits<size_t>::max();
            std::vector<float> trial(R.size(), 1.0f);
            for (uint8_t code = 0; code < kX6cScaleN; ++code) {
                std::fill(trial.begin(), trial.end(), kX6cScaleTab[code]);
                auto rt = coder.encode(R, 0, nullptr, &trial);
                size_t nb = 0; for (auto& st : rt.streams) nb += st.size();
                if (nb < best_bytes) { best_bytes = nb; best_code = code; }
            }
        }
        std::vector<float> best_scale(R.size(), kX6cScaleTab[best_code]);
        auto res = coder.encode(R, 0, nullptr, &best_scale);
        for (size_t oi = 0; oi < R.size(); ++oi) {
            global_maxbits = std::max(global_maxbits, res.sub_maxbits[oi]);
            all_sub_maxbits.push_back(res.sub_maxbits[oi]);
            all_sub_bytes.push_back((uint32_t)res.streams[oi].size());
            all_orient.push_back((uint8_t)R[oi].orient);
            all_level.push_back((uint8_t)R[oi].level);
            all_w.push_back((uint16_t)R[oi].w);
            all_h.push_back((uint16_t)R[oi].h);
            all_scale_code.push_back(best_code);
            payload.insert(payload.end(), res.streams[oi].begin(), res.streams[oi].end());
        }
        plane_symbols.push_back((uint32_t)(payload.size() - plane_start));
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = global_maxbits;
    hdr.residual_mode = 1; // RESIDUAL_FLAG set
    hdr.total_symbols = 0;
    hdr.subbands_per_plane = subbands_per_plane;
    hdr.num_planes = (uint8_t)t.planes.size();
    hdr.plane_symbols = plane_symbols;
    hdr.orient = std::move(all_orient);
    hdr.level = std::move(all_level);
    hdr.w = std::move(all_w);
    hdr.h = std::move(all_h);
    hdr.sub_maxbits = std::move(all_sub_maxbits);
    hdr.sub_bytes = std::move(all_sub_bytes);
    hdr.sub_scale_code = std::move(all_scale_code);

    auto out = wavelet_container_encode(t, hdr, payload);
    net_out = out.size();
    return out;
}

std::vector<uint8_t> frame_wavelet_encode_route5(const Raster& raster, WaveletFilter filter,
                                                   int levels, size_t& net_out) {
    // FRAME-WAVELET-ROUTE5 (issue #130): the autoregressive learned rANS frontend.
    // Codes the predictor residual r = c - c_hat through the Route5Coder (hybrid-uint
    // token categorical rANS with a baked neural net) instead of the bitplane coder.
    // The predictor reads only already-reconstructed coefficients, so no state is
    // transmitted (I29) and the round trip is exact.
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    WaveletParams p{filter, levels};
    Route5Coder coder;
    CoefficientPredictor pred;

    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;
    std::vector<uint8_t> all_sub_maxbits, all_orient, all_level;
    std::vector<uint32_t> all_sub_bytes;
    std::vector<uint16_t> all_w, all_h;
    std::vector<uint8_t> all_scale_code; // X6c hyperprior slot (unused by Route5, neutral)

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();

        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) recon[si] = subs[si].coeffs;

        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            R[si].coeffs.assign((size_t)subs[si].w * subs[si].h, 0);
        }
        for (int si : order) {
            const Subband& s = subs[si];
            for (int yy = 0; yy < s.h; ++yy)
                for (int x = 0; x < s.w; ++x) {
                    int32_t c = s.coeffs[(size_t)yy * s.w + x];
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, yy);
                    R[si].coeffs[(size_t)yy * s.w + x] = c - c_hat;
                }
        }

        size_t plane_start = payload.size();
        auto res = coder.encode(R);
        for (size_t oi = 0; oi < R.size(); ++oi) {
            global_maxbits = std::max(global_maxbits, (uint8_t)0); // subbands carry own range
            all_sub_maxbits.push_back(0);
            all_sub_bytes.push_back((uint32_t)res.streams[oi].size());
            all_orient.push_back((uint8_t)R[oi].orient);
            all_level.push_back((uint8_t)R[oi].level);
            all_w.push_back((uint16_t)R[oi].w);
            all_h.push_back((uint16_t)R[oi].h);
            all_scale_code.push_back(0);
            payload.insert(payload.end(), res.streams[oi].begin(), res.streams[oi].end());
        }
        plane_symbols.push_back((uint32_t)(payload.size() - plane_start));
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = global_maxbits;
    hdr.residual_mode = (uint8_t)(1u | ROUTE5_FLAG); // residual + route5
    hdr.total_symbols = 0;
    hdr.subbands_per_plane = subbands_per_plane;
    hdr.num_planes = (uint8_t)t.planes.size();
    hdr.plane_symbols = plane_symbols;
    hdr.orient = std::move(all_orient);
    hdr.level = std::move(all_level);
    hdr.w = std::move(all_w);
    hdr.h = std::move(all_h);
    hdr.sub_maxbits = std::move(all_sub_maxbits);
    hdr.sub_bytes = std::move(all_sub_bytes);
    hdr.sub_scale_code = std::move(all_scale_code);

    auto out = wavelet_container_encode(t, hdr, payload);
    net_out = out.size();
    return out;
}

std::vector<uint8_t> frame_wavelet_encode_r6b(const Raster& raster, WaveletFilter filter,
                                              int levels, size_t& net_out) {
    // FRAME-WAVELET-R6B (issue #130, Route 6 lever B): the two-pass
    // transmitted-histogram backbone. Codes the learned-coefficient residual
    // r = c - c_hat (X6a L1) through BitplaneCoder::encode_static instead of the
    // adaptive-only bitplane coder. The per-subband (symtype x bitplane-bucket)
    // histograms are transmitted in the header (R6B_FLAG set) so the decoder can
    // rebuild the static backbone; the adaptive EMA still refines rich contexts.
    // No full model is transmitted (invariant I29).
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    WaveletParams p{filter, levels};
    BitplaneCoder coder;
    CoefficientPredictor pred;

    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;
    std::vector<uint8_t> all_sub_maxbits, all_orient, all_level;
    std::vector<uint32_t> all_sub_bytes;
    std::vector<uint16_t> all_w, all_h;
    std::vector<uint8_t> all_scale_code; // X6c slot unused by R6B (neutral)
    std::vector<uint16_t> all_hist;      // flattened R6B per-subband histogram

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();

        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) recon[si] = subs[si].coeffs;

        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            R[si].coeffs.assign((size_t)subs[si].w * subs[si].h, 0);
        }
        for (int si : order) {
            const Subband& s = subs[si];
            for (int y = 0; y < s.h; ++y)
                for (int x = 0; x < s.w; ++x) {
                    int32_t c = s.coeffs[(size_t)y * s.w + x];
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                    R[si].coeffs[(size_t)y * s.w + x] = c - c_hat;
                }
        }

        size_t plane_start = payload.size();
        auto res = coder.encode_static(R);
        for (size_t oi = 0; oi < R.size(); ++oi) {
            global_maxbits = std::max(global_maxbits, res.sub_maxbits[oi]);
            all_sub_maxbits.push_back(res.sub_maxbits[oi]);
            all_sub_bytes.push_back((uint32_t)res.streams[oi].size());
            all_orient.push_back((uint8_t)R[oi].orient);
            all_level.push_back((uint8_t)R[oi].level);
            all_w.push_back((uint16_t)R[oi].w);
            all_h.push_back((uint16_t)R[oi].h);
            all_scale_code.push_back(0);
            for (int k = 0; k < R6B_CLASSES * 2; ++k) {
                uint32_t cnt = res.hist.cnt[oi][k];
                if (cnt > 0xFFFF) cnt = 0xFFFF; // clamp: 16-bit on-wire format (see wavelet_container.h)
                all_hist.push_back((uint16_t)cnt);
            }
            payload.insert(payload.end(), res.streams[oi].begin(), res.streams[oi].end());
        }
        plane_symbols.push_back((uint32_t)(payload.size() - plane_start));
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = global_maxbits;
    hdr.residual_mode = (uint8_t)(1u | R6B_FLAG); // residual + R6B
    hdr.total_symbols = 0;
    hdr.subbands_per_plane = subbands_per_plane;
    hdr.num_planes = (uint8_t)t.planes.size();
    hdr.plane_symbols = plane_symbols;
    hdr.orient = std::move(all_orient);
    hdr.level = std::move(all_level);
    hdr.w = std::move(all_w);
    hdr.h = std::move(all_h);
    hdr.sub_maxbits = std::move(all_sub_maxbits);
    hdr.sub_bytes = std::move(all_sub_bytes);
    hdr.sub_scale_code = std::move(all_scale_code);
    hdr.sub_hist = std::move(all_hist);

    auto out = wavelet_container_encode(t, hdr, payload);
    net_out = out.size();
    return out;
}

std::vector<uint8_t> frame_wavelet_encode_r6c(const Raster& raster, WaveletFilter filter,
                                               int levels, int kb, size_t& net_out) {
    // FRAME-WAVELET-R6C (issue #130, Route 6 lever C): the per-fine-context
    // CLUSTER transmitted-histogram backbone. Codes the learned-coefficient
    // residual r = c - c_hat (X6a L1) through BitplaneCoder::encode_static_cluster
    // instead of the coarse per-subband-class R6-B backbone. The cluster histogram
    // (NB = 3*kb contexts, keyed on the learned MLP prior) is transmitted in the
    // header (R6C_FLAG set) so decode can rebuild the static backbone; the adaptive
    // EMA still refines rich clusters. No full model is transmitted (invariant I29).
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    WaveletParams p{filter, levels};
    BitplaneCoder coder;
    CoefficientPredictor pred;

    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;
    std::vector<uint8_t> all_sub_maxbits, all_orient, all_level;
    std::vector<uint32_t> all_sub_bytes;
    std::vector<uint16_t> all_w, all_h;
    std::vector<uint8_t> all_scale_code; // X6c slot unused by R6C (neutral)
    std::vector<uint32_t> all_chist;     // flattened R6C cluster histogram (uint32 on wire)
    int NB = 3 * kb;

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();

        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) recon[si] = subs[si].coeffs;

        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            R[si].coeffs.assign((size_t)subs[si].w * subs[si].h, 0);
        }
        for (int si : order) {
            const Subband& s = subs[si];
            for (int y = 0; y < s.h; ++y)
                for (int x = 0; x < s.w; ++x) {
                    int32_t c = s.coeffs[(size_t)y * s.w + x];
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                    R[si].coeffs[(size_t)y * s.w + x] = c - c_hat;
                }
        }

        size_t plane_start = payload.size();
        auto res = coder.encode_static_cluster(R, kb);
        for (size_t oi = 0; oi < R.size(); ++oi) {
            global_maxbits = std::max(global_maxbits, res.sub_maxbits[oi]);
            all_sub_maxbits.push_back(res.sub_maxbits[oi]);
            all_sub_bytes.push_back((uint32_t)res.streams[oi].size());
            all_orient.push_back((uint8_t)R[oi].orient);
            all_level.push_back((uint8_t)R[oi].level);
            all_w.push_back((uint16_t)R[oi].w);
            all_h.push_back((uint16_t)R[oi].h);
            all_scale_code.push_back(0);
            payload.insert(payload.end(), res.streams[oi].begin(), res.streams[oi].end());
        }
        // The cluster histogram is GLOBAL across the whole plane (all subbands
        // share one cluster space keyed on the learned prior), so it is appended
        // ONCE per plane, not per subband.
        for (int c = 0; c < NB * 2; ++c) {
            uint32_t cnt = (c < (int)res.hist.cnt.size() * 2)
                               ? res.hist.cnt[c / 2][c % 2] : 0;
            all_chist.push_back(cnt);
        }
        plane_symbols.push_back((uint32_t)(payload.size() - plane_start));
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = global_maxbits;
    hdr.residual_mode = (uint8_t)(1u | R6C_FLAG); // residual + R6C
    hdr.total_symbols = 0;
    hdr.subbands_per_plane = subbands_per_plane;
    hdr.num_planes = (uint8_t)t.planes.size();
    hdr.plane_symbols = plane_symbols;
    hdr.orient = std::move(all_orient);
    hdr.level = std::move(all_level);
    hdr.w = std::move(all_w);
    hdr.h = std::move(all_h);
    hdr.sub_maxbits = std::move(all_sub_maxbits);
    hdr.sub_bytes = std::move(all_sub_bytes);
    hdr.sub_scale_code = std::move(all_scale_code);
    hdr.r6c_kb = (uint16_t)kb;
    hdr.cluster_hist = std::move(all_chist);

    auto out = wavelet_container_encode(t, hdr, payload);
    net_out = out.size();
    return out;
}

std::vector<uint8_t> frame_wavelet_encode_r7(const Raster& raster, WaveletFilter filter,
                                             int levels, size_t& net_out, bool use_r7b) {
    // FRAME-WAVELET-R7 (issue #130, Route 7 lever A + B). Codes the in-subband
    // value residual r = c - c_hat (R7-A MED/gradient predictor over the SAME
    // subband's already-reconstructed raster neighbours) through the existing
    // byte-exact bitplane coder. The predictor reads only already-reconstructed
    // coefficients, so no state is transmitted (I29) and the round trip is exact.
    // The per-subband predictor mode (MED vs GRADIENT) is chosen per subband by
    // REAL coded bytes (C3, independent per-subband since the streams are
    // sliceable). R7-B (when use_r7b) picks a per-level filter assignment by a
    // greedy C3 trial on real rANS bytes. Zero full-model bytes transmitted.
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    BitplaneCoder coder;

    // ---- R7-B: greedy per-level filter selection (C3, real bytes) ----
    std::vector<WaveletFilter> per_level;
    if (use_r7b) {
        per_level.assign((size_t)levels, filter);
        for (int lvl = 1; lvl <= levels; ++lvl) {
            size_t best_bytes = std::numeric_limits<size_t>::max();
            WaveletFilter best = per_level[(size_t)(lvl - 1)];
            for (int fi = 0; fi < 3; ++fi) {
                WaveletFilter cand = (fi == 0) ? WaveletFilter::Haar
                               : (fi == 1) ? WaveletFilter::LeGall53
                                           : WaveletFilter::Reversible97;
                std::vector<WaveletFilter> trial = per_level;
                trial[(size_t)(lvl - 1)] = cand;
                WaveletParams pp{filter, levels, trial};
                size_t nb = 0;
                for (size_t pi = 0; pi < t.planes.size(); ++pi) {
                    std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
                    auto subs = lift.forward(plane, t.w, t.h, pp);
                    std::vector<Subband> R(subs.size());
                    for (size_t si = 0; si < subs.size(); ++si) {
                        R[si].orient = subs[si].orient; R[si].level = subs[si].level;
                        R[si].w = subs[si].w; R[si].h = subs[si].h;
                        R[si].coeffs.resize((size_t)subs[si].w * subs[si].h);
                        const auto& c = subs[si].coeffs;
                        for (int y = 0; y < subs[si].h; ++y)
                            for (int x = 0; x < subs[si].w; ++x) {
                                int32_t cc = c[(size_t)y * subs[si].w + x];
                                int32_t ch_ = InSubbandPredictor::predict(
                                    c, subs[si].w, subs[si].h, x, y,
                                    R7PredictorMode::MED);
                                R[si].coeffs[(size_t)y * subs[si].w + x] = cc - ch_;
                            }
                    }
                    auto rt = coder.encode(R);
                    for (auto& st : rt.streams) nb += st.size();
                }
                if (nb < best_bytes) { best_bytes = nb; best = cand; }
            }
            per_level[(size_t)(lvl - 1)] = best;
        }
    }

    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;
    std::vector<uint8_t> all_sub_maxbits, all_orient, all_level;
    std::vector<uint32_t> all_sub_bytes;
    std::vector<uint16_t> all_w, all_h;
    std::vector<uint8_t> all_scale_code;
    std::vector<uint8_t> all_r7a_pred;

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        WaveletParams pp{filter, levels, per_level};
        auto subs = lift.forward(plane, t.w, t.h, pp);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();

        // Per-subband predictor mode (MED vs GRADIENT) + X6c scale code, each
        // chosen by REAL coded bytes for that subband's residual alone.
        std::vector<R7PredictorMode> mode(subs.size(), R7PredictorMode::MED);
        std::vector<uint8_t> code(subs.size(), 0);
        for (size_t oi = 0; oi < subs.size(); ++oi) {
            const Subband& s = subs[oi];
            size_t best_bytes = std::numeric_limits<size_t>::max();
            R7PredictorMode best_mode = R7PredictorMode::MED;
            uint8_t best_code = 0;
            for (int mi = 0; mi < 2; ++mi) {
                R7PredictorMode m = (mi == 0) ? R7PredictorMode::MED
                                              : R7PredictorMode::GRADIENT;
                std::vector<int32_t> res((size_t)s.w * s.h);
                for (int y = 0; y < s.h; ++y)
                    for (int x = 0; x < s.w; ++x) {
                        int32_t cc = s.coeffs[(size_t)y * s.w + x];
                        int32_t ch_ = InSubbandPredictor::predict(
                            s.coeffs, s.w, s.h, x, y, m);
                        res[(size_t)y * s.w + x] = cc - ch_;
                    }
                Subband rsub; rsub.orient = s.orient; rsub.level = s.level;
                rsub.w = s.w; rsub.h = s.h; rsub.coeffs = std::move(res);
                std::vector<Subband> one{rsub};
                for (uint8_t c = 0; c < kX6cScaleN; ++c) {
                    std::vector<float> sc(1, kX6cScaleTab[c]);
                    auto rt = coder.encode(one, 0, nullptr, &sc);
                    size_t nb = rt.streams[0].size();
                    if (mi == 0 || nb < best_bytes) {
                        if (nb < best_bytes) { best_bytes = nb; best_mode = m; best_code = c; }
                    }
                }
            }
            mode[oi] = best_mode;
            code[oi] = best_code;
        }

        // Build the full residual set with the chosen per-subband modes.
        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            R[si].coeffs.resize((size_t)subs[si].w * subs[si].h);
            const auto& c = subs[si].coeffs;
            for (int y = 0; y < subs[si].h; ++y)
                for (int x = 0; x < subs[si].w; ++x) {
                    int32_t cc = c[(size_t)y * subs[si].w + x];
                    int32_t ch_ = InSubbandPredictor::predict(
                        c, subs[si].w, subs[si].h, x, y, mode[si]);
                    R[si].coeffs[(size_t)y * subs[si].w + x] = cc - ch_;
                }
        }

        size_t plane_start = payload.size();
        std::vector<float> scale(R.size());
        for (size_t oi = 0; oi < R.size(); ++oi) scale[oi] = kX6cScaleTab[code[oi]];
        auto res = coder.encode(R, 0, nullptr, &scale);
        for (size_t oi = 0; oi < R.size(); ++oi) {
            global_maxbits = std::max(global_maxbits, res.sub_maxbits[oi]);
            all_sub_maxbits.push_back(res.sub_maxbits[oi]);
            all_sub_bytes.push_back((uint32_t)res.streams[oi].size());
            all_orient.push_back((uint8_t)R[oi].orient);
            all_level.push_back((uint8_t)R[oi].level);
            all_w.push_back((uint16_t)R[oi].w);
            all_h.push_back((uint16_t)R[oi].h);
            all_scale_code.push_back(code[oi]);
            all_r7a_pred.push_back((uint8_t)mode[oi]);
            payload.insert(payload.end(), res.streams[oi].begin(), res.streams[oi].end());
        }
        plane_symbols.push_back((uint32_t)(payload.size() - plane_start));
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = global_maxbits;
    hdr.residual_mode = (uint8_t)(R7A_FLAG | (use_r7b ? R7B_FLAG : 0));
    hdr.total_symbols = 0;
    hdr.subbands_per_plane = subbands_per_plane;
    hdr.num_planes = (uint8_t)t.planes.size();
    hdr.plane_symbols = plane_symbols;
    hdr.orient = std::move(all_orient);
    hdr.level = std::move(all_level);
    hdr.w = std::move(all_w);
    hdr.h = std::move(all_h);
    hdr.sub_maxbits = std::move(all_sub_maxbits);
    hdr.sub_bytes = std::move(all_sub_bytes);
    hdr.sub_scale_code = std::move(all_scale_code);
    hdr.sub_r7a_pred = std::move(all_r7a_pred);
    if (use_r7b) {
        hdr.level_filter.resize(per_level.size());
        for (size_t i = 0; i < per_level.size(); ++i)
            hdr.level_filter[i] = filter_to_id(per_level[i]);
    }

    auto out = wavelet_container_encode(t, hdr, payload);
    net_out = out.size();
    return out;
}

Raster frame_wavelet_decode(const std::vector<uint8_t>& bytes) {
    WaveletFrame frame = wavelet_container_decode(bytes);
    const WaveletHeader& hdr = frame.hdr;
    WaveletFilter filter = id_to_filter(hdr.filter_id);
    int levels = hdr.levels;
    uint16_t spp = hdr.subbands_per_plane;
    uint8_t nplanes = hdr.num_planes;

    Raster t;
    t.bd = (bytes[13] == 16) ? BitDepth::BD16 : BitDepth::BD8;
    t.ch = (Channels)nplanes;
    t.w = read_u32_le_bytes(bytes.data() + 5);
    t.h = read_u32_le_bytes(bytes.data() + 9);
    t.planes.assign(nplanes, std::vector<uint16_t>((size_t)t.w * t.h, 0));

    // Reconstruct subband layout (orient/level/w/h) in original order.
    std::vector<Subband> layout;
    layout.reserve(hdr.orient.size());
    for (size_t i = 0; i < hdr.orient.size(); ++i) {
        Subband s;
        s.orient = (Subband::Orient)hdr.orient[i];
        s.level = hdr.level[i];
        s.w = hdr.w[i];
        s.h = hdr.h[i];
        s.coeffs.assign((size_t)s.w * s.h, 0);
        layout.push_back(s);
    }

    BitplaneCoder coder;
    Route5Coder route5;
    WaveletLift lift;
    WaveletParams p{filter, levels};
    // R7-B: restore the per-level filter assignment so the inverse lift uses the
    // exact filter the encoder used at each decomposition level (byte-exact).
    if (hdr.residual_mode & R7B_FLAG) {
        p.per_level_filter.resize(hdr.level_filter.size());
        for (size_t i = 0; i < hdr.level_filter.size(); ++i)
            p.per_level_filter[i] = id_to_filter(hdr.level_filter[i]);
    }

    size_t off = 0;
    uint32_t sub_idx = 0; // global subband index (forward() order)
    std::vector<std::vector<Subband>> decoded_all(nplanes); // reconstructed subbands per plane
    for (uint8_t pi = 0; pi < nplanes; ++pi) {
        std::vector<Subband> plane_layout;
        std::vector<std::vector<uint8_t>> plane_streams;
        std::vector<uint8_t> plane_maxbits;
        plane_layout.reserve(spp);
        plane_streams.reserve(spp);
        plane_maxbits.reserve(spp);
        for (uint16_t k = 0; k < spp; ++k) {
            uint32_t n = hdr.sub_bytes[sub_idx];
            std::vector<uint8_t> slice(frame.payload.begin() + off,
                                        frame.payload.begin() + off + n);
            off += n;
            Subband layout_one;
            layout_one.orient = (Subband::Orient)hdr.orient[sub_idx];
            layout_one.level = hdr.level[sub_idx];
            layout_one.w = hdr.w[sub_idx];
            layout_one.h = hdr.h[sub_idx];
            layout_one.coeffs.assign((size_t)layout_one.w * layout_one.h, 0);
            plane_layout.push_back(layout_one);
            plane_streams.push_back(std::move(slice));
            plane_maxbits.push_back(hdr.sub_maxbits[sub_idx]);
            ++sub_idx;
        }
        // Decode the whole plane together so PARENT subband magnitudes are
        // available as context (X3b fix). plane_layout order == forward() order.
        // X5a: pass the reconstructed LUMA subbands as the cross-component
        // reference for chroma (Co/Cg) planes so the MLP chroma prior matches the
        // encoder exactly (decoder sees the same already-decoded luma).
        const std::vector<std::vector<int32_t>>* luma_mag = nullptr;
        std::vector<std::vector<int32_t>> lmag_buf;
        // X5a cross-component luma reference is only used by frame_wavelet_encode()
        // (non-residual). The residual pre-pass (X6a) encodes each subband without a
        // luma reference, so to keep encode/decode context symmetry we disable it
        // here whenever the frame is a residual frame (otherwise roundtrip breaks).
        // R7-A is also a residual frame (in-subband predictor, no luma context), so
        // the luma reference is gated off under R7A_FLAG too.
        if (!(hdr.residual_mode & (1u | R7A_FLAG)) && pi > 0 && !decoded_all.empty()) {
            const auto& lum_subs = decoded_all[0];
            lmag_buf.resize(plane_layout.size());
            for (size_t oi = 0; oi < plane_layout.size(); ++oi) {
                lmag_buf[oi].resize((size_t)plane_layout[oi].w * plane_layout[oi].h);
                const auto& lum = lum_subs[oi].coeffs;
                for (size_t ci = 0; ci < lmag_buf[oi].size(); ++ci)
                    lmag_buf[oi][ci] = std::abs(lum[ci]);
            }
            luma_mag = &lmag_buf;
        }
        // X6c hyperprior: rebuild the per-subband calibration factors for this
        // plane from the transmitted codes and feed them to the decoder so the
        // rANS probabilities match the encoder exactly (byte-exact round trip).
        std::vector<float> plane_scale;
        if (!hdr.sub_scale_code.empty()) {
            uint32_t ps = sub_idx - spp;
            plane_scale.resize(spp);
            for (uint16_t k = 0; k < spp; ++k)
                plane_scale[k] = pred_scale_from_code(hdr.sub_scale_code[ps + k]);
        }
        auto plane_subs = [&]() -> std::vector<Subband> {
            if (hdr.residual_mode & ROUTE5_FLAG)
                return route5.decode(plane_streams, plane_layout);
            if (hdr.residual_mode & R6C_FLAG) {
                // The cluster histogram is GLOBAL per plane (all subbands of a
                // plane share one NB-context cluster space), so slice plane pi.
                StaticClusterHist chist;
                chist.kb = hdr.r6c_kb;
                int NB = 3 * (int)hdr.r6c_kb;
                chist.cnt.assign(NB, std::vector<uint32_t>(2, 0));
                size_t base = (size_t)pi * (size_t)(NB * 2);
                for (int c = 0; c < NB * 2; ++c) {
                    size_t idx = base + (size_t)c;
                    uint32_t v = (idx < hdr.cluster_hist.size()) ? hdr.cluster_hist[idx] : 0;
                    chist.cnt[c / 2][c % 2] = v;
                }
                return coder.decode_static_cluster(plane_streams, plane_layout,
                                                   plane_maxbits, 0, chist);
            }
            if (hdr.residual_mode & R6B_FLAG) {
                StaticHist hist;
                hist.cnt.assign(spp, std::vector<uint32_t>(R6B_CLASSES * 2, 0));
                for (uint16_t k = 0; k < spp; ++k) {
                    size_t base = (size_t)(sub_idx - spp + k) * R6B_CLASSES * 2;
                    for (int c = 0; c < R6B_CLASSES * 2; ++c)
                        hist.cnt[k][c] = (base + c < hdr.sub_hist.size())
                                            ? hdr.sub_hist[base + c] : 0;
                }
                return coder.decode_static(plane_streams, plane_layout, plane_maxbits,
                                           0, hist);
            }
            return coder.decode(plane_streams, plane_layout, plane_maxbits, 0, luma_mag,
                                plane_scale.empty() ? nullptr : &plane_scale);
        }();
        decoded_all[pi] = plane_subs;
        // X6a (L1) reconstruction post-pass: the decoded subbands are residuals
        // r; rebuild c = c_hat + r using the baked predictor (reads only already
        // reconstructed coefficients, so the result is exactly the encoded c).
        if (hdr.residual_mode & 1u) {
            CoefficientPredictor pred;
            std::vector<int> order, parent, sib1, sib2;
            CoefficientPredictor::build_topology(plane_subs, order, parent, sib1, sib2);
            std::vector<std::vector<int32_t>> recon(plane_subs.size());
            for (size_t si = 0; si < plane_subs.size(); ++si)
                recon[si].assign(plane_subs[si].coeffs.size(), 0);
            for (int si : order) {
                const Subband& s = plane_subs[si];
                for (int y = 0; y < s.h; ++y)
                    for (int x = 0; x < s.w; ++x) {
                        int32_t c_hat = pred.predict(recon, plane_subs, parent, sib1, sib2, si, x, y);
                        int32_t r = plane_subs[si].coeffs[(size_t)y * s.w + x];
                        recon[si][(size_t)y * s.w + x] = c_hat + r;
                    }
            }
            for (size_t si = 0; si < plane_subs.size(); ++si)
                plane_subs[si].coeffs = recon[si];
        }
        // R7-A (Route 7 lever A) reconstruction post-pass: the decoded subbands are
        // the in-subband residuals r; rebuild c = c_hat + r using InSubbandPredictor
        // over the SAME subband's already-reconstructed raster neighbours (W/N/NW/NE).
        // The predictor is a pure function of decoded history, so the decoder forms
        // the identical c_hat the encoder used -> byte-exact round trip (I26/I29).
        if (hdr.residual_mode & R7A_FLAG) {
            std::vector<std::vector<int32_t>> recon(plane_subs.size());
            for (size_t si = 0; si < plane_subs.size(); ++si)
                recon[si].assign(plane_subs[si].coeffs.size(), 0);
            for (size_t si = 0; si < plane_subs.size(); ++si) {
                const Subband& s = plane_subs[si];
                // sub_r7a_pred is keyed by GLOBAL subband index (forward order
                // across all planes), so map the local per-plane index si to its
                // global counterpart before reading the predictor mode.
                size_t gsi = (size_t)pi * spp + si;
                R7PredictorMode m = (gsi < hdr.sub_r7a_pred.size() && hdr.sub_r7a_pred[gsi])
                                        ? R7PredictorMode::GRADIENT
                                        : R7PredictorMode::MED;
                for (int y = 0; y < s.h; ++y)
                    for (int x = 0; x < s.w; ++x) {
                        int32_t c_hat = InSubbandPredictor::predict(recon[si], s.w, s.h, x, y, m);
                        int32_t r = plane_subs[si].coeffs[(size_t)y * s.w + x];
                        recon[si][(size_t)y * s.w + x] = c_hat + r;
                    }
            }
            for (size_t si = 0; si < plane_subs.size(); ++si)
                plane_subs[si].coeffs = recon[si];
        }
        auto plane = lift.inverse(plane_subs, t.w, t.h, p);
        // Store the color-transformed integer coefficients verbatim (biased/
        // signed); reinterpreted as signed 16-bit by invert_color, so do NOT
        // clamp here (that would corrupt chroma and signed ACs).
        for (size_t i = 0; i < plane.size(); ++i) {
            t.planes[pi][i] = (uint16_t)((int32_t)plane[i] & 0xFFFF);
        }
    }
    // Inverse YCoCg-R only when it was actually applied on the encode side (the
    // stored color_transform byte). For BD16 the encode path skips the color
    // transform (None) because YCoCg-R overflows u16, so there is nothing to
    // invert here. The cast is (int) (not int16_t) so BD8 biased components in
    // 257..767 are widened unsigned rather than sign-extended.
    if (t.bd == BitDepth::BD8 && t.num_channels() >= 3) {
        int mask = (t.bd == BitDepth::BD8) ? 0xFF : 0xFFFF;
        int bias = (t.bd == BitDepth::BD8) ? 512 : 32768;
        size_t n = t.num_pixels();
        for (size_t i = 0; i < n; ++i) {
            int Y  = (int)t.planes[0][i];
            int Cg = (int)t.planes[1][i] - bias;
            int Co = (int)t.planes[2][i] - bias;
            int tt = Y - (Cg >> 1);
            int G  = Cg + tt;
            int B  = tt - (Co >> 1);
            int R  = B + Co;
            t.planes[0][i] = (uint16_t)(R & mask);
            t.planes[1][i] = (uint16_t)(G & mask);
            t.planes[2][i] = (uint16_t)(B & mask);
        }
    }
    return t;
}

size_t frame_wavelet_payload(const Raster& raster, WaveletFilter filter, int levels,
                             uint8_t& maxbits_out) {
    // Diagnostic only: encodes each subband in ISOLATION (one subband per call),
    // so the parent-map / level / cross-component features are always zero here.
    // This is NOT the production packing - frame_wavelet_encode() instead joint-
    // walks all subbands of a plane with a single shared LearnedModel and emits
    // one rANS stream per subband (sliceable). The two are kept side by side by
    // bench-x purely to report the decorrelation delta (deco_pct); the net bytes
    // it gates on come from frame_wavelet_encode(), not from this helper.
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    WaveletParams p{filter, levels};
    BitplaneCoder coder;
    uint8_t maxbits = 0;
    size_t payload = 0;
    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, p);
        for (const auto& s : subs) {
            std::vector<Subband> one{s};
            auto res = coder.encode(one);
            maxbits = std::max(maxbits, res.sub_maxbits[0]);
            payload += res.streams[0].size();
        }
    }
    maxbits_out = maxbits;
    return payload;
}

size_t frame_spatial_payload(const Raster& raster) {
    // FRAME-SPATIAL control: identical color domain + entropy backend to
    // FRAME-WAVELET, differing only in the decorrelation step (MED residual
    // instead of wavelet lift). This isolates the transform's contribution.
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    BitplaneCoder coder;
    size_t payload = 0;
    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        const auto& plane = t.planes[pi];
        size_t n = plane.size();
        std::vector<int32_t> res(n);
        for (size_t i = 0; i < n; ++i) {
            uint32_t x = (uint32_t)(i % t.w), y = (uint32_t)(i / t.w);
            int32_t a = (x > 0) ? (int32_t)plane[i - 1] : 0;
            int32_t b = (y > 0) ? (int32_t)plane[i - t.w] : 0;
            int32_t c = (x > 0 && y > 0) ? (int32_t)plane[i - t.w - 1] : 0;
            int32_t pred = med_predictor(a, b, c);
            res[i] = (int32_t)plane[i] - pred;
        }
        // Wrap the residual plane as a single LL subband and bitplane-code it
        // with the SAME context function (parent is always -1 for one subband).
        Subband sb;
        sb.orient = Subband::Orient::LL;
        sb.level = 0;
        sb.w = (int)t.w;
        sb.h = (int)t.h;
        sb.coeffs = std::move(res);
        std::vector<Subband> one{sb};
        auto r = coder.encode(one);
        payload += r.streams[0].size();
    }
    return payload;
}

} // namespace prism::codec
