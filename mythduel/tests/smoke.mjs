// Mythduel smoke test: fast structural pass over story + engine + tools.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt } from '../engine/timeline.js';
import { captureCards } from '../tools/capture.mjs';
import { stillsManifest } from '../tools/render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const tl = buildTimeline(duel);
check('total 172s', Math.abs(tl.total - 172) < 1e-9, tl.total + 's');
check('scrub-exact beat lookup', beatAt(tl, 46).beat.id === 'b03', beatAt(tl, 46).beat.id);
const cards = captureCards();
check('8 capture cards', cards.length === 8, cards.length + ' cards');
check('capture frames monotonic', cards.every((c, i, a) => i === 0 || c.frameIndex > a[i - 1].frameIndex), 'monotonic');
const manifest = stillsManifest();
check('manifest matches cards', manifest.stills.length === cards.length, manifest.stills.length + ' stills');
for (const f of ['index.html', 'captions.vtt', 'repro.sh', 'README.md', 'player/player.js', 'player/player.css', 'player/gallery.js']) {
  check('committed: ' + f, existsSync(join(root, f)), f);
}
if (failed) {
  console.error('SMOKE RED');
  process.exit(1);
}
console.log('SMOKE GREEN');
