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
from engine import modes as game_modes
from engine.actors import DOWN, LEFT, RIGHT, UP
from engine.game import Game
from render.scene import COLS, ROWS, paint
from render.themes import check as check_theme
from shell import screens
from shell.audio import BellAudio
from shell.input import CONFIRM, DOWN as A_DOWN, LEFT as A_LEFT, PAUSE, QUIT, RESTART
from shell.input import RIGHT as A_RIGHT, UP as A_UP, decode_stream
from shell.scores import ScoreTable, clean_name
from shell.terminal import check_size

TITLE, PLAYING, PAUSED, OVER, ENTER_NAME = "title", "playing", "paused", "over", "enter-name"
DIR_OF = {A_UP: UP, A_DOWN: DOWN, A_LEFT: LEFT, A_RIGHT: RIGHT}
DOT_SOUND_TICKS = 10
MAX_CATCHUP_TICKS = 40
NAME_MAX = 10


class ShellState:
    """Screen flows and event-to-sound mapping. No I/O, fully testable."""

    def __init__(self, seed=1, level=1, keymap=None, audio=None, mode="classic",
                 theme="classic", reduced_flash=False, scores=None, player_name="ACE"):
        from shell.input import Keymap
        game_modes.check(mode)
        check_theme(theme)
        self.seed = int(seed)
        self.level = int(level)
        self.keymap = keymap or Keymap()
        self.audio = audio
        self.mode = mode
        self.theme = theme
        self.reduced_flash = bool(reduced_flash)
        self.scores = scores if scores is not None else ScoreTable()
        self.player_name = clean_name(player_name)
        self.screen = TITLE
        self.game = None
        self.exited = False
        self.leftover = b""
        self.name_buffer = ""
        self._seen_events = 0
        self._last_dot_tick = -DOT_SOUND_TICKS

    def start_run(self):
        self.game = Game(seed=self.seed, level=self.level, mode=self.mode)
        self._seen_events = len(self.game.events)
        self._last_dot_tick = -DOT_SOUND_TICKS
        self.name_buffer = ""
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

    # -- high-score name entry --------------------------------------
    def handle_entry_bytes(self, data):
        """Consume raw bytes as pilot-name typing. Ctrl-C quits, Esc skips."""
        for byte in bytes(data):
            if byte == 0x03:  # Ctrl-C
                self.exited = True
                return
            if byte in (0x1b,):  # Esc: keep the score anonymous, show table
                self._finish_entry(save=False)
                return
            if byte in (0x0d, 0x0a):  # Enter: save and show the table
                self._finish_entry(save=True)
                return
            if byte in (0x7f, 0x08):  # Backspace/Delete
                self.name_buffer = self.name_buffer[:-1]
                continue
            ch = chr(byte)
            if (ch.isascii() and ch.isprintable() and ch != " "
                    and len(self.name_buffer) < NAME_MAX):
                self.name_buffer += ch.upper()

    def _finish_entry(self, save):
        if save and self.game is not None:
            self.player_name = clean_name(self.name_buffer)
            self.scores.add(self.player_name, self.game.score,
                            level=self.game.level, mode=self.mode)
        self.name_buffer = ""
        self.screen = OVER

    def _ingest(self, event):
        if event == "dot":
            if self.game.tick_count - self._last_dot_tick >= DOT_SOUND_TICKS:
                self._last_dot_tick = self.game.tick_count
                self._sound("dot")
        elif event == "energizer":
            self._sound("energizer")
        elif event.startswith("ghost:"):
            self._sound("ghost")
        elif event.startswith("fruit:"):
            self._sound("fruit")
        elif event == "death":
            self._sound("death")
        elif event == "extra-life":
            self._sound("extra-life")
        elif event == "game-over":
            self._sound("game-over")
        elif event == "time-up":
            self._sound("game-over")
        elif event.startswith("sprint-clear:"):
            self._sound("level-clear")
        elif event == "maze-refill":
            self._sound("level-clear")
        elif event.startswith("level:"):
            self._sound("level-clear")

    def step_play(self, dt):
        """Advance the run one slice; flip to game-over when the run ends."""
        events = self.game.step(dt)
        for event in events[self._seen_events:]:
            self._ingest(event)
        self._seen_events = len(events)
        if self.game.state == "over" and self.screen == PLAYING:
            if self.scores.qualifies(self.game.score):
                self.name_buffer = ""
                self.screen = ENTER_NAME
            else:
                self.screen = OVER

    def paint(self):
        if self.screen == TITLE:
            top = self.scores.entries[0] if self.scores.entries else None
            return screens.paint_title(self.keymap, mode=self.mode,
                                       theme=self.theme, top=top)
        if self.screen == ENTER_NAME and self.game is not None:
            base = paint(self.game, theme=self.theme,
                         reduced_flash=self.reduced_flash)
            return screens.paint_name_entry(base, self.name_buffer, self.game.score)
        game = self.game if self.game is not None else Game(seed=self.seed, level=self.level)
        base = paint(game, theme=self.theme, reduced_flash=self.reduced_flash)
        if self.screen == PAUSED:
            return screens.paint_pause(base)
        if self.screen == OVER:
            reason = getattr(game, "over_reason", None)
            return screens.paint_over(base, game.score, reason=reason)
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
            if app.screen == ENTER_NAME:
                app.handle_entry_bytes(raw)  # pilot-name typing, not gameplay
                actions = []
            else:
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
