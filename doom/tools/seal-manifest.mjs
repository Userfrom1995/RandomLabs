// Seals M1 evidence determinism: regenerates the demo WAD bytes in memory
// (the same generator the app boots) and hashes them together with the
// committed evidence artifacts. Writes doom/docs/manifest.sha256 in
// `SHA256  name` form. Any byte change in the WAD, the first frame, or the
// evidence JSONs breaks the manifest.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildDemoWad } from './make-demo-wad.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const lines = [];
lines.push(`${sha256(Buffer.from(buildDemoWad()))}  <generated-demo-wad-bytes>`);
for (const f of ['docs/first-frame.png', 'docs/bench-m1.json', 'docs/soak-m1.json', 'docs/layout-audit.md']) {
  lines.push(`${sha256(readFileSync(join(root, f)))}  ${basename(f)}`);
}
writeFileSync(join(root, 'docs', 'manifest.sha256'), lines.join('\n') + '\n');
console.log(`sealed ${lines.length} artifacts -> doom/docs/manifest.sha256`);
for (const l of lines) console.log(`  ${l}`);
