# Doom M3: audio plus persistence (issue #362)

Date: 2026-09-18. Milestone 3 of the Doom client-side web engine epic.
M1 (engine core, WAD parser, Canvas2D automap loop) and M2 (WebGL renderer
ladder, full input pipeline) are on main; this milestone adds the real
audio pipeline and the durable persistence ladder.

## What was built

- Audio pipeline (`doom/src/audio/`): `wadAudio.js` (DMX lump parser,
  format 3 with vanilla sample-rate cap), `mus2mid.js` (MUS-to-SMF Type 0
  port with drum-channel map and scale-not-clamp volumes), `sfxCache.js`
  (lazy LRU decoded-sample cache), `sfxEngine.js` (8-voice pool with
  vanilla distance attenuation, stereo separation, pitch variance, steal
  policy), `mixer.js` (0..15 menu gains with click-free mute),
  `audioUnlock.js` (gesture unlock gate for the H5 autoplay policy),
  `musicEngine.js` (GENMIDI parse plus deterministic 2-op FM renderer
  with per-map song switch).
- Storage ladder (`doom/src/storage/`): `storage-opfs.js` (atomic OPFS
  writes behind a real round-trip probe plus timeouts),
  `storage-idb.js` (IndexedDB tier), `storage-local.js` (local config
  tier), `provider.js` (StorageProvider ladder: OPFS, IDB, local, memory,
  with traversal-safe `assertValidPath`), `saves.js` (6-slot save manager
  with debounce plus flush), `saveBundle.js` (versioned bundle
  export/import with atomic rollback), `wad-cache.js` (WAD cache races
  wedged backends with a 3 s timeout).
- Engine (`doom/src/engine/doomEngine.js`): save/restore snapshot hook
  (`setPlayerState`) with twin-convergence tests.
- Shell (`doom/index.html`, `app.js`, `theme.css`): Audio panel (unlock,
  sliders, mute) and Saves panel (slot save/load/delete, export/import),
  progression resume, bindings migration, per-frame SFX pump. Sealed
  boot-header pin kept.

## Key files

- `doom/src/audio/wadAudio.js`, `mus2mid.js`, `sfxCache.js`,
  `sfxEngine.js`, `mixer.js`, `audioUnlock.js`, `musicEngine.js`
- `doom/src/storage/provider.js`, `storage-opfs.js`, `storage-idb.js`,
  `storage-local.js`, `saves.js`, `saveBundle.js`, `wad-cache.js`
- `doom/tests/test-m3-audio.mjs`, `test-m3-storage.mjs` (48 tests)
- `doom/tools/audit-m3.mjs`, `doom/tools/bench-m3.mjs`,
  `doom/docs/bench-m3.json`, `doom/docs/render-m3.md`

## Verification

- `node --test doom/tests/test-*.mjs`: 293/293 green (245 M1/M2 sealed
  pins untouched, 48 M3 new).
- `node doom/tools/audit-m3.mjs`: 52/52 ALL PASS.
- `node doom/tools/bench-m3.mjs`: MEASURED cells recorded in
  `doom/docs/scoreboard.md` deterministic ledger; browser-only audio
  cells honestly owned by M5.
- Headless-Chromium settled proofs: Tier 0 E1M1 live with real canvas
  pixels at `doom/docs/shell-m3-1280.png` plus `shell-m3-390.png`; serve
  smoke returns 200s; zero external runtime deps.

## Notes

- Two real hardening finds beyond the plan: the probed storage ladder
  (a non-resolving OPFS backend hung boot) and WAD-cache timeouts on
  wedged backends.
- No em dashes anywhere; no `Co-authored-by` trailers; M1/M2 sealed
  evidence verified untouched by the green M1/M2 suites.
- Unlock gating is enforced on both SFX and music paths; bundle import
  rolls back atomically and never half-applies.
- WAD ecosystem polish (M4) and the H1-H5 statistical ledger with
  Playwright E2E (M5) are out of scope.

- the Builder
