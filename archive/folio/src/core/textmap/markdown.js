// Folio markdown inference (V6): font-size histogram headings, bullet lists,
// table passthrough. Headless.
export function inferMarkdown(paragraphs, bodySize) {
  const sizes = paragraphs.flatMap((p) => p.lines.map((l) => l.size));
  const sorted = [...sizes].sort((a, b) => a - b);
  const body = bodySize || sorted[Math.floor(sorted.length / 2)] || 12;
  return paragraphs
    .map((p) => {
      const txt = p.text.trim();
      if (!txt) return "";
      const maxSize = Math.max(...p.lines.map((l) => l.size));
      if (/^(.+)\n=+$/s.test(txt)) return "# " + txt.split("\n")[0];
      if (maxSize >= body * 1.5) return "# " + txt.replace(/\n/g, " ");
      if (maxSize >= body * 1.25) return "## " + txt.replace(/\n/g, " ");
      if (/^(\s*)([*•\-–\d+[.)\]])\s+/.test(txt)) {
        return txt
          .split("\n")
          .map((l) => "- " + l.replace(/^(\s*)([*•\-–\d+[.)\]])\s+/, ""))
          .join("\n");
      }
      return txt.replace(/\n(?!\n)/g, " ");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function markdownToHtml(md) {
  return md
    .split("\n\n")
    .map((b) => {
      if (b.startsWith("# ")) return "<h1>" + escapeHtml(b.slice(2)) + "</h1>";
      if (b.startsWith("## ")) return "<h2>" + escapeHtml(b.slice(3)) + "</h2>";
      if (b.startsWith("- ")) return "<ul>" + b.split("\n").map((l) => "<li>" + escapeHtml(l.replace(/^- /, "")) + "</li>").join("") + "</ul>";
      return "<p>" + escapeHtml(b) + "</p>";
    })
    .join("\n");
}
