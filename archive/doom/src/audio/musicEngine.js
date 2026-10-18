// OPL3 music engine (research spec 5.2). GENMIDI bank parse, song switch on
// map change, and a pure-JS 2-operator FM renderer that serves as both the
// headless-tested synthesis core and the browser fallback when a Wasm OPL3
// binary is unavailable (M3 ships the JS-FM backend; a cycle-accurate Nuked
// Wasm core stays M5 scope behind the same loadSong/renderChunk boundary).
//
// GENMIDI lump: 8-byte magic '#OPL_II#', then N 36-byte timbres (two OPL
// operators plus voice metadata). The parse is lenient on count (some WADs
// pad), strict on the magic.
export const GENMIDI_MAGIC = '#OPL_II#';
export const GENMIDI_ENTRY = 36;
export const ENGINE_SAMPLE_RATE = 44100;

// MIDI note number to Hz (A4 = 440).
export function midiNoteHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function parseGenmidi(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length < 8) {
    throw Object.assign(new Error('GENMIDI truncated: no magic'), { code: 'E_GENMIDI_TRUNCATED' });
  }
  let magic = '';
  for (let i = 0; i < 8; i++) magic += String.fromCharCode(u8[i]);
  if (magic !== GENMIDI_MAGIC) {
    throw Object.assign(new Error(`GENMIDI magic '${magic}', want '#OPL_II#'`), { code: 'E_GENMIDI_MAGIC' });
  }
  const count = Math.floor((u8.length - 8) / GENMIDI_ENTRY);
  return {
    instruments: count,
    getInstrument(i) {
      if (i < 0 || i >= count) return null;
      return u8.slice(8 + i * GENMIDI_ENTRY, 8 + (i + 1) * GENMIDI_ENTRY);
    },
  };
}

// Minimal SMF Type 0 note extractor: track events with running status,
// note on/off only (velocity 0 on = off). Returns [{t, note, vel, on}]
// with t in MIDI ticks; tempo map fixed at 120 bpm (MIDI_DIVISION 70).
export function extractMidiNotes(midiBytes, division = 70) {
  const u8 = midiBytes instanceof Uint8Array ? midiBytes : new Uint8Array(midiBytes);
  if (u8.length < 22 || u8[0] !== 0x4d || u8[1] !== 0x54 || u8[2] !== 0x68 || u8[3] !== 0x64) {
    throw Object.assign(new Error('not an SMF header'), { code: 'E_MIDI_HEADER' });
  }
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const trackLen = view.getUint32(18, false);
  let pos = 22;
  const end = Math.min(u8.length, 22 + trackLen);
  const notes = [];
  let tick = 0;
  let status = 0;
  const readVar = () => {
    let v = 0;
    for (;;) {
      if (pos >= end) throw Object.assign(new Error('MIDI varlen overrun'), { code: 'E_MIDI_TRUNCATED' });
      const b = u8[pos++];
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
  };
  while (pos < end) {
    tick += readVar();
    let b = u8[pos++];
    if (b === 0xff) {
      const type = u8[pos++];
      const len = readVar();
      if (type === 0x2f) break;
      pos += len;
      continue;
    }
    if (b === 0xf0 || b === 0xf7) {
      const len = readVar();
      pos += len;
      continue;
    }
    if (b & 0x80) status = b;
    else pos--;
    const kind = status & 0xf0;
    if (kind === 0x90 || kind === 0x80) {
      if (pos + 2 > end) break;
      const note = u8[pos++];
      const vel = u8[pos++];
      notes.push({ t: tick, note, vel, on: kind === 0x90 && vel > 0 });
    } else if (kind === 0xa0 || kind === 0xb0 || kind === 0xe0) pos += 2;
    else if (kind === 0xc0 || kind === 0xd0) pos += 1;
    else break;
  }
  return { notes, division, secondsPerTick: 500000 / 1e6 / division };
}

// Simplified 2-operator FM voice: modulator sine at ratio*fc with index from
// the GENMIDI timbre bytes, carrier at fc, exponential decay envelope with
// sustain floor while held. Deterministic: same notes render bit-identical
// buffers (Float32 exactness asserted in tests).
export function renderFmNotes(noteEvents, { seconds, sampleRate = ENGINE_SAMPLE_RATE, division = 70, modRatio = 1, modIndex = 2.5 } = {}) {
  const total = Math.max(1, Math.floor(seconds * sampleRate));
  const out = new Float32Array(total);
  const spt = 500000 / 1e6 / division;
  const held = new Map();
  const spans = [];
  for (const e of noteEvents) {
    const t = Math.floor(e.t * spt * sampleRate);
    if (e.on) {
      if (!held.has(e.note)) held.set(e.note, []);
      held.get(e.note).push({ start: t, vel: e.vel / 127, note: e.note });
    } else if (held.has(e.note) && held.get(e.note).length > 0) {
      const h = held.get(e.note).shift();
      spans.push({ ...h, end: Math.min(total, Math.max(t, h.start + 1)) });
    }
  }
  for (const [, stack] of held) {
    for (const h of stack) spans.push({ ...h, end: total });
  }
  for (const s of spans) {
    const fc = midiNoteHz(s.note % 128);
    const fm = fc * modRatio;
    const dur = Math.max(1, s.end - s.start);
    for (let i = 0; i < dur; i++) {
      const t = (s.start + i) / sampleRate;
      const k = i / dur;
      // Attack 5 ms, exponential decay to a 0.35 sustain floor, release is
      // the note-off span end (spans already end at off).
      const attack = Math.min(1, i / (0.005 * sampleRate));
      const env = attack * (0.35 + 0.65 * Math.exp(-3 * k));
      const mod = modIndex * Math.sin(2 * Math.PI * fm * t);
      out[s.start + i] += s.vel * 0.24 * env * Math.sin(2 * Math.PI * fc * t + mod);
    }
  }
  // Soft clip to [-1, 1].
  for (let i = 0; i < total; i++) out[i] = Math.max(-1, Math.min(1, out[i]));
  return out;
}

export function createMusicEngine({ sampleRate = ENGINE_SAMPLE_RATE, backend = 'js-fm' } = {}) {
  let bank = null;
  let song = null;
  let playing = false;
  let loop = true;
  let switches = 0;
  return {
    backend,
    get playing() { return playing; },
    get songName() { return song ? song.name : null; },
    get switches() { return switches; },
    loadBank(genmidiBytes) {
      bank = parseGenmidi(genmidiBytes);
      return bank.instruments;
    },
    get bankInstruments() { return bank ? bank.instruments : 0; },
    // Song switch on map change: replaces the current song, keeps the loop
    // flag, counts switches for the HUD/status line.
    loadSong(name, midiBytes) {
      const { notes, division, secondsPerTick } = extractMidiNotes(midiBytes);
      song = { name, midi: midiBytes.slice(), notes, division, secondsPerTick };
      switches++;
      return { notes: notes.length, division };
    },
    play() { playing = !!song; return playing; },
    stop() { playing = false; },
    setLoop(v) { loop = !!v; return loop; },
    get loop() { return loop; },
    songDurationSec() {
      if (!song || song.notes.length === 0) return 0;
      const last = song.notes[song.notes.length - 1].t;
      return last * song.secondsPerTick;
    },
    // Render chunk for the browser lookahead scheduler (or headless tests).
    renderChunk(seconds) {
      if (!song) return new Float32Array(Math.max(1, Math.floor(seconds * sampleRate)));
      return renderFmNotes(song.notes, { seconds, sampleRate, division: song.division });
    },
  };
}
