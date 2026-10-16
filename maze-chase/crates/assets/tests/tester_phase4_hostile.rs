//! Tester Phase 4 hostile regression suite for `maze-chase-assets`.
//!
//! Red-team focus: glyph validation rejects hostile input, geometric
//! transforms are involutive on every shipped glyph, animation helpers
//! never panic on degenerate time values, and every shipped theme
//! resolves cleanly.

use maze_chase_assets::anim::{death_clip, fright_flash_on, pip_clip, relish_bob};
use maze_chase_assets::sprites::{
    flip_horizontal, rotate_cw, validate_glyph, CRUMB, EYES_DOWN, EYES_RIGHT, EYES_UP, FRIGHT_MASK,
    FRIGHT_MASK_FLASH, PIP_CLOSED, PIP_DEATH, PIP_RIGHT, PIP_RIGHT_MID, RELISH_ICONS, SUNSEED_A,
    SUNSEED_B, WARDEN_BRAM, WARDEN_JORY, WARDEN_KESSA, WARDEN_NIB,
};
use maze_chase_assets::themes;

fn refs(rows: &[String]) -> Vec<&str> {
    rows.iter().map(|s| s.as_str()).collect()
}

#[test]
fn every_shipped_glyph_validates() {
    assert_eq!(validate_glyph(&PIP_RIGHT), Ok((11, 11)));
    assert_eq!(validate_glyph(&PIP_RIGHT_MID), Ok((11, 11)));
    assert_eq!(validate_glyph(&PIP_CLOSED), Ok((11, 11)));
    for frame in PIP_DEATH {
        assert_eq!(validate_glyph(frame), Ok((11, 11)));
    }
    assert_eq!(validate_glyph(&WARDEN_BRAM), Ok((11, 11)));
    assert_eq!(validate_glyph(&WARDEN_KESSA), Ok((11, 11)));
    assert_eq!(validate_glyph(&WARDEN_JORY), Ok((11, 11)));
    assert_eq!(validate_glyph(&WARDEN_NIB), Ok((11, 11)));
    assert_eq!(validate_glyph(&EYES_RIGHT), Ok((5, 5)));
    assert_eq!(validate_glyph(&EYES_UP), Ok((5, 5)));
    assert_eq!(validate_glyph(&EYES_DOWN), Ok((5, 5)));
    assert_eq!(validate_glyph(&FRIGHT_MASK), Ok((11, 11)));
    assert_eq!(validate_glyph(&FRIGHT_MASK_FLASH), Ok((11, 11)));
    assert_eq!(validate_glyph(&CRUMB), Ok((3, 3)));
    assert_eq!(validate_glyph(&SUNSEED_A), Ok((7, 7)));
    assert_eq!(validate_glyph(&SUNSEED_B), Ok((7, 7)));
    for icon in RELISH_ICONS {
        assert_eq!(validate_glyph(&icon), Ok((7, 7)));
    }
}

#[test]
fn validator_rejects_hostile_glyphs() {
    // Empty / degenerate.
    assert!(validate_glyph(&[]).is_err());
    assert!(validate_glyph(&[""]).is_err());
    assert!(validate_glyph(&["", ""]).is_err());
    // Ragged rows.
    assert!(validate_glyph(&["###", "##"]).is_err());
    assert!(validate_glyph(&["##", "###"]).is_err());
    // Charset violations, including unicode lookalikes and whitespace.
    for bad in [
        "##\u{3000}#",
        "##o\u{00e4}#",
        "# #",
        "###\t",
        "##X##",
        "##O##",
        "##-##",
    ] {
        assert!(validate_glyph(&[bad]).is_err(), "must reject {bad:?}");
    }
    // Mixed valid/invalid rows still rejected.
    assert!(validate_glyph(&["...", ".X.", "..."]).is_err());
}

#[test]
fn wardens_are_pairwise_silhouette_distinct() {
    let wardens = [WARDEN_BRAM, WARDEN_KESSA, WARDEN_JORY, WARDEN_NIB];
    for (i, a) in wardens.iter().enumerate() {
        for (j, b) in wardens.iter().enumerate() {
            if i == j {
                continue;
            }
            let diff: usize = a
                .iter()
                .zip(b.iter())
                .map(|(ra, rb)| ra.chars().zip(rb.chars()).filter(|(x, y)| x != y).count())
                .sum();
            assert!(diff > 0, "wardens {i} and {j} must differ");
        }
    }
}

#[test]
fn flip_is_involution_on_every_glyph() {
    let glyphs: Vec<Vec<&str>> = vec![
        PIP_RIGHT.to_vec(),
        PIP_RIGHT_MID.to_vec(),
        PIP_CLOSED.to_vec(),
        WARDEN_BRAM.to_vec(),
        WARDEN_KESSA.to_vec(),
        WARDEN_JORY.to_vec(),
        WARDEN_NIB.to_vec(),
        EYES_RIGHT.to_vec(),
        FRIGHT_MASK.to_vec(),
    ];
    for g in &glyphs {
        let once = flip_horizontal(g);
        let twice = flip_horizontal(&refs(&once));
        let back: Vec<&str> = twice.iter().map(|s| s.as_str()).collect();
        assert_eq!(back, *g);
        // Flip preserves rectangularity and charset.
        assert!(validate_glyph(&refs(&once)).is_ok());
    }
}

#[test]
fn rotate_four_times_is_identity_and_preserves_validity() {
    let glyphs: Vec<Vec<&str>> = vec![
        PIP_RIGHT.to_vec(),
        WARDEN_BRAM.to_vec(),
        WARDEN_KESSA.to_vec(),
        WARDEN_JORY.to_vec(),
        WARDEN_NIB.to_vec(),
        FRIGHT_MASK.to_vec(),
        EYES_RIGHT.to_vec(),
        CRUMB.to_vec(),
        SUNSEED_A.to_vec(),
    ];
    for g in &glyphs {
        let r1 = rotate_cw(g);
        assert!(validate_glyph(&refs(&r1)).is_ok());
        let r2 = rotate_cw(&refs(&r1));
        let r3 = rotate_cw(&refs(&r2));
        let r4 = rotate_cw(&refs(&r3));
        let back: Vec<&str> = r4.iter().map(|s| s.as_str()).collect();
        assert_eq!(back, *g, "4x rotate must restore the glyph");
    }
}

#[test]
fn rotate_handles_empty_and_nonsquare_without_panic() {
    assert_eq!(rotate_cw(&[]), Vec::<String>::new());
    // Non-square HxW becomes WxH.
    let wide: [&str; 2] = ["o*o", "###"];
    let rot = rotate_cw(&wide);
    assert_eq!((rot.len(), rot[0].len()), (3, 2));
    let back = rotate_cw(&refs(&rotate_cw(&refs(&rotate_cw(&refs(&rot))))));
    assert_eq!(back.iter().map(|s| s.as_str()).collect::<Vec<_>>(), wide);
}

#[test]
fn fright_flash_documented_window_holds() {
    // Outside the warning window: always off.
    for t in [1.51f32, 2.0, 10.0, 60.0, f32::MAX] {
        assert!(!fright_flash_on(t), "t={t} must be off");
    }
    // Inside the window both phases appear across a sweep.
    let mut saw_on = false;
    let mut saw_off = false;
    let mut t = 0.0f32;
    while t <= 1.5 {
        if fright_flash_on(t) {
            saw_on = true;
        } else {
            saw_off = true;
        }
        t += 0.01;
    }
    assert!(saw_on && saw_off, "blink must show both phases");
}

#[test]
fn fright_flash_hostile_time_values_never_panic() {
    // Degenerate inputs must not panic; out-of-window magnitudes stay off.
    for t in [
        f32::NAN,
        f32::INFINITY,
        f32::NEG_INFINITY,
        -0.0,
        -1.0,
        -100.0,
        1e30,
    ] {
        let _ = fright_flash_on(t);
    }
    assert!(!fright_flash_on(f32::INFINITY));
}

#[test]
fn relish_bob_stays_in_range_on_hostile_time() {
    let mut t = -100.0f32;
    while t < 100.0 {
        let b = relish_bob(t);
        assert!((-1..=1).contains(&b), "out of range at t={t}: {b}");
        assert_eq!(b, relish_bob(t + 4.0), "period must be 4 s at t={t}");
        t += 0.125;
    }
    // Extreme magnitudes and NaN: no panic, still in range.
    for t in [1e30f32, -1e30, f32::INFINITY, f32::NEG_INFINITY, f32::NAN] {
        let b = relish_bob(t);
        assert!((-1..=1).contains(&b), "out of range at t={t}: {b}");
    }
}

#[test]
fn clips_are_sane_and_death_frames_match_art_count() {
    let pip = pip_clip();
    assert!(!pip.frames.is_empty());
    assert!(pip.frame_s > 0.0 && pip.frame_s.is_finite());
    assert!(pip.looped);
    let death = death_clip();
    assert_eq!(death.frames.len(), PIP_DEATH.len());
    assert!(death.frame_s > 0.0 && death.frame_s.is_finite());
    assert!(!death.looped);
    // Total play lengths are finite and positive.
    assert!((pip.frame_s * pip.frames.len() as f32).is_finite());
    assert!((death.frame_s * death.frames.len() as f32).is_finite());
}

#[test]
fn themes_resolve_and_reject_unknown() {
    assert_eq!(themes::all().len(), 3);
    let mut ids = std::collections::HashSet::new();
    for theme in themes::all() {
        assert!(ids.insert(theme.id), "duplicate theme id {}", theme.id);
        assert_eq!(themes::by_id(theme.id).unwrap().id, theme.id);
        assert!(!theme.name.is_empty());
    }
    assert!(themes::by_id("no-such-theme").is_none());
    assert!(themes::by_id("").is_none());
    assert!(themes::by_id("Ember Warren").is_none());
}
