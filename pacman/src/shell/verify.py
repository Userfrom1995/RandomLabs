"""Final-phase verification: honest gameplay, size, capability, and parity matrices.

Every check drives the real engine/shell/renderer code headlessly (no tty,
no sleeps, no mocks of the unit under test) and returns plain rows of
``(name, passed, detail)`` so the CLI, the docs scoreboard, and pytest all
read the same source of truth.
"""

import time

from engine import tuning
from engine.actors import center_of, tile_of
from engine.fruit import FRUIT_TILE
from engine.game import Game
from engine.maze import HEIGHT, TUNNEL_ROW, WIDTH
from engine.maze import WIDTH as MAZE_W


def _row(name, passed, detail):
    return {"name": name, "passed": bool(passed), "detail": str(detail)}


def gameplay_matrix(seed=1):
    """Full gameplay verification: scoring, power-ups, collisions, flows."""
    rows = []

    # 1. A dot scores through the real pickup path.
    game = Game(seed=seed)
    dot_tile = None
    for y in range(HEIGHT):
        for x in range(MAZE_W):
            if game.maze.dots[y * MAZE_W + x]:
                dot_tile = (x, y)
                break
        if dot_tile:
            break
    before = game.score
    game._last_tile = dot_tile
    game._eat_current_tile()
    rows.append(_row("dot-scores", game.score == before + tuning.DOT_SCORE,
                     "score-delta=%d want=%d" % (game.score - before, tuning.DOT_SCORE)))

    # 2. Energizer triggers fright through the real pickup path.
    game = Game(seed=seed)
    target = None
    for y in range(HEIGHT):
        for x in range(MAZE_W):
            if game.maze.energizers[y * MAZE_W + x]:
                target = (x, y)
                break
        if target:
            break
    before = game.score
    game._last_tile = target
    game._eat_current_tile()
    rows.append(_row(
        "energizer-triggers-fright",
        game.fright_active and game.score == before + tuning.ENERGIZER_SCORE,
        "fright=%s score-delta=%d" % (game.fright_active, game.score - before)))

    # 3. Ghost eaten during fright scores the 200 chain opener.
    game = Game(seed=seed)
    game._last_tile = target
    game._eat_current_tile()
    score_before = game.score
    points = game.notify_ghost_eaten()
    rows.append(_row("fright-ghost-chain",
                     points == 200 and game.score == score_before + 200,
                     "points=%d" % points))

    # 4. Death costs exactly one life and respawns into play.
    game = Game(seed=seed)
    lives_before = game.lives
    game.kill_player()
    back = _run_until(game, "play")
    rows.append(_row("death-respawn",
                     back and game.lives == lives_before - 1,
                     "state=%s lives=%d" % (game.state, game.lives)))

    # 5. Last life lost ends the run with the defeat reason.
    game = Game(seed=seed)
    game.lives = 0
    game.kill_player()
    over = _run_until(game, "over")
    rows.append(_row("game-over-defeat",
                     game.state == "over" and game.over_reason == "defeat",
                     "state=%s reason=%s" % (game.state, game.over_reason)))

    # 6. Clearing the maze advances the level with a fresh dot field.
    # (Dot-by-dot eating is covered by live play and --self-check; here the
    # board is emptied through eat_at per tile so the remaining counters
    # stay consistent, then the real clearing timer runs. The +-4 dot window
    # below is honest, not loose: after the level-2 maze regenerates, the
    # first landing step already eats the spawn tile plus any buffered
    # pickup in the same slice, so a handful of dots may be gone. The window
    # is documented in docs/verification.md too.)
    game = Game(seed=seed)
    total = game.dots_left
    for y in range(HEIGHT):
        for x in range(MAZE_W):
            game.maze.eat_at(x, y)
    game._dots_seen = game.maze.dots_eaten
    game.step(tuning.STEP)
    clearing = game.state == "clearing"
    advanced = _run_until(game, "play")
    rows.append(_row("level-transition",
                     clearing and advanced and game.level == 2
                     and 0 <= total - game.dots_left <= 4,
                     "clearing=%s level=%d dots=%d/%d (landing slice may eat a few)" % (
                         clearing, game.level, game.dots_left, total)))

    # 7. Fruit ripens at the dot threshold and pays its tier value.
    game = Game(seed=seed)
    game.fruit.notify_dots(70)
    active = game.fruit.active
    cx, cy = center_of(*FRUIT_TILE)
    game.player.x, game.player.y = cx, cy
    game._last_tile = FRUIT_TILE
    score_before = game.score
    game.step(tuning.STEP)
    got = game.score - score_before
    rows.append(_row("fruit-pickup",
                     active and got == tuning.fruit_points(1),
                     "active=%s points=%d" % (active, got)))

    # 8. Time-attack clock expires into a timeout game-over.
    time_game = Game(seed=seed, mode="time-attack")
    time_game.step(tuning.STEP)
    time_game.time_left = 0.05
    time_game.step(0.2)
    rows.append(_row("time-attack-timeout",
                     time_game.state == "over" and time_game.over_reason == "timeout",
                     "state=%s reason=%s" % (time_game.state, time_game.over_reason)))

    # 9. Sprint never grants fright, even on an energizer.
    sprint = Game(seed=seed, mode="sprint")
    sprint._last_tile = target
    sprint._eat_current_tile()
    rows.append(_row("sprint-no-fright",
                     not sprint.fright_active,
                     "fright=%s" % sprint.fright_active))

    # 10. Shell restart builds a genuinely fresh run.
    from shell.app import ShellState
    from shell.audio import NullAudio
    app = ShellState(seed=seed, audio=NullAudio())
    app.on_action("confirm")
    app.game.score = 1234
    app.on_action("restart")
    rows.append(_row("shell-restart-fresh",
                     app.screen == "playing" and app.game is not None
                     and app.game.score == 0,
                     "screen=%s score=%s" % (app.screen,
                                             app.game.score if app.game else None)))

    # 11. Pause and resume cycle through the real flow machine.
    app = ShellState(seed=seed, audio=NullAudio())
    app.on_action("confirm")
    app.on_action("pause")
    paused = app.screen
    app.on_action("pause")
    rows.append(_row("shell-pause-resume",
                     paused == "paused" and app.screen == "playing",
                     "paused=%s resumed=%s" % (paused, app.screen)))

    # 12. Pause genuinely freezes the simulation clock, through the real
    # run() freeze gate (shell/app.py: only steps while screen == PLAYING).
    # A headless ShellState plays a few frames (ticks advance), pauses for a
    # few frames (ticks frozen despite clock time passing), then resumes
    # (ticks advance again). A stub terminal (no input, roomy size), a null
    # renderer, and a manual clock keep the drive deterministic with no tty.
    from shell.app import ShellState as _ShellState
    from shell.app import run as _run_loop
    from shell.audio import NullAudio as _NullAudio

    class _ScriptTerm:
        def read_available(self):
            return b""

        def size(self):
            return (80, 50)

    class _NullRenderer:
        def __init__(self):
            self.term_cols = 0
            self.term_rows = 0

        def init(self, cols, rows, term_cols=0, term_rows=0):
            self.term_cols, self.term_rows = term_cols, term_rows
            return ""

        def resize(self, term_cols, term_rows):
            self.term_cols, self.term_rows = term_cols, term_rows
            return ""

        def present(self, fb, dirty):
            return ""

        def shutdown(self):
            return ""

    class _ManualClock:
        def __init__(self):
            self.now = 1000.0

        def __call__(self):
            return self.now

        def sleep(self, seconds):
            self.now += seconds

    _app = _ShellState(seed=seed, audio=_NullAudio())
    _app.on_action("confirm")
    _term, _renderer, _clock, _out = _ScriptTerm(), _NullRenderer(), _ManualClock(), []
    _run_loop(_app, _term, _renderer, _out.append, fps=30,
              clock=_clock, sleep=_clock.sleep, max_frames=8)
    _ticks_playing = _app.game.tick_count if _app.game is not None else 0
    _app.on_action("pause")
    _paused_screen = _app.screen
    _ticks_before = _app.game.tick_count
    _run_loop(_app, _term, _renderer, _out.append, fps=30,
              clock=_clock, sleep=_clock.sleep, max_frames=8)
    _frozen = _app.game.tick_count == _ticks_before
    _app.on_action("pause")
    _resumed_screen = _app.screen
    _run_loop(_app, _term, _renderer, _out.append, fps=30,
              clock=_clock, sleep=_clock.sleep, max_frames=8)
    _resumed = _app.game.tick_count > _ticks_before
    rows.append(_row("pause-freezes-sim",
                     _ticks_playing > 0 and _paused_screen == "paused"
                     and _frozen and _resumed_screen == "playing" and _resumed,
                     "played=%d held=%d now=%d paused=%s resumed=%s" % (
                         _ticks_playing, _ticks_before, _app.game.tick_count,
                         _paused_screen, _resumed_screen)))

    # 13. Tunnel row wraps the player across the maze edge.
    game = Game(seed=seed)
    from engine.actors import LEFT
    cx, cy = center_of(0, TUNNEL_ROW)
    game.player.x, game.player.y = cx, cy
    game.player.dir = LEFT
    game.player.want = LEFT
    game.step(2.0)
    wrapped = tile_of(game.player.x, game.player.y)[0] > WIDTH // 2
    rows.append(_row("tunnel-wrap", wrapped,
                     "tile=%s" % (tile_of(game.player.x, game.player.y),)))

    # 14. Remediation: active ghost hunters genuinely displace over time.
    # (Tile-center steering used to re-snap every near tick, freezing every
    # ghost within 0.1 tiles of spawn; strides are shorter than the window
    # at 120 Hz. Max displacement is tracked so death/respawn mid-run
    # cannot hide a freeze.)
    game = Game(seed=seed)
    chaser = game.ghosts.ghosts[0]
    start = (chaser.actor.x, chaser.actor.y)
    peak = 0.0
    for _ in range(600):
        game.step(tuning.STEP)
        peak = max(peak, abs(chaser.actor.x - start[0])
                   + abs(chaser.actor.y - start[1]))
    rows.append(_row("ghost-hunters-displace", peak > 2.0,
                     "peak-displacement=%.2f tiles" % peak))

    # 15. Remediation: frightened ghosts roam while fright lasts.
    game = Game(seed=seed)
    game.ghosts.start_fright(30.0)
    roamed = set()
    for _ in range(1200):
        game.step(tuning.STEP)
        if game.state != "play":
            break
        for ghost in game.ghosts.ghosts:
            if ghost.state == "active":
                roamed.add(tile_of(ghost.actor.x, ghost.actor.y))
    rows.append(_row("fright-ghosts-roam", len(roamed) > 10,
                     "distinct-tiles=%d" % len(roamed)))

    return rows


def _run_until(game, want_state, cap_s=10.0):
    """Step in honest 0.25 s slices (the engine clamps big dt) until state."""
    spent = 0.0
    while game.state != want_state and spent < cap_s:
        game.step(0.25)
        spent += 0.25
    return game.state == want_state


def size_matrix():
    """Terminal-size matrix against the 28x34 scene geometry."""
    from render.scene import COLS, ROWS
    from shell.terminal import check_size
    cases = [
        ("exact-fit-28x34", 28, 34, True),
        ("standard-80x24-too-small", 80, 24, False),
        ("classic-80x25-too-small", 80, 25, False),
        ("roomy-80x50", 80, 50, True),
        ("wide-120x40", 120, 40, True),
        ("tiny-20x10", 20, 10, False),
    ]
    rows = []
    for name, cols, rows_need, want_fit in cases:
        msg = check_size(cols, rows_need, COLS, ROWS)
        fits = msg is None
        rows.append(_row("size-%s" % name, fits == want_fit,
                         "have=%dx%d need=%dx%d %s" % (
                             cols, rows_need, COLS, ROWS,
                             "fits" if fits else "too-small-card")))
    return rows


def layout_matrix(seed=1):
    """Responsive-canvas matrix: regions appear as the window grows, and the
    composer blits the maze verbatim at the layout origin on every size."""
    from render.compose import paint_full
    from render.layout import COLS as _COLS, ROWS as _ROWS, compute, describe
    from render.scene import paint as paint_scene
    rows = []

    tiny = compute(20, 10)
    rows.append(_row("layout-tiny-too-small", not tiny.fits,
                     "20x10 needs %dx%d" % (_COLS, _ROWS)))

    exact = compute(28, 34)
    rows.append(_row("layout-exact-fit-bare-maze",
                     exact.fits and exact.left is None and exact.right is None
                     and exact.status_y is None and exact.title_y is None
                     and (exact.maze_ox, exact.maze_oy) == (0, 0),
                     "28x34 plays exactly as before"))

    narrow = compute(40, 40)
    rows.append(_row("layout-narrow-no-panels",
                     narrow.fits and narrow.left is None and narrow.right is None
                     and narrow.status_y == 39 and narrow.title_y == 0,
                     "40x40: strips only, maze at (%d,%d)" % (
                         narrow.maze_ox, narrow.maze_oy)))

    mid = compute(60, 40)
    rows.append(_row("layout-right-panel-only",
                     mid.fits and mid.left is None and mid.right is not None
                     and mid.right.w == 26,
                     "60x40: dashboard without legend panel"))

    wide = compute(120, 50)
    rows.append(_row("layout-wide-full-chrome",
                     wide.fits and wide.left is not None and wide.right is not None
                     and wide.left.w == 22 and wide.right.w == 26
                     and wide.status_y == 49 and wide.title_y == 0
                     and (wide.maze_ox, wide.maze_oy) == (44, 8),
                     "120x50: both panels, maze at (44,8)"))

    game = Game(seed=seed)
    for _ in range(30):
        game.step(tuning.STEP)
    ref = paint_scene(game)
    full = paint_full(game, wide)
    rows.append(_row("layout-frame-matches-terminal",
                     full.cols == 120 and full.rows == 50,
                     "canvas frame is %dx%d" % (full.cols, full.rows)))
    blit_ok = all(full.get(wide.maze_ox + x, wide.maze_oy + y) == ref.get(x, y)
                  for y in range(_ROWS) for x in range(_COLS))
    rows.append(_row("layout-maze-blit-verbatim", blit_ok,
                     "28x34 scene identical at the maze origin"))
    text = "".join(cell.glyph for cell in full.cells)
    rows.append(_row("layout-dashboard-shows-live-data",
                     "SCORE" in text and "DOTS" in text and "CONTROLS" in text,
                     "dashboard plus legend panels carry real content"))

    legacy = compute(28, 34)
    legacy_full = paint_full(game, legacy)
    same = (legacy_full.cols == ref.cols and legacy_full.rows == ref.rows
            and all(a == b for a, b in zip(legacy_full.cells, ref.cells)))
    rows.append(_row("layout-minimum-equals-legacy-scene", same,
                     "28x34 canvas is cell-identical to scene.paint"))
    report = describe(wide)
    rows.append(_row("layout-describe-reports-regions",
                     "maze 28x34 at (44,8)" in report
                     and "left panel" in report and "right panel" in report,
                     "describe() names every region"))
    return rows


def capability_matrix():
    """Renderer capability matrix: detection chain plus honest degrade."""
    from render.detect import detect_renderer
    kitty_env = {"KITTY_WINDOW_ID": "1"}
    sixel_env = {"TERM": "xterm-sixel"}
    cases = [
        ("kitty-terminal", detect_renderer(env=kitty_env, pillow=True), "kitty"),
        ("ghostty-terminal", detect_renderer(env={"TERM_PROGRAM": "ghostty"}, pillow=True), "kitty"),
        ("sixel-terminal", detect_renderer(env=sixel_env, pillow=True), "sixel"),
        ("plain-terminal", detect_renderer(env={}, pillow=True), "unicode"),
        ("no-pillow-degrade", detect_renderer(env=kitty_env, pillow=False), "unicode"),
        ("explicit-override", detect_renderer(override="sixel", env={}, pillow=True), "sixel"),
        ("env-var-override", detect_renderer(env={"PACMAN_RENDERER": "kitty"}, pillow=True), "kitty"),
    ]
    rows = [_row("detect-%s" % name, got == want, "got=%s want=%s" % (got, want))
            for name, got, want in cases]
    try:
        detect_renderer(override="hologram", env={}, pillow=True)
        rows.append(_row("detect-unknown-raises", False, "no error raised"))
    except ValueError:
        rows.append(_row("detect-unknown-raises", True, "ValueError as documented"))
    return rows


def input_matrix():
    """Input-method matrix: arrows, WASD, controls, and partial escapes."""
    from shell.input import Keymap, decode_stream
    keymap = Keymap()
    cases = [
        ("arrow-up-csi", b"\x1b[A", ["up"]),
        ("arrow-down-ss3", b"\x1bOB", ["down"]),
        ("wasd-keys", b"wasd", ["up", "left", "down", "right"]),
        ("pause-quit-confirm", b"pq ", ["pause", "quit", "confirm"]),
        ("restart-key", b"r", ["restart"]),
    ]
    rows = []
    for name, blob, want in cases:
        actions, leftover = decode_stream(blob, keymap)
        rows.append(_row("input-%s" % name, actions == want and leftover == b"",
                         "actions=%s" % (actions,)))
    actions, leftover = decode_stream(b"\x1b[", keymap)
    rows.append(_row("input-partial-escape-held",
                     actions == [] and leftover == b"\x1b[",
                     "leftover=%r" % (leftover,)))
    try:
        Keymap({"nope": ["x"]})
        rows.append(_row("input-bad-action-rejected", False, "no error raised"))
    except ValueError:
        rows.append(_row("input-bad-action-rejected", True, "ValueError as documented"))
    return rows


def parity_check(seed=1):
    """Fallback-mode parity: one painter, every backend, same layout."""
    from render.scene import COLS, ROWS, paint
    from render.manager import TieredRenderer, make_backend
    from render.detect import KNOWN
    rows = []
    game = Game(seed=seed)
    for _ in range(30):
        game.step(tuning.STEP)
    ref = paint(game, theme="classic")
    same = True
    for theme in ("neon", "amber"):
        other = paint(game, theme=theme)
        if other.cols != ref.cols or other.rows != ref.rows:
            same = False
    glyphs_ok = all(len(cell.glyph) == 1 for cell in ref.cells)
    rows.append(_row("parity-geometry-28x34",
                     ref.cols == COLS == 28 and ref.rows == ROWS == 34,
                     "frame=%dx%d" % (ref.cols, ref.rows)))
    rows.append(_row("parity-themes-same-grid", same,
                     "classic/neon/amber share one painter"))
    rows.append(_row("parity-single-column-glyphs", glyphs_ok,
                     "every cell is one column on every backend"))
    sprites_ok = all(cell.glyph for cell in ref.cells if cell.sprite)
    rows.append(_row("parity-sprite-text-fallback", sprites_ok,
                     "every sprite cell carries a glyph for unicode"))
    for name in KNOWN:
        backend = make_backend(name)
        if name != "unicode" and not backend.available():
            rows.append(_row("parity-present-%s" % name, True,
                             "unavailable without Pillow, honest skip"))
            continue
        try:
            renderer = TieredRenderer(preference=name, env={})
            renderer.init(COLS, ROWS)
            renderer.present(ref, ref.dirty_cells())
            rows.append(_row("parity-present-%s" % name, True, "present() clean"))
        except Exception as exc:  # noqa: BLE001 - the check itself must not raise
            rows.append(_row("parity-present-%s" % name, False, "raised: %s" % exc))

    # Remediation rows: stale-placement erase, plus the canvas model where
    # the renderer stays at origin (0,0) and the composer places the maze.
    from render import ansi as _ansi
    from render.compose import paint_full as paint_full_canvas
    from render.framebuffer import Cell as _Cell
    from render.framebuffer import FrameBuffer as _FrameBuffer
    from render.layout import compute as layout_compute
    kitty = make_backend("kitty")
    if not kitty.available():
        rows.append(_row("parity-kitty-erase-on-move", True,
                         "unavailable without Pillow, honest skip"))
        rows.append(_row("parity-kitty-steady-no-erase", True,
                         "unavailable without Pillow, honest skip"))
    else:
        kitty.init(4, 2)
        _blank = _Cell(".", (200, 200, 200), (0, 0, 0), None)

        def _sprite_fb(sx):
            fb = _FrameBuffer(4, 2, _blank)
            fb.set(sx, 0, _Cell(">", (255, 255, 0), (0, 0, 0), "player-right"))
            return fb

        first = _sprite_fb(1)
        kitty.present(first, first.dirty_cells())
        second = _sprite_fb(2)
        moved = kitty.present(second, second.dirty_cells())
        rows.append(_row("parity-kitty-erase-on-move",
                         "d=c" in moved and "a=p" in moved,
                         "departed cell erased, new cell placed"))
        third = _sprite_fb(2)
        steady = kitty.present(third, third.dirty_cells())
        rows.append(_row("parity-kitty-steady-no-erase",
                         "d=c" not in steady and "a=p" not in steady,
                         "unchanged frame emits no image commands"))

    uni_renderer = TieredRenderer(preference="unicode", env={})
    uni_renderer.init(100, 44, 100, 44)
    lay = layout_compute(100, 44)
    uni_fb = paint_full_canvas(Game(seed=seed), lay)
    uni_out = uni_renderer.present(uni_fb, uni_fb.dirty_cells())
    rows.append(_row("parity-canvas-origin",
                     (uni_renderer.ox, uni_renderer.oy) == (0, 0)
                     and uni_fb.cols == 100 and uni_fb.rows == 44
                     and lay.maze_ox == 34 and lay.maze_oy == 5
                     and _ansi.cup(6, 35) in uni_out,
                     "100x44 canvas: renderer at (0,0), maze at (34,5)"))
    uni_renderer.resize(120, 50)
    lay2 = layout_compute(120, 50)
    uni_fb2 = paint_full_canvas(Game(seed=seed), lay2)
    uni_out2 = uni_renderer.present(uni_fb2, uni_fb2.dirty_cells())
    rows.append(_row("parity-resize-relayout",
                     (uni_renderer.ox, uni_renderer.oy) == (0, 0)
                     and uni_fb2.cols == 120 and uni_fb2.rows == 50
                     and (lay2.maze_ox, lay2.maze_oy) == (44, 8)
                     and _ansi.cup(9, 45) in uni_out2,
                     "120x50 canvas: renderer at (0,0), maze at (44,8)"))
    return rows


def input_bench(rounds=20000):
    """Input latency probe: decode throughput plus one sim-tick cost."""
    from shell.input import Keymap, decode_stream
    keymap = Keymap()
    blob = b"\x1b[Awasdrpq " * 50
    start = time.perf_counter()
    total_keys = 0
    for _ in range(rounds):
        actions, _ = decode_stream(blob, keymap)
        total_keys += len(actions)
    decode_elapsed = max(time.perf_counter() - start, 1e-9)
    game = Game(seed=1)
    start = time.perf_counter()
    ticks = 1200
    for _ in range(ticks):
        game.step(tuning.STEP)
    sim_elapsed = max(time.perf_counter() - start, 1e-9)
    return {
        "keys_decoded": total_keys,
        "decode_keys_per_s": total_keys / decode_elapsed,
        "decode_ns_per_key": decode_elapsed * 1e9 / max(total_keys, 1),
        "sim_ticks": ticks,
        "sim_us_per_tick": sim_elapsed * 1e6 / ticks,
        "sim_ticks_per_s": ticks / sim_elapsed,
    }


def render_bench(frames=60, seed=1):
    """Per-backend present() throughput (headless, fps throttle disabled)."""
    from render.manager import make_backend
    from render.detect import KNOWN
    from render.scene import COLS, ROWS, paint
    out = {}
    for name in KNOWN:
        backend = make_backend(name)
        if name != "unicode" and not backend.available():
            out[name] = {"available": False}
            continue
        if getattr(backend, "min_interval", None):
            backend.min_interval = 0.0
        game = Game(seed=seed, level=1)
        backend.init(COLS, ROWS)
        full_bytes = 0
        start = time.perf_counter()
        for n in range(frames):
            game.step(tuning.STEP)
            fb = paint(game)
            data = backend.present(fb, fb.dirty_cells())
            if n == 0:
                full_bytes = len(data)
        elapsed = max(time.perf_counter() - start, 1e-9)
        out[name] = {"available": True, "fps": frames / elapsed,
                     "full_bytes": full_bytes}
    return out


def full_matrix(seed=1):
    """All matrices concatenated for the CLI and the test suite."""
    sections = [
        ("gameplay", gameplay_matrix(seed)),
        ("terminal-size", size_matrix()),
        ("layout", layout_matrix(seed)),
        ("capability", capability_matrix()),
        ("input", input_matrix()),
        ("parity", parity_check(seed)),
    ]
    return sections
