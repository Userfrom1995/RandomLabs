/// References: A1/R1C1 decoding, absolute/relative resolution, ranges,
/// cross-sheet and named-range plumbing (research 8.1-8.2, normative).
///
/// Internal storage is absolute `(sheet, col, row)` per research 8.1; the
/// `$` flags record the author's axis absoluteness and `r1c1` the notation.
/// Relative axes resolve as `authored - base + host`, where the base is the
/// parse-time host (research 8.1: relative axes store the delta at parse).
/// R1C1 forms lower to the same representation: bracketed components are
/// deltas from the host, unbracketed digits are 1-based absolutes, bare
/// `R`/`C` inherits the host row/col (research 3.2 note 6).
///
/// Note: a sheet name that collides with a cell shape (`A1`, `R2C3`) must be
/// single-quoted (`'A1'!B2`); the bare form lexes as the cell or R1C1 ref.
public struct ParseSheets: Sendable {
    public var indexOf: @Sendable (String) -> Int?

    public init(indexOf: @escaping @Sendable (String) -> Int?) {
        self.indexOf = indexOf
    }

    /// No sheets known: every qualifier stays unresolved (missing sheet).
    public static var none: ParseSheets {
        ParseSheets(indexOf: { _ in nil })
    }

    /// Sheet list in index order; lookup is case-insensitive (research 8.2).
    public static func list(_ names: [String]) -> ParseSheets {
        let map = Dictionary(uniqueKeysWithValues: names.enumerated().map {
            ($1.uppercased(), $0)
        })
        return ParseSheets(indexOf: { map[$0.uppercased()] })
    }

    public func resolve(_ name: String) -> Int? { indexOf(name) }
}

/// Static graph-time resolver: sheet names plus named-range targets.
/// Named ranges are workbook-global `name -> addrs` (research 8.2); a name
/// colliding with a cell address is rejected at definition time (Workbook,
/// Phase 3), so graph lookup never confuses the two.
public struct StaticResolver: Sendable {
    public var sheetIndex: @Sendable (String) -> Int?
    public var nameAddrs: @Sendable (String) -> [Addr]?

    public init(
        sheetIndex: @escaping @Sendable (String) -> Int? = { _ in nil },
        nameAddrs: @escaping @Sendable (String) -> [Addr]? = { _ in nil }
    ) {
        self.sheetIndex = sheetIndex
        self.nameAddrs = nameAddrs
    }

    public static var empty: StaticResolver { StaticResolver() }

    public static func sheets(_ names: [String]) -> StaticResolver {
        let map = Dictionary(uniqueKeysWithValues: names.enumerated().map {
            ($1.uppercased(), $0)
        })
        return StaticResolver(sheetIndex: { map[$0.uppercased()] })
    }
}

extension CellRef {
    /// Absolute/relative resolution per research 8.1. Returns nil for sticky
    /// `#REF!` (dangling taint, missing sheet) or out-of-grid results; the
    /// evaluator maps nil to `#REF!` (research 6, `Ref(a)` rule).
    public func resolve(host: Addr) -> Addr? {
        if dangling { return nil }
        let sheet: Int
        if let name = sheetName {
            // Qualifier present but unresolved at parse: missing sheet.
            guard let s = self.sheet else { return nil }
            _ = name
            sheet = s
        } else {
            sheet = self.sheet ?? host.sheet
        }
        let col = colAbs ? col : col - baseCol + host.col
        let row = rowAbs ? row : row - baseRow + host.row
        let addr = Addr(sheet: sheet, col: col, row: row)
        guard addr.isInBounds else { return nil }
        return addr
    }

    /// Reprint in the author's original notation (flags preserved) per
    /// research 8.1. Relative axes re-derive authored coords from the base;
    /// structural edits (Phase 3) shift authored and base together so reprint
    /// stays faithful while resolution follows the span rules.
    public func toA1String() -> String {
        var s = ""
        if let name = sheetName {
            if name.allSatisfy({ $0.isLetter || $0.isNumber || $0 == "_" || $0 == "." })
                && !(name.first?.isNumber ?? false) {
                s += name + "!"
            } else {
                s += "'" + name.replacingOccurrences(of: "'", with: "''") + "'!"
            }
        }
        if r1c1 {
            s += r1c1Col() + r1c1Row()
            return s
        }
        var colPart = ColumnCodec.encode(col) ?? "#REF!"
        if colAbs { colPart = "$" + colPart }
        var rowPart = String(row + 1)
        if rowAbs { rowPart = "$" + rowPart }
        return s + colPart + rowPart
    }

    private func r1c1Col() -> String {
        if colAbs { return "C\(col + 1)" }
        let d = col - baseCol
        return d == 0 ? "C" : "C[\(d)]"
    }

    private func r1c1Row() -> String {
        if rowAbs { return "R\(row + 1)" }
        let d = row - baseRow
        return d == 0 ? "R" : "R[\(d)]"
    }
}

extension RangeRef {
    /// Resolve both corners against the host. Returns nil when either corner
    /// dangles (missing sheet, taint, out of grid); the evaluator maps nil to
    /// `#REF!`. The returned rect is normalized.
    public func resolve(host: Addr) -> RangeRect? {
        guard let a = lo.resolve(host: host), let b = hi.resolve(host: host) else {
            return nil
        }
        // Cross-sheet ranges carry one sheet (parser enforces); the lo sheet
        // wins if they disagree after edits.
        return RangeRect(
            sheet: lo.sheet ?? a.sheet,
            loCol: min(a.col, b.col), loRow: min(a.row, b.row),
            hiCol: max(a.col, b.col), hiRow: max(a.row, b.row)
        )
    }
}

/// Decode raw A1 text (`$?letters$?digits`, already validated by the lexer)
/// into a `CellRef` with parse-time host base.
public func parseA1CellRef(
    _ raw: String, host: Addr, sheet: Int? = nil, sheetName: String? = nil
) -> CellRef? {
    var s = raw
    var colAbs = false
    var rowAbs = false
    if s.hasPrefix("$") { colAbs = true; s = String(s.dropFirst()) }
    var li = s.startIndex
    while li < s.endIndex && s[li].isLetter { li = s.index(after: li) }
    let letPart = String(s[..<li])
    var rest = String(s[li...])
    if rest.hasPrefix("$") { rowAbs = true; rest = String(rest.dropFirst()) }
    guard let col = ColumnCodec.decode(letPart) else { return nil }
    guard let row1 = Int(rest), row1 >= 1 && row1 <= TabulaCore.maxRows else { return nil }
    return CellRef(
        sheet: sheet, sheetName: sheetName, col: col, row: row1 - 1,
        colAbs: colAbs, rowAbs: rowAbs, r1c1: false,
        baseCol: host.col, baseRow: host.row
    )
}

/// Decode raw R1C1 text into a `CellRef`. Bracketed components are deltas
/// from the host, unbracketed digits are 1-based absolutes, bare `R`/`C`
/// inherits the host row/col (research 3.2 note 6). Out-of-grid authored
/// coords clamp to a dangling ref (sticky `#REF!`, never a crash).
public func parseR1C1CellRef(
    _ raw: String, host: Addr, sheet: Int? = nil, sheetName: String? = nil
) -> CellRef? {
    let u = Array(raw.uppercased().utf16)
    guard !u.isEmpty && u[0] == 0x52 else { return nil }
    var k = 1
    // Row part.
    var rowAbs = false
    var rowVal = host.row
    if k < u.count && u[k] == 0x5B {
        k += 1
        var neg = false
        if k < u.count && (u[k] == 0x2B || u[k] == 0x2D) {
            neg = u[k] == 0x2D; k += 1
        }
        let d0 = k
        var d = 0
        while k < u.count && u[k] >= 0x30 && u[k] <= 0x39 {
            d = d * 10 + Int(u[k] - 0x30); k += 1
        }
        guard k > d0 && k < u.count && u[k] == 0x5D else { return nil }
        k += 1
        rowVal = host.row + (neg ? -d : d)
    } else if k < u.count && u[k] >= 0x30 && u[k] <= 0x39 {
        var n = 0
        while k < u.count && u[k] >= 0x30 && u[k] <= 0x39 {
            n = n * 10 + Int(u[k] - 0x30); k += 1
        }
        rowAbs = true
        rowVal = n - 1
    }
    guard k < u.count && u[k] == 0x43 else { return nil }
    k += 1
    // Column part.
    var colAbs = false
    var colVal = host.col
    if k < u.count && u[k] == 0x5B {
        k += 1
        var neg = false
        if k < u.count && (u[k] == 0x2B || u[k] == 0x2D) {
            neg = u[k] == 0x2D; k += 1
        }
        let d0 = k
        var d = 0
        while k < u.count && u[k] >= 0x30 && u[k] <= 0x39 {
            d = d * 10 + Int(u[k] - 0x30); k += 1
        }
        guard k > d0 && k < u.count && u[k] == 0x5D else { return nil }
        k += 1
        colVal = host.col + (neg ? -d : d)
    } else if k < u.count && u[k] >= 0x30 && u[k] <= 0x39 {
        var n = 0
        while k < u.count && u[k] >= 0x30 && u[k] <= 0x39 {
            n = n * 10 + Int(u[k] - 0x30); k += 1
        }
        colAbs = true
        colVal = n - 1
    }
    guard k == u.count else { return nil }
    let dangling = colVal < 0 || rowVal < 0
        || colVal >= TabulaCore.maxColumns || rowVal >= TabulaCore.maxRows
    return CellRef(
        sheet: sheet, sheetName: sheetName, col: colVal, row: rowVal,
        colAbs: colAbs, rowAbs: rowAbs, r1c1: true,
        baseCol: host.col, baseRow: host.row, dangling: dangling
    )
}
