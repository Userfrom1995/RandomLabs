// Tester eval-polish suite (Phase 2 re-gate): independent verification of the
// two Quality Council blocks - (1) turnaroundSymmetry measures the render,
// (2) blendExpression clamps non-finite k. Run: node film/tests/tester-phase2-eval-polish.mjs
import { drawHuman, turnaroundSymmetry, SHOULDER_X, HUMAN_MODELS } from '../engine/humans.js';
import { blendExpression } from '../engine/faces.js';

let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

// 1. probe measures the rendered shoulder anchors, not a constant copy:
// the fp-division tell (14.4px/120) proves the value came off the draw path.
const sym = turnaroundSymmetry('nia');
ok('probe left near SHOULDER_X', Math.abs(sym.left - SHOULDER_X) < 1e-9, String(sym.left));
ok('probe value came from render (fp tell)', sym.left !== SHOULDER_X && Math.abs(sym.left - 0.12) < 1e-9);
ok('probe mismatch is measured delta', sym.mismatch === Math.abs(sym.left - sym.right));
for (const n of Object.keys(HUMAN_MODELS)) {
  const s = turnaroundSymmetry(n);
  ok('probe symmetric ' + n, s.mismatch === 0 && s.left === s.right);
}
for (const bad of ['ruel', 'garbage', '', null, undefined]) {
  let threw = false;
  try { turnaroundSymmetry(bad); } catch { threw = true; }
  ok('probe rejects ' + String(bad), threw);
}

// 2. blend clamps every non-finite k to a finite endpoint face.
const a = blendExpression('fear', 'joy', 0);
const b = blendExpression('fear', 'joy', 1);
ok('NaN reads endpoint a', JSON.stringify(blendExpression('fear', 'joy', NaN)) === JSON.stringify(a));
ok('NaN face finite', Number.isFinite(blendExpression('joy', 'fear', NaN).brow));
ok('+Infinity reads endpoint b', JSON.stringify(blendExpression('fear', 'joy', Infinity)) === JSON.stringify(b));
ok('-Infinity reads endpoint a', JSON.stringify(blendExpression('fear', 'joy', -Infinity)) === JSON.stringify(a));

if (failures) { console.error('TESTER-PHASE2-EVAL-POLISH RED: ' + failures + ' failures'); process.exit(1); }
console.log('TESTER-PHASE2-EVAL-POLISH GREEN');
