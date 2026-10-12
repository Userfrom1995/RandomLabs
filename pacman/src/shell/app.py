"""Interactive shell: screen flows plus the fixed-timestep play loop.

ShellState is the pure flow machine (title, playing, pause, restart,
game-over) driven by decoded actions; run() wires it to a RawTerminal, a
TieredRenderer, and an audio backend. Pause genuinely freezes the
simulation (no stepping while paused), restart builds a fresh Game, and
the loop exits only through quit or EOF. Sounds follow real game events
with dot chirps throttled to one per 10 ticks so sirens stay intelligible.
"""

import time

from engine import tuning
from engine.actors import DOWN, LEFT, RIGHT, UP
from engine.game import Game
from render.scene import COLS, ROWS, paint
from shell import screens
from shell.audio import BellAudio
from shell.input import CONFIRM, DOWN as A_DOWN, LEFT as A_LEFT, PAUSE, QUIT, RESTART
from shell.input import RIGHT as A_RIGHT, UP as A_UP, decode_stream
from shell.terminal import check_size

TITLE, PLAYING, PAUSED, OVER = "title", "playing", "paused", "over"
DIR_OF = {A_UP: UP, A_DOWN: DOWN, A_LEFT: LEFT, A_RIGHT: RIGHT}
DOT_SOUND_TICKS = 10
MAX_CATCHUP_TICKS = 40


class ShellState:
    """Screen flows and event-to-sound mapping. No I/O, fully testable."""

    def __init__(self, seed=1, level=1, keymap=None, audio=None):
        from shell.input import Keymap
        self.seed = int(seed)
        self.level = int(level)
        self.keymap = keymap or Keymap()
        self.audio = audio
        self.screen = TITLE
        self.game = None
        self.exited = False
        self.leftover = b""
        self._seen_events = 0
        self._last_dot_tick = -DOT_SOUND_TICKS

    def start_run(self):
        self.game = Game(seed=self.seed, level=self.level)
        self._seen_events = len(self.game.events)
        self._last_dot_tick = -DOT_SOUND_TICKS
        self.screen = PLAYING

    def _sound(self, event):
        if self.audio is not None:
            self.audio.play(event)

    def on_action(self, action):
        if action in DIR_OF:
            if self.screen == PLAYING and self.game is not None:
                self.game.set_want(DIR_OF[action])
            return
        if action == QUIT:
            self.exited = True
            return
        if self.screen == TITLE:
            if action in (CONFIRM, RESTART):
                self.start_run()
        elif self.screen == PLAYING:
            if action == PAUSE:
                self.screen = PAUSED
            elif action == RESTART:
                self.start_run()
        elif self.screen == PAUSED:
            if action in (PAUSE, CONFIRM):
                self.screen = PLAYING
            elif action == RESTART:
                self.start_run()
        elif self.screen == OVER:
            if action in (CONFIRM, RESTART):
                self.start_run()

    def _ingest(self, event):
        if event == "dot":
            if self.game.tick_count - self._last_dot_tick >= DOT_SOUND_TICKS:
                self._last_dot_tick = self.game.tick_count
                self._sound("dot")
        elif event == "energizer":
            self._sound("energizer")
        elif event.startswith("ghost:"):
            self._sound("ghost")
        elif event == "death":
            self._sound("death")
        elif event == "extra-life":
            self._sound("extra-life")
        elif event == "game-over":
            self._sound("game-over")
        elif event.startswith("level:"):
            self._sound("level-clear")

    def step_play(self, dt):
        """Advance the run one slice; flip to game-over when the run ends."""
        events = self.game.step(dt)
        for event in events[self._seen_events:]:
            self._ingest(event)
        self._seen_events = len(events)
        if self.game.state == "over" and self.screen == PLAYING:
            self.screen = OVER

    def paint(self):
        if self.screen == TITLE:
            return screens.paint_title(self.keymap)
        game = self.game if self.game is not None else Game(seed=self.seed, level=self.level)
        base = paint(game)
        if self.screen == PAUSED:
            return screens.paint_pause(base)
        if self.screen == OVER:
            return screens.paint_over(base, game.score)
        return base


def run(app, term, renderer, write_out, fps=30, clock=None, sleep=None, max_frames=None):
    """Own the terminal until quit: poll, step, paint, present, pace."""
    clock = clock or time.monotonic
    sleep = sleep or time.sleep
    frames = 0
    write_out(renderer.init(COLS, ROWS))
    acc = 0.0
    last = clock()
    try:
        while not app.exited:
            frame_start = clock()
            raw = term.read_available()
            if raw is None:  # EOF on the input stream: leave cleanly
                break
            actions, app.leftover = decode_stream(app.leftover + raw, app.keymap)
            problem = check_size(*term.size(), COLS, ROWS)
            if problem is not None:
                for action in actions:
                    if action == QUIT:
                        app.exited = True
                fb = screens.paint_too_small(problem)
            else:
                for action in actions:
                    app.on_action(action)
                if app.screen == PLAYING and app.game is not None and not app.exited:
                    now = clock()
                    acc = min(acc + max(0.0, now - last), 0.25)
                    ticks = 0
                    while acc >= tuning.STEP and ticks < MAX_CATCHUP_TICKS:
                        acc -= tuning.STEP
                        app.step_play(tuning.STEP)
                        ticks += 1
                fb = app.paint()
            last = clock()
            write_out(renderer.present(fb, fb.dirty_cells()))
            if hasattr(app.audio, "drain"):
                write_out(app.audio.drain())
            frames += 1
            if max_frames is not None and frames >= max_frames:
                break
            pause = 1.0 / max(int(fps), 1) - (clock() - frame_start)
            if pause > 0:
                sleep(pause)
    finally:
        try:
            write_out(renderer.shutdown())
        except Exception:
            pass
        audio = getattr(app, "audio", None)
        if audio is not None:
            try:
                audio.shutdown()
            except Exception:
                pass
    return frames
