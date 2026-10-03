/// Phase 1 suites: parser round-trip, coercion cells, error-precedence pairs,
/// dependency-graph invariants, evaluator identities, and the serial clock.
/// Binding test matrix seed (research section 12); the 300+ oracle table and
/// property suites land with Phases 2-3.
import Testing

@testable import TabulaCore

private let host = Addr(sheet: 0, col: 0, row: 0)

private func parse(_ s: String, host: Addr = host) -> Expr {
    switch FormulaParser.parse(s, host: host) {
    case .success(let e): return e
    case .failure(let err): fatalError("parse failed for \(s): \(err)")
    }
}

private func mustFail(_ s: String) -> ParseError {
    switch FormulaParser.parse(s, host: host) {
    case .success(let e): fatalError("expected failure for \(s), got \(e)")
    case .failure(let err): return err
    }
}

private func ev(
    _ expr: Expr,
    host: Addr = host,
    values: [Addr: Value] = [:],
    todaySerial: Int = 0
) -> Value {
    Evaluator.eval(
        expr, host: host,
        lookup: { values[$0] ?? .blank },
        todaySerial: todaySerial
    )
}

private func evFormula(
    _ s: String,
    host: Addr = host,
    values: [Addr: Value] = [:],
    todaySerial: Int = 0
) -> Value {
    ev(parse(s, host: host), host: host, values: values, todaySerial: todaySerial)
}

@Suite("Parser precedence and shapes")
struct ParserShapeTests {
    @Test("tricky identities parse to the Excel tree")
    func trickyIdentities() {
        // -2^2 = -(2^2): unary binds looser than power.
        let neg = parse("=-2^2")
        #expect(neg == .unary(.neg, .binary(.pow, .num(2), .num(2))))
        // 2^3^2 is right-associative.
        let r = parse("=2^3^2")
        #expect(r == .binary(.pow, .num(2), .binary(.pow, .num(3), .num(2))))
        // 2^-3: factor-level right operand.
        #expect(parse("=2^-3") == .binary(.pow, .num(2), .unary(.neg, .num(3))))
        // Postfix % binds tightest below primary: -5% = -(5%).
        #expect(parse("=-5%") == .unary(.neg, .percent(.num(5))))
    }

    @Test("comparisons and concat fold left")
    func folds() {
        #expect(
            parse("=1=1") == .binary(.eq, .num(1), .num(1))
        )
        #expect(
            parse("=1<>2") == .binary(.ne, .num(1), .num(2))
        )
        #expect(
            parse("=\"a\"&\"b\"&\"c\"")
                == .binary(.concat, .binary(.concat, .str("a"), .str("b")), .str("c"))
        )
    }

    @Test("refs, ranges, sheets, names, arrays, calls")
    func shapes() {
        #expect(parse("=A1") == .ref(CellRef(col: 0, row: 0, baseCol: 0, baseRow: 0)))
        #expect(parse("=$A$1") == .ref(CellRef(col: 0, row: 0, colAbs: true, rowAbs: true)))
        if case .range(let rr) = parse("=B2:A1") {
            #expect(rr.lo.col == 0 && rr.lo.row == 0)
            #expect(rr.hi.col == 1 && rr.hi.row == 1)
        } else {
            Issue.record("expected a range")
        }
        // Case-insensitive names and functions store uppercased.
        #expect(parse("=sum(a1)") == .call("SUM", [.ref(CellRef(col: 0, row: 0))]))
        #expect(parse("=myname+true") == .binary(.add, .name("MYNAME"), .bool(true)))
        if case .arrayConst(let rows) = parse("={1,2;3,4}") {
            #expect(rows.count == 2 && rows[0].count == 2)
        } else {
            Issue.record("expected an array constant")
        }
        // R1C1 relative form resolves against the host.
        let h = Addr(sheet: 0, col: 5, row: 5)
        if case .ref(let r) = parse("=R[1]C[-1]", host: h) {
            #expect(r.r1c1 && r.col == 4 && r.row == 6)
            #expect(r.resolve(host: h) == Addr(sheet: 0, col: 4, row: 6))
        } else {
            Issue.record("expected an R1C1 ref")
        }
    }

    @Test("malformed input fails with positions")
    func malformed() {
        let e1 = mustFail("1+1")
        #expect(e1.pos == 0)
        _ = mustFail("=")
        _ = mustFail("=1+")
        _ = mustFail("=(1")
        _ = mustFail("=1 2")
        _ = mustFail("=\"abc")
    }

    @Test("round-trip invariant on a corpus")
    func roundTrip() {
        let corpus = [
            "=1+2*3", "=-2^2", "=2^3^2", "=2^-3", "=(-3)^2", "=-5%",
            "=A1", "=$A$1", "=A$1", "=$A1", "=A1:B2", "=B2:A1",
            "=SUM(A1:A5,2)", "=IF(A1>0,\"y\",\"n\")", "=1&2=3",
            "=\"a\"\"b\"", "=TRUE", "=FALSE", "=MyName+1", "={1,2;3,4}",
            "=1+2-3*4/5^6", "=(((1)))", "=--5", "=10%",
            "=Sheet2!A1", "='Q1 Sales'!B2",
        ]
        for s in corpus {
            let once = parse(s)
            let printed = once.toFormulaString()
            switch FormulaParser.parse(printed, host: host) {
            case .failure(let err):
                Issue.record("reparse failed for \(s) -> \(printed): \(err)")
            case .success(let twice):
                #expect(twice == once, "round-trip drift: \(s) -> \(printed)")
            }
        }
    }
}

@Suite("Coercion cells (research 4.3)")
struct CoercionTests {
    @Test("arithmetic over the value domain")
    func arithCells() {
        #expect(evFormula("=1+TRUE") == .num(2))
        #expect(evFormula("=1+\" 3 \"") == .num(4))
        #expect(evFormula("=1+\"abc\"") == .err(.value))
        // The "" literal in arithmetic is #VALUE! (only a Blank ref is 0).
        #expect(evFormula("=1+\"\"") == .err(.value))
        // Blank *references* are 0 in arithmetic, "" in text.
        let blankRef = evFormula("=A9+1")
        #expect(blankRef == .num(1))
        #expect(evFormula("=A9&\"x\"") == .str("x"))
    }

    @Test("comparisons never coerce across types")
    func noCoerce() {
        // Number vs string: type order, no coercion.
        #expect(evFormula("=1=\"1\"") == .bool(false))
        #expect(evFormula("=1<>\"1\"") == .bool(true))
        // Blank is lowest; blank equals only blank.
        #expect(evFormula("=A9=0") == .bool(false))
        #expect(evFormula("=A9=A8") == .bool(true))
        #expect(evFormula("=A9<0") == .bool(true))
    }

    @Test("IF conditions use toBool")
    func ifCond() {
        #expect(evFormula("=IF(1,\"y\",\"n\")") == .str("y"))
        #expect(evFormula("=IF(0,\"y\",\"n\")") == .str("n"))
        #expect(evFormula("=IF(\"TRUE\",\"y\",\"n\")") == .str("y"))
        #expect(evFormula("=IF(\"yes\",\"y\",\"n\")") == .err(.value))
    }
}

@Suite("Error precedence pairs (research 4.4)")
struct ErrorPairTests {
    @Test("binary ops pick the higher-precedence error")
    func pairs() {
        let codes: [ErrorCode] = [.cycle, .ref, .div0, .name, .value, .na, .num]
        for a in codes {
            for b in codes {
                let v = ev(.binary(.add, .errLit(a), .errLit(b)))
                #expect(v == .err(ErrorCode.combine(a, b)), "\(a) vs \(b)")
            }
        }
        // Division by zero beats value errors but loses to refs and cycles.
        #expect(evFormula("=1/0") == .err(.div0))
    }

    @Test("IFERROR catches all, IFNA catches only N/A")
    func catchers() {
        #expect(evFormula("=IFERROR(1/0,99)") == .num(99))
        // Blank is not an error: IFERROR passes it through.
        #expect(evFormula("=IFERROR(A1,7)") == .blank)
        #expect(evFormula("=IFNA(1/0,99)") == .err(.div0))
    }

    @Test("IF is lazy, AND/OR short-circuit with prior-error-wins")
    func laziness() {
        #expect(evFormula("=IF(TRUE,1,1/0)") == .num(1))
        #expect(evFormula("=IF(FALSE,1/0,2)") == .num(2))
        #expect(evFormula("=AND(FALSE,1/0)") == .bool(false))
        #expect(evFormula("=AND(1/0,FALSE)") == .err(.div0))
        #expect(evFormula("=OR(TRUE,1/0)") == .bool(true))
        #expect(evFormula("=OR(1/0,TRUE)") == .err(.div0))
        #expect(evFormula("=AND()") == .bool(true))
        #expect(evFormula("=OR()") == .bool(false))
    }
}

@Suite("Evaluator identities (research 6)")
struct EvalIdentityTests {
    @Test("arithmetic and power domain rules")
    func arith() {
        #expect(evFormula("=-2^2") == .num(-4))
        #expect(evFormula("=2^3^2") == .num(512))
        #expect(evFormula("=0^-1") == .err(.div0))
        #expect(evFormula("=(-8)^0.5") == .err(.num))
        #expect(evFormula("=1/0") == .err(.div0))
        #expect(evFormula("=5%") == .num(0.05))
        #expect(evFormula("=\"a\"&1&TRUE") == .str("a1TRUE"))
    }

    @Test("refs, ranges, names")
    func refs() {
        let h = Addr(sheet: 0, col: 1, row: 1)
        let vals: [Addr: Value] = [
            Addr(sheet: 0, col: 0, row: 0): .num(10),
            Addr(sheet: 0, col: 1, row: 0): .num(20),
        ]
        // Relative refs resolve against the host the same expression was
        // parsed at: from B2, "A1" means one left and one up, which is A1.
        #expect(evFormula("=A1", host: h, values: vals) == .num(10))
        // An untouched cell reads Blank.
        #expect(evFormula("=C9", host: h, values: vals) == .blank)
        // Absolute refs stay put.
        #expect(evFormula("=$A$1", host: h, values: vals) == .num(10))
        // Bare range in scalar position reads the top-left cell.
        #expect(evFormula("=A1:B1", host: h, values: vals) == .num(10))
        #expect(
            evFormula("=$A$1:$B$1", host: h, values: vals) == .num(10)
        )
        // Dangling and unknown names.
        #expect(evFormula("=Nope123_X") == .err(.name))
    }

    @Test("TODAY is injectable, predicates never propagate")
    func clockAndPreds() {
        #expect(evFormula("=TODAY()", todaySerial: 46000) == .num(46000))
        #expect(evFormula("=ISBLANK(A9)") == .bool(true))
        #expect(evFormula("=ISNUMBER(1/0)") == .bool(false))
        #expect(evFormula("=ISERROR(1/0)") == .bool(true))
        #expect(evFormula("=ISNA(1/0)") == .bool(false))
        #expect(evFormula("=NOT(1/0)") == .err(.div0))
    }
}

@Suite("Graph invariants (research 5)")
struct GraphInvariantTests {
    @Test("chain, fan-out, dirty closure, Kahn validity")
    func chainAndFan() {
        let a1 = Addr(sheet: 0, col: 0, row: 0)
        let a2 = Addr(sheet: 0, col: 0, row: 1)
        let a3 = Addr(sheet: 0, col: 0, row: 2)
        let g = DepGraph(formulas: [
            a2: parse("=A1+1", host: a2),
            a3: parse("=A2+1", host: a3),
        ])
        #expect(g.precedents[a2] == [a1])
        let dirty = g.dirtyClosure(edits: [a1])
        #expect(dirty == [a1, a2, a3])
        let (order, residue) = g.kahnOrder(dirty: dirty)
        #expect(residue.isEmpty)
        #expect(order == [a2, a3])
        // Clean cells stay out of a minimal closure.
        #expect(g.dirtyClosure(edits: [a3]) == [a3])
    }

    @Test("cycles: self, two-cycle, range self-inclusion, dependent taint")
    func cycles() {
        let a1 = Addr(sheet: 0, col: 0, row: 0)
        let a2 = Addr(sheet: 0, col: 0, row: 1)
        let a3 = Addr(sheet: 0, col: 0, row: 2)
        let b1 = Addr(sheet: 0, col: 1, row: 0)
        let selfRef = DepGraph(formulas: [a1: parse("=A1+1", host: a1)])
        let (t0, p0) = selfRef.detectCycles()
        #expect(t0 == [a1] && !p0.isEmpty)

        let two = DepGraph(formulas: [
            a1: parse("=A2", host: a1),
            a2: parse("=A1", host: a2),
            a3: parse("=A2*2", host: a3),
        ])
        let (t1, p1) = two.detectCycles()
        #expect(t1 == [a1, a2, a3])
        #expect(!p1.isEmpty)

        // Range self-inclusion is a cycle; Kahn residue matches DFS taint.
        let rng = DepGraph(formulas: [
            a1: parse("=SUM(A1:A5)", host: a1),
            b1: parse("=A1+1", host: b1),
        ])
        let (t2, _) = rng.detectCycles()
        #expect(t2 == [a1, b1])
        let dirty = rng.dirtyClosure(edits: [a1])
        let (order, residue) = rng.kahnOrder(dirty: dirty)
        #expect(!order.contains(a1) && residue == t2.intersection(dirty))
    }

    @Test("volatile cells join every closure")
    func vol() {
        let v = Addr(sheet: 0, col: 0, row: 0)
        let d = Addr(sheet: 0, col: 0, row: 1)
        let far = Addr(sheet: 0, col: 5, row: 5)
        let g = DepGraph(formulas: [
            v: parse("=TODAY()", host: v),
            d: parse("=$A$1+1", host: d),
        ])
        #expect(g.volatile == [v])
        let dirty = g.dirtyClosure(edits: [far])
        #expect(dirty.contains(v) && dirty.contains(d))
    }
}

@Suite("Serial clock (research 7.5)")
struct ClockTests {
    @Test("Lotus-bug anchors and round-trips")
    func anchors() {
        #expect(dateToSerial(y: 1900, m: 1, d: 1) == 1)
        #expect(dateToSerial(y: 1900, m: 2, d: 28) == 59)
        #expect(dateToSerial(y: 1900, m: 2, d: 29) == 60)
        #expect(dateToSerial(y: 1900, m: 3, d: 1) == 61)
        #expect(dateToSerial(y: 1899, m: 12, d: 30) == 0)
        #expect(dateToSerial(y: -1, m: 1, d: 1) == nil)
        let ymd = serialToYMD(61)
        #expect(ymd.y == 1900 && ymd.m == 3 && ymd.d == 1)
        // Modern round-trip through the civil algorithms.
        for s in [0, 1, 59, 60, 61, 100, 25569, 45123, 2958465] {
            let c = serialToYMD(s)
            #expect(dateToSerial(y: c.y, m: c.m, d: c.d) == s, "serial \(s)")
        }
    }
}
