/* Tabula web engine (fallback core, Phase 4).
 *
 * Binding context: the Swift `TabulaCore` package is the semantic authority
 * (77 headless oracle/law suites green). The SwiftWasm toolchain proof is
 * still deferred (see `tabula/docs/architecture.md`), so the interactive
 * grid needs a runnable core. This file is the documented fallback path the
 * blueprint anticipates: a zero-build JavaScript engine implementing the
 * same grammar, value domain, coercion table, error precedence, graph
 * algorithms, edit laws, and codecs behind the exact pinned `DirtyBatch`
 * wire shape (`seq`, `ranges`, `cells`; cells carry `s/c/r/v/d`). When the
 * WASM proof lands, only the batch producer swaps; the renderer, editor,
 * inspector, format, and view layers do not change.
 *
 * Parity boundary (Phase 5 hardening runs the shared oracle on both):
 * A1 notation with `$` is fully supported (R1C1 input is not parsed and
 * stays a parse error); array constants are a parse error; the function
 * surface below is the v1 set from research section 7 minus the documented
 * v2 deferrals (spill, XLOOKUP, INDIRECT, RAND, locale collation).
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  // ---------------------------------------------------------------- values

  /** Error precedence, research 4.4: CYCLE > REF > DIV/0 > NAME > VALUE > N/A > NUM. */
  const ERR_PREC = { "#CYCLE!": 7, "#REF!": 6, "#DIV/0!": 5, "#NAME?": 4, "#VALUE!": 3, "#N/A": 2, "#NUM!": 1 };
  const ERRORS = Object.keys(ERR_PREC);

  function combineErr(a, b) {
    return ERR_PREC[a] >= ERR_PREC[b] ? a : b;
  }

  function VNum(x) { return { t: "num", v: x }; }
  function VStr(s) { return { t: "str", v: s }; }
  function VBool(b) { return { t: "bool", v: !!b }; }
  function VErr(e) { return { t: "err", v: e }; }
  function VBlank() { return { t: "blank", v: 0 }; }

  function isErr(v) { return v.t === "err"; }

  /** Strict General-grammar parse (mirrors Swift `parseGeneralNumber`). */
  function parseGeneralNumber(s) {
    const t = s.trim();
    if (t === "") return null;
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) return null;
    const v = Number(t);
    if (!Number.isFinite(v)) return null;
    return v;
  }

  /** General renderer (mirrors Swift `formatGeneral`, research 12.8). */
  function formatGeneral(x) {
    if (x === 0) return "0";
    if (Number.isInteger(x) && Math.abs(x) < 9.0e14) return String(x);
    return String(x);
  }

  function toNumber(v) {
    if (v.t === "num") return { ok: true, v: v.v };
    if (v.t === "bool") return { ok: true, v: v.v ? 1 : 0 };
    if (v.t === "blank") return { ok: true, v: 0 };
    if (v.t === "err") return { ok: false, e: v.v };
    const n = parseGeneralNumber(v.v);
    return n === null ? { ok: false, e: "#VALUE!" } : { ok: true, v: n };
  }

  function toString(v) {
    if (v.t === "str") return { ok: true, v: v.v };
    if (v.t === "num") return { ok: true, v: formatGeneral(v.v) };
    if (v.t === "bool") return { ok: true, v: v.v ? "TRUE" : "FALSE" };
    if (v.t === "blank") return { ok: true, v: "" };
    return { ok: false, e: v.v };
  }

  function toBool(v) {
    if (v.t === "bool") return { ok: true, v: v.v };
    if (v.t === "num") return { ok: true, v: v.v !== 0 };
    if (v.t === "blank") return { ok: true, v: false };
    if (v.t === "err") return { ok: false, e: v.v };
    const t = v.v.trim();
    if (/^true$/i.test(t)) return { ok: true, v: true };
    if (/^false$/i.test(t)) return { ok: true, v: false };
    return { ok: false, e: "#VALUE!" };
  }

  function typeRank(v) {
    return v.t === "blank" ? 0 : v.t === "num" ? 1 : v.t === "str" ? 2 : v.t === "bool" ? 3 : 4;
  }

  /** Three-way comparison over blank < number < string < bool (research 4.3). */
  function compareValues(l, r) {
    if (isErr(l)) return { ok: false, e: isErr(r) ? combineErr(l.v, r.v) : l.v };
    if (isErr(r)) return { ok: false, e: r.v };
    if (l.t === "blank" && r.t === "blank") return { ok: true, c: 0 };
    if (l.t === "blank") return { ok: true, c: -1 };
    if (r.t === "blank") return { ok: true, c: 1 };
    if (l.t === r.t) {
      if (l.t === "num") return { ok: true, c: l.v < r.v ? -1 : l.v > r.v ? 1 : 0 };
      if (l.t === "str") return { ok: true, c: l.v < r.v ? -1 : l.v > r.v ? 1 : 0 };
      return { ok: true, c: l.v === r.v ? 0 : l.v ? 1 : -1 };
    }
    return { ok: true, c: typeRank(l) < typeRank(r) ? -1 : 1 };
  }

  // ------------------------------------------------------------ column codec

  function colEncode(col) {
    if (col < 0 || col >= 16384) return null;
    let n = col + 1, out = "";
    while (n > 0) { n -= 1; out = String.fromCharCode(65 + (n % 26)) + out; n = Math.floor(n / 26); }
    return out;
  }

  function colDecode(letters) {
    if (!/^[A-Za-z]+$/.test(letters)) return null;
    const u = letters.toUpperCase();
    let n = 0;
    for (const ch of u) n = n * 26 + (ch.charCodeAt(0) - 64);
    const col = n - 1;
    return col >= 0 && col < 16384 ? col : null;
  }

  function a1(col, row) { return (colEncode(col) || "?") + (row + 1); }

  // ----------------------------------------------------------------- lexer

  const TOK = { NUM: 1, STR: 2, NAME: 3, CELL: 4, OP: 5, LP: 6, RP: 7, COMMA: 8, COLON: 9, BANG: 10, EOF: 11, ERR: 12 };

  function lex(src) {
    const toks = [];
    let i = 0, n = src.length;
    function errAt(p, msg) { toks.push({ k: TOK.ERR, pos: p, msg }); }
    while (i < n) {
      const ch = src[i];
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { i++; continue; }
      if (ch >= "0" && ch <= "9" || (ch === "." && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9")) {
        const m = /^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/.exec(src.slice(i));
        toks.push({ k: TOK.NUM, v: Number(m[0]), pos: i });
        i += m[0].length;
        continue;
      }
      if (ch === '"') {
        let j = i + 1, out = "";
        while (j < n && src[j] !== '"') { out += src[j]; j++; }
        if (j >= n) { errAt(i, "unterminated string"); i = n; break; }
        toks.push({ k: TOK.STR, v: out, pos: i });
        i = j + 1;
        continue;
      }
      if (ch === "'") {
        let j = i + 1, out = "";
        while (j < n && src[j] !== "'") { out += src[j]; j++; }
        if (j >= n) { errAt(i, "unterminated sheet quote"); i = n; break; }
        toks.push({ k: TOK.NAME, v: out, pos: i, quoted: true });
        i = j + 1;
        continue;
      }
      if (/[A-Za-z_\\$.]/.test(ch)) {
        let j = i;
        while (j < n && /[A-Za-z0-9_$\.]/.test(src[j])) j++;
        const word = src.slice(i, j);
        // Greedy-but-validated cell ref: LETTERS [$] DIGITS with no trailing letter/digit.
        const m = /^(\$?)([A-Za-z]+)(\$?)([0-9]+)$/.exec(word);
        if (m && colDecode(m[2]) !== null && Number(m[4]) >= 1 && Number(m[4]) <= 1048576 &&
            (j >= n || !/[A-Za-z0-9_\.]/.test(src[j]))) {
          toks.push({ k: TOK.CELL, colAbs: m[1] === "$", col: colDecode(m[2]), rowAbs: m[3] === "$", row: Number(m[4]) - 1, pos: i, text: word });
        } else {
          toks.push({ k: TOK.NAME, v: word, pos: i });
        }
        i = j;
        continue;
      }
      if (ch === "#") {
        const m = /^(#DIV\/0!|#REF!|#VALUE!|#NAME\?|#N\/A|#NUM!|#CYCLE!)/.exec(src.slice(i));
        if (m) { toks.push({ k: TOK.NUM, v: NaN, errLit: m[1], pos: i }); i += m[1].length; }
        else { errAt(i, "bad # literal"); i++; }
        continue;
      }
      const two = src.slice(i, i + 2);
      if (two === "<>" || two === "<=" || two === ">=") { toks.push({ k: TOK.OP, v: two, pos: i }); i += 2; continue; }
      if ("+-*/^&=<>%".includes(ch)) { toks.push({ k: TOK.OP, v: ch, pos: i }); i++; continue; }
      if (ch === "(") { toks.push({ k: TOK.LP, pos: i }); i++; continue; }
      if (ch === ")") { toks.push({ k: TOK.RP, pos: i }); i++; continue; }
      if (ch === ",") { toks.push({ k: TOK.COMMA, pos: i }); i++; continue; }
      if (ch === ":") { toks.push({ k: TOK.COLON, pos: i }); i++; continue; }
      if (ch === "!") { toks.push({ k: TOK.BANG, pos: i }); i++; continue; }
      errAt(i, "unexpected " + JSON.stringify(ch));
      i++;
    }
    toks.push({ k: TOK.EOF, pos: n });
    return toks;
  }

  // ----------------------------------------------------------------- parser
  // Precedence: comparison < & < additive < multiplicative < power (right)
  // < unary < postfix % < primary. -2^2 = -4, 2^3^2 = 512.

  function parseFormula(src, host) {
    // src includes the leading "=".
    const toks = lex(src.slice(1));
    let p = 0;
    function peek() { return toks[p]; }
    function next() { return toks[p++]; }
    function fail(pos, msg) { throw { pos, msg }; }

    function parseExpr() { return parseCompare(); }

    function parseCompare() {
      let l = parseConcat();
      for (;;) {
        const t = peek();
        if (t.k === TOK.OP && ["=", "<>", "<", ">", "<=", ">="].includes(t.v)) {
          next();
          const r = parseConcat();
          l = { t: "bin", op: t.v, l, r };
        } else return l;
      }
    }

    function parseConcat() {
      let l = parseAdd();
      while (peek().k === TOK.OP && peek().v === "&") {
        next();
        l = { t: "bin", op: "&", l, r: parseAdd() };
      }
      return l;
    }

    function parseAdd() {
      let l = parseMul();
      for (;;) {
        const t = peek();
        if (t.k === TOK.OP && (t.v === "+" || t.v === "-")) {
          next();
          l = { t: "bin", op: t.v, l, r: parseMul() };
        } else return l;
      }
    }

    function parseMul() {
      let l = parseUnary();
      for (;;) {
        const t = peek();
        if (t.k === TOK.OP && (t.v === "*" || t.v === "/")) {
          next();
          l = { t: "bin", op: t.v, l, r: parseUnary() };
        } else return l;
      }
    }

    function parsePow() {
      // Base is postfix (not unary) so -2^2 parses as -(2^2) = -4, while
      // the exponent stays unary so 2^-3 parses as 2^(-3).
      const base = parsePostfix();
      if (peek().k === TOK.OP && peek().v === "^") {
        next();
        return { t: "bin", op: "^", l: base, r: parseUnary() };
      }
      return base;
    }

    function parseUnary() {
      const t = peek();
      if (t.k === TOK.OP && (t.v === "+" || t.v === "-")) {
        next();
        return { t: "un", op: t.v, e: parseUnary() };
      }
      return parsePow();
    }

    function parsePostfix() {
      let e = parsePrimary();
      while (peek().k === TOK.OP && peek().v === "%") { next(); e = { t: "pct", e }; }
      return e;
    }

    function cellNode(tok, sheetName) {
      return {
        t: "ref", c: tok.col, r: tok.row, cAbs: tok.colAbs, rAbs: tok.rowAbs,
        baseC: host.c, baseR: host.r, sheet: sheetName === undefined ? null : sheetName,
        dangling: false,
      };
    }

    function parsePrimary() {
      const t = peek();
      if (t.k === TOK.NUM) {
        next();
        if (t.errLit) return { t: "errLit", code: t.errLit };
        return { t: "num", v: t.v };
      }
      if (t.k === TOK.STR) { next(); return { t: "str", v: t.v }; }
      if (t.k === TOK.LP) {
        next();
        const e = parseExpr();
        if (peek().k !== TOK.RP) fail(peek().pos, "expected )");
        next();
        return e;
      }
      if (t.k === TOK.CELL || t.k === TOK.NAME) {
        // Sheet-qualified ref: NAME ! CELL [ : CELL ].
        if (t.k === TOK.NAME && toks[p + 1] && toks[p + 1].k === TOK.BANG) {
          const sheetName = t.v;
          next(); next();
          const c = peek();
          if (c.k !== TOK.CELL) fail(c.pos, "expected cell after !");
          next();
          const lo = cellNode(c, sheetName);
          if (peek().k === TOK.COLON && toks[p + 1] && toks[p + 1].k === TOK.CELL) {
            next();
            const c2 = next();
            return { t: "range", lo, hi: cellNode(c2, sheetName) };
          }
          return lo;
        }
        if (t.k === TOK.CELL) {
          next();
          const lo = cellNode(t);
          // Ref-shaped call rule: NAME-like followed by ( is a call; a bare
          // CELL followed by ( is a parse error (matches Swift LOG10( rule).
          if (peek().k === TOK.LP) fail(t.pos, "cell is not callable");
          if (peek().k === TOK.COLON && toks[p + 1] && toks[p + 1].k === TOK.CELL) {
            next();
            const c2 = next();
            return { t: "range", lo, hi: cellNode(c2) };
          }
          return lo;
        }
        // NAME: TRUE/FALSE literal, call, or named reference.
        const word = t.v;
        const up = word.toUpperCase();
        if ((up === "TRUE" || up === "FALSE") && (!toks[p + 1] || toks[p + 1].k !== TOK.LP)) {
          next();
          return { t: "bool", v: up === "TRUE" };
        }
        if (toks[p + 1] && toks[p + 1].k === TOK.LP) {
          next(); next();
          const args = [];
          if (peek().k !== TOK.RP) {
            for (;;) {
              args.push(parseExpr());
              if (peek().k === TOK.COMMA) { next(); continue; }
              break;
            }
          }
          if (peek().k !== TOK.RP) fail(peek().pos, "expected )");
          next();
          return { t: "call", fn: up, args };
        }
        next();
        return { t: "name", v: up };
      }
      fail(t.pos, t.k === TOK.EOF ? "unexpected end" : "unexpected token");
      return null;
    }

    try {
      const e = parseExpr();
      if (peek().k !== TOK.EOF) fail(peek().pos, "trailing input");
      return { ok: true, expr: e };
    } catch (f) {
      return { ok: false, pos: 1 + (f.pos || 0), msg: f.msg || "parse error" };
    }
  }

  /** Round-trip printer: parse(print(parse(s))) == parse(s). */
  function printExpr(e) {
    switch (e.t) {
      case "num": return formatGeneral(e.v);
      case "str": return '"' + e.v + '"';
      case "bool": return e.v ? "TRUE" : "FALSE";
      case "errLit": return e.code;
      case "name": return e.v;
      case "ref": return printRef(e);
      case "range": return printRef(e.lo) + ":" + printRef(e.hi);
      case "call": return e.fn + "(" + e.args.map(printExpr).join(",") + ")";
      case "un": return e.op + printExpr(e.e);
      case "pct": return printExpr(e.e) + "%";
      case "bin": return "(" + printExpr(e.l) + e.op + printExpr(e.r) + ")";
    }
    return "";
  }

  function printRef(r) {
    const q = r.sheet === null || r.sheet === undefined ? "" : (/^[A-Za-z0-9_]+$/.test(r.sheet) ? r.sheet : "'" + r.sheet + "'") + "!";
    return q + (r.cAbs ? "$" : "") + (colEncode(r.c) || "?") + (r.rAbs ? "$" : "") + (r.r + 1);
  }

  // ------------------------------------------------------------- date model
  // Serial epoch 1899-12-30 with the Lotus-bug phantom day 60 (matches Swift Clock).

  function isLeap(y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0); }

  function ymdToSerial(y, m, d) {
    // Overflow normalization (DATE(2024,13,40) rolls forward).
    let yy = y, mm = m, dd = d;
    while (mm < 1) { mm += 12; yy -= 1; }
    while (mm > 12) { mm -= 12; yy += 1; }
    const dim = [0, 31, isLeap(yy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    while (dd < 1) {
      mm -= 1;
      if (mm < 1) { mm = 12; yy -= 1; }
      dd += [0, 31, isLeap(yy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm];
    }
    while (dd > dim[mm]) {
      dd -= dim[mm];
      mm += 1;
      if (mm > 12) { mm = 1; yy += 1; }
    }
    const base = Date.UTC(1899, 11, 30) / 86400000;
    let serial = Math.round(Date.UTC(yy, mm - 1, dd) / 86400000 - base);
    if (serial >= 60) serial += 1; // phantom 1900-02-29: serial 60 never produced
    return serial;
  }

  function serialToYMD(s) {
    if (s === 60) return { y: 1900, m: 2, d: 29 }; // phantom, display only
    const base = Date.UTC(1899, 11, 30) / 86400000;
    const adj = s > 60 ? s - 1 : s;
    const dt = new Date((base + adj) * 86400000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  function todaySerial() {
    const now = new Date();
    return ymdToSerial(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  // ---------------------------------------------------------------- evaluator

  function resolveRef(r, host, sheetIndex) {
    if (r.dangling) return null;
    let s = host.s;
    if (r.sheet !== null && r.sheet !== undefined) {
      const idx = sheetIndex(r.sheet);
      if (idx === null || idx === undefined) return null;
      s = idx;
    }
    const c = r.cAbs ? r.c : r.c - r.baseC + host.c;
    const row = r.rAbs ? r.r : r.r - r.baseR + host.r;
    if (c < 0 || row < 0 || c >= 16384 || row >= 1048576) return null;
    return { s, c, r: row };
  }

  function resolveRange(lo, hi, host, sheetIndex) {
    const a = resolveRef(lo, host, sheetIndex);
    const b = resolveRef(hi, host, sheetIndex);
    if (!a || !b) return null;
    const s = a.s;
    if (b.s !== s) return null;
    return {
      s,
      c0: Math.min(a.c, b.c), r0: Math.min(a.r, b.r),
      c1: Math.max(a.c, b.c), r1: Math.max(a.r, b.r),
    };
  }

  function key(s, c, r) { return s + ":" + c + ":" + r; }

  /** Fold args: literals coerce, range members that are text/bool skip
   * (mirrors Swift Builtins literal-coerce/member-skip split). Returns
   * {nums, count, err} with worst-precedence error. */
  function foldNumbers(evaluatedArgs) {
    const nums = [];
    let count = 0, err = null;
    function note(e) { err = err === null ? e : combineErr(err, e); }
    for (const a of evaluatedArgs) {
      if (a.range) {
        for (const v of a.range) {
          if (v.t === "num") { nums.push(v.v); count++; }
          else if (v.t === "err") note(v.v);
          // text/bool/blank members skip
        }
      } else {
        const v = a.value;
        if (v.t === "num") { nums.push(v.v); count++; }
        else if (v.t === "err") note(v.v);
        else if (v.t === "bool") { nums.push(v.v ? 1 : 0); count++; }
        else if (v.t === "blank") { /* skip */ }
        else {
          const n = toNumber(v);
          if (n.ok) { nums.push(n.v); count++; }
          else note(n.e);
        }
      }
    }
    return { nums, count, err };
  }

  function countA(evaluatedArgs) {
    let n = 0, err = null;
    for (const a of evaluatedArgs) {
      if (a.range) {
        for (const v of a.range) {
          if (v.t === "err") err = err === null ? v.v : combineErr(err, v.v);
          else if (v.t !== "blank") n++;
        }
      } else if (a.value.t === "err") {
        err = err === null ? a.value.v : combineErr(err, a.value.v);
      } else if (a.value.t !== "blank") n++;
    }
    return { n, err };
  }

  function roundHalfAway(x, n) {
    const f = Math.pow(10, n);
    if (n >= 0) return Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9) / f;
    const g = Math.pow(10, -n);
    return Math.sign(x) * Math.round(Math.abs(x) / g) * g;
  }

  function scalarArg(a, conv) {
    // Range in scalar position: top-left rule.
    const v = a.range ? (a.range.length ? a.range[0] : VBlank()) : a.value;
    if (isErr(v)) return { ok: false, e: v.v };
    return conv(v);
  }

  function lookupKey(v) {
    if (v.t === "num") return "n:" + v.v;
    if (v.t === "str") return "s:" + v.v.toLowerCase();
    if (v.t === "bool") return "b:" + (v.v ? 1 : 0);
    return null;
  }

  function makeEval(ctx) {
    // ctx: {lookup(k)->value, rangeVals(rect)->[values row-major],
    //       sheetIndex(name)->idx|null, nameAddrs(UP)->[{s,c,r}]|null,
    //       nameTainted(UP)->bool, today}
    function ev(e, host) {
      switch (e.t) {
        case "num": return VNum(e.v);
        case "str": return VStr(e.v);
        case "bool": return VBool(e.v);
        case "errLit": return VErr(e.code);
        case "name": {
          if (ctx.nameTainted(e.v)) return VErr("#REF!");
          const addrs = ctx.nameAddrs(e.v);
          if (!addrs) return VErr("#NAME?");
          if (addrs.length === 1) return ctx.lookup(key(addrs[0].s, addrs[0].c, addrs[0].r));
          return VErr("#VALUE!");
        }
        case "ref": {
          const a = resolveRef(e, host, ctx.sheetIndex);
          if (!a) return VErr("#REF!");
          return ctx.lookup(key(a.s, a.c, a.r));
        }
        case "range": {
          const rc = resolveRange(e.lo, e.hi, host, ctx.sheetIndex);
          if (!rc) return VErr("#REF!");
          return topLeft(rc);
        }
        case "un": {
          const v = ev(e.e, host);
          if (isErr(v)) return v;
          const n = toNumber(v);
          if (!n.ok) return VErr(n.e);
          return VNum(e.op === "-" ? -n.v : n.v);
        }
        case "pct": {
          const v = ev(e.e, host);
          if (isErr(v)) return v;
          const n = toNumber(v);
          if (!n.ok) return VErr(n.e);
          return VNum(n.v / 100);
        }
        case "bin": return evBin(e, host);
        case "call": return evCall(e, host);
      }
      return VErr("#NAME?");
    }

    function topLeft(rc) {
      const vals = ctx.rangeVals(rc);
      return vals.length ? vals[0] : VBlank();
    }

    function evBin(e, host) {
      const l = ev(e.l, host), r = ev(e.r, host);
      const op = e.op;
      if (op === "&") {
        if (isErr(l)) return isErr(r) ? VErr(combineErr(l.v, r.v)) : l;
        if (isErr(r)) return r;
        const a = toString(l), b = toString(r);
        if (!a.ok) return VErr(a.e);
        if (!b.ok) return VErr(b.e);
        return VStr(a.v + b.v);
      }
      if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
        const c = compareValues(l, r);
        if (!c.ok) return VErr(c.e);
        let out;
        if (op === "=") out = c.c === 0;
        else if (op === "<>") {
          // Cross-type =/<> never coerce: FALSE/TRUE except blank=blank.
          out = c.c !== 0;
        }
        else if (op === "<") out = c.c < 0;
        else if (op === ">") out = c.c > 0;
        else if (op === "<=") out = c.c <= 0;
        else out = c.c >= 0;
        return VBool(out);
      }
      if (isErr(l)) return isErr(r) ? VErr(combineErr(l.v, r.v)) : l;
      if (isErr(r)) return r;
      const a = toNumber(l), b = toNumber(r);
      if (!a.ok) return VErr(a.e);
      if (!b.ok) return VErr(b.e);
      const x = a.v, y = b.v;
      switch (op) {
        case "+": return VNum(x + y);
        case "-": return VNum(x - y);
        case "*": return VNum(x * y);
        case "/": return y === 0 ? VErr("#DIV/0!") : VNum(x / y);
        case "^": {
          const p = Math.pow(x, y);
          if (Number.isNaN(p)) return VErr("#NUM!");
          return VNum(p);
        }
      }
      return VErr("#NAME?");
    }

    /** Evaluate call args to {value} or {range:[values], rect} (row-major).
     * Rectangles ride along for the lookup functions (VLOOKUP/HLOOKUP/
     * INDEX/ROW/COLUMN); folds ignore them. */
    function evArgs(args, host) {
      return args.map((a) => {
        if (a.t === "range") {
          const rc = resolveRange(a.lo, a.hi, host, ctx.sheetIndex);
          if (!rc) return { range: null, bad: "#REF!" };
          return { range: ctx.rangeVals(rc), rect: rc };
        }
        if (a.t === "ref") {
          const ad = resolveRef(a, host, ctx.sheetIndex);
          if (!ad) return { value: VErr("#REF!") };
          return { value: ctx.lookup(key(ad.s, ad.c, ad.r)) };
        }
        if (a.t === "name") {
          if (ctx.nameTainted(a.v)) return { value: VErr("#REF!") };
          const addrs = ctx.nameAddrs(a.v);
          if (!addrs) return { value: ev(a, host) };
          return { range: addrs.map((m) => ctx.lookup(key(m.s, m.c, m.r))) };
        }
        return { value: ev(a, host) };
      });
    }

    function evCall(e, host) {
      const fn = e.fn;
      // Lazy / short-circuit forms evaluate their own args.
      if (fn === "IF") {
        if (e.args.length < 2 || e.args.length > 3) return VErr("#VALUE!");
        const c = ev(e.args[0], host);
        if (isErr(c)) return c;
        const b = toBool(c);
        if (!b.ok) return VErr(b.e);
        if (b.v) return ev(e.args[1], host);
        return e.args.length === 3 ? ev(e.args[2], host) : VBool(false);
      }
      if (fn === "AND" || fn === "OR") {
        let firstErr = null, decisive = null;
        for (const a of e.args) {
          const v = ev(a, host);
          if (isErr(v)) {
            // Range in AND/OR folds members; scalar errors record.
            firstErr = firstErr === null ? v.v : combineErr(firstErr, v.v);
            continue;
          }
          if (a.t === "range") {
            const rc = resolveRange(a.lo, a.hi, host, ctx.sheetIndex);
            if (!rc) { firstErr = firstErr === null ? "#REF!" : combineErr(firstErr, "#REF!"); continue; }
            for (const m of ctx.rangeVals(rc)) {
              if (isErr(m)) { firstErr = firstErr === null ? m.v : combineErr(firstErr, m.v); continue; }
              if (m.t === "num" || m.t === "bool") {
                const truthy = m.t === "bool" ? m.v : m.v !== 0;
                if (fn === "AND" && !truthy) { decisive = false; break; }
                if (fn === "OR" && truthy) { decisive = true; break; }
              }
            }
            if (decisive !== null) break;
            continue;
          }
          const b = toBool(v);
          if (!b.ok) { firstErr = firstErr === null ? b.e : combineErr(firstErr, b.e); continue; }
          if (fn === "AND" && !b.v) { decisive = false; break; }
          if (fn === "OR" && b.v) { decisive = true; break; }
        }
        // Prior-error-wins: an error seen before the decisive literal wins.
        // (Short-circuit: evaluation stops at the decisive literal, so a
        // later error is never even observed.)
        if (decisive !== null) return firstErr !== null ? VErr(firstErr) : VBool(decisive);
        if (firstErr !== null) return VErr(firstErr);
        return VBool(fn === "AND");
      }
      if (fn === "IFERROR") {
        if (e.args.length !== 2) return VErr("#VALUE!");
        const v = ev(e.args[0], host);
        return isErr(v) ? ev(e.args[1], host) : v;
      }
      if (fn === "IFNA") {
        if (e.args.length !== 2) return VErr("#VALUE!");
        const v = ev(e.args[0], host);
        return isErr(v) && v.v === "#N/A" ? ev(e.args[1], host) : v;
      }
      if (fn === "CHOOSE") {
        if (e.args.length < 2) return VErr("#VALUE!");
        const i = ev(e.args[0], host);
        if (isErr(i)) return i;
        const n = toNumber(i);
        if (!n.ok) return VErr(n.e);
        const k = Math.floor(n.v);
        if (k < 1 || k > e.args.length - 1) return VErr("#VALUE!");
        return ev(e.args[k], host);
      }
      const args = evArgs(e.args, host);
      for (const a of args) if (a.bad) return VErr(a.bad);
      const firstErrOf = () => {
        let err = null;
        for (const a of args) {
          const vs = a.range || [a.value];
          for (const v of vs) if (isErr(v)) err = err === null ? v.v : combineErr(err, v.v);
        }
        return err;
      };
      switch (fn) {
        case "SUM": case "AVERAGE": case "MIN": case "MAX": case "COUNT": case "PRODUCT": {
          const f = foldNumbers(args);
          if (fn === "COUNT") return f.err ? VErr(f.err) : VNum(f.count);
          if (f.err && f.nums.length === 0) return VErr(f.err);
          if (fn === "SUM" || fn === "PRODUCT") {
            if (f.nums.length === 0) return f.err ? VErr(f.err) : VNum(fn === "SUM" ? 0 : 1);
            const v = fn === "SUM" ? f.nums.reduce((x, y) => x + y, 0) : f.nums.reduce((x, y) => x * y, 1);
            return VNum(v);
          }
          if (f.nums.length === 0) return VErr("#DIV/0!");
          if (fn === "MIN") return VNum(Math.min(...f.nums));
          if (fn === "MAX") return VNum(Math.max(...f.nums));
          return VNum(f.nums.reduce((x, y) => x + y, 0) / f.nums.length);
        }
        case "COUNTA": {
          const c = countA(args);
          return c.err ? VErr(c.err) : VNum(c.n);
        }
        case "ABS": case "INT": case "SQRT": case "EXP": case "SIN": case "COS": case "TAN": {
          if (args.length !== 1) return VErr("#VALUE!");
          const s = scalarArg(args[0], toNumber);
          if (!s.ok) return VErr(s.e);
          const x = s.v;
          if (fn === "ABS") return VNum(Math.abs(x));
          if (fn === "INT") return VNum(Math.floor(x));
          if (fn === "SQRT") return x < 0 ? VErr("#NUM!") : VNum(Math.sqrt(x));
          if (fn === "EXP") return VNum(Math.exp(x));
          if (fn === "SIN") return VNum(Math.sin(x));
          if (fn === "COS") return VNum(Math.cos(x));
          return VNum(Math.tan(x));
        }
        case "LN": case "LOG10": {
          if (args.length !== 1) return VErr("#VALUE!");
          const s = scalarArg(args[0], toNumber);
          if (!s.ok) return VErr(s.e);
          if (s.v <= 0) return VErr("#NUM!");
          return VNum(fn === "LN" ? Math.log(s.v) : Math.log10(s.v));
        }
        case "LOG": {
          if (args.length < 1 || args.length > 2) return VErr("#VALUE!");
          const x = scalarArg(args[0], toNumber);
          if (!x.ok) return VErr(x.e);
          let base = 10;
          if (args.length === 2) {
            const b = scalarArg(args[1], toNumber);
            if (!b.ok) return VErr(b.e);
            base = b.v;
          }
          if (x.v <= 0 || base <= 0 || base === 1) return VErr("#NUM!");
          return VNum(Math.log(x.v) / Math.log(base));
        }
        case "POWER": {
          if (args.length !== 2) return VErr("#VALUE!");
          const x = scalarArg(args[0], toNumber), y = scalarArg(args[1], toNumber);
          if (!x.ok) return VErr(x.e);
          if (!y.ok) return VErr(y.e);
          const p = Math.pow(x.v, y.v);
          return Number.isNaN(p) ? VErr("#NUM!") : VNum(p);
        }
        case "MOD": {
          if (args.length !== 2) return VErr("#VALUE!");
          const x = scalarArg(args[0], toNumber), y = scalarArg(args[1], toNumber);
          if (!x.ok) return VErr(x.e);
          if (!y.ok) return VErr(y.e);
          if (y.v === 0) return VErr("#DIV/0!");
          let r = x.v % y.v;
          if (r !== 0 && (r < 0) !== (y.v < 0)) r += y.v; // sign follows divisor
          return VNum(r === 0 ? 0 : r);
        }
        case "ROUND": case "TRUNC": {
          if (args.length < 1 || args.length > 2) return VErr("#VALUE!");
          const x = scalarArg(args[0], toNumber);
          if (!x.ok) return VErr(x.e);
          let n = 0;
          if (args.length === 2) {
            const d = scalarArg(args[1], toNumber);
            if (!d.ok) return VErr(d.e);
            n = Math.trunc(d.v);
          }
          if (fn === "TRUNC") {
            const f = Math.pow(10, n);
            const t = n >= 0 ? Math.trunc(x.v * f) / f : Math.trunc(x.v / Math.pow(10, -n)) * Math.pow(10, -n);
            return VNum(t === 0 ? 0 : t);
          }
          return VNum(roundHalfAway(x.v, n));
        }
        case "PI": return VNum(Math.PI);
        case "TRUE": return VBool(true);
        case "FALSE": return VBool(false);
        case "NOT": {
          if (args.length !== 1) return VErr("#VALUE!");
          const s = scalarArg(args[0], toBool);
          return !s.ok ? VErr(s.e) : VBool(!s.v);
        }
        case "CONCAT": case "CONCATENATE": {
          let out = "";
          for (const a of args) {
            const vs = a.range || [a.value];
            for (const v of vs) {
              if (isErr(v)) return v;
              if (v.t === "blank") continue;
              const s = toString(v);
              if (!s.ok) return VErr(s.e);
              out += s.v;
            }
          }
          return VStr(out);
        }
        case "TEXTJOIN": {
          if (args.length < 3) return VErr("#VALUE!");
          const d = scalarArg(args[0], toString);
          const ign = scalarArg(args[1], toBool);
          if (!d.ok) return VErr(d.e);
          if (!ign.ok) return VErr(ign.e);
          const parts = [];
          for (const a of args.slice(2)) {
            const vs = a.range || [a.value];
            for (const v of vs) {
              if (isErr(v)) return v;
              if (v.t === "blank") { if (!ign.v) parts.push(""); continue; }
              const s = toString(v);
              if (!s.ok) return VErr(s.e);
              if (s.v === "" && ign.v) continue;
              parts.push(s.v);
            }
          }
          return VStr(parts.join(d.v));
        }
        case "LEFT": case "RIGHT": {
          if (args.length < 1 || args.length > 2) return VErr("#VALUE!");
          const s = scalarArg(args[0], toString);
          if (!s.ok) return VErr(s.e);
          let n = 1;
          if (args.length === 2) {
            const k = scalarArg(args[1], toNumber);
            if (!k.ok) return VErr(k.e);
            if (k.v < 0) return VErr("#VALUE!");
            n = Math.floor(k.v);
          }
          const chars = [...s.v];
          return VStr(fn === "LEFT" ? chars.slice(0, n).join("") : chars.slice(Math.max(0, chars.length - n)).join(""));
        }
        case "MID": {
          if (args.length !== 3) return VErr("#VALUE!");
          const s = scalarArg(args[0], toString);
          const st = scalarArg(args[1], toNumber);
          const ln = scalarArg(args[2], toNumber);
          if (!s.ok) return VErr(s.e);
          if (!st.ok) return VErr(st.e);
          if (!ln.ok) return VErr(ln.e);
          if (st.v < 1 || ln.v < 0) return VErr("#VALUE!");
          return VStr([...s.v].slice(Math.floor(st.v) - 1, Math.floor(st.v) - 1 + Math.floor(ln.v)).join(""));
        }
        case "LEN": {
          if (args.length !== 1) return VErr("#VALUE!");
          const s = scalarArg(args[0], toString);
          return !s.ok ? VErr(s.e) : VNum([...s.v].length);
        }
        case "UPPER": case "LOWER": {
          if (args.length !== 1) return VErr("#VALUE!");
          const s = scalarArg(args[0], toString);
          if (!s.ok) return VErr(s.e);
          return VStr(fn === "UPPER" ? s.v.toUpperCase() : s.v.toLowerCase());
        }
        case "TRIM": {
          if (args.length !== 1) return VErr("#VALUE!");
          const s = scalarArg(args[0], toString);
          if (!s.ok) return VErr(s.e);
          return VStr(s.v.replace(/ +/g, " ").replace(/^ | $/g, ""));
        }
        case "VALUE": {
          if (args.length !== 1) return VErr("#VALUE!");
          const a = args[0];
          const v = a.range ? (a.range.length ? a.range[0] : VBlank()) : a.value;
          if (v.t === "bool") return VErr("#VALUE!");
          if (isErr(v)) return v;
          if (v.t === "num") return v;
          const n = parseGeneralNumber(v.t === "blank" ? "" : v.v);
          return n === null ? VErr("#VALUE!") : VNum(n);
        }
        case "TEXT": {
          if (args.length !== 2) return VErr("#VALUE!");
          const a = args[0];
          const v = a.range ? (a.range.length ? a.range[0] : VBlank()) : a.value;
          if (isErr(v)) return v;
          const f = scalarArg(args[1], toString);
          if (!f.ok) return VErr(f.e);
          return VStr(textFormat(v, f.v));
        }
        case "VLOOKUP": case "HLOOKUP": {
          const vertical = fn === "VLOOKUP";
          if (args.length < 3 || args.length > 4) return VErr("#VALUE!");
          const lk = args[0];
          const lv = lk.range ? (lk.range.length ? lk.range[0] : VBlank()) : lk.value;
          if (isErr(lv)) return lv;
          if (!args[1].range) return VErr("#VALUE!");
          const tbl = args[1];
          // Reconstruct grid shape: need rect dims; approximate from lookup
          // of the original AST is unavailable here, so VLOOKUP requires
          // the table arg to carry its rectangle.
          if (!tbl.rect) return VErr("#VALUE!");
          const idx = scalarArg(args[2], toNumber);
          if (!idx.ok) return VErr(idx.e);
          const k = Math.floor(idx.v);
          const rc = tbl.rect;
          const span = vertical ? rc.c1 - rc.c0 + 1 : rc.r1 - rc.r0 + 1;
          if (k < 1 || k > span) return VErr("#REF!");
          let approx = false;
          if (args.length === 4) {
            const m = scalarArg(args[3], toBool);
            if (!m.ok) return VErr(m.e);
            approx = !m.v;
          }
          return vertical
            ? vlookup(lv, rc, k, approx, ctx)
            : hlookup(lv, rc, k, approx, ctx);
        }
        case "INDEX": {
          if (args.length < 2 || args.length > 3) return VErr("#VALUE!");
          if (!args[0].range || !args[0].rect) return VErr("#VALUE!");
          const rc = args[0].rect;
          const rows = rc.r1 - rc.r0 + 1, cols = rc.c1 - rc.c0 + 1;
          const rr = scalarArg(args[1], toNumber);
          if (!rr.ok) return VErr(rr.e);
          let cc = { ok: true, v: 1 };
          if (args.length === 3) {
            cc = scalarArg(args[2], toNumber);
            if (!cc.ok) return VErr(cc.e);
          } else if (rows !== 1 && cols !== 1 && rows !== 1) {
            // Shape-default: single row/col vector picks the axis.
            if (cols === 1) cc = { ok: true, v: 1 };
          }
          const r = Math.floor(rr.v), c = Math.floor(cc.v);
          if (r < 1 || r > rows || c < 1 || c > cols) return VErr("#REF!");
          return ctx.lookup(key(rc.s, rc.c0 + c - 1, rc.r0 + r - 1));
        }
        case "MATCH": {
          if (args.length < 2 || args.length > 3) return VErr("#VALUE!");
          const lk = args[0];
          const lv = lk.range ? (lk.range.length ? lk.range[0] : VBlank()) : lk.value;
          if (isErr(lv)) return lv;
          if (!args[1].range) return VErr("#VALUE!");
          const vec = args[1].range;
          let mode = 0;
          if (args.length === 3) {
            const m = scalarArg(args[2], toNumber);
            if (!m.ok) return VErr(m.e);
            mode = Math.trunc(m.v);
            if (![0, 1, -1].includes(mode)) return VErr("#VALUE!");
          }
          return matchOne(lv, vec, mode);
        }
        case "ROW": {
          if (args.length > 1) return VErr("#VALUE!");
          if (args.length === 0) return VNum(host.r + 1);
          const a = args[0];
          if (a.range && a.rect) return VNum(a.rect.r0 + 1);
          const v = a.range ? (a.range.length ? a.range[0] : VBlank()) : a.value;
          if (isErr(v)) return v;
          return VNum(host.r + 1);
        }
        case "COLUMN": {
          if (args.length > 1) return VErr("#VALUE!");
          if (args.length === 0) return VNum(host.c + 1);
          const a = args[0];
          if (a.range && a.rect) return VNum(a.rect.c0 + 1);
          const v = a.range ? (a.range.length ? a.range[0] : VBlank()) : a.value;
          if (isErr(v)) return v;
          return VNum(host.c + 1);
        }
        case "TODAY": return VNum(ctx.today);
        case "NOW": return VNum(ctx.today);
        case "DATE": {
          if (args.length !== 3) return VErr("#VALUE!");
          const y = scalarArg(args[0], toNumber), m = scalarArg(args[1], toNumber), d = scalarArg(args[2], toNumber);
          if (!y.ok) return VErr(y.e);
          if (!m.ok) return VErr(m.e);
          if (!d.ok) return VErr(d.e);
          if (Math.trunc(y.v) < 0) return VErr("#NUM!");
          return VNum(ymdToSerial(Math.trunc(y.v), Math.trunc(m.v), Math.trunc(d.v)));
        }
        case "YEAR": case "MONTH": case "DAY": case "WEEKDAY": {
          if (args.length !== 1) return VErr("#VALUE!");
          const s = scalarArg(args[0], toNumber);
          if (!s.ok) return VErr(s.e);
          const ymd = serialToYMD(Math.trunc(s.v));
          if (fn === "YEAR") return VNum(ymd.y);
          if (fn === "MONTH") return VNum(ymd.m);
          if (fn === "DAY") return VNum(ymd.d);
          const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d));
          return VNum(dt.getUTCDay() + 1); // 1=Sunday
        }
        case "DAYS": {
          if (args.length !== 2) return VErr("#VALUE!");
          const a = scalarArg(args[0], toNumber), b = scalarArg(args[1], toNumber);
          if (!a.ok) return VErr(a.e);
          if (!b.ok) return VErr(b.e);
          return VNum(Math.trunc(a.v) - Math.trunc(b.v));
        }
        case "EDATE": case "EOMONTH": {
          if (args.length !== 2) return VErr("#VALUE!");
          const s = scalarArg(args[0], toNumber), m = scalarArg(args[1], toNumber);
          if (!s.ok) return VErr(s.e);
          if (!m.ok) return VErr(m.e);
          const ymd = serialToYMD(Math.trunc(s.v));
          let yy = ymd.y, mm = ymd.m + Math.trunc(m.v);
          while (mm < 1) { mm += 12; yy -= 1; }
          while (mm > 12) { mm -= 12; yy += 1; }
          const dim = [0, 31, isLeap(yy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm];
          const dd = fn === "EOMONTH" ? dim : Math.min(ymd.d, dim);
          return VNum(ymdToSerial(yy, mm, dd));
        }
        case "DATEDIF": {
          if (args.length !== 3) return VErr("#VALUE!");
          const a = scalarArg(args[0], toNumber), b = scalarArg(args[1], toNumber);
          const u = scalarArg(args[2], toString);
          if (!a.ok) return VErr(a.e);
          if (!b.ok) return VErr(b.e);
          if (!u.ok) return VErr(u.e);
          const s1 = serialToYMD(Math.trunc(a.v)), s2 = serialToYMD(Math.trunc(b.v));
          const t1 = Date.UTC(s1.y, s1.m - 1, s1.d), t2 = Date.UTC(s2.y, s2.m - 1, s2.d);
          if (t2 < t1) return VErr("#NUM!");
          const unit = u.v.toUpperCase();
          const dayDiff = Math.round((t2 - t1) / 86400000);
          if (unit === "D") return VNum(dayDiff);
          if (unit === "M") {
            let m = (s2.y - s1.y) * 12 + (s2.m - s1.m);
            if (s2.d < s1.d) m -= 1;
            return VNum(m);
          }
          if (unit === "Y") {
            let y = s2.y - s1.y;
            if (s2.m < s1.m || (s2.m === s1.m && s2.d < s1.d)) y -= 1;
            return VNum(y);
          }
          if (unit === "MD") {
            // Excel MD quirk: day difference ignoring months, can go negative.
            return VNum(s2.d - s1.d);
          }
          if (unit === "YM") {
            let m = (s2.m - s1.m) % 12;
            if (m < 0) m += 12;
            if (s2.d < s1.d) m = (m + 11) % 12;
            return VNum(m);
          }
          if (unit === "YD") {
            const anchor = Date.UTC(s2.y, s1.m - 1, s1.d);
            return VNum(Math.round((t2 - anchor) / 86400000));
          }
          return VErr("#NUM!");
        }
        case "ISNUMBER": case "ISTEXT": case "ISBLANK": case "ISERROR":
        case "ISNA": case "ISLOGICAL": {
          if (args.length !== 1) return VErr("#VALUE!");
          const a = args[0];
          const v = a.range ? (a.range.length ? a.range[0] : VBlank()) : a.value;
          switch (fn) {
            case "ISNUMBER": return VBool(v.t === "num");
            case "ISTEXT": return VBool(v.t === "str");
            case "ISBLANK": return VBool(v.t === "blank");
            case "ISERROR": return VBool(isErr(v));
            case "ISNA": return VBool(isErr(v) && v.v === "#N/A");
            case "ISLOGICAL": return VBool(v.t === "bool");
          }
          break;
        }
        case "SUMPRODUCT": {
          // Zero-for-text across aligned vectors (matches Swift).
          const vecs = [];
          for (const a of args) {
            if (!a.range) {
              const v = a.value;
              if (isErr(v)) return v;
              const n = toNumber(v);
              if (!n.ok) return VErr(n.e);
              vecs.push([n.v]);
            } else {
              const col = [];
              for (const v of a.range) {
                if (isErr(v)) return v;
                if (v.t === "num") col.push(v.v);
                else if (v.t === "bool") col.push(v.v ? 1 : 0);
                else if (v.t === "blank") col.push(0);
                else col.push(0); // text -> 0
              }
              vecs.push(col);
            }
          }
          const len = Math.max(...vecs.map((v) => v.length));
          if (vecs.some((v) => v.length !== 1 && v.length !== len)) return VErr("#VALUE!");
          let sum = 0;
          for (let i = 0; i < len; i++) {
            let p = 1;
            for (const v of vecs) p *= v.length === 1 ? v[0] : v[i];
            sum += p;
          }
          return VNum(sum);
        }
      }
      const err = firstErrOf();
      return err ? VErr(err) : VErr("#NAME?");
    }

    function textFormat(v, pat) {
      if (v.t === "num") {
        const x = v.v;
        if (pat === "0" || pat === "0.0" || pat === "0.00") {
          const d = pat.includes(".") ? pat.split(".")[1].length : 0;
          return fixed(x, d);
        }
        if (pat === "0%") return fixed(x * 100, 0) + "%";
        if (pat === "0.00%") return fixed(x * 100, 2) + "%";
        return formatGeneral(x);
      }
      const s = toString(v);
      return s.ok ? s.v : v.v;
    }

    function vlookup(lv, rc, k, approx, ctx) {
      const rows = rc.r1 - rc.r0 + 1;
      if (!approx) {
        for (let r = 0; r < rows; r++) {
          const cell = ctx.lookup(key(rc.s, rc.c0, rc.r0 + r));
          if (isErr(cell)) return cell;
          if (lookupEq(cell, lv)) return ctx.lookup(key(rc.s, rc.c0 + k - 1, rc.r0 + r));
        }
        return VErr("#N/A");
      }
      // Approximate: binary search over the sorted first column.
      let lo = 0, hi = rows - 1, best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const cell = ctx.lookup(key(rc.s, rc.c0, rc.r0 + mid));
        if (isErr(cell)) return cell;
        const c = compareValues(cell, lv);
        if (!c.ok) return VErr(c.e);
        if (c.c === 0) { best = mid; break; }
        if (c.c < 0) { best = mid; lo = mid + 1; }
        else hi = mid - 1;
      }
      if (best < 0) return VErr("#N/A");
      return ctx.lookup(key(rc.s, rc.c0 + k - 1, rc.r0 + best));
    }

    function hlookup(lv, rc, k, approx, ctx) {
      const cols = rc.c1 - rc.c0 + 1;
      if (!approx) {
        for (let c = 0; c < cols; c++) {
          const cell = ctx.lookup(key(rc.s, rc.c0 + c, rc.r0));
          if (isErr(cell)) return cell;
          if (lookupEq(cell, lv)) return ctx.lookup(key(rc.s, rc.c0 + c, rc.r0 + k - 1));
        }
        return VErr("#N/A");
      }
      let lo = 0, hi = cols - 1, best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const cell = ctx.lookup(key(rc.s, rc.c0 + mid, rc.r0));
        if (isErr(cell)) return cell;
        const c = compareValues(cell, lv);
        if (!c.ok) return VErr(c.e);
        if (c.c === 0) { best = mid; break; }
        if (c.c < 0) { best = mid; lo = mid + 1; }
        else hi = mid - 1;
      }
      if (best < 0) return VErr("#N/A");
      return ctx.lookup(key(rc.s, rc.c0 + best, rc.r0 + k - 1));
    }

    function lookupEq(a, b) {
      if (a.t !== b.t) {
        // Numeric-string cross match fails; bool/num cross fails.
        if (a.t === "str" && b.t === "str") return a.v.toLowerCase() === b.v.toLowerCase();
        return false;
      }
      if (a.t === "str") return a.v.toLowerCase() === b.v.toLowerCase();
      if (a.t === "num" || a.t === "bool") return a.v === b.v;
      return false;
    }

    function matchOne(lv, vec, mode) {
      if (mode === 0) {
        for (let i = 0; i < vec.length; i++) {
          const v = vec[i];
          if (isErr(v)) continue;
          if (lookupEq(v, lv)) return VNum(i + 1);
        }
        return VErr("#N/A");
      }
      if (mode === 1) {
        // Ascending binary: last <= lookup.
        let lo = 0, hi = vec.length - 1, best = -1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const c = compareValues(vec[mid], lv);
          if (!c.ok) return VErr(c.e);
          if (c.c <= 0) { best = mid; lo = mid + 1; }
          else hi = mid - 1;
        }
        return best < 0 ? VErr("#N/A") : VNum(best + 1);
      }
      // mode -1: descending binary: last >= lookup.
      let lo = 0, hi = vec.length - 1, best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const c = compareValues(vec[mid], lv);
        if (!c.ok) return VErr(c.e);
        if (c.c >= 0) { best = mid; lo = mid + 1; }
        else hi = mid - 1;
      }
      return best < 0 ? VErr("#N/A") : VNum(best + 1);
    }

    return { ev, evArgs };
  }

  function fixed(x, d) {
    if (!Number.isFinite(x)) return formatGeneral(x);
    const f = Math.pow(10, Math.max(0, d));
    let r = Math.round(Math.abs(x) * f + 1e-9) / f;
    if (r === 0) r = 0;
    let s = (x < 0 ? "-" : "") + String(r);
    if (d === 0) return (x < 0 ? "-" : "") + String(Math.trunc(r));
    if (!s.includes(".")) s += "." + "0".repeat(d);
    else {
      const have = s.split(".")[1].length;
      if (have < d) s += "0".repeat(d - have);
      else if (have > d) s = s.slice(0, s.length - (have - d));
    }
    return s;
  }

  // --------------------------------------------------------------- workbook

  function cellKey(c, r) { return c + ":" + r; }

  function literalOf(raw) {
    if (raw === "") return { kind: "blank" };
    if (raw[0] === "'") return { kind: "text", v: raw.slice(1) };
    const t = raw.trim();
    if (/^true$/i.test(t)) return { kind: "bool", v: true };
    if (/^false$/i.test(t)) return { kind: "bool", v: false };
    const n = parseGeneralNumber(t);
    if (n !== null) return { kind: "num", v: n };
    return { kind: "text", v: raw };
  }

  function literalValue(cell) {
    switch (cell.kind) {
      case "blank": return VBlank();
      case "num": return VNum(cell.v);
      case "text": return VStr(cell.v);
      case "bool": return VBool(cell.v);
      case "formula": return cell.parseError !== undefined ? VErr("#VALUE!") : null;
    }
    return VBlank();
  }

  function createWorkbook() {
    return {
      sheets: [{ name: "Sheet1", cells: new Map() }],
      names: new Map(), // UPPER -> [{s,c,r}] or {dangling:true}
      styles: new Map(), // key -> style
      values: new Map(), // key "s:c:r" -> value
      cyclePaths: [],
      undo: [],
      today: todaySerial(),
      seq: 0,
    };
  }

  function sheetIndexOf(wb, name) {
    const up = name.toUpperCase();
    for (let i = 0; i < wb.sheets.length; i++) {
      if (wb.sheets[i].name.toUpperCase() === up) return i;
    }
    return null;
  }

  function setCell(wb, s, c, r, raw) {
    const sheet = wb.sheets[s];
    if (!sheet) return;
    const k = cellKey(c, r);
    if (raw === "") { sheet.cells.delete(k); return; }
    if (raw[0] === "=") {
      const host = { s, c, r };
      const parsed = parseFormula(raw, host);
      if (!parsed.ok) sheet.cells.set(k, { kind: "formula", source: raw, parseError: parsed.pos });
      else sheet.cells.set(k, { kind: "formula", source: raw, expr: parsed.expr });
      return;
    }
    const lit = literalOf(raw);
    sheet.cells.set(k, Object.assign({ source: raw }, lit));
  }

  function allAddrs(wb) {
    const out = [];
    wb.sheets.forEach((sh, s) => {
      for (const k of sh.cells.keys()) {
        const [c, r] = k.split(":").map(Number);
        out.push({ s, c, r });
      }
    });
    return out;
  }

  function formulaMap(wb) {
    const fmap = new Map(); // key -> {addr, expr}
    wb.sheets.forEach((sh, s) => {
      for (const [k, cell] of sh.cells) {
        if (cell.kind === "formula" && cell.expr) {
          const [c, r] = k.split(":").map(Number);
          fmap.set(key(s, c, r), { addr: { s, c, r }, expr: substTainted(cell.expr, wb) });
        }
      }
    });
    return fmap;
  }

  function substTainted(e, wb) {
    // Dangling-name use sites become #REF! literals.
    if (e.t === "name") {
      const t = wb.names.get(e.v);
      if (t && (t.dangling || t.length === 0)) return { t: "errLit", code: "#REF!" };
      return e;
    }
    if (e.t === "call") return { t: "call", fn: e.fn, args: e.args.map((a) => substTainted(a, wb)) };
    if (e.t === "un") return { t: "un", op: e.op, e: substTainted(e.e, wb) };
    if (e.t === "pct") return { t: "pct", e: substTainted(e.e, wb) };
    if (e.t === "bin") return { t: "bin", op: e.op, l: substTainted(e.l, wb), r: substTainted(e.r, wb) };
    return e;
  }

  function precedentsOf(expr, host, wb) {
    const out = new Set();
    const si = (n) => sheetIndexOf(wb, n);
    (function walk(e) {
      if (e.t === "ref") {
        const a = resolveRef(e, host, si);
        if (a) out.add(key(a.s, a.c, a.r));
      } else if (e.t === "range") {
        const rc = resolveRange(e.lo, e.hi, host, si);
        if (rc) {
          for (let r = rc.r0; r <= rc.r1; r++)
            for (let c = rc.c0; c <= rc.c1; c++) out.add(key(rc.s, c, r));
        }
      } else if (e.t === "name") {
        const t = wb.names.get(e.v);
        if (t && !t.dangling) for (const m of t) out.add(key(m.s, m.c, m.r));
      } else if (e.t === "call") e.args.forEach(walk);
      else if (e.t === "un" || e.t === "pct") walk(e.e);
      else if (e.t === "bin") { walk(e.l); walk(e.r); }
    })(expr);
    return out;
  }

  function buildGraph(wb, fmap) {
    const prec = new Map(), dep = new Map(), vol = new Set();
    const fset = new Set(fmap.keys());
    for (const [k, f] of fmap) {
      const ps = precedentsOf(f.expr, f.addr, wb);
      prec.set(k, ps);
      for (const p of ps) {
        if (!dep.has(p)) dep.set(p, new Set());
        dep.get(p).add(k);
      }
      if (isVolatile(f.expr)) vol.add(k);
    }
    return { prec, dep, vol, fset };
  }

  function isVolatile(e) {
    if (e.t === "call") {
      if (e.fn === "TODAY" || e.fn === "NOW") return true;
      return e.args.some(isVolatile);
    }
    if (e.t === "un" || e.t === "pct") return isVolatile(e.e);
    if (e.t === "bin") return isVolatile(e.l) || isVolatile(e.r);
    return false;
  }

  function dirtyClosure(edits, graph) {
    const dirty = new Set(edits);
    const queue = [...edits].sort();
    for (const v of [...graph.vol].sort()) {
      if (!dirty.has(v)) { dirty.add(v); queue.push(v); }
    }
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      for (const d of graph.dep.get(cur) || []) {
        if (!dirty.has(d)) { dirty.add(d); queue.push(d); }
      }
    }
    return dirty;
  }

  function detectCycles(graph) {
    // Iterative DFS over formula-formula successors; taint members + dependents.
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map();
    for (const k of graph.fset) color.set(k, WHITE);
    const paths = [], members = new Set();
    const succ = (k) => {
      const out = [];
      for (const p of graph.prec.get(k) || []) if (graph.fset.has(p)) out.push(p);
      return out.sort();
    };
    for (const start of [...graph.fset].sort()) {
      if (color.get(start) !== WHITE) continue;
      color.set(start, GRAY);
      const stack = [{ node: start, kids: succ(start), idx: 0 }];
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.idx < top.kids.length) {
          const kid = top.kids[top.idx++];
          const col = color.get(kid);
          if (col === WHITE) {
            color.set(kid, GRAY);
            stack.push({ node: kid, kids: succ(kid), idx: 0 });
          } else if (col === GRAY) {
            const at = stack.findIndex((f) => f.node === kid);
            if (at >= 0) {
              const path = stack.slice(at).map((f) => f.node);
              path.push(kid);
              paths.push(path);
              for (const m of stack.slice(at)) members.add(m.node);
            }
          }
        } else {
          color.set(top.node, BLACK);
          stack.pop();
        }
      }
    }
    const tainted = new Set(members);
    const queue = [...members];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      for (const d of graph.dep.get(cur) || []) {
        if (!tainted.has(d)) { tainted.add(d); queue.push(d); }
      }
    }
    return { tainted, paths };
  }

  function kahnOrder(graph, dirty) {
    const nodes = new Set([...graph.fset].filter((k) => dirty.has(k)));
    const indeg = new Map();
    for (const k of nodes) indeg.set(k, 0);
    for (const k of nodes) {
      for (const p of graph.prec.get(k) || []) {
        if (nodes.has(p)) indeg.set(k, indeg.get(k) + 1);
      }
    }
    // Deterministic queue via sorted array (UI scale; Swift uses a heap).
    let zero = [...nodes].filter((k) => indeg.get(k) === 0).sort();
    const order = [];
    while (zero.length) {
      const n = zero.shift();
      order.push(n);
      for (const d of graph.dep.get(n) || []) {
        if (!nodes.has(d)) continue;
        const v = indeg.get(d) - 1;
        indeg.set(d, v);
        if (v === 0) {
          zero.push(d);
          zero.sort();
        }
      }
    }
    return { order, residue: new Set([...nodes].filter((k) => !order.includes(k))) };
  }

  function makeCtx(wb) {
    return {
      lookup: (k) => wb.values.get(k) || VBlank(),
      rangeVals: (rc) => {
        const out = [];
        for (let r = rc.r0; r <= rc.r1; r++)
          for (let c = rc.c0; c <= rc.c1; c++) out.push(wb.values.get(key(rc.s, c, r)) || VBlank());
        return out;
      },
      sheetIndex: (n) => sheetIndexOf(wb, n),
      nameAddrs: (up) => {
        const t = wb.names.get(up);
        return t && !t.dangling && t.length ? t : null;
      },
      nameTainted: (up) => {
        const t = wb.names.get(up);
        return !!t && (!!t.dangling || t.length === 0);
      },
      today: wb.today,
    };
  }

  function recalc(wb, editKeys) {
    const fmap = formulaMap(wb);
    const graph = buildGraph(wb, fmap);
    const { tainted, paths } = detectCycles(graph);
    wb.cyclePaths = paths;
    const dirty = dirtyClosure(new Set(editKeys), graph);
    const { order, residue } = kahnOrder(graph, dirty);
    const next = new Map();
    // Seed literals fresh; carry untouched formula values.
    wb.sheets.forEach((sh, s) => {
      for (const [k, cell] of sh.cells) {
        const lit = literalValue(cell);
        if (lit) next.set(key(s, ...k.split(":").map(Number)), lit);
      }
    });
    for (const [k, v] of wb.values) {
      if (fmap.has(k) && !dirty.has(k) && !next.has(k)) next.set(k, v);
    }
    wb.values = next;
    const ctx = makeCtx(wb);
    const { ev } = makeEval(ctx);
    for (const k of order) {
      const f = fmap.get(k);
      if (!f) continue;
      next.set(k, ev(f.expr, f.addr));
    }
    const cycled = new Set([...tainted].filter((k) => dirty.has(k)));
    for (const k of residue) cycled.add(k);
    for (const k of cycled) next.set(k, VErr("#CYCLE!"));
    wb.values = next;
    return dirty;
  }


  // ------------------------------------------------------------- formatting

  function displayOf(v, style) {
    if (v.t === "err") return v.v;
    if (v.t === "blank") return "";
    if (v.t === "bool") return v.v ? "TRUE" : "FALSE";
    if (v.t === "str") return v.v;
    const fmt = (style && style.numberFormat) || { k: "general" };
    const x = v.v;
    switch (fmt.k) {
      case "fixed": return fixed(x, fmt.decimals || 0);
      case "currency": return (fmt.symbol || "$") + fixed(x, fmt.decimals !== undefined ? fmt.decimals : 2);
      case "percent": return fixed(x * 100, fmt.decimals || 0) + "%";
      case "isoDate": {
        const ymd = serialToYMD(Math.trunc(x));
        return ymd.y + "-" + String(ymd.m).padStart(2, "0") + "-" + String(ymd.d).padStart(2, "0");
      }
      case "text": return formatGeneral(x);
      default: return formatGeneral(x);
    }
  }

  // ------------------------------------------------------------- edit laws
  // Ports of the Swift structural-edit rules: host relocation shifts only
  // the parse-time base; target tracking rederives authored coordinates;
  // single refs into a deleted span taint sticky; range endpoints clamp.

  function mapRefs(e, fRef, fRange) {
    switch (e.t) {
      case "ref": return fRef(e);
      case "range": return fRange(e);
      case "call": return { t: "call", fn: e.fn, args: e.args.map((a) => mapRefs(a, fRef, fRange)) };
      case "un": return { t: "un", op: e.op, e: mapRefs(e.e, fRef, fRange) };
      case "pct": return { t: "pct", e: mapRefs(e.e, fRef, fRange) };
      case "bin": return { t: "bin", op: e.op, l: mapRefs(e.l, fRef, fRange), r: mapRefs(e.r, fRef, fRange) };
      default: return e;
    }
  }

  function shiftBase(ref, axis, d) {
    if (ref.dangling) return ref;
    const c = Object.assign({}, ref);
    if (axis === "col" && !c.cAbs) c.baseC += d;
    if (axis === "row" && !c.rAbs) c.baseR += d;
    return c;
  }

  function rederive(ref, host, ts, tc, tr) {
    const c = Object.assign({}, ref);
    if (c.cAbs) c.c = tc;
    else c.c = tc - host.c + c.baseC;
    if (c.rAbs) c.r = tr;
    else c.r = tr - host.r + c.baseR;
    if (tc < 0 || tr < 0 || tc >= 16384 || tr >= 1048576) c.dangling = true;
    return c;
  }

  function remapAxis(ref, host, s, axis, at, count, delta, si) {
    if (ref.dangling) return ref;
    const old = resolveRef(ref, host, si);
    if (!old || old.s !== s) return ref;
    const k = axis === "row" ? old.r : old.c;
    if (delta < 0 && k >= at && k < at + count) {
      return Object.assign({}, ref, { dangling: true });
    }
    const nk = delta > 0 ? (k >= at ? k + delta : k) : (k >= at + count ? k + delta : k);
    return rederive(ref, host, old.s, axis === "col" ? nk : old.c, axis === "row" ? nk : old.r);
  }

  function clampRemap(ref, host, s, axis, at, count, delta, si) {
    if (ref.dangling) return ref;
    const old = resolveRef(ref, host, si);
    if (!old || old.s !== s) return ref;
    const k = axis === "row" ? old.r : old.c;
    let nk = k;
    if (delta > 0) nk = k >= at ? k + delta : k;
    else if (k >= at && k < at + count) nk = at;
    else if (k >= at + count) nk = k + delta;
    return rederive(ref, host, old.s, axis === "col" ? nk : old.c, axis === "row" ? nk : old.r);
  }

  function forEachFormulaCell(wb, fn) {
    wb.sheets.forEach((sh, s) => {
      for (const [k, cell] of sh.cells) {
        if (cell.kind === "formula" && cell.expr) {
          const [c, r] = k.split(":").map(Number);
          const host = { s, c, r };
          const mapped = mapRefs(
            cell.expr,
            (ref) => fn(ref, host, false),
            (rr) => ({ t: "range", lo: fn(rr.lo, host, true), hi: fn(rr.hi, host, true) })
          );
          cell.expr = mapped;
        }
      }
    });
  }

  function pushUndo(wb) {
    const snap = {
      sheets: wb.sheets.map((sh) => ({ name: sh.name, cells: new Map(sh.cells) })),
      names: new Map(wb.names),
    };
    wb.undo.push(snap);
    if (wb.undo.length > 64) wb.undo.shift();
  }

  function insertDelete(wb, s, axis, at, count, delta) {
    const sh = wb.sheets[s];
    if (!sh) return;
    pushUndo(wb);
    const si = (n) => sheetIndexOf(wb, n);
    if (delta < 0) {
      for (const k of [...sh.cells.keys()]) {
        const [c, r] = k.split(":").map(Number);
        const kk = axis === "row" ? r : c;
        if (kk >= at && kk < at + count) sh.cells.delete(k);
      }
    }
    // Host relocation: move cells, shifting only the base of moved formulas.
    const moved = new Map();
    for (const [k, cell] of sh.cells) {
      const [c, r] = k.split(":").map(Number);
      const kk = axis === "row" ? r : c;
      const from = delta > 0 ? at : at + count;
      if (kk >= from) {
        const nk = kk + delta;
        if (nk < 0) continue;
        const nc = axis === "row" ? c : nk, nr = axis === "row" ? nk : r;
        let nc2 = cell;
        if (cell.kind === "formula" && cell.expr) {
          nc2 = Object.assign({}, cell, {
            expr: mapRefs(cell.expr, (ref) => shiftBase(ref, axis, delta), (rr) => ({
              t: "range", lo: shiftBase(rr.lo, axis, delta), hi: shiftBase(rr.hi, axis, delta),
            })),
          });
        }
        moved.set(cellKey(nc, nr), nc2);
        sh.cells.delete(k);
      }
    }
    for (const [k, cell] of moved) sh.cells.set(k, cell);
    // Target tracking: rederive authored coordinates.
    forEachFormulaCell(wb, (ref, host, isRange) => isRange
      ? clampRemap(ref, host, s, axis, at, count, delta, si)
      : remapAxis(ref, host, s, axis, at, count, delta, si));
    recalcAll(wb);
  }

  function translatePaste(e, dc, dr) {
    return mapRefs(e,
      (ref) => {
        const c = Object.assign({}, ref);
        if (!c.cAbs) { c.c += dc; c.baseC += dc; }
        if (!c.rAbs) { c.r += dr; c.baseR += dr; }
        return c;
      },
      (rr) => {
        const sh = (x) => {
          const m = Object.assign({}, x);
          if (!m.cAbs) { m.c += dc; m.baseC += dc; }
          if (!m.rAbs) { m.r += dr; m.baseR += dr; }
          return m;
        };
        return { t: "range", lo: sh(rr.lo), hi: sh(rr.hi) };
      });
  }

  function seriesExtend(atoms, count) {
    // Pure fill preview: numeric step from last two, trailing-number text
    // increment preserving zero-pad width, else copy.
    const out = [];
    const nums = atoms.filter((a) => a.t === "num").map((a) => a.v);
    let step = null;
    if (nums.length >= 2) step = nums[nums.length - 1] - nums[nums.length - 2];
    else if (nums.length === 1) step = 1;
    const lastNum = nums.length ? nums[nums.length - 1] : null;
    const lastText = [...atoms].reverse().find((a) => a.t === "text");
    const m = lastText ? /^(.*?)(\d+)$/.exec(lastText.v) : null;
    for (let i = 0; i < count; i++) {
      if (step !== null && (atoms.length === 0 || atoms[atoms.length - 1].t === "num")) {
        out.push({ t: "num", v: lastNum + step * (i + 1) });
      } else if (m) {
        const num = parseInt(m[2], 10) + i + 1;
        out.push({ t: "text", v: m[1] + String(num).padStart(m[2].length, "0") });
      } else if (atoms.length) {
        const a = atoms[atoms.length - 1];
        out.push({ t: a.t, v: a.v });
      } else out.push({ t: "blank", v: 0 });
    }
    return out;
  }

  // ------------------------------------------------------------- batch wire

  function bridgeValue(v) {
    if (v.t === "num") return { num: v.v };
    if (v.t === "str") return { str: v.v };
    if (v.t === "bool") return { bool: v.v };
    if (v.t === "err") return { err: v.v };
    return { blank: true };
  }

  function coalesce(dirty) {
    const out = [];
    const bySheet = new Map();
    for (const k of dirty) {
      const [s, c, r] = k.split(":").map(Number);
      if (!bySheet.has(s)) bySheet.set(s, []);
      bySheet.get(s).push({ c, r });
    }
    for (const s of [...bySheet.keys()].sort((a, b) => a - b)) {
      const byRow = new Map();
      for (const { c, r } of bySheet.get(s)) {
        if (!byRow.has(r)) byRow.set(r, []);
        byRow.get(r).push(c);
      }
      const runs = [];
      for (const row of [...byRow.keys()].sort((a, b) => a - b)) {
        const cols = byRow.get(row).sort((a, b) => a - b);
        let start = cols[0], prev = cols[0];
        for (const c of cols.slice(1)) {
          if (c === prev + 1) prev = c;
          else { runs.push({ row, c0: start, c1: prev }); start = c; prev = c; }
        }
        runs.push({ row, c0: start, c1: prev });
      }
      let i = 0;
      while (i < runs.length) {
        let r0 = runs[i].row, r1 = runs[i].row;
        const { c0, c1 } = runs[i];
        let j = i + 1;
        while (j < runs.length && runs[j].row === r1 + 1 && runs[j].c0 === c0 && runs[j].c1 === c1) {
          r1 = runs[j].row; j++;
        }
        out.push({ sheet: s, c0, r0, c1, r1 });
        i = j;
      }
    }
    return out;
  }

  function makeBatch(wb, dirtyKeys) {
    wb.seq += 1;
    const cells = [...dirtyKeys].sort().map((k) => {
      const [s, c, r] = k.split(":").map(Number);
      const v = wb.values.get(k) || VBlank();
      const style = wb.styles.get(k);
      return { s, c, r, v: bridgeValue(v), d: displayOf(v, style) };
    });
    return { seq: wb.seq, ranges: coalesce(dirtyKeys), cells };
  }

  function recalcAll(wb) {
    return recalc(wb, allAddrs(wb).map((a) => key(a.s, a.c, a.r)));
  }

  /** Apply one raw edit and return the DirtyBatch for it. */
  function applyEdit(wb, edit) {
    const before = new Map(wb.values);
    let written = [];
    switch (edit.op) {
      case "set": setCell(wb, edit.s, edit.c, edit.r, edit.raw); written = [key(edit.s, edit.c, edit.r)]; break;
      case "insertRows": insertDelete(wb, edit.s, "row", edit.at, edit.count, edit.count); break;
      case "deleteRows": insertDelete(wb, edit.s, "row", edit.at, edit.count, -edit.count); break;
      case "insertCols": insertDelete(wb, edit.s, "col", edit.at, edit.count, edit.count); break;
      case "deleteCols": insertDelete(wb, edit.s, "col", edit.at, edit.count, -edit.count); break;
      case "paste": {
        for (const [a, raw] of previewPaste(wb, edit.srcSheet, edit.src, edit.dstSheet, edit.dst)) {
          setCell(wb, a.s, a.c, a.r, raw);
        }
        recalcAll(wb);
        break;
      }
      case "fill": {
        for (const [pos, raw] of previewFill(wb, edit.s, edit.src, edit.axis, edit.count)) {
          setCell(wb, edit.s, pos.c, pos.r, raw);
        }
        recalcAll(wb);
        break;
      }
      case "undo": {
        const f = wb.undo.pop();
        if (f) {
          wb.sheets = f.sheets.map((sh) => ({ name: sh.name, cells: new Map(sh.cells) }));
          wb.names = new Map(f.names);
          recalcAll(wb);
        }
        break;
      }
      case "style": {
        wb.styles.set(key(edit.s, edit.c, edit.r), edit.style);
        break;
      }
      case "addSheet": {
        if (sheetIndexOf(wb, edit.name) === null) wb.sheets.push({ name: edit.name, cells: new Map() });
        break;
      }
      case "renameSheet": {
        const i = sheetIndexOf(wb, edit.from);
        if (i !== null && sheetIndexOf(wb, edit.to) === null) {
          const old = wb.sheets[i].name;
          wb.sheets[i].name = edit.to;
          forEachFormulaCell(wb, (ref) => {
            if (ref.sheet && ref.sheet.toUpperCase() === old.toUpperCase()) {
              return Object.assign({}, ref, { sheet: edit.to });
            }
            return ref;
          });
          recalcAll(wb);
        }
        break;
      }
    }
    if (edit.op === "set" || edit.op === "style") recalc(wb, written);
    const after = wb.values;
    const dirty = new Set(written);
    for (const [k, v] of after) {
      if (!valuesEqual(before.get(k), v)) dirty.add(k);
    }
    for (const k of before.keys()) if (!after.has(k)) dirty.add(k);
    return makeBatch(wb, dirty);
  }

  function valuesEqual(a, b) {
    if (!a || !b) return false;
    if (a.t !== b.t) return false;
    return a.t === "blank" || a.v === b.v;
  }

  function previewPaste(wb, srcSheet, src, dstSheet, dst) {
    const out = [];
    const dc = dst.c - src.c0, dr = dst.r - src.r0;
    const sh = wb.sheets[srcSheet];
    if (!sh) return out;
    for (let r = src.r0; r <= src.r1; r++) {
      for (let c = src.c0; c <= src.c1; c++) {
        const cell = sh.cells.get(cellKey(c, r));
        if (!cell) continue;
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= 16384 || nr >= 1048576) continue;
        if (cell.kind === "formula" && cell.expr) {
          out.push([{ s: dstSheet, c: nc, r: nr }, "=" + printExpr(translatePaste(cell.expr, dc, dr))]);
        } else if (cell.kind === "formula") {
          out.push([{ s: dstSheet, c: nc, r: nr }, cell.source]);
        } else if (cell.kind === "num") out.push([{ s: dstSheet, c: nc, r: nr }, formatGeneral(cell.v)]);
        else if (cell.kind === "text") out.push([{ s: dstSheet, c: nc, r: nr }, "'" + cell.v]);
        else if (cell.kind === "bool") out.push([{ s: dstSheet, c: nc, r: nr }, cell.v ? "TRUE" : "FALSE"]);
      }
    }
    return out;
  }

  function previewFill(wb, s, src, axis, count) {
    const sh = wb.sheets[s];
    if (!sh || !src.length || count <= 0) return [];
    const ordered = [...src].sort((a, b) => axis === "row" ? a.r - b.r : a.c - b.c);
    const atoms = ordered.map((p) => {
      const cell = sh.cells.get(cellKey(p.c, p.r));
      if (!cell) return { t: "blank", v: 0 };
      if (cell.kind === "num") return { t: "num", v: cell.v };
      if (cell.kind === "text") return { t: "text", v: cell.v };
      if (cell.kind === "bool") return { t: "bool", v: cell.v };
      return { t: "blank", v: 0 };
    });
    const grown = seriesExtend(atoms, count);
    const last = ordered[ordered.length - 1];
    const lastCell = sh.cells.get(cellKey(last.c, last.r));
    const out = [];
    for (let k = 0; k < count; k++) {
      const np = axis === "row" ? { c: last.c, r: last.r + k + 1 } : { c: last.c + k + 1, r: last.r };
      if (lastCell && lastCell.kind === "formula" && lastCell.expr) {
        const t = axis === "row" ? translatePaste(lastCell.expr, 0, k + 1) : translatePaste(lastCell.expr, k + 1, 0);
        out.push([np, "=" + printExpr(t)]);
        continue;
      }
      const g = grown[k];
      if (g.t === "num") out.push([np, formatGeneral(g.v)]);
      else if (g.t === "text") out.push([np, g.v]);
      else if (g.t === "bool") out.push([np, g.v ? "TRUE" : "FALSE"]);
    }
    return out;
  }

  // --------------------------------------------------------------- inspector

  function inspect(wb, s, c, r) {
    const host = { s, c, r };
    const k = key(s, c, r);
    const cell = (wb.sheets[s] && wb.sheets[s].cells.get(cellKey(c, r))) || null;
    const fmap = formulaMap(wb);
    const graph = buildGraph(wb, fmap);
    const { order } = kahnOrder(graph, new Set(fmap.keys()));
    const prec = [...(graph.prec.get(k) || [])].sort().map((kk) => {
      const [ss, cc, rr] = kk.split(":").map(Number);
      return { s: ss, c: cc, r: rr, label: wb.sheets[ss].name + "!" + a1(cc, rr) };
    });
    const depSet = graph.dep.get(k) || [];
    const dep = [...depSet].sort().map((kk) => {
      const [ss, cc, rr] = kk.split(":").map(Number);
      return { s: ss, c: cc, r: rr, label: wb.sheets[ss].name + "!" + a1(cc, rr) };
    });
    const path = (wb.cyclePaths || []).find((p) => p.includes(k));
    let source = "", isFormula = false, parseError = null;
    if (!cell) source = "";
    else if (cell.kind === "formula") {
      isFormula = true;
      source = cell.source;
      if (cell.parseError !== undefined) parseError = cell.parseError;
    } else if (cell.kind === "num") source = formatGeneral(cell.v);
    else if (cell.kind === "text") source = "'" + cell.v;
    else if (cell.kind === "bool") source = cell.v ? "TRUE" : "FALSE";
    const v = wb.values.get(k) || VBlank();
    return {
      a1: wb.sheets[s].name + "!" + a1(c, r),
      source, display: displayOf(v, wb.styles.get(k)),
      isFormula, parseErrorPos: parseError,
      precedents: prec, dependents: dep,
      topoRank: fmap.has(k) ? order.indexOf(k) : -1,
      cyclePath: path ? path.map((kk) => {
        const [ss, cc, rr] = kk.split(":").map(Number);
        return { s: ss, c: cc, r: rr, label: wb.sheets[ss].name + "!" + a1(cc, rr) };
      }) : null,
    };
  }

  // ------------------------------------------------------------------ codecs

  function exportCSV(wb, s) {
    const sh = wb.sheets[s];
    if (!sh) return "";
    let maxC = 0, maxR = 0;
    for (const k of sh.cells.keys()) {
      const [c, r] = k.split(":").map(Number);
      maxC = Math.max(maxC, c); maxR = Math.max(maxR, r);
    }
    const lines = [];
    for (let r = 0; r <= maxR; r++) {
      const row = [];
      for (let c = 0; c <= maxC; c++) {
        const v = wb.values.get(key(s, c, r)) || VBlank();
        row.push(csvField(displayOf(v, wb.styles.get(key(s, c, r)))));
      }
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }

  function csvField(s) {
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toJSON(wb) {
    const sheets = wb.sheets.map((sh) => {
      const cells = {};
      for (const [k, cell] of sh.cells) {
        if (cell.kind === "formula") cells[k] = { f: cell.source };
        else if (cell.kind === "num") cells[k] = { n: cell.v };
        else if (cell.kind === "text") cells[k] = { t: cell.v };
        else if (cell.kind === "bool") cells[k] = { b: cell.v };
      }
      return { name: sh.name, cells };
    });
    const names = {};
    for (const [k, t] of wb.names) names[k] = t.dangling ? { dangling: true } : t;
    const styles = {};
    for (const [k, st] of wb.styles) styles[k] = st;
    return JSON.stringify({ version: 1, sheets, names, styles });
  }

  function fromJSON(wb, text) {
    const doc = JSON.parse(text);
    if (doc.version !== 1) throw new Error("unsupported version");
    wb.sheets = doc.sheets.map((sh) => ({ name: sh.name, cells: new Map() }));
    wb.names = new Map();
    for (const k of Object.keys(doc.names || {})) {
      const t = doc.names[k];
      wb.names.set(k, t.dangling ? { dangling: true } : t);
    }
    wb.styles = new Map(Object.entries(doc.styles || {}));
    doc.sheets.forEach((sh, s) => {
      for (const k of Object.keys(sh.cells)) {
        const [c, r] = k.split(":").map(Number);
        const ce = sh.cells[k];
        if (ce.f !== undefined) setCell(wb, s, c, r, ce.f[0] === "=" ? ce.f : "=" + ce.f);
        else if (ce.n !== undefined) setCell(wb, s, c, r, formatGeneral(ce.n));
        else if (ce.t !== undefined) setCell(wb, s, c, r, "'" + ce.t);
        else if (ce.b !== undefined) setCell(wb, s, c, r, ce.b ? "TRUE" : "FALSE");
      }
    });
    recalcAll(wb);
  }

  // ---------------------------------------------------------------- exports

  T.engine = {
    createWorkbook, setCell, applyEdit, fullSnapshot(wb) {
      const dirty = new Set(allAddrs(wb).map((a) => key(a.s, a.c, a.r)));
      return makeBatch(wb, dirty);
    },
    previewPaste, previewFill, inspect, exportCSV, toJSON, fromJSON,
    parseFormula, printExpr, formatGeneral, displayOf,
    values: { num: VNum, str: VStr, bool: VBool, err: VErr, blank: VBlank },
    colEncode, colDecode, a1, ymdToSerial, serialToYMD, todaySerial,
    ERRORS,
  };
})(window.Tabula);
