// Halcyon - a small functional programming language and bytecode VM.
//
// This file is a faithful JavaScript mirror of the Haskell core
// (halcyon/src/Halcyon/*.hs): the same lexer, parser, Hindley-Milner
// typechecker, tree-walking interpreter, bytecode compiler, and stack VM,
// producing byte-identical output on the shared corpus. It powers the web
// playground (index.html) with no dependencies, and doubles as a Node module
// so the cross-language corpus check can verify the two implementations
// agree.
//
//   browser:  <script src="halcyon.js"></script>  -> window.Halcyon
//   node:     const Halcyon = require('./halcyon.js');
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Halcyon = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =====================================================================
  // Values
  // =====================================================================

  // Int values are plain JS numbers that fit the corpus's safe-integer
  // range; Floats are tagged so 7 (Int) and 7.0 (Float) stay distinct, as
  // they are in Haskell.

  var VInt   = function (v) { return { k: 'int', v: v }; };
  var VFloat = function (v) { return { k: 'float', v: v }; };
  var VBool  = function (v) { return { k: 'bool', v: v }; };
  var VStr   = function (v) { return { k: 'str', v: v }; };
  var VList  = function (v) { return { k: 'list', v: v }; };
  var VClosure = function (params, body, env) { return { k: 'closure', params: params, body: body, env: env }; };
  var VBuiltin = function (name) { return { k: 'builtin', name: name }; };
  var VPartial = function (name, args) { return { k: 'partial', name: name, args: args }; };

  // Deterministic float rendering, mirroring Halcyon.Value.showFloat:
  // whole floats render with a trailing ".0", ordinary magnitudes stay in
  // plain decimal notation.
  function showFloat(d) {
    if (d === Math.round(d) && Math.abs(d) < 1e15) {
      return String(Math.round(d)) + '.0';
    }
    return String(d);
  }

  // Canonical rendering shared by the interpreter, the VM, and the web
  // playground, so every evaluator produces byte-identical output.
  function showValue(v) {
    switch (v.k) {
      case 'int':     return String(v.v);
      case 'float':   return showFloat(v.v);
      case 'bool':    return v.v ? 'true' : 'false';
      case 'str':     return v.v;
      case 'list':    return '[' + v.v.map(showValue).join(', ') + ']';
      case 'closure': return '<function>';
      case 'builtin': return '<builtin: ' + v.name + '>';
      case 'partial': return '<builtin: ' + v.name + ' ' + v.args.map(showValue).join(' ') + '>';
      default:        return '<value>';
    }
  }

  var BUILTINS = ['cons', 'head', 'tail', 'isNil', 'length', 'reverse', 'append', 'take', 'drop'];

  // =====================================================================
  // Positions
  // =====================================================================

  function Pos(line, col) { return { line: line, col: col }; }
  var POS_EOF = Pos(0, 0);

  function HErr(kind, pos, message) {
    return { kind: kind, pos: pos, message: message };
  }

  // =====================================================================
  // Lexer (mirrors Halcyon.Lexer)
  // =====================================================================

  function isSpace(ch) { return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'; }
  function isIdentStart(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }
  function isIdentChar(ch) { return isIdentStart(ch) || isDigit(ch) || ch === "'"; }
  function isDigit(ch) { return ch >= '0' && ch <= '9'; }
  function countNewlines(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) { if (s[i] === '\n') n++; }
    return n;
  }
  function startsWith(pfx, s) { return s.slice(0, pfx.length) === pfx; }

  var KEYWORDS = {
    let: 'let', rec: 'rec', in: 'in', fn: 'fn', if: 'if',
    then: 'then', else: 'else', true: 'true', false: 'false'
  };

  // Lex an entire source string to a token list. Fails fast on the first
  // lexical error, mirroring the Haskell scanner (line comments, nested
  // block comments, precise numeric scanning so "1-2" is two tokens).
  function lexSource(src) {
    var result = [];
    var l = 1, c = 1, s = src;

    function newline(l, ch) { return ch === '\n' ? l + 1 : l; }
    function newlineCol(c, ch) { return ch === '\n' ? 1 : c + 1; }
    function stepLine(l, chunk) { return l + countNewlines(chunk); }
    function stepCol(c, chunk) {
      var i = chunk.indexOf('\n');
      if (i < 0) { return c + chunk.length; }
      return chunk.length - i; // after the first newline
    }

    function simpleTok(tok, n) {
      var chunk = s.slice(0, n);
      var nl = stepLine(l, chunk), nc = stepCol(c, chunk);
      result.push({ p: Pos(l, c), k: tok });
      l = nl; c = nc; s = s.slice(n);
      return scan();
    }

    function token() {
      var ch = s[0];
      if (ch === undefined) { result.push({ p: Pos(l, c), k: 'eof' }); return null; }
      if (isIdentStart(ch)) { return identTok(); }
      if (isDigit(ch)) { return numberTok(); }
      if (ch === '"') { return stringTok(); }
      if (ch === '+') { return simpleTok('+', 1); }
      if (ch === '-') { return simpleTok('-', 1); }
      if (ch === '*') { return simpleTok('*', 1); }
      if (ch === '/' && !startsWith('/=', s)) { return simpleTok('/', 1); }
      if (ch === '/' && startsWith('/=', s)) { return simpleTok('!=', 2); }
      if (ch === '<' && !startsWith('<=', s)) { return simpleTok('<', 1); }
      if (ch === '<' && startsWith('<=', s)) { return simpleTok('<=', 2); }
      if (ch === '>' && !startsWith('>=', s)) { return simpleTok('>', 1); }
      if (ch === '>' && startsWith('>=', s)) { return simpleTok('>=', 2); }
      if (ch === '=' && startsWith('==', s)) { return simpleTok('==', 2); }
      if (ch === '=' && startsWith('=>', s)) { return simpleTok('=>', 2); }
      if (ch === '=') { return simpleTok('=', 1); }
      if (ch === '&' && startsWith('&&', s)) { return simpleTok('&&', 2); }
      if (ch === '|' && startsWith('||', s)) { return simpleTok('||', 2); }
      if (ch === '!') { return simpleTok('!', 1); }
      if (ch === '(') { return simpleTok('(', 1); }
      if (ch === ')') { return simpleTok(')', 1); }
      if (ch === '[') { return simpleTok('[', 1); }
      if (ch === ']') { return simpleTok(']', 1); }
      if (ch === ',') { return simpleTok(',', 1); }
      return HErr('lex', Pos(l, c), 'unexpected character: ' + ch);
    }

    function identTok() {
      var i = 0;
      while (i < s.length && isIdentChar(s[i])) { i++; }
      var name = s.slice(0, i);
      var kind = KEYWORDS[name] || 'ident';
      result.push({ p: Pos(l, c), k: kind, v: (kind === 'ident') ? name : undefined });
      c += i;
      s = s.slice(i);
      return scan();
    }

    function numberTok() {
      var whole = '';
      var i = 0;
      while (i < s.length && isDigit(s[i])) { whole += s[i]; i++; }
      var rest = s.slice(i);
      var frac = '';
      if (rest[0] === '.') {
        var j = 1;
        while (j < rest.length && isDigit(rest[j])) { frac += rest[j]; j++; }
        rest = rest.slice(j);
        i += 1 + frac.length;
      }
      var exp = '';
      if (rest[0] === 'e' || rest[0] === 'E') {
        var k2 = 1;
        var sign = '';
        if (rest[k2] === '+' || rest[k2] === '-') { sign = rest[k2]; k2++; }
        var expDigits = '';
        while (k2 < rest.length && isDigit(rest[k2])) { expDigits += rest[k2]; k2++; }
        exp = rest[0] + sign + expDigits;
        rest = rest.slice(k2);
        i += 1 + sign.length + expDigits.length;
      }
      var num = whole + (frac ? '.' + frac : '') + exp;
      var p = Pos(l, c);
      var tok;
      if (frac !== '' || exp !== '') {
        var dv = Number(num);
        if (isNaN(dv)) { return HErr('lex', p, 'invalid number literal: ' + num); }
        tok = { p: p, k: 'float', v: dv };
      } else {
        var iv = Number(whole);
        if (isNaN(iv)) { return HErr('lex', p, 'invalid number literal: ' + num); }
        tok = { p: p, k: 'int', v: iv };
      }
      result.push(tok);
      c += i;
      s = s.slice(i);
      return scan();
    }

    function stringTok() {
      var startCol = c;
      var acc = '';
      var cl = l, cc = c + 1;
      var rest = s.slice(1);
      var i = 0;
      while (i < rest.length) {
        var ch = rest[i];
        if (ch === '"') {
          result.push({ p: Pos(l, startCol), k: 'str', v: acc });
          c = cc + 1;
          s = s.slice(1 + i + 1);
          return scan();
        }
        if (ch === '\\') {
          var next = rest[i + 1];
          if (next === 'n') { acc += '\n'; cl = newline(cl, 'n'); cc += 2; i += 2; continue; }
          if (next === 't') { acc += '\t'; cc += 2; i += 2; continue; }
          if (next === 'r') { acc += '\r'; cc += 2; i += 2; continue; }
          if (next === '\\') { acc += '\\'; cc += 2; i += 2; continue; }
          if (next === '"') { acc += '"'; cc += 2; i += 2; continue; }
          if (next === "'") { acc += "'"; cc += 2; i += 2; continue; }
          if (next === undefined) {
            return HErr('lex', Pos(cl, cc), 'unterminated string literal');
          }
          return HErr('lex', Pos(cl, cc), 'bad escape sequence: \\' + next);
        }
        acc += ch;
        cl = newline(cl, ch); cc = newlineCol(cc, ch);
        i++;
      }
      return HErr('lex', Pos(l, startCol), 'unterminated string literal');
    }

    function skipLine() {
      var nl = s.indexOf('\n');
      if (nl < 0) {
        c += s.length;
        s = '';
        return scan();
      }
      s = s.slice(nl + 1);
      l += 1;
      c = 1;
      return scan();
    }

    function skipBlock() {
      var depth = 1;
      var cl = l, cc = c;
      var rest = s.slice(2);
      while (rest.length > 0) {
        if (startsWith('{-', rest)) {
          depth += 1;
          cl = stepLine(cl, rest.slice(0, 2)); cc = stepCol(cc, rest.slice(0, 2));
          rest = rest.slice(2);
        } else if (startsWith('-}', rest)) {
          depth -= 1;
          cl = stepLine(cl, rest.slice(0, 2)); cc = stepCol(cc, rest.slice(0, 2));
          rest = rest.slice(2);
          if (depth === 0) {
            l = cl; c = cc; s = rest;
            return scan();
          }
        } else {
          cl = newline(cl, rest[0]); cc = newlineCol(cc, rest[0]);
          rest = rest.slice(1);
        }
      }
      return HErr('lex', Pos(cl, cc), 'unterminated block comment');
    }

    function scan() {
      while (s.length > 0) {
        var ch = s[0];
        if (isSpace(ch)) {
          l = newline(l, ch); c = newlineCol(c, ch);
          s = s.slice(1);
          continue;
        }
        if (ch === '-' && startsWith('--', s)) { return skipLine(); }
        if (ch === '{' && startsWith('{-', s)) { return skipBlock(); }
        break;
      }
      if (s.length === 0) {
        result.push({ p: Pos(l, c), k: 'eof' });
        return null;
      }
      return token();
    }

    var err = scan();
    if (err && err.kind !== 'eof') { return err; }
    return result;
  }

  function describeTok(t) {
    switch (t.k) {
      case 'int':     return 'integer ' + t.v;
      case 'float':   return 'float ' + t.v;
      case 'str':     return 'string';
      case 'ident':   return "name '" + t.v + "'";
      case 'eof':     return 'end of input';
      default:        return "'" + t.k + "'";
    }
  }

  // =====================================================================
  // Parser (mirrors Halcyon.Parser): recursive descent with precedence
  // climbing, all binary operators left-associative.
  // =====================================================================

  //  expr     := let | if | lambda | binary(1)
  //  let      := 'let' 'rec'? name '=' expr 'in' expr
  //  if       := 'if' expr 'then' expr 'else' expr
  //  lambda   := 'fn' name+ '=>' expr
  //  binary levels: 1 ||, 2 &&, 3 == /=, 4 < <= > >=, 5 + -, 6 * /
  //  unary    := ('-' | '!') unary | application
  //  application := atom atom* (left-associative)
  //  atom     := literal | name | '(' expr ')' | '[' list ']'

  var OP_KIND = {
    '||': 'or', '&&': 'and', '==': 'eq', '!=': 'ne', '<': 'lt', '<=': 'le',
    '>': 'gt', '>=': 'ge', '+': 'add', '-': 'sub', '*': 'mul', '/': 'div'
  };
  var OP_LEVEL = {
    or: 1, and: 2, eq: 3, ne: 3, lt: 4, le: 4, gt: 4, ge: 4,
    add: 5, sub: 5, mul: 6, div: 6
  };

  function parseProgram(src) {
    var lexed = lexSource(src);
    if (lexed.kind === 'lex') { return HErr('parse', lexed.pos, lexed.message); }
    var toks = lexed;
    var P = Parser(toks);
    var e = P.parseExpr();
    if (e.kind === 'parse') { return e; }
    var rest = P.rest();
    if (rest.length === 0) { return HErr('parse', POS_EOF, 'unexpected end of input'); }
    var t = rest[0];
    if (t.k === 'eof') { return e; }
    return HErr('parse', t.p, 'unexpected token after expression: ' + describeTok(t));
  }

  function Parser(toks) {
    var ts = toks;
    var pos = 0;

    function peek() { return pos < ts.length ? ts[pos].k : 'eof'; }
    function peekPos() { return pos < ts.length ? ts[pos].p : POS_EOF; }
    function advance() { var t = ts[pos]; pos += 1; return t; }

    function failAt(p, msg) { return HErr('parse', p, msg); }

    function consume(tok) {
      if (pos < ts.length && ts[pos].k === tok) { return advance().p; }
      if (pos < ts.length) {
        return failAt(ts[pos].p, 'expected ' + tokDesc(tok) + ', found ' + describeTok(ts[pos]));
      }
      return failAt(POS_EOF, 'expected ' + tokDesc(tok) + ', found end of input');
    }

    function tokDesc(tok) {
      switch (tok) {
        case '=': return "'='";
        case '=>': return "'=>'";
        case '(': return "'('";
        case ')': return "')'";
        case '[': return "'['";
        case ']': return "']'";
        case ',': return "','";
        case 'let': return "'let'";
        case 'rec': return "'rec'";
        case 'in': return "'in'";
        case 'fn': return "'fn'";
        case 'if': return "'if'";
        case 'then': return "'then'";
        case 'else': return "'else'";
        default: return "'" + tok + "'";
      }
    }

    function expectIdent() {
      if (pos < ts.length && ts[pos].k === 'ident') { return advance().v; }
      if (pos < ts.length) {
        return failAt(ts[pos].p, 'expected a name, found ' + describeTok(ts[pos]));
      }
      return failAt(POS_EOF, 'expected a name, found end of input');
    }

    function isRec() {
      if (pos < ts.length && ts[pos].k === 'rec') { pos += 1; return true; }
      return false;
    }

    function atomStart(k) {
      switch (k) {
        case 'int': case 'float': case 'str': case 'true': case 'false':
        case 'ident': case '(': case '[':
          return true;
        default: return false;
      }
    }

    function parseExpr() {
      var t = peek();
      if (t === 'let') { return parseLet(); }
      if (t === 'if') { return parseIf(); }
      if (t === 'fn') { return parseLambda(); }
      return parseBinary(1);
    }

    function parseLet() {
      var p = consume('let');
      var rec = isRec();
      var name = expectIdent();
      if (name.kind === 'parse') { return name; }
      var eq = consume('=');
      if (eq.kind === 'parse') { return eq; }
      var bound = parseExpr();
      if (bound.kind === 'parse') { return bound; }
      var inT = consume('in');
      if (inT.kind === 'parse') { return inT; }
      var body = parseExpr();
      if (body.kind === 'parse') { return body; }
      return { kind: 'let', pos: p, rec: rec, name: name, bound: bound, body: body };
    }

    function parseIf() {
      var p = consume('if');
      var cond = parseExpr();
      if (cond.kind === 'parse') { return cond; }
      var thenT = consume('then');
      if (thenT.kind === 'parse') { return thenT; }
      var thenE = parseExpr();
      if (thenE.kind === 'parse') { return thenE; }
      var elseT = consume('else');
      if (elseT.kind === 'parse') { return elseT; }
      var elseE = parseExpr();
      if (elseE.kind === 'parse') { return elseE; }
      return { kind: 'if', pos: p, cond: cond, then: thenE, els: elseE };
    }

    function parseLambda() {
      var p = consume('fn');
      var params = [];
      while (true) {
        if (pos < ts.length && ts[pos].k === 'ident') { params.push(advance().v); }
        else { break; }
      }
      if (params.length === 0) {
        return failAt(peekPos(), 'expected a parameter name, found ' + describeTok(ts[pos] || { k: 'eof', p: POS_EOF }));
      }
      var arrow = consume('=>');
      if (arrow.kind === 'parse') { return arrow; }
      var body = parseExpr();
      if (body.kind === 'parse') { return body; }
      return { kind: 'lambda', pos: p, params: params, body: body };
    }

    function parseBinary(level) {
      if (level > 6) { return parseUnary(); }
      var left = parseBinary(level + 1);
      if (left.kind === 'parse') { return left; }
      return parseBinRest(level, left);
    }

    function parseBinRest(level, left) {
      while (true) {
        var t = peek();
        var op = OP_KIND[t];
        if (op !== undefined && OP_LEVEL[op] === level) {
          var opPos = advance().p;
          var right = parseBinary(level + 1);
          if (right.kind === 'parse') { return right; }
          left = { kind: 'bin', pos: opPos, op: op, a: left, b: right };
        } else {
          return left;
        }
      }
    }

    function parseUnary() {
      var p = peekPos();
      var t = peek();
      if (t === '!') { advance(); var x = parseUnary(); if (x.kind === 'parse') { return x; } return { kind: 'not', pos: p, x: x }; }
      if (t === '-') { advance(); var y = parseUnary(); if (y.kind === 'parse') { return y; } return { kind: 'neg', pos: p, x: y }; }
      return parseApplication();
    }

    function parseApplication() {
      var fn = parseAtom();
      if (fn.kind === 'parse') { return fn; }
      var result = fn;
      while (atomStart(peek())) {
        var arg = parseAtom();
        if (arg.kind === 'parse') { return arg; }
        result = { kind: 'apply', pos: result.pos, fn: result, arg: arg };
      }
      return result;
    }

    function parseAtom() {
      var p = peekPos();
      var t = peek();
      switch (t) {
        case 'int':     advance(); return { kind: 'int', pos: p, v: ts[pos - 1].v };
        case 'float':   advance(); return { kind: 'float', pos: p, v: ts[pos - 1].v };
        case 'str':     advance(); return { kind: 'str', pos: p, v: ts[pos - 1].v };
        case 'true':    advance(); return { kind: 'bool', pos: p, v: true };
        case 'false':   advance(); return { kind: 'bool', pos: p, v: false };
        case 'ident': {
          var name = advance().v;
          if (BUILTINS.indexOf(name) >= 0) { return { kind: 'builtin', pos: p, name: name }; }
          return { kind: 'var', pos: p, name: name };
        }
        case '(': {
          advance();
          var e = parseExpr();
          if (e.kind === 'parse') { return e; }
          var close = consume(')');
          if (close.kind === 'parse') { return close; }
          return e;
        }
        case '[': return parseList();
        default:
          return failAt(p, 'expected an expression, found ' + describeTok(ts[pos] || { k: 'eof', p: POS_EOF }));
      }
    }

    function parseList() {
      var p = consume('[');
      var items = [];
      if (peek() === ']') {
        advance();
        return { kind: 'list', pos: p, items: items };
      }
      while (true) {
        var e = parseExpr();
        if (e.kind === 'parse') { return e; }
        items.push(e);
        if (peek() === ',') { advance(); continue; }
        break;
      }
      var close = consume(']');
      if (close.kind === 'parse') { return close; }
      return { kind: 'list', pos: p, items: items };
    }

    return {
      parseExpr: parseExpr,
      rest: function () { return ts.slice(pos); }
    };
  }

  // =====================================================================
  // Typechecker (mirrors Halcyon.Infer / Halcyon.Type): Algorithm W with
  // let polymorphism, closures, and Int/Float numeric promotion.
  // =====================================================================

  function T() {
    function var_(n) { return { k: 'var', n: n }; }
    function list(t) { return { k: 'list', t: t }; }
    function fun(a, b) { return { k: 'fun', a: a, b: b }; }
    var INT = { k: 'int' }, FLOAT = { k: 'float' }, BOOL = { k: 'bool' }, STR = { k: 'str' };
    return { var_: var_, list: list, fun: fun, INT: INT, FLOAT: FLOAT, BOOL: BOOL, STR: STR };
  }
  var TT = T();

  function freeVars(t) {
    switch (t.k) {
      case 'var':  var s = new Set(); s.add(t.n); return s;
      case 'list': return freeVars(t.t);
      case 'fun':  return union(freeVars(t.a), freeVars(t.b));
      default:     return new Set();
    }
  }
  function union(a, b) { var s = new Set(a); b.forEach(function (x) { s.add(x); }); return s; }

  // Pretty-print a type: free variables render as lowercase letters;
  // function types are right-associative.
  function showType(t) {
    function go(t) {
      switch (t.k) {
        case 'var':  return String.fromCharCode(97 + t.n);
        case 'int':  return 'Int';
        case 'float': return 'Float';
        case 'bool': return 'Bool';
        case 'str':  return 'String';
        case 'list': return '[' + go(t.t) + ']';
        case 'fun':  return showArg(t.a) + ' -> ' + go(t.b);
        default:     return '?';
      }
    }
    function showArg(t) { return t.k === 'fun' ? '(' + go(t) + ')' : go(t); }
    return go(t);
  }

  function inferProgram(src) {
    var parsed = parseProgram(src);
    if (parsed.kind === 'parse') { return HErr('type', parsed.pos, parsed.message); }
    var res = inferExpr(parsed);
    return res;
  }

  function inferExpr(expr) {
    var st = { subst: {}, counter: 0 };
    var r = infer(st, {}, expr);
    if (r.kind === 'type') { return r; }
    return { ok: true, type: resolveIn(st.subst, r) };
  }

  function resolveIn(sub, t) {
    switch (t.k) {
      case 'var':
        if (sub[t.n] !== undefined) { return resolveIn(sub, sub[t.n]); }
        return t;
      case 'list': return { k: 'list', t: resolveIn(sub, t.t) };
      case 'fun':  return { k: 'fun', a: resolveIn(sub, t.a), b: resolveIn(sub, t.b) };
      default:     return t;
    }
  }

  function fresh(st) {
    var n = st.counter;
    st.counter += 1;
    return TT.var_(n);
  }

  function bindVar(st, pos, v, ty) {
    if (freeVars(ty).has(v)) {
      return HErr('type', pos, 'infinite type: ' + showType(TT.var_(v)) + ' occurs in ' + showType(ty));
    }
    st.subst[v] = ty;
    return null;
  }

  function resolve(st, t) {
    switch (t.k) {
      case 'var':
        if (st.subst[t.n] !== undefined) { return resolve(st, st.subst[t.n]); }
        return t;
      case 'list': return { k: 'list', t: resolve(st, t.t) };
      case 'fun':  return { k: 'fun', a: resolve(st, t.a), b: resolve(st, t.b) };
      default:     return t;
    }
  }

  function unify(st, pos, t1, t2) {
    var r1 = resolve(st, t1);
    var r2 = resolve(st, t2);
    if (r1.k === 'var' && r2.k === 'var' && r1.n === r2.n) { return null; }
    if (r1.k === 'var') { return bindVar(st, pos, r1.n, r2); }
    if (r2.k === 'var') { return bindVar(st, pos, r2.n, r1); }
    if (r1.k === 'int' && r2.k === 'int') { return null; }
    if (r1.k === 'float' && r2.k === 'float') { return null; }
    if (r1.k === 'bool' && r2.k === 'bool') { return null; }
    if (r1.k === 'str' && r2.k === 'str') { return null; }
    if (r1.k === 'list' && r2.k === 'list') { return unify(st, pos, r1.t, r2.t); }
    if (r1.k === 'fun' && r2.k === 'fun') {
      var a = unify(st, pos, r1.a, r2.a);
      if (a) { return a; }
      return unify(st, pos, r1.b, r2.b);
    }
    return HErr('type', pos, 'type mismatch: cannot unify ' + showType(r1) + ' with ' + showType(r2));
  }

  // Instantiate a scheme: fresh variables for every quantified variable.
  function instantiate(st, scheme) {
    var qvars = Array.from(scheme.qvars);
    var m = {};
    qvars.forEach(function (n) { m[n] = fresh(st); });
    return applyMeta(m, scheme.body);
  }
  function applyMeta(m, t) {
    switch (t.k) {
      case 'var':
        return m[t.n] !== undefined ? m[t.n] : t;
      case 'list': return { k: 'list', t: applyMeta(m, t.t) };
      case 'fun':  return { k: 'fun', a: applyMeta(m, t.a), b: applyMeta(m, t.b) };
      default:     return t;
    }
  }

  // Free type variables in every scheme of the environment.
  function schemeFtv(env) {
    var s = new Set();
    Object.keys(env).forEach(function (name) {
      freeVars(env[name].body).forEach(function (n) { s.add(n); });
    });
    return s;
  }
  function generalize(ftv, t) {
    var body = freeVars(t);
    var qvars = new Set();
    body.forEach(function (n) { if (!ftv.has(n)) { qvars.add(n); } });
    return { qvars: qvars, body: t };
  }

  function builtinScheme(name) {
    var a = TT.var_(0);
    switch (name) {
      case 'cons':   return { qvars: new Set([0]), body: TT.fun(a, TT.fun(TT.list(a), TT.list(a))) };
      case 'head':   return { qvars: new Set([0]), body: TT.fun(TT.list(a), a) };
      case 'tail':   return { qvars: new Set([0]), body: TT.fun(TT.list(a), TT.list(a)) };
      case 'isNil':  return { qvars: new Set([0]), body: TT.fun(TT.list(a), TT.BOOL) };
      case 'length': return { qvars: new Set([0]), body: TT.fun(TT.list(a), TT.INT) };
      case 'reverse': return { qvars: new Set([0]), body: TT.fun(TT.list(a), TT.list(a)) };
      case 'append': return { qvars: new Set([0]), body: TT.fun(TT.list(a), TT.fun(TT.list(a), TT.list(a))) };
      case 'take':   return { qvars: new Set([0]), body: TT.fun(TT.INT, TT.fun(TT.list(a), TT.list(a))) };
      case 'drop':   return { qvars: new Set([0]), body: TT.fun(TT.INT, TT.fun(TT.list(a), TT.list(a))) };
    }
  }

  function numericPromote(st, pos, ta, tb) {
    var ra = resolve(st, ta);
    var rb = resolve(st, tb);
    if (ra.k === 'int' && rb.k === 'int') { return TT.INT; }
    if (ra.k === 'float' && rb.k === 'float') { return TT.FLOAT; }
    if (ra.k === 'int' && rb.k === 'float') { return TT.FLOAT; }
    if (ra.k === 'float' && rb.k === 'int') { return TT.FLOAT; }
    if (ra.k === 'var' && rb.k === 'float') { bindVar(st, pos, ra.n, TT.FLOAT); return TT.FLOAT; }
    if (ra.k === 'float' && rb.k === 'var') { bindVar(st, pos, rb.n, TT.FLOAT); return TT.FLOAT; }
    if (ra.k === 'var' && rb.k === 'int') { bindVar(st, pos, ra.n, TT.INT); return TT.INT; }
    if (ra.k === 'int' && rb.k === 'var') { bindVar(st, pos, rb.n, TT.INT); return TT.INT; }
    if (ra.k === 'var' && rb.k === 'var') {
      if (ra.n === rb.n) { return ra; }
      bindVar(st, pos, rb.n, ra);
      return ra;
    }
    return HErr('type', pos, 'numeric operands required for arithmetic/comparison, found '
      + showType(ra) + ' and ' + showType(rb));
  }

  function infer(st, env, e) {
    switch (e.kind) {
      case 'int':    return TT.INT;
      case 'float':  return TT.FLOAT;
      case 'bool':   return TT.BOOL;
      case 'str':    return TT.STR;
      case 'list': {
        var et = fresh(st);
        for (var i = 0; i < e.items.length; i++) {
          var t = infer(st, env, e.items[i]);
          if (t.kind === 'type') { return t; }
          var u = unify(st, e.pos, t, et);
          if (u) { return u; }
        }
        return TT.list(et);
      }
      case 'var':
        if (env[e.name] === undefined) {
          return HErr('type', e.pos, 'unbound name: ' + e.name);
        }
        return instantiate(st, env[e.name]);
      case 'builtin': return instantiate(st, builtinScheme(e.name));
      case 'lambda': {
        var paramTypes = e.params.map(function () { return fresh(st); });
        var env2 = Object.assign({}, env);
        e.params.forEach(function (p, i) { env2[p] = { qvars: new Set(), body: paramTypes[i] }; });
        var bodyT = infer(st, env2, e.body);
        if (bodyT.kind === 'type') { return bodyT; }
        var res = bodyT;
        for (var j = paramTypes.length - 1; j >= 0; j--) { res = TT.fun(paramTypes[j], res); }
        return res;
      }
      case 'apply': {
        var tf = infer(st, env, e.fn);
        if (tf.kind === 'type') { return tf; }
        var ta = infer(st, env, e.arg);
        if (ta.kind === 'type') { return ta; }
        var tr = fresh(st);
        var u2 = unify(st, e.pos, tf, TT.fun(ta, tr));
        if (u2) { return u2; }
        return tr;
      }
      case 'let': {
        var t0 = fresh(st);
        var envRec = Object.assign({}, env);
        envRec[e.name] = { qvars: new Set(), body: t0 };
        var envBound = e.rec ? envRec : env;
        var tb = infer(st, envBound, e.bound);
        if (tb.kind === 'type') { return tb; }
        var u3 = unify(st, e.pos, t0, tb);
        if (u3) { return u3; }
        var tbR = resolve(st, tb);
        var ftv = schemeFtv(env);
        var sch = generalize(ftv, tbR);
        var env3 = Object.assign({}, env);
        env3[e.name] = sch;
        return infer(st, env3, e.body);
      }
      case 'if': {
        var tc = infer(st, env, e.cond);
        if (tc.kind === 'type') { return tc; }
        var u4 = unify(st, e.pos, tc, TT.BOOL);
        if (u4) { return u4; }
        var tt = infer(st, env, e.then);
        if (tt.kind === 'type') { return tt; }
        var te = infer(st, env, e.els);
        if (te.kind === 'type') { return te; }
        var u5 = unify(st, e.pos, tt, te);
        if (u5) { return u5; }
        return tt;
      }
      case 'bin': {
        var op = e.op;
        var arith = op === 'add' || op === 'sub' || op === 'mul' || op === 'div';
        var cmp = op === 'lt' || op === 'le' || op === 'gt' || op === 'ge';
        var eq = op === 'eq' || op === 'ne';
        var ta2 = infer(st, env, e.a);
        if (ta2.kind === 'type') { return ta2; }
        var tb2 = infer(st, env, e.b);
        if (tb2.kind === 'type') { return tb2; }
        if (arith) { return numericPromote(st, e.pos, ta2, tb2); }
        if (cmp) {
          var u6 = numericPromote(st, e.pos, ta2, tb2);
          if (u6.kind === 'type') { return u6; }
          return TT.BOOL;
        }
        if (eq) {
          var u7 = unify(st, e.pos, ta2, tb2);
          if (u7) { return u7; }
          return TT.BOOL;
        }
        // and / or
        var u8 = unify(st, e.pos, ta2, TT.BOOL);
        if (u8) { return u8; }
        var u9 = unify(st, e.pos, tb2, TT.BOOL);
        if (u9) { return u9; }
        return TT.BOOL;
      }
      case 'neg': {
        var tx = infer(st, env, e.x);
        if (tx.kind === 'type') { return tx; }
        var rx = resolve(st, tx);
        if (rx.k === 'int') { return TT.INT; }
        if (rx.k === 'float') { return TT.FLOAT; }
        if (rx.k === 'var') { return rx; }
        return HErr('type', e.pos, 'unary minus requires a numeric operand');
      }
      case 'not': {
        var ty = infer(st, env, e.x);
        if (ty.kind === 'type') { return ty; }
        var u10 = unify(st, e.pos, ty, TT.BOOL);
        if (u10) { return u10; }
        return TT.BOOL;
      }
      default:
        return HErr('type', e.pos || POS_EOF, 'internal error: unknown expression');
    }
  }

  // =====================================================================
  // Tree-walking interpreter (mirrors Halcyon.Eval).
  //
  // The evaluator is written in continuation-passing style and driven by a
  // trampoline, so recursion depth is bounded by memory rather than the
  // native call stack: the Haskell core evaluates deeply recursive programs
  // (the corpus's 100000-step accumulator sum) on its heap-allocated stack,
  // and the JS mirror must run the same programs.
  // =====================================================================

  function evalProgram(src) {
    var parsed = parseProgram(src);
    if (parsed.kind === 'parse') { return HErr('eval', parsed.pos, parsed.message); }
    return drive(evalCPS({}, parsed, function (v) { return v; }));
  }

  // The trampoline: repeatedly run thunks until a final value or error.
  function drive(thunk) {
    while (typeof thunk === 'function') { thunk = thunk(); }
    return thunk;
  }

  // evalCPS :: env -> expr -> (value -> answer) -> answer-or-thunk
  function evalCPS(env, e, k) {
    switch (e.kind) {
      case 'int':    return k(VInt(e.v));
      case 'float':  return k(VFloat(e.v));
      case 'bool':   return k(VBool(e.v));
      case 'str':    return k(VStr(e.v));
      case 'list': {
        var items = e.items;
        return function () {
          function loop(i, acc) {
            if (i >= items.length) { return k(VList(acc)); }
            return evalCPS(env, items[i], function (v) {
              acc.push(v);
              return loop(i + 1, acc);
            });
          }
          return loop(0, []);
        };
      }
      case 'var':
        if (env[e.name] === undefined) { return HErr('eval', e.pos, 'unbound name: ' + e.name); }
        return k(env[e.name]);
      case 'builtin': return k(VBuiltin(e.name));
      case 'lambda': return k(VClosure(e.params, e.body, env));
      case 'apply':
        return function () {
          return evalCPS(env, e.fn, function (vf) {
            return function () {
              return evalCPS(env, e.arg, function (va) {
                return applyCPS(e.pos, k, vf, va);
              });
            };
          });
        };
      case 'let': {
        if (e.bound.kind === 'lambda') {
          var env2 = Object.assign({}, env);
          var captured = e.rec ? env2 : env;
          env2[e.name] = VClosure(e.bound.params, e.bound.body, captured);
          return evalCPS(env2, e.body, k);
        }
        if (e.rec) { return HErr('eval', e.pos, 'let rec requires a function value for ' + e.name); }
        return function () {
          return evalCPS(env, e.bound, function (vb) {
            var env3 = Object.assign({}, env);
            env3[e.name] = vb;
            return evalCPS(env3, e.body, k);
          });
        };
      }
      case 'if':
        return function () {
          return evalCPS(env, e.cond, function (vc) {
            if (vc.k !== 'bool') {
              return HErr('eval', e.pos, 'if condition must be a boolean, got ' + showValue(vc));
            }
            return evalCPS(env, vc.v ? e.then : e.els, k);
          });
        };
      case 'bin':
        return function () {
          return evalCPS(env, e.a, function (va) {
            return function () {
              return evalCPS(env, e.b, function (vb) {
                return k(binop(e.pos, e.op, va, vb));
              });
            };
          });
        };
      case 'neg':
        return function () {
          return evalCPS(env, e.x, function (v) {
            if (v.k === 'int') { return k(VInt(-v.v)); }
            if (v.k === 'float') { return k(VFloat(-v.v)); }
            return HErr('eval', e.pos, 'cannot negate ' + showValue(v));
          });
        };
      case 'not':
        return function () {
          return evalCPS(env, e.x, function (v) {
            if (v.k !== 'bool') { return HErr('eval', e.pos, 'cannot apply ! to ' + showValue(v)); }
            return k(VBool(!v.v));
          });
        };
      default:
        return HErr('eval', e.pos || POS_EOF, 'internal error: unknown expression');
    }
  }

  // Curried application in CPS: lambdas bind the first remaining parameter;
  // a partially applied cons completes into a list.
  function applyCPS(pos, k, vf, va) {
    switch (vf.k) {
      case 'closure': {
        if (vf.params.length === 0) {
          return HErr('eval', pos, 'function with no parameters');
        }
        var envC = Object.assign({}, vf.env);
        envC[vf.params[0]] = va;
        if (vf.params.length === 1) { return evalCPS(envC, vf.body, k); }
        return k(VClosure(vf.params.slice(1), vf.body, envC));
      }
      case 'partial': {
        var args = vf.args.concat([va]);
        if (args.length === builtinArity(vf.name)) {
          var res = completeBuiltin(pos, vf.name, args);
          return res.kind === 'eval' ? res : k(res);
        }
        return k(VPartial(vf.name, args));
      }
      case 'builtin': {
        var r = applyBuiltin(pos, vf.name, va);
        return r.kind === 'eval' ? r : k(r);
      }
      default:
        return HErr('eval', pos, 'cannot apply ' + showValue(vf));
    }
  }

  // The number of arguments a builtin needs before it can run.
  function builtinArity(name) {
    switch (name) {
      case 'cons': case 'append': case 'take': case 'drop': return 2;
      default: return 1;
    }
  }

  // Run a fully-applied builtin to a value (or an error). Mirrors the
  // interpreter's completeBuiltin.
  function completeBuiltin(pos, name, args) {
    switch (name) {
      case 'cons':
        if (args[1].k === 'list') { return VList([args[0]].concat(args[1].v)); }
        return HErr('eval', pos, 'cons expects a list, got ' + showValue(args[1]));
      case 'head':
        if (args[0].k === 'list') {
          if (args[0].v.length > 0) { return args[0].v[0]; }
          return HErr('eval', pos, 'head of empty list');
        }
        return HErr('eval', pos, 'head expects a list, got ' + showValue(args[0]));
      case 'tail':
        if (args[0].k === 'list') {
          if (args[0].v.length > 0) { return VList(args[0].v.slice(1)); }
          return HErr('eval', pos, 'tail of empty list');
        }
        return HErr('eval', pos, 'tail expects a list, got ' + showValue(args[0]));
      case 'isNil':
        if (args[0].k === 'list') { return VBool(args[0].v.length === 0); }
        return HErr('eval', pos, 'isNil expects a list, got ' + showValue(args[0]));
      case 'length':
        if (args[0].k === 'list') { return VInt(args[0].v.length); }
        return HErr('eval', pos, 'length expects a list, got ' + showValue(args[0]));
      case 'reverse':
        if (args[0].k === 'list') { return VList(args[0].v.slice().reverse()); }
        return HErr('eval', pos, 'reverse expects a list, got ' + showValue(args[0]));
      case 'append':
        if (args[0].k === 'list' && args[1].k === 'list') { return VList(args[0].v.concat(args[1].v)); }
        return HErr('eval', pos, 'append expects lists, got ' + showValue(args[0]) + ' and ' + showValue(args[1]));
      case 'take':
        if (args[0].k === 'int' && args[1].k === 'list') {
          var n = args[0].v;
          return VList(n <= 0 ? [] : args[1].v.slice(0, n));
        }
        return HErr('eval', pos, 'take expects an Int and a list, got ' + showValue(args[0]) + ' and ' + showValue(args[1]));
      case 'drop':
        if (args[0].k === 'int' && args[1].k === 'list') {
          var m = args[0].v;
          return VList(m <= 0 ? args[1].v : args[1].v.slice(m));
        }
        return HErr('eval', pos, 'drop expects an Int and a list, got ' + showValue(args[0]) + ' and ' + showValue(args[1]));
      default:
        return HErr('eval', pos, 'internal error: unknown builtin');
    }
  }

  function applyBuiltin(pos, b, va) {
    switch (b) {
      case 'cons': case 'append': case 'take': case 'drop':
        return VPartial(b, [va]);
      case 'head': case 'tail': case 'isNil': case 'length': case 'reverse':
        return completeBuiltin(pos, b, [va]);
      default:
        return HErr('eval', pos, 'internal error: unknown builtin');
    }
  }

  function binop(pos, op, va, vb) {
    switch (op) {
      case 'add': return numeric2(pos, function (a, b) { return a + b; }, va, vb);
      case 'sub': return numeric2(pos, function (a, b) { return a - b; }, va, vb);
      case 'mul': return numeric2(pos, function (a, b) { return a * b; }, va, vb);
      case 'div': return numericDiv(pos, va, vb);
      case 'lt': return numCmp(pos, va, vb, function (a, b) { return a < b; });
      case 'le': return numCmp(pos, va, vb, function (a, b) { return a <= b; });
      case 'gt': return numCmp(pos, va, vb, function (a, b) { return a > b; });
      case 'ge': return numCmp(pos, va, vb, function (a, b) { return a >= b; });
      case 'eq': return VBool(equalValues(va, vb));
      case 'ne': return VBool(!equalValues(va, vb));
      case 'and': return bool2(pos, op, va, vb, function (a, b) { return a && b; });
      case 'or':  return bool2(pos, op, va, vb, function (a, b) { return a || b; });
      default:
        return HErr('eval', pos, 'internal error: unknown operator');
    }
  }

  function equalValues(a, b) {
    if (a.k === 'int' && b.k === 'int') { return a.v === b.v; }
    if (a.k === 'float' && b.k === 'float') { return a.v === b.v; }
    if (a.k === 'int' && b.k === 'float') { return a.v === b.v; }
    if (a.k === 'float' && b.k === 'int') { return a.v === b.v; }
    if (a.k === 'bool' && b.k === 'bool') { return a.v === b.v; }
    if (a.k === 'str' && b.k === 'str') { return a.v === b.v; }
    if (a.k === 'list' && b.k === 'list') {
      if (a.v.length !== b.v.length) { return false; }
      for (var i = 0; i < a.v.length; i++) {
        if (!equalValues(a.v[i], b.v[i])) { return false; }
      }
      return true;
    }
    if (a.k === 'closure' || b.k === 'closure' || a.k === 'partial' || b.k === 'partial') {
      // Comparing functions is rejected by the VM but not the interpreter;
      // functions never compare equal.
      return false;
    }
    return false;
  }

  // Numeric binary operation with Int/Float promotion.
  function numeric2(pos, f, va, vb) {
    if (va.k === 'int' && vb.k === 'int') { return VInt(f(va.v, vb.v)); }
    if (va.k === 'float' && vb.k === 'float') { return VFloat(f(va.v, vb.v)); }
    if (va.k === 'int' && vb.k === 'float') { return VFloat(f(va.v, vb.v)); }
    if (va.k === 'float' && vb.k === 'int') { return VFloat(f(va.v, vb.v)); }
    return HErr('eval', pos, 'arithmetic requires numeric operands');
  }

  function numericDiv(pos, va, vb) {
    if (va.k === 'int' && vb.k === 'int') {
      if (vb.v === 0) { return HErr('eval', pos, 'division by zero'); }
      return VInt(Math.trunc(va.v / vb.v));
    }
    if (va.k === 'float' && vb.k === 'float') {
      if (vb.v === 0) { return HErr('eval', pos, 'division by zero'); }
      return VFloat(va.v / vb.v);
    }
    if (va.k === 'int' && vb.k === 'float') {
      if (vb.v === 0) { return HErr('eval', pos, 'division by zero'); }
      return VFloat(va.v / vb.v);
    }
    if (va.k === 'float' && vb.k === 'int') {
      if (vb.v === 0) { return HErr('eval', pos, 'division by zero'); }
      return VFloat(va.v / vb.v);
    }
    return HErr('eval', pos, 'operator / requires numeric operands');
  }

  function numCmp(pos, va, vb, f) {
    if (va.k === 'int' && vb.k === 'int') { return VBool(f(va.v, vb.v)); }
    if (va.k === 'float' && vb.k === 'float') { return VBool(f(va.v, vb.v)); }
    if (va.k === 'int' && vb.k === 'float') { return VBool(f(va.v, vb.v)); }
    if (va.k === 'float' && vb.k === 'int') { return VBool(f(va.v, vb.v)); }
    return HErr('eval', pos, 'comparison requires numeric operands');
  }

  function bool2(pos, op, va, vb, f) {
    if (va.k === 'bool' && vb.k === 'bool') { return VBool(f(va.v, vb.v)); }
    var opName = { and: '&&', or: '||' }[op];
    return HErr('eval', pos, 'operator ' + opName + ' requires boolean operands');
  }

  // =====================================================================
  // Bytecode compiler (mirrors Halcyon.Compile)
  // =====================================================================

  function CScope() { return { locals: [], upvals: [] }; }

  function CompileState() {
    return {
      scopes: [CScope()],
      code: [],
      nextCell: 0,
      consts: [],
      constMap: {},
      lambda: 0,
      labels: {},
      nextLabel: 0,
      patches: []
    };
  }

  function compileProgram(src) {
    var parsed = parseProgram(src);
    if (parsed.kind === 'parse') { return HErr('compile', parsed.pos, parsed.message); }
    var st = CompileState();
    var r = compileExpr(parsed, st);
    if (r) { return r; }
    st.code.push({ op: 'halt' });
    resolvePatches(st);
    var entry = {
      name: 'main', params: [], code: st.code, consts: st.consts,
      upvals: [], upvalNames: []
    };
    return { ok: true, program: { entry: entry } };
  }

  function emit(st, instr) { st.code.push(instr); }

  function compileExpr(e, st) {
    switch (e.kind) {
      case 'int':    return emitConst(st, { c: 'value', v: VInt(e.v) });
      case 'float':  return emitConst(st, { c: 'value', v: VFloat(e.v) });
      case 'bool':   return emitConst(st, { c: 'value', v: VBool(e.v) });
      case 'str':    return emitConst(st, { c: 'value', v: VStr(e.v) });
      case 'list':
        for (var i = 0; i < e.items.length; i++) {
          var r0 = compileExpr(e.items[i], st);
          if (r0) { return r0; }
        }
        emit(st, { op: 'make_list', n: e.items.length });
        return null;
      case 'var':    return resolveRef(e.pos, e.name, st);
      case 'builtin': return emitConst(st, { c: 'value', v: VBuiltin(e.name) });
      case 'lambda': return compileLambda(e.pos, e.params, e.body, st);
      case 'apply': {
        var r1 = compileExpr(e.fn, st);
        if (r1) { return r1; }
        var r2 = compileExpr(e.arg, st);
        if (r2) { return r2; }
        emit(st, { op: 'call' });
        return null;
      }
      case 'let':    return compileLet(e.pos, e.rec, e.name, e.bound, e.body, st);
      case 'if': {
        var r3 = compileExpr(e.cond, st);
        if (r3) { return r3; }
        var labFalse = emitJump(st, 'jump_if_false');
        var r4 = compileExpr(e.then, st);
        if (r4) { return r4; }
        var labEnd = emitJump(st, 'jump');
        defineLabel(st, labFalse);
        var r5 = compileExpr(e.els, st);
        if (r5) { return r5; }
        defineLabel(st, labEnd);
        return null;
      }
      case 'bin': {
        var r6 = compileExpr(e.a, st);
        if (r6) { return r6; }
        var r7 = compileExpr(e.b, st);
        if (r7) { return r7; }
        emit(st, { op: opToInstr(e.op) });
        return null;
      }
      case 'neg': {
        var r8 = compileExpr(e.x, st);
        if (r8) { return r8; }
        emit(st, { op: 'neg' });
        return null;
      }
      case 'not': {
        var r9 = compileExpr(e.x, st);
        if (r9) { return r9; }
        emit(st, { op: 'not' });
        return null;
      }
      default:
        return HErr('compile', e.pos || POS_EOF, 'internal error: unknown expression');
    }
  }

  function opToInstr(op) {
    switch (op) {
      case 'add': return 'add';
      case 'sub': return 'sub';
      case 'mul': return 'mul';
      case 'div': return 'div';
      case 'lt':  return 'lt';
      case 'le':  return 'le';
      case 'gt':  return 'gt';
      case 'ge':  return 'ge';
      case 'eq':  return 'eq';
      case 'ne':  return 'ne';
      case 'and': return 'and';
      case 'or':  return 'or';
      default:    return 'pop';
    }
  }

  function compileLet(pos, rec, name, bound, body, st) {
    if (bound.kind === 'lambda') {
      var slot = registerLocal(name, st);
      if (rec) { emit(st, { op: 'new_cell', s: slot }); }
      var r = compileLambda(bound.pos, bound.params, bound.body, st);
      if (r) { return r; }
      emit(st, { op: 'store_local', s: slot });
      return compileExpr(body, st);
    }
    if (rec) { return HErr('compile', pos, 'let rec requires a function value for ' + name); }
    var r2 = compileExpr(bound, st);
    if (r2) { return r2; }
    var slot2 = registerLocal(name, st);
    emit(st, { op: 'store_local', s: slot2 });
    return compileExpr(body, st);
  }

  function compileLambda(pos, params, body, st) {
    var outer = {
      scopes: st.scopes, code: st.code, nextCell: st.nextCell,
      consts: st.consts, constMap: st.constMap, lambda: st.lambda,
      labels: st.labels, nextLabel: st.nextLabel, patches: st.patches
    };
    var scope = { locals: params.map(function (p, i) { return { name: p, slot: i }; }), upvals: [] };
    st.scopes = [scope].concat(st.scopes);
    st.code = [];
    st.nextCell = params.length;
    st.consts = [];
    st.constMap = {};
    st.lambda += 1;
    st.labels = {};
    st.nextLabel = 0;
    st.patches = [];

    var r = compileExpr(body, st);
    if (r) { return r; }
    emit(st, { op: 'return' });
    resolvePatches(st);

    var head = st.scopes[0];
    var upvals = head.upvals.map(function (u) { return [u.hops, u.index]; });
    var upvalNames = head.upvals.map(function (u) { return u.name; });
    var func = {
      name: '<lambda' + st.lambda + '>', params: params, code: st.code,
      consts: st.consts, upvals: upvals, upvalNames: upvalNames
    };

    st.scopes = outer.scopes;
    st.code = outer.code;
    st.nextCell = outer.nextCell;
    st.consts = outer.consts;
    st.constMap = outer.constMap;
    st.lambda = outer.lambda;
    st.labels = outer.labels;
    st.nextLabel = outer.nextLabel;
    st.patches = outer.patches;

    var idx = addConst(st, { c: 'func', f: func });
    emit(st, { op: 'make_closure', i: idx });
    return null;
  }

  function registerLocal(name, st) {
    var scope = st.scopes[0];
    var slot = st.nextCell;
    scope.locals.push({ name: name, slot: slot });
    st.nextCell += 1;
    return slot;
  }

  function addConst(st, c) {
    if (c.c === 'func') {
      var idx = st.consts.length;
      st.consts.push(c);
      return idx;
    }
    var key = constEquiv(c.v);
    if (st.constMap[key] !== undefined) { return st.constMap[key]; }
    var i2 = st.consts.length;
    st.consts.push(c);
    st.constMap[key] = i2;
    return i2;
  }

  function constEquiv(v) {
    return 'v:' + showValue(v);
  }

  function emitConst(st, c) {
    var i = addConst(st, c);
    emit(st, { op: 'push_const', i: i });
    return null;
  }

  // Resolve a variable reference, emitting the right load instruction and
  // recording upvalue capture paths as needed.
  function resolveRef(pos, name, st) {
    var current = st.scopes[0];
    for (var i = 0; i < current.locals.length; i++) {
      if (current.locals[i].name === name) {
        emit(st, { op: 'push_local', s: current.locals[i].slot });
        return null;
      }
    }
    for (var j = 0; j < current.upvals.length; j++) {
      if (current.upvals[j].name === name) {
        emit(st, { op: 'push_upvalue', h: current.upvals[j].hops, i: current.upvals[j].index });
        return null;
      }
    }
    return walkOuter(1, name, st);
  }

  function walkOuter(k, name, st) {
    var rest = st.scopes.slice(1);
    if (rest.length === 0) {
      return HErr('compile', POS_EOF, 'unbound name: ' + name);
    }
    var scope = rest[0];
    for (var i = 0; i < scope.locals.length; i++) {
      if (scope.locals[i].name === name) {
        var j = scope.locals[i].slot;
        addUpvalue(name, k - 1, j, st);
        emit(st, { op: 'push_upvalue', h: k - 1, i: j });
        return null;
      }
    }
    for (var j2 = 0; j2 < scope.upvals.length; j2++) {
      if (scope.upvals[j2].name === name) {
        var h = scope.upvals[j2].hops;
        var idx = scope.upvals[j2].index;
        addUpvalue(name, k + h, idx, st);
        emit(st, { op: 'push_upvalue', h: k + h, i: idx });
        return null;
      }
    }
    return walkOuter(k + 1, name, st);
  }

  function addUpvalue(name, hops, index, st) {
    var scope = st.scopes[0];
    scope.upvals.push({ name: name, hops: hops, index: index });
  }

  function emitJump(st, kind) {
    var lab = st.nextLabel;
    st.nextLabel += 1;
    st.code.push({ op: kind, target: 0 });
    st.patches.push([lab, st.code.length - 1]);
    return lab;
  }

  function defineLabel(st, lab) {
    st.labels[lab] = st.code.length;
  }

  function resolvePatches(st) {
    for (var i = 0; i < st.patches.length; i++) {
      var lab = st.patches[i][0];
      var pos = st.patches[i][1];
      var tgt = st.labels[lab] !== undefined ? st.labels[lab] : 0;
      st.code[pos].target = tgt;
    }
    st.patches = [];
  }

  // =====================================================================
  // Disassembler (mirrors Halcyon.Compile.disassemble)
  // =====================================================================

  function showInstr(instr) {
    switch (instr.op) {
      case 'push_const':    return 'push_const ' + instr.i;
      case 'push_local':    return 'push_local ' + instr.s;
      case 'store_local':   return 'store_local ' + instr.s;
      case 'new_cell':      return 'new_cell ' + instr.s;
      case 'push_upvalue':  return 'push_upvalue ' + instr.h + ':' + instr.i;
      case 'pop':           return 'pop';
      case 'add':           return 'add';
      case 'sub':           return 'sub';
      case 'mul':           return 'mul';
      case 'div':           return 'div';
      case 'lt':            return 'lt';
      case 'le':            return 'le';
      case 'gt':            return 'gt';
      case 'ge':            return 'ge';
      case 'eq':            return 'eq';
      case 'ne':            return 'ne';
      case 'and':           return 'and';
      case 'or':            return 'or';
      case 'not':           return 'not';
      case 'neg':           return 'neg';
      case 'jump':          return 'jump ' + instr.target;
      case 'jump_if_false': return 'jump_if_false ' + instr.target;
      case 'call':          return 'call';
      case 'make_closure':  return 'make_closure ' + instr.i;
      case 'return':        return 'return';
      case 'cons':          return 'cons';
      case 'head':          return 'head';
      case 'tail':          return 'tail';
      case 'is_nil':        return 'is_nil';
      case 'make_list':     return 'make_list ' + instr.n;
      case 'halt':          return 'halt';
      default:              return instr.op;
    }
  }

  function showConst(c) {
    return c.c === 'value' ? showValue(c.v) : '<fn ' + c.f.name + '>';
  }

  function disassemble(func) {
    var lines = [];
    function dis(fn, depth) {
      var indent = new Array(depth * 2 + 1).join(' ');
      lines.push(indent + fn.name + '(' + fn.params.join(', ') + ') upvals='
        + fn.upvals.length + ' consts=' + fn.consts.length);
      fn.code.forEach(function (instr, i) {
        lines.push(indent + '  ' + i + ': ' + showInstr(instr));
      });
      fn.consts.forEach(function (c) {
        if (c.c === 'func') { dis(c.f, depth + 1); }
      });
    }
    dis(func, 0);
    return lines.join('\n') + '\n';
  }

  // =====================================================================
  // Bytecode VM (mirrors Halcyon.Vm): a stack machine with frames and
  // upvalue cells shared with the defining frame.
  // =====================================================================

  function vmShowValue(v) {
    switch (v.k) {
      case 'vm_int':    return String(v.v);
      case 'vm_float':  return showFloat(v.v);
      case 'vm_bool':   return v.v ? 'true' : 'false';
      case 'vm_str':    return v.v;
      case 'vm_list':   return '[' + v.v.map(vmShowValue).join(', ') + ']';
      case 'vm_closure': return '<function>';
      case 'vm_partial': return '<function>';
      case 'vm_builtin': return '<builtin: ' + v.name + '>';
      case 'vm_partial_builtin': return '<builtin: ' + v.name + ' ' + v.args.map(vmShowValue).join(' ') + '>';
      default:           return '<value>';
    }
  }

  function VmInt(v) { return { k: 'vm_int', v: v }; }
  function VmFloat(v) { return { k: 'vm_float', v: v }; }
  function VmBool(v) { return { k: 'vm_bool', v: v }; }
  function VmStr(v) { return { k: 'vm_str', v: v }; }
  function VmList(v) { return { k: 'vm_list', v: v }; }
  function VmClosure(f, ctx) { return { k: 'vm_closure', f: f, ctx: ctx }; }
  function VmPartial(f, ctx, bound) { return { k: 'vm_partial', f: f, ctx: ctx, bound: bound }; }
  function VmBuiltin(n) { return { k: 'vm_builtin', name: n }; }
  function VmPartialBuiltin(n, args) { return { k: 'vm_partial_builtin', name: n, args: args }; }

  // A cell is a mutable box (the JS counterpart of an IORef).
  function Cell(v) { return { box: v }; }

  function toVm(v) {
    switch (v.k) {
      case 'int':     return VmInt(v.v);
      case 'float':   return VmFloat(v.v);
      case 'bool':    return VmBool(v.v);
      case 'str':     return VmStr(v.v);
      case 'list':    return VmList(v.v.map(toVm));
      case 'builtin': return VmBuiltin(v.name);
      case 'partial': return VmPartialBuiltin(v.name, v.args.map(toVm));
      default:        return VmBuiltin('?');
    }
  }

  // A VM machine: owns the operand stack, the frame stack, and all the
  // instruction logic, and exposes single-step + snapshot so the same
  // machine drives both @runVm@ (run to completion) and the playground's
  // step-through debugger.
  function makeVm(program) {
    var stack = [];
    var frames = [{
      f: program.entry,
      ctx: { cells: {}, outer: null },
      ip: 0
    }];
    var halted = false;
    var result = null;

    function pushS(v) { stack.push(v); }
    function popS() {
      if (stack.length === 0) { return HErr('vm', POS_EOF, 'operand stack underflow'); }
      return stack.pop();
    }
    function popN(n) {
      var out = [];
      for (var i = 0; i < n; i++) {
        var r = popS();
        if (r.kind === 'vm') { return r; }
        out.push(r);
      }
      return out;
    }
    function readCell(ctx, s) {
      if (ctx.cells[s] === undefined) { return HErr('vm', POS_EOF, 'no local at slot ' + s); }
      if (ctx.cells[s].box === null || ctx.cells[s].box === undefined) {
        return HErr('vm', POS_EOF, 'uninitialized local at slot ' + s);
      }
      return ctx.cells[s].box;
    }
    function storeCell(s, v) {
      var f = frames[0];
      if (f.ctx.cells[s] === undefined) { f.ctx.cells[s] = Cell(null); }
      f.ctx.cells[s].box = v;
    }
    function newCell(s) {
      frames[0].ctx.cells[s] = Cell(null);
    }
    function walkCtx(h, ctx) {
      var c = ctx;
      for (var i = 0; i < h; i++) {
        if (c.outer === null) { return HErr('vm', POS_EOF, 'upvalue chain exhausted'); }
        c = c.outer;
      }
      return c;
    }

    function bumpIp() {
      frames[0].ip += 1;
    }
    function setIp(target) {
      frames[0].ip = target;
    }
    function runFrame(func, captured, bound) {
      var cells = {};
      bound.forEach(function (b) { cells[b.slot] = Cell(b.val); });
      var caller = frames[0];
      caller.ip += 1;
      frames.unshift({ f: func, ctx: { cells: cells, outer: captured }, ip: 0 });
    }

    function failVm(msg) { return HErr('vm', POS_EOF, msg); }

    function num2(a, b, fi, ff) {
      if (a.k === 'vm_int' && b.k === 'vm_int') { return VmInt(fi(a.v, b.v)); }
      if (a.k === 'vm_float' && b.k === 'vm_float') { return VmFloat(ff(a.v, b.v)); }
      if (a.k === 'vm_int' && b.k === 'vm_float') { return VmFloat(ff(a.v, b.v)); }
      if (a.k === 'vm_float' && b.k === 'vm_int') { return VmFloat(ff(a.v, b.v)); }
      return failVm('operator + requires numeric operands, got ' + vmShowValue(a) + ' and ' + vmShowValue(b));
    }
    function div2(a, b) {
      if (a.k === 'vm_int' && b.k === 'vm_int') {
        if (b.v === 0) { return failVm('division by zero'); }
        return VmInt(Math.trunc(a.v / b.v));
      }
      if (a.k === 'vm_float' && b.k === 'vm_float') {
        if (b.v === 0) { return failVm('division by zero'); }
        return VmFloat(a.v / b.v);
      }
      if (a.k === 'vm_int' && b.k === 'vm_float') { return VmFloat(a.v / b.v); }
      if (a.k === 'vm_float' && b.k === 'vm_int') {
        if (b.v === 0) { return failVm('division by zero'); }
        return VmFloat(a.v / b.v);
      }
      return failVm('operator / requires numeric operands, got ' + vmShowValue(a) + ' and ' + vmShowValue(b));
    }
    function cmp2(a, b, f) {
      if (a.k === 'vm_int' && b.k === 'vm_int') { return VmBool(f(a.v, b.v)); }
      if (a.k === 'vm_float' && b.k === 'vm_float') { return VmBool(f(a.v, b.v)); }
      if (a.k === 'vm_int' && b.k === 'vm_float') { return VmBool(f(a.v, b.v)); }
      if (a.k === 'vm_float' && b.k === 'vm_int') { return VmBool(f(a.v, b.v)); }
      return failVm('comparison requires numeric operands, got ' + vmShowValue(a) + ' and ' + vmShowValue(b));
    }
    function eq2(a, b) {
      if (a.k === 'vm_int' && b.k === 'vm_int') { return VmBool(a.v === b.v); }
      if (a.k === 'vm_float' && b.k === 'vm_float') { return VmBool(a.v === b.v); }
      if (a.k === 'vm_int' && b.k === 'vm_float') { return VmBool(a.v === b.v); }
      if (a.k === 'vm_float' && b.k === 'vm_int') { return VmBool(a.v === b.v); }
      if (a.k === 'vm_bool' && b.k === 'vm_bool') { return VmBool(a.v === b.v); }
      if (a.k === 'vm_str' && b.k === 'vm_str') { return VmBool(a.v === b.v); }
      if (a.k === 'vm_list' && b.k === 'vm_list') { return eqLists(a.v, b.v); }
      if (a.k === 'vm_closure' || b.k === 'vm_closure' || a.k === 'vm_partial' || b.k === 'vm_partial') {
        return failVm('cannot compare functions');
      }
      return failVm('cannot compare ' + vmShowValue(a) + ' and ' + vmShowValue(b));
    }
    function eqLists(xs, ys) {
      if (xs.length !== ys.length) { return VmBool(false); }
      for (var i = 0; i < xs.length; i++) {
        var r = eq2(xs[i], ys[i]);
        if (r.kind === 'vm') { return r; }
        if (!r.v) { return VmBool(false); }
      }
      return VmBool(true);
    }

    function vmArity(name) {
      switch (name) {
        case 'cons': case 'append': case 'take': case 'drop': return 2;
        default: return 1;
      }
    }

    // Run a fully-applied builtin (mirrors the Haskell VM's completeBuiltin).
    function completeBuiltin(name, args) {
      switch (name) {
        case 'cons':
          if (args[1].k === 'vm_list') { return VmList([args[0]].concat(args[1].v)); }
          return failVm('cons expects a list, got ' + vmShowValue(args[1]));
        case 'head':
          if (args[0].k === 'vm_list') {
            if (args[0].v.length > 0) { return args[0].v[0]; }
            return failVm('head of empty list');
          }
          return failVm('head expects a list, got ' + vmShowValue(args[0]));
        case 'tail':
          if (args[0].k === 'vm_list') {
            if (args[0].v.length > 0) { return VmList(args[0].v.slice(1)); }
            return failVm('tail of empty list');
          }
          return failVm('tail expects a list, got ' + vmShowValue(args[0]));
        case 'isNil':
          if (args[0].k === 'vm_list') { return VmBool(args[0].v.length === 0); }
          return failVm('isNil expects a list, got ' + vmShowValue(args[0]));
        case 'length':
          if (args[0].k === 'vm_list') { return VmInt(args[0].v.length); }
          return failVm('length expects a list, got ' + vmShowValue(args[0]));
        case 'reverse':
          if (args[0].k === 'vm_list') { return VmList(args[0].v.slice().reverse()); }
          return failVm('reverse expects a list, got ' + vmShowValue(args[0]));
        case 'append':
          if (args[0].k === 'vm_list' && args[1].k === 'vm_list') {
            return VmList(args[0].v.concat(args[1].v));
          }
          return failVm('append expects lists, got ' + vmShowValue(args[0]) + ' and ' + vmShowValue(args[1]));
        case 'take':
          if (args[0].k === 'vm_int' && args[1].k === 'vm_list') {
            var n = args[0].v;
            return VmList(n <= 0 ? [] : args[1].v.slice(0, n));
          }
          return failVm('take expects an Int and a list, got ' + vmShowValue(args[0]) + ' and ' + vmShowValue(args[1]));
        case 'drop':
          if (args[0].k === 'vm_int' && args[1].k === 'vm_list') {
            var m = args[0].v;
            return VmList(m <= 0 ? args[1].v : args[1].v.slice(m));
          }
          return failVm('drop expects an Int and a list, got ' + vmShowValue(args[0]) + ' and ' + vmShowValue(args[1]));
        default:
          return failVm('internal error: unknown builtin');
      }
    }

    function applyBuiltin(name, arg) {
      switch (name) {
        case 'cons': case 'append': case 'take': case 'drop':
          return VmPartialBuiltin(name, [arg]);
        case 'head': case 'tail': case 'isNil': case 'length': case 'reverse':
          return completeBuiltin(name, [arg]);
        default:
          return failVm('internal error: unknown builtin');
      }
    }

    // Curried application: every Call applies exactly one argument.
    function call(f, arg, fn) {
      switch (fn.k) {
        case 'vm_closure': {
          var n = fn.f.params.length;
          if (n === 1) { runFrame(fn.f, fn.ctx, [{ slot: 0, val: arg }]); }
          else if (n > 1) { pushS(VmPartial(fn.f, fn.ctx, [{ slot: 0, val: arg }])); bumpIp(); }
          else { return failVm('function with no parameters'); }
          return null;
        }
        case 'vm_partial': {
          var n2 = fn.f.params.length;
          var nextSlot = fn.bound.length;
          var bound2 = fn.bound.concat([{ slot: nextSlot, val: arg }]);
          if (nextSlot + 1 === n2) { runFrame(fn.f, fn.ctx, bound2); }
          else { pushS(VmPartial(fn.f, fn.ctx, bound2)); bumpIp(); }
          return null;
        }
        case 'vm_builtin': {
          var r = applyBuiltin(fn.name, arg);
          if (r.kind === 'vm') { return r; }
          pushS(r); bumpIp();
          return null;
        }
        case 'vm_partial_builtin': {
          var args = fn.args.concat([arg]);
          if (args.length === vmArity(fn.name)) {
            var r = completeBuiltin(fn.name, args);
            if (r.kind === 'vm') { return r; }
            pushS(r); bumpIp(); return null;
          }
          pushS(VmPartialBuiltin(fn.name, args)); bumpIp();
          return null;
        }
        default:
          return failVm('cannot apply ' + vmShowValue(fn));
      }
    }

    function execute(instr) {
      var f = frames[0];
      switch (instr.op) {
        case 'push_const': {
          var c = f.f.consts[instr.i];
          if (c.c === 'value') { pushS(toVm(c.v)); bumpIp(); }
          else { return failVm('push_const on a function constant'); }
          return null;
        }
        case 'push_local': {
          var r = readCell(f.ctx, instr.s);
          if (r.kind === 'vm') { return r; }
          pushS(r); bumpIp();
          return null;
        }
        case 'store_local': {
          var r2 = popS();
          if (r2.kind === 'vm') { return r2; }
          storeCell(instr.s, r2); bumpIp();
          return null;
        }
        case 'new_cell':
          newCell(instr.s); bumpIp();
          return null;
        case 'push_upvalue': {
          // Mirror the Haskell VM: upvalue hops are counted from the
          // closure's captured outer context, not the current frame's own.
          if (f.ctx.outer === null) { return failVm('upvalue reference from top-level frame'); }
          var walk = walkCtx(instr.h, f.ctx.outer);
          if (walk.kind === 'vm') { return walk; }
          var r3 = readCell(walk, instr.i);
          if (r3.kind === 'vm') { return r3; }
          pushS(r3); bumpIp();
          return null;
        }
        case 'pop': {
          var r4 = popS();
          if (r4.kind === 'vm') { return r4; }
          bumpIp();
          return null;
        }
        case 'add': case 'sub': case 'mul': {
          var rb = popS(); var ra = popS();
          if (ra.kind === 'vm') { return ra; }
          if (rb.kind === 'vm') { return rb; }
          var ops = { add: function (a, b) { return a + b; }, sub: function (a, b) { return a - b; }, mul: function (a, b) { return a * b; } };
          var r5 = num2(ra, rb, ops[instr.op], ops[instr.op]);
          if (r5.kind === 'vm') { return r5; }
          pushS(r5); bumpIp();
          return null;
        }
        case 'div': {
          var rd = popS(); var rdd = popS();
          if (rdd.kind === 'vm') { return rdd; }
          if (rd.kind === 'vm') { return rd; }
          var r6 = div2(rdd, rd);
          if (r6.kind === 'vm') { return r6; }
          pushS(r6); bumpIp();
          return null;
        }
        case 'lt': case 'le': case 'gt': case 'ge': {
          var rb2 = popS(); var ra2 = popS();
          if (ra2.kind === 'vm') { return ra2; }
          if (rb2.kind === 'vm') { return rb2; }
          var cmps = { lt: function (a, b) { return a < b; }, le: function (a, b) { return a <= b; }, gt: function (a, b) { return a > b; }, ge: function (a, b) { return a >= b; } };
          var r7 = cmp2(ra2, rb2, cmps[instr.op]);
          if (r7.kind === 'vm') { return r7; }
          pushS(r7); bumpIp();
          return null;
        }
        case 'eq': case 'ne': {
          var rb3 = popS(); var ra3 = popS();
          if (ra3.kind === 'vm') { return ra3; }
          if (rb3.kind === 'vm') { return rb3; }
          var r8 = eq2(ra3, rb3);
          if (r8.kind === 'vm') { return r8; }
          var out = instr.op === 'ne' ? VmBool(!r8.v) : r8;
          pushS(out); bumpIp();
          return null;
        }
        case 'and': case 'or': {
          var rb4 = popS(); var ra4 = popS();
          if (ra4.kind === 'vm') { return ra4; }
          if (rb4.kind === 'vm') { return rb4; }
          if (ra4.k !== 'vm_bool' || rb4.k !== 'vm_bool') {
            return failVm('boolean operator on non-bool operands');
          }
          var v = instr.op === 'and' ? (ra4.v && rb4.v) : (ra4.v || rb4.v);
          pushS(VmBool(v)); bumpIp();
          return null;
        }
        case 'not': {
          var r9 = popS();
          if (r9.kind === 'vm') { return r9; }
          if (r9.k !== 'vm_bool') { return failVm('cannot apply ! to ' + vmShowValue(r9)); }
          pushS(VmBool(!r9.v)); bumpIp();
          return null;
        }
        case 'neg': {
          var r10 = popS();
          if (r10.kind === 'vm') { return r10; }
          if (r10.k === 'vm_int') { pushS(VmInt(-r10.v)); bumpIp(); return null; }
          if (r10.k === 'vm_float') { pushS(VmFloat(-r10.v)); bumpIp(); return null; }
          return failVm('cannot negate ' + vmShowValue(r10));
        }
        case 'jump':
          setIp(instr.target);
          return null;
        case 'jump_if_false': {
          var r11 = popS();
          if (r11.kind === 'vm') { return r11; }
          if (r11.k !== 'vm_bool') { return failVm('jump_if_false on non-bool ' + vmShowValue(r11)); }
          if (r11.v) { bumpIp(); } else { setIp(instr.target); }
          return null;
        }
        case 'call': {
          var rarg = popS();
          if (rarg.kind === 'vm') { return rarg; }
          var rfn = popS();
          if (rfn.kind === 'vm') { return rfn; }
          return call(f, rarg, rfn);
        }
        case 'make_closure': {
          var c2 = f.f.consts[instr.i];
          if (c2.c !== 'func') { return failVm('make_closure on non-function constant'); }
          pushS(VmClosure(c2.f, f.ctx)); bumpIp();
          return null;
        }
        case 'cons': case 'head': case 'tail': case 'is_nil': {
          var r12 = popS();
          if (r12.kind === 'vm') { return r12; }
          var name = { cons: 'cons', head: 'head', tail: 'tail', is_nil: 'isNil' }[instr.op];
          var r13 = applyBuiltin(name, r12);
          if (r13.kind === 'vm') { return r13; }
          pushS(r13); bumpIp();
          return null;
        }
        case 'make_list': {
          var rv = popN(instr.n);
          if (rv.kind === 'vm') { return rv; }
          pushS(VmList(rv.reverse())); bumpIp();
          return null;
        }
        default:
          return failVm('unknown instruction: ' + instr.op);
      }
    }

    // Execute one instruction (unless halted) and return a snapshot.
    function step() {
      if (halted) { return snapshot(); }
      if (frames.length === 0) { halted = true; result = failVm('frame stack exhausted'); return snapshot(); }
      var cf = frames[0];
      var code = cf.f.code;
      if (cf.ip >= code.length) { halted = true; result = failVm('program counter out of range'); return snapshot(); }
      var instr = code[cf.ip];
      if (instr.op === 'halt') {
        halted = true;
        if (stack.length === 0) { result = failVm('operand stack empty at halt'); }
        else { result = { ok: true, value: stack[stack.length - 1] }; }
        return snapshot();
      }
      if (instr.op === 'return') {
        frames.shift();
        return snapshot();
      }
      var err = execute(instr);
      if (err) { halted = true; result = err; }
      return snapshot();
    }

    // A read-only view of the machine for the debugger.
    function snapshot() {
      var f = frames[0];
      return {
        done: halted || frames.length === 0,
        result: result,
        ip: f ? f.ip : -1,
        fnName: f ? f.f.name : '',
        instr: f && f.ip < f.f.code.length ? f.f.code[f.ip] : null,
        stack: stack.slice(),
        stackDepth: stack.length,
        frameDepth: frames.length
      };
    }

    return { step: step, snapshot: snapshot };
  }

  // Run a compiled program to completion. Returns { ok: true, value } or a
  // vm error. When trace is true, every executed instruction is logged.
  function runVm(program, trace, traceFn) {
    var log = traceFn || function (line) { if (typeof console !== 'undefined') { console.log(line); } };
    var m = makeVm(program);
    for (var guard = 0; guard < 1000000000; guard++) {
      var s = m.snapshot();
      if (s.done) {
        if (s.result === null) { return HErr('vm', POS_EOF, 'frame stack exhausted'); }
        return s.result;
      }
      if (trace && s.instr) {
        log(s.ip + ': ' + showInstr(s.instr) + '  stack=[' + s.stack.map(vmShowValue).join(', ') + ']');
      }
      m.step();
    }
    return HErr('vm', POS_EOF, 'execution exceeded the instruction guard');
  }

  // A single-steppable machine for the web playground's step debugger.
  function makeStepper(program) {
    return makeVm(program);
  }

  // =====================================================================
  // Corpus (mirrors Halcyon.Corpus): the canonical differential programs
  // shared with the Haskell core and the cross-language check.
  // =====================================================================

  var corpus = [
    { name: 'fib', expected: '75025',
      source: '-- Fibonacci, the canonical recursive program.\nlet rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2)\nin fib 25\n' },
    { name: 'fact', expected: '3628800',
      source: '-- Factorial via a single let rec.\nlet rec fact = fn n => if n < 1 then 1 else n * fact (n - 1)\nin fact 10\n' },
    { name: 'map', expected: '[2, 4, 6, 8, 10]',
      source: '-- A hand-rolled map over a list literal.\nlet rec map = fn f xs => if isNil xs then [] else cons (f (head xs)) (map f (tail xs))\nin map (fn x => x * 2) [1, 2, 3, 4, 5]\n' },
    { name: 'filter', expected: '[3, 4, 5]',
      source: '-- A hand-rolled filter: keep elements greater than 2.\nlet rec keep = fn xs => if isNil xs then []\n  else if head xs > 2 then cons (head xs) (keep (tail xs))\n  else keep (tail xs)\nin keep [1, 2, 3, 4, 5]\n' },
    { name: 'closure-counter', expected: '15',
      source: '-- Closures: makeCounter captures its argument in the returned fn.\nlet makeCounter = fn n => fn step => n + step\nin let inc = makeCounter 10 in inc 5\n' },
    { name: 'compose', expected: '43',
      source: '-- Function composition built from nested closures.\nlet compose = fn f g => fn x => f (g x)\nin compose (fn x => x + 1) (fn x => x * 2) 21\n' },
    { name: 'partial-application', expected: '42',
      source: '-- Curried lambdas apply one argument at a time.\nlet add = fn a b => a + b\nin let inc = add 1 in inc 41\n' },
    { name: 'numeric-promotion', expected: '6.0',
      source: '-- Int + Float promotes to Float; the multiplication promotes too.\n1 + 2.5 * 2\n' },
    { name: 'function-promotion', expected: '6.0',
      source: '-- A function parameter is shared: scale 4 becomes 4 * 1.5 = Float.\nlet scale = fn x => x * 1.5 in scale 4\n' },
    { name: 'list-surgery', expected: '[2, 3, 4]',
      source: '-- cons/head/tail over a list literal.\nlet xs = [1, 2, 3, 4] in cons (head (tail xs)) (tail (tail xs))\n' },
    { name: 'lists-of-lists', expected: '[[1], [2]]',
      source: '-- Nested lists, built via partially applied cons.\ncons (cons 1 []) (cons (cons 2 []) [])\n' },
    { name: 'string-conditional', expected: 'calm',
      source: '-- String equality in a conditional.\nif "halcyon" == "halcyon" then "calm" else "storm"\n' },
    { name: 'tail-recursive-sum', expected: '5000050000',
      source: '-- Tail recursion with an accumulator; 100000 frames deep on both evaluators.\nlet rec sumTo = fn acc n => if n < 1 then acc else sumTo (acc + n) (n - 1)\nin sumTo 0 100000\n' },
    { name: 'mixed-arithmetic', expected: '17',
      source: '-- Operator precedence and grouping.\n1 + 2 * 3 - 4 / 2 + (10 - 4) * 2\n' },
    { name: 'deep-recursion', expected: '5000',
      source: '-- Deep non-tail recursion; 5000 frames deep exercises the frame stack.\nlet rec count = fn n => if n < 1 then 0 else 1 + count (n - 1)\nin count 5000\n' },
    { name: 'list-length', expected: '3',
      source: '-- The length builtin over a list literal.\nlet xs = [10, 20, 30] in length xs\n' },
    { name: 'list-reverse', expected: '[3, 2, 1]',
      source: '-- reverse flips a list.\nreverse [1, 2, 3]\n' },
    { name: 'list-append-take-drop', expected: '[1, 3]',
      source: '-- append, take, and drop combine into list surgery.\ntake 2 (append [1] (drop 1 [2, 3, 4]))\n' }
  ];

  // Example programs shown in the web playground editor.
  var examples = {
    'fib.hly': corpus[0].source,
    'map.hly': corpus[2].source,
    'filter.hly': corpus[3].source,
    'closures.hly': '-- Closures and function composition.\nlet makeCounter = fn n => fn step => n + step\nin let compose = fn f g => fn x => f (g x)\nin compose (fn x => x + 1) (fn x => x * 2) 21\n',
    'promotion.hly': corpus[7].source,
    'recursion.hly': corpus[12].source,
    'list-length.hly': corpus[15].source,
    'list-reverse.hly': corpus[16].source,
    'list-append-take-drop.hly': corpus[17].source
  };

  return {
    version: '0.1.0',
    lex: lexSource,
    parse: parseProgram,
    infer: inferProgram,
    inferExpr: inferExpr,
    showType: showType,
    evalProgram: evalProgram,
    compileProgram: compileProgram,
    runVm: runVm,
    makeStepper: makeStepper,
    showValue: showValue,
    vmShowValue: vmShowValue,
    showInstr: showInstr,
    disassemble: disassemble,
    corpus: corpus,
    examples: examples
  };
}));