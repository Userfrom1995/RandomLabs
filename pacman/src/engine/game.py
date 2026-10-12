"""Headless deterministic game state: scoring, lives, level flow.

This module owns the pure simulation: fixed-timestep player movement, dot
and energizer pickup, bonus fruit, scoring chains, extra life,
death/respawn, level transitions, and the extra mode rulesets (time attack,
sprint, fright-frenzy via the modes module). It performs no I/O and
imports no I/O modules, so replays and benchmarks run identically
everywhere.

Ghost behavior and fright timing plug in through the events list and the
public hooks below (kill_player, notify_ghost_eaten).
"""

import hashlib

from . import tuning
from . import modes
from .actors import Actor, LEFT, tile_of, center_of
from .fruit import Fruit
from .ghosts import Ghosts
from .maze import Maze, PLAYER_START_TILE
from .rng import Rng


class Game:
    def __init__(self, seed=0, level=1, mode="classic"):
        if level < 1:
            raise ValueError("level must be >= 1")
        modes.check(mode)
        self.seed = int(seed)
        self.rng = Rng(self.seed)
        self.level = level
        self.mode = mode
        self.score = 0
        self.lives = modes.starting_lives(mode)
        self.tick_count = 0
        self.acc = 0.0
        self.events = []
        self.extra_life_given = False
        self.state = "play"  # play | dying | clearing | over | won(level cleared->next)
        self.state_t = 0.0
        self.over_reason = None  # defeat | timeout | cleared (set when over)
        self.elapsed = 0.0  # raced clock for sprint/time-attack
        self.time_left = modes.TIME_ATTACK_S if mode == "time-attack" else 0.0
        self.maze = Maze()
        self.ghosts_eaten_chain = 0
        self.fruit = Fruit(level)
        self._reset_positions()
        self._last_tile = tile_of(self.player.x, self.player.y)
        self._dots_seen = self.maze.dots_eaten
        self._eat_current_tile(initial=True)
        self._dots_seen = self.maze.dots_eaten

    # -- setup --------------------------------------------------------
    def _reset_positions(self):
        cx, cy = center_of(*PLAYER_START_TILE)
        self.player = Actor(cx, cy, LEFT, tuning.player_speed(self.level))
        self.player.want = LEFT
        if hasattr(self, "maze"):
            mult = modes.ghost_speed_multiplier(self.mode)
            if not hasattr(self, "ghosts"):
                self.ghosts = Ghosts(self.level, self.maze, self.rng, speed_mult=mult)
            else:
                self.ghosts.speed_mult = mult
                self.ghosts.reset(self.level, self.maze)
            self._dots_seen = self.maze.dots_eaten
        if hasattr(self, "fruit"):
            # Death or a fresh maze clears any uneaten fruit (documented).
            self.fruit.reset(self.level)

    # -- public control -----------------------------------------------
    def set_want(self, direction):
        self.player.want = direction

    def kill_player(self):
        """Start the death sequence (called by collision logic)."""
        if self.state != "play":
            return
        self.state = "dying"
        self.state_t = 0.0
        self.events.append("death")

    def notify_ghost_eaten(self):
        """Score a ghost eaten during fright; chains 200/400/800/1600."""
        if self.state != "play":
            return 0
        idx = min(self.ghosts_eaten_chain, len(tuning.GHOST_CHAIN_SCORE) - 1)
        points = tuning.GHOST_CHAIN_SCORE[idx]
        self.ghosts_eaten_chain += 1
        self._add_score(points)
        self.events.append("ghost:%d" % points)
        return points

    def reset_fright_chain(self):
        self.ghosts_eaten_chain = 0

    # -- simulation ---------------------------------------------------
    def step(self, dt, want=None):
        """Advance by dt seconds (any positive dt; fixed 120 Hz inside)."""
        if dt <= 0:
            raise ValueError("dt must be positive")
        if want is not None:
            self.set_want(want)
        self.acc = min(self.acc + dt, 0.5)  # spiral-of-death clamp
        while self.acc >= tuning.STEP:
            self.acc -= tuning.STEP
            self._tick(tuning.STEP)
        return list(self.events)

    def _tick(self, dt):
        from .actors import step_actor
        self.tick_count += 1
        frame_events = []

        if self.state == "dying":
            self.state_t += dt
            if self.state_t >= tuning.DEATH_SEQUENCE_S:
                self.lives -= 1
                if self.lives < 0:
                    self.state = "over"
                    self.over_reason = "defeat"
                    frame_events.append("game-over")
                else:
                    self._reset_positions()
                    self._last_tile = tile_of(self.player.x, self.player.y)
                    self.state = "play"
                    frame_events.append("respawn")
            self.events.extend(frame_events)
            return

        if self.state == "clearing":
            self.state_t += dt
            if self.state_t >= tuning.LEVEL_CLEAR_SEQUENCE_S:
                self.level += 1
                self.maze = Maze()
                self._reset_positions()
                self._last_tile = tile_of(self.player.x, self.player.y)
                self._eat_current_tile(initial=True)
                self.state = "play"
                frame_events.append("level:%d" % self.level)
            self.events.extend(frame_events)
            return

        if self.state != "play":
            self.events.extend(frame_events)
            return

        if self.mode in ("sprint", "time-attack"):
            self.elapsed += dt
        if self.mode == "time-attack":
            self.time_left -= dt
            if self.time_left <= 0.0:
                self.time_left = 0.0
                self.state = "over"
                self.over_reason = "timeout"
                frame_events.append("time-up")
                self.events.extend(frame_events)
                return

        speed = tuning.player_speed(self.level) * modes.player_speed_multiplier(self.mode)
        if self.ghosts.fright_active:
            speed *= tuning.FRIGHT_PLAYER_FRACTION
        if self.maze.is_tunnel(*tile_of(self.player.x, self.player.y)):
            speed *= tuning.PLAYER_TUNNEL_FRACTION
        self.player.speed = speed
        step_actor(self.maze, self.player, dt)
        tile = tile_of(self.player.x, self.player.y)
        if tile != self._last_tile:
            self._last_tile = tile
            self._eat_current_tile()
        if self.maze.dots_eaten != self._dots_seen:
            self.ghosts.notify_dots(self.maze.dots_eaten - self._dots_seen)
            self._dots_seen = self.maze.dots_eaten
            if self.fruit.notify_dots(self.maze.dots_eaten):
                self.events.append("fruit")
        fruit_points = self.fruit.try_eat(tile)
        if fruit_points:
            self._add_score(fruit_points)
            self.events.append("fruit:%d" % fruit_points)
        if self.fruit.step(tuning.STEP):
            self.events.append("fruit-expired")
        if self.state == "play":  # eating may have triggered fright; ghosts move
            self.events.extend(self.ghosts.step(tuning.STEP, self))
        if self.maze.dots_remaining + self.maze.energizers_remaining == 0:
            self._on_maze_cleared(frame_events)
        self.events.extend(frame_events)

    def _on_maze_cleared(self, frame_events):
        if self.mode == "sprint":
            bonus = modes.sprint_bonus(self.elapsed)
            if bonus:
                self._add_score(bonus)
            self.state = "over"
            self.over_reason = "cleared"
            frame_events.append("sprint-clear:%d" % bonus)
        elif modes.refills_maze(self.mode):
            self.maze = Maze()
            self._reset_positions()
            self._last_tile = tile_of(self.player.x, self.player.y)
            self._eat_current_tile(initial=True)
            self._dots_seen = self.maze.dots_eaten
            frame_events.append("maze-refill")
        else:
            self.state = "clearing"
            self.state_t = 0.0
            frame_events.append("level-clear")

    def _eat_current_tile(self, initial=False):
        found = self.maze.eat_at(*self._last_tile)
        if found == "dot":
            self._add_score(tuning.DOT_SCORE)
            if not initial:
                self.events.append("dot")
        elif found == "energizer":
            self._add_score(tuning.ENERGIZER_SCORE)
            if not initial:
                self.events.append("energizer")
            if modes.has_fright(self.mode):
                self.reset_fright_chain()
                duration = tuning.fright_duration(self.level) * modes.fright_multiplier(self.mode)
                self.ghosts.start_fright(duration)

    def _add_score(self, points):
        before = self.score
        self.score += points
        if not self.extra_life_given and before < tuning.EXTRA_LIFE_AT <= self.score:
            self.extra_life_given = True
            self.lives += 1
            self.events.append("extra-life")

    # -- determinism --------------------------------------------------
    def canonical(self):
        p = self.player.state_tuple()
        parts = [
            str(self.seed), str(self.level), str(self.score), str(self.lives),
            str(self.tick_count), "%.4f" % p[0], "%.4f" % p[1],
            str(p[2]), str(p[3]), self.state,
            self.maze.dot_bytes().hex(),
            self.ghosts.canonical(),
            self.mode, self.fruit.canonical(),
            "%.3f" % self.elapsed, "%.3f" % self.time_left,
            str(self.over_reason),
        ]
        return "|".join(parts)

    def state_hash(self):
        return hashlib.sha256(self.canonical().encode("ascii")).hexdigest()

    @property
    def dots_left(self):
        return self.maze.dots_remaining + self.maze.energizers_remaining

    @property
    def fright_active(self):
        return self.ghosts.fright_active

    @property
    def fright_flashing(self):
        return self.ghosts.fright_flashing

    @property
    def running(self):
        return self.state in ("play", "dying", "clearing")
