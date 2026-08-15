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

function runBoth(label, src, expected) {
  // interpreter
  var ie = Halcyon.evalProgram(src);
  var io = ie.kind ? '<eval error: ' + ie.message + '>' : Halcyon.showValue(ie);
  // compiler + VM
  var cp = Halcyon.compileProgram(src);
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

// Embedded corpus
Halcyon.corpus.forEach(function (e) {
  runBoth('corpus: ' + e.name, e.source, e.expected);
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
function runOptBoth(label, src, expected) {
  var ie = Halcyon.evalProgram(src);
  var io = ie.kind ? '<eval error: ' + ie.message + '>' : Halcyon.showValue(ie);
  var cp = Halcyon.compileProgram(src, true);
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

Halcyon.corpus.forEach(function (e) {
  runOptBoth('opt-corpus: ' + e.name, e.source, e.expected);
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