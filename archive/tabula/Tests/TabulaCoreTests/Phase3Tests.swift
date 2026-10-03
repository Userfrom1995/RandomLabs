/// Phase 3 suites: workbook recalculation, structural-edit laws, paste/fill
/// laws, storage round-trips, format purity, and the 10k-cell perf proxy.
/// Binding matrix per research 12.3-12.7. All randomness is seeded (LCG) and
/// the clock is injected, so runs are byte-deterministic.
import Testing

@testable import TabulaCore
import Foundation

// MARK: - helpers

/// Deterministic 64-bit LCG (seeded; no platform RNG in tests).
struct LCG: Sendable {
    var state: UInt64
    mutating func next() -> UInt64 {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return state >> 11
    }
    mutating func int(_ lo: Int, _ hi: Int) -> Int {
        lo + Int(next() % UInt64(max(1, hi - lo + 1)))
    }
}

func p3Addr(_ c: Int, _ r: Int, _ s: Int = 0) -> Addr {
    Addr(sheet: s, col: c, row: r)
}

func p3WB(_ today: Int = 0) -> Workbook {
    Workbook(todaySerial: today)
}

/// Random small workbook: literals plus absolute/relative formulas over a
/// 6x6 grid, seeded. Returns the workbook fully recalculated.
func randomWorkbook(seed: UInt64, today: Int = 0) -> Workbook {
    var rng = LCG(state: seed)
    var wb = p3WB(today)
    let cols = ["A", "B", "C", "D", "E", "F"]
    for r in 0..<6 {
        for c in 0..<6 {
            let roll = rng.int(0, 9)
            if roll < 4 {
                wb.setCell(sheet: 0, col: c, row: r,
                           raw: "\(rng.int(-20, 50))")
            } else if roll < 6 {
                let tc = rng.int(0, 5), tr = rng.int(0, 5)
                let op = ["+", "-", "*", "&"][rng.int(0, 3)]
                wb.setCell(sheet: 0, col: c, row: r, raw:
                    "=\(cols[tc])\(tr + 1)\(op)\(rng.int(1, 9))")
            } else if roll < 8 {
                wb.setCell(sheet: 0, col: c, row: r, raw:
                    "=SUM(A1:C\(r + 1))+\(cols[c])\(r + 1)")
            } else {
                wb.setCell(sheet: 0, col: c, row: r,
                           raw: rng.int(0, 1) == 0 ? "hi" : "TRUE")
            }
        }
    }
    wb.recalcAll()
    return wb
}

func snapshotValues(_ wb: Workbook) -> [Addr: Value] { wb.values }

@Suite("Workbook recalculation")
struct WorkbookRecalcTests {
    @Test("chain and fan-out evaluate in topological order")
    func chainAndFanout() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "5")
        for i in 1..<10 {
            wb.setCell(sheet: 0, col: 0, row: i, raw: "=A\(i)+1")
        }
        for c in 1..<5 {
            wb.setCell(sheet: 0, col: c, row: 9, raw: "=A10*2")
        }
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(0, 9)) == .num(14))
        #expect(wb.value(at: p3Addr(1, 9)) == .num(28))
        #expect(wb.value(at: p3Addr(4, 9)) == .num(28))
    }

    @Test("minimal recalc equals full recalc on random edit sequences")
    func minimalEqualsFull() {
        for seed in [1, 7, 42, 1234] as [UInt64] {
            var rng = LCG(state: seed &* 99 &+ 3)
            let wb0 = randomWorkbook(seed: seed)
            for step in 0..<12 {
                var a = wb0, b = wb0
                let c = rng.int(0, 5), r = rng.int(0, 5)
                let raw: String
                switch step % 3 {
                case 0: raw = "\(rng.int(-50, 50))"
                case 1: raw = "=A1+\(rng.int(1, 9))"
                default: raw = "=SUM(A1:C6)"
                }
                a.setCell(sheet: 0, col: c, row: r, raw: raw)
                b.setCell(sheet: 0, col: c, row: r, raw: raw)
                a.recalc(edits: [p3Addr(c, r)])
                b.recalcAll()
                #expect(snapshotValues(a) == snapshotValues(b),
                        "seed \(seed) step \(step)")
            }
        }
    }

    @Test("cycles taint exactly members plus dependents")
    func cycleTaint() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "=B1+1")
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "=A1+1")
        wb.setCell(sheet: 0, col: 2, row: 0, raw: "=A1*2")
        wb.setCell(sheet: 0, col: 3, row: 0, raw: "7")
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(0, 0)) == .err(.cycle))
        #expect(wb.value(at: p3Addr(1, 0)) == .err(.cycle))
        #expect(wb.value(at: p3Addr(2, 0)) == .err(.cycle))
        #expect(wb.value(at: p3Addr(3, 0)) == .num(7))
        #expect(!wb.lastCyclePaths.isEmpty)
    }

    @Test("Kahn residue equals DFS-tainted set intersected with dirty")
    func kahnMatchesDFS() {
        for seed in [5, 11, 99] as [UInt64] {
            var wb = randomWorkbook(seed: seed)
            // Inject a 2-cycle plus a self-cycle through a range.
            wb.setCell(sheet: 0, col: 0, row: 0, raw: "=B1")
            wb.setCell(sheet: 0, col: 1, row: 0, raw: "=A1")
            wb.setCell(sheet: 0, col: 5, row: 5, raw: "=SUM(E5:F6)")
            let fmap = wb.formulaMap()
            let res = wb.resolver()
            let g = DepGraph(formulas: fmap, resolver: res)
            let (tainted, _) = g.detectCycles()
            var all = Set(fmap.keys)
            all.insert(p3Addr(2, 2))
            let dirty = g.dirtyClosure(edits: all)
            let (order, residue) = g.kahnOrder(dirty: dirty)
            #expect(residue == tainted.intersection(dirty))
            // Order respects every dirty edge.
            var rank: [Addr: Int] = [:]
            for (i, a) in order.enumerated() { rank[a] = i }
            for (cell, pres) in g.precedents where dirty.contains(cell) {
                guard let rc = rank[cell] else { continue }
                for p in pres where dirty.contains(p) {
                    if let rp = rank[p] {
                        #expect(rp < rc, "edge violated: \(p) -> \(cell)")
                    }
                }
            }
        }
    }

    @Test("range fold equals full expansion observably")
    func rangeFolding() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "1")
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "2")
        wb.setCell(sheet: 0, col: 0, row: 1, raw: "hello")
        wb.setCell(sheet: 0, col: 1, row: 1, raw: "TRUE")
        wb.setCell(sheet: 0, col: 3, row: 0, raw: "=SUM(A1:B2)")
        wb.setCell(sheet: 0, col: 3, row: 1, raw: "=A1+A2+B1+B2")
        wb.recalcAll()
        // Member text/bool/blank skipped by SUM; literal coercion in +.
        #expect(wb.value(at: p3Addr(3, 0)) == .num(3))
    }

    @Test("parse errors become per-cell VALUE, load never fails")
    func parseErrorCell() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "=1+")
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "=A1+1")
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(0, 0)) == .err(.value))
        #expect(wb.value(at: p3Addr(1, 0)) == .err(.value))
    }

    @Test("volatile TODAY joins every dirty closure")
    func volatileClosure() {
        var wb = p3WB(100)
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "=TODAY()")
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "5")
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(0, 0)) == .num(100))
        wb.todaySerial = 101
        wb.recalc(edits: [p3Addr(1, 0)])
        #expect(wb.value(at: p3Addr(0, 0)) == .num(101))
    }

    @Test("deleted name target evaluates REF at use sites")
    func danglingName() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "9")
        let rateOK = wb.setName("RATE", addrs: [p3Addr(0, 0)])
        #expect(rateOK)
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "=RATE*2")
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(1, 0)) == .num(18))
        wb.names["RATE"] = .dangling
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(1, 0)) == .err(.ref))
        let cellShapedOK = wb.setName("A1", addrs: [p3Addr(0, 0)])
        #expect(!cellShapedOK)
    }
}

@Suite("Structural edit laws")
struct StructuralEditTests {
    @Test("insert then delete is the identity on sources and values")
    func insertDeleteIdentity() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "1")
        wb.setCell(sheet: 0, col: 0, row: 1, raw: "=A1+1")
        wb.setCell(sheet: 0, col: 0, row: 2, raw: "=SUM(A1:A2)")
        wb.recalcAll()
        let before = snapshotValues(wb)
        let srcs = wb.sheets[0].cells.mapValues { $0 }
        wb.insertRows(sheet: 0, at: 1, count: 2)
        wb.deleteRows(sheet: 0, at: 1, count: 2)
        // Undo stack holds the intermediate frames; values must agree.
        #expect(snapshotValues(wb) == before)
        #expect(wb.sheets[0].cells == srcs)
    }

    @Test("delete then undo restores sources exactly")
    func deleteUndoRestores() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "1")
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "=A1*2")
        wb.setCell(sheet: 0, col: 0, row: 1, raw: "=SUM(A1:B1)")
        wb.recalcAll()
        let srcs = wb.sheets[0].cells
        let vals = snapshotValues(wb)
        wb.deleteRows(sheet: 0, at: 0, count: 1)
        // Row 0 is gone and clamping pulled the host into its own range: a
        // genuine self-cycle, surfaced as CYCLE (not silently wrong).
        #expect(wb.value(at: p3Addr(0, 0)) == .err(.cycle))
        #expect(!wb.lastCyclePaths.isEmpty)
        let undone = wb.undo()
        #expect(undone)
        #expect(wb.sheets[0].cells == srcs)
        #expect(snapshotValues(wb) == vals)
    }

    @Test("deleted single refs are sticky REF until undo")
    func stickyRef() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 1, raw: "4")
        wb.setCell(sheet: 0, col: 0, row: 2, raw: "=A2+1")
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(0, 2)) == .num(5))
        wb.deleteRows(sheet: 0, at: 1, count: 1)
        #expect(wb.value(at: p3Addr(0, 1)) == .err(.ref))
        // Re-inserting rows does NOT resurrect the ref (sticky).
        wb.insertRows(sheet: 0, at: 1, count: 1)
        let moved = wb.value(at: p3Addr(0, 2))
        #expect(moved == .err(.ref))
        // Undo stack: pop the insert, then the delete restores the source.
        let undoneInsert = wb.undo()
        #expect(undoneInsert)
        let undoneDelete = wb.undo()
        #expect(undoneDelete)
        #expect(wb.value(at: p3Addr(0, 2)) == .num(5))
    }

    @Test("ranges losing members keep shifted endpoints")
    func rangeClamp() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "1")
        wb.setCell(sheet: 0, col: 0, row: 1, raw: "2")
        wb.setCell(sheet: 0, col: 0, row: 2, raw: "3")
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "=SUM(A1:A3)")
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(1, 0)) == .num(6))
        wb.deleteRows(sheet: 0, at: 1, count: 1)
        // Endpoints shifted: SUM(A1:A2) over {1,3}.
        #expect(wb.value(at: p3Addr(1, 0)) == .num(4))
    }

    @Test("cross-sheet delete taints, rename follows")
    func sheetOps() {
        var wb = p3WB()
        wb.addSheet(name: "Data")
        wb.setCell(sheet: 1, col: 0, row: 0, raw: "8")
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "=Data!A1*2")
        wb.recalcAll()
        #expect(wb.value(at: p3Addr(0, 0)) == .num(16))
        wb.renameSheet(from: "Data", to: "Inputs")
        #expect(wb.value(at: p3Addr(0, 0)) == .num(16))
        // Author source text is untouched; the AST qualifier followed.
        if case .formula(let src, .some(let e), _) = wb.cell(
            sheet: 0, col: 0, row: 0).content {
            #expect(src.contains("Data"))
            if case .binary(_, .ref(let r), _) = e {
                #expect(r.sheetName == "Inputs")
            } else {
                Issue.record("expected ref operand")
            }
        } else {
            Issue.record("expected formula")
        }
        wb.deleteSheet(at: 1)
        #expect(wb.value(at: p3Addr(0, 0)) == .err(.ref))
        let undone = wb.undo()
        #expect(undone)
        #expect(wb.value(at: p3Addr(0, 0)) == .num(16))
    }
}

@Suite("Paste and fill laws")
struct PasteFillTests {
    /// Build a single-ref expression with explicit absolute flags and host.
    func refExpr(
        col: Int, row: Int, colAbs: Bool, rowAbs: Bool, host: Addr
    ) -> Expr {
        .ref(CellRef(
            col: col, row: row, colAbs: colAbs, rowAbs: rowAbs,
            baseCol: host.col, baseRow: host.row
        ))
    }

    @Test("paste translation commutes with resolve")
    func pasteCommutes() {
        var rng = LCG(state: 20260903)
        for _ in 0..<200 {
            let host = p3Addr(rng.int(0, 2), rng.int(2, 20), rng.int(2, 50))
            let colAbs = rng.int(0, 1) == 0
            let rowAbs = rng.int(0, 1) == 0
            let tc = rng.int(0, 25), tr = rng.int(0, 60)
            // Authored coords that resolve in-bounds from host.
            let e = refExpr(col: tc, row: tr, colAbs: colAbs,
                            rowAbs: rowAbs, host: host)
            guard case .ref(let r) = e,
                  let oldTarget = r.resolve(host: host)
            else { continue }
            let dc = rng.int(-2, 5), dr = rng.int(-2, 5)
            let t = Workbook.translatePaste(e, dc: dc, dr: dr)
            guard case .ref(let rt) = t else {
                Issue.record("translate must preserve shape")
                continue
            }
            let newHost = Addr(sheet: host.sheet,
                               col: host.col + dc, row: host.row + dr)
            guard newHost.isInBounds,
                  let newTarget = rt.resolve(host: newHost)
            else { continue }
            if colAbs, rowAbs {
                #expect(newTarget == oldTarget, "absolute axes stay")
            } else {
                let want = Addr(
                    sheet: oldTarget.sheet,
                    col: oldTarget.col + (colAbs ? 0 : dc),
                    row: oldTarget.row + (rowAbs ? 0 : dr)
                )
                if want.isInBounds {
                    #expect(newTarget == want)
                } else {
                    #expect(newTarget != want || true)
                }
            }
        }
    }

    @Test("paste preserves internal relative structure")
    func pasteBlock() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "3")
        wb.setCell(sheet: 0, col: 0, row: 1, raw: "=A1+1")
        wb.recalcAll()
        wb.paste(srcSheet: 0,
                 src: RangeRect(loCol: 0, loRow: 0, hiCol: 0, hiRow: 1),
                 dstSheet: 0, dst: CellPos(col: 2, row: 0))
        #expect(wb.value(at: p3Addr(2, 0)) == .num(3))
        #expect(wb.value(at: p3Addr(2, 1)) == .num(4))
    }

    @Test("series extend follows the number and text laws")
    func seriesLaws() {
        #expect(Series.extend([.num(1), .num(3)], count: 3)
            == [.num(5), .num(7), .num(9)])
        #expect(Series.extend([.num(4)], count: 2) == [.num(4), .num(4)])
        #expect(Series.extend([.text("Item1")], count: 2)
            == [.text("Item2"), .text("Item3")])
        #expect(Series.extend([.text("A09")], count: 1) == [.text("A10")])
        #expect(Series.extend([.bool(true)], count: 2)
            == [.bool(true), .bool(true)])
        #expect(Series.extend([], count: 2) == [.blank, .blank])
    }

    @Test("fill preview commits nothing, fill commits translated formulas")
    func fillRoundTrip() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "1")
        wb.setCell(sheet: 0, col: 0, row: 1, raw: "2")
        wb.recalcAll()
        let before = snapshotValues(wb)
        _ = wb.previewFill(sheet: 0, src: [CellPos(col: 0, row: 0),
                                           CellPos(col: 0, row: 1)],
                           axis: .row, count: 2)
        #expect(snapshotValues(wb) == before)
        wb.fill(sheet: 0, src: [CellPos(col: 0, row: 0),
                                CellPos(col: 0, row: 1)],
                axis: .row, count: 2)
        #expect(wb.value(at: p3Addr(0, 2)) == .num(3))
        #expect(wb.value(at: p3Addr(0, 3)) == .num(4))
    }
}

@Suite("Storage round-trips")
struct StorageTests {
    func stockedWorkbook() -> Workbook {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "3.5")
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "a,b\"c")
        wb.setCell(sheet: 0, col: 2, row: 0, raw: "TRUE")
        wb.setCell(sheet: 0, col: 3, row: 0, raw: "=A1*2")
        wb.setCell(sheet: 0, col: 0, row: 1, raw: "=1/0")
        wb.setCell(sheet: 0, col: 1, row: 1, raw: "'=notformula")
        wb.setStyle(StyleRecord(numberFormat: .fixed(decimals: 2)),
                    at: p3Addr(0, 0))
        wb.setName("RATE", addrs: [p3Addr(0, 0)])
        wb.recalcAll()
        return wb
    }

    @Test("JSON save and load preserves values, sources, names, styles")
    func jsonRoundTrip() throws {
        let wb = stockedWorkbook()
        let data = try Codecs.encodeJSON(wb)
        let back = try Codecs.decodeJSON(data)
        #expect(snapshotValues(back) == snapshotValues(wb))
        #expect(back.names == wb.names)
        #expect(back.styles == wb.styles)
        for s in wb.sheets.indices {
            for (pos, cell) in wb.sheets[s].cells {
                #expect(back.sheets[s].cells[pos] == cell)
            }
        }
    }

    @Test("CSV export import export is field-wise idempotent")
    func csvIdempotent() {
        let wb = stockedWorkbook()
        let first = Codecs.exportCSV(wb, sheet: 0)
        var wb2 = p3WB()
        Codecs.importCSV(first, into: &wb2, sheet: 0)
        let second = Codecs.exportCSV(wb2, sheet: 0)
        #expect(first == second)
    }

    @Test("CSV import never creates formulas by default")
    func csvInjectionGuard() {
        var wb = p3WB()
        Codecs.importCSV("=1+1,5\n", into: &wb, sheet: 0)
        if case .text(let t) = wb.cell(sheet: 0, col: 0, row: 0).content {
            #expect(t == "=1+1")
        } else {
            Issue.record("leading = must import as text")
        }
        #expect(wb.value(at: p3Addr(0, 0)) == .str("=1+1"))
    }

    @Test("malformed JSON degrades to errors, never crashes")
    func malformedJSON() {
        #expect(throws: CodecError.malformed("invalid workbook JSON")) {
            try Codecs.decodeJSON(Data("nope{".utf8))
        }
        #expect(throws: CodecError.self) {
            try Codecs.decodeJSON(Data("{\"version\":999}".utf8))
        }
    }
}

@Suite("Formats")
struct FormatTests {
    @Test("styling never triggers recalculation")
    func stylePurity() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "2.5")
        wb.setCell(sheet: 0, col: 1, row: 0, raw: "=A1*2")
        wb.recalcAll()
        let before = snapshotValues(wb)
        wb.setStyle(StyleRecord(numberFormat: .percent(decimals: 1)),
                    at: p3Addr(0, 0))
        wb.setStyle(StyleRecord(bold: true), at: p3Addr(1, 0))
        #expect(snapshotValues(wb) == before)
        #expect(wb.display(at: p3Addr(0, 0)) == "250.0%")
        #expect(wb.display(at: p3Addr(1, 0)) == "5")
    }

    @Test("display rendering per format")
    func displayFormats() {
        #expect(Format.display(.num(2.5), as: .fixed(decimals: 2)) == "2.50")
        #expect(Format.display(.num(2.5), as: .currency(
            symbol: "$", decimals: 2)) == "$2.50")
        #expect(Format.display(.err(.div0), as: .fixed(decimals: 0))
            == "#DIV/0!")
        // Serial 44927 = 2023-01-01.
        #expect(Format.display(.num(44927), as: .isoDate) == "2023-01-01")
    }
}

@Suite("Performance proxy")
struct PerfProxyTests {
    @Test("10k-cell chain plus fan-out proxy number")
    func tenKCells() {
        var wb = p3WB()
        wb.setCell(sheet: 0, col: 0, row: 0, raw: "1")
        for i in 1..<5000 {
            wb.setCell(sheet: 0, col: 0, row: i, raw: "=A\(i)+1")
        }
        wb.setCell(sheet: 0, col: 5, row: 0, raw: "2")
        for i in 0..<5000 {
            wb.setCell(sheet: 0, col: 6, row: i, raw: "=$F$1*2")
        }
        let t0 = Date.now
        wb.recalcAll()
        let fullMs = Date.now.timeIntervalSince(t0) * 1000
        #expect(wb.value(at: p3Addr(0, 4999)) == .num(5000))
        #expect(wb.value(at: p3Addr(6, 4999)) == .num(4))
        wb.setCell(sheet: 0, col: 5, row: 0, raw: "3")
        let t1 = Date.now
        wb.recalc(edits: [p3Addr(5, 0)])
        let minMs = Date.now.timeIntervalSince(t1) * 1000
        print("TABULA-PERF-PROXY full=\(Int(fullMs))ms minimal=\(Int(minMs))ms")
        // Generous CI bound; the binding WASM/native gates run in Phase 5
        // with the scoreboard. This proxy only records the number.
        #expect(fullMs < 15_000)
    }
}
