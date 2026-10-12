"""Shell audio: original synth voices, honest degrade, never blocking."""

import pytest

import shell.audio as audio_mod
from shell.audio import (
    EVENTS, BellAudio, NullAudio, SynthAudio,
    make_audio, render_event, samples_to_wav_pcm, select_audio,
)


def test_every_event_renders_bounded_click_free_samples():
    for event in EVENTS:
        samples = render_event(event)
        assert len(samples) > 100, event
        assert max(abs(s) for s in samples) <= 0.9 + 1e-9, event
        assert abs(samples[0]) < 0.01 and abs(samples[-1]) < 0.05, event


def test_renders_are_deterministic():
    assert render_event("dot") == render_event("dot")
    assert render_event("dot") != render_event("ghost")


def test_wav_encoding_is_real_riff_pcm():
    blob = samples_to_wav_pcm(render_event("energizer"))
    assert blob[:4] == b"RIFF" and blob[8:12] == b"WAVE"
    assert len(blob) > 44 + 2 * 100


def test_unknown_event_rejected_everywhere():
    with pytest.raises(ValueError):
        render_event("waka-waka")
    for backend in (NullAudio(), BellAudio(), SynthAudio(player=("true", []))):
        with pytest.raises(ValueError):
            backend.play("waka-waka")
    with pytest.raises(ValueError):
        make_audio("orchestra")


def test_null_counts_but_stays_silent():
    backend = NullAudio()
    backend.play("dot")
    assert backend.stats() == {"backend": "null", "played": 1, "errors": 0}


def test_bell_queues_audible_chars():
    backend = BellAudio()
    backend.play("dot")
    backend.play("death")
    assert backend.drain() == "\a\a"
    assert backend.drain() == ""
    assert backend.stats()["played"] == 2


def test_synth_plays_without_blocking_and_caches():
    calls = []

    class FakeProc:
        def communicate(self, blob):
            calls.append(len(blob))

    backend = SynthAudio(player=("true", []), spawn=lambda *a, **k: FakeProc())
    backend.play("ghost")
    backend.play("ghost")
    deadline = __import__("time").monotonic() + 5.0
    while len(calls) < 2 and __import__("time").monotonic() < deadline:
        __import__("time").sleep(0.01)
    assert len(calls) == 2
    assert calls[0] == calls[1]  # cached voice, identical bytes
    assert backend.stats()["errors"] == 0


def test_synth_spawn_failure_counted_never_raised():
    def boom(*a, **k):
        raise OSError("no speaker here")

    backend = SynthAudio(player=("true", []), spawn=boom)
    backend.play("dot")  # must not raise
    deadline = __import__("time").monotonic() + 5.0
    while backend.stats()["errors"] == 0 and __import__("time").monotonic() < deadline:
        __import__("time").sleep(0.01)
    assert backend.stats()["errors"] == 1


def test_select_degrades_honestly_without_player(monkeypatch):
    monkeypatch.setattr(audio_mod, "find_system_player", lambda: None)
    assert select_audio("auto").name == "bell"
    assert select_audio("synth").name == "bell"
    assert select_audio("null").name == "null"
    assert select_audio("bell").name == "bell"
