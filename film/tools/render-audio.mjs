// Hearthlight audio render pipeline (Phase 4).
// Deterministic export from committed sources only:
//   - validates the screenplay (continuity via the timeline builder)
//   - builds the note-event score (score/orchestra.js) and the SFX bed
//     (score/sfx.js) and writes them as committed JSON stems under
//     score/ (editable source-form stems; WAVs cannot be committed:
//     *.wav is gitignored and the audit rejects binary blobs)
//   - renders the full 270 s master plus per-bus stems into
//     dist/audio/*.wav (gitignored build artifacts) with a manifest
//     carrying sha256 checksums, versions, and mix analysis
// Same inputs => byte-identical outputs (sorted keys, no timestamps).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { buildScoreEvents, ORCHESTRA_VERSION } from '../score/orchestra.js';
import { buildSfxEvents, SFX_VERSION } from '../score/sfx.js';
import { renderMix, analyze, encodeWav, MIX_SAMPLE_RATE, MIX_VERSION } from '../score/mix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scoreDir = join(root, 'score');
const outDir = join(root, 'dist', 'audio');

const cliArgs = process.argv.slice(2);
if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
  console.log('Usage: node film/tools/render-audio.mjs [--help]');
  console.log('Renders the deterministic score + SFX mix into dist/audio/*.wav,');
  console.log('refreshes the committed score/sfx event stems, and writes a manifest.');
  console.log('Takes no flags; exits 2 on unknown flags.');
  process.exit(0);
}
const unknownFlag = cliArgs.find((a) => a.startsWith('-'));
if (unknownFlag) {
  console.error('Unknown flag: ' + unknownFlag + ' (usage: node film/tools/render-audio.mjs [--help])');
  process.exit(2);
}

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(label + ' is corrupt (' + path + '): ' + err.message);
    process.exit(1);
  }
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const sp = loadJson(join(root, 'story/screenplay.json'), 'story/screenplay.json');
const tl = buildTimeline(sp);
if (tl.total < 240 || tl.total > 300) {
  console.error('runtime gate failed: ' + tl.total + 's');
  process.exit(1);
}

const scoreEvents = buildScoreEvents(tl);
const sfxEvents = buildSfxEvents(tl);
console.log('score events: ' + scoreEvents.length + ', sfx events: ' + sfxEvents.length);

// Committed JSON stems (source form): stable key order, no timestamps.
const scoreStem = JSON.stringify({
  format: 'hearthlight-score-events/1',
  orchestra: ORCHESTRA_VERSION,
  seed: sp.seed,
  total: tl.total,
  events: scoreEvents,
}, null, 2) + '\n';
const sfxStem = JSON.stringify({
  format: 'hearthlight-sfx-events/1',
  sfx: SFX_VERSION,
  seed: sp.seed,
  total: tl.total,
  events: sfxEvents,
}, null, 2) + '\n';
writeFileSync(join(scoreDir, 'score-events.json'), scoreStem);
writeFileSync(join(scoreDir, 'sfx-events.json'), sfxStem);
console.log('stems: score/' + sha256(scoreStem).slice(0, 12) + ' sfx/' + sha256(sfxStem).slice(0, 12));

// Full offline render.
const t0 = Date.now();
const { master, stems } = renderMix(tl, scoreEvents, sfxEvents, MIX_SAMPLE_RATE);
console.log('render ms: ' + (Date.now() - t0));
const masterStats = analyze(master);
if (masterStats.bad > 0 || !(masterStats.peak <= 1)) {
  console.error('mix corrupt: ' + JSON.stringify(masterStats));
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const files = {};
const tracks = { mix: master, ...stems };
for (const [name, samples] of Object.entries(tracks)) {
  const wav = encodeWav(samples, MIX_SAMPLE_RATE);
  writeFileSync(join(outDir, name + '.wav'), wav);
  const stats = analyze(samples);
  files[name + '.wav'] = {
    sha256: sha256(wav),
    bytes: wav.length,
    peak: Math.round(stats.peak * 10000) / 10000,
    rms: Math.round(stats.rms * 10000) / 10000,
  };
  console.log('wav ' + name + ': ' + wav.length + ' bytes, peak ' + stats.peak.toFixed(3));
}

const manifest = {
  format: 'hearthlight-audio-manifest/1',
  mix: MIX_VERSION,
  orchestra: ORCHESTRA_VERSION,
  sfx: SFX_VERSION,
  sampleRate: MIX_SAMPLE_RATE,
  totalSec: tl.total,
  scoreEvents: scoreEvents.length,
  sfxEvents: sfxEvents.length,
  scoreStem: sha256(scoreStem),
  sfxStem: sha256(sfxStem),
  files,
};
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('AUDIO RENDER GREEN');
