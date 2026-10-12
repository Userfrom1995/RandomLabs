"""Shell input: arrows, partial escapes, remaps, honest rejections."""

import pytest

from shell.input import ACTIONS, Keymap, decode_stream, parse_binds


def test_arrows_and_ss3_decode():
    actions, left = decode_stream(b"\x1b[A\x1bOB\x1bOC\x1b[D")
    assert (actions, left) == (["up", "down", "right", "left"], b"")


def test_partial_escape_held_for_next_read():
    actions, left = decode_stream(b"w\x1b")
    assert actions == ["up"] and left == b"\x1b"
    actions2, left2 = decode_stream(left + b"[A")
    assert (actions2, left2) == (["up"], b"")


def test_partial_csi_bracket_held():
    actions, left = decode_stream(b"\x1b[")
    assert actions == [] and left == b"\x1b["


def test_lone_escape_is_pause_ctrl_c_is_quit():
    actions, _ = decode_stream(b"\x1bp\x03q\r ")
    assert actions == ["pause", "pause", "quit", "quit", "confirm", "confirm"]


def test_unknown_bytes_dropped_never_crash():
    actions, left = decode_stream("héllo→".encode("utf-8"))
    assert left == b""
    assert all(a in ACTIONS for a in actions)


def test_default_wasd_and_vim():
    actions, _ = decode_stream(b"waskdjhl")
    assert actions == ["up", "left", "down", "up", "right", "down", "left", "right"]


def test_remap_replaces_defaults():
    keymap = Keymap(parse_binds(["up=k"]))
    assert keymap.bindings("up") == ("k",)
    actions, _ = decode_stream(b"k", keymap)
    assert actions == ["up"]
    actions, _ = decode_stream(b"w", keymap)
    assert actions == []


def test_duplicate_binding_rejected():
    with pytest.raises(ValueError):
        Keymap({"up": ["q"]})  # q already quits
    with pytest.raises(ValueError):
        Keymap({"up": ["w", "w"]})


def test_bad_specs_rejected():
    with pytest.raises(ValueError):
        parse_binds(["fly=x"])
    with pytest.raises(ValueError):
        parse_binds(["up=kk"])
    with pytest.raises(ValueError):
        parse_binds(["up"])
    with pytest.raises(ValueError):
        Keymap({"zoom": ["z"]})


def test_describe_lists_every_action():
    text = Keymap().describe()
    for action in ACTIONS:
        assert action in text
