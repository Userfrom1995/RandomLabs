"""Bonus fruit: deterministic spawn, expiry, and tile pickup.

Two fruits appear per level once the player has eaten enough dots (tuning
thresholds), sitting on the corridor tile just below the ghost house. Each
fruit lives a fixed number of seconds: eat it by walking over its tile for
the level's tier points, or it expires. All numbers come from tuning; this
module owns only the state machine. Fruit state is part of the canonical
game hash, and it uses no randomness, so replays stay bit-identical.
"""

from engine import tuning

# Corridor tile just below the ghost house (walkable plain-adjacent '.').
FRUIT_TILE = (13, 17)


class Fruit:
    """One level's fruit lifecycle: armed -> active -> eaten/expired."""

    def __init__(self, level=1):
        self.reset(level)

    def reset(self, level):
        self.level = int(level)
        self.spawned = [False] * len(tuning.FRUIT_SPAWN_DOTS_EATEN)
        self.active = False
        self.points = 0
        self.time_left = 0.0

    @property
    def tile(self):
        return FRUIT_TILE

    def notify_dots(self, dots_eaten):
        """Arm-check after dots are eaten. Returns True when a fruit spawns."""
        spawned = False
        for idx, threshold in enumerate(tuning.FRUIT_SPAWN_DOTS_EATEN):
            if not self.spawned[idx] and dots_eaten >= threshold:
                self.spawned[idx] = True
                self.active = True
                self.points = tuning.fruit_points(self.level)
                self.time_left = tuning.FRUIT_LIFETIME_S
                spawned = True
        return spawned

    def step(self, dt):
        """Tick the expiry clock. Returns True exactly once when it expires."""
        if not self.active:
            return False
        self.time_left -= dt
        if self.time_left <= 0.0:
            self.active = False
            self.time_left = 0.0
            self.points = 0
            return True
        return False

    def try_eat(self, tile):
        """Eat the fruit standing on a tile. Returns points (0 when none)."""
        if self.active and tuple(tile) == FRUIT_TILE:
            points = self.points
            self.active = False
            self.time_left = 0.0
            self.points = 0
            return points
        return 0

    def canonical(self):
        return "%d|%d|%.3f|%s" % (
            self.points, len([s for s in self.spawned if s]),
            max(self.time_left, 0.0), "1" if self.active else "0")
