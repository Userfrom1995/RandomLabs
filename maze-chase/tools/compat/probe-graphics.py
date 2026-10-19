#!/usr/bin/env python3
"""Live graphics-probe experiment for one terminal emulator.

Sends the game's exact Kitty graphics probe (a 1x1 RGBA PNG transmitted
with `a=t` plus an `a=p` placement, both without `q=2` so the terminal
answers) on this process's controlling terminal, records every reply
byte for a bounded window, then deletes the placement and frees the
image. Run it inside the terminal under test, optionally overriding the
capture window (seconds) and the output path:

    xvfb-run -a kitty -e tools/compat/probe-graphics.py /tmp/kitty.bin
    xvfb-run -a ghostty -e tools/compat/probe-graphics.py /tmp/ghostty.bin
    tools/compat/probe-graphics.py [WINDOW_S] [OUT_PATH]

The captured bytes are raw APC replies: a graphics-capable terminal
answers `\\x1b_Gi=..;OK\\x1b\\` for the transmit and
`\\x1b_Gi=..,p=..;OK\\x1b\\` for the placement. This is the experiment
that distinguishes "answers the probe" from "answers neither" evidence;
it feeds no game code and changes no state outside the terminal.

Exit status: 0 when the window closed normally (capture may still be
short), 2 when stdin is not a terminal, 3 on a bad window argument.
"""

import base64
import os
import select
import struct
import sys
import termios
import time
import tty
import zlib

PNG_SIG = b"\x89PNG\r\n\x1a\n"
# The live probe's image id (`kitty::PROBE_IMAGE_ID`).
PROBE_IMAGE_ID = 0x4D430001
DEFAULT_WINDOW_S = 1.5


def chunk(kind, payload):
    return (
        len(payload).to_bytes(4, "big")
        + kind
        + payload
        + (zlib.crc32(kind + payload) & 0xFFFFFFFF).to_bytes(4, "big")
    )


def probe_png():
    """The game's probe image: 1x1 fully transparent RGBA."""
    return (
        PNG_SIG
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00\x00"))
        + chunk(b"IEND", b"")
    )


def frame(body):
    return b"\x1b_G" + body + b"\x1b\\"


def main():
    args = sys.argv[1:]
    window = DEFAULT_WINDOW_S
    out_path = "/tmp/graphics-probe.bin"
    if args and args[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if args:
        try:
            window = float(args[0])
        except ValueError:
            out_path = args[0]
        else:
            if len(args) > 1:
                out_path = args[1]
    if not window > 0:
        print(f"probe-graphics: bad window seconds: {window}", file=sys.stderr)
        return 3
    if not os.isatty(0):
        print("probe-graphics: stdin is not a terminal", file=sys.stderr)
        return 2

    png = probe_png()
    request = (
        frame(b"i=%d,a=t,f=100,m=0;" % PROBE_IMAGE_ID + base64.b64encode(png))
        + b"\x1b[1;1H"
        + frame(b"a=p,i=%d,p=1,C=1" % PROBE_IMAGE_ID)
    )
    cleanup = frame(b"a=d,d=i,i=%d,p=1" % PROBE_IMAGE_ID) + frame(
        b"a=d,d=I,i=%d" % PROBE_IMAGE_ID
    )

    saved = termios.tcgetattr(0)
    tty.setraw(0)
    try:
        os.write(1, request)
        deadline = time.time() + window
        captured = b""
        while time.time() < deadline:
            ready, _, _ = select.select([0], [], [], 0.1)
            if not ready:
                continue
            data = os.read(0, 4096)
            if not data:
                break
            captured += data
        os.write(1, cleanup)
    finally:
        termios.tcsetattr(0, termios.TCSADRAIN, saved)

    with open(out_path, "wb") as fh:
        fh.write(captured)
    print(f"probe-graphics: captured {len(captured)} bytes to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
