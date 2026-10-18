#!/usr/bin/env python3
"""Assemble one compatibility evidence file from a harness run directory.

The real-terminal driver (`drive.sh`) records a session under a run
directory:

    run-dir/session/meta.json      run metadata (emulator, geometry, exit)
    run-dir/session/events.log     TSV event stream with transcript offsets
    run-dir/session/pty.log        raw escape transcript of the game
    run-dir/session/screenshots/   one PNG per checkpoint
    run-dir/session/trace.jsonl    MAZE_CHASE_TRACE output when the binary
                                   emits it (the trace mode lands with the
                                   render pipeline work; ingestion is
                                   already wired so no harness change is
                                   needed once the binary writes it)

`collect.py` parses the transcript deterministically (frame segmentation,
Kitty/Sixel protocol statistics, per-phase layout addressing, the tier
name the title screen paints) and writes:

    <evidence-dir>/<row>.json          machine evidence, hashed artifacts
    <evidence-dir>/<row>/screenshots/  copies of the checkpoint captures

Evidence rules (binding, see README.md): every number in the output is
either measured from the transcript/screenshots or copied from the run
metadata; a run that could not execute is recorded as `unverified` with
its reason and never guessed. No em dashes anywhere (project rule).

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
            if action == "T":
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


def frame_stats(data):
    """Segment the stream by synchronized-output markers (the game wraps
    every frame in ESC[?2026h ... ESC[?2026l)."""
    frames = []
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
        frames.append(data[start:end])
        pos = end
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
    while pos + 8 <= len(data):
        length = int.from_bytes(data[pos:pos + 4], "big")
        kind = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            (width, height, bit_depth, color_type, comp, filt,
             interlace) = struct.unpack(">IIBBBBB", chunk)
            if comp or filt:
                return None
        elif kind == b"PLTE":
            palette = chunk
        elif kind == b"IDAT":
            idat.append(chunk)
        elif kind == b"IEND":
            break
    if not width or not height or interlace:
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
    palette, grayscale treats all-ones as white."""
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
        elif bit == 1:
            for y in range(height):
                row = rows[y * stride:(y + 1) * stride]
                for x in range(width):
                    byte = row[x // 8]
                    if (byte >> (7 - (x % 8))) & 1:
                        white += 1
        else:
            return 0.0
        return white / total
    if color == 2 and bit == 8:
        for i in range(0, total * 3, 3):
            if rows[i] == 0xFF and rows[i + 1] == 0xFF and rows[i + 2] == 0xFF:
                white += 1
        return white / total
    return 0.0


def screenshot_facts(path):
    """Signature-checked capture facts: dimensions, single-color flatness,
    and the white-pixel share (a light-background capture). Returns None
    when the file is not a decodable PNG."""
    try:
        decoded = decode_png(path)
    except OSError:
        return None
    if decoded is None:
        return None
    rows = decoded["rows"]
    facts = {
        "width": decoded["width"],
        "height": decoded["height"],
        "flat": len(set(rows)) <= 1,
    }
    share = white_share(decoded)
    facts["white_share"] = round(share, 4)
    facts["light_background"] = share >= 0.98
    return facts


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
            report["frames"] = frame_stats(chunk)
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
        "notes": [n for n in [args.notes, meta.get("notes")] if n],
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
    for phase in result["phases"]:
        src = phase.get("screenshot")
        if not src:
            continue
        if not os.path.isabs(src):
            cand = os.path.join(args.run_dir, src)
            if os.path.isfile(cand):
                src = cand
        if os.path.isfile(src):
            name = os.path.basename(src)
            dest = os.path.join(shots_out, name)
            shutil.copyfile(src, dest)
            phase["screenshot"] = f"screenshots/{name}"
            digest = sha256_file(dest)
            phase["screenshot_sha256"] = digest
            # Validation (issue: four byte-identical white captures in one
            # row went unnoticed): flag duplicate captures and captures
            # that are >=98% white (a light-background terminal renders
            # the tier's light content unreadable).
            facts = screenshot_facts(dest)
            if facts:
                phase["screenshot_width"] = facts["width"]
                phase["screenshot_height"] = facts["height"]
                phase["white_share"] = facts["white_share"]
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

    # Honesty enforcement: a `pass` requires that the terminal actually
    # rendered the session. A row whose captures are near-uniform white
    # on a light background is downgraded to `partial` with the reason
    # recorded, so it can never be presented as a clean pass.
    disposition = args.result
    notes = [n for n in [args.notes, meta.get("notes")] if n]
    if disposition == "pass" and light_captures:
        disposition = "partial"
        notes.append(
            "recorded partial by collect.py: checkpoint captures "
            + ", ".join(light_captures)
            + " are >=98% white on the terminal's default light background; "
              "the tier's light content is unreadable there"
        )
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
    """Ingest MAZE_CHASE_TRACE JSONL when the binary emits it. The trace
    mode lands with the render pipeline work; until then the field states
    the absence honestly instead of fabricating a trace."""
    path = os.path.join(session, "trace.jsonl")
    if not os.path.isfile(path) or os.path.getsize(path) == 0:
        return {
            "present": False,
            "path": "session/trace.jsonl",
            "reason": ("binary does not emit MAZE_CHASE_TRACE yet (trace mode "
                       "is part of the render pipeline work); the harness "
                       "passes the variable and ingests it automatically "
                       "once the binary writes it"),
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
