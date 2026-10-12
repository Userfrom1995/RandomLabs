"""Renderer protocol spike: byte-capture assertions on every backend."""

import pytest

from render import ansi
from render.detect import detect_renderer
from render.framebuffer import FrameBuffer, Cell, BLANK
from render.kitty import (
    transmit_image, place_image, delete_image, KittyBackend, CHUNK,
)
from render.sixel import dcs_wrap, encode_solid, frame_solid, available as sixel_available
from render.unicode import UnicodeBackend


def red_cell(glyph):
    return Cell(glyph, (255, 0, 0), (0, 0, 0), None)


def test_framebuffer_dirty_tracking():
    fb = FrameBuffer(4, 2)
    assert len(fb.dirty_cells()) == 8  # fresh buffer is fully dirty
    fb.clear_dirty()
    assert fb.dirty_cells() == []
    fb.set(1, 0, red_cell("X"))
    assert fb.dirty_cells() == [1]
    fb.set(1, 0, red_cell("X"))  # same value: stays clean
    assert fb.dirty_cells() == [1]
    with pytest.raises(IndexError):
        fb.set(4, 0, BLANK)


def test_framebuffer_diff():
    a, b = FrameBuffer(3, 1), FrameBuffer(3, 1)
    a.clear_dirty()
    b.clear_dirty()
    assert a.diff(b) == []
    b.set(2, 0, red_cell("@"))
    assert a.diff(b) == [2]
    with pytest.raises(ValueError):
        a.diff(FrameBuffer(2, 2))


def test_unicode_identical_frame_emits_no_cells():
    be = UnicodeBackend()
    assert be.available()
    fb = FrameBuffer(8, 4)
    be.init(8, 4)
    first = be.present(fb, fb.dirty_cells())
    assert ansi.SYNC_BEGIN in first and ansi.SYNC_END in first
    fb2 = FrameBuffer(8, 4)  # same content, fresh dirty set
    second = be.present(fb2, fb2.dirty_cells())
    assert ansi.cup(1, 1) not in second  # no cell writes at all
    assert ansi.SYNC_BEGIN in second  # framing still present


def test_unicode_renders_changed_cells_with_color():
    be = UnicodeBackend()
    be.init(8, 4)
    fb = FrameBuffer(8, 4)
    be.present(fb, fb.dirty_cells())
    fb.set(0, 0, red_cell("C"))
    out = be.present(fb, fb.dirty_cells())
    assert ansi.cup(1, 1) in out
    assert "38;2;255;0;0" in out  # truecolor fg
    assert "C" in out
    be.shutdown()
    assert ansi.ALT_EXIT in be.shutdown()


def test_unicode_size_mismatch_rejected():
    be = UnicodeBackend()
    be.init(8, 4)
    with pytest.raises(ValueError):
        be.present(FrameBuffer(9, 4), [0])


def test_kitty_transmit_once_then_place():
    png = b"\x89PNG-fake-bytes-for-framing-test"
    seq = transmit_image(png, 7, 32, 32)
    assert seq.count("a=T") == 1  # single chunk fits
    assert "q=2" in seq
    assert seq.startswith("\x1b_G") and seq.endswith("\x1b\\")
    assert "m=0" in seq
    big = transmit_image(b"x" * 9000, 8, 64, 64)
    assert big.count("a=T") > 1  # chunked at the APC limit
    assert "m=1" in big and big.rsplit("m=", 1)[1].startswith("0")
    with pytest.raises(ValueError):
        transmit_image(b"", 1, 8, 8)


def test_kitty_backend_requires_transmit_before_place():
    be = KittyBackend()
    png = b"\x89PNG-fake"
    be.transmit_atlas(png, 3, 16, 16)
    seq = be.place(3, 5, 5)
    assert "a=p" in seq and "i=3" in seq
    with pytest.raises(ValueError):
        be.place(99, 0, 0)
    assert "a=d" in delete_image(3)


def test_kitty_place_deterministic_bytes():
    assert place_image(1, 2, 3) == place_image(1, 2, 3)


def test_sixel_framing_and_solid_encoder():
    payload = encode_solid(12, 13)
    assert payload  # non-empty real sixel data
    assert "-" in payload  # 13 px spans three 6-px bands -> separators
    single = encode_solid(4, 4)
    assert "-" not in single
    framed = frame_solid(4, 4)
    assert framed.startswith("\x1bPq") and framed.endswith("\x1b\\")
    assert dcs_wrap("abc") == "\x1bPqabc\x1b\\"
    with pytest.raises(ValueError):
        encode_solid(0, 4)
    assert isinstance(sixel_available(), bool)


def test_detect_priority():
    assert detect_renderer("kitty", pillow=True) == "kitty"
    with pytest.raises(ValueError):
        detect_renderer("curses")
    # override degrades honestly without Pillow
    assert detect_renderer("kitty", pillow=False) == "unicode"
    # env var vocabulary (availability probed separately)
    assert detect_renderer(env={"PACMAN_RENDERER": "sixel"}, pillow=True) == "sixel"
    assert detect_renderer(env={"PACMAN_RENDERER": "sixel"}, pillow=False) == "unicode"
    assert detect_renderer(env={"KITTY_WINDOW_ID": "7", "PACMAN_RENDERER": "unicode"}) == "unicode"
    # heuristics
    assert detect_renderer(env={"KITTY_WINDOW_ID": "7"}, pillow=True) == "kitty"
    assert detect_renderer(env={"KITTY_WINDOW_ID": "7"}, pillow=False) == "unicode"
    assert detect_renderer(env={"TERM": "xterm-sixel"}, pillow=True) == "sixel"
    assert detect_renderer(env={"TERM": "xterm-256color"}, pillow=True) == "unicode"
    assert detect_renderer(env={}) == "unicode"
