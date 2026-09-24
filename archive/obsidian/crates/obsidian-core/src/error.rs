use std::fmt;

/// Errors produced by the codec. The decode path never panics; every failure
/// surfaces as a `CodecError`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CodecError {
    InvalidImage(String),
    InvalidStream(String),
    CrcMismatch,
    Io(String),
}

impl fmt::Display for CodecError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CodecError::InvalidImage(m) => write!(f, "invalid image: {m}"),
            CodecError::InvalidStream(m) => write!(f, "invalid stream: {m}"),
            CodecError::CrcMismatch => write!(f, "CRC mismatch: decoded planes differ from header"),
            CodecError::Io(m) => write!(f, "i/o error: {m}"),
        }
    }
}

impl std::error::Error for CodecError {}

impl From<std::io::Error> for CodecError {
    fn from(e: std::io::Error) -> Self {
        CodecError::Io(e.to_string())
    }
}
