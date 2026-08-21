#pragma once
#include <cstdint>
#include <vector>
#include <stdexcept>
#include <string>

namespace prism {

using u8  = uint8_t;
using u16 = uint16_t;
using u32 = uint32_t;
using u64 = uint64_t;
using i16 = int16_t;
using i32 = int32_t;
using i64 = int64_t;

enum class BitDepth : u8 { BD8 = 8, BD16 = 16 };
enum class Channels : u8 { GRAY = 1, GA = 2, RGB = 3, RGBA = 4 };

inline u8 to_u8(BitDepth bd) { return static_cast<u8>(bd); }
inline u8 to_u8(Channels ch) { return static_cast<u8>(ch); }

struct Raster {
    BitDepth bd = BitDepth::BD8;
    Channels ch = Channels::RGB;
    u32 w = 0;
    u32 h = 0;
    // planes[c][y*w + x]  planar, row-major, u16 holds 8- and 16-bit samples
    std::vector<std::vector<u16>> planes;

    Raster() = default;
    Raster(u32 ww, u32 hh, Channels cc, BitDepth bb) : bd(bb), ch(cc), w(ww), h(hh) {
        if (w == 0 || h == 0) throw std::invalid_argument("Raster: zero dimension");
        size_t n = static_cast<size_t>(w) * h;
        size_t nc = static_cast<size_t>(to_u8(ch));
        planes.assign(nc, std::vector<u16>(n, 0));
    }

    size_t num_channels() const { return static_cast<size_t>(to_u8(ch)); }
    size_t num_pixels() const { return static_cast<size_t>(w) * h; }

    bool operator==(const Raster& o) const {
        return bd == o.bd && ch == o.ch && w == o.w && h == o.h && planes == o.planes;
    }
    bool operator!=(const Raster& o) const { return !(*this == o); }

    u16& at(size_t c, u32 x, u32 y) { return planes[c][static_cast<size_t>(y) * w + x]; }
    const u16& at(size_t c, u32 x, u32 y) const { return planes[c][static_cast<size_t>(y) * w + x]; }
};

// Feature vector at a sample, Stage X input
struct Feature {
    u16 qg = 0;
    u8  band_class = 0;
    u8  llc_class = 0;
    u16 res_diff = 0;
    u8  sibling_class = 0;
    u8  activity = 0;
};

struct DecodeError : std::runtime_error {
    explicit DecodeError(const std::string& m) : std::runtime_error(m) {}
};
struct EncodeError : std::runtime_error {
    explicit EncodeError(const std::string& m) : std::runtime_error(m) {}
};

} // namespace prism
