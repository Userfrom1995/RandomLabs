// True JXL-Modular multi-pass encoder (issue #130).
//
// Two-pass architecture:
//   Pass 1: color -> wavelet -> predictor -> residuals -> MA-tree -> cluster histograms
//   Pass 2: re-apply transforms, code residuals with per-cluster static ANS
//   Container: magic + header + MA-tree + histograms + ANS payload + CRC32
//
// Table-economics (I12) is eliminated by construction: the MA-tree and
// histograms are transmitted as part of the format, not as payable side-info.

#include "prism/codec/jxl_modular.h"
#include "prism/codec/jxl_modular_ans.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/predict.h"
#include "prism/codec/predictor.h"
#include "prism/codec/color.h"
#include "prism/codec/matree_builder.h"
#include "prism/crc32.h"
#include "prism/bitstream.h"
#include "prism/frontend/frontend.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <cstring>
#include <stdexcept>
#include <filesystem>
#include <array>

namespace prism::codec {

static constexpr uint32_t JXLM_MAGIC = 0x4D4C584A; // "JXLM" in LE
static constexpr uint8_t JXLM_VERSION = 1;
static constexpr int kAnsAlphabet = 512;

static inline uint8_t jxl_activity(int32_t L, int32_t T, int32_t TL, int32_t TR) {
    int g = std::abs(L - TL) + std::abs(T - TL) + std::abs(T - TR);
    if (g < 8) return 0;
    if (g < 32) return 1;
    if (g < 128) return 2;
    return 3;
}

static inline uint32_t res_to_sym(int32_t e) {
    if (e == 0) return 0;
    return (uint32_t)((e > 0) ? (2 * e - 1) : (-2 * e));
}

static inline int32_t sym_to_res(uint32_t s) {
    if (s == 0) return 0;
    if (s & 1) return (int32_t)((s + 1) >> 1);
    return -(int32_t)(s >> 1);
}

static Feature build_sample_feature(
    int level, int orient,
    int32_t L, int32_t T, int32_t TL, int32_t TR,
    int x, int y, int w, int h) {

    Feature f;
    f.qg = quant_qg(L, T, TL, TR);
    f.band_class = (uint8_t)orient;
    f.llc_class = (uint8_t)std::min(4, level);
    f.res_diff = (uint16_t)std::min(255, (int)(std::abs(L) + std::abs(T) + std::abs(TL)));
    f.sibling_class = quant_sibling((int16_t)T);
    f.activity = jxl_activity(L, T, TL, TR);
    f.position_y = (uint8_t)std::min(7, y * 8 / std::max(1, h));
    f.position_x = (uint8_t)std::min(7, x * 8 / std::max(1, w));
    return f;
}

// Compute Shannon entropy for a histogram (for K selection).
static double ans_bits_for_hist(const std::array<uint32_t, kAnsAlphabet>& counts, uint32_t total) {
    if (total == 0) return 0;
    double bits = 0;
    for (int i = 0; i < kAnsAlphabet; ++i) {
        if (counts[i] == 0) continue;
        double p = (double)counts[i] / (double)total;
        bits -= (double)counts[i] * std::log2(p);
    }
    return bits;
}

// Estimate header overhead for K clusters (matches actual serialization format).
static size_t header_overhead_bytes(
    int num_leaves,
    const std::vector<std::array<uint32_t, kAnsAlphabet>>& cluster_hists,
    const std::vector<uint32_t>& cluster_totals) {
    size_t tree_bytes = 4 + (size_t)(2 * num_leaves - 1) * 5; // tree_len prefix + tree data
    size_t hist_bytes = 2; // nc_wire (u16)
    for (int c = 0; c < num_leaves; ++c) {
        if (cluster_totals[c] == 0) continue;
        size_t nonzero = 0;
        for (int s = 0; s < kAnsAlphabet; ++s)
            if (cluster_hists[c][s] > 0) nonzero++;
        // Actual format: total(u32) + nnz(u16) + per-nonzero: sym(u16) + count(u32)
        hist_bytes += 4 + 2 + nonzero * 6;
    }
    return 12 + tree_bytes + hist_bytes; // 12 = magic(4)+version(1)+w(4)+h(4)+planes(1)+ct(1)+filter(1)+levels(1)=17, but we use 12 as approximation
}

// Estimate theoretical ANS size for K selection.
static double estimate_jxl_modular_size(
    const std::vector<Feature>& features,
    const std::vector<int32_t>& residuals,
    int K) {
    if (features.empty()) return 0;
    MatreeBuildParams params;
    params.max_depth = 10;
    params.max_leaves = K;
    params.min_samples_per_leaf = 32;
    MATree tree = build_matree_greedy(features, residuals, params);
    int nc = tree.num_leaves;
    std::vector<uint16_t> cids(features.size());
    for (size_t i = 0; i < features.size(); ++i) cids[i] = tree.eval(features[i]);
    std::vector<std::array<uint32_t, kAnsAlphabet>> ch(nc);
    for (auto& h : ch) h.fill(0);
    std::vector<uint32_t> ct(nc, 0);
    for (size_t i = 0; i < residuals.size(); ++i) {
        uint16_t cid = cids[i];
        if (cid >= (uint16_t)nc) cid = 0;
        uint32_t s = res_to_sym(residuals[i]);
        if (s >= (uint32_t)kAnsAlphabet) s = kAnsAlphabet - 1;
        ch[cid][s]++; ct[cid]++;
    }
    double total_bits = 0;
    uint32_t total_escapes = 0;
    for (int c = 0; c < nc; ++c) {
        total_bits += ans_bits_for_hist(ch[c], ct[c]);
        total_escapes += ch[c][kAnsAlphabet - 1];
    }
    // Escape sideband: 4-byte count prefix + 2 bytes per escape symbol.
    total_bits += (double)(4 + total_escapes * 2) * 8.0;
    total_bits += (double)header_overhead_bytes(nc, ch, ct) * 8.0;
    return total_bits;
}

static int find_optimal_K(const std::vector<Feature>& features,
                           const std::vector<int32_t>& residuals,
                           int k_target) {
    if (k_target > 0) return k_target;
    int best_K = 1;
    double best_bits = 1e30;
    for (int K : {4, 8, 16, 32, 48, 64, 128}) {
        double bits = estimate_jxl_modular_size(features, residuals, K);
        if (bits < best_bits) { best_bits = bits; best_K = K; }
    }
    return best_K;
}

// ─── Wire format helpers ────────────────────────────────────────────

static void write_u8(std::vector<uint8_t>& buf, uint8_t v) { buf.push_back(v); }
static void write_u16le(std::vector<uint8_t>& buf, uint16_t v) {
    buf.push_back((uint8_t)(v)); buf.push_back((uint8_t)(v >> 8));
}
static void write_u32le(std::vector<uint8_t>& buf, uint32_t v) {
    buf.push_back((uint8_t)(v)); buf.push_back((uint8_t)(v >> 8));
    buf.push_back((uint8_t)(v >> 16)); buf.push_back((uint8_t)(v >> 24));
}
static void write_bytes(std::vector<uint8_t>& buf, const uint8_t* p, size_t n) {
    buf.insert(buf.end(), p, p + n);
}

static uint8_t read_u8(const uint8_t*& p, const uint8_t* end) {
    if (p >= end) throw std::runtime_error("JXL-Modular: read past end");
    return *p++;
}
static uint16_t read_u16le(const uint8_t*& p, const uint8_t* end) {
    uint16_t v = (uint16_t)p[0] | ((uint16_t)p[1] << 8); p += 2;
    if (p > end) throw std::runtime_error("JXL-Modular: read past end");
    return v;
}
static uint32_t read_u32le(const uint8_t*& p, const uint8_t* end) {
    uint32_t v = (uint32_t)p[0] | ((uint32_t)p[1] << 8) |
                 ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24); p += 4;
    if (p > end) throw std::runtime_error("JXL-Modular: read past end");
    return v;
}

// ─── Encode ─────────────────────────────────────────────────────────

// Per-plane encode state: stores the transforms needed for decode.
struct PlaneState {
    WaveletParams wparams;
    ColorTransform ct;
    int w = 0, h = 0;
    // Topology (reconstructed during decode for predictor)
    std::vector<int> order, parent, sib1, sib2;
    std::vector<Subband> subs;
    int num_clusters = 0;
};

JXLModularResult jxl_modular_encode(const Raster& raster, int k_target) {
    JXLModularResult result;

    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                       : ColorTransform::None;
    Raster t = apply_color(raster, ct);

    WaveletLift lift;
    WaveletParams wp{WaveletFilter::LeGall53, 5};
    CoefficientPredictor pred;

    std::vector<uint8_t> container;

    // Write header
    write_u32le(container, JXLM_MAGIC);
    write_u8(container, JXLM_VERSION);
    write_u32le(container, (uint32_t)t.w);
    write_u32le(container, (uint32_t)t.h);
    write_u8(container, (uint8_t)t.planes.size());
    write_u8(container, (uint8_t)ct);
    write_u8(container, 1); // LeGall 5/3
    write_u8(container, 5); // 5 levels

    int total_clusters = 0;
    size_t total_ans_bytes = 0;
    double total_theoretical_bits = 0;
    uint32_t total_escape_count = 0;

    // Placeholder for per-plane sizes (filled below)
    std::vector<uint8_t> plane_data_all;

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, wp);

        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si)
            recon[si].assign(subs[si].coeffs.size(), 0);

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
                    recon[si][(size_t)y * s.w + x] = c;
                }
        }

        // Collect residuals and spatial features in coding order
        // (must match decoder's decode order for ANS stream alignment)
        std::vector<int32_t> all_residuals;
        std::vector<Feature> all_features;

        for (int si : order) {
            const auto& s = R[si];
            for (int y = 0; y < s.h; ++y) {
                for (int x = 0; x < s.w; ++x) {
                    int32_t e = s.coeffs[(size_t)y * s.w + x];
                    all_residuals.push_back(e);
                    int32_t L = (x > 0) ? s.coeffs[(size_t)y * s.w + x - 1] : 0;
                    int32_t T = (y > 0) ? s.coeffs[(size_t)(y - 1) * s.w + x] : 0;
                    int32_t TL = (x > 0 && y > 0) ? s.coeffs[(size_t)(y - 1) * s.w + x - 1] : 0;
                    int32_t TR = (y > 0 && x + 1 < s.w) ? s.coeffs[(size_t)(y - 1) * s.w + x + 1] : 0;
                    all_features.push_back(build_sample_feature(
                        s.level, (int)s.orient,
                        L, T, TL, TR, x, y, s.w, s.h));
                }
            }
        }

        int K = find_optimal_K(all_features, all_residuals, k_target);
        total_clusters = std::max(total_clusters, K);

        // Build MA-tree
        MatreeBuildParams params;
        params.max_depth = 10;
        params.max_leaves = K;
        params.min_samples_per_leaf = 32;
        MATree tree = build_matree_greedy(all_features, all_residuals, params);
        int nc = tree.num_leaves;

        // Assign cluster IDs
        std::vector<uint16_t> cluster_ids(all_features.size());
        for (size_t i = 0; i < all_features.size(); ++i)
            cluster_ids[i] = tree.eval(all_features[i]);

        // Build cluster histograms
        std::vector<std::array<uint32_t, kAnsAlphabet>> cluster_hists(nc);
        for (auto& h : cluster_hists) h.fill(0);
        std::vector<uint32_t> cluster_totals(nc, 0);

        for (size_t i = 0; i < all_residuals.size(); ++i) {
            uint16_t cid = cluster_ids[i];
            if (cid >= (uint16_t)nc) cid = 0;
            uint32_t s = res_to_sym(all_residuals[i]);
            if (s >= (uint32_t)kAnsAlphabet) s = kAnsAlphabet - 1;
            cluster_hists[cid][s]++;
            cluster_totals[cid]++;
        }

        // Compute theoretical bits from actual histograms for diagnostics.
        {
            double plane_bits = 0;
            uint32_t plane_escapes = 0;
            for (int c = 0; c < nc; ++c) {
                plane_bits += ans_bits_for_hist(cluster_hists[c], cluster_totals[c]);
                plane_escapes += cluster_hists[c][kAnsAlphabet - 1];
            }
            plane_bits += (double)(4 + plane_escapes * 2) * 8.0;
            plane_bits += (double)header_overhead_bytes(nc, cluster_hists, cluster_totals) * 8.0;
            total_escape_count += plane_escapes;
            total_theoretical_bits += plane_bits;
        }

        // Build ANS tables
        JXLModularANS ans;
        ans.build(cluster_hists, cluster_totals);

        // Convert residuals to symbols for ANS coding.
        // Residuals outside [-255, 255] get escape symbol (kAnsAlphabet-1)
        // and their raw i16 values are stored in a sideband.
        std::vector<uint32_t> syms(all_residuals.size());
        std::vector<int16_t> escape_sideband;
        for (size_t i = 0; i < all_residuals.size(); ++i) {
            uint32_t s = res_to_sym(all_residuals[i]);
            if (s >= (uint32_t)kAnsAlphabet) {
                s = kAnsAlphabet - 1;
                escape_sideband.push_back((int16_t)all_residuals[i]);
            }
            syms[i] = s;
        }

        // ANS encode
        auto ans_payload = ans.encode(syms.data(), cluster_ids.data(), syms.size());

        // Serialize plane data: MA-tree + histograms + ANS payload
        std::vector<uint8_t> plane_buf;

        // MA-tree
        {
            BitWriter bw;
            tree.serialize(bw);
            auto tbw = bw.flush();
            write_u32le(plane_buf, (uint32_t)tbw.size());
            write_bytes(plane_buf, tbw.data(), tbw.size());
        }

        // Histograms
        write_u16le(plane_buf, (uint16_t)nc);
        for (int c = 0; c < nc; ++c) {
            write_u32le(plane_buf, cluster_totals[c]);
            uint16_t nnz = 0;
            for (int s = 0; s < kAnsAlphabet; ++s)
                if (cluster_hists[c][s] > 0) nnz++;
            write_u16le(plane_buf, nnz);
            for (int s = 0; s < kAnsAlphabet; ++s) {
                if (cluster_hists[c][s] > 0) {
                    write_u16le(plane_buf, (uint16_t)s);
                    write_u32le(plane_buf, cluster_hists[c][s]);
                }
            }
        }

        // ANS payload
        write_u32le(plane_buf, (uint32_t)ans_payload.size());
        write_bytes(plane_buf, ans_payload.data(), ans_payload.size());

        // Escape sideband (raw i16 residuals for symbols that exceeded alphabet)
        write_u32le(plane_buf, (uint32_t)escape_sideband.size());
        for (int16_t v : escape_sideband)
            write_u16le(plane_buf, (uint16_t)v);

        // Append to global buffer
        write_u32le(plane_data_all, (uint32_t)plane_buf.size());
        write_bytes(plane_data_all, plane_buf.data(), plane_buf.size());
        total_ans_bytes += ans_payload.size();
    }

    // Final container: header + plane_data_all + CRC32
    write_bytes(container, plane_data_all.data(), plane_data_all.size());

    // CRC32 over everything so far
    uint32_t crc = prism::crc32(container.data(), container.size());
    write_u32le(container, crc);

    result.encoded_bytes = std::move(container);
    result.total_bytes = result.encoded_bytes.size();
    result.num_clusters = total_clusters;

    size_t total_samples = (size_t)t.w * t.h * 3;
    result.per_sample_bpp = (float)((double)result.total_bytes * 8.0 / (double)total_samples);
    result.summed_bpp = result.per_sample_bpp * 3.0f;
    result.theoretical_bpp = (float)(total_theoretical_bits / (double)total_samples);
    result.escape_count = total_escape_count;

    // Verify byte-exact round-trip (compare against original raster, not
    // the color-transformed version t, since jxl_modular_decode inverts color)
    auto decoded = jxl_modular_decode(result.encoded_bytes.data(), result.encoded_bytes.size());
    if (decoded.w == raster.w && decoded.h == raster.h && decoded.planes.size() == raster.planes.size()) {
        bool match = true;
        for (size_t pi = 0; pi < raster.planes.size(); ++pi) {
            if (decoded.planes[pi] != raster.planes[pi]) { match = false; break; }
        }
        result.byte_exact = match;
    }

    return result;
}

// ─── Decode ─────────────────────────────────────────────────────────

Raster jxl_modular_decode(const uint8_t* data, size_t len) {
    if (len < 16) throw std::runtime_error("JXL-Modular: data too short");

    const uint8_t* p = data;
    const uint8_t* end = data + len;

    uint32_t magic = read_u32le(p, end);
    if (magic != JXLM_MAGIC) throw std::runtime_error("JXL-Modular: bad magic");

    uint8_t version = read_u8(p, end);
    if (version != JXLM_VERSION) throw std::runtime_error("JXL-Modular: unsupported version");

    uint32_t w = read_u32le(p, end);
    uint32_t h = read_u32le(p, end);
    uint8_t num_planes = read_u8(p, end);
    uint8_t ct_raw = read_u8(p, end);
    uint8_t filter_raw = read_u8(p, end);
    uint8_t levels_raw = read_u8(p, end);

    ColorTransform ct = (ColorTransform)ct_raw;
    WaveletFilter wf = (filter_raw == 1) ? WaveletFilter::LeGall53 : WaveletFilter::Haar;
    int levels = levels_raw;

    Raster out;
    out.w = w; out.h = h;
    out.bd = BitDepth::BD8;
    out.planes.resize(num_planes);

    WaveletLift lift;
    WaveletParams wp{wf, levels};
    CoefficientPredictor pred;

    for (uint8_t pi = 0; pi < num_planes; ++pi) {
        uint32_t plane_size = read_u32le(p, end);
        const uint8_t* plane_end = p + plane_size;

        // Read MA-tree
        uint32_t tree_len = read_u32le(p, end);
        MATree tree;
        {
            BitReader br(p, tree_len);
            tree = MATree::deserialize(br);
            p += tree_len;
        }
        int nc = tree.num_leaves;

        // Read histograms
        uint16_t nc_wire = read_u16le(p, end);
        if (nc_wire != (uint16_t)nc)
            throw std::runtime_error("JXL-Modular: cluster count mismatch");

        std::vector<uint32_t> cluster_totals(nc);
        std::vector<std::array<uint32_t, kAnsAlphabet>> cluster_hists(nc);
        for (auto& h : cluster_hists) h.fill(0);

        for (int c = 0; c < nc; ++c) {
            cluster_totals[c] = read_u32le(p, end);
            uint16_t nnz = read_u16le(p, end);
            for (uint16_t n = 0; n < nnz; ++n) {
                uint16_t sym = read_u16le(p, end);
                uint32_t cnt = read_u32le(p, end);
                if (sym < kAnsAlphabet) cluster_hists[c][sym] = cnt;
            }
        }

        // Read ANS payload
        uint32_t ans_len = read_u32le(p, end);
        const uint8_t* ans_data = p;
        p += ans_len;

        // Read escape sideband
        uint32_t esc_count = read_u32le(p, end);
        std::vector<int16_t> escape_sideband(esc_count);
        for (uint32_t i = 0; i < esc_count; ++i)
            escape_sideband[i] = (int16_t)read_u16le(p, end);
        uint32_t esc_idx = 0;

        if (p != plane_end)
            throw std::runtime_error("JXL-Modular: plane size mismatch");

        // Build ANS tables
        JXLModularANS ans;
        ans.build(cluster_hists, cluster_totals);

        // Initialize ANS decoder state
        const uint8_t* ans_ptr = ans_data;
        uint32_t state = JXLModularANS::decode_init(ans_ptr);

        // Forward wavelet to get subband structure (dimensions, order)
        std::vector<int32_t> plane_zeros(w * h, 0);
        auto subs = lift.forward(plane_zeros, w, h, wp);

        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);

        // Initialize recon (reconstructed coefficients) to zeros and
        // residual subband (for feature construction matching the encoder).
        std::vector<std::vector<int32_t>> recon(subs.size());
        std::vector<std::vector<int32_t>> resid(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            recon[si].assign((size_t)subs[si].w * subs[si].h, 0);
            resid[si].assign((size_t)subs[si].w * subs[si].h, 0);
            subs[si].coeffs.assign((size_t)subs[si].w * subs[si].h, 0);
        }

        // Incremental decode: for each coefficient in coding order,
        // build feature from already-decoded residuals (matching encoder),
        // eval MA-tree, decode ANS, reconstruct.
        for (int si : order) {
            Subband& s = subs[si];
            for (int y = 0; y < s.h; ++y) {
                for (int x = 0; x < s.w; ++x) {
                    // Build feature from already-decoded residuals in resid
                    // (matching the encoder which builds features from R)
                    int32_t L = (x > 0) ? resid[si][(size_t)y * s.w + x - 1] : 0;
                    int32_t T = (y > 0) ? resid[si][(size_t)(y - 1) * s.w + x] : 0;
                    int32_t TL = (x > 0 && y > 0) ? resid[si][(size_t)(y - 1) * s.w + x - 1] : 0;
                    int32_t TR = (y > 0 && x + 1 < s.w) ? resid[si][(size_t)(y - 1) * s.w + x + 1] : 0;

                    Feature feat = build_sample_feature(
                        s.level, (int)s.orient,
                        L, T, TL, TR, x, y, s.w, s.h);
                    uint16_t cid = tree.eval(feat);

                    // Decode one symbol from ANS
                    uint32_t sym = ans.decode_one(state, ans_ptr, cid);
                    int32_t residual;
                    if (sym == (uint32_t)(kAnsAlphabet - 1)) {
                        if (esc_idx < esc_count)
                            residual = escape_sideband[esc_idx++];
                        else
                            residual = 0;
                    } else {
                        residual = sym_to_res(sym);
                    }

                    // Store residual for future feature construction
                    resid[si][(size_t)y * s.w + x] = residual;

                    // Predict and reconstruct
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                    int32_t coeff = residual + c_hat;
                    subs[si].coeffs[(size_t)y * s.w + x] = coeff;
                    recon[si][(size_t)y * s.w + x] = coeff;
                }
            }
        }

        // Inverse wavelet
        auto reconstructed_i32 = lift.inverse(subs, w, h, wp);
        std::vector<uint16_t> reconstructed_u16(reconstructed_i32.size());
        for (size_t i = 0; i < reconstructed_i32.size(); ++i)
            reconstructed_u16[i] = (uint16_t)reconstructed_i32[i];
        out.planes[pi] = std::move(reconstructed_u16);
    }

    // Verify CRC32
    if (p + 4 <= end) {
        uint32_t crc_stored = read_u32le(p, end);
        uint32_t crc_calc = prism::crc32(data, len - 4);
        if (crc_stored != crc_calc)
            throw std::runtime_error("JXL-Modular: CRC32 mismatch");
    }

    // Inverse color transform
    if (ct != ColorTransform::None) {
        out = invert_color(out, ct);
    }

    return out;
}

// ─── Probe ──────────────────────────────────────────────────────────

JXLModularProbeResult jxl_modular_probe_kodak(const std::string& kodak_dir) {
    JXLModularProbeResult result;

    namespace fs = std::filesystem;
    std::vector<fs::path> imgs;
    for (const auto& entry : fs::directory_iterator(kodak_dir)) {
        if (entry.path().extension() == ".ppm")
            imgs.push_back(entry.path());
    }
    std::sort(imgs.begin(), imgs.end());

    result.num_images = (int)imgs.size();
    result.all_byte_exact = true;

    for (const auto& img : imgs) {
        Raster r = frontend::decode_to_raster(img);
        auto res = jxl_modular_encode(r);

        result.per_image.push_back(res);
        result.mean_per_sample_bpp += res.per_sample_bpp;
        result.mean_summed_bpp += res.summed_bpp;
        if (!res.byte_exact) result.all_byte_exact = false;
    }

    if (result.num_images > 0) {
        result.mean_per_sample_bpp /= (float)result.num_images;
        result.mean_summed_bpp /= (float)result.num_images;
    }

    return result;
}

} // namespace prism::codec
