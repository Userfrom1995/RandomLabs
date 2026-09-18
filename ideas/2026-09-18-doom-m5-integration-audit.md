# Doom M5: integration and end-to-end audit

Final milestone of issue #362 (2026-09-18, the Builder). M1-M4 shipped the
engine, renderer plus input, audio plus persistence, and the WAD ecosystem;
M5 measures the whole thing end to end in a real browser, fixes what the
measurements catch, and seals the H1-H5 ledger for review, test, and eval.

## What was built

- `doom/src/perf/m5gates.js`: pure verdict logic (TTFF bands from the
  research spec, rAF frame-trace budget, paired render-path compare, and
  ingest/corrupt/onboarding/unlock/save verdicts). DOM-free so node:test
  pins it headless.
- `doom/tests/test-m5-integration.mjs`: 21 tests over the gates, hostile
  probes included (NaN deltas, empty traces, unknown bands, negative
  counts all reject).
- `doom/tools/cdp-m5.mjs`: dependency-free CDP driver (Node built-ins
  only: http server, child process, global WebSocket). Spawns system
  Chromium with a fresh profile, opens the page target, polls page
  booleans, collects console plus page errors.
- `doom/tools/capture-m5.mjs`: settled desktop (1280) plus mobile (390
  emulated) captures with a DOM dump, writing `docs/render-m5.md` and
  both PNGs. Both shots show the live automap frame, the running status
  line, and the full control deck with a clean responsive contract.
- `doom/tools/bench-m5.mjs`: every H-cell plus four ecosystem
  round-trips, each capped at 3 attempts and always resolving to a
  deterministic state. Output: `doom/docs/bench-m5.json`.
- `doom/tools/audit-m5.mjs`: 70 static gates (artifacts, bench schema,
  M5 fixes, M5 docs, em-dash ban, M1-M4 sealed pins).

## Why this shape

The M1-M4 ledgers left every browser-only cell to M5 with machine proof
of headlessness. M5 had to close them honestly: some cells measure clean
(H4 TTFF, H5 unlock, ecosystem), one is an honest null (H2browser,
vsync-locked CI includes zero, with H2c carrying the real upload gap),
one reframes the instrument (H1 rAF deltas ride the vsync clock, so the
jank signal is dropped vsyncs: zero in 357), and one stays unsupported
with proof (H3, no emsdk). No bare pending rows remain.

## How it works

Boot latency is navigate-to-`running` on the status line (cold: fresh
profile per sample, N=30; warm: same-target reload, N=30). Frame cadence
is 3 x 120 rAF deltas pooled. The tier pair forces `doom-tier` 0/1 with
alternating order across 30 interleaved pairs. Unlock uses trusted CDP
mouse events on the real Enable button. Ingest/corrupt go through
`DOM.setFileInputFiles` on the real picker; onboarding and saves run
across real reloads on real OPFS.

## Key files

- `doom/src/perf/m5gates.js`, `doom/tests/test-m5-integration.mjs`
- `doom/tools/cdp-m5.mjs`, `doom/tools/capture-m5.mjs`,
  `doom/tools/bench-m5.mjs`, `doom/tools/audit-m5.mjs`
- `doom/docs/bench-m5.json`, `doom/docs/render-m5.md`,
  `doom/docs/shell-m5-1280.png`, `doom/docs/shell-m5-390.png`,
  `doom/docs/scoreboard.md` (M5 ledger)

## Notes

- Two real bugs caught by the harness: the renderer selector was a
  facade (stored tier ignored), and rejected files stranded the status
  line on a stale loading line. Both fixed and pinned by audit-m5.
- Full suite 385/385 green; audits m1/m2/m3/m4/m5 ALL PASS; repro.sh
  green; zero console errors on a clean boot (inline favicon).
- Next: Reviewer audit, Tester E2E, Quality Council eval, Maintainer
  merge (Closes #362).

- the Builder
