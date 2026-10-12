"""Kitty graphics protocol spike: transmit-once atlas, per-frame placement.

Wire format used here (all strings, never written to stdout directly):
  transmit: ESC _ G a=T, f=100, s=<w>, v=<h>, m=(0|1), q=2 ; <base64> ESC \\
  place:    ESC _ G a=p, i=<id>, c=<cols>, r=<rows>, C=1, q=2 ESC \\

The atlas goes out once with a=T (chunked at 4096 chars with m=1 in-between);
frames only place it with a=p, so per-frame cost stays tiny. Quiet mode
(q=2) suppresses terminal responses. Image encoding itself (PNG bytes) is
the caller's job; this module only frames bytes, so it is fully testable
without Pillow or a terminal.
"""

import base64

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


def place_image(image_id, cell_col, cell_row, cell_cols=2, cell_rows=2):
    """Placement command: draw the transmitted image over a cell rectangle."""
    head = APC_START + _params(a="p", i=image_id, C=1,
                               c=cell_cols, r=cell_rows,
                               X=cell_col, Y=cell_row, q=2)
    return head + APC_END


def delete_image(image_id):
    head = APC_START + _params(a="d", d="i", i=image_id, q=2)
    return head + APC_END


class KittyBackend:
    """Protocol-spike backend: atlas transmit once, placements per frame.

    Full sprite compositing lands with the tiered renderer; this spike owns
    the exact wire format (byte-captured in tests) so the later phase can
    build on frozen sequences.
    """

    name = "kitty"

    def __init__(self):
        self._atlas_sent = {}

    def available(self):
        try:
            import PIL  # noqa: F401  (atlas rasterization needs Pillow)
            return True
        except ImportError:
            return False

    def transmit_atlas(self, png_bytes, image_id, width_px, height_px):
        seq = transmit_image(png_bytes, image_id, width_px, height_px)
        self._atlas_sent[image_id] = (width_px, height_px)
        return seq

    def place(self, image_id, cell_col, cell_row, cell_cols=2, cell_rows=2):
        if image_id not in self._atlas_sent:
            raise ValueError("atlas image %r was never transmitted" % (image_id,))
        return place_image(image_id, cell_col, cell_row, cell_cols, cell_rows)
