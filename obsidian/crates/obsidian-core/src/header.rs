//! Container header: magic, flags, dimensions, and the raw-plane CRC.

use crate::error::CodecError;
use crate::image::Channels;
use std::io::{Read, Write};

pub const MAGIC: [u8; 4] = *b"OBSD";
pub const VERSION: u8 = 1;
pub const BIT_DEPTH: u8 = 8;

/// Header field offsets (little-endian integers except the rANS trailing
/// state, which is big-endian by spec).
pub const HEADER_LEN: usize = 20;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Header {
    pub flags: u8,
    pub effort: u8,
    pub width: u32,
    pub height: u32,
    pub crc32: u32,
}

impl Header {
    pub fn channels(&self) -> Result<Channels, CodecError> {
        Channels::from_u8(self.flags & 0x03)
            .ok_or_else(|| CodecError::InvalidStream("bad channel field in flags".into()))
    }

    pub fn transform_flag(&self) -> bool {
        self.flags & 0x04 != 0
    }

    pub fn palette_flag(&self) -> bool {
        self.flags & 0x08 != 0
    }

    pub fn effort_ok(&self) -> bool {
        self.effort <= 7
    }

    pub fn read(r: &mut impl Read) -> Result<Header, CodecError> {
        let mut buf = [0u8; HEADER_LEN];
        r.read_exact(&mut buf)
            .map_err(|_| CodecError::InvalidStream("truncated header".into()))?;
        if buf[0..4] != MAGIC {
            return Err(CodecError::InvalidStream("bad magic".into()));
        }
        if buf[4] != VERSION {
            return Err(CodecError::InvalidStream(format!(
                "unsupported version {}",
                buf[4]
            )));
        }
        if buf[6] != BIT_DEPTH {
            return Err(CodecError::InvalidStream(format!(
                "unsupported bit depth {}",
                buf[6]
            )));
        }
        let width = u32::from_le_bytes([buf[8], buf[9], buf[10], buf[11]]);
        let height = u32::from_le_bytes([buf[12], buf[13], buf[14], buf[15]]);
        if width == 0 || height == 0 {
            return Err(CodecError::InvalidStream("zero dimensions".into()));
        }
        let crc32 = u32::from_le_bytes([buf[16], buf[17], buf[18], buf[19]]);
        let header = Header {
            flags: buf[5],
            effort: buf[7],
            width,
            height,
            crc32,
        };
        if !header.effort_ok() {
            return Err(CodecError::InvalidStream(format!(
                "effort {} out of range",
                header.effort
            )));
        }
        header.channels()?;
        Ok(header)
    }

    pub fn write(&self, w: &mut impl Write) -> Result<(), CodecError> {
        let mut buf = [0u8; HEADER_LEN];
        buf[0..4].copy_from_slice(&MAGIC);
        buf[4] = VERSION;
        buf[5] = self.flags;
        buf[6] = BIT_DEPTH;
        buf[7] = self.effort;
        buf[8..12].copy_from_slice(&self.width.to_le_bytes());
        buf[12..16].copy_from_slice(&self.height.to_le_bytes());
        buf[16..20].copy_from_slice(&self.crc32.to_le_bytes());
        w.write_all(&buf)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn roundtrip() {
        let h = Header {
            flags: 0x05,
            effort: 4,
            width: 768,
            height: 512,
            crc32: 0x1234_5678,
        };
        let mut bytes = Vec::new();
        h.write(&mut bytes).unwrap();
        assert_eq!(bytes.len(), HEADER_LEN);
        let mut cur = Cursor::new(bytes);
        let back = Header::read(&mut cur).unwrap();
        assert_eq!(h, back);
    }

    #[test]
    fn rejects_invalid() {
        let mut cur = Cursor::new(vec![0u8; HEADER_LEN]);
        assert!(Header::read(&mut cur).is_err());
        let mut bytes = Vec::new();
        let h = Header {
            flags: 0,
            effort: 9,
            width: 1,
            height: 1,
            crc32: 0,
        };
        h.write(&mut bytes).unwrap();
        assert!(Header::read(&mut Cursor::new(bytes)).is_err());
    }
}
