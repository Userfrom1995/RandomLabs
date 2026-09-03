/// Inspector queries over the live workbook (Phase 4, additive).
///
/// The grid inspector shows, per cell, its source text, display string,
/// precedent and dependent addresses, topological rank, and the recorded
/// cycle path when the cell evaluates to `#CYCLE!`. All queries rebuild the
/// `DepGraph` from current formulas exactly like `recalc` does, so the
/// inspector can never disagree with evaluation. Nothing here mutates the
/// workbook and nothing triggers recalculation.
import Foundation

/// Read-only inspector snapshot for one address.
public struct InspectorInfo: Sendable {
    public var addr: Addr
    /// Raw source text: formula source (with leading `=`), literal rendering
    /// (`'`-prefixed for forced text, `TRUE`/`FALSE`, General numbers), or
    /// `""` for blank.
    public var source: String
    /// Style-aware display string (same as the Bridge `d` payload).
    public var display: String
    public var value: Value
    public var isFormula: Bool
    /// 0-based formula-bar position of a parse failure, if any.
    public var parseErrorPos: Int?
    /// Sorted precedent addresses (empty for literals and blanks).
    public var precedents: [Addr]
    /// Sorted dependent formula addresses.
    public var dependents: [Addr]
    /// Index in the full-workbook Kahn order; nil for non-formula cells and
    /// for cells stuck in cycles (residue).
    public var topoRank: Int?
    /// First recorded cycle path containing this address, if any.
    public var cyclePath: [Addr]?

    public init(
        addr: Addr, source: String, display: String, value: Value,
        isFormula: Bool, parseErrorPos: Int? = nil,
        precedents: [Addr] = [], dependents: [Addr] = [],
        topoRank: Int? = nil, cyclePath: [Addr]? = nil
    ) {
        self.addr = addr
        self.source = source
        self.display = display
        self.value = value
        self.isFormula = isFormula
        self.parseErrorPos = parseErrorPos
        self.precedents = precedents
        self.dependents = dependents
        self.topoRank = topoRank
        self.cyclePath = cyclePath
    }
}

extension Workbook {
    /// Raw source text of a stored cell for the formula bar.
    public func sourceText(sheet: Int, col: Int, row: Int) -> String {
        switch cell(sheet: sheet, col: col, row: row).content {
        case .blank: return ""
        case .num(let x): return formatGeneral(x)
        case .text(let s): return "'" + s
        case .bool(let b): return b ? "TRUE" : "FALSE"
        case .formula(let src, _, _): return src
        }
    }

    /// Full-workbook Kahn emission order (formulas only). The inspector
    /// derives ranks from this; residue cells are cyclic and rank nil.
    public func topoOrderAll() -> (order: [Addr], residue: Set<Addr>) {
        let fmap = formulaMap()
        let graph = DepGraph(formulas: fmap, resolver: resolver())
        return graph.kahnOrder(dirty: Set(fmap.keys))
    }

    /// Inspector snapshot for one address. Pure: no mutation, no recalc.
    public func inspect(_ addr: Addr) -> InspectorInfo {
        let fmap = formulaMap()
        let res = resolver()
        let graph = DepGraph(formulas: fmap, resolver: res)
        let val = values[addr] ?? .blank
        let pos = CellPos(col: addr.col, row: addr.row)
        let stored: Cell = sheets.indices.contains(addr.sheet)
            ? (sheets[addr.sheet].cells[pos] ?? Cell()) : Cell()
        var isFormula = false
        var parsePos: Int? = nil
        switch stored.content {
        case .formula(_, let e, let p):
            isFormula = true
            if e == nil { parsePos = p }
        default: break
        }
        let prec = (graph.precedents[addr] ?? []).sorted()
        let dep = (graph.dependents[addr] ?? []).sorted()
        let (order, _) = graph.kahnOrder(dirty: Set(fmap.keys))
        var rank: Int? = nil
        if fmap[addr] != nil {
            rank = order.firstIndex(of: addr)
        }
        let path = lastCyclePaths.first { $0.contains(addr) }
        return InspectorInfo(
            addr: addr,
            source: sourceText(sheet: addr.sheet, col: addr.col, row: addr.row),
            display: display(at: addr),
            value: val,
            isFormula: isFormula,
            parseErrorPos: parsePos,
            precedents: prec,
            dependents: dep,
            topoRank: rank,
            cyclePath: path
        )
    }
}
