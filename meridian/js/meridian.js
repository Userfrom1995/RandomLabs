/* Meridian browser mirror: a faithful JavaScript port of the Rust engine.
 * Decodes the exported index (base64 varint postings), parses boolean and
 * fuzzy queries, expands stem groups and CJK n-grams, ranks with BM25/tf-idf
 * plus title/proximity signals, and generates snippets - bit-compatible with
 * the Rust implementation (verified by tests/consistency.test.mjs).
 *
 * Works both as a browser global (window.Meridian) and under node
 * (module.exports).
 */
(function (root) {
  'use strict';

  const K1 = 1.2;
  const B = 0.75;
  const TITLE_BOOST = 1.5;
  const PROX_WEIGHT = 0.5;
  const DEFAULT_OPTS = { stem: false, signals: true };

  function utf8Len(cp) {
    if (cp < 0x80) return 1;
    if (cp < 0x800) return 2;
    if (cp < 0x10000) return 3;
    return 4;
  }

  function isAlnum(c) {
    return /[\p{L}\p{N}]/u.test(c);
  }

  function isCjk(c) {
    const cp = c.codePointAt(0);
    return (
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0x3040 && cp <= 0x309f) ||
      (cp >= 0x30a0 && cp <= 0x30ff) ||
      (cp >= 0xac00 && cp <= 0xd7af)
    );
  }

  /* ---- tokenizer (mirror of src/tokenizer.rs) ----
   * Words are lowercase alphanumeric runs plus apostrophes inside words.
   * Contiguous CJK runs are segmented into unigrams and bigrams that share
   * token positions; the position counter advances by one per word and by one
   * per CJK character. */
  function tokenize(text) {
    const tokens = [];
    let word = '';
    let pos = 0;
    const chars = Array.from(text);
    let i = 0;
    while (i < chars.length) {
      const c = chars[i];
      if (isCjk(c)) {
        flush();
        let j = i;
        while (j < chars.length && isCjk(chars[j])) j++;
        segmentCjk(chars.slice(i, j).join(''), tokens, pos);
        pos += j - i;
        i = j;
      } else if (isAlnum(c)) {
        word += c.toLowerCase();
        i++;
      } else if (c === "'" && word.length > 0) {
        const next = chars[i + 1];
        if (next !== undefined && isAlnum(next)) {
          word += "'";
          i++;
          continue;
        }
        flush();
        i++;
      } else {
        flush();
        i++;
      }
    }
    flush();
    return tokens;

    function flush() {
      if (word.length === 0) return;
      if (/[\p{L}\p{N}]/u.test(word)) {
        tokens.push({ term: word, position: pos });
        pos += 1;
      }
      word = '';
    }
  }

  function segmentCjk(run, tokens, pos) {
    const chars = Array.from(run);
    for (let i = 0; i < chars.length; i++) {
      const p = pos + i;
      const uni = chars[i].toLowerCase();
      if (uni.length > 0 && allAlnum(uni)) {
        tokens.push({ term: uni, position: p });
      }
      if (i + 1 < chars.length) {
        const bi = chars[i].toLowerCase() + chars[i + 1].toLowerCase();
        if (allAlnum(bi)) {
          tokens.push({ term: bi, position: p });
        }
      }
    }
  }

  function allAlnum(s) {
    for (const c of s) if (!isAlnum(c)) return false;
    return true;
  }

  /* ---- Porter stemmer (mirror of src/stem.rs) ----
   * A faithful port of the canonical 1980 algorithm (the C reference at
   * tartarus.org), including the `bli` -> `ble` departure in step 2. Applied
   * only to ASCII words of length >= 3; everything else passes through. */
  function stem(word) {
    if (word.length < 3 || !/^[\x00-\x7f]*$/.test(word)) return word;
    const chars = Array.from(word);
    let k = chars.length - 1;
    let j = chars.length - 1;

    function cons(i) {
      const c = chars[i];
      if (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u') return false;
      if (c === 'y') return i === 0 || !cons(i - 1);
      return true;
    }

    function measure(jIdx) {
      let n = 0;
      let i = 0;
      for (;;) {
        if (i > jIdx) return n;
        if (!cons(i)) break;
        i++;
      }
      i++;
      for (;;) {
        for (;;) {
          if (i > jIdx) return n;
          if (cons(i)) break;
          i++;
        }
        i++;
        n++;
        for (;;) {
          if (i > jIdx) return n;
          if (!cons(i)) break;
          i++;
        }
        i++;
      }
    }

    function vowelInStem(jIdx) {
      for (let i = 0; i <= jIdx; i++) if (!cons(i)) return true;
      return false;
    }

    function doubleConsonant(jIdx) {
      if (jIdx < 1) return false;
      return chars[jIdx] === chars[jIdx - 1] && cons(jIdx);
    }

    function cvc(i) {
      if (i < 2) return false;
      if (!cons(i) || cons(i - 1) || !cons(i - 2)) return false;
      return chars[i] !== 'w' && chars[i] !== 'x' && chars[i] !== 'y';
    }

    function ends(suffix) {
      const len = suffix.length;
      if (len > k + 1) return false;
      const start = k + 1 - len;
      for (let m = 0; m < len; m++) {
        if (chars[start + m] !== suffix[m]) return false;
      }
      j = start - 1;
      return true;
    }

    function setto(rep) {
      chars.length = Math.max(j, 0) + 1;
      for (const c of Array.from(rep)) chars.push(c);
      k = chars.length - 1;
    }

    function r(rep, threshold) {
      if (measure(j) > threshold) setto(rep);
    }

    function step1ab() {
      if (chars[k] === 's') {
        if (ends('sses')) k -= 2;
        else if (ends('ies')) setto('i');
        else if (chars[k - 1] !== 's') k -= 1;
      }
      if (ends('eed')) {
        if (measure(j) > 0) k -= 1;
      } else if ((ends('ed') || ends('ing')) && vowelInStem(j)) {
        k = Math.max(j, 0);
        if (ends('at')) setto('ate');
        else if (ends('bl')) setto('ble');
        else if (ends('iz')) setto('ize');
        else if (doubleConsonant(k)) {
          k -= 1;
          const ch = chars[k];
          if (ch === 'l' || ch === 's' || ch === 'z') k += 1;
        } else if (measure(k) === 1 && cvc(k)) setto('e');
      }
    }

    function step1c() {
      if (ends('y') && vowelInStem(j)) chars[k] = 'i';
    }

    function step2() {
      const penultimate = chars[k - 1];
      switch (penultimate) {
        case 'a':
          if (ends('ational')) r('ate', 0);
          else if (ends('tional')) r('tion', 0);
          break;
        case 'c':
          if (ends('enci')) r('ence', 0);
          else if (ends('anci')) r('ance', 0);
          break;
        case 'e':
          if (ends('izer')) r('ize', 0);
          break;
        case 'l':
          if (ends('bli')) r('ble', 0);
          else if (ends('alli')) r('al', 0);
          else if (ends('entli')) r('ent', 0);
          else if (ends('eli')) r('e', 0);
          else if (ends('ousli')) r('ous', 0);
          break;
        case 'o':
          if (ends('ization')) r('ize', 0);
          else if (ends('ation') || ends('ator')) r('ate', 0);
          break;
        case 's':
          if (ends('alism')) r('al', 0);
          else if (ends('iveness')) r('ive', 0);
          else if (ends('fulness')) r('ful', 0);
          else if (ends('ousness')) r('ous', 0);
          break;
        case 't':
          if (ends('aliti')) r('al', 0);
          else if (ends('iviti')) r('ive', 0);
          else if (ends('biliti')) r('ble', 0);
          break;
        case 'g':
          if (ends('logi')) r('log', 0);
          break;
      }
    }

    function step3() {
      const last = chars[k];
      switch (last) {
        case 'e':
          if (ends('icate')) r('ic', 0);
          else if (ends('ative')) r('', 0);
          else if (ends('alize')) r('al', 0);
          break;
        case 'i':
          if (ends('iciti')) r('ic', 0);
          break;
        case 'l':
          if (ends('ical')) r('ic', 0);
          else if (ends('ful')) r('', 0);
          break;
        case 's':
          if (ends('ness')) r('', 0);
          break;
      }
    }

    function step4() {
      const penultimate = chars[k - 1];
      const finish = () => {
        if (measure(j) > 1) k = Math.max(j, 0);
      };
      switch (penultimate) {
        case 'a':
          if (ends('al')) finish();
          break;
        case 'c':
          if (ends('ance')) finish();
          else if (ends('ence')) finish();
          break;
        case 'e':
          if (ends('er')) finish();
          break;
        case 'i':
          if (ends('ic')) finish();
          break;
        case 'l':
          if (ends('able')) finish();
          else if (ends('ible')) finish();
          break;
        case 'n':
          if (ends('ant')) finish();
          else if (ends('ement')) finish();
          else if (ends('ment')) finish();
          else if (ends('ent')) finish();
          break;
        case 'o':
          if (ends('ion') && j >= 0 && (chars[j] === 's' || chars[j] === 't')) finish();
          else if (ends('ou')) finish();
          break;
        case 's':
          if (ends('ism')) finish();
          break;
        case 't':
          if (ends('ate')) finish();
          else if (ends('iti')) finish();
          break;
        case 'u':
          if (ends('ous')) finish();
          break;
        case 'v':
          if (ends('ive')) finish();
          break;
        case 'z':
          if (ends('ize')) finish();
          break;
      }
    }

    function step5() {
      j = k;
      if (chars[k] === 'e') {
        const a = measure(j);
        if (a > 1 || (a === 1 && !cvc(k - 1))) k -= 1;
      }
      if (chars[k] === 'l' && doubleConsonant(k) && measure(k) > 1) k -= 1;
    }

    step1ab();
    if (k > 0) {
      step1c();
      step2();
      step3();
      step4();
      step5();
    }
    return chars.slice(0, k + 1).join('');
  }

  function stemGroups(terms) {
    const groups = new Map();
    for (const t of terms) {
      const s = stem(t);
      if (!groups.has(s)) groups.set(s, []);
      groups.get(s).push(t);
    }
    for (const arr of groups.values()) arr.sort();
    return groups;
  }

  function stemExpand(groups, term) {
    const g = groups.get(stem(term));
    return g ? g.slice() : [term];
  }

  /* ---- fuzzy: Levenshtein + BK-tree (mirror of src/fuzzy.rs) ---- */
  function levenshtein(a, b) {
    const ac = Array.from(a);
    const bc = Array.from(b);
    const n = ac.length;
    const m = bc.length;
    if (n === 0) return m;
    if (m === 0) return n;
    let prev = new Array(m + 1);
    for (let j = 0; j <= m; j++) prev[j] = j;
    let cur = new Array(m + 1);
    for (let i = 1; i <= n; i++) {
      cur[0] = i;
      const ai = ac[i - 1];
      for (let j = 1; j <= m; j++) {
        const cost = ai === bc[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      const tmp = prev;
      prev = cur;
      cur = tmp;
    }
    return prev[m];
  }

  class BkTree {
    constructor() {
      this.nodes = [];
      this.indexOf = new Map();
    }

    static build(terms) {
      const tree = new BkTree();
      for (const t of terms) tree.insert(t);
      return tree;
    }

    insert(term) {
      if (this.nodes.length === 0) {
        this.nodes.push({ term: term, children: [] });
        this.indexOf.set(term, 0);
        return;
      }
      let idx = 0;
      for (;;) {
        const node = this.nodes[idx];
        if (node.term === term) return;
        const d = levenshtein(term, node.term);
        let child = null;
        for (const [dist, c] of node.children) {
          if (dist === d) {
            child = c;
            break;
          }
        }
        if (child !== null) {
          idx = child;
        } else {
          const newIdx = this.nodes.length;
          this.nodes[idx].children.push([d, newIdx]);
          this.nodes.push({ term: term, children: [] });
          this.indexOf.set(term, newIdx);
          return;
        }
      }
    }

    contains(term) {
      return this.indexOf.has(term);
    }

    /* Every vocab term within `max` edits of `query`, sorted by
     * (term, distance); callers re-sort as needed. */
    search(query, max) {
      const out = [];
      if (this.nodes.length === 0) return out;
      const stack = [0];
      while (stack.length) {
        const idx = stack.pop();
        const node = this.nodes[idx];
        const d = levenshtein(query, node.term);
        if (d <= max) out.push([node.term, d]);
        const lo = Math.max(0, d - max);
        const hi = d + max;
        for (const [dist, child] of node.children) {
          if (dist >= lo && dist <= hi) stack.push(child);
        }
      }
      out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
      return out;
    }
  }

  /* ---- byte-offset helpers (mirror of Rust char_indices) ---- */
  function charByteOffsets(text) {
    const offsets = new Uint32Array(Array.from(text).length + 1);
    let off = 0;
    let i = 0;
    for (const c of text) {
      offsets[i] = off;
      off += utf8Len(c.codePointAt(0));
      i++;
    }
    offsets[i] = off;
    return offsets;
  }

  function byteSlice(text, startByte, endByte) {
    const chars = Array.from(text);
    const offsets = charByteOffsets(text);
    let s = 0;
    while (s < offsets.length && offsets[s] < startByte) s++;
    let e = s;
    while (e < offsets.length && offsets[e] < endByte) e++;
    return chars.slice(s, e).join('');
  }

  /* ---- varint + postings (mirror of src/postings.rs) ---- */
  const B64 =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function base64Decode(str) {
    const out = [];
    let acc = 0;
    let bits = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === '=') break;
      const v = B64.indexOf(c);
      if (v < 0) throw new Error('invalid base64 char');
      acc = (acc << 6) | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push((acc >> bits) & 0xff);
      }
    }
    return out;
  }

  function decodeVarint(bytes, pos) {
    let value = 0;
    let shift = 0;
    let i = pos;
    for (;;) {
      if (i >= bytes.length) throw new Error('truncated varint');
      const b = bytes[i++];
      value |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return [value >>> 0, i];
  }

  function decodePostings(bytes) {
    const out = [];
    let prevDoc = 0;
    let i = 0;
    while (i < bytes.length) {
      let r = decodeVarint(bytes, i);
      prevDoc = (prevDoc + r[0]) >>> 0;
      i = r[1];
      r = decodeVarint(bytes, i);
      const tf = r[0];
      i = r[1];
      const positions = [];
      let prevPos = 0;
      for (let k = 0; k < tf; k++) {
        r = decodeVarint(bytes, i);
        prevPos = (prevPos + r[0]) >>> 0;
        i = r[1];
        positions.push(prevPos);
      }
      out.push({ docId: prevDoc, tf: tf, positions: positions });
    }
    return out;
  }

  /* ---- index loading ---- */
  function loadIndex(json) {
    const root = typeof json === 'string' ? JSON.parse(json) : json;
    const docs = root.docs.map((d) => ({
      id: d.id,
      title: d.title,
      source: d.source,
      url: d.url,
      length: d.len,
      text: null,
    }));
    const terms = new Map();
    for (const term of Object.keys(root.terms)) {
      const e = root.terms[term];
      terms.set(term, {
        df: e.df,
        idf: e.idf,
        postings: decodePostings(base64Decode(e.postings)),
      });
    }
    return {
      docs: docs,
      terms: terms,
      totalDocs: root.total_docs,
      totalTokens: root.total_tokens,
      avgDocLen: root.avg_doc_len,
      name: root.name,
    };
  }

  function docLen(index, docId) {
    const d = index.docs[docId];
    return d ? d.length : 0;
  }

  function df(index, term) {
    const e = index.terms.get(term);
    return e ? e.df : 0;
  }

  function entry(index, term) {
    return index.terms.get(term);
  }

  function tf(index, term, docId) {
    const e = index.terms.get(term);
    if (!e) return 0;
    for (const p of e.postings) {
      if (p.docId === docId) return p.tf;
      if (p.docId > docId) return 0;
    }
    return 0;
  }

  function termPositions(index, term, docId) {
    const e = index.terms.get(term);
    if (!e) return [];
    for (const p of e.postings) {
      if (p.docId === docId) return p.positions;
    }
    return [];
  }

  function postingDocs(index, term) {
    const e = index.terms.get(term);
    return e ? e.postings.map((p) => p.docId) : [];
  }

  function idf(index, dfValue) {
    const n = Math.max(index.totalDocs, 1);
    return Math.log(1 + (n - dfValue + 0.5) / (dfValue + 0.5));
  }

  function bm25(index, docId, terms) {
    const dl = docLen(index, docId);
    const avgdl = index.avgDocLen > 0 ? index.avgDocLen : 1;
    const norm = 1 - B + B * (dl / avgdl);
    let total = 0;
    for (const term of terms) {
      const d = df(index, term);
      if (d === 0) continue;
      const t = tf(index, term, docId);
      if (t === 0) continue;
      total += idf(index, d) * ((t * (K1 + 1)) / (t + K1 * norm));
    }
    return total;
  }

  function tfIdf(index, docId, terms) {
    let total = 0;
    for (const term of terms) {
      const d = df(index, term);
      if (d === 0) continue;
      const t = tf(index, term, docId);
      if (t === 0) continue;
      total += t * idf(index, d);
    }
    return total;
  }

  function score(index, scorer, docId, terms) {
    return scorer === 'tfidf'
      ? tfIdf(index, docId, terms)
      : bm25(index, docId, terms);
  }

  /* ---- proximity signals (mirror of src/scoring.rs) ---- */
  function minTermDistance(index, docId, a, b) {
    const pa = termPositions(index, a, docId);
    const pb = termPositions(index, b, docId);
    if (pa.length === 0 || pb.length === 0) return null;
    let i = 0;
    let j = 0;
    let best = Infinity;
    while (i < pa.length && j < pb.length) {
      const d = Math.abs(pa[i] - pb[j]);
      if (d < best) best = d;
      if (pa[i] < pb[j]) i++;
      else j++;
    }
    return best;
  }

  function proximity(index, docId, terms) {
    if (terms.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        const d = minTermDistance(index, docId, terms[i], terms[j]);
        if (d !== null) total += 1 / (1 + d);
      }
    }
    return PROX_WEIGHT * total;
  }

  /* ---- query parser (mirror of src/query.rs) ----
   * Terms are case-insensitive; a `~` right after a word makes it fuzzy:
   * `term~` (distance 1) or `term~2` (distance 2); any other distance is a
   * parse error. `and`/`or`/`not` are operators only outside quotes. */
  function readWord(chars, i) {
    let word = '';
    while (i < chars.length) {
      const c = chars[i];
      if (isAlnum(c)) {
        word += c.toLowerCase();
        i++;
      } else if (c === "'" && word.length > 0) {
        const next = chars[i + 1];
        if (next !== undefined && isAlnum(next)) word += "'";
        i++;
      } else {
        break;
      }
    }
    if (word.length === 0) return null;
    let fuzzy = null;
    if (i < chars.length && chars[i] === '~') {
      i++;
      let digits = '';
      while (i < chars.length && /[0-9]/.test(chars[i])) {
        digits += chars[i];
        i++;
      }
      let d;
      if (digits === '') {
        d = 1;
      } else {
        if (!/^[0-9]+$/.test(digits)) {
          throw new Error("invalid fuzzy distance '~" + digits + "'");
        }
        d = parseInt(digits, 10);
      }
      if (d !== 1 && d !== 2) {
        throw new Error('fuzzy distance must be 1 or 2 (got ~' + d + ')');
      }
      fuzzy = d;
    }
    return { word: word, next: i, fuzzy: fuzzy };
  }

  function lex(query) {
    const out = [];
    const chars = Array.from(query);
    let i = 0;
    while (i < chars.length) {
      const c = chars[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        i++;
      } else if (c === '(') {
        out.push({ kind: 'lparen' });
        i++;
      } else if (c === ')') {
        out.push({ kind: 'rparen' });
        i++;
      } else if (c === '"') {
        i++;
        let phrase = '';
        let closed = false;
        while (i < chars.length) {
          if (chars[i] === '"') {
            closed = true;
            i++;
            break;
          }
          phrase += chars[i];
          i++;
        }
        if (!closed) throw new Error('unterminated quoted phrase');
        const words = tokenize(phrase).map((t) => t.term);
        if (words.length === 0) throw new Error('empty quoted phrase');
        out.push({ kind: 'phrase', words: words });
      } else {
        const r = readWord(chars, i);
        if (r) {
          i = r.next;
          if (r.fuzzy !== null) {
            out.push({ kind: 'fuzzy', term: r.word, d: r.fuzzy });
          } else if (r.word === 'and') out.push({ kind: 'and' });
          else if (r.word === 'or') out.push({ kind: 'or' });
          else if (r.word === 'not') out.push({ kind: 'not' });
          else out.push({ kind: 'term', term: r.word });
        } else {
          i++;
        }
      }
    }
    return out;
  }

  function parseQuery(query) {
    const toks = lex(query);
    if (toks.length === 0) throw new Error('empty query');
    const hasOp = toks.some(
      (t) =>
        t.kind === 'and' ||
        t.kind === 'or' ||
        t.kind === 'not' ||
        t.kind === 'lparen' ||
        t.kind === 'rparen'
    );
    if (!hasOp) {
      const terms = [];
      const phrases = [];
      for (const t of toks) {
        if (t.kind === 'term') terms.push({ type: 'word', term: t.term });
        else if (t.kind === 'fuzzy') terms.push({ type: 'fuzzy', term: t.term, d: t.d });
        else if (t.kind === 'phrase') phrases.push(t.words);
      }
      return { kind: 'ranked', terms: terms, phrases: phrases };
    }
    const p = new Parser(toks);
    const expr = p.parseOr();
    if (p.pos !== toks.length) throw new Error('unexpected trailing tokens');
    return { kind: 'bool', expr: expr };
  }

  class Parser {
    constructor(toks) {
      this.toks = toks;
      this.pos = 0;
    }
    peek() {
      return this.toks[this.pos];
    }
    next() {
      return this.toks[this.pos++];
    }
    parseOr() {
      const parts = [this.parseAnd()];
      while (this.peek() && this.peek().kind === 'or') {
        this.next();
        parts.push(this.parseAnd());
      }
      return parts.length === 1 ? parts[0] : { kind: 'or', parts: parts };
    }
    parseAnd() {
      const parts = [this.parseUnary()];
      while (this.peek() && this.peek().kind === 'and') {
        this.next();
        parts.push(this.parseUnary());
      }
      return parts.length === 1 ? parts[0] : { kind: 'and', parts: parts };
    }
    parseUnary() {
      if (this.peek() && this.peek().kind === 'not') {
        this.next();
        return { kind: 'not', child: this.parseUnary() };
      }
      return this.parsePrimary();
    }
    parsePrimary() {
      const t = this.next();
      if (!t) throw new Error('unexpected end of query');
      if (t.kind === 'term') return { kind: 'term', term: t.term };
      if (t.kind === 'fuzzy') return { kind: 'fuzzy', term: t.term, d: t.d };
      if (t.kind === 'phrase') return { kind: 'phrase', words: t.words };
      if (t.kind === 'lparen') {
        const inner = this.parseOr();
        const close = this.next();
        if (!close || close.kind !== 'rparen')
          throw new Error('missing closing parenthesis');
        return inner;
      }
      if (t.kind === 'and') throw new Error('unexpected AND: missing left operand');
      if (t.kind === 'or') throw new Error('unexpected OR: missing left operand');
      if (t.kind === 'not') throw new Error('unexpected NOT');
      throw new Error("unexpected ')'");
    }
  }

  /* ---- evaluation (mirror of src/query.rs) ---- */
  function containsPos(positions, pos) {
    let lo = 0;
    let hi = positions.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (positions[mid] === pos) return true;
      if (positions[mid] < pos) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }

  function allDocs(index) {
    const out = [];
    for (let i = 0; i < index.totalDocs; i++) out.push(i);
    return out;
  }

  function phraseDocs(index, words) {
    if (words.length === 0) return [];
    let anchor = 0;
    for (let i = 1; i < words.length; i++) {
      if (df(index, words[i]) < df(index, words[anchor])) anchor = i;
    }
    const out = [];
    for (const docId of postingDocs(index, words[anchor])) {
      const anchorPositions = termPositions(index, words[anchor], docId);
      for (const p of anchorPositions) {
        let ok = true;
        for (let i = 0; i < words.length; i++) {
          if (i === anchor) continue;
          const target = p + i;
          if (!containsPos(termPositions(index, words[i], docId), target)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          out.push(docId);
          break;
        }
      }
    }
    return out;
  }

  function mergeSorted(a, b) {
    const out = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] < b[j]) out.push(a[i++]);
      else if (a[i] > b[j]) out.push(b[j++]);
      else {
        out.push(a[i]);
        i++;
        j++;
      }
    }
    while (i < a.length) out.push(a[i++]);
    while (j < b.length) out.push(b[j++]);
    return out;
  }

  function intersectSorted(a, b) {
    const out = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] < b[j]) i++;
      else if (a[i] > b[j]) j++;
      else {
        out.push(a[i]);
        i++;
        j++;
      }
    }
    return out;
  }

  /* Load-time derived search context: stem groups built up front, BK-tree
   * built lazily on the first fuzzy lookup. */
  class SearchContext {
    constructor(index, stem) {
      this.index = index;
      this.stem = stem;
      this.groups = stem ? stemGroups(index.terms.keys()) : null;
      this.bk = null;
    }

    bkTree() {
      if (!this.bk) this.bk = BkTree.build(this.index.terms.keys());
      return this.bk;
    }

    isCjkTerm(term) {
      for (const c of term) if (isCjk(c)) return true;
      return false;
    }

    /* Index terms a plain word expands to: CJK runs segment into unigrams +
     * bigrams; with stem on, ASCII words expand to their whole stem group. */
    expand(term) {
      if (this.isCjkTerm(term)) return tokenize(term).map((t) => t.term);
      if (this.stem && this.groups) return stemExpand(this.groups, term);
      return [term];
    }

    fuzzyExpand(term, d) {
      return this.bkTree().search(term, d).map((e) => e[0]);
    }

    /* One scoring slot per query term/phrase word, each a list of index terms
     * that must be present to score that slot. */
    effectiveLists(plan) {
      const out = [];
      const walk = (expr) => {
        switch (expr.kind) {
          case 'term':
            out.push(this.expand(expr.term));
            break;
          case 'fuzzy':
            out.push(this.fuzzyExpand(expr.term, expr.d));
            break;
          case 'phrase':
            for (const w of expr.words) out.push([w]);
            break;
          case 'and':
          case 'or':
            for (const c of expr.parts) walk(c);
            break;
          case 'not':
            walk(expr.child);
            break;
        }
      };
      if (plan.kind === 'ranked') {
        for (const spec of plan.terms) {
          if (spec.type === 'word') out.push(this.expand(spec.term));
          else out.push(this.fuzzyExpand(spec.term, spec.d));
        }
        for (const p of plan.phrases) {
          for (const w of p) out.push([w]);
        }
      } else {
        walk(plan.expr);
      }
      return out;
    }

    candidates(plan) {
      let out = [];
      if (plan.kind === 'ranked') {
        for (const spec of plan.terms) {
          const list =
            spec.type === 'word'
              ? this.expand(spec.term)
              : this.fuzzyExpand(spec.term, spec.d);
          for (const e of list) out = mergeSorted(out, postingDocs(this.index, e));
        }
        for (const p of plan.phrases) {
          out = mergeSorted(out, phraseDocs(this.index, p));
        }
      } else {
        out = evalExpr(this, plan.expr);
      }
      return out;
    }
  }

  function evalExpr(ctx, expr) {
    const index = ctx.index;
    switch (expr.kind) {
      case 'term': {
        let out = [];
        for (const e of ctx.expand(expr.term)) {
          out = mergeSorted(out, postingDocs(index, e));
        }
        return out;
      }
      case 'fuzzy': {
        let out = [];
        for (const e of ctx.fuzzyExpand(expr.term, expr.d)) {
          out = mergeSorted(out, postingDocs(index, e));
        }
        return out;
      }
      case 'phrase':
        return phraseDocs(index, expr.words);
      case 'and': {
        const sets = expr.parts.map((c) => evalExpr(ctx, c));
        sets.sort((x, y) => x.length - y.length);
        let out = sets.shift();
        for (const s of sets) {
          out = intersectSorted(out, s);
          if (out.length === 0) break;
        }
        return out;
      }
      case 'or': {
        let out = [];
        for (const c of expr.parts) {
          out = mergeSorted(out, evalExpr(ctx, c));
        }
        return out;
      }
      case 'not': {
        const excluded = evalExpr(ctx, expr.child);
        return allDocs(index).filter((d) => excluded.indexOf(d) < 0);
      }
      default:
        throw new Error('unknown expr');
    }
  }

  function candidates(index, opts, plan) {
    return new SearchContext(index, opts.stem).candidates(plan);
  }

  /* The raw words of a plan (for doc-term highlighting and snippets). */
  function scoredTerms(plan) {
    const out = [];
    function walk(expr) {
      if (expr.kind === 'term') out.push(expr.term);
      else if (expr.kind === 'fuzzy') out.push(expr.term);
      else if (expr.kind === 'phrase') out.push(...expr.words);
      else if (expr.kind === 'and' || expr.kind === 'or')
        expr.parts.forEach(walk);
      else if (expr.kind === 'not') walk(expr.child);
    }
    if (plan.kind === 'ranked') {
      for (const spec of plan.terms) out.push(spec.term);
      for (const p of plan.phrases) out.push(...p);
    } else {
      walk(plan.expr);
    }
    return out;
  }

  /* "Did you mean" candidates: the nearest vocabulary terms (edit distance
   * <= 2, ascending by (distance, term)) for every non-fuzzy, non-CJK query
   * term that has zero vocabulary hits. */
  function suggestions(index, plan) {
    let missing = [];
    function missingWords(expr) {
      switch (expr.kind) {
        case 'term':
          if (df(index, expr.term) === 0) missing.push(expr.term);
          break;
        case 'fuzzy':
          break;
        case 'phrase':
          for (const w of expr.words) missing.push(w);
          break;
        case 'and':
        case 'or':
          for (const c of expr.parts) missingWords(c);
          break;
        case 'not':
          missingWords(expr.child);
          break;
      }
    }
    if (plan.kind === 'ranked') {
      for (const spec of plan.terms) {
        if (
          spec.type === 'word' &&
          df(index, spec.term) === 0 &&
          !new SearchContext(index, false).isCjkTerm(spec.term)
        ) {
          missing.push(spec.term);
        }
      }
      for (const p of plan.phrases) {
        for (const w of p) if (df(index, w) === 0) missing.push(w);
      }
    } else {
      missingWords(plan.expr);
    }
    missing = [...new Set(missing)];
    if (missing.length === 0) return [];
    const bk = BkTree.build(index.terms.keys());
    const pairs = [];
    for (const t of missing) {
      for (const [cand, d] of bk.search(t, 2)) pairs.push([d, cand]);
    }
    pairs.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    const seen = new Set();
    const out = [];
    for (const [d, c] of pairs) {
      const key = d + '\u0000' + c;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
      if (out.length >= 5) break;
    }
    return out;
  }

  /* Runs a plan and returns the top-scoring hits. With signals on, terms that
   * also appear in the doc title get a 1.5x contribution (flagged `title`),
   * and ranked queries with two or more distinct terms present add a proximity
   * bonus reported as the `(proximity)` breakdown row. */
  function search(index, scorer, opts, plan, top) {
    if (!opts) opts = DEFAULT_OPTS;
    const ctx = new SearchContext(index, opts.stem);
    const lists = ctx.effectiveLists(plan);
    let hits = ctx.candidates(plan).map((docId) => {
      const doc = index.docs[docId];
      const titleTerms = new Set(
        doc ? tokenize(doc.title).map((t) => t.term) : []
      );
      const breakdown = [];
      const matches = [];
      const present = [];
      let total = 0;
      for (const list of lists) {
        for (const eff of list) {
          if (tf(index, eff, docId) > 0) {
            const title = !!(opts.signals && titleTerms.has(eff));
            let contrib = score(index, scorer, docId, [eff]);
            if (title) contrib *= TITLE_BOOST;
            total += contrib;
            breakdown.push({ term: eff, score: contrib, title: title });
            if (present.indexOf(eff) < 0) present.push(eff);
            matches.push(eff);
          }
        }
      }
      if (opts.signals) {
        const prox = proximity(index, docId, present);
        if (prox > 0) {
          total += prox;
          breakdown.push({ term: '(proximity)', score: prox, title: false });
        }
      }
      return { docId: docId, score: total, matches: matches, breakdown: breakdown };
    });
    hits.sort((a, b) => b.score - a.score || a.docId - b.docId);
    return hits.slice(0, top);
  }

  /* ---- snippets (mirror of src/snippet.rs) ---- */
  function wordSpans(text) {
    const spans = [];
    const chars = Array.from(text);
    let word = '';
    let wordStart = 0;
    let inWord = false;
    let byteOff = 0;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      const cLen = utf8Len(c.codePointAt(0));
      if (isAlnum(c)) {
        if (!inWord) {
          inWord = true;
          wordStart = byteOff;
          word = '';
        }
        word += c.toLowerCase();
      } else if (c === "'" && inWord) {
        const next = chars[i + 1];
        if (next !== undefined && isAlnum(next)) {
          word += "'";
          byteOff += cLen;
          continue;
        }
        flushSpan(byteOff);
      } else {
        flushSpan(byteOff);
      }
      byteOff += cLen;
    }
    if (inWord) flushSpan(byteOff);
    return spans;

    function flushSpan(endByte) {
      if (inWord) {
        spans.push({ term: word, start: wordStart, end: endByte });
        inWord = false;
      }
    }
  }

  function snapEnd(text, start, end) {
    if (end >= utf8LenTotal(text)) return utf8LenTotal(text);
    while (end > start && !isByteBoundary(text, end)) end--;
    if (end <= start) return utf8LenTotal(text);
    const prevIsWord = prevCharAlnum(text, end);
    const nextIsWord = nextCharAlnum(text, end);
    if (prevIsWord && nextIsWord) {
      const ws = wordStartOf(text, end);
      if (ws >= start) return ws;
    }
    return end;
  }

  function utf8LenTotal(text) {
    let n = 0;
    for (const c of text) n += utf8Len(c.codePointAt(0));
    return n;
  }

  function isByteBoundary(text, byte) {
    const offsets = charByteOffsets(text);
    for (const o of offsets) if (o === byte) return true;
    return false;
  }

  function prevCharAlnum(text, byte) {
    const offsets = charByteOffsets(text);
    let i = 0;
    while (i < offsets.length && offsets[i] < byte) i++;
    if (i === 0) return false;
    const c = Array.from(text)[i - 1];
    return isAlnum(c);
  }

  function nextCharAlnum(text, byte) {
    const offsets = charByteOffsets(text);
    let i = 0;
    while (i < offsets.length && offsets[i] < byte) i++;
    if (i >= offsets.length || offsets[i] !== byte) return false;
    const c = Array.from(text)[i];
    return isAlnum(c);
  }

  function wordStartOf(text, byte) {
    const offsets = charByteOffsets(text);
    let lastSepEnd = 0;
    let inWord = false;
    let i = 0;
    for (const c of text) {
      const off = offsets[i];
      if (off >= byte) break;
      if (isAlnum(c) || (c === "'" && inWord)) {
        inWord = true;
      } else {
        lastSepEnd = off + utf8Len(c.codePointAt(0));
        inWord = false;
      }
      i++;
    }
    return lastSepEnd;
  }

  function highlightIn(text, start, end, terms) {
    const out = [];
    const distinct = new Set();
    for (const w of wordSpans(text)) {
      if (w.start >= start && w.end <= end && terms.has(w.term)) {
        out.push([w.start, w.end]);
        distinct.add(w.term);
      }
    }
    return { highlights: out, distinct: distinct.size };
  }

  function generateSnippet(text, queryTerms, maxLen) {
    maxLen = Math.max(maxLen, 40);
    const terms = new Set(queryTerms);
    const spans = wordSpans(text);
    const matched = spans.filter((w) => terms.has(w.term));
    const totalBytes = utf8LenTotal(text);

    if (matched.length === 0) {
      const end = snapEnd(text, 0, Math.min(maxLen, totalBytes));
      return {
        text: byteSlice(text, 0, end),
        highlights: [],
        left: false,
        right: end < totalBytes,
      };
    }

    let best = null;
    for (const anchor of matched) {
      let end = anchor.start + maxLen;
      if (end > totalBytes) end = totalBytes;
      end = snapEnd(text, anchor.start, end);
      const h = highlightIn(text, anchor.start, end, terms);
      if (best === null || h.distinct > best.distinct) {
        best = { start: anchor.start, end: end, hl: h.highlights, distinct: h.distinct };
      }
    }
    const start = best.start;
    const end = best.end;
    const left = start > 0;
    const right = end < totalBytes;

    let out = '';
    if (left) out += '…';
    out += byteSlice(text, start, end);
    if (right) out += '…';

    const offset = left ? 3 : 0;
    const highlights = best.hl.map(([s, e]) => [s - start + offset, e - start + offset]);
    return { text: out, highlights: highlights, left: left, right: right };
  }

  const Meridian = {
    tokenize: tokenize,
    stem: stem,
    stemGroups: stemGroups,
    levenshtein: levenshtein,
    isCjk: isCjk,
    loadIndex: loadIndex,
    parseQuery: parseQuery,
    search: search,
    candidates: candidates,
    scoredTerms: scoredTerms,
    suggestions: suggestions,
    SearchContext: SearchContext,
    idf: idf,
    bm25: bm25,
    tfIdf: tfIdf,
    proximity: proximity,
    generateSnippet: generateSnippet,
    decodePostings: decodePostings,
    base64Decode: base64Decode,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Meridian;
  } else if (typeof window !== 'undefined') {
    window.Meridian = Meridian;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.Meridian = Meridian;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);