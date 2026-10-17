# 605: Maze Chase desktop window-failure exit and fullscreen probe race

Status: in-progress

## Checklist
- [x] Reproduce both defects on the unfixed tree (depth-8 Xvfb: silent
      exit 0, no PPM; Xvfb plus openbox: `--fullscreen --probe 2`
      captures the pre-resize 1100x760 frame)
- [x] Defect 1: window-bootstrap failures print a clear stderr reason and
      exit 1 (no more silent exit 0)
- [x] Defect 2: `--fullscreen --probe N` holds the countdown until the
      fullscreen resize lands (bounded settle budget so it can never
      hang), and the capture re-renders when the last frame is stale
- [x] Regressions: unit tests for the boot-failure report/exit seam, the
      probe gate state machine, and the stale-frame capture guard
- [ ] Windowed `--probe 30` PPM stays byte-identical to the committed
      `docs/desktop-probe.ppm`
- [ ] Docs: desktop guide verification and troubleshooting sections
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Scope (binding, from issue triage)
- `maze-chase/crates/desktop/` only; no engine behavior changes.
- Window-creation failure: clear stderr error plus non-zero exit.
- Fullscreen probe waits for the resize; windowed probe byte-stable.

## Current step
`window.rs` fix landed with 7 new unit regressions (62 lib tests green);
docs and live Xvfb evidence pending.

## Next steps
- Update `docs/desktop.md`, run workspace tests, capture Xvfb evidence
  (windowed md5 vs committed PPM; openbox fullscreen PPM dims; depth-8
  induced window failure), then hand to review.

## Reproduction evidence (unfixed tree, 2026-10-17)
- Windowed byte-stable baseline:
  `xvfb-run -a ./target/debug/maze-chase-desktop --no-pad --probe 30 /tmp/opencode/shot-windowed.ppm`
  -> exit 0, md5 fae603b7bc52980968918439719f2096, byte-identical to
  `maze-chase/docs/desktop-probe.ppm`.
- Fullscreen race under Xvfb plus openbox (screen 1280x1024):
  `--fullscreen --probe 2` -> PPM header `P6 1100 760` (pre-resize).
  `--fullscreen --probe 3600` -> PPM header `P6 1280 1024` (post-resize),
  proving the countdown can outrun the WM resize for small N.
- Silent window failure (Xvfb screen depth 8, no usable visual):
  `DISPLAY=:97 ./target/debug/maze-chase-desktop --no-pad --probe 30 out.ppm`
  -> exit 0, no PPM, no diagnostic on stderr.

## Agent log
- 2026-10-17 (Builder): orientation on issue #605; confirmed both defects
  are present on `main` (9422b4eb). Built the desktop crate (installed
  libasound2-dev, libudev-dev, xkbcommon, wayland, X11 dev packages) and
  captured the three baseline runs above. Delegation ledger: no subagents
  launched; this is a single-file surgical fix (window.rs) with headless
  unit regressions, implemented by the primary against the reproduced
  evidence. Skills note: only `customize-opencode` is available and it
  covers opencode configuration, not game code. - the Builder
- 2026-10-17 (Builder): landed the `window.rs` fix. `BootFailure` carries
  the failing stage plus backend error; `abort()` records it and stops the
  loop; `exit_after_loop()` prints it and returns 1. `ProbeGate` holds a
  fullscreen probe countdown until a `Resized` event delivers the monitor
  size (2 s settle budget so a no-WM Xvfb run still terminates), the
  long-lived `Resized` handler feeds it, and `tick_probe` re-renders when
  the presented frame's dimensions no longer match the window. New unit
  tests: 4 gate cases, 1 boot-failure seam case, 2 capture-size cases.
  `cargo test -p maze-chase-desktop`: 62 lib + 8 hostile + 6 eval-fix + 3
  headless + 1 persistence green. - the Builder
