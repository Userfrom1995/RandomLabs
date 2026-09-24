//! Generic image I/O for the CLI: decode any format the `image` crate
//! understands (PNG, JPEG, GIF, BMP, TIFF, WebP, PNM) into the codec's
//! channel-major `Image`, and encode an `Image` back to the format implied by
//! the output file extension.
//!
//! The core codec remains zero-dependency; all `image`-crate work lives here
//! in the CLI binary. PPM/PGM is still handled by `obsidian_core::ppm` when
//! the path ends in `.ppm`/`.pgm` so the legacy byte-identical path is
//! preserved, but any other extension is handled here.

use image::{ColorType, DynamicImage, GenericImageView, ImageFormat};
use obsidian_core::{
    image::{Channels, Image},
    ppm,
};
use std::path::Path;

// ---------------------------------------------------------------------------
// Helpers: DynamicImage <-> Image (channel-major plane layout)
// ---------------------------------------------------------------------------

fn split_interleaved(raw: Vec<u8>, comps: usize) -> Vec<Vec<u8>> {
    let area = raw.len() / comps;
    let mut planes = vec![vec![0u8; area]; comps];
    for (i, &v) in raw.iter().enumerate() {
        planes[i % comps][i / comps] = v;
    }
    planes
}

fn dynamic_to_image(img: DynamicImage) -> Result<Image, String> {
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 {
        return Err("zero width or height".into());
    }
    let area = (w as usize) * (h as usize);
    // Route on the decoded color type to preserve alpha and grayscale.
    // For formats whose reported color may be generic (e.g. `Rgb16`), fall
    // back to has_alpha / heuristics.
    let color = img.color();
    let (channels, planes) = match color {
        ColorType::L8 => {
            let raw = img.to_luma8().into_raw();
            (Channels::Gray, split_interleaved(raw, 1))
        }
        ColorType::La8 => {
            // Gray+alpha has no first-class codec channel; keep luma only
            // (the alpha channel is almost always fully opaque for photos;
            // losing it is preferable to mis-tagging as RGBA).
            let raw = img.to_luma8().into_raw();
            (Channels::Gray, split_interleaved(raw, 1))
        }
        ColorType::Rgb8 => {
            let raw = img.to_rgb8().into_raw();
            (Channels::Rgb, split_interleaved(raw, 3))
        }
        ColorType::Rgba8 => {
            let raw = img.to_rgba8().into_raw();
            (Channels::Rgba, split_interleaved(raw, 4))
        }
        _ => {
            // 16-bit, palette, or other types: normalize to 8-bit.
            if color.has_alpha() {
                let raw = img.to_rgba8().into_raw();
                // Preserve alpha losslessly - do not collapse opaque RGBA to RGB
                // (the extra plane compresses cheaply and keeps channel count exact).
                (Channels::Rgba, split_interleaved(raw, 4))
            } else if matches!(color, ColorType::L16 | ColorType::La16 | ColorType::Rgb16 | ColorType::Rgba16) {
                // For 16-bit grayscale, treat as gray.
                // Use a simple grayscale heuristic: if the source is effectively
                // single-channel, keep it gray.
                let luma = img.to_luma8().into_raw();
                // Re-check by comparing rgb channels when available: if R==G==B
                // for every pixel, the source is gray even if stored as RGB.
                let rgb = img.to_rgb8().into_raw();
                let is_gray = rgb.chunks_exact(3).all(|px| px[0] == px[1] && px[1] == px[2]);
                if is_gray {
                    (Channels::Gray, split_interleaved(luma, 1))
                } else {
                    (Channels::Rgb, split_interleaved(rgb, 3))
                }
            } else {
                // Fallback: if the image looks grayscale, keep it grayscale.
                let rgb = img.to_rgb8().into_raw();
                let is_gray = rgb.chunks_exact(3).all(|px| px[0] == px[1] && px[1] == px[2]);
                if is_gray {
                    let luma = img.to_luma8().into_raw();
                    let _ = rgb; // already computed
                    // re-derive from luma to avoid subtle averaging differences
                    let raw = img.to_luma8().into_raw();
                    let _ = luma;
                    (Channels::Gray, split_interleaved(raw, 1))
                } else {
                    (Channels::Rgb, split_interleaved(rgb, 3))
                }
            }
        }
    };
    // Sanity: area must match plane length.
    debug_assert!(planes.iter().all(|p| p.len() == area));
    Ok(Image {
        width: w,
        height: h,
        channels,
        planes,
    })
}

fn image_to_dynamic(img: &Image) -> DynamicImage {
    let w = img.width;
    let h = img.height;
    let area = img.area();
    match img.channels {
        Channels::Gray => {
            let buf = img.planes[0].clone();
            debug_assert_eq!(buf.len(), area);
            DynamicImage::ImageLuma8(
                image::ImageBuffer::from_raw(w, h, buf).expect("gray buffer size"),
            )
        }
        Channels::Rgb => {
            let mut buf = vec![0u8; area * 3];
            for i in 0..area {
                buf[i * 3] = img.planes[0][i];
                buf[i * 3 + 1] = img.planes[1][i];
                buf[i * 3 + 2] = img.planes[2][i];
            }
            DynamicImage::ImageRgb8(
                image::ImageBuffer::from_raw(w, h, buf).expect("rgb buffer size"),
            )
        }
        Channels::Rgba => {
            let mut buf = vec![0u8; area * 4];
            for i in 0..area {
                buf[i * 4] = img.planes[0][i];
                buf[i * 4 + 1] = img.planes[1][i];
                buf[i * 4 + 2] = img.planes[2][i];
                buf[i * 4 + 3] = img.planes[3][i];
            }
            DynamicImage::ImageRgba8(
                image::ImageBuffer::from_raw(w, h, buf).expect("rgba buffer size"),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Extension -> ImageFormat mapping
// ---------------------------------------------------------------------------

fn is_ppm_path(p: &Path) -> bool {
    matches!(
        p.extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_ascii_lowercase())
            .as_deref(),
        Some("ppm") | Some("pgm") | Some("pnm") | Some("pbm")
    )
}

fn format_for_path(p: &Path) -> Option<ImageFormat> {
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())?;
    match ext.as_str() {
        "png" => Some(ImageFormat::Png),
        "jpg" | "jpeg" => Some(ImageFormat::Jpeg),
        "gif" => Some(ImageFormat::Gif),
        "bmp" => Some(ImageFormat::Bmp),
        "tif" | "tiff" => Some(ImageFormat::Tiff),
        "webp" => Some(ImageFormat::WebP),
        "ppm" | "pgm" | "pnm" | "pbm" => Some(ImageFormat::Pnm),
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// Public API: read any supported image, write any supported image
// ---------------------------------------------------------------------------

/// Read an image from `path`. PPM/PGM/PNM/PBM goes through the codec's own
/// `ppm` module for byte-identical legacy behavior; every other format is
/// decoded via the `image` crate (auto-detected from magic bytes, not just
/// the extension).
pub fn read_image(path: &Path) -> Result<Image, i32> {
    if is_ppm_path(path) {
        let data = std::fs::read(path).map_err(|e| {
            eprintln!("obsidian: cannot read '{}': {e}", path.display());
            2
        })?;
        return ppm::read(&data).map_err(|e| {
            eprintln!("obsidian: invalid image '{}': {e}", path.display());
            1
        });
    }
    // For all other formats, let the `image` crate sniff the file. Use
    // ImageReader so magic bytes drive the format, not the extension.
    let reader = image::ImageReader::open(path).map_err(|e| {
        eprintln!("obsidian: cannot open '{}': {e}", path.display());
        2
    })?;
    // with_guessed_format sniffs the header even when the extension is wrong.
    let reader = reader.with_guessed_format().map_err(|e| {
        eprintln!("obsidian: cannot sniff format for '{}': {e}", path.display());
        1
    })?;
    let dyn_img = reader.decode().map_err(|e| {
        eprintln!("obsidian: cannot decode '{}': {e}", path.display());
        1
    })?;
    dynamic_to_image(dyn_img).map_err(|e| {
        eprintln!("obsidian: invalid image '{}': {e}", path.display());
        1
    })
}

/// Write `img` to `path`, inferring the output format from the file
/// extension. PPM/PGM still uses `ppm::write` for canonical output; other
/// formats go through `image`. Returns an error code for the CLI on failure.
///
/// JPEG is lossy; the written file will not be bit-identical to the in-memory
/// pixels at the byte level (but the `.obsd` payload always is). We emit a
/// warning in that case.
pub fn write_image(path: &Path, img: &Image) -> Result<(), i32> {
    if is_ppm_path(path) {
        let bytes = ppm::write(img);
        return std::fs::write(path, bytes).map_err(|e| {
            eprintln!("obsidian: cannot write '{}': {e}", path.display());
            2
        });
    }
    let fmt = format_for_path(path);
    let dyn_img = image_to_dynamic(img);
    match fmt {
        Some(ImageFormat::Pnm) => {
            // Should already have been handled by is_ppm_path; keep for safety.
            let bytes = ppm::write(img);
            std::fs::write(path, bytes).map_err(|e| {
                eprintln!("obsidian: cannot write '{}': {e}", path.display());
                2
            })
        }
        Some(ImageFormat::Jpeg) => {
            eprintln!(
                "obsidian: warning: JPEG is lossy - '{}' will not be bit-identical (the .obsd payload is still lossless).",
                path.display()
            );
            // JPEG has no alpha; flatten RGBA to RGB first.
            let to_save = match dyn_img {
                DynamicImage::ImageRgba8(_) => DynamicImage::ImageRgb8(dyn_img.to_rgb8()),
                other => other,
            };
            to_save.save_with_format(path, ImageFormat::Jpeg).map_err(|e| {
                eprintln!("obsidian: cannot write '{}': {e}", path.display());
                2
            })
        }
        Some(ImageFormat::Gif) => {
            // GIF is palette-limited (256 colors) - truecolor images will be quantized.
            if matches!(img.channels, Channels::Rgb | Channels::Rgba) && img.area() > 0 {
                // Cheap check: if the image has >256 distinct colors, GIF will be lossy.
                // We warn unconditionally for truecolor -> GIF to set expectations.
                eprintln!(
                    "obsidian: warning: GIF is palette-limited (256 colors) - '{}' may be quantized (the .obsd payload is still lossless).",
                    path.display()
                );
            }
            // GIF has no true RGBA; flatten via image crate's conversion.
            dyn_img.save_with_format(path, ImageFormat::Gif).map_err(|e| {
                eprintln!("obsidian: cannot write '{}': {e}", path.display());
                2
            })
        }
        Some(fmt) => dyn_img.save_with_format(path, fmt).map_err(|e| {
            eprintln!("obsidian: cannot write '{}': {e}", path.display());
            2
        }),
        None => {
            // Unknown extension: default to PNG for lossless fidelity and warn.
            eprintln!(
                "obsidian: warning: unknown output extension for '{}', writing PNG instead.",
                path.display()
            );
            dyn_img.save_with_format(path, ImageFormat::Png).map_err(|e| {
                eprintln!("obsidian: cannot write '{}': {e}", path.display());
                2
            })
        }
    }
}

/// One-line description for `usage` output.
pub fn supported_formats_hint() -> &'static str {
    "png, jpeg, gif, bmp, tiff, webp, ppm/pgm/pnm"
}
