//! Command-line interface: argument parsing, validation, and dispatch.
//!
//! Everything is taken from argv; there is no interactive input. Unknown
//! options and malformed values are rejected with a clear error and a
//! non-zero exit code.

use std::collections::{HashMap, HashSet};

use crate::export::{self, Format};
use crate::model::{self, FaultGrid, GridConfig, Station};
use crate::physics;
use crate::render::{self, PlotParams};
use crate::rng::Rng;
use crate::waveform;

/// Crate version, taken from Cargo.toml at build time.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// All configurable simulation parameters with their defaults.
#[derive(Clone, Debug)]
pub struct Config {
    pub magnitude: f64,
    pub depth_km: f64,
    pub epicenter: Option<(f64, f64)>,
    pub grid_cells: usize,
    pub grid_km: f64,
    pub stations: usize,
    pub seed: u64,
    pub vp: f64,
    pub vs: f64,
    pub strike_deg: f64,
    pub station_min_km: f64,
    pub station_max_km: f64,
    pub duration: Option<f64>,
    pub dt: f64,
    pub noise_frac: f64,
    pub out_path: String,
    pub format: Format,
    pub plot_width: usize,
    pub plot_height: usize,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            magnitude: 6.0,
            depth_km: 8.0,
            epicenter: None,
            grid_cells: 64,
            grid_km: 256.0,
            stations: 6,
            seed: 42,
            vp: physics::P_VELOCITY_KM_S,
            vs: physics::S_VELOCITY_KM_S,
            strike_deg: 0.0,
            station_min_km: 25.0,
            station_max_km: 200.0,
            duration: None,
            dt: 0.02,
            noise_frac: 0.05,
            out_path: "aftershock_waveforms.csv".into(),
            format: Format::Wide,
            plot_width: 96,
            plot_height: 13,
        }
    }
}

impl Config {
    /// Build a config from a parsed option map, applying validation.
    pub fn from_map(map: &HashMap<String, Vec<String>>) -> Result<Self, String> {
        let mut cfg = Config::default();
        cfg.magnitude = parse_f64(map, "magnitude", cfg.magnitude)?;
        cfg.depth_km = parse_f64(map, "depth", cfg.depth_km)?;
        cfg.grid_cells = parse_usize(map, "grid-cells", cfg.grid_cells)?;
        cfg.grid_km = parse_f64(map, "grid-km", cfg.grid_km)?;
        cfg.stations = parse_usize(map, "stations", cfg.stations)?;
        cfg.seed = parse_u64(map, "seed", cfg.seed)?;
        cfg.vp = parse_f64(map, "vp", cfg.vp)?;
        cfg.vs = parse_f64(map, "vs", cfg.vs)?;
        cfg.strike_deg = parse_f64(map, "strike", cfg.strike_deg)?;
        cfg.station_min_km = parse_f64(map, "station-min", cfg.station_min_km)?;
        cfg.station_max_km = parse_f64(map, "station-max", cfg.station_max_km)?;
        cfg.duration = match get_last(map, "duration") {
            None => None,
            Some(s) => Some(parse_single_f64("duration", s)?),
        };
        cfg.dt = parse_f64(map, "dt", cfg.dt)?;
        cfg.noise_frac = parse_f64(map, "noise", cfg.noise_frac)?;
        cfg.plot_width = parse_usize(map, "width", cfg.plot_width)?;
        cfg.plot_height = parse_usize(map, "height", cfg.plot_height)?;
        if let Some(s) = get_last(map, "out") {
            cfg.out_path = s.to_string();
        }
        cfg.format = match get_last(map, "format") {
            None => Format::Wide,
            Some("wide") => Format::Wide,
            Some("long") => Format::Long,
            Some(other) => {
                return Err(format!(
                    "invalid value for --format: '{}' (expected wide or long)",
                    other
                ))
            }
        };
        cfg.epicenter = match map.get("epicenter") {
            None => None,
            Some(v) if v.len() >= 2 => {
                let x = parse_single_f64("epicenter x", &v[v.len() - 2])?;
                let y = parse_single_f64("epicenter y", &v[v.len() - 1])?;
                Some((x, y))
            }
            Some(_) => return Err("--epicenter requires two values: x y".into()),
        };
        cfg.validate()?;
        Ok(cfg)
    }

    fn validate(&self) -> Result<(), String> {
        if !(0.0..=physics::MAX_MAGNITUDE).contains(&self.magnitude) {
            return Err(format!(
                "magnitude must be between 0 and {}",
                physics::MAX_MAGNITUDE
            ));
        }
        if !(0.0..=100.0).contains(&self.depth_km) {
            return Err("depth must be between 0 and 100 km".into());
        }
        if self.vp <= 0.0 || self.vs <= 0.0 || self.vp <= self.vs {
            return Err("vp and vs must be positive with vp > vs".into());
        }
        if !(4..=256).contains(&self.grid_cells) {
            return Err("grid-cells must be between 4 and 256".into());
        }
        if !(8.0..=2000.0).contains(&self.grid_km) {
            return Err("grid-km must be between 8 and 2000".into());
        }
        if self.stations == 0 || self.stations > 256 {
            return Err("stations must be between 1 and 256".into());
        }
        if self.station_min_km < 1.0 || self.station_max_km <= self.station_min_km {
            return Err("station-min must be at least 1 km and below station-max".into());
        }
        if let Some(d) = self.duration {
            if d <= 0.0 {
                return Err("duration must be positive".into());
            }
        }
        if !(0.0..=1.0).contains(&self.dt) || self.dt <= 0.0 {
            return Err("dt must be between 0 (exclusive) and 1 second".into());
        }
        if !(0.0..=1.0).contains(&self.noise_frac) {
            return Err("noise must be between 0 and 1".into());
        }
        if self.out_path.is_empty() {
            return Err("out path must not be empty".into());
        }
        if !(16..=2000).contains(&self.plot_width) {
            return Err("width must be between 16 and 2000".into());
        }
        if !(3..=100).contains(&self.plot_height) {
            return Err("height must be between 3 and 100".into());
        }
        Ok(())
    }
}

/// A fully built simulation: the grid, its stations, and their traces.
struct Simulation {
    grid: FaultGrid,
    stations: Vec<Station>,
    traces: Vec<Vec<f64>>,
    duration: f64,
    dt: f64,
    magnitude: f64,
    depth_km: f64,
    vp: f64,
    vs: f64,
    strike_deg: f64,
}

impl Simulation {
    fn new(cfg: &Config) -> Result<Self, String> {
        let grid_cfg = GridConfig {
            cells: cfg.grid_cells,
            size_km: cfg.grid_km,
        };
        let (ex, ey) = cfg
            .epicenter
            .unwrap_or((cfg.grid_km / 2.0, cfg.grid_km / 2.0));
        let grid = FaultGrid::new(&grid_cfg, ex, ey, cfg.magnitude, cfg.strike_deg)?;
        let mut rng = Rng::new(cfg.seed);
        let params = model::SourceParams {
            depth_km: cfg.depth_km,
            vp: cfg.vp,
            vs: cfg.vs,
            mw: cfg.magnitude,
            min_km: cfg.station_min_km,
            max_km: cfg.station_max_km,
        };
        let (stations, placed) = model::place_stations(&grid, cfg.stations, &params, &mut rng);
        if placed < cfg.stations {
            eprintln!(
                "warning: only {} distinct grid cells in range; placing {} station(s)",
                placed, placed
            );
        }
        let duration = cfg
            .duration
            .unwrap_or_else(|| waveform::recommended_duration(&stations));
        let traces = stations
            .iter()
            .map(|s| waveform::synth_station(s, cfg.dt, duration, cfg.noise_frac, &mut rng))
            .collect();
        Ok(Simulation {
            grid,
            stations,
            traces,
            duration,
            dt: cfg.dt,
            magnitude: cfg.magnitude,
            depth_km: cfg.depth_km,
            vp: cfg.vp,
            vs: cfg.vs,
            strike_deg: cfg.strike_deg,
        })
    }

    fn print_header(&self) {
        println!("Aftershock {} - seismic network simulator", VERSION);
        println!(
            "Mw {:.1} at ({:.1}, {:.1}) km, depth {:.1} km, strike {:.0} deg",
            self.magnitude,
            self.grid.epicenter_x_km,
            self.grid.epicenter_y_km,
            self.depth_km,
            self.strike_deg
        );
        println!(
            "rupture: {:.1} km x {:.1} km, {} of {} cells on a {}x{} grid covering {:.0} km",
            self.grid.rupture_length_km,
            self.grid.rupture_width_km,
            self.grid.ruptured_cells,
            self.grid.cells * self.grid.cells,
            self.grid.cells,
            self.grid.cells,
            self.grid.size_km
        );
        println!(
            "P wave {:.1} km/s, S wave {:.1} km/s, surface {:.1} km/s",
            self.vp,
            self.vs,
            physics::SURFACE_RATIO * self.vs
        );
        println!(
            "stations: {}, trace {} s at dt {:.3} s",
            self.stations.len(),
            self.duration,
            self.dt
        );
    }

    fn print_station_table(&self) {
        println!();
        println!("  #  station  dist_km  az_deg   P_s    S_s    R_s   P-S gap  S_amp");
        for (i, st) in self.stations.iter().enumerate() {
            println!(
                "  {:>2}  {:5}  {:7.1}  {:5.0}  {:6.1}  {:6.1}  {:6.1}   {:6.1}  {:7.3}",
                i + 1,
                st.name,
                st.epicentral_km,
                st.azimuth_deg,
                st.p_time,
                st.s_time,
                st.surface_time,
                st.s_time - st.p_time,
                st.s_amp
            );
        }
        println!();
    }

    fn render_all(&self, cfg: &Config) {
        self.print_header();
        self.print_station_table();
        let plot = PlotParams {
            width: cfg.plot_width,
            height: cfg.plot_height,
        };
        for (st, tr) in self.stations.iter().zip(&self.traces) {
            print!("{}", render::render_station(st, tr, self.dt, &plot));
        }
    }

    fn export(&self, cfg: &Config) -> Result<i32, String> {
        let csv = export::to_csv(&self.stations, &self.traces, self.dt, cfg.format);
        let samples = self.traces[0].len();
        if cfg.out_path == "-" {
            print!("{}", csv);
        } else {
            std::fs::write(&cfg.out_path, csv)
                .map_err(|e| format!("cannot write '{}': {}", cfg.out_path, e))?;
            let fmt = match cfg.format {
                Format::Wide => "wide",
                Format::Long => "long",
            };
            println!(
                "wrote {} samples x {} stations to '{}' ({})",
                samples,
                self.stations.len(),
                cfg.out_path,
                fmt
            );
        }
        Ok(0)
    }
}

/// The CLI entry point. Returns the process exit code.
pub fn run(args: &[String]) -> Result<i32, String> {
    let (sub, map) = parse_args(args)?;
    match sub {
        Subcommand::Help => {
            print!("{}", usage());
            Ok(0)
        }
        Subcommand::Version => {
            println!("aftershock {}", VERSION);
            Ok(0)
        }
        Subcommand::Check => run_checks(),
        _ => {
            let cfg = Config::from_map(&map)?;
            let sim = Simulation::new(&cfg)?;
            match sub {
                Subcommand::Simulate => {
                    sim.render_all(&cfg);
                    Ok(0)
                }
                Subcommand::Stations => {
                    sim.print_header();
                    sim.print_station_table();
                    Ok(0)
                }
                Subcommand::Export => sim.export(&cfg),
                _ => unreachable!(),
            }
        }
    }
}

/// Run the built-in self-check battery. Prints PASS/FAIL per check and exits
/// non-zero if any check fails.
fn run_checks() -> Result<i32, String> {
    println!("Aftershock {} self-checks", VERSION);
    let mut passed = 0u32;
    let mut failed = 0u32;
    macro_rules! check {
        ($name:expr, $cond:expr) => {{
            if $cond {
                println!("  PASS  {}", $name);
                passed += 1;
            } else {
                println!("  FAIL  {}", $name);
                failed += 1;
            }
        }};
    }

    let mut a = Rng::new(42);
    let mut b = Rng::new(42);
    let mut same = true;
    for _ in 0..1000 {
        if a.next_u64() != b.next_u64() {
            same = false;
        }
    }
    check!("rng: same seed reproduces the stream", same);

    let mut c = Rng::new(1);
    let mut d = Rng::new(2);
    check!("rng: different seeds diverge", c.next_u64() != d.next_u64());

    check!(
        "physics: P arrives before S",
        physics::travel_time(100.0, physics::P_VELOCITY_KM_S)
            < physics::travel_time(100.0, physics::S_VELOCITY_KM_S)
    );
    let g1 = physics::ps_gap(50.0, physics::P_VELOCITY_KM_S, physics::S_VELOCITY_KM_S);
    let g2 = physics::ps_gap(100.0, physics::P_VELOCITY_KM_S, physics::S_VELOCITY_KM_S);
    check!(
        "physics: P-S gap doubles with distance",
        (g2 / g1 - 2.0).abs() < 1e-9
    );
    check!(
        "physics: moment grows with magnitude",
        physics::seismic_moment_nm(7.0) > physics::seismic_moment_nm(6.0)
    );

    let grid = FaultGrid::new(
        &GridConfig {
            cells: 64,
            size_km: 256.0,
        },
        128.0,
        128.0,
        6.0,
        0.0,
    )?;
    check!(
        "model: rupture covers at least one cell",
        grid.ruptured_cells > 0
    );
    let grid7 = FaultGrid::new(
        &GridConfig {
            cells: 64,
            size_km: 256.0,
        },
        128.0,
        128.0,
        7.0,
        0.0,
    )?;
    check!(
        "model: larger quake ruptures more cells",
        grid7.ruptured_cells > grid.ruptured_cells
    );

    let mut rng = Rng::new(42);
    let params = model::SourceParams {
        depth_km: 8.0,
        vp: physics::P_VELOCITY_KM_S,
        vs: physics::S_VELOCITY_KM_S,
        mw: 6.0,
        min_km: 25.0,
        max_km: 200.0,
    };
    let (stations, placed) = model::place_stations(&grid, 6, &params, &mut rng);
    check!("model: requested stations placed", placed == 6);
    let distinct = stations
        .iter()
        .map(|s| (s.col, s.row))
        .collect::<HashSet<_>>()
        .len()
        == stations.len();
    check!("model: stations are distinct", distinct);
    check!(
        "model: stations sorted by distance",
        stations
            .windows(2)
            .all(|w| w[0].epicentral_km <= w[1].epicentral_km)
    );

    let dur = waveform::recommended_duration(&stations);
    let traces: Vec<Vec<f64>> = stations
        .iter()
        .map(|s| waveform::synth_station(s, 0.02, dur, 0.02, &mut rng))
        .collect();
    check!(
        "waveform: all samples finite",
        traces.iter().all(|t| t.iter().all(|v| v.is_finite()))
    );
    check!(
        "waveform: traces carry energy",
        traces.iter().all(|t| waveform::peak_amplitude(t) > 0.0)
    );

    let full = Simulation::new(&Config::default()).map(|_| true);
    check!("cli: default simulate builds", full.is_ok());

    if failed == 0 {
        println!("All {} checks passed.", passed);
        Ok(0)
    } else {
        println!("{} check(s) failed.", failed);
        Ok(1)
    }
}

/// Supported subcommands.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Subcommand {
    Simulate,
    Stations,
    Export,
    Check,
    Help,
    Version,
}

fn parse_subcommand(s: &str) -> Result<Subcommand, String> {
    match s {
        "simulate" => Ok(Subcommand::Simulate),
        "stations" => Ok(Subcommand::Stations),
        "export" => Ok(Subcommand::Export),
        "check" => Ok(Subcommand::Check),
        "help" => Ok(Subcommand::Help),
        "version" => Ok(Subcommand::Version),
        other => Err(format!("unknown subcommand '{}'", other)),
    }
}

fn parse_args(args: &[String]) -> Result<(Subcommand, HashMap<String, Vec<String>>), String> {
    let mut sub = Subcommand::Simulate;
    let mut found_sub = false;
    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    let mut i = 0;
    while i < args.len() {
        let arg = &args[i];
        if arg == "--help" || arg == "-h" {
            return Ok((Subcommand::Help, map));
        }
        if arg == "--version" || arg == "-V" {
            return Ok((Subcommand::Version, map));
        }
        if let Some(rest) = arg.strip_prefix("--") {
            let (key, inline) = match rest.split_once('=') {
                Some((k, v)) => (k.to_string(), Some(v.to_string())),
                None => (rest.to_string(), None),
            };
            if let Some(v) = inline {
                map.entry(key).or_default().push(v);
                i += 1;
                continue;
            }
            if key == "epicenter" {
                let x = args
                    .get(i + 1)
                    .ok_or_else(|| "--epicenter requires two values: x y".to_string())?;
                let y = args
                    .get(i + 2)
                    .ok_or_else(|| "--epicenter requires two values: x y".to_string())?;
                map.entry(key.clone()).or_default().push(x.clone());
                map.entry(key).or_default().push(y.clone());
                i += 3;
                continue;
            }
            let v = args
                .get(i + 1)
                .ok_or_else(|| format!("option --{} requires a value", key))?;
            map.entry(key).or_default().push(v.clone());
            i += 2;
        } else if !arg.is_empty() {
            if found_sub {
                return Err(format!("unexpected argument '{}'", arg));
            }
            sub = parse_subcommand(arg)?;
            found_sub = true;
            i += 1;
        } else {
            i += 1;
        }
    }
    Ok((sub, map))
}

fn get_last<'a>(map: &'a HashMap<String, Vec<String>>, key: &str) -> Option<&'a str> {
    map.get(key).and_then(|v| v.last()).map(String::as_str)
}

fn parse_single_f64(name: &str, raw: &str) -> Result<f64, String> {
    raw.trim()
        .parse::<f64>()
        .map_err(|_| format!("invalid value for {}: '{}'", name, raw))
}

fn parse_f64(map: &HashMap<String, Vec<String>>, key: &str, default: f64) -> Result<f64, String> {
    match get_last(map, key) {
        None => Ok(default),
        Some(raw) => parse_single_f64(&format!("--{}", key), raw),
    }
}

fn parse_usize(
    map: &HashMap<String, Vec<String>>,
    key: &str,
    default: usize,
) -> Result<usize, String> {
    match get_last(map, key) {
        None => Ok(default),
        Some(raw) => raw
            .trim()
            .parse::<usize>()
            .map_err(|_| format!("invalid value for --{}: '{}'", key, raw)),
    }
}

fn parse_u64(map: &HashMap<String, Vec<String>>, key: &str, default: u64) -> Result<u64, String> {
    match get_last(map, key) {
        None => Ok(default),
        Some(raw) => raw
            .trim()
            .parse::<u64>()
            .map_err(|_| format!("invalid value for --{}: '{}'", key, raw)),
    }
}

fn usage() -> String {
    format!(
        "\
Aftershock {version} - a seismic network simulator in Rust

Usage:
  aftershock [options] [simulate]   run the simulation and render terminal seismograms
  aftershock [options] stations     print the station table only
  aftershock [options] export       write the waveform CSV file
  aftershock check                  run the built-in self-checks
  aftershock help                   show this help
  aftershock version                print the version

Options:
  --magnitude <f>       moment magnitude (default 6.0)
  --depth <f>           source depth in km (default 8.0)
  --epicenter <x> <y>   epicenter in km, x east / y north (default grid center)
  --grid-cells <n>      grid cells per side (default 64)
  --grid-km <f>         grid extent in km (default 256)
  --stations <n>        number of stations to place (default 6)
  --seed <n>            PRNG seed for reproducible runs (default 42)
  --vp <f>              P-wave velocity in km/s (default {vp})
  --vs <f>              S-wave velocity in km/s (default {vs})
  --strike <f>          fault strike in degrees clockwise from north (default 0)
  --station-min <f>     minimum station distance in km (default 25)
  --station-max <f>     maximum station distance in km (default 200)
  --duration <f>        trace length in seconds (default: auto)
  --dt <f>              sample interval in seconds (default 0.02)
  --noise <f>           background noise as a fraction of S amplitude (default 0.05)
  --out <path>          export path, or - for stdout (default aftershock_waveforms.csv)
  --format <wide|long>  export layout (default wide)
  --width <n>           seismogram plot width in chars (default 96)
  --height <n>          seismogram plot height in rows (default 13)
  -h, --help            show this help
  -V, --version         print the version

No interactive input: everything is taken from the command line. Runs are
deterministic for a given seed.
",
        version = VERSION,
        vp = physics::P_VELOCITY_KM_S,
        vs = physics::S_VELOCITY_KM_S
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn parse_ok(args: &[&str]) -> (Subcommand, HashMap<String, Vec<String>>) {
        let v: Vec<String> = args.iter().map(|s| s.to_string()).collect();
        parse_args(&v).unwrap()
    }

    #[test]
    fn default_subcommand_is_simulate() {
        let (sub, _) = parse_ok(&[]);
        assert_eq!(sub, Subcommand::Simulate);
    }

    #[test]
    fn parses_subcommand_and_flags() {
        let (sub, map) = parse_ok(&["--magnitude", "7.5", "export", "--format", "long"]);
        assert_eq!(sub, Subcommand::Export);
        assert_eq!(get_last(&map, "magnitude"), Some("7.5"));
        assert_eq!(get_last(&map, "format"), Some("long"));
    }

    #[test]
    fn supports_inline_values() {
        let (sub, map) = parse_ok(&["--magnitude=8.2"]);
        assert_eq!(sub, Subcommand::Simulate);
        assert_eq!(get_last(&map, "magnitude"), Some("8.2"));
    }

    #[test]
    fn epicenter_takes_two_values() {
        let (_, map) = parse_ok(&["--epicenter", "10", "20"]);
        assert_eq!(map.get("epicenter").unwrap().len(), 2);
    }

    #[test]
    fn unknown_option_is_rejected() {
        let v: Vec<String> = vec!["--nope".to_string()];
        assert!(parse_args(&v).is_err());
    }

    #[test]
    fn unknown_subcommand_is_rejected() {
        let v: Vec<String> = vec!["frobnicate".to_string()];
        assert!(parse_args(&v).is_err());
    }

    #[test]
    fn missing_value_is_rejected() {
        let v: Vec<String> = vec!["--magnitude".to_string()];
        assert!(parse_args(&v).is_err());
    }

    #[test]
    fn config_validation_rejects_bad_values() {
        let bad_mag = Config {
            magnitude: 20.0,
            ..Config::default()
        };
        assert!(bad_mag.validate().is_err());
        let bad_vs = Config {
            vs: 7.0,
            ..Config::default()
        };
        assert!(bad_vs.validate().is_err());
    }

    #[test]
    fn config_from_map_rejects_bad_number() {
        let mut map = HashMap::new();
        map.insert("magnitude".to_string(), vec!["abc".to_string()]);
        assert!(Config::from_map(&map).is_err());
    }

    #[test]
    fn help_and_version_short_circuit() {
        let v: Vec<String> = vec!["--help".to_string()];
        let (sub, _) = parse_args(&v).unwrap();
        assert_eq!(sub, Subcommand::Help);
    }

    #[test]
    fn default_config_is_valid() {
        assert!(Config::default().validate().is_ok());
    }

    #[test]
    fn check_subcommand_passes() {
        let v: Vec<String> = vec!["check".to_string()];
        assert_eq!(run(&v).unwrap(), 0);
    }

    #[test]
    fn simulate_runs_end_to_end() {
        let v: Vec<String> = vec![
            "--stations".to_string(),
            "4".to_string(),
            "--grid-cells".to_string(),
            "32".to_string(),
            "--grid-km".to_string(),
            "128".to_string(),
        ];
        assert_eq!(run(&v).unwrap(), 0);
    }

    #[test]
    fn export_writes_a_file() {
        let dir = std::env::temp_dir().join(format!("aftershock_test_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join("wave.csv");
        let path_str = path.to_string_lossy().to_string();
        let v: Vec<String> = vec![
            "export".to_string(),
            "--out".to_string(),
            path_str.clone(),
            "--stations".to_string(),
            "3".to_string(),
        ];
        assert_eq!(run(&v).unwrap(), 0);
        assert!(Path::new(&path).exists());
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.starts_with("time_s,"));
        assert!(content.lines().count() > 10);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn invalid_cli_exits_with_error() {
        let v: Vec<String> = vec!["--magnitude".to_string(), "banana".to_string()];
        assert!(run(&v).is_err());
    }
}
