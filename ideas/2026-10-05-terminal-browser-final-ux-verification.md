# Terminal Browser Final Phase: UX Design Pass and Real-World Verification

The terminal browser closes its epic: the Harbor Overlay design
tokens become enforced runtime policy (tick table, reduced-motion
fallback, anchored cuts, strobe grouping), the shell gains the
empty, error, and hostile states plus dialog discipline, and a new
`tb-verify` corpus runner proves all five live pages with retry,
Chrome floor checks, hermetic goldens, honest offline fallback,
and an agent-as-user end-to-end pass.

## Why this shape

Reduced motion is a policy module (`internal/term/motion.go`), not
scattered conditionals: one `Reduced()` predicate (flag, env,
config-style variable) feeds the governor, the spinner, the anchor,
and the fetch line, so every future animation inherits the fallback
for free. The shell states reuse existing pages and paths (the
`demo` router, the `OfflinePage` error document, the `PendingDialog`
slot) instead of new subsystems: a blocked-scheme card names the
scheme and the safe action, the empty tab is a stable zero-ref card
the chips and drawer already hide behind, and `Esc`/`M` drive the
dialog slot the agent tools share.

`tb-verify` reuses `engine.Navigate` and `engine.Style` rather than
a parallel fetch path, so the corpus proves the same code the shell
and agents run. Goldens pin markers plus row floors through the
production `Style` function; the hermetic run exits 0 offline
because missing Chrome classifies instead of crashing, and
`--strict-live` exists for release gates that must see live green.

## How it works

- Ticks live in one table (33/50/100 ms, 150 ms strobe window);
  `SpinnerFrame` parks past the cap, `SteppedBar` draws 10 cells,
  `FetchLine` names elapsed plus cancel past one second, and
  `AnchorFor` returns zero-frame, 1xT2, or static overlap per path.
- The governor parks under reduced motion (`TargetFPS` 0, `Wait`
  no-op); `tb --reduced-motion` sets the process override.
- `demo.BlockedScheme` refuses script schemes; `demo.EmptyPage`
  ships the starter card; the address bar windows overlong input
  with `<` `>` markers; `scroll` jumps pin the anchor tag the
  status line shows until settle.
- The corpus covers HN, wiki, TodoMVC React (JS probe binding),
  the bot wall, and the GitHub login wall; attempts back off
  linearly; hn/wiki fall back to bundled snapshots styled live;
  goldens live under `tests/fixtures/goldens/` inside the manifest.
- Docs stay unified: `docs/verification.md` joins the chain,
  architecture/support/README/hub absorb the harness and the motion
  contract with no milestone-stamped chapters.

## Notes

- No Go toolchain on the build runner, same as the Phase 6 run:
  Go compilation plus live Chrome proofs belong to the Tester
  natively; the Python gates (verify harness 11/11, design tokens
  5/5) pass here.
- The `t` key now opens the empty card instead of fixture home;
  `NewTab(addr)` stays for tests and explicit opens.
