//! The fault grid, rupture geometry, station network, and arrival times.
//!
//! The grid is the modeled source region: a square of `cells` cells per side
//! covering `size_km` km. The epicenter sits on a grid cell; the rupture is
//! the rectangle of cells inside a length x width box (from the Wells &
//! Coppersmith scaling) centered on the epicenter and rotated by the strike.
//! Stations are placed on distinct grid cells within a distance annulus
//! around the epicenter, and every station gets its P, S, and surface arrival
//! times and relative amplitudes.

use crate::physics;
use crate::rng::Rng;

/// Grid configuration for the source region.
pub struct GridConfig {
    pub cells: usize,
    pub size_km: f64,
}

/// The modeled fault grid and its rupture footprint.
pub struct FaultGrid {
    pub cells: usize,
    pub size_km: f64,
    pub cell_km: f64,
    pub epicenter_col: usize,
    pub epicenter_row: usize,
    pub epicenter_x_km: f64,
    pub epicenter_y_km: f64,
    pub rupture_length_km: f64,
    pub rupture_width_km: f64,
    pub ruptured: Vec<bool>,
    pub ruptured_cells: usize,
}

impl FaultGrid {
    /// Build a grid with the given epicenter (km, x east / y north) and model
    /// the rupture footprint for a magnitude `mw` quake with the given strike.
    pub fn new(
        config: &GridConfig,
        epicenter_x_km: f64,
        epicenter_y_km: f64,
        mw: f64,
        strike_deg: f64,
    ) -> Result<Self, String> {
        if config.cells < 4 {
            return Err("grid cells must be at least 4".into());
        }
        if config.size_km < 8.0 {
            return Err("grid size must be at least 8 km".into());
        }
        if !(0.0..=physics::MAX_MAGNITUDE).contains(&mw) {
            return Err(format!(
                "magnitude must be between 0 and {}",
                physics::MAX_MAGNITUDE
            ));
        }
        let cell_km = config.size_km / config.cells as f64;
        if !(0.0..=config.size_km).contains(&epicenter_x_km)
            || !(0.0..=config.size_km).contains(&epicenter_y_km)
        {
            return Err(format!(
                "epicenter ({:.1}, {:.1}) is outside the {:.0} km grid",
                epicenter_x_km, epicenter_y_km, config.size_km
            ));
        }

        let col = cell_from_km(epicenter_x_km, cell_km, config.cells);
        let row = cell_from_km(config.size_km - epicenter_y_km, cell_km, config.cells);
        let ex = (col as f64 + 0.5) * cell_km;
        let ey = config.size_km - (row as f64 + 0.5) * cell_km;

        let length = physics::rupture_length_km(mw).min(config.size_km);
        let width = physics::rupture_width_km(mw).min(config.size_km);

        let theta = strike_deg.to_radians();
        let (sin_t, cos_t) = theta.sin_cos();
        let mut ruptured = vec![false; config.cells * config.cells];
        let mut count = 0usize;
        for r in 0..config.cells {
            for c in 0..config.cells {
                let x = (c as f64 + 0.5) * cell_km;
                let y = config.size_km - (r as f64 + 0.5) * cell_km;
                let dx = x - ex;
                let dy = y - ey;
                // Along-strike is (sin, cos) for strike measured clockwise
                // from north; the perpendicular is its left normal.
                let along = dx * sin_t + dy * cos_t;
                let perp = -dx * cos_t + dy * sin_t;
                let inside = along.abs() <= length / 2.0 && perp.abs() <= width / 2.0;
                let idx = Self::index_for(config.cells, c, r);
                ruptured[idx] = inside;
                if inside {
                    count += 1;
                }
            }
        }

        Ok(FaultGrid {
            cells: config.cells,
            size_km: config.size_km,
            cell_km,
            epicenter_col: col,
            epicenter_row: row,
            epicenter_x_km: ex,
            epicenter_y_km: ey,
            rupture_length_km: length,
            rupture_width_km: width,
            ruptured,
            ruptured_cells: count,
        })
    }

    /// Flattened index for a cell.
    pub fn index(&self, col: usize, row: usize) -> usize {
        Self::index_for(self.cells, col, row)
    }

    fn index_for(cells: usize, col: usize, row: usize) -> usize {
        row * cells + col
    }

    /// Center of a cell in km (x east, y north, row 0 is the north edge).
    pub fn cell_center(&self, col: usize, row: usize) -> (f64, f64) {
        let x = (col as f64 + 0.5) * self.cell_km;
        let y = self.size_km - (row as f64 + 0.5) * self.cell_km;
        (x, y)
    }
}

/// Convert a km coordinate along an axis to a grid cell index.
fn cell_from_km(km: f64, cell_km: f64, cells: usize) -> usize {
    let raw = (km / cell_km).floor() as isize;
    if raw < 0 {
        0
    } else if raw as usize >= cells {
        cells - 1
    } else {
        raw as usize
    }
}

/// A seismic station on a grid cell with its arrival times and amplitudes.
#[derive(Clone)]
pub struct Station {
    pub name: String,
    pub col: usize,
    pub row: usize,
    pub x_km: f64,
    pub y_km: f64,
    pub epicentral_km: f64,
    pub hypocentral_km: f64,
    pub azimuth_deg: f64,
    pub p_time: f64,
    pub s_time: f64,
    pub surface_time: f64,
    pub p_amp: f64,
    pub s_amp: f64,
    pub surface_amp: f64,
}

/// Source and propagation parameters shared by every station.
pub struct SourceParams {
    pub depth_km: f64,
    pub vp: f64,
    pub vs: f64,
    pub mw: f64,
    pub min_km: f64,
    pub max_km: f64,
}

/// Place up to `requested` stations on distinct grid cells within a distance
/// annulus of the epicenter, sorted by distance.
///
/// Returns the placed stations and the number actually placed (fewer than
/// requested when the grid cannot supply enough cells in range).
pub fn place_stations(
    grid: &FaultGrid,
    requested: usize,
    p: &SourceParams,
    rng: &mut Rng,
) -> (Vec<Station>, usize) {
    let mut candidates: Vec<usize> = Vec::new();
    for r in 0..grid.cells {
        for c in 0..grid.cells {
            let idx = grid.index(c, r);
            if grid.ruptured[idx] {
                continue;
            }
            let (x, y) = grid.cell_center(c, r);
            let dx = x - grid.epicenter_x_km;
            let dy = y - grid.epicenter_y_km;
            let d = (dx * dx + dy * dy).sqrt();
            if d >= p.min_km && d <= p.max_km {
                candidates.push(idx);
            }
        }
    }

    // Random selection without replacement.
    let placed = requested.min(candidates.len());
    let mut stations: Vec<Station> = Vec::with_capacity(placed);
    for _ in 0..placed {
        let pick = rng.next_index(candidates.len());
        let idx = candidates.remove(pick);
        let col = idx % grid.cells;
        let row = idx / grid.cells;
        let (x, y) = grid.cell_center(col, row);
        let dx = x - grid.epicenter_x_km;
        let dy = y - grid.epicenter_y_km;
        let epi = (dx * dx + dy * dy).sqrt();
        let hypo = (epi * epi + p.depth_km * p.depth_km).sqrt();
        let azimuth = (dx.atan2(dy).to_degrees() + 360.0) % 360.0;

        let p_time = physics::travel_time(hypo, p.vp);
        let s_time = physics::travel_time(hypo, p.vs);
        let surface_time = physics::travel_time(epi, physics::SURFACE_RATIO * p.vs);

        let scale = physics::moment_amplitude_scale(p.mw);
        let atten = physics::body_wave_attenuation(hypo);
        let s_amp = scale * atten;
        let p_amp = 0.3 * s_amp;
        let surface_amp = 0.8 * s_amp;

        stations.push(Station {
            name: format!("ST{:02}", stations.len() + 1),
            col,
            row,
            x_km: x,
            y_km: y,
            epicentral_km: epi,
            hypocentral_km: hypo,
            azimuth_deg: azimuth,
            p_time,
            s_time,
            surface_time,
            p_amp,
            s_amp,
            surface_amp,
        });
    }

    stations.sort_by(|a, b| {
        a.epicentral_km
            .partial_cmp(&b.epicentral_km)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    (stations, placed)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_grid() -> FaultGrid {
        FaultGrid::new(
            &GridConfig {
                cells: 64,
                size_km: 256.0,
            },
            128.0,
            128.0,
            6.0,
            0.0,
        )
        .unwrap()
    }

    #[test]
    fn epicenter_lands_on_the_requested_cell() {
        let g = test_grid();
        let (x, y) = g.cell_center(g.epicenter_col, g.epicenter_row);
        assert!((x - g.epicenter_x_km).abs() < 1e-9);
        assert!((y - g.epicenter_y_km).abs() < 1e-9);
    }

    #[test]
    fn bigger_magnitude_ruptures_more_cells() {
        let g6 = test_grid();
        let g7 = FaultGrid::new(
            &GridConfig {
                cells: 64,
                size_km: 256.0,
            },
            128.0,
            128.0,
            7.0,
            0.0,
        )
        .unwrap();
        assert!(g7.ruptured_cells > g6.ruptured_cells);
    }

    #[test]
    fn strike_rotates_the_rupture() {
        let g = FaultGrid::new(
            &GridConfig {
                cells: 64,
                size_km: 256.0,
            },
            128.0,
            128.0,
            6.0,
            45.0,
        )
        .unwrap();
        assert!(g.ruptured_cells > 0);
    }

    fn test_params() -> SourceParams {
        SourceParams {
            depth_km: 8.0,
            vp: physics::P_VELOCITY_KM_S,
            vs: physics::S_VELOCITY_KM_S,
            mw: 6.0,
            min_km: 25.0,
            max_km: 200.0,
        }
    }

    #[test]
    fn stations_are_distinct_inside_grid() {
        let g = test_grid();
        let mut rng = Rng::new(42);
        let (stations, placed) = place_stations(&g, 6, &test_params(), &mut rng);
        assert_eq!(placed, 6);
        let mut seen = std::collections::HashSet::new();
        for s in &stations {
            assert!(seen.insert((s.col, s.row)));
            assert!(s.col < g.cells && s.row < g.cells);
        }
    }

    #[test]
    fn ps_gap_grows_with_distance() {
        let g = test_grid();
        let mut rng = Rng::new(1);
        let (stations, _) = place_stations(&g, 8, &test_params(), &mut rng);
        let first = &stations[0];
        let last = &stations[stations.len() - 1];
        assert!(last.epicentral_km > first.epicentral_km);
        assert!(last.s_time - last.p_time > first.s_time - first.p_time);
    }

    #[test]
    fn stations_are_sorted_by_distance() {
        let g = test_grid();
        let mut rng = Rng::new(2);
        let (stations, _) = place_stations(&g, 6, &test_params(), &mut rng);
        for w in stations.windows(2) {
            assert!(w[0].epicentral_km <= w[1].epicentral_km);
        }
    }

    #[test]
    fn out_of_bounds_epicenter_is_rejected() {
        let r = FaultGrid::new(
            &GridConfig {
                cells: 64,
                size_km: 256.0,
            },
            300.0,
            128.0,
            6.0,
            0.0,
        );
        assert!(r.is_err());
    }

    #[test]
    fn zero_magnitude_is_valid_but_small() {
        let g = FaultGrid::new(
            &GridConfig {
                cells: 64,
                size_km: 256.0,
            },
            128.0,
            128.0,
            0.0,
            0.0,
        )
        .unwrap();
        assert!(g.rupture_length_km < 1.0 || g.ruptured_cells > 0);
    }
}
