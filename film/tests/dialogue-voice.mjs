// Hearthlight dialogue-voice regression suite (Phase 4, builder).
// Run: node film/tests/dialogue-voice.mjs - exit non-zero on any failure.
// Pins the Phase 4 delivery pass: dialogue-first ducking (envelope unit
// gates + score-continuity gates on the committed event lists), per-line
// face/body delivery coverage (every spoken line drives a rig, the
// narrator never claims a face), the SFX re-anchor to the new action
// beats, live-performer duck parity, and the byte-pinned VTT.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { faceFor, poseFor, speakFor, lineWindow } from '../engine/rigs.js';
import { EMOTIONS, FACE_CARDS } from '../engine/faces.js';
import { motifFor } from '../score/themes.js';
import { buildScoreEvents, orchestrate } from '../score/orchestra.js';
import { livePhrasesForStep } from '../score/animatic-audio.js';
import { buildSfxEvents, tagRecipe } from '../score/sfx.js';
import {
  dialogueWindows, duckLevelAt, shotWindows, livePeakFor,
  SCORE_FLOOR, SFX_FLOOR, DUCK_ATTACK, DUCK_RELEASE, DUCK_VERSION,
} from '../score/duck.js';
import { buildVtt } from '../tools/render-captions.mjs';

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
const W = dialogueWindows(tl);
const WHO = { NIA: 'nia', YARA: 'yara', TAM: 'tam', LUMI: 'lumi' };

// 1. duck envelope unit gates
ok('duck version pinned', DUCK_VERSION === 'hearthlight-duck/1');
ok('duck floors ordered (words first)', SCORE_FLOOR < SFX_FLOOR && SFX_FLOOR < 1,
  SCORE_FLOOR + '/' + SFX_FLOOR);
ok('duck holds the floor mid-line', duckLevelAt(3, W, SCORE_FLOOR) === SCORE_FLOOR);
ok('duck rests at unity far from lines', duckLevelAt(0.5, W, SCORE_FLOOR) === 1);
// attack ramps monotonically down into the hold (sampled across the edge)
const first = W[0];
let mono = true;
let prev = 1;
for (let k = 1; k <= 5; k++) {
  const v = duckLevelAt(first[0] - DUCK_ATTACK + (DUCK_ATTACK * k) / 5, W, SCORE_FLOOR);
  if (v > prev + 1e-9 || v < SCORE_FLOOR - 1e-9) mono = false;
  prev = v;
}
ok('duck attack ramps monotonically to the floor', mono && prev === SCORE_FLOOR);
// stacked lines never pump: s05 holds Yara/Nia back-to-back through the gap
const s05 = tl.shots.find((s) => s.id === 's05');
const gapT = s05.start + 55.75;
ok('stacked lines hold without pumping', duckLevelAt(gapT, W, SCORE_FLOOR) === SCORE_FLOOR);
// release is exactly one Yara half-silence
ok('duck release is the Yara half-silence', Math.abs(DUCK_RELEASE - 0.5) < 1e-9);
// merged windows: 43 lines collapse where stacked, never overlap
let overlap = false;
for (let i = 1; i < W.length; i++) if (W[i][0] < W[i - 1][1] - 1e-9) overlap = true;
ok('duck windows merged and non-overlapping', !overlap, W.length + ' windows from 43 lines');

// 2. score continuity on the committed event lists
let dead = 0;
for (let t = 0; t < tl.total; t++) {
  if (!score.some((e) => t >= e.t && t < e.t + e.dur)) dead++;
}
ok('score covers every second (no dead air)', dead === 0, dead + ' dead');
// every voice line in every shot closes exactly at the shot edge...
let edgeOk = true;
for (const s of tl.shots) {
  const byV = {};
  for (const e of score.filter((e) => e.shot === s.id)) (byV[e.voice] = byV[e.voice] || []).push(e);
  for (const v of Object.keys(byV)) {
    const last = byV[v].sort((a, b) => a.t - b.t).pop();
    if (Math.abs(last.t + last.dur - (s.start + s.dur)) > 1e-6) edgeOk = false;
  }
}
ok('every voice line closes at the shot edge', edgeOk);
// ...on a resolved motif root
let resolved = true;
for (const s of tl.shots) {
  const fam = s.music.motif.split('+')[0];
  const rowLen = (motifFor({ motif: fam }).row || []).length;
  const byV = {};
  for (const e of score.filter((e) => e.shot === s.id)) (byV[e.voice] = byV[e.voice] || []).push(e);
  for (const v of Object.keys(byV)) {
    const last = byV[v].sort((a, b) => a.t - b.t).pop();
    if (rowLen && last.deg % rowLen !== 0) resolved = false;
  }
}
ok('closing notes resolve to motif roots', resolved);
// duck audibly favors words: mean envelope under dialogue well below outside
let dSum = 0; let dN = 0; let oSum = 0; let oN = 0;
for (let t = 0; t < tl.total; t += 0.25) {
  const v = duckLevelAt(t + 0.125, W, SCORE_FLOOR);
  const inD = W.some(([a, b]) => t + 0.125 >= a && t + 0.125 <= b);
  if (inD) { dSum += v; dN++; } else { oSum += v; oN++; }
}
ok('duck favors words over music', dSum / dN < 0.55 && oSum / oN > 0.9,
  'under ' + (dSum / dN).toFixed(2) + ' vs out ' + (oSum / oN).toFixed(2));

// 3. per-line delivery coverage: every spoken line drives a rig
let faceOk = true; let faceWhy = '';
const HUMAN = new Set(['NIA', 'YARA', 'TAM', 'LUMI']);
for (const s of tl.shots) {
  for (const c of s.captions || []) {
    if (!EMOTIONS.includes(c.emotion)) { faceOk = false; faceWhy = s.id + ':emotion'; }
    if (HUMAN.has(c.who)) {
      const mid = c.t + Math.min(1, (c.dur || 4.5) / 2);
      const f = faceFor(s, WHO[c.who], mid);
      if (f.emotion !== c.emotion || f.phoneme === undefined) { faceOk = false; faceWhy = s.id + ':' + c.who; }
      const cards = FACE_CARDS[WHO[c.who]] || [];
      if (!cards.includes(c.emotion) && c.emotion !== 'neutral' && !EMOTIONS.includes(c.emotion)) {
        faceOk = false; faceWhy = s.id + ':expression-sheet';
      }
    }
  }
}
ok('every human line drives its face rig', faceOk, faceWhy || '43 lines covered');
// Ruel's single line plays in the body, silent elsewhere
const s12 = tl.shots.find((s) => s.id === 's12');
const rw = lineWindow(s12, 'RUEL');
ok('ruel line window pinned', JSON.stringify(rw) === JSON.stringify([2, 6.5]), JSON.stringify(rw));
const ruelPose = (local) => poseFor(s12, local / s12.dur, local).ruel.speak;
ok('ruel speaks on his line, silent off it',
  ruelPose(4) === 1 && ruelPose(0) === 0 && ruelPose(12) === 0 &&
  ruelPose(1.9) > 0 && ruelPose(1.9) < 1 && ruelPose(6.6) > 0 && ruelPose(6.6) < 1);
ok('ruel speak finite on hostile seeks', speakFor(s12, 'RUEL', NaN) === 0 && speakFor(null, 'RUEL', 2) === 0);
// the narrator is a caption voice: staged leads never lip-sync those lines.
// During a narrator line with no overlapping line of their own, every staged
// lead holds REST viseme and zero nod (the bible beat may color the mood,
// but the mouth stays out of it).
let narrClean = true; let narrWhy = '';
for (const s of tl.shots) {
  for (const c of s.captions || []) {
    if (c.who !== 'NARRATOR') continue;
    const mid = c.t + Math.min(1, (c.dur || 4.5) / 2);
    for (const w of Object.values(WHO)) {
      if (!s.cast.includes(w)) continue;
      const mine = (s.captions || []).some((d) => d !== c && WHO[d.who] === w &&
        mid >= d.t && mid < d.t + (d.dur || 4.5));
      if (mine) continue;
      const f = faceFor(s, w, mid);
      if (f.phoneme !== 'REST' || f.nod !== 0) { narrClean = false; narrWhy = s.id + ':' + w; }
    }
  }
}
ok('narrator never ventriloquized through a staged lead', narrClean, narrWhy || 'mouths stay out of it');

// 4. SFX re-anchor to the new action beats
ok('sfx event count pinned', sfx.length === 50, String(sfx.length));
ok('silence tags honestly empty', tagRecipe('grove-silence') === null && tagRecipe('title-hush') === null);
const gainOf = (tag) => (sfx.find((e) => e.tag === tag) || {}).gain;
ok('gorge set-piece leads the bed', gainOf('white-water') >= 0.7 && gainOf('spray') >= 0.45);
ok('storm carry set-piece at full menace', gainOf('wind-howling') >= 0.7 && gainOf('sleet') >= 0.6);
ok('rekindling climax leads', gainOf('ignition-whoom') >= 0.7);
const steps = (tag) => (sfx.find((e) => e.tag === tag) || {}).count;
ok('footfalls match the action beats', steps('running-steps') >= 10 && steps('boots-snow') >= 9);

// 5. live performer parity: same windows, same floors, pure helper
const s05w = shotWindows(s05);
const offW = W.filter(([a, b]) => a >= s05.start - 1e-9 && a < s05.start + s05.dur);
ok('live windows match the offline windows for the shot', s05w.length === offW.length &&
  s05w.every(([a, b], i) => Math.abs(s05.start + a - offW[i][0]) < 1e-9));
ok('live peaks duck to the offline floor on lines',
  livePeakFor(s05w, 4, SCORE_FLOOR) === SCORE_FLOOR && livePeakFor(s05w, 0.5, SCORE_FLOOR) === 1);
ok('live sfx floor matches the offline bed', livePeakFor(s05w, 4, SFX_FLOOR) === SFX_FLOOR);
// wind bed ducks with the same SFX floor the WAV master renders per-sample:
// full-strength wind under a line would contradict the shared duck promise.
ok('live wind bed ducks to the offline sfx floor',
  livePeakFor(s05w, 4, SFX_FLOOR) === SFX_FLOOR &&
  livePeakFor(s05w, 4, SFX_FLOOR) === duckLevelAt(s05.start + 4, W, SFX_FLOOR) &&
  livePeakFor(s05w, 0.5, SFX_FLOOR) === 1);
// sub-beat parity: the shaker (bpn 0.5) fires twice per beat, matching the
// offline floor(span/0.5) count on a real tempo>=90 cue (s12).
{
  const s12 = tl.shots.find((s) => s.id === 's12');
  const spec = orchestrate(s12);
  const shaker = spec.lines.find((l) => l.voice === 'shaker');
  const offN = s12 && shaker
    ? score.filter((e) => e.shot === 's12' && e.voice === 'shaker').length
    : 0;
  let liveN = 0;
  let liveLast = -1;
  for (let s = 0; s < shaker.toBeat; s++) {
    for (const tr of livePhrasesForStep(shaker, s)) {
      liveN++;
      if (tr.isLast) liveLast = tr.phrase;
    }
  }
  const expectN = Math.floor((shaker.toBeat - shaker.fromBeat) / shaker.beatsPerNote);
  ok('live shaker matches the offline trigger count', liveN === offN && liveN === expectN,
    'live ' + liveN + ' vs offline ' + offN + ' vs expect ' + expectN);
  ok('live shaker resolves on its true last trigger', liveLast === expectN - 1,
    'last ' + liveLast);
}
// non-divisible grid: 13 beats at bpn 2 renders 6 offline notes, so the
// live grid must suppress the surplus beat-12 trigger and resolve on beat 10.
{
  const ln = { voice: 'strings', beatsPerNote: 2, gain: 0.3, fromBeat: 0, toBeat: 13, degreeOffset: 0 };
  let liveN = 0;
  let liveLast = -1;
  let liveLastStep = -1;
  for (let s = 0; s < 13; s++) {
    for (const tr of livePhrasesForStep(ln, s)) {
      liveN++;
      if (tr.isLast) { liveLast = tr.phrase; liveLastStep = s; }
    }
  }
  ok('live suppresses the surplus grid note', liveN === 6, 'live ' + liveN);
  ok('live resolves on the true last trigger', liveLast === 5 && liveLastStep === 10,
    'phrase ' + liveLast + ' at step ' + liveLastStep);
}

// 6. VTT byte-pin: 43 cues rebuilt verbatim
const { vtt } = buildVtt(tl);
ok('captions.vtt matches rebuild (43 cues)', readFileSync(join(root, 'captions.vtt'), 'utf8') === vtt,
  (vtt.match(/-->/g) || []).length + ' cues');

if (failures) { console.error('DIALOGUE-VOICE RED'); process.exit(1); }
console.log('DIALOGUE-VOICE GREEN');
