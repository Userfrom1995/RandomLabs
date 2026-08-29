// Wavelet container: rides the v1 envelope with WAVELET_FLAG set.
//
// The v1 production path (container.cpp model section) is NOT modified; this
// module is a parallel, format-frozen-at-X4-friendly writer/reader for the
// beyond-predictive frame. Byte-exact round-trip and CRC32 are preserved.

#include "prism/codec/wavelet_container.h"
#include "prism/codec/bitplane.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/crc32.h"
#include "prism/bitstream.h"
#include <stdexcept>
#include <vector>

namespace prism::codec {

namespace {
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
        auto res = coder.encode(subs);
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
    WaveletLift lift;
    WaveletParams p{filter, levels};

    size_t off = 0;
    uint32_t sub_idx = 0; // global subband index (forward() order)
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
        auto plane_subs = coder.decode(plane_streams, plane_layout, plane_maxbits, 0);
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
