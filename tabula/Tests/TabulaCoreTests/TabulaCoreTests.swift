/// Phase 0 smoke suites: package health, column codec, error precedence, and
/// the Bridge JSON wire contract. Core domain suites (lexer, parser, graph,
/// evaluator, oracles) land with Phases 1-3 per the binding test matrix
/// (research section 12).
import Testing

@testable import TabulaCore
@testable import TabulaBridge

@Suite("Package health")
struct PackageHealthTests {
    @Test("core version is pinned")
    func versionPinned() {
        #expect(TabulaCore.version == "0.1.0-phase0")
    }

    @Test("grid caps match research 3.1")
    func gridCaps() {
        #expect(TabulaCore.maxColumns == 16_384)
        #expect(TabulaCore.maxRows == 1_048_576)
    }
}

@Suite("Column codec (bijective base-26)")
struct ColumnCodecTests {
    @Test("first and boundary columns encode")
    func encodeBoundaries() {
        #expect(ColumnCodec.encode(0) == "A")
        #expect(ColumnCodec.encode(25) == "Z")
        #expect(ColumnCodec.encode(26) == "AA")
        #expect(ColumnCodec.encode(27) == "AB")
        #expect(ColumnCodec.encode(51) == "AZ")
        #expect(ColumnCodec.encode(52) == "BA")
        #expect(ColumnCodec.encode(701) == "ZZ")
        #expect(ColumnCodec.encode(702) == "AAA")
    }

    @Test("out-of-range columns refuse instead of crashing")
    func encodeRefuses() {
        #expect(ColumnCodec.encode(-1) == nil)
        #expect(ColumnCodec.encode(TabulaCore.maxColumns) == nil)
    }

    @Test("decode inverts encode across boundaries")
    func decodeRoundTrip() {
        for col in [0, 1, 25, 26, 27, 51, 52, 701, 702, 703, 16383] {
            let letters = ColumnCodec.encode(col)!
            #expect(ColumnCodec.decode(letters) == col)
        }
    }

    @Test("decode is case-insensitive and rejects garbage")
    func decodeRejects() {
        #expect(ColumnCodec.decode("a1") == nil)
        #expect(ColumnCodec.decode("A1") == nil)
        #expect(ColumnCodec.decode("") == nil)
        #expect(ColumnCodec.decode("A B") == nil)
        #expect(ColumnCodec.decode("a") == 0)
    }
}

@Suite("Error precedence (research 4.4)")
struct ErrorPrecedenceTests {
    @Test("cycle outranks everything, num loses to everything")
    func precedenceOrder() {
        #expect(ErrorCode.cycle.precedence > ErrorCode.ref.precedence)
        #expect(ErrorCode.ref.precedence > ErrorCode.div0.precedence)
        #expect(ErrorCode.div0.precedence > ErrorCode.name.precedence)
        #expect(ErrorCode.name.precedence > ErrorCode.value.precedence)
        #expect(ErrorCode.value.precedence > ErrorCode.na.precedence)
        #expect(ErrorCode.na.precedence > ErrorCode.num.precedence)
    }

    @Test("combine is deterministic and total over all pairs")
    func combineTotal() {
        for a in ErrorCode.allCases {
            for b in ErrorCode.allCases {
                let w = ErrorCode.combine(a, b)
                #expect(w == ErrorCode.combine(b, a))
                #expect(w.precedence == max(a.precedence, b.precedence))
            }
        }
    }

    @Test("display strings are exact")
    func displayStrings() {
        #expect(ErrorCode.div0.rawValue == "#DIV/0!")
        #expect(ErrorCode.cycle.rawValue == "#CYCLE!")
        #expect(ErrorCode.ref.rawValue == "#REF!")
        #expect(ErrorCode.value.rawValue == "#VALUE!")
        #expect(ErrorCode.name.rawValue == "#NAME?")
        #expect(ErrorCode.na.rawValue == "#N/A")
        #expect(ErrorCode.num.rawValue == "#NUM!")
    }
}

@Suite("Bridge wire contract")
struct BridgeWireTests {
    @Test("dirty batch JSON round-trips the documented shape")
    func batchRoundTrip() throws {
        let batch = DirtyBatch(
            seq: 7,
            ranges: [DirtyRange(sheet: 0, c0: 0, r0: 0, c1: 1, r1: 1)],
            cells: [
                CellView(s: 0, c: 0, r: 0, v: .num(41), d: "41"),
                CellView(s: 0, c: 1, r: 0, v: .num(1), d: "1"),
                CellView(s: 0, c: 0, r: 1, v: .num(42), d: "42"),
                CellView(s: 0, c: 1, r: 1, v: .err(.cycle), d: "#CYCLE!"),
            ]
        )
        let data = try batch.encodeToJSON()
        let text = String(decoding: data, as: UTF8.self)
        #expect(text.contains("\"seq\""))
        #expect(text.contains("\"ranges\""))
        #expect(text.contains("\"cells\""))
        let back = try DirtyBatch.decodeFromJSON(data)
        #expect(back.seq == 7)
        #expect(back.cells.count == 4)
        #expect(back.cells[3].v.errorCode == .cycle)
        #expect(back.cells[0].addr == Addr(sheet: 0, col: 0, row: 0))
    }

    @Test("range rect normalizes at construction")
    func rangeNormalizes() {
        let r = RangeRect(loCol: 5, loRow: 9, hiCol: 2, hiRow: 3)
        #expect(r.loCol == 2 && r.hiCol == 5)
        #expect(r.loRow == 3 && r.hiRow == 9)
        #expect(r.cellCount == 4 * 7)
    }

    @Test("stub bridge delivers in sequence order and drops stale")
    func stubBridgeOrders() {
        let bridge = BridgeWasm()
        bridge.stage(DirtyBatch(seq: 2, ranges: [], cells: []))
        bridge.stage(DirtyBatch(seq: 1, ranges: [], cells: []))
        let first = bridge.drain(since: 0)
        #expect(first.map(\.seq) == [1, 2])
        #expect(bridge.lastDeliveredSeq == 2)
        #expect(bridge.drain(since: 2).isEmpty)
    }
}
