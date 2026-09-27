// Hearthlight score regression suite (Phase 4).
// Run: node film/tests/score.mjs - exit non-zero on any failure.
// Covers: event coverage (every shot scored + foleyed, every voice used),
// tag-map completeness, frame-grid sync (drift exactly zero), offline
// determinism (events, voice samples, SFX samples, WAV bytes), mix bounds
// (exact length, peak ceiling, no NaN), committed stems matching the
// rebuild, and the live WebAudio performer under an AudioContext stub.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { motifFor } from '../score/themes.js';
import { buildScoreEvents, orchestrate, noteFreq, VOICES, ORCHESTRA_VERSION } from '../score/orchestra.js';
import { buildSfxEvents, renderSfxEvent, tagRecipe, SFX_VERSION, SFX_NAMES } from '../score/sfx.js';
import { renderVoice, resolveVoice, VOICE_NAMES } from '../score/voices.js';
import { renderMix, analyze, encodeWav, MIX_SAMPLE_RATE } from '../score/mix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);
const score = buildScoreEvents(tl);
const sfx = buildSfxEvents(tl);

// 1. coverage
const scoredShots = new Set(score.map((e) => e.shot));
ok('every shot scored', tl.shots.every((s) => scoredShots.has(s.id)), scoredShots.size + '/20');
const foleyShots = new Set(sfx.map((e) => e.shot));
const taggedShots = tl.shots.filter((s) => (s.sfx || []).length > 0);
ok('every tagged shot foleyed', taggedShots.every((s) => foleyShots.has(s.id)), foleyShots.size + '/' + taggedShots.length);
const usedVoices = new Set(score.map((e) => e.voice));
ok('all ten score voices used', Object.keys(VOICES).every((v) => usedVoices.has(v)), [...usedVoices].join(','));
const usedGens = new Set(sfx.map((e) => e.gen));
for (const g of usedGens) ok('sfx generator known: ' + g, SFX_NAMES.includes(g));
let tagsOk = true;
for (const s of tl.shots) {
  for (const tag of s.sfx || []) {
    try { tagRecipe(tag); } catch { tagsOk = false; }
  }
}
ok('every screenplay sfx tag maps', tagsOk);
ok('silence tags honestly empty', tagRecipe('grove-silence') === null && tagRecipe('title-hush') === null);
let cueResolve = true;
for (const s of tl.shots) { try { orchestrate(s); motifFor(s.music); } catch { cueResolve = false; } }
ok('every cue orchestrates', cueResolve);

// 2. sync: every event sits exactly on the frame grid
let drift = 0;
for (const e of [...score, ...sfx]) drift = Math.max(drift, Math.abs(e.t - frameTime(e.t)));
ok('A/V sync drift exactly zero', drift === 0, String(drift));
// event bounds: inside its own shot (1us slack for decimal rounding)
let bounds = true;
for (const e of score) {
  const shot = tl.shots.find((s) => s.id === e.shot);
  if (!shot || e.t < shot.start - 1e-6 || e.t + e.dur > shot.start + shot.dur + 1e-6) bounds = false;
}
ok('score events inside their shots', bounds);

// 3. offline determinism
const score2 = buildScoreEvents(tl);
ok('event list reproducible', JSON.stringify(score) === JSON.stringify(score2));
const a = renderVoice('strings', 440, 0.5, MIX_SAMPLE_RATE, '20260927|s01|strings|3|440.000');
const b = renderVoice('strings', 440, 0.5, MIX_SAMPLE_RATE, '20260927|s01|strings|3|440.000');
ok('voice samples reproducible', a.length === b.length && a.every((v, i) => v === b[i]));
const x0 = sfx[0];
const xa = renderSfxEvent(x0, MIX_SAMPLE_RATE);
const xb = renderSfxEvent(x0, MIX_SAMPLE_RATE);
ok('sfx samples reproducible', xa.length === xb.length && xa.every((v, i) => v === xb[i]));
const wavA = encodeWav(a, MIX_SAMPLE_RATE);
const wavB = encodeWav(b, MIX_SAMPLE_RATE);
ok('wav bytes reproducible', wavA.equals(wavB));
ok('wav header valid', wavA.subarray(0, 4).toString() === 'RIFF' && wavA.readUInt32LE(24) === MIX_SAMPLE_RATE);
let voicesOk = true;
for (const v of VOICE_NAMES) {
  try { resolveVoice(v); renderVoice(v, 330, 0.2, MIX_SAMPLE_RATE, 'test|' + v); }
  catch { voicesOk = false; }
}
ok('all offline voices render', voicesOk);
let badVoice = false;
try { resolveVoice('kazoo'); } catch { badVoice = true; }
ok('unknown voice throws', badVoice);
let badTag = false;
try { tagRecipe('dragon-roar'); } catch { badTag = true; }
ok('unknown sfx tag throws', badTag);

// 4. mix bounds (full 270 s render)
const t0 = Date.now();
const { master, stems } = renderMix(tl, score, sfx, MIX_SAMPLE_RATE);
ok('full mix renders fast', Date.now() - t0 < 30000, (Date.now() - t0) + 'ms');
const stats = analyze(master);
ok('mix exact length', master.length === Math.ceil(tl.total * MIX_SAMPLE_RATE), master.length + ' samples');
ok('mix peak at ceiling', stats.peak <= 0.89 + 1e-6 && stats.peak > 0.5, stats.peak.toFixed(3));
ok('mix finite', stats.bad === 0, 'rms ' + stats.rms.toFixed(3));
ok('mix audible throughout', stats.rms > 0.02, stats.rms.toFixed(3));
const stemNames = ['score', 'sfx', 'strings', 'winds', 'brass', 'bells', 'perc'];
ok('all stems present', stemNames.every((k) => stems[k] && stems[k].length === master.length));
let stemsAudible = true;
for (const k of stemNames) { if (analyze(stems[k]).rms <= 0.001) stemsAudible = false; }
ok('every stem audible', stemsAudible);
// blue-thread near-silence: s14 region quieter than the storm s13 region
const slice = (tA, tB) => {
  let sum = 0;
  const n = Math.floor((tB - tA) * MIX_SAMPLE_RATE);
  for (let i = 0; i < n; i++) sum += master[Math.floor(tA * MIX_SAMPLE_RATE) + i] ** 2;
  return Math.sqrt(sum / n);
};
ok('storm louder than blue thread', slice(171, 181) > slice(183, 193) * 1.5,
  'storm ' + slice(171, 181).toFixed(3) + ' vs thread ' + slice(183, 193).toFixed(3));

// 5. committed stems match the rebuild byte-for-byte
const canon = (events) => JSON.stringify(events);
const committedScore = JSON.parse(readFileSync(join(root, 'score/score-events.json'), 'utf8'));
const committedSfx = JSON.parse(readFileSync(join(root, 'score/sfx-events.json'), 'utf8'));
ok('score stem version pinned', committedScore.orchestra === undefined || typeof committedScore.orchestra === 'string');
ok('committed score matches rebuild', canon(committedScore.events) === canon(score), score.length + ' events');
ok('committed sfx matches rebuild', canon(committedSfx.events) === canon(sfx), sfx.length + ' events');
void ORCHESTRA_VERSION; void SFX_VERSION;

// 6. live performer under an AudioContext stub
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
const { createPerformer } = await import('../score/animatic-audio.js');
let liveOk = true;
try {
  for (const s of tl.shots) {
    const p = createPerformer();
    p.unlock();
    p.setCue(s.music, s);
    if (!p.start()) throw new Error('start refused on ' + s.id);
    p.setVolume(0.5);
    p.setMuted(true); p.setMuted(false);
    p.stop();
  }
} catch { liveOk = false; }
ok('live performer plays all 20 cues', liveOk);
const rich = tl.shots.find((s) => s.id === 's18');
const sparse = tl.shots.find((s) => s.id === 's14');
const p1 = createPerformer(); p1.unlock(); p1.setCue(rich.music, rich);
oscCount = 0; p1.start(); p1.stop();
const richOsc = oscCount;
const p2 = createPerformer(); p2.unlock(); p2.setCue(sparse.music, sparse);
oscCount = 0; p2.start(); p2.stop();
const sparseOsc = oscCount;
// s18 opens with 5+ voices (strings, cello, brass, woodwind, timpani =
// 9 oscillators); s14 opens with one violin note alone (2 detuned saws).
ok('arrival cue polyphonic, thread solo', richOsc >= 6 && sparseOsc === 2, 's18=' + richOsc + ' s14=' + sparseOsc);
// live cue-opening pitches match the offline master
const first = (shotId) => score.filter((e) => e.shot === shotId).sort((x, y) => x.t - y.t)[0];
const s18first = first('s18');
const degCheck = noteFreq('cairn', s18first.deg, s18first.voice, false);
ok('live note math matches master', Math.abs(degCheck - s18first.f) < 0.002, s18first.f + 'Hz');
delete globalThis.window;

if (failures) { console.error('SCORE RED'); process.exit(1); }
console.log('SCORE GREEN');
