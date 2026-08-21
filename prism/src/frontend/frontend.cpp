#include "prism/frontend/frontend.h"
#include "prism/frontend/ppm_raw.h"
#include "prism/frontend/stb_image_wrapper.h"
#include <algorithm>
#include <fstream>

namespace prism::frontend {

static std::string lower_ext(const std::filesystem::path& p){
    auto e=p.extension().string();
    for(char& c:e) c=std::tolower((unsigned char)c);
    return e;
}

Raster decode_to_raster(const std::filesystem::path& in, const DecodeOpts&){
    std::string ext=lower_ext(in);
    if (ext==".ppm"||ext==".pgm"||ext==".pnm"){
        return decode_ppm(in);
    }
    if (ext==".png"||ext==".jpg"||ext==".jpeg"||ext==".bmp"||ext==".tga"||ext==".hdr"){
        return decode_stb(in);
    }
    if (ext==".webp"){
        throw DecodeError("WebP decode not enabled (build with PRISM_WITH_WEBP)");
    }
    if (ext==".tiff"||ext==".tif"){
        throw DecodeError("TIFF decode not enabled (build with PRISM_WITH_TIFF)");
    }
    // Try stb as fallback, then ppm
    try { return decode_stb(in); } catch(...){}
    return decode_ppm(in);
}

void write_ppm(const std::filesystem::path& out, const Raster& r){
    std::vector<uint8_t> buf;
    write_ppm_to_vec(buf, r);
    std::ofstream f(out, std::ios::binary);
    if (!f) throw std::runtime_error("cannot write "+out.string());
    f.write((char*)buf.data(), buf.size());
}

void write_ppm_to_vec(std::vector<uint8_t>& out, const Raster& r){
    // P6 for RGB/RGBA (alpha dropped), P5 for gray
    uint32_t maxv = (r.bd==BitDepth::BD16)?65535:255;
    if (r.ch==Channels::GRAY){
        out.clear();
        std::string hdr="P5\n"+std::to_string(r.w)+" "+std::to_string(r.h)+"\n"+std::to_string(maxv)+"\n";
        out.insert(out.end(), hdr.begin(), hdr.end());
        if (r.bd==BitDepth::BD8){
            for (uint32_t y=0;y<r.h;++y) for(uint32_t x=0;x<r.w;++x) out.push_back((uint8_t)r.at(0,x,y));
        } else {
            for (uint32_t y=0;y<r.h;++y) for(uint32_t x=0;x<r.w;++x){
                uint16_t v=r.at(0,x,y);
                out.push_back(uint8_t(v>>8)); out.push_back(uint8_t(v&0xFF));
            }
        }
    } else {
        // RGB
        out.clear();
        std::string hdr="P6\n"+std::to_string(r.w)+" "+std::to_string(r.h)+"\n"+std::to_string(maxv)+"\n";
        out.insert(out.end(), hdr.begin(), hdr.end());
        uint32_t channels = (r.ch==Channels::RGBA?3: (uint32_t)r.num_channels());
        if (channels>3) channels=3;
        // For GA, expand? Just write gray as RGB
        if (r.bd==BitDepth::BD8){
            for (uint32_t y=0;y<r.h;++y) for(uint32_t x=0;x<r.w;++x){
                if (r.ch==Channels::GA){
                    uint8_t g=(uint8_t)r.at(0,x,y);
                    out.push_back(g); out.push_back(g); out.push_back(g);
                } else {
                    for(uint32_t c=0;c<channels;++c) out.push_back((uint8_t)r.at(c,x,y));
                    for(uint32_t c=channels;c<3;++c) out.push_back(0);
                }
            }
        } else {
            for (uint32_t y=0;y<r.h;++y) for(uint32_t x=0;x<r.w;++x){
                if (r.ch==Channels::GA){
                    uint16_t g=r.at(0,x,y);
                    for(int i=0;i<3;++i){ out.push_back(uint8_t(g>>8)); out.push_back(uint8_t(g&0xFF)); }
                } else {
                    for(uint32_t c=0;c<channels;++c){ uint16_t v=r.at(c,x,y); out.push_back(uint8_t(v>>8)); out.push_back(uint8_t(v&0xFF)); }
                    for(uint32_t c=channels;c<3;++c){ out.push_back(0); out.push_back(0); }
                }
            }
        }
    }
}

} // namespace prism::frontend
