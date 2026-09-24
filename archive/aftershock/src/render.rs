//! ASCII seismogram rendering for the terminal.
//!
//! Each station's trace is drawn as a single line of `#` across a grid of
//! `height` amplitude rows and `width` time columns. The zero line is drawn
//! as a dash row with `P`, `S`, and `R` markers placed at the corresponding
//! arrival columns, so the P-to-S gap is directly readable off the plot.

use crate::model::Station;
use crate::waveform;

/// Plot dimensions.
pub struct PlotParams {
    pub width: usize,
    pub height: usize,
}

/// Render one station's seismogram to a string block.
pub fn render_station(st: &Station, samples: &[f64], dt: f64, p: &PlotParams) -> String {
    let peak = waveform::peak_amplitude(samples);
    let h = p.height.max(3);
    let w = p.width.max(16);
    let mut out = String::new();
    out.push_str(&format!(
        "Station {}  |  epicentral {:.1} km, azimuth {:03.0} deg\n",
        st.name, st.epicentral_km, st.azimuth_deg
    ));
    out.push_str(&format!(
        "  hypocentral {:.1} km  |  P @ {:.1}s  S @ {:.1}s  R @ {:.1}s  |  P-S gap {:.1}s\n",
        st.hypocentral_km,
        st.p_time,
        st.s_time,
        st.surface_time,
        st.s_time - st.p_time
    ));
    if peak <= 0.0 {
        out.push_str("  (no signal)\n\n");
        return out;
    }

    // samples per column; every column shows one amplitude value
    let step = samples.len().div_ceil(w);
    let axis = (h - 1) / 2;
    // Map each time column to the row of its amplitude value.
    let mut rows = vec![0usize; w];
    for (col, slot) in rows.iter_mut().enumerate() {
        let Some(&value) = samples.get(col * step) else {
            break;
        };
        let norm = (value / peak).clamp(-1.0, 1.0);
        *slot = (((1.0 - norm) * (h - 1) as f64) / 2.0).round() as usize;
    }
    let mut grid = vec![vec![' '; w]; h];
    for (col, &r) in rows.iter().enumerate() {
        grid[r.min(h - 1)][col] = '#';
    }

    let col_of = |t: f64| -> Option<usize> {
        if t < 0.0 {
            return None;
        }
        let c = (t / (dt * step as f64)).round() as isize;
        if c < 0 {
            return None;
        }
        let c = c as usize;
        if c >= w {
            None
        } else {
            Some(c)
        }
    };
    for (label, t) in [('P', st.p_time), ('S', st.s_time), ('R', st.surface_time)] {
        if let Some(c) = col_of(t) {
            grid[axis][c] = label;
        }
    }
    for cell in grid[axis].iter_mut() {
        if *cell == ' ' {
            *cell = '-';
        }
    }

    for row in &grid {
        out.push_str(&format!("  {}\n", row.iter().collect::<String>()));
    }

    // time ruler along the bottom
    let total = samples.len() as f64 * dt;
    let mid = total / 2.0;
    let mut ruler = vec![' '; w];
    let labels: [(usize, String); 3] = [
        (0, "0s".to_string()),
        (w / 2, format!("{:.0}s", mid)),
        (w.saturating_sub(4), format!("{:.0}s", total)),
    ];
    for (pos, text) in labels {
        for (i, ch) in text.chars().enumerate() {
            if pos + i < w {
                ruler[pos + i] = ch;
            }
        }
    }
    out.push_str(&format!("  {}\n\n", ruler.iter().collect::<String>()));
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{place_stations, FaultGrid, GridConfig};
    use crate::physics;
    use crate::rng::Rng;

    fn trace() -> (Station, Vec<f64>, f64) {
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
        let mut rng = Rng::new(11);
        let params = crate::model::SourceParams {
            depth_km: 8.0,
            vp: physics::P_VELOCITY_KM_S,
            vs: physics::S_VELOCITY_KM_S,
            mw: 6.0,
            min_km: 25.0,
            max_km: 200.0,
        };
        let (stations, _) = place_stations(&grid, 4, &params, &mut rng);
        let st = stations[0].clone();
        let dt = 0.02;
        let dur = waveform::recommended_duration(&stations);
        let samples = waveform::synth_station(&st, dt, dur, 0.02, &mut rng);
        (st, samples, dt)
    }

    #[test]
    fn markers_and_axis_present() {
        let (st, samples, dt) = trace();
        let block = render_station(
            &st,
            &samples,
            dt,
            &PlotParams {
                width: 96,
                height: 13,
            },
        );
        assert!(block.contains("P @"));
        assert!(block.contains("S @"));
        assert!(block.contains('P'));
        assert!(block.contains('S'));
        assert!(block.contains('-'));
        assert!(block.contains('#'));
    }

    #[test]
    fn gap_text_matches_s_gap() {
        let (st, samples, dt) = trace();
        let block = render_station(
            &st,
            &samples,
            dt,
            &PlotParams {
                width: 96,
                height: 13,
            },
        );
        let expected = format!("P-S gap {:.1}s", st.s_time - st.p_time);
        assert!(block.contains(&expected));
    }

    #[test]
    fn narrow_plot_still_renders() {
        let (st, samples, dt) = trace();
        let block = render_station(
            &st,
            &samples,
            dt,
            &PlotParams {
                width: 20,
                height: 5,
            },
        );
        assert!(!block.is_empty());
    }
}
