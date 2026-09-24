use crate::error::CodecError;

/// Channel layout of an image.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Channels {
    Gray = 0,
    Rgb = 1,
    Rgba = 2,
}

impl Channels {
    pub fn from_u8(v: u8) -> Option<Channels> {
        match v {
            0 => Some(Channels::Gray),
            1 => Some(Channels::Rgb),
            2 => Some(Channels::Rgba),
            _ => None,
        }
    }

    pub fn to_u8(self) -> u8 {
        match self {
            Channels::Gray => 0,
            Channels::Rgb => 1,
            Channels::Rgba => 2,
        }
    }

    pub fn plane_count(self) -> usize {
        match self {
            Channels::Gray => 1,
            Channels::Rgb => 3,
            Channels::Rgba => 4,
        }
    }
}

/// An image: channel-major byte planes.
///
/// `planes[c][y * width + x]` is the value of channel `c` at pixel `(x, y)`.
/// Every plane has exactly `width * height` bytes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Image {
    pub width: u32,
    pub height: u32,
    pub channels: Channels,
    pub planes: Vec<Vec<u8>>,
}

impl Image {
    pub fn new(width: u32, height: u32, channels: Channels) -> Result<Image, CodecError> {
        if width == 0 || height == 0 {
            return Err(CodecError::InvalidImage("zero width or height".into()));
        }
        let area = (width as usize)
            .checked_mul(height as usize)
            .ok_or_else(|| CodecError::InvalidImage("dimensions overflow".into()))?;
        let planes = vec![vec![0u8; area]; channels.plane_count()];
        Ok(Image {
            width,
            height,
            channels,
            planes,
        })
    }

    pub fn plane_count(&self) -> usize {
        self.channels.plane_count()
    }

    pub fn area(&self) -> usize {
        self.width as usize * self.height as usize
    }

    pub fn pixel(&self, c: usize, x: usize, y: usize) -> u8 {
        self.planes[c][y * self.width as usize + x]
    }

    pub fn set_pixel(&mut self, c: usize, x: usize, y: usize, v: u8) {
        self.planes[c][y * self.width as usize + x] = v;
    }

    /// Concatenated raw channel planes (channel order); this is the byte
    /// sequence the container CRC covers.
    pub fn raw_bytes(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(self.area() * self.plane_count());
        for p in &self.planes {
            out.extend_from_slice(p);
        }
        out
    }
}
