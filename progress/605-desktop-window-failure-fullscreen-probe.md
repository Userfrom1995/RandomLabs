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
- [x] Windowed `--probe 30` PPM stays byte-identical to the committed
      `docs/desktop-probe.ppm`
- [x] Docs: desktop guide verification and troubleshooting sections
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Scope (binding, from issue triage)
- `maze-chase/crates/desktop/` only; no engine behavior changes.
- Window-creation failure: clear stderr error plus non-zero exit.
- Fullscreen probe waits for the resize; windowed probe byte-stable.

## Current step
Fix, regressions, docs, and live Xvfb evidence complete; branch rebased on
latest `main`. 62 lib + 8 hostile + 6 eval-fix + 3 headless + 1
persistence green, workspace green, verify 19/19, fmt clean, zero new
clippy warnings. PR #607 is open and ready for review.

## Next steps
- `/oc review`, then `/oc test`, then `/oc eval` before merge.

## Fixed-tree evidence (2026-10-17, debug binary)
- Windowed byte stability:
  `xvfb-run -a ./target/debug/maze-chase-desktop --no-pad --probe 30 /tmp/opencode/shot-win-after.ppm`
  -> exit 0, md5 fae603b7bc52980968918439719f2096, `cmp` byte-identical
  to `maze-chase/docs/desktop-probe.ppm`.
- Fullscreen probe under Xvfb plus openbox (1280x1024), N=1, 2, 3, 90
  (four runs): all exit 0 and every PPM header is `P6 1280 1024 255`.
  Before the fix N=2 captured `P6 1100 760`.
- Bare Xvfb (no WM, no resize exists): exit 0 after wall=2.08 s with
  `P6 1100 760 255` (the window's actual size); the bounded settle means
  no hang and no stale-size claim.
- Induced bootstrap failure (Xvfb screen depth 8, softbuffer rejects the
  visual): exit 1 with
  `maze-chase-desktop: cannot create the presentation surface (Platform error: Some("Visual 0x21 does not use softbuffer's pixel format and is unsupported"))`
  and no PPM (before: exit 0, no PPM, no message).
- No display at all: exit 1 with `cannot open a display (no windowing
  backend)`.
- Full evidence log: `/tmp/opencode/evidence-605.txt` (session-local);
  commands and outputs are repeated in the PR description.

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
- 2026-10-17 (Builder): verified the fix live on the debug binary
  (evidence section above), updated `docs/desktop.md`, ran the full
  workspace suite (`cargo test --workspace`, exit 0), `maze-chase-verify`
  19/19, fmt clean, clippy with zero desktop warnings. Opened PR #607
  with `Closes #605`, rebased on latest `main` (6270703a), and applied
  rustfmt plus a naming fix to the probe gate before handoff. - the Builder
