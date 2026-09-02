// Neural codec frame encode/decode (E1-E, issue #226).
//
// Full neural codec end-to-end with lossless round-trip guarantee.
// Uses wavelet_container format for serialization with NEURAL_FILTER_ID.
// Entropy coding: Y_q is coded conditioned on sigma (Gaussian model),
// Z_q is coded with rANS, and residual R is coded with the existing rANS.

#include "prism/codec/neural_frame.h"
#include "prism/codec/neural_codec.h"
#include "prism/codec/neural_entropy.h"
#include "prism/codec/wavelet_container.h"
#include "prism/codec/color.h"
#include "prism/codec/rans.h"
#include "prism/crc32.h"
#include <cstring>
#include <stdexcept>
#include <algorithm>

namespace prism::codec {

namespace {
// Write a u32 to payload in little-endian.
void write_u32_le(std::vector<uint8_t>& out, uint32_t v) {
    out.push_back(static_cast<uint8_t>(v));
    out.push_back(static_cast<uint8_t>(v >> 8));
    out.push_back(static_cast<uint8_t>(v >> 16));
    out.push_back(static_cast<uint8_t>(v >> 24));
}

// Read a u32 from payload in little-endian.
uint32_t read_u32_le(const uint8_t*& p) {
    uint32_t v = static_cast<uint32_t>(p[0]) |
                 (static_cast<uint32_t>(p[1]) << 8) |
                 (static_cast<uint32_t>(p[2]) << 16) |
                 (static_cast<uint32_t>(p[3]) << 24);
    p += 4;
    return v;
}

// Get or build the Gaussian CDF table (lazy singleton).
const GaussianCDFTable& get_cdf_table() {
    static GaussianCDFTable table = build_gaussian_cdf_table();
    return table;
}

// rANS encode a plane of int8 values (for Z_q, simple 50/50 model).
std::vector<uint8_t> rans_encode_int8_plane(const int8_t* data, int count) {
    std::vector<int32_t> residuals(count);
    for (int i = 0; i < count; ++i) {
        residuals[i] = static_cast<int32_t>(data[i]);
    }
    return rans_encode_plane(residuals, 1);
}

std::vector<int8_t> rans_decode_int8_plane(const std::vector<uint8_t>& bytes, int count) {
    auto residuals = rans_decode_plane(bytes, count, 1);
    std::vector<int8_t> out(count);
    for (int i = 0; i < count; ++i) {
        int v = residuals[i];
        if (v < -128) v = -128;
        if (v > 127) v = 127;
        out[i] = static_cast<int8_t>(v);
    }
    return out;
}
} // namespace

std::vector<uint8_t> frame_neural_encode(const Raster& raster, size_t& net_out) {
    return frame_neural_encode(raster, net_out, nullptr);
}

std::vector<uint8_t> frame_neural_encode(const Raster& raster, size_t& net_out,
                                          NeuralStreamSizes* diag) {
    if (raster.w == 0 || raster.h == 0) {
        throw EncodeError("neural encode: zero dimension");
    }
    if (raster.ch != Channels::RGB) {
        throw EncodeError("neural encode: only RGB supported");
    }

    const int h = static_cast<int>(raster.h);
    const int w = static_cast<int>(raster.w);
    const int c = 3;
    const int N = NeuralCodecParams::N;
    const int M = NeuralCodecParams::M;

    // Step 1: Run analysis network g_a to get latent Y_q.
    int yh, yw;
    std::vector<uint16_t> chw(static_cast<size_t>(c) * h * w);
    for (int ch = 0; ch < c; ++ch) {
        std::memcpy(chw.data() + ch * h * w, raster.planes[ch].data(),
                    h * w * sizeof(uint16_t));
    }
    auto result = neural_full_encode(chw.data(), h, w, c);

    // Step 2: Synthesis network g_s to get X_hat (for residual computation).
    std::vector<uint16_t> x_hat(c * h * w);
    neural_full_decode(result.yq.data(), result.yh, result.yw, N,
                        x_hat.data(), h, w, c);

    // Step 3: Compute residual R = X - X_hat (per channel, int32 to avoid overflow).
    size_t res_count = static_cast<size_t>(c) * h * w;
    std::vector<int32_t> residual(res_count);
    int64_t res_sum_abs = 0;
    int32_t res_max_abs = 0;
    for (int ch = 0; ch < c; ++ch) {
        for (int i = 0; i < h * w; ++i) {
            int32_t orig = static_cast<int32_t>(raster.planes[ch][i]);
            int32_t recon = static_cast<int32_t>(x_hat[ch * h * w + i]);
            int32_t d = orig - recon;
            residual[ch * h * w + i] = d;
            int32_t ad = d < 0 ? -d : d;
            res_sum_abs += ad;
            if (ad > res_max_abs) res_max_abs = ad;
        }
    }

    // Step 4: Entropy-code all streams.
    const auto& table = get_cdf_table();

    // Y_q: entropy-coded conditioned on sigma (Gaussian model).
    size_t yq_count = static_cast<size_t>(N) * result.yh * result.yw;
    auto yq_stream = neural_rans_encode(result.yq.data(), result.sigma.data(),
                                         static_cast<int>(yq_count), table);

    // Z_q: entropy-coded with rANS.
    size_t zq_count = static_cast<size_t>(M) * result.zh * result.zw;
    auto zq_stream = rans_encode_int8_plane(result.zq.data(), static_cast<int>(zq_count));

    // Residual: entropy-coded with rANS.
    auto res_stream = rans_encode_plane(residual, 1);

    // Diagnostics.
    if (diag) {
        diag->yq_stream_size = yq_stream.size();
        diag->zq_stream_size = zq_stream.size();
        diag->res_stream_size = res_stream.size();
        diag->yq_count = yq_count;
        diag->zq_count = zq_count;
        diag->res_count = res_count;
        diag->yh = result.yh;
        diag->yw = result.yw;
        diag->zh = result.zh;
        diag->zw = result.zw;
        diag->res_mad = static_cast<double>(res_sum_abs) / static_cast<double>(res_count);
        diag->res_max = res_max_abs;
    }

    // Step 5: Serialize into payload blob.
    // Layout: [version=1][yh u32 LE][yw u32 LE][zh u32 LE][zw u32 LE]
    //         [yq_len u32 LE][yq_stream bytes]
    //         [zq_len u32 LE][zq_stream bytes]
    //         [res_len u32 LE][res_stream bytes]
    std::vector<uint8_t> payload;
    payload.reserve(1 + 16 + 4 + yq_stream.size() + 4 + zq_stream.size() + 4 + res_stream.size());

    payload.push_back(1);  // version: 1 = entropy-coded
    write_u32_le(payload, static_cast<uint32_t>(result.yh));
    write_u32_le(payload, static_cast<uint32_t>(result.yw));
    write_u32_le(payload, static_cast<uint32_t>(result.zh));
    write_u32_le(payload, static_cast<uint32_t>(result.zw));

    write_u32_le(payload, static_cast<uint32_t>(yq_stream.size()));
    payload.insert(payload.end(), yq_stream.begin(), yq_stream.end());

    write_u32_le(payload, static_cast<uint32_t>(zq_stream.size()));
    payload.insert(payload.end(), zq_stream.begin(), zq_stream.end());

    write_u32_le(payload, static_cast<uint32_t>(res_stream.size()));
    payload.insert(payload.end(), res_stream.begin(), res_stream.end());

    // Step 6: Wrap in wavelet container with NEURAL_FILTER_ID.
    WaveletHeader hdr;
    hdr.filter_id = NEURAL_FILTER_ID;
    hdr.levels = 0;
    hdr.maxbits = 0;
    hdr.residual_mode = 0;
    hdr.total_symbols = 0;
    hdr.subbands_per_plane = 1;
    hdr.num_planes = 1;
    hdr.plane_symbols = {static_cast<uint32_t>(payload.size())};
    hdr.sub_maxbits = {8};
    hdr.sub_bytes = {static_cast<uint32_t>(payload.size())};

    auto output = wavelet_container_encode(raster, hdr, payload);
    net_out = output.size();
    return output;
}

Raster frame_neural_decode(const std::vector<uint8_t>& bytes) {
    auto frame = wavelet_container_decode(bytes);

    if (frame.hdr.filter_id != NEURAL_FILTER_ID) {
        throw DecodeError("neural decode: wrong filter_id");
    }

    // Parse raster dimensions from the container header (bytes 5-14).
    Raster raster;
    raster.w = static_cast<uint32_t>(bytes[5] | (bytes[6] << 8) |
                (bytes[7] << 16) | (bytes[8] << 24));
    raster.h = static_cast<uint32_t>(bytes[9] | (bytes[10] << 8) |
                (bytes[11] << 16) | (bytes[12] << 24));
    raster.bd = (bytes[13] == 16) ? BitDepth::BD16 : BitDepth::BD8;
    raster.ch = static_cast<Channels>(bytes[14]);
    raster.planes.resize(static_cast<size_t>(raster.ch));

    const int h = static_cast<int>(raster.h);
    const int w = static_cast<int>(raster.w);
    const int c = static_cast<int>(raster.ch);
    const int N = NeuralCodecParams::N;
    const int M = NeuralCodecParams::M;

    const uint8_t* p = frame.payload.data();
    const uint8_t* end = p + frame.payload.size();

    if (end - p < 1) {
        throw DecodeError("neural decode: payload too short for version byte");
    }

    uint8_t version = *p++;

    if (version == 0) {
        // Legacy raw format (no entropy coding).
        if (end - p < 16) {
            throw DecodeError("neural decode: payload too short for header");
        }

        int yh = static_cast<int>(read_u32_le(p));
        int yw = static_cast<int>(read_u32_le(p));
        int zh = static_cast<int>(read_u32_le(p));
        int zw = static_cast<int>(read_u32_le(p));

        size_t yq_size = static_cast<size_t>(N) * yh * yw;
        size_t zq_size = static_cast<size_t>(M) * zh * zw;
        size_t sigma_size = yq_size;
        size_t res_size = static_cast<size_t>(c) * h * w;

        size_t needed = yq_size + zq_size + sigma_size * 2 + res_size * 2;
        if (static_cast<size_t>(end - p) < needed) {
            throw DecodeError("neural decode: payload too short for data");
        }

        std::vector<int8_t> yq(p, p + yq_size);
        p += yq_size;
        std::vector<int8_t> zq(p, p + zq_size);
        p += zq_size;

        std::vector<int16_t> sigma(sigma_size);
        for (size_t i = 0; i < sigma_size; ++i) {
            sigma[i] = static_cast<int16_t>((static_cast<uint16_t>(p[0]) << 8) | p[1]);
            p += 2;
        }

        std::vector<int16_t> residual(res_size);
        for (size_t i = 0; i < res_size; ++i) {
            residual[i] = static_cast<int16_t>((static_cast<uint16_t>(p[0]) << 8) | p[1]);
            p += 2;
        }

        std::vector<uint16_t> x_hat(c * h * w);
        neural_full_decode(yq.data(), yh, yw, N, x_hat.data(), h, w, c);

        for (int ch = 0; ch < c; ++ch) {
            raster.planes[ch].resize(static_cast<size_t>(h) * w);
            for (int i = 0; i < h * w; ++i) {
                int32_t recon = static_cast<int32_t>(x_hat[ch * h * w + i]);
                int32_t res = static_cast<int32_t>(residual[ch * h * w + i]);
                int32_t orig = recon + res;
                raster.planes[ch][i] = static_cast<uint16_t>(
                    std::max(0, std::min(65535, orig)));
            }
        }
        return raster;
    }

    if (version != 1) {
        throw DecodeError("neural decode: unknown version");
    }

    // Version 1: entropy-coded format.
    if (end - p < 16) {
        throw DecodeError("neural decode: payload too short for header");
    }

    int yh = static_cast<int>(read_u32_le(p));
    int yw = static_cast<int>(read_u32_le(p));
    int zh = static_cast<int>(read_u32_le(p));
    int zw = static_cast<int>(read_u32_le(p));

    size_t yq_count = static_cast<size_t>(N) * yh * yw;
    size_t zq_count = static_cast<size_t>(M) * zh * zw;
    size_t res_count = static_cast<size_t>(c) * h * w;

    // Read Y_q stream.
    if (end - p < 4) throw DecodeError("neural decode: missing yq_len");
    uint32_t yq_len = read_u32_le(p);
    if (static_cast<size_t>(end - p) < yq_len) throw DecodeError("neural decode: yq stream truncated");
    std::vector<uint8_t> yq_stream(p, p + yq_len);
    p += yq_len;

    // Read Z_q stream.
    if (end - p < 4) throw DecodeError("neural decode: missing zq_len");
    uint32_t zq_len = read_u32_le(p);
    if (static_cast<size_t>(end - p) < zq_len) throw DecodeError("neural decode: zq stream truncated");
    std::vector<uint8_t> zq_stream(p, p + zq_len);
    p += zq_len;

    // Read residual stream.
    if (end - p < 4) throw DecodeError("neural decode: missing res_len");
    uint32_t res_len = read_u32_le(p);
    if (static_cast<size_t>(end - p) < res_len) throw DecodeError("neural decode: residual stream truncated");
    std::vector<uint8_t> res_stream(p, p + res_len);
    p += res_len;

    // Step 1: Entropy-decode Z_q.
    std::vector<int8_t> zq_decoded = rans_decode_int8_plane(zq_stream, static_cast<int>(zq_count));

    // Step 2: Derive sigma from Z_q via h_s.
    std::vector<int16_t> sigma(yq_count);
    std::vector<int16_t> bias_unused(yq_count);
    neural_hyper_synthesis_decode(zq_decoded.data(), zh, zw, M,
                                   sigma.data(), bias_unused.data(),
                                   yh, yw, N);

    // Step 3: Entropy-decode Y_q conditioned on sigma.
    const auto& table = get_cdf_table();
    std::vector<int8_t> yq_decoded = neural_rans_decode(yq_stream, static_cast<int>(yq_count),
                                                          sigma.data(), table);

    // Step 4: Entropy-decode residual.
    auto res_decoded = rans_decode_plane(res_stream, res_count, 1);

    // Step 5: Run synthesis network g_s on Y_q.
    std::vector<uint16_t> x_hat(c * h * w);
    neural_full_decode(yq_decoded.data(), yh, yw, N, x_hat.data(), h, w, c);

    // Step 6: Add residual: X = X_hat + R.
    for (int ch = 0; ch < c; ++ch) {
        raster.planes[ch].resize(static_cast<size_t>(h) * w);
        for (int i = 0; i < h * w; ++i) {
            int32_t recon = static_cast<int32_t>(x_hat[ch * h * w + i]);
            int32_t res = res_decoded[ch * h * w + i];
            int32_t orig = recon + res;
            raster.planes[ch][i] = static_cast<uint16_t>(
                std::max(0, std::min(65535, orig)));
        }
    }

    return raster;
}

} // namespace prism::codec
