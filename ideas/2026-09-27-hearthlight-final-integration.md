# Hearthlight final integration: chart-insert close-ups and end-to-end audit

Final Phase of the Hearthlight Reimagined rebuild (#463). The five phase
cuts were merged; this pass closes the last craft gap the Builder's own
watch-through found, then proves the whole film green in one battery.

## The finding

A per-act sampling probe (mid-act frames plus both emotional peaks, at
960 px and 390 px) showed shots s03 and s07 rendering ~500 ops against
1600-3000 elsewhere, with byte-identical profiles between a
one-character and a two-character shot. Root cause, in
`film/engine/animatic.js`: every chart-table background skipped the cast
entirely and drew Nia's hand as a 7 px skin disc sliding on a sine path.
Worse, s07's scripted beat (Yara's finger traces the cliff path) had no
finger on screen at all. Both shots are dialogue-free, so the hands are
the whole performance: placeholder craft at the exact point the owner's
verdict forbids placeholders.

## What was built

- New `film/engine/inserts.js`: chart-insert close-up craft. A pure spec
  (`chartInsertFor`), beat queries (`attemptAt`: two striker windows;
  `traceAt`: reveal 0.28-0.78), shared chart geography (`chartMarks`:
  gorge cleft, crossed-out bridge, dashed cliff path, station circle
  with two children, two charcoal marks), exact finger geometry
  (`handGeometry`), pure blocking (`insertActors`), and the painter
  (`drawChartInsert`).
- s03: Nia's fingered hand (blackened fingertips, rust cloak cuff,
  ribbon thread at the wrist) works a spark-striker beside a dead
  lantern in two failing attempts with seeded dying sparks, then stops:
  the striker never works, which is why s04 runs to Yara.
- s07: Yara's older hand (blue shawl cuff, thinner fingers) enters from
  frame right on a smoothstep and her index rides the cliff path from
  bridge to station while Nia's charcoal follows; the path overdraws
  solid under the finger. Fingertip error against the trace point:
  5.7e-14 px (geometry shared, not duplicated).
- `film/engine/backgrounds.js`: the chart paint now carries the same
  geography from the shared spec, with one boil offset over the whole
  sheet so every mark shimmers as a single hand-inked page.
- `film/engine/animatic.js`: the disc is gone; chart-table routes
  through `drawChartInsert`.

## Verification

- `film/tests/craft-world.mjs` gains 15 insert gates (spec, windows,
  monotone trace, bounded geography, fingered hands, off-frame entry,
  exact fingertip, beat-only sparks, rich/finite/deterministic frames at
  both widths with 390 px keeping composition). One threshold caught a
  real number during development (196 vs 200 paths at 390 px) and was
  re-expressed as the honest-scale idiom the suite already uses.
- `film/tools/audit.mjs` gains a Final insert gate block.
- Full battery: repro green (142 PASS lines) plus all 25 suites green,
  including every Tester hostile pin untouched. Stills manifest and all
  three capture loops rebuild byte-identical run to run.
- Self-review probe re-run: s03 734 ops, s07 820 ops at 960 px, zero
  NaN, no throws, captions on the peaks (Ruel's rope line, Lumi's
  choice line) landing inside acted frames.

## Key files

- `film/engine/inserts.js` (new), `film/engine/animatic.js`,
  `film/engine/backgrounds.js`, `film/tests/craft-world.mjs`,
  `film/tools/audit.mjs`, `film/docs/craft.md`, `film/README.md`.

No new surfaces, no new binaries, no milestone leakage in public docs:
one unified product view, deeper craft.
