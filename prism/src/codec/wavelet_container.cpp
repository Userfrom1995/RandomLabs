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
#include "prism/codec/spatial_predictor.h"
#include "prism/codec/bitplane_rans.h"
#include "prism/codec/route5.h"
#include "prism/codec/route10_mlp.h"
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
        case WaveletFilter::Learned: return X_FILTER_ID_LEARNED;
        case WaveletFilter::LearnedMLP: return X_FILTER_ID_LEARNED_MLP;
    }
    return X_FILTER_ID_53;
}
WaveletFilter id_to_filter(uint8_t id) {
    switch (id) {
        case X_FILTER_ID_HAAR: return WaveletFilter::Haar;
        case X_FILTER_ID_97: return WaveletFilter::Reversible97;
        case X_FILTER_ID_LEARNED: return WaveletFilter::Learned;
        case X_FILTER_ID_LEARNED_MLP: return WaveletFilter::LearnedMLP;
        default: return WaveletFilter::LeGall53;
    }
}
} // namespace

std::vector<uint8_t> wavelet_container_encode(const Raster& raster,
                                               const WaveletHeader& hdr,
                                               const std::vector<uint8_t>& payload) {
    std::vector<uint8_t> out;
    out.push_back('P'); out.push_back('R'); out.push_back('S'); out.push_back('M');
    // Version: v2 when residual_mode uses high-byte flags (Next-Gen spatial predictor)
    uint8_t version = (hdr.residual_mode > 255) ? 2 : 1;
    out.push_back(version);
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
    // residual_mode: uint16_t for v2 (Next-Gen), uint8_t for v1 (legacy)
    if (version >= 2) {
        write_u16_le_vec(out, hdr.residual_mode);
    } else {
        out.push_back((uint8_t)hdr.residual_mode);
    }
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
    // R6-D transmitted per-leaf histogram (present whenever R6D_FLAG set). The
    // K*3 P(0)*M values are delta-coded across (leaf*3+symtype) then written as
    // varints. r6d_k (uint16) and r6d_w (uint8, W*200) accompany them. The tree
    // itself is a baked constant (route6d_tree.inc) and is NOT transmitted.
    if (hdr.residual_mode & R6D_FLAG) {
        write_u16_le_vec(out, hdr.r6d_k);
        out.push_back(hdr.r6d_w);
        int K3 = 3 * (int)hdr.r6d_k;
        // The per-leaf histogram is GLOBAL per plane: all planes' P(0) vectors are
        // concatenated in hdr.r6d_p0 ([plane0..planeN-1], each K3 entries), so the
        // total on the wire is K3 * num_planes. Delta/varint across the whole run.
        int N = (int)hdr.r6d_p0.size();
        (void)K3;
        int16_t prev = 0;
        std::vector<uint8_t> hdrbuf;
        for (int i = 0; i < N; ++i) {
            int16_t v = (i < N) ? (int16_t)hdr.r6d_p0[i] : (int16_t)(1u << 15);
            int16_t d = (int16_t)(v - prev); prev = v;
            uint16_t ud = (uint16_t)(d + 0x8000); // zig-zag to unsigned
            // varint (7 bits/byte), little-endian groups
            do {
                uint8_t byte = (uint8_t)(ud & 0x7F); ud >>= 7;
                if (ud) byte |= 0x80;
                hdrbuf.push_back(byte);
            } while (ud);
        }
        write_u32_le_vec(out, (uint32_t)hdrbuf.size());
        out.insert(out.end(), hdrbuf.begin(), hdrbuf.end());
    }
    // R7-A in-subband predictor kind tag (present whenever R7A_FLAG set).
    if (hdr.residual_mode & R7A_FLAG) {
        out.push_back(hdr.r7a_pred);
    }
    // R7-B per-subband filter ids (present whenever R7B_FLAG set). One uint8 per
    // subband in forward() order; the decoder maps each subband's level to a
    // filter for the inverse lift (tiny overhead, <= 0.001 bpp).
    if (hdr.residual_mode & R7B_FLAG) {
        for (uint16_t i = 0; i < nsub; ++i)
            out.push_back(i < hdr.sub_filter.size() ? hdr.sub_filter[i] : hdr.filter_id);
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
    uint8_t version = bytes[4];
    if (version != 1 && version != 2)
        throw std::runtime_error("wavelet container: unsupported version");
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
    // residual_mode: uint16_t for v2 (Next-Gen), uint8_t for v1 (legacy)
    if (version >= 2) {
        hdr.residual_mode = read_u16_le_bytes(bytes.data() + pos); pos += 2;
    } else {
        hdr.residual_mode = bytes[pos++];
    }
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
    // R6-D transmitted per-leaf histogram (only when the R6D flag is set). Mirrors
    // the write side: r6d_k, r6d_w, then K*3 delta/varint P(0) values.
    if (hdr.residual_mode & R6D_FLAG) {
        hdr.r6d_k = read_u16_le_bytes(bytes.data() + pos); pos += 2;
        hdr.r6d_w = bytes[pos++];
        uint32_t buflen = read_u32_le_bytes(bytes.data() + pos); pos += 4;
        std::vector<uint8_t> hdrbuf(bytes.begin() + pos, bytes.begin() + pos + buflen);
        pos += buflen;
        int K3 = 3 * (int)hdr.r6d_k;
        int N = K3 * (int)hdr.num_planes;
        hdr.r6d_p0.assign((size_t)N, (uint16_t)(1u << 15));
        int16_t prev = 0;
        size_t bi = 0;
        for (int i = 0; i < N && bi < hdrbuf.size(); ++i) {
            uint16_t ud = 0; uint32_t shift = 0;
            while (bi < hdrbuf.size()) {
                uint8_t byte = hdrbuf[bi++];
                ud |= (uint16_t)(byte & 0x7F) << shift;
                shift += 7;
                if (!(byte & 0x80)) break;
            }
            int16_t d = (int16_t)ud - 0x8000; // zig-zag decode
            int16_t v = (int16_t)(prev + d); prev = v;
            if (v < 1) v = 1;
            if (v > (int16_t)((1u << 16) - 1)) v = (int16_t)((1u << 16) - 1);
            hdr.r6d_p0[i] = (uint16_t)v;
        }
    }
    // R7-A predictor kind tag (only when the R7A flag is set).
    if (hdr.residual_mode & R7A_FLAG) {
        hdr.r7a_pred = bytes[pos++];
    }
    // R7-B per-subband filter ids (only when the R7B flag is set).
    if (hdr.residual_mode & R7B_FLAG) {
        hdr.sub_filter.resize(nsub);
        for (uint16_t i = 0; i < nsub; ++i) hdr.sub_filter[i] = bytes[pos++];
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

std::vector<uint8_t> frame_wavelet_encode_r6d(const Raster& raster, WaveletFilter filter,
                                               int levels, int k, float W, size_t& net_out) {
    // FRAME-WAVELET-R6D (issue #130, Route 6 lever D): the true JXL-Modular
    // property tree with transmitted per-leaf histograms. Codes the
    // learned-coefficient residual r = c - c_hat through
    // BitplaneCoder::encode_static_tree (a baked property-tree leaf over RAW
    // neighbour magnitudes keyed to a transmitted per-leaf P(0), blended with the
    // adaptive EMA) instead of the MLP-cluster R6-C backbone. R6D_FLAG set so
    // decode parses the transmitted per-leaf histogram. Zero full-model bytes
    // transmitted (invariant I29); only the tiny per-leaf histogram header is sent.
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
    std::vector<uint8_t> all_scale_code; // X6c slot unused by R6D (neutral)
    std::vector<uint16_t> all_p0;        // flattened R6D per-leaf histogram (K*3, uint16)

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
        auto res = coder.encode_static_tree(R, k, W);
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
        // The per-leaf histogram is GLOBAL across the whole plane (all subbands
        // share one property-tree leaf space), so it is appended ONCE per plane.
        for (size_t c = 0; c < res.hist.sp0.size(); ++c)
            all_p0.push_back(res.hist.sp0[c]);
        plane_symbols.push_back((uint32_t)(payload.size() - plane_start));
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = global_maxbits;
    hdr.residual_mode = (uint8_t)(1u | R6D_FLAG); // residual + R6D
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
    hdr.r6d_k = (uint16_t)k;
    int wr = (int)std::lround(W * 200.0f);
    if (wr < 0) wr = 0; if (wr > 255) wr = 255;
    hdr.r6d_w = (uint8_t)wr;
    hdr.r6d_p0 = std::move(all_p0);

    auto out = wavelet_container_encode(t, hdr, payload);
    net_out = out.size();
    return out;
}

std::vector<uint8_t> frame_wavelet_encode_r7(const Raster& raster, WaveletFilter filter,
                                              int levels, size_t& net_out,
                                              bool use_gradient, bool adaptive_filter) {
    // FRAME-WAVELET-R7 (issue #130, Route 7): in-subband value prediction + adaptive
    // transform. R7-A codes the residual r = c - InSubbandPredictor(c) (a JXL-style
    // predictor transform over same-subband raster neighbours: W,N,NW,NE) through the
    // existing byte-exact bitplane coder instead of c. The predictor is recomputed
    // from reconstructed neighbours at both ends, so NO predictor state is transmitted
    // (invariant I29) and the round trip is byte-exact. R7-B optionally selects the
    // wavelet filter per decomposition level by REAL rANS bytes (C3 trial hook) and
    // transmits only the tiny per-level tag.
    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    BitplaneCoder coder;
    InSubbandPredictor::Kind kind = use_gradient ? InSubbandPredictor::Kind::GRADIENT
                                                 : InSubbandPredictor::Kind::MED;

    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;
    std::vector<uint8_t> all_sub_maxbits, all_orient, all_level;
    std::vector<uint32_t> all_sub_bytes;
    std::vector<uint16_t> all_w, all_h;
    std::vector<uint8_t> all_scale_code;
    std::vector<uint8_t> all_sub_filter;

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        // R7-B: per-level filter selection by REAL rANS payload bytes (greedy).
        WaveletParams p{filter, levels};
        if (adaptive_filter) {
            std::vector<WaveletFilter> best((size_t)levels + 1, filter);
            auto trial_bytes = [&](const std::vector<WaveletFilter>& plf) -> size_t {
                WaveletParams tp{filter, levels};
                tp.per_level_filter = plf;
                auto subs = lift.forward(plane, t.w, t.h, tp);
                std::vector<Subband> R(subs.size());
                for (size_t si = 0; si < subs.size(); ++si) {
                    R[si].orient = subs[si].orient; R[si].level = subs[si].level;
                    R[si].w = subs[si].w; R[si].h = subs[si].h;
                    InSubbandPredictor::residual(subs[si].coeffs, subs[si].w, subs[si].h,
                                                 kind, R[si].coeffs);
                }
                uint8_t bc = 0; size_t bestb = std::numeric_limits<size_t>::max();
                for (uint8_t code = 0; code < kX6cScaleN; ++code) {
                    std::vector<float> sc(R.size(), kX6cScaleTab[code]);
                    auto rt = coder.encode(R, 0, nullptr, &sc);
                    size_t nb = 0; for (auto& st : rt.streams) nb += st.size();
                    if (nb < bestb) { bestb = nb; bc = code; }
                }
                (void)bc;
                return bestb;
            };
            for (int L = 1; L <= levels; ++L) {
                size_t bestb = std::numeric_limits<size_t>::max();
                WaveletFilter bestf = filter;
                for (WaveletFilter cand : {WaveletFilter::Haar, WaveletFilter::LeGall53,
                                           WaveletFilter::Reversible97}) {
                    std::vector<WaveletFilter> plf = best;
                    plf[L] = cand;
                    size_t nb = trial_bytes(plf);
                    if (nb < bestb) { bestb = nb; bestf = cand; }
                }
                best[L] = bestf;
            }
            p.per_level_filter = best;
        }
        auto subs = lift.forward(plane, t.w, t.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();

        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            InSubbandPredictor::residual(subs[si].coeffs, subs[si].w, subs[si].h,
                                         kind, R[si].coeffs);
        }

        size_t plane_start = payload.size();
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
            if (adaptive_filter)
                all_sub_filter.push_back((uint8_t)filter_to_id(
                    p.per_level_filter.empty() ? filter : p.per_level_filter[R[oi].level]));
            payload.insert(payload.end(), res.streams[oi].begin(), res.streams[oi].end());
        }
        plane_symbols.push_back((uint32_t)(payload.size() - plane_start));
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = global_maxbits;
    hdr.residual_mode = (uint8_t)(1u | R7A_FLAG | (adaptive_filter ? R7B_FLAG : 0u));
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
    hdr.r7a_pred = use_gradient ? 1 : 0;
    if (adaptive_filter) hdr.sub_filter = std::move(all_sub_filter);

    auto out = wavelet_container_encode(t, hdr, payload);
    net_out = out.size();
    return out;
}

std::vector<uint8_t> frame_wavelet_encode_nextgen(const Raster& raster,
                                                   WaveletFilter filter,
                                                   int levels, size_t& net_out) {
    // FRAME-WAVELET-NEXTGEN (issue #199, Option A): spatial predictor (P1) ->
    // wavelet -> coefficient predictor (X6b) -> bitplane coder.
    //
    // Pipeline:
    // 1. Color transform (YCoCg-R for BD8)
    // 2. Spatial predictor P1 on each color plane -> residual R_spatial
    // 3. Wavelet lift on R_spatial -> subbands
    // 4. Coefficient predictor (X6b) on subbands -> R_final
    // 5. Bitplane coder on R_final -> payload
    // 6. Container v2 with SPATIAL_P1_FLAG

    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                       : ColorTransform::None;
    Raster t = apply_color(raster, ct);
    WaveletLift lift;
    BitplaneCoder coder;
    CoefficientPredictor pred;

    // bd_max: upper bound for spatial predictor clamping. After YCoCg-R on BD8,
    // Y is 0..1023 and Co/Cg are biased to ~0..1023. For BD16 (no color
    // transform), the full u16 range applies.
    uint16_t bd_max = (raster.bd == BitDepth::BD8) ? 1023 : 65535;

    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;
    std::vector<uint8_t> all_sub_maxbits, all_orient, all_level;
    std::vector<uint32_t> all_sub_bytes;
    std::vector<uint16_t> all_w, all_h;
    std::vector<uint8_t> all_scale_code;

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        // Step 2: Spatial predictor P1 on color-transformed plane.
        // R_spatial = pixel - spatial_hat (causal, adaptive bank).
        auto spatial_res = compute_spatial_residuals(t.planes[pi], t.w, t.h, bd_max);

        // Step 3: Forward wavelet lift on spatial residuals.
        WaveletParams p{filter, levels};
        auto subs = lift.forward(spatial_res, t.w, t.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();

        // Step 4: Coefficient predictor residual (X6b).
        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            R[si].coeffs.resize(subs[si].coeffs.size());
        }
        // Build topology and compute coefficient predictor residuals.
        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si)
            recon[si].assign(subs[si].coeffs.size(), 0);
        for (int si : order) {
            const Subband& s = subs[si];
            for (int y = 0; y < s.h; ++y)
                for (int x = 0; x < s.w; ++x) {
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                    int32_t c = subs[si].coeffs[(size_t)y * s.w + x];
                    R[si].coeffs[(size_t)y * s.w + x] = c - c_hat;
                    recon[si][(size_t)y * s.w + x] = c;
                }
        }

        // Step 5: Bitplane code the residuals.
        size_t plane_start = payload.size();
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
    // v2: residual_mode has SPATIAL_P1_FLAG (bit 8) + RESIDUAL (bit 0)
    hdr.residual_mode = (uint16_t)(1u | SPATIAL_P1_FLAG);
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

std::vector<uint8_t> frame_wavelet_encode_route10(const Raster& raster,
                                                   WaveletFilter filter,
                                                   int levels, size_t& net_out) {
    // FRAME-WAVELET-ROUTE10 (D2 corrected): spatial predictor P1 on RAW RGB
    // BEFORE colour transform, then YCoCg-R on spatial residuals, then wavelet
    // -> coefficient predictor (X6b) -> bitplane coder.
    //
    // Pipeline (R10-1 measurement: no colour transform on residuals):
    // 1. Spatial predictor P1 on each raw RGB plane -> R_spatial (signed int32)
    // 2. Wavelet lift on R_spatial (as u16 wrap) -> subbands
    // 3. Coefficient predictor (X6b) -> R_final
    // 4. Bitplane coder on R_final -> payload
    // 5. Container v2 with SPATIAL_P1_FLAG | SPATIAL_RAW_RGB_FLAG
    //
    // R10-4 (future): add YCoCg-R on residuals for cross-channel decorrelation.

    if (raster.num_channels() < 3) {
        // Fallback to standard nextgen for mono/alpha-only
        return frame_wavelet_encode_nextgen(raster, filter, levels, net_out);
    }

    // bd_max: spatial predictor operates on raw RGB, so bd_max = 255 for BD8.
    uint16_t bd_max = (raster.bd == BitDepth::BD8) ? 255 : 65535;

    WaveletLift lift;
    BitplaneCoder coder;
    CoefficientPredictor pred;

    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    std::vector<uint8_t> payload;
    uint8_t global_maxbits = 0;
    std::vector<uint8_t> all_sub_maxbits, all_orient, all_level;
    std::vector<uint32_t> all_sub_bytes;
    std::vector<uint16_t> all_w, all_h;
    std::vector<uint8_t> all_scale_code;

    // Step 1: Compute spatial residuals on each raw RGB plane.
    std::vector<std::vector<int32_t>> spatial_residuals(raster.num_channels());
    for (size_t c = 0; c < raster.num_channels(); ++c) {
        spatial_residuals[c] = compute_spatial_residuals(raster.planes[c],
                                                          raster.w, raster.h,
                                                          bd_max);
    }

    // Step 2: No colour transform on residuals for R10-1 measurement.
    // The signed int32 residuals are reinterpreted as uint16 via two's-complement
    // wrap for the wavelet lift (lossless: the wrap is reversed on decode).
    // Future R10-4 may add a signed-aware YCoCg-R on residuals.

    size_t nch = raster.num_channels();
    for (size_t pi = 0; pi < nch; ++pi) {
        // Step 3: Forward wavelet lift on spatial residuals (reinterpreted as uint16).
        WaveletParams p{filter, levels};
        auto subs = lift.forward(spatial_residuals[pi], raster.w, raster.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();

        // Step 4: Coefficient predictor residual (X6b).
        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            R[si].coeffs.resize(subs[si].coeffs.size());
        }
        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si)
            recon[si].assign(subs[si].coeffs.size(), 0);
        for (int si : order) {
            const Subband& s = subs[si];
            for (int y = 0; y < s.h; ++y)
                for (int x = 0; x < s.w; ++x) {
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                    int32_t c = subs[si].coeffs[(size_t)y * s.w + x];
                    R[si].coeffs[(size_t)y * s.w + x] = c - c_hat;
                    recon[si][(size_t)y * s.w + x] = c;
                }
        }

        // Step 5: Bitplane code the residuals.
        size_t plane_start = payload.size();
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
    // v2: residual_mode has SPATIAL_P1_FLAG (bit 8) + SPATIAL_RAW_RGB_FLAG (bit 9) + RESIDUAL (bit 0)
    hdr.residual_mode = (uint16_t)(1u | SPATIAL_P1_FLAG | SPATIAL_RAW_RGB_FLAG);
    hdr.total_symbols = 0;
    hdr.subbands_per_plane = subbands_per_plane;
    hdr.num_planes = (uint8_t)raster.num_channels();
    hdr.plane_symbols = plane_symbols;
    hdr.orient = std::move(all_orient);
    hdr.level = std::move(all_level);
    hdr.w = std::move(all_w);
    hdr.h = std::move(all_h);
    hdr.sub_maxbits = std::move(all_sub_maxbits);
    hdr.sub_bytes = std::move(all_sub_bytes);
    hdr.sub_scale_code = std::move(all_scale_code);

    auto out = wavelet_container_encode(raster, hdr, payload);
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

    size_t off = 0;
    uint32_t sub_idx = 0; // global subband index (forward() order)
    std::vector<std::vector<Subband>> decoded_all(nplanes); // reconstructed subbands per plane
    // Route 10 D2: keep raw int32 wavelet inverse output (can be negative) instead
    // of truncating to uint16_t in t.planes.
    std::vector<std::vector<int32_t>> raw_residuals;
    if (hdr.residual_mode & SPATIAL_RAW_RGB_FLAG)
        raw_residuals.resize(nplanes);
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
        if (!(hdr.residual_mode & 1u) && pi > 0 && !decoded_all.empty()) {
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
            if (hdr.residual_mode & R6D_FLAG) {
                // The per-leaf histogram is GLOBAL per plane (all subbands of a
                // plane share one property-tree leaf space), so slice plane pi.
                StaticTreeHist thist;
                thist.k = (int)hdr.r6d_k;
                thist.w = (float)hdr.r6d_w / 200.0f;
                int K3 = 3 * (int)hdr.r6d_k;
                thist.sp0.assign((size_t)K3, (uint16_t)(1u << 15));
                size_t base = (size_t)pi * (size_t)K3;
                for (int c = 0; c < K3; ++c) {
                    size_t idx = base + (size_t)c;
                    thist.sp0[c] = (idx < hdr.r6d_p0.size()) ? hdr.r6d_p0[idx] : (uint16_t)(1u << 15);
                }
                return coder.decode_static_tree(plane_streams, plane_layout,
                                                plane_maxbits, 0, thist);
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
            if (hdr.residual_mode & R7A_FLAG) {
                // R7-A: rebuild c from the decoded residual r via the same in-subband
                // MED/GRADIENT predictor (reads only already-reconstructed c neighbours),
                // so the result is exactly the encoded c. No predictor state transmitted.
                InSubbandPredictor::Kind kind = (hdr.r7a_pred
                                                 ? InSubbandPredictor::Kind::GRADIENT
                                                 : InSubbandPredictor::Kind::MED);
                std::vector<std::vector<int32_t>> recon(plane_subs.size());
                for (size_t si = 0; si < plane_subs.size(); ++si)
                    InSubbandPredictor::reconstruct(plane_subs[si].coeffs,
                                                    plane_subs[si].w, plane_subs[si].h,
                                                    kind, recon[si]);
                for (size_t si = 0; si < plane_subs.size(); ++si)
                    plane_subs[si].coeffs = recon[si];
            } else {
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
        }
        // R7-B: rebuild the per-level filter map from the transmitted per-subband
        // tags so the inverse lift uses the exact filter the encoder used.
        std::vector<int32_t> plane;
        if (hdr.residual_mode & R7B_FLAG) {
            WaveletParams pf = p;
            pf.per_level_filter.assign((size_t)levels + 1, filter);
            for (uint16_t k = 0; k < spp; ++k) {
                size_t gi = (size_t)pi * spp + k;
                int lvl = (gi < hdr.level.size()) ? hdr.level[gi] : 0;
                uint8_t fid = (gi < hdr.sub_filter.size()) ? hdr.sub_filter[gi] : hdr.filter_id;
                pf.per_level_filter[lvl] = id_to_filter(fid);
            }
            plane = lift.inverse(plane_subs, t.w, t.h, pf);
        } else {
            plane = lift.inverse(plane_subs, t.w, t.h, p);
        }
        // Next-Gen spatial predictor reconstruction: after inverse wavelet we
        // have R_spatial (the spatial residuals). Rebuild the color-transformed
        // pixels via the same P1 adaptive bank that was used on the encode side.
        if (hdr.residual_mode & SPATIAL_RAW_RGB_FLAG) {
            // Route 10 D2: store the int32 wavelet inverse output directly
            // (no truncation to uint16_t) for later spatial reconstruction.
            raw_residuals[pi] = plane;
        } else if (hdr.residual_mode & SPATIAL_P1_FLAG) {
            uint16_t bd_max = (t.bd == BitDepth::BD8) ? 1023 : 65535;
            auto reconstructed = reconstruct_spatial(plane, t.w, t.h, bd_max);
            for (size_t i = 0; i < plane.size(); ++i) {
                t.planes[pi][i] = (uint16_t)reconstructed[i];
            }
        } else {
            // Store the color-transformed integer coefficients verbatim (biased/
            // signed); reinterpreted as signed 16-bit by invert_color, so do NOT
            // clamp here (that would corrupt chroma and signed ACs).
            for (size_t i = 0; i < plane.size(); ++i) {
                t.planes[pi][i] = (uint16_t)((int32_t)plane[i] & 0xFFFF);
            }
        }
    }
    // Route 10 D2: after all planes decoded, spatial reconstruct each
    // raw RGB channel independently (no colour transform was applied on residuals).
    if (hdr.residual_mode & SPATIAL_RAW_RGB_FLAG) {
        // Spatial reconstruction on each raw RGB channel (bd_max = 255).
        // The inverse wavelet output IS the spatial residual (no colour transform).
        uint16_t bd_max = (t.bd == BitDepth::BD8) ? 255 : 65535;
        for (size_t c = 0; c < t.num_channels(); ++c) {
            auto reconstructed = reconstruct_spatial(raw_residuals[c], t.w, t.h, bd_max);
            for (size_t i = 0; i < reconstructed.size(); ++i)
                t.planes[c][i] = (uint16_t)reconstructed[i];
        }
    } else if (t.bd == BitDepth::BD8 && t.num_channels() >= 3 && !(hdr.residual_mode & SPATIAL_P1_FLAG)) {
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
