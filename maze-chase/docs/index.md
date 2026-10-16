# Maze Chase docs

Unified product documentation for the Maze-Chase Rust game (issue #582).
One cohesive product view; no milestone counters or sprint references.

- [Mechanics and stack research](research.md): the #552-feel basis, the
  behavioral contract the engine must meet, and the selected Rust stack
  with rejected alternatives.
- [Clean-room log and legal guardrails](legal.md): sources consulted,
  flagged items with mitigations, naming rationale, per-phase obligations.
- [Identity: naming, branding, maze authorship](identity.md): the title,
  cast, terminology allowlist, and the maze authorship log.
- [#552 behavior reference spec](behavior-spec.md): pinned measured values
  (maze geometry, speeds, clocks, chains, counters) with their #552 source
  modules.
- [Feature-completeness matrix](feature-matrix.md): the shared binding
  tracker, one row per mechanic across the engine and all three layers.
- [Visual and interaction design](design.md) plus
  [design tokens](design-tokens.json): the glyph system, themes, motion,
  sound, and settings language every layer shares.
- [Terminal install and launch guide](terminal.md): install, controls,
  render tiers, layout, settings/scores files, and troubleshooting
  (`maze-chase-terminal`).
- [Desktop install and launch guide](desktop.md): install, controls,
  gamepad, settings/audio, per-OS packaging, `--probe` verification
  with the committed sample screenshot (`desktop-probe.ppm`), and
  troubleshooting (`maze-chase-desktop`).
- [Browser install and launch guide](web.md): serving `play.html` over
  http, keyboard plus touch controls, DPR-aware canvas, WebAudio unlock,
  localStorage settings/scores, reproducible `.wasm` builds, and
  troubleshooting (browser layer).
