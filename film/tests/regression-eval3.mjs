// Hearthlight eval-3 regression suite (Tester, Phase 1).
// Run: node film/tests/regression-eval3.mjs - exit non-zero on any failure.
// Pins the two load-bearing third-eval defects plus ride-along notes:
// (1) production-path screenplay fetch is document-relative (no 404 on Pages),
// (2) fullscreen dismiss never reloads, (a) NaN guards, (b) raw-cue major,
// (c) persistent silent-note flag.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt, actAt, formatTime } from '../engine/timeline.js';
import { motifFor } from '../score/themes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);
const js = readFileSync(join(root, 'player/player.js'), 'utf8');
const audio = readFileSync(join(root, 'score/animatic-audio.js'), 'utf8');

// (1) production fetch path: document-relative, never ../story
ok('fetch is document-relative story/screenplay.json',
  js.includes("fetch('story/screenplay.json'"));
ok('no ../story fetch target (would 404 as /story on Pages)',
  !js.includes("fetch('../story") && !js.includes('fetch("../story'));
// (2) fullscreen dismiss: exactly one reload (showError per-call), no permanent listener
ok('single location.reload (showError per-call only)',
  (js.match(/location\.reload/g) || []).length === 1);
ok('no permanent overlayRetry reload listener',
  !/overlayRetry.*addEventListener/.test(js));
ok('dismiss restores bigPlay idle-only',
  js.includes('$(\'bigPlay\').hidden = state.playing') ||
  js.includes("$('bigPlay').hidden = state.playing"));
// (a) NaN guards clamp, never fall through to finale
ok('shotAt(NaN) clamps to s01', shotAt(tl, NaN).shot.id === 's01');
ok('actAt(NaN) clamps to act 1', actAt(tl, NaN).n === 1);
ok('formatTime(NaN) clamps to 0:00', formatTime(NaN) === '0:00');
// (b) major transposition keyed off raw cue string
ok('raw cue stored on setCue', audio.includes("raw: music.motif"));
ok('major test reads current.raw', audio.includes("(current.raw || '')"));
// (c) silent note is a persistent flag re-applied in renderFrame
ok('silentNote flag exists', js.includes('silentNote'));
ok('silent note re-applied in renderFrame', js.includes('state.silentNote'));
// motif strictness retained
let threw = false;
try { motifFor({ motif: 'typo-cue' }); } catch (e) { threw = /unknown motif/.test(e.message); }
ok('unknown motif still throws', threw);
ok('legitimate cairn+nia resolves', motifFor({ motif: 'cairn+nia' }).name === 'cairn');

if (failures) { console.error('REGRESSION-EVAL3 RED: ' + failures + ' failures'); process.exit(1); }
console.log('REGRESSION-EVAL3 GREEN');
