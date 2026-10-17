// Tester docs-language guard (issue #596 sweep): the public doom surfaces
// must stay free of internal milestone codes, milestone counters, and em/en
// dashes so the shipped documentation keeps one unified product voice.
// Prose (README plus docs markdown) gets the full check; the shell file gets
// the milestone and dash checks. Headless file-text pins only (node:test).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function collect(rel) {
  const abs = join(root, rel);
  if (!statSync(abs).isDirectory()) return [rel];
  return readdirSync(abs)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => join(rel, name));
}

const prose = ["README.md", "docs"].flatMap(collect);
const shell = ["index.html"];

function offenses(files, probe) {
  const hits = [];
  for (const rel of files) {
    readFileSync(join(root, rel), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (probe(line)) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
  }
  return hits;
}

describe("tester docs-language guard: doom public surfaces", () => {
  it("prose carries no bare milestone codes", () => {
    const hits = offenses(prose, (line) => /\bM[0-9]\b/.test(line));
    assert.deepEqual(hits, [], `milestone codes back in public docs:\n${hits.join("\n")}`);
  });

  it("prose and shell carry no milestone wording or phase counters", () => {
    const hits = offenses(
      [...prose, ...shell],
      (line) => /[Mm]ilestone/.test(line) || /\b[Pp]hase\s+[0-9]/.test(line),
    );
    assert.deepEqual(hits, [], `milestone wording back in public docs:\n${hits.join("\n")}`);
  });

  it("prose and shell carry no em or en dashes", () => {
    const hits = offenses([...prose, ...shell], (line) => /[\u2013\u2014]/.test(line));
    assert.deepEqual(hits, [], `em/en dash in public docs:\n${hits.join("\n")}`);
  });
});
