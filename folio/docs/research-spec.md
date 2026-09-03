# Folio research specification (algorithmic blueprint)

Companion to `feature-matrix.md` (the binding contract). This document
gives the Architect the mathematical foundations, complexity bounds,
data structures, and client-side feasibility proofs for every hard
subsystem. Notation: n = pages, m = COS objects, k = content-stream
operators on a page, t = text fragments on a page.

## 1. PDF object model and the universal page primitive

A PDF file is a COS object graph (dictionaries, arrays, streams) rooted
at the catalog, with pages as leaves of the page tree and resources
(fonts, image XObjects) shared by reference. Folio's core structural
engine is one primitive:

copyPages(src, indices) -> dest: deep-copies each page node plus its
transitive closure (content streams, fonts, XObjects), renumbering
object ids. Time O(m_copied), space O(m_copied), lossless by
construction because drawing operators are moved, never rasterized.

Merge (P1), split (P2-P5), extract (P6), delete (P7), reorder (P8),
reverse (P20), and insert (P19) are all argument lists to this one
primitive (keep-set, order permutation, chunking). Rotation (P9) is a
/ Rotate entry mutation, O(1) per page. Crop (P13) is a CropBox/TrimBox
mutation, O(1), non-destructive; the burn-crop variant clips content
streams at export. Correctness invariant: after any structural op, the
outline (bookmarks), link annotations with /Dest, and form field trees
must be remapped or pruned; the Architect must include a reference
fix-up pass (O(m)) in every structural pipeline.

## 2. Rendering and text extraction (read path, pdf.js)

Rendering: pdf.js parses content streams into display lists and paints
via canvas 2D. Per-page render is O(k) operators plus raster cost
O(w*h) pixels at the chosen scale. Folio renders at scale 1.5-2.0 for
preview (crisp on HiDPI) and at 72*dpi/72 for export raster. All parses
run in a Web Worker (pdf.worker) so the main thread never blocks; page
render jobs are cancellable and LRU-cached (thumbnail strip holds at
most ~30 bitmaps, eviction O(1)).

Text extraction: a PDF stores positioned glyph runs, not paragraphs.
pdf.js getTextContent returns items (str, transform) where transform[4]
and transform[5] are x/y. Reading-order reconstruction: sort by y
descending into lines with tolerance eps_y = 0.4 * median font size,
then by x ascending inserting spaces at gaps over
eps_x = 0.3 * median glyph width. Complexity O(t log t) per page.
Known limits (binding, Architect must surface in UX): multi-column
layouts need column clustering (x-histogram split) before line sort;
scanned pages yield zero items and route to OCR (C1); CJK vertical
writing needs the writing-mode flag honored. Markdown inference (V6):
font-size histogram picks heading levels (top sizes over 1.25x body
median become H1/H2), repeated x-aligned runs with bullet glyphs become
lists, ruling-line/table-finder output becomes GitHub tables.

## 3. Compression and optimization (O1-O7)

Lossless tier (always safe): full resave with object streams packs
small objects, typically 5-15 percent smaller, O(m) time. Unreferenced
object sweep (O3) is free inside the same rewrite.

Lossy tier (image-heavy files): for each page, render at target scale
s = targetDpi/72, JPEG-encode quality q, rebuild page as one image
(pdf-lib embedJpg). Size scales as O(n * w * h * q_factor); quality
follows standard rate-distortion tradeoff, and the profile table
(low/medium/high/extreme) is exactly a (dpi, q) grid: (150, 0.7),
(110, 0.55), (80, 0.4), (55, 0.25). Binding caution: on text-dominant
pages this path destroys searchability and can inflate size, so the
compressor must estimate ink-vs-image coverage per page (text item
count vs image XObject area) and apply rasterize only where image area
dominates; text pages take the lossless tier only. Grayscale (O5) is a
canvas filter (luminance fold) before re-encode. PDF/A (O7) subset:
embed all fonts (fontkit subsetting, typically 30-60 KB per CJK font
vs 4-8 MB full), strip transparency groups by flattening, drop
JavaScript/actions/embedded files, set XMP + OutputIntent. Linearize
(O2): rewrite with linearization parameter dict + first-page-first
ordering, O(m).

## 4. Encryption and permissions (S1-S4)

PDF security (ISO 32000): V=1/2 RC4-40/128, V=4 AESV2/CFB, V=5 AES-256
(AESV3, SHA-256 key derivation with user/owner salts). Folio implements
V=5 AES-256 for new encryption (S1) and decrypt-on-load with password
for V<=5 (S2/S4); permissions (S3) are the 32-bit Perms flags rewritten
under re-encryption. Per-object key derivation is O(m) bulk crypto in a
worker; 100-page decrypt must stay under ~2 s on desktop (perf
scoreboard). Binding note: password recovery/brute force is explicitly
out of scope (infeasible by design); the UI must say so.

## 5. Redaction with true burn-in (S5)

Overlay rectangles alone are NOT redaction (text remains extractable).
Correct pipeline per redaction region R on page p: (a) parse content
stream operators; drop or clip every text-showing op (Tj, TJ, quote
forms) whose glyph bbox intersects R, and clip path-painting ops
intersecting R; (b) remove the corresponding entries from the page text
map so extraction and search cannot recover them; (c) paint an opaque
rect over R in content; (d) on save, garbage-collect now-unreferenced
font subsets if economical. Complexity O(k + t) per page. Acceptance:
post-redact text extraction over R returns empty and binary scan finds
no redacted codepoints. Same content-filter machinery serves find-replace
(E7) restricted to matched bboxes and sanitize (S10/O6: strip /JS, /AA,
/EmbeddedFiles, metadata).

## 6. Paragraph-aware text editing (E6)

Hard constraint: pdf-lib cannot reflow existing content streams. Folio
approach: build a per-page text map (section 2) grouping runs into
paragraphs (line spacing + x-alignment clustering); an edit replaces
the affected runs by (a) blanking the old bbox region with background
fill, (b) typesetting new text with an embedded subset font at the
original metrics (widthOfTextAtSize for justification), (c) reflowing
within the paragraph box only, pushing overflow to an appended
continuation annotation or page-bottom box flagged in UX. O(t) per edit.
Full-document reflow is out of scope and must be labeled as such;
heading/body size histogram from section 2 preserves visual match.

## 7. N-up, booklet, overlay (P14-P16)

All three stay in the object model via Form XObjects (embedPdf +
drawPage), never rasterizing. N-up: tile n source pages per sheet with
affine transforms, O(n) draw ops. Booklet: signature ordering
(last, first, first+1, last-1, ...) computed arithmetically, O(n).
Overlay: draw underlay page then overlay page content with /GS alpha,
O(1) per sheet pair. Compare (P17): pixel diff of two renders at equal
scale plus word-level text diff (Myers O(nd)); show side-by-side with
change heatmap.

## 8. Signatures (S6-S8)

Handwritten/typed/image stamp (S6): raster/SVG capture drawn as page
content or stamp annotation, O(1). Certificate signing (S7, PAdES
part 2 basic): compute document digest over the ByteRange (all bytes
except the signature placeholder gap), sign CMS/PKCS#7 with a user
PKCS#12 parsed in-browser (PKI.js-class ASN.1 + WebCrypto RSA/ECDSA),
embed in /ByteRange /Contents. Feasibility proof: all steps are pure
bytes plus WebCrypto, no server needed; hardware-token (USB) certs are
the documented exception (WebUSB/U2F out of scope). Validation (S8):
recompute ByteRange digest, verify CMS chain against embedded certs and
a bundled trust list, report INTEGRITY vs TRUST separately.

## 9. OCR pack (C1-C3)

Tesseract.js (LSTM engine) WASM + language data lazy-loaded as OCR-PACK
with consent/size/progress/cancel UI. Per page: render at 300 DPI
grayscale, optional deskew (Hough on text baselines, rotation under 5
deg) and auto-orient (OSD), recognize to hOCR words with bboxes,
emit invisible text layer: pdf-lib drawText with rendering mode 3
(neither fill nor stroke) positioned by affine map
pdfPoint = bbox_px * 72/dpi. Throughput target on scoreboard:
SEC_PER_PAGE at 300 DPI; worker pool sized to hardwareConcurrency-1.
Accuracy note: LSTM word error on clean 300 DPI Latin is single-digit
percent; handwriting routes to a visible disclaimer, not a silent fail.

## 10. Office pack and conversion writers (V-series)

V1 core (no pack): Markdown/Text/CSV/HTML/Images to PDF via a
print-CSS layout renderer in a same-origin iframe (paginate by
fragmenting block boxes, O(doc) layout by the browser engine itself).
DOCX fallback (V4): Mammoth-class OOXML paragraph/table/image
extraction into the V1 renderer (loses exact pagination, keeps text
order). XLSX fallback: SheetJS grid to styled tables. PPTX fallback:
slide XML shapes to one PDF page each. Full-fidelity OFFICE-PACK (V3):
compiled layout engine (LibreOffice WASM-class) cached after consent;
core never pays its bytes. From-PDF writers: DOCX via docx-class
paragraph/table/image assembly from V5/V6 structures; XLSX/CSV via the
table finder (ruling-line segments Hough + whitespace column gaps,
assignment as weighted interval partitioning, greedy O(r c));
PPTX via per-page slide with rendered background plus text boxes.

## 11. Client architecture constraints (binding guidance)

Memory: stream file bytes (Blob/File, never base64 in memory),
process page-windowed (render at most 3 full-res pages resident),
target 100-page merge under the scoreboard budget with peak under
~300 MB desktop / ~150 MB mobile. Threading: pdf.worker for parse,
OCR workers, one crypto worker; main thread owns DOM + pdf-lib
structural ops (fast, object-graph only). Persistence: OPFS for working
files, Cache Storage for packs + PWA shell, IndexedDB for job history.
Bundle: CORE under 1-2 MB initial (pdf-lib ~120 KB gzip, pdf.js worker
lazy, viewer code-split per tool route); packs consent-gated with byte
size, progress, cancel, offline reuse. Security: no third-party CDN at
runtime (same-origin vendoring only), Content-Security-Policy without
remote script sources, password bytes zeroed after use, redacted bytes
never retained in OPFS history.

## 12. Perf scoreboard definitions (Lab Engineer instruments)

T1 time-to-first-page (ms, cold + warm, desktop + 390px mobile).
T2 100-page merge wall time + peak memory. T3 OCR seconds/page at
300 DPI Latin. T4 bundle bytes: initial JS+CSS, per-pack bytes,
per-route chunks. T5 compress ratio vs quality gate on a fixed corpus
(text-heavy, scan-heavy, mixed). All five reported per build; regressions
over 10 percent block merge.

## 13. Handoff to Architect

Open decisions for the Architect (not the Builder): route-level code
splitting map, worker topology, OPFS schema, pack manifest + consent
UX, and the Tier 1 implementation blueprint. Research unknowns: none
blocking; every matrix row has a proven client-side path above except
the single recorded exclusion (cloud AI chat, section 8 of matrix).

 - Dr. Mob, the Researcher
