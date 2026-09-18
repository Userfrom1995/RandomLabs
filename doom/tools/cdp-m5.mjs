// M5 CDP harness (shared by capture-m5 and bench-m5): dependency-free
// headless-Chromium driver over Node built-ins only (http server, child
// process, global WebSocket). No npm packages, no Playwright.
// No em dash in this file by repo rule.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import net from 'node:net';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.wad': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

// Static server for the repo root (serves /doom/ same-origin). Resolves
// with { origin, close }.
export function startServer() {
  return new Promise((resolve, reject) => {
    const srv = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://x');
        let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
        if (path.endsWith('/')) path += 'index.html';
        const file = join(REPO_ROOT, path);
        if (!file.startsWith(REPO_ROOT) || !existsSync(file)) {
          res.writeHead(404, { 'content-type': 'text/plain' });
          res.end('not found');
          return;
        }
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end('server error');
      }
    });
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      resolve({ origin: `http://127.0.0.1:${port}`, close: () => srv.close() });
    });
    srv.on('error', reject);
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

async function httpJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`debug endpoint ${res.status} at ${url}`);
  return res.json();
}

// Launch headless Chromium with a fresh profile. Resolves with
// { proc, debugPort, close }. Matches the M4 proof setup (headless new,
// SwiftShader WebGL, no sandbox for containers).
export async function launchChromium({ userDataDir, window = '1280,1000', extraArgs = [] } = {}) {
  const debugPort = await freePort();
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${window}`,
    '--about-blank',
    ...extraArgs,
  ];
  const proc = spawn(CHROME_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  proc.stderr.on('data', () => {});
  const deadline = Date.now() + 20000;
  for (;;) {
    try {
      await httpJson(`http://127.0.0.1:${debugPort}/json/version`);
      break;
    } catch {
      if (proc.exitCode !== null) throw new Error(`chromium exited early (code ${proc.exitCode})`);
      if (Date.now() > deadline) throw new Error('chromium debug endpoint never came up');
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  return {
    proc,
    debugPort,
    close: () => {
      try { proc.kill('SIGKILL'); } catch { /* already dead */ }
    },
  };
}

// Open the first page target and attach a CDP session.
export async function openPage(debugPort) {
  const targets = await httpJson(`http://127.0.0.1:${debugPort}/json/list`);
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target in debug list');
  return connectCdp(page.webSocketDebuggerUrl);
}

// Minimal CDP client over the global WebSocket (Node 22 built-in).
export function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const handlers = new Map();
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  ws.addEventListener('message', (event) => {
    let msg;
    try { msg = JSON.parse(String(event.data)); } catch { return; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`CDP ${msg.error.code}: ${msg.error.message}`));
      else resolve(msg.result);
    } else if (msg.method) {
      const list = handlers.get(msg.method) || [];
      for (const fn of list) {
        try { fn(msg.params); } catch { /* handler faults stay local */ }
      }
    }
  });
  const cdp = {
    ws,
    opened,
    on(method, fn) {
      if (!handlers.has(method)) handlers.set(method, []);
      handlers.get(method).push(fn);
    },
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    // Evaluate JS in the page and return the value (or the rejection).
    async evaluate(expression, { awaitPromise = false } = {}) {
      const r = await cdp.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise,
        userGesture: false,
      });
      if (r.exceptionDetails) {
        const text = r.exceptionDetails.exception
          ? JSON.stringify(r.exceptionDetails.exception).slice(0, 300)
          : (r.exceptionDetails.text || 'evaluate failed');
        throw new Error(`page evaluate threw: ${text}`);
      }
      return r.result && r.result.value;
    },
    close() {
      try { ws.close(); } catch { /* already closed */ }
    },
  };
  return cdp;
}

// Collect console errors and page exceptions into an array for the run.
export function collectPageErrors(cdp) {
  const errors = [];
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') {
      errors.push(`console.error: ${(p.args || []).map((a) => a.value ?? a.description ?? '?').join(' ')}`.slice(0, 300));
    }
  });
  cdp.on('Runtime.exceptionThrown', (p) => {
    errors.push(`exception: ${(p.exceptionDetails && p.exceptionDetails.text) || 'unknown'}`.slice(0, 300));
  });
  cdp.on('Log.entryAdded', (p) => {
    if (p.entry && (p.entry.level === 'error')) {
      errors.push(`log.error: ${(p.entry.text || '').slice(0, 300)}`);
    }
  });
  return errors;
}

// Poll a page boolean until true or the timeout lapses. Returns the number
// of polls used (for latency accounting by callers).
export async function waitFor(cdp, jsBoolean, { timeoutMs = 20000, pollMs = 250 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let polls = 0;
  for (;;) {
    polls++;
    let ok = false;
    try { ok = await cdp.evaluate(`!!(${jsBoolean})`); } catch { ok = false; }
    if (ok) return polls;
    if (Date.now() > deadline) throw new Error(`waitFor timed out: ${jsBoolean.slice(0, 120)}`);
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
