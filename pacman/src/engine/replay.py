"""Input logs plus state hashes: determinism proofs.

A recording is (seed, level, inputs) where inputs is a list of
(tick_index, direction). Replaying applies each buffered direction at the
start of its tick and compares the final state hash. Identical inputs must
reproduce the hash bit-for-bit on any machine; that is the parity gate every
backend and every future phase must preserve.
"""

from .actors import LEFT, RIGHT, UP, DOWN
from .game import Game

VALID_DIRS = {"up": UP, "down": DOWN, "left": LEFT, "right": RIGHT}


def parse_dir(name):
    try:
        return VALID_DIRS[name.strip().lower()]
    except (KeyError, AttributeError):
        raise ValueError("unknown direction: %r (want up/down/left/right)" % (name,))


def run_recording(seed, inputs, ticks, level=1, mode="classic"):
    """Run a headless game; returns (final_hash, events)."""
    game = Game(seed=seed, level=level, mode=mode)
    by_tick = {}
    for tick_index, direction in inputs:
        by_tick.setdefault(int(tick_index), direction)
    from . import tuning
    for tick in range(int(ticks)):
        if tick in by_tick:
            game.set_want(by_tick[tick])
        game.step(tuning.STEP)
    return game.state_hash(), list(game.events), game


def verify_recording(seed, inputs, ticks, expected_hash, level=1, mode="classic"):
    """Re-run and compare. Returns (ok, actual_hash)."""
    actual, _, _ = run_recording(seed, inputs, ticks, level=level, mode=mode)
    return actual == expected_hash, actual
