// Hearthlight audit: enforces the binding gates on committed sources.
// Exit 0 = green, non-zero = gate failure with a reason.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt } from '../engine/timeline.js';
import { motifFor } from '../score/themes.js';
import { PAINTED_BACKGROUNDS } from '../engine/backgrounds.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failures.push(name);
};

const cliArgs = process.argv.slice(2);
if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
  console.log('Usage: node film/tools/audit.mjs [--help]');
  console.log('Enforces the binding gates on committed sources; exits 0 green, 1 on gate failure.');
  console.log('Takes no flags; exits 2 on unknown flags.');
  process.exit(0);
}
const unknownAuditFlag = cliArgs.find((a) => a.startsWith('-'));
if (unknownAuditFlag) {
  console.error('Unknown flag: ' + unknownAuditFlag + ' (usage: node film/tools/audit.mjs [--help])');
  process.exit(2);
}

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(label + ' is corrupt (' + path + '): ' + err.message);
    process.exit(1);
  }
};

const sp = loadJson(join(root, 'story/screenplay.json'), 'story/screenplay.json');
const tl = buildTimeline(sp);
check('runtime 240-300s', tl.total >= 240 && tl.total <= 300, tl.total + 's');
check('five acts', tl.acts.length === 5);

let prev = 0; let contiguous = true;
for (const s of tl.shots) { if (Math.abs(s.start - prev) > 1e-9) contiguous = false; prev = s.end; }
check('shots contiguous, no gaps', contiguous, tl.shots.length + ' shots');

let coverage = true; const covWhy = [];
for (const s of tl.shots) {
  if (!s.bg || !s.palette) { coverage = false; covWhy.push(s.id + ':bg'); }
  if (!Array.isArray(s.cast)) { coverage = false; covWhy.push(s.id + ':cast'); }
  if (!s.music || !s.music.cue || !s.music.motif || !s.music.tempo) { coverage = false; covWhy.push(s.id + ':cue'); }
  else {
    try { motifFor(s.music); } catch { coverage = false; covWhy.push(s.id + ':motif'); }
  }
  for (const c of s.captions || []) {
    const cdur = c.dur || 4.5;
    if (c.t < 0 || c.t + cdur > s.dur + 1e-9) { coverage = false; covWhy.push(s.id + ':caption-overflow'); }
    if (!c.who || !c.line) { coverage = false; covWhy.push(s.id + ':caption-empty'); }
  }
}
check('shot coverage (bg/cast/cue/captions)', coverage, covWhy.join(',') || 'all 20 shots');

// scrub-exactness: shotAt(total - eps) resolves to the last shot
const end = shotAt(tl, tl.total - 0.001);
check('timeline end resolves', end.shot.id === tl.shots[tl.shots.length - 1].id, end.shot.id);

// determinism: rng substreams are stable across imports
const rng = await import('../engine/rng.js');
const a = rng.substream('20260927', 'boil|s01', 7)();
const b = rng.substream('20260927', 'boil|s01', 7)();
check('rng deterministic', a === b, String(a));

// provenance: no binary blobs without committed generators
const bins = [];
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === 'dist') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(png|wav|mp3|mp4|webm|ttf|otf|bin)$/i.test(n)) bins.push(p);
  }
})(root);
check('provenance (no binary blobs)', bins.length === 0, bins.join(','));

// storyboard parity
const board = loadJson(join(root, 'story/storyboard.json'), 'story/storyboard.json');
check('storyboard covers all shots', board.panels.length === tl.shots.length, board.panels.length + ' panels');

// hand-drawn craft engine: modules present, paint set covers the screenplay
const craftMods = ['engine/ink.js', 'engine/paper.js', 'engine/backgrounds.js', 'engine/rigs.js'];
check('craft modules committed', craftMods.every((f) => existsSync(join(root, f))), craftMods.join(','));
const usedBgs = [...new Set(tl.shots.map((s) => s.bg))];
check('paint set covers screenplay bgs', usedBgs.every((b) => PAINTED_BACKGROUNDS.includes(b)), usedBgs.join(','));
const usedMoves = [...new Set(tl.shots.map((s) => s.camera.move))];
const knownMoves = ['push-in', 'pull-back', 'pan-right', 'track-left', 'track-right', 'sweep', 'rise', 'crane-up', 'tilt-up', 'bloom', 'fade-gold', 'hold', 'drift', 'orbit'];
check('camera moves all known', usedMoves.every((m) => knownMoves.includes(m)), usedMoves.join(','));

// self-review loop: capture tool + gallery wall wired, no binaries shipped
check('capture tool committed', existsSync(join(root, 'tools/capture.mjs')));
const html = readFileSync(join(root, 'index.html'), 'utf8');
check('stills gallery wired', html.includes('id="galleryGrid"') && existsSync(join(root, 'player/gallery.js')));
const playerJs = readFileSync(join(root, 'player/player.js'), 'utf8');
check('player paints gallery', playerJs.includes('paintGallery(state.tl'));

// full animation performance: frame lock, weather, eased acting
check('frame lock module committed', existsSync(join(root, 'engine/frames.js')));
check('particles module committed', existsSync(join(root, 'engine/particles.js')));
const { PARTICLE_FIELDS } = await import('../engine/particles.js');
const perfUsedBgs = [...new Set(tl.shots.map((s) => s.bg))];
check('weather covers screenplay bgs',
  perfUsedBgs.every((b) => b in PARTICLE_FIELDS), perfUsedBgs.join(','));
check('player seeks on the frame grid', playerJs.includes('frameTime('));
check('performance suite committed', existsSync(join(root, 'tests/performance.mjs')));

// original score and sound world: orchestra, voices, sfx, mix, stems
const scoreMods = ['score/orchestra.js', 'score/voices.js', 'score/sfx.js', 'score/mix.js',
  'score/score-events.json', 'score/sfx-events.json', 'tools/render-audio.mjs', 'tests/score.mjs'];
check('score modules committed', scoreMods.every((f) => existsSync(join(root, f))), scoreMods.join(','));
const { buildScoreEvents, ORCHESTRA_VERSION } = await import('../score/orchestra.js');
const { buildSfxEvents, SFX_VERSION } = await import('../score/sfx.js');
const { renderMix, analyze, MIX_SAMPLE_RATE } = await import('../score/mix.js');
const scoreEvents = buildScoreEvents(tl);
const sfxEvents = buildSfxEvents(tl);
const scoredIds = new Set(scoreEvents.map((e) => e.shot));
check('every shot scored', tl.shots.every((s) => scoredIds.has(s.id)), scoreEvents.length + ' events');
const foleyIds = new Set(sfxEvents.map((e) => e.shot));
check('every tagged shot foleyed',
  tl.shots.filter((s) => (s.sfx || []).length > 0).every((s) => foleyIds.has(s.id)), sfxEvents.length + ' events');
const { frameTime } = await import('../engine/frames.js');
let drift = 0;
for (const e of [...scoreEvents, ...sfxEvents]) drift = Math.max(drift, Math.abs(e.t - frameTime(e.t)));
check('A/V sync drift zero (frame grid)', drift === 0, String(drift));
const committedScore = readFileSync(join(root, 'score/score-events.json'), 'utf8');
const committedSfx = readFileSync(join(root, 'score/sfx-events.json'), 'utf8');
const canonScore = JSON.stringify({
  format: 'hearthlight-score-events/1',
  orchestra: ORCHESTRA_VERSION,
  seed: sp.seed,
  total: tl.total,
  events: scoreEvents,
}, null, 2) + '\n';
const canonSfx = JSON.stringify({
  format: 'hearthlight-sfx-events/1',
  sfx: SFX_VERSION,
  seed: sp.seed,
  total: tl.total,
  events: sfxEvents,
}, null, 2) + '\n';
check('committed score stem matches rebuild', committedScore === canonScore, scoreEvents.length + ' events');
check('committed sfx stem matches rebuild', committedSfx === canonSfx, sfxEvents.length + ' events');
const audioJs = readFileSync(join(root, 'score/animatic-audio.js'), 'utf8');
check('live performer uses orchestra spec',
  audioJs.includes('orchestrate(') && audioJs.includes('noteFreq('));
check('player passes full shot to performer', playerJs.includes('setCue(shot.music, shot)'));
const { master } = renderMix(tl, scoreEvents, sfxEvents, MIX_SAMPLE_RATE);
const mStats = analyze(master);
check('master exact length', master.length === Math.ceil(tl.total * MIX_SAMPLE_RATE), master.length + ' samples');
check('master peak bounded', mStats.peak <= 0.89 + 1e-6 && mStats.peak > 0.5, mStats.peak.toFixed(3));
check('master finite', mStats.bad === 0, 'rms ' + mStats.rms.toFixed(3));

// premiere cut: trailer, caption export, poster set, end card, fallbacks
const trailerSpec = loadJson(join(root, 'story/trailer.json'), 'story/trailer.json');
const { buildTrailer, trailerToFilmTime } = await import('../engine/trailer.js');
let trailer = null;
try {
  trailer = buildTrailer(sp, trailerSpec);
  check('trailer builds', true, trailer.segments.length + ' segments');
} catch (err) {
  check('trailer builds', false, err.message);
}
if (trailer) {
  check('trailer runtime 25-35s', trailer.total >= 25 && trailer.total <= 35, trailer.total + 's');
  let parity = true;
  for (const seg of trailer.segments) {
    for (let k = 0; k < seg.dur * 24; k++) {
      const ft = frameTime(trailerToFilmTime(trailer, seg.start + k / 24));
      if (shotAt(tl, ft).shot.id !== seg.shot) { parity = false; break; }
    }
    if (!parity) break;
  }
  check('trailer frames are film frames', parity);
}
const { buildVtt } = await import('../tools/render-captions.mjs');
const rebuiltVtt = buildVtt(tl).vtt;
check('committed captions.vtt matches rebuild',
  readFileSync(join(root, 'captions.vtt'), 'utf8') === rebuiltVtt);
const cuedShots = new Set();
for (const shot of tl.shots) {
  for (const c of shot.captions || []) {
    if (c.t >= 0 && c.t + (c.dur || 4.5) <= shot.dur + 1e-9) cuedShots.add(shot.id);
  }
}
check('every shot captioned', tl.shots.every((s) => cuedShots.has(s.id)), cuedShots.size + ' shots');
check('all three posters on the wall',
  html.includes('posters/poster-v1.svg') && html.includes('posters/poster-v2.svg') &&
  html.includes('posters/poster-v3.svg') &&
  existsSync(join(root, 'posters/poster-v2.svg')) &&
  existsSync(join(root, 'posters/poster-v3.svg')));
check('trailer labels match shot titles',
  trailer.segments.every((seg) => {
    const shot = tl.shots.find((s) => s.id === seg.shot);
    return !!shot && seg.label === shot.title;
  }), trailer.segments.map((s) => s.shot + '=' + JSON.stringify(s.label)).join(' '));
for (const id of ['endCard', 'btnReplay', 'btnModeSwap', 'btnDismiss', 'trailerCall', 'btnTrailer', 'btnFilm']) {
  check('premiere control present: ' + id, html.includes('id="' + id + '"'));
}
check('noscript fallback', html.includes('<noscript>'));
check('premiere player wiring',
  playerJs.includes('filmTimeOf(') && playerJs.includes('setMode(') &&
  playerJs.includes('showEndCard()') && playerJs.includes('trailerToFilmTime('));
check('canvas 2d guard', playerJs.includes('cannot paint the film'));
const css = readFileSync(join(root, 'player/player.css'), 'utf8');
check('focus visible styled', css.includes(':focus-visible'));

// continuity ledger (rebuild Phase 1): every shot declares entry/exit state,
// a cause link naming the previous shot, and a flame pair from a controlled
// vocabulary whose chain must be unbroken across the cut.
const FLAMES = ['full', 'faltering', 'dark', 'kindled', 'guarded', 'half', 'stub', 'cairn-lit', 'many'];
let ledgerOk = true; const ledgerWhy = [];
tl.shots.forEach((s, i) => {
  const c = s.continuity;
  if (!c || !c.entry || !c.exit || !c.cause || !c.flameIn || !c.flameOut) {
    ledgerOk = false; ledgerWhy.push(s.id + ':fields');
  } else {
    if (!FLAMES.includes(c.flameIn) || !FLAMES.includes(c.flameOut)) {
      ledgerOk = false; ledgerWhy.push(s.id + ':flame-vocab');
    }
    if (i > 0) {
      if (tl.shots[i - 1].continuity.flameOut !== c.flameIn) {
        ledgerOk = false; ledgerWhy.push(s.id + ':flame-chain');
      }
      if (!c.cause.toLowerCase().includes(tl.shots[i - 1].id)) {
        ledgerOk = false; ledgerWhy.push(s.id + ':cause-link');
      }
    }
  }
});
check('continuity ledger (entry/exit/cause/flame chain)', ledgerOk, ledgerWhy.join(',') || tl.shots.length + ' shots chained');

// dialogue lattice (rebuild Phase 1): per-line speaker, in/out on the 24 fps
// lattice, closed emotion set, sorted non-overlapping lines within each shot.
const { frameTime: latticeTime } = await import('../engine/frames.js');
const SPEAKERS = ['NARRATOR', 'NIA', 'YARA', 'TAM', 'LUMI', 'RUEL'];
const EMOTIONS = ['awe', 'anger', 'calm', 'fear', 'grief', 'guilt', 'hope', 'joy',
  'resolve', 'shame', 'sorrow', 'tenderness', 'wonder', 'exhaustion',
  'determination', 'relief', 'neutral'];
let latticeOk = true; const latticeWhy = [];
for (const s of tl.shots) {
  const lines = s.captions || [];
  const sorted = [...lines].sort((a, b) => a.t - b.t);
  sorted.forEach((c, i) => {
    const dur = c.dur || 4.5;
    if (!SPEAKERS.includes(c.who)) { latticeOk = false; latticeWhy.push(s.id + ':speaker'); }
    if (!EMOTIONS.includes(c.emotion)) { latticeOk = false; latticeWhy.push(s.id + ':emotion'); }
    if (Math.abs(latticeTime(c.t) - c.t) > 1e-9 || Math.abs(latticeTime(dur) - dur) > 1e-9) {
      latticeOk = false; latticeWhy.push(s.id + ':lattice');
    }
    if (c.t < 0 || c.t + dur > s.dur + 1e-9) { latticeOk = false; latticeWhy.push(s.id + ':bounds'); }
    if (i > 0 && c.t < sorted[i - 1].t + (sorted[i - 1].dur || 4.5) - 1e-9) {
      latticeOk = false; latticeWhy.push(s.id + ':overlap');
    }
  });
}
check('dialogue lattice (speaker/emotion/timing per line)', latticeOk, latticeWhy.join(',') || 'all lines on the lattice');

// human character craft (rebuild Phase 2): proportion bodies, face engine,
// acting beats, face-safe boil, and full cast staging.
const humanMods = ['engine/humans.js', 'engine/faces.js', 'engine/acting.js'];
check('human modules committed', humanMods.every((f) => existsSync(join(root, f))), humanMods.join(','));
const { HUMAN_MODELS } = await import('../engine/humans.js');
const { EMOTIONS: FACE_EMOTIONS, FACE_CARDS } = await import('../engine/faces.js');
const { actFor: auditActFor } = await import('../engine/acting.js');
const rigsSrc = readFileSync(join(root, 'engine/rigs.js'), 'utf8');
const animSrc = readFileSync(join(root, 'engine/animatic.js'), 'utf8');
const inkSrc = readFileSync(join(root, 'engine/ink.js'), 'utf8');
const usedCast = [...new Set(tl.shots.flatMap((s) => s.cast))];
check('every cast member has a renderer',
  usedCast.every((c) => c === 'ruel' ? rigsSrc.includes('drawRuel') : HUMAN_MODELS[c]),
  usedCast.join(','));
check('tam/lumi rigs exported', rigsSrc.includes('drawTam') && rigsSrc.includes('drawLumi'));
check('stage draws the full party',
  animSrc.includes('drawTam(') && animSrc.includes('drawLumi(') && animSrc.includes('actFor('));
check('face-safe boil wired',
  inkSrc.includes('boilJitterFace') && animSrc.includes('boilJitterFace'));
const latticeEmotions = [...new Set(tl.shots.flatMap((s) => (s.captions || []).map((c) => c.emotion)))];
check('face engine covers lattice emotions',
  latticeEmotions.every((e) => FACE_EMOTIONS.includes(e)), latticeEmotions.join(','));
const cardTotal = Object.values(FACE_CARDS).reduce((n, l) => n + l.length, 0);
check('face cards cover bible sheets', cardTotal >= 16, cardTotal + ' cards');
let actOk = true;
for (const s of tl.shots) {
  const a = auditActFor(s, 0.5, s.dur / 2);
  if (!a || a.exertion < 0 || a.exertion > 1 || !a.secondary) actOk = false;
}
check('acting state on all shots', actOk);
check('human craft suite committed', existsSync(join(root, 'tests/craft-humans.mjs')));

// painted world and hand-drawn motion (rebuild Phase 3): composition per
// location, three wash layers, width-honest detail budgets, ground-contact
// gait, dialogue nod, secondary-driven cloth, anchored weather, and the
// background-plate capture loop with its craft suite.
const { COMPOSITION, WASH_LAYERS, compositionFor, washLayersFor, detailCountFor } =
  await import('../engine/backgrounds.js');
const { footPlant, gaitFor } = await import('../engine/humans.js');
const { speechNod } = await import('../engine/faces.js');
const { waterYFor, hearthFor } = await import('../engine/particles.js');
const phase3Bgs = [...new Set(tl.shots.map((s) => s.bg))];
check('composition covers screenplay locations',
  phase3Bgs.every((b) => COMPOSITION[b] !== undefined), phase3Bgs.join(','));
check('three wash layers with distinct streams',
  WASH_LAYERS.length === 3 &&
  new Set(washLayersFor(phase3Bgs[0]).map((l) => l.stream)).size === 3);
check('detail budgets scale honestly',
  phase3Bgs.every((b) => detailCountFor(b, 390) < detailCountFor(b, 960)));
check('gait plants stance feet', footPlant(-1, 0.05, 0.5).lift === 0 && footPlant(-1, 0.05, 0.5).planted);
check('gait runs on exertion', gaitFor(1).cadence > gaitFor(0).cadence);
check('dialogue nod silent off-line', speechNod('', 1) === 0);
check('anchors fall back honestly', waterYFor(undefined, 540) === 432 && hearthFor(undefined) === null);
check('stage feeds secondary and anchors',
  animSrc.includes('secondary: act.secondary') && animSrc.includes('painted)'));
check('plates captured per location',
  readFileSync(join(root, 'tools/capture.mjs'), 'utf8').includes('plates.json'));
check('world craft suite committed', existsSync(join(root, 'tests/craft-world.mjs')));

// dialogue voice and sound continuity (rebuild Phase 4): dialogue-first
// ducking shared by the offline master and the live performer, legato
// score with no dead air and resolving closing notes, per-line delivery
// coverage (faces for humans, body acting for Ruel's single line), and the
// SFX re-anchor to the new action beats at pinned event counts.
const { dialogueWindows, duckLevelAt, SCORE_FLOOR, SFX_FLOOR, DUCK_VERSION } =
  await import('../score/duck.js');
const { buildScoreEvents: auditScoreEvents } = await import('../score/orchestra.js');
const { buildSfxEvents: auditSfxEvents, tagRecipe: auditTagRecipe } = await import('../score/sfx.js');
const auditScore = auditScoreEvents(tl);
const auditSfx = auditSfxEvents(tl);
const auditWindows = dialogueWindows(tl);
check('duck module version pinned', DUCK_VERSION === 'hearthlight-duck/1');
check('duck floors favor words', SCORE_FLOOR < SFX_FLOOR && SFX_FLOOR < 1);
check('duck holds under lines, rests outside',
  duckLevelAt(3, auditWindows, SCORE_FLOOR) === SCORE_FLOOR &&
  duckLevelAt(0.5, auditWindows, SCORE_FLOOR) === 1);
let auditDead = 0;
for (let t = 0; t < tl.total; t++) {
  if (!auditScore.some((e) => t >= e.t && t < e.t + e.dur)) auditDead++;
}
check('score covers every second', auditDead === 0, auditDead + ' dead');
check('event counts pinned (602/50)', auditScore.length === 602 && auditSfx.length === 50,
  auditScore.length + '/' + auditSfx.length);
const { faceFor: auditFaceFor, speakFor: auditSpeakFor } = await import('../engine/rigs.js');
const auditS12 = tl.shots.find((s) => s.id === 's12');
check('ruel delivers his line in the body',
  auditSpeakFor(auditS12, 'RUEL', 4) === 1 && auditSpeakFor(auditS12, 'RUEL', 0) === 0);
check('silence tags honestly empty',
  auditTagRecipe('grove-silence') === null && auditTagRecipe('title-hush') === null);
check('dialogue-voice suite committed', existsSync(join(root, 'tests/dialogue-voice.mjs')));

if (failures.length) { console.error('AUDIT RED: ' + failures.join(', ')); process.exit(1); }
console.log('AUDIT GREEN');
