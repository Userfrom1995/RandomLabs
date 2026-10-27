#!/usr/bin/env node
// Render maze-chase/docs/*.md into committed HTML pages for GitHub Pages,
// and verify the whole site's internal links.
//
// No dependencies, no network. The generated pages share the site shell
// (../site.css) and a documentation sidebar. Markdown support is deliberately
// small and sufficient for this tree: headings, paragraphs, ordered and
// unordered lists, fenced code, tables, inline code, bold, italic, links, and
// images. Raw HTML and blockquotes are not part of the docs contract; a source
// that introduces them fails the freshness check loudly instead of shipping
// silently mangled output.
//
// Usage:
//   node tools/site/render-docs.mjs           # write docs/*.html
//   node tools/site/render-docs.mjs --check   # fail if any page is stale or
//                                             # any internal site link is broken
//
// The generated file carries a source marker (byte length plus a 64-bit
// FNV-1a fingerprint) so the Rust site tests can prove freshness without
// running Node.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mazeRoot = resolve(here, "..", "..");
const docsDir = join(mazeRoot, "docs");
const check = process.argv.includes("--check");

// Every root HTML page is crawled, so a new page can never be invisible to
// --check just because it was not added to a hand-maintained list here.
const SITE_PAGES = readdirSync(mazeRoot)
  .filter((name) => name.endsWith(".html"))
  .sort();

// Sidebar order and short labels. Any committed doc missing from this list is
// appended by filename, so a new doc can never silently vanish from the nav.
const DOC_ORDER = [
  ["index.md", "Docs home"],
  ["web.md", "Browser guide"],
  ["desktop.md", "Desktop guide"],
  ["terminal.md", "Terminal guide"],
  ["terminal-compat.md", "Terminal compatibility"],
  ["feature-matrix.md", "Feature matrix"],
  ["parity.md", "Parity checklist"],
  ["scoreboard.md", "Release scoreboard"],
  ["release.md", "Release guide"],
  ["design.md", "Design language"],
  ["identity.md", "Identity and naming"],
  ["audio.md", "Sound identity"],
  ["research.md", "Mechanics research"],
  ["behavior-spec.md", "Behavior reference"],
  ["legal.md", "Clean-room log"],
];

function fail(message) {
  console.error(`render-docs: ${message}`);
  process.exit(1);
}

for (const arg of process.argv.slice(2)) {
  if (arg !== "--check") fail(`unknown argument: ${arg}`);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(text) {
  return text
    .replace(/`/g, "")
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function rewriteHref(href) {
  if (/^(?:[a-z]+:|\/|#)/i.test(href)) return href;
  const hashAt = href.indexOf("#");
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const query = queryAt === -1 ? "" : beforeHash.slice(queryAt);
  if (path.endsWith(".md")) return path.slice(0, -3) + ".html" + query + hash;
  return href;
}

const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);

function safeHref(href) {
  const trimmed = String(href).replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)?.[1]?.toLowerCase();
  if (scheme && !SAFE_SCHEMES.has(scheme)) return null;
  return trimmed;
}

function renderLabel(text, codes) {
  const parts = [];
  let out = String(text).replace(/\u0000CODE(\d+)\u0000/g, (_, index) => {
    parts.push(`<code>${escapeHtml(codes[Number(index)])}</code>`);
    return `\u0000LABEL${parts.length - 1}\u0000`;
  });
  out = escapeHtml(out);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>");
  return out.replace(/\u0000LABEL(\d+)\u0000/g, (_, index) => parts[Number(index)]);
}

function inline(text, sourceName) {
  const codes = [];
  const nodes = [];
  const stash = (html) => {
    nodes.push(html);
    return `\u0000NODE${nodes.length - 1}\u0000`;
  };
  let out = String(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000CODE${codes.length - 1}\u0000`;
  });
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_, alt, src) => {
      const href = safeHref(rewriteHref(src));
      if (href === null) return stash(escapeHtml(alt));
      return stash(`<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}" loading="lazy" />`);
    },
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_, label, href) => {
      const target = safeHref(rewriteHref(href));
      if (target === null) return stash(renderLabel(label, codes));
      return stash(`<a href="${escapeHtml(target)}">${renderLabel(label, codes)}</a>`);
    },
  );
  out = escapeHtml(out);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>");
  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => {
    return `<code>${escapeHtml(codes[Number(index)])}</code>`;
  });
  return out.replace(/\u0000NODE(\d+)\u0000/g, (_, index) => nodes[Number(index)]);
}

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  const cells = [];
  let current = "";
  let inCode = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === "\\" && row[index + 1] === "|") {
      current += "|";
      index += 1;
      continue;
    }
    if (char === "`") {
      inCode = !inCode;
      current += char;
      continue;
    }
    if (char === "|" && !inCode) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function isTableSeparator(line) {
  if (!line.includes("|")) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function isBlockStart(line) {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^```/.test(line) ||
    /^\s*([-*]|\d+\.)\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*(?:---+|\*\*\*+)\s*$/.test(line)
  );
}

function isTableStart(lines, index) {
  return (
    lines[index] !== undefined &&
    lines[index].includes("|") &&
    index + 1 < lines.length &&
    isTableSeparator(lines[index + 1])
  );
}

function renderMarkdown(source, sourceName) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  // Reserve the ids the docs shell already ships so a heading can never
  // duplicate `#main` or the skip link's `#doc-content` target.
  const usedIds = new Set(["main", "doc-content"]);
  let index = 0;

  function headingId(text) {
    const base = slugify(text);
    let id = base;
    let suffix = 1;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    return id;
  }

  while (index < lines.length) {
    const line = lines[index];

    if (/^\s*$/.test(line)) {
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim().split(/\s+/)[0] ?? "";
      index += 1;
      const code = [];
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) fail(`${sourceName}: unterminated code fence`);
      index += 1;
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      html.push(`<pre><code${cls}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const depth = heading[1].length;
      const text = heading[2].trim();
      const id = headingId(text);
      html.push(`<h${depth} id="${id}">${inline(text, sourceName)}</h${depth}>`);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const header = splitRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        const rowLine = index + 1;
        const row = splitRow(lines[index]);
        if (row.length !== header.length) {
          fail(`${sourceName}:${rowLine}: table row has ${row.length} cells, header has ${header.length}`);
        }
        rows.push(row);
        index += 1;
      }
      const head = header.map((cell) => `<th>${inline(cell, sourceName)}</th>`).join("");
      const body = rows
        .map((row) => {
          const cells = row.map((cell) => `<td>${inline(cell, sourceName)}</td>`);
          return `<tr>${cells.join("")}</tr>`;
        })
        .join("\n");
      html.push(`<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>\n${body}\n</tbody></table></div>`);
      continue;
    }

    const listMatch = line.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1]);
      const tag = ordered ? "ol" : "ul";
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-*]|\d+\.)\s+(.*)$/);
        if (!item || /\d+\./.test(item[1]) !== ordered) break;
        let text = item[2];
        index += 1;
        while (
          index < lines.length &&
          lines[index].trim() &&
          !/^\s*([-*]|\d+\.)\s+/.test(lines[index]) &&
          !isBlockStart(lines[index]) &&
          !isTableStart(lines, index)
        ) {
          text += " " + lines[index].trim();
          index += 1;
        }
        items.push(`<li>${inline(text, sourceName)}</li>`);
      }
      html.push(`<${tag}>\n${items.join("\n")}\n</${tag}>`);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoted = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quoted.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${inline(quoted.join(" "), sourceName)}</blockquote>`);
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index]) &&
      !isTableStart(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length === 0) {
      // Unrecognized block shape: fail loudly rather than dropping text.
      fail(`${sourceName}:${index + 1}: unsupported markdown block: ${line}`);
    }
    html.push(`<p>${inline(paragraph.join(" "), sourceName)}</p>`);
  }

  return html.join("\n");
}

function firstTitle(source, fallback) {
  const match = source.match(/^#\s+(.*)$/m);
  return match ? match[1].trim() : fallback;
}

function fnv1a(text) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of Buffer.from(text, "utf8")) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

function sourceMarker(name, source) {
  return `<!-- generated from docs/${name}; source-bytes: ${Buffer.byteLength(source, "utf8")}; source-fnv: ${fnv1a(source)} -->`;
}

function docPages() {
  const files = readdirSync(docsDir)
    .filter((name) => name.endsWith(".md"))
    .sort();
  const known = new Map(DOC_ORDER);
  const ordered = DOC_ORDER.map(([name]) => name).filter((name) => files.includes(name));
  for (const name of files) if (!ordered.includes(name)) ordered.push(name);
  return ordered.map((name) => {
    const source = readFileSync(join(docsDir, name), "utf8");
    return { name, source, title: known.get(name) ?? firstTitle(source, name) };
  });
}

function navList(pages, currentName) {
  return pages
    .map(({ name, title }) => {
      const file = name.slice(0, -3) + ".html";
      const current = name === currentName ? ' aria-current="page"' : "";
      return `<li><a href="${file}"${current}>${escapeHtml(title)}</a></li>`;
    })
    .join("\n");
}

function shell({ title, body, pages, currentName }) {
  return `<!DOCTYPE html>
${body.marker}
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Maze Chase docs: ${escapeHtml(title)}</title>
<link rel="icon" href="../web/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="../site.css" />
</head>
<body class="site">
<a class="skip-link" href="#doc-content">Skip to content</a>
<header class="site-header">
  <a class="brand" href="../index.html">Maze Chase <span>starring Rill the pond frog</span></a>
  <nav class="site-nav" aria-label="Maze Chase site">
    <a href="../index.html">Play</a>
    <a href="../install.html">Install</a>
    <a href="../downloads.html">Downloads</a>
    <a href="../compatibility.html">Compatibility</a>
    <a href="../releases.html">Releases</a>
    <a href="./">Docs</a>
  </nav>
</header>
<main class="wrap" id="main">
  <div class="docs-shell">
    <aside class="docs-nav">
      <p>All documents</p>
      <ul>
${navList(pages, currentName)}
      </ul>
      <p>Project</p>
      <ul>
        <li><a href="../index.html">Play the game</a></li>
        <li><a href="../releases.html">Release notes</a></li>
        <li><a href="../downloads.html">Downloads</a></li>
      </ul>
    </aside>
    <article class="doc" id="doc-content" tabindex="-1">
${body.html}
    </article>
  </div>
</main>
<footer class="site-footer">
  <div class="footer-inner">
    <span>Maze Chase is an original game. MIT licensed.</span>
    <a href="../index.html">Play</a>
    <a href="../install.html">Install</a>
    <a href="../releases.html">Releases</a>
    <a href="https://github.com/Userfrom1995/RandomLabs">GitHub</a>
    <span class="sep"></span>
    <span>Tracking issue <a href="https://github.com/Userfrom1995/RandomLabs/issues/582">#582</a></span>
  </div>
</footer>
</body>
</html>
`;
}

function collectLinks(file) {
  const text = readFileSync(file, "utf8");
  const links = [];
  for (const match of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
    links.push(match[1]);
  }
  return links;
}

function targetFile(fromFile, link) {
  const hashAt = link.indexOf("#");
  const hash = hashAt === -1 ? "" : link.slice(hashAt + 1);
  const pathAndQuery = hashAt === -1 ? link : link.slice(0, hashAt);
  const clean = pathAndQuery.split("?")[0];
  if (!clean) return { file: fromFile, hash };
  if (/^[a-z]+:/i.test(clean) || clean.startsWith("//")) return null;
  const base = clean.startsWith("/") ? mazeRoot : dirname(fromFile);
  let path = resolve(base, clean.replace(/^\//, ""));
  const rel = relative(mazeRoot, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return { file: path, hash, raw: link, escape: true };
  }
  if (clean.endsWith("/") || (existsSync(path) && statSync(path).isDirectory())) {
    path = join(path, "index.html");
  }
  return { file: path, hash, raw: link };
}

function idExists(body, fragment) {
  const needle = `id="${fragment}"`;
  let at = body.indexOf(needle);
  while (at !== -1) {
    const previous = at === 0 ? "" : body[at - 1];
    if (at === 0 || previous === "<" || /\s/.test(previous)) return true;
    at = body.indexOf(needle, at + 1);
  }
  return false;
}

function checkSiteLinks(pages) {
  const problems = [];
  const checked = new Set();
  for (const page of pages) {
    if (!existsSync(page)) {
      problems.push(`missing page ${relative(mazeRoot, page)}`);
      continue;
    }
    for (const link of collectLinks(page)) {
      if (!link || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(link)) continue;
      const target = targetFile(page, link);
      if (!target) continue;
      const key = `${page} -> ${link}`;
      if (checked.has(key)) continue;
      checked.add(key);
      if (target.escape) {
        problems.push(`${relative(mazeRoot, page)}: link escapes the project ${link}`);
        continue;
      }
      if (!existsSync(target.file)) {
        problems.push(`${relative(mazeRoot, page)}: broken link ${link}`);
        continue;
      }
      if (target.hash) {
        const body = readFileSync(target.file, "utf8");
        if (!idExists(body, target.hash)) {
          problems.push(`${relative(mazeRoot, page)}: missing anchor #${target.hash} in ${link}`);
        }
      }
    }
  }
  if (problems.length > 0) {
    fail(`internal site links are broken:\n  ${problems.join("\n  ")}`);
  }
  return checked.size;
}

function failOnOrphanOutputs() {
  const expected = new Set([...outputs.keys()].map((name) => name.slice(0, -3) + ".html"));
  const orphans = readdirSync(docsDir).filter((name) => name.endsWith(".html") && !expected.has(name));
  if (orphans.length > 0) {
    fail(`rendered docs have no source:
  ${orphans.map((name) => relative(mazeRoot, join(docsDir, name))).join("\n  ")}`);
  }
}

const pages = docPages();
const outputs = new Map();
for (const page of pages) {
  const markerBase = sourceMarker(page.name, page.source);
  const html = renderMarkdown(page.source, page.name);
  const draft = shell({ title: page.title, body: { marker: markerBase, html }, pages, currentName: page.name });
  const outputFnv = fnv1a(draft.replace(markerBase, ""));
  const marker = markerBase.replace(" -->", `; output-fnv: ${outputFnv} -->`);
  outputs.set(page.name, shell({ title: page.title, body: { marker, html }, pages, currentName: page.name }));
}

failOnOrphanOutputs();

if (check) {
  const stale = [];
  for (const [name, html] of outputs) {
    const out = join(docsDir, name.slice(0, -3) + ".html");
    if (!existsSync(out)) {
      stale.push(`${relative(mazeRoot, out)} is missing`);
    } else if (readFileSync(out, "utf8") !== html) {
      stale.push(`${relative(mazeRoot, out)} is stale`);
    }
  }
  if (stale.length > 0) {
    fail(`generated docs are not current; run node tools/site/render-docs.mjs\n  ${stale.join("\n  ")}`);
  }
  const generated = [...outputs.keys()].map((name) => join(docsDir, name.slice(0, -3) + ".html"));
  const site = SITE_PAGES.map((name) => join(mazeRoot, name));
  const count = checkSiteLinks([...site, ...generated]);
  console.log(`render-docs: ${outputs.size} docs current; ${count} internal links verified`);
} else {
  let written = 0;
  for (const [name, html] of outputs) {
    const out = join(docsDir, name.slice(0, -3) + ".html");
    const previous = existsSync(out) ? readFileSync(out, "utf8") : null;
    if (previous !== html) {
      writeFileSync(out, html);
      written += 1;
    }
  }
  checkSiteLinks([...SITE_PAGES.map((name) => join(mazeRoot, name)), ...[...outputs.keys()].map((name) => join(docsDir, name.slice(0, -3) + ".html"))]);
  console.log(`render-docs: ${outputs.size} docs rendered, ${written} written`);
}
