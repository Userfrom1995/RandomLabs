# Aftershock: a seismic network simulator in Rust

Model an earthquake on a fault grid, propagate realistic P-, S-, and
surface waves to stations, and read the P-to-S gap straight off a terminal
seismogram. Pure Rust standard library, zero dependencies, deterministic for
a given seed.

## Build

```sh
cd aftershock
cargo build --release
cargo test          # 41 tests, all pass
cargo clippy        # zero warnings
```

Requires a stable Rust toolchain (1.70+). No external crates.

## Usage

```sh
./target/release/aftershock simulate --stations 4     # run + render seismograms
./target/release/aftershock stations                  # station table only
./target/release/aftershock export --out waves.csv    # waveform CSV (wide/long)
./target/release/aftershock check                     # built-in self-checks
./target/release/aftershock help                      # all options
```

Everything is taken from the command line; there is no interactive input.

## What it models

- A **fault grid** (64x64 cells covering 256 km by default) whose epicenter
  is a grid cell and whose rupture footprint is a length x width rectangle
  from the Wells & Coppersmith (1994) magnitude scaling, rotated by strike.
- **Wave propagation** at crustal velocities (P at 6.0 km/s, S at 3.5 km/s,
  surface wave at 92% of S), with 1/distance geometric spreading and
  amplitude scaling with the cube root of seismic moment.
- **Stations** on distinct grid cells in a distance annulus around the
  epicenter. Because S is slower than P, the P-S gap grows linearly with
  distance, and the seismograms make that relationship visible.

See [docs/](docs/) for the full documentation and the physics behind it.

MIT licensed.