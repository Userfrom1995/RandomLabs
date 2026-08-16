/* Headless tests for the web UI rendering layer: the pure helpers in js/ui.js
 * (byte-offset mapping, snippet markup, doc-term spans) run against the real
 * exported index, mirroring what the browser renders. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(import.meta.url);

const Meridian = require(join(root, 'js/meridian.js'));
const ui = require(join(root, 'js/ui.js'));

const indexJson = JSON.parse(readFileSync(join(root, 'data/index.json'), 'utf8'));
const index = Meridian.loadIndex(indexJson);

let checks = 0;
let failed = 0;

function ok(cond, msg) {
  checks++;
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
}

/* 1. byteToCharIndex: UTF-8 offsets -> JS string indices. */
{
  const text = 'café café';
  // bytes: c(1)a(1)f(1)é(2)sp(1)c(1)a(1)f(1)é(2) = 11 bytes, 9 chars.
  ok(ui.byteToCharIndex(text, 0) === 0, 'byte 0 -> char 0');
  ok(ui.byteToCharIndex(text, 3) === 3, 'byte 3 (é start) -> char 3');
  ok(ui.byteToCharIndex(text, 5) === 4, 'byte 5 (space) -> char 4');
  ok(ui.byteToCharIndex(text, 6) === 5, 'byte 6 (2nd café) -> char 5');
  ok(ui.byteToCharIndex(text, 11) === 9, 'byte 11 (end) -> char 9');
  ok(ui.byteToCharIndex(text, 99) === 9, 'past end clamps to last char');
}

/* 2. renderSnippet: markup matches the engine's byte ranges, incl. UTF-8. */
{
  const plan = Meridian.parseQuery('café');
  const opts = { stem: false, signals: true };
  const hit = Meridian.search(index, 'bm25', opts, plan, 10);
  ok(hit.length > 0, 'café is searchable');
  if (hit.length) {
    const h = hit[0];
    const doc = index.docs[h.docId];
    const text = readFileSync(join(root, doc.url), 'utf8');
    const snip = Meridian.generateSnippet(text, Meridian.scoredTerms(plan), 220);
    const html = ui.renderSnippet(snip);
    const marks = (html.match(/<mark>/g) || []).length;
    ok(marks === snip.highlights.length, 'one <mark> per highlight');
    // Reconstruct: strip markup and confirm it equals the snippet text exactly.
    const stripped = html.replace(/<mark>/g, '').replace(/<\/mark>/g, '');
    ok(stripped === snip.text, 'markup round-trips to snippet text');
    // Every highlighted slice must be one of the query terms.
    const m = html.match(/<mark>([^<]*)<\/mark>/g) || [];
    const okTerms = m.every((x) => x === '<mark>café</mark>');
    ok(okTerms, 'highlight content is the matched term');
  }
}

/* 3. termSpansIn: word-bound spans with UTF-8 correctness. */
{
  const text = "the a's and café thing, café-time.";
  const spans = ui.termSpansIn(text, ['café', 'thing']);
  ok(spans.length === 3, 'finds café, café, thing (' + JSON.stringify(spans) + ')');
  const slice = (s, e) => Buffer.from(text, 'utf8').subarray(s, e).toString('utf8');
  const words = spans.map((sp) => slice(sp[0], sp[1]));
  ok(words.includes('café') && words.includes('thing'), 'span slices are whole words: ' + words.join(','));
  // byte offsets must be consistent with byteToCharIndex
  for (const sp of spans) {
    const cs = ui.byteToCharIndex(text, sp[0]);
    const ce = ui.byteToCharIndex(text, sp[1]);
    ok(text.slice(cs, ce).toLowerCase() === slice(sp[0], sp[1]).toLowerCase(), 'byte/char slices agree');
  }
}

/* 4. escapes are applied to user-controlled text. */
{
  ok(ui.escapeHtml('<b>&"x"') === '&lt;b&gt;&amp;&quot;x&quot;', 'HTML escaped');
}

/* 5. suggestions-scale vocabulary lookup used by the UI is intact. */
{
  ok(index.terms.has('seismic'), 'seismic term present');
  ok(index.terms.has('rust'), 'rust term present');
}

/* 6. new retrieval features exposed to the UI: fuzzy, stem, suggestions. */
{
  const opts = { stem: false, signals: true };
  const fuzzy = Meridian.search(index, 'bm25', opts, Meridian.parseQuery('engine~'), 5);
  ok(fuzzy.length > 0, 'fuzzy engine~ finds results');
  const stemOpts = { stem: true, signals: true };
  const st = Meridian.search(index, 'bm25', stemOpts, Meridian.parseQuery('ranking'), 5);
  ok(st.length > 0, 'stem expansion finds results');
  const sug = Meridian.suggestions(index, Meridian.parseQuery('qjuick brwn'));
  ok(Array.isArray(sug) && sug.length > 0, 'did-you-mean suggestions returned');
  ok(sug.includes('quick'), 'suggests "quick" for qjuick');
}

/* 7. breakdown rows expose the title flag for the UI. */
{
  const opts = { stem: false, signals: true };
  const hit = Meridian.search(index, 'bm25', opts, Meridian.parseQuery('search'), 1)[0];
  ok(Array.isArray(hit.breakdown), 'breakdown is an array');
  const prox = hit.breakdown.find((b) => b.term === '(proximity)');
  ok(prox === undefined || typeof prox.score === 'number', 'proximity row typed');
  const sum = hit.breakdown.reduce((a, b) => a + b.score, 0);
  ok(Math.abs(sum - hit.score) < 1e-9, 'breakdown sums to the hit score');
}

console.log(`ui.test: ${checks} checks, ${failed} failed`);
if (failed) process.exit(1);