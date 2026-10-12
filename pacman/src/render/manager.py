"""Tiered renderer: backend factory, fallback chain, auto-degrade watchdog.

Selection starts with detect_renderer (override beats env beats heuristic),
then forms a fallback chain with unicode always last. At runtime the watchdog
watches two signals: backend errors (an exception from present) and slow
frames (two consecutive presents over SLOW_FRAME_S). Either signal steps the
chain down one tier and re-initializes the next backend. present() never
raises: if every tier fails it records the drop and returns "".
"""

import time

from .detect import FALLBACK_ORDER, detect_renderer
from .kitty import KittyBackend
from .sixel import SixelBackend
from .unicode import UnicodeBackend

SLOW_FRAME_S = 0.25
SLOW_STRIKES = 2


def make_backend(name, clock=None):
    """Build a backend by name. Raises ValueError on unknown names."""
    key = str(name).strip().lower()
    if key == "kitty":
        return KittyBackend()
    if key == "sixel":
        return SixelBackend(clock=clock) if clock is not None else SixelBackend()
    if key == "unicode":
        return UnicodeBackend()
    raise ValueError("unknown renderer: %r (want kitty/sixel/unicode)" % (name,))


class TieredRenderer:
    def __init__(self, preference=None, env=None, clock=None):
        self._clock = clock if clock is not None else time.monotonic
        self.choice = detect_renderer(preference, env=env)
        idx = FALLBACK_ORDER.index(self.choice)
        self.chain = list(FALLBACK_ORDER[idx:])  # unicode always terminal
        self.backend = None
        self.backend_name = None
        self.cols = 0
        self.rows = 0
        self.degraded_from = []
        self.frames = 0
        self.errors = 0
        self.dropped = 0
        self.slow_strikes = 0

    def _activate(self, name):
        backend = make_backend(name, clock=self._clock)
        seq = backend.init(self.cols, self.rows)
        self.backend = backend
        self.backend_name = name
        return seq

    def init(self, cols, rows):
        self.cols, self.rows = int(cols), int(rows)
        problems = []
        for name in self.chain:
            backend = make_backend(name, clock=self._clock)
            if name != "unicode" and not backend.available():
                problems.append("%s unavailable" % name)
                continue
            try:
                seq = backend.init(self.cols, self.rows)
            except Exception as exc:
                problems.append("%s init failed: %s" % (name, exc))
                continue
            self.backend = backend
            self.backend_name = name
            return seq
        raise RuntimeError("no renderer tier usable (%s)" % "; ".join(problems))

    def _degrade(self):
        idx = self.chain.index(self.backend_name)
        source = self.backend_name
        problems = []
        for name in self.chain[idx + 1:]:
            try:
                probe = make_backend(name, clock=self._clock)
                usable = (name == "unicode") or bool(probe.available())
            except Exception as exc:
                problems.append("%s probe failed: %s" % (name, exc))
                continue
            if not usable:
                problems.append("%s unavailable" % name)
                continue
            try:
                seq = self._activate(name)
            except Exception as exc:
                problems.append("%s init failed: %s" % (name, exc))
                continue
            self.degraded_from.append(source)
            return seq
        raise RuntimeError("no lower renderer tier usable (%s)" % "; ".join(problems))

    def present(self, fb, dirty):
        if self.backend is None:
            raise ValueError("present before init")
        try:
            start = self._clock()
        except Exception:
            self.errors += 1
            self.dropped += 1
            return ""
        try:
            out = self.backend.present(fb, dirty)
        except Exception:
            self.errors += 1
            try:
                self._degrade()
            except Exception:
                self.dropped += 1
                return ""
            try:
                out = self.backend.present(fb, dirty)
            except Exception:
                self.errors += 1
                self.dropped += 1
                return ""
            self.frames += 1
            return out
        try:
            elapsed = self._clock() - start
        except Exception:
            self.errors += 1
            self.dropped += 1
            return ""
        if elapsed > SLOW_FRAME_S:
            self.slow_strikes += 1
            if self.slow_strikes >= SLOW_STRIKES:
                try:
                    self._degrade()
                except Exception:
                    pass
                self.slow_strikes = 0
        else:
            self.slow_strikes = 0
        self.frames += 1
        return out

    def shutdown(self):
        """Teardown sequence of the active backend ("" when never inited)."""
        if self.backend is None:
            return ""
        try:
            return self.backend.shutdown()
        except Exception:
            return ""

    def stats(self):
        info = {
            "backend": self.backend_name,
            "choice": self.choice,
            "degraded_from": list(self.degraded_from),
            "frames": self.frames,
            "errors": self.errors,
            "dropped": self.dropped,
        }
        for key in ("coalesced", "bytes_out"):
            if hasattr(self.backend, key):
                info[key] = getattr(self.backend, key)
        return info
