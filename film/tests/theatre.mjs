// Hearthlight theatre regression suite (Tester, Phase 1).
// Run: node film/tests/theatre.mjs - exit non-zero on any failure.
// Covers: runtime/coverage gates, determinism, hostile timeline boundaries,
// scrub-exactness, caption safety, transport wiring (static + served).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { substream } from '../engine/rng.js';
import { buildTimeline, shotAt, actAt, captionAt, formatTime } from '../engine/timeline.js';
import { motifFor } from '../score/themes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
const tl = buildTimeline(sp);

// runtime + contiguity
ok('runtime 240-300s', tl.total >= 240 && tl.total <= 300, tl.total + 's');
ok('runtime exactly 270s', tl.total === 270, tl.total + 's');
let prev = 0; let contiguous = true;
for (const s of tl.shots) { if (Math.abs(s.start - prev) > 1e-9) contiguous = false; prev = s.end; }
ok('shots contiguous', contiguous, tl.shots.length + ' shots');
ok('20 shots', tl.shots.length === 20);
ok('5 acts', tl.acts.length === 5);
let asum = 0; for (const a of tl.acts) asum += a.dur;
ok('acts sum to total', asum === tl.total, asum + 's');

// 1:1 screenplay/storyboard parity both directions
const sids = new Set(tl.shots.map((s) => s.id));
const pids = board.panels.map((p) => p.shot);
ok('storyboard 1:1 both directions',
  pids.length === sids.size && pids.every((id) => sids.has(id)) &&
  tl.shots.every((s) => pids.includes(s.id)));

// coverage: every shot wired
let cov = true;
for (const s of tl.shots) {
  if (!s.bg || !s.palette) cov = false;
  if (!Array.isArray(s.cast)) cov = false;
  if (!s.music || !s.music.cue) cov = false;
  else { try { motifFor(s.music); } catch { cov = false; } }
}
ok('shot coverage bg/cast/cue', cov);

// hostile boundaries
ok('negative time clamps to s01', shotAt(tl, -99).shot.id === 's01');
ok('overshoot clamps to s20', shotAt(tl, 1e9).shot.id === 's20');
ok('end resolves to last shot', shotAt(tl, tl.total - 0.001).shot.id === 's20');
let actsOk = true;
for (const a of tl.acts) { if (actAt(tl, a.start + 0.01).n !== a.n) actsOk = false; }
ok('act boundaries resolve', actsOk);
const h1 = shotAt(tl, 123.456); const h2 = shotAt(tl, 123.456);
ok('scrub exact', h1.shot.id === h2.shot.id && h1.local === h2.local);
ok('boil slot stable',
  substream('20260927', 'boil|s01', Math.floor(1.0 * 12))() ===
  substream('20260927', 'boil|s01', Math.floor(1.0 * 12))());
ok('boil streams isolated',
  substream('20260927', 'boil|s01', 5)() !== substream('20260927', 'boil|s02', 5)());
ok('caption miss returns null', captionAt({ id: 'x' }, 5) === null);
ok('formatTime', formatTime(270) === '4:30' && formatTime(0) === '0:00');

// theatre surface: every promised control exists and is wired
const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const id of ['btnPlay', 'btnRestart', 'btnCaption', 'btnMute', 'btnFull', 'seek', 'vol', 'chapterList', 'captionLine', 'loadingVeil', 'stageOverlay', 'bigPlay']) {
  ok('theatre control present: ' + id, html.includes('id="' + id + '"'));
}
const js = readFileSync(join(root, 'player/player.js'), 'utf8');
for (const token of ['setPlaying', 'seekTo', 'requestFullscreen', 'createPerformer', 'matchMedia', 'captionAt', 'overlayRetry', 'keydown']) {
  ok('player wiring: ' + token, js.includes(token));
}
ok('captions use textContent (no injection)', js.includes('textContent') && !js.includes('capEl.innerHTML = cap'));
ok('reduced-motion respected', js.includes('prefers-reduced-motion'));
const css = readFileSync(join(root, 'player/player.css'), 'utf8');
ok('responsive 390px rule', css.includes('@media (max-width: 480px)'));
ok('reduced-motion css rule', css.includes('prefers-reduced-motion'));
ok('poster v1 exists', existsSync(join(root, 'posters/poster-v1.svg')));
ok('docs hub exists', existsSync(join(root, 'README.md')) && existsSync(join(root, 'docs')));

// no em dashes in shipped film sources
const sources = ['index.html', 'player/player.js', 'player/player.css', 'engine/animatic.js', 'engine/rng.js', 'engine/timeline.js', 'tests/theatre.mjs', 'tests/smoke.mjs', 'tests/determinism.mjs', 'tools/audit.mjs', 'tools/render.mjs'];
const dashy = sources.filter((f) => readFileSync(join(root, f), 'utf8').includes('\u2014'));
ok('no em dashes', dashy.length === 0, dashy.join(','));

if (failures) { console.error('THEATRE RED: ' + failures + ' failures'); process.exit(1); }
console.log('THEATRE GREEN');
