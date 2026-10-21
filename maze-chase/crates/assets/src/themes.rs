//! Pondwake color themes for Maze Chase (no I/O, no dependencies).
//!
//! The three launch themes are Dusk Pond (dark default), Morning Shallows
//! (light) and Moonwake (high contrast). Every palette value mirrors the
//! binding `docs/design-tokens.json` companion file; the `themes` section of
//! that file is generated from these constants and checked by the test at the
//! bottom of this module.
//!
//! Legacy ids (`ember-warren`, `abyss-lantern`, `parchment-dawn`) still resolve
//! through [`by_id`] so a settings file written before the identity refresh
//! boots into the matching Pondwake theme instead of falling back blindly.

/// An sRGB color.
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
pub struct Rgb(pub u8, pub u8, pub u8);

/// Full game palette for one visual theme.
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
pub struct Theme {
    pub id: &'static str,
    pub name: &'static str,
    pub bg: Rgb,
    pub wall: Rgb,
    pub wall_inner: Rgb,
    pub crumb: Rgb,
    pub sunseed: Rgb,
    pub pip: Rgb,
    pub bram: Rgb,
    pub kessa: Rgb,
    pub jory: Rgb,
    pub nib: Rgb,
    pub fright: Rgb,
    pub eyes: Rgb,
    pub text: Rgb,
    pub dim_text: Rgb,
    pub accent: Rgb,
}

/// Dusk Pond (dark default): deep water, mossy banks, Rill's pond green.
pub const DUSK_POND: Theme = Theme {
    id: "dusk-pond",
    name: "Dusk Pond",
    bg: Rgb(0x0E, 0x1E, 0x1C),
    wall: Rgb(0x38, 0x85, 0x6F),
    wall_inner: Rgb(0x1C, 0x4A, 0x40),
    crumb: Rgb(0x9F, 0xB5, 0x9B),
    sunseed: Rgb(0xF2, 0xC1, 0x4E),
    pip: Rgb(0x7E, 0xD9, 0x57),
    bram: Rgb(0x5F, 0x87, 0xB8),
    kessa: Rgb(0x3E, 0x9B, 0x6E),
    jory: Rgb(0xF2, 0x5E, 0x4A),
    nib: Rgb(0xBE, 0x8B, 0x2A),
    fright: Rgb(0xC8, 0xF2, 0xEA),
    eyes: Rgb(0xD8, 0xF4, 0xE8),
    text: Rgb(0xE8, 0xF0, 0xE6),
    dim_text: Rgb(0x9F, 0xB3, 0xA6),
    accent: Rgb(0xF0, 0xB4, 0x5A),
};

/// Morning Shallows (light): pale sand-water with wet dark stone.
pub const MORNING_SHALLOWS: Theme = Theme {
    id: "morning-shallows",
    name: "Morning Shallows",
    bg: Rgb(0xF4, 0xF7, 0xF2),
    wall: Rgb(0x2C, 0x7A, 0x5B),
    wall_inner: Rgb(0xA8, 0xC9, 0xB8),
    crumb: Rgb(0x7A, 0x8A, 0x80),
    sunseed: Rgb(0xA8, 0x64, 0x08),
    pip: Rgb(0x2F, 0x9E, 0x4F),
    bram: Rgb(0x3B, 0x5C, 0x8F),
    kessa: Rgb(0x1F, 0x7A, 0x4D),
    jory: Rgb(0xC7, 0x4A, 0x33),
    nib: Rgb(0x8A, 0x6A, 0x1C),
    fright: Rgb(0x24, 0x12, 0x38),
    eyes: Rgb(0x16, 0x20, 0x1D),
    text: Rgb(0x1B, 0x2A, 0x33),
    dim_text: Rgb(0x5C, 0x6F, 0x66),
    accent: Rgb(0xB3, 0x5A, 0x2B),
};

/// Moonwake (high contrast): near-black water, bright moonlit edges.
pub const MOONWAKE: Theme = Theme {
    id: "moonwake",
    name: "Moonwake",
    bg: Rgb(0x06, 0x08, 0x0C),
    wall: Rgb(0x26, 0xA0, 0x88),
    wall_inner: Rgb(0x0F, 0x4A, 0x3E),
    crumb: Rgb(0xB9, 0xC7, 0xD1),
    sunseed: Rgb(0xFF, 0xD8, 0x4D),
    pip: Rgb(0x6B, 0xE8, 0x6B),
    bram: Rgb(0x5F, 0xA8, 0xFF),
    kessa: Rgb(0x35, 0xD0, 0x6A),
    jory: Rgb(0xFF, 0x6B, 0x4A),
    nib: Rgb(0xFF, 0xC9, 0x3C),
    fright: Rgb(0xE8, 0xFF, 0xF8),
    eyes: Rgb(0xE0, 0xFF, 0xF6),
    text: Rgb(0xF2, 0xF7, 0xF5),
    dim_text: Rgb(0xA9, 0xBF, 0xB8),
    accent: Rgb(0x7F, 0xE8, 0xFF),
};

/// All themes in stable order: dark default, light, high contrast.
pub fn all() -> [&'static Theme; 3] {
    [&DUSK_POND, &MORNING_SHALLOWS, &MOONWAKE]
}

/// Look up a theme by id, including the pre-refresh legacy ids.
pub fn by_id(id: &str) -> Option<&'static Theme> {
    match id {
        "dusk-pond" | "ember-warren" => Some(&DUSK_POND),
        "morning-shallows" | "parchment-dawn" => Some(&MORNING_SHALLOWS),
        "moonwake" | "abyss-lantern" => Some(&MOONWAKE),
        _ => None,
    }
}

/// Canonical id for any accepted theme id (old ids migrate forward).
pub fn canonical_id(id: &str) -> Option<&'static str> {
    by_id(id).map(|t| t.id)
}

/// Blend two colors by `t` (`0.0` returns `a`, `1.0` returns `b`).
pub fn mix(a: Rgb, b: Rgb, t: f32) -> Rgb {
    let t = t.clamp(0.0, 1.0);
    let lerp = |x: u8, y: u8| (x as f32 + (y as f32 - x as f32) * t).round() as u8;
    Rgb(lerp(a.0, b.0), lerp(a.1, b.1), lerp(a.2, b.2))
}

#[cfg(test)]
fn linear(c: f32) -> f32 {
    if c <= 0.03928 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

/// WCAG relative luminance of an sRGB color.
#[cfg(test)]
fn luminance(c: Rgb) -> f32 {
    0.2126 * linear(c.0 as f32 / 255.0)
        + 0.7152 * linear(c.1 as f32 / 255.0)
        + 0.0722 * linear(c.2 as f32 / 255.0)
}

/// WCAG contrast ratio between two colors (always >= 1.0).
#[cfg(test)]
fn contrast_ratio(a: Rgb, b: Rgb) -> f32 {
    let (hi, lo) = {
        let x = luminance(a);
        let y = luminance(b);
        if x >= y {
            (x, y)
        } else {
            (y, x)
        }
    };
    (hi + 0.05) / (lo + 0.05)
}

#[cfg(test)]
fn euclidean(a: Rgb, b: Rgb) -> f32 {
    let dr = a.0 as f32 - b.0 as f32;
    let dg = a.1 as f32 - b.1 as f32;
    let db = a.2 as f32 - b.2 as f32;
    (dr * dr + dg * dg + db * db).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_unique_and_lookup() {
        let themes = all();
        assert_eq!(themes.len(), 3);
        let mut ids: Vec<&str> = themes.iter().map(|t| t.id).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), 3, "theme ids must be unique");
        assert_eq!(by_id("dusk-pond").unwrap().name, "Dusk Pond");
        assert_eq!(by_id("morning-shallows").unwrap().name, "Morning Shallows");
        assert_eq!(by_id("moonwake").unwrap().name, "Moonwake");
        assert!(by_id("no-such-theme").is_none());
    }

    #[test]
    fn legacy_ids_migrate_forward() {
        assert_eq!(by_id("ember-warren").unwrap().id, "dusk-pond");
        assert_eq!(by_id("parchment-dawn").unwrap().id, "morning-shallows");
        assert_eq!(by_id("abyss-lantern").unwrap().id, "moonwake");
        assert_eq!(canonical_id("ember-warren"), Some("dusk-pond"));
        assert_eq!(canonical_id("moonwake"), Some("moonwake"));
        assert_eq!(canonical_id(""), None);
    }

    #[test]
    fn text_contrast_readable() {
        for t in all() {
            let ratio = contrast_ratio(t.text, t.bg);
            assert!(
                ratio >= 4.5,
                "theme {} text/bg contrast {ratio:.2} < 4.5",
                t.id
            );
        }
    }

    #[test]
    fn design_gates_hold_per_theme() {
        for t in all() {
            assert!(
                contrast_ratio(t.fright, t.wall) >= 3.0,
                "theme {} fright/wall below 3.0",
                t.id
            );
            assert!(
                contrast_ratio(t.eyes, t.bg) >= 3.0,
                "theme {} eyes/bg below 3.0",
                t.id
            );
            assert!(
                contrast_ratio(t.eyes, t.wall) >= 3.0,
                "theme {} eyes/wall below 3.0",
                t.id
            );
            assert_ne!(t.fright, Rgb(255, 255, 255));
            assert_ne!(t.fright, t.eyes);
        }
    }

    #[test]
    fn wardens_distinguishable() {
        for t in all() {
            let wardens = [t.bram, t.kessa, t.jory, t.nib];
            for i in 0..wardens.len() {
                for j in (i + 1)..wardens.len() {
                    let d = euclidean(wardens[i], wardens[j]);
                    assert!(
                        d >= 60.0,
                        "theme {} wardens {i}/{j} too close: {d:.1}",
                        t.id
                    );
                }
            }
        }
    }

    #[test]
    fn light_and_dark_backgrounds() {
        assert!(luminance(MORNING_SHALLOWS.bg) > 0.4);
        assert!(luminance(DUSK_POND.bg) < 0.25);
        assert!(luminance(MOONWAKE.bg) < 0.25);
    }

    #[test]
    fn mix_hits_both_ends_and_clamps() {
        let a = Rgb(0, 0, 0);
        let b = Rgb(255, 255, 255);
        assert_eq!(mix(a, b, 0.0), a);
        assert_eq!(mix(a, b, 1.0), b);
        assert_eq!(mix(a, b, -1.0), a);
        assert_eq!(mix(a, b, 2.0), b);
        assert_eq!(mix(a, b, 0.5), Rgb(128, 128, 128));
    }

    fn hex(c: Rgb) -> String {
        format!("#{:02X}{:02X}{:02X}", c.0, c.1, c.2)
    }

    #[test]
    fn tokens_mirror_theme_palettes() {
        // docs/design-tokens.json is the machine companion of design.md;
        // its launch-theme hex values must match these Rust originals exactly.
        let tokens = include_str!("../../../docs/design-tokens.json");
        for t in all() {
            let pairs = [
                ("bg", t.bg),
                ("wall", t.wall),
                ("wall_inner", t.wall_inner),
                ("crumb", t.crumb),
                ("sunseed", t.sunseed),
                ("pip", t.pip),
                ("bram", t.bram),
                ("kessa", t.kessa),
                ("jory", t.jory),
                ("nib", t.nib),
                ("fright", t.fright),
                ("eyes", t.eyes),
                ("text", t.text),
                ("dim_text", t.dim_text),
                ("accent", t.accent),
            ];
            let marker = format!("\"{}\": {{", t.id);
            let start = tokens
                .find(&marker)
                .unwrap_or_else(|| panic!("tokens missing theme {}", t.id));
            let pond = tokens
                .find("\"pondwake_themes\":")
                .expect("tokens missing the pondwake_themes companion");
            assert!(
                start < pond,
                "theme {} must be in the themes map, not pondwake_themes",
                t.id
            );
            let end = start + tokens[start..].find('}').expect("theme object must close") + 1;
            let theme = &tokens[start..end];
            for (slot, color) in pairs {
                assert!(
                    theme.contains(&format!("\"{slot}\": \"{}\"", hex(color))),
                    "tokens mismatch on {}.{slot} (want {})",
                    t.id,
                    hex(color)
                );
            }
        }
    }
}
