// Hearthlight tester hostile regression suite (Phase 4, PR #458).
// Run: node film/tests/tester-phase4-audio.mjs - exit non-zero on failure.
// Distinct from tests/score.mjs (builder coverage): this suite is the
// Tester's adversarial pass - corrupt/degenerate inputs must throw or stay
// finite, never crash; committed stems must match a fresh rebuild; voice and
// SFX synthesis must be byte-reproducible; WAV headers must be valid.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { buildScoreEvents, noteFreq } from '../score/orchestra.js';
import { buildSfxEvents, renderSfxEvent, tagRecipe } from '../score/sfx.js';
import { renderVoice, resolveVoice } from '../score/voices.js';
import { renderMix, analyze, encodeWav, MIX_SAMPLE_RATE } from '../score/mix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);
const score = buildScoreEvents(tl);
const sfx = buildSfxEvents(tl);

// 1. hostile lookups throw honest errors
let unknownVoice = false;
try { resolveVoice('kazoo'); } catch { unknownVoice = true; }
ok('hostile unknown voice throws', unknownVoice);
let unknownTag = false;
try { tagRecipe('dragon-roar'); } catch { unknownTag = true; }
ok('hostile unknown sfx tag throws', unknownTag);
let corruptRejected = false;
try { buildTimeline({ nope: 1 }); } catch { corruptRejected = true; }
ok('hostile corrupt screenplay rejected', corruptRejected);
let unknownFamily = false;
try { noteFreq('nope-family', 0, 'strings', false); } catch { unknownFamily = true; }
ok('hostile unknown motif family throws', unknownFamily);

// 2. degenerate renders stay finite (never NaN/Infinity/crash)
let zeroOk = true;
try {
  const s = renderVoice('strings', 440, 0.0, MIX_SAMPLE_RATE, 'tester|zero');
  if (s.length !== 0) zeroOk = false;
} catch { zeroOk = false; }
ok('hostile zero-duration render empty', zeroOk);
let extremeOk = true;
try {
  for (const [v, f] of [['bells', 12000], ['timpani', 30], ['woodwind', 880], ['shaker', 6000], ['pad', 55]]) {
    const s = renderVoice(v, f, 0.3, MIX_SAMPLE_RATE, 'tester|' + v);
    for (let i = 0; i < s.length; i++) {
      if (!Number.isFinite(s[i])) { extremeOk = false; break; }
    }
    if (!extremeOk) break;
  }
} catch { extremeOk = false; }
ok('hostile extreme frequencies finite', extremeOk);
let sfxFinite = true;
try {
  for (const ev of sfx) {
    const s = renderSfxEvent(ev, MIX_SAMPLE_RATE);
    for (let i = 0; i < s.length; i += 997) {
      if (!Number.isFinite(s[i])) { sfxFinite = false; break; }
    }
    if (!sfxFinite) break;
  }
} catch { sfxFinite = false; }
ok('hostile all 50 sfx events finite', sfxFinite, sfx.length + ' events');

// 3. empty-event mix is silent-but-wellformed at the exact length
const empty = renderMix(tl, [], [], MIX_SAMPLE_RATE);
const emptyStats = analyze(empty.master);
ok('hostile empty mix exact length', empty.master.length === Math.ceil(tl.total * MIX_SAMPLE_RATE));
ok('hostile empty mix finite', emptyStats.bad === 0);

// 4. committed stems match a fresh rebuild (byte-for-byte via canonical form)
const committedScore = JSON.parse(readFileSync(join(root, 'score/score-events.json'), 'utf8'));
const committedSfx = JSON.parse(readFileSync(join(root, 'score/sfx-events.json'), 'utf8'));
ok('tester committed score matches rebuild',
  JSON.stringify(committedScore.events) === JSON.stringify(score), score.length + ' events');
ok('tester committed sfx matches rebuild',
  JSON.stringify(committedSfx.events) === JSON.stringify(sfx), sfx.length + ' events');
ok('tester score event count pinned', score.length === 602, String(score.length));
ok('tester sfx event count pinned', sfx.length === 50, String(sfx.length));

// 5. every event on the frame grid (A/V sync drift zero)
let drift = 0;
for (const e of [...score, ...sfx]) drift = Math.max(drift, Math.abs(e.t - frameTime(e.t)));
ok('tester sync drift zero', drift === 0, String(drift));

// 6. voice sample determinism under a second seed
const p = renderVoice('brass', 220, 0.4, MIX_SAMPLE_RATE, 'tester|brass|220');
const q = renderVoice('brass', 220, 0.4, MIX_SAMPLE_RATE, 'tester|brass|220');
ok('tester voice bytes reproducible', p.length === q.length && p.every((v, i) => v === q[i]));
const wav = encodeWav(p, MIX_SAMPLE_RATE);
ok('tester wav header valid',
  wav.subarray(0, 4).toString() === 'RIFF' && wav.readUInt32LE(24) === MIX_SAMPLE_RATE);
ok('tester wav data length exact', wav.readUInt32LE(40) === p.length * 2);

// 7. full-mix smoke: exact length, bounded peak, audible, fast
const t0 = Date.now();
const { master } = renderMix(tl, score, sfx, MIX_SAMPLE_RATE);
const ms = Date.now() - t0;
const stats = analyze(master);
ok('tester full mix exact length', master.length === Math.ceil(tl.total * MIX_SAMPLE_RATE));
ok('tester full mix peak bounded', stats.peak <= 0.89 + 1e-6 && stats.peak > 0.5, stats.peak.toFixed(3));
ok('tester full mix audible', stats.rms > 0.02, stats.rms.toFixed(3));
ok('tester full mix fast', ms < 30000, ms + 'ms');

if (failures) { console.error('TESTER-PHASE4 RED'); process.exit(1); }
console.log('TESTER-PHASE4 GREEN');
