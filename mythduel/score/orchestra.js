// Mythduel orchestration (Phase 4: Original Score and Battle Sound).
// Turns the binding cue map (story/duel.json music per beat) into a
// deterministic note-event list: the single source of truth shared by the
// offline WAV renderer (tools/render-audio.mjs), the live WebAudio
// performer (score/live-audio.js), and the audit gates.
//
// Every event start is quantized to the 24 fps frame grid (engine/frames.js)
// so the A/V sync drift bound is exactly zero: no note ever lands between
// frames. Phrase positions derive from the beat index, never from a running
// playhead, so the list is scrub-exact and byte-reproducible.
import { motifFor, semitoneToFreq } from './themes.js';
import { frameTime } from '../engine/frames.js';

export const ORCHESTRA_VERSION = 'mythduel-orchestra/1';
export const SCORE_SEED = 'mythduel-470-phase4';

// Base roots per motif family (Hz). Octave shifts per voice below.
const ROOTS = {
  'thor-row': 146.83,
  'zeus-row': 329.63,
  'clash-ostinato': 196.0,
  'resolution-hymn': 261.63,
};

// Voice registry: every voice the orchestra and the live performer know.
// offline = generator name in voices.js; live = WebAudio recipe name.
export const VOICES = {
  drum: { offline: 'drum', live: 'drum', octave: -1, baseGain: 0.5 },
  horn: { offline: 'horn', live: 'horn', octave: 0, baseGain: 0.34 },
  pluck: { offline: 'pluck', live: 'pluck', octave: 1, baseGain: 0.4 },
  bronze: { offline: 'bronze', live: 'bronze', octave: 1, baseGain: 0.34 },
  shaker: { offline: 'shaker', live: 'shaker', octave: 0, baseGain: 0.18 },
  deeppad: { offline: 'deeppad', live: 'deeppad', octave: -1, baseGain: 0.22 },
};

// March tempo per cue (bpm): the duel breathes slow over the terms, runs
// hot through the weapon beats, and settles into long tones for the loosing.
const TEMPO = {
  terms: 60,
  ranging: 76,
  'first-clash': 112,
  'thrown-sky': 120,
  'body-blows': 104,
  'storm-answers': 132,
  'final-exchange': 96,
  loosing: 56,
};

// Per-beat mix rides (score bus multiplier): the wager and the skyburst
// shout, the loosing settles quieter than any fight beat.
export const BEAT_RIDES = {
  b01: 0.8, b02: 0.85, b03: 0.95, b04: 1.0,
  b05: 0.95, b06: 1.0, b07: 0.9, b08: 0.75,
};

// One orchestration line: a voice playing the motif row sliced into notes.
function line(voice, beatsPerNote, gain, fromBeat, toBeat, degreeOffset) {
  return { voice, beatsPerNote, gain, fromBeat, toBeat, degreeOffset };
}

// Decide the voice lines for a beat from its cue (motif family + cue name).
export function orchestrate(beat) {
  if (!beat || !beat.music || typeof beat.music.cue !== 'string') {
    throw new Error('beat.music.cue must be a non-empty string');
  }
  const m = motifFor(beat.music);
  const tempo = TEMPO[beat.music.cue] || 72;
  const beatSec = 60 / Math.max(30, tempo);
  const totalBeats = Math.max(1, Math.round(beat.dur / beatSec));
  const fam = m.name;
  const lines = [];

  if (fam === 'thor-row' && beat.music.cue === 'terms') {
    // b01: the terms spoken over a held northern bed, horn call leading.
    lines.push(line('horn', 2, 0.5, 0, totalBeats, 0));
    lines.push(line('drum', 4, 0.5, 0, totalBeats, 0));
    lines.push(line('deeppad', 4, 0.3, 0, totalBeats, 0));
    return { family: fam, beat: beatSec, totalBeats, lines };
  }
  if (fam === 'zeus-row') {
    // b02: ranging circling, plucked figure with bronze answers.
    lines.push(line('pluck', 1, 0.45, 0, totalBeats, 1));
    lines.push(line('bronze', 4, 0.35, 0, totalBeats, 2));
    lines.push(line('drum', 4, 0.3, 0, totalBeats, 0));
    return { family: fam, beat: beatSec, totalBeats, lines };
  }
  if (fam === 'thor-row') {
    // b05: body blows, the northern row beaten heavy on the frame drum.
    lines.push(line('drum', 1, 0.6, 0, totalBeats, 0));
    lines.push(line('horn', 2, 0.45, 0, totalBeats, 0));
    lines.push(line('bronze', 2, 0.3, 0, totalBeats, 2));
    if (tempo >= 90) lines.push(line('shaker', 0.5, 0.3, 0, totalBeats, 0));
    return { family: fam, beat: beatSec, totalBeats, lines };
  }
  if (fam === 'resolution-hymn') {
    // b06/b08: long unison tones resolving the clash half-step.
    lines.push(line('horn', 2, beat.music.cue === 'loosing' ? 0.45 : 0.5, 0, totalBeats, 0));
    lines.push(line('deeppad', 4, beat.music.cue === 'loosing' ? 0.4 : 0.35, 0, totalBeats, 0));
    lines.push(line('bronze', 4, 0.4, 0, totalBeats, 2));
    lines.push(line('pluck', 2, beat.music.cue === 'loosing' ? 0.35 : 0.3, 0, totalBeats, 1));
    if (beat.music.cue === 'storm-answers') {
      // The skyburst pulse under the weathered storm: the loudest bed.
      lines.push(line('drum', 2, 0.45, 0, totalBeats, 0));
    }
    return { family: fam, beat: beatSec, totalBeats, lines };
  }
  // Clash ostinato (b03, b04, b07): interlocked drum-plus-bronze figure.
  lines.push(line('drum', 1, beat.music.cue === 'thrown-sky' ? 0.5 : 0.55, 0, totalBeats, 0));
  lines.push(line('bronze', beat.music.cue === 'thrown-sky' ? 1 : 2, 0.4, 0, totalBeats, 2));
  if (beat.music.cue === 'thrown-sky') {
    lines.push(line('pluck', 2, 0.35, 0, totalBeats, 1));
  } else {
    lines.push(line('horn', 2, 0.4, 0, totalBeats, 4));
  }
  if (tempo >= 90) lines.push(line('shaker', 0.5, beat.music.cue === 'final-exchange' ? 0.3 : 0.35, 0, totalBeats, 0));
  return { family: fam, beat: beatSec, totalBeats, lines };
}

// Frequency for one motif degree on a voice. Shared by the offline event
// builder and the live WebAudio performer so both play identical pitches.
export function noteFreq(family, deg, voiceName) {
  const { row } = motifFor({ motif: family });
  const semi = row[((deg % row.length) + row.length) % row.length] +
    12 * Math.floor(deg / row.length);
  const voice = VOICES[voiceName];
  if (!voice) throw new Error('unknown voice: ' + voiceName);
  let f = semitoneToFreq(ROOTS[family] || 261.63, semi);
  f *= Math.pow(2, voice.octave);
  if (voiceName === 'shaker') f = 6000;
  return f;
}

// Build the full deterministic note-event list for a timeline.
// Event: { beat, t, dur, f, voice, g, deg }. Times are frame-quantized.
export function buildScoreEvents(tl) {
  const events = [];
  for (let bi = 0; bi < tl.beats.length; bi++) {
    const beat = tl.beats[bi];
    const spec = orchestrate(beat);
    const rowLen = (motifFor({ motif: spec.family }).row || []).length || 8;
    for (const ln of spec.lines) {
      const voice = VOICES[ln.voice];
      if (!voice) throw new Error('unknown voice: ' + ln.voice);
      const stepBeats = ln.beatsPerNote;
      const n = Math.max(1, Math.floor((ln.toBeat - ln.fromBeat) / stepBeats));
      for (let k = 0; k < n; k++) {
        // The closing note of every line resolves: its degree snaps down to
        // the nearest motif-row root so no beat ends on a leaning tone, and
        // its tail extends exactly to the beat edge so the score never drops
        // out early. Mid-line notes join legato: each rings to the next
        // note's start instead of choking, so coverage is continuous without
        // adding or removing a single event (count stays pinned).
        const last = k === n - 1;
        let deg = ln.degreeOffset + ((bi * 5 + k) % 48);
        if (last) deg -= ((deg % rowLen) + rowLen) % rowLen;
        const f = noteFreq(spec.family, deg, ln.voice);
        const tRaw = beat.start + (ln.fromBeat + k * stepBeats) * spec.beat;
        const t = frameTime(Math.min(tRaw, beat.start + beat.dur - 0.001));
        const nextStart = beat.start + (ln.fromBeat + (k + 1) * stepBeats) * spec.beat;
        // Mid-line notes join legato at the next note; the closing note
        // always rings to the beat edge even when the beat grid undershoots
        // it, so no beat carries dead air at its tail.
        const dur = last
          ? beat.start + beat.dur - t
          : Math.min(nextStart - tRaw, beat.start + beat.dur - t);
        if (dur <= 0.01) continue;
        events.push({
          beat: beat.id,
          t, // frameTime output verbatim: re-rounding would lift the value
          // above its floored frame boundary and break the sync bound.
          dur: Math.round(dur * 1000000) / 1000000,
          f: Math.round(f * 1000) / 1000,
          voice: ln.voice,
          g: ln.gain * voice.baseGain,
          deg,
        });
      }
    }
  }
  events.sort((a, b) => (a.t - b.t) || (a.beat < b.beat ? -1 : 1));
  return events;
}

export function beatRideAt(tl, t) {
  for (const b of tl.beats || []) {
    if (t >= b.start && t < b.start + b.dur) return BEAT_RIDES[b.id] ?? 1;
  }
  return 1;
}
