/// Phase 4 suites: BridgeSession batch wire, inspector views, and
/// presentation sort/filter (blueprint milestone 4).
import Foundation
import Testing

@testable import TabulaCore
@testable import TabulaBridge

@Suite("Bridge session batches")
struct BridgeSessionTests {
    @Test("edits ship one monotonic batch with Core display strings")
    func editBatch() {
        let s = BridgeSession()
        let b1 = s.apply([.setCell(sheet: 0, col: 0, row: 0, raw: "41")])
        #expect(b1.seq == 1)
        #expect(b1.cells.count == 1)
        #expect(b1.cells[0].d == "41")
        let b2 = s.apply([
            .setCell(sheet: 0, col: 1, row: 0, raw: "1"),
            .setCell(sheet: 0, col: 0, row: 1, raw: "=A1+B1"),
        ])
        #expect(b2.seq == 2)
        #expect(b2.cells.count == 2)
        let sum = b2.cells.first { $0.c == 0 && $0.r == 1 }
        #expect(sum?.d == "42")
    }

    @Test("dependent recompute rides the same batch")
    func dependentInBatch() {
        let s = BridgeSession()
        _ = s.apply([.setCell(sheet: 0, col: 0, row: 0, raw: "=B1*2")])
        let b = s.apply([.setCell(sheet: 0, col: 1, row: 0, raw: "21")])
        let dep = b.cells.first { $0.c == 0 && $0.r == 0 }
        #expect(dep?.d == "42")
    }

    @Test("batch JSON round-trips the pinned wire shape")
    func wireRoundTrip() throws {
        let s = BridgeSession()
        let b = s.apply([.setCell(sheet: 0, col: 0, row: 0, raw: "=1/0")])
        let data = try b.encodeToJSON()
        let back = try DirtyBatch.decodeFromJSON(data)
        #expect(back.seq == b.seq)
        #expect(back.cells.count == 1)
        #expect(back.cells[0].d == "#DIV/0!")
        #expect(back.cells[0].v == .err(.div0))
        let text = String(data: data, encoding: .utf8)!
        #expect(text.contains("\"seq\""))
        #expect(text.contains("\"ranges\""))
        #expect(text.contains("\"cells\""))
    }

    @Test("structural edits and undo ship through the session")
    func structuralAndUndo() {
        let s = BridgeSession()
        _ = s.apply([.setCell(sheet: 0, col: 0, row: 1, raw: "=A1+1")])
        _ = s.apply([.setCell(sheet: 0, col: 0, row: 0, raw: "10")])
        let ins = s.apply([.insertRows(sheet: 0, at: 0, count: 1)])
        #expect(ins.cells.contains { $0.r == 2 && $0.d == "11" })
        let u = s.apply([.undo])
        #expect(u.cells.contains { $0.r == 1 && $0.d == "11" })
    }

    @Test("style-only edits ship an empty dirty set with a fresh seq")
    func styleNoRecalc() {
        let s = BridgeSession()
        _ = s.apply([.setCell(sheet: 0, col: 0, row: 0, raw: "5")])
        let b = s.apply([.setStyle(
            style: StyleRecord(numberFormat: .fixed(decimals: 2)),
            sheet: 0, col: 0, row: 0
        )])
        #expect(b.cells.isEmpty)
        #expect(b.ranges.isEmpty)
        #expect(b.seq == 2)
        #expect(s.workbook.display(at: Addr(sheet: 0, col: 0, row: 0)) == "5.00")
    }

    @Test("full snapshot covers every stored cell")
    func fullSnapshot() {
        let s = BridgeSession()
        _ = s.apply([
            .setCell(sheet: 0, col: 0, row: 0, raw: "1"),
            .setCell(sheet: 0, col: 3, row: 7, raw: "x"),
        ])
        let full = s.fullSnapshot()
        #expect(full.cells.count == 2)
        #expect(full.ranges.count == 2)
    }
}

@Suite("Dirty range coalescing")
struct CoalesceTests {
    @Test("solid block collapses to one rect")
    func solidBlock() {
        let s = BridgeSession()
        var edits: [EngineEdit] = []
        for r in 0..<3 {
            for c in 0..<4 { edits.append(.setCell(sheet: 0, col: c, row: r, raw: "1")) }
        }
        let b = s.apply(edits)
        #expect(b.ranges.count == 1)
        #expect(b.ranges[0].c0 == 0 && b.ranges[0].c1 == 3)
        #expect(b.ranges[0].r0 == 0 && b.ranges[0].r1 == 2)
    }

    @Test("ranges tile exactly the dirty set")
    func tileCoverage() {
        let s = BridgeSession()
        _ = s.apply([
            .setCell(sheet: 0, col: 0, row: 0, raw: "1"),
            .setCell(sheet: 0, col: 2, row: 0, raw: "1"),
            .setCell(sheet: 0, col: 0, row: 5, raw: "1"),
        ])
        let b = s.fullSnapshot()
        var covered = Set<Addr>()
        for rg in b.ranges {
            for r in rg.r0...rg.r1 {
                for c in rg.c0...rg.c1 {
                    covered.insert(Addr(sheet: rg.sheet, col: c, row: r))
                }
            }
        }
        #expect(covered == Set(b.cells.map(\.addr)))
    }
}

@Suite("Inspector views")
struct InspectorViewTests {
    @Test("formula cell reports precedents, dependents, and rank")
    func formulaTrace() {
        let s = BridgeSession()
        _ = s.apply([
            .setCell(sheet: 0, col: 0, row: 0, raw: "3"),
            .setCell(sheet: 0, col: 1, row: 0, raw: "=A1*2"),
            .setCell(sheet: 0, col: 2, row: 0, raw: "=B1+1"),
        ])
        let mid = s.inspect(sheet: 0, col: 1, row: 0)
        #expect(mid.isFormula)
        #expect(mid.source == "=A1*2")
        #expect(mid.display == "6")
        #expect(mid.precedents == ["Sheet1!A1"])
        #expect(mid.dependents == ["Sheet1!C1"])
        #expect(mid.topoRank != nil)
        let head = s.inspect(sheet: 0, col: 2, row: 0)
        #expect(head.topoRank! > mid.topoRank!)
    }

    @Test("cycle members carry the recorded path and nil rank")
    func cyclePath() {
        let s = BridgeSession()
        _ = s.apply([
            .setCell(sheet: 0, col: 0, row: 0, raw: "=B1"),
            .setCell(sheet: 0, col: 1, row: 0, raw: "=A1"),
        ])
        let info = s.inspect(sheet: 0, col: 0, row: 0)
        #expect(info.display == "#CYCLE!")
        #expect(info.topoRank == nil)
        #expect((info.cyclePath ?? []).count >= 2)
    }

    @Test("parse failures surface the bar position")
    func parseError() {
        let s = BridgeSession()
        _ = s.apply([.setCell(sheet: 0, col: 0, row: 0, raw: "=1+")])
        let info = s.inspect(sheet: 0, col: 0, row: 0)
        #expect(info.isFormula)
        #expect(info.parseErrorPos != nil)
        #expect(info.display == "#VALUE!")
    }

    @Test("inspector view JSON round-trips for the WASM future")
    func inspectorJSON() throws {
        let s = BridgeSession()
        _ = s.apply([.setCell(sheet: 0, col: 0, row: 0, raw: "7")])
        let view = s.inspect(sheet: 0, col: 0, row: 0)
        let data = try JSONEncoder().encode(view)
        let back = try JSONDecoder().decode(InspectorView.self, from: data)
        #expect(back.a1 == "Sheet1!A1")
        #expect(back.display == "7")
    }
}

@Suite("Presentation views (sort/filter)")
struct SheetViewTests {
    func sheetWithColumn() -> BridgeSession {
        let s = BridgeSession()
        _ = s.apply([
            .setCell(sheet: 0, col: 0, row: 0, raw: "30"),
            .setCell(sheet: 0, col: 0, row: 1, raw: "10"),
            .setCell(sheet: 0, col: 0, row: 2, raw: "20"),
            .setCell(sheet: 0, col: 0, row: 3, raw: "=1/0"),
            .setCell(sheet: 0, col: 0, row: 4, raw: "x"),
        ])
        return s
    }

    @Test("ascending sort orders numbers with errors last")
    func sortAsc() {
        let s = sheetWithColumn()
        let rows = s.sort(sheet: 0, col: 0, ascending: true, rowCount: 5)
        #expect(rows == [1, 2, 0, 4, 3])
    }

    @Test("descending sort flips with errors still last")
    func sortDesc() {
        let s = sheetWithColumn()
        let rows = s.sort(sheet: 0, col: 0, ascending: false, rowCount: 5)
        #expect(rows == [0, 2, 1, 4, 3])
    }

    @Test("filter hides failing rows, clear restores")
    func filterHide() {
        let s = sheetWithColumn()
        let rows = s.filter(sheet: 0, col: 0, rule: .numberGreaterThan(15), rowCount: 5)
        #expect(rows == [0, 2])
        let restored = s.filter(sheet: 0, col: 0, rule: nil, rowCount: 5)
        #expect(restored == [0, 1, 2, 3, 4])
        s.clearView(sheet: 0)
        #expect(s.visibleRows(sheet: 0, rowCount: 5) == [0, 1, 2, 3, 4])
    }

    @Test("edits never move the view, refs never taint")
    func viewStableUnderEdit() {
        let s = sheetWithColumn()
        _ = s.sort(sheet: 0, col: 0, ascending: true, rowCount: 5)
        _ = s.apply([.setCell(sheet: 0, col: 1, row: 0, raw: "=A1")])
        #expect(s.visibleRows(sheet: 0, rowCount: 5) == [1, 2, 0, 4, 3])
        #expect(s.workbook.value(at: Addr(sheet: 0, col: 1, row: 0)) == .num(30))
    }
}
