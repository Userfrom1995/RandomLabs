// Mythduel sound regression suite (Phase 4).
// Run: node mythduel/tests/phase4-sound.mjs - exit non-zero on any failure.
// Covers: event coverage (every beat scored + foleyed, every voice used),
// tag-map completeness, frame-grid sync (drift exactly zero), offline
// determinism (events, voice samples, SFX samples, WAV bytes), mix bounds
// (exact length, peak ceiling, no NaN), committed stems matching the
// rebuild, ducking floors, and the live WebAudio performer under an
// AudioContext stub.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { motifFor } from '../score/themes.js';
import { buildScoreEvents, orchestrate, noteFreq, VOICES, ORCHESTRA_VERSION, BEAT_RIDES } from '../score/orchestra.js';
import { buildSfxEvents, renderSfxEvent, tagRecipe, SFX_VERSION, SFX_NAMES } from '../score/sfx.js';
import { liveDrumFreq } from '../score/live-audio.js';
import { renderVoice, resolveVoice, VOICE_NAMES } from '../score/voices.js';
import { renderMix, analyze, encodeWav, MIX_SAMPLE_RATE } from '../score/mix.js';
import { dialogueWindows, duckLevelAt, SCORE_FLOOR, SFX_FLOOR } from '../score/duck.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const tl = buildTimeline(duel);
const score = buildScoreEvents(tl);
const sfx = buildSfxEvents(tl);

// 1. coverage
const scoredBeats = new Set(score.map((e) => e.beat));
ok('every beat scored', tl.beats.every((b) => scoredBeats.has(b.id)), scoredBeats.size + '/8');
const foleyBeats = new Set(sfx.map((e) => e.beat));
const taggedBeats = tl.beats.filter((b) => (b.sfx || []).some((t) => tagRecipe(t) !== null));
ok('every tagged beat foleyed', taggedBeats.every((b) => foleyBeats.has(b.id)), foleyBeats.size + '/' + taggedBeats.length);
const usedVoices = new Set(score.map((e) => e.voice));
ok('all six score voices used', Object.keys(VOICES).every((v) => usedVoices.has(v)), [...usedVoices].join(','));
const usedGens = new Set(sfx.map((e) => e.gen));
for (const g of usedGens) ok('sfx generator known: ' + g, SFX_NAMES.includes(g));
ok('all eighteen sfx generators used', SFX_NAMES.every((g) => usedGens.has(g)), usedGens.size + '/18');
let tagsOk = true;
for (const b of tl.beats) {
  for (const tag of b.sfx || []) {
    try { tagRecipe(tag); } catch { tagsOk = false; }
  }
}
ok('every duel sfx tag maps', tagsOk);
ok('silence-hold honestly empty', tagRecipe('silence-hold') === null);
let cueResolve = true;
for (const b of tl.beats) { try { orchestrate(b); motifFor(b.music); } catch { cueResolve = false; } }
ok('every cue orchestrates', cueResolve);
ok('beat rides pinned', tl.beats.every((b) => Number.isFinite(BEAT_RIDES[b.id])), Object.keys(BEAT_RIDES).length + ' rides');

// continuous coverage: every beat scored from its first frame to its last
let coverOk = true;
for (const b of tl.beats) {
  const ev = score.filter((e) => e.beat === b.id);
  const first = Math.min(...ev.map((e) => e.t));
  const last = Math.max(...ev.map((e) => e.t + e.dur));
  if (Math.abs(first - b.start) > 1e-9 || Math.abs(last - (b.start + b.dur)) > 1e-6) coverOk = false;
}
ok('no dead air: score covers every beat edge to edge', coverOk);

// 2. sync: every event sits exactly on the frame grid
let drift = 0;
for (const e of [...score, ...sfx]) drift = Math.max(drift, Math.abs(e.t - frameTime(e.t)));
ok('A/V sync drift exactly zero', drift === 0, String(drift));
// event bounds: inside its own beat (1us slack for decimal rounding)
let bounds = true;
for (const e of score) {
  const beat = tl.beats.find((b) => b.id === e.beat);
  if (!beat || e.t < beat.start - 1e-6 || e.t + e.dur > beat.start + beat.dur + 1e-6) bounds = false;
}
ok('score events inside their beats', bounds);
let sfxBounds = true;
for (const e of sfx) {
  const beat = tl.beats.find((b) => b.id === e.beat);
  if (!beat || e.t < beat.start - 1e-6 || e.t + e.dur > beat.start + beat.dur + 1e-6) sfxBounds = false;
}
ok('sfx events inside their beats', sfxBounds);

// 3. offline determinism
const score2 = buildScoreEvents(tl);
ok('event list reproducible', JSON.stringify(score) === JSON.stringify(score2));
const sfx2 = buildSfxEvents(tl);
ok('sfx list reproducible', JSON.stringify(sfx) === JSON.stringify(sfx2));
const a = renderVoice('horn', 220, 0.5, MIX_SAMPLE_RATE, 'mythduel-470-phase4|b01|horn|3|220.000');
const b = renderVoice('horn', 220, 0.5, MIX_SAMPLE_RATE, 'mythduel-470-phase4|b01|horn|3|220.000');
ok('voice samples reproducible', a.length === b.length && a.every((v, i) => v === b[i]));
const x0 = sfx[0];
const xa = renderSfxEvent(x0, MIX_SAMPLE_RATE);
const xb = renderSfxEvent(x0, MIX_SAMPLE_RATE);
ok('sfx samples reproducible', xa.length === xb.length && xa.every((v, i) => v === xb[i]));
// Duplicate tags within one beat carry distinct occurrence seeds: the two
// b02 footfall-gravel events must not render identical buffers (no
// coherent +6 dB doubling).
const gravel = sfx.filter((e) => e.beat === 'b02' && e.tag === 'footfall-gravel').sort((p, q) => p.n - q.n);
ok('duplicate sfx tags carry occurrence seeds', gravel.length === 2 && gravel[0].n === 0 && gravel[1].n === 1);
const g0 = renderSfxEvent(gravel[0], MIX_SAMPLE_RATE);
const g1 = renderSfxEvent(gravel[1], MIX_SAMPLE_RATE);
ok('duplicate sfx tags render independently', g0.length === g1.length && g0.some((v, i) => v !== g1[i]));
// Live drum head matches the offline master (voices.js renderDrum:
// freq/2 clamped to [45, 140]).
const drumEv = score.find((e) => e.voice === 'drum');
ok('live drum head matches offline master',
  drumEv && Math.abs(liveDrumFreq(drumEv.f) - Math.max(45, Math.min(140, drumEv.f / 2))) < 1e-12);
// Malformed beat durations fail loud instead of an empty silent score.
let badDur = false;
try { orchestrate({ ...tl.beats[0], dur: NaN }); } catch { badDur = true; }
ok('malformed beat.dur throws', badDur);
const wavA = encodeWav(a, MIX_SAMPLE_RATE);
const wavB = encodeWav(b, MIX_SAMPLE_RATE);
ok('wav bytes reproducible', wavA.equals(wavB));
ok('wav header valid', wavA.subarray(0, 4).toString() === 'RIFF' && wavA.readUInt32LE(24) === MIX_SAMPLE_RATE);
let voicesOk = true;
for (const v of VOICE_NAMES) {
  try { resolveVoice(v); renderVoice(v, 220, 0.2, MIX_SAMPLE_RATE, 'test|' + v); }
  catch { voicesOk = false; }
}
ok('all offline voices render', voicesOk);
let badVoice = false;
try { resolveVoice('kazoo'); } catch { badVoice = true; }
ok('unknown voice throws', badVoice);
let badTag = false;
try { tagRecipe('dragon-roar'); } catch { badTag = true; }
ok('unknown sfx tag throws', badTag);
let badMotif = false;
try { motifFor({ motif: 'elevator' }); } catch { badMotif = true; }
ok('unknown motif throws', badMotif);

// 4. ducking floors: inside a voiced line the buses sit exactly on their
// floors; outside every window the envelope is fully open.
const windows = dialogueWindows(tl);
ok('duck windows built', windows.length > 0, windows.length + ' windows');
const firstCap = tl.beats[0].captions[0];
const midLine = tl.beats[0].start + firstCap.t + 0.5;
ok('score ducks to its floor on voiced lines',
  Math.abs(duckLevelAt(midLine, windows, SCORE_FLOOR) - SCORE_FLOOR) < 1e-9);
ok('sfx bed ducks to its floor on voiced lines',
  Math.abs(duckLevelAt(midLine, windows, SFX_FLOOR) - SFX_FLOOR) < 1e-9);
ok('score yields further than the bed', SCORE_FLOOR < SFX_FLOOR);
ok('envelope fully open outside windows', duckLevelAt(0, windows, SCORE_FLOOR) === 1);

// 5. mix bounds (full 172 s render)
const t0 = Date.now();
const { master, stems } = renderMix(tl, score, sfx, MIX_SAMPLE_RATE);
ok('full mix renders fast', Date.now() - t0 < 60000, (Date.now() - t0) + 'ms');
const stats = analyze(master);
ok('mix exact length', master.length === Math.ceil(tl.total * MIX_SAMPLE_RATE), master.length + ' samples');
ok('mix peak at ceiling', stats.peak <= 0.89 + 1e-6 && stats.peak > 0.5, stats.peak.toFixed(3));
ok('mix finite', stats.bad === 0, 'rms ' + stats.rms.toFixed(3));
ok('mix audible throughout', stats.rms > 0.02, stats.rms.toFixed(3));
const stemNames = ['score', 'sfx', 'drums', 'horns', 'strings', 'bronze', 'perc'];
ok('all stems present', stemNames.every((k) => stems[k] && stems[k].length === master.length));
let stemsAudible = true;
for (const k of stemNames) { if (analyze(stems[k]).rms <= 0.001) stemsAudible = false; }
ok('every stem audible', stemsAudible, stemNames.map((k) => k + '=' + analyze(stems[k]).rms.toFixed(4)).join(' '));
// skyburst louder than the loosing: b06 region vs b08 region
const slice = (tA, tB) => {
  let sum = 0;
  const n = Math.floor((tB - tA) * MIX_SAMPLE_RATE);
  for (let i = 0; i < n; i++) sum += master[Math.floor(tA * MIX_SAMPLE_RATE) + i] ** 2;
  return Math.sqrt(sum / n);
};
ok('skyburst louder than loosing', slice(106, 126) > slice(150, 172) * 1.2,
  'storm ' + slice(106, 126).toFixed(3) + ' vs loosing ' + slice(150, 172).toFixed(3));

// 6. committed stems match the rebuild byte-for-byte
const canon = (events) => JSON.stringify(events);
const committedScore = JSON.parse(readFileSync(join(root, 'score/score-events.json'), 'utf8'));
const committedSfx = JSON.parse(readFileSync(join(root, 'score/sfx-events.json'), 'utf8'));
ok('committed score matches rebuild', canon(committedScore.events) === canon(score), score.length + ' events');
ok('committed sfx matches rebuild', canon(committedSfx.events) === canon(sfx), sfx.length + ' events');
void ORCHESTRA_VERSION; void SFX_VERSION;

// 7. live performer under an AudioContext stub
let oscCount = 0;
function param(v) {
  return {
    value: v,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
  };
}
function audioNode() {
  return {
    connect() {}, start() {}, stop() {},
    gain: param(0), frequency: param(440), detune: param(0),
    playbackRate: param(1), type: '',
  };
}
const FakeAC = function () {
  return {
    sampleRate: 44100, currentTime: 0, state: 'running', destination: {},
    resume() {},
    createGain: () => audioNode(),
    createOscillator: () => { oscCount++; return audioNode(); },
    createBiquadFilter: () => audioNode(),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => audioNode(),
  };
};
globalThis.window = { AudioContext: FakeAC };
const { createPerformer } = await import('../score/live-audio.js');
let liveOk = true;
try {
  tl.beats.forEach((beat, bi) => {
    const p = createPerformer();
    p.unlock();
    p.setCue(beat.music, beat, bi);
    if (!p.start()) throw new Error('start refused on ' + beat.id);
    p.setVolume(0.5);
    p.setMuted(true); p.setMuted(false);
    p.stop();
  });
} catch { liveOk = false; }
ok('live performer plays all 8 cues', liveOk);
const rich = tl.beats.find((beat) => beat.id === 'b06');
const sparse = tl.beats.find((beat) => beat.id === 'b01');
const p1 = createPerformer(); p1.unlock(); p1.setCue(rich.music, rich, 5);
oscCount = 0; p1.start(); p1.stop();
const richOsc = oscCount;
const p2 = createPerformer(); p2.unlock(); p2.setCue(sparse.music, sparse, 0);
oscCount = 0; p2.start(); p2.stop();
const sparseOsc = oscCount;
// b06 opens with 5 voices (horn, deeppad x2, bronze x2, pluck, drum =
// 7 oscillators); b01 opens with horn, drum, deeppad x2 (4 oscillators).
ok('storm cue polyphonic, terms sparse', richOsc >= 6 && sparseOsc <= 4, 'b06=' + richOsc + ' b01=' + sparseOsc);
// live cue-opening pitches match the offline master
const first = (beatId) => score.filter((e) => e.beat === beatId).sort((x, y) => x.t - y.t)[0];
const b06first = first('b06');
const degCheck = noteFreq('resolution-hymn', b06first.deg, b06first.voice);
ok('live note math matches master', Math.abs(degCheck - b06first.f) < 0.002, b06first.f + 'Hz');
delete globalThis.window;

if (failures) { console.error('SOUND RED'); process.exit(1); }
console.log('SOUND GREEN');
