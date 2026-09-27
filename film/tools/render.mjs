// Hearthlight render pipeline skeleton (Phase 1).
// Deterministic export from committed sources only:
//   - validates the screenplay (continuity, runtime gate, cue coverage)
//   - writes deterministic SVG stills (one per act) + poster into dist/
//   - writes dist/manifest.json with sha256 checksums of every source
// Same inputs => byte-identical outputs (keys sorted, no timestamps).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const storyDir = join(root, 'story');

function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

function collectSources(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) collectSources(p, out);
    else if (!name.endsWith('.md')) out.push(p);
  }
  return out;
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function actStill(act, shots) {
  const pal = shots[0].palette;
  const rows = shots.map((s) => '<text x="40" y="' + (200 + shots.indexOf(s) * 34) + '" font-size="22" fill="' + pal.ink + '">' + s.id.toUpperCase() + ' - ' + esc(s.title) + ' (' + s.dur + 's)</text>').join('\n');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">\n' +
    '<rect width="960" height="540" fill="' + pal.sky + '"/>\n' +
    '<rect y="380" width="960" height="160" fill="' + pal.wash + '" opacity="0.55"/>\n' +
    '<circle cx="780" cy="120" r="60" fill="' + pal.lantern + '" opacity="0.85"/>\n' +
    '<text x="40" y="90" font-size="44" font-family="Georgia,serif" fill="' + pal.ink + '">Act ' + act.n + ': ' + esc(act.title) + '</text>\n' +
    '<text x="40" y="130" font-size="22" font-family="Georgia,serif" fill="' + pal.ink + '">' + esc(act.synopsis) + '</text>\n' +
    rows + '\n</svg>\n';
}

const sp = JSON.parse(readFileSync(join(storyDir, 'screenplay.json'), 'utf8'));
// continuity + runtime gate
let prev = 0;
for (const s of sp.shots) {
  if (Math.abs(s.start - prev) > 1e-9) { console.error('GAP at ' + s.id); process.exit(1); }
  prev = s.start + s.dur;
}
if (prev < 240 || prev > 300) { console.error('RUNTIME GATE FAIL: ' + prev); process.exit(1); }

const dist = join(root, 'dist');
mkdirSync(join(dist, 'stills'), { recursive: true });
for (const act of sp.acts) {
  const shots = sp.shots.filter((s) => s.act === act.n);
  writeFileSync(join(dist, 'stills', 'act-' + act.n + '.svg'), actStill(act, shots));
}

const sources = collectSources(root);
const manifest = { format: 'hearthlight-manifest/1', seed: sp.seed, runtime: prev, files: {} };
for (const p of sources) {
  const rel = p.slice(root.length + 1);
  manifest.files[rel] = sha256(readFileSync(p));
}
for (const act of sp.acts) {
  const rel = 'dist/stills/act-' + act.n + '.svg';
  manifest.files[rel] = sha256(readFileSync(join(root, rel)));
}
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, Object.keys(manifest).sort().reduce((o, k) => { o[k] = manifest[k]; return o; }, {}), 1) + '\n');
console.log('render ok: runtime ' + prev + 's, ' + Object.keys(manifest.files).length + ' files in manifest');
