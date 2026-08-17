//! Obsidian: a from-scratch lossless image codec.
//!
//! The codec is a strict pipeline of integer bijections: a reversible color
//! transform, a predictor bank with a per-context predictor map, a gradient +
//! activity context model, a signed zigzag residual mapping, and adaptive or
//! static rANS entropy coding. Every stage is exactly invertible, and the
//! container carries a CRC over the raw channel planes so decode output is
//! machine-verified bit-exact.
//!
//! See `docs/algorithmic-spec.md` and `docs/architecture.md` for the full
//! specification. This crate is intentionally zero-dependency (std only).

pub mod color;
pub mod context;
pub mod crc32;
pub mod decoder;
pub mod encoder;
pub mod error;
pub mod header;
pub mod image;
pub mod model;
pub mod ppm;
pub mod predict;
pub mod rans;

pub use decoder::decode;
pub use encoder::{encode, roundtrip, fuzz_gate, EncodeStats};
pub use error::CodecError;
pub use image::{Channels, Image};
