# Verification

How the terminal browser proves itself against real pages: the live
corpus, the retry policy, the Chrome floor, the offline fallback, the
fixture goldens, the agent-as-user end-to-end run, and the per-OS
native reports. Everything runs through `tb-verify`; `repro.sh`
wires it into the one-command gate.

## The corpus

Five real pages, each with a row floor and a kind:

| Entry | URL | Kind | Row floor | Extra gate |
| --- | --- | --- | --- | --- |
| hn | https://news.ycombinator.com/ | content | 10 | - |
| wiki | https://en.wikipedia.org/wiki/Terminal_pager | content | 10 | - |
| todomvc | https://todomvc.com/examples/react/dist/ | spa | 3 | JS probe must execute |
| botwall | https://bot.sannysoft.com/ | botwall | 3 | honest block message when walled |
| github-login | https://github.com/login | loginwall | 3 | login form rows, never a session |

Cold navigations hold the 10 s binding budget; any load over budget
misses even with rows on screen.

## Retry and fallback

Each entry gets 3 attempts with linear backoff (500 ms times the
attempt number) before the harness gives up on live. When live is
unreachable, hn plus wiki fall back to the bundled shape snapshots
under `tests/fixtures/`, rendered through the production `Style`
path at grid width. Fallbacks report `live: false` with the offline
code: a fallback is a fallback, never a live pass. Entries with no
bundled snapshot report the miss honestly instead of inventing rows.

Run hermetically (fixtures and goldens only, no live attempts) with:

```sh
go run ./cmd/tb-verify --hermetic
```

Run the full live corpus and write the report with:

```sh
go run ./cmd/tb-verify --out /tmp/tb-verify.json
```

Fail on any live miss with `--strict-live` (used by release gates,
never by the default hermetic run).

## Chrome floor

The harness records the Chromium version and whether it clears the
140 floor (`engine.CheckFloor`). Below-floor or missing Chrome fails
live entries with `no_chrome` and the e2e run reports skipped with
the classify reason: the hermetic gate stays green offline, and the
reason always names the missing piece.

## Goldens

`tests/fixtures/goldens/` pins one JSON per entry: the hermetic row
floor, the marker text for entries with a fixture, and the fixture
name. The harness renders each fixture through `engine.Style` and
requires the marker plus the floor; live-only entries pin the floor
for live runs and pass hermetically by definition. Golden files are
covered by `tests/fixtures/MANIFEST.sha256`, so drift fails closed.

## Agent-as-user end-to-end

`--e2e` drives the persistent `Browser` exactly like an agent
would: open a session on `--e2e-url`, take the settled snapshot,
and assert a non-empty title plus real rows. It records the settled
gen and ref count, proving the human/agent ref contract on a live
page. Without Chrome it reports `skipped` with the reason; strict
mode turns the skip into a miss.

```sh
go run ./cmd/tb-verify --e2e --e2e-url https://news.ycombinator.com/
```

## Per-OS reports

Every report names its platform (`os`, `arch`), the Chrome
version and floor verdict, the graphics tier, and the reduced-motion
state, followed by per-entry rows and the e2e section. Native
reports land per platform: Linux and macOS exercise the full chain
plus the animated media tick, Windows proves the degraded chain
(stills inside the refresh ceiling, byte budgets holding), and a
multiplexer session proves the forced block fallback. Keep one
report per platform next to the release notes; the matrix they
prove lives in [support](support.md).

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Harness executed and every golden held (live misses recorded, not fatal) |
| 1 | A golden failed, or `--strict-live` saw a live or e2e miss |
| 2 | Flag misuse (`--attempts` outside 1..10) |
