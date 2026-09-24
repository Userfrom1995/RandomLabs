//! Seismogram synthesis.
//!
//! Each station's trace is the superposition of three Ricker wavelets (the
//! classic zero-phase seismic pulse): a small high-frequency P phase, a
//! large lower-frequency S phase, and a low-frequency surface wave, each
//! centered on its arrival time and scaled by its amplitude. Seeded noise is
//! added so the phases read naturally against a background.

use crate::model::Station;
use crate::rng::Rng;

/// Center frequency of the P wavelet (Hz).
pub const P_FREQ_HZ: f64 = 6.0;
/// Center frequency of the S wavelet (Hz).
pub const S_FREQ_HZ: f64 = 2.5;
/// Center frequency of the surface wave (Hz).
pub const SURFACE_FREQ_HZ: f64 = 1.0;
/// Seconds of quiet trace kept after the last arrival.
pub const TRAIL_SECONDS: f64 = 6.0;
/// Wavelet half-width in periods, on either side of the arrival.
pub const WAVELET_PERIODS: f64 = 2.5;

/// Number of samples for a trace of `duration` seconds at `dt` seconds.
pub fn sample_count(duration: f64, dt: f64) -> usize {
    (duration / dt).ceil() as usize
}

/// The Ricker (Mexican-hat) wavelet: zero at t=0 for the value 1, symmetric,
/// with a center frequency `freq` in Hz.
pub fn ricker(t: f64, freq: f64) -> f64 {
    let a = std::f64::consts::PI * std::f64::consts::PI * freq * freq;
    (1.0 - 2.0 * a * t * t) * (-a * t * t).exp()
}

/// Peak absolute amplitude of a trace.
pub fn peak_amplitude(samples: &[f64]) -> f64 {
    samples.iter().fold(0.0f64, |m, s| m.max(s.abs()))
}

/// A sensible trace duration covering the last arrival plus a quiet trail.
pub fn recommended_duration(stations: &[Station]) -> f64 {
    let last = stations
        .iter()
        .map(|s| s.surface_time.max(s.s_time))
        .fold(0.0f64, f64::max);
    (last + TRAIL_SECONDS).max(10.0)
}

/// Synthesize the seismogram for one station.
pub fn synth_station(
    st: &Station,
    dt: f64,
    duration: f64,
    noise_frac: f64,
    rng: &mut Rng,
) -> Vec<f64> {
    let n = sample_count(duration, dt);
    let mut samples = vec![0.0f64; n];
    add_phase(&mut samples, st.p_time, st.p_amp, P_FREQ_HZ, dt);
    add_phase(&mut samples, st.s_time, st.s_amp, S_FREQ_HZ, dt);
    add_phase(
        &mut samples,
        st.surface_time,
        st.surface_amp,
        SURFACE_FREQ_HZ,
        dt,
    );
    let noise_amp = noise_frac * st.s_amp;
    if noise_amp > 0.0 {
        for s in samples.iter_mut() {
            *s += rng.next_range(-noise_amp, noise_amp);
        }
    }
    samples
}

/// Add one Ricker wavelet to a trace at the given arrival time.
fn add_phase(samples: &mut [f64], arrival: f64, amp: f64, freq: f64, dt: f64) {
    if amp <= 0.0 {
        return;
    }
    let half = WAVELET_PERIODS / freq;
    let start = ((arrival - half) / dt).floor() as isize;
    let end = ((arrival + half) / dt).ceil() as isize;
    for i in start..=end {
        if i < 0 {
            continue;
        }
        let ui = i as usize;
        if ui >= samples.len() {
            break;
        }
        let t = ui as f64 * dt - arrival;
        samples[ui] += amp * ricker(t, freq);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{place_stations, FaultGrid, GridConfig};
    use crate::physics;

    fn test_station() -> Station {
        let grid = FaultGrid::new(
            &GridConfig {
                cells: 64,
                size_km: 256.0,
            },
            128.0,
            128.0,
            6.0,
            0.0,
        )
        .unwrap();
        let mut rng = Rng::new(42);
        let params = crate::model::SourceParams {
            depth_km: 8.0,
            vp: physics::P_VELOCITY_KM_S,
            vs: physics::S_VELOCITY_KM_S,
            mw: 6.0,
            min_km: 25.0,
            max_km: 200.0,
        };
        let (stations, _) = place_stations(&grid, 6, &params, &mut rng);
        stations[2].clone()
    }

    #[test]
    fn ricker_peaks_at_zero_and_is_symmetric() {
        let f = 2.5;
        assert!((ricker(0.0, f) - 1.0).abs() < 1e-9);
        for t in [0.1, 0.3, 0.8] {
            assert!((ricker(t, f) - ricker(-t, f)).abs() < 1e-9);
        }
    }

    #[test]
    fn s_phase_dominates_the_trace() {
        let st = test_station();
        let dt = 0.02;
        let dur = recommended_duration(std::slice::from_ref(&st));
        let mut rng = Rng::new(5);
        let trace = synth_station(&st, dt, dur, 0.0, &mut rng);
        assert_eq!(trace.len(), sample_count(dur, dt));
        assert!(peak_amplitude(&trace) > 0.0);
        // S amplitude is larger than P, so the peak must exceed the P-only
        // contribution near the P arrival.
        let p_idx = (st.p_time / dt) as usize;
        let s_idx = (st.s_time / dt) as usize;
        assert!(trace[s_idx].abs() > trace[p_idx].abs());
    }

    #[test]
    fn noise_increases_with_fraction() {
        let st = test_station();
        let dt = 0.02;
        let dur = recommended_duration(std::slice::from_ref(&st));
        let mut r1 = Rng::new(5);
        let mut r2 = Rng::new(5);
        let quiet = synth_station(&st, dt, dur, 0.001, &mut r1);
        let loud = synth_station(&st, dt, dur, 0.5, &mut r2);
        let quiet_energy: f64 = quiet.iter().map(|s| s * s).sum();
        let loud_energy: f64 = loud.iter().map(|s| s * s).sum();
        assert!(loud_energy > quiet_energy * 10.0);
    }

    #[test]
    fn all_samples_are_finite() {
        let st = test_station();
        let dt = 0.02;
        let dur = recommended_duration(std::slice::from_ref(&st));
        let mut rng = Rng::new(3);
        let trace = synth_station(&st, dt, dur, 0.05, &mut rng);
        assert!(trace.iter().all(|s| s.is_finite()));
    }
}
