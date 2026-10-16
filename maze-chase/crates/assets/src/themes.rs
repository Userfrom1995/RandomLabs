//! Original color themes for Maze Chase (no I/O, no dependencies).

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

/// Launch theme: deep charcoal-brown background, ember-orange walls.
pub const EMBER_WARREN: Theme = Theme {
    id: "ember-warren",
    name: "Ember Warren",
    bg: Rgb(24, 16, 12),
    wall: Rgb(232, 110, 40),
    wall_inner: Rgb(120, 52, 22),
    crumb: Rgb(235, 200, 150),
    sunseed: Rgb(255, 215, 120),
    pip: Rgb(255, 225, 130),
    bram: Rgb(230, 70, 40),
    kessa: Rgb(60, 200, 180),
    jory: Rgb(240, 180, 60),
    nib: Rgb(170, 120, 230),
    fright: Rgb(235, 240, 245),
    eyes: Rgb(255, 255, 255),
    text: Rgb(245, 230, 200),
    dim_text: Rgb(170, 140, 115),
    accent: Rgb(255, 150, 60),
};

/// Dark-blue abyss theme: deep-sea background, bright signal walls.
pub const ABYSS_LANTERN: Theme = Theme {
    id: "abyss-lantern",
    name: "Abyss Lantern",
    bg: Rgb(8, 18, 38),
    wall: Rgb(70, 140, 220),
    wall_inner: Rgb(30, 70, 130),
    crumb: Rgb(200, 220, 235),
    sunseed: Rgb(255, 230, 140),
    pip: Rgb(255, 240, 170),
    bram: Rgb(255, 90, 70),
    kessa: Rgb(70, 220, 200),
    jory: Rgb(255, 200, 90),
    nib: Rgb(160, 140, 255),
    fright: Rgb(230, 245, 255),
    eyes: Rgb(255, 255, 255),
    text: Rgb(220, 235, 245),
    dim_text: Rgb(140, 165, 190),
    accent: Rgb(90, 200, 255),
};

/// Light theme: warm parchment background, dark umber text and walls.
pub const PARCHMENT_DAWN: Theme = Theme {
    id: "parchment-dawn",
    name: "Parchment Dawn",
    bg: Rgb(242, 230, 200),
    wall: Rgb(150, 90, 40),
    wall_inner: Rgb(190, 150, 100),
    crumb: Rgb(120, 85, 45),
    sunseed: Rgb(200, 130, 20),
    pip: Rgb(170, 95, 15),
    bram: Rgb(180, 50, 30),
    kessa: Rgb(20, 130, 125),
    jory: Rgb(180, 120, 20),
    nib: Rgb(110, 70, 170),
    fright: Rgb(150, 70, 70),
    eyes: Rgb(250, 250, 245),
    text: Rgb(46, 30, 20),
    dim_text: Rgb(110, 90, 70),
    accent: Rgb(200, 90, 30),
};

/// All themes in stable order.
pub fn all() -> [&'static Theme; 3] {
    [&EMBER_WARREN, &ABYSS_LANTERN, &PARCHMENT_DAWN]
}

/// Look up a theme by its id.
pub fn by_id(id: &str) -> Option<&'static Theme> {
    all().into_iter().find(|t| t.id == id)
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
        assert_eq!(by_id("ember-warren").unwrap().name, "Ember Warren");
        assert_eq!(by_id("abyss-lantern").unwrap().name, "Abyss Lantern");
        assert_eq!(by_id("parchment-dawn").unwrap().name, "Parchment Dawn");
        assert!(by_id("no-such-theme").is_none());
    }

    #[test]
    fn text_contrast_readable() {
        for t in all() {
            let ratio = contrast_ratio(t.text, t.bg);
            assert!(ratio >= 4.5, "theme {} text/bg contrast {ratio:.2} < 4.5", t.id);
        }
    }

    #[test]
    fn wardens_distinguishable() {
        for t in all() {
            let wardens = [t.bram, t.kessa, t.jory, t.nib];
            for i in 0..wardens.len() {
                for j in (i + 1)..wardens.len() {
                    let d = euclidean(wardens[i], wardens[j]);
                    assert!(d >= 60.0, "theme {} wardens {i}/{j} too close: {d:.1}", t.id);
                }
            }
        }
    }

    #[test]
    fn light_and_dark_backgrounds() {
        assert!(luminance(PARCHMENT_DAWN.bg) > 0.4);
        assert!(luminance(EMBER_WARREN.bg) < 0.25);
        assert!(luminance(ABYSS_LANTERN.bg) < 0.25);
    }

    fn hex(c: Rgb) -> String {
        format!("#{:02X}{:02X}{:02X}", c.0, c.1, c.2)
    }

    #[test]
    fn tokens_mirror_theme_palettes() {
        // docs/design-tokens.json is the machine companion of design.md;
        // its hex values must match these Rust originals exactly.
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
            assert!(
                tokens.contains(&format!("\"{}\"", t.id)),
                "tokens missing theme {}",
                t.id
            );
            for (slot, color) in pairs {
                assert!(
                    tokens.contains(&format!("\"{slot}\": \"{}\"", hex(color))),
                    "tokens mismatch on {}.{slot} (want {})",
                    t.id,
                    hex(color)
                );
            }
        }
    }
}
