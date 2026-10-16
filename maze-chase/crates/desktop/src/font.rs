//! Original 5x7 pixel typeface for the desktop HUD and menus.
//!
//! Hand-authored for this project (no font files, no system dependency):
//! every glyph is 5 columns by 7 rows, `#` ink, `.` transparent. The
//! charset covers what the game ever prints (uppercase text, numbers,
//! scores, hints); lowercase folds to uppercase and anything else maps
//! to [`GLYPH_UNKNOWN`] (a hollow box), never a panic.
//!
//! Cell metrics: glyph 5x7 with a 1 px right bearing, 1 px line gap
//! ([`ADVANCE`], [`LINE`]).

/// Glyph cell width in pixels.
pub const GLYPH_W: usize = 5;
/// Glyph cell height in pixels.
pub const GLYPH_H: usize = 7;
/// Horizontal advance per character (glyph plus 1 px bearing).
pub const ADVANCE: u32 = 6;
/// Vertical advance per text line (glyph plus 1 px gap).
pub const LINE: u32 = 8;

/// Pixel width of `text` at integer `scale` (no rendering).
pub fn text_width(text: &str, scale: u32) -> u32 {
    if text.is_empty() || scale == 0 {
        return 0;
    }
    let cells = text.chars().count() as u32;
    (cells * ADVANCE - 1) * scale
}

/// Pixel height of `lines` text lines at integer `scale`.
pub fn text_height(lines: usize, scale: u32) -> u32 {
    if lines == 0 || scale == 0 {
        return 0;
    }
    (lines as u32 * LINE - 1) * scale
}

/// Glyph rows for `c` (lowercase folds to uppercase). `None` means the
/// hollow-box fallback applies.
pub fn glyph(c: char) -> Option<[&'static str; 7]> {
    let c = c.to_ascii_uppercase();
    Some(match c {
        ' ' => [
            ".....", ".....", ".....", ".....", ".....", ".....", ".....",
        ],
        '!' => [
            "..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#..",
        ],
        '%' => [
            "#...#", "#..#.", "...#.", "..#..", ".#...", ".#..#", "#...#",
        ],
        '(' => [
            "...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#.",
        ],
        ')' => [
            ".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#...",
        ],
        '*' => [
            ".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", ".....",
        ],
        '+' => [
            ".....", "..#..", "..#..", "#####", "..#..", "..#..", ".....",
        ],
        ',' => [
            ".....", ".....", ".....", ".....", "..#..", "..#..", ".#...",
        ],
        '-' => [
            ".....", ".....", ".....", "#####", ".....", ".....", ".....",
        ],
        '.' => [
            ".....", ".....", ".....", ".....", ".....", ".##..", ".##..",
        ],
        '/' => [
            "....#", "....#", "...#.", "..#..", ".#...", "#....", "#....",
        ],
        '0' => [
            ".###.", "#..##", "#.#.#", "#.#.#", "##..#", "#...#", ".###.",
        ],
        '1' => [
            "..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###.",
        ],
        '2' => [
            ".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####",
        ],
        '3' => [
            "#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###.",
        ],
        '4' => [
            "...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#.",
        ],
        '5' => [
            "#####", "#....", "####.", "....#", "....#", "#...#", ".###.",
        ],
        '6' => [
            "..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###.",
        ],
        '7' => [
            "#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#...",
        ],
        '8' => [
            ".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###.",
        ],
        '9' => [
            ".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##..",
        ],
        ':' => [
            ".....", "..##.", "..##.", ".....", ".....", "..##.", "..##.",
        ],
        ';' => [
            ".....", "..##.", "..##.", ".....", "..##.", "..##.", ".#...",
        ],
        '?' => [
            ".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#..",
        ],
        'A' => [
            ".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#",
        ],
        'B' => [
            "####.", "#...#", "#...#", "####.", "#...#", "#...#", "####.",
        ],
        'C' => [
            ".####", "#....", "#....", "#....", "#....", "#....", ".####",
        ],
        'D' => [
            "###..", "#..#.", "#...#", "#...#", "#...#", "#..#.", "###..",
        ],
        'E' => [
            "#####", "#....", "#....", "####.", "#....", "#....", "#####",
        ],
        'F' => [
            "#####", "#....", "#....", "####.", "#....", "#....", "#....",
        ],
        'G' => [
            ".####", "#....", "#....", "#.###", "#...#", "#...#", ".###.",
        ],
        'H' => [
            "#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#",
        ],
        'I' => [
            ".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###.",
        ],
        'J' => [
            "..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##..",
        ],
        'K' => [
            "#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#",
        ],
        'L' => [
            "#....", "#....", "#....", "#....", "#....", "#....", "#####",
        ],
        'M' => [
            "#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#",
        ],
        'N' => [
            "#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#",
        ],
        'O' => [
            ".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###.",
        ],
        'P' => [
            "####.", "#...#", "#...#", "####.", "#....", "#....", "#....",
        ],
        'Q' => [
            ".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#",
        ],
        'R' => [
            "####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#",
        ],
        'S' => [
            ".####", "#....", "#....", ".###.", "....#", "....#", "####.",
        ],
        'T' => [
            "#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#..",
        ],
        'U' => [
            "#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###.",
        ],
        'V' => [
            "#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#..",
        ],
        'W' => [
            "#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#",
        ],
        'X' => [
            "#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#",
        ],
        'Y' => [
            "#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#..",
        ],
        'Z' => [
            "#####", "....#", "...#.", "..#..", ".#...", "#....", "#####",
        ],
        '<' => [
            "...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#.",
        ],
        '>' => [
            ".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#...",
        ],
        _ => return None,
    })
}

/// Hollow-box fallback for unmapped characters.
pub const GLYPH_UNKNOWN: [&str; 7] = [
    "#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#####",
];

/// Resolve any character to drawable rows (fallback included).
pub fn rows_for(c: char) -> [&'static str; 7] {
    glyph(c).unwrap_or(GLYPH_UNKNOWN)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn every_glyph_is_5x7_over_dot_hash() {
        let charset: Vec<char> = " !%()*+,-./0123456789:;?ABCDEFGHIJKLMNOPQRSTUVWXYZ<>"
            .chars()
            .collect();
        assert_eq!(charset.len(), 52);
        for c in charset {
            let rows = glyph(c).unwrap_or_else(|| panic!("missing glyph for {c:?}"));
            assert_eq!(rows.len(), GLYPH_H, "height for {c:?}");
            for row in rows {
                assert_eq!(row.len(), GLYPH_W, "width for {c:?}");
                assert!(
                    row.chars().all(|p| p == '#' || p == '.'),
                    "legend for {c:?}"
                );
            }
        }
        assert!(glyph('~').is_none());
        assert_eq!(rows_for('~'), GLYPH_UNKNOWN);
    }

    #[test]
    fn lowercase_folds_to_uppercase() {
        for c in 'a'..='z' {
            assert_eq!(glyph(c), glyph(c.to_ascii_uppercase()));
        }
    }

    #[test]
    fn glyphs_are_pairwise_distinct() {
        let charset: Vec<char> = " !%()*+,-./0123456789:;?ABCDEFGHIJKLMNOPQRSTUVWXYZ<>"
            .chars()
            .collect();
        let mut seen = HashSet::new();
        for c in charset {
            // Space is intentionally blank; everything else must differ.
            if c == ' ' {
                continue;
            }
            let rows = glyph(c).unwrap().join("\n");
            assert!(seen.insert(rows), "duplicate glyph for {c:?}");
        }
    }

    #[test]
    fn digit_glyphs_carry_ink_and_space_is_blank() {
        for c in '0'..='9' {
            let ink: usize = glyph(c)
                .unwrap()
                .iter()
                .map(|r| r.chars().filter(|&p| p == '#').count())
                .sum();
            assert!(ink >= 10, "digit {c:?} too faint ({ink} px)");
        }
        let blank: usize = glyph(' ')
            .unwrap()
            .iter()
            .map(|r| r.chars().filter(|&p| p == '#').count())
            .sum();
        assert_eq!(blank, 0);
    }

    #[test]
    fn text_metrics_match_drawing_advance() {
        assert_eq!(text_width("", 2), 0);
        assert_eq!(text_width("A", 0), 0);
        assert_eq!(text_width("A", 1), 5);
        assert_eq!(text_width("AB", 1), 11);
        assert_eq!(text_width("AB", 3), 33);
        assert_eq!(text_height(0, 2), 0);
        assert_eq!(text_height(2, 1), 15);
        assert_eq!(text_height(2, 2), 30);
    }
}
