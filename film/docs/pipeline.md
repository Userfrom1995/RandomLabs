# Hearthlight pipeline and reproducibility

## Tools

- `node film/tools/audit.mjs` - binding gates: runtime 240-300 s, five
  acts, contiguous shots, per-shot coverage (background, cast, music cue,
  caption timing), motif resolution, timeline end behavior, RNG
  determinism, binary provenance, storyboard parity. Exit 0 is green.
- `node film/tests/smoke.mjs` - fast engine invariants: seed stability,
  substream isolation, runtime total, caption lookup, motif resolution.
- `node film/tools/render.mjs` - validates the screenplay, exports one SVG
  still per act plus `dist/manifest.json` with sha256 checksums of every
  committed source. Same inputs yield byte-identical outputs.

## Reproducibility contract

1. One committed seed (`20260927` in screenplay.json) drives all jitter,
   grain, and ornament. No wall-clock, no network, no `Math.random` in any
   render path.
2. The renderer is a pure function of (timeline, time). Scrubbing to the
   same second draws the same pixels.
3. No binary artifacts without committed generators; the audit fails the
   build if any appear.
4. The player clock is the timeline: play advances it by rAF delta, pause
   and seek set it exactly.

## Roadmap hooks

Later phases extend this skeleton: PNG hero-frame export with hash
verification (determinism harness), WAV stem export (score audit), review
stills capture, and the A/V sync audit. Each lands on the phase branch
that needs it, behind the same gate discipline.
