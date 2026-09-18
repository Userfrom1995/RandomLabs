// M5 end-to-end benchmark: measures the H1-H5 cells plus the ecosystem
// round-trips in real headless Chromium (SwiftShader WebGL) over CDP and
// resolves every cell to a deterministic state. Writes
// doom/docs/bench-m5.json. Per-cell attempt cap is 3 (charter halting
// rule); a cell that fails 3 times resolves to SATURATION_COLLAPSE with
// the captured evidence, never to a bare pending row.
// No em dash in this file by repo rule.
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import {
  startServer, launchChromium, openPage, collectPageErrors, waitFor, sleep,
} from './cdp-m5.mjs';
import { buildDemoWad } from './make-demo-wad.mjs';
import {
  FRAME_BUDGET_MS, summarizeTTFF, evaluateFrameTrace, compareRenderPaths,
  ingestVerdict, corruptVerdict, onboardingVerdict, audioUnlockVerdict,
  savePersistVerdict,
} from '../src/perf/m5gates.js';
import { mean } from '../src/perf/stats.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs');
mkdirSync(docs, { recursive: true });

const TEXT = (id) =>
  `((document.getElementById('${id}') || {}).textContent || '').trim().replace(/\\s+/g, ' ')`;

async function bootRun(cdp, origin, { tier = null } = {}) {
  if (tier !== null) await cdp.evaluate(`localStorage.setItem('doom-tier', '${tier}')`);
  const t0 = Date.now();
  await cdp.send('Page.navigate', { url: `${origin}/doom/` });
  await waitFor(
    cdp,
    "document.getElementById('status-line') && document.getElementById('status-line').textContent.includes('running')",
    { timeoutMs: 25000 },
  );
  return Date.now() - t0;
}

function frameTraceExpr(frames) {
  return `new Promise((res) => {
    const ds = []; let last = 0; let n = 0;
    const tick = (t) => {
      if (n > 0) ds.push(t - last);
      last = t; n++;
      if (n < ${frames}) requestAnimationFrame(tick); else res(ds);
    };
    requestAnimationFrame(tick);
  })`;
}

async function traceFrames(cdp, frames) {
  return cdp.evaluate(frameTraceExpr(frames), { awaitPromise: true });
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Run fn up to 3 times; on repeated failure resolve SATURATION_COLLAPSE
// with the last error as machine evidence.
async function attempt3(label, fn) {
  let lastError = null;
  for (let a = 1; a <= 3; a++) {
    try {
      return await fn(a);
    } catch (e) {
      lastError = e;
      console.log(`  ${label} attempt ${a} failed: ${e.message.slice(0, 160)}`);
    }
  }
  return {
    state: 'SATURATION_COLLAPSE',
    label,
    evidence: String((lastError && lastError.message) || 'unknown').slice(0, 300),
  };
}

const chromeVersion = (() => {
  try {
    return execSync('google-chrome --version', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
})();

const srv = await startServer();
console.log('serving', srv.origin, 'chrome:', chromeVersion);

async function freshSession(window = '1280,1000') {
  const profile = mkdtempSync(join(tmpdir(), 'doom-m5-bench-'));
  const ch = await launchChromium({ userDataDir: profile, window });
  const cdp = await openPage(ch.debugPort);
  await cdp.opened;
  const errors = collectPageErrors(cdp);
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  return {
    cdp, errors,
    close: () => { try { cdp.close(); } catch {} ch.close(); },
  };
}

// H1: rAF frame-time trace on the Tier 0 desktop path.
const H1 = await attempt3('H1 frame trace', async () => {
  const s = await freshSession();
  try {
    await bootRun(s.cdp, srv.origin, { tier: '0' });
    await sleep(2000);
    const runs = [];
    for (let r = 0; r < 3; r++) runs.push(await withTimeout(traceFrames(s.cdp, 120), 30000, 'frame trace'));
    const pooled = runs.flat();
    const verdict = evaluateFrameTrace(pooled);
    // Dropped vsyncs (a delta at or past two quanta) are the real headless
    // jank signal: the trace rides the vsync clock, so sub-budget cost
    // shows as zero drops rather than sub-16.6ms deltas.
    const dropped = pooled.filter((d) => d >= 2 * FRAME_BUDGET_MS).length;
    return {
      state: 'MEASURED',
      path: 'Tier 0 WebGL2 paletted, 1280x1000, SwiftShader',
      runs: runs.map((d) => ({ n: d.length, meanMs: mean(d) })),
      pooled: {
        n: verdict.n, meanMs: verdict.meanMs, medianMs: verdict.medianMs,
        p95Ms: verdict.p95Ms, p99Ms: verdict.p99Ms, cv: verdict.cv,
        maxMs: Math.max(...pooled), droppedVsyncs: dropped,
      },
      budgetMs: FRAME_BUDGET_MS,
      withinBudget: verdict.withinBudget,
      verdict: dropped === 0 ? 'no dropped vsyncs in 357 frames' : `${dropped} dropped vsyncs`,
      disclosure: 'SwiftShader software raster: the rAF trace rides the vsync clock (mean 16.666ms), so the jank signal is dropped vsyncs, not sub-quanta deltas. Raster-core cost stays H1a (880x under budget).',
    };
  } finally {
    s.close();
  }
});
console.log('H1:', JSON.stringify(H1.pooled || H1.state));

// H2browser: paired Tier 0 vs Tier 1 mean-frame comparison, interleaved.
const H2B = await attempt3('H2 tier pair', async () => {
  const s = await freshSession();
  try {
    const a = [];
    const b = [];
    const N = 30;
    for (let i = 0; i < N; i++) {
      // Alternate the starting tier to balance warm-up order effects.
      const order = i % 2 === 0 ? ['0', '1'] : ['1', '0'];
      const means = {};
      for (const tier of order) {
        await bootRun(s.cdp, srv.origin, { tier });
        await waitFor(
          s.cdp,
          `document.getElementById('status-line').textContent.includes('Tier ${tier === '0' ? '0' : '1'}')`,
          { timeoutMs: 25000 },
        );
        await sleep(800);
        const deltas = await withTimeout(traceFrames(s.cdp, 60), 30000, 'pair trace');
        means[tier] = mean(deltas);
      }
      a.push(means['0']);
      b.push(means['1']);
    }
    const cmp = compareRenderPaths(a, b);
    return {
      state: 'MEASURED',
      n: N,
      tier0MeanMs: mean(a),
      tier1MeanMs: mean(b),
      meanDiffMs: cmp.meanDiffMs,
      meanDiffCI95: cmp.meanDiffCI95,
      excludesZero: cmp.excludesZero,
      disclosure: 'Headless SwiftShader pair: measures the upload-path CPU gap, not mobile GPU frame time.',
    };
  } finally {
    s.close();
  }
});
console.log('H2browser:', JSON.stringify(H2B.meanDiffMs ?? H2B.state));

// H3: Wasm build attempt (no emsdk in this runner by design).
const H3 = (() => {
  let proof = '';
  try {
    proof = execSync('which emcc || echo MISSING-emcc', { encoding: 'utf8' }).trim();
  } catch (e) {
    proof = `probe failed: ${String(e.message).slice(0, 120)}`;
  }
  return {
    state: 'UNSUPPORTED_BY_DESIGN',
    claim: 'Wasm rasterizer beats pure-JS fallback by 2x median, identical scenes',
    proof: `emsdk absent in this runner (${proof}); build script doom/build/emcc_m1.sh present but unexecuted`,
    owner: 'hardware runner with emsdk; JS core is the shipped path and stays pinned by M1 twins',
  };
})();
console.log('H3:', H3.state);

// H4: TTFF cold (fresh profile per sample) plus warm (same-target reload).
const H4 = await attempt3('H4 TTFF', async () => {
  const N = 30;
  const cold = [];
  for (let i = 0; i < N; i++) {
    const s = await freshSession();
    try {
      cold.push(await bootRun(s.cdp, srv.origin));
    } finally {
      s.close();
    }
    if ((i + 1) % 10 === 0) console.log(`  cold ${i + 1}/${N}`);
  }
  const s = await freshSession();
  const warm = [];
  try {
    await bootRun(s.cdp, srv.origin);
    for (let i = 0; i < N; i++) {
      const t0 = Date.now();
      await s.cdp.send('Page.navigate', { url: `${srv.origin}/doom/` });
      await waitFor(
        s.cdp,
        "document.getElementById('status-line').textContent.includes('running')",
        { timeoutMs: 25000 },
      );
      warm.push(Date.now() - t0);
    }
  } finally {
    s.close();
  }
  const coldCell = summarizeTTFF(cold, 'broadband');
  const warmCell = summarizeTTFF(warm, 'warm');
  return {
    state: 'MEASURED',
    cold: { ...coldCell, bandLabel: 'broadband cold 0.8-2.0s' },
    warm: { ...warmCell, bandLabel: 'warm revisit 0.5-1.0s' },
    disclosure: 'localhost serve over loopback: faster than any band floor, so the ceiling gates. Real-network bands need a throttled-network runner.',
  };
});
console.log('H4:', JSON.stringify(H4.cold ? { coldMean: H4.cold.meanMs, warmMean: H4.warm.meanMs } : H4.state));

// H5: audio unlock transition on a trusted CDP click.
const H5 = await attempt3('H5 unlock', async () => {
  const latencies = [];
  let lockedBeforeAll = true;
  let runningAfterAll = true;
  const N = 5;
  for (let i = 0; i < N; i++) {
    const s = await freshSession();
    try {
      await bootRun(s.cdp, srv.origin);
      await sleep(1000);
      const pre = await s.cdp.evaluate(TEXT('audio-status'));
      if (!/locked/i.test(pre)) lockedBeforeAll = false;
      const rect = await s.cdp.evaluate(`(() => {
        const el = document.getElementById('btn-audio-enable');
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      })()`);
      const t0 = Date.now();
      await s.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
      await s.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
      await waitFor(
        s.cdp,
        "document.getElementById('audio-status').textContent.includes('running')",
        { timeoutMs: 15000 },
      );
      latencies.push(Date.now() - t0);
      const post = await s.cdp.evaluate(TEXT('audio-status'));
      if (!/running/i.test(post)) runningAfterAll = false;
    } finally {
      s.close();
    }
  }
  const verdict = audioUnlockVerdict({
    lockedBefore: lockedBeforeAll, runningAfter: runningAfterAll, preUnlockEvents: 0,
  });
  return {
    state: 'MEASURED',
    n: N,
    gestureToRunningMs: latencies,
    meanLatencyMs: mean(latencies),
    verdict,
    unitHalf: 'zero pre-unlock schedules pinned headless by the M3 suite (H5 M3 cell); this cell measures the browser transition',
  };
});
console.log('H5:', JSON.stringify(H5.meanLatencyMs ?? H5.state));

// G-ecosystem: ingest round-trip, corrupt rejection, onboarding, save persist.
const ECO = await attempt3('ecosystem E2E', async () => {
  const out = {};
  // Ingest: stage the generated demo WAD through the real file picker.
  {
    const s = await freshSession();
    try {
      await bootRun(s.cdp, srv.origin);
      await sleep(1000);
      const dir = mkdtempSync(join(tmpdir(), 'doom-m5-wad-'));
      const wadPath = join(dir, 'stage-me.wad');
      writeFileSync(wadPath, Buffer.from(buildDemoWad()));
      const doc = await s.cdp.send('DOM.getDocument', { depth: 0 });
      const node = await s.cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#wad-picker' });
      await s.cdp.send('DOM.setFileInputFiles', { files: [wadPath], nodeId: node.nodeId });
      await waitFor(
        s.cdp,
        "document.getElementById('wad-order').textContent.includes('stage-me.wad')",
        { timeoutMs: 20000 },
      );
      await sleep(1500);
      const status = await s.cdp.evaluate(TEXT('status-line'));
      const maps = await s.cdp.evaluate("[...document.getElementById('map-select').options].length");
      out.ingest = {
        verdict: ingestVerdict({ fileAccepted: true, viableCount: maps, runningAfter: /running/.test(status) }),
        status, viableMaps: maps,
      };
      // Corrupt: a garbage file must reject loudly and keep the level alive.
      const badPath = join(dir, 'bad.wad');
      writeFileSync(badPath, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      await s.cdp.send('DOM.setFileInputFiles', { files: [badPath], nodeId: node.nodeId });
      await sleep(2500);
      const errText = await s.cdp.evaluate(TEXT('wad-error'));
      const statusAfter = await s.cdp.evaluate(TEXT('status-line'));
      out.corrupt = {
        verdict: corruptVerdict({
          rejected: errText.includes('bad.wad') && /rejected|E_CONTAINER|E_MAP/.test(errText),
          runningAfter: /running/.test(statusAfter),
          errorShown: errText.length > 0,
        }),
        error: errText.slice(0, 200),
        statusAfter,
      };
    } finally {
      s.close();
    }
  }
  // Onboarding: first visit shows, dismiss hides, reload stays hidden.
  {
    const profile = mkdtempSync(join(tmpdir(), 'doom-m5-onb-'));
    const ch = await launchChromium({ userDataDir: profile });
    try {
      const cdp = await openPage(ch.debugPort);
      await cdp.opened;
      await cdp.send('Page.enable');
      await cdp.send('Runtime.enable');
      const t = `${srv.origin}/doom/`;
      await cdp.send('Page.navigate', { url: t });
      await waitFor(cdp, "document.getElementById('status-line').textContent.includes('running')", { timeoutMs: 25000 });
      await sleep(1500);
      const first = await cdp.evaluate("!document.getElementById('onboard-panel').hidden");
      await cdp.evaluate("document.getElementById('btn-onboard-dismiss').click()");
      await sleep(300);
      const afterDismiss = await cdp.evaluate("document.getElementById('onboard-panel').hidden");
      await cdp.send('Page.navigate', { url: t });
      await waitFor(cdp, "document.getElementById('status-line').textContent.includes('running')", { timeoutMs: 25000 });
      await sleep(1000);
      const afterReload = await cdp.evaluate("document.getElementById('onboard-panel').hidden");
      out.onboarding = {
        verdict: onboardingVerdict({
          visibleOnFirstVisit: first, hiddenAfterDismiss: afterDismiss, hiddenAfterReload: afterReload,
        }),
        first, afterDismiss, afterReload,
      };
      // Save: write slot 0, reload, the slot entry must survive (real OPFS).
      await cdp.evaluate("document.getElementById('btn-save').click()");
      await waitFor(cdp, "document.getElementById('save-status').textContent.includes('Saved slot 0')", { timeoutMs: 15000 });
      const saveStatus = await cdp.evaluate(TEXT('save-status'));
      await cdp.send('Page.navigate', { url: t });
      await waitFor(cdp, "document.getElementById('status-line').textContent.includes('running')", { timeoutMs: 25000 });
      await sleep(1500);
      const slots = await cdp.evaluate(TEXT('slots-list'));
      const bytes = /Slot 0: empty/.test(slots) ? 0 : 1;
      out.save = {
        verdict: savePersistVerdict({ savedBytes: bytes, slotPresentAfterReload: !/Slot 0: empty/.test(slots) }),
        saveStatus, slots: slots.slice(0, 200),
      };
      try { cdp.close(); } catch {}
    } finally {
      ch.close();
    }
  }
  return { state: 'MEASURED', ...out };
});
console.log('ECO:', JSON.stringify({ ingest: ECO.ingest && ECO.ingest.verdict, corrupt: ECO.corrupt && ECO.corrupt.verdict, onboarding: ECO.onboarding && ECO.onboarding.verdict, save: ECO.save && ECO.save.verdict }) || ECO.state);

const doc = {
  date: new Date().toISOString().slice(0, 10),
  node: process.version,
  chrome: chromeVersion,
  env: 'headless=new, SwiftShader WebGL, loopback serve, Node 22 CDP driver (no external deps)',
  frameBudgetMs: FRAME_BUDGET_MS,
  cells: { H1, H2browser: H2B, H3, H4, H5, ecosystem: ECO },
};
writeFileSync(join(docs, 'bench-m5.json'), JSON.stringify(doc, null, 2) + '\n');
console.log('wrote docs/bench-m5.json');
srv.close();
for (const [k, c] of Object.entries(doc.cells)) {
  if (!c || !c.state) {
    console.error(`UNRESOLVED CELL ${k}`);
    process.exitCode = 1;
  }
}
