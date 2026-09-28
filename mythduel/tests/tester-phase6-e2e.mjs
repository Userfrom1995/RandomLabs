// Mythduel Phase 6 tester E2E pins (Tester, Refs #470).
//
// Durable guards for the final integration pass: the Reviewer-flagged Space
// double-fire fix (card keydown stops propagation, document Space handler
// never hijacks buttons or cards), frame-step transport markup and wiring,
// keyboard-operable storyboard cards, in-page links resolving to files on
// disk (zero 404s), public-docs unity (no em dashes, Watch documents the
// keyboard map), caption track cue count, and hostile engine boundaries
// (clamped seeks, corrupt payloads throw, frame lattice idempotent).
// Pure node, no network, no wall-clock: exits 0 green, 1 red.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

const html = readFileSync(join(root, 'index.html'), 'utf8');
const playerJs = readFileSync(join(root, 'player/player.js'), 'utf8');
const galleryJs = readFileSync(join(root, 'player/gallery.js'), 'utf8');
const css = readFileSync(join(root, 'player/player.css'), 'utf8');
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const tl = buildTimeline(duel);

// 1. Space double-fire fix (Reviewer blocker, Phase 6 re-review approved).
check('card keydown stops propagation', galleryJs.includes('stopPropagation'), 'gallery.js');
check('card keydown handles Space', galleryJs.includes("e.key === ' '"), 'space branch');
check('document Space handler guards buttons', playerJs.includes(".closest('button,.board-card')") || playerJs.includes('.closest("button,.board-card")'), 'button guard');
check('document Space handler guards cards', playerJs.includes('.board-card'), 'card guard');
check('input/textarea early return retained', playerJs.includes("matches('input,textarea')"), 'text fields');

// 2. Frame-step transport markup and wiring.
check('markup carries step-back control', html.includes('id="btnStepBack"'));
check('markup carries step-forward control', html.includes('id="btnStepFwd"'));
check('player wires stepFrame', playerJs.includes('stepFrame'));
check('player maps arrows', playerJs.includes('ArrowLeft') && playerJs.includes('ArrowRight'));
check('player maps Home/End', playerJs.includes('Home') && playerJs.includes('End'));
check('player maps trailer key', playerJs.includes('btnTrailer') && playerJs.includes(String.fromCharCode(116)));
check('player maps captions key', playerJs.includes('btnCaption'));
check('player maps fullscreen key', playerJs.includes('toggleFullscreen'));

// 3. Keyboard-operable cards plus focus styles.
check('gallery makes cards focusable', galleryJs.includes('tabIndex') || galleryJs.includes('tabindex'), 'tab');
check('gallery labels hero jump', galleryJs.includes('aria-label') || galleryJs.includes('ariaLabel'), 'aria');
check('focus-visible ring styled', css.includes('focus-visible'), 'css');

// 4. Zero-404 static link check: every in-page relative link resolves on disk.
const hrefs = [...html.matchAll(/href="([^"#]+)"/g)].map((m) => m[1])
  .filter((h) => !h.startsWith('http') && !h.startsWith('data:') && !h.startsWith('mailto:'));
let linksOk = hrefs.length > 0;
for (const h of hrefs) {
  const target = resolve(root, h.replace(/\/$/, '/index.html'));
  const fileTarget = h.endsWith('/') ? join(root, h, 'index.html') : join(root, h);
  if (!existsSync(fileTarget) && !existsSync(target)) {
    console.log('  missing link target: ' + h);
    linksOk = false;
  }
}
check('all in-page links resolve on disk', linksOk, hrefs.length + ' links');

// 5. Docs unity: no em dashes, no milestone leakage, Watch documents keys.
for (const [label, src] of [['index.html', html], ['player.js', playerJs], ['gallery.js', galleryJs], ['README.md', readme]]) {
  check('no em dash in ' + label, !src.includes('\u2014'), label);
}
check('Watch documents Space', readme.includes('Space'), 'space');
check('Watch documents arrows', readme.includes('Left') && readme.includes('Right'), 'arrows');
check('Watch documents card keyboard', readme.includes('Enter') && readme.includes('card'), 'cards');
check('no milestone leakage in README', !/milestone|M[1-6]\b|Phase [0-9]:/.test(readme), 'readme');

// 6. Caption track present with the pinned cue count.
const vtt = readFileSync(join(root, 'captions.vtt'), 'utf8');
const cues = (vtt.match(/-->/g) || []).length;
check('captions carry 17 cues', cues === 17, String(cues));

// 7. Hostile engine boundaries: clamped seeks, corrupt throws, lattice.
check('beatAt(negative) clamps to b01', beatAt(tl, -5).beat.id === 'b01');
check('beatAt(overflow) clamps to b08', beatAt(tl, 999).beat.id === 'b08');
check('beatAt(NaN) clamps to start', beatAt(tl, NaN).beat.id === 'b01');
let threw = false;
try { buildTimeline({ beats: [], chapters: [] }); } catch { threw = true; }
check('corrupt duel throws', threw);
check('frameTime(NaN) is 0', frameTime(NaN) === 0);
check('frameTime idempotent', frameTime(frameTime(12.345)) === frameTime(12.345));
check('step math on lattice', (() => {
  for (const b of tl.beats) {
    const s = frameTime(frameTime(b.start + 1) + 1 / 24);
    if (Math.abs(s * 24 - Math.round(s * 24)) > 1e-9) return false;
  }
  return true;
})(), '8 beats');

if (failed) { console.log('TESTER-PHASE6-E2E RED (' + failed + ' failures)'); process.exit(1); }
console.log('TESTER-PHASE6-E2E GREEN');
