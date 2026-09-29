#include <gtest/gtest.h>
#include "prism/bitstream.h"

TEST(Bitstream, RoundTrip) {
    prism::BitWriter bw;
    bw.write_bits(0b101, 3);
    bw.write_u16_le(0x1234);
    bw.write_u32_le(0xDEADBEEF);
    bw.write_bits(1, 1);
    auto bytes = bw.flush();
    prism::BitReader br(bytes);
    EXPECT_EQ(br.read_bits(3), 0b101u);
    EXPECT_EQ(br.read_u16_le(), 0x1234u);
    EXPECT_EQ(br.read_u32_le(), 0xDEADBEEFu);
    EXPECT_EQ(br.read_bits(1), 1u);
}

TEST(Bitstream, ByteAlign) {
    prism::BitWriter bw;
    bw.write_bits(1,1);
    bw.write_u8(0xAB);
    auto bytes=bw.flush();
    EXPECT_EQ(bytes.size(), 2u);
    prism::BitReader br(bytes);
    EXPECT_EQ(br.read_bits(1), 1u);
    EXPECT_EQ(br.read_u8(), 0xABu);
}
