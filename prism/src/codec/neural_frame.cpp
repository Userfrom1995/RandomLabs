// Neural codec frame encode/decode (E1, issue #226).
//
// Full neural codec end-to-end with lossless round-trip guarantee.
// Uses wavelet_container format for serialization with NEURAL_FILTER_ID.
//
// E1-E entropy coding:
// - Y_q is rANS-coded conditioned on sigma (sigma re-derived from Z_q on decode)
// - Z_q is rANS-coded with a fixed Laplacian model
// - Residual R = X - g_s(Y_q) is coded with existing rANS (rans_encode_plane)
// - sigma is NOT transmitted (saves 2 bytes per latent value)

#include "prism/codec/neural_frame.h"
#include "prism/codec/neural_codec.h"
#include "prism/codec/neural_entropy.h"
#include "prism/codec/rans.h"
#include "prism/codec/wavelet_container.h"
#include "prism/codec/color.h"
#include "prism/codec/bitplane.h"
#include "prism/crc32.h"
#include <cstring>
#include <stdexcept>
#include <algorithm>

namespace prism::codec {

namespace {
// Simple variable-length integer encoding for stream sizes.
void write_varint(std::vector<uint8_t>& out, uint32_t v) {
    while (v >= 0x80) {
        out.push_back(static_cast<uint8_t>(v | 0x80));
        v >>= 7;
    }
    out.push_back(static_cast<uint8_t>(v));
}

uint32_t read_varint(const uint8_t*& p, const uint8_t* end) {
    uint32_t result = 0;
    int shift = 0;
    while (p < end && *p & 0x80) {
        result |= static_cast<uint32_t>(*p & 0x7F) << shift;
        shift += 7;
        ++p;
    }
    if (p < end) {
        result |= static_cast<uint32_t>(*p) << shift;
        ++p;
    }
    return result;
}
} // namespace

std::vector<uint8_t> frame_neural_encode(const Raster& raster, size_t& net_out) {
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

    // Step 2: Synthesis network g_s to get X_hat.
    std::vector<uint16_t> x_hat(c * h * w);
    neural_full_decode(result.yq.data(), result.yh, result.yw, N,
                       x_hat.data(), h, w, c);

    // Step 3: Compute residual R = X - X_hat (per channel).
    // Use int32 to avoid overflow (uint16 range can exceed int16 range).
    std::vector<int32_t> residual(static_cast<size_t>(c) * h * w);
    for (int ch = 0; ch < c; ++ch) {
        for (int i = 0; i < h * w; ++i) {
            int32_t orig = static_cast<int32_t>(raster.planes[ch][i]);
            int32_t recon = static_cast<int32_t>(x_hat[ch * h * w + i]);
            residual[ch * h * w + i] = orig - recon;
        }
    }

    // Step 4: Entropy-code Y_q, Z_q, and residual.
    // Y_q is coded conditioned on sigma (from h_s).
    auto yq_rans = NeuralEntropyEncoder::encode_yq(
        result.yq.data(), result.sigma.data(), N, result.yh, result.yw);
    // Z_q is coded with a fixed Laplacian model.
    auto zq_rans = NeuralEntropyEncoder::encode_zq(
        result.zq.data(), M, result.zh, result.zw);
    // Residual is coded with existing rANS (int32).
    auto res_rans = rans_encode_plane(residual);

    // Step 5: Serialize entropy-coded payload.
    // Layout: [yh u32][yw u32][zh u32][zw u32]
    //         [zq_size u32][yq_size u32][res_size u32]
    //         [Z_q rANS stream]
    //         [Y_q rANS stream]
    //         [Residual rANS stream]
    std::vector<uint8_t> payload;
    payload.reserve(28 + zq_rans.size() + yq_rans.size() + res_rans.size());

    auto write_u32 = [&](uint32_t v) {
        payload.push_back(static_cast<uint8_t>(v));
        payload.push_back(static_cast<uint8_t>(v >> 8));
        payload.push_back(static_cast<uint8_t>(v >> 16));
        payload.push_back(static_cast<uint8_t>(v >> 24));
    };
    write_u32(static_cast<uint32_t>(result.yh));
    write_u32(static_cast<uint32_t>(result.yw));
    write_u32(static_cast<uint32_t>(result.zh));
    write_u32(static_cast<uint32_t>(result.zw));
    write_u32(static_cast<uint32_t>(zq_rans.size()));
    write_u32(static_cast<uint32_t>(yq_rans.size()));
    write_u32(static_cast<uint32_t>(res_rans.size()));

    // Append entropy-coded streams.
    payload.insert(payload.end(), zq_rans.begin(), zq_rans.end());
    payload.insert(payload.end(), yq_rans.begin(), yq_rans.end());
    payload.insert(payload.end(), res_rans.begin(), res_rans.end());

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
    if (bytes.size() < 19) {
        throw DecodeError("neural decode: stream too short for container header");
    }

    auto frame = wavelet_container_decode(bytes);

    if (frame.hdr.filter_id != NEURAL_FILTER_ID) {
        throw DecodeError("neural decode: wrong filter_id");
    }

    // Parse raster dimensions from the v1 envelope (bytes 5-14).
    Raster raster;
    raster.w = static_cast<uint32_t>(bytes[5] | (bytes[6] << 8) |
                (bytes[7] << 16) | (bytes[8] << 24));
    raster.h = static_cast<uint32_t>(bytes[9] | (bytes[10] << 8) |
                (bytes[11] << 16) | (bytes[12] << 24));
    raster.bd = (bytes[13] == 16) ? BitDepth::BD16 : BitDepth::BD8;
    raster.ch = static_cast<Channels>(bytes[14]);
    if (raster.ch != Channels::RGB) {
        throw DecodeError("neural decode: only RGB supported");
    }
    raster.planes.resize(static_cast<size_t>(raster.ch));

    const int h = static_cast<int>(raster.h);
    const int w = static_cast<int>(raster.w);
    const int c = static_cast<int>(raster.ch);
    const int N = NeuralCodecParams::N;
    const int M = NeuralCodecParams::M;

    const uint8_t* p = frame.payload.data();
    const uint8_t* end = p + frame.payload.size();

    if (end - p < 28) {
        throw DecodeError("neural decode: payload too short for header");
    }

    // Read header
    auto read_u32 = [&]() -> uint32_t {
        uint32_t v = static_cast<uint32_t>(p[0]) |
                     (static_cast<uint32_t>(p[1]) << 8) |
                     (static_cast<uint32_t>(p[2]) << 16) |
                     (static_cast<uint32_t>(p[3]) << 24);
        p += 4;
        return v;
    };

    int yh = static_cast<int>(read_u32());
    int yw = static_cast<int>(read_u32());
    int zh = static_cast<int>(read_u32());
    int zw = static_cast<int>(read_u32());
    uint32_t zq_size = read_u32();
    uint32_t yq_size = read_u32();
    uint32_t res_size = read_u32();

    // Bounds check for stream sizes.
    size_t needed = static_cast<size_t>(zq_size) + yq_size + res_size;
    if (static_cast<size_t>(end - p) < needed) {
        throw DecodeError("neural decode: payload too short for entropy streams");
    }

    // Extract entropy-coded streams.
    std::vector<uint8_t> zq_stream(p, p + zq_size);
    p += zq_size;
    std::vector<uint8_t> yq_stream(p, p + yq_size);
    p += yq_size;
    std::vector<uint8_t> res_stream(p, p + res_size);
    p += res_size;

    // Decode Z_q first (needed to derive sigma).
    auto zq = NeuralEntropyDecoder::decode_zq(zq_stream, M, zh, zw);

    // Re-derive sigma from Z_q via h_s.
    std::vector<int16_t> sigma(static_cast<size_t>(N) * yh * yw);
    std::vector<int16_t> bias(static_cast<size_t>(N) * yh * yw);
    neural_hyper_synthesis_decode(zq.data(), zh, zw, M,
                                  sigma.data(), bias.data(),
                                  yh, yw, N);

    // Decode Y_q conditioned on sigma.
    auto yq = NeuralEntropyDecoder::decode_yq(yq_stream, sigma.data(),
                                              N, yh, yw);

    // Decode residual (int32 for lossless round-trip).
    auto residual = rans_decode_plane(res_stream,
                                       static_cast<size_t>(c) * h * w);

    // Decode: run synthesis network g_s on Y_q.
    std::vector<uint16_t> x_hat(c * h * w);
    neural_full_decode(yq.data(), yh, yw, N, x_hat.data(), h, w, c);

    // Add residual: X = X_hat + R.
    for (int ch = 0; ch < c; ++ch) {
        raster.planes[ch].resize(static_cast<size_t>(h) * w);
        for (int i = 0; i < h * w; ++i) {
            int32_t recon = static_cast<int32_t>(x_hat[ch * h * w + i]);
            int32_t res = residual[ch * h * w + i];
            int32_t orig = recon + res;
            raster.planes[ch][i] = static_cast<uint16_t>(
                std::max(0, std::min(65535, orig)));
        }
    }

    return raster;
}

} // namespace prism::codec
