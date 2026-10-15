"""Kitty graphics protocol backend: transmit-once atlas, per-frame placement.

Wire format (all strings, never written to stdout directly):
  transmit: ESC _ G a=T, f=100, s=<w>, v=<h>, i=<id>, m=(0|1), q=2 ; <base64> ESC \\
  place:    ESC _ G a=p, i=<id>, c=<cols>, r=<rows>, C=1, q=2 ESC \\ (at cursor)
  erase:    ESC _ G a=d, d=c, q=2 ESC \\ (deletes placements at the cursor)
  delete:   ESC _ G a=d, d=i, i=<id>, q=2 ESC \\

The atlas goes out once with a=T (chunked at 4096 chars with m=1 in-between);
frames only move the cursor (CUP) and place with a=p, so per-frame cost stays
tiny. Quiet mode (q=2) suppresses terminal responses. Cells without a sprite
are drawn as cursor-addressed truecolor text, so the layout matches the
Unicode backend cell for cell.

Two correctness rules dominate this backend:

1. Text written over a placement does NOT remove the image: every cell whose
   old content carried a sprite must be erased (a=d,d=c at the cursor)
   before the new content goes down, or every moving sprite leaves a
   permanent imprint of its old cells (the trail bug).
2. Every sprite cell is ALSO drawn as its text glyph underneath the image,
   so actors stay visible on terminals that accept the escape stream but
   cannot render images; where images work they cover the glyph exactly.

Image encoding (PNG bytes) comes from atlas.py; this module only frames
bytes, so it stays fully headless-testable.
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


def place_image(image_id, *ignored, cell_cols=1, cell_rows=1):
    """Placement command anchored at the cursor (caller emits CUP first).

    Any extra positional args are legacy cell coordinates, accepted and
    ignored for backward compatibility; only cell_cols/cell_rows are sent.
    """
    head = APC_START + _params(a="p", i=image_id, c=cell_cols, r=cell_rows,
                               C=1, q=2)
    return head + APC_END


def delete_image(image_id):
    head = APC_START + _params(a="d", d="i", i=image_id, q=2)
    return head + APC_END


def delete_at_cursor():
    """Erase placements intersecting the cursor cell, keeping image data.

    Lowercase d=c deletes the placements but retains the transmitted image,
    so the next place needs no retransmit.
    """
    head = APC_START + _params(a="d", d="c", q=2)
    return head + APC_END


def delete_all_visible():
    """Erase every visible placement (keeps transmitted image data)."""
    head = APC_START + _params(a="d", q=2)
    return head + APC_END


class KittyBackend(RenderBackend):
    """Tiered image backend: atlas transmit once, placements per frame."""

    name = "kitty"

    def __init__(self):
        self.cols = 0
        self.rows = 0
        self.ox = 0
        self.oy = 0
        self._last = None
        self._atlas_sent = {}

    def set_origin(self, ox, oy):
        """Shift every cursor address by (ox, oy) for terminal centering."""
        self.ox = max(0, int(ox))
        self.oy = max(0, int(oy))

    def _cup(self, x, y):
        return ansi.cup(y + 1 + self.oy, x + 1 + self.ox)

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
        return (self._cup(cell_col, cell_row)
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
            have = self._last.cells[i]
            if want == have:
                continue
            x, y = i % self.cols, i // self.cols
            out.append(self._cup(x, y))
            if have.sprite is not None and have.sprite != want.sprite:
                # Stale placement erase: without this the old image stays
                # glued to this cell after the sprite moves on (trails).
                out.append(delete_at_cursor())
            # Text underlay first: visible fallback where images cannot
            # render, covered by the placement where they can.
            out.append(ansi.fg_true(*want.fg))
            out.append(ansi.bg_true(*want.bg))
            out.append(want.glyph)
            if want.sprite is not None:
                iid = self._ensure_sprite(out, want.sprite)
                out.append(self._cup(x, y))
                out.append(place_image(iid))
            self._last.cells[i] = want
        out.append(ansi.reset() + ansi.SYNC_END)
        fb.clear_dirty()
        return "".join(out)

    def clear(self):
        if self._last is not None:
            self._last = FrameBuffer(self.cols, self.rows)
        # Wipe placements first: CLEAR alone leaves old images floating
        # over the cleared text.
        return delete_all_visible() + ansi.CLEAR + ansi.cup(1, 1)

    def shutdown(self):
        out = [delete_image(iid) for iid in sorted(self._atlas_sent)]
        self._atlas_sent = {}
        out.append(ansi.reset() + ansi.SHOW_CURSOR + ansi.ALT_EXIT)
        return "".join(out)
