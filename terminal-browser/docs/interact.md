# Interaction loop

One persistent browser drives the whole loop: open once, snapshot
settled refs, act on them, wait and assert, tap console and network,
capture screenshots and PDFs. The interactive shell and the agent
script runner share the same engine, so human chips and agent refs
are identical per settled gen.

## Snapshots and refs

Every load settles (load event plus a 300 ms quiet window) into a
snapshot: `{gen, stable, refs}` where refs run in DOM order as `e1`,
`e2`, ... with role and accessible name. The same page yields the
same `eN` across gens. Refs address links, buttons, text inputs,
selects, checkboxes, radios, switches, sliders, menu items, and tabs;
headings, prose, and images never take refs.

Gens go stale by design: each mutating act re-settles into a new gen.
An act holding an older gen fails closed with `ref_stale` plus a
one-key remap (same role and name, else the nearest same-role
sibling), never a blind click on a neighbor. The CLI spells refs
`@e3` (bare `e3` works too) with an optional pinned `gen`; the shell
takes typed `eN`, chip clicks, and `R` for the remap.

## Script runner

```sh
tb-agent interact --url https://example.com/ --profile shop \
  --script steps.json
tb-agent interact --url https://example.com/ \
  --do '{"op":"snapshot"}' \
  --do '{"op":"click","ref":"@e4"}'
```

Each `--do` is one step; `--script` holds a JSON array of steps. Every
step reports `{op, success, data, code, warning, ms}` in the shared
envelope; any failure exits 1. Stale, missing, or node-less refs halt
the script (later ref steps would only stack confusion); timeouts,
assert failures, and act errors let recovery steps run on.

## Act suite

| CLI op | What it does |
| --- | --- |
| `snapshot` | Fresh settled snapshot with gen, refs, title, URL. |
| `hints` | Current snapshot without re-fetching. |
| `click` | Trusted mouse press plus release at the ref center. |
| `fill` | Focus, optional clear (real select-all plus delete), trusted keystrokes, optional Enter submit. Fields: `ref`, `text`, `clear`, `submit`. |
| `press` | Trusted key press: single chars, `Enter Tab Escape Backspace Delete` arrows `Home End PageUp PageDn` `F1`-`F12`, optional `mod` of `ctrl`, `shift`, `alt`. |
| `hover` | Cursor to the ref center, no click. |
| `scroll` | Trusted wheel deltas `dx`/`dy` (window-scroll fallback). |
| `select` | Set a select value with real input plus change events; refuses unknown options. |
| `check` | Set a checkbox/switch/radio via real click when the state differs, then verify. Field: `checked`. |
| `drag` | Trusted press, stepped moves, release: `from` plus `to` refs, or `from` plus `x`/`y` viewport coords, optional `steps`. |
| `upload` | Set a file input to a real on-disk file (`file` must exist). |
| `cursor` | Move the cursor to viewport `x`/`y` without clicking. |
| `dialog` | Answer the pending JavaScript dialog: `action` of `accept` (optional `prompt` text) or `dismiss`. No open dialog fails closed with `no_dialog`. |
| `navigate` | Warm in-place navigation with jar sync, history, and a fresh snapshot. |

Clicks tolerate the modal hang: a confirm raised mid-click blocks
the renderer, so a release timeout with a dialog now pending counts
as landed, and the `dialog` step answers next. `--dialog-policy`
`accept` or `dismiss` auto-answers inside the event tick for
unattended loops; `manual` (default) records only.

## Wait-for and assert

Both take a condition plus, for waits, a `timeout` in seconds:

| cond | Fields | Holds when |
| --- | --- | --- |
| `visible` | `ref`, `gen` | The ref resolves to a non-zero box. |
| `text` | `text` | Page text contains the substring. |
| `url` | `url` | Current URL contains the substring. |
| `title` | `title` | Document title contains the substring. |
| `value` | `ref`, `gen`, `value` | The control value equals `value`. |
| `count` | `selector`, `op` (`eq`, `ge`, `le`), `want` | `querySelectorAll` length compares true. |

`wait_for` polls every 150 ms up to 30 s; `assert` checks once and
reports the actual on mismatch. Dead refs fail fast instead of
polling a gone node for the whole budget.

## Console and network taps

The browser taps `console`, `exception`, page-error log lines, and
every request into capped rings from page open, so the first step
sees boot logs. `console` dumps (optional `clear`); `network` dumps
HAR-1.2 rows with byte counts, failure text, and the in-flight count
(optional `clear` resets both rings for a clean capture window).

## Screenshots and PDF

`screenshot` captures `viewport`, `full` (beyond viewport), or
`element` (a padded clip around the ref box) as PNG to `out`.
`annotate` draws the current snapshot ref boxes into the pixels with
a `out.legend.json` color map (per drawn ref id, file mode 0600
like the PNG itself); `if_unchanged` skips the write when
the pixels equal the last shot and reports `deduplicated`. `pdf`
exports the page through print-to-PDF with backgrounds on.

## Shell overlay

Live tabs show the Harbor overlay: one chip row (`eN` plus a `+NN
more` bank, width-budgeted) above the status line, and a 3-row drawer
on `:` listing refs in DOM order with the stale flag. Keys: `Space`
acts on the focused chip, `e` plus digits plus `Enter` acts by id,
`f` fills the focused text field, `j`/`k` move, `[`/`]` page the
drawer, `.` hides chips for reading, `R` applies the stale remap,
`Esc` closes. Chip clicks fire; `+NN more` opens the drawer. The
status line leads with `genN settled Krefs` (or `wait-settled`,
or the `STALE:eN` flag) so the generation survives narrow widths.
Shell acts click and fill through the same persistent browser the
agents use; every re-settle refreshes chips to the new gen.

## Sessions and concurrency

Each open runs its own Chromium instance directory under the
profile, so the interactive shell and parallel agent runs never share
a SingletonLock and crashed runs never wedge the next launch.
Cookies, history, bookmarks, and the navigation stack persist in the
profile root across instances, so logins resume; only
Chromium-internal state stays ephemeral per launch. One browser per
profile is the working contract: two writers to the same jar follow
last-write-wins like any shared profile.

## Agent protocol mapping

The script ops are the CLI twins of the agent control-plane tools:
`navigate`, `snapshot`, `click`, `type` (spelled `fill` here),
`press_key` (spelled `press`), `scroll`, `screenshot`, `wait_for`
(spelled `wait`), `assert`, `evaluate`, `console`, `dialog_handle`
(spelled `dialog`), with `hover`, `select`, `check`, `drag`,
`upload`, `cursor`, `network`, `pdf`, and `hints` rounding out the
loop. Envelopes stay byte-comparable per row after the usual
canonicalization (screenshot bytes to sha256, timings stripped).
