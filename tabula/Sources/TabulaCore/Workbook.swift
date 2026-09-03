/// Workbook model: sheets, names, recalculation, structural edits,
/// copy/paste and fill (research 8, normative).
///
/// Cells store source text plus the parsed AST; formulas persist as source and
/// rebuild on load (Codecs.swift). Recalculation rebuilds the `DepGraph` from
/// current formulas and follows research 5.3 exactly: dirty closure over
/// dependent edges union volatiles, Kahn restricted to the dirty subgraph,
/// single evaluation pass in emitted order, unemitted residue plus the
/// DFS-tainted set evaluate to `#CYCLE!` with the recorded path kept for the
/// inspector (`lastCyclePaths`).
import Foundation

/// Structural edits (research 8.3) are implemented as one remap primitive:
/// every stored ref is resolved to its old target, the target is moved by the
/// edit (nil when deleted), and the authored coordinates are re-derived so
/// that resolution follows the moved target while the printed notation keeps
/// its `$`/R1C1 flags. Single-cell refs into a deleted span become sticky
/// `#REF!` (`dangling`, cleared only by `undo()`); range endpoints clamp to
/// the span start so a range that loses members keeps its endpoints shifted.
/// Sheet deletion taints all refs resolving into it. Host relocation (cells
/// that move because of the edit) shifts the parse-time base together with
/// the authored coordinates, so relative resolution is stable across moves.
///
/// Copy/paste and fill (research 8.4): relative axes translate by the
/// (dst - src) vector (authored and base shift together), absolute axes stay.
/// `previewPaste`/`previewFill` compute the result without committing.
public struct CellPos: Hashable, Sendable, Codable {
    public var col: Int
    public var row: Int
    public init(col: Int, row: Int) {
        self.col = col
        self.row = row
    }
}

public enum CellContent: Hashable, Sendable {
    case blank
    case num(Double)
    case text(String)
    case bool(Bool)
    /// Formula with source text; `expr` nil means a parse error (evaluates to
    /// `#VALUE!` with the 0-based `parsePos` for the formula bar).
    case formula(source: String, expr: Expr?, parsePos: Int?)
}

public struct Cell: Hashable, Sendable {
    public var content: CellContent
    public init(content: CellContent = .blank) {
        self.content = content
    }
}

public struct Sheet: Hashable, Sendable {
    public var name: String
    public var cells: [CellPos: Cell]
    public init(name: String, cells: [CellPos: Cell] = [:]) {
        self.name = name
        self.cells = cells
    }
}

/// Workbook-global named target (research 8.2). `dangling` means the target
/// was deleted: use sites evaluate to `#REF!` (via errLit substitution at
/// recalc time, since the evaluator has no other `#REF!`-for-names path).
public enum NameTarget: Hashable, Sendable {
    case cells([Addr])
    case dangling
}

/// Axis for structural edits.
public enum StructAxis: Hashable, Sendable {
    case row, col
}

/// Undo frame: full cell + name snapshot before a structural edit (research
/// 8.3 "undo restores only via undo stack, never auto"). Values are NOT
/// stored: `undo()` restores sources and runs a full recalc.
struct UndoFrame: Sendable {
    var sheets: [Sheet]
    var names: [String: NameTarget]
}

// Box for the single-threaded ordered evaluation pass. `Evaluator.eval`
// requires an `@Sendable` lookup closure, but the value map grows as ordered
// cells complete; a reference box keeps lookup O(1) without per-cell copies.
final class ValueBox: @unchecked Sendable {
    var map: [Addr: Value]
    init(_ map: [Addr: Value]) {
        self.map = map
    }
}

public struct Workbook: Sendable {
    public var sheets: [Sheet]
    /// Uppercased name keys (case-insensitive, research 8.2).
    public var names: [String: NameTarget]
    public var todaySerial: Int
    public private(set) var values: [Addr: Value]
    /// Recorded cycle paths from the last recalc, for the inspector UI.
    public private(set) var lastCyclePaths: [[Addr]]
    /// Opaque style records by address; writes never trigger recalc.
    public var styles: [Addr: StyleRecord]
    var undoStack: [UndoFrame]

    public init(todaySerial: Int = 0) {
        self.sheets = [Sheet(name: "Sheet1")]
        self.names = [:]
        self.todaySerial = todaySerial
        self.values = [:]
        self.lastCyclePaths = []
        self.styles = [:]
        self.undoStack = []
    }

    // MARK: - sheets

    public func sheetIndex(of name: String) -> Int? {
        sheets.firstIndex { $0.name.uppercased() == name.uppercased() }
    }

    public mutating func addSheet(name: String) {
        guard sheetIndex(of: name) == nil else { return }
        sheets.append(Sheet(name: name))
    }

    /// Rename a sheet. Refs qualified with the old name keep pointing at the
    /// renamed sheet (qualifier text follows); refs with missing sheets that
    /// match the new name resolve again (research 8.2 re-resolve on rename).
    public mutating func renameSheet(from old: String, to new: String) {
        guard let idx = sheetIndex(of: old), sheetIndex(of: new) == nil else {
            return
        }
        pushUndo()
        sheets[idx].name = new
        for s in sheets.indices {
            for (pos, cell) in sheets[s].cells {
                guard case .formula(let src, .some(let e), _) = cell.content
                else { continue }
                let host = Addr(sheet: s, col: pos.col, row: pos.row)
                let mapped = Self.remapRename(
                    e, oldName: old, newName: new, newIndex: idx,
                    sheetCount: sheets.count, host: host
                )
                if mapped != e {
                    sheets[s].cells[pos] = Cell(content: .formula(
                        source: src, expr: mapped, parsePos: nil
                    ))
                }
            }
        }
        recalcAll()
    }

    /// Delete a sheet. Cells on it vanish; hosts on later sheets shift down;
    /// every ref resolving into the deleted sheet becomes sticky `#REF!`.
    public mutating func deleteSheet(at index: Int) {
        guard sheets.indices.contains(index), sheets.count > 1 else { return }
        pushUndo()
        let dropName = sheets[index].name
        sheets.remove(at: index)
        _ = dropName
        // Only qualified refs need remapping: unqualified refs follow their
        // host sheet implicitly (hosts on later sheets already shifted with
        // the array removal above).
        remapAllRefs(
            { ref, host in
                Self.remapSheetDelete(ref, host: host, deleted: index)
            },
            range: { rr, host in
                RangeRef(
                    lo: Self.remapSheetDelete(
                        rr.lo, host: host, deleted: index
                    ),
                    hi: Self.remapSheetDelete(
                        rr.hi, host: host, deleted: index
                    )
                ).normalized()
            }
        )
        // Name targets on the deleted sheet taint; later sheets shift.
        for key in names.keys {
            switch names[key] {
            case .cells(let addrs):
                var kept: [Addr] = []
                for a in addrs {
                    if a.sheet == index { continue }
                    kept.append(Addr(
                        sheet: a.sheet > index ? a.sheet - 1 : a.sheet,
                        col: a.col, row: a.row
                    ))
                }
                names[key] = kept.isEmpty ? .dangling : .cells(kept)
            case .dangling, .none:
                break
            }
        }
        // Drop values/styles on the deleted sheet, shift later sheets.
        values = Dictionary(
            uniqueKeysWithValues: values.compactMap { (k, v) in
                if k.sheet == index { return nil as (Addr, Value)? }
                let nk = k.sheet > index
                    ? Addr(sheet: k.sheet - 1, col: k.col, row: k.row) : k
                return (nk, v)
            }
        )
        styles = Dictionary(
            uniqueKeysWithValues: styles.compactMap { (k, v) in
                if k.sheet == index { return nil as (Addr, StyleRecord)? }
                let nk = k.sheet > index
                    ? Addr(sheet: k.sheet - 1, col: k.col, row: k.row) : k
                return (nk, v)
            }
        )
        recalcAll()
    }

    // MARK: - names

    /// Define a workbook-global name. Rejects empty names, names shaped like
    /// cell addresses (research 8.2), and names containing `!` or `:`.
    @discardableResult
    public mutating func setName(_ name: String, addrs: [Addr]) -> Bool {
        let key = name.uppercased()
        guard !key.isEmpty, !key.contains("!"), !key.contains(":"),
              !Self.isCellShaped(key)
        else { return false }
        names[key] = .cells(addrs.sorted())
        recalcAll()
        return true
    }

    public mutating func removeName(_ name: String) {
        names.removeValue(forKey: name.uppercased())
        recalcAll()
    }

    static func isCellShaped(_ key: String) -> Bool {
        var s = key
        if s.hasPrefix("$") { s = String(s.dropFirst()) }
        var li = s.startIndex
        while li < s.endIndex, s[li].isLetter { li = s.index(after: li) }
        guard li > s.startIndex else { return false }
        var rest = String(s[li...])
        if rest.hasPrefix("$") { rest = String(rest.dropFirst()) }
        guard let n = Int(rest), n >= 1 else { return false }
        return ColumnCodec.decode(String(s[s.startIndex..<li])) != nil
            && n <= TabulaCore.maxRows
    }

    // MARK: - cell editing

    /// Store raw user input with entry-time coercion (research 9.1): leading
    /// `=` parses as a formula (failures keep source, evaluate `#VALUE!`);
    /// leading `'` forces text; `TRUE`/`FALSE` (trimmed, case-insensitive)
    /// become bools; General-grammar numbers become numbers; else text.
    /// Empty input clears the cell.
    public mutating func setCell(
        sheet: Int, col: Int, row: Int, raw: String
    ) {
        guard sheets.indices.contains(sheet) else { return }
        let pos = CellPos(col: col, row: row)
        if raw.isEmpty {
            sheets[sheet].cells.removeValue(forKey: pos)
            return
        }
        if raw.hasPrefix("=") {
            let host = Addr(sheet: sheet, col: col, row: row)
            let sheetsArg = ParseSheets.list(sheets.map(\.name))
            switch FormulaParser.parse(raw, host: host, sheets: sheetsArg) {
            case .success(let e):
                sheets[sheet].cells[pos] = Cell(content: .formula(
                    source: raw, expr: e, parsePos: nil
                ))
            case .failure(let err):
                sheets[sheet].cells[pos] = Cell(content: .formula(
                    source: raw, expr: nil, parsePos: err.pos
                ))
            }
            return
        }
        if raw.hasPrefix("'") {
            sheets[sheet].cells[pos] = Cell(content: .text(
                String(raw.dropFirst())
            ))
            return
        }
        let t = raw.trimmingCharacters(in: .whitespaces)
        if t.caseInsensitiveCompare("TRUE") == .orderedSame {
            sheets[sheet].cells[pos] = Cell(content: .bool(true))
            return
        }
        if t.caseInsensitiveCompare("FALSE") == .orderedSame {
            sheets[sheet].cells[pos] = Cell(content: .bool(false))
            return
        }
        if let v = parseGeneralNumber(t) {
            sheets[sheet].cells[pos] = Cell(content: .num(v))
            return
        }
        sheets[sheet].cells[pos] = Cell(content: .text(raw))
    }

    /// Edit one cell and run the minimal recalc for it. Returns the new value.
    @discardableResult
    public mutating func edit(
        sheet: Int, col: Int, row: Int, raw: String
    ) -> Value {
        setCell(sheet: sheet, col: col, row: row, raw: raw)
        let a = Addr(sheet: sheet, col: col, row: row)
        recalc(edits: [a])
        return values[a] ?? .blank
    }

    public func cell(sheet: Int, col: Int, row: Int) -> Cell {
        guard sheets.indices.contains(sheet) else { return Cell() }
        return sheets[sheet].cells[CellPos(col: col, row: row)] ?? Cell()
    }

    public func value(at addr: Addr) -> Value {
        values[addr] ?? .blank
    }

    // MARK: - recalculation

    /// Static resolver over current sheet names plus live name targets.
    /// Dangling/empty names resolve to nil; `formulaMap()` substitutes those
    /// use sites with `#REF!` literals before graph build, so the evaluator
    /// (which maps unknown names to `#NAME?`) never sees them.
    func resolver() -> StaticResolver {
        let list = sheets.map(\.name)
        let nameMap = names
        return StaticResolver(
            sheetIndex: { want in
                list.firstIndex { $0.uppercased() == want.uppercased() }
            },
            nameAddrs: { key in
                guard case .cells(let a) = nameMap[key.uppercased()],
                      !a.isEmpty
                else { return nil }
                return a
            }
        )
    }

    /// True for names that are defined but currently unusable (deleted target
    /// or emptied): use sites become `#REF!` per research 8.2.
    func nameIsTainted(_ upper: String) -> Bool {
        guard let t = names[upper] else { return false }
        if case .cells(let a) = t { return a.isEmpty }
        return true
    }

    /// Formula ASTs with tainted-name use sites substituted by `#REF!`.
    func formulaMap() -> [Addr: Expr] {
        var out: [Addr: Expr] = [:]
        for s in sheets.indices {
            for (pos, cell) in sheets[s].cells {
                guard case .formula(_, .some(let e), _) = cell.content else {
                    continue
                }
                let host = Addr(sheet: s, col: pos.col, row: pos.row)
                out[host] = e.substitutingTaintedNames(isTainted: nameIsTainted)
            }
        }
        return out
    }

    /// Literal (non-formula) value of a stored cell. Parse-error formulas are
    /// `#VALUE!` sources; they contribute no graph edges.
    static func literalValue(_ cell: Cell) -> Value? {
        switch cell.content {
        case .blank: return .blank
        case .num(let x): return .num(x)
        case .text(let s): return .str(s)
        case .bool(let b): return .bool(b)
        case .formula(_, .none, _): return .err(.value)
        case .formula: return nil
        }
    }

    /// Minimal recalc over `edits` (research 5.3). Volatile cells join every
    /// pass via `dirtyClosure`; residue plus the DFS-tainted set become
    /// `#CYCLE!` with paths recorded for the inspector.
    public mutating func recalc(edits: Set<Addr>) {
        let fmap = formulaMap()
        let res = resolver()
        let graph = DepGraph(formulas: fmap, resolver: res)
        let (tainted, paths) = graph.detectCycles()
        lastCyclePaths = paths.sorted { $0.lexicographicallyPrecedes($1) }
        let dirty = graph.dirtyClosure(edits: edits)
        let (order, residue) = graph.kahnOrder(dirty: dirty)
        let box = ValueBox(values)
        // Seed literals fresh (they may have changed); purge vanished cells.
        var next: [Addr: Value] = [:]
        next.reserveCapacity(values.count + 16)
        for s in sheets.indices {
            for (pos, cell) in sheets[s].cells {
                if let lit = Self.literalValue(cell) {
                    next[Addr(sheet: s, col: pos.col, row: pos.row)] = lit
                }
            }
        }
        // Carry untouched formula values; drop dirty ones for recompute.
        for (a, v) in values where fmap[a] != nil && !dirty.contains(a) {
            if next[a] == nil { next[a] = v }
        }
        box.map = next
        let today = todaySerial
        for a in order {
            guard let e = fmap[a] else { continue }
            let host = a
            let got = Evaluator.eval(
                e, host: host,
                lookup: { box.map[$0] ?? .blank },
                resolver: res, todaySerial: today
            )
            box.map[a] = got
        }
        let cycled = tainted.intersection(dirty).union(residue)
        for a in cycled { box.map[a] = .err(.cycle) }
        values = box.map
    }

    /// Full recalc over every stored cell.
    public mutating func recalcAll() {
        var all = Set<Addr>()
        for s in sheets.indices {
            for pos in sheets[s].cells.keys {
                all.insert(Addr(sheet: s, col: pos.col, row: pos.row))
            }
        }
        recalc(edits: all)
    }

    // MARK: - structural edits (research 8.3)

    mutating func pushUndo() {
        undoStack.append(UndoFrame(sheets: sheets, names: names))
        if undoStack.count > 64 { undoStack.removeFirst() }
    }

    /// Undo the last structural edit: sources restore exactly (names, sheet
    /// names, formulas with notation flags), then a full recalc re-derives
    /// values. Returns false when the stack is empty.
    @discardableResult
    public mutating func undo() -> Bool {
        guard let frame = undoStack.popLast() else { return false }
        sheets = frame.sheets
        names = frame.names
        recalcAll()
        return true
    }

    public mutating func insertRows(sheet s: Int, at: Int, count: Int) {
        guard sheets.indices.contains(s), count > 0, at >= 0 else { return }
        pushUndo()
        shiftCells(sheet: s, axis: .row, at: at, delta: count)
        remapAxisRefs(sheet: s, axis: .row, at: at, count: 0, delta: count)
        recalcAll()
    }

    public mutating func deleteRows(sheet s: Int, at: Int, count: Int) {
        guard sheets.indices.contains(s), count > 0, at >= 0 else { return }
        pushUndo()
        dropCells(sheet: s, axis: .row, at: at, count: count)
        shiftCells(sheet: s, axis: .row, at: at + count, delta: -count)
        remapAxisRefs(sheet: s, axis: .row, at: at, count: count, delta: -count)
        recalcAll()
    }

    public mutating func insertCols(sheet s: Int, at: Int, count: Int) {
        guard sheets.indices.contains(s), count > 0, at >= 0 else { return }
        pushUndo()
        shiftCells(sheet: s, axis: .col, at: at, delta: count)
        remapAxisRefs(sheet: s, axis: .col, at: at, count: 0, delta: count)
        recalcAll()
    }

    public mutating func deleteCols(sheet s: Int, at: Int, count: Int) {
        guard sheets.indices.contains(s), count > 0, at >= 0 else { return }
        pushUndo()
        dropCells(sheet: s, axis: .col, at: at, count: count)
        shiftCells(sheet: s, axis: .col, at: at + count, delta: -count)
        remapAxisRefs(sheet: s, axis: .col, at: at, count: count, delta: -count)
        recalcAll()
    }

    /// Move stored cells at/after `at` along `axis` by `delta`, shifting the
    /// parse-time base of moved formulas (and ONLY the base) so relative
    /// resolution is invariant under the host's own move: with
    /// `resolve = authored - base + host`, shifting base and host together
    /// keeps the target fixed. Target tracking is the remap pass's job, which
    /// shifts authored coordinates only. Dangling refs are frozen.
    mutating func shiftCells(sheet s: Int, axis: StructAxis, at: Int, delta: Int) {
        guard delta != 0 else { return }
        var next: [CellPos: Cell] = [:]
        next.reserveCapacity(sheets[s].cells.count)
        for (pos, cell) in sheets[s].cells {
            let k = axis == .row ? pos.row : pos.col
            guard k >= at else {
                next[pos] = cell
                continue
            }
            let nk = k + delta
            guard nk >= 0 else { continue }
            let npos = axis == .row
                ? CellPos(col: pos.col, row: nk) : CellPos(col: nk, row: pos.row)
            next[npos] = shiftHostCell(cell, axis: axis, by: delta)
        }
        sheets[s].cells = next
    }

    /// Drop cells strictly inside a deleted span.
    mutating func dropCells(sheet s: Int, axis: StructAxis, at: Int, count: Int) {
        var doomed: [CellPos] = []
        for (pos, _) in sheets[s].cells {
            let k = axis == .row ? pos.row : pos.col
            if k >= at && k < at + count { doomed.append(pos) }
        }
        for pos in doomed { sheets[s].cells.removeValue(forKey: pos) }
    }

    /// Shift the parse-time base of a moved formula's refs (host relocation).
    /// Authored coordinates are untouched: the remap pass owns them. Range
    /// endpoints shift their bases too, or resolution drifts after the move.
    func shiftHostCell(_ cell: Cell, axis: StructAxis, by d: Int) -> Cell {
        guard case .formula(let src, .some(let e), _) = cell.content else {
            return cell
        }
        let mapped = e.mappingRefs(
            ref: { $0.shiftedHost(axis: axis, by: d) },
            range: {
                RangeRef(
                    lo: $0.lo.shiftedHost(axis: axis, by: d),
                    hi: $0.hi.shiftedHost(axis: axis, by: d)
                )
            }
        )
        if mapped == e { return cell }
        return Cell(content: .formula(source: src, expr: mapped, parsePos: nil))
    }

    mutating func remapAllRefs(
        _ f: @escaping (CellRef, Addr) -> CellRef,
        range fR: @escaping (RangeRef, Addr) -> RangeRef = { r, _ in r }
    ) {
        for s in sheets.indices {
            for (pos, cell) in sheets[s].cells {
                guard case .formula(let src, .some(let e), _) = cell.content
                else { continue }
                let host = Addr(sheet: s, col: pos.col, row: pos.row)
                let mapped = e.mappingRefs(
                    ref: { f($0, host) }, range: { fR($0, host) }
                )
                if mapped != e {
                    sheets[s].cells[pos] = Cell(content: .formula(
                        source: src, expr: mapped, parsePos: nil
                    ))
                }
            }
        }
    }

    /// Axis remap over refs AND range endpoints (ranges clamp, singles taint).
    mutating func remapAxisRefs(
        sheet s: Int, axis: StructAxis, at: Int, count: Int, delta: Int
    ) {
        remapAllRefs(
            { ref, host in
                Self.remapAxis(ref, host: host, sheet: s, axis: axis,
                               at: at, count: count, delta: delta)
            },
            range: { rr, host in
                Self.remapRangeAxis(rr, host: host, sheet: s, axis: axis,
                                    at: at, count: count, delta: delta)
            }
        )
    }

    // MARK: - copy/paste and fill (research 8.4)

    /// Paste translation of one expression by `(dc, dr)`: relative axes shift
    /// authored and base together (resolution follows the paste), absolute
    /// axes stay (resolution fixed). The paste-delta law commutes with
    /// resolve: `resolve(translate(r,d), host+d) == resolve(r,host) + d` for
    /// relative axes, pinned by a Phase 3 property test.
    public static func translatePaste(
        _ e: Expr, dc: Int, dr: Int
    ) -> Expr {
        e.mappingRefs(
            ref: {
                var c = $0
                if !c.colAbs { c.col += dc; c.baseCol += dc }
                if !c.rowAbs { c.row += dr; c.baseRow += dr }
                return c
            },
            range: { rr in
                func shifted(_ c: CellRef) -> CellRef {
                    var m = c
                    if !m.colAbs { m.col += dc; m.baseCol += dc }
                    if !m.rowAbs { m.row += dr; m.baseRow += dr }
                    return m
                }
                return RangeRef(lo: shifted(rr.lo), hi: shifted(rr.hi))
            }
        )
    }

    /// Preview a paste without committing: new source strings by destination.
    /// Formulas reprint via `toFormulaString()` (notation flags preserved).
    public func previewPaste(
        srcSheet: Int, src: RangeRect, dstSheet: Int, dst: CellPos
    ) -> [(Addr, String)] {
        guard sheets.indices.contains(srcSheet),
              sheets.indices.contains(dstSheet)
        else { return [] }
        let dc = dst.col - src.loCol
        let dr = dst.row - src.loRow
        var out: [(Addr, String)] = []
        for r in src.loRow...src.hiRow {
            for c in src.loCol...src.hiCol {
                guard let cell = sheets[srcSheet].cells[CellPos(col: c, row: r)]
                else { continue }
                let na = Addr(sheet: dstSheet, col: c + dc, row: r + dr)
                guard na.isInBounds else { continue }
                switch cell.content {
                case .formula(let srcText, .some(let e), _):
                    let t = Self.translatePaste(e, dc: dc, dr: dr)
                    _ = srcText
                    out.append((na, t.toFormulaString()))
                case .formula(let srcText, .none, _):
                    out.append((na, srcText))
                case .num(let x):
                    out.append((na, formatGeneral(x)))
                case .text(let s): out.append((na, "'" + s))
                case .bool(let b): out.append((na, b ? "TRUE" : "FALSE"))
                case .blank: break
                }
            }
        }
        return out
    }

    /// Commit a paste previewed by `previewPaste`.
    public mutating func paste(
        srcSheet: Int, src: RangeRect, dstSheet: Int, dst: CellPos
    ) {
        let items = previewPaste(
            srcSheet: srcSheet, src: src, dstSheet: dstSheet, dst: dst
        )
        var edited = Set<Addr>()
        for (a, raw) in items {
            setCell(sheet: a.sheet, col: a.col, row: a.row, raw: raw)
            edited.insert(a)
        }
        recalc(edits: edited)
    }

    /// Fill `count` cells along `axis` from the `src` block. Literal atoms go
    /// through `Series.extend` (pure preview); formulas translate by paste law
    /// along the drag vector. Returns the preview without committing.
    public func previewFill(
        sheet s: Int, src: [CellPos], axis: StructAxis, count: Int
    ) -> [(CellPos, String)] {
        guard sheets.indices.contains(s), count > 0, !src.isEmpty else {
            return []
        }
        let ordered = src.sorted {
            axis == .row ? $0.row < $1.row : $0.col < $1.col
        }
        // Literal series from the block's literal atoms in order.
        var atoms: [FillAtom] = []
        for p in ordered {
            switch sheets[s].cells[p]?.content {
            case .num(let x): atoms.append(.num(x))
            case .text(let t): atoms.append(.text(t))
            case .bool(let b): atoms.append(.bool(b))
            default: atoms.append(.blank)
            }
        }
        let grown = Series.extend(atoms, count: count)
        let last = ordered.last!
        var out: [(CellPos, String)] = []
        for k in 0..<count {
            let np = axis == .row
                ? CellPos(col: last.col, row: last.row + k + 1)
                : CellPos(col: last.col + k + 1, row: last.row)
            // Formula fill wins when the source tail cell holds a formula:
            // translate it along the drag vector per cell.
            if case .formula(_, .some(let e), _) = sheets[s].cells[last]?.content {
                let t = axis == .row
                    ? Self.translatePaste(e, dc: 0, dr: k + 1)
                    : Self.translatePaste(e, dc: k + 1, dr: 0)
                out.append((np, t.toFormulaString()))
                continue
            }
            switch grown[k] {
            case .num(let x): out.append((np, formatGeneral(x)))
            case .text(let t): out.append((np, t))
            case .bool(let b): out.append((np, b ? "TRUE" : "FALSE"))
            case .blank: break
            }
        }
        return out
    }

    public mutating func fill(
        sheet s: Int, src: [CellPos], axis: StructAxis, count: Int
    ) {
        let items = previewFill(sheet: s, src: src, axis: axis, count: count)
        var edited = Set<Addr>()
        for (p, raw) in items {
            setCell(sheet: s, col: p.col, row: p.row, raw: raw)
            edited.insert(Addr(sheet: s, col: p.col, row: p.row))
        }
        recalc(edits: edited)
    }

    // MARK: - styles (never trigger recalc)

    public mutating func setStyle(_ style: StyleRecord, at addr: Addr) {
        styles[addr] = style
    }

    public func style(at addr: Addr) -> StyleRecord {
        styles[addr] ?? .default
    }

    public func display(at addr: Addr) -> String {
        Format.display(values[addr] ?? .blank, as: style(at: addr).numberFormat)
    }
}

// MARK: - ref remapping primitives

extension CellRef {
    /// Host-relocation shift: ONLY the parse-time base moves on relative
    /// axes, so `authored - base + host` is invariant under the host's own
    /// move. Authored coordinates belong to the target-tracking remap pass.
    /// Dangling refs are frozen (sticky `#REF!`, cleared only by undo).
    func shiftedHost(axis: StructAxis, by d: Int) -> CellRef {
        if dangling { return self }
        var c = self
        if axis == .col, !c.colAbs { c.baseCol += d }
        if axis == .row, !c.rowAbs { c.baseRow += d }
        return c
    }
}

extension Expr {
    /// Map every `CellRef` (both endpoints of ranges) through `f`/`fR`.
    /// Single primitive: callers pass both closures explicitly so overload
    /// resolution can never self-recurse.
    func mappingRefs(
        ref f: (CellRef) -> CellRef,
        range fR: (RangeRef) -> RangeRef
    ) -> Expr {
        switch self {
        case .num, .str, .bool, .name, .errLit:
            return self
        case .ref(let r):
            return .ref(f(r))
        case .range(let rr):
            return .range(fR(rr))
        case .call(let fn, let args):
            return .call(fn, args.map {
                $0.mappingRefs(ref: f, range: fR)
            })
        case .unary(let op, let e):
            return .unary(op, e.mappingRefs(ref: f, range: fR))
        case .binary(let op, let l, let r):
            return .binary(op, l.mappingRefs(ref: f, range: fR),
                           r.mappingRefs(ref: f, range: fR))
        case .percent(let e):
            return .percent(e.mappingRefs(ref: f, range: fR))
        case .arrayConst(let rows):
            return .arrayConst(rows.map { row in
                row.map { $0.mappingRefs(ref: f, range: fR) }
            })
        }
    }

    /// Substitute use sites of tainted (defined-but-deleted) names with
    /// `#REF!` literals so they evaluate per research 8.2.
    func substitutingTaintedNames(
        isTainted: (String) -> Bool
    ) -> Expr {
        switch self {
        case .name(let n) where isTainted(n.uppercased()):
            return .errLit(.ref)
        case .call(let fn, let args):
            return .call(fn, args.map {
                $0.substitutingTaintedNames(isTainted: isTainted)
            })
        case .unary(let op, let e):
            return .unary(op, e.substitutingTaintedNames(isTainted: isTainted))
        case .binary(let op, let l, let r):
            return .binary(
                op,
                l.substitutingTaintedNames(isTainted: isTainted),
                r.substitutingTaintedNames(isTainted: isTainted)
            )
        case .percent(let e):
            return .percent(e.substitutingTaintedNames(isTainted: isTainted))
        case .arrayConst(let rows):
            return .arrayConst(rows.map { row in
                row.map { $0.substitutingTaintedNames(isTainted: isTainted) }
            })
        default:
            return self
        }
    }
}

extension Workbook {
    /// Axis remap of one ref: resolve to the old target, move it by the edit,
    /// re-derive authored coordinates. Single refs into a deleted span taint
    /// sticky; range endpoints clamp to the span start (research 8.3).
    static func remapAxis(
        _ ref: CellRef, host: Addr, sheet s: Int, axis: StructAxis,
        at: Int, count: Int, delta: Int
    ) -> CellRef {
        if ref.dangling { return ref }
        guard let old = ref.resolve(host: host) else { return ref }
        // Only refs targeting the edited sheet move.
        guard old.sheet == s else { return ref }
        let k = axis == .row ? old.row : old.col
        if delta < 0, k >= at, k < at + count {
            var c = ref
            c.dangling = true
            return c
        }
        let nk: Int
        if delta > 0 { nk = k >= at ? k + delta : k }
        else { nk = k >= at + count ? k + delta : k }
        return rederive(ref, host: host, targetSheet: old.sheet,
                        targetCol: axis == .col ? nk : old.col,
                        targetRow: axis == .row ? nk : old.row)
    }

    static func remapRangeAxis(
        _ rr: RangeRef, host: Addr, sheet s: Int, axis: StructAxis,
        at: Int, count: Int, delta: Int
    ) -> RangeRef {
        let lo = clampRemap(
            rr.lo, host: host, sheet: s, axis: axis,
            at: at, count: count, delta: delta
        )
        let hi = clampRemap(
            rr.hi, host: host, sheet: s, axis: axis,
            at: at, count: count, delta: delta
        )
        return RangeRef(lo: lo, hi: hi).normalized()
    }

    /// Endpoint remap with clamping: endpoints inside a deleted span land on
    /// the span start instead of tainting, so a range that loses members
    /// keeps shifted endpoints (research 8.3). Corner: clamping can pull the
    /// host cell itself inside its own range (the formula's row moved into
    /// the span). That is a genuine self-cycle and evaluates to `#CYCLE!`
    /// with a recorded path, which the inspector surfaces; only `undo()`
    /// restores the pre-delete sources.
    static func clampRemap(
        _ ref: CellRef, host: Addr, sheet s: Int, axis: StructAxis,
        at: Int, count: Int, delta: Int
    ) -> CellRef {
        if ref.dangling { return ref }
        guard let old = ref.resolve(host: host) else { return ref }
        guard old.sheet == s else { return ref }
        let k = axis == .row ? old.row : old.col
        var nk = k
        if delta > 0 { nk = k >= at ? k + delta : k }
        else if k >= at, k < at + count { nk = at }
        else if k >= at + count { nk = k + delta }
        return rederive(ref, host: host, targetSheet: old.sheet,
                        targetCol: axis == .col ? nk : old.col,
                        targetRow: axis == .row ? nk : old.row)
    }

    /// Re-derive authored coordinates for a moved target. Absolute axes take
    /// the target index; relative axes store `target - host + base` so that
    /// `resolve(host)` returns exactly the moved target. Notation flags and
    /// the sheet qualifier are preserved; out-of-grid targets taint sticky.
    static func rederive(
        _ ref: CellRef, host: Addr, targetSheet: Int,
        targetCol: Int, targetRow: Int
    ) -> CellRef {
        var c = ref
        if c.sheetName == nil, c.sheet != nil { c.sheet = targetSheet }
        if c.colAbs { c.col = targetCol } else {
            c.col = targetCol - host.col + c.baseCol
        }
        if c.rowAbs { c.row = targetRow } else {
            c.row = targetRow - host.row + c.baseRow
        }
        let probe = Addr(sheet: targetSheet, col: targetCol, row: targetRow)
        if !probe.isInBounds { c.dangling = true }
        return c
    }

    /// Sheet-delete remap: refs resolving into the deleted sheet taint
    /// sticky; refs onto later sheets shift down one. Unqualified refs follow
    /// their host implicitly and are never touched (their hosts already
    /// shifted with the sheet-array removal).
    static func remapSheetDelete(
        _ ref: CellRef, host: Addr, deleted: Int
    ) -> CellRef {
        if ref.dangling { return ref }
        if ref.sheetName == nil, ref.sheet == nil { return ref }
        guard let old = ref.resolve(host: host) else { return ref }
        if old.sheet == deleted {
            var c = ref
            c.dangling = true
            return c
        }
        if old.sheet > deleted {
            return rederive(ref, host: host, targetSheet: old.sheet - 1,
                            targetCol: old.col, targetRow: old.row)
        }
        return ref
    }

    /// Rename remap: qualifiers matching the old name follow the rename;
    /// missing-sheet refs matching the new name resolve again. Applies to
    /// single refs and both range endpoints (cross-sheet ranges).
    static func remapRename(
        _ e: Expr, oldName: String, newName: String, newIndex: Int,
        sheetCount: Int, host: Addr
    ) -> Expr {
        func renameRef(_ ref: CellRef) -> CellRef {
            guard let q = ref.sheetName else { return ref }
            var c = ref
            if q.uppercased() == oldName.uppercased() {
                c.sheetName = newName
                c.sheet = newIndex
            } else if c.sheet == nil,
                      q.uppercased() == newName.uppercased() {
                c.sheet = newIndex
            }
            _ = (sheetCount, host)
            return c
        }
        return e.mappingRefs(
            ref: renameRef,
            range: { RangeRef(lo: renameRef($0.lo), hi: renameRef($0.hi)) }
        )
    }
}
