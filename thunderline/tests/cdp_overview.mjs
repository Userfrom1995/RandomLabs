// Thunderline overview pixel probe (node stdlib + global WebSocket, no deps).
//
// Usage: node cdp_overview.mjs <page-url> <cdp-port> <width> <height> <dpr> [mobile] [selftest]
//
// Drives a CDP-enabled headless Chrome through the real player: waits for the
// page to settle (the selftest verdict when the URL carries ?selftest=1),
// audits the overview canvas, plays, pauses, seeks by clicking the canvas at
// 25% and 50%, then resizes and audits again. Prints one JSON line.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [pageUrl, portArg, widthArg, heightArg, dprArg, mobileArg, selftestArg] = process.argv.slice(2);
  if (!pageUrl || !portArg || !widthArg || !heightArg || !dprArg) {
    console.error("usage: node cdp_overview.mjs <url> <port> <width> <height> <dpr> [mobile] [selftest]");
    process.exit(2);
  }
  const port = Number(portArg);
  const width = Number(widthArg);
  const height = Number(heightArg);
  const dpr = Number(dprArg);
  const mobile = mobileArg === "1";
  const expectSelftest = selftestArg !== "0";

  const list = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  const page = list.find((t) => t.type === "page");
  if (!page) { console.error("no page target"); process.exit(2); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", (e) => rej(new Error("ws: " + e.message)));
  });

  let nextId = 1;
  const pending = new Map();
  const exceptions = [];
  const consoleErrors = [];
  ws.addEventListener("message", (ev) => {
    let m;
    try { m = JSON.parse(ev.data.toString()); } catch (e) { return; }
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.error) { p.reject(new Error(JSON.stringify(m.error))); }
      else { p.resolve(m.result); }
      return;
    }
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails || {};
      exceptions.push((d.exception && d.exception.description) || d.text || "exception");
    } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      const args = (m.params.args || []).map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type));
      consoleErrors.push(args.join(" "));
    }
  });

  function rpc(method, params) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("rpc timeout " + method)); }, 30000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  async function ev(expression) {
    const r = await rpc("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) { throw new Error("evaluate: " + JSON.stringify(r.exceptionDetails)); }
    return r.result.value;
  }

  const STATE = `(() => {
    const t = document.getElementById('transport');
    const seek = document.getElementById('seek');
    return {
      ready: !!(t && !t.hidden),
      result: window.__selftestResult || '',
      detail: window.__selftestDetail || '',
      selftestText: (document.getElementById('selftest') || {}).textContent || '',
      empty: !!(document.getElementById('state-empty') && !document.getElementById('state-empty').hidden),
      error: !!(document.getElementById('state-error') && !document.getElementById('state-error').hidden),
      errorMsg: (document.getElementById('errorMsg') || {}).textContent || '',
      timeLabel: (document.getElementById('timeLabel') || {}).textContent || '',
      playText: (document.getElementById('playBtn') || {}).textContent || '',
      seekValue: seek ? parseFloat(seek.value) : null,
      seekMax: seek ? parseFloat(seek.max) : null,
      fallbackVisible: !!(document.getElementById('fallbackNotice') && !document.getElementById('fallbackNotice').hidden)
    };
  })()`;

  const METRICS = `(() => {
    const c = document.getElementById('overview');
    const g = c.getContext('2d');
    const w = c.width, h = c.height, dpr = window.devicePixelRatio || 1;
    const data = g.getImageData(0, 0, w, h).data;
    let lit = 0, wave = 0, red = 0, redMinX = Infinity, redMaxX = -1;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], gg = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a === 0) { continue; }
      lit++;
      colors.add((r << 24) | (gg << 16) | (b << 8) | a);
      if (r >= 180 && gg >= 120 && b <= 140) { wave++; }
      if (r >= 200 && gg <= 150 && b <= 150 && Math.abs(gg - b) <= 40) {
        red++;
        const x = (i / 4) % w;
        if (x < redMinX) { redMinX = x; }
        if (x > redMaxX) { redMaxX = x; }
      }
    }
    const rect = c.getBoundingClientRect();
    return {
      clientWidth: c.clientWidth,
      clientHeight: c.clientHeight,
      bitmapWidth: w,
      bitmapHeight: h,
      dpr: dpr,
      lit: lit,
      litPct: +(100 * lit / (w * h)).toFixed(2),
      wave: wave,
      wavePct: +(100 * wave / (w * h)).toFixed(2),
      red: red,
      redCssCenter: red ? +(((redMinX + redMaxX) / 2 + 0.5) / dpr).toFixed(2) : null,
      colors: colors.size,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      rectLeft: rect.left,
      rectTop: rect.top,
      rectWidth: rect.width,
      rectHeight: rect.height
    };
  })()`;

  async function metrics() {
    const m = await ev(METRICS);
    const s = await ev(STATE);
    return Object.assign({}, m, s);
  }

  async function waitReady() {
    const deadline = Date.now() + 60000;
    let last = null;
    while (Date.now() < deadline) {
      last = await ev(STATE);
      if (last.ready && (!expectSelftest || last.result)) { return last; }
      if (last.empty || last.error) { return last; }
      await sleep(250);
    }
    throw new Error("page never settled: " + JSON.stringify(last));
  }

  async function clickCanvas(frac) {
    await ev(`document.getElementById('overview').scrollIntoView({block:'center', inline:'center', behavior:'instant'})`);
    await sleep(200);
    const rect = await ev(`(() => { const r = document.getElementById('overview').getBoundingClientRect(); return {left:r.left, top:r.top, width:r.width, height:r.height}; })()`);
    const x = rect.left + rect.width * frac;
    const y = rect.top + rect.height / 2;
    await rpc("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await rpc("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    await rpc("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(300);
    return metrics();
  }

  const result = {
    config: { width: width, height: height, dpr: dpr, mobile: mobile, selftest: expectSelftest },
    exceptions: exceptions,
    consoleErrors: consoleErrors
  };

  try {
    await rpc("Runtime.enable");
    await rpc("Page.enable");
    await rpc("Emulation.setDeviceMetricsOverride", {
      width: width, height: height, deviceScaleFactor: dpr, mobile: mobile,
      screenWidth: width, screenHeight: height
    });
    await sleep(300);
    await rpc("Page.navigate", { url: pageUrl });
    result.ready = await waitReady();
    await sleep(300);
    result.initial = await metrics();

    await ev(`document.getElementById('playBtn').click()`);
    await sleep(1600);
    result.afterPlay = await metrics();
    await ev(`document.getElementById('playBtn').click()`);
    await sleep(250);
    result.afterPause = await metrics();

    result.afterSeek25 = await clickCanvas(0.25);
    result.afterSeek50 = await clickCanvas(0.5);

    const resizeWidth = width > 500 ? 390 : 1440;
    const resizeHeight = width > 500 ? 844 : 900;
    await rpc("Emulation.setDeviceMetricsOverride", {
      width: resizeWidth, height: resizeHeight, deviceScaleFactor: dpr, mobile: false,
      screenWidth: resizeWidth, screenHeight: resizeHeight
    });
    await ev(`window.dispatchEvent(new Event('resize'))`);
    await sleep(500);
    result.afterResize = await metrics();
  } catch (e) {
    result.error = String(e && e.stack || e);
  } finally {
    result.exceptions = exceptions;
    result.consoleErrors = consoleErrors;
    console.log(JSON.stringify(result));
    ws.close();
  }
  if (result.error) { process.exitCode = 1; }
}

main().catch((e) => { console.error("driver error: " + (e && e.message)); process.exit(2); });
