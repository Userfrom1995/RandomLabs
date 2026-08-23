#include "prism/codec/squeeze.h"
#include <stdexcept>

namespace prism::codec {

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

SqueezeResult squeeze_encode_plane(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h, uint8_t levels, uint8_t bit_depth) {
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
    struct HFTriple { std::vector<uint16_t> h, v, d; };
    std::vector<HFTriple> hfs;
    std::vector<uint32_t> hf_ws, hf_hs;
    std::vector<uint16_t> cur = plane;
    uint32_t curW = w, curH = h;
    for (uint8_t lvl = 0; lvl < levels; ++lvl) {
        if ((curW & 1) || (curH & 1)) break;
        uint32_t w2 = curW / 2;
        uint32_t h2 = curH / 2;
        if (w2 == 0 || h2 == 0) break;
        std::vector<uint16_t> ll(w2 * h2);
        std::vector<uint16_t> hfH(w2 * h2), hfV(w2 * h2), hfD(w2 * h2);
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
                ll[y * w2 + x] = (uint16_t)a;
                int hh = b - a;
                int vv = c - a;
                int dd = d - a;
                hfH[y * w2 + x] = (uint16_t)(int16_t)hh;
                hfV[y * w2 + x] = (uint16_t)(int16_t)vv;
                hfD[y * w2 + x] = (uint16_t)(int16_t)dd;
            }
        }
        hfs.push_back({hfH, hfV, hfD});
        hf_ws.push_back(w2); hf_hs.push_back(h2);
        cur = std::move(ll);
        curW = w2; curH = h2;
    }
    uint8_t effLevels = (uint8_t)hfs.size();
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
        uint32_t w2 = hf_ws[lvl]; uint32_t h2 = hf_hs[lvl];
        uint8_t lvlTag = (uint8_t)lvl;
        SqueezeResult::Band hb; hb.w=w2; hb.h=h2; hb.data=hfs[lvl].h; hb.band_class=(uint8_t)((lvlTag<<2)|1); res.bands.push_back(std::move(hb));
        SqueezeResult::Band vb; vb.w=w2; vb.h=h2; vb.data=hfs[lvl].v; vb.band_class=(uint8_t)((lvlTag<<2)|2); res.bands.push_back(std::move(vb));
        SqueezeResult::Band db; db.w=w2; db.h=h2; db.data=hfs[lvl].d; db.band_class=(uint8_t)((lvlTag<<2)|3); res.bands.push_back(std::move(db));
    }
    return res;
}

std::vector<uint16_t> squeeze_decode_plane(const SqueezeResult& sr, uint32_t orig_w, uint32_t orig_h) {
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
        std::vector<uint16_t> parent(parentW * parentH);
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
                parent[i00+1] = (uint16_t)(b<0?0:(b>65535?65535:b));
                parent[i00 + parentW] = (uint16_t)(c<0?0:(c>65535?65535:c));
                parent[i00 + parentW + 1] = (uint16_t)(d<0?0:(d>65535?65535:d));
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
