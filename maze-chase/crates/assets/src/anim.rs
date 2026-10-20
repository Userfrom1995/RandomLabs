//! Pure animation helpers for Maze Chase (no I/O, no timing sources).
//!
//! Every helper is a pure function of engine time so it is trivially
//! testable, and every renderer samples the same engine clock instead of
//! owning a refresh-rate-dependent counter.

/// Seconds per death-sink frame (4 frames, 100 ms each).
pub const DEATH_FRAME_S: f32 = 0.1;

/// Death-sink frame index at `elapsed` seconds into the death window.
///
/// The clip is one-shot: every renderer holds the final frame after 400 ms
/// instead of looping the intact body back in. `kill_player` resets the
/// engine's state clock, so the clip always starts at frame 0 regardless of
/// the global render frame counter. Negative or non-finite input reads as
/// frame 0 so a renderer never panics on a bad clock.
pub fn death_frame(elapsed: f32) -> usize {
    if !elapsed.is_finite() || elapsed < 0.0 {
        return 0;
    }
    ((elapsed / DEATH_FRAME_S) as usize).min(crate::sprites::PIP_DEATH.len() - 1)
}

/// Sunseed halo phase at `t` seconds of engine time.
///
/// The two 7x7 sheets alternate every 200 ms across the design's 400 ms
/// period, independent of the render refresh rate. Non-finite input holds
/// the first sheet so a renderer never panics on a bad clock.
pub fn sunseed_halo(t: f32) -> bool {
    t.is_finite() && t.rem_euclid(0.4) < 0.2
}

/// Fright-mask style sequence: entry morph first, then normal or warning.
///
/// The entry morph holds for the first 250 ms of the turn; after that the
/// steady mask shows, or the hollow warning variant during the flash phase.
/// A reduced-flash caller passes `f32::INFINITY` as `t_left` to hold the
/// hollow warning mask for the whole window.
pub fn fright_mask_id(elapsed: f32, t_left: f32) -> &'static str {
    if !elapsed.is_finite() || elapsed < 0.0 || elapsed < 0.25 {
        return "fright_entry";
    }
    if t_left.is_infinite() || fright_flash_on(t_left) {
        "fright_mask_flash"
    } else {
        "fright_mask"
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

/// Whether the level-clear lily-crown banner is up at `elapsed` seconds.
///
/// The 300 ms sweep lands first; the 9x9 lily crown holds for the next
/// 900 ms (0.3..1.2 s of the 2.0 s clear window), leaving the rest empty.
pub fn level_clear_banner_on(elapsed: f32) -> bool {
    elapsed.is_finite() && (0.3..1.2).contains(&elapsed)
}

/// Whether the fright-mask flash variant shows, given seconds of the turn left.
///
/// Returns true only during the last 1.5 s warning window, blinking at
/// 2.5 Hz (inside the design's 2 to 3 Hz cap): the fractional part of
/// `t_left * 2.5` gates the on/off phase.
pub fn fright_flash_on(t_left: f32) -> bool {
    if t_left > 1.5 {
        return false;
    }
    (t_left * 2.5).fract() < 0.5
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
    fn fright_flash_window_and_blink() {
        // Outside the warning window: always off.
        assert!(!fright_flash_on(2.0));
        assert!(!fright_flash_on(1.51));
        // 2.5 Hz: both phases inside the window.
        assert!(fright_flash_on(1.2)); // 3.0 -> on
        assert!(fright_flash_on(0.8)); // 2.0 -> on
        assert!(!fright_flash_on(1.0)); // 2.5 -> off
        assert!(!fright_flash_on(1.45)); // 3.625 -> off
        assert!(fright_flash_on(0.0));
    }

    #[test]
    fn sunseed_halo_alternates_every_two_hundred_milliseconds() {
        assert!(sunseed_halo(0.0));
        assert!(sunseed_halo(0.199));
        assert!(!sunseed_halo(0.2));
        assert!(!sunseed_halo(0.399));
        assert!(sunseed_halo(0.4));
        assert!(sunseed_halo(0.6 - 0.001));
        assert!(!sunseed_halo(f32::NAN));
        assert!(!sunseed_halo(f32::INFINITY));
    }

    #[test]
    fn fright_mask_id_selects_entry_steady_and_flash() {
        assert_eq!(fright_mask_id(0.0, 5.0), "fright_entry");
        assert_eq!(fright_mask_id(0.24, 5.0), "fright_entry");
        assert_eq!(fright_mask_id(0.25, 5.0), "fright_mask");
        assert_eq!(fright_mask_id(1.0, 1.2), "fright_mask_flash");
        assert_eq!(fright_mask_id(f32::NAN, 0.0), "fright_entry");
        assert_eq!(
            fright_mask_id(1.0, f32::INFINITY),
            "fright_mask_flash",
            "reduced flash holds the hollow warning mask"
        );
    }

    #[test]
    fn level_clear_windows_are_sequential() {
        assert_eq!(level_clear_sweep(0.0), Some(0.0));
        assert_eq!(level_clear_sweep(0.15), Some(0.5));
        assert_eq!(level_clear_sweep(0.3), None);
        assert_eq!(level_clear_sweep(-1.0), None);

        assert!(!level_clear_banner_on(0.0));
        assert!(!level_clear_banner_on(0.299));
        assert!(level_clear_banner_on(0.3));
        assert!(level_clear_banner_on(1.199));
        assert!(!level_clear_banner_on(1.2));
        assert!(!level_clear_banner_on(f32::NAN));
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
