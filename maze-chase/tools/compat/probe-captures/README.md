# Graphics-probe captures

These are the raw terminal replies recorded by
`tools/compat/probe-graphics.py`, the live experiment cited in
`docs/terminal.md` and `docs/terminal-compat.md`.

Each capture was produced inside the real emulator on the Linux runner
(the same Xvfb setup the compatibility harness uses):

```sh
xvfb-run -a -s "-screen 0 1280x1024x24" kitty --config NONE \
  -o confirm_os_window_close=0 \
  -e python3 tools/compat/probe-graphics.py 1.5 <out>.bin
xvfb-run -a -s "-screen 0 1280x1024x24" ghostty --gtk-single-instance=false \
  -e python3 tools/compat/probe-graphics.py 1.5 <out>.bin
```

| file | emulator | bytes | sha256 |
| --- | --- | --- | --- |
| `kitty-0.32.2.bin` | kitty 0.32.2 created by Kovid Goyal | 44 | `d8f641f10691e2dad565b20138093f35478d47be5f2579786e7dd20f6bca87da` |
| `ghostty-1.3.1.bin` | Ghostty 1.3.1 | 44 | `d8f641f10691e2dad565b20138093f35478d47be5f2579786e7dd20f6bca87da` |

Both captures contain exactly the two expected APC replies, printed here
with escapes spelled out:

```text
ESC _ G i=1296236545 ; OK ESC \
ESC _ G i=1296236545 , p=1 ; OK ESC \
```

`1296236545` is `0x4D430001`, the game's probe image id. The first reply
answers the `a=t` transmit, the second the `a=p` placement. The replies
are byte-identical across the two emulators because they answer the same
two protocol frames with the protocol's own acknowledgement form; each
file is still an independent execution inside its own emulator. The
captures are the evidence for "the terminal answers the graphics probe",
which is the question the probe exists to settle. They feed no game code
and change no state outside the emulator window.
