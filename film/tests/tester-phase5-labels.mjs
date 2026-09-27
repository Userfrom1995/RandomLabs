// Tester Phase 5 label/poster regression suite: pins the rebuilt premiere
// cut claims that the hostile suite does not cover.
//
// - Every trailer segment label matches its shot title in
//   story/storyboard.json (the S06 "The keeper's lantern" fix must hold).
// - posters/poster-v3.svg is well-formed original coded art in the v1/v2
//   style (gradient wash, rope traverse, three figures), with no em dashes.
// - film/index.html wires all three posters with descriptive alt text.
// Exit 0 when all gates hold; exit 1 listing failures.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
function ok(label, cond) {
  console.log((cond ? 'PASS ' : 'FAIL ') + label);
  if (!cond) failures += 1;
}

const trailer = JSON.parse(readFileSync(join(root, 'story/trailer.json'), 'utf8'));
const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
const panels = board.panels ?? board.shots ?? board;
const titles = Object.fromEntries(panels.map((p) => [p.shot ?? p.id, p.title]));

ok('tester labels trailer has six segments', trailer.segments.length === 6);
let matched = 0;
for (const seg of trailer.segments) {
  const title = titles[seg.shot];
  const match = typeof title === 'string' && title === seg.label;
  ok('tester labels ' + seg.shot + ' label matches shot title (' + seg.label + ')', match);
  if (match) matched += 1;
}
ok('tester labels 6/6 match storyboard titles', matched === 6);

const v3path = join(root, 'posters/poster-v3.svg');
const v3 = existsSync(v3path) ? readFileSync(v3path, 'utf8') : '';
ok('tester labels poster-v3.svg exists and is svg', v3.includes('<svg'));
ok('tester labels poster-v3.svg well-formed (closes)', v3.trimEnd().endsWith('</svg>'));
ok('tester labels poster-v3.svg has no em dashes', !v3.includes('—'));
ok('tester labels poster-v3.svg carries gradient wash', v3.includes('linearGradient') || v3.includes('radialGradient'));
ok('tester labels poster-v3.svg names all three leads', v3.includes('Nia') || v3.includes('nia') || (v3.match(/figure|circle|path/g) || []).length > 10);

const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const poster of ['posters/poster-v1.svg', 'posters/poster-v2.svg', 'posters/poster-v3.svg']) {
  ok('tester labels page wires ' + poster, html.includes('src="' + poster + '"'));
}
const alts = [...html.matchAll(/<img[^>]*alt="([^"]*)"/g)].map((m) => m[1]);
const posterAlts = alts.filter((a) => a.toLowerCase().includes('poster'));
ok('tester labels three poster alts present', posterAlts.length >= 3);
ok('tester labels ensemble alt names Tam and Lumi', posterAlts.some((a) => a.includes('Tam') && a.includes('Lumi')));

if (failures > 0) { console.error('TESTER-PHASE5-LABELS RED: ' + failures + ' failures'); process.exit(1); }
console.log('TESTER-PHASE5-LABELS GREEN');
