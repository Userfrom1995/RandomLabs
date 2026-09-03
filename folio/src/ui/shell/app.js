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
import * as Security from "../tools/security-ops.js";
import * as Compress from "../tools/compress-ops.js";
import * as OcrOps from "../tools/ocr-ops.js";
import * as ConvertOps from "../tools/convert-ops.js";
import * as PhaseE from "../tools/phaseE-ops.js";
import { splitByBookmarks, parseOrderString, downsampleSpec, grayscalePlan, pdfaRecord, signatureValidateReport, batchRename, deskewSpec, printSpec, batchPlan, batchReducer } from "../../core/tier2/tier2.js";
import { validateLink, simplifyInk } from "../../core/annotate/annotate.js";
import { scannerSpec } from "../../core/images/images.js";
import { toText, toMarkdown, toHtml } from "../../core/convert/writers.js";

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
let officeEngine = null; // V3 pack module once consent-loaded
let officeFile = null; // picked Office file for V3/V4 conversion

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

const undoBytes = []; // true undo: prior file bytes per op (cap 20)
const redoBytes = [];
async function refreshAfterOp(tool, params, newBytes, outName) {
  const op = makeOp(tool, params, { tool, note: "true undo via in-memory byte snapshot" });
  if (file) {
    undoBytes.push({ tool, bytes: file.bytes });
    if (undoBytes.length > 20) undoBytes.shift();
  }
  redoBytes.length = 0;
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
  const ob = $("officebanner");
  if (ob && !ob.textContent) {
    if (officeConsent === "ready") ob.textContent = "Full-fidelity pack ready: headings, tables, and slide structure preserved.";
    else if (officeConsent === "declined") ob.textContent = ConvertOps.fallbackBanner("", "").note;
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

// V3 pack fetch: same-origin bytes, size check, sha256 check, then ESM load.
async function loadOfficePack(manifest) {
  if (!manifest || !manifest.files || !manifest.files.length) throw new Error("office pack manifest has no files");
  const res = await fetch("packs/" + manifest.files[0]);
  if (!res.ok) throw new Error("pack fetch failed: HTTP " + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (manifest.bytes > 0 && buf.length !== manifest.bytes) throw new Error("pack size mismatch (manifest " + manifest.bytes + ", got " + buf.length + ")");
  if (manifest.sha256 && !String(manifest.sha256).startsWith("pending-") && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex !== String(manifest.sha256).toLowerCase()) throw new Error("pack sha256 mismatch");
  }
  officeEngine = await import("../../../packs/office-engine.js");
  return officeEngine;
}

async function wire() {
  await initStorage();
  PDFLib = window.PDFLib;
  if (!PDFLib) throw new Error("pdf-lib failed to load (vendor/pdf-lib.min.js missing or blocked)");
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
  const offPick = $("officepick");
  if (offPick) offPick.addEventListener("change", async () => {
    const f = offPick.files[0];
    if (f) {
      officeFile = { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) };
      $("officereport").textContent = "Office file: " + f.name + " (" + f.size + " bytes).";
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
        // OCR-PACK engine (Tesseract LSTM) vendors in Phase D; consent recorded, fallback stays.
        ocrConsent = "declined";
        announce("OCR engine pack is not vendored yet; paste recognized words to bake the invisible layer, or use the basic text export.");
      } else if (act === "decline") ocrConsent = "declined";
      else if (act === "revoke") ocrConsent = "idle";
      await setPref(key, ocrConsent);
    } else {
      if (act === "accept") {
        try {
          announce("Downloading Office full-fidelity pack...");
          await loadOfficePack(packs["office-pack"]);
          officeConsent = "ready";
          announce("Office pack ready: headings, tables, and slide structure preserved. Cached for offline reuse.");
        } catch (err) {
          officeConsent = "idle";
          announce("Pack download failed: " + err.message + " - try again or use the basic version.");
        }
      } else if (act === "decline") {
        officeConsent = "declined";
        officeEngine = null;
        announce("Using the built-in basic version (pagination approximate, styles simplified).");
      } else if (act === "revoke") {
        officeConsent = "idle";
        officeEngine = null;
      }
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
  function readPerms() {
    return { print: $("pm-print").checked, modify: $("pm-modify").checked, copy: $("pm-copy").checked, annotate: $("pm-annotate").checked };
  }
  run("t-encrypt", async () => {
    const a = requireFile();
    const pw = $("pw1").value;
    if (!pw) throw new Error("Enter a password first.");
    const r = await Security.encryptEnvelope(a.bytes, pw, readPerms());
    $("pw1").value = "";
    $("pwreport").textContent = "Encrypted " + a.bytes.length + " -> " + r.bytes.length + " bytes (" + r.descriptor.cipher + "). Opens only in Folio.";
    download(r.bytes, outName("encrypted") + ".folio-enc");
    await logJob({ jobId, tool: "encrypt", params: { perms: r.descriptor.perms }, output: "envelope" });
  });
  run("t-decrypt", async () => {
    const a = requireFile();
    const pw = $("pw1").value;
    if (!pw) throw new Error("Enter the envelope password first.");
    if (!Security.isEnvelope(a.bytes)) throw new Error("This file is not a Folio envelope; nothing to unlock.");
    const r = await Security.decryptEnvelope(a.bytes, pw, jobId);
    $("pw1").value = "";
    $("pwreport").textContent = "Unlocked (" + r.bytes.length + " bytes, perms " + JSON.stringify(r.descriptor.perms) + ").";
    await refreshAfterOp("decrypt", {}, r.bytes, outName("unlocked"));
  });
  run("t-rekey", async () => {
    const a = requireFile();
    const oldPw = Security.isEnvelope(a.bytes) ? $("pw1").value : null;
    const nw = $("pwnew").value;
    if (!nw) throw new Error("Enter a new password first.");
    const r = await Security.changePassword(a.bytes, oldPw, nw, readPerms());
    $("pw1").value = "";
    $("pwnew").value = "";
    $("pwreport").textContent = "Re-encrypted under a new password (" + r.bytes.length + " bytes).";
    download(r.bytes, outName("rekeyed") + ".folio-enc");
  });
  run("t-sign", async () => {
    const a = requireFile();
    const out = await Security.signatureStamp(a.bytes, { page: currentPage() - 1, text: $("signtext").value || "Signed", x: 56, y: 140 }, PDFLib);
    $("signreport").textContent = "Signature stamp placed on page " + currentPage() + ".";
    await refreshAfterOp("sign-stamp", {}, out, outName("signed"));
  });
  run("t-certsig", async () => {
    const a = requireFile();
    const r = await Security.certSignPlaceholder(a.bytes, { page: currentPage() - 1, text: $("signtext").value || "Signed", x: 56, y: 140 }, PDFLib);
    $("signreport").textContent = r.banner + " ByteRange " + JSON.stringify(r.spec.ByteRange) + ".";
    await refreshAfterOp("cert-sign-placeholder", {}, r.bytes, outName("sig appearance"));
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
  // OCR layer (C1, C3)
  run("t-ocrscan", async () => {
    requireFile();
    const empty = [];
    for (let p = 1; p <= pageCount(); p++) {
      const t = await pageText(p);
      if (t.count === 0) empty.push(p);
    }
    $("ocrreport").textContent = empty.length
      ? "Scanned (zero-text) pages: " + empty.join(", ") + ". " + OcrOps.HANDWRITING_NOTE
      : "No scanned pages: every page already has extractable text.";
  });
  run("t-ocrlayer", async () => {
    const a = requireFile();
    let spec;
    try {
      spec = JSON.parse($("ocrwords").value || "[]");
    } catch {
      throw new Error("OCR words JSON does not parse");
    }
    const pages = Array.isArray(spec) ? spec : [spec];
    const norm = pages.map((pw) => ({
      page: (pw.page || 1) - 1,
      words: (pw.words || []).map((w) => ({ text: w.text, x: w.x, y: w.y, size: w.size || 12 })),
    }));
    const r = await OcrOps.applyOcrLayer(a.bytes, norm, PDFLib);
    $("ocrreport").textContent = "Baked " + r.placed + " invisible (mode-3) words. Search the viewer to verify.";
    await refreshAfterOp("ocr-layer", { placed: r.placed }, r.bytes, outName("ocr"));
  });
  // convert core writers (V8-V10, V2, V11)
  async function docTextsFor() {
    const texts = [];
    for (let p = 1; p <= pageCount(); p++) texts.push(await pageText(p));
    return texts;
  }
  run("t-pdf2docx", async () => {
    requireFile();
    const out = ConvertOps.pdfToDocx(await docTextsFor());
    download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "folio.docx", "application/octet-stream");
    $("convertreport").textContent = "DOCX written (" + out.length + " bytes, core fallback layout).";
  });
  run("t-pdf2xlsx", async () => {
    requireFile();
    const { findColumns } = await import("../../core/textmap/tables.js");
    const tables = [];
    for (let p = 1; p <= pageCount(); p++) {
      const t = await pageText(p);
      const lines = t.lines || [];
      const cols = findColumns(lines.flatMap((l) => l.words || []), 20);
      if (cols.length > 1) tables.push([lines.map((l) => l.text.split(/\s{2,}|\t/).slice(0, 8))]);
    }
    const out = ConvertOps.pdfToXlsx(tables);
    download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "folio.xlsx", "application/octet-stream");
    $("convertreport").textContent = "XLSX written (" + out.length + " bytes, " + tables.length + " table page(s)).";
  });
  run("t-pdf2pptx", async () => {
    requireFile();
    const out = ConvertOps.pdfToPptx(await docTextsFor());
    download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }), "folio.pptx", "application/octet-stream");
    $("convertreport").textContent = "PPTX written (" + out.length + " bytes, one slide per page).";
  });
  run("t-pdf2csv", async () => {
    requireFile();
    const { findColumns } = await import("../../core/textmap/tables.js");
    const tables = [];
    for (let p = 1; p <= pageCount(); p++) {
      const t = await pageText(p);
      const lines = t.lines || [];
      if (findColumns(lines.flatMap((l) => l.words || []), 20).length > 1) tables.push([lines.map((l) => l.text.split(/\s{2,}|\t/).slice(0, 8))]);
    }
    download(new Blob([ConvertOps.pdfToCsv(tables)], { type: "text/csv" }), "folio.csv", "text/csv");
    $("convertreport").textContent = "CSV written (" + tables.length + " table page(s)).";
  });
  run("t-csv2pdf", async () => {
    const csv = $("csvtext").value;
    if (!csv.trim()) throw new Error("Paste CSV rows first.");
    const r = await ConvertOps.csvToPdf(csv, PDFLib);
    $("convertreport").textContent = "CSV table PDF: " + r.spec.pageCount + " page(s), " + r.spec.cols + " col(s).";
    download(r.bytes, "folio-table.pdf");
  });
  run("t-url2pdf", async () => {
    const spec = ConvertOps.urlImportSpec($("urltext").value);
    $("convertreport").textContent = "URL import: " + spec.href + " (" + (spec.sameOrigin ? "same-origin, fetch + print path" : "cross-origin: needs CORS, then print path") + "). " + spec.note + ".";
  });
  // Office to PDF (V3 pack / V4 fallback behind one consent card)
  run("t-office2pdf", async () => {
    if (!officeFile) throw new Error("Pick an Office file (.docx/.xlsx/.pptx) first.");
    const route = ConvertOps.routeOfficeConvert({ consent: officeConsent, packReady: !!officeEngine });
    if (route === "prompt") throw new Error("Choose Download pack or Use basic version above first.");
    let inflater = null;
    if (typeof DecompressionStream !== "undefined") {
      inflater = async (comp) => {
        const ds = new DecompressionStream("deflate-raw");
        const stream = new Blob([comp]).stream().pipeThrough(ds);
        return new Uint8Array(await new Response(stream).arrayBuffer());
      };
    }
    const r = await ConvertOps.officeToPdf(officeFile.bytes, officeFile.name, PDFLib, {
      engine: route === "pack" ? officeEngine : null,
      inflater,
    });
    $("officebanner").textContent = (r.mode === "pack" ? "Full-fidelity pack: " : "Basic version: ") + r.banner;
    $("officereport").textContent = "Office to PDF (" + r.mode + "): " + r.pages + " page(s), " + r.bytes.length + " bytes.";
    await refreshAfterOp("office2pdf", { mode: r.mode }, r.bytes, officeFile.name.replace(/\.(docx|xlsx|pptx)$/i, "") + "-converted.pdf");
  });
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
  run("t-gray", async () => {
    const a = requireFile();
    const plan = grayscalePlan(Array.from({ length: pageCount() }, (_, i) => i), 1);
    const out = await PhaseE.grayscaleStamp(a.bytes, PDFLib);
    extraReport("compress-extra-report")("Grayscale intent stamped (" + plan.pages.length + " pages); pixel re-encode runs per image on the browser canvas path.");
    await refreshAfterOp("grayscale", {}, out, outName("gray"));
  });
  run("t-downsample", async () => {
    const spec = downsampleSpec(parseInt($("down-dpi").value, 10));
    extraReport("compress-extra-report")("Downsample target " + spec.dpi + " DPI (scale " + spec.scale.toFixed(2) + "): " + spec.method + ". Use profile-gated compress above to apply.");
  });
  run("t-pdfa", async () => {
    const a = requireFile();
    const rec = pdfaRecord($("pdfa-level").value);
    const out = await PhaseE.pdfaStamp(a.bytes, rec.level, PDFLib);
    extraReport("compress-extra-report")("PDF/A subset (" + rec.level + "): fonts embedded, JS/actions stripped, XMP intent set.");
    await refreshAfterOp("pdfa", { level: rec.level }, out, outName("pdfa"));
  });
  run("t-linearize", async () => {
    extraReport("compress-extra-report")(PhaseE.linearizeNote());
  });
  run("t-certvalidate", async () => {
    const a = requireFile();
    const r = signatureValidateReport(false, false);
    $("signreport").textContent = "No embedded CMS signature census in v1: treating as unsigned (" + r.summary + "). Digest recompute runs on signed files once a PKI vendor lands.";
    void a;
  });
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
  run("t-attach", async () => {
    const a = requireFile();
    const f = $("attach-pick").files[0];
    if (!f) throw new Error("Pick a file to attach first.");
    const buf = new Uint8Array(await f.arrayBuffer());
    await writeFile(paths.input("attach-" + f.name), buf);
    const out = await PhaseE.attachNote(a.bytes, f.name, PDFLib);
    $("editreport").textContent = "Attached " + f.name + " (" + buf.length + " bytes, OPFS sidecar + registry).";
    await refreshAfterOp("attach", { name: f.name }, out, outName("attached"));
  });
  run("t-attachlist", async () => {
    const a = requireFile();
    const doc = await PDFLib.PDFDocument.load(a.bytes);
    const list = PhaseE.listAttachNotes(doc.getSubject());
    $("editreport").textContent = list.length ? "Attachments: " + list.join(", ") : "No attachments.";
  });
  run("t-attachextract", async () => {
    const name = $("attach-name").value.trim();
    if (!name) throw new Error("Enter an attachment name first.");
    const buf = await readFile(paths.input("attach-" + name));
    if (!buf) throw new Error("No sidecar bytes for " + name + " in this session.");
    download(buf, name, "application/octet-stream");
    $("editreport").textContent = "Extracted " + name + " (" + buf.length + " bytes).";
  });
  run("t-attachdel", async () => {
    const a = requireFile();
    const name = $("attach-name").value.trim();
    if (!name) throw new Error("Enter an attachment name first.");
    const out = await PhaseE.detachNote(a.bytes, name, PDFLib);
    $("editreport").textContent = "Detached " + name + " (registry removed; sidecar retained in workspace).";
    await refreshAfterOp("detach", { name }, out, outName("detached"));
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
  run("t-deskew", async () => {
    requireFile();
    const spec = deskewSpec(parseFloat($("deskew-angle").value || "0"), false);
    $("ocrreport").textContent = "Deskew pre-pass (C2): angle " + spec.angleDeg + "deg - " + spec.note + ". Canvas auto-orient runs at bake time in the OCR pack.";
  });
  run("t-batch", async () => {
    const a = requireFile();
    const tool = $("batch-tool").value;
    const names = [a.name].concat(fileB ? [fileB.name] : []);
    const bufs = [a.bytes].concat(fileB ? [fileB.bytes] : []);
    let plan = batchPlan(names, tool);
    const done = [];
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
    }
    $("batch-report").textContent = done.join("; ");
    await logJob({ jobId, tool: "batch-" + tool, params: { files: names }, output: "batch" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wire().catch((e) => {
    const st = document.getElementById("statusbar");
    if (st) st.textContent = "Startup error: " + e.message;
  });
});
