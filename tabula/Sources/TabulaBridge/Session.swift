/// BridgeSession: the batch-only engine façade the web UI drives (Phase 4).
///
/// Binding rule (blueprint): the UI never evaluates and never touches Core
/// types directly. Every mutation goes through `apply(_:)` as a list of
/// `EngineEdit` values; every result comes back as one monotonic `DirtyBatch`
/// (dirty addresses plus Core-rendered display strings), plus read-only
/// `InspectorView` snapshots for the inspector panel and `SheetView` state
/// for sort/filter. No per-cell round-trips inside recalc: Core computes,
/// the session diffs, the UI paints.
///
/// Recalc policy: pure value/formula writes share one minimal
/// `recalc(edits:)` pass; any structural edit falls back to the operation's
/// own full recalc (minimal-vs-full agreement is pinned by Phase 3, so the
/// batch is identical either way). The batch always carries exactly the
/// addresses whose computed value changed, plus edited cells cleared to
/// blank.
import Foundation
import TabulaCore

extension BridgeValue {
    /// Payload projection of a computed value. Errors cross as codes so the
    /// UI never parses display strings back into semantics.
    public init(_ value: Value) {
        switch value {
        case .num(let x): self = .num(x)
        case .str(let s): self = .str(s)
        case .bool(let b): self = .bool(b)
        case .err(let e): self = .err(e)
        case .blank: self = .blank
        }
    }
}

/// One UI mutation. Batches freely: `apply` commits them in order and ships
/// a single `DirtyBatch` for the whole list.
public enum EngineEdit: Sendable {
    case setCell(sheet: Int, col: Int, row: Int, raw: String)
    case insertRows(sheet: Int, at: Int, count: Int)
    case deleteRows(sheet: Int, at: Int, count: Int)
    case insertCols(sheet: Int, at: Int, count: Int)
    case deleteCols(sheet: Int, at: Int, count: Int)
    case paste(srcSheet: Int, src: RangeRect, dstSheet: Int, dstCol: Int, dstRow: Int)
    case fill(sheet: Int, src: [CellPos], axis: StructAxis, count: Int)
    case undo
    case addSheet(name: String)
    case renameSheet(from: String, to: String)
    case deleteSheet(at: Int)
    case setName(name: String, addrs: [Addr])
    case removeName(name: String)
    case setStyle(style: StyleRecord, sheet: Int, col: Int, row: Int)
}

/// Sort key for one view sort. Errors always sink to the bottom (research
/// 9.4: errors never sort); blanks lead ascending, trail descending.
public struct SortSpec: Hashable, Sendable, Codable {
    public var col: Int
    public var ascending: Bool
    public init(col: Int, ascending: Bool = true) {
        self.col = col
        self.ascending = ascending
    }
}

/// View filter on one column. View state only: underlying addresses never
/// move, so refs never taint (documented Excel difference, user docs).
public enum FilterRule: Hashable, Sendable, Codable {
    case hideBlank
    case textContains(String)
    case numberGreaterThan(Double)
    case numberLessThan(Double)
}

/// Per-sheet view index: display row order plus hidden set. Stored in the
/// session (presentation state), never in Core.
public struct SheetView: Sendable {
    /// View position -> model row for visible rows.
    public var order: [Int]?
    public var hidden: Set<Int> = []
    public var sort: SortSpec?
    public var filterCol: Int?
    public var filter: FilterRule?

    public init() {}
}

/// JSON-safe inspector snapshot for the web panel (A1 labels included so
/// the UI formats nothing itself).
public struct InspectorView: Sendable, Codable {
    public var a1: String
    public var source: String
    public var display: String
    public var isFormula: Bool
    public var parseErrorPos: Int?
    public var precedents: [String]
    public var dependents: [String]
    public var topoRank: Int?
    public var cyclePath: [String]?

    public init(
        a1: String, source: String, display: String, isFormula: Bool,
        parseErrorPos: Int? = nil, precedents: [String] = [],
        dependents: [String] = [], topoRank: Int? = nil,
        cyclePath: [String]? = nil
    ) {
        self.a1 = a1
        self.source = source
        self.display = display
        self.isFormula = isFormula
        self.parseErrorPos = parseErrorPos
        self.precedents = precedents
        self.dependents = dependents
        self.topoRank = topoRank
        self.cyclePath = cyclePath
    }
}

public func a1Label(sheet: Int, col: Int, row: Int, sheets: [String]) -> String {
    let cell = (ColumnCodec.encode(col) ?? "?", String(row + 1))
    let prefix: String = sheets.indices.contains(sheet) ? sheets[sheet] + "!" : ""
    return prefix + cell.0 + cell.1
}

/// The UI-facing engine façade. Single-owner, main-actor-bound by contract:
/// the web bridge calls it from one thread, so `Sendable` is unchecked.
public final class BridgeSession: @unchecked Sendable {
    public var workbook: Workbook
    private var seq: UInt64 = 0
    private var views: [Int: SheetView] = [:]

    public init(todaySerial: Int = 0) {
        self.workbook = Workbook(todaySerial: todaySerial)
    }

    public init(workbook: Workbook) {
        self.workbook = workbook
    }

    // MARK: - edits

    /// Apply edits in order, recalc once when possible, and ship one batch.
    /// Structural edits recalc through their own Workbook path; pure writes
    /// share a single minimal pass. The batch diffs computed values, so both
    /// paths produce identical output.
    @discardableResult
    public func apply(_ edits: [EngineEdit]) -> DirtyBatch {
        let before = workbook.values
        var written = Set<Addr>()
        var structural = false
        for edit in edits {
            switch edit {
            case .setCell(let s, let c, let r, let raw):
                workbook.setCell(sheet: s, col: c, row: r, raw: raw)
                written.insert(Addr(sheet: s, col: c, row: r))
            case .insertRows(let s, let at, let n):
                workbook.insertRows(sheet: s, at: at, count: n); structural = true
            case .deleteRows(let s, let at, let n):
                workbook.deleteRows(sheet: s, at: at, count: n); structural = true
            case .insertCols(let s, let at, let n):
                workbook.insertCols(sheet: s, at: at, count: n); structural = true
            case .deleteCols(let s, let at, let n):
                workbook.deleteCols(sheet: s, at: at, count: n); structural = true
            case .paste(let ss, let src, let ds, let dc, let dr):
                workbook.paste(srcSheet: ss, src: src, dstSheet: ds, dst: CellPos(col: dc, row: dr))
                structural = true
            case .fill(let s, let src, let axis, let n):
                workbook.fill(sheet: s, src: src, axis: axis, count: n)
                structural = true
            case .undo:
                _ = workbook.undo(); structural = true
            case .addSheet(let name):
                workbook.addSheet(name: name); structural = true
            case .renameSheet(let from, let to):
                workbook.renameSheet(from: from, to: to); structural = true
            case .deleteSheet(let at):
                workbook.deleteSheet(at: at); structural = true
            case .setName(let name, let addrs):
                _ = workbook.setName(name, addrs: addrs); structural = true
            case .removeName(let name):
                workbook.removeName(name); structural = true
            case .setStyle(let style, let s, let c, let r):
                workbook.setStyle(style, at: Addr(sheet: s, col: c, row: r))
            }
        }
        if !structural {
            workbook.recalc(edits: written)
        }
        let after = workbook.values
        var dirty = Set<Addr>()
        for a in written { dirty.insert(a) }
        for (a, v) in after where before[a] != v { dirty.insert(a) }
        for (a, _) in before where after[a] == nil { dirty.insert(a) }
        seq += 1
        return makeBatch(seq: seq, dirty: dirty)
    }

    /// Full snapshot of every stored cell (initial paint, sheet switch).
    public func fullSnapshot() -> DirtyBatch {
        var dirty = Set<Addr>()
        for s in workbook.sheets.indices {
            for pos in workbook.sheets[s].cells.keys {
                dirty.insert(Addr(sheet: s, col: pos.col, row: pos.row))
            }
        }
        seq += 1
        return makeBatch(seq: seq, dirty: dirty)
    }

    public var lastSeq: UInt64 { seq }

    // MARK: - batch building

    func makeBatch(seq: UInt64, dirty: Set<Addr>) -> DirtyBatch {
        let cells = dirty.sorted().map { a -> CellView in
            let v = workbook.values[a] ?? .blank
            return CellView(s: a.sheet, c: a.col, r: a.row, v: BridgeValue(v), d: workbook.display(at: a))
        }
        return DirtyBatch(seq: seq, ranges: coalesce(dirty), cells: cells)
    }

    /// Coalesce dirty addresses into per-sheet rectangles: row runs first,
    /// then vertical merge of runs with identical column spans. The UI
    /// repaints the union; exact tiling is an optimization, never semantics.
    func coalesce(_ dirty: Set<Addr>) -> [DirtyRange] {
        var out: [DirtyRange] = []
        let bySheet = Dictionary(grouping: dirty, by: \.sheet)
        for sheet in bySheet.keys.sorted() {
            let addrs = bySheet[sheet]!
            let byRow = Dictionary(grouping: addrs, by: \.row)
            // Row -> sorted runs of columns.
            var runs: [(row: Int, c0: Int, c1: Int)] = []
            for row in byRow.keys.sorted() {
                let cols = byRow[row]!.map(\.col).sorted()
                var start = cols[0], prev = cols[0]
                for c in cols.dropFirst() {
                    if c == prev + 1 { prev = c } else {
                        runs.append((row, start, prev)); start = c; prev = c
                    }
                }
                runs.append((row, start, prev))
            }
            // Vertical merge: same column span on consecutive rows.
            var i = 0
            while i < runs.count {
                var r0 = runs[i].row, r1 = runs[i].row
                let (c0, c1) = (runs[i].c0, runs[i].c1)
                var j = i + 1
                while j < runs.count, runs[j].row == r1 + 1,
                      runs[j].c0 == c0, runs[j].c1 == c1 {
                    r1 = runs[j].row; j += 1
                }
                out.append(DirtyRange(sheet: sheet, c0: c0, r0: r0, c1: c1, r1: r1))
                i = j
            }
        }
        return out
    }

    // MARK: - inspector

    public func inspect(sheet: Int, col: Int, row: Int) -> InspectorView {
        let addr = Addr(sheet: sheet, col: col, row: row)
        let info = workbook.inspect(addr)
        let names = workbook.sheets.map(\.name)
        func label(_ a: Addr) -> String {
            a1Label(sheet: a.sheet, col: a.col, row: a.row, sheets: names)
        }
        return InspectorView(
            a1: label(addr),
            source: info.source,
            display: info.display,
            isFormula: info.isFormula,
            parseErrorPos: info.parseErrorPos,
            precedents: info.precedents.map(label),
            dependents: info.dependents.map(label),
            topoRank: info.topoRank,
            cyclePath: info.cyclePath?.map(label)
        )
    }

    // MARK: - views (sort/filter, presentation state only)

    public func view(for sheet: Int) -> SheetView {
        views[sheet] ?? SheetView()
    }

    /// Stable sort of model rows by one column's computed values. Errors
    /// sink last and are reported; blanks lead ascending. Returns the
    /// visible row order after the sort.
    @discardableResult
    public func sort(sheet: Int, col: Int, ascending: Bool, rowCount: Int) -> [Int] {
        var v = view(for: sheet)
        let rows = (v.order ?? Array(0..<rowCount)).filter { !v.hidden.contains($0) }
        // (model row, error flag, direction rank, numeric key, string
        // key). Errors always sink (research 9.4). Ascending follows the
        // Core total order blank < number < string < bool; descending puts
        // numbers first, then text, then blanks, mirroring grid convention.
        // Within a rank values run with the direction; the model-row tail
        // keeps ties deterministic and the stable sort preserves pre-sort
        // order for full ties.
        let ranked = rows.map { row -> (Int, Int, Int, Double, String) in
            switch self.workbook.values[Addr(sheet: sheet, col: col, row: row)] ?? .blank {
            case .blank: return (row, 0, ascending ? 0 : 3, 0, "")
            case .err: return (row, 1, 0, 0, "")
            case .num(let x): return (row, 0, 1, x, "")
            case .str(let s): return (row, 0, 2, 0, s)
            case .bool(let b): return (row, 0, ascending ? 3 : 2, b ? 1 : 0, "")
            }
        }
        let sorted = ranked.sorted {
            if $0.1 != $1.1 { return $0.1 < $1.1 }
            if $0.2 != $1.2 { return $0.2 < $1.2 }
            if $0.3 != $1.3 { return ascending ? $0.3 < $1.3 : $0.3 > $1.3 }
            if $0.4 != $1.4 { return ascending ? $0.4 < $1.4 : $0.4 > $1.4 }
            return $0.0 < $1.0
        }.map(\.0)
        v.order = sorted
        v.sort = SortSpec(col: col, ascending: ascending)
        views[sheet] = v
        return visibleRows(sheet: sheet, rowCount: rowCount)
    }

    /// Filter one column: rows failing the rule hide. Returns visible rows.
    @discardableResult
    public func filter(sheet: Int, col: Int, rule: FilterRule?, rowCount: Int) -> [Int] {
        var v = view(for: sheet)
        v.filterCol = rule == nil ? nil : col
        v.filter = rule
        let rows = v.order ?? Array(0..<rowCount)
        v.hidden = Set(rows.filter { !passes(sheet: sheet, col: col, row: $0, rule: rule) })
        views[sheet] = v
        return visibleRows(sheet: sheet, rowCount: rowCount)
    }

    private func passes(sheet: Int, col: Int, row: Int, rule: FilterRule?) -> Bool {
        guard let rule else { return true }
        let val = workbook.values[Addr(sheet: sheet, col: col, row: row)] ?? .blank
        switch rule {
        case .hideBlank: return !val.isBlank
        case .textContains(let q):
            if case .str(let s) = val { return s.contains(q) }
            return false
        case .numberGreaterThan(let x):
            if case .num(let n) = val { return n > x }
            return false
        case .numberLessThan(let x):
            if case .num(let n) = val { return n < x }
            return false
        }
    }

    /// View position -> model row for visible rows.
    public func visibleRows(sheet: Int, rowCount: Int) -> [Int] {
        let v = view(for: sheet)
        let rows = v.order ?? Array(0..<rowCount)
        return rows.filter { !v.hidden.contains($0) }
    }

    public func clearView(sheet: Int) {
        views.removeValue(forKey: sheet)
    }
}
