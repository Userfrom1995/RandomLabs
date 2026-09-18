// M3 audio tests: DMX parse, MUS-to-MIDI conversion, SFX cache, 8-voice
// engine model, mixer gains, unlock gate, OPL3 music engine. Headless
// (node:test), no WebAudio required.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDmxLump, dmxToFloat32, dmxDurationSec } from '../src/audio/wadAudio.js';
import {
  musToMidi, musChannelToMidi, scaleMusVolume, MUS_HZ, MIDI_DIVISION,
} from '../src/audio/mus2mid.js';
import { createSfxCache } from '../src/audio/sfxCache.js';
import {
  createSfxEngine, distanceGain, separationPan, jitterPitch,
  SFX_VOICES, SFX_CLOSE_DIST, SFX_CLIP_DIST,
} from '../src/audio/sfxEngine.js';
import { createMixer, menuToGain, MENU_MAX } from '../src/audio/mixer.js';
import { createAudioUnlock } from '../src/audio/audioUnlock.js';
import {
  parseGenmidi, extractMidiNotes, renderFmNotes, createMusicEngine, midiNoteHz,
} from '../src/audio/musicEngine.js';

function dmxLump({ format = 3, rate = 11025, samples = [0, 128, 255, 64] } = {}) {
  const count = samples.length;
  const out = new Uint8Array(8 + 16 + count + 16);
  const v = new DataView(out.buffer);
  v.setUint16(0, format, true);
  v.setUint16(2, rate, true);
  v.setUint32(4, count + 32, true);
  out.set(samples, 24);
  return out;
}

function musBuffer(events, { instrCount = 1 } = {}) {
  const head = new Uint8Array(16 + instrCount * 2);
  head.set([0x4d, 0x55, 0x53, 0x1a], 0);
  const v = new DataView(head.buffer);
  v.setUint16(4, events.length, true);
  v.setUint16(6, head.length, true);
  v.setUint16(8, 2, true);
  v.setUint16(10, 0, true);
  v.setUint16(12, instrCount, true);
  const out = new Uint8Array(head.length + events.length);
  out.set(head, 0);
  out.set(events, head.length);
  return out;
}
const desc = (last, type, ch) => (last ? 0x80 : 0) | (type << 4) | ch;
// One note: play ch0 note 60 vel 100, hold 140 MUS ticks, release, end.
const NOTE_EVENTS = [
  desc(1, 1, 0), 60 | 0x80, 100, 0x81, 0x0c,
  desc(1, 0, 0), 60, 0x00,
  desc(0, 6, 0),
];

describe('wadAudio DMX parse', () => {
  it('golden strip: format 3, playable span is length minus 32', () => {
    const p = parseDmxLump(dmxLump());
    assert.equal(p.format, 3);
    assert.equal(p.sampleRate, 11025);
    assert.equal(p.sampleCount, 4);
    assert.deepEqual([...p.samples], [0, 128, 255, 64]);
  });
  it('u8 to f32 maps 0 to -1, 128 to 0, 255 near 1', () => {
    const f = dmxToFloat32(new Uint8Array([0, 128, 255]));
    assert.equal(f[0], -1);
    assert.equal(f[1], 0);
    assert.ok(Math.abs(f[2] - 127 / 128) < 1e-9);
  });
  it('duration divides count by rate', () => {
    const p = parseDmxLump(dmxLump({ rate: 22050, samples: new Array(22050).fill(128) }));
    assert.equal(dmxDurationSec(p), 1);
  });
  it('PC-speaker format 0 rejects with E_DMX_FORMAT', () => {
    assert.throws(() => parseDmxLump(dmxLump({ format: 0 })), (e) => e.code === 'E_DMX_FORMAT');
  });
  it('truncated header and payload throw E_DMX_TRUNCATED', () => {
    assert.throws(() => parseDmxLump(new Uint8Array(4)), (e) => e.code === 'E_DMX_TRUNCATED');
    const bad = dmxLump();
    assert.throws(() => parseDmxLump(bad.slice(0, 20)), (e) => e.code === 'E_DMX_TRUNCATED');
  });
  it('vanilla cap rejects oversized lengths', () => {
    const out = new Uint8Array(40);
    const v = new DataView(out.buffer);
    v.setUint16(0, 3, true);
    v.setUint16(2, 11025, true);
    v.setUint32(4, 70000, true);
    assert.throws(() => parseDmxLump(out), (e) => e.code === 'E_DMX_TRUNCATED');
  });
});

describe('mus2mid conversion', () => {
  it('single note converts to SMF Type 0 with paired on/off', () => {
    const { midi, stats } = musToMidi(musBuffer(NOTE_EVENTS));
    assert.equal(midi[0], 0x4d);
    assert.equal(midi[1], 0x54);
    assert.equal(midi[2], 0x68);
    assert.equal(midi[3], 0x64);
    assert.equal(stats.notes, 1);
    assert.equal(stats.scaled, false);
    const body = [...midi];
    const onIdx = body.findIndex((b, i) => b === 0x90 && body[i + 1] === 60);
    assert.ok(onIdx > 0, 'note-on status with note 60 present');
    assert.equal(body[onIdx + 2], 100);
    const offIdx = body.findIndex((b, i) => b === 0x80 && body[i + 1] === 60);
    assert.ok(offIdx > onIdx, 'note-off follows note-on');
    const eot = body.slice(-3);
    assert.deepEqual(eot, [0xff, 0x2f, 0x00]);
  });
  it('drum channel 15 maps to MIDI 9, melodic 9 shifts to 10', () => {
    assert.equal(musChannelToMidi(15), 9);
    assert.equal(musChannelToMidi(0), 0);
    assert.equal(musChannelToMidi(9), 10);
    const ev = [desc(0, 1, 15), 36 | 0x80, 100, desc(0, 6, 0)];
    const { midi } = musToMidi(musBuffer(ev));
    const body = [...midi];
    const drum = body.findIndex((b, i) => b === 0x99 && body[i + 1] === 36);
    assert.ok(drum > 0, 'drum note lands on MIDI channel 9');
  });
  it('volume above 127 scales the track instead of clamping', () => {
    assert.equal(scaleMusVolume(200, 200), 127);
    assert.equal(scaleMusVolume(100, 200), 64);
    assert.equal(scaleMusVolume(100, 100), 100);
    const ev = [desc(0, 1, 0), 60 | 0x80, 200, desc(0, 6, 0)];
    const { stats } = musToMidi(musBuffer(ev));
    assert.equal(stats.scaled, true);
    assert.equal(stats.trackMaxVol, 200);
  });
  it('bad magic and missing end event throw', () => {
    const bad = musBuffer(NOTE_EVENTS).slice();
    bad[0] = 0x00;
    assert.throws(() => musToMidi(bad), (e) => e.code === 'E_MUS_MAGIC');
    assert.throws(() => musToMidi(musBuffer([desc(1, 0, 0), 60, 0x00])), (e) => e.code === 'E_MUS_TRUNCATED');
  });
  it('conversion is deterministic byte-for-byte', () => {
    const a = musToMidi(musBuffer(NOTE_EVENTS)).midi;
    const b = musToMidi(musBuffer(NOTE_EVENTS)).midi;
    assert.deepEqual([...a], [...b]);
  });
  it('MUS timing constants pinned (140 Hz, division 70)', () => {
    assert.equal(MUS_HZ, 140);
    assert.equal(MIDI_DIVISION, 70);
  });
});

describe('sfxCache LRU', () => {
  const lump = () => dmxLump({ samples: [128, 129, 130, 131] });
  it('lazy decode round-trips float data and rate', () => {
    const c = createSfxCache();
    const e = c.get('DSPISTOL', lump());
    assert.equal(e.sampleRate, 11025);
    assert.equal(e.data.length, 4);
    assert.equal(c.get('DSPISTOL').data[0], e.data[0]);
    assert.equal(c.stats.hits, 1);
  });
  it('miss without bytes returns null, eviction drops oldest', () => {
    const c = createSfxCache({ maxEntries: 2 });
    assert.equal(c.get('MISSING'), null);
    c.get('A', lump());
    c.get('B', lump());
    c.get('C', lump());
    assert.equal(c.size, 2);
    assert.ok(!c.has('A'));
    assert.equal(c.stats.evictions, 1);
  });
  it('prefetch skips corrupt lumps and reports them', () => {
    const c = createSfxCache();
    const r = c.prefetch([['OK', lump()], ['BAD', new Uint8Array(4)]]);
    assert.equal(r.loaded, 1);
    assert.deepEqual(r.skipped, ['BAD']);
  });
});

describe('sfxEngine voice model', () => {
  const buf = { data: new Float32Array(11025), sampleRate: 11025 };
  it('allocates 8 voices then steals by policy', () => {
    const e = createSfxEngine();
    const idx = [];
    for (let i = 0; i < SFX_VOICES; i++) idx.push(e.play({ name: `S${i}`, buffer: buf, volume: 100 }));
    assert.deepEqual(idx, [0, 1, 2, 3, 4, 5, 6, 7]);
    const stolen = e.play({ name: 'S0', buffer: buf, volume: 100 });
    assert.equal(stolen, 0, 'same-origin voice dies first');
  });
  it('quietest voice steals when no origin matches', () => {
    const e = createSfxEngine();
    for (let i = 0; i < SFX_VOICES; i++) {
      e.play({ name: `V${i}`, buffer: buf, volume: i === 3 ? 10 : 100 });
    }
    assert.equal(e.play({ name: 'NEW', buffer: buf, volume: 100 }), 3);
  });
  it('distance curve: full inside 200, zero at 1200, MAP08 floor', () => {
    assert.equal(distanceGain(0), 1);
    assert.equal(distanceGain(SFX_CLOSE_DIST), 1);
    assert.equal(distanceGain(SFX_CLIP_DIST), 0);
    assert.ok(distanceGain(700) > 0 && distanceGain(700) < 1);
    assert.ok(distanceGain(5000, { map08: true }) > 0);
    const e = createSfxEngine();
    assert.equal(e.play({ name: 'FAR', buffer: buf, distance: 99999 }), -1);
    assert.ok(e.play({ name: 'M08', buffer: buf, distance: 99999, map08: true }) >= 0);
    assert.ok(e.dropped.count >= 1);
  });
  it('pan centers at separation 128 with zero angle', () => {
    assert.equal(separationPan(128, 0), 0);
    assert.ok(separationPan(255, 0) > 0.3);
    assert.ok(separationPan(0, 0) < -0.3);
  });
  it('pitch jitter is deterministic per seed and vanilla-shaped', () => {
    const a = createSfxEngine({ seed: 42 });
    const b = createSfxEngine({ seed: 42 });
    const pa = a.play({ name: 'X', buffer: buf, pitch: 128 });
    const pb = b.play({ name: 'X', buffer: buf, pitch: 128 });
    assert.equal(a.voices[pa].rate, b.voices[pb].rate);
    assert.equal(jitterPitch(128, 'pickup', 255), 128);
    assert.equal(jitterPitch(128, 'tink', 0), 128);
    const saw = jitterPitch(128, 'saw', 0);
    assert.ok(saw >= 113 && saw <= 136);
  });
  it('update releases finished voices by duration', () => {
    const e = createSfxEngine();
    const short = { data: new Float32Array(110), sampleRate: 11025 };
    e.play({ name: 'BLIP', buffer: short });
    assert.equal(e.update(0), 1);
    assert.equal(e.update(60000), 0);
    e.play({ name: 'BLIP', buffer: short });
    e.stopAll();
    assert.equal(e.update(1), 0);
  });
  it('empty buffer drops without allocating', () => {
    const e = createSfxEngine();
    assert.equal(e.play({ name: 'E', buffer: { data: new Float32Array(0), sampleRate: 11025 } }), -1);
  });
});

describe('mixer gains', () => {
  it('menu 0..15 maps linearly, full scale is unity', () => {
    assert.equal(menuToGain(15), 1);
    assert.equal(menuToGain(0), 0);
    assert.equal(menuToGain(7.5), 0.5);
    assert.equal(menuToGain(99), 1);
    assert.equal(MENU_MAX, 15);
  });
  it('mute flags zero the buses, persisted shape pinned', () => {
    const m = createMixer();
    assert.deepEqual(m.effective(), { master: 1, sfx: 1, music: 1 });
    m.set('muted', true);
    assert.deepEqual(m.effective(), { master: 0, sfx: 0, music: 0 });
    m.set('muted', false);
    m.set('mutedSfx', true);
    assert.equal(m.effective().sfx, 0);
    assert.equal(m.effective().music, 1);
    const j = m.toJSON();
    assert.deepEqual(Object.keys(j).sort(), ['master', 'music', 'muted', 'mutedMusic', 'mutedSfx', 'sfx']);
  });
  it('bus gains multiply master times part', () => {
    const m = createMixer({ master: 15, sfx: 7.5, music: 15 });
    m.set('sfx', 8);
    const e = m.effective();
    assert.ok(Math.abs(e.sfx - 8 / 15) < 1e-9);
  });
});

describe('audioUnlock gate (H5 headless)', () => {
  it('starts suspended, drops pre-gesture schedules, runs after gesture', () => {
    const u = createAudioUnlock();
    assert.equal(u.state, 'suspended');
    assert.equal(u.canSchedule(), false);
    assert.equal(u.trySchedule(), false);
    assert.equal(u.trySchedule(), false);
    assert.equal(u.scheduledBefore, 2);
    assert.equal(u.gesture(), true);
    assert.equal(u.state, 'running');
    assert.equal(u.trySchedule(), true);
    assert.equal(u.scheduledAfter, 1);
  });
  it('overlay copy: unknown policy prompts, allowed policy stays quiet', () => {
    assert.equal(createAudioUnlock().overlayNeeded(), true);
    assert.equal(createAudioUnlock({ policy: 'allowed' }).overlayNeeded(), false);
    const u = createAudioUnlock();
    u.gesture();
    assert.equal(u.overlayNeeded(), false);
  });
});

describe('musicEngine OPL3 path', () => {
  function genmidi(count = 4) {
    const out = new Uint8Array(8 + count * 36);
    out.set([...'#OPL_II#'].map((c) => c.charCodeAt(0)), 0);
    return out;
  }
  it('GENMIDI magic strict, count lenient, bounds safe', () => {
    const b = parseGenmidi(genmidi(4));
    assert.equal(b.instruments, 4);
    assert.equal(b.getInstrument(3).length, 36);
    assert.equal(b.getInstrument(4), null);
    assert.throws(() => parseGenmidi(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), (e) => e.code === 'E_GENMIDI_MAGIC');
  });
  it('MIDI note extraction round-trips mus2mid output', () => {
    const { midi } = musToMidi(musBuffer(NOTE_EVENTS));
    const { notes } = extractMidiNotes(midi);
    const ons = notes.filter((n) => n.on);
    const offs = notes.filter((n) => !n.on);
    assert.equal(ons.length, 1);
    assert.equal(offs.length, 1);
    assert.equal(ons[0].note, 60);
    assert.throws(() => extractMidiNotes(new Uint8Array(10)), (e) => e.code === 'E_MIDI_HEADER');
  });
  it('FM render is deterministic, bounded, and silent when empty', () => {
    const { midi } = musToMidi(musBuffer(NOTE_EVENTS));
    const { notes } = extractMidiNotes(midi);
    const a = renderFmNotes(notes, { seconds: 1 });
    const b = renderFmNotes(notes, { seconds: 1 });
    assert.equal(a.length, 44100);
    assert.deepEqual([...a], [...b]);
    let peak = 0;
    for (const v of a) peak = Math.max(peak, Math.abs(v));
    assert.ok(peak > 0.001 && peak <= 1, `audible peak ${peak}`);
    const silent = renderFmNotes([], { seconds: 0.1 });
    assert.ok(silent.every((v) => v === 0));
  });
  it('song switch counts, duration positive, chunk sized', () => {
    const eng = createMusicEngine();
    const { midi } = musToMidi(musBuffer(NOTE_EVENTS));
    eng.loadBank(genmidi(2));
    assert.equal(eng.bankInstruments, 2);
    eng.loadSong('D_E1M1', midi);
    eng.loadSong('D_E1M2', midi);
    assert.equal(eng.switches, 2);
    assert.equal(eng.songName, 'D_E1M2');
    assert.ok(eng.songDurationSec() > 0);
    assert.equal(eng.play(), true);
    assert.equal(eng.renderChunk(0.5).length, 22050);
    assert.equal(midiNoteHz(69), 440);
  });
});
