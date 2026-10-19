//! Kitty graphics tier: real pixel frames on Kitty-family terminals.
//!
//! Everything here is hand-rolled std-only: a minimal PNG encoder (8-bit
//! RGB/RGBA with real DEFLATE IDAT via `miniz_oxide`, always valid), a
//! base64 framer, and the Kitty `a=T,f=100` transmit-and-display escape
//! with chunked `m=1` continuation. No image crate, no allocator tricks.
//! Detection is environment-gated (see [`kitty_present`]) so unsupported
//! terminals never see the escape bytes.

use crate::raster::PixelFrame;

const PNG_SIG: [u8; 8] = [137, 80, 78, 71, 13, 10, 26, 10];

/// Stable image ids for the composed renderer. Ids survive for the whole
/// session; re-transmitting data under the same id replaces it.
pub const PROBE_IMAGE_ID: u32 = 0x4D43_0001;
pub const PROBE_PLACEMENT_ID: u32 = 1;
pub const ATLAS_IMAGE_ID: u32 = 0x4D43_0002;
pub const STATIC_IMAGE_ID: u32 = 0x4D43_0003;
pub const STATIC_PLACEMENT_ID: u32 = 1;

fn crc32(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFF_FFFF;
    for &b in data {
        crc ^= b as u32;
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xEDB8_8320 & mask);
        }
    }
    !crc
}

fn chunk(out: &mut Vec<u8>, tag: &[u8; 4], data: &[u8]) {
    let len = data.len() as u32;
    out.extend_from_slice(&len.to_be_bytes());
    out.extend_from_slice(tag);
    out.extend_from_slice(data);
    let mut c = Vec::with_capacity(4 + data.len());
    c.extend_from_slice(tag);
    c.extend_from_slice(data);
    out.extend_from_slice(&crc32(&c).to_be_bytes());
}

/// Encode a frame as a valid 8-bit RGB PNG (real zlib deflate via
/// `miniz_oxide`, always decodable). Panics on empty frames.
pub fn png_encode(frame: &PixelFrame) -> Vec<u8> {
    assert!(frame.w > 0 && frame.h > 0, "empty frame");
    assert_eq!(frame.px.len(), (frame.w * frame.h) as usize);
    let mut raw = Vec::with_capacity((frame.w * frame.h * 3 + frame.h) as usize);
    for y in 0..frame.h {
        raw.push(0); // filter type 0 (None)
        for x in 0..frame.w {
            let p = frame.px[(y * frame.w + x) as usize];
            raw.push(p.0);
            raw.push(p.1);
            raw.push(p.2);
        }
    }
    png_wrap(frame.w, frame.h, 2, &raw)
}

/// Encode an RGBA frame as a valid 8-bit RGBA PNG. Used by the sprite
/// atlas: transparent pixels never paint over the static board layer.
pub fn png_encode_rgba(w: u32, h: u32, px: &[[u8; 4]]) -> Vec<u8> {
    assert!(w > 0 && h > 0, "empty frame");
    assert_eq!(px.len(), (w * h) as usize);
    let mut raw = Vec::with_capacity((w * h * 4 + h) as usize);
    for y in 0..h {
        raw.push(0); // filter type 0 (None)
        for x in 0..w {
            let p = px[(y * w + x) as usize];
            raw.extend_from_slice(&p);
        }
    }
    png_wrap(w, h, 6, &raw)
}

/// Wrap raw scanlines in a PNG container (zlib-compressed).
/// `color_type` 2 is RGB, 6 is RGBA.
fn png_wrap(w: u32, h: u32, color_type: u8, raw: &[u8]) -> Vec<u8> {
    // Flat-color game art compresses enormously; a stored-block stream
    // used to make every crumb eaten a full-board (about 1 MB) send.
    let zlib = miniz_oxide::deflate::compress_to_vec_zlib(raw, 6);

    let mut out = Vec::new();
    out.extend_from_slice(&PNG_SIG);
    let mut ihdr = Vec::new();
    ihdr.extend_from_slice(&w.to_be_bytes());
    ihdr.extend_from_slice(&h.to_be_bytes());
    ihdr.push(8); // bit depth
    ihdr.push(color_type);
    ihdr.push(0); // compression
    ihdr.push(0); // filter
    ihdr.push(0); // interlace
    chunk(&mut out, b"IHDR", &ihdr);
    chunk(&mut out, b"IDAT", &zlib);
    chunk(&mut out, b"IEND", &[]);
    out
}

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// Standard base64 with padding.
pub fn base64_encode(data: &[u8]) -> String {
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for block in data.chunks(3) {
        let mut n: u32 = 0;
        for &b in block {
            n = (n << 8) | b as u32;
        }
        n <<= 8 * (3 - block.len());
        let chars = [
            B64[((n >> 18) & 63) as usize] as char,
            B64[((n >> 12) & 63) as usize] as char,
            if block.len() > 1 {
                B64[((n >> 6) & 63) as usize] as char
            } else {
                '='
            },
            if block.len() > 2 {
                B64[(n & 63) as usize] as char
            } else {
                '='
            },
        ];
        out.extend(chars);
    }
    out
}

/// Kitty transmit-and-display escape for a PNG, sized to `cell_rows` by
/// `cell_cols` terminal cells. Payload ships in 4096-byte `m=1` chunks
/// with a final `m=0` frame (the Kitty chunked protocol).
pub fn display_escape(png: &[u8], cell_rows: u32, cell_cols: u32) -> String {
    display_escape_id(png, cell_rows, cell_cols, None)
}

/// Delete a previously displayed image by id (prevents pile-up when a
/// frame is re-displayed at 20 fps).
pub fn delete_escape(id: u32) -> String {
    format!("\x1b_Ga=d,d=I,i={id}\x1b\\")
}

/// Delete every visible placement (kitty `a=d` with no other keys).
///
/// Used on a layout-plan change (resize, tier change): the old placement
/// belongs to the old cell grid, and issue #674 requires it to be gone
/// before the same-frame repaint, not lingering until the next image
/// frame. Bare `a=d` never frees image data, so a re-display can reuse
/// the id or resend freely.
pub fn delete_all_escape() -> &'static str {
    "\x1b_Ga=d\x1b\\"
}

/// Display escape with a stable image id (`None` behaves like
/// [`display_escape`]). Re-displaying the same id after
/// [`delete_escape`] keeps one live image per frame.
///
/// Every transmit carries `q=2`: the terminal must not answer, because
/// each answer lands on stdin and a per-frame reply stream turns the
/// event loop into a feedback flood that starves input (the Owner's
/// Kitty finding, RT-1). Capability is established once by the live
/// probe; steady-state transmits stay silent.
pub fn display_escape_id(png: &[u8], cell_rows: u32, cell_cols: u32, id: Option<u32>) -> String {
    let id_param = id.map(|i| format!(",i={i}")).unwrap_or_default();
    let b64 = base64_encode(png);
    let bytes = b64.as_bytes();
    // At least one frame even for empty payloads.
    let pieces: Vec<&[u8]> = if bytes.is_empty() {
        vec![b""]
    } else {
        bytes.chunks(4096).collect()
    };
    let mut out = String::new();
    for (i, piece) in pieces.iter().enumerate() {
        let more = u8::from(i + 1 < pieces.len());
        let text = core::str::from_utf8(piece).unwrap_or("");
        if i == 0 {
            out.push_str(&format!(
                "\x1b_Ga=T,f=100,r={},c={}{},m={},q=2;{}",
                cell_rows, cell_cols, id_param, more, text
            ));
        } else {
            out.push_str(&format!("\x1b_Gm={};{}", more, text));
        }
        out.push_str("\x1b\\");
    }
    out
}

/// Quiet transmit of an image without displaying it (`a=t`, `q=2`).
/// Used by the atlas and static-layer pipeline: the data ships once, and
/// [`place_escape`] creates the visible placements.
pub fn transmit_escape(png: &[u8], id: u32) -> String {
    let b64 = base64_encode(png);
    let bytes = b64.as_bytes();
    let pieces: Vec<&[u8]> = if bytes.is_empty() {
        vec![b""]
    } else {
        bytes.chunks(4096).collect()
    };
    let mut out = String::new();
    for (i, piece) in pieces.iter().enumerate() {
        let more = u8::from(i + 1 < pieces.len());
        let text = core::str::from_utf8(piece).unwrap_or("");
        if i == 0 {
            out.push_str(&format!("\x1b_Ga=t,f=100,i={id},m={},q=2;{}", more, text));
        } else {
            out.push_str(&format!("\x1b_Gm={};{}", more, text));
        }
        out.push_str("\x1b\\");
    }
    out
}

/// One placement of a source rectangle out of `image_id`, anchored at
/// the cursor cell plus an in-cell pixel offset. `src` is
/// `(x, y, w, h)` in image pixels; `offset` is `(X, Y)` within the cell.
/// Natural size (no `c`/`r`) keeps pixels unscaled. `C=1` keeps the
/// cursor where the caller put it; `q=2` keeps the steady state silent.
pub fn place_escape(
    image_id: u32,
    placement_id: u32,
    src: (u32, u32, u32, u32),
    offset: (u32, u32),
    z: u32,
) -> String {
    place_scaled_escape(image_id, placement_id, src, offset, None, z)
}

/// One placement with an optional `c`/`r` target-cell rectangle: when
/// the board image is stretched to its cell footprint (non-square real
/// cells), sprites scale to the same target so the composite stays
/// proportional. `None` is natural size, the exact path.
///
/// Every placement carries an explicit `z` stacking layer. The kitty
/// spec breaks equal-z ties by image id, and the sprite atlas id sorts
/// below the static board id, so a terminal that follows the spec
/// (Ghostty 1.3.1) used to paint the opaque board above every sprite.
/// The caller passes per-layer values instead of relying on unspecified
/// tie-breaking (see [`crate::atlas::z`]).
pub fn place_scaled_escape(
    image_id: u32,
    placement_id: u32,
    src: (u32, u32, u32, u32),
    offset: (u32, u32),
    cells: Option<(u32, u32)>,
    z: u32,
) -> String {
    let (x, y, w, h) = src;
    let cell = cells
        .map(|(c, r)| format!(",c={c},r={r}"))
        .unwrap_or_default();
    format!(
        "\x1b_Ga=p,i={image_id},p={placement_id},x={x},y={y},w={w},h={h}{cell},X={},Y={},z={z},C=1,q=2\x1b\\",
        offset.0, offset.1
    )
}

/// Delete one exact placement (image data stays usable for other
/// placements). The kitty delete table reaches a single placement only
/// through `d=i` with both `i` and `p`; `d=p` deletes by cell position
/// (`x,y`) and can never match a placement without those keys.
pub fn delete_placement_escape(image_id: u32, placement_id: u32) -> String {
    format!("\x1b_Ga=d,d=i,i={image_id},p={placement_id}\x1b\\")
}

/// Free an image's data and every placement that references it.
pub fn free_image_escape(image_id: u32) -> String {
    format!("\x1b_Ga=d,d=I,i={image_id}\x1b\\")
}

/// A live capability probe: transmit a 1x1 RGBA image without `q=2`
/// (so the terminal answers), then place it. Two `OK` replies prove
/// graphics and placements; an error reply proves graphics without
/// placements (full-frame fallback); silence means "not a kitty
/// terminal". The probe never suppresses replies (that is the point) and
/// the caller always issues [`probe_cleanup`] afterwards.
pub fn probe_request() -> String {
    let png = png_encode_rgba(1, 1, &[[0, 0, 0, 0]]);
    let b64 = base64_encode(&png);
    format!(
        "\x1b_Gi={PROBE_IMAGE_ID},a=t,f=100,m=0;{b64}\x1b\\\
         \x1b[1;1H\x1b_Ga=p,i={PROBE_IMAGE_ID},p={PROBE_PLACEMENT_ID},C=1\x1b\\"
    )
}

/// Remove the probe's placement and free its 1x1 image data.
pub fn probe_cleanup() -> String {
    format!(
        "{}{}",
        delete_placement_escape(PROBE_IMAGE_ID, PROBE_PLACEMENT_ID),
        free_image_escape(PROBE_IMAGE_ID)
    )
}

/// True once `captured` holds a complete kitty APC reply
/// (`ESC _ G ... ESC \`). A fragmented reply is not complete until its
/// ST lands.
pub fn reply_complete(captured: &[u8]) -> bool {
    complete_reply_count(captured) >= 1
}

/// Number of complete `ESC_G ... ESC\` APC replies in `captured`. The
/// live probe needs two (transmit plus placement), so the caller can
/// wait for both instead of stopping at the first one; a trailing
/// unterminated fragment is not counted (it is not complete yet).
pub fn complete_reply_count(captured: &[u8]) -> usize {
    let mut count = 0;
    let mut i = 0;
    while i < captured.len() {
        if captured[i..].starts_with(b"\x1b_G") {
            let Some(end) = find(&captured[i + 3..], b"\x1b\\") else {
                break;
            };
            count += 1;
            i += 3 + end + 2;
        } else {
            i += 1;
        }
    }
    count
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

/// Split a probe capture into `(replies, typed)`: every complete
/// `ESC_G...ESC\` APC reply, and every other byte (user input typed
/// while the probe waited). Replies never swallow keys and keys never
/// masquerade as replies.
pub fn split_replies(captured: &[u8]) -> (Vec<String>, Vec<u8>) {
    let mut replies = Vec::new();
    let mut typed = Vec::new();
    let mut i = 0;
    while i < captured.len() {
        if captured[i..].starts_with(b"\x1b_G") {
            if let Some(end) = find(&captured[i + 3..], b"\x1b\\") {
                let body = &captured[i + 3..i + 3 + end];
                replies.push(String::from_utf8_lossy(body).into_owned());
                i += 3 + end + 2;
                continue;
            }
            // An unterminated reply at the capture boundary: it is a
            // fragment of terminal output, not a key. Drop it.
            break;
        }
        typed.push(captured[i]);
        i += 1;
    }
    (replies, typed)
}

/// The status word of one reply body (`"i=1;OK"` -> `Some("OK")`).
pub fn reply_status(body: &str) -> Option<&str> {
    body.split_once(';').map(|(_, status)| status.trim())
}

/// `Some(true)` for `OK`, `Some(false)` for any error status
/// (`ENOENT`, `EINVAL`, ...), `None` when the body is not a reply.
pub fn reply_ok(body: &str) -> Option<bool> {
    reply_status(body).map(|status| status == "OK")
}

/// True when the environment positively identifies a Kitty-family
/// terminal (Kitty or Ghostty's Kitty-compatible paths). Conservative on
/// purpose: unknown terminals never receive graphics escapes.
pub fn kitty_present(env: &[(String, String)]) -> bool {
    let get = |k: &str| {
        env.iter()
            .find(|(key, _)| key == k)
            .map(|(_, v)| v.as_str())
    };
    if get("KITTY_WINDOW_ID").is_some_and(|v| !v.is_empty()) {
        return true;
    }
    // Ghostty 1.3.1 implements the kitty graphics protocol and does
    // answer the live probe (`tools/compat/probe-graphics.py` recorded
    // both replies on 2026-10-19), but its environment identifies it
    // before the first frame, so these rows skip the probe round trip.
    // `tools/compat/evidence/ghostty-linux-kitty.json` still proves the
    // capability end to end, and the watchdog degrades on protocol
    // errors.
    matches!(get("TERM"), Some("xterm-kitty"))
        || matches!(get("TERM_PROGRAM"), Some("kitty") | Some("ghostty"))
        || get("TERM").is_some_and(|t| t == "xterm-ghostty")
}

/// Collect the process environment as owned pairs (test seam: pass any
/// slice to [`kitty_present`]).
pub fn process_env() -> Vec<(String, String)> {
    std::env::vars().collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_assets::themes::Rgb;

    fn tiny() -> PixelFrame {
        PixelFrame {
            w: 2,
            h: 1,
            px: vec![Rgb(255, 0, 0), Rgb(0, 0, 255)],
        }
    }

    #[test]
    fn png_round_trips_header_and_dimensions() {
        let png = png_encode(&tiny());
        assert_eq!(&png[0..8], &PNG_SIG);
        // IHDR chunk: length 13, tag, then w/h big-endian.
        assert_eq!(&png[8..12], &13u32.to_be_bytes());
        assert_eq!(&png[12..16], b"IHDR");
        assert_eq!(&png[16..20], &2u32.to_be_bytes());
        assert_eq!(&png[20..24], &1u32.to_be_bytes());
        assert_eq!(png[png.len() - 12..png.len() - 8], [0, 0, 0, 0]);
        assert_eq!(&png[png.len() - 8..png.len() - 4], b"IEND");
    }

    #[test]
    fn png_chunk_crcs_verify() {
        // Walk the chunk list and re-verify every CRC.
        let png = png_encode(&tiny());
        let mut i = 8;
        while i < png.len() {
            let len = u32::from_be_bytes(png[i..i + 4].try_into().unwrap()) as usize;
            let tag = &png[i + 4..i + 8];
            let data = &png[i + 8..i + 8 + len];
            let want = u32::from_be_bytes(png[i + 8 + len..i + 12 + len].try_into().unwrap());
            let mut c = Vec::new();
            c.extend_from_slice(tag);
            c.extend_from_slice(data);
            assert_eq!(crc32(&c), want);
            i += 12 + len;
            if tag == b"IEND" {
                break;
            }
        }
        assert_eq!(&png[i - 8..i - 4], b"IEND");
    }

    #[test]
    fn base64_matches_known_vectors() {
        assert_eq!(base64_encode(b""), "");
        assert_eq!(base64_encode(b"f"), "Zg==");
        assert_eq!(base64_encode(b"fo"), "Zm8=");
        assert_eq!(base64_encode(b"foo"), "Zm9v");
        assert_eq!(base64_encode(b"foobar"), "Zm9vYmFy");
    }

    #[test]
    fn display_escape_frames_single_and_chunked() {
        let small = display_escape(&[1, 2, 3], 31, 56);
        assert!(small.starts_with("\x1b_Ga=T,f=100,r=31,c=56,m=0,q=2;"));
        assert!(small.ends_with("\x1b\\"));
        // 3075 raw bytes -> 4100 b64 chars: 4096 + 4, so two frames.
        let big = vec![0xabu8; 3075];
        let esc = display_escape(&big, 31, 56);
        assert!(esc.contains(",m=1,"), "first of two frames continues");
        assert!(esc.contains("\x1b_Gm=0;"), "final frame terminates");
        assert!(esc.ends_with("\x1b\\"));
        // Steady-state transmits never ask for a reply (RT-1).
        assert!(esc.contains("q=2"), "every control chunk is quiet");
    }

    #[test]
    fn transmit_escape_is_quiet_and_chunked() {
        let small = transmit_escape(&[1, 2, 3], ATLAS_IMAGE_ID);
        assert!(small.starts_with(&format!("\x1b_Ga=t,f=100,i={ATLAS_IMAGE_ID},m=0,q=2;")));
        assert!(small.ends_with("\x1b\\"));
        let big = vec![0xabu8; 3075];
        let esc = transmit_escape(&big, STATIC_IMAGE_ID);
        assert!(esc.contains(&format!("i={STATIC_IMAGE_ID},m=1,q=2;")));
        assert!(esc.contains("\x1b_Gm=0;"), "final chunk");
    }

    #[test]
    fn place_escape_carries_source_rect_in_cell_offset_and_z() {
        let esc = place_escape(ATLAS_IMAGE_ID, 7, (11, 22, 33, 44), (5, 6), 3);
        assert_eq!(
            esc,
            format!(
                "\x1b_Ga=p,i={ATLAS_IMAGE_ID},p=7,x=11,y=22,w=33,h=44,X=5,Y=6,z=3,C=1,q=2\x1b\\"
            )
        );
        // A single placement is deleted with `d=i` plus `i` and `p`:
        // `d=p` needs cell coordinates and can never match one placement.
        assert_eq!(delete_placement_escape(2, 3), "\x1b_Ga=d,d=i,i=2,p=3\x1b\\");
        assert!(free_image_escape(2).contains("d=I,i=2"));
    }

    #[test]
    fn scaled_place_escape_keeps_z_after_cell_rect() {
        let esc = place_scaled_escape(ATLAS_IMAGE_ID, 9, (0, 0, 8, 8), (1, 2), Some((3, 4)), 5);
        assert!(
            esc.contains(",c=3,r=4,X=1,Y=2,z=5,"),
            "z must be explicit and ordered after the cell rect: {esc}"
        );
    }

    #[test]
    fn complete_reply_count_counts_framed_replies_only() {
        assert_eq!(complete_reply_count(b""), 0);
        assert_eq!(complete_reply_count(b"\r"), 0);
        assert_eq!(complete_reply_count(b"\x1b_Gi=1;OK\x1b\\"), 1);
        assert_eq!(
            complete_reply_count(b"\x1b_Gi=1;OK\x1b\\\x1b_Gi=1,p=1;OK\x1b\\"),
            2
        );
        // A trailing fragment is not complete and does not count.
        assert_eq!(
            complete_reply_count(b"\x1b_Gi=1;OK\x1b\\\x1b_Gi=1,p=1;OK"),
            1
        );
        // Keys between replies never masquerade as replies.
        assert_eq!(complete_reply_count(b"\x1b_Gi=1;OK\x1b\\\rG"), 1);
        assert!(reply_complete(b"\x1b_Gi=1;OK\x1b\\"));
    }

    #[test]
    fn reply_split_keeps_keys_and_only_complete_apc_frames() {
        let (replies, typed) = split_replies(b"\r\x1b_Gi=1;OK\x1b\\4");
        assert_eq!(replies, vec!["i=1;OK".to_string()]);
        assert_eq!(typed, b"\r4");
        // An unterminated reply fragment is not user input.
        let (replies, typed) = split_replies(b"\x1b_Gi=1;OK");
        assert!(replies.is_empty());
        assert!(typed.is_empty());
        assert!(!reply_complete(b"\x1b_Gi=1;OK"));
        assert!(reply_complete(b"\x1b_Gi=1;OK\x1b\\"));
    }

    #[test]
    fn reply_status_accepts_ok_and_rejects_errors() {
        assert_eq!(reply_ok("i=1;OK"), Some(true));
        assert_eq!(reply_ok("i=1,p=2;OK"), Some(true));
        assert_eq!(reply_ok("i=1;ENOENT: unknown image"), Some(false));
        assert_eq!(reply_ok("i=1;EINVAL: bad source rect"), Some(false));
        assert_eq!(reply_ok("garbage"), None);
        assert_eq!(reply_status("i=1;OK"), Some("OK"));
    }

    #[test]
    fn probe_request_is_loud_and_cleanup_reverses_it() {
        let req = probe_request();
        assert!(req.contains(&format!("i={PROBE_IMAGE_ID},a=t,f=100")));
        assert!(!req.contains("q=2"), "the probe must hear the answer");
        assert!(req.contains(&format!("a=p,i={PROBE_IMAGE_ID},p={PROBE_PLACEMENT_ID}")));
        let cleanup = probe_cleanup();
        assert!(cleanup.contains(&format!(
            "\x1b_Ga=d,d=i,i={PROBE_IMAGE_ID},p={PROBE_PLACEMENT_ID}\x1b\\"
        )));
        assert!(cleanup.contains("d=I"));
    }

    #[test]
    fn rgba_png_declares_color_type_six() {
        let png = png_encode_rgba(1, 1, &[[1, 2, 3, 4]]);
        // IHDR payload starts at byte 16: w, h, depth, color type.
        assert_eq!(&png[16..20], &1u32.to_be_bytes());
        assert_eq!(png[24], 8);
        assert_eq!(png[25], 6, "RGBA color type");
    }

    #[test]
    fn png_idat_is_a_real_deflate_stream() {
        // 32x2: the second row repeats the first, so a real DEFLATE
        // stream is far smaller than the raw scanlines. Decode it back
        // to prove the zlib container is valid, not just small.
        let row: Vec<[u8; 4]> = (0..32).map(|x| [x as u8, 9, 9, 255]).collect();
        let mut px = row.clone();
        px.extend_from_slice(&row);
        let png = png_encode_rgba(32, 2, &px);
        let idat = png
            .windows(4)
            .position(|w| w == b"IDAT")
            .expect("IDAT chunk");
        let len = u32::from_be_bytes(png[idat - 4..idat].try_into().unwrap()) as usize;
        let zlib = &png[idat + 4..idat + 4 + len];
        let raw = miniz_oxide::inflate::decompress_to_vec_zlib(zlib).expect("valid zlib");
        assert_eq!(raw.len(), 2 * (1 + 32 * 4));
        assert_eq!(raw[0], 0, "filter byte");
        assert_eq!(&raw[1..5], &[0, 9, 9, 255]);
        assert!(png.len() < 300, "compressed PNG stayed {} bytes", png.len());
    }

    #[test]
    fn delete_escapes_are_minimal_and_framed() {
        assert_eq!(delete_escape(7), "\x1b_Ga=d,d=I,i=7\x1b\\");
        // Bare a=d deletes all visible placements without freeing data.
        assert_eq!(delete_all_escape(), "\x1b_Ga=d\x1b\\");
    }

    #[test]
    fn detection_is_conservative() {
        let empty: Vec<(String, String)> = vec![];
        assert!(!kitty_present(&empty));
        assert!(kitty_present(&[("KITTY_WINDOW_ID".into(), "1".into())]));
        assert!(kitty_present(&[("TERM".into(), "xterm-kitty".into())]));
        assert!(kitty_present(&[("TERM_PROGRAM".into(), "kitty".into())]));
        assert!(kitty_present(&[("TERM_PROGRAM".into(), "ghostty".into())]));
        assert!(kitty_present(&[("TERM".into(), "xterm-ghostty".into())]));
        assert!(!kitty_present(&[("TERM_PROGRAM".into(), "WezTerm".into())]));
        assert!(!kitty_present(&[("TERM".into(), "xterm-256color".into())]));
    }
}
