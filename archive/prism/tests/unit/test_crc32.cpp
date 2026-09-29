#include <gtest/gtest.h>
#include "prism/crc32.h"

TEST(CRC32, Known) {
    std::vector<uint8_t> data{'1','2','3','4','5','6','7','8','9'};
    EXPECT_EQ(prism::crc32(data), 0xCBF43926u);
    EXPECT_EQ(prism::crc32(nullptr,0), 0u);
}
TEST(CRC32, Empty) {
    EXPECT_EQ(prism::crc32(std::vector<uint8_t>{}), 0u);
}
