// Tester hostile suite for the Final Phase chart inserts (issue #463).
//
// Attacks the new film/engine/inserts.js pure core that the committed
// craft-world suite pins only on the happy path: garbage shot ids,
// out-of-range/degenerate progress values, zero-length polylines,
// fingertip-on-trace agreement at BOTH stage widths, spark-window
// exclusivity (never a third attempt), and a full-timeline seam sweep
// through renderAnimatic asserting zero NaN in the draw log.
// Exit 0 when all gates hold; exit 1 listing failures.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHART_INSERTS, chartInsertFor, attemptAt, traceAt, chartMarks,
  polyPoint, handGeometry, insertActors,
} from '../engine/inserts.js';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
function ok(label, cond, detail) {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail !== undefined ? ' - ' + detail : ''));
  if (!cond) failures += 1;
}
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const finitePt = (p) => Array.isArray(p) && p.length === 2 && finite(p[0]) && finite(p[1]);

// 1. chartInsertFor: guarded throws on garbage, null off-insert, exact arms.
for (const bad of ['', null, undefined, 0, 123, {}, [], true]) {
  let threw = false;
  try { chartInsertFor(bad); } catch (e) { threw = /garbage/.test(e.message); }
  ok('tester hostile insert throws on ' + JSON.stringify(bad), threw);
}
ok('tester hostile insert null off-insert shots',
  chartInsertFor('s01') === null && chartInsertFor('s12') === null &&
  chartInsertFor('s99') === null && chartInsertFor('S03') === null &&
  chartInsertFor(' s03') === null);
ok('tester hostile insert arms exactly s03+s07',
  Object.keys(CHART_INSERTS).sort().join(',') === 's03,s07' &&
  chartInsertFor('s03').striker === true && chartInsertFor('s03').lanternDark === true &&
  chartInsertFor('s03').attempts.length === 2 && chartInsertFor('s03').trace === false &&
  chartInsertFor('s07').trace === true && chartInsertFor('s07').attempts.length === 0);

// 2. attemptAt: hostile progress values never throw, never leak a 3rd try.
const s03 = chartInsertFor('s03');
ok('tester hostile attempt null spec safe',
  attemptAt(null, 0.2) === null && attemptAt(undefined, 0.2) === null &&
  attemptAt({}, 0.2) === null && attemptAt({ attempts: [] }, 0.5) === null);
for (const p of [-1, -0.5, -1e-9, 1.5, 2, Infinity, -Infinity]) {
  ok('tester hostile attempt null out of range p=' + p, attemptAt(s03, p) === null);
}
ok('tester hostile attempt window edges (p0 in, p1 out)',
  attemptAt(s03, 0.12).index === 0 && attemptAt(s03, 0.34) === null &&
  attemptAt(s03, 0.52).index === 1 && attemptAt(s03, 0.74) === null);
let phaseOk = true; let thirdTry = false; let seamOk = true;
for (let i = 0; i <= 2000; i++) {
  const p = i / 2000;
  const a = attemptAt(s03, p);
  if (a) {
    if (!(a.phase >= 0 && a.phase < 1)) phaseOk = false;
    if (a.index !== 0 && a.index !== 1) thirdTry = true;
    if (p >= 0.74) thirdTry = true;
  }
}
ok('tester hostile attempt phase in [0,1) dense sweep', phaseOk);
ok('tester hostile attempt never a third try (dense sweep)', !thirdTry);
const s07 = chartInsertFor('s07');
ok('tester hostile attempt s07 always idle', attemptAt(s07, 0.5) === null && attemptAt(s07, 0.1) === null);
void seamOk;

// 3. traceAt: monotone, clamped, exact land/hold points.
ok('tester hostile trace clamps', traceAt(-1) === 0 && traceAt(2) === 1 && traceAt(0) === 0 && traceAt(1) === 1);
let mono = true; let prev = -1;
for (let i = 0; i <= 1000; i++) {
  const f = traceAt(i / 1000);
  if (!(f >= 0 && f <= 1) || f < prev) { mono = false; break; }
  prev = f;
}
ok('tester hostile trace monotone in [0,1]', mono);
ok('tester hostile trace lands 0.28 holds 0.78',
  traceAt(0.27) === 0 && traceAt(0.28) === 0 && traceAt(0.78) === 1 && traceAt(0.79) === 1 &&
  traceAt(0.5) > 0.4 && traceAt(0.5) < 0.5);

// 4. polyPoint: endpoint exactness, clamping, zero-length guard.
const marks = chartMarks();
const path = marks.cliffPath;
ok('tester hostile poly endpoints exact',
  JSON.stringify(polyPoint(path, 0)) === JSON.stringify(path[0]) &&
  JSON.stringify(polyPoint(path, 1)) === JSON.stringify(path[path.length - 1]));
ok('tester hostile poly clamps out of range',
  JSON.stringify(polyPoint(path, -5)) === JSON.stringify(path[0]) &&
  JSON.stringify(polyPoint(path, 5)) === JSON.stringify(path[path.length - 1]));
const dup = [[0.4, 0.4], [0.4, 0.4], [0.4, 0.4]];
const dupPt = polyPoint(dup, 0.5);
ok('tester hostile poly zero-length segments finite', finitePt(dupPt), JSON.stringify(dupPt));
let polyOk = true;
for (let i = 0; i <= 500; i++) {
  if (!finitePt(polyPoint(path, i / 500))) { polyOk = false; break; }
}
ok('tester hostile poly finite dense sweep', polyOk);
const two = [[0, 0], [1, 1]];
const mid = polyPoint(two, 0.5);
ok('tester hostile poly midpoint exact', Math.abs(mid[0] - 0.5) < 1e-12 && Math.abs(mid[1] - 0.5) < 1e-12);

// 5. chartMarks geography: normalized, bridge/path/station agree.
let geoOk = true;
const flat = [];
for (const g of marks.gorge) flat.push(g);
flat.push(...path, ...marks.twoMarks, [marks.bridge.x, marks.bridge.y],
  [marks.station.x, marks.station.y], ...marks.station.children);
for (const [x, y] of flat) {
  if (!(finite(x) && finite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1)) { geoOk = false; break; }
}
ok('tester hostile marks normalized finite', geoOk);
ok('tester hostile path starts at the bridge',
  path[0][0] === marks.bridge.x && path[0][1] === marks.bridge.y);
const end = path[path.length - 1];
const staDist = Math.hypot(end[0] - marks.station.x, end[1] - marks.station.y);
ok('tester hostile path ends at the station', staDist < 0.15, staDist.toFixed(4));
let kidsOk = true;
for (const [x, y] of marks.station.children) {
  if (Math.hypot(x - marks.station.x, y - marks.station.y) > marks.station.r * 1.5) kidsOk = false;
}
ok('tester hostile station children inside circle', kidsOk);
ok('tester hostile gorge six-point cleft', marks.gorge.length === 6);
ok('tester hostile marks deterministic', JSON.stringify(chartMarks()) === JSON.stringify(chartMarks()));

// 6. handGeometry: finite across angles/sizes/modes, 5 entries, tip match.
let handOk = true;
for (const mode of ['point', 'grip', 'rest']) {
  for (const H of [540, 219]) {
    for (let a = 0; a < 16; a++) {
      const g = handGeometry(100, 100, H * 0.17, (a / 16) * Math.PI * 2, mode);
      if (g.length !== 5) { handOk = false; break; }
      for (let f = 0; f < 4; f++) {
        if (!finitePt(g[f].k) || !finitePt(g[f].m) || !finitePt(g[f].tip)) { handOk = false; break; }
      }
      if (!Array.isArray(g[4].thumb) || !finitePt(g[4].thumb)) handOk = false;
    }
  }
}
ok('tester hostile hand geometry finite (modes x sizes x angles)', handOk);
// Fingers actually diverge per mode (point extends index, grip curls).
const gp = handGeometry(100, 100, 90, -1.1, 'point');
const gg = handGeometry(100, 100, 90, -1.1, 'grip');
ok('tester hostile point extends past grip',
  Math.hypot(gp[0].tip[0] - 100, gp[0].tip[1] - 100) >
  Math.hypot(gg[0].tip[0] - 100, gg[0].tip[1] - 100));

// 7. insertActors: fingertip-on-trace at BOTH widths, off-frame entry,
// sparks only at the seam, dense finite sweep, garbage guarded.
for (const W of [960, 390]) {
  const H = Math.round(W * 9 / 16);
  const cxy = (nx, ny) => [W * (0.14 + nx * 0.72), H * (0.10 + ny * 0.80)];
  for (const p of [0.35, 0.5, 0.65, 0.78, 0.95]) {
    const act = insertActors('s07', W, H, p, 5);
    const f = traceAt(p);
    const [tx, ty] = cxy(...polyPoint(path, Math.max(f, 0.001)));
    const tip = handGeometry(act.yara.x, act.yara.y, act.yara.size, -1.1, 'point')[0].tip;
    const err = Math.hypot(tip[0] - tx, tip[1] - ty);
    ok('tester hostile fingertip on trace ' + W + 'px p=' + p, err < 1e-9, err.toExponential(2) + 'px');
  }
  const early = insertActors('s07', W, H, 0.02, 1);
  ok('tester hostile yara off-frame before entry ' + W + 'px', early.yara.x > W, early.yara.x.toFixed(1));
  ok('tester hostile trace flag matches ' + W + 'px', insertActors('s07', W, H, 0.6, 1).traceF === traceAt(0.6));
}
let sparkOk = true; let actorOk = true;
for (let i = 0; i <= 2000; i++) {
  const p = i / 2000;
  const a3 = insertActors('s03', 960, 540, p, 3);
  if (!finite(a3.nia.x) || !finite(a3.nia.y)) { actorOk = false; break; }
  const att = attemptAt(s03, p);
  if (!!a3.strikerGripped !== !!att) { actorOk = false; break; }
  if (a3.sparkAt !== null) {
    if (!(att && att.phase > 0.42 && att.phase < 0.62)) { sparkOk = false; break; }
    if (!finite(a3.sparkAt.x) || !finite(a3.sparkAt.y)) { sparkOk = false; break; }
  }
  const a7 = insertActors('s07', 960, 540, p, 3);
  if (!finite(a7.yara.x) || !finite(a7.yara.y) || !finite(a7.nia.x) || !finite(a7.nia.y)) { actorOk = false; break; }
}
ok('tester hostile s03 actors finite + grip matches window (dense)', actorOk);
ok('tester hostile sparks only at the striker seam (dense)', sparkOk);
ok('tester hostile blocking null off insert', insertActors('s01', 960, 540, 0.5, 5) === null);
let actorThrows = false;
try { insertActors('', 960, 540, 0.5, 1); } catch (e) { actorThrows = /garbage/.test(e.message); }
ok('tester hostile actors throw guarded on garbage', actorThrows);

// 8. Full-timeline hostile seam sweep: every shot start/end +/- epsilon at
// both widths renders with zero NaN/non-finite numbers in the draw log.
function makeRecorder() {
  const log = [];
  const norm = (a) => (typeof a === 'number' ? a : String(a));
  const grad = () => ({ addColorStop: () => {} });
  const stored = {};
  const ctx = new Proxy({}, {
    get(t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in stored) return stored[prop];
      if (prop === 'canvas') return undefined;
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'getImageData') return () => ({ data: [] });
      return (...args) => {
        log.push([prop, ...args.map(norm)]);
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return grad();
        return undefined;
      };
    },
    set(t, prop, v) { log.push(['set', prop, norm(v)]); stored[prop] = v; return true; },
  });
  return { ctx, log };
}
const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);
let seamBad = 0; let seamCount = 0;
for (const W of [960, 390]) {
  const o = { width: W, height: Math.round(W * 9 / 16), reducedMotion: false };
  for (const s of tl.shots) {
    for (const t of [s.start, s.start + 0.001, s.start + s.dur / 2, s.start + s.dur - 0.001]) {
      const { ctx, log } = makeRecorder();
      try {
        renderAnimatic(ctx, tl, Math.min(t, 270 - 0.01), o);
      } catch (e) { seamBad += 1; console.log('FAIL tester hostile seam threw ' + s.id + ' t=' + t + ' - ' + e.message); continue; }
      seamCount += 1;
      for (const e of log) {
        for (const v of e.slice(1)) {
          if (typeof v === 'number' && !Number.isFinite(v)) { seamBad += 1; break; }
        }
        if (seamBad) break;
      }
      if (seamBad) break;
    }
    if (seamBad) break;
  }
  if (seamBad) break;
}
ok('tester hostile full-timeline seam sweep finite, no throws', seamBad === 0, seamCount + ' frames');

if (failures) { console.error('TESTER-FINAL-INSERTS RED: ' + failures + ' failures'); process.exit(1); }
console.log('TESTER-FINAL-INSERTS GREEN');
