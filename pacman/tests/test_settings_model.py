"""Headless tests for the pure in-game settings model (shell.settings)."""

import pytest

from render import themes
from engine import modes
from render import scale as scale_mod
from shell import settings


class State:
    def __init__(self, theme="classic", mode="classic", scale_mode="auto",
                 effects=True, reduced_flash=False):
        self.theme = theme
        self.mode = mode
        self.scale_mode = scale_mode
        self.effects = effects
        self.reduced_flash = reduced_flash


def test_options_order():
    assert settings.OPTIONS == ("theme", "mode", "scale", "effects", "reduced_flash")


def test_choices_theme_match_real_themes_sorted():
    assert settings.choices("theme") == tuple(sorted(themes.THEMES))


def test_choices_mode_match_real_modes_sorted():
    assert settings.choices("mode") == tuple(sorted(modes.MODES))


def test_choices_scale_match_real_scale_modes():
    assert settings.choices("scale") == ("auto", "classic", "wide", "full")
    for name in settings.choices("scale"):
        assert scale_mod.check(name) == name


def test_choices_bools_are_on_off():
    assert settings.choices("effects") == ("on", "off")
    assert settings.choices("reduced_flash") == ("on", "off")


def test_get_maps_attrs_and_bools():
    st = State(theme="neon", mode="sprint", scale_mode="wide",
               effects=True, reduced_flash=False)
    assert settings.get(st, "theme") == "neon"
    assert settings.get(st, "mode") == "sprint"
    assert settings.get(st, "scale") == "wide"
    assert settings.get(st, "effects") == "on"
    assert settings.get(st, "reduced_flash") == "off"


def test_set_round_trip_all_options():
    st = State()
    assert settings.set_value(st, "theme", "neon") == "neon"
    assert settings.set_value(st, "mode", "sprint") == "sprint"
    assert settings.set_value(st, "scale", "full") == "full"
    assert settings.set_value(st, "effects", "off") == "off"
    assert settings.set_value(st, "reduced_flash", "on") == "on"
    assert (st.theme, st.mode, st.scale_mode) == ("neon", "sprint", "full")
    assert st.effects is False
    assert st.reduced_flash is True
    assert settings.get(st, "effects") == "off"
    assert settings.get(st, "reduced_flash") == "on"


def test_set_invalid_values_raise():
    st = State()
    with pytest.raises(ValueError):
        settings.set_value(st, "theme", "nope")
    with pytest.raises(ValueError):
        settings.set_value(st, "mode", "nope")
    with pytest.raises(ValueError):
        settings.set_value(st, "scale", "nope")
    with pytest.raises(ValueError):
        settings.set_value(st, "effects", "maybe")
    with pytest.raises(ValueError):
        settings.set_value(st, "reduced_flash", "maybe")
    with pytest.raises(ValueError):
        settings.set_value(st, "bogus", "x")
    # Failed writes leave prior state intact.
    assert (st.theme, st.mode, st.scale_mode) == ("classic", "classic", "auto")


def test_set_validates_via_real_check_functions():
    st = State()
    with pytest.raises(ValueError):
        settings.set_value(st, "theme", "NEON")  # themes.check is exact
    with pytest.raises(ValueError):
        settings.set_value(st, "mode", "Classic")
    # Every real theme/mode passes through.
    for name in themes.THEMES:
        assert settings.set_value(st, "theme", name) == name
    for name in modes.MODES:
        assert settings.set_value(st, "mode", name) == name


def test_cycle_forward_and_backward():
    st = State(theme=settings.choices("theme")[0])
    first, second = settings.choices("theme")[0], settings.choices("theme")[1]
    assert settings.cycle(st, "theme", 1) == second
    assert st.theme == second
    assert settings.cycle(st, "theme", -1) == first
    assert st.theme == first


def test_cycle_wraps_both_directions():
    st = State()
    allowed = settings.choices("scale")
    st.scale_mode = allowed[-1]
    assert settings.cycle(st, "scale", 1) == allowed[0]
    assert st.scale_mode == allowed[0]
    assert settings.cycle(st, "scale", -1) == allowed[-1]
    assert st.scale_mode == allowed[-1]
    # Bool option wraps too.
    st.effects = True
    assert settings.cycle(st, "effects", 1) == "off"
    assert settings.cycle(st, "effects", 1) == "on"


def test_snapshot_apply_round_trip():
    st = State(theme="neon", mode="sprint", scale_mode="full",
               effects=False, reduced_flash=True)
    snap = settings.snapshot(st)
    assert snap == {"theme": "neon", "mode": "sprint", "scale": "full",
                    "effects": False, "reduced_flash": True}
    other = State()
    settings.apply_snapshot(other, snap)
    assert settings.snapshot(other) == snap


def test_apply_snapshot_rejects_bad_dict():
    st = State()
    with pytest.raises(ValueError):
        settings.apply_snapshot(st, {"theme": "neon"})  # missing keys
    with pytest.raises(ValueError):
        settings.apply_snapshot(st, {"theme": "nope", "mode": "classic",
                                     "scale": "auto", "effects": True,
                                     "reduced_flash": False})
    with pytest.raises(ValueError):
        settings.apply_snapshot(st, "neon")


def test_mode_note_honesty_and_others_empty():
    assert settings.note("mode") == "applies to next run"
    for option in ("theme", "scale", "effects", "reduced_flash"):
        assert settings.note(option) == ""


def test_describe_and_row_label():
    st = State(theme="neon")
    for option in settings.OPTIONS:
        line = settings.describe(option)
        assert isinstance(line, str) and line
    assert settings.row_label(st, "theme") == "theme: neon"
    assert settings.row_label(st, "effects") == "effects: on"


def test_no_shell_app_import():
    import pathlib
    src = pathlib.Path(__file__).resolve().parents[1] / "src" / "shell" / "settings.py"
    text = src.read_text(encoding="utf-8")
    assert "shell.app" not in text
    assert "shell import app" not in text
