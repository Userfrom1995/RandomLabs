"""Sixel backend: dirty-region raster between DCS and ST framing.

Each presented frame rasterizes the bounding box of its dirty cells (glyph
cells drawn with Pillow's built-in font, sprite cells pasted from the atlas),
quantizes to a bounded palette, and emits genuine sixel band data with
run-length compression. A minimum frame interval (default 0.1 s, 10 fps)
coalesces faster callers: present() returns "" and counts the frame as
coalesced instead of emitting. The clock is injectable so the cap is
headless-testable; the backend never sleeps.
"""

import time

from . import ansi
from .framebuffer import FrameBuffer
from .protocol import RenderBackend

ESC = "\x1b"
DCS_OPEN = ESC + "Pq"
ST = ESC + "\\"

MAX_COLORS = 64


def dcs_wrap(payload):
    """Wrap a sixel payload in DCS ... ST framing."""
    if not isinstance(payload, str):
        raise TypeError("sixel payload must be str")
    return DCS_OPEN + payload + ST


def encode_solid(width_px, height_px, color_index=1):
    """Encode a solid rectangle in sixel (6-pixel bands with run counts)."""
    if width_px < 1 or height_px < 1:
        raise ValueError("need positive dimensions")
    if not 0 <= color_index <= 255:
        raise ValueError("color index out of range")
    bands = []
    remaining = height_px
    while remaining > 0:
        band_h = min(6, remaining)
        char = chr(63 + (1 << band_h) - 1)  # lower band_h bits set
        bands.append("#%d!%d%s" % (color_index, width_px, char))
        if remaining > 6:
            bands.append("-")  # next sixel line
        remaining -= 6
    return "".join(bands)


def frame_solid(width_px, height_px, color_index=1):
    """A complete framed sixel image of one solid rectangle."""
    return dcs_wrap(encode_solid(width_px, height_px, color_index))


def available():
    try:
        import PIL  # noqa: F401
        return True
    except ImportError:
        return False


def _need_pil():
    try:
        from PIL import Image, ImageFont  # noqa: F401
    except ImportError:
        raise RuntimeError(
            "sixel backend needs Pillow (pip install Pillow); "
            "the unicode backend plays without it")
    from PIL import Image, ImageFont
    return Image, ImageFont


def encode_indexed(pixels, width, height, palette):
    """Encode indexed pixels as sixel data with palette + RLE band runs.

    pixels is a flat row-major list of palette indices; palette is a list of
    (r, g, b) 0-255 triples. Emits color-registry entries then, per 6-row
    band, one pass per color used in that band ('$' returns the carriage
    between passes, '-' advances between bands).
    """
    out = []
    for num, (r, g, b) in enumerate(palette):
        out.append("#%d;2;%d;%d;%d" % (num, r * 100 // 255, g * 100 // 255, b * 100 // 255))
    bands = (height + 5) // 6
    for b in range(bands):
        y0 = b * 6
        used = sorted({pixels[min(y0 + k, height - 1) * width + x]
                       for x in range(width) for k in range(6)})
        for ci, color in enumerate(used):
            out.append("#%d" % color)
            run_char, run_len = None, 0

            def flush():
                if run_char is None:
                    return ""
                if run_len > 1:
                    return "!%d%s" % (run_len, run_char)
                return run_char

            for x in range(width):
                bits = 0
                for k in range(6):
                    y = y0 + k
                    if y < height and pixels[y * width + x] == color:
                        bits |= 1 << k
                char = chr(63 + bits)
                if char == run_char:
                    run_len += 1
                else:
                    out.append(flush())
                    run_char, run_len = char, 1
            out.append(flush())
            out.append("$" if ci < len(used) - 1 else ("-" if b < bands - 1 else ""))
    return "".join(out)


class SixelBackend(RenderBackend):
    """Tiered raster backend with a frame-rate cap and dirty-region emit."""

    name = "sixel"

    def __init__(self, min_interval_s=0.1, clock=None, cell_px=10):
        if min_interval_s < 0:
            raise ValueError("min interval must be >= 0")
        if cell_px < 4:
            raise ValueError("cell_px must be >= 4")
        self.min_interval = float(min_interval_s)
        self._clock = clock if clock is not None else time.monotonic
        self.cell_px = int(cell_px)
        self.cols = 0
        self.rows = 0
        self._last = None
        self._last_t = -1e9
        self.frames = 0
        self.coalesced = 0
        self.bytes_out = 0

    def available(self):
        return available()

    def init(self, cols, rows):
        self.cols, self.rows = int(cols), int(rows)
        self._last = FrameBuffer(self.cols, self.rows)
        self._last_t = -1e9
        return ansi.ALT_ENTER + ansi.HIDE_CURSOR + ansi.CLEAR + ansi.cup(1, 1)

    def _rasterize(self, fb, box):
        import io
        from . import atlas
        Image, ImageFont = _need_pil()
        from PIL import Image as _Image
        from PIL import ImageDraw
        x0, y0, x1, y1 = box
        w, h = (x1 - x0) * self.cell_px, (y1 - y0) * self.cell_px
        img = Image.new("RGB", (w, h), (0, 0, 0))
        try:
            font = ImageFont.load_default(size=max(8, self.cell_px))
        except TypeError:
            font = ImageFont.load_default()
        draw = ImageDraw.Draw(img)
        for cy in range(y0, y1):
            for cx in range(x0, x1):
                cell = fb.cells[cy * self.cols + cx]
                px, py = (cx - x0) * self.cell_px, (cy - y0) * self.cell_px
                if cell.sprite is not None:
                    sprite = atlas.png_for(cell.sprite)
                    tile = _Image.open(io.BytesIO(sprite)).convert("RGB")
                    img.paste(tile.resize((self.cell_px, self.cell_px)), (px, py))
                else:
                    draw.rectangle([px, py, px + self.cell_px - 1, py + self.cell_px - 1],
                                   fill=tuple(cell.bg))
                    draw.text((px + 1, py), cell.glyph, font=font, fill=tuple(cell.fg))
        pal = img.convert("P", palette=Image.ADAPTIVE, colors=MAX_COLORS)
        raw_palette = pal.getpalette()[:MAX_COLORS * 3]
        palette = [tuple(raw_palette[k:k + 3]) for k in range(0, len(raw_palette), 3)]
        return list(pal.tobytes()), w, h, palette

    def present(self, fb, dirty):
        if fb.cols != self.cols or fb.rows != self.rows:
            raise ValueError("framebuffer size does not match init")
        now = self._clock()
        if now - self._last_t < self.min_interval:
            self.coalesced += 1
            fb.clear_dirty()
            return ""
        self._last_t = now
        pending = [i for i in dirty if fb.cells[i] != self._last.cells[i]]
        if not pending:
            fb.clear_dirty()
            return ansi.SYNC_BEGIN + ansi.SYNC_END
        xs = [i % self.cols for i in pending]
        ys = [i // self.cols for i in pending]
        box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
        pixels, w, h, palette = self._rasterize(fb, box)
        payload = encode_indexed(pixels, w, h, palette)
        out = (ansi.SYNC_BEGIN + ansi.cup(box[1] + 1, box[0] + 1)
               + dcs_wrap(payload) + ansi.SYNC_END)
        for i in pending:
            self._last.cells[i] = fb.cells[i]
        fb.clear_dirty()
        self.frames += 1
        self.bytes_out += len(out)
        return out

    def clear(self):
        if self._last is not None:
            self._last = FrameBuffer(self.cols, self.rows)
        return ansi.CLEAR + ansi.cup(1, 1)

    def shutdown(self):
        return ansi.reset() + ansi.SHOW_CURSOR + ansi.ALT_EXIT
