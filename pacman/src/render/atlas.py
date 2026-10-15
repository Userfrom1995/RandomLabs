"""Sprite atlas: deterministic raster source for the image backends.

Sprite ids are short stable strings (see SCENE_SPRITES in scene.py). This
module rasterizes each id to PNG bytes with Pillow and caches the result by
(id, size_px), so the Kitty backend transmits every sprite exactly once and
the Sixel backend reuses identical pixels. Art is original: flat-shaded
disc bodies with cut wedge mouths (player) or two-dot eyes (ghosts), drawn
with Pillow primitives at runtime. No image files ship with the repo.

Without Pillow every entry point raises a RuntimeError with an actionable
message; backends probe available() first and never reach that path.
"""

import io

SIZE_PX = 24

PLAYER_COLOR = (255, 255, 0)
FRIGHT_COLOR = (33, 33, 222)
FRIGHT_FLASH_COLOR = (255, 255, 255)
EYES_COLOR = (255, 255, 255)
GHOST_COLORS = (
    (255, 0, 0),      # chaser
    (255, 184, 255),  # ambusher
    (0, 255, 255),    # flanker
    (255, 184, 82),   # drifter
)

PLAYER_SPRITES = ("player-left", "player-right", "player-up", "player-down")
PLAYER_CLOSED_SPRITES = ("player-left-closed", "player-right-closed",
                          "player-up-closed", "player-down-closed")
# Direction strings match scene.py usage ("left"/"right"/"up"/"down").
PLAYER_SPRITE_CLOSED = {"left": "player-left-closed", "right": "player-right-closed",
                        "up": "player-up-closed", "down": "player-down-closed"}
GHOST_SPRITES = ("ghost-0", "ghost-1", "ghost-2", "ghost-3")
EXTRA_SPRITES = ("ghost-fright", "ghost-fright-flash", "ghost-eyes")
# Invariant: image_id() is index-based, so the closed sprites stay appended
# at the end; every pre-existing id keeps its value.
KNOWN_SPRITES = PLAYER_SPRITES + GHOST_SPRITES + EXTRA_SPRITES + PLAYER_CLOSED_SPRITES

_cache = {}


def available():
    try:
        import PIL  # noqa: F401
        return True
    except ImportError:
        return False


def _need_pil():
    try:
        from PIL import Image, ImageDraw  # noqa: F401
    except ImportError:
        raise RuntimeError(
            "sprite atlas needs Pillow (pip install Pillow); "
            "the unicode backend plays without it")
    from PIL import Image, ImageDraw
    return Image, ImageDraw


def _mouth_angles(sprite_id):
    # Pillow pieslice angles in degrees, 0 = east, counter-clockwise.
    # Closed mouths use half the open angle (24 degrees vs 60), same center.
    try:
        return {
            "player-right": (30, 330),
            "player-down": (300, 240),
            "player-left": (210, 150),
            "player-up": (120, 60),
            "player-right-closed": (12, 348),
            "player-down-closed": (282, 258),
            "player-left-closed": (192, 168),
            "player-up-closed": (102, 78),
        }[sprite_id]
    except KeyError:
        raise ValueError("unknown player sprite: %r" % (sprite_id,))


def _draw(sprite_id, size_px):
    Image, ImageDraw = _need_pil()
    img = Image.new("RGBA", (size_px, size_px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = max(1, size_px // 12)
    box = [pad, pad, size_px - pad - 1, size_px - pad - 1]
    if sprite_id in PLAYER_SPRITES or sprite_id in PLAYER_CLOSED_SPRITES:
        start, end = _mouth_angles(sprite_id)
        d.pieslice(box, start=start, end=end, fill=PLAYER_COLOR + (255,))
    elif sprite_id in GHOST_SPRITES or sprite_id in ("ghost-fright", "ghost-fright-flash"):
        if sprite_id == "ghost-fright":
            body = FRIGHT_COLOR
        elif sprite_id == "ghost-fright-flash":
            body = FRIGHT_FLASH_COLOR
        else:
            body = GHOST_COLORS[int(sprite_id.rsplit("-", 1)[1])]
        w, h = size_px, size_px
        d.pieslice([pad, pad, w - pad - 1, h - pad - 1], start=180, end=360,
                   fill=body + (255,))
        mid_y = h // 2
        d.rectangle([pad, mid_y, w - pad - 1, h - pad - 1], fill=body + (255,))
        # skirt notches: punch three transparent triangles along the bottom.
        step = w // 4
        for k in range(3):
            x0 = pad + step * k + step // 2
            d.polygon([(x0, h - pad - 1), (x0 + step // 2, h - pad - 1),
                       (x0 + step // 4, h - pad - 1 - step // 2)], fill=(0, 0, 0, 0))
        ex, ey, er = w // 2 - w // 6, mid_y - h // 12, max(1, w // 12)
        for cx in (ex, w - ex):
            d.ellipse([cx - er, ey - er, cx + er, ey + er], fill=(255, 255, 255, 255))
            d.ellipse([cx - er // 2, ey - er // 2, cx + er // 2, ey + er // 2],
                      fill=(33, 33, 255, 255))
    elif sprite_id == "ghost-eyes":
        w, h = size_px, size_px
        er = max(2, w // 8)
        for cx in (w // 2 - w // 6, w // 2 + w // 6):
            d.ellipse([cx - er, h // 2 - er, cx + er, h // 2 + er],
                      fill=EYES_COLOR + (255,))
            d.ellipse([cx - er // 2, h // 2 - er // 2, cx + er // 2, h // 2 + er // 2],
                      fill=(33, 33, 255, 255))
    else:
        raise ValueError("unknown sprite: %r" % (sprite_id,))
    return img


def png_for(sprite_id, size_px=SIZE_PX):
    """PNG bytes for a sprite id. Deterministic; cached by (id, size)."""
    if sprite_id not in KNOWN_SPRITES:
        raise ValueError("unknown sprite: %r" % (sprite_id,))
    if size_px < 8:
        raise ValueError("sprite size must be >= 8 px")
    key = (sprite_id, int(size_px))
    hit = _cache.get(key)
    if hit is not None:
        return hit
    img = _draw(sprite_id, int(size_px))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()
    _cache[key] = data
    return data


def image_id(sprite_id, size_px=SIZE_PX):
    """Stable numeric image id for the Kitty protocol (1-based)."""
    if sprite_id not in KNOWN_SPRITES:
        raise ValueError("unknown sprite: %r" % (sprite_id,))
    size_px = int(size_px)
    if not 0 <= size_px < 100000:
        raise ValueError("sprite size out of range: %r" % (size_px,))
    return (KNOWN_SPRITES.index(sprite_id) + 1) * 100000 + size_px


def clear_cache():
    _cache.clear()
