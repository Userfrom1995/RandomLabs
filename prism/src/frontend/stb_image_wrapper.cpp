#define STB_IMAGE_IMPLEMENTATION
#include "prism/frontend/stb_image_wrapper.h"
#include "prism/types.h"
#include "../../third_party/stb_image.h"
#include <fstream>

namespace prism::frontend {

Raster decode_stb_mem(const uint8_t* data, size_t len, const std::string&) {
    int w=0,h=0,comp=0;
    // force 3 or 4? Keep original channels but stb_image loads as 1..4. We'll request 0 (keep).
    unsigned char* img = stbi_load_from_memory(data, (int)len, &w, &h, &comp, 0);
    if (!img) throw DecodeError(std::string("stb_image: ")+stbi_failure_reason());
    // 8-bit only via stb_image
    Channels ch;
    if (comp==1) ch=Channels::GRAY;
    else if (comp==2) ch=Channels::GA;
    else if (comp==3) ch=Channels::RGB;
    else if (comp==4) ch=Channels::RGBA;
    else { stbi_image_free(img); throw DecodeError("stb_image: bad comp"); }
    Raster r((uint32_t)w,(uint32_t)h,ch,BitDepth::BD8);
    size_t n=(size_t)w*h;
    for (int c=0;c<comp;++c){
        for (size_t i=0;i<n;++i){
            r.planes[c][i]=img[i*comp + c];
        }
    }
    stbi_image_free(img);
    return r;
}

Raster decode_stb(const std::filesystem::path& p){
    std::ifstream f(p, std::ios::binary);
    if (!f) throw DecodeError("cannot open "+p.string());
    std::vector<uint8_t> data((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
    return decode_stb_mem(data.data(), data.size(), p.extension().string());
}

} // namespace prism::frontend
