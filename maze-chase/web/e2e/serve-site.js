#!/usr/bin/env node
// serve-site.js - dependency-free static server for the web E2E suites.
//
// The harnesses used to document `python3 -m http.server`, whose HTTP/1.0
// one-request-per-connection behavior made Node 22's undici client abort
// a long crawl with an internal `Parser.finish` assertion on some
// platforms. This server speaks HTTP/1.1 keep-alive (and honors a client
// `Connection: close`), so the suites can crawl many URLs over pooled
// sockets. It also has the deterministic lifecycle the runner needs:
//
// - prints exactly one `http://127.0.0.1:<port>/` line on stdout when
//   listening, then logs diagnostics to stderr only;
// - serves GET and HEAD only, from the maze-chase/ tree by default;
// - shuts down cleanly on SIGINT/SIGTERM (all sockets closed, exit 0);
// - exits 1 when the port is already in use and 2 on bad usage.
//
// Usage:
//   node web/e2e/serve-site.js [--root DIR] [--port PORT] [--quiet]
//
// `--port 0` picks a free ephemeral port. The default port is 8931, the
// port the docs' manual commands use.

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const DEFAULT_PORT = 8931;

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
]);

function usage(message) {
  if (message) console.error(`serve-site: ${message}`);
  console.error('usage: node web/e2e/serve-site.js [--root DIR] [--port PORT] [--quiet]');
  process.exit(2);
}

function parseArgs(argv) {
  const options = {
    root: path.resolve(__dirname, '..', '..'),
    port: DEFAULT_PORT,
    quiet: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '--root' || arg === '--port') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) usage(`${arg} requires a value`);
      index += 1;
      if (arg === '--root') options.root = path.resolve(value);
      else {
        if (!/^[0-9]+$/.test(value)) usage(`bad port: ${value}`);
        options.port = Number(value);
        if (options.port > 65535) usage(`bad port: ${value}`);
      }
    } else if (arg === '-h' || arg === '--help') {
      console.log('usage: node web/e2e/serve-site.js [--root DIR] [--port PORT] [--quiet]');
      process.exit(0);
    } else {
      usage(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function requestTarget(url) {
  if (typeof url !== 'string') return null;
  const query = url.indexOf('?');
  const rawPath = query === -1 ? url : url.slice(0, query);
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  return decoded;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let rootStat;
  try {
    rootStat = fs.statSync(options.root);
  } catch (error) {
    usage(`root is not a directory: ${options.root}`);
  }
  if (!rootStat.isDirectory()) usage(`root is not a directory: ${options.root}`);

  const root = fs.realpathSync(options.root);
  const sockets = new Set();

  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, {
        allow: 'GET, HEAD',
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      });
      response.end('method not allowed\n');
      return;
    }

    const target = requestTarget(request.url);
    if (target === null) {
      response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('forbidden\n');
      return;
    }

    let file = path.resolve(root, `.${target.startsWith('/') ? target : `/${target}`}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('forbidden\n');
      return;
    }

    let stat;
    try {
      stat = fs.statSync(file);
      if (stat.isDirectory()) {
        file = path.join(file, 'index.html');
        stat = fs.statSync(file);
      }
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found\n');
      if (!options.quiet) console.error(`serve-site: 404 ${target}`);
      return;
    }
    if (!stat.isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found\n');
      return;
    }
    try {
      const real = fs.realpathSync(file);
      if (real !== root && !real.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('forbidden\n');
        return;
      }
      file = real;
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found\n');
      return;
    }

    const headers = {
      'content-type': MIME.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
      'content-length': String(stat.size),
      'cache-control': 'no-store',
    };
    response.writeHead(200, headers);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    const stream = fs.createReadStream(file);
    stream.on('error', () => {
      response.destroy();
    });
    stream.pipe(response);
    if (!options.quiet) console.error(`serve-site: 200 ${target}`);
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`serve-site: port ${options.port} is already in use`);
    } else if (error.code === 'EACCES') {
      console.error(`serve-site: permission denied for port ${options.port}`);
    } else {
      console.error(`serve-site: ${error.message}`);
    }
    process.exit(1);
  });

  server.listen(options.port, '127.0.0.1', () => {
    const { port } = server.address();
    console.log(`http://127.0.0.1:${port}/`);
  });

  const shutdown = (signal) => {
    if (!options.quiet) console.error(`serve-site: ${signal}, shutting down`);
    server.close(() => process.exit(0));
    for (const socket of sockets) socket.destroy();
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
