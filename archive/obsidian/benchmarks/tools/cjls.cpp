// cjls: a minimal JPEG-LS CLI (CharLS) for the Obsidian Kodak benchmark.
// Subcommands: encode <in.ppm> <out.jls> | decode <in.jls> <out.ppm>
// Lossless only, 8-bit, RGB interleaved or gray. No interactive input.

#include <charls/charls.h>

#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <vector>
#include <string>

struct RawPpm {
    int width = 0;
    int height = 0;
    int maxval = 255;
    int comps = 3;
    std::vector<unsigned char> data;
};

static bool read_ppm(const char* path, RawPpm& out) {
    FILE* f = std::fopen(path, "rb");
    if (!f) return false;
    int c = std::fgetc(f);
    if (c != 'P') { std::fclose(f); return false; }
    int kind = std::fgetc(f);
    if (kind != '6' && kind != '5') { std::fclose(f); return false; }
    int comps = kind == '6' ? 3 : 1;
    int w = 0, h = 0, m = 0;
    std::vector<int> nums;
    while ((int)nums.size() < 3) {
        c = std::fgetc(f);
        if (c == '#') { while (c != '\n' && c != EOF) c = std::fgetc(f); continue; }
        if (c == EOF) { std::fclose(f); return false; }
        if (c >= '0' && c <= '9') {
            int v = 0;
            while (c >= '0' && c <= '9') { v = v * 10 + (c - '0'); c = std::fgetc(f); }
            nums.push_back(v);
            if (c == '#') { while (c != '\n' && c != EOF) c = std::fgetc(f); }
        }
    }
    w = nums[0]; h = nums[1]; m = nums[2];
    if (w == 0 || h == 0 || m != 255) { std::fclose(f); return false; }
    out.width = w;
    out.height = h;
    out.maxval = m;
    out.comps = comps;
    out.data.resize((size_t)w * h * comps);
    size_t got = std::fread(out.data.data(), 1, out.data.size(), f);
    std::fclose(f);
    return got == out.data.size();
}

static bool write_ppm(const char* path, int w, int h, int comps, const unsigned char* data) {
    FILE* f = std::fopen(path, "wb");
    if (!f) return false;
    if (comps == 3) std::fprintf(f, "P6\n%d %d\n255\n", w, h);
    else std::fprintf(f, "P5\n%d %d\n255\n", w, h);
    std::fwrite(data, 1, (size_t)w * h * comps, f);
    std::fclose(f);
    return true;
}

int main(int argc, char** argv) {
    if (argc != 4) {
        std::fprintf(stderr, "usage: cjls encode <in.ppm> <out.jls>\n");
        std::fprintf(stderr, "       cjls decode <in.jls> <out.ppm>\n");
        return 2;
    }
    std::string cmd = argv[1];
    if (cmd == "encode") {
        RawPpm in;
        if (!read_ppm(argv[2], in)) { std::fprintf(stderr, "cjls: bad PPM %s\n", argv[2]); return 3; }
try {
            charls::frame_info frame{static_cast<uint32_t>(in.width), static_cast<uint32_t>(in.height),
                                     static_cast<uint32_t>(in.maxval > 255 ? 16 : 8),
                                     static_cast<uint32_t>(in.comps)};
            if (in.comps == 3) {
                charls::jpegls_encoder encoder;
                encoder.frame_info(frame).interleave_mode(charls::interleave_mode::sample)
                    .color_transformation(charls::color_transformation::hp1);
                std::vector<unsigned char> dst(encoder.estimated_destination_size());
                encoder.destination(dst);
                size_t written = encoder.encode(in.data);
                dst.resize(written);
                FILE* f = std::fopen(argv[3], "wb");
                if (!f) { std::fprintf(stderr, "cjls: cannot write %s\n", argv[3]); return 3; }
                std::fwrite(dst.data(), 1, dst.size(), f);
                std::fclose(f);
                std::fprintf(stderr, "encoded %s -> %s (%zu bytes)\n", argv[2], argv[3], dst.size());
            } else {
                std::vector<unsigned char> dst = charls::jpegls_encoder::encode(
                    in.data, frame, charls::interleave_mode::none);
                FILE* f = std::fopen(argv[3], "wb");
                if (!f) { std::fprintf(stderr, "cjls: cannot write %s\n", argv[3]); return 3; }
                std::fwrite(dst.data(), 1, dst.size(), f);
                std::fclose(f);
                std::fprintf(stderr, "encoded %s -> %s (%zu bytes)\n", argv[2], argv[3], dst.size());
            }
        } catch (const std::exception& e) {
            std::fprintf(stderr, "cjls encode: %s\n", e.what());
            return 4;
        }
        return 0;
    } else if (cmd == "decode") {
        FILE* f = std::fopen(argv[2], "rb");
        if (!f) { std::fprintf(stderr, "cjls: cannot read %s\n", argv[2]); return 3; }
        std::vector<unsigned char> src;
        unsigned char buf[65536];
        size_t n;
        while ((n = std::fread(buf, 1, sizeof(buf), f)) > 0) src.insert(src.end(), buf, buf + n);
        std::fclose(f);
        try {
            charls::jpegls_decoder decoder{src, true};
            auto& info = decoder.frame_info();
            std::vector<unsigned char> dst = decoder.decode<std::vector<unsigned char>>();
            if (!write_ppm(argv[3], (int)info.width, (int)info.height, (int)info.component_count, dst.data())) {
                std::fprintf(stderr, "cjls: cannot write %s\n", argv[3]); return 3;
            }
            std::fprintf(stderr, "decoded %s -> %s (%dx%d)\n", argv[2], argv[3], (int)info.width, (int)info.height);
        } catch (const std::exception& e) {
            std::fprintf(stderr, "cjls decode: %s\n", e.what());
            return 4;
        }
        return 0;
    }
    std::fprintf(stderr, "cjls: unknown subcommand %s\n", cmd.c_str());
    return 2;
}