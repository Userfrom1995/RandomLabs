'use strict';

// Contract tests for the web E2E static server (issue #792).
//
// The documented `python3 -m http.server` path spoke HTTP/1.0 and made
// Node 22's undici client abort a long crawl with an internal
// Parser.finish assertion. The replacement is a dependency-free HTTP/1.1
// keep-alive server with a deterministic lifecycle: one URL line on
// stdout, logs on stderr, GET/HEAD only, graceful SIGTERM/SIGINT, exit 1
// on a taken port, exit 2 on bad usage. These tests pin that contract
// over real sockets without launching Chrome.
//
// Run: node --test web/e2e/tests/serve-site.test.js

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const E2E_DIR = path.join(__dirname, '..');
const SERVER = path.join(E2E_DIR, 'serve-site.js');
const RUNNER = path.join(E2E_DIR, 'run-browser-e2e.sh');

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-site-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>root</title>\n');
  fs.writeFileSync(path.join(root, 'site.css'), 'body { color: rgb(1, 2, 3); }\n');
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'docs', 'index.html'), '<!doctype html><title>docs</title>\n');
  fs.mkdirSync(path.join(root, 'pct%dir'));
  fs.writeFileSync(path.join(root, 'pct%dir', 'index.html'), '<!doctype html><title>pct</title>\n');
  fs.writeFileSync(path.join(root, 'asset.wasm'), Buffer.from([0x00, 0x61, 0x73, 0x6d]));
  return root;
}

function startServer(root, extraArgs = []) {
  const child = spawn(process.execPath, [SERVER, '--root', root, '--port', '0', ...extraArgs], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stderr = [];
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  const url = new Promise((resolve, reject) => {
    let buffered = '';
    const timer = setTimeout(() => reject(new Error('server printed no URL')), 5000);
    child.stdout.on('data', (chunk) => {
      buffered += chunk;
      const newline = buffered.indexOf('\n');
      if (newline !== -1) {
        clearTimeout(timer);
        resolve(buffered.slice(0, newline));
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited ${code}: ${Buffer.concat(stderr)}`));
    });
  });
  return { child, url, stderr };
}

function request(url, { method = 'GET', headers = {}, agent } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers, agent }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
        socket: res.socket,
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

function waitForExit(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
}

test('the server parses and the runner owns it', () => {
  const check = spawnSync(process.execPath, ['--check', SERVER], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  const runner = fs.readFileSync(RUNNER, 'utf8');
  assert.match(runner, /node "\$SCRIPT_DIR\/serve-site\.js" --root "\$WEB_ROOT" --port 0/);
  assert.match(runner, /static server did not answer/);
});

test('serves files, directories, and wasm over keep-alive', async (t) => {
  const root = makeRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const server = startServer(root);
  t.after(() => server.child.kill('SIGKILL'));
  const base = await server.url;
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });

  const first = await request(`${base}site.css`, { agent });
  assert.equal(first.status, 200);
  assert.match(first.headers['content-type'], /text\/css/);
  assert.match(first.headers['cache-control'], /no-store/);
  assert.match(first.body.toString(), /rgb\(1, 2, 3\)/);

  const index = await request(base, { agent });
  assert.equal(index.status, 200);
  assert.match(index.body.toString(), /<title>root<\/title>/);

  const docs = await request(`${base}docs/`, { agent });
  assert.equal(docs.status, 200);
  assert.match(docs.body.toString(), /<title>docs<\/title>/);

  // A directory without its trailing slash must redirect before serving
  // index.html, so the document's relative links resolve against it.
  const docsRedirect = await request(`${base}docs`, { agent });
  assert.equal(docsRedirect.status, 301);
  assert.equal(docsRedirect.headers.location, '/docs/');
  assert.equal(docsRedirect.body.length, 0);

  // The redirect reuses the raw request path, so an encoded directory
  // name is not decoded twice (which would 403 on the next request).
  const pctRedirect = await request(`${base}pct%25dir`, { agent });
  assert.equal(pctRedirect.status, 301);
  assert.equal(pctRedirect.headers.location, '/pct%25dir/');
  const pct = await request(`${base}${pctRedirect.headers.location}`, { agent });
  assert.equal(pct.status, 200);
  assert.match(pct.body.toString(), /<title>pct<\/title>/);

  const wasm = await request(`${base}asset.wasm`, { agent });
  assert.equal(wasm.status, 200);
  assert.equal(wasm.headers['content-type'], 'application/wasm');
  assert.deepEqual([...wasm.body], [0x00, 0x61, 0x73, 0x6d]);

  // maxSockets: 1 plus a drained body per response means a new connection
  // would have been visible here; HTTP/1.1 keep-alive reuses the socket.
  assert.equal(first.socket, wasm.socket, 'keep-alive did not reuse the connection');

  const head = await request(`${base}site.css`, { method: 'HEAD', agent });
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(head.headers['content-length'], String(first.body.length));
  agent.destroy();
});

test('honors Connection: close', async (t) => {
  const root = makeRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const server = startServer(root);
  t.after(() => server.child.kill('SIGKILL'));
  const base = await server.url;
  const response = await request(base, { headers: { connection: 'close' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.connection, 'close');
});

test('answers 404, 405, and rejects traversal', async (t) => {
  const root = makeRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const server = startServer(root, ['--quiet']);
  t.after(() => server.child.kill('SIGKILL'));
  const base = await server.url;

  const missing = await request(`${base}missing.html`);
  assert.equal(missing.status, 404);

  const post = await request(`${base}index.html`, { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');

  const traversal = await request(`${base}%2e%2e%2fpackage.json`);
  assert.equal(traversal.status, 403);

  const nul = await request(`${base}site.css%00.png`);
  assert.equal(nul.status, 403);
});

test('SIGTERM shuts down cleanly with status 0', async (t) => {
  const root = makeRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const server = startServer(root, ['--quiet']);
  t.after(() => server.child.kill('SIGKILL'));
  await server.url;
  server.child.kill('SIGTERM');
  const exit = await waitForExit(server.child);
  assert.equal(exit.code, 0, `server exited ${JSON.stringify(exit)}`);
});

test('a taken port exits 1 loudly', async (t) => {
  const root = makeRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const first = startServer(root, ['--quiet']);
  t.after(() => first.child.kill('SIGKILL'));
  const base = await first.url;
  const port = new URL(base).port;

  const second = spawn(process.execPath, [SERVER, '--root', root, '--port', port], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const stderr = [];
  second.stderr.on('data', (chunk) => stderr.push(chunk));
  const exit = await waitForExit(second);
  assert.equal(exit.code, 1, Buffer.concat(stderr).toString());
  assert.match(Buffer.concat(stderr).toString(), /already in use/);
});

test('bad usage exits 2', () => {
  for (const args of [
    ['--port', 'nope'],
    ['--port', '70000'],
    ['--root'],
    ['--bogus'],
    ['--root', path.join(os.tmpdir(), 'serve-site-missing-root-792')],
  ]) {
    const proc = spawnSync(process.execPath, [SERVER, ...args], {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(proc.status, 2, `${args.join(' ')}: ${proc.stderr}`);
  }
});

test('a filesystem root is served without a doubled separator', async (t) => {
  const root = path.parse(os.tmpdir()).root;
  // `/` would short-circuit the root-equality check, so probe a nested
  // file: pre-fix the guard compared against `root + path.sep` (`//` for
  // `/`) and every path under the filesystem root came back 403.
  const probe = ['etc/hostname', 'etc/hosts', 'etc/passwd'].find(
    (relative) => fs.existsSync(path.join(root, relative)),
  );
  if (!probe) {
    t.skip(`no readable probe under the filesystem root: ${root}`);
    return;
  }
  const server = startServer(root, ['--quiet']);
  t.after(() => server.child.kill('SIGKILL'));
  const base = await server.url;
  const response = await request(`${base}${probe}`);
  assert.equal(response.status, 200);
});

test('site-e2e drains bodies and requests fresh connections', () => {
  const source = fs.readFileSync(path.join(E2E_DIR, 'site-e2e.js'), 'utf8');
  assert.match(source, /headers: \{ connection: 'close' \}/);
  assert.match(source, /signal: AbortSignal\.timeout\(10000\)/);
  assert.match(source, /async function fetchQuietly/);
  assert.match(source, /is fetchable/);
});
