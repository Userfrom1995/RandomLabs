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

/// Pip death: 4 frames at 0.12 s each, played once (not looped).
pub fn death_clip() -> Clip {
    Clip {
        frames: &["death_0", "death_1", "death_2", "death_3"],
        frame_s: 0.12,
        looped: false,
    }
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
        assert!((c.frame_s - 0.12).abs() < 1e-6);
        assert!(!c.looped);
        // Full play length: 4 * 0.12 = 0.48 s.
        assert!((c.frame_s * c.frames.len() as f32 - 0.48).abs() < 1e-6);
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
