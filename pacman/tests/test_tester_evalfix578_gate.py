"""Tester re-gate: locks the 7 Quality Council fix-round items on PR #578.

Second pass after the binding FIX (9.5/10 vs 9.8 gate): every surgical
one-liner the Fixer applied must stay fixed, or the merge gate fails loud.
"""

import os
import subprocess
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from shell import settings as settings_mod
from shell.app import ShellState
from shell.audio import NullAudio
from shell.input import Keymap
from shell.screens import flat_text, paint_help, paint_settings

ROOT = os.path.join(os.path.dirname(__file__), "..")


def _app(**kw):
    args = dict(seed=7, audio=NullAudio())
    args.update(kw)
    return ShellState(**args)


def test_fix1_status_is_claim_plus_bullets():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    start = html.find("<h2>Status</h2>")
    assert start != -1, "Status section missing"
    section = html[start:start + 2500]
    assert "<ul>" in section and section.count("<li>") >= 3, \
        "status must be a short claim plus bullets, not a wall of text"
    assert "bot" not in section.lower() or "arcade tribute" in html


def test_fix2_footer_is_product_credit():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    assert "arcade tribute for the terminal" in html
    footer = html[html.find("<footer>"):html.find("</footer>")]
    assert "bot" not in footer.lower()


def test_fix3_settings_footer_honors_live_keymap():
    app = _app()
    default = "\n".join(flat_text(
        paint_settings(app, 0, cols=80, rows=40, keymap=Keymap())))
    remapped = "\n".join(flat_text(
        paint_settings(app, 0, cols=80, rows=40,
                       keymap=Keymap(binds={"pause": ["."]}))))
    assert "P / ENTER: back" in default
    assert ". / ENTER: back" in remapped, \
        "remapped pause key must appear in the footer, never a hardcoded P"


def test_fix4_legend_disambiguates_glyphs():
    text = "\n".join(flat_text(paint_help(Keymap())))
    assert "B frightened" in text
    assert "O energizer" in text


def test_fix5_settings_labels_humanized():
    app = _app()
    label = settings_mod.row_label(app, "reduced_flash")
    assert "_" not in label, "raw id leaked to users: %r" % label
    assert "reduced flash" in label


def test_fix6_apply_snapshot_validates_before_mutating():
    st = SimpleNamespace(theme="neon", mode="classic", scale_mode="auto",
                         effects=True, reduced_flash=False)
    before = settings_mod.snapshot(st)
    with pytest.raises((ValueError, TypeError)):
        settings_mod.apply_snapshot(st, {
            "theme": "classic", "mode": "classic", "scale": "auto",
            "effects": "bogus-BOOM", "reduced_flash": "off"})
    assert settings_mod.snapshot(st) == before, \
        "bad 4th key must leave the whole state untouched"


def test_fix7_bare_bind_warns_instead_of_silent_help():
    r = subprocess.run([sys.executable, "pacman/pacman.py", "--bind"],
                       capture_output=True, text=True, cwd=".")
    out = (r.stdout + r.stderr).lower()
    assert "bind" in out and ("verb" in out or "--play" in out or "action" in out), \
        "bare --bind must warn that an action verb is required: %r" % out[:300]
