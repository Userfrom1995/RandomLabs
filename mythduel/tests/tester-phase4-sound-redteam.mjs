// Mythduel Phase 4 hostile red-team suite (Tester-owned).
// Run: node mythduel/tests/tester-phase4-sound-redteam.mjs
// Locks in the reviewer's Blocking 1-3 remedies plus live-performer
// degradation: malformed durations fail loud, duplicate SFX tags render
// independently, live drum matches the offline master, and the performer
// degrades gracefully without a DOM (start refuses, no crash, dispose is
// idempotent, null cues throw).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { orchestrate, buildScoreEvents } from '../score/orchestra.js';
import { buildSfxEvents, renderSfxEvent, tagRecipe } from '../score/sfx.js';
import { resolveVoice, renderVoice } from '../score/voices.js';
import { MIX_SAMPLE_RATE } from '../score/mix.js';
import { duckLevelAt, SCORE_FLOOR, SFX_FLOOR, dialogueWindows } from '../score/duck.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const tl = buildTimeline(duel);

// H1: malformed beat durations fail loud (Blocking 3 remedy lock-in).
for (const d of [0, -1, NaN, Infinity, -Infinity, undefined, 'x', null]) {
  let threw = false;
  try { orchestrate({ ...tl.beats[0], dur: d }); } catch { threw = true; }
  ok('malformed beat.dur throws (' + String(d) + ')', threw);
}

// H2: unknown domain values throw loud.
let badTag = false;
try { tagRecipe('dragon-roar'); } catch { badTag = true; }
ok('unknown sfx tag throws', badTag);
let badVoice = false;
try { resolveVoice('kazoo'); } catch { badVoice = true; }
ok('unknown voice throws', badVoice);

// H3: corrupt duel shape throws loud instead of a silent empty stage.
let corruptThrows = false;
try {
  buildTimeline({ beats: [{ id: 'bx', start: 0, dur: 2 }] });
} catch { corruptThrows = true; }
ok('corrupt duel shape throws', corruptThrows);

// H4: duplicate SFX tags render independently (Blocking 1 remedy lock-in).
const sfx = buildSfxEvents(tl);
const gravel = sfx.filter((e) => e.beat === 'b02' && e.tag === 'footfall-gravel')
  .sort((p, q) => p.n - q.n);
ok('duplicate tags carry occurrence seeds',
  gravel.length === 2 && gravel[0].n === 0 && gravel[1].n === 1);
if (gravel.length === 2) {
  const g0 = renderSfxEvent(gravel[0], MIX_SAMPLE_RATE);
  const g1 = renderSfxEvent(gravel[1], MIX_SAMPLE_RATE);
  ok('duplicate tags render independently',
    g0.length === g1.length && g0.some((v, i) => v !== g1[i]));
}

// H5: live drum matches the offline master (Blocking 2 remedy lock-in).
// live-audio.js is DOM-guarded at import; import fresh without a window.
delete globalThis.window;
const live = await import('../score/live-audio.js');
const score = buildScoreEvents(tl);
const drumEv = score.find((e) => e.voice === 'drum');
ok('live drum head matches offline master',
  !!drumEv && Math.abs(live.liveDrumFreq(drumEv.f) - Math.max(45, Math.min(140, drumEv.f / 2))) < 1e-12);

// H6: performer degrades gracefully with no DOM (no crash, start refuses).
const p = live.createPerformer();
let noCrash = true;
try {
  p.unlock();
  const started = p.start();
  ok('performer refuses start without DOM', started === false);
  p.setVolume(-5); p.setVolume(99);
  p.setMuted(true); p.setMuted(false);
  p.stop(); p.dispose(); p.dispose();
} catch { noCrash = false; }
ok('performer no-DOM path never crashes', noCrash);
let nullCueThrows = false;
try { p.setCue(null, null, 0); } catch { nullCueThrows = true; }
ok('null cue throws', nullCueThrows);

// H7: ducking envelope fully open outside windows, floors hold on lines.
const windows = dialogueWindows(tl);
ok('envelope fully open outside windows', duckLevelAt(0, windows, SCORE_FLOOR) === 1);
const firstCap = tl.beats[0].captions[0];
const midLine = tl.beats[0].start + firstCap.t + 0.5;
ok('score ducks to floor on voiced lines',
  Math.abs(duckLevelAt(midLine, windows, SCORE_FLOOR) - SCORE_FLOOR) < 1e-9);
ok('sfx bed ducks to floor on voiced lines',
  Math.abs(duckLevelAt(midLine, windows, SFX_FLOOR) - SFX_FLOOR) < 1e-9);

// H8: zero-duration voice renders empty without crashing.
const z = renderVoice('horn', 220, 0, MIX_SAMPLE_RATE, 'tester|zero');
ok('zero-duration voice renders empty', z.length === 0);

if (failures) { console.error('TESTER REDTEAM RED'); process.exit(1); }
console.log('TESTER REDTEAM GREEN');
