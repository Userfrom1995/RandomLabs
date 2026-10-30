'use strict';

// Contract tests for the fresh-Chrome E2E runner (issue #786).
//
// The suites share a single Chrome in CI and leak state between them
// (storage, service workers, pending CDP sessions), which produced the
// boot-gate/rebind failures and a Node undici assertion on a second
// site-e2e run. The runner must isolate every suite: its own browser, its
// own profile, and its own debug port. These tests pin that contract
// without launching a browser.
//
// Run: node --test web/e2e/tests/run-browser-e2e.test.js

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const E2E_DIR = path.join(__dirname, '..');
const RUNNER = path.join(E2E_DIR, 'run-browser-e2e.sh');
const SUITES = [
  'boot-gate-e2e.js',
  'browser-e2e.js',
  'tester-rebind-lifecycle.js',
  'tester-audio-e2e.js',
  'site-e2e.js',
];

function run(args, env) {
  return spawnSync('bash', [RUNNER, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 15000,
  });
}

test('the runner is executable and parses', () => {
  const mode = fs.statSync(RUNNER).mode & 0o777;
  assert.ok(mode & 0o111, `run-browser-e2e.sh is not executable (${mode.toString(8)})`);
  const proc = spawnSync('bash', ['-n', RUNNER], { encoding: 'utf8' });
  assert.equal(proc.status, 0, proc.stderr);
});

test('--help documents the fresh-browser contract', () => {
  const proc = run(['--help']);
  assert.equal(proc.status, 0, proc.stderr);
  assert.match(proc.stdout, /fresh Chrome/i);
  assert.match(proc.stdout, /profile/i);
});

test('every CDP suite is in the default set and on disk', () => {
  const source = fs.readFileSync(RUNNER, 'utf8');
  const defaults = source.match(/DEFAULT_SCRIPTS=\(([\s\S]*?)\)/);
  assert.ok(defaults, 'DEFAULT_SCRIPTS is missing');
  for (const suite of SUITES) {
    assert.ok(defaults[1].includes(suite), `${suite} is not in DEFAULT_SCRIPTS`);
    assert.ok(fs.existsSync(path.join(E2E_DIR, suite)), `${suite} is missing`);
    assert.ok(source.includes(suite), `${suite} is not accepted by the script validator`);
  }
});

test('each suite gets its own profile and debug port', () => {
  const source = fs.readFileSync(RUNNER, 'utf8');
  assert.match(source, /--user-data-dir="\$profile"/);
  assert.match(source, /--remote-debugging-port="\$port"/);
  assert.match(source, /profile="\$SCRATCH\/profile-\$\{script%\.js\}"/);
  assert.match(source, /port="\$\(free_port\)"/);
  assert.match(source, /mktemp -d/);
});

test('a Node-only suite is rejected before any browser starts', () => {
  const proc = run(['wasm-smoke.js']);
  assert.equal(proc.status, 2);
  assert.match(proc.stderr, /not a Chrome\/CDP suite/);
});

test('an unknown option is a usage error', () => {
  const proc = run(['--definitely-not-an-option']);
  assert.equal(proc.status, 2);
  assert.match(proc.stderr, /unknown option/);
});

test('an unusable Chrome path fails loudly', () => {
  const proc = run([], { CHROME: '/definitely/not/chrome' });
  assert.equal(proc.status, 3);
  assert.match(proc.stderr, /Chrome is not executable/);
});
