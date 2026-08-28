#include "prism/frontend/ppm_raw.h"
#include "prism/types.h"
#include <fstream>
#include <sstream>
#include <cctype>

namespace prism::frontend {

static bool is_space(char c){ return c==' '||c=='\n'||c=='\r'||c=='\t'; }

static void skip_ws_and_comments(const uint8_t* data, size_t len, size_t& pos){
    while (pos < len){
        if (data[pos]=='#'){
            while (pos<len && data[pos]!='\n') pos++;
        } else if (is_space((char)data[pos])) pos++;
        else break;
    }
}
static std::string read_token(const uint8_t* data, size_t len, size_t& pos){
    skip_ws_and_comments(data,len,pos);
    std::string t;
    while (pos<len && !is_space((char)data[pos]) && data[pos]!='#'){
        t.push_back((char)data[pos++]);
    }
    return t;
}

Raster decode_ppm_mem(const uint8_t* data, size_t len){
    size_t pos=0;
    std::string magic = read_token(data,len,pos);
    if (magic!="P6" && magic!="P5" && magic!="P3") throw DecodeError("PPM: bad magic "+magic);
    bool is_p5 = (magic=="P5");
    bool is_p3 = (magic=="P3");
    std::string ws = read_token(data,len,pos);
    std::string hs = read_token(data,len,pos);
    std::string maxs = read_token(data,len,pos);
    if (ws.empty()||hs.empty()||maxs.empty()) throw DecodeError("PPM: truncated header");
    uint32_t w = std::stoul(ws);
    uint32_t h = std::stoul(hs);
    uint32_t maxv = std::stoul(maxs);
    if (w==0||h==0) throw DecodeError("PPM: zero dimension");
    if (maxv==0||maxv>65535) throw DecodeError("PPM: bad maxval");
    BitDepth bd = (maxv > 255) ? BitDepth::BD16 : BitDepth::BD8;
    Channels ch = is_p5 ? Channels::GRAY : Channels::RGB;
    // After header, single whitespace
    if (!is_p3){
        // skip single whitespace byte
        if (pos < len && is_space((char)data[pos])) pos++;
        size_t need = (size_t)w*h * (is_p5?1:3) * (bd==BitDepth::BD16?2:1);
        if (pos + need > len) throw DecodeError("PPM: truncated data");
        Raster r(w,h,ch,bd);
        if (bd==BitDepth::BD8){
            if (is_p5){
                for (size_t i=0;i<(size_t)w*h;++i) r.planes[0][i]=data[pos++];
            } else {
                for (size_t i=0;i<(size_t)w*h;++i){
                    r.planes[0][i]=data[pos++];
                    r.planes[1][i]=data[pos++];
                    r.planes[2][i]=data[pos++];
                }
            }
        } else {
            // 16-bit big endian
            auto read16 = [&]()->uint16_t{
                uint16_t v = (uint16_t(data[pos])<<8) | data[pos+1]; pos+=2; return v;
            };
            if (is_p5){
                for (size_t i=0;i<(size_t)w*h;++i) r.planes[0][i]=read16();
            } else {
                for (size_t i=0;i<(size_t)w*h;++i){
                    r.planes[0][i]=read16();
                    r.planes[1][i]=read16();
                    r.planes[2][i]=read16();
                }
            }
        }
        return r;
    } else {
        // P3 ascii
        Raster r(w,h,ch,bd);
        for (size_t i=0;i<(size_t)w*h;++i){
            for (int c=0;c<3;++c){
                std::string tok = read_token(data,len,pos);
                if (tok.empty()) throw DecodeError("PPM P3 truncated");
                r.planes[c][i]=(uint16_t)std::stoul(tok);
            }
        }
        return r;
    }
}

Raster decode_ppm(const std::filesystem::path& p){
    std::ifstream f(p, std::ios::binary);
    if (!f) throw DecodeError("cannot open "+p.string());
    std::vector<uint8_t> data((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
    return decode_ppm_mem(data.data(), data.size());
}

bool is_ppm_path(const std::filesystem::path& p){
    auto ext = p.extension().string();
    for(char& c: ext) c=tolower(c);
    return ext==".ppm"||ext==".pgm"||ext==".pnm";
}

Raster decode_raw(const std::vector<uint8_t>& bytes, uint32_t w, uint32_t h, uint8_t channels, uint8_t bd){
    BitDepth bdd = (bd==16)?BitDepth::BD16:BitDepth::BD8;
    Channels ch = static_cast<Channels>(channels);
    Raster r(w,h,ch,bdd);
    size_t need = (size_t)w*h*channels*(bd==16?2:1);
    if (bytes.size() < need) throw DecodeError("raw: truncated");
    if (bd==8){
        for (size_t c=0;c<channels;++c){
            for (size_t i=0;i<(size_t)w*h;++i){
                r.planes[c][i]=bytes[i*channels + c];
            }
        }
    } else {
        for (size_t i=0;i<(size_t)w*h;++i){
            for (size_t c=0;c<channels;++c){
                size_t off = (i*channels + c)*2;
                uint16_t v = (uint16_t(bytes[off])<<8)|bytes[off+1];
                r.planes[c][i]=v;
            }
        }
    }
    return r;
}

void write_ppm_to_vec(std::vector<uint8_t>& out, const Raster& r);

} // namespace prism::frontend
