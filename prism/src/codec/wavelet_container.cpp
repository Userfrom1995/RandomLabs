// Wavelet container: rides the v1 envelope with WAVELET_FLAG set.
//
// The v1 production path (container.cpp model section) is NOT modified; this
// module is a parallel, format-frozen-at-X4-friendly writer/reader for the
// beyond-predictive frame. Byte-exact round-trip and CRC32 are preserved.

#include "prism/codec/wavelet_container.h"
#include "prism/codec/bitplane.h"
#include "prism/codec/color.h"
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
    // NOTE: we keep color_transform_id = YCoCgR (data domain), and stash the
    // wavelet filter id in the wavelet header below.
    out.back() = (uint8_t)ColorTransform::YCoCgR;
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
    for (uint16_t i = 0; i < nsub; ++i) {
        hdr.orient[i] = bytes[pos++];
        hdr.level[i] = bytes[pos++];
        hdr.w[i] = read_u16_le_bytes(bytes.data() + pos); pos += 2;
        hdr.h[i] = read_u16_le_bytes(bytes.data() + pos); pos += 2;
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
    Raster t = apply_color(raster, ColorTransform::YCoCgR);
    WaveletLift lift;
    WaveletParams p{filter, levels};
    BitplaneCoder coder;

    std::vector<Subband> all_subs;
    std::vector<std::vector<Subband>> per_plane_subs;
    std::vector<uint32_t> plane_symbols;
    uint16_t subbands_per_plane = 0;
    uint8_t maxbits = 0;
    std::vector<uint8_t> payload;

    // Pass 1: forward transform per plane, discover global maxbits.
    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, p);
        if (pi == 0) subbands_per_plane = (uint16_t)subs.size();
        per_plane_subs.push_back(subs);
        for (const auto& s : subs) all_subs.push_back(s);
        auto res = coder.encode(subs);
        maxbits = std::max(maxbits, res.maxbits);
    }

    // Pass 2: re-encode each plane with the shared global maxbits so decode
    // (which uses one global B) stays symbol-count consistent (I26).
    for (size_t pi = 0; pi < per_plane_subs.size(); ++pi) {
        auto res = coder.encode(per_plane_subs[pi], maxbits);
        // plane_symbols carries the byte length of each plane's rANS stream so
        // the decoder can slice the concatenated payload; the bitplane decoder
        // recovers its own symbol count from the stream.
        plane_symbols.push_back((uint32_t)res.stream.size());
        payload.insert(payload.end(), res.stream.begin(), res.stream.end());
    }

    WaveletHeader hdr;
    hdr.filter_id = filter_to_id(filter);
    hdr.levels = (uint8_t)levels;
    hdr.maxbits = maxbits;
    hdr.total_symbols = 0; // unused (per-plane slice)
    hdr.subbands_per_plane = subbands_per_plane;
    hdr.num_planes = (uint8_t)t.planes.size();
    hdr.plane_symbols = plane_symbols;
    for (const auto& s : all_subs) {
        hdr.orient.push_back((uint8_t)s.orient);
        hdr.level.push_back((uint8_t)s.level);
        hdr.w.push_back((uint16_t)s.w);
        hdr.h.push_back((uint16_t)s.h);
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
    WaveletLift lift;
    WaveletParams p{filter, levels};

    size_t off = 0;
    for (uint8_t pi = 0; pi < nplanes; ++pi) {
        uint32_t n = hdr.plane_symbols[pi];
        std::vector<uint8_t> slice(frame.payload.begin() + off,
                                   frame.payload.begin() + off + n);
        off += n;
        std::vector<Subband> plane_layout(layout.begin() + pi * spp,
                                           layout.begin() + (pi + 1) * spp);
        // total_symbols unknown per-plane (byte length stored); the bitplane
        // decoder derives the count itself, so pass 0 to skip the strict check.
        auto plane_subs = coder.decode(slice, plane_layout, hdr.maxbits, 0);
        auto plane = lift.inverse(plane_subs, t.w, t.h, p);
        // Store the color-transformed integer coefficients verbatim. The values
        // are biased/signed (chrominance bias + wavelet AC coefficients); they
        // are reinterpreted as signed 16-bit by invert_color, so do NOT clamp to
        // the display range here (that would corrupt chroma and signed ACs).
        for (size_t i = 0; i < plane.size(); ++i) {
            t.planes[pi][i] = (uint16_t)((int32_t)plane[i] & 0xFFFF);
        }
    }
    // Inverse YCoCg-R, reading the stored wavelet coefficients as signed 16-bit
    // (they were written via (v & 0xFFFF), i.e. two's-complement). This keeps the
    // production invert_color untouched and stays exact for the BD8 harness while
    // faithfully restoring chrominance bias and signed AC coefficients.
    if (t.num_channels() >= 3) {
        int mask = (t.bd == BitDepth::BD8) ? 0xFF : 0xFFFF;
        int bias = (t.bd == BitDepth::BD8) ? 512 : 32768;
        size_t n = t.num_pixels();
        for (size_t i = 0; i < n; ++i) {
            int Y  = (int16_t)t.planes[0][i];
            int Cg = (int16_t)t.planes[1][i] - bias;
            int Co = (int16_t)t.planes[2][i] - bias;
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

} // namespace prism::codec
