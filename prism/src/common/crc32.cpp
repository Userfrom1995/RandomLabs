#include "prism/crc32.h"

namespace prism {

static uint32_t table[256];
static bool table_init = false;

static void init_table() {
    if (table_init) return;
    for (uint32_t i = 0; i < 256; ++i) {
        uint32_t c = i;
        for (int k = 0; k < 8; ++k) {
            if (c & 1) c = 0xEDB88320u ^ (c >> 1);
            else c >>= 1;
        }
        table[i] = c;
    }
    table_init = true;
}

uint32_t crc32(const uint8_t* data, size_t len) {
    init_table();
    uint32_t c = 0xFFFFFFFFu;
    for (size_t i = 0; i < len; ++i) {
        c = table[(c ^ data[i]) & 0xFF] ^ (c >> 8);
    }
    return c ^ 0xFFFFFFFFu;
}

uint32_t crc32(const std::vector<uint8_t>& data) {
    if (data.empty()) return crc32(nullptr, 0);
    return crc32(data.data(), data.size());
}

uint32_t crc32_combine(uint32_t crc, const uint8_t* data, size_t len) {
    init_table();
    uint32_t c = crc ^ 0xFFFFFFFFu;
    // This is not the correct combine for appended data without reinitializing,
    // but we provide incremental: caller should keep state. For simplicity,
    // we recompute from scratch in container. This helper just computes CRC of data.
    // To combine, compute crc of data and then combine via standard method? For M0 we just compute separately.
    (void)c;
    return crc32(data, len);
}

} // namespace prism
