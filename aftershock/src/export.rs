//! Waveform export to CSV.
//!
//! Two layouts are supported:
//! - `wide`: one row per sample, one column per station (`time_s,ST01,...`),
//!   handy for spreadsheet or plotting-tool use.
//! - `long`: one row per sample-station pair (`time_s,station,amplitude`),
//!   handy for pivoting or streaming.

use crate::model::Station;

/// CSV layout for the exported waveform file.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Format {
    Wide,
    Long,
}

/// Render the traces of all stations as CSV text.
pub fn to_csv(stations: &[Station], traces: &[Vec<f64>], dt: f64, fmt: Format) -> String {
    let n = traces[0].len();
    match fmt {
        Format::Wide => {
            let mut out = String::from("time_s");
            for st in stations {
                out.push(',');
                out.push_str(&st.name);
            }
            out.push('\n');
            for i in 0..n {
                out.push_str(&format!("{:.4}", i as f64 * dt));
                for tr in traces {
                    out.push(',');
                    out.push_str(&format!("{:.4}", tr[i]));
                }
                out.push('\n');
            }
            out
        }
        Format::Long => {
            let mut out = String::from("time_s,station,amplitude\n");
            for (k, st) in stations.iter().enumerate() {
                for (i, tr) in traces[k].iter().enumerate() {
                    out.push_str(&format!("{:.4},{},{:.4}\n", i as f64 * dt, st.name, tr));
                }
            }
            out
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wide_csv_shape() {
        let stations = [
            Station {
                name: "ST01".into(),
                col: 0,
                row: 0,
                x_km: 0.0,
                y_km: 0.0,
                epicentral_km: 10.0,
                hypocentral_km: 10.0,
                azimuth_deg: 0.0,
                p_time: 1.0,
                s_time: 2.0,
                surface_time: 3.0,
                p_amp: 0.3,
                s_amp: 1.0,
                surface_amp: 0.8,
            },
            Station {
                name: "ST02".into(),
                col: 1,
                row: 1,
                x_km: 1.0,
                y_km: 1.0,
                epicentral_km: 20.0,
                hypocentral_km: 20.0,
                azimuth_deg: 90.0,
                p_time: 2.0,
                s_time: 4.0,
                surface_time: 6.0,
                p_amp: 0.3,
                s_amp: 1.0,
                surface_amp: 0.8,
            },
        ];
        let traces = vec![vec![0.0, 1.0, -1.0], vec![2.0, 0.0, -2.0]];
        let csv = to_csv(&stations, &traces, 0.1, Format::Wide);
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines.len(), 4);
        assert!(lines[0].starts_with("time_s,ST01,ST02"));
        assert!(lines[1].starts_with("0.0000"));
        assert_eq!(lines[1].split(',').count(), 3);
    }

    #[test]
    fn long_csv_shape() {
        let stations = [Station {
            name: "ST01".into(),
            col: 0,
            row: 0,
            x_km: 0.0,
            y_km: 0.0,
            epicentral_km: 10.0,
            hypocentral_km: 10.0,
            azimuth_deg: 0.0,
            p_time: 1.0,
            s_time: 2.0,
            surface_time: 3.0,
            p_amp: 0.3,
            s_amp: 1.0,
            surface_amp: 0.8,
        }];
        let traces = vec![vec![0.0, 1.0]];
        let csv = to_csv(&stations, &traces, 0.1, Format::Long);
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines.len(), 3);
        assert!(lines[0].starts_with("time_s,station,amplitude"));
        assert!(lines[1].ends_with(",ST01,0.0000"));
        assert_eq!(lines[1].split(',').count(), 3);
    }
}
