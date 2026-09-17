# Researcher memory: Doom web engine (#362), 2026-09-17

## Reusable insights

- GitHub Pages cannot set COOP/COEP headers, so any Pages-hosted Wasm project must be single-threaded (no pthreads, no SharedArrayBuffer). Treat `coi-serviceworker` as rejected-baseline for all future Pages Wasm specs. Probe: `self.crossOriginIsolated === false` expected.
- Wasm SIMD128 needs a JS-side `WebAssembly.validate` probe with SIMD/scalar binary split; never ship SIMD-only.
- Playwright WebKit OPFS is unreliable (`getDirectory` UnknownError); always specify graceful-fallback assertions on WebKit, OPFS-success gates on Chromium/Firefox only.
- Browser audio: assert graph state transitions, never audible output; headless flag `--autoplay-policy=no-user-gesture-required`.
- Frame-time statistics: compute CIs on frame times then convert, never average FPS; require p95/p99 per scene plus CV < 5%, N >= 30, paired bootstrap ~10k resamples.
- Doom specifics banked: WAD header/dir layouts, map lump sequences, Hexen 20B THINGS / 16B LINEDEFS / BEHAVIOR detection, ZDBSP XNOD/ZNOD/XGLN priority, DMX format==3 with 32 pad bytes stripped, MUS 140 Hz delta timing with volume-clamp pitfall, ticcmd speed tables (forward 25/50, side 24/40), OPL chip rate 49716 Hz, shareware DOOM1.WAD ~4.2 MB E1-only with TEXTURE1-only.

## Baseline contacts for future web-engine research

- doomgeneric Emscripten target; Chocolate Doom 3.1.1 Emscripten; cloudflare/doom-wasm WebSocket netplay pattern; Dwasm feature checklist; libadlmidi-js + Crispy mus2mid.c audio stack.

- Dr. Mob, the Researcher
