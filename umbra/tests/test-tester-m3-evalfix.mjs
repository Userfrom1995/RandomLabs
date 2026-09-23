// Tester M3 Evaluator-fix regression pins (PR #382, post 8.1/10 FIX verdict).
// Guards the two binding defects the Evaluator blocked on, so they can
// never silently regress before the M5 merge:
//  1. scoreboard golden literal must match the pinned test hash (e9ef3be3),
//     never the stale 92028ae1.
//  2. bout banners/result strings must use hyphens (NO-EM-DASH invariant).
// File-text pins only (node:test, no DOM).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

describe('tester M3 evalfix: scoreboard golden matches pinned hash', () => {
  it('scoreboard cites e9ef3be3 and never the stale 92028ae1', () => {
    const sb = read('docs/scoreboard.md');
    assert.ok(sb.includes('e9ef3be3'), 'scoreboard lost the golden hash');
    assert.ok(!sb.includes('92028ae1'), 'stale golden 92028ae1 back in scoreboard');
  });
  it('pinned test files agree on the same golden', () => {
    assert.ok(read('tests/test-combat.mjs').includes('e9ef3be3'));
    assert.ok(read('tests/test-tester-m2-gate2.mjs').includes('e9ef3be3'));
  });
});

describe('tester M3 evalfix: bout strings honor NO-EM-DASH', () => {
  it('app.js has zero em/en dashes and hyphen ROUND banner', () => {
    const app = read('app.js');
    assert.ok(!/[\u2013\u2014]/.test(app), 'em/en dash found in app.js');
    assert.ok(app.includes('ROUND 1 - FIGHT'), 'hyphen ROUND banner missing');
    assert.ok(!app.includes('ROUND 1 \u2014 FIGHT'), 'em-dash ROUND banner regressed');
  });
  it('no PR text file under umbra/ carries em/en dashes', () => {
    for (const rel of ['app.js', 'index.html', 'theme.css', 'sw.js', 'README.md', 'docs/scoreboard.md']) {
      assert.ok(!/[\u2013\u2014]/.test(read(rel)), `em/en dash in ${rel}`);
    }
  });
});
