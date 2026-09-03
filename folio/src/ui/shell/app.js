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
  run("t-redact-note", async () => {
    announce("True burn-in redaction (content-stream filter) ships in Phase B. Overlay-only redaction is deliberately NOT offered.");
  });
  // annotate/edit
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
