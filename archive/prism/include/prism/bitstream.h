#pragma once
#include <cstdint>
#include <vector>
#include <cstddef>
#include <stdexcept>
#include <string>

namespace prism {

class BitWriter {
public:
    BitWriter() = default;
    void write_bits(uint32_t bits, int n); // n in 1..32, LSB first
    void write_bit(bool b) { write_bits(b ? 1 : 0, 1); }
    void write_u8(uint8_t v);
    void write_u16_le(uint16_t v);
    void write_u32_le(uint32_t v);
    void align_to_byte(); // pad with zeros to next byte
    std::vector<uint8_t> flush(); // align and return bytes
    const std::vector<uint8_t>& bytes() const { return buf_; }
    size_t bit_pos() const { return bit_pos_; }
    size_t byte_size() const { return (bit_pos_ + 7) / 8; }
private:
    std::vector<uint8_t> buf_;
    size_t bit_pos_ = 0; // total bits written
    void ensure(size_t bits);
};

class BitReader {
public:
    explicit BitReader(const uint8_t* data, size_t len_bytes);
    explicit BitReader(const std::vector<uint8_t>& d) : BitReader(d.data(), d.size()) {}
    uint32_t read_bits(int n);
    bool read_bit() { return read_bits(1) != 0; }
    uint8_t read_u8();
    uint16_t read_u16_le();
    uint32_t read_u32_le();
    bool eof() const;
    size_t bits_remaining() const;
    size_t bit_pos() const { return bit_pos_; }
    void align_to_byte();
private:
    const uint8_t* data_;
    size_t len_;
    size_t bit_pos_ = 0;
};

inline void write_u32_le_vec(std::vector<uint8_t>& out, uint32_t v) {
    out.push_back(uint8_t(v & 0xFF));
    out.push_back(uint8_t((v >> 8) & 0xFF));
    out.push_back(uint8_t((v >> 16) & 0xFF));
    out.push_back(uint8_t((v >> 24) & 0xFF));
}
inline void write_u16_le_vec(std::vector<uint8_t>& out, uint16_t v) {
    out.push_back(uint8_t(v & 0xFF));
    out.push_back(uint8_t((v >> 8) & 0xFF));
}
inline uint32_t read_u32_le_bytes(const uint8_t* p) {
    return uint32_t(p[0]) | (uint32_t(p[1]) << 8) | (uint32_t(p[2]) << 16) | (uint32_t(p[3]) << 24);
}
inline uint16_t read_u16_le_bytes(const uint8_t* p) {
    return uint16_t(p[0]) | (uint16_t(p[1]) << 8);
}
inline void write_i16_le_vec(std::vector<uint8_t>& out, int16_t v) {
    out.push_back(uint8_t(uint16_t(v) & 0xFF));
    out.push_back(uint8_t((uint16_t(v) >> 8) & 0xFF));
}
inline int16_t read_i16_le_bytes(const uint8_t* p) {
    return int16_t(uint16_t(p[0]) | (uint16_t(p[1]) << 8));
}

} // namespace prism
