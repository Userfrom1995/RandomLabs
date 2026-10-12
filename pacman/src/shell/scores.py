"""Persistent high-score table: top runs in a JSON file, never crashing.

The table lives at ``$XDG_DATA_HOME/pacman-terminal/highscores.json``
(``~/.local/share`` fallback); tests and portable installs override it with
the ``PACMAN_SCORES_FILE`` environment variable. Missing or corrupt files
read as an empty table; unwritable files make ``save()`` return False
instead of raising, so the game always plays on.
"""

import json
import os

MAX_ENTRIES = 10
NAME_LEN = 10
ENV_OVERRIDE = "PACMAN_SCORES_FILE"


def default_path():
    if ENV_OVERRIDE in os.environ and os.environ[ENV_OVERRIDE]:
        return os.environ[ENV_OVERRIDE]
    base = os.environ.get("XDG_DATA_HOME") or os.path.join(
        os.path.expanduser("~"), ".local", "share")
    return os.path.join(base, "pacman-terminal", "highscores.json")


def clean_name(name):
    """Scrub a pilot name to printable ASCII, capped at NAME_LEN chars."""
    text = "".join(ch for ch in str(name or "") if ch.isascii() and ch.isprintable())
    text = text.strip().upper() or "ACE"
    return text[:NAME_LEN]


class ScoreTable:
    """Top-N score list with JSON persistence."""

    def __init__(self, path=None):
        self.path = path or default_path()
        self.entries = self._load()

    def _load(self):
        try:
            with open(self.path, "r", encoding="utf-8") as handle:
                raw = json.load(handle)
        except (OSError, ValueError):
            return []
        if not isinstance(raw, list):
            return []
        entries = []
        for row in raw:
            if not isinstance(row, dict):
                continue
            try:
                score = int(row.get("score", 0))
                level = int(row.get("level", 1))
            except (TypeError, ValueError):
                continue
            if score <= 0:
                continue
            entries.append({
                "name": clean_name(row.get("name", "ACE")),
                "score": score,
                "level": max(level, 1),
                "mode": str(row.get("mode", "classic")),
            })
        entries.sort(key=lambda e: (-e["score"], e["name"]))
        return entries[:MAX_ENTRIES]

    def qualifies(self, score):
        if score <= 0:
            return False
        if len(self.entries) < MAX_ENTRIES:
            return True
        return score > self.entries[-1]["score"]

    def add(self, name, score, level=1, mode="classic"):
        """Insert a run; returns the 1-based rank, or 0 when it misses."""
        score = int(score)
        if not self.qualifies(score):
            return 0
        entry = {"name": clean_name(name), "score": score,
                 "level": max(int(level), 1), "mode": str(mode)}
        self.entries.append(entry)
        self.entries.sort(key=lambda e: (-e["score"], e["name"]))
        del self.entries[MAX_ENTRIES:]
        self.save()
        return self.entries.index(entry) + 1

    def save(self):
        try:
            parent = os.path.dirname(self.path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            with open(self.path, "w", encoding="utf-8") as handle:
                json.dump(self.entries, handle, indent=2)
            return True
        except OSError:
            return False

    def format(self):
        """Human-readable table lines for the CLI and the title screen."""
        if not self.entries:
            return ["no scores yet - play a run!"]
        lines = []
        for rank, entry in enumerate(self.entries, 1):
            lines.append("%2d. %-10s %6d  L%02d %s" % (
                rank, entry["name"], entry["score"], entry["level"], entry["mode"]))
        return lines
