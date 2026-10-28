#!/usr/bin/env python3
"""Assemble one compatibility evidence file from a harness run directory.

The real-terminal driver (`drive.sh`) records a session under a run
directory:

    run-dir/session/meta.json      run metadata (emulator, geometry, exit)
    run-dir/session/events.log     TSV event stream with transcript offsets
    run-dir/session/pty.log        raw escape transcript of the game
    run-dir/session/screenshots/   one PNG per checkpoint
    run-dir/session/trace.jsonl    MAZE_CHASE_TRACE output: the render
                                   pipeline's per-frame trace, exported
                                   by run-linux.sh / run-macos.sh and
                                   ingested below (absent only when the
                                   binary died before writing it)

`collect.py` parses the transcript deterministically (frame segmentation,
Kitty/Sixel protocol statistics, per-phase layout addressing, the tier
name the title screen paints) and writes:

    <evidence-dir>/<row>.json          machine evidence, hashed artifacts
    <evidence-dir>/<row>/screenshots/  copies of the checkpoint captures

Evidence rules (binding, see README.md): every number in the output is
either measured from the transcript/screenshots or copied from the run
metadata; a run that could not execute is recorded as `unverified` with
its reason and never guessed. Every bundle also carries the run's build
identity (`build.commit`, `build.binary_sha256`) copied from the run
metadata, so a row names the source commit and the exact release binary
that produced it; metadata without identity records `build.recorded:
false` with the reason. The `pause_select` field records how many menu
items the paused capture moved the cursor (`0` for the plain checkpoint),
so a same-emulator row's pause image is provably an independent render.
No em dashes anywhere (project rule).

Usage:

    collect.py --run-dir RUN --emulator kitty --os linux --tier auto \
        --result pass --evidence-dir tools/compat/evidence \
        [--scope native] [--notes "one line"]
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import sys
from datetime import datetime, timezone

SCHEMA = "maze-chase-compat-evidence/1"

TIER_NAMES = ("kitty-graphics", "sixel", "truecolor-cells", "legacy-cells")

CSI_RE = re.compile(rb"\x1b\[[0-9;?]*[A-Za-z]")
OSC_RE = re.compile(rb"\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)")
# Kitty graphics: ESC _ G <params> ; <payload> ESC \
KITTY_RE = re.compile(rb"\x1b_G([^;\x1b]*);?([^\x1b]*)\x1b\\", re.S)
# APC in general (kitty graphics uses APC); sixel is DCS: ESC P ... ESC \
SIXEL_RE = re.compile(rb"\x1bP([^\x1b]*)\x1b\\", re.S)
# Cursor-position writes emitted by the game: ESC [ <row> ; <col> H
POS_RE = re.compile(rb"\x1b\[(\d+);(\d+)H")


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def strip_ansi(data):
    data = OSC_RE.sub(b"", data)
    data = CSI_RE.sub(b"", data)
    data = re.sub(rb"\x1b[()][0-9A-B]", b"", data)
    return data


def parse_events(path):
    events = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 4:
                continue
            try:
                ts = int(parts[0])
            except ValueError:
                continue
            events.append(
                {
                    "at_ms": ts,
                    "type": parts[1],
                    "detail": parts[2],
                    "transcript_bytes": int(parts[3] or 0),
                    "screenshot": parts[4] if len(parts) > 4 and parts[4] else None,
                }
            )
    return events


def segment_phases(transcript, events):
    """Split the transcript into per-checkpoint segments using the byte
    offsets `drive.sh` recorded at each event. Phase boundaries are the
    transcript size at the moment the event was logged (the typescript is
    flushed with `script -f`, so the offset lands within a few ms)."""
    checkpoints = [e for e in events if e["type"] == "checkpoint"]
    phases = []
    prev = 0
    for cp in checkpoints:
        end = min(max(cp["transcript_bytes"], prev), len(transcript))
        phases.append(
            {
                "name": cp["detail"],
                "start_byte": prev,
                "end_byte": end,
                "bytes": max(0, end - prev),
                "screenshot": cp["screenshot"],
                "at_ms": cp["at_ms"],
            }
        )
        prev = end
    if prev < len(transcript):
        phases.append(
            {
                "name": "tail",
                "start_byte": prev,
                "end_byte": len(transcript),
                "bytes": len(transcript) - prev,
                "screenshot": None,
                "at_ms": events[-1]["at_ms"] if events else None,
            }
        )
    return phases


def kitty_params(text):
    out = {}
    for part in text.split(","):
        if "=" in part:
            key, value = part.split("=", 1)
            out[key] = value
    return out


def kitty_stats(data):
    """Count kitty graphics commands and the FULL payload of every
    transmit. A transmit larger than 4096 base64 bytes arrives as
    continuation chunks (`m=1`, no `a` parameter), so accumulation
    continues until a chunk without `m=1` (or a new command) closes it.
    Counting only the first chunk would report 4096 bytes per transmit,
    which is not the bandwidth the terminal received."""
    transmits = 0
    deletes = 0
    placements = 0
    queries = 0
    payload_bytes = 0
    first_chunks_bytes = 0
    payload_chunks = 0
    chunked = False
    open_transmit = False
    png_dims = None
    for match in KITTY_RE.finditer(data):
        params = kitty_params(match.group(1).decode("ascii", "replace"))
        payload = match.group(2)
        action = params.get("a")
        more = params.get("m") == "1"
        if action is not None:
            if open_transmit:
                # An unterminated chunked transmit followed by a new
                # command: the stream is malformed but the bytes were
                # still sent, so they stay counted.
                chunked = True
            if action in ("T", "t"):
                # `a=T` displays immediately; `a=t` is the quiet
                # transmit the atlas/static placement pipeline uses.
                transmits += 1
                first_chunks_bytes += len(payload)
                payload_bytes += len(payload)
                payload_chunks += 1
                if png_dims is None:
                    try:
                        raw = base64_decode(payload)
                        if len(raw) >= 24 and raw[:8] == b"\x89PNG\r\n\x1a\n":
                            png_dims = {
                                "w": int.from_bytes(raw[16:20], "big"),
                                "h": int.from_bytes(raw[20:24], "big"),
                            }
                    except ValueError:
                        pass
                open_transmit = more
            elif action == "p":
                placements += 1
                open_transmit = False
            elif action == "d":
                deletes += 1
                open_transmit = False
            elif action == "q":
                queries += 1
                open_transmit = False
        elif open_transmit:
            # Continuation chunk of the transmit started above.
            chunked = True
            payload_bytes += len(payload)
            payload_chunks += 1
            open_transmit = more
    return {
        "transmits": transmits,
        "placements": placements,
        "deletes": deletes,
        "queries": queries,
        "chunked": chunked,
        "payload_bytes": payload_bytes,
        "first_chunks_bytes": first_chunks_bytes,
        "payload_chunks": payload_chunks,
        "first_transmit_png": png_dims,
    }


def base64_decode(text):
    import base64

    return base64.b64decode(text + b"=" * (-len(text) % 4), validate=False)


def sixel_stats(data):
    count = 0
    payload = 0
    for match in SIXEL_RE.finditer(data):
        count += 1
        payload += len(match.group(1))
    return {"transmits": count, "payload_bytes": payload}


def frame_spans(data):
    """Byte spans of synchronized-output frames (the game wraps every
    frame in ESC[?2026h ... ESC[?2026l)."""
    spans = []
    marker_h = b"\x1b[?2026h"
    marker_l = b"\x1b[?2026l"
    pos = 0
    while True:
        start = data.find(marker_h, pos)
        if start < 0:
            break
        end = data.find(marker_l, start)
        if end < 0:
            break
        end += len(marker_l)
        spans.append((start, end))
        pos = end
    return spans


def frame_stats(data, spans=None, start=0, end=None):
    """Frame stats for spans starting inside [start, end). A frame that
    straddles a checkpoint boundary is attributed to the phase where it
    starts, so per-phase counts sum to the transcript-wide total."""
    if spans is None:
        spans = frame_spans(data)
    if end is None:
        end = len(data)
    frames = [data[begin:close] for begin, close in spans if start <= begin < end]
    sizes = sorted(len(f) for f in frames)
    stats = {
        "count": len(frames),
        "bytes_mean": int(sum(sizes) / len(sizes)) if sizes else 0,
        "bytes_max": sizes[-1] if sizes else 0,
    }
    return stats


SURFACE_MARKERS = (
    ("playing_hud", b"VIDEO  "),
    ("paused", b"PAUSED"),
    ("pause_resume", b"Resume"),
    ("pause_quit", b"Quit to title"),
    ("help", b"HOW TO PLAY"),
    ("scores", b"HIGH SCORES"),
    ("settings", b"SETTINGS"),
    ("title_video_line", b"video tier:"),
)


def surface_stats(data, base_offset=0):
    """Count the game's own surface markers in one chunk. The game diffs
    text cells, so a marker is emitted when its surface is (re)painted:
    a count of 1 proves the surface actually reached the wire in this
    phase, 0 proves it did not, and later repaints of the same surface
    (it changed) add more. Animation is counted separately through the
    synchronized-output frame wrapper. Committing the counts keeps every
    quoted per-surface render claim re-derivable without the raw
    transcript."""
    counts = {}
    for name, marker in SURFACE_MARKERS:
        first = data.find(marker)
        if first >= 0:
            counts[name] = {
                "paints": data.count(marker),
                "first_byte": base_offset + first,
            }
    return counts


def layout_stats(data):
    """Measure which terminal columns the game addresses. The game paints
    every chrome/board line with an absolute cursor move (ESC[<row>;<col>H),
    so the range of target rows/columns is the addressed span and the move
    count is the number of addressed lines. Text-run widths are not
    measured: this reads cursor moves only."""
    cols = []
    rows = []
    for match in POS_RE.finditer(data):
        rows.append(int(match.group(1)) - 1)
        cols.append(int(match.group(2)) - 1)
    if not cols:
        return None
    return {
        "addressed_cols_min": min(cols),
        "addressed_cols_max": max(cols),
        "addressed_rows_min": min(rows),
        "addressed_rows_max": max(rows),
        "moves": len(cols),
    }


PNG_SIG = b"\x89PNG\r\n\x1a\n"
PNG_CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


def decode_png(path):
    """Decode a non-interlaced PNG far enough to inspect its pixels.
    Returns None for anything the harness never captures (interlaced,
    16-bit channels, corrupt)."""
    import struct
    import zlib

    with open(path, "rb") as fh:
        data = fh.read()
    if data[:8] != PNG_SIG:
        return None
    pos = 8
    idat = []
    width = height = bit_depth = color_type = None
    interlace = 0
    palette = None
    saw_end = False
    while pos + 8 <= len(data):
        length = int.from_bytes(data[pos:pos + 4], "big")
        kind = data[pos + 4:pos + 8]
        if pos + 12 + length > len(data):
            return None
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            if len(chunk) != 13:
                return None
            (width, height, bit_depth, color_type, comp, filt,
             interlace) = struct.unpack(">IIBBBBB", chunk)
            if comp or filt:
                return None
        elif kind == b"PLTE":
            palette = chunk
        elif kind == b"IDAT":
            idat.append(chunk)
        elif kind == b"IEND":
            saw_end = True
            break
    if not width or not height or interlace or not saw_end:
        return None
    channels = PNG_CHANNELS.get(color_type)
    if channels is None or bit_depth not in (1, 2, 4, 8):
        return None
    bpp = max(1, (channels * bit_depth) // 8)
    stride = (width * channels * bit_depth + 7) // 8
    try:
        raw = zlib.decompress(b"".join(idat))
    except zlib.error:
        return None
    if len(raw) < height * (stride + 1):
        return None
    rows = bytearray()
    prev = bytearray(stride)
    p = 0
    for _ in range(height):
        ftype = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if ftype == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 0xFF
        elif ftype == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ftype == 3:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                p_ = a + b - c
                pa, pb, pc = abs(p_ - a), abs(p_ - b), abs(p_ - c)
                pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pred) & 0xFF
        elif ftype != 0:
            return None
        rows += line
        prev = line
    return {
        "width": width, "height": height, "bit_depth": bit_depth,
        "color_type": color_type, "palette": palette, "rows": bytes(rows),
        "stride": stride,
    }


def white_share(decoded):
    """Fraction of pixels that are pure white (255,255,255); 0.0 when the
    pixel format cannot be classified. Palette lookups honor the PNG
    palette; grayscale treats all-ones as white. RGBA and gray+alpha
    (the shapes .NET screen capture and `screencapture` emit) classify
    by their color channels only: GDI screen capture may leave alpha at
    zero, and the light-background gate must err toward flagging a
    white screenshot, never toward signing one silently."""
    width = decoded["width"]
    height = decoded["height"]
    color = decoded["color_type"]
    bit = decoded["bit_depth"]
    rows = decoded["rows"]
    stride = decoded["stride"]
    total = width * height
    if total == 0:
        return 0.0
    white = 0
    if color == 3 and decoded["palette"]:
        palette = decoded["palette"]
        entries = [tuple(palette[i:i + 3]) for i in range(0, len(palette), 3)]
        per_byte = max(1, 8 // bit)
        mask = (1 << bit) - 1
        for y in range(height):
            row = rows[y * stride:(y + 1) * stride]
            for x in range(width):
                byte = row[(x * bit) // 8]
                idx = (byte >> (8 - bit - (x * bit) % 8)) & mask
                if idx < len(entries) and entries[idx] == (255, 255, 255):
                    white += 1
        return white / total
    if color == 0:
        if bit == 8:
            white = sum(1 for i in range(total) if rows[i] == 0xFF)
        elif bit in (1, 2, 4):
            # Packed grayscale: samples are MSB-first. All-ones is white
            # at every depth, and returning 0.0 here would let a blank
            # 2- or 4-bit capture bypass the light-background gate.
            per_byte = 8 // bit
            mask = (1 << bit) - 1
            for y in range(height):
                row = rows[y * stride:(y + 1) * stride]
                for x in range(width):
                    byte = row[x // per_byte]
                    if ((byte >> (8 - bit - (x % per_byte) * bit)) & mask) == mask:
                        white += 1
        else:
            return 0.0
        return white / total
    if color == 2 and bit == 8:
        for i in range(0, total * 3, 3):
            if rows[i] == 0xFF and rows[i + 1] == 0xFF and rows[i + 2] == 0xFF:
                white += 1
        return white / total
    if color == 6 and bit == 8:
        for i in range(0, total * 4, 4):
            if rows[i] == 0xFF and rows[i + 1] == 0xFF and rows[i + 2] == 0xFF:
                white += 1
        return white / total
    if color == 4 and bit == 8:
        for i in range(0, total * 2, 2):
            if rows[i] == 0xFF:
                white += 1
        return white / total
    if color == 4 and bit in (1, 2, 4):
        # Packed gray+alpha: each pixel is a gray sample followed by an
        # alpha sample, both `bit` bits wide. Classify by gray only, as
        # the 8-bit path does.
        mask = (1 << bit) - 1
        for y in range(height):
            row = rows[y * stride:(y + 1) * stride]
            for x in range(width):
                bitpos = x * 2 * bit
                byte = row[bitpos // 8]
                if ((byte >> (8 - bit - (bitpos % 8))) & mask) == mask:
                    white += 1
        return white / total
    return 0.0


# Sprite palette of the default Dusk Pond theme
# (maze_chase_assets::themes::DUSK_POND): the body colors of Rill,
# sunseeds, and the four hunters. A kitty-graphics `pass` needs at least
# one of these pixels visible in a playing capture: a valid screenshot of
# the static board layer alone can decode while every sprite placement
# sits hidden behind the opaque board (the equal-z Ghostty collapse), so
# dimensions and white-share checks alone cannot prove sprite
# visibility. Exact RGB matches only, never a sampled estimate; eyes and
# fright masks are excluded because they are white/near-white and would
# collide with the light-background check.
SPRITE_COLORS = (
    ("rill", (0x7E, 0xD9, 0x57)),
    ("sunseed", (0xF2, 0xC1, 0x4E)),
    ("bram", (0x5F, 0x87, 0xB8)),
    ("kessa", (0x3E, 0x9B, 0x6E)),
    ("jory", (0xF2, 0x5E, 0x4A)),
    ("nib", (0xBE, 0x8B, 0x2A)),
)


def dominant_share(decoded):
    """Fraction of pixels sharing the single most common RGB color.
    A bitmap-tier capture with no board decodes as one flat color (the
    `resized-wide` blank sixel checkpoint was 99.9% background), so the
    collector uses this alongside `white_share` to reject a blank board
    signed as a pass. Alpha is ignored for the same reason as in
    `white_share`; a decodable format this function cannot classify
    reports 1.0 (fail closed), so an unchecked capture is downgraded
    instead of silently passing."""
    width = decoded["width"]
    height = decoded["height"]
    color = decoded["color_type"]
    bit = decoded["bit_depth"]
    rows = decoded["rows"]
    stride = decoded["stride"]
    total = width * height
    if total == 0:
        return 0.0
    counts = {}
    if color == 3 and decoded["palette"]:
        palette = decoded["palette"]
        entries = [
            None if i + 2 >= len(palette) else tuple(palette[i:i + 3])
            for i in range(0, len(palette), 3)
        ]
        mask = (1 << bit) - 1
        for y in range(height):
            row = rows[y * stride:(y + 1) * stride]
            for x in range(width):
                byte = row[(x * bit) // 8]
                idx = (byte >> (8 - bit - (x * bit) % 8)) & mask
                key = entries[idx] if idx < len(entries) else None
                counts[key] = counts.get(key, 0) + 1
    elif color == 0:
        # Grayscale at every decoded depth (1/2/4/8); the sample value
        # is scaled to 8-bit by the consumer, but the dominant share is
        # unchanged by that scaling.
        per_byte = max(1, 8 // bit)
        mask = (1 << bit) - 1
        for y in range(height):
            row = rows[y * stride:(y + 1) * stride]
            for x in range(width):
                byte = row[x // per_byte]
                value = (byte >> (8 - bit - (x * bit) % 8)) & mask
                key = (value, value, value)
                counts[key] = counts.get(key, 0) + 1
    elif color == 4:
        # Gray plus alpha: classify by the gray sample only, matching
        # `white_share` (screen capture can leave alpha at zero).
        mask = (1 << bit) - 1
        for y in range(height):
            row = rows[y * stride:(y + 1) * stride]
            for x in range(width):
                bitpos = x * 2 * bit
                byte = row[bitpos // 8]
                value = (byte >> (8 - bit - (bitpos % 8))) & mask
                key = (value, value, value)
                counts[key] = counts.get(key, 0) + 1
    elif color == 2 and bit == 8:
        for i in range(0, total * 3, 3):
            key = (rows[i], rows[i + 1], rows[i + 2])
            counts[key] = counts.get(key, 0) + 1
    elif color == 6 and bit == 8:
        for i in range(0, total * 4, 4):
            key = (rows[i], rows[i + 1], rows[i + 2])
            counts[key] = counts.get(key, 0) + 1
    else:
        # A decodable shape this function cannot classify is not
        # evidence of a rendered board: report a single dominant color
        # so the blank-board gate downgrades instead of silently
        # passing an unchecked capture.
        return 1.0
    return max(counts.values()) / total if counts else 0.0


def sprite_census(decoded):
    """Count exact sprite-palette pixels in one decoded capture, per
    color and in total. Non-RGB formats the harness never emits
    (grayscale and friends) count zero, 16-bit captures never reach
    this function (the PNG reader refuses them), and palette PNGs
    resolve indices through their own PLTE chunk before matching.
    Alpha is deliberately ignored (screen capture can leave it zero,
    same as `white_share`, and the game never paints a transparent
    pixel whose RGB equals a sprite color). The palette is the default
    Dusk Pond theme; the harness always drives a fresh default-theme
    config, and a pass on another theme would downgrade loudly instead
    of passing quietly."""
    counts = {name: 0 for name, _ in SPRITE_COLORS}
    lookup = {rgb: name for name, rgb in SPRITE_COLORS}
    width = decoded["width"]
    height = decoded["height"]
    color = decoded["color_type"]
    bit = decoded["bit_depth"]
    rows = decoded["rows"]
    stride = decoded["stride"]
    total = width * height
    if color == 3 and decoded["palette"]:
        palette = decoded["palette"]
        entries = [tuple(palette[i:i + 3]) for i in range(0, len(palette), 3)]
        index_names = [lookup.get(entry) for entry in entries]
        mask = (1 << bit) - 1
        for y in range(height):
            row = rows[y * stride:(y + 1) * stride]
            for x in range(width):
                byte = row[(x * bit) // 8]
                idx = (byte >> (8 - bit - (x * bit) % 8)) & mask
                if idx < len(index_names) and index_names[idx]:
                    counts[index_names[idx]] += 1
    elif color == 2 and bit == 8:
        for i in range(0, total * 3, 3):
            name = lookup.get((rows[i], rows[i + 1], rows[i + 2]))
            if name:
                counts[name] += 1
    elif color == 6 and bit == 8:
        for i in range(0, total * 4, 4):
            name = lookup.get((rows[i], rows[i + 1], rows[i + 2]))
            if name:
                counts[name] += 1
    return {"pixels": sum(counts.values()), "by_color": counts}


def screenshot_facts(path):
    """Signature-checked capture facts: dimensions, the white-pixel
    share (a light-background capture), and the sprite-palette census
    of the pixels. Returns None when the file is not a decodable PNG:
    the caller rejects such captures instead of copying corrupt bytes
    into the evidence bundle."""
    try:
        decoded = decode_png(path)
    except OSError:
        return None
    if decoded is None:
        return None
    share = white_share(decoded)
    dominant = dominant_share(decoded)
    # Truncate the dominant share downward to four decimals: the recorded
    # value never overstates the share, so rounding cannot move a true
    # 0.89996 up across the 0.90 floors (the paused menu band and the
    # blank-board bound), which would fail open on the paused gate.
    recorded_dominant = int(dominant * 10000 + 1e-6) / 10000.0
    return {
        "width": decoded["width"],
        "height": decoded["height"],
        "white_share": round(share, 4),
        "light_background": share >= 0.98,
        "dominant_share": recorded_dominant,
        "sprite_census": sprite_census(decoded),
    }


# The game's own video line: `VIDEO  <tier>` on the side panel
# (chrome.rs) or `video tier: <tier>` on the title screen. The watchdog
# trail ("degraded: A -> B") also names tiers, so the scan is anchored to
# these lines and takes the LAST match (the tier in use when the session
# ended), never a substring scan over the whole transcript.
VIDEO_LINE_RE = re.compile(rb"(?:video tier:|\bVIDEO\s+)\s*([a-z][a-z-]+)")


def observed_tier(transcript):
    text = strip_ansi(transcript)
    for raw_name in reversed(VIDEO_LINE_RE.findall(text)):
        name = raw_name.decode("ascii", "replace")
        if name in TIER_NAMES:
            return name
    return None


def bool_from_env_flag(value):
    return str(value).strip().lower() in ("1", "true", "yes")


def collect_notes(args, meta):
    notes = []
    if args.notes:
        notes.append(str(args.notes))
    meta_notes = meta.get("notes")
    if isinstance(meta_notes, str):
        if meta_notes:
            notes.append(meta_notes)
    elif isinstance(meta_notes, list):
        notes.extend(str(note) for note in meta_notes if note)
    return notes


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run-dir", required=True)
    ap.add_argument("--emulator", required=True)
    ap.add_argument("--os", required=True, dest="os_name")
    ap.add_argument("--tier", default="auto")
    ap.add_argument("--result", required=True,
                    choices=["pass", "partial", "fail", "unverified"])
    ap.add_argument("--evidence-dir", required=True)
    ap.add_argument("--scope", default="native",
                    choices=["native", "env-replay"])
    ap.add_argument("--unverified-reason", default=None)
    ap.add_argument("--row-name", default=None,
                    help="evidence row id; defaults to <emulator>-<os>-<tier>")
    ap.add_argument("--notes", default=None)
    args = ap.parse_args()

    if args.result == "unverified" and not args.unverified_reason:
        print("collect: --unverified-reason is required when "
              "--result=unverified (honesty rule: an unexecuted row always "
              "names why)", file=sys.stderr)
        return 2

    session = os.path.join(args.run_dir, "session")
    meta_path = os.path.join(session, "meta.json")
    if not os.path.isfile(meta_path):
        print(f"collect: missing {meta_path}", file=sys.stderr)
        return 1
    with open(meta_path, "r", encoding="utf-8") as fh:
        meta = json.load(fh)

    events_path = os.path.join(session, "events.log")
    events = parse_events(events_path) if os.path.isfile(events_path) else []

    transcript_path = meta.get("transcript") or os.path.join(session, "pty.log")
    if not os.path.isabs(transcript_path):
        transcript_path = os.path.join(args.run_dir, transcript_path)
    transcript = b""
    transcript_sha = None
    if os.path.isfile(transcript_path):
        with open(transcript_path, "rb") as fh:
            transcript = fh.read()
        transcript_sha = sha256_file(transcript_path)

    # Frame spans are computed once over the whole transcript and each
    # frame is attributed to the phase containing its opening marker, so a
    # frame straddling a checkpoint boundary still lands in exactly one
    # phase and per-phase counts sum to the transcript-wide total. Payload
    # and surface counters keep their per-slice semantics.
    spans = frame_spans(transcript)
    phases = segment_phases(transcript, events)
    phase_reports = []
    prev_at = None
    for phase in phases:
        chunk = transcript[phase["start_byte"]:phase["end_byte"]]
        report = {
            "name": phase["name"],
            "bytes": phase["bytes"],
            "at_ms": phase["at_ms"],
            "screenshot": phase["screenshot"],
        }
        if phase["at_ms"] is not None and prev_at is not None:
            duration_ms = max(0, phase["at_ms"] - prev_at)
            report["duration_ms"] = duration_ms
            if duration_ms > 0:
                report["bytes_per_s"] = int(phase["bytes"] * 1000 / duration_ms)
        if phase["at_ms"] is not None:
            prev_at = phase["at_ms"]
        if chunk:
            report["frames"] = frame_stats(
                transcript, spans, phase["start_byte"], phase["end_byte"]
            )
            if report.get("duration_ms"):
                report["frames_per_s"] = round(
                    report["frames"]["count"] * 1000 / report["duration_ms"], 1
                )
            surfaces = surface_stats(chunk, phase["start_byte"])
            if surfaces:
                report["surfaces"] = surfaces
            report["layout"] = layout_stats(chunk)
            kit = kitty_stats(chunk)
            if kit["transmits"] or kit["deletes"] or kit["placements"] or kit["queries"]:
                report["kitty"] = kit
            six = sixel_stats(chunk)
            if six["transmits"]:
                report["sixel"] = six
        phase_reports.append(report)

    tier = observed_tier(transcript)
    build = meta.get("build")
    if not (
        isinstance(build, dict)
        and isinstance(build.get("commit"), str)
        and build.get("commit").strip()
        and isinstance(build.get("binary_sha256"), str)
        and build.get("binary_sha256").strip()
    ):
        # Provenance is part of the evidence: a bundle that cannot name
        # the commit and binary that produced it says so instead of
        # implying the current tree generated it. An empty or partial
        # build block is the same unrecorded state as an absent one.
        build = {
            "recorded": False,
            "reason": ("the run metadata carries no build identity; this "
                       "bundle was generated before the identity fields "
                       "existed (or by a runner that does not record them) "
                       "and cannot name its generating commit"),
        }
    result = {
        "schema": SCHEMA,
        "row": args.row_name or f"{args.emulator}-{args.os_name}-{args.tier}",
        "emulator": args.emulator,
        "emulator_version": meta.get("emulator_version"),
        "os": args.os_name,
        "arch": meta.get("arch"),
        "scope": args.scope,
        "tier_requested": args.tier,
        "tier_observed": tier,
        "disposition": args.result,
        "unverified_reason": args.unverified_reason,
        "build": build,
        "pause_select": meta.get("pause_select", 0),
        "runner": meta.get("runner", {}),
        "geometry": meta.get("geometry", {}),
        "extra_env": meta.get("extra_env", []),
        "started_at": meta.get("started_at"),
        "ended_at": meta.get("ended_at"),
        "exit": meta.get("exit"),
        "phases": phase_reports,
        "protocol_totals": {
            "transcript_bytes": len(transcript),
            "transcript_sha256": transcript_sha,
            "frames": frame_stats(transcript),
            "kitty": kitty_stats(transcript),
            "sixel": sixel_stats(transcript),
        },
        "trace": trace_summary(args.run_dir, session),
        "notes": collect_notes(args, meta),
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    row = result["row"]
    out_file = os.path.join(args.evidence_dir, f"{row}.json")
    out_dir = os.path.join(args.evidence_dir, row)
    shots_out = os.path.join(out_dir, "screenshots")
    os.makedirs(shots_out, exist_ok=True)

    seen_hashes = {}
    duplicates = []
    light_captures = []
    rejected_captures = []
    accepted_captures = 0
    for phase in result["phases"]:
        src = phase.get("screenshot")
        if not src:
            continue
        if not os.path.isabs(src):
            # Bind every relative capture to the run directory; a relative
            # path must never resolve against the collector's working
            # directory (a foreign file must not enter the bundle).
            src = os.path.join(args.run_dir, src)
        if os.path.isfile(src):
            # A capture the collector cannot decode is not evidence:
            # reject it instead of copying corrupt bytes into the bundle.
            facts = screenshot_facts(src)
            if facts is None:
                phase["screenshot"] = None
                phase["capture_rejected"] = "not a decodable PNG (truncated or corrupt)"
                rejected_captures.append(phase["name"])
                continue
            name = os.path.basename(src)
            dest = os.path.join(shots_out, name)
            shutil.copyfile(src, dest)
            accepted_captures += 1
            phase["screenshot"] = f"screenshots/{name}"
            digest = sha256_file(dest)
            phase["screenshot_sha256"] = digest
            # Validation (issue: four byte-identical white captures in one
            # row went unnoticed): flag duplicate captures and captures
            # that are >=98% white (a light-background terminal renders
            # the tier's light content unreadable).
            phase["screenshot_width"] = facts["width"]
            phase["screenshot_height"] = facts["height"]
            phase["white_share"] = facts["white_share"]
            phase["dominant_share"] = facts["dominant_share"]
            phase["sprite_census"] = facts["sprite_census"]
            if facts["light_background"]:
                phase["light_background_capture"] = True
                light_captures.append(phase["name"])
            if digest in seen_hashes:
                duplicates.append(
                    {"sha256": digest, "phases": [seen_hashes[digest], phase["name"]]}
                )
            else:
                seen_hashes[digest] = phase["name"]
        else:
            phase["screenshot"] = None

    if duplicates:
        result["duplicate_screenshots"] = duplicates
    if light_captures:
        result["light_background_captures"] = light_captures
    if rejected_captures:
        result["rejected_captures"] = rejected_captures

    # Honesty enforcement: a `pass` requires that the terminal actually
    # rendered the session. A row whose captures are near-uniform white
    # on a light background is downgraded to `partial` with the reason
    # recorded, so it can never be presented as a clean pass. Each gate
    # below reads the driver's proposed result, not the mutated value, so
    # the reasons all land even when several gates fire together.
    disposition = args.result
    notes = collect_notes(args, meta)
    # Tier-observation honesty: on platforms whose sessions carry a
    # transcript (Linux/macOS), every bitmap gate below is keyed on the
    # observed tier, so a transcript that never names it (no VIDEO line
    # and no `video tier:` line) would skip all of them. A pass cannot
    # rest on a surface the collector could not classify; fail closed.
    # Windows rows carry no transcript by design (run-windows.ps1) and
    # are graded from the process record plus the capture set instead, so
    # this gate does not apply there.
    if args.result == "pass" and tier is None and args.os_name != "windows":
        disposition = "partial"
        notes.append(
            "recorded partial by collect.py: the transcript never named the "
            "active video tier (no VIDEO/video-tier line), so a pass would "
            "rest on an unverified surface; the bitmap honesty gates are "
            "keyed on the observed tier and cannot run without it"
        )
    if args.result == "pass" and light_captures:
        disposition = "partial"
        notes.append(
            "recorded partial by collect.py: checkpoint captures "
            + ", ".join(light_captures)
            + " are >=98% white on the terminal's default light background; "
              "the tier's light content is unreadable there"
        )
    if args.result == "pass" and rejected_captures:
        disposition = "partial"
        notes.append(
            "recorded partial by collect.py: checkpoint captures "
            + ", ".join(rejected_captures)
            + " are not decodable PNGs and were rejected from the bundle"
        )
    if args.result == "pass" and accepted_captures == 0:
        disposition = "partial"
        notes.append(
            "recorded partial by collect.py: no checkpoint capture entered "
            "the bundle; a pass requires at least one rendered capture"
        )
    # Bitmap-tier blank-board honesty (Evaluator E4): a capture that is
    # >=90% one color on a playing or resize checkpoint is a blank board
    # (the sixel `resized-wide` checkpoint shipped exactly that shape
    # while signed pass). The white-share gate above only sees light
    # backgrounds; this one sees a dark blank board too. The bound was
    # still 0.98 while a blank shape with a few stale pixels (0.90 to
    # 0.98 dominant share) could sign a pass (Evaluator QC-4); the
    # committed bitmap-tier playing-family maximum is 0.6427 and a
    # text-bearing frame cannot be uniformly flat.
    if args.result == "pass" and tier in ("kitty-graphics", "sixel"):
        blank_captures = []
        for phase in result["phases"]:
            name = str(phase.get("name", "")).lower()
            if not phase.get("screenshot"):
                continue
            if not (name.startswith("playing")
                    or "resized" in name
                    or name == "refit"):
                continue
            if phase.get("dominant_share", 0.0) >= 0.90:
                blank_captures.append(phase["name"])
        if blank_captures:
            disposition = "partial"
            notes.append(
                "recorded partial by collect.py: bitmap-tier captures "
                + ", ".join(blank_captures)
                + " are >=90% one color (a blank board, not a rendered "
                  "playing surface)"
            )
    # Bitmap-tier playing-surface honesty: a kitty-graphics or sixel
    # `pass` must rest on at least one decodable playing capture. The
    # blank-board and sprite gates above only inspect captures that
    # exist, so a bitmap-tier row whose playing checkpoint produced no
    # capture (a rejected or absent image) could otherwise sign a pass
    # on its static menu screens alone.
    if args.result == "pass" and tier in ("kitty-graphics", "sixel"):
        playing_captures = [
            phase["name"]
            for phase in result["phases"]
            if phase.get("screenshot")
            and str(phase.get("name", "")).lower().startswith("playing")
        ]
        if not playing_captures:
            disposition = "partial"
            notes.append(
                "recorded partial by collect.py: no decodable playing "
                "capture entered the bundle; a bitmap-tier pass must rest "
                "on the rendered playing surface, not only its menus"
            )
    # Pause-surface honesty (Evaluator E1, revised for the frozen-board
    # design): the pause hub is a text card over the frozen, 55%-dimmed
    # board with actors exempt from dimming, so a paused capture may
    # legitimately carry sprite pixels. The check is capture-first and
    # still refuses a pass when the card never reached the wire: the
    # paused slice must paint PAUSED and the capture must be a real,
    # non-flat panel (0.55 <= dominant < 1.0). A leftover playing frame
    # with no pause card has no PAUSED paint and fails.
    # The fixed session always takes exactly one paused checkpoint
    # (drive.sh, run-windows.ps1), so a kitty-graphics pass whose phase
    # list has zero (or several) paused entries cannot silently skip the
    # gate (Evaluator QC-4): a missing checkpoint is a missing claim,
    # not a pass, and the pause-surface verdict below is only meaningful
    # when the recorded session shape matches the fixed session.
    paused_phases = [
        phase
        for phase in result["phases"]
        if str(phase.get("name", "")).lower() == "paused"
    ]
    if args.result == "pass" and tier == "kitty-graphics" and len(paused_phases) != 1:
        disposition = "partial"
        notes.append(
            "recorded partial by collect.py: the session carries "
            + str(len(paused_phases))
            + " paused checkpoint(s), expected exactly one; a missing "
              "checkpoint is a missing claim (the pause surface cannot be "
              "verified) and a kitty-graphics pass requires the single "
              "paused checkpoint of the fixed session"
        )
    if args.result == "pass" and tier == "kitty-graphics":
        paused_bad = []
        paused_missing = []
        proven = []
        for phase in paused_phases:
            kit = phase.get("kitty") or {}
            media = int(kit.get("transmits", 0)) + int(kit.get("placements", 0))
            share = float(phase.get("dominant_share") or 0.0)
            census = int((phase.get("sprite_census") or {}).get("pixels", 0))
            surfaces = phase.get("surfaces") or {}
            pause_paints = int((surfaces.get("paused") or {}).get("paints", 0))
            if not phase.get("screenshot"):
                paused_missing.append(phase["name"])
            elif pause_paints < 1:
                paused_bad.append(phase["name"])
            elif not (0.55 <= share < 1.0) or census < 4:
                paused_bad.append(phase["name"])
            elif media > 0:
                # Checkpoint offsets can lag the last playing frame, so a
                # few trailing placements can land in the paused slice.
                # The capture above already proves the menu is visible;
                # attribute the media to the checkpoint boundary.
                proven.append(phase["name"])
        if paused_bad or paused_missing:
            disposition = "partial"
            reasons = []
            if paused_bad:
                reasons.append(
                    "the paused capture never painted the PAUSED card, is "
                    "not a non-flat panel, or carries fewer than 4 sprite "
                    "pixels ("
                    + ", ".join(paused_bad)
                    + ")"
                )
            if paused_missing:
                reasons.append(
                    "no decodable paused capture ("
                    + ", ".join(paused_missing)
                    + ")"
                )
            notes.append(
                "recorded partial by collect.py: " + "; ".join(reasons)
            )
        elif proven:
            phase = next(p for p in paused_phases if p["name"] in proven)
            share = float(phase.get("dominant_share") or 0.0)
            census = int((phase.get("sprite_census") or {}).get("pixels", 0))
            notes.append(
                "paused-phase media at "
                + ", ".join(proven)
                + " is checkpoint-boundary attribution; the paused capture "
                + "carries "
                + str(census)
                + " sprite pixels at "
                + format(share, ".2%")
                + " one color, so the menu panel is visible"
            )
    # Sprite-visibility honesty on the kitty-graphics tier: placements
    # round-tripping through the terminal proves the protocol, not that
    # the player can see the sprites. Before the explicit z layers, a
    # terminal that honored the equal-z image-id tie-break (Ghostty
    # 1.3.1) composited the opaque static board above the atlas, so
    # every capture decoded as a valid, non-white board with zero sprite
    # pixels. A `pass` on the kitty-graphics tier with placements on the
    # wire therefore requires at least one playing capture carrying
    # sprite-palette pixels; the census is recorded either way.
    placements_total = result["protocol_totals"]["kitty"]["placements"]
    if args.result == "pass" and tier == "kitty-graphics" and placements_total > 0:
        with_sprites = [
            phase["name"]
            for phase in result["phases"]
            if str(phase.get("name", "")).lower().startswith("playing")
            and (phase.get("sprite_census") or {}).get("pixels", 0) > 0
        ]
        if not with_sprites:
            disposition = "partial"
            notes.append(
                "recorded partial by collect.py: kitty-graphics placements "
                f"({placements_total}) round-tripped but no playing capture "
                "contains a sprite-palette pixel; the static board layer "
                "alone decodes as a valid frame, so sprite visibility is "
                "not proven"
            )
        result["sprite_visibility"] = {
            "playing_captures_with_sprites": with_sprites,
        }
    result["disposition"] = disposition
    result["notes"] = notes

    # The event stream carries the timestamps, key names, and transcript
    # byte offsets quoted by the findings ledger; committing it (it is a
    # few KiB of TSV, no transcript payload) keeps every quoted number
    # re-derivable from the committed bundle.
    if os.path.isfile(events_path):
        shutil.copyfile(events_path, os.path.join(out_dir, "events.log"))

    with open(out_file, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2, sort_keys=False)
        fh.write("\n")
    print(f"collect: wrote {out_file} ({len(result['phases'])} phases, "
          f"tier_observed={tier}, disposition={disposition})")
    return 0


def trace_summary(run_dir, session):
    """Ingest MAZE_CHASE_TRACE JSONL: the harness exports the variable to
    `session/trace.jsonl` and the binary appends one record per frame, so
    an absent or empty file means the session never reached tracing (a
    crash before the first write), never a collector gap."""
    path = os.path.join(session, "trace.jsonl")
    if not os.path.isfile(path) or os.path.getsize(path) == 0:
        return {
            "present": False,
            "path": "session/trace.jsonl",
            "reason": ("no trace records: the harness exported "
                       "MAZE_CHASE_TRACE but the binary wrote none, which "
                       "means the session never reached the trace loop"),
        }
    records = []
    bad = 0
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                bad += 1
    kinds = {}
    for r in records:
        if isinstance(r, dict):
            kinds[str(r.get("kind", r.get("event", "unknown")))] = (
                kinds.get(str(r.get("kind", r.get("event", "unknown"))), 0) + 1
            )
    return {
        "present": True,
        "path": "session/trace.jsonl",
        "sha256": sha256_file(path),
        "records": len(records),
        "malformed_lines": bad,
        "kinds": kinds,
    }


if __name__ == "__main__":
    sys.exit(main())
