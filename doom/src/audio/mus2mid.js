// MUS to SMF Type 0 converter (research spec 5.2). Pure dependency-free port
// of the Crispy Doom single-track mus2mid: MUS event stream (140 Hz deltas)
// becomes one MIDI track. Golden-tested in tests/test-m3-audio.mjs.
//
// MUS header: 'MUS\x1A', u16 scoreLen, u16 scoreStart, u16 channels,
// u16 secChannels, u16 instrCount, u16 dummy, then instrCount u16 patch ids.
// Event descriptor byte: bit 7 = last-in-timeslice; bits 4-6 = type;
// bits 0-3 = channel (0-15, 15 = drums). After the stream's timed events a
// varlen delta precedes the next timeslice when the last flag was set.
export const MUS_MAGIC = [0x4d, 0x55, 0x53, 0x1a];
export const MUS_HZ = 140;
// MIDI file division: 70 ticks per quarter note, so one MUS tick (1/140 s)
// maps to half a MIDI tick at 120 bpm (quarter = 0.5 s = 70 MUS ticks).
export const MIDI_DIVISION = 70;
export const MIDI_TEMPO_USQ = 500000;

const TYPE_RELEASE = 0;
const TYPE_PLAY = 1;
const TYPE_BEND = 2;
const TYPE_SYSTEM = 3;
const TYPE_CONTROLLER = 4;
const TYPE_END = 6;

// MUS controller number to MIDI action. Type tag 'program' emits a program
// change on the mapped channel; 'control' emits controller number cc.
const CONTROLLER_MAP = {
  0: { type: 'program' },
  1: { type: 'control', cc: 0 },
  2: { type: 'control', cc: 1 },
  3: { type: 'control', cc: 7 },
  4: { type: 'control', cc: 10 },
  5: { type: 'control', cc: 11 },
  6: { type: 'control', cc: 91 },
  7: { type: 'control', cc: 93 },
  8: { type: 'control', cc: 120, fixed: 0 },
  9: { type: 'control', cc: 123, fixed: 0 },
};

// MUS system event to MIDI controller reset on every channel.
const SYSTEM_MAP = {
  10: { cc: 120, value: 0 },
  11: { cc: 123, value: 0 },
  12: { cc: 126, value: 0 },
  13: { cc: 127, value: 0 },
  14: { cc: 121, value: 0 },
};

function fail(code, actual) {
  throw Object.assign(new Error(`MUS ${code}: ${actual}`), { code });
}

// MUS melodic channels 0-14 map around MIDI drums: below 9 identity,
// 9-14 shift up one; MUS 15 (drums) maps to MIDI 9.
export function musChannelToMidi(ch) {
  if (ch === 15) return 9;
  return ch < 9 ? ch : ch + 1;
}

function readVarLen(u8, pos, end) {
  let value = 0;
  for (;;) {
    if (pos >= end) fail('E_MUS_TRUNCATED', 'varlen delta runs past score end');
    const b = u8[pos++];
    value = (value << 7) | (b & 0x7f);
    if (!(b & 0x80)) break;
  }
  return { value, pos };
}

function writeVarLen(out, value) {
  let v = Math.max(0, Math.round(value));
  const bytes = [v & 0x7f];
  v >>>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  for (const b of bytes) out.push(b);
}

// MUS volume bytes can exceed MIDI 127; naive clamping glitches tracks, so
// the converter scales the whole track by 127/Vmax when Vmax > 127
// (two-pass; continuous, no discontinuity at the 127 boundary).
export function scaleMusVolume(value, trackMax) {
  if (trackMax <= 127) return Math.max(0, Math.min(127, Math.round(value)));
  return Math.max(0, Math.min(127, Math.round((value * 127) / trackMax)));
}

export function musToMidi(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length < 16) fail('E_MUS_TRUNCATED', `header needs 16 bytes, got ${u8.length}`);
  for (let i = 0; i < 4; i++) {
    if (u8[i] !== MUS_MAGIC[i]) fail('E_MUS_MAGIC', `byte ${i} is ${u8[i]}, want ${MUS_MAGIC[i]}`);
  }
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const scoreLen = view.getUint16(4, true);
  const scoreStart = view.getUint16(6, true);
  const instrCount = view.getUint16(12, true);
  const scoreEnd = scoreStart + scoreLen;
  if (scoreStart < 16 + instrCount * 2 || scoreEnd > u8.length) {
    fail('E_MUS_TRUNCATED', `score [${scoreStart}, ${scoreEnd}) outside lump ${u8.length}`);
  }

  // Pass 1: decode timed events, remembering peak volume for scaling.
  const events = [];
  const lastVel = new Array(16).fill(100);
  let trackMaxVol = 0;
  let pos = scoreStart;
  let musTime = 0;
  let ended = false;
  let guard = scoreLen * 4 + 1024;
  while (pos < scoreEnd && !ended) {
    if (--guard <= 0) fail('E_MUS_TRUNCATED', 'event stream guard exhausted');
    const desc = u8[pos++];
    const last = !!(desc & 0x80);
    const type = (desc >> 4) & 0x07;
    const ch = desc & 0x0f;
    const need = (n, what) => {
      if (pos + n > scoreEnd) fail('E_MUS_TRUNCATED', `${what} overruns score end`);
    };
    if (type === TYPE_RELEASE) {
      need(1, 'release note');
      events.push({ t: musTime, kind: 'off', ch, note: u8[pos++] & 0x7f });
    } else if (type === TYPE_PLAY) {
      need(1, 'play note');
      const nb = u8[pos++];
      const note = nb & 0x7f;
      let vel = lastVel[ch];
      if (nb & 0x80) {
        need(1, 'play velocity');
        vel = u8[pos++];
        lastVel[ch] = vel;
        if (vel > trackMaxVol) trackMaxVol = vel;
      } else if (vel > trackMaxVol) trackMaxVol = vel;
      events.push({ t: musTime, kind: 'on', ch, note, vel });
    } else if (type === TYPE_BEND) {
      need(1, 'bend amount');
      const b = u8[pos++];
      events.push({ t: musTime, kind: 'bend', ch, value: Math.round((b * 16383) / 255) });
    } else if (type === TYPE_SYSTEM) {
      need(1, 'system number');
      const sys = u8[pos++];
      const m = SYSTEM_MAP[sys];
      if (m) events.push({ t: musTime, kind: 'sys', ...m });
    } else if (type === TYPE_CONTROLLER) {
      need(2, 'controller pair');
      const num = u8[pos++];
      const val = u8[pos++];
      const m = CONTROLLER_MAP[num];
      if (m) {
        if (num === 3 && val > trackMaxVol) trackMaxVol = val;
        events.push({ t: musTime, kind: 'ctrl', ch, num, val });
      }
    } else if (type === TYPE_END) {
      events.push({ t: musTime, kind: 'end' });
      ended = true;
    } else {
      fail('E_MUS_TRUNCATED', `unknown event type ${type} at score offset ${pos - 1 - scoreStart}`);
    }
    if (last && !ended) {
      const d = readVarLen(u8, pos, scoreEnd);
      pos = d.pos;
      musTime += d.value;
    }
  }
  if (!ended) fail('E_MUS_TRUNCATED', 'score ends without an end-of-score event');

  // Pass 2: emit SMF Type 0 track with scaled volumes.
  const track = [];
  const push = (...b) => { for (const x of b) track.push(x & 0xff); };
  // Tempo meta first (120 bpm), zero delta.
  push(0x00, 0xff, 0x51, 0x03, (MIDI_TEMPO_USQ >> 16) & 0xff, (MIDI_TEMPO_USQ >> 8) & 0xff, MIDI_TEMPO_USQ & 0xff);
  let prevMidi = 0;
  let noteCount = 0;
  for (const e of events) {
    const midiT = Math.round((e.t * MIDI_DIVISION * 2) / MUS_HZ);
    const delta = midiT - prevMidi;
    prevMidi = midiT;
    if (e.kind === 'on') {
      writeVarLen(track, delta);
      push(0x90 | musChannelToMidi(e.ch), e.note & 0x7f, scaleMusVolume(e.vel, trackMaxVol));
      noteCount++;
    } else if (e.kind === 'off') {
      writeVarLen(track, delta);
      push(0x80 | musChannelToMidi(e.ch), e.note & 0x7f, 0x40);
    } else if (e.kind === 'bend') {
      writeVarLen(track, delta);
      push(0xe0 | musChannelToMidi(e.ch), e.value & 0x7f, (e.value >> 7) & 0x7f);
    } else if (e.kind === 'sys') {
      for (let c = 0; c < 16; c++) {
        if (c === 0) writeVarLen(track, delta);
        else push(0x00);
        push(0xb0 | c, e.cc, e.value);
      }
    } else if (e.kind === 'ctrl') {
      const m = CONTROLLER_MAP[e.num];
      const mc = musChannelToMidi(e.ch);
      writeVarLen(track, delta);
      if (m.type === 'program') push(0xc0 | mc, e.val & 0x7f);
      else if (m.fixed !== undefined) push(0xb0 | mc, m.cc, m.fixed);
      else if (e.num === 3) push(0xb0 | mc, m.cc, scaleMusVolume(e.val, trackMaxVol));
      else push(0xb0 | mc, m.cc, e.val & 0x7f);
    } else if (e.kind === 'end') {
      writeVarLen(track, delta);
      push(0xff, 0x2f, 0x00);
    }
  }

  const midi = new Uint8Array(14 + 8 + track.length);
  const mv = new DataView(midi.buffer);
  midi.set([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1], 0);
  mv.setUint16(12, MIDI_DIVISION, false);
  midi.set([0x4d, 0x54, 0x72, 0x6b], 14);
  mv.setUint32(18, track.length, false);
  midi.set(track, 22);
  return {
    midi,
    stats: { events: events.length, notes: noteCount, trackMaxVol, scaled: trackMaxVol > 127 },
  };
}
