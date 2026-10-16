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
