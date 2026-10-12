"""Seeded PRNG with split streams.

Simulation determinism rule: visual-only changes must never alter simulation
hashes. Each subsystem (movement jitter, fruit timing, fright choice) draws
from its own named stream forked from one master seed, so adding a new
consumer cannot shift the sequence of an existing one. Name mixing uses
SHA-256, never the salted builtin hash(), so streams are identical across
processes and machines.
"""

import hashlib

_MASK32 = 0xFFFFFFFF


class RngStream:
    """One deterministic 32-bit stream (mulberry32, in-repo, 20 lines)."""

    __slots__ = ("state",)

    def __init__(self, seed):
        self.state = int(seed) & _MASK32

    def next_u32(self):
        # Textbook mulberry32: advance then temper.
        self.state = (self.state + 0x6D2B79F5) & _MASK32
        z = self.state
        z = ((z ^ (z >> 15)) * (z | 1)) & _MASK32
        z ^= z + (((z ^ (z >> 7)) * (z | 61)) & _MASK32)
        return ((z ^ (z >> 14)) & _MASK32)

    def randrange(self, n):
        if n <= 0:
            raise ValueError("randrange needs n >= 1")
        return self.next_u32() % n

    def choice(self, seq):
        if not seq:
            raise ValueError("choice needs a non-empty sequence")
        return seq[self.randrange(len(seq))]

    def random(self):
        return self.next_u32() / 4294967296.0


def _splitmix32(seed):
    seed = (seed + 0x9E3779B9) & _MASK32
    z = seed
    z = ((z ^ (z >> 16)) * 0x21F0AAAD) & _MASK32
    z = ((z ^ (z >> 15)) * 0x735A2D97) & _MASK32
    return ((z ^ (z >> 15)) & _MASK32) or 1


class Rng:
    """Master seed with forkable named subsystem streams."""

    def __init__(self, seed):
        self.seed = int(seed) & _MASK32
        self._streams = {}

    def fork(self, name):
        if name not in self._streams:
            digest = hashlib.sha256(str(name).encode("utf-8")).digest()
            mixed = _splitmix32((self.seed ^ int.from_bytes(digest[:4], "little")) & _MASK32)
            self._streams[name] = RngStream(mixed)
        return self._streams[name]
