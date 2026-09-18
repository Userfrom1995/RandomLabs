# Doom M1 layout audit (static, no browser in runner)

- **Generated:** 2026-09-18T01:01:07.087Z
- **Sources:** doom/index.html, doom/theme.css
- **Result:** ALL PASS (15 checks)

## Checks

| Check | Result | Detail |
|---|---|---|
| viewport-meta | PASS | width=device-width present |
| canvas-intrinsic-320x200 | PASS | 320x200 |
| no-wide-fixed-widths | PASS | fixed/min widths seen: [128, 52, 44] (max-width caps excluded) |
| main-capped-fluid | PASS | main max-width 860px, margin auto |
| canvas-fluid | PASS | canvas width:100% + aspect-ratio 8/5 |
| border-box | PASS | global border-box |
| row-wraps | PASS | controls row wraps at 390px |
| no-canvas-overlay | PASS | #stage has no absolute overlay |
| controls-below-canvas | PASS | buttons come after canvas in flow |
| dropzone-keyboard | PASS | tabindex + role=button |
| status-aria-live | PASS | aria-live polite |
| focus-visible | PASS | focus-visible outline |
| contrast-aa-text | PASS | all 8 pairs >= 4.5:1 |
| layout-1280px | PASS | content 820px, canvas 820x513, overflow none |
| layout-390px | PASS | content 350px, canvas 350x219, overflow none |

## Contrast (WCAG AA text >= 4.5:1)

| Pair | Colors | Ratio | Verdict |
|---|---|---|---|
| body text | #e6edf3 on #0d1117 | 16.02:1 | PASS (>= 4.5) |
| muted on bg | #9aa7b4 on #0d1117 | 7.71:1 | PASS (>= 4.5) |
| muted on panel | #9aa7b4 on #161b22 | 7.05:1 | PASS (>= 4.5) |
| link | #58a6ff on #0d1117 | 7.49:1 | PASS (>= 4.5) |
| error/fatal | #f85149 on #0d1117 | 5.65:1 | PASS (>= 4.5) |
| warning | #d29922 on #0d1117 | 7.50:1 | PASS (>= 4.5) |
| ok | #3fb950 on #0d1117 | 7.45:1 | PASS (>= 4.5) |
| text on panel | #e6edf3 on #161b22 | 14.64:1 | PASS (>= 4.5) |

## Width math

- 1280px desktop: content 820px centered, canvas 820x513, panels in flow.
- 390px portrait/landscape: content 350px, canvas 350x219, .row wraps so
  Pause/Resume/Map controls stack below the canvas and never cover its center.
- No element uses a fixed width above 350px; global border-box holds.

## Gap

Headless Playwright screenshots (desktop + 390px portrait/landscape)
remain for a browser-capable runner; this audit asserts structure, flow,
and contrast statically instead of pixels.
