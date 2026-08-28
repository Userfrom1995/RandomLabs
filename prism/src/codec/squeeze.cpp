#include "prism/codec/squeeze.h"
#include <stdexcept>

namespace prism::codec {

namespace {

// Mathematical floor division by 2 (C++ integer division truncates toward
// zero; lifting needs floor for negative details). Codec constant mirrored on
// the decode side (architecture-jxl-parity.md invariant I2).
inline int32_t floor_div2(int32_t v) {
    return v >= 0 ? (v >> 1) : -(((-v) + 1) >> 1);
}

inline uint16_t clamp16(int32_t v) {
    return (uint16_t)(v < 0 ? 0 : (v > 65535 ? 65535 : v));
}

} // namespace

uint8_t max_squeeze_levels(uint32_t w, uint32_t h) {
    uint8_t l = 0;
    while (w >= 2 && h >= 2 && l < 8) {
        if ((w & 1) || (h & 1)) break;
        w /= 2; h /= 2; l++;
        if (w < 2 || h < 2) break;
    }
    if (l > 4) l = 4;
    return l;
}

void squeeze_lift_level(const std::vector<uint16_t>& cur, uint32_t W, uint32_t H,
                        std::vector<uint16_t>& ll, std::vector<uint16_t>& hb,
                        std::vector<uint16_t>& vb, std::vector<uint16_t>& db) {
    if ((W & 1) || (H & 1)) throw std::invalid_argument("squeeze_lift_level: odd dims");
    uint32_t w2 = W / 2, h2 = H / 2;
    // Horizontal pass per row: pairs (a = even column, b = odd column)
    //   d = a - b; s = b + floor(d/2)   (= floor((a+b)/2), stays in range)
    std::vector<int32_t> avgH((size_t)w2 * H), detH((size_t)w2 * H);
    for (uint32_t y = 0; y < H; ++y) {
        const uint16_t* row = &cur[(size_t)y * W];
        for (uint32_t x = 0; x < w2; ++x) {
            int32_t a = row[2 * x], b = row[2 * x + 1];
            int32_t d = a - b;
            avgH[(size_t)y * w2 + x] = b + floor_div2(d);
            detH[(size_t)y * w2 + x] = d;
        }
    }
    // Vertical pass over BOTH channels: pairs (u = even row, l = odd row)
    //   dv = u - l; sv = l + floor(dv/2)
    ll.assign((size_t)w2 * h2, 0); hb.assign((size_t)w2 * h2, 0);
    vb.assign((size_t)w2 * h2, 0); db.assign((size_t)w2 * h2, 0);
    for (uint32_t y = 0; y < h2; ++y) {
        for (uint32_t x = 0; x < w2; ++x) {
            size_t top = (size_t)(2 * y) * w2 + x, bot = (size_t)(2 * y + 1) * w2 + x;
            int32_t ua = avgH[top], la = avgH[bot];
            int32_t dva = ua - la;
            int32_t sva = la + floor_div2(dva);
            int32_t ud = detH[top], ld = detH[bot];
            int32_t dvd = ud - ld;
            int32_t svd = ld + floor_div2(dvd);
            size_t j = (size_t)y * w2 + x;
            ll[j] = clamp16(sva);          // average quadrant (recurse here)
            vb[j] = (uint16_t)(int16_t)dva; // vertical detail of averages
            hb[j] = (uint16_t)(int16_t)svd; // horizontal detail, vertically averaged
            db[j] = (uint16_t)(int16_t)dvd; // diagonal
        }
    }
}

void squeeze_merge_level_lift(const std::vector<uint16_t>& ll, const std::vector<uint16_t>& hb,
                              const std::vector<uint16_t>& vb, const std::vector<uint16_t>& db,
                              uint32_t w2, uint32_t h2, std::vector<uint16_t>& parent) {
    if (ll.size() < (size_t)w2 * h2 || hb.size() < (size_t)w2 * h2 ||
        vb.size() < (size_t)w2 * h2 || db.size() < (size_t)w2 * h2)
        throw std::runtime_error("squeeze_merge_lift: band size mismatch");
    // Vertical inverse on both channels first: recovers full-height half-width
    // average (avgH) and detail (detH) planes.
    std::vector<int32_t> avgH((size_t)w2 * h2 * 2), detH((size_t)w2 * h2 * 2);
    for (uint32_t y = 0; y < h2; ++y) {
        for (uint32_t x = 0; x < w2; ++x) {
            size_t j = (size_t)y * w2 + x;
            int32_t sva = ll[j], dva = (int16_t)vb[j];
            int32_t la = sva - floor_div2(dva);
            int32_t ua = la + dva;
            // hb stores the vertical average of the DETAIL channel, which is
            // signed (details are signed) - wrapped storage, signed readback.
            int32_t svd = (int16_t)hb[j], dvd = (int16_t)db[j];
            int32_t ld = svd - floor_div2(dvd);
            int32_t ud = ld + dvd;
            avgH[(size_t)(2 * y) * w2 + x] = ua;
            avgH[(size_t)(2 * y + 1) * w2 + x] = la;
            detH[(size_t)(2 * y) * w2 + x] = ud;
            detH[(size_t)(2 * y + 1) * w2 + x] = ld;
        }
    }
    // Horizontal inverse per row: pairs (s from avgH, d from detH) at the same
    // half-width position rebuild the original pixel pair.
    parent.resize((size_t)w2 * 2 * h2 * 2);
    uint32_t W = w2 * 2;
    for (uint32_t y = 0; y < h2 * 2; ++y) {
        for (uint32_t x = 0; x < w2; ++x) {
            int32_t s = avgH[(size_t)y * w2 + x];
            int32_t d = detH[(size_t)y * w2 + x];
            int32_t b = s - floor_div2(d);
            int32_t a = b + d;
            parent[(size_t)y * W + 2 * x] = clamp16(a);
            parent[(size_t)y * W + 2 * x + 1] = clamp16(b);
        }
    }
}

std::vector<std::vector<uint16_t>> squeeze_ll_chain(const std::vector<uint16_t>& plane,
                                                    uint32_t w, uint32_t h, uint8_t L, bool lift) {
    std::vector<std::vector<uint16_t>> chain;
    std::vector<uint16_t> cur = plane;
    uint32_t curW = w, curH = h;
    for (uint8_t lvl = 0; lvl < L; ++lvl) {
        if ((curW & 1) || (curH & 1)) break;
        uint32_t w2 = curW / 2, h2 = curH / 2;
        if (w2 == 0 || h2 == 0) break;
        std::vector<uint16_t> ll(w2 * h2);
        if (lift) {
            std::vector<uint16_t> hb, vb, db;
            squeeze_lift_level(cur, curW, curH, ll, hb, vb, db);
        } else {
            // legacy Stage-S decimation chain: LL is the top-left pixel copy
            for (uint32_t y = 0; y < h2; ++y)
                for (uint32_t x = 0; x < w2; ++x)
                    ll[y * w2 + x] = cur[(size_t)(2 * y) * curW + (2 * x)];
        }
        chain.push_back(std::move(ll));
        cur = chain.back();
        curW = w2; curH = h2;
    }
    return chain;
}

SqueezeResult squeeze_encode_plane(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h,
                                   uint8_t levels, uint8_t bit_depth, bool lift) {
    if (bit_depth == 16) levels = 0;
    uint8_t maxL = max_squeeze_levels(w, h);
    if (levels > maxL) levels = maxL;
    SqueezeResult res;
    if (levels == 0) {
        SqueezeResult::Band b;
        b.w = w; b.h = h; b.data = plane; b.band_class = 0;
        res.bands.push_back(std::move(b));
        res.levels = 0;
        return res;
    }
    struct LevelHF { std::vector<uint16_t> ll, h, v, d; };
    std::vector<LevelHF> quads;
    std::vector<uint32_t> q_ws, q_hs;
    std::vector<uint16_t> cur = plane;
    uint32_t curW = w, curH = h;
    for (uint8_t lvl = 0; lvl < levels; ++lvl) {
        if ((curW & 1) || (curH & 1)) break;
        uint32_t w2 = curW / 2;
        uint32_t h2 = curH / 2;
        if (w2 == 0 || h2 == 0) break;
        LevelHF q;
        if (lift) {
            squeeze_lift_level(cur, curW, curH, q.ll, q.h, q.v, q.d);
        } else {
            // legacy decimation: LL keeps the top-left pixel, HF are plain diffs
            q.ll.resize((size_t)w2 * h2);
            q.h.resize((size_t)w2 * h2); q.v.resize((size_t)w2 * h2); q.d.resize((size_t)w2 * h2);
            for (uint32_t y = 0; y < h2; ++y) {
                for (uint32_t x = 0; x < w2; ++x) {
                    size_t i00 = (size_t)(y*2) * curW + (x*2);
                    size_t i01 = i00 + 1;
                    size_t i10 = i00 + curW;
                    size_t i11 = i10 + 1;
                    int a = (int)cur[i00];
                    int b = (int)cur[i01];
                    int c = (int)cur[i10];
                    int d = (int)cur[i11];
                    q.ll[y * w2 + x] = (uint16_t)a;
                    q.h[y * w2 + x] = (uint16_t)(int16_t)(b - a);
                    q.v[y * w2 + x] = (uint16_t)(int16_t)(c - a);
                    q.d[y * w2 + x] = (uint16_t)(int16_t)(d - a);
                }
            }
        }
        q_ws.push_back(w2); q_hs.push_back(h2);
        quads.push_back(std::move(q));
        cur = quads.back().ll;
        curW = w2; curH = h2;
    }
    uint8_t effLevels = (uint8_t)quads.size();
    res.levels = effLevels;
    if (effLevels == 0) {
        SqueezeResult::Band b; b.w=w; b.h=h; b.data=plane; b.band_class=0;
        res.bands.push_back(std::move(b));
        return res;
    }
    SqueezeResult::Band llBand;
    llBand.w = curW; llBand.h = curH; llBand.data = cur;
    llBand.band_class = (uint8_t)(effLevels << 2);
    res.bands.push_back(std::move(llBand));
    for (int lvl = (int)effLevels - 1; lvl >= 0; --lvl) {
        uint32_t w2 = q_ws[lvl]; uint32_t h2 = q_hs[lvl];
        uint8_t lvlTag = (uint8_t)lvl;
        SqueezeResult::Band hb; hb.w=w2; hb.h=h2; hb.data=quads[lvl].h; hb.band_class=(uint8_t)((lvlTag<<2)|1); res.bands.push_back(std::move(hb));
        SqueezeResult::Band vb; vb.w=w2; vb.h=h2; vb.data=quads[lvl].v; vb.band_class=(uint8_t)((lvlTag<<2)|2); res.bands.push_back(std::move(vb));
        SqueezeResult::Band db; db.w=w2; db.h=h2; db.data=quads[lvl].d; db.band_class=(uint8_t)((lvlTag<<2)|3); res.bands.push_back(std::move(db));
    }
    return res;
}

std::vector<uint16_t> squeeze_decode_plane(const SqueezeResult& sr, uint32_t orig_w, uint32_t orig_h,
                                           bool lift) {
    if (sr.bands.empty()) return {};
    if (sr.levels == 0) return sr.bands[0].data;
    uint8_t L = sr.levels;
    if (sr.bands.size() != (size_t)(1 + 3*L)) throw std::runtime_error("squeeze_decode: band count mismatch");
    std::vector<uint16_t> cur = sr.bands[0].data;
    uint32_t curW = sr.bands[0].w;
    uint32_t curH = sr.bands[0].h;
    size_t idx = 1;
    for (int lvl = (int)L - 1; lvl >= 0; --lvl) {
        if (idx + 2 >= sr.bands.size()) throw std::runtime_error("squeeze_decode: idx overflow");
        const auto& hb = sr.bands[idx++];
        const auto& vb = sr.bands[idx++];
        const auto& db = sr.bands[idx++];
        if (hb.w != curW || hb.h != curH || vb.w != curW || vb.h != curH || db.w != curW || db.h != curH) throw std::runtime_error("squeeze_decode: HF dims mismatch");
        uint32_t parentW = curW * 2;
        uint32_t parentH = curH * 2;
        std::vector<uint16_t> parent;
        if (lift) {
            squeeze_merge_level_lift(cur, hb.data, vb.data, db.data, curW, curH, parent);
        } else {
            parent.resize((size_t)parentW * parentH);
            for (uint32_t y = 0; y < curH; ++y) {
                for (uint32_t x = 0; x < curW; ++x) {
                    size_t j = (size_t)y * curW + x;
                    int a = (int)cur[j];
                    int hh = (int)(int16_t)hb.data[j];
                    int vv = (int)(int16_t)vb.data[j];
                    int dd = (int)(int16_t)db.data[j];
                    int b = a + hh;
                    int c = a + vv;
                    int d = a + dd;
                    size_t i00 = (size_t)(y*2) * parentW + (x*2);
                    parent[i00] = (uint16_t)a;
                    parent[i00+1] = clamp16(b);
                    parent[i00 + parentW] = clamp16(c);
                    parent[i00 + parentW + 1] = clamp16(d);
                }
            }
        }
        cur = std::move(parent);
        curW = parentW; curH = parentH;
    }
    if (curW != orig_w || curH != orig_h) {
        if (cur.size() != (size_t)orig_w * orig_h) {
            if (curW >= orig_w && curH >= orig_h) {
                std::vector<uint16_t> cropped((size_t)orig_w * orig_h);
                for (uint32_t y=0;y<orig_h;++y) for(uint32_t x=0;x<orig_w;++x) cropped[y*orig_w+x]=cur[y*curW+x];
                return cropped;
            }
        }
    }
    return cur;
}

} // namespace prism::codec
