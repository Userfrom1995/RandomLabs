// Folio convert-from-PDF writers (V5-V9 core): text, markdown, html, csv.
import { inferMarkdown, markdownToHtml } from "../../core/textmap/markdown.js";
export { inferMarkdown, markdownToHtml };

export function toText(docTexts) {
  return docTexts.map((p, i) => "--- page " + (i + 1) + " ---\n" + p.paragraphs.map((q) => q.text).join("\n\n")).join("\n\n");
}

export function toMarkdown(docTexts) {
  return docTexts.map((p, i) => "# Page " + (i + 1) + "\n\n" + inferMarkdown(p.paragraphs)).join("\n\n");
}

export function toHtml(title, docTexts) {
  const body = docTexts
    .map((p, i) => "<section><h2>Page " + (i + 1) + "</h2>\n" + markdownToHtml(inferMarkdown(p.paragraphs)) + "</section>")
    .join("\n");
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" + title + "</title></head><body>" + body + "</body></html>";
}
