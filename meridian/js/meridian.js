/* Meridian browser mirror: a faithful JavaScript port of the Rust engine.
 * Decodes the exported index (base64 varint postings), parses boolean
 * queries, ranks with BM25/tf-idf, and generates snippets - bit-compatible
 * with the Rust implementation (verified by tests/consistency.test.mjs).
 *
 * Works both as a browser global (window.Meridian) and under node
 * (module.exports).
 */
(function (root) {
  'use strict';

  const K1 = 1.2;
  const B = 0.75;

  function utf8Len(cp) {
    if (cp < 0x80) return 1;
    if (cp < 0x800) return 2;
    if (cp < 0x10000) return 3;
    return 4;
  }

  /* ---- tokenizer (mirror of src/tokenizer.rs) ---- */
  function isAlnum(c) {
    return /[\p{L}\p{N}]/u.test(c);
  }

  function tokenize(text) {
    const tokens = [];
    let word = '';
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (isAlnum(c)) {
        word += c.toLowerCase();
      } else if (c === "'" && word.length > 0) {
        const next = chars[i + 1];
        if (next !== undefined && isAlnum(next)) {
          word += "'";
          continue;
        }
        flushWord();
      } else {
        flushWord();
      }
    }
    flushWord();
    return tokens;

    function flushWord() {
      if (word.length === 0) return;
      const hasAlnum = /[\p{L}\p{N}]/u.test(word);
      if (hasAlnum) {
        tokens.push({ term: word, position: tokens.length });
      }
      word = '';
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
    const offsets = charByteOffsets(text);
    let s = 0;
    while (s < offsets.length && offsets[s] < startByte) s++;
    let e = s;
    while (e < offsets.length && offsets[e] < endByte) e++;
    return text.slice(s, e);
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

  /* ---- query parser (mirror of src/query.rs) ---- */
  function readWord(chars, i) {
    let word = '';
    while (i < chars.length) {
      const c = chars[i];
      if (isAlnum(c)) {
        word += c.toLowerCase();
        i++;
      } else if (c === "'" && word.length > 0) {
        const next = chars[i + 1];
        if (next !== undefined && isAlnum(next)) {
          word += "'";
        }
        i++;
      } else {
        break;
      }
    }
    return word.length > 0 ? { word: word, next: i } : null;
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
          if (r.word === 'and') out.push({ kind: 'and' });
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
        if (t.kind === 'term') terms.push(t.term);
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
  function postingDocs(index, term) {
    const e = index.terms.get(term);
    return e ? e.postings.map((p) => p.docId) : [];
  }

  function termPositions(index, term, docId) {
    const e = index.terms.get(term);
    if (!e) return [];
    for (const p of e.postings) {
      if (p.docId === docId) return p.positions;
    }
    return [];
  }

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

  function evalExpr(index, expr) {
    switch (expr.kind) {
      case 'term':
        return postingDocs(index, expr.term);
      case 'phrase':
        return phraseDocs(index, expr.words);
      case 'and': {
        const sets = expr.parts.map((c) => evalExpr(index, c));
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
          out = mergeSorted(out, evalExpr(index, c));
        }
        return out;
      }
      case 'not': {
        const excluded = evalExpr(index, expr.child);
        return allDocs(index).filter((d) => excluded.indexOf(d) < 0);
      }
      default:
        throw new Error('unknown expr');
    }
  }

  function candidates(index, plan) {
    if (plan.kind === 'ranked') {
      let out = [];
      for (const t of plan.terms) out = mergeSorted(out, postingDocs(index, t));
      for (const p of plan.phrases) out = mergeSorted(out, phraseDocs(index, p));
      return out;
    }
    return evalExpr(index, plan.expr);
  }

  function scoredTerms(plan) {
    const out = [];
    function walk(expr) {
      if (expr.kind === 'term') out.push(expr.term);
      else if (expr.kind === 'phrase') out.push(...expr.words);
      else if (expr.kind === 'and' || expr.kind === 'or')
        expr.parts.forEach(walk);
      else if (expr.kind === 'not') walk(expr.child);
    }
    if (plan.kind === 'ranked') {
      out.push(...plan.terms);
      for (const p of plan.phrases) out.push(...p);
    } else {
      walk(plan.expr);
    }
    return out;
  }

  function search(index, scorer, plan, top) {
    const terms = scoredTerms(plan);
    const hits = candidates(index, plan).map((docId) => {
      const breakdown = [];
      const matches = [];
      let total = 0;
      for (const t of terms) {
        if (tf(index, t, docId) > 0) {
          const contrib = score(index, scorer, docId, [t]);
          total += contrib;
          breakdown.push({ term: t, score: contrib });
          matches.push(t);
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
    loadIndex: loadIndex,
    parseQuery: parseQuery,
    search: search,
    candidates: candidates,
    scoredTerms: scoredTerms,
    idf: idf,
    bm25: bm25,
    tfIdf: tfIdf,
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