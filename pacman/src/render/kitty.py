"""Kitty graphics protocol backend: transmit-once atlas, per-frame placement.

Wire format (all strings, never written to stdout directly):
  transmit: ESC _ G a=T, f=100, s=<w>, v=<h>, i=<id>, m=(0|1), q=2 ; <base64> ESC \\
  place:    ESC _ G a=p, i=<id>, c=<cols>, r=<rows>, C=1, q=2 ESC \\ (at cursor)
  delete:   ESC _ G a=d, d=i, i=<id>, q=2 ESC \\

The atlas goes out once with a=T (chunked at 4096 chars with m=1 in-between);
frames only move the cursor (CUP) and place with a=p, so per-frame cost stays
tiny. Quiet mode (q=2) suppresses terminal responses. Cells without a sprite
are drawn as cursor-addressed truecolor text, so the layout matches the
Unicode backend cell for cell. Image encoding (PNG bytes) comes from atlas.py;
this module only frames bytes, so it stays fully headless-testable.
"""

import base64

from . import ansi
from . import atlas
from .framebuffer import FrameBuffer
from .protocol import RenderBackend

ESC = "\x1b"
APC_START = ESC + "_G"
APC_END = ESC + "\\"
CHUNK = 4096


def _params(**kv):
    return ",".join("%s=%s" % (k, v) for k, v in kv.items())


def transmit_cmd(png_bytes, image_id, width_px, height_px, more):
    payload = base64.b64encode(bytes(png_bytes)).decode("ascii")
    head = APC_START + _params(a="T", f=100, s=width_px, v=height_px,
                               i=image_id, m=1 if more else 0, q=2) + ";"
    return head + payload + APC_END


def transmit_image(png_bytes, image_id, width_px, height_px):
    """Full transmit sequence for one PNG, chunked for the APC limit."""
    if not png_bytes:
        raise ValueError("need non-empty PNG bytes")
    if width_px < 1 or height_px < 1:
        raise ValueError("need positive image dimensions")
    payload = base64.b64encode(bytes(png_bytes)).decode("ascii")
    chunks = [payload[i:i + CHUNK] for i in range(0, len(payload), CHUNK)] or [""]
    out = []
    for n, piece in enumerate(chunks):
        last = n == len(chunks) - 1
        head = APC_START + _params(a="T", f=100, s=width_px, v=height_px,
                                   i=image_id, m=0 if last else 1, q=2) + ";"
        out.append(head + piece + APC_END)
    return "".join(out)


def place_image(image_id, cell_col=None, cell_row=None, cell_cols=1, cell_rows=1):
    """Placement command anchored at the cursor (caller emits CUP first)."""
    head = APC_START + _params(a="p", i=image_id, c=cell_cols, r=cell_rows,
                               C=1, q=2)
    return head + APC_END


def delete_image(image_id):
    head = APC_START + _params(a="d", d="i", i=image_id, q=2)
    return head + APC_END


class KittyBackend(RenderBackend):
    """Tiered image backend: atlas transmit once, placements per frame."""

    name = "kitty"

    def __init__(self):
        self.cols = 0
        self.rows = 0
        self._last = None
        self._atlas_sent = {}

    def available(self):
        return atlas.available()

    def init(self, cols, rows):
        self.cols, self.rows = int(cols), int(rows)
        self._last = FrameBuffer(self.cols, self.rows)
        return ansi.ALT_ENTER + ansi.HIDE_CURSOR + ansi.CLEAR + ansi.cup(1, 1)

    def transmit_atlas(self, png_bytes, image_id, width_px, height_px):
        seq = transmit_image(png_bytes, image_id, width_px, height_px)
        self._atlas_sent[image_id] = (width_px, height_px)
        return seq

    def place(self, image_id, cell_col, cell_row, cell_cols=1, cell_rows=1):
        if image_id not in self._atlas_sent:
            raise ValueError("atlas image %r was never transmitted" % (image_id,))
        return (ansi.cup(cell_row + 1, cell_col + 1)
                + place_image(image_id, cell_cols=cell_cols, cell_rows=cell_rows))

    def _ensure_sprite(self, out, sprite_id):
        iid = atlas.image_id(sprite_id)
        if iid not in self._atlas_sent:
            out.append(self.transmit_atlas(atlas.png_for(sprite_id), iid,
                                           atlas.SIZE_PX, atlas.SIZE_PX))
        return iid

    def present(self, fb, dirty):
        if fb.cols != self.cols or fb.rows != self.rows:
            raise ValueError("framebuffer size does not match init")
        out = [ansi.SYNC_BEGIN]
        for i in dirty:
            want = fb.cells[i]
            if want == self._last.cells[i]:
                continue
            x, y = i % self.cols, i // self.cols
            if want.sprite is not None:
                iid = self._ensure_sprite(out, want.sprite)
                out.append(ansi.cup(y + 1, x + 1))
                out.append(place_image(iid))
            else:
                out.append(ansi.cup(y + 1, x + 1))
                out.append(ansi.fg_true(*want.fg))
                out.append(ansi.bg_true(*want.bg))
                out.append(want.glyph)
            self._last.cells[i] = want
        out.append(ansi.reset() + ansi.SYNC_END)
        fb.clear_dirty()
        return "".join(out)

    def clear(self):
        if self._last is not None:
            self._last = FrameBuffer(self.cols, self.rows)
        return ansi.CLEAR + ansi.cup(1, 1)

    def shutdown(self):
        out = [delete_image(iid) for iid in sorted(self._atlas_sent)]
        self._atlas_sent = {}
        out.append(ansi.reset() + ansi.SHOW_CURSOR + ansi.ALT_EXIT)
        return "".join(out)
