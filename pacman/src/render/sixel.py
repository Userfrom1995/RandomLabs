"""Sixel path spike: DCS framing plus a real solid-rect encoder.

Sixel encodes raster graphics between DCS (ESC P ... q) and ST (ESC \\).
Full scene rasterization (Pillow quantize, dirty-region emit, 10 fps cap)
lands with the tiered renderer; this spike owns the exact framing and a
genuine encoder for solid rectangles so the byte format is frozen and
tested now. available() mirrors the Kitty rule: Pillow unlocks images,
and without it the Unicode backend carries the game.
"""

ESC = "\x1b"
DCS_OPEN = ESC + "Pq"
ST = ESC + "\\"


def dcs_wrap(payload):
    """Wrap a sixel payload in DCS ... ST framing."""
    if not isinstance(payload, str):
        raise TypeError("sixel payload must be str")
    return DCS_OPEN + payload + ST


def encode_solid(width_px, height_px, color_index=1):
    """Encode a solid rectangle in sixel (6-pixel bands, '?' + color rows).

    Real sixel data: each band row emits the color-introducer, then one
    sixel character per 1-pixel column (? = all six pixels set... here we
    use the repeat introducer '!' for runs). Returns the unwrapped payload.
    """
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
