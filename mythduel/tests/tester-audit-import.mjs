// Mythduel audit import-safety regression suite (Tester, Phase 1 re-test, Refs #470).
//
// Pins the Evaluator's blocking remedy: mythduel/tools/audit.mjs must be
// side-effect-free on import (argv parsing + audit body behind the same
// isMain guard as capture/render/render-captions), while CLI behavior
// (green 0, --help 0, --bogus stderr + 2) is unchanged.
// Pure node, no network, no wall-clock: exits 0 green, 1 red.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAudit } from '../tools/audit.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

// Source-level pins: exported runner + isMain guard, no top-level audit run.
const src = readFileSync(join(root, 'tools/audit.mjs'), 'utf8');
check('audit exports runAudit', /export function runAudit/.test(src));
check('audit has isMain guard', /const isMain/.test(src) && /if \(isMain\)/.test(src));
check('audit body runs only behind isMain', /if \(isMain\) \{[\s\S]*runAudit\(\)/.test(src));

// Runtime: in-process import was quiet (we got here) and runAudit is green.
const failures = runAudit();
check('runAudit() returns zero failures', Array.isArray(failures) && failures.length === 0, String(failures.length));

// Child import prints nothing (no audit side effect on bare import).
{
  const out = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', "const m = await import('./tools/audit.mjs'); console.log('ALIVE:' + (typeof m.runAudit));"],
    { cwd: root, encoding: 'utf8' }
  );
  const lines = out.trim().split('\n');
  check('bare import prints only the probe line', lines.length === 1 && lines[0] === 'ALIVE:function', JSON.stringify(lines));
}

// Hostile host argv must not kill the importer (old top-level parsing exited 2).
{
  const out = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', "process.argv.push('--bogus'); const m = await import('./tools/audit.mjs'); console.log('HOSTILE_ALIVE:' + (typeof m.runAudit));"],
    { cwd: root, encoding: 'utf8' }
  );
  check('import with hostile host argv survives', out.includes('HOSTILE_ALIVE:function'), out.trim());
}

// CLI contract unchanged: green 0, --help 0, --bogus stderr + 2.
{
  let greenExit = -1;
  try { execFileSync(process.execPath, [join(root, 'tools/audit.mjs')], { cwd: root, stdio: 'pipe' }); greenExit = 0; }
  catch (e) { greenExit = e.status ?? -1; }
  check('audit CLI green exits 0', greenExit === 0, 'exit ' + greenExit);
  let helpExit = -1;
  try { execFileSync(process.execPath, [join(root, 'tools/audit.mjs'), '--help'], { cwd: root, stdio: 'pipe' }); helpExit = 0; }
  catch (e) { helpExit = e.status ?? -1; }
  check('audit CLI --help exits 0', helpExit === 0, 'exit ' + helpExit);
  let bogusExit = -1;
  let bogusErr = '';
  try { execFileSync(process.execPath, [join(root, 'tools/audit.mjs'), '--bogus'], { cwd: root, stdio: 'pipe' }); bogusExit = 0; }
  catch (e) { bogusExit = e.status ?? -1; bogusErr = String(e.stderr || ''); }
  check('audit CLI --bogus exits 2', bogusExit === 2, 'exit ' + bogusExit);
  check('audit CLI --bogus writes stderr', bogusErr.length > 0);
}

if (failed) {
  console.error('AUDIT-IMPORT RED: ' + failed + ' probe(s) failed');
  process.exit(1);
}
console.log('AUDIT-IMPORT GREEN: audit.mjs import-safety pins hold');
