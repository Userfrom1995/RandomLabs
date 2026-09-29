#include "prism/bitstream.h"
#include <cstring>

namespace prism {

void BitWriter::ensure(size_t bits) {
    size_t need_bytes = (bit_pos_ + bits + 7) / 8;
    if (buf_.size() < need_bytes) buf_.resize(need_bytes, 0);
}

void BitWriter::write_bits(uint32_t bits, int n) {
    if (n <= 0 || n > 32) throw std::invalid_argument("write_bits n");
    ensure(n);
    for (int i = 0; i < n; ++i) {
        bool b = (bits >> i) & 1u;
        size_t byte_idx = bit_pos_ / 8;
        int bit_idx = bit_pos_ % 8;
        if (b) buf_[byte_idx] |= (1u << bit_idx);
        else buf_[byte_idx] &= ~(1u << bit_idx);
        bit_pos_++;
    }
}

void BitWriter::write_u8(uint8_t v) {
    align_to_byte();
    ensure(8);
    size_t idx = bit_pos_ / 8;
    if (idx >= buf_.size()) buf_.resize(idx + 1, 0);
    buf_[idx] = v;
    bit_pos_ += 8;
}

void BitWriter::write_u16_le(uint16_t v) {
    write_u8(uint8_t(v & 0xFF));
    write_u8(uint8_t((v >> 8) & 0xFF));
}

void BitWriter::write_u32_le(uint32_t v) {
    write_u8(uint8_t(v & 0xFF));
    write_u8(uint8_t((v >> 8) & 0xFF));
    write_u8(uint8_t((v >> 16) & 0xFF));
    write_u8(uint8_t((v >> 24) & 0xFF));
}

void BitWriter::align_to_byte() {
    if (bit_pos_ % 8 != 0) {
        bit_pos_ = (bit_pos_ + 7) & ~size_t(7);
    }
}

std::vector<uint8_t> BitWriter::flush() {
    align_to_byte();
    buf_.resize((bit_pos_ + 7) / 8);
    return buf_;
}

// BitReader
BitReader::BitReader(const uint8_t* data, size_t len_bytes) : data_(data), len_(len_bytes) {}

uint32_t BitReader::read_bits(int n) {
    if (n <= 0 || n > 32) throw std::invalid_argument("read_bits n");
    if (bit_pos_ + (size_t)n > len_ * 8) throw std::runtime_error("BitReader: out of bits");
    uint32_t out = 0;
    for (int i = 0; i < n; ++i) {
        size_t byte_idx = bit_pos_ / 8;
        int bit_idx = bit_pos_ % 8;
        bool b = (data_[byte_idx] >> bit_idx) & 1u;
        if (b) out |= (1u << i);
        bit_pos_++;
    }
    return out;
}

uint8_t BitReader::read_u8() {
    align_to_byte();
    if (bit_pos_ / 8 >= len_) throw std::runtime_error("BitReader: out of bytes");
    uint8_t v = data_[bit_pos_ / 8];
    bit_pos_ += 8;
    return v;
}

uint16_t BitReader::read_u16_le() {
    uint8_t lo = read_u8();
    uint8_t hi = read_u8();
    return uint16_t(lo) | (uint16_t(hi) << 8);
}

uint32_t BitReader::read_u32_le() {
    uint8_t b0 = read_u8();
    uint8_t b1 = read_u8();
    uint8_t b2 = read_u8();
    uint8_t b3 = read_u8();
    return uint32_t(b0) | (uint32_t(b1) << 8) | (uint32_t(b2) << 16) | (uint32_t(b3) << 24);
}

bool BitReader::eof() const { return bit_pos_ >= len_ * 8; }

size_t BitReader::bits_remaining() const {
    if (bit_pos_ >= len_ * 8) return 0;
    return len_ * 8 - bit_pos_;
}

void BitReader::align_to_byte() {
    if (bit_pos_ % 8 != 0) {
        bit_pos_ = (bit_pos_ + 7) & ~size_t(7);
    }
}

} // namespace prism
