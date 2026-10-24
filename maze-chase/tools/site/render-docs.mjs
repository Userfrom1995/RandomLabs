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
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mazeRoot = resolve(here, "..", "..");
const docsDir = join(mazeRoot, "docs");
const check = process.argv.includes("--check");

const SITE_PAGES = [
  "index.html",
  "install.html",
  "downloads.html",
  "compatibility.html",
  "releases.html",
];

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
  const path = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  if (path.endsWith(".md")) return path.slice(0, -3) + ".html" + hash;
  return href;
}

function inline(text) {
  const codes = [];
  let out = String(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000CODE${codes.length - 1}\u0000`;
  });
  out = escapeHtml(out);
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_, alt, src) => `<img src="${escapeHtml(rewriteHref(src))}" alt="${escapeHtml(alt)}" loading="lazy" />`,
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_, label, href) =>
      `<a href="${escapeHtml(rewriteHref(href))}">${label}</a>`,
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>");
  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => {
    return `<code>${escapeHtml(codes[Number(index)])}</code>`;
  });
  return out;
}

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
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
  const usedIds = new Map();
  let index = 0;

  function headingId(text) {
    let id = slugify(text);
    const seen = usedIds.get(id) ?? 0;
    usedIds.set(id, seen + 1);
    if (seen > 0) id = `${id}-${seen}`;
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
      html.push(`<h${depth} id="${id}">${inline(text)}</h${depth}>`);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const header = splitRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      const head = header.map((cell) => `<th>${inline(cell)}</th>`).join("");
      const body = rows
        .map((row) => {
          const cells = header.map((_, column) => `<td>${inline(row[column] ?? "")}</td>`);
          return `<tr>${cells.join("")}</tr>`;
        })
        .join("\n");
      html.push(`<table><thead><tr>${head}</tr></thead><tbody>\n${body}\n</tbody></table>`);
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
        items.push(`<li>${inline(text)}</li>`);
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
      html.push(`<blockquote>${inline(quoted.join(" "))}</blockquote>`);
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
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
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
<a class="skip-link" href="#main">Skip to content</a>
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
    <article class="doc">
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
  const clean = link.split("#")[0].split("?")[0];
  if (!clean) return { file: fromFile, hash: link.includes("#") ? link.split("#").slice(1).join("#") : "" };
  if (/^[a-z]+:/i.test(clean) || clean.startsWith("//")) return null;
  const base = clean.startsWith("/") ? mazeRoot : dirname(fromFile);
  let path = resolve(base, clean.replace(/^\//, ""));
  if (clean.endsWith("/") || (existsSync(path) && statSync(path).isDirectory())) {
    path = join(path, "index.html");
  }
  return {
    file: path,
    hash: link.includes("#") ? link.split("#").slice(1).join("#") : "",
    raw: link,
  };
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
      if (!link || link.startsWith("#") || link.startsWith("mailto:")) continue;
      const target = targetFile(page, link);
      if (!target) continue;
      const key = `${page} -> ${link}`;
      if (checked.has(key)) continue;
      checked.add(key);
      if (!existsSync(target.file)) {
        problems.push(`${relative(mazeRoot, page)}: broken link ${link}`);
        continue;
      }
      if (target.hash) {
        const body = readFileSync(target.file, "utf8");
        const wanted = target.hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp(`id="${wanted}"`).test(body)) {
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

const pages = docPages();
const outputs = new Map();
for (const page of pages) {
  const marker = sourceMarker(page.name, page.source);
  const html = renderMarkdown(page.source, page.name);
  outputs.set(page.name, shell({ title: page.title, body: { marker, html }, pages, currentName: page.name }));
}

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
