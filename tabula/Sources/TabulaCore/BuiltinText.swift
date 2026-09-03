/// Text builtins (research 7.2, normative).
///
/// All functions operate on Unicode scalar values; `LEN` counts scalars
/// (grapheme-cluster counting is a documented v2 nicety). Indexing is
/// 1-based. Non-integer `n`/`start` truncate toward zero; out-of-range reads
/// clamp to the available text.
public enum BuiltinText {
    // MARK: - scalar string plumbing

    static func oneStr(
        _ args: [Expr], _ ctx: BuiltinContext
    ) -> Result<String, ErrorCode> {
        guard args.count == 1 else { return .failure(.value) }
        return ctx.scalar(args[0]).toString()
    }

    /// Integer text argument: coerce via `toNumber`, truncate toward zero.
    /// Domain failures map to `#VALUE!` (text-index errors, research 7.2).
    static func intArg(_ e: Expr, _ ctx: BuiltinContext) -> Result<Int, ErrorCode> {
        switch ctx.scalar(e).toNumber() {
        case .failure: return .failure(.value)
        case .success(let x):
            guard let n = Builtins.truncInt(x) else {
                return .failure(.value)
            }
            return .success(n)
        }
    }

    static func scalars(_ s: String) -> [UnicodeScalar] {
        Array(s.unicodeScalars)
    }

    // MARK: - CONCAT / TEXTJOIN

    /// `CONCAT(args...)`: `toString` each scalar; ranges expand row-major.
    /// Errors propagate by precedence; blanks contribute `""`.
    public static func concat(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        var parts: [String] = []
        var errs: [ErrorCode] = []
        for a in args {
            for (v, _) in ctx.expand(a) {
                switch v.toString() {
                case .success(let s): parts.append(s)
                case .failure(let e): errs.append(e)
                }
            }
        }
        if let e = Builtins.combined(errs) { return .err(e) }
        return .str(parts.joined())
    }

    /// `TEXTJOIN(delim, ignoreEmpty, args...)`: at least one text arg after
    /// the first two. `ignoreEmpty` coerces via `toBool`.
    public static func textJoin(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count >= 3 else { return .err(.value) }
        let delim: String
        switch ctx.scalar(args[0]).toString() {
        case .failure(let e): return .err(e)
        case .success(let s): delim = s
        }
        let ignoreEmpty: Bool
        switch ctx.scalar(args[1]).toBool() {
        case .failure(let e): return .err(e)
        case .success(let b): ignoreEmpty = b
        }
        var parts: [String] = []
        var errs: [ErrorCode] = []
        for a in args[2...] {
            for (v, _) in ctx.expand(a) {
                switch v.toString() {
                case .success(let s):
                    if s.isEmpty, ignoreEmpty { continue }
                    parts.append(s)
                case .failure(let e): errs.append(e)
                }
            }
        }
        if let e = Builtins.combined(errs) { return .err(e) }
        return .str(parts.joined(separator: delim))
    }

    // MARK: - LEFT / RIGHT / MID

    public static func leftRight(
        _ args: [Expr], _ ctx: BuiltinContext, fromLeft: Bool
    ) -> Value {
        guard args.count == 1 || args.count == 2 else {
            return .err(.value)
        }
        let s: String
        switch oneStr([args[0]], ctx) {
        case .failure(let e): return .err(e)
        case .success(let t): s = t
        }
        var n = 1
        if args.count == 2 {
            switch intArg(args[1], ctx) {
            case .failure(let e): return .err(e)
            case .success(let k): n = k
            }
        }
        guard n >= 0 else { return .err(.value) }
        let u = scalars(s)
        let take = Array((fromLeft ? u.prefix(n) : u.suffix(n)))
        return .str(String(String.UnicodeScalarView(take)))
    }

    public static func mid(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 3 else { return .err(.value) }
        let s: String
        switch oneStr([args[0]], ctx) {
        case .failure(let e): return .err(e)
        case .success(let t): s = t
        }
        let start: Int
        switch intArg(args[1], ctx) {
        case .failure(let e): return .err(e)
        case .success(let k): start = k
        }
        let n: Int
        switch intArg(args[2], ctx) {
        case .failure(let e): return .err(e)
        case .success(let k): n = k
        }
        guard start >= 1, n >= 0 else { return .err(.value) }
        let u = scalars(s)
        guard start - 1 < u.count else { return .str("") }
        let take = Array(u.dropFirst(start - 1).prefix(n))
        return .str(String(String.UnicodeScalarView(take)))
    }

    // MARK: - LEN / TRIM / UPPER / LOWER

    public static func len(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        switch oneStr(args, ctx) {
        case .failure(let e): return .err(e)
        case .success(let s): return .num(Double(scalars(s).count))
        }
    }

    /// Strip leading/trailing U+0020 and collapse internal runs to one space.
    /// Only U+0020 is space here (documented, research 7.2).
    public static func trim(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        switch oneStr(args, ctx) {
        case .failure(let e): return .err(e)
        case .success(let s):
            var out: [UnicodeScalar] = []
            var pendingSpace = false
            var started = false
            for u in scalars(s) {
                if u.value == 0x20 {
                    if started { pendingSpace = true }
                    continue
                }
                if pendingSpace, started { out.append(" ".unicodeScalars.first!) }
                pendingSpace = false
                started = true
                out.append(u)
            }
            return .str(String(String.UnicodeScalarView(out)))
        }
    }

    public static func upperLower(
        _ args: [Expr], _ ctx: BuiltinContext, upper: Bool
    ) -> Value {
        switch oneStr(args, ctx) {
        case .failure(let e): return .err(e)
        case .success(let s):
            return .str(upper ? s.uppercased() : s.lowercased())
        }
    }

    // MARK: - VALUE / TEXT

    /// `VALUE(s)`: numbers pass through; text parses via the General grammar;
    /// booleans are `#VALUE!` (Excel-compatible); blank refs coerce to 0.
    public static func valueFn(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 1 else { return .err(.value) }
        switch ctx.scalar(args[0]) {
        case .num(let x): return .num(x)
        case .str(let s):
            guard let x = parseGeneralNumber(s) else { return .err(.value) }
            return .num(x)
        case .bool: return .err(.value)
        case .blank: return .num(0)
        case .err(let e): return .err(e)
        }
    }

    /// `TEXT(n, fmt)` over the four v1 patterns only (research 7.2); any
    /// other pattern is `#VALUE!`, full format codes are display-layer.
    public static func textFn(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 2 else { return .err(.value) }
        let x: Double
        switch ctx.scalar(args[0]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let v): x = v
        }
        let fmt: String
        switch ctx.scalar(args[1]).toString() {
        case .failure(let e): return .err(e)
        case .success(let s): fmt = s
        }
        guard x.isFinite else { return .err(.num) }
        switch fmt {
        case "0": return .str(formatFixed(x, places: 0))
        case "0.00": return .str(formatFixed(x, places: 2))
        case "0%": return .str(formatFixed(x * 100, places: 0) + "%")
        case "0.00%": return .str(formatFixed(x * 100, places: 2) + "%")
        default: return .err(.value)
        }
    }

    /// Locale-independent fixed-decimal rendering with half-away-from-zero
    /// rounding (same rule as `ROUND`, research 7.1).
    static func formatFixed(_ x: Double, places: Int) -> String {
        var f = 1.0
        for _ in 0..<places { f *= 10 }
        let scaled = (x * f).rounded(.toNearestOrAwayFromZero)
        // Beyond exact-integer Double range fall back to General rendering
        // (documented; Excel would use scientific notation here).
        guard scaled.isFinite, abs(scaled) < 9.0e15 else {
            return formatGeneral(x)
        }
        let neg = scaled < 0 || (scaled == 0 && x < 0)
        let mag = Int64(abs(scaled))
        let digits = String(mag)
        if places == 0 { return (neg ? "-" : "") + digits }
        let padded = String(repeating: "0", count: max(0, places + 1 - digits.count)) + digits
        let cut = padded.index(padded.endIndex, offsetBy: -places)
        return (neg ? "-" : "") + padded[..<cut] + "." + padded[cut...]
    }
}
