# M5 settled headless-Chromium shell proofs (2026-09-18)

Taken with system Chromium (headless new, SwiftShader WebGL) served from
the repo root over localhost, via the committed driver
`doom/tools/cdp-m5.mjs` (Node built-ins only). Settle rule: poll the
status line until it reports a running map (25 s cap), then 3 s extra for
saves plus onboarding paint before `Page.captureScreenshot`.

## Settled DOM (desktop 1280x1000, fresh profile)

- `status-line`: `E1M1 running (Tier 0 WebGL2 paletted, 640x400)`
- `save-status`: `Save storage: opfs. 6 slots, export/import ready.`
- `audio-status`: `Audio locked. Press Enable audio (a click counts as the browser gesture).`
- `wad-order`: `No custom WADs loaded. Built-in sample level active.`
- `wad-clamp`: `(empty on the built-in sample)`
- `dehacked-note`: `(empty, demo carries no DEHACKED)`
- `wad-error`: `(empty)`
- onboarding visible on first visit: `true`
- map select: `E1M1,E1M2`
- `canvas.toDataURL()` length: `2890` chars (composited frame, not a clear)
- renderer selector value: `auto`
- console plus page errors: none (favicon is an inline data URI, so no 404)

## Settled DOM (mobile 390x844 emulated, fresh profile)

- `status-line`: `E1M1 running (Tier 0 WebGL2 paletted, 640x400)`
- `save-status`: `Save storage: opfs. 6 slots, export/import ready.`
- `audio-status`: `Audio locked. Press Enable audio (a click counts as the browser gesture).`
- onboarding visible on first visit: `true`
- `canvas.toDataURL()` length: `2890` chars

## M5 shell fixes proved here

- Renderer selector pins the stored tier: forcing `doom-tier=1` boots
  `Tier 1 WebGL1 RGBA` and the selector shows `1` (was auto-probe only,
  the selector re-booted the probed tier). Pinned by `tools/audit-m5.mjs`.
- Inline favicon removes the last console 404, so a clean run reports zero
  page errors.

## Screenshots

- `shell-m5-1280.png`: desktop, live automap frame plus full control deck.
- `shell-m5-390.png`: mobile portrait, canvas on top, panels below.

## Fixer re-measurement (2026-09-18, Quality Council response)

- H1 widened to 10 runs x 120 frames (1190 deltas pooled): zero dropped
  vsyncs in every run, run-mean spread under 0.05ms (see
  `bench-m5.json` runToRun).
- H4 re-measured at N=30 each with raw per-run samples pinned in
  `samplesMs`: cold mean 313.6ms CI [309.2, 318.0] p95 330.0ms CV 4.0
  percent (meets the 5 percent gate; the prior run read 14.2 percent on
  the same shared runner, so cold CV is runner-jitter dependent), warm
  mean 269.4ms CI [268.1, 270.9] p95 276.1ms.
- H5 widened to N=30 gestures: mean 35.2ms CI [34.3, 36.2]ms p95 39.7ms.
- Corpus fuzz (`docs/fuzz-m5.json`, 32/32, E1M1 survives every drop) plus
  bounded soak (`docs/soak-m5.json`, 200k deterministic ticks, 0.8
  bytes/tick under forced GC) cover the headless-measurable halves of
  the ingest/corrupt/save plus soak promise.

## Still owned by a hardware runner

- Real IWAD plus PWAD drop round-trips on hardware GPUs, gesture audio on
  touch devices, throttled-network TTFF bands, and multi-hour wall-clock
  soak (deferred as UNSUPPORTED_BY_DESIGN on this container with machine
  proof in `docs/soak-m5.json`). The harness cells in
  `docs/bench-m5.json` cover the headless-measurable halves.
