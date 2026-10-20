//! Pure animation tables for Maze Chase (no I/O, no timing sources).
//!
//! A [`Clip`] references glyphs by string ID (keys such as `"pip_right_open"`
//! resolve to the art in [`crate::sprites`]). Helpers like
//! [`fright_flash_on`] and [`relish_bob`] are pure functions of time so they
//! are trivially testable.

/// A looping (or one-shot) sequence of glyph-ID frames.
pub struct Clip {
    /// Glyph ID keys, e.g. `"pip_right_open"`.
    pub frames: &'static [&'static str],
    /// Seconds each frame is shown.
    pub frame_s: f32,
    /// Whether the sequence repeats.
    pub looped: bool,
}

/// Pip chomp: 3-frame mouth cycle at 12 fps, looped.
pub fn pip_clip() -> Clip {
    Clip {
        frames: &["pip_right_open", "pip_right_mid", "pip_closed"],
        frame_s: 1.0 / 12.0,
        looped: true,
    }
}

/// Rill death: 4 frames at 0.10 s each, played once (not looped); the
/// renderer then holds the final frame for the death window.
pub fn death_clip() -> Clip {
    Clip {
        frames: &["death_0", "death_1", "death_2", "death_3"],
        frame_s: 0.1,
        looped: false,
    }
}

/// Sunseed halo pulse: one 7x7 -> 9x9 beat every 0.4 s.
pub const SUNSEED_HALO_S: f32 = 0.4;

/// Whether the wide sunseed halo is shown at `t` seconds.
pub fn sunseed_halo_on(t: f32) -> bool {
    if !t.is_finite() {
        return false;
    }
    t.rem_euclid(SUNSEED_HALO_S) < SUNSEED_HALO_S * 0.5
}

/// Fright-mask style sequence: entry morph first, then normal or warning.
pub fn fright_mask_id(elapsed: f32, t_left: f32) -> &'static str {
    if !elapsed.is_finite() || elapsed < 0.0 {
        return "fright_mask";
    }
    if elapsed < 0.25 {
        return "fright_entry";
    }
    if fright_flash_on(t_left) {
        "fright_mask_flash"
    } else {
        "fright_mask"
    }
}

/// Frame index of the four-frame pickup burst at `elapsed` seconds.
///
/// Returns `None` once the one-shot has finished. Non-finite or negative
/// input is treated as the first frame so renderers can stay branch-light.
pub fn pickup_burst_frame(elapsed: f32) -> Option<usize> {
    const STEP_S: f32 = 0.0667;
    if !elapsed.is_finite() || elapsed < 0.0 {
        return Some(0);
    }
    let frame = (elapsed / STEP_S).floor() as usize;
    if frame >= 4 {
        None
    } else {
        Some(frame)
    }
}

/// Level-clear sweep progress in `0..=1`, or `None` before/after the 0.3 s
/// band wipe. A caller maps this to the tile column crossing the board.
pub fn level_clear_sweep(t: f32) -> Option<f32> {
    const SWEEP_S: f32 = 0.3;
    if !t.is_finite() || !(0.0..SWEEP_S).contains(&t) {
        return None;
    }
    Some((t / SWEEP_S).clamp(0.0, 1.0))
}

/// How long the four-pixel turn spark lives after a reversal.
pub const TURN_SPARK_S: f32 = 0.18;

/// Whether the turn spark is visible at `elapsed` seconds.
pub fn turn_spark_on(elapsed: f32) -> bool {
    elapsed.is_finite() && (0.0..TURN_SPARK_S).contains(&elapsed)
}

/// Whether the fright-mask flash variant shows, given seconds of the turn left.
///
/// Returns true only during the last 1.5 s warning window, blinking at 6 Hz:
/// the fractional part of `t_left * 6.0` gates the on/off phase.
pub fn fright_flash_on(t_left: f32) -> bool {
    if t_left > 1.5 {
        return false;
    }
    (t_left * 6.0).fract() < 0.5
}

/// Relish bob pixel offset (-1..=1) as a triangle wave over `t` (seconds).
///
/// Period 4 s: 0 at t=0, +1 at t=1, 0 at t=2, -1 at t=3. Pure function, no
/// trig needed.
pub fn relish_bob(t: f32) -> i32 {
    let p = t.rem_euclid(4.0);
    if p < 0.5 || p >= 3.5 {
        0
    } else if p < 1.5 {
        1
    } else if p < 2.5 {
        0
    } else {
        -1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pip_clip_chomps_looped() {
        let c = pip_clip();
        assert_eq!(c.frames, &["pip_right_open", "pip_right_mid", "pip_closed"]);
        assert!((c.frame_s - 1.0 / 12.0).abs() < 1e-6);
        assert!(c.looped);
        // 12 fps: three frames cover a quarter second.
        assert!((c.frame_s * 3.0 - 0.25).abs() < 1e-6);
    }

    #[test]
    fn death_clip_oneshot() {
        let c = death_clip();
        assert_eq!(c.frames.len(), 4);
        assert!((c.frame_s - 0.1).abs() < 1e-6);
        assert!(!c.looped);
        // Full play length: 4 * 0.10 = 0.40 s.
        assert!((c.frame_s * c.frames.len() as f32 - 0.4).abs() < 1e-6);
    }

    #[test]
    fn fright_flash_window_and_blink() {
        // Outside the warning window: always off.
        assert!(!fright_flash_on(2.0));
        assert!(!fright_flash_on(1.51));
        // Boundary: 1.5 * 6 = 9.0 exactly, fractional part 0 -> on.
        assert!(fright_flash_on(1.5));
        // Inside the window both blink phases occur.
        assert!(fright_flash_on(1.4)); // 8.4 -> on
        assert!(!fright_flash_on(1.45)); // 8.7 -> off
        assert!(fright_flash_on(0.0));
    }

    #[test]
    fn lanterndrift_helpers_are_bounded_and_pure() {
        assert!(sunseed_halo_on(0.0));
        assert!(!sunseed_halo_on(0.2));
        assert!(sunseed_halo_on(0.4));
        assert!(!sunseed_halo_on(f32::NAN));
        assert!(!sunseed_halo_on(f32::INFINITY));

        assert_eq!(fright_mask_id(0.0, 5.0), "fright_entry");
        assert_eq!(fright_mask_id(0.24, 5.0), "fright_entry");
        assert_eq!(fright_mask_id(0.25, 5.0), "fright_mask");
        assert_eq!(fright_mask_id(1.0, 1.5), "fright_mask_flash");
        assert_eq!(fright_mask_id(f32::NAN, 0.0), "fright_mask");

        assert_eq!(pickup_burst_frame(0.0), Some(0));
        assert_eq!(pickup_burst_frame(0.0667), Some(1));
        assert_eq!(pickup_burst_frame(0.21), Some(3));
        assert_eq!(pickup_burst_frame(0.27), None);
        assert_eq!(pickup_burst_frame(f32::NAN), Some(0));

        assert_eq!(level_clear_sweep(0.0), Some(0.0));
        assert_eq!(level_clear_sweep(0.15), Some(0.5));
        assert_eq!(level_clear_sweep(0.3), None);
        assert_eq!(level_clear_sweep(-1.0), None);

        assert!(turn_spark_on(0.0));
        assert!(turn_spark_on(0.179));
        assert!(!turn_spark_on(0.18));
        assert!(!turn_spark_on(f32::NAN));
    }

    #[test]
    fn relish_bob_triangle() {
        assert_eq!(relish_bob(0.0), 0);
        assert_eq!(relish_bob(1.0), 1);
        assert_eq!(relish_bob(2.0), 0);
        assert_eq!(relish_bob(3.0), -1);
        // Stays in range across samples, including negatives and wrap-around.
        let mut t = -8.0;
        while t < 8.0 {
            let b = relish_bob(t);
            assert!((-1..=1).contains(&b), "out of range at t={t}: {b}");
            assert_eq!(b, relish_bob(t + 4.0), "period must be 4 s");
            t += 0.25;
        }
    }
}
