//! Tester design-token gate guard (PR #688 design pass): the Pondwake
//! palettes in `docs/design-tokens.json` are binding for the visual phase,
//! so the artifact's contrast gates must hold mechanically rather than in
//! prose alone. This suite recomputes every gate from the raw hexes (WCAG
//! relative luminance; pairwise euclidean RGB hunter separation), asserts
//! the never-white fright rule and the eyes-slot separation, and checks
//! the shipped metrics block against the recomputation, so a palette edit
//! or a vanity metric that breaks a gate fails CI before the Rust mirror
//! lands. Adding a themed palette is a deliberate binding change: the
//! expected-id list below must grow with it.

const TOKENS: &str = include_str!("../../../docs/design-tokens.json");

const THEMES: [&str; 3] = ["dusk-pond", "morning-shallows", "moonwake"];

type Rgb = (u8, u8, u8);

fn balanced_block<'a>(text: &'a str, marker: &str) -> &'a str {
    let at = text
        .find(marker)
        .unwrap_or_else(|| panic!("missing json key {marker}"));
    let open = at + text[at..].find('{').expect("opening brace");
    let bytes = text.as_bytes();
    let mut depth = 0i32;
    let mut in_str = false;
    let mut esc = false;
    for (i, &b) in bytes.iter().enumerate().skip(open) {
        if in_str {
            if esc {
                esc = false;
            } else if b == b'\\' {
                esc = true;
            } else if b == b'"' {
                in_str = false;
            }
            continue;
        }
        match b {
            b'"' => in_str = true,
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    return &text[open..=i];
                }
            }
            _ => {}
        }
    }
    panic!("unbalanced json block after {marker}");
}

fn slot(block: &str, name: &str) -> Rgb {
    let marker = format!("\"{name}\": \"#");
    let at = block
        .find(&marker)
        .unwrap_or_else(|| panic!("missing slot {name}"))
        + marker.len();
    let hex = &block[at..at + 6];
    let parse = |s: &str| u8::from_str_radix(s, 16).unwrap_or_else(|e| panic!("bad hex {s}: {e}"));
    (parse(&hex[0..2]), parse(&hex[2..4]), parse(&hex[4..6]))
}

fn metric(block: &str, name: &str) -> f32 {
    let marker = format!("\"{name}\": ");
    let at = block
        .find(&marker)
        .unwrap_or_else(|| panic!("missing metric {name}"))
        + marker.len();
    let end = at
        + block[at..]
            .find(|c: char| c == ',' || c == '}' || c == '\n')
            .expect("metric terminator");
    block[at..end]
        .trim()
        .parse()
        .unwrap_or_else(|e| panic!("bad metric {name}: {e}"))
}

fn linear(c: f32) -> f32 {
    if c <= 0.03928 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

fn luminance(c: Rgb) -> f32 {
    0.2126 * linear(c.0 as f32 / 255.0)
        + 0.7152 * linear(c.1 as f32 / 255.0)
        + 0.0722 * linear(c.2 as f32 / 255.0)
}

fn contrast(a: Rgb, b: Rgb) -> f32 {
    let (x, y) = (luminance(a), luminance(b));
    let (hi, lo) = if x >= y { (x, y) } else { (y, x) };
    (hi + 0.05) / (lo + 0.05)
}

fn euclidean(a: Rgb, b: Rgb) -> f32 {
    let dr = a.0 as f32 - b.0 as f32;
    let dg = a.1 as f32 - b.1 as f32;
    let db = a.2 as f32 - b.2 as f32;
    (dr * dr + dg * dg + db * db).sqrt()
}

fn min_hunter_distance(block: &str) -> f32 {
    let hunters = [
        slot(block, "bram"),
        slot(block, "kessa"),
        slot(block, "jory"),
        slot(block, "nib"),
    ];
    let mut min = f32::MAX;
    for i in 0..hunters.len() {
        for j in (i + 1)..hunters.len() {
            min = min.min(euclidean(hunters[i], hunters[j]));
        }
    }
    min
}

fn theme<'a>(pond: &'a str, id: &str) -> &'a str {
    balanced_block(pond, &format!("\"{id}\":"))
}

#[test]
fn pondwake_palette_gates_hold() {
    let pond = balanced_block(TOKENS, "\"pondwake_themes\":");
    assert_eq!(
        pond.matches("\"luminance_class\"").count(),
        THEMES.len(),
        "pondwake_themes must carry exactly three themed palettes"
    );
    for id in THEMES {
        let t = theme(pond, id);
        let bg = slot(&t, "bg");
        let wall = slot(&t, "wall");
        let text = slot(&t, "text");
        let fright = slot(&t, "fright");
        let eyes = slot(&t, "eyes");

        let text_bg = contrast(text, bg);
        assert!(
            text_bg >= 4.5,
            "{id}: text/bg {text_bg:.2} below the 4.5 gate"
        );
        let fright_wall = contrast(fright, wall);
        assert!(
            fright_wall >= 3.0,
            "{id}: fright/wall {fright_wall:.2} below the 3.0 gate"
        );
        let eyes_bg = contrast(eyes, bg);
        assert!(
            eyes_bg >= 3.0,
            "{id}: eyes/bg {eyes_bg:.2} below the 3.0 gate"
        );
        let eyes_wall = contrast(eyes, wall);
        assert!(
            eyes_wall >= 3.0,
            "{id}: eyes/wall {eyes_wall:.2} below the 3.0 gate"
        );
        let d = min_hunter_distance(&t);
        assert!(
            d >= 60.0,
            "{id}: hunter pairwise minimum {d:.2} below the 60 gate"
        );
        assert_ne!(
            fright,
            (255, 255, 255),
            "{id}: fright fill must never be white"
        );
        assert_ne!(
            fright, eyes,
            "{id}: fright fill must never use the eyes slot"
        );
    }
}

#[test]
fn pondwake_metrics_match_recomputation() {
    let pond = balanced_block(TOKENS, "\"pondwake_themes\":");
    for id in THEMES {
        let t = theme(pond, id);
        let bg = slot(&t, "bg");
        let wall = slot(&t, "wall");
        let text = slot(&t, "text");
        let fright = slot(&t, "fright");
        let eyes = slot(&t, "eyes");

        let checks = [
            ("text_bg", contrast(text, bg), 0.01f32),
            ("wall_bg", contrast(wall, bg), 0.01),
            ("fright_bg", contrast(fright, bg), 0.01),
            ("fright_wall", contrast(fright, wall), 0.01),
            ("eyes_bg", contrast(eyes, bg), 0.01),
            ("eyes_wall", contrast(eyes, wall), 0.01),
            ("hunter_min_distance", min_hunter_distance(&t), 0.05),
        ];
        for (name, computed, tol) in checks {
            let claimed = metric(&t, name);
            assert!(
                (claimed - computed).abs() <= tol,
                "{id}: metric {name} claims {claimed} but recomputes to {computed:.4}"
            );
        }
        let claimed_lum = metric(&t, "bg_luminance");
        let recomputed = luminance(bg);
        assert!(
            (claimed_lum - recomputed).abs() <= 0.001,
            "{id}: bg_luminance claims {claimed_lum} but recomputes to {recomputed:.6}"
        );
    }
}
