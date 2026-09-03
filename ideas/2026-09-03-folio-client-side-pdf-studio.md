# Folio: fully client-side PDF studio (architectural blueprint)

Date: 2026-09-03. Issue: #277. Research inputs: `folio/docs/feature-matrix.md` (binding parity contract, 70+ rows, CORE vs OCR-PACK vs OFFICE-PACK, Tier 1/2/3) and `folio/docs/research-spec.md` (algorithmic foundations, complexity bounds, feasibility proofs). This blueprint resolves all five open decisions from research spec section 13: route-level code splitting, worker topology, OPFS schema, pack manifest plus consent UX, Tier 1 implementation order.

## Summary

Folio is a static-only PDF studio hosted at `/folio/index.html` (GitHub Pages, no backend). All bytes stay on device (memory plus OPFS). Core bundle ships every Tier 1 CORE row under a 1-2 MB initial budget; two on-demand same-origin packs (OCR-PACK with Tesseract.js LSTM, OFFICE-PACK full-fidelity Office renderer) load only after explicit consent with size, progress, cancel, and offline reuse. One structural primitive (`copyPages` closure copy) powers all page ops; pdf.js owns the read path (render plus text map); pdf-lib owns the write path (structural, annotate, forms, content stamping); dedicated workers own parse, render, OCR, and crypto; a pipeline store owns multi-tool chaining with undo/redo; per-tool routes code-split so no route pays for another.

## Deliverables (what the Builder ships on this milestone)

- `folio/` static app: `index.html` entry, `manifest.webmanifest`, `sw.js` service worker, `assets/` (icons, sample PDF generator output), `src/` (see Module Breakdown), `packs/` (pack manifests plus vendored pack bundles, same origin).
- `folio/docs/` retained: `feature-matrix.md`, `research-spec.md`, plus new `architecture.md` (this blueprint, slimmed pointer) and `scoreboard.md` (T1-T5 results per build).
- PWA offline after first load; drag-drop ingest; OPFS working files; Cache Storage pack cache; IndexedDB job history.
- Every Tier 1 matrix row working end to end with empty, loading, error, and onboarding states; Tier 2 and Tier 3 rows behind the same route shell in dependency order (single PR, continuous `continue` cycles; never split scaffolding and tools into separate PRs).
- Headless visual loop: `folio/` served locally, Playwright screenshots at desktop (1280x800) and mobile (390x844) per tool route, iterated before marking complete.
- Root `index.html` landing entry for Folio (preview card linking to `/folio/`), without removing the Random landing page or breaking `pages.yml` PR previews.

## Why

Server-upload PDF tools tax privacy (documents leave the device) and fail offline. The browser already contains both halves of a PDF engine: pdf.js parses and renders any real-world file, pdf-lib rewrites the object graph losslessly, WebCrypto signs, canvas re-encodes images, WASM OCR reads scans. Folio fuses them into one studio with a binding parity contract (the matrix), a consent-gated pack model that keeps the core instant, and a pipeline model (upload once, chain ops, undo) that beats single-tool upload sites on workflow, not just features.

## How It Works

1. Ingest: drag-drop or file picker yields `File`/`Blob` handles (never base64 in memory). Files register in the OPFS workspace (`/folio/work/<jobId>/input/*`) and appear in the pipeline store. Password-protected files prompt once; decrypted bytes live only in memory plus an OPFS session file with zeroed password buffers after use.
2. Read path: pdf.js in `pdf.worker` parses the COS graph into display lists; the render scheduler paints at preview scale 1.5-2.0 with an LRU of ~30 bitmaps; `getTextContent` feeds the text-map builder (line sort with `eps_y = 0.4 * median font size`, space gaps with `eps_x = 0.3 * median glyph width`, plus x-histogram column clustering; CJK writing-mode flag honored; zero-item pages route to OCR).
3. Structural ops: every page op compiles to `copyPages(src, indices)` argument lists (keep-set, permutation, chunking) plus O(1) per-page mutations (`/Rotate`, `CropBox`/`TrimBox`), followed by the mandatory reference fix-up pass (O(m): remap or prune outline dests, link annotation dests, form field trees).
4. Content ops: text-map plus content-stream filter powers redact burn-in (drop or clip `Tj`/`TJ`/quote ops intersecting region R, prune text map, paint opaque rect, GC font subsets; acceptance is empty extraction over R plus clean binary scan), find-replace (same filter restricted to match bboxes), paragraph-aware edit (blank old bbox, typeset subset font at original metrics via `widthOfTextAtSize`, reflow inside paragraph box only, overflow flagged to continuation box), annotations (standard annotation dicts), stamps and watermarks (draw under or over content), N-up/booklet/overlay (Form XObject `embedPdf` plus `drawPage` affine tiling, never rasterized), compare (render diff plus Myers word diff).
5. Lossy paths: the compressor estimates ink-vs-image coverage per page (text item count vs image XObject area); image-dominant pages take rasterize at profile `(dpi, q)` grid low (150, 0.7), medium (110, 0.55), high (80, 0.4), extreme (55, 0.25); text pages take lossless resave plus unreferenced-object sweep only. Grayscale folds luminance pre-encode. PDF/A subset embeds font subsets, flattens transparency, strips JS/actions/embedded files, writes XMP plus OutputIntent.
6. Crypto and signatures: new files encrypt V=5 AES-256; load decrypts V<=5 in the crypto worker (O(m) bulk crypto, 100-page budget on scoreboard). Stamp signatures draw raster/SVG; PAdES basic certificate signing digests the ByteRange gap, signs CMS/PKCS#7 with a user PKCS#12 via in-browser ASN.1 plus WebCrypto RSA/ECDSA (hardware tokens documented out of scope); validation recomputes the digest and reports INTEGRITY vs TRUST separately.
7. Packs: OCR renders at 300 DPI grayscale (deskew under 5 deg, auto-orient), recognizes via Tesseract.js LSTM to hOCR words, emits rendering-mode-3 invisible text positioned by `pdfPoint = bbox_px * 72/dpi`. Office full fidelity renders in OFFICE-PACK; core fallback extracts via Mammoth-class (DOCX), SheetJS grid (XLSX), slide shapes (PPTX) into the print-CSS renderer (same-origin iframe, block-box pagination). From-PDF writers assemble DOCX (docx-class), XLSX/CSV (ruling-line Hough plus whitespace gaps, greedy assignment), PPTX (rendered background plus text boxes), Markdown/HTML/Text (V5 structures plus heading/list/table heuristics).
8. Pipeline: the op-pipeline store chains tools over one loaded document with per-step undo/redo; the batch queue fans the same op over many files via the job queue plus workers. Export writes via pdf-lib `save` (object-stream packing, linearization option) to OPFS output plus download link plus auto-rename patterns.

## Module Breakdown (domain decoupled from presentation)

Domain (headless, no DOM; unit-testable in Node/vitest):

- `src/core/pdf-engine/`: `loader.ts` (tolerant parse plus repair rewrite), `structural.ts` (`copyPages` wrapper, chunk/permutation planners, rotation/crop mutations, reference fix-up pass), `info.ts` (page count, sizes, fonts, images, security census), `sanitize.ts` (JS/AA/embedded-files/metadata stripper), `linearize.ts`, `pdfa.ts`.
- `src/core/textmap/`: `extract.ts` (pdf.js items to lines/paragraphs/columns), `tables.ts` (ruling-line plus whitespace finder), `markdown.ts` (heading/list/table inference), `writers.ts` (text, markdown, html, docx, xlsx/csv, pptx assemblers).
- `src/core/content/`: `redact.ts` (content-stream filter plus bake), `edit.ts` (paragraph-box replace plus reflow), `findreplace.ts`, `nup.ts` (N-up/booklet/overlay/imposition math), `compare.ts` (pixel plus Myers diff), `flatten.ts` (annotation/form appearance bake).
- `src/core/images/`: `render.ts` (DPI-select raster job spec), `extract.ts` (XObject recovery), `insert.ts` (embed plus draw), `filter.ts` (grayscale, scanner effect), `images-to-pdf.ts`.
- `src/core/compress/`: `profiles.ts` ((dpi,q) grid), `coverage.ts` (ink-vs-image gate), `downsample.ts`, `sweep.ts` (unreferenced-object rewrite).
- `src/core/crypto/`: `encrypt.ts` (V=5 AES-256, Perms flags), `unlock.ts` (decrypt-on-load session), `cert-sign.ts` (ByteRange digest, CMS build), `validate.ts` (INTEGRITY vs TRUST).
- `src/core/forms/`: `fill.ts` (AcroForm text/check/radio/dropdown), `create.ts` (field writer), `xfa.ts` (detector plus banner).
- `src/core/convert/`: `to-pdf.ts` (markdown/text/csv/html/images through print-CSS renderer), `office-fallback.ts` (Mammoth/SheetJS/pptx-shape extraction), `office-pack-client.ts` (pack RPC boundary), `url-import.ts` (same-origin fetch plus renderer).
- `src/core/ocr-client/`: `jobspec.ts` (300 DPI grayscale request, deskew/orient flags), `layer.ts` (mode-3 text emission, affine map), `pool.ts` (worker pool sizing).
- `src/core/pipeline/`: `ops.ts` (typed op envelope: id, params, inverse), `store.ts` (chain state, undo/redo stacks), `batch.ts` (multi-file job fan-out), `naming.ts` (auto-rename patterns).

Platform (browser services, no tool UI):

- `src/platform/workers/`: `pdf.worker.ts` (parse plus render plus text), `render-scheduler.ts` (cancellable jobs, LRU 30), `ocr-pool.ts` (`hardwareConcurrency - 1` workers, progress/cancel/retry), `crypto.worker.ts` (bulk encrypt/decrypt/digest).
- `src/platform/storage/`: `opfs.ts` (workspace CRUD, page-windowed streaming, quota errors), `cache.ts` (pack plus shell cache), `history.ts` (IndexedDB job log; redacted bytes never retained).
- `src/platform/packs/`: `manifest.ts` (pack registry reader), `loader.ts` (consent-gated fetch with progress/cancel, integrity check, cache-then-network), `fallback.ts` (core fallback routing when pack declined).
- `src/platform/print/`: `print-host.ts` (same-origin iframe, print CSS, booklet-ready), `url-fetch.ts`.

Presentation (shell plus routes; each route lazy-loads its domain chunk):

- `src/ui/shell/`: `app.ts` (router, nav, pipeline bar), `ingest.ts` (drag-drop, picker, OPFS restore), `states.ts` (empty/loading/error/onboarding plus bundled sample generator), `a11y.ts` (focus, keyboard paths, live regions), `theme.css` (design tokens).
- `src/ui/viewer/`: pdf.js viewer components (zoom, search, thumbnails, outline, continuous/single-page), `tts.ts` (speechSynthesis over V5 text).
- `src/ui/tools/`: one route module per matrix group (`pages.ts`, `compress.ts`, `security.ts`, `annotate.ts`, `edit.ts`, `images.ts`, `forms.ts`, `ocr.ts`, `convert.ts`, `workflow.ts`), each with `view.ts` plus `params.ts`; heavy routes (`ocr`, `office`) render the pack-consent card before loading pack code.
- `src/ui/components/`: `file-queue.ts`, `page-strip.ts` (reorder thumbnails), `crop-editor.ts`, `consent-card.ts`, `progress-bar.ts`, `diff-view.ts`, `props-panel.ts`.

Public interface sketch (binding shapes; Builder expands):

```ts
type PageSelector = { keep: number[] } | { chunksOf: number } | { ranges: [number, number][] };
interface StructuralOp { kind: "merge"|"split"|"extract"|"delete"|"reorder"|"insert"|"reverse"; selector: PageSelector; order?: number[]; at?: number; }
interface OpEnvelope { id: string; tool: string; params: unknown; inverse: unknown; createdAt: number; }
interface PackManifest { id: "ocr-pack"|"office-pack"; bytes: number; version: string; files: string[]; sha256: string; }
interface Scoreboard { t1ColdMs: number; t1WarmMs: number; t2MergeSecs: number; t2PeakMB: number; t3OcrSecPerPage: number; t4CoreBytes: number; t4PackBytes: Record<string, number>; t5Ratio: number; }
```

## Route-level code-splitting map (binding)

Shell plus viewer bootstrap is the only initial payload (budget under 1-2 MB gzipped: pdf-lib ~120 KB gzip vendored, viewer chrome, pipeline store, ingest, states). Everything else splits:

- `route:pages` (merge/split/extract/delete/reorder/rotate/resize/crop/insert + organize thumbnails): `structural.ts` plus `page-strip.ts`. No pack.
- `route:compress` (profiles, sanitize, PDF/A, linearize, grayscale): `compress/*` plus `sanitize.ts`. No pack.
- `route:security` (passwords, perms, redact, metadata scrub, JS inspector, cert sign/validate): `crypto/*` plus `redact.ts`. No pack (PKI ASN.1 vendored in chunk, WebCrypto native).
- `route:annotate` (markup, notes, shapes, ink, stamps, links, headers/footers, numbers, Bates, watermarks, bookmarks/TOC, props): annotation chunk. No pack.
- `route:edit` (paragraph edit, find-replace, N-up/booklet/overlay, compare, flatten, attachments): `content/*`. No pack.
- `route:images` (to-images, extract, insert, replace, images-to-PDF, scanner effect): `images/*`. No pack.
- `route:forms` (fill, create, flatten, XFA banner): `forms/*`. No pack.
- `route:ocr` (C1-C3): consent card first; on accept lazy-loads `ocr-pack` chunk (Tesseract core, LSTM data per language) from same origin. Core fallback shows scanned-no-text notice with accuracy disclaimer.
- `route:convert` (V1/V2/V5-V12): core writers chunk (docx, xlsx, markdown/html/text/csv assemblers, table finder). V3/V4 branch: consent card; on accept lazy-loads `office-pack`; on decline routes to `office-fallback.ts`.
- `route:workflow` (batch queue, multi-tool chaining UI, TTS, repair, auto-rename, info): `pipeline/*` plus `batch.ts`.
- Vendor split: `pdf-lib` in core chunk; `pdfjs-dist` worker lazy after first file load; Tesseract, Office engine, docx/xlsx writers each in own chunk so per-route download stays minimal. No third-party CDN at runtime; all imports same-origin vendored; CSP has no remote script sources.

## Worker topology (binding)

- Main thread: DOM, shell router, pdf-lib structural ops (fast object-graph only), pipeline store, OPFS handle management. Never blocks on parse, render, OCR, or bulk crypto.
- `pdf.worker` (1 instance, pdf.js): parse, metadata census, `getTextContent`, single-page render jobs; cancellable; posts transferable ImageBitmaps.
- Render scheduler (main-thread coordinator): at most 3 full-res pages resident; thumbnail strip LRU ~30 with O(1) eviction; preview scale 1.5-2.0; export raster at target DPI.
- `ocr-pool` (N = `hardwareConcurrency - 1`, min 1, max 4 on mobile): per-page 300 DPI grayscale render plus LSTM recognize; progress/cancel/per-page retry surfaced in `route:ocr`; handwriting triggers visible disclaimer.
- `crypto.worker` (1 instance): V<=5 decrypt, V=5 encrypt, ByteRange digests, CMS verify math; password `Uint8Array` zeroed post-use; never persists secrets to OPFS or IndexedDB.
- Job queue (`pipeline/batch.ts`): batch ops fan out across idle workers; failures retry per file without aborting the queue.

## OPFS plus Cache plus IndexedDB schema (binding)

- `opfs:/folio/work/<jobId>/input/<originalName>` (immutable ingested bytes), `.../session.pdf` (current pipeline state), `.../output/<name>` (exports), `.../tmp/render-<page>-<scale>.png` (evictable raster cache). Page-windowed streaming: at most 3 full-res pages resident; 100-page merge peak under ~300 MB desktop / ~150 MB mobile.
- `cache:folio-shell-v1` (app shell plus core chunks for offline PWA), `cache:folio-pack-ocr-<ver>` (Tesseract core plus language data), `cache:folio-pack-office-<ver>` (Office engine). Cache-then-network with versioned keys; pack caches fill only after consent.
- `idb:folio-history` stores: `jobs` (jobId, tool, params summary, timestamps, output names; never file bytes, never passwords, never redacted text), `prefs` (pack consents, language, theme, print settings). Redacted bytes are never written to history or tmp beyond the export itself.
- Quota and privacy errors (OPFS denied, quota exceeded, file too large) surface as actionable error states with retry plus free-space guidance.

## Pack manifest plus consent UX (binding)

- `folio/packs/ocr-pack.json` and `folio/packs/office-pack.json`: `{ id, version, bytes, files[], sha256, languages[] (ocr only), minSW }`. Builder generates these at build time from the actual vendored bundles so displayed sizes are never estimates.
- Consent card (shared `consent-card.ts`): feature name, exact byte size from manifest, one-line offline-reuse note ("downloads once, cached for offline reuse"), buttons Download (with progress plus cancel) / Use basic version instead (core fallback path) / Cancel. Consent persists in `idb:prefs`; user can revoke (clears pack cache entry).
- States: downloading (progress bar plus bytes), verifying (hash check), ready (cached badge), failed (retry plus fallback offer), declined (fallback UI stays fully usable; OCR-declined shows scanned notice; Office-declined shows fallback-fidelity banner listing what changes: pagination approximate, complex styles simplified).

## Tier 1 implementation blueprint (build order inside the single milestone)

Phase A (shell plus read plus structural backbone): shell router, ingest plus OPFS plus states plus sample PDF (R6, R7), viewer R1 (zoom/search/thumbnails/outline/modes), structural P1-P3/P6-P9/P19 plus fix-up pass, pipeline R2 (chain plus undo/redo). Exit gate: 100-page merge under scoreboard budget with correct outlines/links/forms.
Phase B (annotate plus edit plus images plus forms core): E1-E4, E6-E7, E9-E10, E12-E14, E17, I1-I3, I5, F1, F3. Exit gate: redact acceptance (S5 empty extraction plus clean binary scan) and paragraph-edit roundtrip on text-heavy corpus.
Phase C (security plus optimize plus OCR plus convert core): S1-S2, S5-S6, O1, O6, C1, C3, V1, V5-V9. Exit gate: compress ratio gate on fixed corpus without breaking text search on text pages; OCR sec/page recorded.
Phase D (Office pack wiring): V3 pack path plus V4 fallback behind one consent card; V2 table CSV; route:convert writers. Exit gate: DOCX/XLSX roundtrip on reference files in both pack and fallback modes.
Phase E (hardening plus scoreboard plus PWA): CSP lockdown, password zeroing audit, PWA manifest plus service worker, T1-T5 scoreboard on fixed corpus (desktop plus 390px mobile), Playwright screenshots per route, Tier 2/3 rows in matrix order (P4-P5/P10-P18, O3-O4/O7, S3-S4/S7/S10, E5/E8/E11/E15/E18, I4, F2, C2, V2/V4/V10-V12, R3, then Tier 3: P20, O2, O5, S8-S9, E16, E19, I6, F4, R4-R5). Cloud AI chat stays excluded per matrix section 8.

## Visual and UI specification (binding bar)

Layout: left pipeline sidebar (file queue, op chain with undo/redo, export), center viewer (toolbar: zoom/search/page-mode/rotate; thumbnail strip; outline tab), right params panel per tool. Desktop 1280x800 three-column; mobile 390px single column with bottom tool sheet plus collapsible strip. Tokens: `--folio-bg`, `--folio-surface`, `--folio-ink`, `--folio-accent`, `--folio-danger` (redact), plus focus-ring and contrast-checked accent pairs (WCAG AA). Controls: keyboard paths for every tool (shortcuts list, focus trap in dialogs, Esc cancels jobs), live-region announcements for progress/completion/errors. States per route: empty (drop hint plus sample button), loading (skeleton plus cancellable progress), error (actionable message plus retry), onboarding (sample PDF preloaded once). Headless loop mandatory: serve `folio/`, screenshot every route at both viewports, iterate on contrast/overflow/overlap before complete.

## Test Matrix

- Unit (vitest, headless, no DOM): structural planners (chunk/permutation/fix-up on synthetic page trees), text-map line/column sort on fixtures (single/multi-column, CJK flag, empty scan), table finder on ruled/ruled-less grids, coverage gate (text vs scan routing), redact filter (extraction-empty plus binary-clean assertions), edit reflow box math, imposition ordering, Myers diff, naming patterns, pack manifest parser, permission flag roundtrip.
- Integration (browser harness): tolerant parse plus repair on damaged fixture; encrypt/decrypt roundtrip V=5; compress profiles on fixed corpus (text-heavy, scan-heavy, mixed) with ratio plus searchability gates; OCR layer on Latin scan (word recall plus mode-3 invisibility); Office pack vs fallback banners; pipeline undo/redo chain; batch queue with one failing file; OPFS quota-denied path.
- Visual (Playwright): serve `folio/`, screenshot every route at 1280x800 and 390x844 (empty/loaded/error states, consent card, diff view, crop editor, compare heatmap); fail on overflow, overlap, or contrast regressions.
- Perf (scoreboard `folio/docs/scoreboard.md`): T1 time-to-first-page cold/warm desktop/mobile; T2 100-page merge time plus peak; T3 OCR sec/page 300 DPI Latin; T4 bytes (initial JS+CSS, per-pack, per-route); T5 compress ratio vs quality gate. Regressions over 10 percent block merge.

## Milestones (Builder checklist seed)

- [ ] 1. Scaffold `folio/` (Vite + TS + vitest + Playwright, vendored pdf-lib/pdfjs-dist, shell router, tokens, PWA shell, root landing link, scoreboard stub).
- [ ] 2. Phase A: ingest/OPFS/states/sample, viewer R1, structural P1-P3/P6-P9/P19 plus fix-up, pipeline R2.
- [ ] 3. Phase B: annotate/edit/images/forms core plus redact acceptance.
- [ ] 4. Phase C: security/compress/OCR/convert-core plus corpus gates.
- [ ] 5. Phase D: Office pack plus fallback plus consent manifest wiring.
- [ ] 6. Phase E: Tier 2 then Tier 3 rows, CSP/PWA hardening, full scoreboard, Playwright pass, docs.
- Current step: Ready for initial build. Next steps: Builder scaffolds project tree and implements Phase A on this branch, updating `progress/277-folio-client-side-pdf-studio.md` per phase; single PR across `continue` cycles.

  -  the Architect

## Builder Phase A record (2026-09-03)

Scaffold + shell + read + structural backbone live on
`opencode/issue277-20260903191417` (PR #279, continue cycles). Zero-build
static variant of the blueprint (no Vite step; Pages serves `folio/`
directly; vitest replaced by zero-dep `node:test`). Vendored pdf-lib 1.17.1
+ pdfjs-dist 4.4.168 same-origin. `folio/tests/core.test.js` 7/7 green;
node E2E against real vendored pdf-lib (merge 3+3=6, split, reverse, rotate,
watermark, text-to-PDF). Full detail in `folio/docs/architecture.md`.
Next: Phase B. Landing + README links ride with the final run.

  -  the Builder

## Builder Phase B record (2026-09-03)

Annotate/edit/images/forms core plus true burn-in redact, same branch and
PR, three modular commits. Text-map lines carry `w/h/words` (additive).
Pure domain: quads/Bates/bookmarks/ink-RDP/link validation, find spans,
paragraph-edit box math, LCS word diff, per-stream inflate/scrub/deflate
with precise per-word blanking, image fit/census math, form field
validation. Executors cover E1-E4 (plus E5/E8/E11/E13/E15), E6-E7, E14
bookmarks + TOC, I2-I3/I6, F1-F4, S5. Verification: unit 12/12, full
pdf-lib E2E green, pdf.js read-path proof (redacted words unextractable,
kept words in the same Tj run intact). Honest limits: overlay-only redact
refused; Differences/Identity-H subsets reported, never passed. Next:
Phase C. Landing + README links ride with the final run.

  -  the Builder

## Builder Phase C record (2026-09-03)

Security/compress/OCR/convert-core plus corpus gates, same branch and
PR, three modular commits. Pure domain: envelope crypto descriptor,
corpus planner + gate, OCR client specs, store-only ZIP office writers.
Executors: WebCrypto envelope roundtrip proven byte-identical, profile
gated compress with searchability gate, true Tr=3 invisible OCR layer
proven via pdf.js extraction, valid DOCX/XLSX/PPTX. Shell wired on all
four routes (97/97 IDs). Reviewer Phase A findings folded (outlines
param, dead paths removed, true undo). Verification: unit 16/16, full
E2E green. Honest scopes: envelope not native V=5, CMS signing Phase E,
Tesseract engine Phase D. Next: Phase D. Landing + README links ride
with the final run.

  -  the Builder

## Builder Phase D record (2026-09-03)

Office V3 pack plus V4 fallback behind one consent card, same branch
and PR, three modular commits. Pure domain: zip reader (EOCD plus
stored/inflate split), fallback extractors (DOCX/XLSX/PPTX over the
file map plus fidelity banner), pack boundary (prompt/fallback/pack
routing plus manifest verify), shared loader helpers. Pack engine
`packs/office-engine.js` 0.2.0 (8390 B, sha-pinned): DOCX tables and
bold/italic, XLSX sheet names and header rows, PPTX title/body split.
Executors: `officeToPdf` in both modes with a paginated pdf-lib
renderer. Shell: real consent accept (fetch, size/sha verify, ESM
load), fallback banner, Office picker plus convert button. Real bugs
fixed along the way: Phase C ZIP writer flag offset (strict-reader
safety) and the XLSX attribute regex. Verification: unit 17/17,
dual-mode E2E green (page counts reloaded), 100/100 wired IDs. Next:
Phase E. Landing + README links ride with the final run.

  -  the Builder

## Builder Phase E record (2026-09-03)

Tier 2 + Tier 3 completion plus hardening plus scoreboard, same
branch and PR, three modular commits. Pure domain
`core/tier2/tier2.js`: resize/orient specs, split-by-bookmark,
order-string parse, blank/flatten/GC/downsample/grayscale/PDF-A
plans, linearize note, cert scope + validate report, attach
registry, batch rename, replace-image plan, deskew spec, print
spec, batch plan + reducer. Executors `ui/tools/phaseE-ops.js`
proven against real pdf-lib (extract, bookmark split, blank,
resize to landscape, orient, crop + burn, flatten-all, GC,
PDF/A, grayscale, attach registry; one real bug fixed:
blank-page validated against a hardcoded count instead of the
live document). Shell: Tier 2/3 extras on every route, batch
queue with per-file retry, booklet-ready print path, CSP
same-origin meta, print CSS, PWA cache v2. Scoreboard T1-T5
measured: T1 shell 83 KB, T2 200-page merge 81 ms wall,
T4 pdf-lib 207 KB gzip + office pack 8390 B sha-pinned,
T5 lossless 1.000 searchable-kept, T3 deferred honest
(Tesseract bytes not vendored). Landing card + README links
live. Verification: unit 18/18, 117/117 wired IDs, all modules
parse. Honest scopes kept: envelope not native V=5, cert
appearance-only, image replace is overlay, attachments are
registry + OPFS sidecar. Next: Tester browser pass.

  -  the Builder
