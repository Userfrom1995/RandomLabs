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
const path = require('path');

const BASE = (process.argv[2] || 'http://localhost:8931/').replace(/\/?$/, '/');
const DEBUG_PORT = Number(process.argv[3] || 9331);
const DOCS_DIR = path.join(__dirname, '..', '..', 'docs');
const DOC_PAGES = fs
  .readdirSync(DOCS_DIR)
  .filter((name) => name.endsWith('.html'))
  .sort()
  .map((name) => `docs/${name}`);
if (DOC_PAGES.length < 15) {
  console.error(`SITE-E2E FAIL: expected 15 rendered docs pages, found ${DOC_PAGES.length}`);
  process.exit(1);
}
const SITE_PAGES = [
  ['index.html', 'Maze Chase - Play'],
  ['install.html', 'Maze Chase - Install'],
  ['downloads.html', 'Maze Chase - Downloads'],
  ['compatibility.html', 'Maze Chase - Compatibility'],
  ['releases.html', 'Maze Chase - Releases'],
  ...DOC_PAGES.map((page) => [page, null]),
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
let onException = null;
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
      } else if (msg.method === 'Runtime.exceptionThrown' && onException) {
        onException(msg.params);
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
    // Only the exact media-policy notices Chrome emits before a user gesture
    // are benign; every other console error is a failure.
    if (/^Autoplay is only allowed when approved by the user/i.test(text)) return;
    if (/^The AudioContext was not allowed to start/i.test(text)) return;
    consoleErrors.push(text.slice(0, 240));
  };
  onLog = (entry) => {
    const record = entry.entry;
    if (!record || record.level !== 'error') return;
    // `source: other` is browser chrome (GPU/DBus/Fontconfig), not the page.
    if (record.source === 'other') return;
    const text = record.text || '';
    if (/favicon\.(?:ico|svg)/i.test(text)) return;
    consoleErrors.push(text.slice(0, 240));
  };
  onException = (params) => {
    const details = params.exceptionDetails || {};
    const exception = details.exception || {};
    const text = exception.description || exception.value || details.text || 'uncaught exception';
    consoleErrors.push(String(text).slice(0, 240));
  };

  const targets = await fetch(`http://localhost:${DEBUG_PORT}/json/list`).then((r) => r.json());
  const target = targets.find((t) => t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
  if (!target) throw new Error('no chromium page target; got: ' + JSON.stringify(targets.map((t) => t.url)));
  const ws = await connect(target.webSocketDebuggerUrl);
  await send(ws, 'Log.enable', {});
  await send(ws, 'Runtime.enable', {});
  await send(ws, 'Network.enable', {});
  // A deployed preview reuses the same asset URLs across heads; a cached
  // site.css or wasm from an earlier run would test the wrong build.
  await send(ws, 'Network.setCacheDisabled', { cacheDisabled: true });
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

  // F4: exercise the real legacy redirect, not just its source. A shared
  // play.html?seed=... link must land on the game with query and fragment.
  const redirectExpected = new URL('index.html?seed=abc&view=1#game-main', BASE);
  await navigate(ws, BASE + 'play.html?seed=abc&view=1#game-main');
  const redirected = await evalJs(ws, `({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  })`);
  assert(
    redirected.pathname === redirectExpected.pathname
      && redirected.search === redirectExpected.search
      && redirected.hash === redirectExpected.hash,
    `play.html redirects to the game preserving query and fragment (got ${redirected.pathname}${redirected.search}${redirected.hash})`,
  );
  assert(consoleErrors.length === 0, 'the legacy redirect raises no console errors');

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
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        footer: !!document.querySelector('footer'),
        doc: document.querySelectorAll('article.doc').length,
        scripts: document.scripts.length,
        bodyClass: document.body.className,
      };
    })()`);

    if (path.startsWith('docs/')) {
      assert(
        page.title.startsWith('Maze Chase docs: ') && page.title.length > 'Maze Chase docs: '.length,
        `${path} carries a docs title (got "${page.title}")`,
      );
    } else {
      assert(page.title === expectedTitle, `${path} title is "${expectedTitle}" (got "${page.title}")`);
    }
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

  // Mobile: every page is measured against a true 390x844 client viewport.
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
    for (let settle = 0; settle < 30; settle++) {
      const size = await evalJs(ws, '[document.documentElement.clientWidth, document.documentElement.clientHeight]');
      if (size[0] === 390 && size[1] === 844) break;
      await sleep(100);
    }
    if (path === 'index.html') {
      await waitFor(ws, `document.getElementById('boot-status').textContent === 'Ready.'`, 25000, 'mobile engine boot');
    }
    const mobile = await evalJs(ws, `(() => {
      const nav = [...document.querySelectorAll('.site-nav a, .site-menu nav a')].map((a) => a.getAttribute('href'));
      const h1 = document.querySelectorAll('h1');
      return {
        title: document.title,
        h1: h1.length,
        h1Text: h1[0] ? h1[0].textContent.trim() : '',
        nav,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
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
          const control = document.querySelector('.site-menu > summary, .site-nav');
          if (!control) return false;
          const rect = control.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })(),
        navPill: (() => {
          const nav = document.querySelector('.site-nav');
          const active = nav && nav.querySelector('[aria-current="page"]');
          if (!nav || !active) return null;
          const box = nav.getBoundingClientRect();
          const pill = active.getBoundingClientRect();
          return {
            scrollLeft: nav.scrollLeft,
            overflows: nav.scrollWidth > nav.clientWidth + 1,
            left: pill.left,
            right: pill.right,
            boxLeft: box.left,
            boxRight: box.right,
          };
        })(),
      };
    })()`);
    assert(mobile.viewportWidth === 390 && mobile.viewportHeight === 844,
      `${path} measures a true 390x844 layout (${mobile.viewportWidth}x${mobile.viewportHeight})`);
    assert(mobile.overflow <= 1, `${path} has no horizontal overflow at 390x844 (${mobile.overflow}px)`);
    assert(mobile.h1 === 1 && mobile.h1Text.length > 0, `${path} mobile carries exactly one non-empty h1`);
    for (const href of expectedNav(path)) {
      assert(mobile.nav.includes(href), `${path} mobile navigation links ${href}`);
    }
    assert(mobile.navVisible, `${path} keeps the site navigation control visible at 390x844`);
    if (['install.html', 'downloads.html', 'compatibility.html', 'releases.html'].includes(path)) {
      assert(mobile.navPill, `${path} uses the horizontal site nav at 390x844`);
      assert(
        mobile.navPill
          && mobile.navPill.left >= mobile.navPill.boxLeft - 1
          && mobile.navPill.right <= mobile.navPill.boxRight + 1,
        `${path} scrolls the current nav pill fully into view (${mobile.navPill
          ? `${mobile.navPill.left.toFixed(1)}..${mobile.navPill.right.toFixed(1)} in ${mobile.navPill.boxLeft.toFixed(1)}..${mobile.navPill.boxRight.toFixed(1)}, scrollLeft ${mobile.navPill.scrollLeft.toFixed(1)}`
          : 'missing'})`,
      );
      if (path === 'releases.html') {
        // Whether the pill needs a scroll depends on the platform's
        // fallback font metrics. Assert the honest state either way: an
        // overflowing nav must be scrolled, a fitting one must not be.
        if (mobile.navPill && mobile.navPill.overflows) {
          assert(
            mobile.navPill.scrollLeft > 0,
            `releases.html actually scrolls its overflowing current pill into view at 390x844 (scrollLeft ${mobile.navPill.scrollLeft.toFixed(1)})`,
          );
        } else {
          assert(
            mobile.navPill && mobile.navPill.scrollLeft === 0,
            `releases.html leaves a fitting nav unscrolled at 390x844 (scrollLeft ${mobile.navPill ? mobile.navPill.scrollLeft.toFixed(1) : 'missing'})`,
          );
        }
      }
    }
    assert(consoleErrors.length === 0, `${path} mobile load has no console errors`);
    for (const error of consoleErrors) console.error('  console:', error);
    if (path === 'index.html') {
      const opened = await evalJs(ws, `(() => {
        const menu = document.querySelector('.site-menu');
        if (menu) menu.open = true;
        const nav = document.querySelector('.site-menu > nav');
        if (!nav) return null;
        const rect = nav.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      })()`);
      assert(
        opened && opened.left >= 0 && opened.right <= 390 && opened.width > 0,
        `the opened Site menu stays inside the 390px viewport (${opened ? `${opened.left}..${opened.right}` : 'missing'})`,
      );
      assert(mobile.canvasWidth >= 280, `the mobile board keeps the 280px minimum (${mobile.canvasWidth.toFixed(1)}px)`);
      assert(mobile.titleBottom <= mobile.viewportHeight + 1,
        `the mobile title card fits the first viewport (bottom ${mobile.titleBottom.toFixed(1)} of ${mobile.viewportHeight}px)`);
    }
  }

  // The nav reveal also runs on layout changes: a desktop load resized to
  // mobile must re-reveal the current pill. releases.html is the subpage
  // used here; 320px is narrow enough that the nav overflows on every
  // platform's font metrics (390px depends on the fallback font).
  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await navigate(ws, BASE + 'releases.html');
  await send(ws, 'Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  const desktopNav = await evalJs(ws, `(() => {
    const nav = document.querySelector('.site-nav');
    const active = nav && nav.querySelector('[aria-current="page"]');
    if (!nav || !active) return null;
    const box = nav.getBoundingClientRect();
    const pill = active.getBoundingClientRect();
    return { scrollLeft: nav.scrollLeft, left: pill.left, right: pill.right, boxLeft: box.left, boxRight: box.right };
  })()`);
  assert(
    desktopNav && desktopNav.scrollLeft === 0,
    `releases.html starts without a nav scroll at 1280 (${desktopNav ? desktopNav.scrollLeft.toFixed(1) : 'missing'})`,
  );
  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 320, height: 568, deviceScaleFactor: 2, mobile: true,
  });
  let resizedNav = null;
  for (let settle = 0; settle < 30; settle++) {
    await sleep(100);
    resizedNav = await evalJs(ws, `(() => {
      const nav = document.querySelector('.site-nav');
      const active = nav && nav.querySelector('[aria-current="page"]');
      if (!nav || !active) return null;
      const box = nav.getBoundingClientRect();
      const pill = active.getBoundingClientRect();
      return {
        scrollLeft: nav.scrollLeft,
        overflows: nav.scrollWidth > nav.clientWidth + 1,
        left: pill.left,
        right: pill.right,
        boxLeft: box.left,
        boxRight: box.right,
        viewport: [document.documentElement.clientWidth, document.documentElement.clientHeight],
      };
    })()`);
    if (resizedNav && resizedNav.viewport[0] === 320 && resizedNav.scrollLeft > 0) break;
  }
  assert(
    resizedNav
      && resizedNav.viewport[0] === 320
      && resizedNav.overflows
      && resizedNav.scrollLeft > 0
      && resizedNav.left >= resizedNav.boxLeft - 1
      && resizedNav.right <= resizedNav.boxRight + 1,
    `releases.html re-reveals the current nav pill after a resize to 320x568 (${resizedNav
      ? `viewport ${resizedNav.viewport[0]}x${resizedNav.viewport[1]}, ${resizedNav.left.toFixed(1)}..${resizedNav.right.toFixed(1)} in ${resizedNav.boxLeft.toFixed(1)}..${resizedNav.boxRight.toFixed(1)}, overflows ${resizedNav.overflows}, scrollLeft ${resizedNav.scrollLeft.toFixed(1)}`
      : 'missing'})`,
  );

  // Crawl every internal link once, over HTTP, and verify fragments.
  while (linkQueue.length > 0) {
    const url = linkQueue.shift();
    const response = await fetch(url.href, { redirect: 'follow' });
    assert(response.ok, `link ${url.pathname} responds ${response.status}`);
    if (!response.ok) continue;
    if (url.hash && /\.(html|htm)?$/.test(url.pathname)) {
      const body = await response.text();
      const wanted = `id="${url.hash.slice(1)}"`;
      let at = body.indexOf(wanted);
      let found = false;
      while (at !== -1) {
        const previous = at === 0 ? '' : body[at - 1];
        if (at === 0 || previous === '<' || /\s/.test(previous)) { found = true; break; }
        at = body.indexOf(wanted, at + 1);
      }
      assert(found, `link ${url.pathname}${url.hash} names a real id`);
    }
  }
  for (const asset of ['site.css', 'web/maze-chase.js', 'web/maze-chase.wasm', 'web/favicon.svg']) {
    const response = await fetch(BASE + asset);
    assert(response.ok, `asset ${asset} responds ${response.status}`);
  }

  await navigate(ws, gameUrl);
  await send(ws, 'Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await waitFor(ws, `document.getElementById('boot-status').textContent === 'Ready.'`, 25000, 'mobile screenshot boot');
  await sleep(300);
  const mobileShot = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${shotDir}/maze-chase-site-mobile.png`, Buffer.from(mobileShot.data, 'base64'));
  console.log(`screenshots: ${shotDir}/maze-chase-site-mobile.png`);

  // Short landscape phones (the game itself supports 480x320): the Site menu
  // is the game page's only route to the subpages, so every link must stay
  // reachable inside the viewport. A compact menu passes as-is; a tall menu
  // must scroll inside the viewport instead of extending below it.
  for (const [width, height] of [[480, 320], [568, 320]]) {
    await send(ws, 'Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 2, mobile: true,
    });
    await navigate(ws, gameUrl);
    await send(ws, 'Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await waitFor(ws, `document.getElementById('boot-status').textContent === 'Ready.'`, 25000, `${width}x${height} game boot`);
    const shortMenu = await evalJs(ws, `(() => {
      const details = document.querySelector('.site-menu');
      if (!details) return null;
      details.open = true;
      const nav = details.querySelector('nav');
      if (!nav) return null;
      const scrollable = /^(auto|scroll)$/.test(getComputedStyle(nav).overflowY);
      if (scrollable) nav.scrollTop = nav.scrollHeight;
      const navRect = nav.getBoundingClientRect();
      const links = [...nav.querySelectorAll('a')];
      const last = links[links.length - 1].getBoundingClientRect();
      return {
        count: links.length,
        viewport: [document.documentElement.clientWidth, document.documentElement.clientHeight],
        navLeft: navRect.left,
        navRight: navRect.right,
        navTop: navRect.top,
        navBottom: navRect.bottom,
        lastTop: last.top,
        lastBottom: last.bottom,
        scrollable,
      };
    })()`);
    assert(
      shortMenu && shortMenu.count === 6 && shortMenu.viewport[0] === width && shortMenu.viewport[1] === height,
      `${width}x${height} game page exposes all six Site links in a true ${width}x${height} viewport (${shortMenu ? shortMenu.viewport.join('x') : 'missing'}, ${shortMenu ? shortMenu.count : 0} links)`,
    );
    assert(
      shortMenu && shortMenu.navLeft >= 0 && shortMenu.navRight <= width,
      `${width}x${height} opened Site menu stays inside the viewport horizontally (${shortMenu ? `${shortMenu.navLeft.toFixed(1)}..${shortMenu.navRight.toFixed(1)}` : 'missing'})`,
    );
    assert(
      shortMenu && shortMenu.navTop >= 0 && shortMenu.navBottom <= height,
      `${width}x${height} opened Site menu stays inside the viewport vertically (${shortMenu ? `${shortMenu.navTop.toFixed(1)}..${shortMenu.navBottom.toFixed(1)} of ${height}` : 'missing'})`,
    );
    assert(
      shortMenu && shortMenu.lastTop >= 0 && shortMenu.lastBottom <= height,
      `${width}x${height} last Site link is reachable without leaving the viewport (${shortMenu ? `${shortMenu.lastTop.toFixed(1)}..${shortMenu.lastBottom.toFixed(1)} of ${height}` : 'missing'})`,
    );
  }

  // The uncapped menu must never trap page scrolling. At 390x600 the nav is
  // shorter than its cap and the document scrolls, so a wheel gesture over
  // the open menu has to move the page itself.
  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 390, height: 600, deviceScaleFactor: 2, mobile: true,
  });
  await navigate(ws, gameUrl);
  await send(ws, 'Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await waitFor(ws, `document.getElementById('boot-status').textContent === 'Ready.'`, 25000, '390x600 game boot');
  const scrollProbe = await evalJs(ws, `(() => {
    const details = document.querySelector('.site-menu');
    if (!details) return null;
    details.open = true;
    const nav = details.querySelector('nav');
    if (!nav) return null;
    const rect = nav.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      navHeight: nav.clientHeight,
      navContentHeight: nav.scrollHeight,
      pageHeight: document.documentElement.scrollHeight,
      pageClientHeight: document.documentElement.clientHeight,
      scrollY: window.scrollY,
    };
  })()`);
  assert(
    scrollProbe && scrollProbe.pageHeight > scrollProbe.pageClientHeight,
    `the 390x600 page scrolls for the menu wheel probe (${scrollProbe ? `${scrollProbe.pageHeight} > ${scrollProbe.pageClientHeight}` : 'missing'})`,
  );
  assert(
    scrollProbe && scrollProbe.navContentHeight <= scrollProbe.navHeight,
    `the 390x600 menu is uncapped so the wheel lands on the page (${scrollProbe ? `${scrollProbe.navContentHeight}/${scrollProbe.navHeight}` : 'missing'})`,
  );
  await send(ws, 'Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: scrollProbe.x, y: scrollProbe.y, deltaX: 0, deltaY: 240,
  });
  await sleep(300);
  const wheelScrollY = await evalJs(ws, 'window.scrollY');
  assert(
    wheelScrollY > scrollProbe.scrollY,
    `a wheel over the uncapped open Site menu still scrolls the page (scrollY ${wheelScrollY})`,
  );

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
