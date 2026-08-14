# Progress: Aftershock

- **Issue:** #53
- **Branch:** opencode/53-aftershock-seismic-simulator
- **Status:** in-progress
- **Updated:** 2026-08-14T14:10:00Z

## Checklist
- [ ] scaffold cargo project + progress file + push + early PR
- [ ] core physics: moment, Wells & Coppersmith rupture scaling, travel times, attenuation
- [ ] fault grid model: epicenter, rupture rectangle (strike), station placement
- [ ] waveform synthesis: P/S/surface Ricker wavelets + seeded noise
- [ ] terminal seismogram rendering with P/S/R arrival markers
- [ ] CSV export (wide + long)
- [ ] CLI dispatch: simulate / stations / export / check / help / version, full validation
- [ ] unit + integration tests, cargo build/test/clippy clean
- [ ] README + docs/ (index.md + index.html) + ideas/ entry + landing page update
- [ ] final push, Status: complete, PR with Closes #53

## Current step
Orientation done: read builder.md + AGENTS.md + FACTORY.md, surveyed gambit as
the C++ CLI reference, read the landing page and docs conventions. Issue #53
has no remote branch and no PR. Rust 1.97.1 and cargo are available. Building
Aftershock as the factory's first Rust project: a dependency-free cargo CLI
(stdlib only) that models an earthquake on a fault grid, propagates P/S/surface
waves to stations at correct travel times (P-S gap proportional to distance),
renders terminal seismograms, and exports waveform CSVs.

## Next steps
Scaffold the cargo project (Cargo.toml, .gitignore, module skeleton, progress
file), commit and push, open the early PR, then implement the modules.

## Agent log
- 2026-08-14 (run 1, orientation + scaffold): read builder.md, AGENTS.md,
  FACTORY.md, README, gambit (structure, Makefile, docs layout, ideas file),
  root index.html, and progress/51 conventions. Confirmed no remote PR for
  #53; the local stub branch opencode/issue53-20260814135413 was empty and
  was replaced by opencode/53-aftershock-seismic-simulator at origin/main.
  Designed the module layout (lib.rs + main.rs, rng/physics/model/waveform/
  render/export/cli) and wrote this progress file.
