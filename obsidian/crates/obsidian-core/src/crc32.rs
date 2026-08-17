//! CRC-32 (IEEE 802.3, reflected polynomial 0xEDB88320), table-driven.
//!
//! Matches `zlib.crc32`, `cksum`, and `pngcrush` conventions so the tester can
//! cross-check with `python3 -c 'import zlib; ...'`.

const POLY: u32 = 0xEDB8_8320;

static TABLE: [u32; 256] = build_table();

const fn build_table() -> [u32; 256] {
    let mut table = [0u32; 256];
    let mut i = 0;
    while i < 256 {
        let mut c = i as u32;
        let mut k = 0;
        while k < 8 {
            c = if c & 1 != 0 { POLY ^ (c >> 1) } else { c >> 1 };
            k += 1;
        }
        table[i] = c;
        i += 1;
    }
    table
}

/// Standard one-shot CRC-32 over `data`.
pub fn crc32(data: &[u8]) -> u32 {
    let mut c: u32 = 0xFFFF_FFFF;
    for b in data {
        c = TABLE[((c ^ (*b as u32)) & 0xFF) as usize] ^ (c >> 8);
    }
    c ^ 0xFFFF_FFFF
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_vectors() {
        assert_eq!(crc32(b""), 0);
        assert_eq!(crc32(b"123456789"), 0xCBF4_3926);
        // The classic "check value" (CRC of "123456789") is 0xCBF43926.
    }

    #[test]
    fn zlib_agreement() {
        // Cross-check against zlib's crc32 for a pseudo-random-ish payload.
        let data: Vec<u8> = (0..4096u32).map(|i| (i.wrapping_mul(31) & 0xFF) as u8).collect();
        let ours = crc32(&data);
        // Reference from zlib (python3 -c 'import zlib; print(hex(zlib.crc32(data)))')
        // computed once below and pinned.
        assert_eq!(ours, 0x06BE_AFD4);
    }
}
