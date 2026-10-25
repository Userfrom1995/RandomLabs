// Site E2E for the game-first web experience (Refs #660).
//
// Drives the whole Maze Chase site in headless chromium over CDP (Node 22+,
// built-in WebSocket, no npm packages) and against the real HTTP server:
// - every page loads with one h1, the shared six-link navigation, no raw
//   markdown link, and no horizontal overflow at desktop or 390x844;
// - every internal href/src resolves to a 200 and every fragment names a
//   real id (the same crawl the docs renderer performs, now over HTTP);
// - the game-first index boots the wasm directly, Start enters play, P
//   pauses, and Resume returns without console errors;
// - docs pages are rendered HTML with a sidebar, never raw markdown.
//
// Usage: node web/e2e/site-e2e.js [base-url] [debug-port]
//   base-url defaults to http://localhost:8931/ (serve maze-chase/ first:
//   `python3 -m http.server 8931` inside it; Windows: `python -m http.server 8931`)
//   debug-port defaults to 9331. Launch chromium first with
//   `--headless=new --remote-debugging-port=9331 --window-size=1280,900 about:blank`
//
// The same harness runs against the deployed preview:
//   node web/e2e/site-e2e.js https://<owner>.github.io/<repo>/preview/pr-<N>/maze-chase/
// (record the exact command and result in progress/ and docs/).

const fs = require('fs');
const os = require('os');

const BASE = (process.argv[2] || 'http://localhost:8931/').replace(/\/?$/, '/');
const DEBUG_PORT = Number(process.argv[3] || 9331);
const SITE_PAGES = [
  ['index.html', 'Maze Chase - Play'],
  ['install.html', 'Maze Chase - Install'],
  ['downloads.html', 'Maze Chase - Downloads'],
  ['compatibility.html', 'Maze Chase - Compatibility'],
  ['releases.html', 'Maze Chase - Releases'],
  ['docs/index.html', 'Maze Chase docs: Docs home'],
];
const NAV = ['index.html', 'install.html', 'downloads.html', 'compatibility.html', 'releases.html', 'docs/'];

if (typeof WebSocket === 'undefined') {
  console.error('SITE-E2E FAIL: global WebSocket not found; run with Node 22+ (`node --version`).');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nextId = 1;
const pending = new Map();
let onConsole = null;
let onLog = null;
let consoleErrors = [];
let failures = 0;
let assertions = 0;

function send(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', (e) => reject(e));
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.id && pending.has(msg.id)) {
        const waiter = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) waiter.reject(new Error(JSON.stringify(msg.error)));
        else waiter.resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled' && onConsole) {
        onConsole(msg.params);
      } else if (msg.method === 'Log.entryAdded' && onLog) {
        onLog(msg.params);
      }
    });
  });
}

async function evalJs(ws, expression) {
  const result = await send(ws, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error('page eval threw: ' + JSON.stringify(result.exceptionDetails).slice(0, 400));
  }
  return result.result.value;
}

async function waitFor(ws, expression, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evalJs(ws, expression)) return true;
    } catch (e) {
      // Navigation tears down the context; retry on the new document.
    }
    await sleep(120);
  }
  throw new Error('timeout waiting for ' + label);
}

async function navigate(ws, url) {
  consoleErrors = [];
  await send(ws, 'Page.navigate', { url });
  await waitFor(ws, 'document.readyState === "complete"', 25000, 'load ' + url);
  await sleep(350);
}

function assert(condition, message) {
  assertions += 1;
  if (condition) {
    console.log('ok:', message);
  } else {
    failures += 1;
    console.error('FAIL:', message);
  }
}

async function httpStatus(url) {
  const response = await fetch(url, { redirect: 'follow' });
  return { status: response.status, body: await response.text() };
}

function resolveLink(pageUrl, href) {
  try {
    return new URL(href, pageUrl);
  } catch (e) {
    return null;
  }
}

function sameSite(target) {
  const base = new URL(BASE);
  return target.origin === base.origin && target.pathname.startsWith(base.pathname);
}

async function collectLinks(ws) {
  return evalJs(ws, `(() => {
    const out = new Set();
    for (const el of document.querySelectorAll('a[href], img[src], link[rel="stylesheet"][href], script[src]')) {
      const value = el.getAttribute('href') || el.getAttribute('src');
      if (value) out.add(value);
    }
    return [...out];
  })()`);
}

(async () => {
  onConsole = (params) => {
    if (params.type !== 'error') return;
    const text = params.args.map((arg) => arg.value || arg.description || '?').join(' ');
    if (!/favicon|Autoplay|audio context/i.test(text)) consoleErrors.push(text.slice(0, 240));
  };
  onLog = (entry) => {
    if (!entry.entry || entry.entry.level !== 'error') return;
    const text = entry.entry.text || '';
    if (!/dbus|DBus|GPU|gpu|Fontconfig|favicon/i.test(text)) consoleErrors.push(text.slice(0, 240));
  };

  const targets = await fetch(`http://localhost:${DEBUG_PORT}/json/list`).then((r) => r.json());
  const target = targets.find((t) => t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
  if (!target) throw new Error('no chromium page target; got: ' + JSON.stringify(targets.map((t) => t.url)));
  const ws = await connect(target.webSocketDebuggerUrl);
  await send(ws, 'Log.enable', {});
  await send(ws, 'Runtime.enable', {});
  await send(ws, 'Page.enable', {});

  const seen = new Set();
  const linkQueue = [];
  const enqueue = (url, link) => {
    const targetUrl = resolveLink(url, link);
    if (!targetUrl || !sameSite(targetUrl)) return;
    const key = targetUrl.href;
    if (seen.has(key)) return;
    seen.add(key);
    linkQueue.push(targetUrl);
  };

  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
  });

  const expectedNav = (path) => {
    const prefix = path.startsWith('docs/') ? '../' : '';
    return NAV.map((href) => (href === 'docs/' ? (prefix ? './' : 'docs/') : prefix + href));
  };

  for (const [path, expectedTitle] of SITE_PAGES) {
    const url = BASE + path;
    const loaded = await httpStatus(url);
    assert(loaded.status === 200, `${path} responds 200 (got ${loaded.status})`);
    await navigate(ws, url);
    assert(consoleErrors.length === 0, `${path} loads without console errors`);
    for (const error of consoleErrors) console.error('  console:', error);

    const page = await evalJs(ws, `(() => {
      const nav = [...document.querySelectorAll('.site-nav a, .site-menu nav a')].map((a) => a.getAttribute('href'));
      const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
      const h1 = document.querySelectorAll('h1');
      return {
        title: document.title,
        h1: h1.length,
        h1Text: h1[0] ? h1[0].textContent.trim() : '',
        nav,
        active: document.querySelectorAll('[aria-current="page"]').length,
        rawMarkdown: links.filter((href) => href && !/^https?:/i.test(href) && href.split('#')[0].endsWith('.md')),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        footer: !!document.querySelector('footer'),
        doc: document.querySelectorAll('article.doc').length,
        scripts: document.scripts.length,
        bodyClass: document.body.className,
      };
    })()`);

    assert(page.title === expectedTitle, `${path} title is "${expectedTitle}" (got "${page.title}")`);
    assert(page.h1 === 1 && page.h1Text.length > 0, `${path} carries exactly one non-empty h1`);
    for (const href of expectedNav(path)) {
      assert(page.nav.includes(href), `${path} navigation links ${href}`);
    }
    assert(page.active === 1, `${path} marks exactly one current nav item (got ${page.active})`);
    assert(page.rawMarkdown.length === 0, `${path} links rendered docs, not markdown (${page.rawMarkdown.join(', ')})`);
    assert(page.overflow <= 1, `${path} has no horizontal overflow at 1280x900 (${page.overflow}px)`);
    assert(page.footer, `${path} carries a footer`);
    if (path !== 'index.html') assert(page.bodyClass.includes('site'), `${path} uses the site shell`);
    if (path.startsWith('docs/')) {
      assert(page.doc === 1, `${path} is a rendered document page`);
      assert(page.scripts === 0, `${path} renders without scripts`);
      assert(page.bodyClass.includes('site'), `${path} uses the site shell`);
    }
    for (const link of await collectLinks(ws)) enqueue(url, link);
  }

  // The game-first page is the whole point: boot, start, pause, resume.
  const gameUrl = BASE + 'index.html';
  await navigate(ws, gameUrl);
  await waitFor(ws, `document.getElementById('boot-status') && document.getElementById('boot-status').textContent === 'Ready.'`, 25000, 'engine boot');
  assert(consoleErrors.length === 0, 'the game boots with zero console errors');

  const boot = await evalJs(ws, `(() => {
    const canvas = document.getElementById('game-canvas');
    const title = document.getElementById('panel-title');
    const menu = document.querySelector('.site-menu');
    return {
      ready: document.getElementById('boot-status').textContent,
      title: !!title && !title.hidden,
      canvas: !!canvas && canvas.width > 0 && canvas.height > 0,
      menu: !!menu,
      clutter: /release-status|SHA256SUMS|Linux packages/.test(document.body.innerText),
      wasm: performance.getEntriesByType('resource').some((entry) => entry.name.includes('maze-chase.wasm')),
    };
  })()`);
  assert(boot.ready === 'Ready.', 'boot status reaches Ready');
  assert(boot.title, 'the title panel is visible on first load');
  assert(boot.canvas, 'the canvas has a backing store');
  assert(boot.menu, 'the compact site menu is present');
  assert(!boot.clutter, 'the game page carries no distribution clutter');
  assert(boot.wasm, 'the wasm engine was requested');

  const startPoint = await evalJs(ws, `(() => {
    const button = document.getElementById('btn-start');
    const rect = button.getBoundingClientRect();
    return [rect.x + rect.width / 2, rect.y + rect.height / 2];
  })()`);
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: startPoint[0], y: startPoint[1], button: 'left', clickCount: 1 });
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: startPoint[0], y: startPoint[1], button: 'left', clickCount: 1 });
  await sleep(900);
  const playing = await evalJs(ws, `(() => ({
    title: document.getElementById('panel-title').hidden,
    score: document.getElementById('hud-score').textContent,
    pickups: document.getElementById('hud-dots').textContent,
  }))()`);
  assert(playing.title, 'Start dismisses the title panel');
  assert(Number(playing.score) >= 0 && playing.pickups.length > 0, 'the HUD is live during play');

  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
  await sleep(500);
  const paused = await evalJs(ws, `(() => ({
    title: document.getElementById('panel-title').hidden,
    pause: !document.getElementById('panel-pause').hidden,
  }))()`);
  assert(paused.title && paused.pause, 'P opens the pause panel');
  const resume = await evalJs(ws, `(() => {
    const button = [...document.querySelectorAll('#panel-pause button')].find((b) => /resume/i.test(b.textContent));
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return [rect.x + rect.width / 2, rect.y + rect.height / 2];
  })()`);
  if (resume) {
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: resume[0], y: resume[1], button: 'left', clickCount: 1 });
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: resume[0], y: resume[1], button: 'left', clickCount: 1 });
    await sleep(500);
    const resumed = await evalJs(ws, `document.getElementById('panel-pause').hidden && document.getElementById('panel-title').hidden`);
    assert(resumed, 'Resume returns to play');
  } else {
    assert(false, 'the pause panel carries a Resume button');
  }
  assert(consoleErrors.length === 0, 'start, pause, and resume raise no console errors');

  const shotDir = os.tmpdir();
  const desktopShot = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${shotDir}/maze-chase-site-desktop.png`, Buffer.from(desktopShot.data, 'base64'));
  console.log(`screenshots: ${shotDir}/maze-chase-site-desktop.png`);

  // Mobile: the game stays usable at 390x844, and every page avoids overflow.
  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
  });
  for (const [path] of SITE_PAGES) {
    const url = BASE + path;
    await navigate(ws, url);
    // Chrome preserves a page-scale factor from the desktop run across the
    // mobile navigation. Reset it after every navigation so the assertions
    // measure a true 390x844 layout instead of a scaled one (macOS Chrome 155).
    await send(ws, 'Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    for (let settle = 0; settle < 20; settle++) {
      const size = await evalJs(ws, '[window.innerWidth, window.innerHeight]');
      if (size[0] === 390 && size[1] === 844) break;
      await sleep(100);
    }
    if (path === 'index.html') {
      await waitFor(ws, `document.getElementById('boot-status').textContent === 'Ready.'`, 25000, 'mobile engine boot');
    }
    const mobile = await evalJs(ws, `(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      titleBottom: (() => {
        const card = document.getElementById('panel-title');
        if (!card) return 0;
        return card.getBoundingClientRect().bottom;
      })(),
      canvasWidth: (() => {
        const canvas = document.getElementById('game-canvas');
        return canvas ? canvas.getBoundingClientRect().width : 0;
      })(),
      navVisible: (() => {
        const nav = document.querySelector('.site-menu, .site-nav');
        if (!nav) return false;
        const rect = nav.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })(),
    }))()`);
    assert(mobile.overflow <= 1, `${path} has no horizontal overflow at 390x844 (${mobile.overflow}px)`);
    assert(mobile.navVisible, `${path} keeps the site navigation visible at 390x844`);
    if (path === 'index.html') {
      assert(mobile.canvasWidth >= 280, `the mobile board keeps the 280px minimum (${mobile.canvasWidth.toFixed(1)}px)`);
      assert(mobile.viewportWidth === 390 && mobile.viewportHeight === 844,
        `the mobile layout viewport is 390x844 (${mobile.viewportWidth}x${mobile.viewportHeight})`);
      assert(mobile.titleBottom <= mobile.viewportHeight + 1,
        `the mobile title card fits the first viewport (bottom ${mobile.titleBottom.toFixed(1)} of ${mobile.viewportHeight}px)`);
    }
  }

  // Crawl every internal link once, over HTTP, and verify fragments.
  while (linkQueue.length > 0) {
    const url = linkQueue.shift();
    const response = await fetch(url.href, { redirect: 'follow' });
    assert(response.ok, `link ${url.pathname} responds ${response.status}`);
    if (!response.ok) continue;
    if (url.hash && /\.(html|htm)?$/.test(url.pathname)) {
      const body = await response.text();
      const id = url.hash.slice(1);
      assert(body.includes(`id="${id}"`), `link ${url.pathname}${url.hash} names a real id`);
    }
  }
  for (const asset of ['site.css', 'web/maze-chase.js', 'web/maze-chase.wasm', 'web/favicon.svg']) {
    const response = await fetch(BASE + asset);
    assert(response.ok, `asset ${asset} responds ${response.status}`);
  }

  const mobileShot = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${shotDir}/maze-chase-site-mobile.png`, Buffer.from(mobileShot.data, 'base64'));
  console.log(`screenshots: ${shotDir}/maze-chase-site-mobile.png`);

  if (failures > 0) {
    console.error(`SITE-E2E FAIL: ${failures} failed, ${assertions} assertions, base ${BASE}`);
    process.exit(1);
  }
  console.log(`SITE-E2E ALL GREEN: ${assertions} assertions against ${BASE}`);
  ws.close();
  process.exit(0);
})().catch((error) => {
  console.error('SITE-E2E FAIL:', error && error.stack ? error.stack : error);
  process.exit(1);
});
