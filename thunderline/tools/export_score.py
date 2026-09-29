#!/usr/bin/env python3
"""Thunderline score exporter (Phase 1 export path, stdlib only).

Reads score/song.json and deterministically writes:
  dist/song.mid    - Standard MIDI File, format 0, fixed header, no timestamps
  dist/sheet.html  - printable chord/lyric sheet (deterministic string build)
  dist/lyrics.json - per-line lyric timing in seconds derived from the score

No wall clock, no network, no unseeded randomness. Re-running produces
byte-identical outputs. Used by the Phase 1 schema/parse test and later
by the full render pipeline (tools/render.py consumes the same song.json).
"""
import json
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCORE_PATH = os.path.join(ROOT, "score", "song.json")
DIST = os.path.join(ROOT, "dist")

CHORD_ROOTS = {"E7": 40, "A7": 45, "B7": 47}  # E2/A2/B2 MIDI for sheet hints


def load_score(path=SCORE_PATH):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate(song):
    errors = []
    for key in ("title", "key", "meter", "tempo", "form", "totalBars",
                "totalBeats", "durationSec", "chords", "melody",
                "leadGuitar", "lyrics", "arrangement", "masterSeed"):
        if key not in song:
            errors.append("missing key: %s" % key)
    if errors:
        return errors
    bpm = song["tempo"]["bpm"]
    if not (120 <= bpm <= 200):
        errors.append("tempo bpm out of range: %r" % bpm)
    if song["totalBeats"] != song["totalBars"] * 4:
        errors.append("totalBeats != totalBars*4")
    expect = round(song["totalBeats"] * 60.0 / bpm, 3)
    if abs(song["durationSec"] - expect) > 0.001:
        errors.append("durationSec mismatch: %r vs %r" % (song["durationSec"], expect))
    if not (150.0 <= song["durationSec"] <= 210.0):
        errors.append("duration outside 150-210 s gate: %r" % song["durationSec"])
    for n in song["melody"]:
        if not (40 <= n["midi"] <= 84):
            errors.append("melody midi out of singable bounds: %r" % n)
        if n["durBeats"] <= 0:
            errors.append("melody non-positive duration: %r" % n)
    if not song["lyrics"]:
        errors.append("no lyrics")
    return errors


def lyric_timings(song):
    bpm = song["tempo"]["bpm"]
    out = []
    for lyr in song["lyrics"]:
        a = round(lyr["startBeat"] * 60.0 / bpm, 3)
        b = round(lyr["endBeat"] * 60.0 / bpm, 3)
        out.append({"line": lyr["line"], "section": lyr["section"],
                    "startSec": a, "endSec": b})
    return out


def _vlq(value):
    out = [value & 0x7F]
    value >>= 7
    while value:
        out.append(0x80 | (value & 0x7F))
        value >>= 7
    return bytes(reversed(out))


def build_midi(song):
    """Deterministic SMF format-0: fixed header, tempo map, melody + lead + roots."""
    bpm = song["tempo"]["bpm"]
    division = 480
    events = []
    events.append((0, bytes([0xFF, 0x51, 0x03]) + struct.pack(">I", round(60000000 / bpm))[1:4]))
    events.append((0, bytes([0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08])))
    events.append((0, bytes([0xFF, 0x03]) + bytes([len(song["title"])]) + song["title"].encode("ascii")))

    def beats_to_ticks(b):
        return int(round(b * division))

    notes = []
    for n in song["melody"]:
        notes.append((n["startBeat"], n["midi"], n["durBeats"], 0, 90))
    for n in song["leadGuitar"]:
        notes.append((n["startBeat"], n["midi"], n["durBeats"], 1, 80))
    # chord-root guide (quiet, channel 2) so the MIDI carries the harmony too
    for c in song["chords"]:
        root = CHORD_ROOTS.get(c["chord"], 40)
        notes.append((c["bar"] * 4.0, root, 3.5, 2, 50))
    notes.sort(key=lambda t: (t[0], t[2], t[1]))

    abs_events = []
    for start_beat, midi, dur, ch, vel in notes:
        abs_events.append((beats_to_ticks(start_beat), bytes([0x90 | ch, midi, vel])))
        abs_events.append((beats_to_ticks(start_beat + dur), bytes([0x80 | ch, midi, 0])))
    abs_events.sort(key=lambda t: t[0])
    abs_events.extend(events)
    abs_events.sort(key=lambda t: t[0])

    track = b""
    last = 0
    for tick, msg in abs_events:
        track += _vlq(tick - last) + msg
        last = tick
    track += b"\x00\xff\x2f\x00"
    header = b"MThd" + struct.pack(">IHHH", 6, 0, 1, division)
    return header + b"MTrk" + struct.pack(">I", len(track)) + track


def build_sheet(song):
    lines = []
    lines.append("<!doctype html>")
    lines.append('<html lang="en"><head><meta charset="utf-8">')
    lines.append("<title>%s - lead sheet</title></head><body>" % song["title"])
    lines.append("<h1>%s</h1>" % song["title"])
    lines.append("<p>Key %s, meter %s, tempo %s BPM, %s bars, %s seconds. Original work, lab-owned.</p>"
                 % (song["key"], song["meter"], song["tempo"]["bpm"],
                    song["totalBars"], song["durationSec"]))
    lines.append("<h2>Form</h2><ul>")
    for sec in song["form"]:
        lines.append("<li>%s: %s bars (from bar %s)</li>"
                     % (sec["section"], sec["bars"], sec["startBar"]))
    lines.append("</ul>")
    lines.append("<h2>Chords (per bar)</h2><ol>")
    for c in song["chords"]:
        lines.append("<li>Bar %d [%s]: %s</li>" % (c["bar"], c["section"], c["chord"]))
    lines.append("</ol>")
    lines.append("<h2>Lyrics</h2><ol>")
    for lyr in song["lyrics"]:
        lines.append("<li>[%s] %s</li>" % (lyr["section"], lyr["line"]))
    lines.append("</ol>")
    lines.append("</body></html>")
    return "\n".join(lines) + "\n"


def export_all(dist_dir=DIST, score_path=SCORE_PATH):
    song = load_score(score_path)
    errors = validate(song)
    if errors:
        for e in errors:
            print("score error: %s" % e, file=sys.stderr)
        return 1
    os.makedirs(dist_dir, exist_ok=True)
    with open(os.path.join(dist_dir, "song.mid"), "wb") as f:
        f.write(build_midi(song))
    with open(os.path.join(dist_dir, "sheet.html"), "w", encoding="utf-8") as f:
        f.write(build_sheet(song))
    with open(os.path.join(dist_dir, "lyrics.json"), "w", encoding="utf-8") as f:
        json.dump(lyric_timings(song), f, indent=1, sort_keys=True)
        f.write("\n")
    print("exported song.mid, sheet.html, lyrics.json to %s" % dist_dir)
    return 0


if __name__ == "__main__":
    sys.exit(export_all())
