// Folio shell: router, ingest, pipeline bar, viewer wiring, tool dispatch.
// Hash routes: #/pages #/compress #/security #/annotate #/edit #/images
// #/forms #/convert #/workflow. Each route runs its chunk on demand.
// M1 scope: every visible control executes a real engine op. Purged UI
// (OCR pack theater, white-box text edit, stream-regex redact, AES
// envelope, PDF/A + grayscale stamps, Subject attachments, Office
// dumpers, spec-only buttons) returns only with a real engine behind it.
import { createStore, applyOp, makeOp, undo, redo } from "../../core/pipeline/ops.js";
import { initStorage, writeFile, jobPaths, backend } from "../../platform/storage/opfs.js";
import { logJob } from "../../platform/storage/history.js";
import { initViewer, openDocument, renderPage, pageText, searchAll, setZoom, zoom, pageCount, currentPage, renderThumbnail, renderToDataUrl, renderPageGray, pageBox } from "../viewer/viewer.js";
import { pdfToCss, cssToPdf, normalizeDragBox, resizeBox, moveBox, commitRect, parsePlaceTarget } from "../viewer/overlay.js";
import { buildSamplePdf } from "./sample.js";
import * as Pages from "../tools/pages-ops.js";
import { gridDropOrder } from "../tools/pages-ops.js";
import * as Content from "../tools/content-ops.js";
import * as Annotate from "../tools/annotate-ops.js";
import * as EditOps from "../tools/edit-ops.js";
import * as ImageOps from "../tools/image-ops.js";
import * as FormOps from "../tools/form-ops.js";
import * as Security from "../tools/security-ops.js";
import * as Compress from "../tools/compress-ops.js";
import * as ConvertOps from "../tools/convert-ops.js";
import * as OcrOps from "../tools/ocr-ops.js";
import * as OfficeOps from "../tools/office-ops.js";
import * as PhaseE from "../tools/phaseE-ops.js";
import { splitByBookmarks, parseOrderString, batchRename, printSpec, batchPlan, batchReducer } from "../../core/tier2/tier2.js";
import { validateLink } from "../../core/annotate/annotate.js";
import { scannerSpec } from "../../core/images/images.js";
import { toText, toMarkdown, toHtml } from "../../core/convert/writers.js";

const $ = (id) => document.getElementById(id);
const store = createStore(100);
const jobId = "job-" + Date.now().toString(36);
const paths = jobPaths(jobId);
let PDFLib = null;
let file = null; // {name, bytes}
let fileB = null; // second file (merge/insert)
let selectedPage = 1; // grid selection, 1-based

function announce(msg) {
  const el = $("live");
  if (el) el.textContent = msg;
  const st = $("statusbar");
  if (st) st.textContent = msg;
}

// M4a toast error boundaries: dismissible, role=alert for errors, plus an
// "ok" tone for confirmed commits. announce() stays the statusbar path.
function toast(msg, kind) {
  const stack = $("toasts");
  if (!stack) {
    announce(msg);
    return;
  }
  const t = document.createElement("div");
  t.className = "toast" + (kind === "error" ? " error" : kind === "ok" ? " ok" : "");
  if (kind === "error") t.setAttribute("role", "alert");
  const span = document.createElement("span");
  span.textContent = msg;
  const x = document.createElement("button");
  x.textContent = "Dismiss";
  x.setAttribute("aria-label", "Dismiss notification");
  x.onclick = () => t.remove();
  t.appendChild(span);
  t.appendChild(x);
  stack.appendChild(t);
  while (stack.children.length > 5) stack.firstChild.remove();
  announce(msg);
  return t;
}

// M4a determinate progress (OCR/pack/batch share one bar; null hides it).
function setProgress(frac) {
  const bar = $("batchprog");
  if (!bar) return;
  if (frac === null || frac === undefined) {
    bar.classList.remove("on");
    bar.setAttribute("aria-valuenow", "0");
    const fill = bar.firstElementChild;
    if (fill) fill.style.width = "0%";
    return;
  }
  const pct = Math.min(100, Math.max(0, Math.round(frac * 100)));
  bar.classList.add("on");
  bar.setAttribute("aria-valuenow", String(pct));
  const fill = bar.firstElementChild;
  if (fill) fill.style.width = pct + "%";
}

function download(bytes, name, mime) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: mime || "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

async function setFile(name, bytes, keepSel) {
  // M4a: corrupt/encrypted/unsupported bytes must surface a dismissible
  // toast and leave the shell usable, never stuck on "Loading...".
  try {
    file = { name, bytes: bytes.slice ? bytes.slice(0) : bytes };
    await writeFile(paths.input(name), file.bytes);
    const info = await openDocument(file.bytes);
    await writeFile(paths.session(), file.bytes);
    $("filemeta").textContent = name + " - " + info.pages + " pages - " + (file.bytes.length / 1024).toFixed(1) + " KB (" + backend() + ")";
    if (!keepSel) selectedPage = 1;
    selectedPage = Math.min(selectedPage, info.pages);
    $("pageinfo").textContent = "Page " + selectedPage + " of " + info.pages;
    await renderPage($("pagecanvas"), selectedPage);
    clearOverlayDom(); // rendered pixels changed: stale overlay boxes lie
    await renderGrid();
    announce("Opened " + name + ", " + info.pages + " pages.");
    await logJob({ jobId, tool: "open", params: { name, pages: info.pages } });
  } catch (err) {
    file = null;
    const hint = /encrypt/i.test(err.message)
      ? "This PDF is encrypted. Decrypt it elsewhere first; Folio never asks for passwords."
      : /password/i.test(err.message)
        ? "This PDF needs a password, which Folio never collects."
        : "That file did not parse as a PDF (" + err.message + ").";
    toast("Could not open " + name + ". " + hint, "error");
  }
}

// Visual page grid: live pdf.js canvas previews, click to preview, drag to
// reorder (committed through the real reorder engine with undo), toolbar +
// keyboard paths for touch and a11y. Renders the first 60 pages eagerly so
// time-to-first-page stays instant; the note covers the rest.
const GRID_CAP = 60;
async function gotoPage(p) {
  const n = pageCount();
  if (!n) return;
  selectedPage = Math.min(n, Math.max(1, p));
  await renderPage($("pagecanvas"), selectedPage);
  clearOverlayDom(); // new pixels: stale overlay boxes lie
  $("pageinfo").textContent = "Page " + selectedPage + " of " + n;
  paintGridSelection();
}

function paintGridSelection() {
  document.querySelectorAll("#pagegrid .pcard").forEach((el) => {
    const p = parseInt(el.dataset.page, 10);
    const on = p === selectedPage;
    el.classList.toggle("selected", on);
    el.setAttribute("aria-selected", on ? "true" : "false");
  });
}

async function renderGrid() {
  const n = pageCount();
  const grid = $("pagegrid");
  grid.innerHTML = "";
  $("gridcount").textContent = n ? "(" + n + " pages)" : "";
  $("gridnote").textContent = n > GRID_CAP ? "Showing first " + GRID_CAP + " of " + n + " pages; use Reorder below for full-range moves." : "";
  if (!n) return;
  const cap = Math.min(n, GRID_CAP);
  const frag = document.createDocumentFragment();
  for (let p = 1; p <= cap; p++) {
    const fig = document.createElement("figure");
    fig.className = "pcard" + (p === selectedPage ? " selected" : "");
    fig.dataset.page = String(p);
    fig.setAttribute("role", "option");
    fig.setAttribute("tabindex", "-1");
    fig.setAttribute("aria-selected", p === selectedPage ? "true" : "false");
    fig.setAttribute("aria-label", "Page " + p + (p === selectedPage ? ", selected" : ""));
    fig.draggable = true;
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    const cap2 = document.createElement("figcaption");
    cap2.textContent = "p." + p;
    fig.appendChild(img);
    fig.appendChild(cap2);
    fig.addEventListener("click", () => {
      gotoPage(p).catch((e) => announce("Error: " + e.message));
    });
    fig.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/folio-page", String(p));
      e.dataTransfer.effectAllowed = "move";
      fig.classList.add("dragging");
    });
    fig.addEventListener("dragend", () => {
      fig.classList.remove("dragging");
      grid.querySelectorAll(".dragover").forEach((x) => x.classList.remove("dragover"));
    });
    fig.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      fig.classList.add("dragover");
    });
    fig.addEventListener("dragleave", () => fig.classList.remove("dragover"));
    fig.addEventListener("drop", (e) => {
      e.preventDefault();
      fig.classList.remove("dragover");
      const raw = e.dataTransfer.getData("text/folio-page");
      const from = parseInt(raw, 10);
      if (!Number.isInteger(from)) return;
      gridDropCommit(from, p).catch((err) => announce("Error: " + err.message));
    });
    frag.appendChild(fig);
    try {
      img.src = await renderThumbnail(p);
    } catch {
      img.alt = "preview failed";
    }
  }
  grid.appendChild(frag);
}

async function gridDropCommit(fromPage, toPage) {
  const a = requireFile();
  const order = gridDropOrder(pageCount(), fromPage - 1, toPage - 1);
  const out = await Pages.reorderPages(a.bytes, order, PDFLib);
  selectedPage = order.indexOf(fromPage - 1) + 1;
  $("pages-extra-report").textContent = "Moved page " + fromPage + " to position " + selectedPage + ".";
  await refreshAfterOp("reorder", { order }, out, outName("reordered"), true);
}

const undoBytes = []; // true undo: prior file bytes per op (cap 20)
const redoBytes = [];
async function refreshAfterOp(tool, params, newBytes, outName, keepSel) {
  const op = makeOp(tool, params, { tool, note: "true undo via in-memory byte snapshot" });
  if (file) {
    undoBytes.push({ tool, bytes: file.bytes });
    if (undoBytes.length > 20) undoBytes.shift();
  }
  redoBytes.length = 0;
  applyOp(store, op);
  await writeFile(paths.output(outName), newBytes);
  await setFile(outName, newBytes, keepSel);
  renderChain();
  await logJob({ jobId, tool, params: summarize(params), output: outName });
}

function summarize(p) {
  try {
    return JSON.parse(JSON.stringify(p || {}, (k, v) => (v instanceof Uint8Array ? "[bytes " + v.length + "]" : v)));
  } catch {
    return { note: "unserializable params" };
  }
}

function renderChain() {
  const el = $("opchain");
  el.innerHTML = "";
  if (!store.applied.length) {
    el.innerHTML = "<span class='muted'>No ops yet. Upload once, chain tools here.</span>";
    return;
  }
  store.applied.forEach((o) => {
    const s = document.createElement("span");
    s.className = "op";
    s.textContent = o.tool;
    el.appendChild(s);
  });
}

function requireFile() {
  if (!file) {
    announce("Upload a PDF first (or load the sample).");
    throw new Error("no file");
  }
  return file;
}

function parseRanges(str, max) {
  // "1-3,5" 1-based inclusive
  const out = [];
  for (const part of str.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error("bad range part: " + part);
    const a = parseInt(m[1], 10) - 1;
    const b = (m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10)) - 1;
    if (a < 0 || b >= max || a > b) throw new Error("range out of bounds: " + part);
    for (let i = a; i <= b; i++) out.push(i);
  }
  return [...new Set(out)].sort((x, y) => x - y);
}

async function wire() {
  await initStorage();
  PDFLib = window.PDFLib;
  if (!PDFLib) throw new Error("pdf-lib failed to load (vendor/pdf-lib.min.js missing or blocked)");
  // M4a: resolve the pdf.js worker against this module's URL so the shell
  // boots from any base path (viewer keeps its relative default).
  await initViewer(new URL("../../../vendor/pdf.worker.mjs", import.meta.url).href);
  renderChain();

  const dz = $("dropzone");
  const pick = $("filepick");
  const pickB = $("filepickB");
  // M4a: drops outside the zone must never navigate the window away and
  // destroy the session; files dropped anywhere open like a zone drop.
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    dz.classList.remove("over");
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) await setFile(f.name, new Uint8Array(await f.arrayBuffer()));
  });
  // M4a: the whole zone is clickable (the word "choose" is not the only
  // target); clicks on the inner label already forward natively.
  dz.addEventListener("click", (e) => {
    if (e.target.closest("label")) return;
    pick.click();
  });
  dz.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target === dz) {
      e.preventDefault();
      pick.click();
    }
  });
  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("over");
  });
  dz.addEventListener("dragleave", () => dz.classList.remove("over"));
  dz.addEventListener("drop", async (e) => {
    e.preventDefault();
    dz.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (f) await setFile(f.name, new Uint8Array(await f.arrayBuffer()));
  });
  pick.addEventListener("change", async () => {
    const f = pick.files[0];
    // M4a: reset the input so re-picking the same file fires change again.
    pick.value = "";
    if (f) await setFile(f.name, new Uint8Array(await f.arrayBuffer()));
  });
  pickB.addEventListener("change", async () => {
    const f = pickB.files[0];
    pickB.value = "";
    if (f) {
      fileB = { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) };
      $("fileBmeta").textContent = f.name;
    }
  });
  $("samplebtn").onclick = async () => {
    const bytes = await buildSamplePdf(PDFLib);
    await setFile("folio-sample.pdf", bytes);
  };

  // viewer controls
  $("zoomin").onclick = async () => {
    await renderPage($("pagecanvas"), currentPage());
    setZoom(zoom() + 0.25);
    await renderPage($("pagecanvas"), currentPage());
    clearOverlayDom();
  };
  $("zoomout").onclick = async () => {
    setZoom(zoom() - 0.25);
    await renderPage($("pagecanvas"), currentPage());
    clearOverlayDom();
  };
  $("prevpage").onclick = () => {
    gotoPage(currentPage() - 1).then(() => renderGrid()).catch((e) => announce("Error: " + e.message));
  };
  $("nextpage").onclick = () => {
    gotoPage(currentPage() + 1).then(() => renderGrid()).catch((e) => announce("Error: " + e.message));
  };
  $("searchbtn").onclick = async () => {
    const hits = await searchAll($("searchbox").value);
    $("searchhits").textContent = hits.length + " hits" + (hits.length ? ": " + hits.slice(0, 5).map((h) => "p." + h.page).join(", ") : "");
    announce(hits.length + " search hits.");
  };

  // pipeline undo/redo/export (true byte restore)
  $("undobtn").onclick = async () => {
    const inv = undo(store);
    const snap = undoBytes.pop();
    if (snap) {
      if (file) redoBytes.push({ tool: inv ? inv.tool : "?", bytes: file.bytes });
      await setFile("folio-undo-" + (snap.tool || "op") + ".pdf", snap.bytes);
      announce("Undid " + (inv ? inv.tool : "op") + "; prior bytes restored.");
    } else announce(inv ? "Undid " + inv.tool + " (no byte snapshot)." : "Nothing to undo.");
    renderChain();
  };
  $("redobtn").onclick = async () => {
    const op = redo(store);
    const snap = redoBytes.pop();
    if (snap) {
      if (file) undoBytes.push({ tool: op ? op.tool : "?", bytes: file.bytes });
      await setFile("folio-redo-" + (snap.tool || "op") + ".pdf", snap.bytes);
      announce("Redid " + (op ? op.tool : "op") + "; bytes restored.");
    } else announce(op ? "Redid " + op.tool + " (no byte snapshot)." : "Nothing to redo.");
    renderChain();
  };
  $("exportbtn").onclick = () => {
    const f = requireFile();
    download(f.bytes, f.name.replace(/\.pdf$/i, "") + "-folio.pdf");
  };

  // router
  window.addEventListener("hashchange", showRoute);
  showRoute();
  wireTools();
  wireGrid();
  wireOverlay();

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch { /* offline shell optional */ }
  }
  announce("Folio ready. Load the sample or drop a PDF.");
}

function showRoute() {
  let h = location.hash || "#/pages";
  document.querySelectorAll(".route").forEach((r) => r.classList.remove("active"));
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("active", a.hash === h));
  const id = "route-" + h.replace("#/", "");
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function outName(suffix) {
  const base = (file ? file.name : "doc").replace(/\.pdf$/i, "");
  return base + "-" + suffix + ".pdf";
}

// Grid toolbar + keyboard paths (touch / a11y fallback for drag-drop).
function wireGrid() {
  $("g-rot").onclick = async () => {
    try {
      const a = requireFile();
      const doc = await PDFLib.PDFDocument.load(a.bytes);
      const p = doc.getPage(selectedPage - 1);
      p.setRotation(PDFLib.degrees((p.getRotation().angle + 90) % 360));
      await refreshAfterOp("rotate", { page: selectedPage, deg: 90 }, await doc.save(), outName("rot90"), true);
      $("pages-extra-report").textContent = "Rotated page " + selectedPage + " by 90deg.";
    } catch (err) {
      announce("Error: " + err.message);
    }
  };
  $("g-dup").onclick = async () => {
    try {
      const a = requireFile();
      const out = await Pages.duplicatePage(a.bytes, selectedPage - 1, PDFLib);
      await refreshAfterOp("duplicate", { page: selectedPage }, out, outName("dup"), true);
      $("pages-extra-report").textContent = "Duplicated page " + selectedPage + ".";
    } catch (err) {
      announce("Error: " + err.message);
    }
  };
  const moveSel = async (delta) => {
    const n = pageCount();
    if (!n) {
      announce("Upload a PDF first (or load the sample).");
      return;
    }
    const from = selectedPage;
    const to = Math.min(n, Math.max(1, from + delta));
    if (from === to) return;
    try {
      const a = requireFile();
      const order = gridDropOrder(n, from - 1, to - 1);
      const out = await Pages.reorderPages(a.bytes, order, PDFLib);
      selectedPage = to;
      $("pages-extra-report").textContent = "Moved page " + from + " to position " + to + ".";
      await refreshAfterOp("reorder", { order }, out, outName("reordered"), true);
    } catch (err) {
      announce("Error: " + err.message);
    }
  };
  $("g-left").onclick = () => moveSel(-1);
  $("g-right").onclick = () => moveSel(1);
  $("g-del").onclick = async () => {
    try {
      const a = requireFile();
      const out = await Pages.deletePages(a.bytes, [selectedPage - 1], PDFLib);
      const gone = selectedPage;
      selectedPage = Math.max(1, Math.min(selectedPage, pageCount() - 1));
      await refreshAfterOp("delete", { rm: [gone - 1] }, out, outName("deleted"), true);
      $("pages-extra-report").textContent = "Deleted page " + gone + ".";
    } catch (err) {
      announce("Error: " + err.message);
    }
  };
  $("pagegrid").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const d = e.key === "ArrowLeft" ? -1 : 1;
      if (e.ctrlKey || e.metaKey) moveSel(d);
      else gotoPage(selectedPage + d).catch((err) => announce("Error: " + err.message));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      $("g-del").click();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      gotoPage(selectedPage).catch((err) => announce("Error: " + err.message));
    }
  });
}

// ---- M4b canvas overlay: placement state machine ----
// Toolbar buttons arm a mode; click commits a point placement and drag
// commits a rect placement. Every commit calls the real M1/M2 engine op
// with the overlay-derived rect (anti-facade: no visual-only placement).
// Crop mode keeps a persistent draggable/resizable bbox with 8 handles.
let placeMode = null;
let dragAnchor = null;
let ghostEl = null;
let cropCss = null; // {x,y,w,h} in overlay px, the live crop box
let cropEl = null;

function overlayBox() {
  const ov = $("overlay");
  const r = ov.getBoundingClientRect();
  return { width: Math.max(1, r.width), height: Math.max(1, r.height) };
}

function overlayPos(e) {
  const r = $("overlay").getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function overlayHint(msg) {
  const el = $("overlayhint");
  if (el) el.textContent = msg;
}

function clearOverlayDom() {
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }
  dragAnchor = null;
  if (cropEl) {
    cropEl.remove();
    cropEl = null;
  }
  cropCss = null;
}

function setMode(mode) {
  clearOverlayDom();
  placeMode = mode;
  document.querySelectorAll("#placetoolbar [data-mode]").forEach((b) => {
    b.classList.toggle("armed", b.dataset.mode === mode);
  });
  const ov = $("overlay");
  ov.classList.toggle("crosshair", !!mode);
  ov.setAttribute("aria-hidden", mode ? "false" : "true");
  $("croprow").hidden = mode !== "crop";
  if (!mode) overlayHint("Pick a tool above, then click or drag on the page preview. Esc cancels. Arrow keys nudge the crop box, Enter applies it.");
  else if (mode === "crop") overlayHint("Crop: drag a box on the preview, drag edges to resize, Enter or Apply crop to commit (all pages, reversible). Esc cancels.");
  else if (mode === "image") overlayHint(mode + ": drag a frame on the preview. Pick the image in Images first; the click/drag point commits through the real insert-image engine. Esc cancels.");
  else if (mode === "field") overlayHint(mode + ": drag a frame on the preview. Name/type/options come from the Forms card; commits through the real create-field engine. Esc cancels.");
  else overlayHint(mode + ": click to place, or drag a rect. Commits through the real engine. Esc cancels.");
  if (mode) ov.focus({ preventScroll: true });
}

function paintGhost(box) {
  if (!ghostEl) {
    ghostEl = document.createElement("div");
    ghostEl.className = "ghost";
    $("overlay").appendChild(ghostEl);
  }
  ghostEl.style.left = box.x + "px";
  ghostEl.style.top = box.y + "px";
  ghostEl.style.width = box.w + "px";
  ghostEl.style.height = box.h + "px";
}

const CROP_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function paintCropEl() {
  if (!cropCss) return;
  if (!cropEl) {
    cropEl = document.createElement("div");
    cropEl.className = "cropbox";
    cropEl.setAttribute("role", "application");
    cropEl.setAttribute("aria-label", "Crop box. Drag to move, drag handles to resize.");
    for (const h of CROP_HANDLES) {
      const d = document.createElement("div");
      d.className = "handle";
      d.dataset.h = h;
      d.setAttribute("aria-label", "Resize " + h);
      cropEl.appendChild(d);
    }
    $("overlay").appendChild(cropEl);
    wireCropEl();
  }
  cropEl.style.left = cropCss.x + "px";
  cropEl.style.top = cropCss.y + "px";
  cropEl.style.width = cropCss.w + "px";
  cropEl.style.height = cropCss.h + "px";
  const off = -6;
  const pos = {
    nw: [off, off], n: [cropCss.w / 2 - 6, off], ne: [cropCss.w - 6, off],
    e: [cropCss.w - 6, cropCss.h / 2 - 6], se: [cropCss.w - 6, cropCss.h - 6],
    s: [cropCss.w / 2 - 6, cropCss.h - 6], sw: [off, cropCss.h - 6], w: [off, cropCss.h / 2 - 6],
  };
  for (const d of cropEl.querySelectorAll(".handle")) {
    const [hx, hy] = pos[d.dataset.h];
    d.style.left = hx + "px";
    d.style.top = hy + "px";
  }
}

function wireCropEl() {
  // Move by dragging the box body; resize by dragging a handle.
  cropEl.addEventListener("pointerdown", (e) => {
    if (e.target !== cropEl || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const start = overlayPos(e);
    const orig = { ...cropCss };
    const ob = overlayBox();
    const move = (ev) => {
      const p = overlayPos(ev);
      cropCss = moveBox(orig, p.x - start.x, p.y - start.y, ob);
      paintCropEl();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
  for (const d of cropEl.querySelectorAll(".handle")) {
    d.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      const h = d.dataset.h;
      const start = overlayPos(e);
      const orig = { ...cropCss };
      const ob = overlayBox();
      const move = (ev) => {
        const p = overlayPos(ev);
        cropCss = resizeBox(orig, h, p.x - start.x, p.y - start.y, ob);
        paintCropEl();
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }
}

async function cssToPdfRect(cssBox) {
  // Exact rect without click-expansion (crop keeps drawn boxes verbatim).
  const pb = await pageBox(currentPage());
  const raw = cssToPdf(cssBox, pb, overlayBox());
  const q = (n) => Math.round(n * 10) / 10;
  return { x: q(raw.x), y: q(raw.y), w: q(raw.w), h: q(raw.h) };
}

async function setCropBox(cssBox) {
  cropCss = normalizeDragBox(cssBox.x, cssBox.y, cssBox.x + cssBox.w, cssBox.y + cssBox.h, overlayBox());
  if (cropCss.w < 4 && cropCss.h < 4) {
    // Click without a drag: center a default 100x100pt box on the point.
    const pb = await pageBox(currentPage());
    const ob = overlayBox();
    const d = { x: 0, y: 0, w: 100, h: 100 };
    const css = pdfToCss(d, pb, ob);
    cropCss = normalizeDragBox(cssBox.x - css.w / 2, cssBox.y - css.h / 2, cssBox.x + css.w / 2, cssBox.y + css.h / 2, ob);
  }
  paintCropEl();
  overlayHint("Crop box set (" + Math.round(cropCss.w) + "x" + Math.round(cropCss.h) + " px). Enter or Apply crop commits; arrows nudge, Esc cancels.");
}

async function commitPlace(mode, cssBox) {
  const a = requireFile();
  const pb = await pageBox(currentPage());
  const ob = overlayBox();
  const rect = commitRect(mode, cssBox, pb, ob);
  const pg = currentPage();
  if (mode === "note") {
    const out = await Annotate.addStickyNote(a.bytes, { page: pg - 1, x: rect.x, y: rect.y, contents: $("notetext").value || "Note" }, PDFLib);
    await refreshAfterOp("note", { page: pg }, out, outName("noted"), true);
    toast("Note placed on page " + pg + ".", "ok");
  } else if (mode === "shape") {
    const placed = await Annotate.addGeomAnnot(a.bytes, { page: pg - 1, kind: $("shapekind").value, rect }, PDFLib);
    $("annotreport").textContent = placed.subtype + " annotation placed on page " + pg + " via canvas (bake to burn in).";
    await refreshAfterOp("shape-" + placed.subtype.toLowerCase(), { kind: $("shapekind").value }, placed.bytes, outName("shaped"), true);
    toast(placed.subtype + " placed on page " + pg + ".", "ok");
  } else if (mode === "link") {
    const raw = $("linktarget").value.trim();
    const tgt = parsePlaceTarget(raw, pageCount());
    const dest = tgt.gotoPage !== undefined ? { gotoPage: tgt.gotoPage } : validateLink({ uri: tgt.uri });
    const out = await Annotate.addLink(a.bytes, { page: pg - 1, rect, ...dest }, PDFLib);
    await refreshAfterOp("link", { target: raw }, out, outName("linked"), true);
    toast("Link placed on page " + pg + ".", "ok");
  } else if (mode === "stamp") {
    const out = await Annotate.addStamp(a.bytes, { page: pg - 1, text: $("stamptext").value || "APPROVED", x: rect.x, y: rect.y }, PDFLib);
    await refreshAfterOp("stamp", {}, out, outName("stamped"), true);
    toast("Stamp placed on page " + pg + ".", "ok");
  } else if (mode === "sign") {
    const out = await Security.signatureStamp(a.bytes, { page: pg - 1, text: $("signtext").value || "Signed", x: rect.x, y: rect.y }, PDFLib);
    await refreshAfterOp("sign-stamp", {}, out, outName("signed"), true);
    toast("Signature placed on page " + pg + ".", "ok");
  } else if (mode === "image") {
    const f = $("imginsertpick").files[0];
    if (!f) throw new Error("Pick an image in Images first, then drag the frame on the preview.");
    const kind = f.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const out = await ImageOps.insertImage(a.bytes, { page: pg - 1, imageBytes: new Uint8Array(await f.arrayBuffer()), kind, x: rect.x, y: rect.y, maxW: Math.max(8, rect.w), maxH: Math.max(8, rect.h) }, PDFLib);
    await refreshAfterOp("insert-image", { page: pg }, out, outName("img"), true);
    toast("Image placed on page " + pg + ".", "ok");
  } else if (mode === "field") {
    const opts = $("fldopts").value.split(",").map((s) => s.trim()).filter(Boolean);
    const out = await FormOps.createField(a.bytes, { name: $("fldname").value || "field1", type: $("fldtype").value, page: pg, rect, options: opts }, PDFLib);
    await refreshAfterOp("create-field", { name: $("fldname").value }, out, outName("formed"), true);
    toast("Field placed on page " + pg + ".", "ok");
  } else {
    throw new Error("place: unknown mode " + mode);
  }
}

async function applyCropRect() {
  if (!cropCss) throw new Error("Draw a crop box on the preview first (Crop tool).");
  const a = requireFile();
  const rect = await cssToPdfRect(cropCss);
  const out = await PhaseE.cropPages(a.bytes, rect, PDFLib);
  await refreshAfterOp("crop", { rect }, out, outName("cropped"), true);
  toast("Crop applied (reversible; burn to make permanent).", "ok");
}

function wireOverlay() {
  const ov = $("overlay");
  ov.tabIndex = -1;
  document.querySelectorAll("#placetoolbar [data-mode]").forEach((b) => {
    b.onclick = () => setMode(placeMode === b.dataset.mode ? null : b.dataset.mode);
  });
  $("cropcommit").onclick = async () => {
    try {
      await applyCropRect();
    } catch (err) {
      toast("Error: " + err.message, "error");
    }
  };
  $("cropburn").onclick = async () => {
    try {
      const a = requireFile();
      if (!cropCss) throw new Error("Draw a crop box first (Crop tool).");
      await applyCropRect();
      const b = requireFile();
      const out = await PhaseE.burnCrop(b.bytes, PDFLib);
      await refreshAfterOp("burn-crop", {}, out, outName("burncropped"), true);
      toast("Crop burned into media boxes.", "ok");
    } catch (err) {
      toast("Error: " + err.message, "error");
    }
  };
  $("cropclear").onclick = () => {
    clearOverlayDom();
    overlayHint("Crop box cleared. Drag a new box or pick another tool.");
  };
  ov.addEventListener("pointerdown", (e) => {
    if (!placeMode || e.button !== 0) return;
    e.preventDefault();
    if (!file) {
      toast("Upload a PDF first (or load the sample).", "error");
      return;
    }
    try {
      ov.setPointerCapture(e.pointerId);
    } catch { /* mouse already released */ }
    dragAnchor = overlayPos(e);
    paintGhost({ ...dragAnchor, w: 0, h: 0 });
  });
  ov.addEventListener("pointermove", (e) => {
    if (!dragAnchor) return;
    const p = overlayPos(e);
    paintGhost(normalizeDragBox(dragAnchor.x, dragAnchor.y, p.x, p.y, overlayBox()));
  });
  ov.addEventListener("pointerup", async (e) => {
    if (!dragAnchor) return;
    const p = overlayPos(e);
    const box = normalizeDragBox(dragAnchor.x, dragAnchor.y, p.x, p.y, overlayBox());
    dragAnchor = null;
    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }
    const mode = placeMode;
    try {
      if (mode === "crop") await setCropBox(box);
      else await commitPlace(mode, box);
    } catch (err) {
      toast("Error: " + err.message, "error");
    }
  });
  ov.addEventListener("keydown", async (e) => {
    if (!placeMode) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setMode(null);
    } else if (placeMode === "crop" && cropCss && (e.key.startsWith("Arrow") || e.key === "Enter")) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "Enter") {
        try {
          await applyCropRect();
        } catch (err) {
          toast("Error: " + err.message, "error");
        }
        return;
      }
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      cropCss = moveBox(cropCss, d[0], d[1], overlayBox());
      paintCropEl();
    }
  });
}

function wireTools() {
  const run = (id, fn) => {
    $(id).onclick = async () => {
      try {
        announce("Working...");
        await fn();
        announce("Done.");
      } catch (err) {
        announce("Error: " + err.message);
      }
    };
  };
  // pages
  run("t-merge", async () => {
    const a = requireFile();
    if (!fileB) throw new Error("Pick a second PDF first.");
    const out = await Pages.mergeFiles([a.bytes, fileB.bytes], PDFLib);
    await refreshAfterOp("merge", { files: 2 }, out, outName("merged"));
  });
  run("t-split", async () => {
    const a = requireFile();
    const plans = $("splitranges").value || "1-1";
    const ranges = [];
    for (const part of plans.split(",").map((s) => s.trim()).filter(Boolean)) {
      const m = part.match(/^(\d+)-(\d+)$/);
      if (!m) throw new Error("split ranges look like 1-2,3-4 (1-based)");
      ranges.push([parseInt(m[1], 10) - 1, parseInt(m[2], 10) - 1]);
    }
    const outs = await Pages.splitRanges(a.bytes, ranges, PDFLib);
    outs.forEach((b, i) => download(b, outName("part" + (i + 1))));
    const op = makeOp("split", { ranges }, null);
    applyOp(store, op);
    renderChain();
  });
  run("t-chunks", async () => {
    const a = requireFile();
    const n = parseInt($("chunksize").value || "5", 10);
    const outs = await Pages.splitChunks(a.bytes, n, PDFLib);
    outs.forEach((b, i) => download(b, outName("chunk" + (i + 1))));
  });
  run("t-delete", async () => {
    const a = requireFile();
    const rm = parseRanges($("delpages").value || "", pageCount()).map((i) => i);
    const out = await Pages.deletePages(a.bytes, rm, PDFLib);
    await refreshAfterOp("delete", { rm }, out, outName("deleted"));
  });
  run("t-oddeven", async () => {
    const a = requireFile();
    const out = await Pages.oddEven(a.bytes, $("oddevenwhich").value, PDFLib);
    await refreshAfterOp($("oddevenwhich").value, {}, out, outName($("oddevenwhich").value));
  });
  run("t-reverse", async () => {
    const a = requireFile();
    const out = await Pages.reversePages(a.bytes, PDFLib);
    await refreshAfterOp("reverse", {}, out, outName("reversed"));
  });
  run("t-rotate", async () => {
    const a = requireFile();
    const deg = parseInt($("rotdeg").value, 10);
    const out = await Pages.rotatePages(a.bytes, "all", deg, PDFLib);
    await refreshAfterOp("rotate", { deg }, out, outName("rot" + deg));
  });
  run("t-insert", async () => {
    const a = requireFile();
    if (!fileB) throw new Error("Pick a second PDF first.");
    const at = parseInt($("insertat").value || "1", 10) - 1;
    const out = await Pages.insertPdf(a.bytes, fileB.bytes, at, PDFLib);
    await refreshAfterOp("insert", { at }, out, outName("inserted"));
  });
  run("t-duplicate", async () => {
    const a = requireFile();
    const out = await Pages.duplicatePage(a.bytes, currentPage() - 1, PDFLib);
    await refreshAfterOp("duplicate", { page: currentPage() }, out, outName("dup"));
  });
  // compress/security
  run("t-resave", async () => {
    const a = requireFile();
    const before = a.bytes.length;
    const out = await Content.losslessResave(a.bytes, PDFLib);
    $("compressreport").textContent = "Lossless resave: " + before + " -> " + out.length + " bytes (" + (100 * out.length / before).toFixed(1) + "%).";
    await refreshAfterOp("compress-lossless", { before, after: out.length }, out, outName("optimized"));
  });
  function dataUrlToBytes(url) {
    const b64 = String(url).split(",")[1] || "";
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  run("t-compress", async () => {
    const a = requireFile();
    const profile = $("cprofile").value || "medium";
    const coverages = [];
    const textDominant = [];
    for (let p = 1; p <= pageCount(); p++) {
      const t = await pageText(p);
      coverages.push({ textItems: t.count, imageArea: 0 });
      textDominant.push(t.count >= 40);
    }
    const r = await Compress.compressPdf(
      a.bytes,
      {
        profile,
        coverages,
        textDominant,
        rasterizePage: async (pageIdx, dpi) => dataUrlToBytes(await renderToDataUrl(pageIdx + 1, dpi)),
      },
      PDFLib
    );
    $("compressreport").textContent =
      "Profile " + profile + ": " + r.before + " -> " + r.after + " bytes (" + (100 * r.gate.ratio).toFixed(1) + "%). " +
      "Rasterized pages: [" + r.rasterized.join(",") + "]; deferred: [" + r.deferred.join(",") + "]. " +
      (r.gate.searchableKept ? "Searchability kept." : "DAMAGED text pages: [" + r.gate.damaged.join(",") + "].");
    await refreshAfterOp("compress-" + profile, { before: r.before, after: r.after }, r.bytes, outName("compressed"));
  });
  run("t-scrub", async () => {
    const a = requireFile();
    const out = await Content.scrubMetadata(a.bytes, PDFLib);
    await refreshAfterOp("scrub", {}, out, outName("scrubbed"));
  });
  run("t-jsinspect", async () => {
    const a = requireFile();
    const hits = Security.inspectJs(a.bytes);
    $("jsreport").textContent = hits.length
      ? "Risky keys: " + hits.map((h) => h.key + " x" + h.count).join(", ") + ". Scrub removes them (metadata + JS scrub)."
      : "Clean: no /JS, /AA, /OpenAction, /EmbeddedFiles, /Launch, /XFA keys found.";
  });
  run("t-sign", async () => {
    const a = requireFile();
    const out = await Security.signatureStamp(a.bytes, { page: currentPage() - 1, text: $("signtext").value || "Signed", x: 56, y: 140 }, PDFLib);
    $("signreport").textContent = "Signature stamp placed on page " + currentPage() + ".";
    await refreshAfterOp("sign-stamp", {}, out, outName("signed"));
  });
  async function textMapsFor(pages) {
    const maps = {};
    const targets = pages || Array.from({ length: pageCount() }, (_, i) => i);
    for (const pi of targets) {
      const t = await pageText(pi + 1);
      maps[pi] = t.lines;
    }
    return maps;
  }
  function parseRect(str) {
    const parts = String(str || "").split(",").map((s) => parseFloat(s.trim()));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) throw new Error("rect must look like x,y,w,h");
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  }
  function parseXY(str) {
    const parts = String(str || "").split(",").map((s) => parseFloat(s.trim()));
    if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) throw new Error("coords must look like x,y");
    return parts;
  }
  run("t-headerfooter", async () => {
    const a = requireFile();
    const out = await Content.addHeaderFooter(a.bytes, { header: $("hfheader").value, footer: $("hffooter").value }, PDFLib);
    await refreshAfterOp("header-footer", {}, out, outName("hf"));
  });
  run("t-pagenum", async () => {
    const a = requireFile();
    const out = await Content.addPageNumbers(a.bytes, { template: $("pntpl").value }, PDFLib);
    await refreshAfterOp("page-numbers", {}, out, outName("numbered"));
  });
  run("t-watermark", async () => {
    const a = requireFile();
    const out = await Content.addWatermark(a.bytes, { text: $("wmtext").value }, PDFLib);
    await refreshAfterOp("watermark", {}, out, outName("watermarked"));
  });
  run("t-metadata", async () => {
    const a = requireFile();
    const out = await Content.setMetadata(a.bytes, { title: $("mdtitle").value, author: $("mdauthor").value, subject: "", keywords: "" }, PDFLib);
    await refreshAfterOp("metadata", {}, out, outName("meta"));
  });
  // ---- Phase B: annotate (E1-E5, E8, E11, E13-E15) ----
  run("t-markup", async () => {
    const a = requireFile();
    const maps = await textMapsFor();
    const r = await Annotate.addTextMarkup(a.bytes, { query: $("mkquery").value, subtype: $("mksubtype").value }, maps, PDFLib);
    $("annotreport").textContent = r.hits + " markup annotation(s) placed.";
    await refreshAfterOp("markup-" + $("mksubtype").value.toLowerCase(), { q: $("mkquery").value }, r.bytes, outName("marked"));
  });
  run("t-bakemarkup", async () => {
    const a = requireFile();
    const r = await Annotate.bakeAnnotations(a.bytes, PDFLib);
    const parts = Object.entries(r.bySubtype).map(([k, v]) => v + " " + k);
    $("annotreport").textContent = r.baked
      ? "Baked " + parts.join(", ") + " into content" + (r.skipped ? " (" + r.skipped + " unsupported left as annots)." : ".")
      : "Nothing bakable found" + (r.skipped ? " (" + r.skipped + " unsupported annot(s) kept)." : ".");
    await refreshAfterOp("bake-annotations", { baked: r.baked }, r.bytes, outName("baked"));
  });
  run("t-note", async () => {
    const a = requireFile();
    const [x, y] = parseXY($("notexy").value || "100,650");
    const out = await Annotate.addStickyNote(a.bytes, { page: currentPage() - 1, x, y, contents: $("notetext").value || "Note" }, PDFLib);
    await refreshAfterOp("note", { page: currentPage() }, out, outName("noted"));
  });
  run("t-shape", async () => {
    const a = requireFile();
    const r = parseRect($("shapexy").value || "50,600,200,80");
    const placed = await Annotate.addGeomAnnot(a.bytes, { page: currentPage() - 1, kind: $("shapekind").value, rect: r }, PDFLib);
    $("annotreport").textContent = placed.subtype + " annotation placed on page " + currentPage() + " (bake to burn in).";
    await refreshAfterOp("shape-" + placed.subtype.toLowerCase(), { kind: $("shapekind").value }, placed.bytes, outName("shaped"));
  });
  run("t-stamp", async () => {
    const a = requireFile();
    const out = await Annotate.addStamp(a.bytes, { page: currentPage() - 1, text: $("stamptext").value || "APPROVED" }, PDFLib);
    await refreshAfterOp("stamp", {}, out, outName("stamped"));
  });
  run("t-link", async () => {
    const a = requireFile();
    const rect = parseRect($("linkrect").value || "56,740,200,20");
    const t = $("linktarget").value.trim();
    const target = t.startsWith("page:") ? { gotoPage: parseInt(t.slice(5), 10) - 1 } : validateLink({ uri: t });
    const out = await Annotate.addLink(a.bytes, { page: currentPage() - 1, rect, ...target }, PDFLib);
    await refreshAfterOp("link", { target: t }, out, outName("linked"));
  });
  run("t-bates", async () => {
    const a = requireFile();
    const r = await Annotate.addBates(a.bytes, { prefix: $("batespre").value, digits: parseInt($("batesdigits").value || "6", 10), start: parseInt($("batesstart").value || "1", 10) }, PDFLib);
    $("annotreport").textContent = "Bates: " + r.plan[0] + " ... " + r.plan[r.plan.length - 1];
    await refreshAfterOp("bates", {}, r.bytes, outName("bates"));
  });
  run("t-wmimg", async () => {
    const a = requireFile();
    const f = $("wmpick").files[0];
    if (!f) throw new Error("Pick an image first.");
    const kind = f.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const out = await Annotate.imageWatermark(a.bytes, { imageBytes: new Uint8Array(await f.arrayBuffer()), kind, opacity: 0.15 }, PDFLib);
    await refreshAfterOp("image-watermark", {}, out, outName("bgmarked"));
  });
  function parseBookmarks() {
    return $("bmtext").value.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
      const m = line.match(/^(.*)\|\s*(\d+)\s*$/);
      if (!m) throw new Error("bookmark lines look like: Title | 2");
      return { title: m[1].trim(), page: parseInt(m[2], 10) };
    });
  }
  run("t-bookmarks", async () => {
    const a = requireFile();
    const r = await Annotate.setBookmarks(a.bytes, parseBookmarks(), PDFLib);
    $("annotreport").textContent = r.count + " bookmark(s) set.";
    await refreshAfterOp("bookmarks", { count: r.count }, r.bytes, outName("bookmarked"));
  });
  run("t-toc", async () => {
    const a = requireFile();
    const r = await Annotate.addTocPage(a.bytes, parseBookmarks(), PDFLib);
    $("annotreport").textContent = r.count + " bookmark(s) + TOC page.";
    await refreshAfterOp("toc", { count: r.count }, r.bytes, outName("toc"));
  });
  run("t-annlist", async () => {
    const a = requireFile();
    const doc = await PDFLib.PDFDocument.load(a.bytes);
    const list = Annotate.listAnnotations(doc, PDFLib);
    $("annotreport").textContent = list.length ? list.map((x) => "p." + (x.page + 1) + " " + x.subtype).join("; ") : "No annotations.";
  });
  run("t-anndel", async () => {
    const a = requireFile();
    const sub = $("anndelsub").value;
    const r = await Annotate.deleteAnnotations(a.bytes, sub === "all" ? {} : { subtypes: [sub] }, PDFLib);
    $("annotreport").textContent = r.removed + " annotation(s) removed" + (sub === "all" ? "." : " (" + sub + ").");
    await refreshAfterOp("annots-cleared", { removed: r.removed }, r.bytes, outName("cleaned"));
  });
  // ink pad
  const inkStrokes = [];
  let inkCur = null;
  const pad = $("inkpad");
  function padPos(e) {
    const r = pad.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (pad.width / r.width), y: (e.clientY - r.top) * (pad.height / r.height) };
  }
  pad.addEventListener("pointerdown", (e) => {
    pad.setPointerCapture(e.pointerId);
    inkCur = [padPos(e)];
    inkStrokes.push(inkCur);
  });
  pad.addEventListener("pointermove", (e) => {
    if (!inkCur) return;
    inkCur.push(padPos(e));
    const ctx = pad.getContext("2d");
    const n = inkCur.length;
    ctx.beginPath();
    ctx.moveTo(inkCur[n - 2].x, inkCur[n - 2].y);
    ctx.lineTo(inkCur[n - 1].x, inkCur[n - 1].y);
    ctx.stroke();
  });
  pad.addEventListener("pointerup", () => {
    inkCur = null;
  });
  $("t-inkclear").onclick = () => {
    inkStrokes.length = 0;
    pad.getContext("2d").clearRect(0, 0, pad.width, pad.height);
  };
  run("t-ink", async () => {
    const a = requireFile();
    if (!inkStrokes.length) throw new Error("Draw on the pad first.");
    const doc = await PDFLib.PDFDocument.load(a.bytes);
    const size = doc.getPages()[currentPage() - 1].getSize();
    const sx = size.width / pad.width;
    const sy = size.height / pad.height;
    const strokes = inkStrokes.map((st) => st.map((p) => ({ x: p.x * sx, y: size.height - p.y * sy })));
    const r = await Annotate.addInkAnnot(a.bytes, { page: currentPage() - 1, strokes }, PDFLib);
    $("annotreport").textContent = "Ink annotation placed: " + r.strokes + " stroke(s), " + r.points + " points (bake to burn in).";
    await refreshAfterOp("ink", { strokes: r.strokes }, r.bytes, outName("inked"));
  });
  // ---- Edit: N-up/booklet/overlay, compare ----
  run("t-nup", async () => {
    const a = requireFile();
    const out = await EditOps.nupPdf(a.bytes, { n: parseInt($("nupn").value, 10) }, PDFLib);
    await refreshAfterOp("nup-" + $("nupn").value, {}, out, outName("nup" + $("nupn").value));
  });
  run("t-booklet", async () => {
    const a = requireFile();
    const out = await EditOps.bookletPdf(a.bytes, PDFLib);
    await refreshAfterOp("booklet", {}, out, outName("booklet"));
  });
  run("t-overlay", async () => {
    const a = requireFile();
    if (!fileB) throw new Error("Pick a second PDF first.");
    const out = await EditOps.overlayPdf(a.bytes, fileB.bytes, PDFLib);
    await refreshAfterOp("overlay", {}, out, outName("overlay"));
  });
  run("t-compare", async () => {
    const a = requireFile();
    if (!fileB) throw new Error("Pick a second PDF first.");
    const prev = file;
    await setFile(fileB.name, fileB.bytes);
    const textsB = [];
    for (let p = 1; p <= pageCount(); p++) textsB.push((await pageText(p)).paragraphs.map((x) => x.text).join("\n"));
    await setFile(prev.name, prev.bytes);
    const textsA = [];
    for (let p = 1; p <= pageCount(); p++) textsA.push((await pageText(p)).paragraphs.map((x) => x.text).join("\n"));
    const r = await EditOps.compareDocs(a.bytes, fileB.bytes, textsA, textsB, PDFLib);
    $("editreport").textContent = "Diff: " + r.stats.same + " same, " + r.stats.del + " removed, " + r.stats.ins + " added words.";
    await refreshAfterOp("compare", { stats: r.stats }, r.bytes, outName("compared"));
  });
  // ---- Phase B: images (I2-I3, I6) ----
  run("t-imgcensus", async () => {
    const a = requireFile();
    const doc = await PDFLib.PDFDocument.load(a.bytes);
    const list = ImageOps.censusImages(doc, PDFLib);
    $("imgreport").textContent = list.length
      ? list.map((c) => "#" + c.index + " p." + (c.page + 1) + " " + c.width + "x" + c.height + " " + c.filter).join("; ")
      : "No embedded images.";
  });
  run("t-imgextract", async () => {
    const a = requireFile();
    const doc = await PDFLib.PDFDocument.load(a.bytes);
    const list = ImageOps.censusImages(doc, PDFLib);
    if (!list.length) throw new Error("No embedded images.");
    list.forEach((entry, i) => {
      const r = ImageOps.extractImageBytes(doc, entry);
      const mime = r.ext === "jpg" ? "image/jpeg" : "application/octet-stream";
      download(r.bytes, "folio-img" + (i + 1) + "." + r.ext, mime);
    });
    $("imgreport").textContent = list.length + " image(s) downloaded (JPEG stays original; others are raw samples).";
  });
  run("t-imginsert", async () => {
    const a = requireFile();
    const f = $("imginsertpick").files[0];
    if (!f) throw new Error("Pick an image first.");
    const [x, y] = parseXY($("imgxy").value || "56,400");
    const kind = f.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const out = await ImageOps.insertImage(a.bytes, { page: currentPage() - 1, imageBytes: new Uint8Array(await f.arrayBuffer()), kind, x, y, maxW: 400, maxH: 400 }, PDFLib);
    await refreshAfterOp("insert-image", { page: currentPage() }, out, outName("img"));
  });
  run("t-scanner", async () => {
    requireFile();
    const url = await renderToDataUrl(currentPage(), 150);
    const res = await fetch(url);
    const png = new Uint8Array(await res.arrayBuffer());
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    const filtered = ImageOps.scannerFilter(c, scannerSpec({}));
    const res2 = await fetch(filtered);
    const out = await Content.imagesToPdf([new Uint8Array(await res2.arrayBuffer())], ["png"], PDFLib);
    void png;
    download(out, outName("scanned"));
    announce("Scanner-effect page exported.");
  });
  // ---- Phase B: forms (F1-F4) ----
  run("t-formlist", async () => {
    const a = requireFile();
    const list = await FormOps.describeForm(a.bytes, PDFLib);
    $("formreport").textContent = list.length ? list.map((f) => f.name + " (" + f.kind + ")").join("; ") : "No form fields.";
  });
  run("t-formflatten", async () => {
    const a = requireFile();
    const out = await FormOps.flattenForm(a.bytes, PDFLib);
    await refreshAfterOp("flatten-form", {}, out, outName("flat"));
  });
  run("t-xfa", async () => {
    const a = requireFile();
    const msg = FormOps.xfaBanner(a.bytes);
    $("formreport").textContent = msg || "No XFA detected: standard AcroForm (or no form).";
  });
  run("t-formcreate", async () => {
    const a = requireFile();
    const rect = parseRect($("fldrect").value || "56,600,200,24");
    const opts = $("fldopts").value.split(",").map((s) => s.trim()).filter(Boolean);
    const out = await FormOps.createField(a.bytes, { name: $("fldname").value || "field1", type: $("fldtype").value, page: currentPage(), rect, options: opts }, PDFLib);
    await refreshAfterOp("create-field", { name: $("fldname").value }, out, outName("formed"));
  });
  run("t-formfill", async () => {
    const a = requireFile();
    let values = null;
    try {
      values = JSON.parse($("filljson").value || "{}");
    } catch {
      throw new Error("fill JSON does not parse");
    }
    const r = await FormOps.fillForm(a.bytes, values, PDFLib);
    $("formreport").textContent = r.filled + " field(s) filled.";
    await refreshAfterOp("fill-form", { filled: r.filled }, r.bytes, outName("filled"));
  });
  // images
  run("t-pdf2img", async () => {
    requireFile();
    const url = await renderToDataUrl(currentPage(), parseInt($("imgdpi").value || "150", 10));
    const a = document.createElement("a");
    a.href = url;
    a.download = "folio-p" + currentPage() + ".png";
    a.click();
    announce("Exported page " + currentPage() + " as PNG.");
  });
  run("t-img2pdf", async () => {
    const files = $("imgpick").files;
    if (!files.length) throw new Error("Pick image files first.");
    const bufs = [];
    const kinds = [];
    for (const f of files) {
      bufs.push(new Uint8Array(await f.arrayBuffer()));
      kinds.push(f.name.toLowerCase().endsWith(".png") ? "png" : "jpg");
    }
    const out = await Content.imagesToPdf(bufs, kinds, PDFLib);
    await refreshAfterOp("images-to-pdf", { images: bufs.length }, out, "images-folio.pdf");
  });
  // convert
  run("t-pdf2text", async () => {
    requireFile();
    const texts = [];
    for (let p = 1; p <= pageCount(); p++) texts.push(await pageText(p));
    download(new Blob([toText(texts)], { type: "text/plain" }), "folio.txt", "text/plain");
  });
  run("t-pdf2md", async () => {
    requireFile();
    const texts = [];
    for (let p = 1; p <= pageCount(); p++) texts.push(await pageText(p));
    download(new Blob([toMarkdown(texts)], { type: "text/markdown" }), "folio.md", "text/markdown");
  });
  run("t-pdf2html", async () => {
    requireFile();
    const texts = [];
    for (let p = 1; p <= pageCount(); p++) texts.push(await pageText(p));
    download(new Blob([toHtml("Folio export", texts)], { type: "text/html" }), "folio.html", "text/html");
  });
  run("t-text2pdf", async () => {
    const out = await Content.textToPdf($("mdtitle2").value || "Folio note", $("mdtext").value || "Hello from Folio.", PDFLib);
    download(out, "folio-note.pdf");
  });
  // M3: OCR + Office returned with real vendored engines behind them
  // (Tesseract WASM pack, mammoth/SheetJS pack; consent-gated below).
  // convert: CSV table PDF (real renderer)
  run("t-csv2pdf", async () => {
    const csv = $("csvtext").value;
    if (!csv.trim()) throw new Error("Paste CSV rows first.");
    const r = await ConvertOps.csvToPdf(csv, PDFLib);
    $("convertreport").textContent = "CSV table PDF: " + r.spec.pageCount + " page(s), " + r.spec.cols + " col(s).";
    download(r.bytes, "folio-table.pdf");
  });
  wireOcrPack();
  wireOfficePack();
  // workflow
  run("t-info", async () => {
    const a = requireFile();
    const texts = [];
    for (let p = 1; p <= pageCount(); p++) texts.push(await pageText(p));
    const words = texts.reduce((n, t) => n + t.paragraphs.join(" ").split(/\s+/).filter(Boolean).length, 0);
    $("inforeport").textContent = "Pages: " + pageCount() + " - words: " + words + " - text items: " + texts.reduce((n, t) => n + t.count, 0) + " - bytes: " + a.bytes.length;
  });
  run("t-repair", async () => {
    const a = requireFile();
    const out = await Content.losslessResave(a.bytes, PDFLib);
    await refreshAfterOp("repair-resave", {}, out, outName("repaired"));
  });
  run("t-tts", async () => {
    requireFile();
    const t = await pageText(currentPage());
    const u = new SpeechSynthesisUtterance(t.paragraphs.map((p) => p.text).join("\n").slice(0, 2000));
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    announce("Reading page " + currentPage() + " aloud.");
  });
  // ---- Phase E: Tier 2/3 extras ----
  const extraReport = (id) => (msg) => { const el = $(id); if (el) el.textContent = msg; };
  run("t-extract", async () => {
    const a = requireFile();
    const keep = parseRanges($("ext-keep").value || "", pageCount());
    const out = await PhaseE.extractPages(a.bytes, keep, PDFLib);
    extraReport("pages-extra-report")("Extracted " + keep.length + " page(s).");
    await refreshAfterOp("extract", { keep }, out, outName("extracted"));
  });
  run("t-reorder", async () => {
    const a = requireFile();
    const order = parseOrderString($("ext-order").value, pageCount());
    const out = await Pages.reorderPages(a.bytes, order, PDFLib);
    extraReport("pages-extra-report")("Reordered to " + order.map((i) => i + 1).join(",") + ".");
    await refreshAfterOp("reorder", { order }, out, outName("reordered"));
  });
  run("t-blank", async () => {
    const a = requireFile();
    const at = parseInt($("ext-blankat").value || "1", 10) - 1;
    const out = await PhaseE.addBlankPage(a.bytes, at, PDFLib);
    extraReport("pages-extra-report")("Blank page inserted at " + (at + 1) + ".");
    await refreshAfterOp("blank-page", { at }, out, outName("blanked"));
  });
  run("t-resize", async () => {
    const a = requireFile();
    const out = await PhaseE.resizePages(a.bytes, { sizeName: $("ext-size").value, orientation: $("ext-orient").value }, PDFLib);
    extraReport("pages-extra-report")("Resized to " + $("ext-size").value + " " + $("ext-orient").value + ".");
    await refreshAfterOp("resize", { size: $("ext-size").value }, out, outName("resized"));
  });
  run("t-orient", async () => {
    const a = requireFile();
    const out = await PhaseE.orientPages(a.bytes, $("ext-orient").value, PDFLib);
    extraReport("pages-extra-report")("Orientation fixed to " + $("ext-orient").value + ".");
    await refreshAfterOp("orient", {}, out, outName("oriented"));
  });
  run("t-crop", async () => {
    const a = requireFile();
    const rect = parseRect($("ext-crop").value || "36,36,523,770");
    const out = await PhaseE.cropPages(a.bytes, rect, PDFLib);
    extraReport("pages-extra-report")("Crop box set (reversible; burn to make permanent).");
    await refreshAfterOp("crop", { rect }, out, outName("cropped"));
  });
  run("t-burncrop", async () => {
    const a = requireFile();
    const out = await PhaseE.burnCrop(a.bytes, PDFLib);
    extraReport("pages-extra-report")("Crop boxes burned into media boxes.");
    await refreshAfterOp("burn-crop", {}, out, outName("burncropped"));
  });
  run("t-bmsplit", async () => {
    const a = requireFile();
    const items = $("ext-bmtext").value.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
      const m = line.match(/^(.*)\|\s*(\d+)\s*$/);
      if (!m) throw new Error("bookmark lines look like: Title | 2");
      return { title: m[1].trim(), page: parseInt(m[2], 10) };
    });
    const groups = splitByBookmarks(pageCount(), items);
    const outs = await PhaseE.splitByBookmarkRanges(a.bytes, groups, PDFLib);
    outs.forEach((o) => download(o.bytes, "folio-" + o.title.replace(/\s+/g, "-") + ".pdf"));
    extraReport("pages-extra-report")("Split into " + outs.length + " part(s) by bookmark.");
  });
  run("t-gc", async () => {
    const a = requireFile();
    const out = await PhaseE.garbageCollect(a.bytes, PDFLib);
    extraReport("compress-extra-report")("GC rewrite: " + a.bytes.length + " -> " + out.length + " bytes (unreferenced objects dropped).");
    await refreshAfterOp("gc", {}, out, outName("gc"));
  });
  // ---- Tier 2 page ops (all real pdf-lib executors) ----
  run("t-flattenall", async () => {
    const a = requireFile();
    const out = await PhaseE.flattenAll(a.bytes, PDFLib);
    $("editreport").textContent = "Flattened: form appearances baked, annotation dicts removed.";
    await refreshAfterOp("flatten-all", {}, out, outName("flattened"));
  });
  run("t-print", async () => {
    requireFile();
    const spec = printSpec(pageCount(), false);
    $("editreport").textContent = "Print path: " + spec.pages + " page(s), " + spec.method + " (" + spec.css + "). Opening system print...";
    window.print();
  });
  run("t-rename", async () => {
    const a = requireFile();
    const pattern = $("rename-pattern").value || "{name}-{index}p";
    const files = [{ name: a.name, pages: pageCount() }];
    if (fileB) files.push({ name: fileB.name, pages: 0 });
    const { applyPattern, sanitizeFileName } = await import("../../core/pipeline/naming.js");
    const rows = batchRename(files, pattern).map((r) => ({ ...r, to: sanitizeFileName(applyPattern(r.to.replace(/\.[^.]+$/, ""), { name: r.from.replace(/\.[^.]+$/, ""), index: "1", pages: "0", date: "" })) + (r.to.match(/\.[^.]+$/) || [""])[0] }));
    download(a.bytes, rows[0].to);
    $("editreport").textContent = "Renamed: " + rows.map((r) => r.from + " -> " + r.to).join("; ");
  });
  run("t-imgreplace", async () => {
    const a = requireFile();
    const f = $("imgreplace-pick").files[0];
    if (!f) throw new Error("Pick a replacement image first.");
    const doc = await PDFLib.PDFDocument.load(a.bytes);
    const list = ImageOps.censusImages(doc, PDFLib);
    const entry = list[parseInt($("imgreplace-idx").value || "0", 10)];
    if (!entry) throw new Error("No embedded image at that index (run census first).");
    const kind = f.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const out = await PhaseE.replaceImageOverlay(a.bytes, { page: entry.page, imageBytes: new Uint8Array(await f.arrayBuffer()), kind, w: entry.width, h: entry.height }, PDFLib);
    $("imgreport").textContent = "Replaced image #" + entry.index + " on page " + (entry.page + 1) + " (overlay at census size; original XObject retained).";
    await refreshAfterOp("replace-image", { index: entry.index }, out, outName("imgreplaced"));
  });
  run("t-batch", async () => {
    const a = requireFile();
    const tool = $("batch-tool").value;
    const names = [a.name].concat(fileB ? [fileB.name] : []);
    const bufs = [a.bytes].concat(fileB ? [fileB.bytes] : []);
    let plan = batchPlan(names, tool);
    const done = [];
    setProgress(0);
    for (let i = 0; i < plan.queue.length; i++) {
      const job = plan.queue[i];
      plan.queue = batchReducer(plan.queue, job.id, "start");
      try {
        const out = tool === "scrub" ? await Content.scrubMetadata(bufs[i], PDFLib) : await Content.losslessResave(bufs[i], PDFLib);
        download(out, bufs[i] && names[i].replace(/\.pdf$/i, "") + "-batch.pdf");
        plan.queue = batchReducer(plan.queue, job.id, "ok");
        done.push(job.file + ": done");
      } catch (err) {
        plan.queue = batchReducer(plan.queue, job.id, "fail");
        done.push(job.file + ": FAILED (" + err.message + ", retry available)");
      }
      setProgress((i + 1) / plan.queue.length);
    }
    setProgress(null);
    $("batch-report").textContent = done.join("; ");
    await logJob({ jobId, tool: "batch-" + tool, params: { files: names }, output: "batch" });
  });
}

// ---- M3 OCR route: consent-gated Tesseract pack + searchable PDF ----
let ocrImage = null; // raster source picked in the OCR route (non-PDF)
let ocrWorkerBox = null; // lazy singleton {worker}
let ocrAbort = null;
let ocrResultBytes = null;
let ocrResultName = "searchable.pdf";

async function refreshOcrConsent() {
  try {
    const st = await OcrOps.ocrPackStatus();
    const mb = OcrOps.formatBytes(st.manifest.totalBytes);
    $("ocrpackinfo").textContent = st.cached
      ? "OCR pack " + mb + " cached on this device - works offline."
      : "OCR pack " + mb + " (Tesseract engine + English model). Downloads once from this site, then cached for offline reuse.";
    $("ocrpackprog").textContent = st.cached ? "Cached." : "Not downloaded.";
  } catch (e) {
    $("ocrpackinfo").textContent = "Pack status unavailable: " + e.message;
  }
}

function wireOcrPack() {
  refreshOcrConsent().catch(() => {});
  $("ocrpackbtn").onclick = async () => {
    try {
      announce("Working...");
      ocrAbort = new AbortController();
      $("ocrpackcancel").disabled = false;
      await OcrOps.ensureOcrPack(
        (p) => {
          $("ocrpackprog").textContent = p.file + ": " + ((100 * p.loaded) / p.total).toFixed(0) + "% of " + OcrOps.formatBytes(p.total);
        },
        ocrAbort.signal
      );
      $("ocrpackcancel").disabled = true;
      await refreshOcrConsent();
      announce("OCR pack ready.");
    } catch (err) {
      $("ocrpackprog").textContent = "Stopped: " + err.message;
      announce("Error: " + err.message);
    }
  };
  $("ocrpackcancel").onclick = () => {
    if (ocrAbort) ocrAbort.abort();
  };
  $("ocrfile").addEventListener("change", async () => {
    const f = $("ocrfile").files[0];
    if (!f) return;
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (/\.pdf$/i.test(f.name)) {
      ocrImage = null;
      await setFile(f.name, bytes);
    } else {
      ocrImage = { name: f.name, bytes };
      announce("Image staged for OCR: " + f.name);
    }
  });
  $("ocrrun").onclick = async () => {
    try {
      announce("Working...");
      const dpi = parseInt($("ocrdpi").value, 10) || 300;
      const st = await OcrOps.ocrPackStatus().catch(() => null);
      if (!st || !st.cached) {
        announce("Download the OCR pack first (consent card above).");
        $("ocrreport").textContent = "The OCR engine needs the on-demand pack. Review its size above, then Download.";
        return;
      }
      if (!ocrWorkerBox) {
        $("ocrreport").textContent = "Starting OCR engine...";
        ocrWorkerBox = await OcrOps.bootOcrWorker((m) => {
          $("ocrreport").textContent = "Engine: " + m.status + " " + Math.round((m.progress || 0) * 100) + "%";
        });
      }
      const t0 = performance.now();
      if (ocrImage) {
        const r = await ocrImageToSearchable(ocrImage, ocrWorkerBox.worker);
        ocrResultBytes = r.bytes;
        ocrResultName = ocrImage.name.replace(/\.[a-z]+$/i, "") + "-searchable.pdf";
        $("ocrreport").textContent = "Image OCR: " + r.words + " words, mean confidence " + r.mean.toFixed(0) + "%, " + ((performance.now() - t0) / 1000).toFixed(1) + "s.";
      } else {
        const a = requireFile();
        const perPage = [];
        let words = 0;
        let confSum = 0;
        const canvas = document.createElement("canvas");
        const n = pageCount();
        for (let p = 1; p <= n; p++) {
          $("ocrreport").textContent = "OCR page " + p + "/" + n + "...";
          await renderPageGray(p, dpi, canvas);
          const jpeg = await OcrOps.canvasJpeg(canvas);
          const dataUrl = await new Promise((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.readAsDataURL(jpeg);
          });
          const ws = await OcrOps.recognizeImage(ocrWorkerBox.worker, dataUrl, {});
          perPage.push(ws);
          words += ws.length;
          confSum += ws.reduce((s, w) => s + (w.confidence || 0), 0);
        }
        const r = await OcrOps.overlayPdfSearchLayer(a.bytes, perPage, dpi, PDFLib);
        const secs = (performance.now() - t0) / 1000;
        $("ocrreport").textContent =
          "Searchable: " + n + " page(s), " + words + " words, mean confidence " + (words ? (confSum / words).toFixed(0) : 0) + "%, " + secs.toFixed(1) + "s (" + (secs / Math.max(1, n)).toFixed(1) + "s/page).";
        await refreshAfterOp("ocr", { pages: n, words, dpi }, r.bytes, outName("searchable"));
        ocrResultBytes = r.bytes;
        ocrResultName = outName("searchable");
      }
      $("ocrdl").disabled = !ocrResultBytes;
      announce("Done.");
    } catch (err) {
      announce("Error: " + err.message);
    }
  };
  $("ocrdl").onclick = () => {
    if (ocrResultBytes) download(ocrResultBytes, ocrResultName);
  };
}

async function ocrImageToSearchable(img, worker) {
  const bmp = await createImageBitmap(new Blob([img.bytes]));
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d").drawImage(bmp, 0, 0);
  const jpeg = await OcrOps.canvasJpeg(canvas);
  const dataUrl = await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(jpeg);
  });
  const words = await OcrOps.recognizeImage(worker, dataUrl, {});
  const dpi = 200;
  const r = await OcrOps.assembleSearchablePdf(
    [{ imgBytes: await OcrOps.blobBytes(jpeg), words, wPx: canvas.width, hPx: canvas.height, dpi }],
    PDFLib
  );
  const mean = words.length ? words.reduce((s, w) => s + (w.confidence || 0), 0) / words.length : 0;
  return { bytes: r.bytes, words: words.length, mean };
}

// ---- M3 Office route: consent-gated mammoth/SheetJS pack + converters ----
let officeAbort = null;

async function refreshOfficeConsent() {
  try {
    const st = await OfficeOps.officePackStatus();
    const mb = OcrOps.formatBytes(st.manifest.totalBytes);
    $("officepackinfo").textContent = st.cached
      ? "Office pack " + mb + " cached on this device - works offline."
      : "Office pack " + mb + " (Word/Excel parsers). Downloads once from this site, then cached for offline reuse.";
    $("officepackprog").textContent = st.cached ? "Cached." : "Not downloaded.";
  } catch (e) {
    $("officepackinfo").textContent = "Pack status unavailable: " + e.message;
  }
}

function wireOfficePack() {
  refreshOfficeConsent().catch(() => {});
  $("officepackbtn").onclick = async () => {
    try {
      announce("Working...");
      officeAbort = new AbortController();
      $("officepackcancel").disabled = false;
      await OfficeOps.ensureOfficePack(
        (p) => {
          $("officepackprog").textContent = p.file + ": " + ((100 * p.loaded) / p.total).toFixed(0) + "% of " + OcrOps.formatBytes(p.total);
        },
        officeAbort.signal
      );
      $("officepackcancel").disabled = true;
      await refreshOfficeConsent();
      announce("Office pack ready.");
    } catch (err) {
      $("officepackprog").textContent = "Stopped: " + err.message;
      announce("Error: " + err.message);
    }
  };
  $("officepackcancel").onclick = () => {
    if (officeAbort) officeAbort.abort();
  };
  $("t-office2pdf").onclick = async () => {
    try {
      announce("Working...");
      const f = $("officefile").files[0];
      if (!f) throw new Error("Pick a .docx or .xlsx file first.");
      const st = await OfficeOps.officePackStatus().catch(() => null);
      if (!st || !st.cached) {
        $("officereport").textContent = "The Office parsers need the on-demand pack. Review its size above, then Download.";
        announce("Download the Office pack first (consent card above).");
        return;
      }
      await OfficeOps.ensureOfficePack(null, null);
      const buf = await f.arrayBuffer();
      let r;
      if (/\.docx$/i.test(f.name)) {
        r = await OfficeOps.docxToPdf(buf, PDFLib);
        $("officereport").textContent = "DOCX to PDF: " + r.paras + " paragraph(s) in " + r.pages + " page(s).";
        download(r.bytes, f.name.replace(/\.docx$/i, "") + "-folio.pdf");
      } else if (/\.xlsx$/i.test(f.name)) {
        r = await OfficeOps.xlsxToPdf(buf, PDFLib);
        $("officereport").textContent = "XLSX to PDF: " + r.sheets + " sheet(s) in " + r.pages + " page(s).";
        download(r.bytes, f.name.replace(/\.xlsx$/i, "") + "-folio.pdf");
      } else throw new Error("Unsupported file (need .docx or .xlsx).");
      announce("Done.");
    } catch (err) {
      announce("Error: " + err.message);
    }
  };
  $("t-pdf2docx").onclick = async () => {
    try {
      announce("Working...");
      requireFile();
      const paras = [];
      for (let p = 1; p <= pageCount(); p++) {
        const t = await pageText(p);
        for (const para of t.paragraphs) paras.push({ text: para.text, heading: 0 });
      }
      const r = OfficeOps.pdfParasToDocx(paras);
      $("officereport").textContent = "PDF to DOCX: " + r.paras + " paragraph(s), valid Word package.";
      download(new Blob([r.bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "folio-export.docx");
      announce("Done.");
    } catch (err) {
      announce("Error: " + err.message);
    }
  };
  $("t-pdf2xlsx").onclick = async () => {
    try {
      announce("Working...");
      requireFile();
      const st = await OfficeOps.officePackStatus().catch(() => null);
      if (!st || !st.cached) {
        $("officereport").textContent = "XLSX writing needs the on-demand pack. Review its size above, then Download.";
        announce("Download the Office pack first (consent card above).");
        return;
      }
      await OfficeOps.ensureOfficePack(null, null);
      const rows = [];
      for (let p = 1; p <= pageCount(); p++) {
        const t = await pageText(p);
        rows.push(["Page " + p]);
        for (const line of t.lines) rows.push([line.text]);
        rows.push([]);
      }
      const r = OfficeOps.rowsToXlsx(rows);
      $("officereport").textContent = "PDF lines to XLSX: " + r.rows + " row(s), one row per line.";
      download(new Blob([r.bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "folio-export.xlsx");
      announce("Done.");
    } catch (err) {
      announce("Error: " + err.message);
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  wire().catch((e) => {
    const st = document.getElementById("statusbar");
    if (st) st.textContent = "Startup error: " + e.message;
  });
});
