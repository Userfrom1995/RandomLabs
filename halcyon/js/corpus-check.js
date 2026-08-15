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