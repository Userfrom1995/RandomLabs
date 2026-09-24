//! Physical relations: seismic moment, fault scaling, travel times, and
//! amplitude attenuation.
//!
//! All relations are the standard empirical ones used in seismology:
//! - Moment magnitude to seismic moment: Hanks & Kanamori (1979).
//! - Fault length and width from magnitude: Wells & Coppersmith (1994),
//!   all-slip-type regressions.
//! - Body-wave amplitude scales with the cube root of moment and decays as
//!   1 / distance (geometric spreading).
//! - A Rayleigh/surface wave travels at about 92% of the S-wave speed along
//!   the surface.

/// Crustal P-wave velocity (km/s).
pub const P_VELOCITY_KM_S: f64 = 6.0;
/// Crustal S-wave velocity (km/s).
pub const S_VELOCITY_KM_S: f64 = 3.5;
/// Surface (Rayleigh) wave speed as a fraction of the S-wave speed.
pub const SURFACE_RATIO: f64 = 0.92;
/// Reference hypocentral distance used to normalize amplitudes (km).
pub const REFERENCE_DISTANCE_KM: f64 = 50.0;
/// Reference magnitude that yields unit S-wave amplitude at the reference
/// distance.
pub const REFERENCE_MAGNITUDE: f64 = 6.0;
/// Largest supported moment magnitude.
pub const MAX_MAGNITUDE: f64 = 9.8;

/// Seismic moment in N*m for a given moment magnitude (Hanks & Kanamori).
pub fn seismic_moment_nm(mw: f64) -> f64 {
    10f64.powf(1.5 * (mw + 10.7))
}

/// Surface rupture length in km (Wells & Coppersmith, all slip types).
pub fn rupture_length_km(mw: f64) -> f64 {
    10f64.powf(0.59 * mw - 2.44)
}

/// Downdip rupture width in km (Wells & Coppersmith, all slip types).
pub fn rupture_width_km(mw: f64) -> f64 {
    10f64.powf(0.32 * mw - 1.01)
}

/// Ground-motion amplitude relative to a reference magnitude event.
///
/// Amplitude scales with the cube root of seismic moment, so
/// A / A_ref = (Mo / Mo_ref)^(1/3) = 10^(0.5 * (Mw - M_ref)).
pub fn moment_amplitude_scale(mw: f64) -> f64 {
    10f64.powf(0.5 * (mw - REFERENCE_MAGNITUDE))
}

/// Travel time (seconds) for a body wave over a given path (km).
pub fn travel_time(distance_km: f64, velocity: f64) -> f64 {
    distance_km / velocity
}

/// The P-to-S arrival gap (seconds) at a given epicentral distance.
///
/// Because P is faster than S, the gap grows linearly with distance, which is
/// exactly the relationship the seismograms make visible.
pub fn ps_gap(epicentral_km: f64, vp: f64, vs: f64) -> f64 {
    epicentral_km * (vp - vs) / (vp * vs)
}

/// Geometric-spreading attenuation factor for body waves (1 / distance).
pub fn body_wave_attenuation(hypocentral_km: f64) -> f64 {
    REFERENCE_DISTANCE_KM / hypocentral_km
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn moment_is_monotonic_in_magnitude() {
        assert!(seismic_moment_nm(6.0) < seismic_moment_nm(7.0));
        assert!(seismic_moment_nm(3.0) < seismic_moment_nm(9.0));
        // Mw 6.0 corresponds to about 1e25 N*m.
        let m6 = seismic_moment_nm(6.0);
        assert!((1.0e24..1.0e26).contains(&m6));
    }

    #[test]
    fn rupture_scales_up_with_magnitude() {
        assert!(rupture_length_km(6.0) < rupture_length_km(7.0));
        assert!(rupture_width_km(6.0) < rupture_width_km(7.0));
        assert!(rupture_length_km(6.0) > 1.0);
        assert!(rupture_width_km(6.0) > 1.0);
    }

    #[test]
    fn p_arrives_before_s_everywhere() {
        for d in [10.0, 50.0, 120.0, 300.0] {
            let tp = travel_time(d, P_VELOCITY_KM_S);
            let ts = travel_time(d, S_VELOCITY_KM_S);
            assert!(tp < ts);
            assert!(ts - tp > 0.0);
        }
    }

    #[test]
    fn ps_gap_scales_linearly_with_distance() {
        let g1 = ps_gap(50.0, P_VELOCITY_KM_S, S_VELOCITY_KM_S);
        let g2 = ps_gap(100.0, P_VELOCITY_KM_S, S_VELOCITY_KM_S);
        assert!((g2 / g1 - 2.0).abs() < 1e-9);
    }

    #[test]
    fn attenuation_is_inverse_distance() {
        let a1 = body_wave_attenuation(100.0);
        let a2 = body_wave_attenuation(50.0);
        assert!((a2 / a1 - 2.0).abs() < 1e-9);
    }
}
