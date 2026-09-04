# 2026-09-04 - Folio M2 - native AcroForms roundtrips + vector annotation layer

## What was built
Folio Milestone 2 (Refs #277) on `opencode/issue277-folio-m2`: the
annotation tab stopped burning ink/shapes straight into page content and
grew a real vector annotation layer, and the forms engine got hardened by
binary roundtrips.

- Ink as real `/Ink` annotation objects: RDP simplification moved into the
  executor (`addInkAnnot`), degenerate strokes rejected, InkList + bbox +
  color + border stored so any viewer renders the stroke.
- Square/Circle/Line (+arrow with OpenArrow end) as real annot dicts
  (`addGeomAnnot`) with rect validation.
- Quad-aware bake (`bakeAnnotations` in annotate-ops, replacing the
  Rect-only `bakeMarkup` in edit-ops): Highlight paints per-quad,
  Underline/StrikeOut draw per-quad lines, Ink replays InkList polylines,
  Square/Circle/Line replay geometry, all in the annot's own `/C` color.
  Unsupported subtypes are kept and counted as skipped, never dropped.
- Forms: filling a dropdown/list/radio with an unknown option now throws
  (pdf-lib `select()` records it silently - the old code reported success
  while viewers rendered a broken field).
- UI: ink pad and shape tools place annotations (report + chain in
  pipeline), "Bake annotations into content" reports per-subtype counts,
  annotation delete gained a subtype filter. Every control runs a real op.
- Drive-by: the 183-byte placeholder PWA icon logged a manifest size
  warning in console; replaced with a real 512x512 PNG (stdlib-only
  generator), console is now fully clean.

## Why
M1 purged the facades; M2 makes the kept annotate/forms features genuinely
native. Burn-first ink/shapes could never be listed, selected, or deleted;
choice-fill silent no-ops were exactly the kind of false-success the
Anti-Facade Guard exists to kill.

## How it works, key files
- `folio/src/ui/tools/annotate-ops.js`: `addInkAnnot`, `addGeomAnnot`,
  `bakeAnnotations` + `bakeOne`, `annotColor/annotBorderWidth/annotRect/
  annotQuads` readers, cleaned `listAnnotations`, subtype-capable
  `deleteAnnotations`.
- `folio/src/ui/tools/form-ops.js`: option validation before `select()`.
- `folio/src/ui/tools/edit-ops.js`: Rect-only `bakeMarkup` removed.
- `folio/src/ui/shell/app.js`, `folio/index.html`: rewired controls.
- Verification (all green): 33 annot + 13 forms node roundtrips, 3 pdf.js
  external text parses (flattened value + baked highlight stay searchable),
  existing suites 14/14 + 7/7, headless chromium desktop/mobile/annotate
  screenshots with zero console messages.

## Notes
- pdf.js `getDocument({data})` neuters the passed buffer; test harness must
  pass a copy. The app viewer already copies (`bytes.slice(0)`), so no app
  hazard.
- Tester should add an M2 adversarial suite (ink fuzz strokes, bake every
  subtype matrix, fill/flatten matrix incl. appearances).

- the Builder
