"""Ghost actors: personalities, wave clock, fright, house exits, eyes.

Clean-room rule: every behavior below is authored for this project from
genre-level descriptions (four ghosts with distinct chase styles, alternating
scatter/chase waves, power-pellet fright with escalating chain bonuses, a
dot-counter house exit, a tunnel slowdown, an endgame leader enrage). No
copied tables, no copied code.

Roles (index, name, chase style, scatter corner):
  0 chaser   - targets the player tile directly; enrages late-level (Elroy).
  1 ambusher - targets 4 tiles ahead of the player's heading.
  2 flanker  - targets the mirror of the chaser across a pivot 2 tiles
               ahead of the player (pincer movement).
  3 drifter  - targets the player while far, retreats to its scatter
               corner when close (within DRIFTER_SHY_TILES).

Steering: at every tile center each active ghost picks the walkable exit
(except direct reversal) minimizing squared Euclidean distance from the
neighbor tile to its target; ties break in DIRS priority order (up, left,
down, right), which keeps replays identical everywhere. Reversal happens
only on wave switches and fright starts, never mid-corridor. In fright the
choice is uniform-random from the seeded "fright" stream instead.

States: house (waiting on a dot counter), leaving (scripted walk out of
the house through the door), active (hunting), eyes (returning to the
house after being eaten, then reviving on arrival).
"""

from . import tuning
from .actors import Actor, DIRS, LEFT, center_of, opposite, step_actor, tile_of
from .maze import (
    GHOST_DOOR_TILE,
    GHOST_OUTSIDE_TILE,
    HEIGHT,
    HOUSE,
    DOOR,
    HOUSE_SLOTS,
    SCATTER_CORNERS,
    TUNNEL_ROW,
    WIDTH,
)

NAMES = ("chaser", "ambusher", "flanker", "drifter")

DRIFTER_SHY_TILES = 8.0  # drifter retreats inside this Euclidean distance
AHEAD_AMBUSH = 4  # ambusher lookahead in tiles
AHEAD_FLANK = 2  # flanker pivot lookahead in tiles
COLLIDE_DIST = 0.55  # player-ghost touch distance in tiles
CENTER_SNAP = 0.09  # tile-center decision window in tiles
EYES_SPEED_FRACTION = 1.5  # eyes return faster than cruise
LEAVING_SPEED_FRACTION = 0.55  # scripted house exit pace


class Ghost:
    __slots__ = ("index", "name", "actor", "state", "counter", "scatter",
                 "decided")

    def __init__(self, index, x, y, direction, speed, state, counter):
        self.index = index
        self.name = NAMES[index]
        self.actor = Actor(x, y, direction, speed)
        self.state = state  # house | leaving | active | eyes
        self.counter = counter  # dots still owed before leaving
        self.scatter = SCATTER_CORNERS[index]
        # Last tile where tile-center steering ran (None = undecided).
        # Steering must fire ONCE per tile visit: re-snapping every tick
        # while still inside the decision window undoes each stride and
        # pins the ghost in place forever (strides are shorter than the
        # window at 120 Hz), so the gate below is load-bearing.
        self.decided = None

    def state_tuple(self):
        p = self.actor.state_tuple()
        return (self.state, self.counter, p[0], p[1], p[2], p[3])


def _ahead(tile, direction, n):
    return (tile[0] + direction[0] * n, tile[1] + direction[1] * n)


def _dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


class Ghosts:
    """Owns the four ghosts plus the shared wave/fright/house clocks."""

    def __init__(self, level, maze, rng, speed_mult=1.0):
        self._fright_rng = rng.fork("fright")
        self.speed_mult = float(speed_mult)
        self.reset(level, maze)

    # -- lifecycle ----------------------------------------------------
    def reset(self, level, maze):
        self.level = level
        self.maze = maze
        counters = tuning.house_counters(level)
        self.ghosts = []
        for i in range(4):
            if i == 0:
                cx, cy = center_of(*GHOST_OUTSIDE_TILE)
                state = "active"
            else:
                cx, cy = center_of(*HOUSE_SLOTS[i - 1])
                state = "house"
            self.ghosts.append(Ghost(i, cx, cy, LEFT, 0.0, state, counters[i]))
        self.waves = tuning.wave_schedule(level)
        self.wave_idx = 0
        self.wave_phase = "scatter"  # scatter | chase
        self.wave_t = 0.0
        self.fright_t = 0.0
        self.fright_total = 0.0
        self.idle_t = 0.0
        self.eaten_this_fright = 0

    # -- clocks -------------------------------------------------------
    @property
    def fright_active(self):
        return self.fright_t > 0.0

    @property
    def fright_flashing(self):
        return self.fright_active and self.fright_t <= tuning.FRIGHT_FLASH_THRESHOLD

    def elroy_stage(self):
        """0 calm, 1 enraged, 2 enraged plus scatter-skipping."""
        left = self.maze.dots_remaining + self.maze.energizers_remaining
        stage = 0
        for dots_left, _bonus, _skip in tuning.ELROY_STAGES:
            if left <= dots_left:
                stage += 1
        return stage

    def wave_mode(self):
        """Current global mode; fright overrides, late Elroy forces chase."""
        if self.fright_active:
            return "fright"
        if self.elroy_stage() >= 2:
            return "chase"
        return self.wave_phase

    def start_fright(self, duration):
        if duration <= 0:
            return
        self.fright_t = duration
        self.fright_total = duration
        self.eaten_this_fright = 0
        self._reverse_all()

    def notify_dots(self, n):
        """Feed eaten dots into the house-exit counters, one dot at a time.

        Each dot resets the idle timer and decrements the lowest-index
        waiting ghost; a counter reaching zero walks that ghost out. Feeding
        dots one by one (instead of dumping a whole batch onto one ghost)
        keeps multi-dot feeds ordered across the house.
        """
        for _ in range(max(0, int(n))):
            self.idle_t = 0.0
            waiting = self._waiting()
            if not waiting:
                return
            ghost = min(waiting, key=lambda g: g.index)
            ghost.counter -= 1
            if ghost.counter <= 0:
                ghost.counter = 0
                self._start_leaving(ghost)

    # -- per-tick -----------------------------------------------------
    def step(self, dt, game):
        """Advance clocks, move ghosts, resolve collisions. Returns events."""
        events = []
        player = game.player
        player_tile = tile_of(player.x, player.y)

        if self.fright_active:
            self.fright_t -= dt
            if self.fright_t <= 0.0:
                self.fright_t = 0.0
                game.reset_fright_chain()
                events.append("fright-end")
        else:
            self._step_wave(dt)

        self.idle_t += dt
        if self.idle_t >= tuning.HOUSE_IDLE_TIMEOUT_S:
            waiting = self._waiting()
            if waiting:
                self._start_leaving(min(waiting, key=lambda g: g.index))
                self.idle_t = 0.0

        dots_left = self.maze.dots_remaining + self.maze.energizers_remaining
        for ghost in self.ghosts:
            self._move_ghost(ghost, dt, player, player_tile, dots_left)

        for ghost in self.ghosts:
            if ghost.state != "active":
                continue
            gx, gy = ghost.actor.x, ghost.actor.y
            same_tile = tile_of(gx, gy) == player_tile
            near = (gx - player.x) ** 2 + (gy - player.y) ** 2 < COLLIDE_DIST**2
            if not (same_tile or near):
                continue
            if self.fright_active:
                ghost.state = "eyes"
                points = game.notify_ghost_eaten()
                self.eaten_this_fright += 1
                events.append("ghost-eaten:%s:%d" % (ghost.name, points))
            else:
                game.kill_player()
                events.append("caught:%s" % ghost.name)
                break
        return events

    # -- wave clock ---------------------------------------------------
    def _step_wave(self, dt):
        scatter_s, chase_s = self.waves[min(self.wave_idx, len(self.waves) - 1)]
        budget = scatter_s if self.wave_phase == "scatter" else chase_s
        self.wave_t += dt
        if self.wave_t >= budget:
            self.wave_t = 0.0
            if self.wave_phase == "scatter":
                self.wave_phase = "chase"
            else:
                self.wave_phase = "scatter"
                if self.wave_idx < len(self.waves) - 1:
                    self.wave_idx += 1
            self._reverse_all()

    def _reverse_all(self):
        for ghost in self.ghosts:
            if ghost.state == "active":
                ghost.actor.want = opposite(ghost.actor.dir)
                # A reversal mid-tile must re-decide at the next tile
                # center even if it is a tile already decided for: clear
                # the gate so steering runs again on arrival.
                ghost.decided = None

    # -- house --------------------------------------------------------
    def _waiting(self):
        return [g for g in self.ghosts if g.state == "house"]

    def _start_leaving(self, ghost):
        if ghost.state == "house":
            ghost.state = "leaving"
            ghost.decided = None

    def _step_leaving(self, ghost, dt):
        """L-shaped walk: first to the door column, then up and out."""
        home_cx, _ = center_of(13, 14)
        out_cx, out_cy = center_of(*GHOST_OUTSIDE_TILE)
        actor = ghost.actor
        actor.speed = self._cruise() * LEAVING_SPEED_FRACTION
        if abs(actor.x - home_cx) > 0.06:
            actor.dir = actor.want = LEFT if actor.x > home_cx else (1, 0)
            step_actor(self.maze, actor, dt, for_ghost=True)
        else:
            actor.dir = actor.want = (0, -1)
            step_actor(self.maze, actor, dt, for_ghost=True)
            if tile_of(actor.x, actor.y) == GHOST_OUTSIDE_TILE \
                    or (actor.tile[0] == GHOST_OUTSIDE_TILE[0]
                        and actor.y < out_cy + 0.05):
                actor.x, actor.y = out_cx, out_cy
                actor.dir = actor.want = LEFT
                ghost.state = "active"

    # -- movement -----------------------------------------------------
    def _cruise(self):
        return tuning.player_speed(self.level) * tuning.GHOST_SPEED_FRACTION * self.speed_mult

    def _speed_for(self, ghost, dots_left):
        base = tuning.player_speed(self.level)
        if ghost.state == "eyes":
            return base * EYES_SPEED_FRACTION
        if self.fright_active and ghost.state == "active":
            return base * tuning.FRIGHT_GHOST_FRACTION * self.speed_mult
        if self.maze.is_tunnel(*tile_of(ghost.actor.x, ghost.actor.y)):
            return base * tuning.GHOST_TUNNEL_FRACTION * self.speed_mult
        speed = base * tuning.GHOST_SPEED_FRACTION
        if ghost.index == 0:
            for threshold, bonus, _skip in tuning.ELROY_STAGES:
                if dots_left <= threshold:
                    speed += base * bonus
        return speed * self.speed_mult

    def _target_for(self, ghost, player, player_tile):
        mode = self.wave_mode()
        if ghost.state == "eyes":
            return GHOST_DOOR_TILE
        if mode == "fright" or ghost.state != "active":
            return None  # random steering / scripted paths
        if mode == "scatter":
            return ghost.scatter
        pdir = player.dir
        if ghost.index == 0:
            return player_tile
        if ghost.index == 1:
            return _ahead(player_tile, pdir, AHEAD_AMBUSH)
        if ghost.index == 2:
            pivot = _ahead(player_tile, pdir, AHEAD_FLANK)
            chaser = tile_of(self.ghosts[0].actor.x, self.ghosts[0].actor.y)
            return (2 * pivot[0] - chaser[0], 2 * pivot[1] - chaser[1])
        # drifter: hunt while far, retreat to corner when close
        gx, gy = tile_of(ghost.actor.x, ghost.actor.y)
        if _dist2((gx, gy), player_tile) ** 0.5 >= DRIFTER_SHY_TILES:
            return player_tile
        return ghost.scatter

    def _exits(self, tile):
        tx, ty = tile
        return [d for d in DIRS if self.maze.is_walkable(tx + d[0], ty + d[1], for_ghost=True)]

    def _choose(self, ghost, target, random_pick):
        actor = ghost.actor
        tile = tile_of(actor.x, actor.y)
        exits = self._exits(tile)
        if not exits:
            return None
        back = opposite(actor.dir)
        forward = [d for d in exits if d != back] or [back]
        if random_pick:
            return self._fright_rng.choice(forward)
        best, best_key = None, None
        for d in DIRS:  # fixed priority order breaks ties deterministically
            if d not in forward:
                continue
            nxt = (tile[0] + d[0], tile[1] + d[1])
            # tunnel wrap for scoring: an off-grid mouth maps across
            nx = nxt[0]
            if tile[1] == TUNNEL_ROW:
                if nx < 0:
                    nx = WIDTH - 1
                elif nx >= WIDTH:
                    nx = 0
            key = _dist2((nx, nxt[1]), target)
            if best_key is None or key < best_key:
                best, best_key = d, key
        return best if best is not None else forward[0]

    def _move_ghost(self, ghost, dt, player, player_tile, dots_left):
        actor = ghost.actor
        if ghost.state == "house":
            actor.speed = 0.0
            return
        if ghost.state == "leaving":
            self._step_leaving(ghost, dt)
            return
        if ghost.state == "eyes" and self._eyes_home(actor):
            out_cx, out_cy = center_of(*GHOST_OUTSIDE_TILE)
            actor.x, actor.y = out_cx, out_cy
            actor.dir = actor.want = LEFT
            ghost.state = "active"
            ghost.decided = None
            return
        actor.speed = self._speed_for(ghost, dots_left)
        target = self._target_for(ghost, player, player_tile)
        tile = tile_of(actor.x, actor.y)
        cx, cy = center_of(*tile)
        near = abs(cx - actor.x) + abs(cy - actor.y) <= CENTER_SNAP
        # Decide at most once per tile visit. Strides at 120 Hz are shorter
        # than CENTER_SNAP, so deciding on every near tick would snap the
        # ghost back to the center each tick and freeze it in place; the
        # decided gate lets each stride accumulate into real travel while
        # still steering at every newly entered tile center.
        if near and ghost.decided != tile \
                and self.maze.is_walkable(*tile, for_ghost=True):
            actor.x, actor.y = cx, cy
            if ghost.state == "eyes":
                pick = self._choose(ghost, target, random_pick=False)
            elif self.fright_active:
                pick = self._choose(ghost, None, random_pick=True)
            else:
                pick = self._choose(ghost, target, random_pick=False)
            if pick is not None:
                actor.dir = actor.want = pick
            ghost.decided = tile
        step_actor(self.maze, actor, dt, for_ghost=True)

    def _eyes_home(self, actor):
        tx, ty = tile_of(actor.x, actor.y)
        if (tx, ty) == GHOST_OUTSIDE_TILE:
            return True
        try:
            ch = self.maze.tile(tx, ty)
        except IndexError:
            return False
        return ch in (DOOR, HOUSE)

    # -- determinism --------------------------------------------------
    def canonical(self):
        parts = [
            self.wave_mode(), str(self.wave_idx),
            "%.3f" % self.wave_t, "%.3f" % self.fright_t,
            str(self.elroy_stage()),
        ]
        for ghost in self.ghosts:
            st = ghost.state_tuple()
            parts.append("%s|%d|%.4f|%.4f|%d|%d|%s" % (st + (ghost.decided,)))
        return ";".join(parts)
