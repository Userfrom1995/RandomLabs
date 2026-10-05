# Terminal Browser design (Design Council, issue #532)

Council run: four rounds (Propose, Critique, Revise, Converge) via specialist swarms.
Unanimity-minus-one. Dissent recorded verbatim in the log at the end.
Scope: TUI shell plus hub for Phase 2 and beyond. The Builder implements
this direction; deliberate deviation needs a rebuttal plus Maintainer approval.

## User summary

Who the user is: (1) a terminal-native operator who lives in ssh, tmux,
and the shell and wants a real browser without leaving the grid; (2) an AI
agent driving the same browser through MCP or the CLI with identical
capability; (3) a supervisor watching an agent session and verifying refs.

Top 3 tasks: (1) navigate to a real page, find the right control, and act
on it (open link, fill form, dismiss dialog) from keyboard, mouse, or agent
tool with the same refs; (2) keep sessions, cookies, history, and profiles
across restarts and inspect them; (3) verify visually (screenshot, status,
error card) and recover from stale refs, offline states, and hostile pages.

## Chosen direction: Harbor Overlay System v2

Revised synthesis of Hint Rail Commander plus Harbor Signal plus Signal
Ledger v2. Three tightly coupled parts:

UX (Harbor Overlay v2): overlay hint chips (`eN` plus `+NN more` bank,
single row, zero reflow), single-shot palette plus 3-row overlay drawer
with no auto-open, settled-only snapshots with `{gen, stable}` envelope
and one-key `ref_stale` recovery. Runner-up ideas folded in: `.` audit
layer toggle from Focus Trail, lowercase labels from Ember Ledger.

Visual (Harbor tokens v2): Harbor palette with measured ratios (chips
approx 10:1 on accent, body 13.21, focus row 9.34), 16-color and ASCII
collapse maps, ASCII-only chrome, no dim simulation. Case rule: URLs and
tags verbatim lowercase, nav labels Title Case max 12 chars, UPPERCASE
only for 2-3 char state (GO, OK, ERR, ACT).

Motion (Signal Ledger v2): tier tick table (33/50/100 ms), zero-frame
content replace plus 1-step 50 ms anchored cut for viewport displacement,
dirty-rows-only, spinner with elapsed label plus 10-cell stepped bar,
150 ms strobe grouping, input preempts in 1 tick, reduced-motion path.

Rationale: it is the only combination that fits 80x24, survives the
16-color and ASCII collapse, stays inside the PTY byte budget on tmux
forced-block, and keeps human and agent refs identical per settled gen.

## Runner-up and why it lost

Rich default (Focus Trail ring-only plus Ember Ledger dot leaders plus
Lantern Glide 160 ms viewport slide). Rejected with three binding
objections: (1) row budget: dot leaders plus wrapped paren hints cost an
extra scroll page at 80x24; (2) tier collapse: ring-only focus and
dark-on-accent fills vanish in 16-color and ASCII where accent maps to
gray; (3) snapshot tearing: eased viewport slides rewrite ~380
cells/frame against a 60-cell cap, so the glide path falls back to snap on
every real SSH session and motion becomes nondeterministic. Surviving idea:
the `.` audit layer and lowercase label stance, folded into the chosen
direction above.

## UX flows

Shell grid (all states): row 0 tab strip, row 1 address bar, rows 2..H-2
content (overlay zone), row H-1 status line. Overlays cover content rows
only; chrome and status never reflow; content buffer is unchanged under
the overlay and restored exactly on dismiss.

Happy path (act on a link): user presses `Space` (act on focused) or `:`
(palette-first) or clicks a chip; drawer lists settled refs in DOM order;
`eN` plus Enter (or click, or agent `act eN`) fires through the gen check;
drawer closes; fresh settled snapshot arrives with new gen. Entry: `Space`,
`:`, chip click, or agent snapshot. Exit: `Esc`/`Space` dismisses, `Enter`
fires and closes, `q` in drawer closes first then quits on second press.
Recovery: stale gen returns `ref_stale` with reason plus `R` remap to the
same role/name or nearest sibling, never silent.

Chip budget (single row, priority focused, links, buttons, inputs):
width up to 80 cols max 6 chips plus `+NN more`; 81-120 max 10; above 120
max 14. Format `eN` (1-2 cells plus 1 pad). Max ~56 cells per settled
snapshot, never per frame. Chips render once per settled gen; scroll moves
the viewport only. `+NN more` is a reverse-video underlined button opening
the drawer list, never grey disabled-look text.

Drawer (3 rows max): row 1 title plus stale flag, rows 2-3 scrollable
overflow refs. Pure overlay with 1-cell box border plus scrim (background
cells stepped one level). Same snapshot always yields the same list.
`[` `]` page inside the drawer on narrow grids.

Settled snapshots: emitted only after load event plus 300 ms quiet plus no
pending AX updates: `{gen, stable, refs: [{eN, role, name}]}`.
`stable=false` dims chips and blocks act with a `wait settled` hint. Human
and agent see identical `eN` for the same gen.

Parity: keyboard `eN` plus Enter, mouse chip click, and agent `act(eN)`
resolve through the same gen check. `:` opens the drawer for all; typed
`eN` works with the drawer open or closed. `.` toggles the numeric audit
layer (chips hidden for reading, refs still in snapshots).

Empty state: new tab shows one centered card with the primary action ring
on it (`type :open url` plus 3 starter actions), snapshot reports
`no refs (gen N stable)`, no chips, no drawer. Error state: DNS fail or
CDP disconnect replaces content with an error card (retry, open cached,
copy URL); chips hidden; prior gen marked stale; drawer offers the same 3
as buttons. Hostile input: 5k-char URL truncates in row 1 with `<` `>`
scroll and `javascript:` shows a blocked card; 10k links get viewport
chips only plus searchable `+NN` bank, no auto-expand, no focus theft;
dialog traps the ring until dismissed with `Esc` breaking to the address
bar plus a `mute dialogs` status offer; media regions take one ring stop
on the frame, inner `h`/`l` seeks.

## Visual system

Palette (text minimum AA 4.5 pass, measured):
chromeFG #E8EAF2 on chromeBG #1E222E 13.21 (body); white #FFFFFF on
activeBG #34466E 9.34 (focus row); accent #78C8FF on #1E222E 8.69 (links,
foreground only); warm #FFD178 on #1E222E 11.06 (warn); ok #7DE08B on
#1E222E 9.75; err #FF8A9B on #1E222E 7.07. Status: statusFG #E8EAF2 on
statusBG #161A24 14.48, muted #9AA0B5 on statusBG 6.68. Muted never on
activeBG (fails). No SGR dim or faint anywhere; muted states use these
real colors, low tiers use bold or reverse.

Type and chrome: 1-cell pad in brackets, single-line chrome, Title Case
nav labels, `>` marker plus full-width reverse on the focus row, focus
ring as accent underline of `=` (not bold alone). Keypress form is key in
brackets plus verb outside (`[K] search`, `[^F] find`, `[q] back`); `(N)`
reserved for count metadata so title parens like `Terminal (computing)`
never collide with hint keys.

Rect placement (binding): rects only on static chrome (top bar lines 1-2
and status plus command lines 23-24) using `+ - |` ASCII only. Content
rows 3-22 are borderless, separated by one blank or `:` line, so scroll
never repaints boxes.

Chrome sketch (80 cols, ASCII only):

```
+------------------------------------------------------------------------------+
| harbor  [K] search [q] back                    page 1/3  [ACT]               |
| links: docs | pricing | about                                                |
> pricing plans white on blue focus row                                        <
| docs overview                                                                |
| about team                                                                   |
+------------------------------------------------------------------------------+
| ok: loaded 142ms : [^F] find                                                 |
```

Asset list: no image assets ship; all chrome is cell-drawn. Hub page
shares the tokens (bg #0C0E14, panel #161A26, ink #ECECF1, accent #78C8FF,
warm #FFD178) and must link this document.

Collapse maps (binding): accent #78C8FF to 256:#117 to 16:bright-cyan
foreground to ASCII:plain plus brackets (never as background in 16-color
or ASCII). activeBG #34466E to 256:#237 background to 16:blue background
plus white bold to ASCII:`>` markers plus reverse where available.
warm/ok/err to 16:yellow/green/red foreground to ASCII:`!`, `ok:`, `ERR:`
prefixes. Chip style per tier: truecolor/256 dark key cell on accent fill;
16-color `[K]` bright-cyan foreground no fill; ASCII `[K]` plain. Chrome
budget: 5 lines, content 19 lines at 80x24.

## Motion spec

Base: sync envelope (`CSI ? 2026 h` to `l`) where probed else cursor-hide
during paint; dirty rectangles (dirty-rows-only on block); adaptive
governor 10-30 fps; Kitty regions animate in place, Sixel/iTerm2 swap
stills only, block always live; tmux/screen forces block; input queue has
priority over motion.

Tick table (all `steps(n)`, no interpolation in Snap path):

| Tick | Duration | Use | Cap |
| ---- | -------- | --- | --- |
| T1 | 33 ms | cursor j/k, focus ring, live filter | 20 cells/tick, dirty rows only |
| T2 | 50 ms | drawer open/close, pane swap, toast in/out | 20 cells/tick, max 3 steps |
| T3 | 100 ms | spinner, fetch progress, stale refetch | 20 cells/tick, spinner max 6 frames |

Transition inventory: hover 1x T1 step (invert or underline, 1 dirty row);
press 60 ms snap (bold plus 1-cell inset); focus 1x T1 full-row reverse
(pinned by rule, never eye-tracked); loading T3 spinner (`[| / - \]`,
block cells only) plus `fetch NNNms` elapsed label plus 10-cell stepped
bar `[##--------]` (1 cell per T3) plus `Ctrl-C cancels` past 1000 ms, all
inside the status row; success 240 ms 3 steps (check, bold 100 ms,
settle); error 300 ms 3-step nudge (0, +2 cells, 0, no loop) plus `!` in
status, sticky until next input; empty 0 ms static dotted outline.

Viewport policy: content replace inside a stable viewport (tab switch,
filter swap) uses a zero-frame cut; viewport displacement (pgup/pgdn,
search jump, resolve reorder) uses one anchored cut: keep 1 prior anchor
row pinned with a 2-cell gutter marker plus `stale...` or `N new` tag for
1x T2 (50 ms), then settle. Never animate row-by-row scroll.

Strobe grouping: 150 ms window (3x T2); drawer open plus close plus
resolve inside one window collapses to the final state in 1x T2, no
intermediate paints; toasts queue; max 3 steps per gesture then hard
settle. Interruption: any keypress cancels in-flight motion within 1 tick
and paints the final state (or start state if under 50 percent of a
viewport slide); new hover or focus preempts, no queueing, max 1 active
micro animation per surface; loading skips a frame if the PTY queue
exceeds 4 KB; Kitty animated images pause during motion. Lantern Glide
easing is allowed only for non-textual progress fill and thumbnail
crossfade, never for text, cursor, or viewport.

Reduced-motion fallback (ships with every item): `--reduced-motion` flag
or `REDUCED_MOTION=1` or config `motion: reduced` forces all durations to
0 ms, zero-frame cuts, anchor as static 1-row overlap with no hold,
loading as static `... fetch NNNms` text at 1 Hz max, success/error as
static glyph plus text, focus/hover as instant invert. Motion never blocks
input and never traps focus.

## Acceptance checklist (Reviewer and Evaluator)

1. `terminal-browser/docs/design.md` plus `design-tokens.json` present and
   current; tokens match the palette, tick table, and chip budgets above.
2. Flows cover happy plus empty, error, and hostile-input states; every
   flow names entry, exit, and recovery; `ref_stale` recovery is
   demonstrable with one key.
3. Overlay chips fit one row at each width budget with no wrap and no
   reflow; drawer is overlay-only (3 rows, bordered) and restores the exact
   viewport on dismiss.
4. Contrast: body 13.21, focus 9.34, accent 8.69 or better; muted never on
   activeBG; 16-color and ASCII tiers keep focus separable (markers plus
   reverse, never color alone); no dim simulation.
5. Motion honors 33/50/100 ms ticks with dirty-rows-only caps; viewport
   displacement carries the anchor; reduced-motion path verified with all
   durations at 0 ms.
6. No facade controls, no raw-coordinate textboxes, no unclickable drop
   targets, no silent freezes; every advertised capability executes real
   logic against real pages.
7. Docs stay unified (no milestone-stamped chapters); hub links this
   document; root `docs/` untouched.

## Deliberation record

Round 1 Propose: UX produced Harbor Deck (chips plus 6-row drawer) and
Focus Trail (ring-only plus audit layer); Visual produced Deep Channel
(cool rects) and Ember Ledger (warm ledger); Motion produced Ledger Snap
(stepped) and Lantern Glide (eased). No ranking.

Round 2 Critique (round-robin, mandatory dissent): UX blocked Deep
Channel on uppercase cell cost and click-styled chips, Ember Ledger on dot
waste and paren collision, Ledger Snap on cut disorientation and frozen
spinner feel, Lantern Glide on 6x byte-cap overrun and input queueing.
Visual blocked Harbor Deck on chip overload and drawer occlusion, Focus
Trail on weak ring contrast and audit reflow, Snap on change blindness
and strobe, Glide on mid-fade contrast dip and jank. Motion blocked Harbor
Deck on chip churn (~180 cells/frame) and drawer jump plus the frozen-ref
feedback gap, Focus Trail on invisible ring in degraded tiers and filter
timing collision, Deep Channel on reflow cost and fallback failure, Ember
Ledger on leader churn and wrap latency.

Round 3 Revise (every point answered with accept plus change): UX shipped
Harbor Overlay v2 (single-row budget, 3-row bordered overlay drawer,
`{gen, stable}` envelope, `R` remap); Visual shipped Harbor tokens v2
(case rule, `[K] verb` keypress form, role-split accent versus active,
tier-bound chip styles, rects on static chrome only); Motion shipped
Signal Ledger v2 (continuity anchor, elapsed spinner plus stepped bar,
150 ms strobe grouping, Glide scoped to non-text only).

Round 4 Converge: unanimity-minus-one for the Harbor Overlay System v2
above; runner-up named with triple objection (row budget, tier collapse,
snapshot tearing); surviving ideas (`.` audit toggle, lowercase labels)
folded in.

## Dissent log (verbatim)

UX dissent: "I sign the Harbor choice but I dissent on keeping any drawer
at all. A 3-row overlay still covers the exact refs a dense page needs,
and the `.` audit layer plus inline `[K] verb` hints already teach keys
without a mode. I would ship chips plus palette only and delete the
drawer. Overruled: the council keeps the drawer as the only home for the
`+NN` bank and stale recovery line."

Visual dissent: "I sign but I dissent on the cool-gray Harbor ramp staying
default over Ember Ledger warmth. Long reading sessions glare on
`#E8EAF2` at full brightness, and Ember paper `#F6EEE3` tested calmer in
my review. Overruled: hub consistency plus sharper 80x24 scan keeps Deep
Channel lineage as default; Ember stays a documented alt ramp."

Motion dissent: "I sign but I dissent on the 50 ms anchored cut. Any held
viewport, even 50 ms, risks a second input landing mid-anchor and
painting a state the snapshot gen already passed. I would ship pure
zero-frame cuts with a static overlap row and no timer. Overruled: the
anchor fixes the double-paging the UX critique proved, and input preempt
in 1 tick bounds the risk."

- the Design Council
