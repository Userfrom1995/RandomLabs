// Mythduel audit: enforces the binding gates on committed sources.
// Exit 0 = green, non-zero = gate failure with a reason.
//
// Import-safe: importing this module has no side effects (no argv parsing,
// no audit run, no process.exit). The CLI entrypoint lives behind the isMain
// guard at the bottom; library callers use runAudit().
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt, captionAt } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { substream } from '../engine/rng.js';
import { buildVtt } from './render-captions.mjs';
import { arenaGrade, compositionFor, washPalette, facetTable, skyFork, ARENA_GRADES, ARENA_BUDGETS } from '../engine/arena.js';
import { capturePlates, facetChecksum, ARENA_PLATE_BEATS } from './capture.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(label + ' is corrupt (' + path + '): ' + err.message);
    process.exit(1);
  }
}

export function runAudit() {
  const failures = [];
  const check = (name, ok, detail = '') => {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
    if (!ok) failures.push(name);
  };

  const duel = loadJson(join(root, 'story/duel.json'), 'story/duel.json');
  const tl = buildTimeline(duel);

  // Runtime gate: full duel within 150-200 s.
  check('runtime 150-200s', tl.total >= 150 && tl.total <= 200, tl.total + 's');
  check('eight beats', tl.beats.length === 8, tl.beats.length + ' beats');
  check('four chapters', tl.chapters.length === 4, tl.chapters.length + ' chapters');

  // Beats contiguous, no gaps.
  let prev = 0;
  let contiguous = true;
  for (const b of tl.beats) {
    if (Math.abs(b.start - prev) > 1e-9) contiguous = false;
    prev = b.end;
  }
  check('beats contiguous, no gaps', contiguous, tl.beats.length + ' beats');

  // Chapters cover every beat exactly once.
  const covered = tl.chapters.flatMap((c) => c.beats).sort();
  const allBeats = tl.beats.map((b) => b.id).sort();
  check('chapters cover all beats', JSON.stringify(covered) === JSON.stringify(allBeats), covered.join(','));

  // Continuity ledger: entry equals previous exit, field by field.
  let ledgerOk = true;
  const ledgerWhy = [];
  const norm = (o) => JSON.stringify(o);
  for (let i = 1; i < tl.beats.length; i++) {
    const want = tl.beats[i - 1].continuity.exit;
    const got = tl.beats[i].continuity.entry;
    if (norm(want) !== norm(got)) {
      ledgerOk = false;
      ledgerWhy.push(tl.beats[i].id + ':entry!=prev-exit');
    }
    if (!tl.beats[i].cause) {
      ledgerOk = false;
      ledgerWhy.push(tl.beats[i].id + ':no-cause-link');
    }
  }
  for (const b of tl.beats) {
    if (!b.continuity || !b.continuity.entry || !b.continuity.exit) {
      ledgerOk = false;
      ledgerWhy.push(b.id + ':missing-continuity');
    }
  }
  check('continuity ledger passes', ledgerOk, ledgerWhy.join(',') || '8 beats chained');

  // Fatigue never decreases; wounds persist once taken.
  let woundsOk = true;
  const woundsWhy = [];
  const woundOf = (b, f) => b.continuity.exit[f].wounds;
  if (woundOf(tl.beats[4], 'thor') !== 'split-brow' || woundOf(tl.beats[4], 'zeus') !== 'bruised-ribs') {
    woundsOk = false;
    woundsWhy.push('b05-cost-missing');
  }
  for (let i = 5; i < tl.beats.length; i++) {
    if (woundOf(tl.beats[i], 'thor') !== 'split-brow' || woundOf(tl.beats[i], 'zeus') !== 'bruised-ribs') {
      woundsOk = false;
      woundsWhy.push(tl.beats[i].id + ':wound-forgotten');
    }
    if (tl.beats[i].continuity.exit.thor.fatigue < tl.beats[i - 1].continuity.exit.thor.fatigue ||
        tl.beats[i].continuity.exit.zeus.fatigue < tl.beats[i - 1].continuity.exit.zeus.fatigue) {
      woundsOk = false;
      woundsWhy.push(tl.beats[i].id + ':fatigue-decreased');
    }
  }
  check('wounds persist, fatigue monotonic', woundsOk, woundsWhy.join(',') || 'costs carried');

  // Captions: on the 24 fps lattice, inside their beat, non-empty.
  let capsOk = true;
  const capsWhy = [];
  let cueCount = 0;
  for (const b of tl.beats) {
    for (const c of b.captions || []) {
      cueCount++;
      const onLattice = Math.abs(c.t * 24 - Math.round(c.t * 24)) < 1e-9;
      if (!onLattice) { capsOk = false; capsWhy.push(b.id + ':off-lattice'); }
      if (c.t < 0 || c.t + (c.dur || 4.0) > b.dur + 1e-9) { capsOk = false; capsWhy.push(b.id + ':caption-overflow'); }
      if (!c.who || !c.line) { capsOk = false; capsWhy.push(b.id + ':caption-empty'); }
    }
  }
  check('captions lattice-aligned and inside beats', capsOk, capsWhy.join(',') || cueCount + ' cues');

  // Music: every beat has a cue resolving to a known motif.
  const motifs = ['thor-row', 'zeus-row', 'clash-ostinato', 'resolution-hymn'];
  let musicOk = true;
  const musicWhy = [];
  for (const b of tl.beats) {
    if (!b.music || !b.music.cue || !motifs.includes(b.music.motif)) {
      musicOk = false;
      musicWhy.push(b.id + ':motif');
    }
  }
  check('score motif coverage', musicOk, musicWhy.join(',') || '8 beats cued');

  // SFX: every beat carries tags from the known foley set.
  const sfxKnown = ['surf-bed', 'cloak-gust', 'footfall-gravel', 'swing-haft', 'impact-shaft-block', 'spark-spray', 'throw-whoosh', 'sky-crack', 'catch-thud', 'impact-body', 'knockdown-skid', 'exhale-hit', 'rain-wall', 'rockfall', 'shield-brace', 'wind-release', 'distant-thunder', 'quiet-wash', 'silence-hold'];
  let sfxOk = true;
  const sfxWhy = [];
  for (const b of tl.beats) {
    if (!Array.isArray(b.sfx) || b.sfx.length === 0) { sfxOk = false; sfxWhy.push(b.id + ':no-sfx'); }
    for (const t of b.sfx || []) {
      if (!sfxKnown.includes(t)) { sfxOk = false; sfxWhy.push(b.id + ':' + t); }
    }
  }
  check('sfx cover every beat', sfxOk, sfxWhy.join(',') || 'all tags known');

  // Timeline resolution: beatAt(total - eps) resolves to the last beat;
  // captionAt finds the voiced line; frameTime quantizes seeks.
  const end = beatAt(tl, tl.total - 0.001);
  check('timeline end resolves', end.beat.id === tl.beats[tl.beats.length - 1].id, end.beat.id);
  const b1 = tl.beats[0];
  check('caption lookup works', captionAt(b1, 2.0) && captionAt(b1, 2.0).who === 'THOR', 'b01@2s');
  check('frame grid quantizes', frameTime(1.05) === Math.floor(1.05 * 24) / 24, String(frameTime(1.05)));

  // Determinism: rng substreams stable across imports.
  const a = substream('mythduel-470-phase1', 'boil|b01', 7)();
  const b = substream('mythduel-470-phase1', 'boil|b01', 7)();
  check('rng deterministic', a === b, String(a));

  // Provenance: no binary blobs without committed generators.
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

  // IP guardrail: forbidden-likeness token scan over every text source.
  // Guardrail sentences (lines where "no" precedes the token, e.g. "No Marvel
  // likeness") name a forbidden work only to forbid it, so they are exempt.
  // The audit tool itself is exempt (it carries the token list); every other
  // file must be clean.
  const FORBIDDEN = ['marvel', 'mcu', 'disney', 'santa monica', 'god of war', 'kratos', 'atreus', 'mjolnir', 'mjölnir', 'stormbreaker', 'sony santa'];
  const SCAN_SKIP = ['tools/audit.mjs'];
  const hits = [];
  (function scan(dir) {
    for (const n of readdirSync(dir)) {
      if (n === 'dist' || n === 'node_modules') continue;
      const p = join(dir, n);
      if (statSync(p).isDirectory()) { scan(p); continue; }
      if (!/\.(json|md|js|mjs|html|css|svg)$/i.test(n)) continue;
      const rel = p.slice(root.length + 1);
      if (SCAN_SKIP.includes(rel)) continue;
      const lines = readFileSync(p, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const low = line.toLowerCase();
        for (const tok of FORBIDDEN) {
          const at = low.indexOf(tok);
          if (at === -1) continue;
          // Exempt guardrail sentences: "no" appears before the token on the line.
          if (low.slice(0, at).includes('no ')) continue;
          hits.push(rel + ':' + (i + 1) + ':' + tok);
        }
      });
    }
  })(root);
  check('IP token scan clean', hits.length === 0, hits.join(','));

  // Designs committed.
  const designs = ['designs/thor-model.svg', 'designs/zeus-model.svg', 'designs/weapons.svg', 'designs/palettes.svg', 'story/characters.md', 'story/IP-DECLARATION.md'];
  check('designs committed', designs.every((f) => existsSync(join(root, f))), designs.join(','));

  // Storyboard covers all beats; hero times land inside their beat.
  const board = loadJson(join(root, 'story/storyboard.json'), 'story/storyboard.json');
  const panelBeats = board.panels.map((p) => p.beat).sort();
  check('storyboard covers all beats', JSON.stringify(panelBeats) === JSON.stringify(allBeats), panelBeats.join(','));
  let heroesOk = true;
  for (const p of board.panels) {
    const beat = tl.beats.find((x) => x.id === p.beat);
    if (!beat || !(p.heroTime >= beat.start && p.heroTime < beat.end)) heroesOk = false;
  }
  check('hero frames inside beats', heroesOk, board.panels.length + ' panels');

  // Captions rebuild byte-matches the committed file.
  const { vtt } = buildVtt(tl);
  const committed = readFileSync(join(root, 'captions.vtt'), 'utf8');
  check('captions rebuild matches', vtt === committed, cueCount + ' cues');

  // Phase 2: boards carry shots, entry/exit, and cause links that agree with
  // duel.json. Every panel has 2+ shots, entry/exit pos+weapon+storm matching
  // the beat continuity, and a cause string identical to the beat's.
  let boardsOk = true;
  const boardsWhy = [];
  for (const p of board.panels) {
    const beat = tl.beats.find((x) => x.id === p.beat);
    if (!beat) { boardsOk = false; boardsWhy.push(p.beat + ':no-beat'); continue; }
    if (!Array.isArray(p.shots) || p.shots.length < 2) { boardsOk = false; boardsWhy.push(p.beat + ':shots<2'); }
    const e = p.entry || {};
    const x = p.exit || {};
    const ce = beat.continuity.entry;
    const cx = beat.continuity.exit;
    if (e.thorPos !== ce.thor.pos || e.thorWeapon !== ce.thor.weapon || e.zeusPos !== ce.zeus.pos ||
        e.zeusWeapon !== ce.zeus.weapon || e.storm !== ce.storm) {
      boardsOk = false; boardsWhy.push(p.beat + ':entry-drift');
    }
    if (x.thorPos !== cx.thor.pos || x.thorWeapon !== cx.thor.weapon || x.zeusPos !== cx.zeus.pos ||
        x.zeusWeapon !== cx.zeus.weapon || x.storm !== cx.storm) {
      boardsOk = false; boardsWhy.push(p.beat + ':exit-drift');
    }
    if (p.cause !== beat.cause) { boardsOk = false; boardsWhy.push(p.beat + ':cause-drift'); }
  }
  check('boards agree with duel continuity', boardsOk, boardsWhy.join(',') || board.panels.length + ' panels chained');

  // Phase 2: every shot on the 24 fps lattice, inside its beat, hero shot at
  // the hero frame, voiced lines matching a committed caption speaker.
  let shotsOk = true;
  const shotsWhy = [];
  let shotCount = 0;
  for (const p of board.panels) {
    const beat = tl.beats.find((x) => x.id === p.beat);
    const whos = new Set((beat.captions || []).map((c) => c.who));
    let heroFound = false;
    for (const s of p.shots || []) {
      shotCount++;
      if (Math.abs(s.t * 24 - Math.round(s.t * 24)) > 1e-9) { shotsOk = false; shotsWhy.push(s.id + ':off-lattice'); }
      if (!(s.t >= 0 && s.t < beat.dur)) { shotsOk = false; shotsWhy.push(s.id + ':outside-beat'); }
      if (!s.framing || !s.action || !s.camera) { shotsOk = false; shotsWhy.push(s.id + ':shot-empty'); }
      if (s.voiced !== null && s.voiced !== undefined && !whos.has(s.voiced)) { shotsOk = false; shotsWhy.push(s.id + ':voiced-unknown'); }
      if (Math.abs((beat.start + s.t) - p.heroTime) < 1e-9) heroFound = true;
    }
    if (!heroFound) { shotsOk = false; shotsWhy.push(p.beat + ':no-hero-shot'); }
  }
  check('shots lattice-aligned, hero-anchored', shotsOk, shotsWhy.join(',') || shotCount + ' shots');

  // Phase 2: trailer skeleton resolves against the final timeline: every cut
  // inside its beat on the lattice, beats in timeline order, total 25-35 s.
  const trailer = loadJson(join(root, 'story/trailer.json'), 'story/trailer.json');
  let trailerOk = true;
  const trailerWhy = [];
  let trailerTotal = 0;
  let lastStart = -1;
  for (const c of trailer.cuts || []) {
    const beat = tl.beats.find((x) => x.id === c.beat);
    if (!beat) { trailerOk = false; trailerWhy.push(c.beat + ':no-beat'); continue; }
    if (!(c.tIn < c.tOut)) { trailerOk = false; trailerWhy.push(c.beat + ':empty-cut'); }
    if (c.tIn < beat.start || c.tOut > beat.end) { trailerOk = false; trailerWhy.push(c.beat + ':cut-overflow'); }
    for (const v of [c.tIn, c.tOut]) {
      if (Math.abs(v * 24 - Math.round(v * 24)) > 1e-9) { trailerOk = false; trailerWhy.push(c.beat + ':cut-off-lattice'); }
    }
    if (beat.start < lastStart) { trailerOk = false; trailerWhy.push(c.beat + ':out-of-order'); }
    lastStart = beat.start;
    trailerTotal += c.tOut - c.tIn;
  }
  if (!(trailerTotal >= 25 && trailerTotal <= 35)) { trailerOk = false; trailerWhy.push('total=' + trailerTotal + 's'); }
  check('trailer skeleton resolves, 25-35s', trailerOk, trailerWhy.join(',') || trailerTotal + 's over ' + (trailer.cuts || []).length + ' cuts');

  // Phase 2: arena grades cover every storm level 0-4 across the duel, and the
  // painted geography is deterministic headless (facet tables, sky fork, wash
  // palette stable across calls; composition authored for every beat).
  const gradesSeen = new Set(tl.beats.map((b) => arenaGrade(b.storm).grade));
  check('arena grades cover 0-4', ARENA_GRADES.every((g) => gradesSeen.has(g)), [...gradesSeen].join(','));
  let arenaDet = true;
  for (const b of tl.beats) {
    const panel = board.panels.find((p) => p.beat === b.id);
    const f1 = JSON.stringify(facetTable(tl.seed, b.id + '|mid', 30, 34));
    const f2 = JSON.stringify(facetTable(tl.seed, b.id + '|mid', 30, 34));
    const w1 = JSON.stringify(washPalette(panel.palette, b.storm));
    const w2 = JSON.stringify(washPalette(panel.palette, b.storm));
    if (f1 !== f2 || w1 !== w2) arenaDet = false;
    try { compositionFor(b.id); } catch { arenaDet = false; }
  }
  const forkStable = JSON.stringify(skyFork(tl.seed, 3)) === JSON.stringify(skyFork(tl.seed, 3));
  check('arena deterministic headless', arenaDet && forkStable, '8 beats pinned');
  check('arena budgets capped', ARENA_BUDGETS.facetsPerRidge <= 30 && ARENA_BUDGETS.rainMax <= 160 &&
    ARENA_BUDGETS.ridges <= 3 && ARENA_BUDGETS.mistBands <= 3,
    'facets<=30 rain<=160 ridges<=3 mist<=3');

  // Phase 2: arena plates committed via the capture loop: one per sampled
  // grade, distinct grades, stable checksums.
  const plates = capturePlates();
  const plateGrades = new Set(plates.map((p) => p.grade));
  const sumsStable = plates.every((p) => p.checksum === facetChecksum(tl.seed, p.beat));
  check('arena plates cover grades', plates.length === ARENA_PLATE_BEATS.length && plateGrades.size === plates.length,
    plates.map((p) => p.plate).join(','));
  check('arena plate checksums stable', sumsStable, plates.map((p) => '#' + p.checksum).join(','));

  // Theatre shell wired.
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  check('theatre shell committed', html.includes('id="stage"') && html.includes('id="beatMenu"'), 'stage+beats');
  check('capture tool committed', existsSync(join(root, 'tools/capture.mjs')));
  check('render tool committed', existsSync(join(root, 'tools/render.mjs')));
  const playerJs = readFileSync(join(root, 'player/player.js'), 'utf8');
  check('player seeks on the frame grid', playerJs.includes('frameTime('), 'frameTime in player');

  return failures;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const cliArgs = process.argv.slice(2);
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    console.log('Usage: node mythduel/tools/audit.mjs [--help]');
    console.log('Enforces the binding gates on committed sources; exits 0 green, 1 on gate failure.');
    process.exit(0);
  }
  const unknownFlag = cliArgs.find((a) => a.startsWith('-'));
  if (unknownFlag) {
    console.error('Unknown flag: ' + unknownFlag);
    process.exit(2);
  }
  const failures = runAudit();
  if (failures.length) {
    console.error('AUDIT RED: ' + failures.length + ' gate(s) failed');
    process.exit(1);
  }
  console.log('AUDIT GREEN: all gates pass');
}
