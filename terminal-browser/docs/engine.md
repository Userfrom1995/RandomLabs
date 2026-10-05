# Engine: Chromium sidecar plus CDP fetch and text render

The terminal frontend never lays out CSS. One headless Chromium sidecar
owns real-web fidelity over CDP; the engine package converts the
accessibility tree into styled grid rows. No bundled browser ships in
the repo.

## Locator and launcher

`Locate` prefers `TB_CHROME`, then `google-chrome` and `chromium` on
PATH, then the well-known install paths per OS, then
`chrome-headless-shell`. `CheckFloor` enforces the Chrome 140 floor:
below-floor binaries fail closed with an upgrade message, and every run
records the exact `chrome --version` string.

`Launch` starts headless Chromium with a loopback-bound
remote-debugging port (`--remote-debugging-address=127.0.0.1`) and a
per-profile user-data directory (`~/.terminal-browser/profiles/<name>`),
then polls `/json/version` until the DevTools endpoint answers. Flags:
`--headless=new`, `--disable-gpu`, `--no-first-run`,
`--no-default-browser-check`, `--disable-extensions`. Profile isolation
is real from day one; cookie and history sync arrive in the session
phase. Profile names allow only `[a-zA-Z0-9_-]` (anything else fails
closed so `../../.ssh` can never escape isolation), directories are
created `0700` (cookies/history never world-readable), and `Extra`
flags containing `user-data-dir`, `remote-debugging-`,
`renderer-cmd-prefix`, `gpu-launcher`, or `utility-cmd-prefix` are
rejected as flag injection.

Windows note: ConPTY swallows APC sequences, so the engine uses the
same TCP loopback transport everywhere and documents pipe transport as
the AV-constrained fallback. The graphics chain on Windows already
prefers iTerm2 stills and Sixel over Kitty; see `architecture.md`.

## CDP session

`cdp.go` is a dependency-free client: the standard library has no
WebSocket client, so `ws.go` implements masked text-frame send plus
fragmented text-frame receive with masked pong answers. `Session.Call`
maps one incrementing id to one response channel with per-call
timeouts; wire writes hold a dedicated mutex (plus a conn-level write
mutex covering pong replies) so concurrent Calls never interleave
frames, and write errors clean up the pending entry. Transport death
wakes every pending Call with a connection error. Events fan out to
subscribers by method name; `Subscribe` must be paired with
`Unsubscribe`, and `Navigate` drains plus correlates `loaderId` so a
stale buffered event never completes the next navigation. The
handshake validates the status line as `101 Switching Protocols` plus
the `Sec-WebSocket-Accept` key per RFC 6455, and inbound frames are
capped at 32 MiB.

Domains enabled per session: Page, Network, Runtime, Accessibility.
DOMSnapshot enable is best-effort. Calls used in this phase:
`Page.navigate` plus `Page.loadEventFired`, `Network.setBlockedURLs`,
`Runtime.evaluate` (title plus the JS render probe),
`Accessibility.getFullAXTree`.

## Lite mode and the media path

`SetLite(true)` blocks images (`png`, `jpg`, `jpeg`, `gif`, `webp`,
`avif`, `svg`), media (`mp4`, `webm`, `mp3`, `ogg`), fonts (`woff`,
`woff2`, `ttf`), and common trackers via `Network.setBlockedURLs`.
Lite mode keeps text navigation fast and cheap. The default full path
loads everything for media surfaces, which a later phase paints as
real rects.

## AX tree to terminal stylesheet

`ax.go` parses `getFullAXTree` into nodes (roles, names, values, child
references) and flattens them depth-first into reading-order blocks:
headings (with level), links (with href), controls (with affordance
suffixes like `[input]` or `[button]`), images (`[image: alt]`),
tables (headers plus rows), list items, and prose.

`style.go` maps blocks to styled rows at the grid width: headings are
warm and bold with `#` prefixes, links are accent and underlined with
`[N]` indices plus `-> href` lines, controls are accent, images and
metadata are dim. `Wrap` word-wraps on rune boundaries with hard breaks
for overlong words (URLs, CJK strings). `LayoutTable` fits equal
columns with truncation marks and a header separator. `Rewrap`
reflows styled rows when the frame is narrower than the fetch width;
table rows are marked `NoWrap` at style time and pass through untouched
so column alignment survives.

## Navigation and timing

`Navigate` validates the URL (http and https only; anything else fails
closed with a pointer to the fixture router), launches the sidecar,
enables the domains, optionally sets lite mode, navigates with the
cold budget, styles the AX tree, and runs the JS probe. Results carry
`cold_ms`, the JS evidence (`executed`, node count, readiness, app-root
presence, user agent), and the Chrome version.

Binding budgets: cold navigate at most 10 s, warm navigate at most 3 s.
Any miss fails the gate. The warm path reuses a live CDP session for a
second load.

Results carry `cold_ms` as real integer milliseconds (never encoded
nanoseconds), plus `total_ms` measured from `Navigate` entry through
render (sidecar spawn plus connect plus enable plus load) so the
reported cost never understates true cold; `tb-agent fetch` emits both.
The JS evidence, the Chrome version on every path
including AX failures, and `RowCount` always equal to `len(Rows)`.
The warm diagnostic lives in `warm_title` / `warm_over_budget` (the
user-visible title is never mutated) and warm runs exceeding the 3 s
budget are flagged in `warning`. `Options.Timeout` tunes the sidecar
launch wait; the cold navigate itself enforces the 10 s binding budget.

## JS render probe

The probe evaluates a small expression that first sets a JS canary
(`window.__tbProbe = 1`), then reports node count,
`document.readyState`, app-root presence (`#root`, `#__next`, `#app`,
`main`, `article`), and the user agent; a second evaluate reads the
canary back. `executed` is true only when the canary reads back true
AND the page holds real nodes, so static HTML with JS disabled reports
false. Server-rendered pages (Hacker News, Wikipedia) pass on canary
plus node count and readiness; client-rendered SPAs (TodoMVC React)
pass on rendered headings plus app presence.

## Offline fail-closed

Every failure returns an honest result: `offline` with a machine code
(`offline`, `no_chrome`, `load_timeout`, `bad_url`, `bad_profile`,
`error`) and an
actionable warning, plus an error document that names the address, the
reason, and the next steps. Invalid profile names (anything outside
`[a-zA-Z0-9_-]`) fail closed as `bad_profile`, never the generic
`error`. Nothing ever claims content it did not
fetch. Unreachable hosts fail closed with the code and exit 1; the
only bundled snapshots are the clearly-labeled corpus files under
`tests/fixtures/` exercised by hermetic unit tests, never presented
as live renders.

## Reproduction, corpus integrity, and baseline

`repro.sh` is the one-command reproduction: `go build`, `go vet`,
`sha256sum -c tests/fixtures/MANIFEST.sha256`, hermetic `go test
-short`, the Python static gate, `tb-agent probe`, `tb-agent render
--fixture home`, and an offline fail-closed check, each with
PASS/FAIL. `tests/fixtures/MANIFEST.sha256` pins every corpus file;
`TestFixtureManifest` plus the static gate fail closed on drift.

The engine never grades itself on an absolute clock alone.
`BaselineFetchMs` is the raw-fetch incumbent (plain GET, the curl
`time_total` equivalent) run head-to-head against `Navigate` under
matched budgets (`TestLiveBaselineComparison` logs both and caps
engine cold at 10x the incumbent plus slack). Repeat runs use
`SummarizeCold` over N>=5 samples with mean plus p95
(`TestLiveRepeatStats` fails p95 over the 10 s budget).
