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


def kitty_stats(data):
    transmits = 0
    deletes = 0
    placements = 0
    queries = 0
    payload_bytes = 0
    chunked = False
    png_dims = None
    for match in KITTY_RE.finditer(data):
        params = match.group(1).decode("ascii", "replace")
        payload = match.group(2)
        if "m=1" in params:
            chunked = True
        if params.startswith("a=T"):
            transmits += 1
            payload_bytes += len(payload)
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
        elif params.startswith("a=p"):
            placements += 1
        elif params.startswith("a=d"):
            deletes += 1
        elif params.startswith("a=q"):
            queries += 1
    return {
        "transmits": transmits,
        "placements": placements,
        "deletes": deletes,
        "queries": queries,
        "chunked": chunked,
        "payload_bytes": payload_bytes,
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


def layout_stats(data):
    """Measure which terminal columns the game actually addresses. The
    game paints every chrome/board line with an absolute cursor move, so
    the union of target columns is the used column span; everything
    outside it is dead letterbox space."""
    cols = []
    rows = []
    for match in POS_RE.finditer(data):
        rows.append(int(match.group(1)) - 1)
        cols.append(int(match.group(2)) - 1)
    if not cols:
        return None
    # Text runs after each move: approximate the painted width by the text
    # up to the next escape or newline, so a line written at col C that is
    # N cells long addresses C..C+N-1.
    return {
        "addressed_cols_min": min(cols),
        "addressed_cols_max": max(cols),
        "addressed_rows_min": min(rows),
        "addressed_rows_max": max(rows),
        "moves": len(cols),
    }


def observed_tier(transcript):
    text = strip_ansi(transcript)
    for name in TIER_NAMES:
        if name.encode() in text:
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
    ap.add_argument("--notes", default=None)
    args = ap.parse_args()

    session = os.path.join(args.run_dir, "session")
    meta_path = os.path.join(session, "meta.json")
    if not os.path.isfile(meta_path):
        print(f"collect: missing {meta_path}", file=sys.stderr)
        return 1
    with open(meta_path, "r", encoding="utf-8") as fh:
        meta = json.load(fh)

    events_path = os.path.join(session, "events.log")
    events = parse_events(events_path) if os.path.isfile(events_path) else []

    transcript_path = meta.get("transcript", os.path.join(session, "pty.log"))
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
    for phase in phases:
        chunk = transcript[phase["start_byte"]:phase["end_byte"]]
        report = {
            "name": phase["name"],
            "bytes": phase["bytes"],
            "screenshot": phase["screenshot"],
        }
        if chunk:
            report["frames"] = frame_stats(chunk)
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
        "row": f"{args.emulator}-{args.os_name}-{args.tier}",
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
            phase["screenshot_sha256"] = sha256_file(dest)
        else:
            phase["screenshot"] = None

    with open(out_file, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2, sort_keys=False)
        fh.write("\n")
    print(f"collect: wrote {out_file} ({len(result['phases'])} phases, "
          f"tier_observed={tier}, disposition={args.result})")
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
