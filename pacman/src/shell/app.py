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
from render import compose as composer
from render import layout as layout_mod
from render.scene import COLS, ROWS, paint
from render.themes import check as check_theme
from shell import screens
from shell import menus as menus_mod
from shell.audio import BellAudio
from shell.input import CONFIRM, DOWN as A_DOWN, LEFT as A_LEFT, PAUSE, QUIT, RESTART
from shell.input import RIGHT as A_RIGHT, UP as A_UP, decode_stream
from shell.input import MUTE as A_MUTE, HELP as A_HELP
from shell.scores import ScoreTable, clean_name
from shell.terminal import check_size

TITLE, PLAYING, PAUSED, OVER, ENTER_NAME = "title", "playing", "paused", "over", "enter-name"
HELP, SCORES, SETTINGS = "help", "scores", "settings"
DIR_OF = {A_UP: UP, A_DOWN: DOWN, A_LEFT: LEFT, A_RIGHT: RIGHT}
DOT_SOUND_TICKS = 10
MAX_CATCHUP_TICKS = 40
NAME_MAX = 10

HINTS = {
    TITLE: "up/down + ENTER menu   arrows/WASD move",
    PLAYING: "arrows/WASD move   P pause   M mute   ? help   R restart   Q quit",
    PAUSED: "up/down menu   P resume   R restart   Q quit",
    OVER: "up/down menu   ENTER play again   Q quit",
    ENTER_NAME: "type A-Z 0-9   ENTER saves   ESC skips",
    HELP: "P / ENTER back   Q quit",
    SCORES: "P / ENTER back   Q quit",
    SETTINGS: "up/down move   left/right change   P / ENTER back",
}


class ShellState:
    """Screen flows and event-to-sound mapping. No I/O, fully testable."""

    def __init__(self, seed=1, level=1, keymap=None, audio=None, mode="classic",
                 theme="classic", reduced_flash=False, scores=None, player_name="ACE",
                 scale_mode="auto", effects=True, config=None):
        from shell.input import Keymap
        game_modes.check(mode)
        check_theme(theme)
        from render.scale import check as check_scale
        check_scale(scale_mode)
        self.seed = int(seed)
        self.level = int(level)
        self.keymap = keymap or Keymap()
        self.audio = audio
        self.mode = mode
        self.theme = theme
        self.reduced_flash = bool(reduced_flash)
        self.scale_mode = scale_mode
        self.effects = bool(effects)
        self.scores = scores if scores is not None else ScoreTable()
        self.player_name = clean_name(player_name)
        self.screen = TITLE
        self.game = None
        self.exited = False
        self.leftover = b""
        self.name_buffer = ""
        self.muted = False
        self.help_from = TITLE
        self.settings_from = TITLE
        self.settings_index = 0
        self.config = config
        self.title_menu = menus_mod.title_menu()
        self.pause_menu = menus_mod.pause_menu()
        self.over_menu = menus_mod.over_menu()
        self._seen_events = 0
        self._last_dot_tick = -DOT_SOUND_TICKS

    def start_run(self):
        self.game = Game(seed=self.seed, level=self.level, mode=self.mode)
        self._seen_events = len(self.game.events)
        self._last_dot_tick = -DOT_SOUND_TICKS
        self.name_buffer = ""
        self.title_menu.reset()
        self.pause_menu.reset()
        self.over_menu.reset()
        self.screen = PLAYING

    def quit_to_title(self):
        self.title_menu.reset()
        self.screen = TITLE

    def _sound(self, event):
        if self.muted:
            return  # session mute: events still map, nothing audible
        if self.audio is not None:
            self.audio.play(event)

    def _persist_settings(self):
        """Write the live visual/mode settings back to the config file.

        Session-only when no config is bound (tests, headless probes);
        a failed save is soft (the game keeps playing with live values).
        """
        if self.config is None:
            return True
        from shell import settings as settings_mod
        try:
            self.config.update(settings_mod.snapshot(self))
            return bool(self.config.save())
        except (OSError, ValueError):
            return False

    def _activate(self, item, origin):
        """Run one menu item id. Returns nothing; mutates screen/mute/exit."""
        if item in (menus_mod.START, menus_mod.AGAIN, menus_mod.RESTART):
            self.start_run()
        elif item == menus_mod.RESUME:
            self.screen = PLAYING
        elif item == menus_mod.SOUND:
            self.muted = not self.muted
        elif item == menus_mod.SETTINGS:
            self.settings_from = origin
            self.settings_index = 0
            self.screen = SETTINGS
        elif item == menus_mod.HELP:
            self.help_from = origin
            self.screen = HELP
        elif item == menus_mod.SCORES:
            self.screen = SCORES
        elif item == menus_mod.TITLE:
            self.quit_to_title()
        elif item == menus_mod.QUIT:
            self.exited = True

    def on_action(self, action):
        if action == QUIT:
            self.exited = True
            return
        if action == A_MUTE:
            self.muted = not self.muted
            return
        if action == A_HELP:
            if self.screen in (TITLE, PLAYING, PAUSED, OVER, SETTINGS):
                self.help_from = self.screen
                self.screen = HELP
            return
        if action in DIR_OF:
            if self.screen == PLAYING and self.game is not None:
                self.game.set_want(DIR_OF[action])
            elif self.screen == SETTINGS:
                from shell import settings as settings_mod
                opts = list(settings_mod.OPTIONS)
                if action in (A_UP, A_DOWN):
                    self.settings_index = (self.settings_index +
                                           (-1 if action == A_UP else 1)) % len(opts)
                else:  # left/right cycles the selected option, then persists
                    settings_mod.cycle(self, opts[self.settings_index],
                                       -1 if action == A_LEFT else 1)
                    self._persist_settings()
            elif self.screen == TITLE and action in (A_UP, A_DOWN):
                self.title_menu.move(-1 if action == A_UP else 1)
            elif self.screen == PAUSED and action in (A_UP, A_DOWN):
                self.pause_menu.move(-1 if action == A_UP else 1)
            elif self.screen == OVER and action in (A_UP, A_DOWN):
                self.over_menu.move(-1 if action == A_UP else 1)
            return
        if self.screen == TITLE:
            if action == CONFIRM:
                self._activate(self.title_menu.current(), TITLE)
            elif action == RESTART:
                self.start_run()
        elif self.screen == PLAYING:
            if action == PAUSE:
                self.pause_menu.reset()
                self.screen = PAUSED
            elif action == RESTART:
                self.start_run()
        elif self.screen == PAUSED:
            if action == PAUSE:
                self.screen = PLAYING
            elif action == CONFIRM:
                self._activate(self.pause_menu.current(), PAUSED)
            elif action == RESTART:
                self.start_run()
        elif self.screen == OVER:
            if action in (CONFIRM, RESTART):
                if action == CONFIRM:
                    self._activate(self.over_menu.current(), OVER)
                else:
                    self.start_run()
        elif self.screen == HELP:
            if action in (CONFIRM, PAUSE):
                self.screen = self.help_from
        elif self.screen == SETTINGS:
            if action in (CONFIRM, PAUSE):
                self.screen = self.settings_from
        elif self.screen == SCORES:
            if action in (CONFIRM, PAUSE):
                self.screen = TITLE

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

    def paint(self, layout=None):
        """Render the current screen. Without a layout this is the legacy
        28x34 frame (all headless tests pin this path); with a layout from
        layout.compute() it is the full-terminal canvas frame."""
        cols = layout.frame_cols if layout is not None else COLS
        rows = layout.frame_rows if layout is not None else ROWS
        if self.screen == TITLE:
            top = self.scores.entries[0] if self.scores.entries else None
            return screens.paint_title(self.keymap, mode=self.mode,
                                       theme=self.theme, top=top,
                                       cols=cols, rows=rows,
                                       menu=self.title_menu.items,
                                       menu_index=self.title_menu.index,
                                       muted=self.muted)
        if self.screen == HELP:
            return screens.paint_help(self.keymap, cols=cols, rows=rows)
        if self.screen == SETTINGS:
            return screens.paint_settings(self, selected=self.settings_index,
                                          cols=cols, rows=rows)
        if self.screen == SCORES:
            return screens.paint_scores(self.scores.entries, cols=cols, rows=rows)
        if layout is None:
            if self.screen == ENTER_NAME and self.game is not None:
                base = paint(self.game, theme=self.theme,
                             reduced_flash=self.reduced_flash)
                return screens.paint_name_entry(base, self.name_buffer, self.game.score)
            game = self.game if self.game is not None else Game(seed=self.seed, level=self.level, mode=self.mode)
            base = paint(game, theme=self.theme, reduced_flash=self.reduced_flash)
            if self.screen == PAUSED:
                return screens.paint_pause(base, menu=self.pause_menu.items,
                                           menu_index=self.pause_menu.index,
                                           muted=self.muted, keymap=self.keymap)
            if self.screen == OVER:
                reason = getattr(game, "over_reason", None)
                return screens.paint_over(base, game.score, reason=reason,
                                          menu=self.over_menu.items,
                                          menu_index=self.over_menu.index,
                                          muted=self.muted, keymap=self.keymap)
            return base
        if self.screen == ENTER_NAME and self.game is not None:
            base = self._canvas(self.game, layout)
            return screens.paint_name_entry(base, self.name_buffer, self.game.score)
        game = self.game if self.game is not None else Game(seed=self.seed, level=self.level, mode=self.mode)
        base = self._canvas(game, layout)
        if self.screen == PAUSED:
            return screens.paint_pause(base, menu=self.pause_menu.items,
                                       menu_index=self.pause_menu.index,
                                       muted=self.muted, keymap=self.keymap)
        if self.screen == OVER:
            reason = getattr(game, "over_reason", None)
            return screens.paint_over(base, game.score, reason=reason,
                                      menu=self.over_menu.items,
                                      menu_index=self.over_menu.index,
                                      muted=self.muted, keymap=self.keymap)
        return base

    def _canvas(self, game, layout):
        """Fullscreen gameplay frame with per-screen status hints."""
        return composer.paint_full(
            game, layout, theme=self.theme,
            reduced_flash=self.reduced_flash, keymap=self.keymap,
            scores=self.scores, hint=HINTS.get(self.screen),
            effects=self.effects)


def canvas_layout(term_cols, term_rows, scale_mode="auto"):
    """Terminal size plus scale mode to a magnification-aware layout.

    Pure helper shared by the play loop and tests: picks the integer
    magnification, then places the scaled maze box plus side regions.
    Small windows still report fits=False for the too-small card.
    """
    from render import scale as scale_mod
    picked = scale_mod.choose(term_cols, term_rows, scale_mode)
    return layout_mod.compute_scaled(term_cols, term_rows,
                                     picked.maze_cols, picked.maze_rows)


def run(app, term, renderer, write_out, fps=30, clock=None, sleep=None, max_frames=None):
    """Own the terminal until quit: poll, step, paint, present, pace.

    Frames always match the live terminal size: the layout engine places
    the maze composition plus side regions, the composer paints that full
    canvas, and resizes re-layout and repaint from a clean slate (kitty
    placements do not move with the cursor on their own).
    """
    clock = clock or time.monotonic
    sleep = sleep or time.sleep
    frames = 0
    term_cols, term_rows = term.size()
    write_out(renderer.init(term_cols, term_rows, term_cols, term_rows))
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
            term_cols, term_rows = term.size()
            if (term_cols, term_rows) != (renderer.term_cols, renderer.term_rows):
                # Resize: re-layout the canvas and repaint from a clean slate.
                write_out(renderer.resize(term_cols, term_rows))
            problem = check_size(term_cols, term_rows, COLS, ROWS)
            if problem is not None:
                for action in actions:
                    if action == QUIT:
                        app.exited = True
                fb = screens.paint_too_small(problem, term_cols, term_rows)
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
                layout = canvas_layout(term_cols, term_rows,
                                       getattr(app, "scale_mode", "auto"))
                fb = app.paint(layout)
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
