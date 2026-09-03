# Folio feature-parity matrix (binding)

Survey date: 2026-09-03. Sources surveyed: Adobe Acrobat, Smallpdf,
iLovePDF, Sejda, PDF24 Tools, Foxit PDF Editor, Nitro PDF,
PDFgear, Stirling-PDF (55+ tools, docs.stirlingpdf.com), plus the
client-side primitives of pdf-lib (write path) and pdf.js / pdfjs-dist
(read path). Survey method: tool-list enumeration from vendor docs plus
capability mapping to browser-feasible primitives.

Completeness rule (from issue #277, binding): this matrix is the
contract. The Builder ships every row below. Nothing surveyed is left
behind. Section 8 lists rows that naive readers might call
"server-only" together with their client-side delivery path, so there
is no loophole.

Pack key: CORE ships in the initial bundle (budget under 1-2 MB).
OCR-PACK and OFFICE-PACK are on-demand same-origin packs, consent gated
and cached in Cache Storage / OPFS. "Core+" means core code with an
optional pack enhancement.

## 1. Page operations

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| P1 | Merge multiple PDFs (ordered, lossless) | all surveyed | pdf-lib copyPages | CORE | 1 |
| P2 | Split by page ranges / custom parts | all surveyed | pdf-lib copyPages subsets | CORE | 1 |
| P3 | Split by fixed chunk size (n pages each) | iLovePDF, Sejda, PDF24, Stirling | same as P2, chunked | CORE | 1 |
| P4 | Split by bookmarks / outline level | Acrobat, Sejda, Stirling | outline walk + P2 | CORE | 2 |
| P5 | Split into odd / even pages | Sejda, PDF24 | filtered copyPages | CORE | 2 |
| P6 | Extract pages to new PDF | all surveyed | copyPages subset | CORE | 1 |
| P7 | Delete pages (incl. blank-page detection) | all surveyed | filtered copyPages; blank test via text+ink coverage | CORE | 1 |
| P8 | Reorder / organize pages (drag thumbnails) | all surveyed | permuted copyPages | CORE | 1 |
| P9 | Rotate pages (90/180/270, per-page or range) | all surveyed | setRotation, lossless | CORE | 1 |
| P10 | Duplicate pages / insert blank page | Acrobat, Foxit, Stirling | copyPages self-copy / addPage | CORE | 2 |
| P11 | Resize / scale pages (A4/Letter/legal/custom, fit/fill) | Acrobat, Sejda, Stirling (Scale Pages) | MediaBox/CropBox transform + content scale | CORE | 1 |
| P12 | Change orientation portrait / landscape | Sejda, PDF24, Acrobat | rotation + MediaBox swap | CORE | 2 |
| P13 | Crop pages / set margins (visual crop box editor) | all surveyed | setCropBox/TrimBox (non-destructive) + burn crop option | CORE | 1 |
| P14 | N-up / multi-page layout (2-up, 4-up) | Acrobat, Stirling (Multi-Page Layout) | embedPdf + drawPage tiling | CORE | 2 |
| P15 | Booklet imposition (folio ordering for print) | Acrobat, Stirling (Booklet) | embedPdf imposition math | CORE | 2 |
| P16 | Overlay / stamp one PDF onto another | Stirling (Overlay), Sejda | drawPage under/over content | CORE | 2 |
| P17 | Compare two PDFs (visual + text diff) | Acrobat, Stirling (Compare), Foxit | pdf.js render diff + text diff | CORE | 2 |
| P18 | Flatten pages (annotations/forms into content) | Acrobat, Sejda, Stirling | appearance-stream bake | CORE | 2 |
| P19 | Insert pages from another PDF at position | Acrobat, Foxit, Nitro | copyPages splice | CORE | 1 |
| P20 | Reverse page order | Sejda, PDF24 | permuted copyPages | CORE | 3 |

## 2. Compression and optimization

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| O1 | Compress with profiles (low/medium/high/extreme) | all surveyed | object-stream resave + image downsample/re-encode; rasterize fallback for scans | CORE | 1 |
| O2 | Linearize (fast web view) | Acrobat, qpdf-class tools | xref linearization writer | CORE | 3 |
| O3 | Remove unused objects / garbage collect | Acrobat, Sejda, Stirling (Compress) | full rewrite via save (drops unreferenced) | CORE | 2 |
| O4 | Downsample images to target DPI | Acrobat, Sejda | pdf.js render at scale + embedJpg re-embed | CORE | 2 |
| O5 | Convert to grayscale / black-white | Sejda, PDFgear, Stirling (Replace Colors) | re-encode page images via canvas filter | CORE | 3 |
| O6 | Sanitize (strip JS, actions, embedded files, hidden layers) | Acrobat, Stirling (Sanitize) | object-graph stripper | CORE | 1 |
| O7 | Convert to PDF/A (archival) | Acrobat, Stirling (Convert to PDF/A), PDF24 | embed fonts + strip transparency/actions subset | CORE | 2 |

## 3. Security and secrets

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| S1 | Add password (AES-256) | all surveyed | encrypt with user/owner passwords | CORE | 1 |
| S2 | Remove password (with password) | all surveyed | decrypt + resave | CORE | 1 |
| S3 | Change password / permissions (print/copy/modify/annotate) | Acrobat, Foxit, Stirling | re-encrypt with new Perms flags | CORE | 1 |
| S4 | Decrypt for editing (session unlock) | all surveyed | in-memory decrypted copy | CORE | 1 |
| S5 | Redact with burn-in (text + area, true removal) | Acrobat, Foxit, Stirling (Redact) | content-stream filter + overlay bake, see research spec section 5 | CORE | 1 |
| S6 | Handwritten / typed / image signature stamp | all surveyed | drawImage/drawSvg stamp | CORE | 1 |
| S7 | Certificate digital signature (PAdES, PKCS#12 in browser) | Acrobat, Foxit, Stirling | PKI.js + ByteRange digest (research spec section 8) | CORE | 2 |
| S8 | Validate signature | Acrobat, Stirling | CMS + cert chain check in browser | CORE | 3 |
| S9 | Show embedded JavaScript / actions inspector | Stirling (Show JavaScript) | object-graph JS enumerator | CORE | 3 |
| S10 | Metadata scrub (one-click privacy clean) | Acrobat sanitize-class | metadata + scrub bundle | CORE | 2 |

## 4. Annotate and edit content

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| E1 | Text markup: highlight / underline / strikeout | all surveyed | text-markup annotations | CORE | 1 |
| E2 | Notes / comments (sticky, sidebar thread) | all surveyed | text annotations | CORE | 1 |
| E3 | Shapes: rectangle, ellipse, line, arrow, polygon | Acrobat, Foxit, PDFgear | ink/square/circle/line/polygon annotations | CORE | 1 |
| E4 | Freehand ink / pencil | Acrobat, Foxit, PDFgear, Smallpdf | ink-list annotation from pointer events | CORE | 1 |
| E5 | Stamp (built-in + custom image stamps) | Acrobat, Stirling (Add Stamp) | rubber-stamp annotation + image | CORE | 2 |
| E6 | Edit existing page text (paragraph-aware reflow) | Acrobat, Foxit, Sejda, Stirling Alpha editor | content-stream text-run replace (research spec section 6) | CORE | 1 |
| E7 | Find and replace text across document | Acrobat, Foxit, PDFgear | text-map + E6 replace | CORE | 1 |
| E8 | Add / edit hyperlinks | Acrobat, Foxit, Sejda | link annotations | CORE | 2 |
| E9 | Header and footer (text, date, logo) | Acrobat, Sejda, iLovePDF | drawText/drawImage per page | CORE | 1 |
| E10 | Page numbers (templates, start offset, odd/even) | all surveyed | same as E9 with counter | CORE | 1 |
| E11 | Bates numbering (prefix, digits, start) | Acrobat, Foxit | same as E9 with Bates counter | CORE | 2 |
| E12 | Watermark text (tiled, opacity, rotation) | all surveyed | tiled drawText under content | CORE | 1 |
| E13 | Watermark image / background | all surveyed | tiled drawImage under content | CORE | 1 |
| E14 | Bookmarks / outline create + edit + TOC page gen | Acrobat, Foxit, Nitro, Stirling | outline objects + generated TOC page | CORE | 1 |
| E15 | Edit / remove annotations (list + bulk delete) | Stirling (Remove Annotations), Sejda | annotation enumerator + delete | CORE | 2 |
| E16 | Attachments add / extract / delete | Acrobat, pdf-lib attach | embedded-files name tree | CORE | 3 |
| E17 | Document properties / metadata edit | all surveyed | Info dict + XMP sync | CORE | 1 |
| E18 | Get PDF info (page count, sizes, fonts, images, security) | Stirling (Get Info), Sejda | pdf.js metadata + object census | CORE | 2 |
| E19 | Auto-rename by content pattern (batch export naming) | Stirling (Auto Rename) | text-pattern file naming | CORE | 3 |

## 5. Images

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| I1 | PDF to images (PNG/JPG/WebP, DPI select, page ranges) | all surveyed | pdf.js render + canvas encode | CORE | 1 |
| I2 | Extract embedded images (original bytes) | Stirling, Sejda, PDF24 | operator-list XObject recovery | CORE | 1 |
| I3 | Insert image onto page (position/scale/rotate) | Acrobat, Sejda, Smallpdf | embedPng/embedJpg + drawImage | CORE | 1 |
| I4 | Replace image in place | Acrobat, Foxit | XObject swap | CORE | 2 |
| I5 | Images to PDF (multi-image, fit/fill, EXIF rotation) | all surveyed | create + embed per image | CORE | 1 |
| I6 | Scanner / photocopy effect | Stirling (Scanner Effect) | canvas noise/contrast filter re-embed | CORE | 3 |

## 6. Forms

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| F1 | Fill AcroForm (text, checkbox, radio, dropdown, list) | all surveyed | pdf-lib form API | CORE | 1 |
| F2 | Create simple form fields over a PDF | Acrobat, Foxit, Jotform-class | AcroForm field writer | CORE | 2 |
| F3 | Flatten form (fields into static content) | Acrobat, Sejda, Stirling | appearance bake | CORE | 1 |
| F4 | XFA note (read-only banner: XFA is legacy; fill not feasible client-side) | Acrobat compat | detector + banner | CORE | 3 |

## 7. OCR

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| C1 | OCR to searchable text layer (multi-language) | Acrobat, PDF24, Stirling, Foxit | Tesseract.js WASM + invisible text layer | OCR-PACK | 1 |
| C2 | OCR with auto-rotate / deskew pre-pass | Acrobat, Foxit | canvas orientation detect + C1 | OCR-PACK | 2 |
| C3 | OCR progress / cancel / per-page retry | Stirling UX, PDF24 | worker pool UI | OCR-PACK | 1 |

## 8. Conversion (every direction found)

To-PDF inputs found across the survey: Word (DOCX), Excel (XLSX),
PowerPoint (PPTX), images (PNG/JPG/WebP/GIF/BMP/TIFF), plain text,
Markdown, HTML, CSV, email/EML, URL/webpage capture, TXT/RTF-class.

From-PDF outputs found: Word, Excel (tables), PowerPoint, images,
plain text, Markdown, HTML, CSV, PDF/A, print.

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| V1 | Images / text / Markdown / HTML to PDF | all surveyed | markdown parser + print-CSS renderer; HTML via same-origin iframe print path | CORE | 1 |
| V2 | CSV to PDF (table renderer) | PDF24-class | table layout + V1 | CORE | 2 |
| V3 | Office (DOCX/XLSX/PPTX) to PDF, full fidelity | Acrobat, Stirling (Convert), Smallpdf | OFFICE-PACK renderer | OFFICE-PACK | 1 |
| V4 | Office to PDF, fallback fidelity (text+tables+images) | open-tool class | Mammoth/SheetJS/pptx-parse core fallback | CORE | 2 |
| V5 | PDF to text (layout-aware) | all surveyed | pdf.js text items + reading-order heuristic | CORE | 1 |
| V6 | PDF to Markdown (headings/lists/tables heuristic) | Stirling-class, open tools | V5 + structure inference | CORE | 1 |
| V7 | PDF to HTML (text + positioned images) | Stirling, Sejda | V5 + single-file HTML writer | CORE | 1 |
| V8 | PDF to Word (paragraph/table reconstruction) | Acrobat, Smallpdf, Stirling | V5/V6 + DOCX writer (docx lib) | CORE | 1 |
| V9 | PDF to Excel/CSV (table detection) | Acrobat, Smallpdf, Stirling, PDF24 | ruling-line + whitespace table finder | CORE | 1 |
| V10 | PDF to PowerPoint (page-as-slide + text boxes) | Acrobat, Stirling | page render + text-box slide writer | CORE | 2 |
| V11 | Webpage / URL to PDF (same-origin fetch + print CSS) | Acrobat, Sejda, browser print | fetch + V1 renderer | CORE | 2 |
| V12 | Print path (system print, booklet-ready) | all surveyed | print CSS + iframe | CORE | 2 |

Server-only rebuttals (binding delivery paths, no exceptions):
headless-Chromium HTML fidelity is replaced by the same-origin
print-CSS renderer (V1) plus the OFFICE-PACK converter (V3); cloud
e-sign request workflows degrade to local signature + shareable signed
file; cloud AI summarize/chat is out of scope for Folio v1 and is the
only excluded item, recorded here explicitly so the Builder does not
re-litigate it.

## 9. Read / view / workflow

| # | Feature | Found in | Primitive | Pack | Tier |
|---|---------|----------|-----------|------|------|
| R1 | Viewer: zoom, search, thumbnails, outline, continuous/single-page | all surveyed | pdf.js viewer components | CORE | 1 |
| R2 | Multi-tool chaining (upload once, chain ops, undo/redo) | Stirling (Multi-Tool) | op-pipeline state model | CORE | 1 |
| R3 | Batch process queue (same op, many files) | Stirling pipelines, Acrobat Action Wizard | job queue + workers | CORE | 2 |
| R4 | Read-aloud (TTS) | Edge-class readers | speechSynthesis over V5 text | CORE | 3 |
| R5 | Repair / validate damaged PDF (tolerant re-save) | Sejda repair-class | tolerant parse + rewrite | CORE | 3 |
| R6 | Drag-drop ingest, OPFS persistence, PWA offline | Folio vision | File System Access + OPFS + service worker | CORE | 1 |
| R7 | Onboarding sample PDF + empty/loading/error states | Folio UI bar | bundled sample generator | CORE | 1 |

## 10. Tier summary (build order within the single Folio milestone)

Tier 1 (must land first): P1-P3, P6-P9, P19, O1, S1-S2, S5-S6,
E1-E4, E6-E7, E9-E10, E12-E14, E17, I1-I3, I5, F1, F3, C1, C3,
V1, V3, V5-V9, R1-R2, R6-R7.
Tier 2: P4-P5, P10-P18, O3-O4, O7, S3-S4, S7, S10, E5, E8, E11,
E15, E18, I4, F2, C2, V2, V4, V10-V12, R3.
Tier 3: P20, O2, O5, S8-S9, E16, E19, I6, F4, R4-R5.

Sign-off: matrix v1.0 covers 9 surveyed suites plus the browser
primitive survey; every row has a named primitive and pack assignment.
No surveyed feature is unassigned.

 - Dr. Mob, the Researcher
