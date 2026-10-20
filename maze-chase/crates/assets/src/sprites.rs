//! Original Pondwake pixel art for Maze Chase, stored as `pub const` rows.
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
//! # Cast
//!
//! Rill is a squat pond frog: a wide body with two dome eyes breaking the top
//! contour, heavy haunches, a chomp mouth and webbed toes. Her silhouette is
//! stored per heading ([`PIP_RIGHT`], [`RILL_UP`], [`RILL_DOWN`]) because the
//! squat body does not rotate honestly; left is the mirror of right. Each
//! heading carries an open, mid and closed mouth phase at both the 11x11 and
//! 21x21 rungs ([`pip_facing_rows`]).
//!
//! The four hunters are read silhouette first and carry no eyes: eye bubbles
//! are overlaid at draw time from [`EYES_RIGHT`], [`EYES_UP`] and
//! [`EYES_DOWN`] (left is the mirror of right).
//!
//! * [`WARDEN_BRAM`]: heron, an S-neck above long legs (tallest silhouette).
//! * [`WARDEN_KESSA`]: pike, a low torpedo with a dorsal ridge and underbite.
//! * [`WARDEN_JORY`]: snake, a low S-ribbon with a raised head loop.
//! * [`WARDEN_NIB`]: dragonfly, doubled crossbar wings around a segmented body.
//!
//! The frightened state is a flat fright fill with concentric rings and a
//! 1 px outline; it never uses the eyes slot and never uses white. The warning
//! variant is hollow (it is information, not a flash).
//!
//! # Environment and effects
//!
//! [`CRUMB`] is a water bead with a meniscus ring, [`SUNSEED_A`] and
//! [`SUNSEED_B`] are resting fireflies, [`RELISH_ICONS`] is the six-piece
//! found-object bonus set (7x7 and 11x11 rungs), [`GOLDEN_LILY`] is the
//! spare-wick bloom,
//! [`PICKUP_BURST`] is the four-frame ripple, [`TURN_SPARK`] is the committed
//! turn cue, and [`PIP_DEATH`] is the four-frame death ripple.

/// Rill facing right, mouth wide open, 11x11.
///
/// Dome eyes break the top contour, a sheen sits on the flank, and the mouth
/// opens as a three-row wedge on the right.
pub const PIP_RIGHT: [&str; 11] = [
    "..#.....#..",
    ".#*#...#*#.",
    ".#o#...#o#.",
    ".#########.",
    ".#ooooooo#.",
    ".#ooo*ooo..",
    ".#oo**oo...",
    ".#ooo*ooo..",
    ".#ooooooo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill facing right, mouth half open, 11x11.
pub const PIP_RIGHT_MID: [&str; 11] = [
    "..#.....#..",
    ".#*#...#*#.",
    ".#o#...#o#.",
    ".#########.",
    ".#ooooooo#.",
    ".#ooo*oooo#",
    ".#oo**ooo..",
    ".#ooo*oooo#",
    ".#ooooooo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill facing right, mouth closed, 11x11.
pub const PIP_CLOSED: [&str; 11] = [
    "..#.....#..",
    ".#*#...#*#.",
    ".#o#...#o#.",
    ".#########.",
    ".#ooooooo#.",
    ".#ooo*oooo#",
    ".#ooo*oooo#",
    ".#ooo*oooo#",
    ".#ooooooo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill facing up, mouth open at the top contour, 11x11.
pub const RILL_UP: [&str; 11] = [
    "...........",
    "...#...#...",
    "..#*#.#*#..",
    "..#o###o#..",
    "..##o.o##..",
    ".#ooooooo#.",
    ".#oo*oooo#.",
    ".#ooooooo#.",
    ".#ooooooo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill facing up, mouth half open, 11x11.
pub const RILL_UP_MID: [&str; 11] = [
    "...........",
    "...#...#...",
    "..#*#.#*#..",
    "..#o###o#..",
    "..###.###..",
    ".#ooooooo#.",
    ".#oo*oooo#.",
    ".#ooooooo#.",
    ".#ooooooo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill facing up, mouth closed, 11x11.
pub const RILL_CLOSED_UP: [&str; 11] = [
    "...........",
    "...#...#...",
    "..#*#.#*#..",
    "..#o###o#..",
    "..#######..",
    ".#ooooooo#.",
    ".#oo*oooo#.",
    ".#ooooooo#.",
    ".#ooooooo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill facing down, mouth open along the bottom contour, 11x11.
pub const RILL_DOWN: [&str; 11] = [
    "...........",
    "..#.....#..",
    ".#*#...#*#.",
    ".#o#...#o#.",
    ".#########.",
    ".#ooooooo#.",
    ".#oo*oooo#.",
    ".#o#####o#.",
    ".#o.....o#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill facing down, mouth half open, 11x11.
pub const RILL_DOWN_MID: [&str; 11] = [
    "...........",
    "..#.....#..",
    ".#*#...#*#.",
    ".#o#...#o#.",
    ".#########.",
    ".#ooooooo#.",
    ".#oo*oooo#.",
    ".#o#####o#.",
    ".#oo.o.oo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill facing down, mouth closed, 11x11.
pub const RILL_CLOSED_DOWN: [&str; 11] = [
    "...........",
    "..#.....#..",
    ".#*#...#*#.",
    ".#o#...#o#.",
    ".#########.",
    ".#ooooooo#.",
    ".#oo*oooo#.",
    ".#ooooooo#.",
    ".#ooooooo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill right open, 21x21.
pub const RILL21_RIGHT_OPEN: [&str; 21] = [
    ".....##.......##.....",
    "....#**#.....#**#....",
    "....#oo#.....#oo#....",
    "....#oo#.....#oo#....",
    "....#############....",
    "...#ooooooooooooo#...",
    "..#ooooooooooooooo#..",
    "..#ooo*o*ooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#oooo*oooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..##ooooooooooooo##..",
    "...#oooooooooooooo...",
    "....##oooooooooo.....",
    ".....#oooooooo#......",
    ".....#o#..#o#........",
    "....#.#....#.#.......",
    ".....................",
];

/// Rill right mid, 21x21.
pub const RILL21_RIGHT_MID: [&str; 21] = [
    ".....##.......##.....",
    "....#**#.....#**#....",
    "....#oo#.....#oo#....",
    "....#oo#.....#oo#....",
    "....#############....",
    "...#ooooooooooooo#...",
    "..#ooooooooooooooo#..",
    "..#ooo*o*ooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#oooo*oooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..##ooooooooooooo##..",
    "...#ooooooooooooo....",
    "....##ooooooooooo....",
    ".....#oooooooo#......",
    ".....#o#..#o#........",
    "....#.#....#.#.......",
    ".....................",
];

/// Rill right closed, 21x21.
pub const RILL21_RIGHT_CLOSED: [&str; 21] = [
    ".....##.......##.....",
    "....#**#.....#**#....",
    "....#oo#.....#oo#....",
    "....#oo#.....#oo#....",
    "....#############....",
    "...#ooooooooooooo#...",
    "..#ooooooooooooooo#..",
    "..#ooo*o*ooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#oooo*oooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..##ooooooooooooo##..",
    "...#ooooooooooooo#...",
    "....##ooooooooo##....",
    ".....#oooooooo#......",
    ".....#o#..#o#........",
    "....#.#....#.#.......",
    ".....................",
];

/// Rill up open, 21x21.
pub const RILL21_UP_OPEN: [&str; 21] = [
    "....####...####......",
    "...#.**#...#**#......",
    "...#.oo#...#oo#......",
    "...#.oo#####oo#......",
    "....#ooo#.#ooo#......",
    ".....#oo#.#oo#.......",
    "....###########......",
    "...#ooooooooooo#.....",
    "..#ooooooooooooo#....",
    "..#ooooo*ooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..##ooooooooooo##....",
    "...#ooooooooooo#.....",
    "....##ooooooo##......",
    ".....#ooo#ooo#.......",
    "....#.#..#..#.#......",
    ".....#....#..#.......",
    ".....................",
];

/// Rill up mid, 21x21.
pub const RILL21_UP_MID: [&str; 21] = [
    "....####...####......",
    "...#.**#...#**#......",
    "...#.oo#...#oo#......",
    "...#.oo#####oo#......",
    "....#oo#####oo#......",
    ".....#oo###oo#.......",
    "....###########......",
    "...#ooooooooooo#.....",
    "..#ooooooooooooo#....",
    "..#ooooo*ooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..##ooooooooooo##....",
    "...#ooooooooooo#.....",
    "....##ooooooo##......",
    ".....#ooo#ooo#.......",
    "....#.#..#..#.#......",
    ".....#....#..#.......",
    ".....................",
];

/// Rill up closed, 21x21.
pub const RILL21_UP_CLOSED: [&str; 21] = [
    "....####...####......",
    "...#.**#...#**#......",
    "...#.oo#...#oo#......",
    "...#.oo#####oo#......",
    "....#ooooooooo#......",
    ".....#ooooooo#.......",
    "....###########......",
    "...#ooooooooooo#.....",
    "..#ooooooooooooo#....",
    "..#ooooo*ooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..#ooooooooooooo#....",
    "..##ooooooooooo##....",
    "...#ooooooooooo#.....",
    "....##ooooooo##......",
    ".....#ooo#ooo#.......",
    "....#.#..#..#.#......",
    ".....#....#..#.......",
    ".....................",
];

/// Rill down open, 21x21.
pub const RILL21_DOWN_OPEN: [&str; 21] = [
    ".....................",
    ".....##.......##.....",
    "....#**#.....#**#....",
    "....#oo#.....#oo#....",
    "....#oo#.....#oo#....",
    "....#############....",
    "...#ooooooooooooo#...",
    "..#ooooooooooooooo#..",
    "..#ooo*o*ooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#oooo*oooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..##ooooooooooooo##..",
    "..#...............#..",
    "..#...............#..",
    "..##.............##..",
    "...#.............#...",
    "....#.#.......#.#....",
    ".....................",
];

/// Rill down mid, 21x21.
pub const RILL21_DOWN_MID: [&str; 21] = [
    ".....................",
    ".....##.......##.....",
    "....#**#.....#**#....",
    "....#oo#.....#oo#....",
    "....#oo#.....#oo#....",
    "....#############....",
    "...#ooooooooooooo#...",
    "..#ooooooooooooooo#..",
    "..#ooo*o*ooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#oooo*oooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..##ooooooooooooo##..",
    "..#ooooooooooooooo#..",
    "..#....ooooooo....#..",
    "..##..ooooooooo..##..",
    "...#..ooooooooo..#...",
    "....#.#.......#.#....",
    ".....................",
];

/// Rill down closed, 21x21.
pub const RILL21_DOWN_CLOSED: [&str; 21] = [
    ".....................",
    ".....##.......##.....",
    "....#**#.....#**#....",
    "....#oo#.....#oo#....",
    "....#oo#.....#oo#....",
    "....#############....",
    "...#ooooooooooooo#...",
    "..#ooooooooooooooo#..",
    "..#ooo*o*ooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#oooo*oooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..##ooooooooooooo##..",
    "..#ooooooooooooooo#..",
    "..#ooooooooooooooo#..",
    "..##ooooooooooooo##..",
    "...#ooooooooooooo#...",
    "....#.#.......#.#....",
    ".....................",
];

/// The heading Rill's stored sheets face.
///
/// The squat body rotates badly, so right, up and down are authored glyphs
/// and left is derived by mirroring right. Renderers map their engine
/// `Dir` onto this enum so every layer selects the same sheet.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Facing {
    Right,
    Left,
    Up,
    Down,
}

/// Rill's right-facing mouth-phase sheet at the requested art rung.
///
/// The 11x11 rung is the shipped baseline; the 21x21 rung adds a belly
/// seam, a throat pulse, dome-eye detail and 1 px toe webbing.
pub fn pip_right_rows(phase: usize, rung: u8) -> &'static [&'static str] {
    let high = rung >= 21;
    match (phase % 3, high) {
        (0, false) => &PIP_RIGHT,
        (1, false) => &PIP_RIGHT_MID,
        (2, false) => &PIP_CLOSED,
        (0, true) => &RILL21_RIGHT_OPEN,
        (1, true) => &RILL21_RIGHT_MID,
        _ => &RILL21_RIGHT_CLOSED,
    }
}

/// Facing rows for one mouth phase at the requested art rung (11 or 21).
///
/// Shared by the terminal raster, the sprite atlas, the desktop layer and
/// the browser canvas: right is authored, left is the mirror of right,
/// and up/down read their own telling glyphs instead of rotating the
/// right-facing sheet.
pub fn pip_facing_rows(phase: usize, facing: Facing, rung: u8) -> Vec<String> {
    let high = rung >= 21;
    let rows: &[&str] = match (facing, high) {
        (Facing::Right, false) => pip_right_rows(phase, 11),
        (Facing::Up, false) => match phase % 3 {
            0 => &RILL_UP,
            1 => &RILL_UP_MID,
            _ => &RILL_CLOSED_UP,
        },
        (Facing::Down, false) => match phase % 3 {
            0 => &RILL_DOWN,
            1 => &RILL_DOWN_MID,
            _ => &RILL_CLOSED_DOWN,
        },
        (Facing::Left, false) => {
            return flip_horizontal(pip_right_rows(phase, 11));
        }
        (Facing::Right, true) => pip_right_rows(phase, 21),
        (Facing::Up, true) => match phase % 3 {
            0 => &RILL21_UP_OPEN,
            1 => &RILL21_UP_MID,
            _ => &RILL21_UP_CLOSED,
        },
        (Facing::Down, true) => match phase % 3 {
            0 => &RILL21_DOWN_OPEN,
            1 => &RILL21_DOWN_MID,
            _ => &RILL21_DOWN_CLOSED,
        },
        (Facing::Left, true) => {
            return flip_horizontal(pip_right_rows(phase, 21));
        }
    };
    rows.iter().map(|s| s.to_string()).collect()
}

/// Hop displacement in art pixels for pose 0 (squash) or 1 (stretch).
///
/// The 11x11 rung uses the proportional 3 px / 5 px pair; the 21x21 rung
/// uses the full 6 px squash and 9 px stretch from the motion spec.
pub fn hop_offset(frame: usize) -> i32 {
    if frame == 0 {
        3
    } else {
        -5
    }
}

/// Hop displacement for an explicit art rung.
pub fn hop_offset_for_rung(frame: usize, rung: u8) -> i32 {
    if rung >= 21 {
        if frame == 0 {
            6
        } else {
            -9
        }
    } else {
        hop_offset(frame)
    }
}

/// Mirror a glyph horizontally (left-right flip), returning owned rows.
///
/// Works on any generic `&[&str]` glyph, so layers derive left-facing
/// variants without storing extra art.
///
/// ```rust
/// use maze_chase_assets::sprites::{flip_horizontal, EYES_RIGHT};
/// let flipped = flip_horizontal(&EYES_RIGHT);
/// assert_eq!(flipped[1], ".#...#.");
/// ```
pub fn flip_horizontal(glyph: &[&str]) -> Vec<String> {
    glyph
        .iter()
        .map(|row| row.chars().rev().collect())
        .collect()
}

/// Rotate a glyph 90 degrees clockwise, returning owned rows.
///
/// Works on any generic `&[&str]` glyph. Non-square glyphs swap dimensions
/// (an HxW glyph becomes WxH). Rill headings are stored art, not rotations.
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

/// Rill death frame 0: intact body, eyes dimmed, 11x11.
pub const PIP_DEATH_0: [&str; 11] = [
    "..#.....#..",
    ".#*#...#*#.",
    ".#o#...#o#.",
    ".#########.",
    ".#ooooooo#.",
    ".#ooo*oooo#",
    ".#ooo*oooo#",
    ".#ooo*oooo#",
    ".#ooooooo#.",
    "..##ooo##..",
    ".#.#...#.#.",
];

/// Rill death frame 1: the body sinks into a ripple ring, 11x11.
pub const PIP_DEATH_1: [&str; 11] = [
    "...........",
    "..#######..",
    ".#.......#.",
    "#..#ooo#..#",
    "#..#o*o#..#",
    "#..#####..#",
    "#.........#",
    ".#.......#.",
    "..#######..",
    "...........",
    "...........",
];

/// Rill death frame 2: the ripple spreads into bubbles, 11x11.
pub const PIP_DEATH_2: [&str; 11] = [
    "...........",
    "...........",
    "..#.....#..",
    ".#.......#.",
    "#....*....#",
    "#.........#",
    "#....*....#",
    ".#.......#.",
    "..#.....#..",
    "...........",
    "...........",
];

/// Rill death frame 3: one last bubble on the water, 11x11.
pub const PIP_DEATH_3: [&str; 11] = [
    "...........",
    "...........",
    "...........",
    "...........",
    "....###....",
    "...#*o*#...",
    "....###....",
    "...........",
    "...........",
    "...........",
    "...........",
];

/// Rill death sequence: 4 frames of 11x11, played once at 100 ms a frame.
pub const PIP_DEATH: [&[&str]; 4] = [&PIP_DEATH_0, &PIP_DEATH_1, &PIP_DEATH_2, &PIP_DEATH_3];

/// Bram the heron: S-neck above long legs, 11x11, no eyes.
pub const WARDEN_BRAM: [&str; 11] = [
    "....###....",
    "...#ooo#...",
    "..##ooo##..",
    "....#o#....",
    "....#o#....",
    "...##o##...",
    "..#ooooo#..",
    ".#oo*oooo#.",
    ".#ooooo#...",
    "...#o#o#...",
    "..#.#.#.#..",
];

/// Kessa the pike: low torpedo, dorsal ridge and underbite, 11x11, no eyes.
pub const WARDEN_KESSA: [&str; 11] = [
    "...........",
    "...........",
    "......####.",
    ".....#oooo#",
    "#...##ooooo",
    "##ooooooooo",
    "#.#oooooo##",
    "..###ooo#..",
    "....####...",
    "...........",
    "...........",
];

/// Jory the snake: low S-ribbon with a raised head loop, 11x11, no eyes.
pub const WARDEN_JORY: [&str; 11] = [
    "....###....",
    "...#ooo#...",
    "...#ooo#...",
    "..#oo###...",
    "..#oo#.....",
    ".#oo#......",
    ".#ooo###...",
    "..##ooo#...",
    "....#ooo#..",
    "....##oo#..",
    ".....###...",
];

/// Nib the dragonfly: doubled crossbar wings, segmented body, 11x11, no eyes.
pub const WARDEN_NIB: [&str; 11] = [
    "....###....",
    "...#ooo#...",
    "....#o#....",
    "##..#o#..##",
    "####.o.####",
    "..##ooo##..",
    "##..#o#..##",
    "####.o.####",
    "....#o#....",
    "...#ooo#...",
    "...#####...",
];

/// Directional eye bubbles looking right, 7x7.
///
/// Two ring orbs with a ripple trail behind the travel direction. Left is the
/// mirror of right.
pub const EYES_RIGHT: [&str; 7] = [
    ".......", ".#...#.", "###.###", ".#...#.", ".......", "..#....", ".......",
];

/// Directional eye bubbles looking up, 7x7 (trail below).
pub const EYES_UP: [&str; 7] = [
    ".......", ".#...#.", "###.###", ".#...#.", ".......", "...#...", ".......",
];

/// Directional eye bubbles looking down, 7x7 (trail above).
pub const EYES_DOWN: [&str; 7] = [
    ".......", "...#...", ".......", ".#...#.", "###.###", ".#...#.", ".......",
];

/// Directional eye bubbles looking right, compact 5x5 rung.
///
/// The same two-ring identity as the 7x7 pair at the small tile grid,
/// with the trail kept as a single pixel so it never crowds the orbs.
pub const EYES_RIGHT_5: [&str; 5] = [".....", ".#.#.", "##.##", ".#.#.", ".#..."];

/// Directional eye bubbles looking up, compact 5x5 rung.
pub const EYES_UP_5: [&str; 5] = [".....", ".#.#.", "#####", ".#.#.", "..#.."];

/// Directional eye bubbles looking down, compact 5x5 rung.
pub const EYES_DOWN_5: [&str; 5] = ["..#..", ".#.#.", "#####", ".#.#.", "....."];

/// Eye-bubble rows for a facing, with left mirrored from right.
///
/// Shared by every renderer so a hunter never shows right-facing eyes while
/// travelling left.
pub fn eyes_rows(facing: Facing) -> Vec<String> {
    let rows: &[&str] = match facing {
        Facing::Right => &EYES_RIGHT,
        Facing::Left => return flip_horizontal(&EYES_RIGHT),
        Facing::Up => &EYES_UP,
        Facing::Down => &EYES_DOWN,
    };
    rows.iter().map(|row| (*row).to_string()).collect()
}

/// Eye-bubble rows at the authored rung: 5 selects the compact pair,
/// anything larger selects the 7x7 pair. Left stays the mirror of right
/// at both rungs.
pub fn eyes_rows_for(facing: Facing, rung: u8) -> Vec<String> {
    if rung > 5 {
        return eyes_rows(facing);
    }
    let rows: &[&str] = match facing {
        Facing::Right => &EYES_RIGHT_5,
        Facing::Left => return flip_horizontal(&EYES_RIGHT_5),
        Facing::Up => &EYES_UP_5,
        Facing::Down => &EYES_DOWN_5,
    };
    rows.iter().map(|row| (*row).to_string()).collect()
}

/// Frightened hunter: flat fright fill with concentric rings, 11x11.
///
/// Never uses the eyes slot (`*`) and never uses a white fill.
pub const FRIGHT_MASK: [&str; 11] = [
    "...#####...",
    ".##ooooo##.",
    ".#ooooooo#.",
    "#ooooooooo#",
    "#oo#####oo#",
    "#oo#ooo#oo#",
    "#oo#####oo#",
    "#ooooooooo#",
    ".#ooooooo#.",
    ".##ooooo##.",
    "...#####...",
];

/// Frightened hunter, hollow warning variant for reduced flash.
///
/// Information, not decoration: the outline holds without a bright fill.
pub const FRIGHT_MASK_FLASH: [&str; 11] = [
    "...#####...",
    ".##.....##.",
    ".#.......#.",
    "#.........#",
    "#..#####..#",
    "#..#...#..#",
    "#..#####..#",
    "#.........#",
    ".#.......#.",
    ".##.....##.",
    "...#####...",
];

/// First morph frame when a sunseed dazes a hunter: flat fill, no rings.
pub const FRIGHT_MASK_ENTRY: [&str; 11] = [
    "...#####...",
    ".##ooooo##.",
    ".#ooooooo#.",
    "#ooooooooo#",
    "#ooooooooo#",
    "#ooooooooo#",
    "#ooooooooo#",
    "#ooooooooo#",
    ".#ooooooo#.",
    ".##ooooo##.",
    "...#####...",
];

/// Water bead crumb with a meniscus ring, 3x3.
pub const CRUMB: [&str; 3] = [".*.", "*o*", ".*."];

/// Sunseed firefly at rest, no halo, 7x7.
pub const SUNSEED_A: [&str; 7] = [
    ".......", "...#...", "..#o#..", ".#o*o#.", "..#o#..", "...#...", ".......",
];

/// Sunseed firefly with the halo ring lit, 7x7.
pub const SUNSEED_B: [&str; 7] = [
    "..*.*..", ".*.#.*.", "..#o#..", "*#o*o#*", "..#o#..", ".*.#.*.", "..*.*..",
];

/// Bonus set names, in [`RELISH_ICONS`] order (original found objects).
pub const RELISH_NAMES: [&str; 6] = [
    "lily charm",
    "copper ripple",
    "reed flute",
    "snail shell",
    "dragonfly wing",
    "kingfisher feather",
];

/// Six original 7x7 bonus icons, in [`RELISH_NAMES`] order.
pub const RELISH_ICONS: [[&str; 7]; 6] = [
    [
        "...#...", "..*.*..", ".#ooo#.", "..*o*..", "...#...", "..#.#..", ".......",
    ],
    [
        ".......", "..###..", ".#.*.#.", ".#*o*#.", ".#.*.#.", "..###..", ".......",
    ],
    [
        "...#...", "..#o#..", "..#*#..", "..#o#..", "..#*#..", "..#o#..", "...###.",
    ],
    [
        "...##..", "..#oo#.", ".#o##o#", ".#o#o#.", ".#oo#..", "..##...", ".......",
    ],
    [
        ".......", "..#....", ".#o#...", "#ooo#..", ".#o#...", "..#....", ".......",
    ],
    [
        "....#..", "...#o#.", "..#o*#.", ".#o*#..", "..#o#..", "...#...", "..##...",
    ],
];

/// Six original 11x11 bonus icons, the high-detail rung of
/// [`RELISH_ICONS`] in [`RELISH_NAMES`] order.
pub const RELISH_ICONS_11: [[&str; 11]; 6] = [
    [
        ".....#.....",
        "....#o#....",
        "...#o*o#...",
        "..#o###o#..",
        ".#o#...#o#.",
        ".#o#.#.#o#.",
        ".#o#...#o#.",
        "..#o###o#..",
        "...#o*o#...",
        "....#o#....",
        ".....#.....",
    ],
    [
        "...........",
        "....###....",
        "...#ooo#...",
        "..#o***o#..",
        ".#o*o#o*o#.",
        ".#o*****o#.",
        ".#o*o#o*o#.",
        "..#o***o#..",
        "...#ooo#...",
        "....###....",
        "...........",
    ],
    [
        ".....#.....",
        "....#o#....",
        "....#*#....",
        "....#o#....",
        "....#*#....",
        "....#o#....",
        "....#*#....",
        "....#o#....",
        "....#*#....",
        "...#ooo#...",
        "...#####...",
    ],
    [
        ".....##....",
        "....#oo#...",
        "...#o##o#..",
        "..#o#..#o#.",
        "..#o#..#o#.",
        "..#o#oo#o#.",
        "..#o####o#.",
        "...#oooo#..",
        "....#oo#...",
        ".....##....",
        "...........",
    ],
    [
        "...........",
        ".....#.....",
        "....#o#....",
        "...#o#o#...",
        "..#o#.#o#..",
        ".#o#...#o#.",
        "#ooo###ooo#",
        ".#o#...#o#.",
        "..#o#.#o#..",
        "...#o#o#...",
        "....#o#....",
    ],
    [
        "......#....",
        ".....#o#...",
        "....#o*#...",
        "...#o*#....",
        "..#o*#.....",
        ".#o*#......",
        "#o*#...#...",
        ".##...#o#..",
        "..#..#o*#..",
        ".....#o#...",
        "......#....",
    ],
];

/// Pick the bonus icon at the authored rung: 7x7 below 11, 11x11 at the
/// high-detail rung.
pub fn relish_icon(index: usize, rung: u8) -> &'static [&'static str] {
    let i = index.min(RELISH_ICONS.len() - 1);
    if rung >= 11 {
        &RELISH_ICONS_11[i]
    } else {
        &RELISH_ICONS[i]
    }
}

/// Spare-wick bloom, six 9x9 frames from bud to open lily.
pub const GOLDEN_LILY: [[&str; 9]; 6] = [
    [
        ".........",
        "....#....",
        "...#o#...",
        "..#o*o#..",
        "..#ooo#..",
        "...###...",
        "....#....",
        "....#....",
        ".........",
    ],
    [
        ".........",
        "..##.##..",
        ".#ooooo#.",
        "..#o*o#..",
        "..#ooo#..",
        "...###...",
        "....#....",
        "....#....",
        ".........",
    ],
    [
        ".........",
        ".#..#.#..",
        "#oo#o#oo#",
        ".#ooooo#.",
        "..#o*o#..",
        "...###...",
        "....#....",
        "....#....",
        ".........",
    ],
    [
        "...#...#.",
        ".#o#.#o#.",
        "#ooo#ooo#",
        ".#ooooo#.",
        "..#o*o#..",
        "...###...",
        "....#....",
        "....#....",
        ".........",
    ],
    [
        "..#...#..",
        ".#o#.#o#.",
        "#ooo#ooo#",
        ".#ooooo#.",
        "..#o*o#..",
        "..#ooo#..",
        "....#....",
        "....#....",
        ".........",
    ],
    [
        "..#...#..",
        ".#o#o#o#.",
        "#ooo#ooo#",
        ".#ooooo#.",
        "..#o*o#..",
        "..#ooo#..",
        "....#....",
        "....#....",
        ".........",
    ],
];

/// Four-frame pickup ripple, 3x3, on the 66.7 ms burst grid.
pub const PICKUP_BURST: [[&str; 3]; 4] = [
    ["...", ".#.", "..."],
    [".#.", "#*#", ".#."],
    ["#.#", ".#.", "#.#"],
    ["#.#", "#.#", "#.#"],
];

/// Committed-turn cue: a seven-pixel spark at the turn corner, 7x7.
pub const TURN_SPARK: [&str; 7] = [
    "...*...", "..***..", ".*****.", "***.***", ".*****.", "..***..", "...*...",
];

/// Level-clear lily-crown banner: one 9x9 bloom held over the board.
pub const LILY_CROWN: [&str; 9] = [
    "..#...#..",
    ".#o#.#o#.",
    "#oo#o#oo#",
    ".#ooooo#.",
    "..#o*o#..",
    "..#ooo#..",
    "...###...",
    "....#....",
    ".........",
];

/// 5x7 numerals for desktop and web score floaters, glyphs 0-9.
///
/// Terminal floaters stay off (no raster digits in a terminal font
/// stack); the terminal bitmap tiers tint effect art with the theme
/// accent instead.
pub const DIGITS: [[&str; 7]; 10] = [
    [
        ".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###.",
    ],
    [
        "..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###.",
    ],
    [
        ".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####",
    ],
    [
        "####.", "....#", "....#", ".###.", "....#", "....#", "####.",
    ],
    [
        "...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#.",
    ],
    [
        "#####", "#....", "####.", "....#", "....#", "#...#", ".###.",
    ],
    [
        ".###.", "#....", "#....", "####.", "#...#", "#...#", ".###.",
    ],
    [
        "#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#...",
    ],
    [
        ".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###.",
    ],
    [
        ".###.", "#...#", "#...#", ".####", "....#", "....#", ".###.",
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
        rows.iter()
            .flat_map(|r| r.chars())
            .filter(|&c| c == '#')
            .count()
    }

    fn cell_diff(a: &[&str], b: &[&str]) -> usize {
        a.iter()
            .zip(b.iter())
            .map(|(ra, rb)| ra.chars().zip(rb.chars()).filter(|(x, y)| x != y).count())
            .sum()
    }

    #[test]
    fn every_glyph_validates_and_keeps_its_box() {
        let boxes: [(&[&str], (usize, usize)); 12] = [
            (&PIP_RIGHT, (11, 11)),
            (&PIP_RIGHT_MID, (11, 11)),
            (&PIP_CLOSED, (11, 11)),
            (&RILL_UP, (11, 11)),
            (&RILL_UP_MID, (11, 11)),
            (&RILL_CLOSED_UP, (11, 11)),
            (&RILL_DOWN, (11, 11)),
            (&RILL_DOWN_MID, (11, 11)),
            (&RILL_CLOSED_DOWN, (11, 11)),
            (&FRIGHT_MASK, (11, 11)),
            (&FRIGHT_MASK_FLASH, (11, 11)),
            (&FRIGHT_MASK_ENTRY, (11, 11)),
        ];
        for (rows, want) in boxes {
            assert_eq!(validate_glyph(rows), Ok(want));
        }
        for frame in PIP_DEATH {
            assert_eq!(validate_glyph(frame), Ok((11, 11)));
        }
        for body in [&WARDEN_BRAM, &WARDEN_KESSA, &WARDEN_JORY, &WARDEN_NIB] {
            assert_eq!(validate_glyph(body), Ok((11, 11)));
        }
        for eyes in [&EYES_RIGHT, &EYES_UP, &EYES_DOWN] {
            assert_eq!(validate_glyph(eyes), Ok((7, 7)));
        }
        for eyes in [&EYES_RIGHT_5, &EYES_UP_5, &EYES_DOWN_5] {
            assert_eq!(validate_glyph(eyes), Ok((5, 5)));
        }
        assert_eq!(validate_glyph(&CRUMB), Ok((3, 3)));
        assert_eq!(validate_glyph(&SUNSEED_A), Ok((7, 7)));
        assert_eq!(validate_glyph(&SUNSEED_B), Ok((7, 7)));
        for icon in &RELISH_ICONS {
            assert_eq!(validate_glyph(icon), Ok((7, 7)));
        }
        for icon in &RELISH_ICONS_11 {
            assert_eq!(validate_glyph(icon), Ok((11, 11)));
        }
        for frame in &GOLDEN_LILY {
            assert_eq!(validate_glyph(frame), Ok((9, 9)));
        }
        for frame in &PICKUP_BURST {
            assert_eq!(validate_glyph(frame), Ok((3, 3)));
        }
        assert_eq!(validate_glyph(&TURN_SPARK), Ok((7, 7)));
    }

    #[test]
    fn rill_mouth_phases_change_the_silhouette() {
        assert!(cell_diff(&PIP_RIGHT, &PIP_RIGHT_MID) > 4);
        assert!(cell_diff(&PIP_RIGHT_MID, &PIP_CLOSED) > 2);
        assert!(cell_diff(&RILL_UP, &RILL_UP_MID) > 1);
        assert!(cell_diff(&RILL_DOWN, &RILL_DOWN_MID) > 2);
        // The dome eyes are the identity: every heading carries two `*`.
        for glyph in [
            &PIP_RIGHT,
            &PIP_RIGHT_MID,
            &PIP_CLOSED,
            &RILL_UP,
            &RILL_DOWN,
        ] {
            let eye_highlights = glyph
                .iter()
                .take(3)
                .flat_map(|r| r.chars())
                .filter(|&c| c == '*')
                .count();
            assert_eq!(eye_highlights, 2);
        }
    }

    #[test]
    fn death_sequence_sinks_into_a_bubble() {
        assert_eq!(PIP_DEATH.len(), 4);
        assert!(filled(&PIP_DEATH_0) > filled(&PIP_DEATH_3));
        assert!(outline(&PIP_DEATH_0) > outline(&PIP_DEATH_3));
        // No two frames share a silhouette (the ripple must read).
        for (i, a) in PIP_DEATH.iter().enumerate() {
            for b in PIP_DEATH.iter().skip(i + 1) {
                assert!(cell_diff(a, b) > 8);
            }
        }
    }

    #[test]
    fn wardens_are_silhouette_distinct() {
        let wardens = [WARDEN_BRAM, WARDEN_KESSA, WARDEN_JORY, WARDEN_NIB];
        for (i, a) in wardens.iter().enumerate() {
            for (j, b) in wardens.iter().enumerate().skip(i + 1) {
                assert!(cell_diff(a, b) >= 20, "wardens {i} and {j} are too alike");
            }
        }
    }

    #[test]
    fn fright_masks_never_use_the_eyes_slot_or_white() {
        for mask in [FRIGHT_MASK, FRIGHT_MASK_FLASH, FRIGHT_MASK_ENTRY] {
            assert!(
                !mask.iter().any(|r| r.contains('*')),
                "fright mask must never use the eyes slot"
            );
            assert!(validate_glyph(&mask).is_ok());
        }
        assert!(cell_diff(&FRIGHT_MASK, &FRIGHT_MASK_FLASH) > 10);
        assert!(cell_diff(&FRIGHT_MASK_ENTRY, &FRIGHT_MASK) > 4);
    }

    #[test]
    fn eyes_are_bubbles_with_a_trail() {
        assert_eq!(validate_glyph(&EYES_RIGHT), Ok((7, 7)));
        // Two ring orbs plus one trailing pixel behind the travel direction.
        assert_eq!(EYES_RIGHT[5], "..#....");
        assert_eq!(EYES_UP[5], "...#...");
        assert_eq!(EYES_DOWN[1], "...#...");
        let flipped = flip_horizontal(&EYES_RIGHT);
        assert_eq!(flipped[5], "....#..");
        // The compact rung keeps the same ring identity and mirror.
        assert_eq!(validate_glyph(&EYES_RIGHT_5), Ok((5, 5)));
        assert_eq!(validate_glyph(&EYES_UP_5), Ok((5, 5)));
        assert_eq!(validate_glyph(&EYES_DOWN_5), Ok((5, 5)));
        assert_eq!(
            eyes_rows_for(Facing::Left, 5),
            flip_horizontal(&EYES_RIGHT_5)
        );
        assert_eq!(eyes_rows_for(Facing::Right, 7), eyes_rows(Facing::Right));
    }

    #[test]
    fn pickup_art_is_small_and_pulses() {
        assert_eq!(PICKUP_BURST.len(), 4);
        let counts: Vec<usize> = PICKUP_BURST.iter().map(|f| filled(f)).collect();
        assert!(counts[0] < counts[2]);
        assert!(counts[3] > counts[0]);
        assert_eq!(GOLDEN_LILY.len(), 6);
        assert!(filled(&GOLDEN_LILY[5]) > filled(&GOLDEN_LILY[0]));
        assert_eq!(filled(&TURN_SPARK), 24);
    }

    #[test]
    fn relish_set_is_original_and_complete() {
        assert_eq!(RELISH_NAMES.len(), 6);
        assert_eq!(RELISH_ICONS.len(), 6);
        assert_eq!(RELISH_ICONS_11.len(), 6);
        assert_eq!(relish_icon(0, 7).len(), 7);
        assert_eq!(relish_icon(0, 11).len(), 11);
        assert_eq!(relish_icon(99, 11).len(), 11);
        let mut names = RELISH_NAMES.to_vec();
        names.sort_unstable();
        names.dedup();
        assert_eq!(names.len(), 6, "bonus names must be unique");
        for name in RELISH_NAMES {
            assert!(!name.is_empty());
            assert!(name.chars().all(|c| c.is_ascii_lowercase() || c == ' '));
        }
        for icon in RELISH_ICONS {
            assert_eq!(validate_glyph(&icon), Ok((7, 7)));
        }
    }

    #[test]
    fn rill_11_sheets_share_a_baseline() {
        let sheets: [&[&str]; 9] = [
            &PIP_RIGHT,
            &PIP_RIGHT_MID,
            &PIP_CLOSED,
            &RILL_UP,
            &RILL_UP_MID,
            &RILL_CLOSED_UP,
            &RILL_DOWN,
            &RILL_DOWN_MID,
            &RILL_CLOSED_DOWN,
        ];
        for sheet in sheets {
            let low = sheet
                .iter()
                .rposition(|row| row.chars().any(|ch| ch != '.'))
                .expect("a Rill sheet must draw something");
            assert_eq!(low, 10, "every 11x11 Rill sheet must land on row 10");
        }
    }

    #[test]
    fn rill_21_sheets_share_a_baseline() {
        let sheets: [&[&str]; 9] = [
            &RILL21_RIGHT_OPEN,
            &RILL21_RIGHT_MID,
            &RILL21_RIGHT_CLOSED,
            &RILL21_UP_OPEN,
            &RILL21_UP_MID,
            &RILL21_UP_CLOSED,
            &RILL21_DOWN_OPEN,
            &RILL21_DOWN_MID,
            &RILL21_DOWN_CLOSED,
        ];
        for sheet in sheets {
            let low = sheet
                .iter()
                .rposition(|row| row.chars().any(|ch| ch != '.'))
                .expect("a Rill sheet must draw something");
            assert_eq!(low, 19, "every 21x21 Rill sheet must land on row 19");
        }
    }

    #[test]
    fn golden_lily_frames_are_all_distinct() {
        for (a, left) in GOLDEN_LILY.iter().enumerate() {
            for (b, right) in GOLDEN_LILY.iter().enumerate().skip(a + 1) {
                assert_ne!(left, right, "lily frames {a} and {b}");
            }
        }
    }

    #[test]
    fn left_eyes_are_the_right_eyes_mirrored() {
        assert_eq!(eyes_rows(Facing::Left), flip_horizontal(&EYES_RIGHT));
        assert_eq!(
            eyes_rows(Facing::Right),
            EYES_RIGHT
                .iter()
                .map(|row| (*row).to_string())
                .collect::<Vec<_>>()
        );
        assert_eq!(
            eyes_rows(Facing::Up),
            EYES_UP
                .iter()
                .map(|row| (*row).to_string())
                .collect::<Vec<_>>()
        );
        assert_eq!(
            eyes_rows(Facing::Down),
            EYES_DOWN
                .iter()
                .map(|row| (*row).to_string())
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn transforms_are_involutive_and_preserve_validity() {
        let glyphs: [&[&str]; 4] = [&PIP_RIGHT, &WARDEN_BRAM, &FRIGHT_MASK, &EYES_RIGHT];
        for glyph in glyphs {
            let once = flip_horizontal(glyph);
            let refs: Vec<&str> = once.iter().map(|s| s.as_str()).collect();
            let twice = flip_horizontal(&refs);
            assert_eq!(twice, glyph);
            let rotated = rotate_cw(glyph);
            let rrefs: Vec<&str> = rotated.iter().map(|s| s.as_str()).collect();
            assert!(validate_glyph(&rrefs).is_ok());
        }
        assert_eq!(rotate_cw(&[]), Vec::<String>::new());
    }
}
