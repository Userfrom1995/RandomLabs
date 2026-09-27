// Hearthlight full orchestration (Phase 4).
// Turns the binding cue map (story/screenplay.json music per shot) into a
// deterministic note-event list: the single source of truth shared by the
// offline WAV renderer (tools/render-audio.mjs), the live WebAudio
// performer (score/animatic-audio.js), and the audit gates.
//
// Every event start is quantized to the 24 fps frame grid (engine/frames.js)
// so the A/V sync drift bound is exactly zero: no note ever lands between
// frames. Phrase positions derive from the shot index, never from a running
// playhead, so the list is scrub-exact and byte-reproducible.
import { motifFor, semitoneToFreq } from './themes.js';
import { frameTime } from '../engine/frames.js';

export const ORCHESTRA_VERSION = 'hearthlight-orchestra/1';
export const SCORE_SEED = '20260927';

// Base roots per motif family (Hz). Octave shifts per voice below.
const ROOTS = { nia: 392.0, wind: 329.63, ruel: 146.83, cairn: 261.63 };

// Voice registry: every voice the orchestra and the live performer know.
// offline = generator name in voices.js; live = WebAudio recipe name.
export const VOICES = {
  woodwind: { offline: 'woodwind', live: 'woodwind', octave: 0, baseGain: 0.5 },
  violin: { offline: 'strings', live: 'strings', octave: 1, baseGain: 0.42 },
  strings: { offline: 'strings', live: 'strings', octave: 0, baseGain: 0.34 },
  cello: { offline: 'strings', live: 'strings', octave: -1, baseGain: 0.4 },
  bass: { offline: 'bass', live: 'bass', octave: -1, baseGain: 0.42 },
  brass: { offline: 'brass', live: 'brass', octave: 0, baseGain: 0.3 },
  bells: { offline: 'bells', live: 'bells', octave: 1, baseGain: 0.36 },
  pad: { offline: 'pad', live: 'pad', octave: -1, baseGain: 0.22 },
  timpani: { offline: 'timpani', live: 'timpani', octave: -1, baseGain: 0.4 },
  shaker: { offline: 'shaker', live: 'shaker', octave: 0, baseGain: 0.2 },
};

const MOOD = {
  strings: /string|pad|swell|surge|arrival|united|bloom|full|choir|hymn|lullaby|cadence|warmth|intertwined/,
  low: /low|contrabass|cello|weight|ostinato|tread|bassoon/,
  brass: /brass/,
  bells: /bell/,
  perc: /percussion|ice|surge|scream|short-bowed|aggressive/,
  hushed: /hush|near silence|silence|sparse|thread|farewell|hint|fragment|unresolved/,
};

// One orchestration line: a voice playing the motif row sliced into notes.
function line(voice, beatsPerNote, gain, fromBeat, toBeat, degreeOffset) {
  return { voice, beatsPerNote, gain, fromBeat, toBeat, degreeOffset };
}

// Decide the voice lines for a shot from its cue (motif family + mood).
export function orchestrate(shot) {
  const m = motifFor(shot.music);
  const mood = shot.music.mood || '';
  const tempo = shot.music.tempo || 60;
  const beat = 60 / Math.max(30, tempo);
  const totalBeats = Math.max(1, Math.round(shot.dur / beat));
  const fam = m.name;
  const has = (re) => re.test(mood);
  const lines = [];

  if (shot.music.cue === 'blue-thread') {
    // s14: near silence, a single violin thread every two beats.
    lines.push(line('violin', 2, 0.5, 0, totalBeats, 0));
    return { family: fam, beat, totalBeats, lines };
  }
  if (fam === 'ruel' && /ostinato|weight|tread|contrabass/.test(mood)) {
    // Ruel's dotted tread: cello ostinato under a low root drone.
    lines.push(line('cello', 1, 0.55, 0, totalBeats, 0));
    lines.push(line('bass', 4, 0.5, 0, totalBeats, 0));
    if (has(MOOD.strings)) lines.push(line('strings', 4, 0.25, 0, totalBeats, 2));
    return { family: fam, beat, totalBeats, lines };
  }
  if (fam === 'cairn' && /long notes|chorale|arrival|blaz|united|cadence|gathering/.test(mood)) {
    // Cairn hymn: slow string chorale, brass and bells at the blaze.
    lines.push(line('strings', 2, 0.5, 0, totalBeats, 0));
    lines.push(line('cello', 2, 0.4, 0, totalBeats, 0));
    if (has(MOOD.brass) || /blaz|arrival|united/.test(mood)) {
      lines.push(line('brass', 2, 0.4, 0, totalBeats, 0));
    }
    if (has(MOOD.bells) || /united/.test(mood)) {
      lines.push(line('bells', 4, 0.5, 0, totalBeats, 0));
    }
    if (/united/.test(mood)) {
      lines.push(line('woodwind', 1, 0.4, 0, totalBeats, 0));
      lines.push(line('timpani', 4, 0.35, 0, totalBeats, 0));
    }
    return { family: fam, beat, totalBeats, lines };
  }

  // Default songful line: woodwind lead over strings, colors by mood.
  lines.push(line('woodwind', 1, has(MOOD.hushed) ? 0.4 : 0.5, 0, totalBeats, 0));
  if (has(MOOD.strings) || !has(MOOD.hushed)) {
    lines.push(line('strings', 2, has(MOOD.hushed) ? 0.18 : 0.3, 0, totalBeats, 2));
  }
  if (has(MOOD.low)) lines.push(line('cello', 2, 0.35, 0, totalBeats, 0));
  if (has(MOOD.brass)) lines.push(line('brass', 2, 0.35, 0, totalBeats, 0));
  if (has(MOOD.bells)) lines.push(line('bells', 4, 0.45, 0, totalBeats, 0));
  if (has(MOOD.perc) && tempo >= 72) {
    lines.push(line('timpani', 2, 0.32, 0, totalBeats, 0));
    if (tempo >= 90) lines.push(line('shaker', 0.5, 0.35, 0, totalBeats, 0));
  }
  if (/hushed|cradle|lullaby/.test(mood)) {
    lines.push(line('pad', 4, 0.3, 0, totalBeats, 0));
  }
  return { family: fam, beat, totalBeats, lines };
}

// Frequency for one motif degree on a voice. Shared by the offline event
// builder and the live WebAudio performer so both play identical pitches.
export function noteFreq(family, deg, voiceName, majorLift) {
  const { row } = motifFor({ motif: family });
  const semi = row[((deg % row.length) + row.length) % row.length] +
    12 * Math.floor(deg / row.length);
  const voice = VOICES[voiceName];
  if (!voice) throw new Error('unknown voice: ' + voiceName);
  let f = semitoneToFreq(ROOTS[family] || 392, semi);
  f *= Math.pow(2, voice.octave);
  if (majorLift) f *= Math.pow(2, 4 / 12);
  if (voiceName === 'shaker') f = 6000;
  return f;
}
// Build the full deterministic note-event list for a timeline.
// Event: { shot, t, dur, f, voice, g, deg }. Times are frame-quantized.
export function buildScoreEvents(tl) {
  const events = [];
  for (let si = 0; si < tl.shots.length; si++) {
    const shot = tl.shots[si];
    const spec = orchestrate(shot);
    const majorLift = (shot.music.motif || '').includes('major');
    for (const ln of spec.lines) {
      const voice = VOICES[ln.voice];
      if (!voice) throw new Error('unknown voice: ' + ln.voice);
      const stepBeats = ln.beatsPerNote;
      const n = Math.max(1, Math.floor((ln.toBeat - ln.fromBeat) / stepBeats));
      for (let k = 0; k < n; k++) {
        const deg = ln.degreeOffset + ((si * 3 + k) % 48);
        const f = noteFreq(spec.family, deg, ln.voice, majorLift);
        const tRaw = shot.start + (ln.fromBeat + k * stepBeats) * spec.beat;
        const t = frameTime(Math.min(tRaw, shot.start + shot.dur - 0.001));
        const dur = Math.min(stepBeats * spec.beat * 0.95, shot.start + shot.dur - t);
        if (dur <= 0.01) continue;
        events.push({
          shot: shot.id,
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
  events.sort((a, b) => (a.t - b.t) || (a.shot < b.shot ? -1 : 1));
  return events;
}

// Per-act mix rides (score bus multiplier): the storm shouts, the blue
// thread nearly vanishes, the dawn arrival blooms.
export const ACT_RIDES = { 1: 0.85, 2: 0.9, 3: 0.95, 4: 0.7, 5: 1.0 };

export function actRideAt(tl, t) {
  const acts = tl.acts || [];
  for (const a of acts) {
    if (t >= a.start && t < a.start + a.dur) return ACT_RIDES[a.n] ?? 1;
  }
  return 1;
}
