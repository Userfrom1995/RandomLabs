// Meridian consistency test: proves the browser mirror (js/meridian.js)
// produces exactly the same ranked results, scores, breakdowns, and snippets
// as the Rust CLI on the same exported index.
//
// Run from the meridian/ directory:
//   node tests/consistency.test.mjs
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Meridian = require('../js/meridian.js');

const BIN = './target/release/meridian';
const INDEX = 'data/index.json';
const CORPUS = 'corpus';

const QUERIES = [
  'seismic waves',
  'rust AND chess',
  'rust OR chess',
  'rust AND NOT chess',
  '"inverted index"',
  '"search engine"',
  'gambit AND chess',
  'browser UI',
  'tokenizer',
  'gradient descent',
  'webgl OR canvas',
  '(rust OR golang) AND database',
  '"neural network"',
  'NOT search',
  'quoted "missing phrase zzzqq"',
  'café',
  'utf8 unicode test',
  'rendering engine',
  'sorting algorithm',
  'variable-length integer',
  'searching~',
  'indexing~2',
  'enginer~',
  'search~ AND rust',
  '搜索引擎',
  '搜索',
  '搜索引擎 AND rust',
  'ranking',
  'systems',
  'qjuick brwn',
  'xyzzy nonsense',
  'sear*',
  'sear?h',
  'rust*',
  'engine*',
  '*ing',
  'title:rust',
  'title:search*',
  'title:engine',
  'source:docs*',
  'source:src',
  '"inverted index"~1',
  '"search engine"~2',
  '"rust systems"~1',
  'search^2',
  '"inverted index"^2',
  'title:rust^2',
  'searching~^2',
  'the',
  'the AND search',
  'of AND rust',
];

// Query options are exercised across every combination.
const OPTS = [
  { stem: false, signals: true, stopwords: true },
  { stem: true, signals: true, stopwords: true },
  { stem: false, signals: false, stopwords: true },
  { stem: false, signals: true, stopwords: false },
];

function runRust(query, scorer, opts, top) {
  const out = execFileSync(BIN, [
    'search-index',
    '--index',
    INDEX,
    '--corpus',
    CORPUS,
    '--query',
    query,
    '--scoring',
    scorer,
    '--top',
    String(top),
    '--limit',
    String(top),
    '--offset',
    '0',
    '--stem',
    opts.stem ? 'on' : 'off',
    '--signals',
    opts.signals ? 'on' : 'off',
    '--stopwords',
    opts.stopwords ? 'on' : 'off',
    '--format',
    'json',
  ]).toString('utf-8');
  return JSON.parse(out);
}

function runJs(index, query, scorer, opts, top) {
  const plan = Meridian.parseQuery(query);
  const hits = Meridian.search(index, scorer, opts, plan, top);
  const total = Meridian.candidates(index, opts, plan).length;
  const suggestions = Meridian.suggestions(index, plan);
  return {
    query,
    scorer,
    total_hits: total,
    suggestions,
    hits: hits.map((h) => {
      const doc = index.docs[h.docId];
      const text = doc ? doc.text : '';
      const snip = text
        ? Meridian.generateSnippet(text, h.matches, 220)
        : null;
      return {
        doc_id: h.docId,
        title: doc ? doc.title : '',
        source: doc ? doc.source : '',
        url: doc ? doc.url : '',
        score: h.score,
        matches: h.matches,
        breakdown: h.breakdown.map((b) => ({
          term: b.term,
          score: b.score,
          title: b.title,
        })),
        snippet: snip
          ? { text: snip.text, highlights: snip.highlights, left: snip.left, right: snip.right }
          : null,
      };
    }),
  };
}

function approxEq(a, b, tol) {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

let failures = 0;
let checks = 0;

function check(cond, label, detail) {
  checks++;
  if (!cond) {
    failures++;
    console.error(`FAIL  ${label}${detail ? ' - ' + detail : ''}`);
  }
}

async function main() {
  const indexJson = JSON.parse(
    require('node:fs').readFileSync(INDEX, 'utf-8')
  );
  const index = Meridian.loadIndex(indexJson);

  // Attach document texts from the corpus directory.
  for (const doc of index.docs) {
    const fs = require('node:fs');
    const path = require('node:path');
    const file = path.join(CORPUS, path.basename(doc.url));
    doc.text = fs.readFileSync(file, 'utf-8');
  }

  for (const scorer of ['bm25', 'tfidf']) {
    for (const opts of OPTS) {
      for (const query of QUERIES) {
        const rust = runRust(query, scorer, opts, 8);
        const js = runJs(index, query, scorer, opts, 8);
        const label = `[${scorer}][stem=${opts.stem},signals=${opts.signals},stopwords=${opts.stopwords}] "${query}"`;

        check(rust.total_hits === js.total_hits, label, `total ${rust.total_hits} != ${js.total_hits}`);
        check(
          JSON.stringify(rust.suggestions) === JSON.stringify(js.suggestions),
          label,
          `suggestions ${JSON.stringify(rust.suggestions)} != ${JSON.stringify(js.suggestions)}`
        );
        check(
          rust.hits.length === js.hits.length,
          label,
          `hit count ${rust.hits.length} != ${js.hits.length}`
        );
        const n = Math.min(rust.hits.length, js.hits.length);
        for (let i = 0; i < n; i++) {
          const r = rust.hits[i];
          const j = js.hits[i];
          const where = `hit ${i}`;
          check(
            r.doc_id === j.doc_id,
            label,
            `${where}: doc ${r.doc_id} != ${j.doc_id}`
          );
          check(
            approxEq(r.score, j.score, 1e-9),
            label,
            `${where}: score ${r.score} != ${j.score}`
          );
          check(
            JSON.stringify(r.matches) === JSON.stringify(j.matches),
            label,
            `${where}: matches differ`
          );
          check(
            r.breakdown.length === j.breakdown.length &&
              r.breakdown.every(
                (rb, k) =>
                  rb.term === j.breakdown[k].term &&
                  approxEq(rb.score, j.breakdown[k].score, 1e-9) &&
                  rb.title === j.breakdown[k].title
              ),
            label,
            `${where}: breakdown differs`
          );
          check(r.snippet && j.snippet, label, `${where}: snippet missing`);
          if (r.snippet && j.snippet) {
            check(
              r.snippet.text === j.snippet.text,
              label,
              `${where}: snippet text differ\n  rust: ${JSON.stringify(r.snippet.text)}\n  js:   ${JSON.stringify(j.snippet.text)}`
            );
            check(
              JSON.stringify(r.snippet.highlights) ===
                JSON.stringify(j.snippet.highlights),
              label,
              `${where}: highlights ${JSON.stringify(r.snippet.highlights)} != ${JSON.stringify(j.snippet.highlights)}`
            );
            check(
              r.snippet.left === j.snippet.left &&
                r.snippet.right === j.snippet.right,
              label,
              `${where}: truncation flags differ`
            );
          }
        }
      }
    }
  }

  // Tokenizer-level checks on tricky inputs.
  {
    const cases = [
      ["The Quick Brown FOX", ["the", "quick", "brown", "fox"]],
      ["don't stop rock'n'roll", ["don't", "stop", "rock'n'roll"]],
      ["hello, world! (paren)", ["hello", "world", "paren"]],
      ["Café déjà vu", ["café", "déjà", "vu"]],
      // CJK runs segment into unigrams plus bigrams, in order.
      ["搜索", ["搜", "搜索", "索"]],
      ["搜索引擎", ["搜", "搜索", "索", "索引", "引", "引擎", "擎"]],
      ["漢字とカナ", ["漢", "漢字", "字", "字と", "と", "とカ", "カ", "カナ", "ナ"]],
      // CJK runs do not bridge across separators.
      ["漢・字", ["漢", "字"]],
      // CJK mixed with latin words.
      ["rust搜索引擎go", ["rust", "搜", "搜索", "索", "索引", "引", "引擎", "擎", "go"]],
    ];
    for (const [text, expected] of cases) {
      const got = Meridian.tokenize(text).map((t) => t.term);
      check(
        JSON.stringify(got) === JSON.stringify(expected),
        `tokenizer "${text}"`,
        `got ${JSON.stringify(got)}`
      );
    }
  }

  // Stemmer parity with the Rust reference implementation.
  {
    const vectors = [
      ["caresses", "caress"],
      ["ponies", "poni"],
      ["cats", "cat"],
      ["agreed", "agre"],
      ["motoring", "motor"],
      ["happy", "happi"],
      ["sky", "sky"],
      ["relational", "relat"],
      ["differentli", "differ"],
      ["vietnamization", "vietnam"],
      ["hopefulness", "hope"],
      ["sensibiliti", "sensibl"],
      ["formative", "form"],
      ["adjustable", "adjust"],
      ["adoption", "adopt"],
      ["effective", "effect"],
      ["assembly", "assembl"],
      ["dumbly", "dumbl"],
      ["possibli", "possibl"],
    ];
    for (const [input, expected] of vectors) {
      const got = Meridian.stem(input);
      check(got === expected, `stem("${input}")`, `got ${got}, expected ${expected}`);
    }
    check(Meridian.stem("a") === "a", "stem skips len 1");
    check(Meridian.stem("搜索引擎") === "搜索引擎", "stem passes through CJK");
  }

  // Levenshtein parity.
  {
    check(Meridian.levenshtein("kitten", "sitting") === 3, "levenshtein kitten/sitting");
    check(Meridian.levenshtein("rust", "rusting") === 3, "levenshtein rust/rusting");
    check(Meridian.levenshtein("搜索引擎", "索引擎") === 1, "levenshtein CJK");
  }

  // Snippet correctness on unicode text.
  {
    const text = 'café déjà vu and a long ünïcödé sentence';
    const snip = Meridian.generateSnippet(text, ['déjà'], 40);
    for (const [hs, he] of snip.highlights) {
      const word = snip.text.slice(byteToChar(snip.text, hs), byteToChar(snip.text, he));
      check(word === 'déjà', 'snippet unicode highlight', `got ${JSON.stringify(word)}`);
    }
  }

  console.log(`${checks - failures}/${checks} checks passed`);
  if (failures > 0) {
    process.exit(1);
  }
}

function byteToChar(text, byte) {
  let i = 0;
  let off = 0;
  for (const c of text) {
    if (off >= byte) return i;
    off += Buffer.byteLength(c, 'utf-8');
    i++;
  }
  return i;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});