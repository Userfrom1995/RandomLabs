#include "prism/frontend/webp_wrapper.h"
#include "prism/frontend/stb_image_wrapper.h"
#include <fstream>
namespace prism::frontend {
#ifdef PRISM_WITH_WEBP
#include <webp/decode.h>
Raster decode_webp_mem(const uint8_t* data, size_t len) {
    int w=0,h=0;
    if (!WebPGetInfo(data, len, &w, &h)) throw DecodeError("WebPGetInfo failed");
    uint8_t* out = WebPDecodeRGB(data, len, &w, &h);
    if (!out) throw DecodeError("WebPDecodeRGB failed");
    Raster r((uint32_t)w,(uint32_t)h,Channels::RGB,BitDepth::BD8);
    size_t n=(size_t)w*h;
    for(size_t i=0;i<n;++i){ r.planes[0][i]=out[i*3]; r.planes[1][i]=out[i*3+1]; r.planes[2][i]=out[i*3+2]; }
    WebPFree(out);
    return r;
}
Raster decode_webp(const std::filesystem::path& p){
    std::ifstream f(p,std::ios::binary);
    if(!f) throw DecodeError("cannot open "+p.string());
    std::vector<uint8_t> d((std::istreambuf_iterator<char>(f)),std::istreambuf_iterator<char>());
    // try stb first (stb may handle webp if compiled with it), fallback to libwebp
    try { return decode_stb_mem(d.data(), d.size(), ".webp"); } catch(...){}
    return decode_webp_mem(d.data(), d.size());
}
#else
Raster decode_webp_mem(const uint8_t* data, size_t len) {
    // fallback via stb_image (if stb was built with webp support it will succeed)
    return decode_stb_mem(data,len,".webp");
}
Raster decode_webp(const std::filesystem::path& p) {
    std::string lower=p.extension().string();
    for(char& c:lower) c=std::tolower((unsigned char)c);
    if(lower==".webp"){
        // try stb, then informative error
        try { return decode_stb(p); } catch(const DecodeError&){
            throw DecodeError("WebP decode not enabled (build with -DPRISM_WITH_WEBP=ON and libwebp)");
        }
    }
    return decode_stb(p);
}
#endif
}
