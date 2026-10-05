# Terminal Browser Phase 4: Input Cursor DOM and Screenshot Interaction Loop

What it is: the live interaction loop for the agent-first terminal
browser (issue #532). One persistent Chromium sidecar plus one CDP
session per open replaces the one-shot fetch for everything
interactive: settled snapshot refs with gens, a full act suite,
wait/assert polling, console and network taps with HAR, screenshots
plus PDF export, a script runner CLI, and the Harbor overlay in the
shell. Verified live: a 15-step form fill plus confirm-dialog dismiss
plus screenshot-verify loop passes against a real page, with
stale-ref recovery demonstrated.

## Why this shape

Per-invocation CLIs cannot hold DOM refs across processes, so the
loop lives in a persistent `engine.Browser`: open once, act many
times with single-digit CDP round trips. The TUI reuses the same
handle (warm in-place navigation instead of a cold relaunch per
address), which is also the real browser architecture the later
control plane will serve.

Three honest constraints drove the details:

- Refs resolve through `backendDOMNodeId`, never re-queried lookalikes.
  A gone node re-snapshots and fails closed with `ref_stale` plus a
  remap, so acts cannot click neighbors.
- CDP runs page functions with the node as `this`, not as the first
  argument. The first live run caught this: every `callOn` body now
  reads through `this`.
- Modal dialogs block the renderer, so mouse release and submit keys
  hang mid-act. A short release budget plus a pending-dialog check
  turns the hang into a landed click the `dialog` step answers next.
- Orphaned sidecars hold the Chromium profile lock and wedge the
  next launch. Every open now uses a fresh instance directory under
  the profile root; cookies, history, and stacks persist in our own
  stores, so continuity survives while locks never collide.

## How it works

- `internal/engine/interact.go`: `Open` (locate, launch with bounded
  endpoint retry, connect, enable Log, lite flags, jar push, load,
  record, gen-1 snapshot), `Navigate` (warm in-place, gen bump),
  `Snapshot`/`Current`/`Lookup`/`RemapOne` with `StaleError` and
  `RefError` codes, `ParseRef` (`@eN` sugar), `RefreshURL`,
  `SetRecord`, stored styled `Rows`.
- `internal/engine/act.go`: trusted-input acts (`Click`, `Hover`,
  `Fill` with real select-all plus delete, `Press` with modifier
  chords, `ScrollPage` wheel with window fallback, `Select` with
  event dispatch and refusal on unknown options, `SetChecked` with
  verify, `Drag` with stepped moves, `Upload` through
  `setFileInputFiles`, `Cursor`, `HandleDialog` with manual plus
  auto policies) and dialog-aware release tolerance.
- `internal/engine/observe.go`: console/log/exception plus network
  watchers into capped rings, `HAR` export, `Verify`/`Wait`
  conditions (visible, text, url, title, value, count), `Screenshot`
  (viewport, full, element clip, stdlib annotation with legend,
  sha256 if-changed dedup), `PDF` with magic-byte verification.
- `internal/tui/hints.go` plus `shell.go`: persistent live browser
  per profile, one-row chip overlay with width budgets and mouse
  hit-testing, 3-row bordered drawer with paging, ref entry (`eN`),
  fill entry (`f`), `Space` act, `R` remap, `.` audit toggle, gen
  stamp leading the status line.
- `cmd/tb-agent/interact.go`: `--script`/`--do` runner with
  pre-launch validation, per-step results, auto re-settle after
  mutating acts, halt on poisoned refs, run-on for recoverable
  failures.
- Tests: hermetic Go units (refs, remap, codes, annotation pixels),
  `TestLiveInteractFormLoop` (httptest form page: fill, value
  assert, select, check, console tap, annotated shot, stale click,
  submit, dialog accept, title wait, done assert, dedup, HAR, PDF),
  CLI validation units, TUI overlay units, Python phase-4 contract.

## Key files

- `terminal-browser/internal/engine/{interact,act,observe}.go`
- `terminal-browser/internal/tui/hints.go`
- `terminal-browser/cmd/tb-agent/interact.go`
- `terminal-browser/docs/interact.md`

## Notes

- TUI acts cover click and fill; select/check/upload stay agent-side
  until a later pass gives the shell matching entry modes.
- Annotated screenshots draw boxes only; labels live in the legend
  JSON (no stdlib text rasterizer, no fake glyphs).
- `docs/interact.md` maps CLI op names to control-plane tool names
  for the upcoming parity matrix.
