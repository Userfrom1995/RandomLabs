"""Pluggable audio: null, bell, and an original synthesized player.

Every backend implements play(event) with the same vocabulary
(dot, energizer, ghost, death, extra-life, level-clear, game-over) and
never blocks the game loop: sound work runs on a daemon thread and any
failure is counted, never raised. SynthAudio renders original PCM
waveforms (waka chirps, siren swells, death sweep, jingle) with the
stdlib only and shells out to a real system player (afplay/aplay/paplay);
when no player exists it honestly reports itself unavailable so the shell
can fall back to the bell.
"""

import math
import shutil
import struct
import subprocess
import threading

EVENTS = ("dot", "energizer", "ghost", "fruit", "death", "extra-life", "level-clear", "game-over")
KNOWN = ("null", "bell", "synth")
SAMPLE_HZ = 22050
TAU = 2.0 * math.pi


def _tone(frames, freq, duration, volume=0.35, square=False, slide_to=None):
    """Append a (possibly sliding) tone with click-free raised-cosine ends."""
    count = int(SAMPLE_HZ * duration)
    start = len(frames)
    for n in range(count):
        frac = n / max(count - 1, 1)
        freq_now = freq + (slide_to - freq) * frac if slide_to else freq
        phase = 2.0 * 3.141592653589793 * freq_now * (n / SAMPLE_HZ)
        sample = 1.0 if (phase % TAU) < math.pi else -1.0
        if not square:
            sample = math.sin(phase)
        env = 0.5 - 0.5 * math.cos(TAU * n / count)
        frames.append(volume * sample * env)
    return start


def render_event(event):
    """Render one event to mono float samples. Raises ValueError if unknown."""
    if event not in EVENTS:
        raise ValueError("unknown sound event: %r (want %s)" % (event, "/".join(EVENTS)))
    frames = []
    if event == "dot":
        _tone(frames, 660.0, 0.07, slide_to=990.0)
    elif event == "energizer":
        _tone(frames, 220.0, 0.30, slide_to=880.0)
    elif event == "ghost":
        _tone(frames, 990.0, 0.20, slide_to=440.0, square=True, volume=0.25)
    elif event == "fruit":
        _tone(frames, 880.0, 0.09, slide_to=1320.0)
        _tone(frames, 1320.0, 0.12, slide_to=1760.0)
    elif event == "death":
        _tone(frames, 880.0, 0.55, slide_to=110.0, volume=0.40)
        _tone(frames, 110.0, 0.15, volume=0.30)
    elif event == "extra-life":
        for freq in (523.25, 659.25, 783.99, 1046.5):
            _tone(frames, freq, 0.11)
    elif event == "level-clear":
        for freq in (392.0, 523.25, 659.25, 783.99):
            _tone(frames, freq, 0.12, square=True, volume=0.22)
    elif event == "game-over":
        for freq in (392.0, 329.63, 261.63, 196.0):
            _tone(frames, freq, 0.22)
    peak = max([abs(s) for s in frames] + [1e-9])
    scale = 0.9 / peak if peak > 0.9 else 1.0
    return [s * scale for s in frames]


def samples_to_wav_pcm(samples):
    """Encode mono float samples as 16-bit PCM WAV bytes (stdlib only)."""
    import io
    import wave
    blob = io.BytesIO()
    with wave.open(blob, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_HZ)
        wav.writeframes(b"".join(
            struct.pack("<h", max(-32768, min(32767, int(s * 32767)))) for s in samples))
    return blob.getvalue()


def find_system_player():
    """Return a (program, args) player recipe or None when nothing plays WAVs."""
    for program, args in (("afplay", []), ("aplay", ["-q"]), ("paplay", []),
                          ("play", ["-q"]), ("pw-play", [])):
        if shutil.which(program):
            return (program, list(args))
    return None


class AudioBackend:
    name = "base"

    def available(self):
        return True

    def play(self, event):
        raise NotImplementedError

    def stats(self):
        return {"backend": self.name, "played": 0, "errors": 0}

    def shutdown(self):
        return None


class NullAudio(AudioBackend):
    name = "null"

    def __init__(self):
        self.played = 0

    def play(self, event):
        if event not in EVENTS:
            raise ValueError("unknown sound event: %r" % (event,))
        self.played += 1

    def stats(self):
        return {"backend": self.name, "played": self.played, "errors": 0}


class BellAudio(AudioBackend):
    """Audible everywhere: one BEL per event, written by the caller."""

    name = "bell"

    def __init__(self):
        self.played = 0
        self.errors = 0
        self.pending = []

    def play(self, event):
        if event not in EVENTS:
            raise ValueError("unknown sound event: %r" % (event,))
        try:
            self.pending.append("\a")
            self.played += 1
        except Exception:
            self.errors += 1

    def drain(self):
        out = "".join(self.pending)
        self.pending = []
        return out

    def stats(self):
        return {"backend": self.name, "played": self.played, "errors": self.errors}


class SynthAudio(AudioBackend):
    """Original synth voices through a real system player, never blocking."""

    name = "synth"

    def __init__(self, player=None, spawn=None):
        self._recipe = player if player is not None else find_system_player()
        self._spawn = spawn if spawn is not None else subprocess.Popen
        self.played = 0
        self.errors = 0
        self._cache = {}
        self._lock = threading.Lock()

    def available(self):
        return self._recipe is not None

    def _wav_for(self, event):
        with self._lock:
            blob = self._cache.get(event)
        if blob is None:
            blob = samples_to_wav_pcm(render_event(event))
            with self._lock:
                self._cache[event] = blob
        return blob

    def _fire(self, blob):
        try:
            program, args = self._recipe
            proc = self._spawn([program] + args, stdin=subprocess.PIPE,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            proc.communicate(blob)
        except Exception:
            with self._lock:
                self.errors += 1

    def play(self, event):
        if event not in EVENTS:
            raise ValueError("unknown sound event: %r" % (event,))
        if self._recipe is None:
            with self._lock:
                self.errors += 1
            return
        blob = self._wav_for(event)
        worker = threading.Thread(target=self._fire, args=(blob,), daemon=True)
        worker.start()
        with self._lock:
            self.played += 1

    def stats(self):
        with self._lock:
            return {"backend": self.name, "played": self.played, "errors": self.errors}


def make_audio(name, spawn=None):
    """Build an audio backend by name. Raises ValueError on unknown names."""
    key = str(name).strip().lower()
    if key == "null":
        return NullAudio()
    if key == "bell":
        return BellAudio()
    if key == "synth":
        return SynthAudio(spawn=spawn)
    raise ValueError("unknown audio: %r (want null/bell/synth)" % (name,))


def select_audio(preference=None, spawn=None):
    """Pick the requested backend, degrading synth to bell with no player."""
    if preference is None or str(preference).strip().lower() == "auto":
        synth = SynthAudio(spawn=spawn)
        return synth if synth.available() else BellAudio()
    backend = make_audio(preference, spawn=spawn)
    if backend.name == "synth" and not backend.available():
        return BellAudio()
    return backend
