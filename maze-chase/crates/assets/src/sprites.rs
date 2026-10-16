//! Original authored pixel art for Maze Chase, stored as `pub const` string rows.
//!
//! # Legend (uniform across every glyph)
//!
//! ```text
//! .  transparent
//! #  outline
//! o  body fill (tinted with the actor color at draw time)
//! *  highlight / white
//! ```
//!
//! Every glyph is rectangular: all rows of one glyph share the same length.
//! [`validate_glyph`] enforces rectangularity and the four-character charset.
//!
//! # Pip (player lantern) directions
//!
//! Only right-facing and neutral art is stored:
//! [`PIP_RIGHT`] (mouth wide open), [`PIP_RIGHT_MID`] (mouth half open) and
//! [`PIP_CLOSED`] (no mouth, facing-neutral circle with handle).
//! Derive the other facings with the documented transform functions instead
//! of storing more art:
//!
//! ```rust
//! use maze_chase_assets::sprites::{flip_horizontal, rotate_cw, PIP_RIGHT};
//! // Left-facing: mirror the right-facing art.
//! let left = flip_horizontal(&PIP_RIGHT);
//! assert_eq!(left[6], "....***oo#.");
//! // Down-facing: rotate the right-facing art 90 degrees clockwise
//! // (the mouth wedge then points down).
//! let down = rotate_cw(&PIP_RIGHT);
//! assert_eq!((down.len(), down[0].len()), (11, 11));
//! // Up-facing: rotate 90 degrees clockwise three times (270 total).
//! let refs: Vec<&str> = down.iter().map(|s| s.as_str()).collect();
//! let up = rotate_cw(&refs);
//! let refs2: Vec<&str> = up.iter().map(|s| s.as_str()).collect();
//! let up = rotate_cw(&refs2);
//! assert_eq!((up.len(), up[0].len()), (11, 11));
//! ```
//!
//! # Warden accents
//!
//! Warden bodies are stored WITHOUT eyes (eye pairs in [`EYES_RIGHT`],
//! [`EYES_UP`], [`EYES_DOWN`] are overlaid at draw time). Each warden has a
//! distinct silhouette accent:
//!
//! * [`WARDEN_BRAM`]: square brow, a straight heavy `#` brow band, flat hood top.
//! * [`WARDEN_KESSA`]: pointed hood, peaked top narrowing to a single `#` tip.
//! * [`WARDEN_JORY`]: round helm, wide rounded dome band.
//! * [`WARDEN_NIB`]: notched ears, broken outline cells on both flanks plus a
//!   split base hem.
//!
//! # Eyes
//!
//! [`EYES_RIGHT`] looks right (`*` whites with `#` pupils offset right).
//! Left-looking eyes are derived with [`flip_horizontal`]; [`EYES_UP`] and
//! [`EYES_DOWN`] are stored consts with pupils offset up / down.

/// Pip (player lantern) facing right, mouth wide open, 11x11.
///
/// Round body, mouth wedge open to the right (rows 5-7 carved out), little
/// handle on top (rows 0-2), `*` spark highlight on the body.
pub const PIP_RIGHT: [&str; 11] = [
    "....###....",
    "...##.##...",
    "....###....",
    "...#####...",
    ".##ooooo##.",
    ".#ooo*oo...",
    ".#oo***....",
    ".#ooo*oo...",
    ".##ooooo##.",
    "...#####...",
    "....###....",
];

/// Pip facing right, mouth half open (only the middle row carved), 11x11.
///
/// Chomp mid-frame between [`PIP_RIGHT`] and [`PIP_CLOSED`].
pub const PIP_RIGHT_MID: [&str; 11] = [
    "....###....",
    "...##.##...",
    "....###....",
    "...#####...",
    ".##ooooo##.",
    ".#ooo*ooo#.",
    ".#oo***o...",
    ".#ooo*ooo#.",
    ".##ooooo##.",
    "...#####...",
    "....###....",
];

/// Pip facing-neutral: closed circle with handle, no mouth, 11x11.
pub const PIP_CLOSED: [&str; 11] = [
    "....###....",
    "...##.##...",
    "....###....",
    "...#####...",
    ".##ooooo##.",
    ".#ooo*ooo#.",
    ".#oo***oo#.",
    ".#ooo*ooo#.",
    ".##ooooo##.",
    "...#####...",
    "....###....",
];

/// Mirror a glyph horizontally (left-right flip), returning owned rows.
///
/// Works on any generic `&[&str]` glyph, so layers derive left-facing
/// variants (e.g. left-looking eyes from [`EYES_RIGHT`]) without storing
/// extra art.
///
/// ```rust
/// use maze_chase_assets::sprites::{flip_horizontal, EYES_RIGHT};
/// let flipped = flip_horizontal(&EYES_RIGHT);
/// assert_eq!(flipped[1], "#*.#*");
/// ```
pub fn flip_horizontal(glyph: &[&str]) -> Vec<String> {
    glyph
        .iter()
        .map(|row| row.chars().rev().collect())
        .collect()
}

/// Rotate a glyph 90 degrees clockwise, returning owned rows.
///
/// Works on any generic `&[&str]` glyph. A right-facing 11x11 glyph becomes a
/// down-facing 11x11 glyph; rotating three times yields the up-facing
/// variant. Non-square glyphs swap dimensions (an HxW glyph becomes WxH).
pub fn rotate_cw(glyph: &[&str]) -> Vec<String> {
    if glyph.is_empty() {
        return Vec::new();
    }
    let rows: Vec<Vec<char>> = glyph.iter().map(|r| r.chars().collect()).collect();
    let h = rows.len();
    let w = rows[0].len();
    (0..w)
        .map(|i| (0..h).map(|j| rows[h - 1 - j][i]).collect())
        .collect()
}

/// Pip death frame 0: intact lantern, 11x11.
pub const PIP_DEATH_0: [&str; 11] = [
    "....###....",
    "...##.##...",
    "....###....",
    "...#####...",
    ".##ooooo##.",
    ".#ooo*ooo#.",
    ".#oo***oo#.",
    ".#ooo*ooo#.",
    ".##ooooo##.",
    "...#####...",
    "....###....",
];

/// Pip death frame 1: burst, radiating shards, 11x11.
pub const PIP_DEATH_1: [&str; 11] = [
    ".....*.....",
    "..*..#..*..",
    "....###....",
    ".#..###..#.",
    "..*.###.*..",
    "....###....",
    "..*.###.*..",
    ".#..###..#.",
    "....###....",
    "..*..#..*..",
    ".....*.....",
];

/// Pip death frame 2: scattered sparkles, 11x11.
pub const PIP_DEATH_2: [&str; 11] = [
    "...........",
    "...*#......",
    "...........",
    ".......*...",
    "......#....",
    "..*#..*#...",
    "...........",
    "....*......",
    "...........",
    "...........",
    "...........",
];

/// Pip death frame 3: faint empty wisp curl, 11x11.
pub const PIP_DEATH_3: [&str; 11] = [
    "...........",
    "...........",
    "...........",
    "...........",
    ".....##....",
    ".....*.....",
    "....*#.....",
    "...........",
    "...........",
    "...........",
    "...........",
];

/// Pip death sequence: 4 frames of 11x11, shrinking lantern, burst,
/// sparkle, empty wisp.
///
/// Non-transparent fill counts shrink monotonically across frames
/// (68, 37, 9, 5); `#` outline counts shrink too (37, 27, 4, 3).
pub const PIP_DEATH: [&[&str]; 4] = [&PIP_DEATH_0, &PIP_DEATH_1, &PIP_DEATH_2, &PIP_DEATH_3];

/// Warden Bram (ember red): hooded body WITHOUT eyes, 11x11.
///
/// Accent: square brow, a straight heavy `#` brow band (row 3) under a flat
/// hood top. Body uses `#` outline + `o` fill.
pub const WARDEN_BRAM: [&str; 11] = [
    "...#####...",
    "..#ooooo#..",
    "..#ooooo#..",
    "..#######..",
    "..#ooooo#..",
    "..#ooooo#..",
    "..#ooooo#..",
    ".#ooooooo#.",
    ".#ooooooo#.",
    ".#ooooooo#.",
    ".#########.",
];

/// Warden Kessa (teal): hooded body WITHOUT eyes, 11x11.
///
/// Accent: pointed hood, peaked top narrowing to a single `#` tip (rows 0-2).
/// Body uses `#` outline + `o` fill.
pub const WARDEN_KESSA: [&str; 11] = [
    ".....#.....",
    "....#o#....",
    "...#ooo#...",
    "..#ooooo#..",
    "..#ooooo#..",
    "..#ooooo#..",
    "..#ooooo#..",
    "..#ooooo#..",
    ".#ooooooo#.",
    ".#ooooooo#.",
    "..#######..",
];

/// Warden Jory (amber): hooded body WITHOUT eyes, 11x11.
///
/// Accent: round helm, a wide rounded dome band (rows 0-2 flare wider than
/// the other wardens). Body uses `#` outline + `o` fill.
pub const WARDEN_JORY: [&str; 11] = [
    "....###....",
    "..##ooo##..",
    ".#ooooooo#.",
    ".#ooooooo#.",
    ".#ooooooo#.",
    ".#ooooooo#.",
    "..#ooooo#..",
    "..#ooooo#..",
    ".#ooooooo#.",
    ".#ooooooo#.",
    ".#########.",
];

/// Warden Nib (violet): hooded body WITHOUT eyes, 11x11.
///
/// Accent: notched ears, broken outline cells on both flanks (right side rows
/// 2-3, left side row 4, right side row 8) plus a split base hem (row 10).
/// Body uses `#` outline + `o` fill.
pub const WARDEN_NIB: [&str; 11] = [
    "...#####...",
    "..#ooooo#..",
    "..#oooo....",
    "..#oooo....",
    "...ooooo#..",
    "..#ooooo#..",
    "..#ooooo#..",
    ".#ooooooo#.",
    ".#ooooooo..",
    ".#ooooooo#.",
    ".####.####.",
];

/// Directional eye pair looking right, 5x5.
///
/// `*` whites with `#` pupils offset to the right of each eye. Derive the
/// left-looking pair with [`flip_horizontal`].
pub const EYES_RIGHT: [&str; 5] = [".....", "*#.*#", "*#.*#", "*#.*#", "....."];

/// Directional eye pair looking up, 5x5 (`#` pupils on the top rows).
pub const EYES_UP: [&str; 5] = [".....", "##.##", "**.**", "**.**", "....." ];

/// Directional eye pair looking down, 5x5 (`#` pupils on the bottom rows).
pub const EYES_DOWN: [&str; 5] = [".....", "**.**", "**.**", "##.##", "....." ];

/// Fright mask face worn during the turn, 11x11.
///
/// Pale `*` mask with `#` outline, `#` dot eyes (row 4) and a scared squiggle
/// mouth (zigzag row 8 under a mouth bar in row 7).
pub const FRIGHT_MASK: [&str; 11] = [
    "...#####...",
    ".##*****##.",
    ".#*******#.",
    ".#*******#.",
    ".#*##*##*#.",
    ".#*******#.",
    ".#*******#.",
    ".#**###**#.",
    ".#*#*#*#*#.",
    ".#*******#.",
    "..#######..",
];

/// Fright mask flash variant for the last-1.5s warning, 11x11.
///
/// Outline-only / inverted accents: hollow `.` interior with the same outline,
/// so it reads as a blinking negative of [`FRIGHT_MASK`].
pub const FRIGHT_MASK_FLASH: [&str; 11] = [
    "...#####...",
    ".##.....##.",
    ".#.......#.",
    ".#.......#.",
    ".#.##.##.#.",
    ".#.......#.",
    ".#.......#.",
    ".#.#####.#.",
    ".#.#.#.#.#.",
    ".#.......#.",
    "..#######..",
];

/// Crumb pellet, 3x3 single `o` dot.
pub const CRUMB: [&str; 3] = ["...", ".o.", "..."];

/// Sunseed pulse frame A (solid seed, no halo), 7x7.
pub const SUNSEED_A: [&str; 7] = [
    ".......",
    "...#...",
    "..#o#..",
    ".#ooo#.",
    "..#o#..",
    "...#...",
    ".......",
];

/// Sunseed pulse frame B (halo ring of `*` around the same core), 7x7.
pub const SUNSEED_B: [&str; 7] = [
    "..*.*..",
    ".*.#.*.",
    "..#o#..",
    "*#ooo#*",
    "..#o#..",
    ".*.#.*.",
    "..*.*..",
];

/// Relish tier icon names (original invented names, 6 tiers).
pub const RELISH_NAMES: [&str; 6] = [
    "emberberry",
    "sunplum",
    "lanternpod",
    "clockpepper",
    "harborfig",
    "starmarrow",
];

/// Six original 7x7 relish tier icons, in [`RELISH_NAMES`] order:
/// emberberry (round berry with spark), sunplum (diamond with spark tips),
/// lanternpod (vertical pod), clockpepper (square with hand),
/// harborfig (droplet), starmarrow (star).
pub const RELISH_ICONS: [[&str; 7]; 6] = [
    [
        ".......",
        "..###..",
        ".#ooo#.",
        ".#o*o#.",
        ".#ooo#.",
        "..###..",
        ".......",
    ],
    [
        "...*...",
        "...#...",
        "..#o#..",
        ".#ooo#.",
        "..#o#..",
        "...#...",
        "...*...",
    ],
    [
        "..###..",
        "..#o#..",
        "..#o#..",
        ".#ooo#.",
        "..#*#..",
        "..###..",
        ".......",
    ],
    [
        ".......",
        ".#####.",
        ".#ooo#.",
        ".#o*##.",
        ".#ooo#.",
        ".#####.",
        ".......",
    ],
    [
        "...#...",
        "..#o#..",
        "..#o#..",
        ".#ooo#.",
        ".#ooo#.",
        "..###..",
        ".......",
    ],
    [
        "...#...",
        "..#*#..",
        "##***##",
        "..#*#..",
        ".#***#.",
        "...#...",
        "...*...",
    ],
];

/// Validate a glyph: non-empty, rectangular, charset-limited.
///
/// Returns `(width, height)` in cells on success, where width is the common
/// row length and height is the row count.
pub fn validate_glyph(rows: &[&str]) -> Result<(usize, usize), &'static str> {
    if rows.is_empty() {
        return Err("empty glyph");
    }
    let width = rows[0].chars().count();
    if width == 0 {
        return Err("empty glyph");
    }
    for row in rows {
        if row.chars().count() != width {
            return Err("non-rectangular glyph");
        }
        if !row.chars().all(|c| matches!(c, '.' | '#' | 'o' | '*')) {
            return Err("bad charset");
        }
    }
    Ok((width, rows.len()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn filled(rows: &[&str]) -> usize {
        rows.iter()
            .flat_map(|r| r.chars())
            .filter(|&c| c != '.')
            .count()
    }

    fn outline(rows: &[&str]) -> usize {
        rows.iter().flat_map(|r| r.chars()).filter(|&c| c == '#').count()
    }

    fn cell_diff(a: &[&str], b: &[&str]) -> usize {
        a.iter()
            .zip(b.iter())
            .map(|(ra, rb)| ra.chars().zip(rb.chars()).filter(|(x, y)| x != y).count())
            .sum()
    }

    #[test]
    fn pip_glyphs_valid_and_sized() {
        assert_eq!(validate_glyph(&PIP_RIGHT), Ok((11, 11)));
        assert_eq!(validate_glyph(&PIP_RIGHT_MID), Ok((11, 11)));
        assert_eq!(validate_glyph(&PIP_CLOSED), Ok((11, 11)));
    }

    #[test]
    fn pip_mouth_states_distinct() {
        // Open carves 3 rows, mid carves 1 row, closed carves none:
        // fill counts must strictly decrease open > mid > closed? No:
        // carving removes fill, so closed > mid > open.
        assert!(filled(&PIP_CLOSED) > filled(&PIP_RIGHT_MID));
        assert!(filled(&PIP_RIGHT_MID) > filled(&PIP_RIGHT));
        assert!(cell_diff(&PIP_RIGHT, &PIP_RIGHT_MID) > 0);
        assert!(cell_diff(&PIP_RIGHT_MID, &PIP_CLOSED) > 0);
        // Handle present on top of every Pip state.
        for glyph in [&PIP_RIGHT, &PIP_RIGHT_MID, &PIP_CLOSED] {
            assert_eq!(&glyph[0][4..7], "###");
        }
    }

    #[test]
    fn death_frames_valid_sized_and_shrinking() {
        assert_eq!(PIP_DEATH.len(), 4);
        let mut fills = Vec::new();
        let mut outlines = Vec::new();
        for frame in PIP_DEATH {
            assert_eq!(validate_glyph(frame), Ok((11, 11)));
            fills.push(filled(frame));
            outlines.push(outline(frame));
        }
        assert_eq!(fills, vec![68, 37, 9, 5]);
        for w in fills.windows(2) {
            assert!(w[0] > w[1], "fill counts must shrink monotonically: {fills:?}");
        }
        for w in outlines.windows(2) {
            assert!(w[0] > w[1], "outline counts must shrink monotonically: {outlines:?}");
        }
    }

    #[test]
    fn wardens_valid_sized_and_eyeless() {
        for w in [WARDEN_BRAM, WARDEN_KESSA, WARDEN_JORY, WARDEN_NIB] {
            assert_eq!(validate_glyph(&w), Ok((11, 11)));
        }
    }

    #[test]
    fn warden_accents_pairwise_distinct() {
        let wardens = [WARDEN_BRAM, WARDEN_KESSA, WARDEN_JORY, WARDEN_NIB];
        for i in 0..wardens.len() {
            for j in (i + 1)..wardens.len() {
                let d = cell_diff(&wardens[i], &wardens[j]);
                assert!(d >= 6, "wardens {i} and {j} differ by only {d} cells");
            }
        }
        // Spot-check the documented accents.
        assert_eq!(WARDEN_BRAM[3], "..#######.."); // straight heavy brow band
        assert_eq!(WARDEN_KESSA[0], ".....#....."); // peaked tip
        assert_eq!(WARDEN_JORY[2], ".#ooooooo#."); // wide rounded dome
        assert_ne!(WARDEN_NIB[10], WARDEN_BRAM[10]); // split hem
    }

    #[test]
    fn eyes_valid_sized_and_pupils_offset() {
        assert_eq!(validate_glyph(&EYES_RIGHT), Ok((5, 5)));
        assert_eq!(validate_glyph(&EYES_UP), Ok((5, 5)));
        assert_eq!(validate_glyph(&EYES_DOWN), Ok((5, 5)));
        // Right: pupils on the right cell of each eye.
        assert_eq!(EYES_RIGHT[1], "*#.*#");
        // Up: pupils on top; down: pupils on bottom.
        assert_eq!(EYES_UP[1], "##.##");
        assert_eq!(EYES_DOWN[3], "##.##");
        // flip_horizontal reuse derives the left-looking pair.
        let left = flip_horizontal(&EYES_RIGHT);
        assert_eq!(left[1], "#*.#*");
        assert_eq!(validate_glyph(&left.iter().map(|s| s.as_str()).collect::<Vec<_>>()), Ok((5, 5)));
    }

    #[test]
    fn fright_masks_valid_and_flash_differs() {
        assert_eq!(validate_glyph(&FRIGHT_MASK), Ok((11, 11)));
        assert_eq!(validate_glyph(&FRIGHT_MASK_FLASH), Ok((11, 11)));
        let d = cell_diff(&FRIGHT_MASK, &FRIGHT_MASK_FLASH);
        assert!(d >= 10, "flash variant must clearly differ, got {d}");
        // Flash is hollow: strictly less fill than the solid mask.
        assert!(filled(&FRIGHT_MASK_FLASH) < filled(&FRIGHT_MASK));
    }

    #[test]
    fn pickups_valid_and_sized() {
        assert_eq!(validate_glyph(&CRUMB), Ok((3, 3)));
        assert_eq!(validate_glyph(&SUNSEED_A), Ok((7, 7)));
        assert_eq!(validate_glyph(&SUNSEED_B), Ok((7, 7)));
        // Pulse frames differ (halo ring in B).
        assert!(cell_diff(&SUNSEED_A, &SUNSEED_B) > 0);
        assert!(SUNSEED_B.iter().flat_map(|r| r.chars()).any(|c| c == '*'));
    }

    #[test]
    fn relish_icons_valid_names_clean() {
        assert_eq!(RELISH_NAMES.len(), 6);
        assert_eq!(RELISH_ICONS.len(), 6);
        let forbidden = ["cherry", "strawberry", "apple", "orange", "melon", "galboss"];
        for name in RELISH_NAMES {
            assert!(!name.is_empty());
            let lower = name.to_lowercase();
            for bad in forbidden {
                assert!(!lower.contains(bad), "relish name {name:?} contains {bad:?}");
            }
        }
        let mut names = RELISH_NAMES.to_vec();
        names.sort_unstable();
        names.dedup();
        assert_eq!(names.len(), 6, "relish names must be unique");
        for icon in RELISH_ICONS {
            assert_eq!(validate_glyph(&icon), Ok((7, 7)));
        }
        // Icons pairwise distinct.
        for i in 0..6 {
            for j in (i + 1)..6 {
                assert!(cell_diff(&RELISH_ICONS[i], &RELISH_ICONS[j]) > 0);
            }
        }
    }

    #[test]
    fn validate_rejects_bad_glyphs() {
        assert_eq!(validate_glyph(&[]), Err("empty glyph"));
        assert_eq!(validate_glyph(&[""]), Err("empty glyph"));
        assert_eq!(validate_glyph(&["##", "#"]), Err("non-rectangular glyph"));
        assert_eq!(validate_glyph(&["#x"]), Err("bad charset"));
    }

    #[test]
    fn transforms_roundtrip() {
        // Double flip is the identity.
        let once = flip_horizontal(&PIP_RIGHT);
        let refs: Vec<&str> = once.iter().map(|s| s.as_str()).collect();
        let twice = flip_horizontal(&refs);
        assert_eq!(twice, PIP_RIGHT.map(str::to_string).to_vec());
        // Four clockwise rotations are the identity.
        let mut cur: Vec<String> = PIP_RIGHT.map(str::to_string).to_vec();
        for _ in 0..4 {
            let refs: Vec<&str> = cur.iter().map(|s| s.as_str()).collect();
            cur = rotate_cw(&refs);
        }
        assert_eq!(cur, PIP_RIGHT.map(str::to_string).to_vec());
        // Rotation swaps dimensions on non-square input.
        let r = rotate_cw(&["##.", "..."]);
        assert_eq!(r.len(), 3);
        assert!(r.iter().all(|row| row.len() == 2));
        assert!(rotate_cw(&[]).is_empty());
    }
}
