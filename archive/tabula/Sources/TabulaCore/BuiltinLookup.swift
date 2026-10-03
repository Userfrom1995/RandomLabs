/// Lookup builtins (research 7.3, normative).
///
/// Exact-match key equality: numbers by value, strings case-insensitive,
/// booleans by value, blank matching blank and numeric zero (Excel treats an
/// empty lookup key as 0). Cross-type keys never match. Approximate mode and
/// `MATCH` types 1/-1 use binary search over the column's lookup order
/// (rank, then value); unsorted input yields the deterministic binary-search
/// result, documented as caller error per research 7.3.
public enum BuiltinLookup {
    // MARK: - key ordering

    /// Exact-match predicate for `VLOOKUP`/`HLOOKUP`/`MATCH(..., 0)`.
    public static func keyEqual(_ key: Value, _ cell: Value) -> Bool {
        switch (key, cell) {
        case (.num(let a), .num(let b)): return a == b
        case (.str(let a), .str(let b)):
            return a.caseInsensitiveCompare(b) == .orderedSame
        case (.bool(let a), .bool(let b)): return a == b
        case (.blank, .blank): return true
        case (.blank, .num(let b)): return b == 0
        case (.num(let a), .blank): return a == 0
        default: return false
        }
    }

    /// Total lookup order: (sort rank, value). Errors sort last and never
    /// match in binary search; they are skipped by exact scans.
    static func lookupLess(_ a: Value, _ b: Value) -> Bool {
        let ra = sortRank(a), rb = sortRank(b)
        if ra != rb { return ra < rb }
        switch (a, b) {
        case (.num(let x), .num(let y)): return x < y
        case (.str(let x), .str(let y)):
            return x.caseInsensitiveCompare(y) == .orderedAscending
        case (.bool(let x), .bool(let y)): return !x && y
        default: return false
        }
    }

    static func lookupLE(_ a: Value, _ b: Value) -> Bool {
        !lookupLess(b, a)
    }

    static func lookupGE(_ a: Value, _ b: Value) -> Bool {
        !lookupLess(a, b)
    }

    /// Last index with `col[i] <= key` (ascending binary search), or nil.
    static func binaryLastLE(_ col: [Value], _ key: Value) -> Int? {
        var best: Int? = nil
        var lo = 0, hi = col.count
        while lo < hi {
            let mid = (lo + hi) / 2
            if lookupLE(col[mid], key) { best = mid; lo = mid + 1 } else {
                hi = mid
            }
        }
        return best
    }

    /// Last index with `col[i] >= key` over a *descending* column, or nil.
    /// On a correctly descending list this is the smallest value still `>=`
    /// the key (Excel `MATCH(..., -1)` semantics).
    static func binaryLastGE(_ col: [Value], _ key: Value) -> Int? {
        var best: Int? = nil
        var lo = 0, hi = col.count
        while lo < hi {
            let mid = (lo + hi) / 2
            if lookupGE(col[mid], key) { best = mid; lo = mid + 1 } else {
                hi = mid
            }
        }
        return best
    }

    // MARK: - VLOOKUP / HLOOKUP

    static func tableGrid(
        _ e: Expr, _ ctx: BuiltinContext
    ) -> [[Value]]? {
        ctx.grid(e)
    }

    /// Shared vertical/horizontal lookup. `columnar` selects first-column
    /// search (VLOOKUP) vs first-row search (HLOOKUP); `idx` is the 1-based
    /// return offset along the other axis.
    static func xlookup(
        key: Value, table: [[Value]], idx: Int, approx: Bool, columnar: Bool
    ) -> Value {
        guard !table.isEmpty, !table[0].isEmpty else { return .err(.na) }
        if columnar {
            let width = table[0].count
            guard idx >= 1, idx <= width else { return .err(.ref) }
            let col = table.map { $0[0] }
            if approx {
                guard let row = binaryLastLE(col, key) else {
                    return .err(.na)
                }
                return table[row][idx - 1]
            }
            for (r, cell) in col.enumerated() {
                if cell.errorCode != nil { continue }
                if keyEqual(key, cell) { return table[r][idx - 1] }
            }
            return .err(.na)
        } else {
            let height = table.count
            guard idx >= 1, idx <= height else { return .err(.ref) }
            let row = table[0]
            if approx {
                guard let c = binaryLastLE(row, key) else {
                    return .err(.na)
                }
                return table[idx - 1][c]
            }
            for (c, cell) in row.enumerated() {
                if cell.errorCode != nil { continue }
                if keyEqual(key, cell) { return table[idx - 1][c] }
            }
            return .err(.na)
        }
    }

    /// `VLOOKUP(key, table, colIdx, [approx=false])`.
    public static func vlookup(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 3 || args.count == 4 else {
            return .err(.value)
        }
        let key = ctx.scalar(args[0])
        if let e = key.errorCode { return .err(e) }
        guard let table = tableGrid(args[1], ctx) else {
            // A dangling table ref reports #REF!; anything else is #VALUE!.
            if case .range(let rr) = args[1], rr.resolve(host: ctx.host) == nil {
                return .err(.ref)
            }
            return .err(.value)
        }
        let colIdx: Int
        switch ctx.scalar(args[2]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let x):
            guard let n = Builtins.truncInt(x) else { return .err(.num) }
            colIdx = n
        }
        var approx = false
        if args.count == 4 {
            switch ctx.scalar(args[3]).toBool() {
            case .failure(let e): return .err(e)
            case .success(let b): approx = b
            }
        }
        // Normalize a blank key to numeric zero for ordering paths.
        let normKey: Value = key.isBlank ? .num(0) : key
        return xlookup(
            key: normKey, table: table, idx: colIdx,
            approx: approx, columnar: true
        )
    }

    /// `HLOOKUP(key, table, rowIdx, [approx=false])`: transpose of VLOOKUP.
    public static func hlookup(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 3 || args.count == 4 else {
            return .err(.value)
        }
        let key = ctx.scalar(args[0])
        if let e = key.errorCode { return .err(e) }
        guard let table = tableGrid(args[1], ctx) else {
            if case .range(let rr) = args[1], rr.resolve(host: ctx.host) == nil {
                return .err(.ref)
            }
            return .err(.value)
        }
        let rowIdx: Int
        switch ctx.scalar(args[2]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let x):
            guard let n = Builtins.truncInt(x) else { return .err(.num) }
            rowIdx = n
        }
        var approx = false
        if args.count == 4 {
            switch ctx.scalar(args[3]).toBool() {
            case .failure(let e): return .err(e)
            case .success(let b): approx = b
            }
        }
        let normKey: Value = key.isBlank ? .num(0) : key
        return xlookup(
            key: normKey, table: table, idx: rowIdx,
            approx: approx, columnar: false
        )
    }

    // MARK: - INDEX

    /// `INDEX(range, r, [c])`, 1-based. The optional column defaults by shape:
    /// single-row grids take `(1, r)`, single-column grids take `(r, 1)`; a
    /// 2-D grid without `c` is `#REF!`. Out of bounds is `#REF!`.
    public static func index(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 2 || args.count == 3 else {
            return .err(.value)
        }
        let grid: [[Value]]
        if let g = ctx.grid(args[0]) {
            grid = g
        } else if case .range(let rr) = args[0],
            rr.resolve(host: ctx.host) == nil
        {
            return .err(.ref)
        } else {
            // Scalar source is a 1x1 grid (so INDEX(5,1,1) is 5).
            grid = [[ctx.scalar(args[0])]]
        }
        let height = grid.count, width = grid[0].count
        let r: Int
        switch ctx.scalar(args[1]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let x):
            guard let n = Builtins.truncInt(x) else { return .err(.num) }
            r = n
        }
        var c: Int?
        if args.count == 3 {
            switch ctx.scalar(args[2]).toNumber() {
            case .failure(let e): return .err(e)
            case .success(let x):
                guard let n = Builtins.truncInt(x) else { return .err(.num) }
                c = n
            }
        } else if height == 1 {
            // Single row: the lone index addresses the column; row is 1.
            guard r >= 1, r <= width else { return .err(.ref) }
            return grid[0][r - 1]
        } else if width == 1 {
            c = 1
        } else {
            return .err(.ref)
        }
        guard r >= 1, r <= height, c! >= 1, c! <= width else {
            return .err(.ref)
        }
        return grid[r - 1][c! - 1]
    }

    // MARK: - MATCH

    /// `MATCH(key, range, [type=0])` over a single-row/column vector;
    /// non-vectors are `#N/A`. Invalid types are `#N/A` (Excel-compatible).
    public static func match(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 2 || args.count == 3 else {
            return .err(.value)
        }
        let key = ctx.scalar(args[0])
        if let e = key.errorCode { return .err(e) }
        guard let grid = ctx.grid(args[1]) else { return .err(.na) }
        let vec: [Value]
        if grid.count == 1 {
            vec = grid[0]
        } else if grid[0].count == 1 {
            vec = grid.map { $0[0] }
        } else {
            return .err(.na)
        }
        var type = 0
        if args.count == 3 {
            switch ctx.scalar(args[2]).toNumber() {
            case .failure: return .err(.na)
            case .success(let x):
                guard let n = Builtins.truncInt(x) else {
                    return .err(.na)
                }
                type = n
            }
        }
        let normKey: Value = key.isBlank ? .num(0) : key
        switch type {
        case 0:
            for (i, cell) in vec.enumerated() {
                if cell.errorCode != nil { continue }
                if keyEqual(normKey, cell) { return .num(Double(i + 1)) }
            }
            return .err(.na)
        case 1:
            guard let i = binaryLastLE(vec, normKey) else {
                return .err(.na)
            }
            return .num(Double(i + 1))
        case -1:
            guard let i = binaryLastGE(vec, normKey) else {
                return .err(.na)
            }
            return .num(Double(i + 1))
        default:
            return .err(.na)
        }
    }

    // MARK: - CHOOSE

    /// `CHOOSE(n, v1, ...)`: lazy, only the selected branch evaluates (so
    /// errors in unchosen branches stay invisible, mirroring `IF`). `n`
    /// truncates toward zero; out of range is `#VALUE!`.
    public static func choose(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count >= 2 else { return .err(.value) }
        let n: Int
        switch ctx.scalar(args[0]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let x):
            guard let t = Builtins.truncInt(x) else { return .err(.num) }
            n = t
        }
        guard n >= 1, n <= args.count - 1 else { return .err(.value) }
        return ctx.eval(args[n])
    }
}
