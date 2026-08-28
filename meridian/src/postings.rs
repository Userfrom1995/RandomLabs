//! Postings serialization with varint (LEB128) gap encoding.
//!
//! A postings list is stored as a byte stream:
//!
//! ```text
//! for each posting (in doc-id order):
//!   varint(doc_id - prev_doc_id)   // gap, first is doc_id itself
//!   varint(term_frequency)
//!   for each position:
//!     varint(pos - prev_pos)       // delta, first is pos itself
//! ```
//!
//! This is the classic compressed inverted-index layout: small ids compress
//! to one byte, and gaps shrink the average. The encoded stream is what gets
//! base64'd into the exported JSON and decoded by both the Rust verifier and
//! the browser mirror.

use crate::index::Posting;

/// Encodes a single unsigned integer as LEB128 varint.
pub fn encode_varint(mut v: u64) -> Vec<u8> {
    let mut out = Vec::with_capacity(5);
    loop {
        let mut byte = (v & 0x7f) as u8;
        v >>= 7;
        if v != 0 {
            byte |= 0x80;
        }
        out.push(byte);
        if v == 0 {
            break;
        }
    }
    out
}

/// Decodes one LEB128 varint, returning the value and the bytes consumed.
pub fn decode_varint(bytes: &[u8]) -> Option<(u64, usize)> {
    let mut value: u64 = 0;
    let mut shift = 0;
    for (i, &b) in bytes.iter().enumerate() {
        if shift >= 64 {
            return None;
        }
        value |= ((b & 0x7f) as u64) << shift;
        if b & 0x80 == 0 {
            return Some((value, i + 1));
        }
        shift += 7;
    }
    None
}

/// Encodes a sorted postings list into the compressed byte stream.
pub fn encode_postings(postings: &[Posting]) -> Vec<u8> {
    let mut out = Vec::new();
    let mut prev_doc = 0u64;
    for p in postings {
        let gap = (p.doc_id as u64).wrapping_sub(prev_doc);
        out.extend(encode_varint(gap));
        out.extend(encode_varint(p.tf as u64));
        let mut prev_pos = 0u64;
        for &pos in &p.positions {
            let delta = (pos as u64).wrapping_sub(prev_pos);
            out.extend(encode_varint(delta));
            prev_pos = pos as u64;
        }
        prev_doc = p.doc_id as u64;
    }
    out
}

/// Decodes a compressed byte stream back into a sorted postings list.
pub fn decode_postings(bytes: &[u8]) -> Option<Vec<Posting>> {
    let mut out = Vec::new();
    let mut i = 0usize;
    let mut prev_doc = 0u64;
    while i < bytes.len() {
        let (gap, n) = decode_varint(&bytes[i..])?;
        i += n;
        let doc_id = prev_doc.wrapping_add(gap) as usize;
        let (tf, n) = decode_varint(&bytes[i..])?;
        i += n;
        let mut positions = Vec::with_capacity(tf as usize);
        let mut prev_pos = 0u64;
        for _ in 0..tf {
            let (delta, n) = decode_varint(&bytes[i..])?;
            i += n;
            prev_pos = prev_pos.wrapping_add(delta);
            positions.push(prev_pos as u32);
        }
        out.push(Posting {
            doc_id,
            tf: tf as u32,
            positions,
        });
        prev_doc = doc_id as u64;
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn posting(doc_id: usize, tf: u32, positions: Vec<u32>) -> Posting {
        Posting {
            doc_id,
            tf,
            positions,
        }
    }

    #[test]
    fn varint_small_values() {
        assert_eq!(encode_varint(0), vec![0x00]);
        assert_eq!(encode_varint(1), vec![0x01]);
        assert_eq!(encode_varint(127), vec![0x7f]);
        assert_eq!(encode_varint(128), vec![0x80, 0x01]);
        assert_eq!(encode_varint(300), vec![0xac, 0x02]);
    }

    #[test]
    fn varint_round_trip() {
        let values = [
            0u64, 1, 127, 128, 300, 16384, 1_000_000, u32::MAX as u64, u64::MAX,
        ];
        for v in values {
            let enc = encode_varint(v);
            let (dec, n) = decode_varint(&enc).unwrap();
            assert_eq!(dec, v);
            assert_eq!(n, enc.len());
        }
    }

    #[test]
    fn postings_round_trip() {
        let postings = vec![
            posting(3, 2, vec![1, 5]),
            posting(17, 1, vec![0]),
            posting(300, 4, vec![2, 3, 9, 10]),
            posting(100_000, 3, vec![7, 8, 99]),
        ];
        let enc = encode_postings(&postings);
        let dec = decode_postings(&enc).unwrap();
        assert_eq!(dec, postings);
    }

    #[test]
    fn empty_postings() {
        let enc = encode_postings(&[]);
        assert!(enc.is_empty());
        assert_eq!(decode_postings(&enc).unwrap(), Vec::<Posting>::new());
    }

    #[test]
    fn compression_is_real_for_gaps() {
        let postings: Vec<Posting> = (0..100)
            .map(|i| posting(i * 10, 1, vec![i as u32]))
            .collect();
        let enc = encode_postings(&postings);
        assert!(enc.len() < postings.len() * 4, "gaps should shrink");
    }

    #[test]
    fn decode_rejects_truncated_stream() {
        let enc = encode_varint(200);
        assert!(decode_postings(&enc[..enc.len() - 1]).is_none());
    }
}