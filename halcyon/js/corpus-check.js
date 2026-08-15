#!/usr/bin/env node
// Cross-language corpus check (milestone 9): the JavaScript mirror must
// produce byte-identical output to the recorded expected values on every
// corpus program, on BOTH its interpreter and its VM. Also verifies the
// disassembler output for one program.
//
//   node js/corpus-check.js
//   node js/corpus-check.js ../examples     (also check the examples/ dir)
//
// Exit code 0 on full agreement, 1 otherwise.
'use strict';
var fs = require('fs');
var path = require('path');
var Halcyon = require('./halcyon.js');

var failures = 0;
var total = 0;

function report(label, ok, detail) {
  total++;
  if (!ok) { failures++; }
  var mark = ok ? 'ok  ' : 'FAIL';
  console.log(mark + ' ' + label + (detail ? ' - ' + detail : ''));
}

// The CLI-visible output: effect output plus the rendered final value
// (nothing when it is the unit value), on both evaluators.
function cliOutput(eff, show) {
  if (eff === undefined || eff === null) { return '<no result>'; }
  var v = eff.value;
  var unitK = v && (v.k === 'unit' || v.k === 'vm_unit');
  return eff.out + (unitK ? '' : show(v));
}

function runBoth(label, src, expected, inputs) {
  var ins = inputs || [];
  // interpreter
  var ie = Halcyon.evalProgramEffect(ins, src);
  var io = ie && ie.kind ? '<eval error: ' + ie.message + '>' : cliOutput(ie, Halcyon.showValue);
  // compiler + VM
  var cp = Halcyon.compileProgram(src);
  var vo, vmRes;
  if (cp.kind) {
    vo = '<compile error: ' + cp.message + '>';
  } else {
    vmRes = Halcyon.runVmEffect(cp.program, ins);
    vo = vmRes && vmRes.kind ? '<vm error: ' + vmRes.message + '>' : cliOutput(vmRes, Halcyon.vmShowValue);
  }
  if (expected !== null && expected !== undefined && (io !== expected || vo !== expected)) {
    report(label, false, 'expected ' + expected + ', interpreter=' + io + ', vm=' + vo);
    return;
  }
  if (io !== vo) {
    report(label, false, 'interpreter=' + io + ' /= vm=' + vo);
    return;
  }
  report(label, true, io);
}

// Embedded corpus
Halcyon.corpus.forEach(function (e) {
  runBoth('corpus: ' + e.name, e.source, e.expected, e.inputs);
});

// The fibonacci program should typecheck as Int.
var fibSrc = 'let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 10';
var inf = Halcyon.infer(fibSrc);
report('type: fib is Int', inf.ok && Halcyon.showType(inf.type) === 'Int', inf.ok ? Halcyon.showType(inf.type) : inf.message);
report('type: map is polymorphic', Halcyon.infer(Halcyon.examples['map.hly']).ok, '');

// Disassembly determinism: recompile the same program twice, identical text.
var p1 = Halcyon.compileProgram('1 + 2.5 * 2');
var p2 = Halcyon.compileProgram('1 + 2.5 * 2');
report('disassemble: deterministic',
  Halcyon.disassemble(p1.program.entry) === Halcyon.disassemble(p2.program.entry),
  '');

// ---- data declarations, match, and tail calls (milestone 16) --------------

// ---- optimizer (milestone 16) ---------------------------------------------

// Every corpus program must also run byte-identically on the optimized VM.
function runOptBoth(label, src, expected, inputs) {
  var ins = inputs || [];
  var ie = Halcyon.evalProgramEffect(ins, src);
  var io = ie && ie.kind ? '<eval error: ' + ie.message + '>' : cliOutput(ie, Halcyon.showValue);
  var cp = Halcyon.compileProgram(src, true);
  var vo, vmRes;
  if (cp.kind) {
    vo = '<compile error: ' + cp.message + '>';
  } else {
    vmRes = Halcyon.runVmEffect(cp.program, ins);
    vo = vmRes && vmRes.kind ? '<vm error: ' + vmRes.message + '>' : cliOutput(vmRes, Halcyon.vmShowValue);
  }
  if (expected !== null && expected !== undefined && (io !== expected || vo !== expected)) {
    report(label, false, 'expected ' + expected + ', interpreter=' + io + ', vm=' + vo);
    return;
  }
  if (io !== vo) {
    report(label, false, 'interpreter=' + io + ' /= vm=' + vo);
    return;
  }
  report(label, true, io);
}

Halcyon.corpus.forEach(function (e) {
  runOptBoth('opt-corpus: ' + e.name, e.source, e.expected, e.inputs);
});

// Optimized disassembly is deterministic and differs from unoptimized only
// where folding/stores were removed.
var op1 = Halcyon.compileProgram('1 + 2.5 * 2', true);
var op2 = Halcyon.compileProgram('1 + 2.5 * 2', true);
report('opt: disassemble deterministic',
  Halcyon.disassemble(op1.program.entry) === Halcyon.disassemble(op2.program.entry), '');

// Constant folding removes instructions without changing the result.
var foldSrc = 'let x = 4 in (x + 2 * 3) * 2';
var foldPlain = Halcyon.compileProgram(foldSrc, false);
var foldOpt = Halcyon.compileProgram(foldSrc, true);
var foldPlainN = Halcyon.disassemble(foldPlain.program.entry).split('\n').length;
var foldOptN = Halcyon.disassemble(foldOpt.program.entry).split('\n').length;
var foldPlainR = Halcyon.runVm(foldPlain.program, false);
var foldOptR = Halcyon.runVm(foldOpt.program, false);
report('opt: constant folding shrinks code',
  foldOptN < foldPlainN && foldPlainR.ok && foldOptR.ok && foldPlainR.value.v === foldOptR.value.v,
  foldPlainN + ' -> ' + foldOptN + ' instructions');

// Division by zero is never folded, so the runtime error survives.
var dzSrc = 'let x = 5 in x + (1 / 0)';
var dzOpt = Halcyon.compileProgram(dzSrc, true);
var dzR = dzOpt.kind ? { kind: 'compile' } : Halcyon.runVm(dzOpt.program, false);
report('opt: division by zero survives', !!dzR.kind, dzR.kind ? dzR.message : dzR);

// ---- data declarations, match, and tail calls (milestone 16) --------------

var dataProgs = [
  ['data: nullary constructor value',
    'data Bool = True | False\nTrue\n', 'True'],
  ['match: constructor branches',
    'data Maybe a = Nothing | Just a\nmatch Just 42 with | Nothing => 0 | Just x => x\n', '42'],
  ['match: list cons pattern',
    'match [1,2,3] with | [] => 0 | x :: xs => x\n', '1'],
  ['match: nested list pattern',
    'match [[1,2],[3]] with | [a,b] :: _ => a + b | y :: ys => -1\n', '3'],
  ['match: two-element list pattern',
    'match [1,2] with | a :: b :: [] => a + b\n', '3'],
  ['match: list literal pattern',
    'match [1,2,3] with | [a,b] => 0 | [a,b,c] => a + b + c\n', '6'],
  ['match: integer literal pattern',
    'match 5 with | 0 => 0 | 5 => 1 | n => n\n', '1'],
  ['match: float literal pattern',
    'match 2.5 with | 2.5 => 1 | _ => 0\n', '1'],
  ['match: bool literal pattern',
    'match true with | true => 1 | false => 0\n', '1'],
  ['match: string literal pattern',
    'match "a" with | "a" => 1 | _ => 0\n', '1'],
  ['match: variable pattern',
    'match 99 with | n => n + 1\n', '100'],
  ['match: wildcard pattern',
    'match 99 with | _ => 0\n', '0'],
  ['match: three constructor alternatives',
    'data Shape = Circle | Rect | Tri\nmatch Rect with | Circle => 0 | Rect => 1 | Tri => 2\n', '1'],
  ['match: multi-field constructor',
    'data T3 = T3 Int Int Int\nmatch T3 1 2 3 with | T3 a b c => a * 100 + b * 10 + c\n', '123'],
  ['match: constructor swap fields',
    'data Pair a b = P a b\nmatch P 3 4 with | P x y => P y x\n', 'P 4 3'],
  ['match: scrutinee is expression',
    'match (if 1 > 0 then [1,2] else []) with | [] => 0 | x :: xs => x\n', '1'],
  ['data: constructor as function value',
    'data Maybe a = Nothing | Just a\nlet f = Just in match f 7 with | Nothing => 0 | Just x => x\n', '7'],
  ['data: partial constructor application',
    'data Pair a b = P a b\nlet mk = P 1 in match mk 2 with | P x y => x + y\n', '3'],
  ['match: higher-order recursion on data',
    'data Maybe a = Nothing | Just a\nlet rec len = fn xs => match xs with | [] => 0 | _ :: t => 1 + len t\nin len [Just 1, Nothing, Just 2]\n', '3']
];
dataProgs.forEach(function (t) { runBoth(t[0], t[1], t[2]); });

// A non-exhaustive match must fail in both the interpreter and the VM.
var noMatchSrc = 'match [] with | x :: xs => x\n';
var nme = Halcyon.evalProgram(noMatchSrc);
var nmc = Halcyon.compileProgram(noMatchSrc);
var nmv = nmc.kind ? { kind: 'compile' } : Halcyon.runVm(nmc.program, false);
report('match: non-exhaustive fails both',
  !!nme.kind && !!nmv.kind,
  'interpreter=' + (nme.kind ? nme.message : nme) + ', vm=' + (nmv.kind ? nmv.message : nmv));

// Tail-call optimization: deep recursion must not exhaust the frame stack.
var tcoSrc = 'let rec sumTo = fn n acc => if n == 0 then acc else sumTo (n - 1) (acc + n)\nin sumTo 1000000 0\n';
runBoth('tail call: deep recursion', tcoSrc, '500000500000');

// TCO with constructor building in the tail position.
runBoth('tail call: constructor accumulator',
  'data L a = Nil | Cons a (L a)\nlet rec build = fn n acc => if n == 0 then acc else build (n - 1) (Cons n acc)\nin match build 100000 Nil with | Nil => 0 | Cons h t => h\n',
  '1');

// Tail call frame-depth check: constant bounded frame stack.
var tcoSrc2 = 'let rec sumTo = fn n acc => if n == 0 then acc else sumTo (n - 1) (acc + n)\nin sumTo 200000 0\n';
var tcp = Halcyon.compileProgram(tcoSrc2);
if (tcp.kind) {
  report('tail call: bounded frame depth', false, 'compile error: ' + tcp.message);
} else {
  var stepper = Halcyon.makeStepper(tcp.program);
  var peak = 0, steps = 0, s;
  do {
    s = stepper.step();
    if (s.frameDepth > peak) { peak = s.frameDepth; }
    steps++;
  } while (!s.done && steps < 6000000);
  report('tail call: bounded frame depth', steps < 6000000 && s.done && peak <= 4, 'peak frame depth ' + peak);
}

// Typechecking with data declarations.
report('type: data polymorphic',
  Halcyon.infer('data Maybe a = Nothing | Just a\nlet id = fn x => x in id (Just true)\n').ok, '');
var tm = Halcyon.infer('data Maybe a = Nothing | Just a\nmatch Just 42 with | Nothing => 0 | Just x => x\n');
report('type: match result Int', tm.ok && Halcyon.showType(tm.type) === 'Int', tm.ok ? Halcyon.showType(tm.type) : tm.message);
report('type: duplicate data type rejected',
  !Halcyon.infer('data Maybe a = Nothing | Just a\ndata Maybe b = A | B\n1\n').ok, '');
report('type: duplicate constructor rejected',
  !Halcyon.infer('data A = X\ndata B = X\n1\n').ok, '');
report('type: match type error rejected',
  !Halcyon.infer('data Maybe a = Nothing | Just a\nmatch Just true with | Nothing => 0 | Just x => x + 1\n').ok, '');

// Bare constructor after data declaration.
runBoth('data: bare nullary constructor', 'data Maybe a = Nothing | Just a\nNothing\n', 'Nothing');

// ---- module system (milestone 17) -----------------------------------------

// Import-based programs resolve through the bundled library and agree on
// both evaluators.
function runResolved(label, src, expected) {
  var rr = Halcyon.resolveWithBundled(src);
  if (rr.kind === 'module' || rr.kind === 'parse') {
    report(label, false, 'resolve error: ' + rr.message);
    return;
  }
  var ie = Halcyon.evalResolved(rr);
  var io = ie.kind ? '<eval error: ' + ie.message + '>' : Halcyon.showValue(ie);
  var cp = Halcyon.compileResolved(rr);
  var vo, vmRes;
  if (cp.kind) {
    vo = '<compile error: ' + cp.message + '>';
  } else {
    vmRes = Halcyon.runVm(cp.program, false);
    vo = vmRes.kind ? '<vm error: ' + vmRes.message + '>' : Halcyon.vmShowValue(vmRes.value);
  }
  if (expected !== null && expected !== undefined && (io !== expected || vo !== expected)) {
    report(label, false, 'expected ' + expected + ', interpreter=' + io + ', vm=' + vo);
    return;
  }
  if (io !== vo) {
    report(label, false, 'interpreter=' + io + ' /= vm=' + vo);
    return;
  }
  report(label, true, io);
}

runResolved('module: import list.hly',
  'import "../lib/list.hly"\nsum (map (fn x => x * x) (range 1 8))\n', '204');
runResolved('module: transitive import (list imports pair)',
  'import "../lib/list.hly"\nmatch head (zip [1, 2, 3] [10, 20, 30]) with | Pair a b => a + b\n', '11');
runResolved('module: import maybe + compose',
  'import "../lib/maybe.hly"\nimport "../lib/compose.hly"\ncompose (fromMaybe 0) id (Just 7)\n', '7');
runResolved('module: duplicate import is deduplicated',
  'import "../lib/list.hly"\nimport "../lib/list.hly"\nmyLength [1, 2, 3]\n', '3');

// A genuine cycle must error (via an in-memory provider).
var cyc = Halcyon.memProvider({
  'c1.hly': 'import "c2.hly"\nlet a = 1\n',
  'c2.hly': 'import "c1.hly"\nlet b = 2\n'
});
var circ = Halcyon.resolveProgram(cyc, '', 'import "c1.hly"\na\n');
report('module: circular import rejected',
  circ.kind === 'module' && /circular import/.test(circ.message), circ.message);

// In-memory provider: the canonical key is the import path, and child
// modules resolve relative to their own directory.
var mem = Halcyon.memProvider({
  'm1.hly': 'import "m2.hly"\nlet a = b * 2\n',
  'm2.hly': 'let b = 21\n'
});
var resolvedMem = Halcyon.resolveProgram(mem, '', 'import "m1.hly"\na\n');
report('module: memProvider relative resolution',
  resolvedMem.kind !== 'module' && resolvedMem.kind !== 'parse'
    && Halcyon.showValue(Halcyon.evalResolved(resolvedMem)) === '42',
  resolvedMem.kind ? resolvedMem.message : '');
var missing = Halcyon.resolveWithBundled('import "nope.hly"\n1\n');
report('module: missing module rejected', missing.kind === 'module' && /not found/.test(missing.message), missing.message);
var dupDef = Halcyon.resolveWithBundled('import "../lib/list.hly"\nlet sum = 5\nsum\n');
report('module: duplicate top-level definition rejected',
  dupDef.kind === 'module' && /duplicate top-level definition/.test(dupDef.message), dupDef.message);

// Top-level definitions typecheck and evaluate on both evaluators.
runBoth('topdefs', Halcyon.corpus[29].source, '5021');
runBoth('topdefs-order', Halcyon.corpus[30].source, '50');
runResolved('module: import-based stdlib example', Halcyon.examples['stdlib.hly'], '1601');
runResolved('module: string.hly chars/fromChars',
  'import "string.hly"\nfromChars (chars "hi")\n', 'hi');
runResolved('module: string.hly defs compose',
  'import "string.hly"\nlet cs = chars "aab" in length cs * 10 + (if fromChars cs == "aab" then 1 else 0)\n', '31');
runResolved('module: string.hly toUpper',
  'import "string.hly"\ntoUpperStr "hello"\n', 'HELLO');
runResolved('module: string.hly countChar and repeat',
  'import "string.hly"\ncountChar \'a\' "banana" * 10 + (if repeat 2 "ab" == "abab" then 1 else 0)\n', '31');
report('type: top-level polymorphic def',
  Halcyon.infer('let id = fn x => x\nlet x = id 5\nlet rec count = fn n => if n < 1 then 0 else 1 + count (n - 1)\nx * 1000 + count 21\n').ok, '');
report('type: duplicate top-level let rejected',
  !Halcyon.infer('let x = 5\nlet x = 6\nx\n').ok, '');

// ---- records, type classes, chars, and string builtins (milestone 21) ----

var v3Progs = [
  ['rec: literal and projection',
    'record Point = { x : Int, y : Int }\nlet p = { x = 1, y = 2 } in p.x + p.y', '3'],
  ['rec: update',
    'record Point = { x : Int, y : Int }\nlet p = { x = 1, y = 2 } in { p with y = 9 }.y', '9'],
  ['rec: update keeps type',
    'record Point = { x : Int, y : Int }\nlet p = { x = 1, y = 2 } in { p with x = 5 }', '{ x = 5, y = 2 }'],
  ['rec: order-independent projection',
    'record P = { x : Int, y : Int }\n{ y = 1, x = 2 }.y', '1'],
  ['rec: polymorphic',
    'record Pair a b = { fst : a, snd : b }\nlet p1 = { fst = 1, snd = 2 } in let p2 = { fst = true, snd = 1.5 } in p2.fst', 'true'],
  ['rec: pattern',
    'record Point = { x : Int, y : Int }\nmatch { x = 1, y = 2 } with | { x = a, y = b } => a * 10 + b', '12'],
  ['rec: pattern order-independent',
    'record Point = { x : Int, y : Int }\nmatch { x = 1, y = 2 } with | { y = b, x = a } => a * 10 + b', '12'],
  ['rec: nested',
    'record Inner = { v : Int }\nrecord Outer = { inner : Inner, tag : Int }\n{ tag = 1, inner = { v = 2 } }.inner.v', '2'],
  ['class: basic instance',
    'class Size a where\n  size : a -> Int\ninstance Size Int where\n  size = fn x => 1\ninstance Size [a] where\n  size = fn xs => length xs\nsize [1, 2, 3]', '3'],
  ['class: method via local',
    'class Size a where\n  size : a -> Int\ninstance Size Int where\n  size = fn x => 1\ninstance Size [a] where\n  size = fn xs => length xs\nlet f = fn xs => size xs in f [1, 2]', '2'],
  ['class: instance with context',
    'data Pair a = MkPair a a\nlet fst = fn p => match p with | MkPair x y => x\nclass Size a where\n  size : a -> Int\ninstance Size Int where\n  size = fn x => 1\ninstance Size [a] where\n  size = fn xs => length xs\ninstance Size a => Size (Pair a) where\n  size = fn p => size (fst p)\nsize (MkPair (MkPair 1 2) (MkPair 3 4))', '1'],
  ['class: curried method',
    'class Eq a where\n  eq : a -> a -> Bool\ninstance Eq Int where\n  eq = fn a b => a == b\nlet f = fn x y => eq x y in f 3 3', 'true'],
  ['class: method tail position',
    'class Eq a where\n  eq : a -> a -> Bool\ninstance Eq Int where\n  eq = fn a b => a == b\nlet rec loop = fn n => if n < 1 then eq n 0 else loop (n - 1) in loop 5000', 'true'],
  ['builtin Show: int',
    'show 7', '7'],
  ['builtin Show: float',
    'show 2.5', '2.5'],
  ['builtin Show: bool',
    'show true', 'true'],
  ['builtin Show: string',
    'show "hi"', 'hi'],
  ['builtin Show: char',
    "show 'a'", "'a'"],
  ['builtin Show: list',
    'show [1, 2, 3]', '[1, 2, 3]'],
  ['builtin Show: nested list',
    'show [[1, 2], [3]]', '[[1, 2], [3]]'],
  ['char: literal',
    "'a'", "'a'"],
  ['char: match pattern',
    "match 'x' with | 'x' => 1 | _ => 0", '1'],
  ['char: equality',
    "'a' == 'a'", 'true'],
  ['string: intToStr',
    'intToStr 42', '42'],
  ['string: strLen',
    'strLen "hello"', '5'],
  ['string: charAt',
    'charAt "hello" 1', "'e'"],
  ['string: substr',
    'substr "hello" 1 3', 'ell'],
  ['string: strAppend',
    'strAppend "foo" "bar"', 'foobar'],
  ['string: strContains',
    'strContains "hello" "ell"', 'true'],
  ['string: concat operator',
    '"a" + "b"', 'ab']
];
v3Progs.forEach(function (t) { runBoth(t[0], t[1], t[2]); });
v3Progs.forEach(function (t) { runOptBoth('opt-' + t[0], t[1], t[2]); });

// Class overlap and missing-instance errors must be rejected at typecheck.
report('class: overlapping instance heads rejected',
  !Halcyon.infer('class C a where\n  m : a -> Int\ninstance C Int where\n  m = fn x => 1\ninstance C Int where\n  m = fn x => 2\nm 1\n').ok, '');
report('class: missing instance rejected',
  !Halcyon.infer('class C a where\n  m : a -> Int\ninstance C Int where\n  m = fn x => 1\nm true\n').ok, '');
report('class: duplicate class name rejected',
  !Halcyon.infer('class Show a where\n  show : a -> String\n1\n').ok, '');
report('class: duplicate method rejected',
  !Halcyon.infer('class C a where\n  m : a -> Int\n  m : a -> Int\n1\n').ok, '');
report('type: char is Char', Halcyon.infer("'c'").ok
  && Halcyon.showType(Halcyon.infer("'c'").type) === 'Char', '');

// ---- profiler (milestone 21) -------------------------------------------------

// Profiling is pure bookkeeping: the value is identical to a plain run, the
// report is deterministic, and the one-line summary matches its prefix.
var profSrc = 'let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 10';
var profCp = Halcyon.compileProgram(profSrc);
var profRun = Halcyon.runVm(profCp.program, false);
var profR = Halcyon.runVmProfiled(profCp.program);
report('profiler: value identical to plain run',
  profRun.ok && !profR.kind && Halcyon.vmShowValue(profRun.value) === Halcyon.vmShowValue(profR.value),
  profRun.ok ? Halcyon.vmShowValue(profRun.value) : profRun.message);
report('profiler: report is deterministic',
  profR.ok && Halcyon.renderProfile(Halcyon.runVmProfiled(profCp.program).profile)
    === Halcyon.renderProfile(profR.profile), '');
report('profiler: report has counts',
  profR.ok && profR.profile.total > 0
    && profR.profile.opCounts.length > 0
    && profR.profile.callCounts.length > 0, '');
report('profiler: stats line summary',
  profR.ok && Halcyon.statsLine(profR.profile)
    === 'profile: ' + profR.profile.total + ' instructions, peak stack '
      + profR.profile.peakStack + ', peak frames ' + profR.profile.peakFrames, '');

// Examples directory (optional argument)
var dir = process.argv[2];
if (dir) {
  var names = fs.readdirSync(dir).filter(function (n) { return n.slice(-4) === '.hly'; }).sort();
  names.forEach(function (n) {
    var src = fs.readFileSync(path.join(dir, n), 'utf8');
    var expected = null;
    for (var i = 0; i < Halcyon.corpus.length; i++) {
      if (Halcyon.corpus[i].name === n.slice(0, -4)) { expected = Halcyon.corpus[i].expected; }
    }
    runBoth('example: ' + n, src, expected);
  });
}

console.log('');
console.log(total + ' checks, ' + failures + ' failures');
process.exit(failures === 0 ? 0 : 1);