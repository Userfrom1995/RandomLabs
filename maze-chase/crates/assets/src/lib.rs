//! Maze Chase asset crate: original pixel-art glyphs, animation tables, and color themes.
//!
//! All artwork in [`sprites`] is authored original work for this project.
//! Glyph rows use a uniform legend (see [`sprites`]): `.` transparent,
//! `#` outline, `o` body fill (actor color), `*` highlight / white.
//!
//! [`anim`] holds pure animation timing tables that reference glyphs by
//! string ID, and [`themes`] holds the game color themes.

pub mod anim;
pub mod sprites;
pub mod themes;
