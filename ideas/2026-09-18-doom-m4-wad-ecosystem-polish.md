# Doom M4: WAD ecosystem and polish

Date: 2026-09-18. Issue: #362. Milestone 4 of the client-side web Doom
engine at `/doom/` (blueprint
`ideas/2026-09-17-doom-client-side-web-engine.md`, epic `progress/362-doom.md`).
M1 (engine core plus WAD parser), M2 (renderer plus input), and M3 (audio
plus persistence) already merged to `main`; this is the fourth sequential
milestone PR (`Refs #362`).

## What was built

The WAD story grows from single-file picker/drop into a real load order,
and the shell grows the states a polished product needs (onboarding,
loading, empty, error) without touching the sealed M1-M3 engines.

- `doom/src/wad/loadout.js` (new, pure, headless): `identifyWad` (doom1 /
  doom2 / mixed / unknown plus shareware likelihood via the episode clamp),
  `buildLoadout` (drop-order merge: map groups replace by marker, standalone
  lumps last-wins, stable slots, per-file E_CONTAINER isolation),
  `assembleWad` (merged directory the engine boots unchanged; single-file
  round-trip is byte-complete at 24546 bytes), `probeMaps` (per-map
  isolation over the five required lumps plus Hexen detect-and-report),
  `findDehacked` plus `describeDehacked` (surfaced info, never parsed, never
  applied), `describeLoadOrder` (numbered UI lines with identity suffixes).
- `doom/src/ui/shellStates.js` (new, pure): `resolveShellState` over
  loading / fatal / seenBefore / droppedCount (loading beats fatal beats
  onboarding; drops escalate ready to ready-warnings), loading plus empty
  plus dropped-map helper lines, `ONBOARDED_KEY` pin.
- Shell wiring (`app.js`, `index.html`, `theme.css`, `sw.js`): ordered file
  set with per-file remove buttons, ingest pipeline (stage, merge, isolate,
  assemble, precache, boot) where every failure keeps the running level
  alive and resumes its loop, map list filtered to viable maps with the
  shareware Episode 1 clamp note, first-visit onboarding (sample load plus
  sample `.wad` download plus dismiss persisted), loading line with
  aria-busy painted before the synchronous parse, alert-box errors,
  service worker `doom-m4-v1` that preserves the `doom-wad-v1` cache across
  shell upgrades (older shells evicted it on every activate).
- Tests plus audit: `tests/test-m4-ecosystem.mjs` (20 tests: merge rules,
  round-trip, hostile-map isolation, DEHACKED, identity, shell states),
  `tools/audit-m4.mjs` (51 static gates incl. an import-surface pin),
  `docs/render-m4.md` with settled headless-Chromium proofs at desktop
  (`docs/shell-m4-1280.png`) and 390px (`docs/shell-m4-390.png`).

## Why

A Doom engine that only boots one blessed file is a demo, not a platform.
The ecosystem milestone is what makes the M1 parser, M2 renderer, and M3
persistence actually usable: real IWADs plus community PWADs layer the way
players expect (last patch wins, broken maps skip), first-time visitors get
guided in, and failures degrade to warnings instead of black screens. The
merge math lives in a pure module so the Tester can fuzz it headless; the
shell stays a thin renderer of loadout facts.

## How it works

Drop order is the load order: the first IWAD is the base, every later file
is a patch. Map groups (marker through BLOCKMAP/BEHAVIOR, ranges from
`discoverMaps`) replace by marker name in place; standalone lumps replace
the last same-name occurrence in place; genuinely new lumps append. The
merged directory is re-assembled into one valid WAD buffer (magic follows
the base, PWAD for sets) so `initEngine` needs zero changes. `probeMaps`
then decodes each map's THINGS/LINEDEFS/SIDEDEFS/VERTEXES/SECTORS plus
reference resolution; survivors populate the map select, drops become
taxonomy-coded diagnostics. Ingest and removal both funnel through this
pipeline and precache the merged result, so reload boots the same set.

## Key files

- `doom/src/wad/loadout.js`, `doom/src/ui/shellStates.js`
- `doom/app.js` (ingest, removeWad, boot isolation resume, clamp, onboarding)
- `doom/index.html` (onboard panel, load order, loading/error states)
- `doom/sw.js` (`doom-m4-v1`, WAD-cache preservation)
- `doom/tests/test-m4-ecosystem.mjs`, `doom/tools/audit-m4.mjs`
- `doom/docs/render-m4.md`, `shell-m4-1280.png`, `shell-m4-390.png`

## Notes

- Headless Chromium caught a real boot-killer during verification: app.js
  imported `droppedLines` from the wrong module, failing the module link
  (status frozen at Loading). Fixed, pinned in audit-m4, proofs re-taken.
- The built-in sample stays E1-only, so the shareware clamp note appears
  only once a real WAD is staged (no scary wording on first boot).
- Custom WAD sets are session-scoped in memory; the merged result persists
  via the WAD cache. True multi-file persistence across restarts is M5
  scope (Tester E2E owns the ingest round-trip gate).

- the Builder
