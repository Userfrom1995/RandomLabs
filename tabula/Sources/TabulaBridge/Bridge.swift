/// TabulaBridge: batch-only snapshot transfer between Core (WASM) and UI (JS).
///
/// Binding rule (blueprint): one batched snapshot per recalc (dirty addresses
/// plus values plus error codes), never per-cell JS round-trips inside the hot
/// loop. The recalc hot loop stays in WASM linear memory; the bridge ships
/// typed dirty-range batches per frame.
///
/// Wire shape (pinned Phase 0, recorded in tabula/docs/architecture.md):
/// JSON with keys `seq`, `ranges`, `cells`. Each cell carries `s` (sheet),
/// `c` (col), `r` (row), `v` (value payload), `d` (General-format display
/// string, pinned to one float renderer per research 12.8). Compact keys keep
/// batches small over the JS boundary; typed arrays are a Phase 4 optimization
/// that must decode to exactly these structs.
import Foundation
import TabulaCore

/// Display-ready value payload crossing the bridge. Errors cross as codes so
/// the UI never has to parse display strings back into semantics.
public enum BridgeValue: Hashable, Sendable, Codable {
    case num(Double)
    case str(String)
    case bool(Bool)
    case err(ErrorCode)
    case blank

    public var errorCode: ErrorCode? {
        if case .err(let code) = self { return code }
        return nil
    }
}

/// One cell of a snapshot batch.
public struct CellView: Hashable, Sendable, Codable {
    public var s: Int
    public var c: Int
    public var r: Int
    public var v: BridgeValue
    /// General-format display string rendered by Core (research 12.8 pins one
    /// float renderer shared by native and WASM targets).
    public var d: String

    public init(s: Int, c: Int, r: Int, v: BridgeValue, d: String) {
        self.s = s
        self.c = c
        self.r = r
        self.v = v
        self.d = d
    }

    public var addr: Addr { Addr(sheet: s, col: c, row: r) }
}

/// Dirty rectangle covering a run of changed cells (one entry per disjoint
/// rect; the UI repaints the union of `ranges` using `cells` for values).
public struct DirtyRange: Hashable, Sendable, Codable {
    public var sheet: Int
    public var c0: Int
    public var r0: Int
    public var c1: Int
    public var r1: Int

    public init(sheet: Int, c0: Int, r0: Int, c1: Int, r1: Int) {
        self.sheet = sheet
        self.c0 = c0
        self.r0 = r0
        self.c1 = c1
        self.r1 = r1
    }
}

/// One recalc frame. `seq` increases monotonically; the UI drops batches with
/// `seq` at or below the last applied sequence (last-writer-wins, no tearing).
public struct DirtyBatch: Sendable, Codable {
    public var seq: UInt64
    public var ranges: [DirtyRange]
    public var cells: [CellView]

    public init(seq: UInt64, ranges: [DirtyRange], cells: [CellView]) {
        self.seq = seq
        self.ranges = ranges
        self.cells = cells
    }

    /// Compact JSON exactly as shipped over the JS boundary. Key order is
    /// struct order (`seq`, `ranges`, `cells`); parse with the documented
    /// shape, never by position.
    public func encodeToJSON() throws -> Data {
        try JSONEncoder().encode(self)
    }

    public static func decodeFromJSON(_ data: Data) throws -> DirtyBatch {
        try JSONDecoder().decode(DirtyBatch.self, from: data)
    }
}
