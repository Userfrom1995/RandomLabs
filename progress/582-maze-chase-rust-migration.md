# Progress - Maze-Chase Rust Migration

- **Issue:** #582 (parent tracker; gameplay reference #552 stays functional until replacement is verified)
- **Branch:** opencode/issue582-maze-chase-phase-final
- **Status:** in-progress
- **Updated:** 2026-10-16
- **Active Phase:** Final Phase: Packaging Verification and Release Audit (in progress)

## Phase Roadmap

- Phase 1: Research Synthesis and Legal Guardrails: [x] mechanics research from legitimate public sources, [x] clean-room legal review with flagged items, [x] shared feature-completeness matrix scaffolded in docs, [x] original naming plus branding plus maze-geometry authorship log, [x] #552 behavior reference spec pinned (PR 1 target, Refs #582)
- Phase 2: Shared Engine Core and Deterministic Simulation: [x] Cargo workspace plus pure engine crate, [x] maze plus movement plus collision plus tunnel, [x] scoring plus lives plus level-clear loop, [x] seeded RNG plus replay hash plus headless verify harness (PR 2 target, Refs #582)
- Phase 3: Ghost Intelligence Scoring and Progression: [x] four authored personalities plus scatter corners, [x] scatter/chase wave clock with reversals, [x] fright with flash plus chains plus eyes return, [x] house exits plus tunnel clamp plus pursuer stages, [x] bonus items plus difficulty ramp plus extra modes rules (PR 3 target, Refs #582)
- Phase 4: Original Assets Audio and Identity System: [x] original sprites plus animations plus themes, [x] original sound effects plus music plus audio trait impls, [x] settings plus keymap plus persistence model, [x] Design Council pass with design.md plus tokens (PR 4 target, Refs #582)
- Phase 5: Terminal Publication Layer: [x] fullscreen canvas layout plus scale engine, [x] Kitty plus Sixel plus Unicode backends with detection and watchdog, [x] dynamic resize with re-layout, [x] menus plus help plus scores plus settings screens, [x] installable package plus launch command plus docs (PR 5 target, Refs #582)
- Phase 6: Desktop Publication Layer: [x] windowed plus fullscreen GUI on one renderer core, [x] keyboard plus gamepad input with remap, [x] menus plus settings plus scores plus audio controls, [x] Windows plus macOS plus Linux packaging with reproducible steps (PR 6 target, Refs #582)
- Phase 7: WebAssembly Publication Layer and Web Hub: [x] browser-playable WASM build on same renderer core, [x] keyboard plus touch controls with mobile polish, [x] DPR-aware resize plus web-audio unlock, [x] maze-chase index.html hub with play entry plus per-layer docs (PR 7 target, Refs #582)
- Final Phase: Packaging Verification and Release Audit: [x] terminal tarball plus installer with Linux smoke, [x] reproducible build/release guide, [x] parity checklist against the behavior spec, [x] measured scoreboard, [x] matrix cross-cutting rows current, [ ] Windows/macOS native package plus E2E proof on per-OS runners (scripts shipped, proof pending), [ ] #552 retirement only after that proof (Final PR, Refs #582; Closes reserved for the verified-complete run)

## Current step

Final Phase in progress on `opencode/issue582-maze-chase-phase-final`
(Refs #582): new `packaging/terminal/` (`linux-tarball.sh` plus
`install-linux.sh`, mirroring the desktop pair, `--version`-probed),
new `docs/release.md` (toolchain, system libraries, layer builds,
packaging matrix, clean-checkout checklist), new `docs/parity.md`
(every behavior-spec rule mapped to its engine table and verify row;
native-OS rows open, so `pacman/` untouched), new
`docs/scoreboard.md` (0.8 us/tick, 344/344 suites green, node smokes
green, budgets with measured anchors), matrix cross-cutting rows
current, README/hub/docs-index unified. Two layer-test clippy lints
fixed and re-probed green; six pre-existing engine lints untouched.
Proof so far: `cargo test --workspace` exit 0 (344 passed, 0 failed,
30 suites), `maze-chase-verify` 19/19, fmt clean, node smokes ALL
GREEN, terminal tarball staged plus installed to a scratch prefix.
Windows/macOS native proof pending per-OS runners: PR uses Refs, not
Closes.

Phase 7 complete on `opencode/issue582-maze-chase-phase-7` (Refs #582):
new `crates/web` 0.1.0 (`maze-chase-web`, zero external deps, C-ABI
bridge, no wasm-bindgen: `session` fixed-step flow plus screens plus
steal rebinds, `input` keyboard/swipe maps, `video` RGBA composer
mirroring the terminal raster, `scores` top-10, `audio_map` cue/SFX/
tune tables, `bridge` total boundary), `play.html` plus
`web/maze-chase.js` (canvas loop, DOM screens/HUD, WebAudio synth,
swipe plus d-pad, localStorage, error card, favicon), committed
`web/maze-chase.wasm` (release, 190 KB, zero imports, reproducible),
durable `web/e2e/` (node smoke plus CDP browser E2E), `docs/web.md`
launch guide, matrix WASM rows to `done`, README/hub status to
all-playable with a Play button, plus
`ideas/2026-10-16-maze-chase-phase-7-web-layer.md`. No engine, assets,
audio, or config file changed (verify 19/19 intact).
Proof: 42 web unit green, workspace fully green, node smoke green
(zero imports, scoring, bit-identical frames, audio tables, hostile
probes), CDP E2E green (zero console errors, real ArrowUp scoring
20 to 30, P pause plus Resume, touch swipe, 390x844 board visible,
FPS 60 live), fmt clean, zero new clippy warnings (6 pre-existing
engine lints from clippy 1.99 untouched). Ready for review.

Phase 6 complete on `opencode/issue582-maze-chase-phase-6` (Refs #582):
new lib-plus-binary `maze-chase-desktop` 0.1.0 (`font` original 5x7
face; `frame` XRGB framebuffer with PPM screenshots; `render` pure
layout plus play/menu composition over the shared terminal
rasterizer; `input` winit physical-key mapping; `gamepad`
stick/button/padmap mapping plus remap screens; `sound` deterministic
PCM synth plus rodio backend with silent fallback; `screens`
title/help/scores/settings/audio/rebinds/padbind/pause/over flow;
`app` fixed-120 Hz session sharing the terminal settings/scores
files; `window` winit plus softbuffer loop with resize/fullscreen;
`cli` strict flags plus `--probe`; `main` binary),
`packaging/desktop/` (XPM icon, .desktop entry, Linux tarball plus
installer, Windows zip, macOS app scripts), `docs/desktop.md` launch
guide, matrix desktop rows to `done`, README/hub status to playable,
plus `ideas/2026-10-16-maze-chase-phase-6-desktop-layer.md`. No
engine, assets, audio, or config file changed (verify 19/19 intact).
Proof: 55 unit plus 3 headless plus 8 hostile regression green (66 desktop
tests total), workspace fully
green, `--help`/strict-flags smoke, real Xvfb `--probe 90` window run
(exit 0, 1100x760 title PPM verified pixel-counts), fmt clean, zero
new clippy warnings. Ready for review.

## Prior step

Phase 5 complete on `opencode/issue582-maze-chase-phase-5` (Refs #582):
new `maze-chase/crates/terminal` 0.1.0 (`layout` canvas fitter with
magnification plus too-small card; `raster` shared pixel frame;
`kitty` hand-rolled PNG plus chunked graphics with env-gated
detection; `sixel` hand-rolled encoder with live DA1 probe;
`backend` tier ladder with degrading watchdog; `unicode` 24-bit and
16-color cell board; `input` keymap-driven headings; `scores`
machine top-10; `chime` BEL-plus-ticker audio; `screens` plus `chrome`
menu flows with key-rebind capture; `app` session on the shared engine
with zero gameplay logic; `maze-chase-terminal` binary with RAII
terminal restore, 60 fps loop, `--tier`/`--dir` flags),
`docs/terminal.md` launch guide, matrix terminal rows to `done`,
README/hub status to playable, plus
`ideas/2026-10-16-maze-chase-phase-5-terminal-layer.md`. No engine,
assets, audio, or config file changed (verify 19/19 intact). Proof: 58
unit + 6 headless integration green, workspace fully green, `--help`
smoke, fmt clean, zero new clippy warnings. Ready for review.

## Prior step

Phase 4 complete on `opencode/issue582-maze-chase-phase-4` (Refs #582):
new `maze-chase/crates/{assets,audio,config}` (sprite glyphs plus
anim clips plus three contrast-checked themes; engine-event cue
routing plus five original tunes plus SFX recipes plus Null/Record
sinks; difficulty presets over shipped engine knobs plus keymap plus
human-readable persistence), `docs/design.md` plus
`design-tokens.json` with a palette cross-check test, matrix Phase 4
rows to `done`, README/hub to Phase 4, identity authorship log, plus
`ideas/2026-10-16-maze-chase-phase-4-assets-audio-identity.md`. No
engine file changed (goldens intact), no layer code per the zero-stub
rule. Proof: 45 engine unit + 2 golden + 26 hostile/quiescence green,
20 assets + 13 audio + 18 config green, `maze-chase-verify` 19/19.
Ready for review.

## Prior step

Phase 3 complete on `opencode/issue582-maze-chase-phase-3` (Refs #582, merged):
new `maze-chase/crates/engine/src/{modes,personalities,relish}.rs`
(wave clock plus four GameMode rulesets; four pure chase targets;
two-window relish machine), `ghosts.rs` rewritten around leg targets
with reversals plus pathing eyes plus pursuer cruise (`PlayerCtx`
bundles the per-tick player context), `game.rs` with `with_mode`,
relish integration, and clear fan-out (descend / sprint par bonus /
time-attack refill), `replay.rs` header carries the mode, `verify.rs`
19 rows, golden re-pinned once with an investigated rationale
(`23c17f89...`, score still 50), engine v0.3.0, matrix Phase 3 rows to
`done`, README/hub status to Phase 3, plus
`ideas/2026-10-16-maze-chase-phase-3-ghost-intelligence.md`. Proof: 45
unit + 2 golden + 12 hostile + 2 quiescence green, `maze-chase-verify`
19/19, 0.8 us/tick, fmt clean, no new clippy warnings. Ready for review.

## Prior step

Phase 2 complete on `opencode/issue582-20261016091213` (Refs #582):
`maze-chase/Cargo.toml` workspace plus `maze-chase/crates/engine`
(zero-dependency: tuning, maze with `include_str!` level loading,
actors, steering trait with wander baseline plus greedy helper, ghosts
with house exits/fright/chains/collisions, game state machine, mulberry32
streams bit-exact with the reference port, hand-rolled SHA-256 pinned by
FIPS vectors, replay log, 12-row verify harness with binary),
`maze-chase/levels/ember-warren.maze` (original authored layout, 445+4,
flood-fill proof in header), `tests/golden.rs` (pinned hashes),
`ideas/2026-10-16-maze-chase-phase-2-engine.md`, matrix engine rows to
`done`, README/hub status to Phase 2. Proof: 23 unit + 2 golden green,
`maze-chase-verify` 12/12, 0.7 us/tick, zero warnings. Ready for review.

## Next steps

- Reviewer pass on Phase 5, then Phase 6 (desktop publication layer)
  on a fresh phase branch from main referencing `Refs #582`
- Formal Design Council pass (`/oc design`) may refine `design.md` in
  a later phase; the Builder-authored pass is binding until then
- Reserve the Design Council pass (`/oc design`) in Phase 4 before visual polish is declared done; it ships `maze-chase/docs/design.md` plus `maze-chase/docs/design-tokens.json`
- Keep `Status: in-progress` with `Refs #582` until the final phase passes test and eval; only the final phase uses `Closes #582`
- Windows native re-run: rebuild the wasm on a CRLF checkout and root-cause the residual +26 bytes (observed +79 vs the maze CRLF's +53; N2 on PR #632)

## Standing notes

- Builder implements the active phase only, with real code and zero stubs; features planned for later phases MUST NOT appear as dummy buttons or placeholder banners in earlier phases
- One shared engine: any gameplay branch in a layer crate is a blocking review finding
- Every matrix row needs test proof; unavoidable limitations are documented, never silently dropped
- Every merge leaves repo and workflows green

## Agent log

- 2026-10-17 (fixer): applied the review-round blocking finding on `opencode/issue582-20261017220544` (PR #632). F1: removed the stale macOS vehicle duplicate `crates/terminal/tests/tester_macos_e2e.rs` (the copied #631 artifact `e0dc4129`, whose unguarded `libc::ptsname` static-buffer use and missing 61x35/62x34/62x35 plus Harsh `level==1`/`mode=="sprint"`/`score>0` assertions no longer match #631's Council-fixed vehicle), keeping every Windows commit and the three Windows contracts' assertions untouched; `git merge-tree` against #631's branch now exits 0 (the add/add conflict is gone). N1: corrected the prose of `crates/engine/tests/tester_windows_checkout_bytes.rs` to attribute the wasm drift to `levels/ember-warren.maze` alone (53 line endings, +53 bytes) and to note `docs/design-tokens.json` carries zero newlines with its only `include_str!` in a `#[cfg(test)]` module; no assertion changed. N2: recorded the residual +26 bytes (observed wasm +79 vs the maze's +53) for the fresh Windows native re-run to root-cause; no code action. N3: recorded `--probe` duplicate occurrences merging last-wins; conventional, no action. Proof: `cargo test --workspace --no-fail-fast` 402 passed / 0 failed across 43 targets (405 before, the three macOS tests removed), `maze-chase-verify` 19/19 (golden 23c17f89 identical, 0.8 us/tick), `cargo fmt --all --check` clean, clippy only the 6 pre-existing engine lints plus the pre-existing rng test lint, zero new warnings. Delegation ledger: no subagents (one blocking removal plus one prose correction the primary applied and verified directly; only known skill customize-opencode covers opencode config, not this Rust work). - the Fixer

- 2026-10-17 (fixer): applied the Windows native-pass findings on `opencode/issue582-20261017220544` (PR #632). Defect 1: `crossterm_to_key` now returns `None` for every non-`Press` `KeyEventKind`, so the ConPTY-synthesized Release twin of each keystroke cannot act a second time (the startup-probe replay still synthesizes `Press` events). Defect 2: desktop `parse_args` parses options in any order around `--probe` (frame count from the next token, screenshot path from the next positional token), so `--probe 30 --dir <cfg> <shot.ppm>` honors every option; a missing value still names `--probe` on the first error line, and no option value is ever taken from a following `--flag`. Defect 3: the root `.gitattributes` pins `maze-chase/levels/*.maze` and `maze-chase/docs/design-tokens.json` `text eol=lf`, so `include_str!` embeds identical bytes under `core.autocrlf=true` (the committed wasm is untouched). Nits: `window.rs:222` uses `bool::then_some`; `windows-zip.ps1` checks `$LASTEXITCODE` after `cargo build` and after the staged `--version` probe and throws non-zero; `docs/desktop.md` / `docs/terminal.md` carry the Windows `.exe` launch names plus the unsigned-binary SmartScreen first-run note; one `cargo fmt` reflow in the tester-authored checkout-bytes contract (no logic change). Proof: `cargo test --workspace --no-fail-fast` 405 passed / 0 failed across 44 targets, `maze-chase-verify` 19/19 (golden 23c17f89 identical), `cargo fmt --all --check` clean, clippy only the 6 pre-existing engine lints, the three Windows contract suites green (key-release 3/3, probe-order 2/2, checkout-bytes 1/1, the last also in an `autocrlf=true` scratch clone reading 0 CR bytes against 53 CR in the unpinned control). Delegation ledger: three parallel read-only general subagents - terminal input fix audit (filter at the choke point, probe replay provably `Press` because crossterm `KeyEvent::new` defaults to Press, crossterm Windows maps key-down records to `Press` so auto-repeat is unaffected; 121 terminal tests green), desktop CLI parse audit (full input table verified against the real binary, Xvfb probe PPMs byte-identical across orderings with `--dir` genuinely honored, 62 unit + 2 contract green), LF pin plus PS1 plus docs audit (clone CR simulation 0 CR pinned / 53 CR control red at the contract test, PS1 syntax OK with no silently failing native invocation, docs `.exe` plus SmartScreen plus zero em dashes). Primary verified itself with the full workspace suite, verify 19/19, fmt/clippy, and the in-place autocrlf negative control. Skills: no skill fits (`customize-opencode` covers opencode configuration only, not this Rust/PS1/docs work). - the Fixer

- 2026-10-17 (fixer): applied the review-round findings on `opencode/issue582-20261017140239` (PR #610). F1: `crates/desktop/tests/tester_window_e2e.rs::no_display_is_a_loud_nonzero_failure` is gated `#[cfg(target_os = "linux")]` together with its `absent_display` helper (plus a module note), because the absent-`DISPLAY` contract is X11-specific: winit's Win32 and Cocoa backends ignore `DISPLAY`, so the unconditional arm would have red the required Windows `cargo test --workspace` re-run while window creation works natively there. F2: every remaining `python3`-only serving surface in the maze-chase tree now spells the Windows interpreter too (`docs/web.md`, `docs/release.md` twice, the `web/maze-chase.js` module note and the shipped error-card hint, the `play.html` note, and the `web/e2e/browser-e2e.js` usage comment), mirroring the e2e README pattern. F3: the previous entry's proof/delegation line is corrected to its final record. Proof: Linux `cargo test --workspace` 388 passed / 0 failed across 38 suites exit 0 (the Linux-gated no-display test still runs; `tester_window_e2e` 7/7), `maze-chase-verify` 19/19, `cargo fmt --all --check` clean, clippy only the 6 pre-existing engine lints, Windows cross-target `cargo check --all-targets --workspace` exit 0 with zero warnings (the gated-out arm leaves no dead-code warning), `node --check` clean on both edited JS files, both node smokes ALL GREEN, live CDP browser E2E ALL GREEN under the default `os.tmpdir()` with both PNGs written and zero console errors. Delegation ledger: one read-only general subagent (F1-F3 diff audit) confirmed the cfg gating is warning-free on both platforms with no dangling references, all remaining maze-chase `python3` surfaces paired with the Windows spelling, the corrected counts matching the 38-suite / 388-pass log, and no JS syntax breaks or pinned hint strings, with no defect found; the primary verified itself with the full workspace suite, the Windows cross-target check, fmt/clippy, the node smokes, and the live CDP E2E. Skills: no skill fits (customize-opencode covers opencode configuration only, not this Rust/JS project). - the Fixer

- 2026-10-17 (fixer): applied the Windows native-test findings on `opencode/issue582-20261017140239` (PR #610). Defect A: the config `missing_file_notice` and `save_to_and_load_from_round_trip` tests build their paths from `std::env::temp_dir()` instead of `/tmp` (which resolves to a nonexistent `D:\tmp` on Windows and reds the whole workspace suite). Defect B: `Terminal::new` on Windows refuses a console-less run early (`stdout` not a terminal, `std::io::Error::other`) so the documented "cannot take over the terminal" arm exits 1 before crossterm's CONIN$/CONOUT$ raw mode can succeed where the Unix arm fails; the pinned `tester_windows_cli.rs` regressions and the previously hanging `tester_cli_strictness.rs::bogus_tier_warns_naming_value_then_refuses_without_tty` now have the guard they require. Defect C: `web/e2e/browser-e2e.js` derives its screenshot directory from `os.tmpdir()` instead of `/tmp`. Doc nits: `docs/desktop.md` notes the cargo snippets run from inside `maze-chase/`, and the e2e README carries the Windows `python -m http.server` spelling. Proof: `cargo test --workspace` 388 passed / 0 failed across 38 suites (main's new `tester_window_e2e` included), `maze-chase-verify` 19/19, fmt clean, zero new clippy warnings (the 6 pre-existing engine lints untouched), Windows target `cargo check --all-targets --workspace` clean, full CDP browser E2E ALL GREEN on Linux under a custom TMPDIR with both screenshots written into it, both node smokes ALL GREEN, Linux redirected run still exits 1 with the documented message. The Windows-native re-run must confirm the two pinned `tester_windows_cli.rs` tests turn green natively. Delegation ledger: one read-only general subagent (fixes audit) independently audited the three defects and the pinned `tester_windows_cli.rs` tests, confirming all three fixes correct and both pinned tests expected to pass natively; the primary verified itself via the full workspace suite, the Windows cross-target check, the live CDP E2E under a custom TMPDIR, and the live redirected-binary run. Skills: no skill fits (customize-opencode covers opencode configuration only, not this Rust/JS project). - the Fixer

- 2026-10-17 (fixer): applied the macOS native-test flake finding on `opencode/issue582-20261017133106` (PR #606). `probe_reply_assembles_fragmented_da1_reply` (`maze-chase/crates/terminal/src/main.rs`) no longer races its own 250 ms budget: fragment one is queued synchronously before the reader starts and the completion gets a generous 5 s budget, since the test proves fragmented assembly, not budget precision (the loaded macOS VM stretched the old 20/40 ms sender sleeps to 171.9/307.7 ms, landing fragment two past the deadline in 5 of 8 runs). `probe_timeout_is_bounded_and_leaves_input_intact` stays tight; no probe semantics changed. PR body corrected to `Refs #582`. Proof: the target test 20/20 consecutive green, full workspace `cargo test --workspace --no-fail-fast` 374 tests exit 0, `maze-chase-verify` 19/19 (golden 23c17f89 identical), fmt clean, no new clippy warnings (6 pre-existing engine lints untouched). Delegation ledger: no subagents (one reviewer-specified test-budget change plus a PR-body correction the primary applied directly; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-17 (fixer): resolved the merge conflict on `opencode/issue582-20261017093732` (PR #592) by rebasing onto `main` (`3da1d7d1`, the milestone-language sweep). One conflicted hunk in `maze-chase/docs/scoreboard.md`: the branch's 17-assertion browser-e2e correction and main's `release sign-off` wording were merged into a single bullet that keeps both intents (17 assertions in the current harness, 13/13 green at release sign-off, macOS native re-run noted, main's trailing "committed harness unchanged" sentence), with no milestone language anywhere in the file. Main's new `tester_docs_language.rs` guard passes. Proof: `cargo test --workspace` 370 passed / 0 failed across 35 suites (369 before; main's docs-language guard added one), all six probe regressions green (`tester_probe.rs`, `tester_macos_probe_window.rs`) plus `tester_persistence.rs`, `maze-chase-verify` 19/19 (golden 23c17f89 identical), `cargo fmt --all --check` clean, terminal/desktop clippy zero warnings (6 pre-existing engine lints untouched), `cargo check --all-targets --workspace --target x86_64-pc-windows-msvc` clean. Delegation ledger: no subagents (one docs-conflict rebase the reviewer specified exactly; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-17 (fixer): applied the Windows test-tree compile-gate finding on `opencode/issue582-20261017093732` (PR #592). `crates/terminal/tests/tester_packaging.rs` now carries `#![cfg(unix)]` after its module docs, so the Unix-only `PermissionsExt` import and `.mode()` call no longer break `cargo check --all-targets --workspace --target x86_64-pc-windows-msvc` (that check was failing with exactly the two E0433/E0599 errors in this file); on non-Unix the target compiles to an empty test binary and all 8 Linux packaging tests are unchanged. Proof: Windows all-targets check clean, `cargo test --workspace` 369 passed / 0 failed, `maze-chase-verify` 19/19 (golden 23c17f89 identical), fmt clean, terminal/desktop clippy zero warnings (6 pre-existing engine lints untouched). Delegation ledger: no subagents (one one-line test-file gate the reviewer specified exactly; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-17 (fixer): applied the macOS probe-window findings on `opencode/issue582-20261017093732` (PR #592) on top of `aa6c0750`. The startup DA1 probe no longer loses the keys it reads: `read_probe_reply` returns `(reply, typed)` and only a complete framed `ESC [ ? params c` reply is consumed (`find_da1_reply`/`da1_reply_complete`, and `sixel::probe_ok` now rejects every unframed string, so a stray `4` can never flip the renderer to Sixel). Every other captured byte is decoded by the new `input::keys_from_captured_bytes` (text, Enter including the pre-raw-mode CR-to-LF translation, Esc, Backspace, Tab, arrows, Home/End, Insert/Delete, PageUp/PageDown, F1-F12, xterm modifier parameters; split CSI/SS3 fragments are dropped rather than inventing an Esc) and replayed through `app.on_key` once the first frame is on screen, so an Enter typed during the window still shows the title and then starts play. Tests: the three `tester_macos_probe_window.rs` regressions are green (red on `aa6c0750`), plus new unit coverage in `input.rs` (decode order, escape sequences, modifiers, fragments) and `main.rs` (typed bytes before a reply are preserved; unframed captures yield an empty reply). Docs: `terminal.md` notes the replay. Proof: `cargo test --workspace` 367 passed / 0 failed (357 before), `maze-chase-verify` 19/19 (golden 23c17f89 identical), fmt clean, terminal clippy zero warnings (6 pre-existing engine lints untouched), Windows target `cargo check` clean. Delegation ledger: no subagents (one tightly-scoped probe/replay repair plus its tests the primary traced, edited, and verified end-to-end; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-17 (fixer): applied the Windows-arm re-review finding on `opencode/issue582-20261017093732` (PR #592). The probe's Windows arm no longer waits, then calls the unbounded, buffered `std::io::stdin().read()`: a wake on a non-character console record (arrow/function key, mouse/window event) parked that read past the 250 ms deadline and it ate the next key. It now drains only records already queued (`GetNumberOfConsoleInputEvents` gate plus `ReadConsoleInputW`), keeps key-down non-zero character records as UTF-8 reply bytes, and returns as soon as the DA1 terminator lands; nothing blocks past the deadline and crossterm's console input is never stranded behind Rust's hidden stdin buffer. `windows-sys` gains `Win32_System_Console`; the unused `std::io::Read` import is gone; no Unix path changed. Proof: Windows target `cargo check` clean, `cargo test --workspace` 357 passed / 0 failed, `maze-chase-verify` 19/19 (golden 23c17f89 identical), fmt clean, terminal/desktop clippy zero warnings (6 pre-existing engine lints untouched). This arm cannot execute on Linux, so the native Windows retest must cover: an arrow/function key pressed during the 250 ms startup window followed by one Enter at the title (play must start on that single Enter), and unchanged `--tier sixel`/DA1-answering detection. Delegation ledger: no subagents (one reviewer-specified Windows-arm replacement plus its type adaptation, verified against the windows-sys 0.59 source and cross-checked with the Windows target toolchain; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-17 (fixer): applied the macOS native-test findings on `opencode/issue582-20261017093732` (PR #592). Defect 1: the live Sixel DA1 probe no longer leaves a helper thread blocked in `stdin().read()` past the 250 ms budget (it swallowed the next keypress); it now reads only while bytes are ready (`poll(2)` on Unix, a waitable console handle on Windows, nothing alive after the deadline) and assembles fragmented replies. Defect 2: desktop `save_settings` creates the config directory before the first commit, matching the terminal path, so mute/difficulty/rebind persist on a fresh machine. Tests: new `terminal/tests/tester_probe.rs` drives the real binary in a DA1-silent PTY and pins that one single Enter starts play (red on the old probe, green on the fix); three pipe-based unit tests pin fragmented-reply assembly, the bounded timeout, and that input typed after the deadline survives; the committed desktop reproduction (b56b9879) is green. Doc nits: matrix desktop proof names corrected to the real test functions, `terminal.md` four render tiers, browser-e2e label 17 assertions. Proof: `cargo test --workspace` 357 passed / 0 failed, `maze-chase-verify` 19/19 (golden 23c17f89 identical), fmt clean, zero new clippy warnings (6 pre-existing engine lints untouched), Windows target `cargo check` clean for the new probe arm. Delegation ledger: no subagents (two tightly-scoped repairs plus their regression tests the primary traced, edited, and verified end-to-end; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-16 (fixer): applied the Evaluator rejection on `opencode/issue582-maze-chase-phase-7` (scores getters called mc_score_name/score/level but the wasm exports only mc_score_get_name/score/level, so both tables rendered empty inside swallowing try/catches; renamed all four JS call sites). Found and fixed a second latent break in the same path: boot-time localStorage import used mc_score_add, which needs a pending finished run and always returned 0 on fresh boot, so persistence never restored; added total `mc_scores_push(ptr,len,score,level)` bridge export and rewrote importScores onto it. Rebuilt the committed release wasm from the fixed source. Extended coverage: tester-regression.js gains export-existence pins plus a two-row push/getter/clear round-trip plus the sfx-wire-arm consistency invariant; browser-e2e.js gains a scores leg (seed localStorage, reload, assert Kessa 900/L3 renders, clear in-page). Also fixed the riding non-blocking items (e2e README covers all three harnesses with the correct shipped-wasm default, docs/web.md 43 tests). Proof: 43 web unit green, node smoke ALL GREEN (190772 bytes, zero imports), tester regression ALL GREEN, CDP browser E2E ALL GREEN (real ArrowUp scoring, pause/resume, swipe, mobile board, seeded scores row renders, zero console errors), node --check clean on all four JS files, fmt clean, zero web clippy warnings (6 pre-existing engine lints untouched). Delegation ledger: no subagents (one tightly-scoped scores-path repair the primary traced, edited, rebuilt, and verified itself end-to-end in a single session; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-16 (fixer): applied the Phase 7 review findings on `opencode/issue582-maze-chase-phase-7` (warden-chain pitch stored in engine domain 0..=3 with the wire exposing stored+1 and a single Rust-side doubling, JS mult block removed with f0/f1 used as-is; regression test pins warden:200 to wire 1 at 400 Hz and warden:1600 to wire 4 at 3200 Hz through the session path; rebuilt the committed release wasm from the fixed source; Phase 7 delegation ledger plus skills note added to the ideas entry and the agent log; trivial nits fixed: dead `let _ = key` lines, single-lock relish read, tuning threshold constant, canvas/dpad roles, hub favicon, smoke shipped-wasm fallback, e2e WebSocket guard, canvas style dirty-check, dead disarmRebind branch removed). Proof: 43 web unit green, engine/audio/config/assets suites green, node smoke green against the rebuilt wasm (zero imports, scoring live, wire chain 1 at 400 Hz), fmt clean, zero new clippy warnings (6 pre-existing engine lints untouched). Delegation ledger: no subagents (surgical fixes the primary applied directly against the quoted findings; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-16 (builder): implemented Phase 7 on `opencode/issue582-maze-chase-phase-7`. New `crates/web` 0.1.0 (`maze-chase-web`, zero external deps, plain C ABI with no wasm-bindgen: `session` fixed-step flow plus screens plus steal rebinds, `input` keyboard/swipe maps, `video` RGBA composer mirroring the terminal raster, `scores` top-10, `audio_map` cue/SFX/tune tables at 132 BPM, `bridge` total boundary), `play.html` plus `web/maze-chase.js` (canvas loop, DOM screens/HUD, WebAudio synth with gesture unlock, swipe plus d-pad, localStorage persistence, error card, favicon), committed `web/maze-chase.wasm` (release, 190 KB, zero imports, reproducible), durable `web/e2e/` harnesses (node smoke plus CDP browser E2E), `docs/web.md` launch guide, matrix WASM rows to done, README/hub to all-playable with a Play button, plus `ideas/2026-10-16-maze-chase-phase-7-web-layer.md`. No engine, assets, audio, or config file changed (verify 19/19 intact). Proof: 42 web unit green, workspace green, node smoke green (zero imports, scoring, bit-identical frames, hostile probes), CDP E2E green (zero console errors, real ArrowUp scoring, pause/resume, touch swipe, mobile board visible, FPS 60 live), fmt clean, zero new clippy warnings. Delegation ledger: session plus bridge units, input plus video plus scores plus audio-map units, and play.html plus harness plus docs plus tracker units implemented directly by the primary against the shipped engine/assets/audio/config APIs (no subagent launch record survives in the log for this phase); primary verified itself via the proof above. Skills note: only known skill customize-opencode covers opencode config, not game code. - the Builder

- 2026-10-16 (fixer): applied the 8 Evaluator gaps on `opencode/issue582-maze-chase-phase-6` (README stale desktop-planned sentence; hub counts to 55 unit + 3 headless + 8 hostile; committed `docs/desktop-probe.ppm` from a live Xvfb `--probe 30` run with desktop.md/index.html references; matrix desktop proof column names test files; render_menu y-budget truncation plus overflow test; fright test hardened to a `start_fright` deterministic fixture; docs/index.md gains terminal/desktop guides; .desktop gains TryExec plus StartupWMClass). Proof: 55 unit + 3 headless + 8 hostile green, verify 19/19, fmt clean, zero desktop clippy warnings (6 engine warnings pre-exist). Delegation ledger: no subagents (eight small surgical edits the primary applied directly against the quoted findings; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-16 (fixer): applied the Phase 6 review findings on `opencode/issue582-maze-chase-phase-6` (install-linux.sh local fallback plus tmpdir trap; apply_tune change guard; accumulator surplus drop; render_menu/frame border small-window guards; screens index clamping plus capture cursor freeze; SFX sink play plus dead-code cleanup; probe error propagation plus per-redraw countdown; stick reset on disconnect; pad-capture single-button break; lib.rs comment; headless independence assert on pixels; tracker branch/phase; hub Layers sentence). Proof: desktop unit plus headless suites green, workspace build green, fmt clean. Delegation ledger: no subagents (nine small surgical edits the primary applied directly file-by-file against the quoted findings; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-16 (builder): implemented Phase 6 on `opencode/issue582-maze-chase-phase-6`. New `crates/desktop` 0.1.0 (font/frame/render/input/gamepad/sound/screens/app/window/cli plus binary) driving the shared engine with zero gameplay logic, plus `packaging/desktop/` per-OS artifacts, `docs/desktop.md`, matrix/README/hub updates, and the Phase 6 ideas entry. Proof: 54 unit + 3 headless integration green, workspace fully green, verify 19/19, `--help`/strict-flag smoke, real Xvfb `--probe 90` window run, fmt clean, zero new clippy warnings. Delegation ledger: renderer/session, input/audio/CLI, and docs/packaging/tracker units implemented directly by the primary against the shipped engine/assets/audio/config APIs (no subagent launch record survives in the log for this phase); primary verified itself via the proof above. Skills note: only known skill customize-opencode covers opencode config, not game code. - the Builder

- 2026-10-16 (builder): implemented Phase 5 on `opencode/issue582-maze-chase-phase-5`. New `crates/terminal` 0.1.0 (only dependency: crossterm; PNG, base64, Sixel, layout, and all screens hand-rolled std-only) driving the shared engine with zero gameplay logic, plus `docs/terminal.md`, matrix/README/hub updates, and the Phase 5 ideas entry. Proof: 58 unit + 6 headless integration green, workspace fully green, verify 19/19, `--help` smoke, fmt clean, zero new clippy warnings. Notable catches: first-run settings save needed `create_dir_all` (pinned by persist test), fright-mask test first asserted body pixels the mask glyph never carries, PNG chunk test assumed a wrong frame split. Delegation ledger: no subagents (single-crate layer the primary authored directly against the shipped engine/assets/audio/config APIs; only known skill customize-opencode covers opencode config, not game code). - the Builder

- 2026-10-16 (builder): implemented Phase 4 on `opencode/issue582-maze-chase-phase-4`. Three subagents authored `crates/assets` (glyphs, anim, themes), `crates/audio` (cues, score, sinks), `crates/config` (settings, keymap, persist) against written specs; primary wired workspace members, removed stray per-crate lockfiles, authored `docs/design.md` plus `design-tokens.json` with a palette cross-check test, updated matrix/README/hub/identity/index plus the Phase 4 ideas entry. Proof: 20 assets + 13 audio + 18 config green, engine suites untouched, verify 19/19. Delegation ledger: three parallel general subagents for crate implementation (only known skill customize-opencode covers opencode config, not game code). - the Builder

- 2026-10-16 (architect): charted Phase Epic from the owner order plus three subagent spikes (Rust stack trade-offs, module decomposition, legal and matrix planning). Selected pure-Rust engine with macroquad/miniquad shared renderer (eframe fallback), ratatui plus crossterm terminal with image-plus-Unicode tiers, rodio plus web-audio shim behind an engine Audio trait. Wrote unified blueprint in `ideas/2026-10-16-maze-chase-rust-migration.md` and this epic tracker. Handoff to Builder for Phase 1. - the Architect
- 2026-10-16 (builder): implemented Phase 1 on the epic branch. New `maze-chase/docs/` (research with the #552-feel basis and crate trade-offs, legal with source log plus four flagged mitigations, identity with the Pip-vs-wardens cast and maze authorship log, behavior-spec with live-measured #552 values, feature-matrix with every row honestly planned, index map) plus `maze-chase/README.md` and `maze-chase/index.html` hub (honest Phase 1 status, no play button until Phase 7) plus `ideas/2026-10-16-maze-chase-phase-1-research.md` plus root landing entries. No `crates/` scaffold (Phase 2's deliverable). Delegation ledger: no subagents (docs-only phase synthesizing in-repo sources the primary had already read: tuning.py, ghosts.py, game.py, maze.py, modes.py, plus live measurement runs; only known skill customize-opencode covers opencode config, not game docs). Primary verified itself by measuring every pinned value from the real code. - the Builder
- 2026-10-16 (builder): implemented Phase 2 on the epic branch. New `maze-chase/Cargo.toml` workspace plus `maze-chase/crates/engine` (zero-dep lib: tuning/maze/actors/steering/ghosts/game/rng/sha256/replay/verify, `maze-chase-verify` binary, golden tests) plus `maze-chase/levels/ember-warren.maze` (original 28x31 layout, 445+4, flood-fill proof) plus `ideas/2026-10-16-maze-chase-phase-2-engine.md`; matrix engine rows to done, README/hub to honest Phase 2 status. Proof: 23 unit + 2 golden green, verify 12/12, 0.7 us/tick, zero warnings. Notable catches: f32 STEP widening would have starved the tick loop (f64 accounting), Python-mulberry32 middle-step overflow quirk replicated bit-exact, `#`-comment filter collided with wall rows (narrowed predicate). Delegation ledger: no subagents (single-crate engine the primary authored directly; only known skill customize-opencode covers opencode config, not game code). - the Builder
- 2026-10-16 (builder): implemented Phase 3 on `opencode/issue582-maze-chase-phase-3`. New `modes.rs` (WaveClock plus GameMode), `personalities.rs` (four pure targets plus dispatch), `relish.rs` (two-window machine); rewrote `ghosts.rs` (leg targets, reversals, eyes, pursuer, PlayerCtx) and extended `game.rs` (with_mode, relish, clear fan-out, mode clocks, canonical), `replay.rs` (mode in header), `verify.rs` (19 rows), one investigated golden re-pin, engine v0.3.0; matrix Phase 3 rows to done, README/hub to Phase 3, plus `ideas/2026-10-16-maze-chase-phase-3-ghost-intelligence.md`. Proof: 45 unit + 2 golden + 12 hostile + 2 quiescence green, verify 19/19, 0.8 us/tick, fmt clean, no new clippy warnings. Notable catches: sprint bonus float truncation, drained-event reads in step-based tests, crumb under the relish tile in exact-score assertions, Nib strict-greater-than-8 boundary. Delegation ledger: no subagents (single-crate engine the primary authored directly; only known skill customize-opencode covers opencode config, not game code). - the Builder
