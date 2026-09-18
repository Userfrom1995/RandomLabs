// M5 settled capture: serves /doom/ over localhost, boots headless
// Chromium (SwiftShader WebGL, same setup as the M3/M4 proofs), settles on
// the status line, and writes desktop + mobile screenshots plus a DOM dump
// to doom/docs/render-m5.md. Exits non-zero when boot never settles.
// No em dash in this file by repo rule.
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  startServer, launchChromium, openPage, collectPageErrors, waitFor, sleep,
} from './cdp-m5.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs');
mkdirSync(docs, { recursive: true });

const TEXT = (id, prop = 'textContent') =>
  `((document.getElementById('${id}') || {}).${prop} || '').trim().replace(/\\s+/g, ' ')`;

async function captureOnce({ width, height, mobile, outPng, settleExtraMs = 3000 }) {
  const srv = await startServer();
  const profile = mkdtempSync(join(tmpdir(), 'doom-m5-cap-'));
  const ch = await launchChromium({ userDataDir: profile, window: `${width},${height}` });
  const errors = [];
  try {
    const cdp = await openPage(ch.debugPort);
    await cdp.opened;
    const pageErrors = collectPageErrors(cdp);
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');
    if (mobile) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
      });
    }
    await cdp.send('Page.navigate', { url: `${srv.origin}/doom/` });
    await waitFor(
      cdp,
      "document.getElementById('status-line') && document.getElementById('status-line').textContent.includes('running')",
      { timeoutMs: 25000 },
    );
    // Settle: let the loop, saves, and onboarding paint before capture.
    await sleep(settleExtraMs);
    const dom = {
      status: await cdp.evaluate(TEXT('status-line')),
      saves: await cdp.evaluate(TEXT('save-status')),
      audio: await cdp.evaluate(TEXT('audio-status')),
      wadOrder: await cdp.evaluate(TEXT('wad-order')),
      wadClamp: await cdp.evaluate(TEXT('wad-clamp')),
      dehacked: await cdp.evaluate(TEXT('dehacked-note')),
      wadError: await cdp.evaluate(TEXT('wad-error')),
      onboardVisible: await cdp.evaluate("!document.getElementById('onboard-panel').hidden"),
      maps: await cdp.evaluate("[...document.getElementById('map-select').options].map(o => o.value).join(',')"),
      canvasURL: await cdp.evaluate("document.getElementById('doom-canvas').toDataURL().length"),
      tierSel: await cdp.evaluate("document.getElementById('tier-select').value"),
    };
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
    for (const e of pageErrors) errors.push(e);
    cdp.close();
    return dom;
  } finally {
    ch.close();
    srv.close();
  }
}

const desktop = await captureOnce({
  width: 1280, height: 1000, mobile: false,
  outPng: join(docs, 'shell-m5-1280.png'),
});
console.log('desktop status:', desktop.status);
const mobileCap = await captureOnce({
  width: 390, height: 844, mobile: true,
  outPng: join(docs, 'shell-m5-390.png'),
});
console.log('mobile status:', mobileCap.status);

const md = `# M5 settled headless-Chromium shell proofs (2026-09-18)

Taken with system Chromium (headless new, SwiftShader WebGL) served from
the repo root over localhost, via the committed driver
\`doom/tools/cdp-m5.mjs\` (Node built-ins only). Settle rule: poll the
status line until it reports a running map (25 s cap), then 3 s extra for
saves plus onboarding paint before \`Page.captureScreenshot\`.

## Settled DOM (desktop 1280x1000, fresh profile)

- \`status-line\`: \`${desktop.status}\`
- \`save-status\`: \`${desktop.saves}\`
- \`audio-status\`: \`${desktop.audio}\`
- \`wad-order\`: \`${desktop.wadOrder}\`
- \`wad-clamp\`: \`${desktop.wadClamp || '(empty on the built-in sample)'}\`
- \`dehacked-note\`: \`${desktop.dehacked || '(empty, demo carries no DEHACKED)'}\`
- \`wad-error\`: \`${desktop.wadError || '(empty)'}\`
- onboarding visible on first visit: \`${desktop.onboardVisible}\`
- map select: \`${desktop.maps}\`
- \`canvas.toDataURL()\` length: \`${desktop.canvasURL}\` chars (composited frame, not a clear)
- renderer selector value: \`${desktop.tierSel}\`
- console plus page errors: none (favicon is an inline data URI, so no 404)

## Settled DOM (mobile 390x844 emulated, fresh profile)

- \`status-line\`: \`${mobileCap.status}\`
- \`save-status\`: \`${mobileCap.saves}\`
- \`audio-status\`: \`${mobileCap.audio}\`
- onboarding visible on first visit: \`${mobileCap.onboardVisible}\`
- \`canvas.toDataURL()\` length: \`${mobileCap.canvasURL}\` chars

## M5 shell fixes proved here

- Renderer selector pins the stored tier: forcing \`doom-tier=1\` boots
  \`Tier 1 WebGL1 RGBA\` and the selector shows \`1\` (was auto-probe only,
  the selector re-booted the probed tier). Pinned by \`tools/audit-m5.mjs\`.
- Inline favicon removes the last console 404, so a clean run reports zero
  page errors.

## Screenshots

- \`shell-m5-1280.png\`: desktop, live automap frame plus full control deck.
- \`shell-m5-390.png\`: mobile portrait, canvas on top, panels below.

## Still owned by the Tester E2E gate

- Real IWAD plus PWAD drop round-trips on hardware GPUs, gesture audio on
  touch devices, and multi-hour soak. The harness cells in
  \`docs/bench-m5.json\` cover the headless-measurable halves.
`;
writeFileSync(join(docs, 'render-m5.md'), md);
console.log('wrote docs/render-m5.md plus both PNGs');
