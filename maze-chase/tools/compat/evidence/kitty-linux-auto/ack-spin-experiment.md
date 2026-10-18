# Kitty graphics reply-loop experiment (kitty 0.32.2, Linux runner)

This is the manual experiment that isolated the root cause of the
kitty-tier input failure and the frame flood seen in
`kitty-linux-auto.json`. It is recorded here because the measurement
needs `strace`, which the harness itself deliberately does not depend on.
The syscall rates below are this experiment's own records; the row
counters quoted in the ledger are re-derived from the committed bundle
(see "Corroboration" below).

## Setup

```sh
# SCRATCH is the experiment's scratch directory.
Xvfb :98 -screen 0 1600x1200x24 -nolisten tcp &
DISPLAY=:98 LIBGL_ALWAYS_SOFTWARE=1 kitty --title exp-kitty --config NONE \
  -o initial_window_width=100c -o initial_window_height=40c -o font_size=9 \
  -o confirm_os_window_close=0 -e script -q -f -c "$SCRATCH/exp-runner.sh" "$SCRATCH/exp-pty.log" &
# $SCRATCH/exp-runner.sh execs the release binary with a private --dir
```

The game was started (Confirm on the title screen), then observed while
playing with the kitty graphics tier active.

## Measurement 1: the loop rate

```
sudo timeout 6 strace -f -c -p <game-pid>
% time     seconds  usecs/call     calls    errors syscall
 71.59    0.099153         259       382           write
 12.35    0.017105           8      1908           brk
  6.90    0.009558           8      1146           openat
  5.04    0.006987           6      1146           close
  4.11    0.005692           4      1146           ioctl
```

- 382 `write` calls in 6 s: ~64 full-frame transmits per second (the
  frame gate is `bitmap_tick % 3 == 1`, so the loop ran ~190
  iterations/s).
- 1146 `openat`+`ioctl`+`close` in 6 s: crossterm's window-size query
  ran on every loop iteration, a direct iteration-rate probe.
- Idle title screen (no graphics frames): 121 writes / 364 size queries
  in 6 s, i.e. ~61 loop iterations/s, which through the
  `bitmap_tick % 3 == 1` gate yields the documented ~20 fps frame
  pacing. The difference is entirely the graphics path.

## Measurement 2: what is on stdin

```
sudo timeout 4 strace -f -e trace=read -s 120 -p <game-pid>
read(0, "\33_Gi=1;OK\33\\\33_Gi=1;OK\33\\\33_Gi=1;OK\33\\ ...", 1024) = 1024
```

Kitty answers every graphics transmit with `ESC _ G i=1;OK ESC \`
replies (the game never sends `q=2`, so replies are not suppressed, and
nothing in the code reads or drains them). The event loop consumes the
reply bytes as input, which:

1. wakes `event::poll` immediately on every reply, driving the loop far
   faster than the 16 ms sleep would allow (feedback loop: more
   transmits -> more replies -> faster loop); and
2. interleaves terminal replies with real keystrokes in crossterm's
   parser. That is what the original run of this experiment found: the
   escape-heavy keys (Esc, pause) never seemed to register after
   gameplay began (`PAUSED`, `Resume`, and `Quit to title` appear zero
   times in the transcript recorded then), while the identical
   choreography on the identical kitty build forced to
   `MAZE_CHASE_TIER=truecolor` (no graphics traffic) painted its pause
   surface early and exited cleanly. The regenerated committed rows
   below refine that first reading: the keys do land, but hundreds of
   megabytes behind, so the defect is delayed input behind the reply
   backlog, not dead input.

## Corroboration in the committed rows

The regenerated committed rows record the shape directly in their
surface counters (pause-marker paints, with the transcript byte of the
first paint):

| row | tier | pause paints (first byte) | exit | transcript |
| --- | --- | --- | --- | --- |
| kitty-linux-auto | kitty-graphics | 336 (298,181,872) | killed | 381.8 MiB, 1642 transmits |
| kitty-linux-truecolor | truecolor-cells | 78 (9,472,924) | clean | 16.9 MiB |
| ghostty-linux-kitty | kitty-graphics | 192 (166,859,269) | killed | 210.8 MiB, 921 transmits |
| xterm-linux-sixel | sixel | 27 (3,112,168) | clean | 5.4 MiB |

`kitty-linux-auto` paints every driven surface eventually, but far
behind its keys: the pause surface first paints at byte 298,181,872 of a
400,331,543-byte session, after the whole menu tour, and the final quit
never lands, so the process was killed. The identical choreography on
the identical kitty build forced to `MAZE_CHASE_TIER=truecolor` (no
graphics traffic) paints its pause surface at 9,472,924 bytes - early in
the session - and exits cleanly.

The Ghostty kitty-graphics row shows the same bandwidth class (921
transmits, 210.8 MiB) with the same delay: its pause surface first
paints at byte 166,859,269, help and scores only in the tail (bytes
214,328,374 and 217,821,876), and the settings screen never reaches the
wire before the kill. The flood is a property of the kitty graphics
path itself, not of one terminal.
