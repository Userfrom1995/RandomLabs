// Folio shell: router, ingest, pipeline bar, viewer wiring, tool dispatch.
// Hash routes: #/pages #/compress #/security #/annotate #/edit #/images
// #/forms #/ocr #/convert #/workflow. Each route lazy-runs its chunk on demand.
import { createStore, applyOp, makeOp, undo, redo } from "../../core/pipeline/ops.js";
import { initStorage, writeFile, readFile, jobPaths, backend } from "../../platform/storage/opfs.js";
import { logJob, getPref, setPref } from "../../platform/storage/history.js";
import { parseManifest, formatBytes, consentReducer } from "../../platform/packs/manifest.js";
import { initViewer, openDocument, renderPage, pageText, searchAll, setZoom, zoom, pageCount, currentPage, renderToDataUrl } from "../viewer/viewer.js";
import { buildSamplePdf } from "./sample.js";
import * as Pages from "../tools/pages-ops.js";
import * as Content from "../tools/content-ops.js";
import * as Annotate from "../tools/annotate-ops.js";
import * as EditOps from "../tools/edit-ops.js";
import * as ImageOps from "../tools/image-ops.js";
import * as FormOps from "../tools/form-ops.js";
import * as RedactOps from "../tools/redact-ops.js";
import { validateLink, simplifyInk } from "../../core/annotate/annotate.js";
import { scannerSpec } from "../../core/images/images.js";
import { toText, toMarkdown, toHtml } from "../../core/convert/writers.js";
import { PROFILES } from "../../core/compress/profiles.js";

const $ = (id) => document.getElementById(id);
const store = createStore(100);
const jobId = "job-" + Date.now().toString(36);
const paths = jobPaths(jobId);
let PDFLib = null;
let file = null; // {name, bytes}
let fileB = null; // second file (merge/insert)
let packs = {};
let ocrConsent = "idle";
let officeConsent = "idle";

function announce(msg) {
  const el = $("live");
  if (el) el.textContent = msg;
  const st = $("statusbar");
  if (st) st.textContent = msg;
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

async function setFile(name, bytes) {
  file = { name, bytes: bytes.slice ? bytes.slice(0) : bytes };
  await writeFile(paths.input(name), file.bytes);
  const info = await openDocument(file.bytes);
  await writeFile(paths.session(), file.bytes);
  $("filemeta").textContent = name + " - " + info.pages + " pages - " + (file.bytes.length / 1024).toFixed(1) + " KB (" + backend() + ")";
  $("pageinfo").textContent = "Page 1 of " + info.pages;
  await renderPage($("pagecanvas"), 1);
  await renderStrip();
  announce("Opened " + name + ", " + info.pages + " pages.");
  await logJob({ jobId, tool: "open", params: { name, pages: info.pages } });
}

async function renderStrip() {
  const n = pageCount();
  const strip = $("pagestrip");
  strip.innerHTML = "";
  for (let p = 1; p <= Math.min(n, 60); p++) {
    const b = document.createElement("button");
    b.className = "thumb" + (p === currentPage() ? " active" : "");
    b.textContent = String(p);
    b.setAttribute("aria-label", "Go to page " + p);
    b.onclick = async () => {
      await renderPage($("pagecanvas"), p);
      $("pageinfo").textContent = "Page " + p + " of " + n;
      renderStrip();
    };
    strip.appendChild(b);
  }
}

async function refreshAfterOp(tool, params, newBytes, outName) {
  const op = makeOp(tool, params, { tool, note: "bytes snapshot in OPFS session history" });
  applyOp(store, op);
  await writeFile(paths.output(outName), newBytes);
  await setFile(outName, newBytes);
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

async function loadPacks() {
  for (const id of ["ocr-pack", "office-pack"]) {
    try {
      const r = await fetch("packs/" + id + ".json");
      packs[id] = parseManifest(await r.json());
    } catch {
      packs[id] = null;
    }
  }
  ocrConsent = (await getPref("pack-ocr", "idle")) || "idle";
  officeConsent = (await getPref("pack-office", "idle")) || "idle";
  paintConsent();
}

function paintConsent() {
  const ocr = $("ocr-consent");
  if (ocr) {
    const m = packs["ocr-pack"];
    ocr.innerHTML = consentCardHtml("OCR pack", m, ocrConsent, "ocr");
  }
  const off = $("office-consent");
  if (off) {
    const m = packs["office-pack"];
    off.innerHTML = consentCardHtml("Office full-fidelity pack", m, officeConsent, "office");
  }
}

function consentCardHtml(name, manifest, state, which) {
  if (!manifest) return "<p class='muted'>Pack manifest unavailable.</p>";
  let action = "";
  if (state === "ready") action = "<span class='badge'>cached for offline reuse</span> <button data-pack='" + which + "' data-act='revoke'>Remove</button>";
  else if (state === "declined") action = "<span class='muted'>Using built-in basic version.</span> <button data-pack='" + which + "' data-act='accept'>Download pack</button>";
  else action = "<button data-pack='" + which + "' data-act='accept'>Download (" + formatBytes(manifest.bytes) + ")</button> <button data-pack='" + which + "' data-act='decline'>Use basic version</button>";
  return "<div class='consent'><strong>" + name + "</strong><span class='muted'> v" + manifest.version + " - " + formatBytes(manifest.bytes) + " - downloads once, cached for offline reuse.</span><div class='row'>" + action + "</div></div>";
}

async function wire() {
  await initStorage();
  PDFLib = window.PDFLib;
  if (!PDFLib) {
    const m = await import("../vendor-shim.js").catch(() => null);
    void m;
    throw new Error("pdf-lib failed to load");
  }
  await initViewer("vendor/pdf.worker.mjs");
  await loadPacks();
  renderChain();

  const dz = $("dropzone");
  const pick = $("filepick");
  const pickB = $("filepickB");
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
    if (f) await setFile(f.name, new Uint8Array(await f.arrayBuffer()));
  });
  pickB.addEventListener("change", async () => {
    const f = pickB.files[0];
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
  };
  $("zoomout").onclick = async () => {
    setZoom(zoom() - 0.25);
    await renderPage($("pagecanvas"), currentPage());
  };
  $("prevpage").onclick = async () => {
    await renderPage($("pagecanvas"), currentPage() - 1);
    $("pageinfo").textContent = "Page " + currentPage() + " of " + pageCount();
    renderStrip();
  };
  $("nextpage").onclick = async () => {
    await renderPage($("pagecanvas"), currentPage() + 1);
    $("pageinfo").textContent = "Page " + currentPage() + " of " + pageCount();
    renderStrip();
  };
  $("searchbtn").onclick = async () => {
    const hits = await searchAll($("searchbox").value);
    $("searchhits").textContent = hits.length + " hits" + (hits.length ? ": " + hits.slice(0, 5).map((h) => "p." + h.page).join(", ") : "");
    announce(hits.length + " search hits.");
  };

  // pipeline undo/redo/export
  $("undobtn").onclick = () => {
    const inv = undo(store);
    announce(inv ? "Undid " + inv.tool + " (record only; re-export from history to restore bytes)." : "Nothing to undo.");
    renderChain();
  };
  $("redobtn").onclick = () => {
    const op = redo(store);
    announce(op ? "Redid " + op.tool + "." : "Nothing to redo.");
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
  wireConsent();

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch { /* offline shell optional */ }
  }
  announce("Folio ready. Load the sample or drop a PDF.");
}

function showRoute() {
  const h = location.hash || "#/pages";
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

function wireConsent() {
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-pack]");
    if (!b) return;
    const which = b.getAttribute("data-pack");
    const act = b.getAttribute("data-act");
    const key = which === "ocr" ? "pack-ocr" : "pack-office";
    if (which === "ocr") {
      ocrConsent = consentReducer(ocrConsent === "ready" && act === "revoke" ? "ready" : ocrConsent, act === "accept" ? "accept" : act === "decline" ? "decline" : act);
      if (act === "accept") {
        // Packs are placeholders in Phase A: record consent, stay on fallback.
        ocrConsent = "declined";
        announce("OCR engine pack ships in Phase C; basic text layer shown for now.");
      } else if (act === "decline") ocrConsent = "declined";
      else if (act === "revoke") ocrConsent = "idle";
      await setPref(key, ocrConsent);
    } else {
      if (act === "accept") {
        officeConsent = "declined";
        announce("Office pack ships in Phase D; fallback conversion shown for now.");
      } else if (act === "decline") officeConsent = "declined";
      else if (act === "revoke") officeConsent = "idle";
      await setPref(key, officeConsent);
    }
    paintConsent();
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
    $("compressreport").textContent = "Profiles: " + Object.keys(PROFILES).map((k) => k + " " + PROFILES[k].dpi + "dpi/q" + PROFILES[k].q).join(" - ") + ". Lossless resave: " + before + " -> " + out.length + " bytes (" + (100 * out.length / before).toFixed(1) + "%). Rasterize-on-image-pages ships in Phase C.";
    await refreshAfterOp("compress-lossless", { before, after: out.length }, out, outName("optimized"));
  });
  run("t-scrub", async () => {
    const a = requireFile();
    const out = await Content.scrubMetadata(a.bytes, PDFLib);
    await refreshAfterOp("scrub", {}, out, outName("scrubbed"));
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
  run("t-redact", async () => {
    const a = requireFile();
    const pg = parseInt($("rdpage").value || "1", 10) - 1;
    const region = { page: pg, x: parseFloat($("rdx").value), y: parseFloat($("rdy").value), w: parseFloat($("rdw").value), h: parseFloat($("rdh").value) };
    const extra = $("rdextra").value.split(",").map((s) => s.trim()).filter(Boolean);
    const maps = await textMapsFor([pg]);
    const r = await RedactOps.burnInRedact(a.bytes, { regions: [region], extraStrings: extra }, maps, PDFLib);
    $("redactreport").textContent = r.acceptance.pass
      ? "PASS: extraction over region empty, " + r.strings.length + " string(s) scrubbed from content streams (" + r.strings.map((s) => JSON.stringify(s)).join(", ") + ")."
      : "FAIL: " + JSON.stringify(r.acceptance) + ". Kept-text damage avoided; adjust the region.";
    if (!r.acceptance.pass) throw new Error("redact acceptance failed");
    await refreshAfterOp("redact", { region }, r.bytes, outName("redacted"));
  });
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
    const r = await EditOps.bakeMarkup(a.bytes, PDFLib);
    $("annotreport").textContent = r.baked + " markup annotation(s) baked into content.";
    await refreshAfterOp("bake-markup", { baked: r.baked }, r.bytes, outName("baked"));
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
    const out = await Annotate.drawShape(a.bytes, { page: currentPage() - 1, kind: $("shapekind").value, ...r }, PDFLib);
    await refreshAfterOp("shape", { kind: $("shapekind").value }, out, outName("shaped"));
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
    const r = await Annotate.deleteAnnotations(a.bytes, {}, PDFLib);
    $("annotreport").textContent = r.removed + " annotation(s) removed.";
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
    const out = await Annotate.addInk(a.bytes, { page: currentPage() - 1, strokes: strokes.map((s) => simplifyInk(s)) }, PDFLib);
    await refreshAfterOp("ink", { strokes: strokes.length }, out, outName("inked"));
  });
  // ---- Phase B: edit (E6-E7, N-up/booklet/overlay, compare) ----
  run("t-findreplace", async () => {
    const a = requireFile();
    const maps = await textMapsFor();
    const r = await EditOps.findReplace(a.bytes, { query: $("frquery").value, replacement: $("frrepl").value }, maps, PDFLib);
    $("editreport").textContent = r.count + " occurrence(s) replaced.";
    await refreshAfterOp("find-replace", { q: $("frquery").value }, r.bytes, outName("replaced"));
  });
  run("t-pedit", async () => {
    const a = requireFile();
    const maps = await textMapsFor([currentPage() - 1]);
    const r = await EditOps.editParagraph(a.bytes, { matchText: $("pematch").value, newText: $("penew").value, page: currentPage() - 1 }, maps, PDFLib);
    $("editreport").textContent = "Edited on page " + (r.page + 1) + (r.overflow ? " (overflow: text continues past the paragraph box)." : ".");
    await refreshAfterOp("paragraph-edit", { match: $("pematch").value }, r.bytes, outName("edited"));
  });
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
  // workflow
  run("t-info", async () => {
    const a = requireFile();
    const texts = [];
    for (let p = 1; p <= pageCount(); p++) texts.push(await pageText(p));
    const words = texts.reduce((n, t) => n + t.paragraphs.join(" ").length, 0);
    $("inforeport").textContent = "Pages: " + pageCount() + " - text items: " + texts.reduce((n, t) => n + t.count, 0) + " - bytes: " + a.bytes.length;
    void words;
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
}

document.addEventListener("DOMContentLoaded", () => {
  wire().catch((e) => {
    const st = document.getElementById("statusbar");
    if (st) st.textContent = "Startup error: " + e.message;
  });
});
