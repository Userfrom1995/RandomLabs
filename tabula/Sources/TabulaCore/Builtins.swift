/// Function-library dispatch and shared folding helpers (research 7).
///
/// `Builtins.dispatch` is the single entry point the evaluator calls for every
/// non-logic function name. Logic special forms (`IF`, `AND`, `OR`, `NOT`,
/// `IFERROR`, `IFNA`, `IS*`, `TRUE`, `FALSE`, `TODAY`, `NOW`) stay in
/// `Eval.swift` because they need lazy/short-circuit evaluation; everything
/// else lives in the per-family files (`BuiltinMath/Text/Lookup/Date`).
/// Unknown names evaluate to `#NAME?` per research 6.
///
/// Argument folding (research 7 preamble): scalar args given a range use the
/// top-left rule; range/array/name args fold row-major. Aggregation helpers
/// distinguish *literal* values (scalar args, array elements: full `toNumber`
/// coercion, so `SUM("5")` is 5) from *member* values (range/name cells: only
/// `.num` contributes, text/bool/blank skipped, Excel-compatible).
public struct BuiltinContext: Sendable {
    public var host: Addr
    public var lookup: @Sendable (Addr) -> Value
    public var resolver: StaticResolver
    public var todaySerial: Int

    public init(
        host: Addr,
        lookup: @escaping @Sendable (Addr) -> Value,
        resolver: StaticResolver = .empty,
        todaySerial: Int = 0
    ) {
        self.host = host
        self.lookup = lookup
        self.resolver = resolver
        self.todaySerial = todaySerial
    }

    /// Full evaluation of an arbitrary expression (used for `CHOOSE` laziness
    /// and array-element evaluation).
    public func eval(_ e: Expr) -> Value {
        Evaluator.eval(
            e, host: host, lookup: lookup,
            resolver: resolver, todaySerial: todaySerial
        )
    }

    /// Scalar-position value: ranges collapse to top-left (research 6),
    /// names to their top-left target, everything else evaluates normally.
    public func scalar(_ e: Expr) -> Value {
        if case .range(let rr) = e {
            guard let rect = rr.resolve(host: host) else { return .err(.ref) }
            return lookup(Addr(
                sheet: rect.sheet ?? host.sheet,
                col: rect.loCol, row: rect.loRow
            ))
        }
        return eval(e)
    }

    /// Row-major expansion of one argument into `(value, isLiteral)` pairs.
    /// Ranges and names expand to member cells (`isLiteral == false`); scalars
    /// and array elements are literals. Array rows flatten row-major.
    public func expand(_ e: Expr) -> [(value: Value, isLiteral: Bool)] {
        switch e {
        case .range(let rr):
            guard let rect = rr.resolve(host: host) else {
                return [(value: .err(.ref), isLiteral: false)]
            }
            let sheet = rect.sheet ?? host.sheet
            var out: [(Value, Bool)] = []
            out.reserveCapacity(rect.cellCount)
            for r in rect.loRow...rect.hiRow {
                for c in rect.loCol...rect.hiCol {
                    out.append((lookup(Addr(sheet: sheet, col: c, row: r)), false))
                }
            }
            return out
        case .name(let n):
            guard let addrs = resolver.nameAddrs(n), !addrs.isEmpty else {
                return [(value: .err(.name), isLiteral: true)]
            }
            return addrs.sorted().map { (lookup($0), false) }
        case .arrayConst(let rows):
            var out: [(Value, Bool)] = []
            for row in rows {
                for cell in row {
                    out.append((eval(cell), true))
                }
            }
            return out
        default:
            return [(eval(e), true)]
        }
    }

    /// Rectangular grid for table-shaped args (`VLOOKUP` tables, `INDEX`,
    /// `MATCH` vectors). Ranges resolve and read through `lookup`; array
    /// constants evaluate elementwise (ragged rows pad with blank); names use
    /// their bounding box; anything else is `#VALUE!` (nil).
    public func grid(_ e: Expr) -> [[Value]]? {
        switch e {
        case .range(let rr):
            guard let rect = rr.resolve(host: host) else { return nil }
            let sheet = rect.sheet ?? host.sheet
            var rows: [[Value]] = []
            for r in rect.loRow...rect.hiRow {
                var row: [Value] = []
                row.reserveCapacity(rect.hiCol - rect.loCol + 1)
                for c in rect.loCol...rect.hiCol {
                    row.append(lookup(Addr(sheet: sheet, col: c, row: r)))
                }
                rows.append(row)
            }
            return rows
        case .arrayConst(let rs):
            guard !rs.isEmpty else { return nil }
            let width = rs.map { $0.count }.max() ?? 0
            guard width > 0 else { return nil }
            return rs.map { row in
                row.map { eval($0) }
                    + Array(repeating: .blank, count: width - row.count)
            }
        case .name(let n):
            guard let addrs = resolver.nameAddrs(n), !addrs.isEmpty else {
                return nil
            }
            let los = addrs.min(), his = addrs.max()
            guard let lo = los, let hi = his, lo.sheet == hi.sheet else {
                return nil
            }
            var rows: [[Value]] = []
            for r in lo.row...hi.row {
                var row: [Value] = []
                for c in lo.col...hi.col {
                    row.append(lookup(Addr(sheet: lo.sheet, col: c, row: r)))
                }
                rows.append(row)
            }
            return rows
        default:
            return nil
        }
    }
}

public enum Builtins {
    /// Dispatch one call by uppercased name. Arity errors map to `#VALUE!`
    /// per research 7; unknown names map to `#NAME?` per research 6.
    public static func dispatch(
        _ fn: String, args: [Expr], ctx: BuiltinContext
    ) -> Value {
        switch fn {
        // Math (BuiltinMath.swift).
        case "SUM": return BuiltinMath.sum(args, ctx)
        case "AVERAGE": return BuiltinMath.average(args, ctx)
        case "MIN": return BuiltinMath.minMax(args, ctx, wantMin: true)
        case "MAX": return BuiltinMath.minMax(args, ctx, wantMin: false)
        case "COUNT": return BuiltinMath.count(args, ctx)
        case "COUNTA": return BuiltinMath.countA(args, ctx)
        case "COUNTBLANK": return BuiltinMath.countBlank(args, ctx)
        case "ROUND": return BuiltinMath.round(args, ctx)
        case "ABS": return BuiltinMath.unary(args, ctx, fn)
        case "SQRT": return BuiltinMath.unary(args, ctx, fn)
        case "EXP": return BuiltinMath.unary(args, ctx, fn)
        case "LN": return BuiltinMath.unary(args, ctx, fn)
        case "LOG": return BuiltinMath.log(args, ctx)
        case "POWER": return BuiltinMath.binary(args, ctx, fn)
        case "MOD": return BuiltinMath.binary(args, ctx, fn)
        case "INT": return BuiltinMath.unary(args, ctx, fn)
        case "TRUNC": return BuiltinMath.trunc(args, ctx)
        case "SUMPRODUCT": return BuiltinMath.sumProduct(args, ctx)
        // Text (BuiltinText.swift).
        case "CONCAT": return BuiltinText.concat(args, ctx)
        case "LEFT": return BuiltinText.leftRight(args, ctx, fromLeft: true)
        case "RIGHT": return BuiltinText.leftRight(args, ctx, fromLeft: false)
        case "MID": return BuiltinText.mid(args, ctx)
        case "LEN": return BuiltinText.len(args, ctx)
        case "TRIM": return BuiltinText.trim(args, ctx)
        case "UPPER": return BuiltinText.upperLower(args, ctx, upper: true)
        case "LOWER": return BuiltinText.upperLower(args, ctx, upper: false)
        case "TEXTJOIN": return BuiltinText.textJoin(args, ctx)
        case "VALUE": return BuiltinText.valueFn(args, ctx)
        case "TEXT": return BuiltinText.textFn(args, ctx)
        // Lookup (BuiltinLookup.swift).
        case "VLOOKUP": return BuiltinLookup.vlookup(args, ctx)
        case "HLOOKUP": return BuiltinLookup.hlookup(args, ctx)
        case "INDEX": return BuiltinLookup.index(args, ctx)
        case "MATCH": return BuiltinLookup.match(args, ctx)
        case "CHOOSE": return BuiltinLookup.choose(args, ctx)
        // Date (BuiltinDate.swift).
        case "DATE": return BuiltinDate.dateFn(args, ctx)
        case "YEAR": return BuiltinDate.component(args, ctx, part: .year)
        case "MONTH": return BuiltinDate.component(args, ctx, part: .month)
        case "DAY": return BuiltinDate.component(args, ctx, part: .day)
        case "DATEDIF": return BuiltinDate.dateDif(args, ctx)
        case "EDATE": return BuiltinDate.eDate(args, ctx, endOfMonth: false)
        case "EOMONTH": return BuiltinDate.eDate(args, ctx, endOfMonth: true)
        default: return .err(.name)
        }
    }

    /// Combine a nonempty error list by precedence (research 4.4); nil when
    /// clean. Deterministic: order-independent via `ErrorCode.combine`.
    public static func combined(_ errs: [ErrorCode]) -> ErrorCode? {
        errs.reduce(nil as ErrorCode?) { acc, e in
            acc.map { ErrorCode.combine($0, e) } ?? e
        }
    }

    /// Truncate a finite number toward zero to an integer argument
    /// (`ROUND`/`CHOOSE`/`INDEX` convention, research 7). Non-finite input
    /// returns nil (caller maps to `#NUM!` for math, `#VALUE!` for text).
    public static func truncInt(_ x: Double) -> Int? {
        guard x.isFinite else { return nil }
        guard x > Double(Int.min) && x < Double(Int.max) else { return nil }
        return Int(x)
    }
}
