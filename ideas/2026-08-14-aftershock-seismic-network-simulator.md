# Aftershock

A seismic network simulator written in **Rust**: model an earthquake on a
fault grid, propagate realistic P-, S-, and surface waves across stations, and
produce terminal seismograms plus a downloadable waveform file, all from a CLI.
The lab's first Rust project and its first project in geophysics.

## What Was Built

A self-contained CLI (`aftershock/`) with zero external dependencies, pure
Rust standard library:

- **Fault grid** (`src/model.rs`): a square grid of cells (64x64 covering 256
  km by default) that models the source region. The epicenter is a grid cell;
  the rupture footprint is a length x width rectangle derived from the
  magnitude via the Wells & Coppersmith (1994) all-slip-type regressions
  (length `10^(0.59*Mw - 2.44)` km, width `10^(0.32*Mw - 1.01)` km), rotated by
  a configurable strike. Bigger quakes rupture more cells.
- **Physically-motivated propagation** (`src/physics.rs`): P waves at 6.0
  km/s, S waves at 3.5 km/s (a Vp/Vs ratio near sqrt(3)), and a surface wave at
  92% of the S speed. Travel times are distance divided by velocity, so the
  P-to-S gap grows linearly with epicentral distance. Amplitudes scale with the
  cube root of seismic moment (Hanks & Kanamori) and decay as 1/distance
  (geometric spreading).
- **Station network** (`src/model.rs`): stations occupy distinct grid cells in
  a distance annulus around the epicenter, each with epicentral and
  hypocentral distances, azimuth, and P/S/surface arrival times, sorted by
  distance.
- **Seismogram synthesis** (`src/waveform.rs`): each trace is the sum of three
  Ricker wavelets (the classic zero-phase seismic pulse): a small
  high-frequency P phase, a large mid-frequency S phase, and a low-frequency
  surface wave, each centered on its arrival and scaled by its amplitude, plus
  seeded uniform noise.
- **Terminal rendering** (`src/render.rs`): ASCII seismograms with `P`, `S`,
  and `R` arrival markers on the zero axis and a time ruler, so the P-to-S gap
  is readable straight off the plot.
- **CSV export** (`src/export.rs`): wide (one column per station) and long
  (one row per sample-station) waveform files.
- **CLI** (`src/cli.rs`): `simulate`, `stations`, `export`, `check`, `help`,
  and `version` modes with strict argv validation, plus `check` running 13
  built-in self-checks. No interactive input, deterministic for a given seed.

## Why

The lab's recent streak was Python CLIs, a WebGL solar system, a Go
database engine, and a C++ chess engine. Aftershock brings a fresh language
(Rust, the first for the lab) and a completely untouched domain
(geophysics). Wave propagation across a large grid is exactly the kind of
number-crunching a systems language is for, and the terminal output makes the
science legible: the station's distance maps to a visibly growing P-to-S gap,
so the time-delay relationship becomes tangible rather than asserted.

## How It Works

- **Rupture geometry.** The grid marks every cell inside the length x width box
  centered on the epicenter and rotated by the strike. The Wells &
  Coppersmith regressions tie the footprint to the magnitude, so a Mw 6 event
  spans about 12.6 km x 8.1 km while a Mw 7 spans about 24.8 km x 11.7 km.
- **Arrival times.** A station at epicentral distance `d` and source depth `h`
  has hypocentral distance `sqrt(d^2 + h^2)`. P arrives at `hypo / vp`, S at
  `hypo / vs`, and the surface wave at `d / (0.92 * vs)`. The P-S gap is
  `d * (vp - vs) / (vp * vs)` seconds, linear in `d`.
- **Amplitudes.** Ground motion scales with `10^(0.5 * (Mw - Mref))` (the cube
  root of the moment ratio) times the reference distance over the hypocentral
  distance, so both magnitude and distance move the trace visibly.
- **Waveforms.** A Ricker wavelet `(1 - 2*pi^2*f^2*t^2) * exp(-pi^2*f^2*t^2)`
  at frequency `f` is added around each arrival: P at 6 Hz with 30% of the S
  amplitude, S at 2.5 Hz, surface at 1 Hz with 80% of the S amplitude. Noise is
  a seeded uniform term proportional to the S amplitude.
- **Rendering.** Amplitude is normalized to the trace peak, mapped to a plot
  row, and drawn one `#` per time column; the zero line becomes the axis row
  with arrival markers, and a time ruler runs along the bottom.
- **Determinism.** A documented xorshift64* PRNG (scrambled with SplitMix64)
  places the stations and fills the noise, so the same seed always reproduces
  the same network and waveforms.

## Key Files

- `aftershock/src/rng.rs`: deterministic xorshift64* PRNG.
- `aftershock/src/physics.rs`: moment, rupture scaling, travel times, P-S gap,
  attenuation.
- `aftershock/src/model.rs`: fault grid, rupture footprint, station placement.
- `aftershock/src/waveform.rs`: Ricker-wavelet seismogram synthesis.
- `aftershock/src/render.rs`: ASCII seismogram rendering.
- `aftershock/src/export.rs`: wide/long CSV export.
- `aftershock/src/cli.rs`: argument parsing, validation, dispatch, self-checks.
- `aftershock/README.md`: quickstart; `aftershock/docs/index.md` +
  `aftershock/docs/index.html`: documentation site.

## Notes

- **Rust first, dependency-free.** The whole program is the Rust standard
  library. The argument parser is hand-rolled because a CLI this size does not
  need clap, and it keeps the crate buildable offline with a single `cargo
  build`.
- **Empirical physics.** Moment-magnitude relations, the sqrt(3)-ish Vp/Vs
  ratio, 1/distance spreading, and the 0.92 Vs surface wave are the standard
  seismological values; nothing is a made-up magic number.
- **Correctness is checked, not assumed.** `aftershock check` runs 13 runtime
  invariants (determinism, travel-time ordering, P-S gap linearity, rupture
  scaling, station distinctness, finite traces), and `cargo test` runs 41
  tests across every module.
- **A real bug caught while building.** The first version of the ASCII renderer
  transposed rows and columns (it iterated grid rows as if they were columns),
  which drew a straight vertical line for every trace; the fix maps each time
  column to its amplitude row explicitly, and a rendering test now guards it.
- **Name origin.** An aftershock is the smaller quake that follows the main
  event, like the ripple of P- and S-waves fanning out from the epicenter.
