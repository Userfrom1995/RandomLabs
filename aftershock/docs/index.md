# Aftershock: a seismic network simulator in Rust

**Aftershock** is a seismic network simulator written in **Rust**: it models an
earthquake on a fault grid, propagates realistic P-, S-, and surface waves to
stations at varying distances, and renders ASCII seismograms in the terminal
plus an exportable waveform CSV. It is the lab's first Rust project and its
first foray into geophysics.

## What it is

- **Fault grid.** A square grid of cells (64x64 covering 256 km by default)
  models the source region. The epicenter sits on a grid cell; the rupture
  footprint is a length x width rectangle derived from the earthquake's
  magnitude via the Wells & Coppersmith (1994) all-slip-type regressions,
  rotated by a configurable strike.
- **Physically-motivated propagation.** P waves travel at 6.0 km/s and S waves
  at 3.5 km/s (a Vp/Vs ratio near sqrt(3)), and a surface wave follows at 92%
  of the S speed. Travel times come straight from distance divided by velocity;
  the P-to-S gap therefore grows linearly with epicentral distance, exactly the
  relationship the plots make legible.
- **Amplitudes that mean something.** Ground motion scales with the cube root
  of seismic moment (Hanks & Kanamori) and decays as 1/distance (geometric
  spreading), so a magnitude 7 event at the same distance shakes a station ten
  times harder than a magnitude 6, and a near station shakes harder than a far
  one.
- **Terminal seismograms.** Each station's trace is drawn as an ASCII plot with
  `P`, `S`, and `R` (surface) markers on the zero axis and a time ruler, so the
  arrival-time gaps are directly readable.
- **Exportable data.** Wide and long CSV waveform files for external plotting.
- **Deterministic.** A seeded PRNG places stations and synthesizes noise, so
  the same arguments always produce the same network and waveforms.

## Using it

```sh
cd aftershock
cargo build --release
cargo test                    # 41 tests, all pass
cargo clippy                  # zero warnings

./target/release/aftershock simulate --stations 4
./target/release/aftershock export --out waves.csv --format wide
./target/release/aftershock stations
./target/release/aftershock check
```

Commands:

| Command | What it does |
| --- | --- |
| `aftershock [options] [simulate]` | Run the simulation and render terminal seismograms. |
| `aftershock [options] stations` | Print the station table (arrival times, P-S gaps) only. |
| `aftershock [options] export` | Write the waveform CSV file (default `aftershock_waveforms.csv`). |
| `aftershock check` | Run the 13 built-in self-checks. |
| `aftershock help` | Show usage and all options. |
| `aftershock version` | Print the version. |

Key options: `--magnitude`, `--depth`, `--epicenter x y`, `--grid-cells`,
`--grid-km`, `--stations`, `--seed`, `--vp`, `--vs`, `--strike`,
`--station-min`, `--station-max`, `--duration`, `--dt`, `--noise`, `--out`,
`--format wide|long`, `--width`, `--height`. Everything is passed on the
command line; there is no interactive input.

## How it works

- **Rupture geometry.** For a moment magnitude `Mw`, the surface rupture length
  is `10^(0.59*Mw - 2.44)` km and the downdip width is `10^(0.32*Mw - 1.01)` km.
  The grid marks every cell inside the length x width box centered on the
  epicenter and rotated by the strike. Bigger quakes rupture more cells.
- **Arrival times.** A station at epicentral distance `d` and source depth `h`
  has hypocentral distance `sqrt(d^2 + h^2)`. P arrives at `hypo / vp`, S at
  `hypo / vs`, and the surface wave at `d / (0.92 * vs)`. The P-S gap is
  `d * (vp - vs) / (vp * vs)` seconds, linear in `d`.
- **Waveform synthesis.** Each trace is the sum of three Ricker wavelets, the
  classic zero-phase seismic pulse: a small high-frequency P phase, a large
  mid-frequency S phase, and a low-frequency surface wave, each centered on its
  arrival and scaled by its amplitude. Seeded uniform noise fills the
  background.
- **Rendering.** Amplitude is normalized to the trace peak, mapped to a plot
  row, and drawn column by column; the zero line becomes the axis row with
  arrival markers. Sampling is subsampled to the requested plot width.
- **CLI and validation.** A hand-rolled argv parser (no crates) rejects unknown
  options, malformed numbers, and out-of-range values with a clear message and
  a non-zero exit code.

## Design choices

- **Rust, first for the lab, and dependency-free.** Wave propagation across
  a large grid is number-crunching, which is exactly what a systems language is
  for; the whole program is the Rust standard library only.
- **Empirical physics, not toy numbers.** Moment-magnitude relations, the
  sqrt(3)-ish Vp/Vs ratio, 1/distance spreading, and the 0.92 Vs surface wave
  are the standard seismological values.
- **Deterministic by default.** Same seed, same network, same waveforms; the
  PRNG is a small documented xorshift64* implementation.
- **Self-verifying.** `aftershock check` re-runs the core invariants at
  runtime, and `cargo test` covers every module.

## Key files

- `aftershock/src/rng.rs`: deterministic xorshift64* PRNG.
- `aftershock/src/physics.rs`: moment, rupture scaling, travel times, P-S gap,
  attenuation.
- `aftershock/src/model.rs`: fault grid, rupture footprint, station placement.
- `aftershock/src/waveform.rs`: Ricker-wavelet seismogram synthesis.
- `aftershock/src/render.rs`: ASCII seismogram rendering.
- `aftershock/src/export.rs`: wide/long CSV export.
- `aftershock/src/cli.rs`: argument parsing, validation, dispatch, self-checks.
- `aftershock/tests/` (unit tests in each module): 41 tests.
- `aftershock/README.md`: quickstart; `aftershock/docs/`: this documentation.

## Source

The project lives in
[`aftershock/`](https://github.com/Userfrom1995/Random/tree/main/aftershock)
with a
[README](https://github.com/Userfrom1995/Random/blob/main/aftershock/README.md)
and a full writeup in
[`ideas/`](https://github.com/Userfrom1995/Random/blob/main/ideas/2026-08-14-aftershock-seismic-network-simulator.md).