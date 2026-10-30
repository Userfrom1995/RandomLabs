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
const os = require('node:os');
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

test('the runner exits on INT and TERM instead of continuing', () => {
  const source = fs.readFileSync(RUNNER, 'utf8');
  assert.match(source, /^trap cleanup EXIT$/m);
  assert.match(source, /^trap 'exit 130' INT$/m);
  assert.match(source, /^trap 'exit 143' TERM$/m);
  assert.doesNotMatch(source, /^trap cleanup EXIT INT TERM$/m);
});

function planRows(args) {
  const proc = run(args);
  assert.equal(proc.status, 0, proc.stderr);
  const rows = proc.stdout.trim().split('\n').map((line) => line.split('\t'));
  for (const row of rows) {
    assert.equal(row.length, 4, `malformed plan row: ${row.join('|')}`);
  }
  return rows;
}

test('--plan reports a distinct profile and debug port per suite', () => {
  const rows = planRows(['--plan']);
  assert.deepEqual(rows.map((row) => row[0]), SUITES);
  assert.equal(new Set(rows.map((row) => row[2])).size, SUITES.length,
    'the plan reuses a debug port');
  assert.equal(new Set(rows.map((row) => row[3])).size, SUITES.length,
    'the plan reuses a profile');
  for (const [script, url, port, profile] of rows) {
    assert.match(port, /^\d+$/, `${script} has no numeric port`);
    assert.match(profile, new RegExp(`/profile-${script.replace(/\.js$/, '')}$`));
    if (script === 'site-e2e.js') {
      assert.match(url, /^http:\/\/127\.0\.0\.1:0\/$/, 'site-e2e must get the site root');
    } else {
      assert.match(url, /^http:\/\/127\.0\.0\.1:0\/index\.html$/, `${script} must get index.html`);
    }
  }
});

test('--plan maps --base-url onto every suite URL', () => {
  const base = 'https://example.test/preview/pr-788';
  const rows = planRows(['--plan', '--base-url', base]);
  assert.equal(rows.length, SUITES.length);
  for (const [script, url] of rows) {
    if (script === 'site-e2e.js') {
      assert.equal(url, `${base}/`);
    } else {
      assert.equal(url, `${base}/index.html`);
    }
  }
});

test('--plan honors a selected suite', () => {
  const rows = planRows(['--plan', 'site-e2e.js']);
  assert.deepEqual(rows.map((row) => row[0]), ['site-e2e.js']);
});

test('a failing suite propagates and the browser is cleaned up', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-contract-'));
  const nodeArgv = path.join(dir, 'node-argv.log');
  const chromeArgv = path.join(dir, 'chrome-argv.log');
  const chromePid = path.join(dir, 'chrome-pid.log');
  const nodeStub = path.join(dir, 'node');
  fs.writeFileSync(nodeStub, [
    '#!/usr/bin/env bash',
    'if [ "$1" = "-e" ]; then exit 0; fi',
    'printf "%s\\n" "$*" >> "$ARGV_LOG"',
    'exit 7',
    '',
  ].join('\n'), { mode: 0o755 });
  const chromeStub = path.join(dir, 'chrome');
  fs.writeFileSync(chromeStub, [
    '#!/usr/bin/env bash',
    'printf "%s\\n" "$*" >> "$CHROME_ARGV_LOG"',
    'printf "%s\\n" "$$" >> "$CHROME_PID_LOG"',
    'exec sleep 60',
    '',
  ].join('\n'), { mode: 0o755 });
  const proc = spawnSync('bash', [RUNNER, 'site-e2e.js',
    '--base-url', 'http://127.0.0.1:1/',
    '--chrome', chromeStub], {
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      ARGV_LOG: nodeArgv,
      CHROME_ARGV_LOG: chromeArgv,
      CHROME_PID_LOG: chromePid,
    },
  });
  try {
    assert.equal(proc.status, 1, proc.stderr);
    assert.match(proc.stderr, /FAILED: site-e2e\.js \(exit 7\)/);
    const nodeCall = fs.readFileSync(nodeArgv, 'utf8').trim().split('\n');
    assert.equal(nodeCall.length, 1, nodeCall.join('\n'));
    const nodeMatch = nodeCall[0].match(/site-e2e\.js http:\/\/127\.0\.0\.1:1\/ (\d+)$/);
    assert.ok(nodeMatch, `unexpected node argv: ${nodeCall[0]}`);
    const args = fs.readFileSync(chromeArgv, 'utf8').trim();
    const port = args.match(/--remote-debugging-port=(\d+)/);
    const profile = args.match(/--user-data-dir=(\S+)/);
    assert.ok(port, `Chrome argv has no debug port: ${args}`);
    assert.equal(port[1], nodeMatch[1], 'the suite and Chrome disagree on the debug port');
    assert.ok(profile, `Chrome argv has no profile: ${args}`);
    assert.match(profile[1], /\/profile-site-e2e$/, 'the suite did not get its own profile');
    const pid = Number(fs.readFileSync(chromePid, 'utf8').trim());
    assert.ok(pid > 0);
    assert.throws(() => process.kill(pid, 0), /ESRCH/,
      'the runner left Chrome running after the suite failed');
  } finally {
    try {
      const pid = Number(fs.readFileSync(chromePid, 'utf8').trim());
      if (pid > 0) process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
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
