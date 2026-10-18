# Kitty graphics reply-loop experiment (kitty 0.32.2, Linux runner)

This is the manual experiment that isolated the root cause of the
kitty-tier input failure and the frame flood seen in
`kitty-linux-auto.json`. It is recorded here because the measurement
needs `strace`, which the harness itself deliberately does not depend on.

## Setup

```sh
Xvfb :98 -screen 0 1600x1200x24 -nolisten tcp &
DISPLAY=:98 LIBGL_ALWAYS_SOFTWARE=1 kitty --title exp-kitty --config NONE \
  -o initial_window_width=100c -o initial_window_height=40c -o font_size=9 \
  -o confirm_os_window_close=0 -e script -q -f -c /tmp/exp-runner.sh /tmp/exp-pty.log &
# /tmp/exp-runner.sh execs the release binary with a private --dir
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
  in 6 s, i.e. the documented ~60 fps / 20 fps pacing. The difference is
  entirely the graphics path.

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
   parser. In the kitty run the escape-heavy keys (Esc, pause) never
   registered after gameplay began: `PAUSED`, `Resume`, and
   `Quit to title` appear zero times in the whole transcript, while the
   identical choreography on the identical kitty build forced to
   `MAZE_CHASE_TIER=truecolor` (no graphics traffic) renders `PAUSED`
   61 times and exits cleanly.

## Corroboration in the committed rows

| row | tier | paused keys | exit | transcript |
| --- | --- | --- | --- | --- |
| kitty-linux-auto | kitty-graphics | dead (0 PAUSED renders) | killed | 388 MiB / ~30 s |
| kitty-linux-truecolor | truecolor-cells | work (61 PAUSED renders) | clean | 60 MiB |
| ghostty-linux-kitty | kitty-graphics | work (204 PAUSED renders) | killed | 214 MiB |
| xterm-linux-sixel | sixel | work (25 PAUSED renders) | clean | 5 MiB |

The Ghostty kitty-graphics row shows the same bandwidth class (936
transmits, 214 MiB) even though its input survives, so the flood is a
property of the kitty graphics path itself, not of one terminal.
