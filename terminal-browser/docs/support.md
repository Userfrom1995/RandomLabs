# Platform support

One codebase, three shells: Linux and macOS take the full graphics
and sidecar paths, Windows runs a hardened degraded chain that stays
correct where it cannot stay rich. Multiplexers force the block path
everywhere.

## Matrix

| Platform | Graphics chain | Sidecar | Status |
| --- | --- | --- | --- |
| Linux | Kitty, Sixel, iTerm2, block | System Chrome or headless shell, Chrome 140 floor | Full path |
| macOS | Kitty, Sixel, iTerm2, block | System Chrome or headless shell, Chrome 140 floor | Full path |
| Windows (ConPTY) | iTerm2 stills, Sixel, block preferred | System Chrome, long-path profile roots | Degraded but correct |
| tmux / screen (any OS) | Block only | Unchanged | Forced fallback |

## Linux and macOS

Full tier order (Kitty, then Sixel, then iTerm2, then block) with live
probing at startup and re-probe on resize. Animated media regions
compose through Kitty transmit-once plus placement (identical
repeats place without re-transmit; distinct frames transmit each
tick); stills repaint on
the still interval everywhere else. No elevation, no daemons: the
sidecar binds loopback only, and every store is an atomic JSON
document (0700 dirs, 0600 files) under `~/.terminal-browser`
(`$TB_HOME` redirects the whole tree for tests and portable
installs).

## Windows (ConPTY)

ConPTY passes through most escape sequences but negotiates graphics
poorly, so the hardened chain prefers iTerm2 stills and Sixel over
Kitty graphics and always keeps the block path live underneath. Live
capability queries are skipped (no raw-mode round trip), which lands
the probe on the degraded chain by default; `--tier` still forces any
tier for testing. ConPTY has no Kitty-keyboard protocol, so the
legacy input codec handles all keys (documented remap limits:
application-cursor and modified-function keys arrive as their legacy
sequences). Two runtime notes:

- Long paths: profile roots gain the extended-length prefix past 240
  characters, so deep per-launch sidecar instance dirs under long
  user names keep launching Chrome.
- Installs and AV: prefer an explicit `TB_CHROME` pointing at
  `chrome.exe` when the install lives under `Program Files` (spaces
  are handled, quoting is not needed) or when endpoint protection
  otherwise delays PATH discovery; the sidecar writes no registry
  keys and keeps stderr on the null device.

Rendering stays correct throughout: a Windows frame may be a still
where Linux animates, but refs, snapshots, sessions, extensions, and
agent tools behave identically.

## tmux and screen

Any `TMUX` or `STY` session forces the block painter for every
surface: graphics passthrough inside multiplexers corrupts both panes
and images, so the browser does not attempt it. Text, refs, and all
agent tools work unchanged; media regions report as stills on the
still interval.

## Environment overrides

| Variable | What it does |
| --- | --- |
| `TB_HOME` | Redirects the entire state tree (profiles, extensions, media log) |
| `TB_CAPS` | Merges capability gates with `--caps` |
| `TB_CHROME` | Pins the Chromium binary (checked before PATH and well-known paths) |
| `TB_TIER` | Forces a graphics tier for the probe |

## Verification per platform

`go build` passes for all three targets (`GOOS=linux|darwin|windows`)
and the static gate runs wherever Python exists. Live behavior is
proven by native reports: Linux and macOS exercise the full chain
plus the animated media tick, Windows proves the degraded chain
renders correctly (stills inside the refresh ceiling, byte budgets
holding), and a multiplexer session proves the forced block fallback.
