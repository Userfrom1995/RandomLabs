// M3 benchmark: headless CPU cost of the music path (MUS->MIDI conversion
// plus 1 s JS-FM render) with bootstrap 95 percent CIs. Browser AudioContext
// resume latency stays UNSUPPORTED_BY_DESIGN headless with M5 ownership.
// Writes doom/docs/bench-m3.json (N=30 batches).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { musToMidi } from '../src/audio/mus2mid.js';
import { extractMidiNotes, renderFmNotes } from '../src/audio/musicEngine.js';
import { mean, median, quantileSorted, sortedCopy, cv, bootstrapMeanCI } from '../src/perf/stats.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const desc = (l, t, c) => (l ? 0x80 : 0) | (t << 4) | c;
function demoMus() {
  const ev = [];
  // Eight-note run with velocities, bends, and a volume controller.
  const notes = [60, 62, 64, 65, 67, 69, 71, 72];
  for (const n of notes) {
    ev.push(desc(0, 1, 0), n | 0x80, 100);
    ev.push(desc(1, 2, 0), 128, 0x28);
  }
  ev.push(desc(0, 4, 0), 3, 110);
  for (const n of notes) ev.push(desc(1, 0, 0), n, 0x00);
  ev.push(desc(0, 6, 0));
  const head = new Uint8Array(18);
  head.set([0x4d, 0x55, 0x53, 0x1a], 0);
  const v = new DataView(head.buffer);
  v.setUint16(4, ev.length, true);
  v.setUint16(6, head.length, true);
  v.setUint16(8, 2, true);
  v.setUint16(10, 0, true);
  v.setUint16(12, 1, true);
  const out = new Uint8Array(head.length + ev.length);
  out.set(head, 0);
  out.set(ev, head.length);
  return out;
}

const N = 30;
const mus = demoMus();
const { midi } = musToMidi(mus);
const { notes } = extractMidiNotes(midi);

function timeIt(fn) {
  const t0 = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - t0) / 1e6;
}
// Warmup for JIT stability.
for (let i = 0; i < 5; i++) {
  musToMidi(mus);
  renderFmNotes(notes, { seconds: 1 });
}
const conv = [];
const render = [];
for (let i = 0; i < N; i++) {
  conv.push(timeIt(() => musToMidi(mus)));
  render.push(timeIt(() => renderFmNotes(notes, { seconds: 1 })));
}
function cell(xs) {
  const s = sortedCopy(xs);
  const ci = bootstrapMeanCI(xs, { resamples: 10000 });
  return {
    n: xs.length,
    meanMs: mean(xs),
    medianMs: median(xs),
    p95Ms: quantileSorted(s, 0.95),
    p99Ms: quantileSorted(s, 0.99),
    cv: cv(xs),
    meanCI95: ci,
  };
}
const doc = {
  node: process.version,
  date: new Date().toISOString().slice(0, 10),
  song: { notes: notes.length, midiBytes: midi.length },
  convert: cell(conv),
  fmRender1s: cell(render),
  budget: '16.667ms frame; conversion once per map, FM render chunked/looped, never per frame',
};
writeFileSync(join(root, 'docs', 'bench-m3.json'), JSON.stringify(doc, null, 2) + '\n');
console.log(`bench-m3: convert mean ${doc.convert.meanMs.toFixed(4)}ms, fmRender mean ${doc.fmRender1s.meanMs.toFixed(3)}ms (N=${N})`);
