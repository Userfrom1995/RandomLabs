#include "prism/frontend/tiff_wrapper.h"
#include "prism/frontend/stb_image_wrapper.h"
#include <fstream>
namespace prism::frontend {
#ifdef PRISM_WITH_TIFF
#include <tiffio.h>
#include <cstring>
struct MemTIFF { const uint8_t* data; size_t len; size_t pos; };
static tsize_t mem_read(thandle_t h, tdata_t buf, tsize_t s){ auto* m=(MemTIFF*)h; size_t rem=m->len-m->pos; if(s>rem) s=(tsize_t)rem; memcpy(buf,m->data+m->pos,s); m->pos+=s; return s; }
static tsize_t mem_write(thandle_t, tdata_t, tsize_t){ return 0; }
static toff_t mem_seek(thandle_t h, toff_t off, int wh){ auto* m=(MemTIFF*)h; if(wh==SEEK_SET) m->pos=off; else if(wh==SEEK_CUR) m->pos+=off; else m->pos=m->len+off; if(m->pos>m->len) m->pos=m->len; return (toff_t)m->pos; }
static int mem_close(thandle_t){ return 0; }
static toff_t mem_size(thandle_t h){ return (toff_t)((MemTIFF*)h)->len; }
static int mem_map(thandle_t, tdata_t*, toff_t*){ return 0; }
static void mem_unmap(thandle_t, tdata_t, toff_t){}
Raster decode_tiff_mem(const uint8_t* data, size_t len){
    MemTIFF mem{data,len,0};
    TIFF* tif=TIFFClientOpen("mem","r",(thandle_t)&mem,mem_read,mem_write,mem_seek,mem_close,mem_size,mem_map,mem_unmap);
    if(!tif) throw DecodeError("TIFFClientOpen failed");
    uint32_t w=0,h=0; uint16_t spp=0,bps=0,photometric=0;
    TIFFGetField(tif,TIFFTAG_IMAGEWIDTH,&w);
    TIFFGetField(tif,TIFFTAG_IMAGELENGTH,&h);
    TIFFGetFieldDefaulted(tif,TIFFTAG_SAMPLESPERPIXEL,&spp);
    TIFFGetFieldDefaulted(tif,TIFFTAG_BITSPERSAMPLE,&bps);
    TIFFGetFieldDefaulted(tif,TIFFTAG_PHOTOMETRIC,&photometric);
    if(w==0||h==0){ TIFFClose(tif); throw DecodeError("TIFF zero dims"); }
    if(bps!=8 && bps!=16){ TIFFClose(tif); throw DecodeError("TIFF bps unsupported (need 8/16)"); }
    BitDepth bd=(bps==16?BitDepth::BD16:BitDepth::BD8);
    Channels ch=Channels::RGB;
    if(spp==1) ch=Channels::GRAY; else if(spp==3) ch=Channels::RGB; else if(spp==4) ch=Channels::RGBA; else { TIFFClose(tif); throw DecodeError("TIFF spp unsupported"); }
    Raster r(w,h,ch,bd);
    size_t n=(size_t)w*h;
    if(bps==8){
        std::vector<uint8_t> buf(n*spp);
        for(uint32_t row=0; row<h; ++row){ if(TIFFReadScanline(tif, buf.data()+row*w*spp, row, 0)<0){TIFFClose(tif); throw DecodeError("TIFFReadScanline failed");}}
        for(uint32_t y=0;y<h;++y) for(uint32_t x=0;x<w;++x) for(uint16_t c=0;c<spp;++c) r.planes[c][y*w+x]=buf[(y*w+x)*spp+c];
    } else {
        std::vector<uint16_t> buf(n*spp);
        for(uint32_t row=0; row<h; ++row){ if(TIFFReadScanline(tif, buf.data()+row*w*spp, row, 0)<0){TIFFClose(tif); throw DecodeError("TIFFReadScanline failed");}}
        for(uint32_t y=0;y<h;++y) for(uint32_t x=0;x<w;++x) for(uint16_t c=0;c<spp;++c) r.planes[c][y*w+x]=buf[(y*w+x)*spp+c];
    }
    TIFFClose(tif);
    return r;
}
Raster decode_tiff(const std::filesystem::path& p){
    std::ifstream f(p,std::ios::binary);
    if(!f) throw DecodeError("cannot open "+p.string());
    std::vector<uint8_t> d((std::istreambuf_iterator<char>(f)),std::istreambuf_iterator<char>());
    return decode_tiff_mem(d.data(), d.size());
}
#else
Raster decode_tiff_mem(const uint8_t* data, size_t len){ return decode_stb_mem(data,len,".tiff"); }
Raster decode_tiff(const std::filesystem::path& p){
    try { return decode_stb(p); } catch(const DecodeError&){
        throw DecodeError("TIFF decode not enabled (build with -DPRISM_WITH_TIFF=ON and libtiff)");
    }
}
#endif
}
