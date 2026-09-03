/// Evaluator core (research 6, normative).
///
/// `Evaluator.eval(expr:host:lookup:resolver:todaySerial:)` denotes a pure
/// function of precedent values: the caller (Workbook recalc, Phase 3)
/// guarantees precedents hold final values via topological order (research
/// Theorem 1), so one pass suffices and cells evaluate exactly once.
///
/// Strictness (research 4.4): every operator and call evaluates all operands
/// first and propagates errors, EXCEPT the special forms implemented here:
/// lazy `IF`, short-circuit `AND`/`OR`, catch-all `IFERROR`, `#N/A`-only
/// `IFNA`, and the non-propagating `IS*` predicates. Non-logic function calls
/// dispatch to the Phase 2 library (`BuiltinMath/Text/Lookup/Date`); until
/// those land, unknown names evaluate to `#NAME?` per research 6.
///
/// Determinism (research 6, 12.8): no wall-clock reads (TODAY uses the
/// injected `todaySerial`), no RNG, row-major range folds, source-order args.
/// `Dictionary` iteration never appears in evaluation paths.
import Foundation

public enum Evaluator {
    public static func eval(
        _ expr: Expr,
        host: Addr,
        lookup: @escaping @Sendable (Addr) -> Value,
        resolver: StaticResolver = .empty,
        todaySerial: Int = 0
    ) -> Value {
        switch expr {
        case .num(let x):
            return .num(x)
        case .str(let s):
            return .str(s)
        case .bool(let b):
            return .bool(b)
        case .errLit(let e):
            return .err(e)
        case .ref(let r):
            guard let a = r.resolve(host: host) else { return .err(.ref) }
            return lookup(a)
        case .range(let rr):
            // Bare range in scalar position: top-left rule (research 6).
            // True Excel intersection is a documented v2 deferral.
            guard let rect = rr.resolve(host: host) else { return .err(.ref) }
            return lookup(Addr(
                sheet: rect.sheet ?? host.sheet,
                col: rect.loCol, row: rect.loRow
            ))
        case .name(let n):
            guard let addrs = resolver.nameAddrs(n), !addrs.isEmpty else {
                return .err(.name)
            }
            return lookup(topLeft(addrs))
        case .unary(let op, let e):
            let v = eval(e, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
            switch v.toNumber() {
            case .failure(let code): return .err(code)
            case .success(let x): return .num(op == .neg ? -x : x)
            }
        case .percent(let e):
            let v = eval(e, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
            switch v.toNumber() {
            case .failure(let code): return .err(code)
            case .success(let x): return .num(x / 100)
            }
        case .binary(let op, let l, let r):
            return evalBinary(
                op, l: l, r: r, host: host,
                lookup: lookup, resolver: resolver, todaySerial: todaySerial
            )
        case .arrayConst(let rows):
            // Bare array in scalar position: top-left element (research 3.2.4).
            guard let first = rows.first?.first else { return .err(.value) }
            return eval(first, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
        case .call(let fn, let args):
            return evalCall(
                fn, args: args, host: host,
                lookup: lookup, resolver: resolver, todaySerial: todaySerial
            )
        }
    }

    // MARK: - binary operators

    private static func evalBinary(
        _ op: BinOp, l: Expr, r: Expr, host: Addr,
        lookup: @escaping @Sendable (Addr) -> Value,
        resolver: StaticResolver,
        todaySerial: Int
    ) -> Value {
        switch op {
        case .concat:
            let lv = eval(l, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
            let rv = eval(r, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
            if let e = joinedError(lv, rv) { return .err(e) }
            // toString fails only on errors, which are excluded above.
            guard case .success(let ls) = lv.toString(),
                  case .success(let rs) = rv.toString()
            else { return .err(.value) }
            return .str(ls + rs)
        case .eq, .ne, .lt, .le, .gt, .ge:
            let lv = eval(l, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
            let rv = eval(r, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
            switch compareValues(lv, rv) {
            case .failure(let code):
                return .err(code)
            case .success(let c):
                switch op {
                case .eq: return .bool(c == .equal)
                case .ne: return .bool(c != .equal)
                case .lt: return .bool(c == .less)
                case .le: return .bool(c == .less || c == .equal)
                case .gt: return .bool(c == .greater)
                case .ge: return .bool(c == .greater || c == .equal)
                default: return .err(.value)
                }
            }
        case .add, .sub, .mul, .div, .pow:
            let lv = eval(l, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
            let rv = eval(r, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
            if let e = joinedError(lv, rv) { return .err(e) }
            // Coercion can still fail (non-numeric strings are not Value.err
            // but toNumber rejects them): map either side to its error.
            let x: Double
            switch lv.toNumber() {
            case .failure(let code): return .err(code)
            case .success(let v): x = v
            }
            let y: Double
            switch rv.toNumber() {
            case .failure(let code): return .err(code)
            case .success(let v): y = v
            }
            return arith(op, x: x, y: y)
        }
    }

    /// Arithmetic over two numbers. Domain failures map per research 6:
    /// `/0` and `0^negative` to `#DIV/0!`, negative-base fractional powers
    /// and non-finite overflows to `#NUM!`.
    static func arith(_ op: BinOp, x: Double, y: Double) -> Value {
        let out: Double
        switch op {
        case .add: out = x + y
        case .sub: out = x - y
        case .mul: out = x * y
        case .div:
            if y == 0 { return .err(.div0) }
            out = x / y
        case .pow:
            if x == 0 && y < 0 { return .err(.div0) }
            if x < 0 && y.rounded() != y { return .err(.num) }
            out = pow(x, y)
        default: return .err(.value)
        }
        guard out.isFinite else { return .err(.num) }
        return .num(out)
    }

    /// The winning error when two operand values meet, or nil when clean.
    /// Total and deterministic via `ErrorCode.combine` (research 4.4).
    static func joinedError(_ a: Value, _ b: Value) -> ErrorCode? {
        switch (a.errorCode, b.errorCode) {
        case (nil, nil): return nil
        case (let e?, nil): return e
        case (nil, let f?): return f
        case (let e?, let f?): return ErrorCode.combine(e, f)
        }
    }

    // MARK: - calls (special forms)

    private static func evalCall(
        _ fn: String, args: [Expr], host: Addr,
        lookup: @escaping @Sendable (Addr) -> Value,
        resolver: StaticResolver,
        todaySerial: Int
    ) -> Value {
        func ev(_ e: Expr) -> Value {
            eval(e, host: host, lookup: lookup, resolver: resolver, todaySerial: todaySerial)
        }
        // Scalar-position ranges use the top-left rule for scalar builtins.
        func scalar(_ e: Expr) -> Value {
            if case .range(let rr) = e {
                guard let rect = rr.resolve(host: host) else { return .err(.ref) }
                return lookup(Addr(
                    sheet: rect.sheet ?? host.sheet,
                    col: rect.loCol, row: rect.loRow
                ))
            }
            return ev(e)
        }
        switch fn {
        case "IF":
            // Lazy branches (research 4.4): errors in the untaken branch are
            // invisible. Arity 2..3; missing else defaults to FALSE.
            guard args.count == 2 || args.count == 3 else { return .err(.value) }
            let c = ev(args[0])
            switch c.toBool() {
            case .failure(let code): return .err(code)
            case .success(true): return ev(args[1])
            case .success(false):
                return args.count == 3 ? ev(args[2]) : .bool(false)
            }
        case "AND":
            return evalAndOr(or: false, args: args, scalar: scalar)
        case "OR":
            return evalAndOr(or: true, args: args, scalar: scalar)
        case "NOT":
            guard args.count == 1 else { return .err(.value) }
            switch scalar(args[0]).toBool() {
            case .failure(let code): return .err(code)
            case .success(let b): return .bool(!b)
            }
        case "IFERROR":
            guard args.count == 2 else { return .err(.value) }
            let v = ev(args[0])
            if v.errorCode != nil { return ev(args[1]) }
            return v
        case "IFNA":
            guard args.count == 2 else { return .err(.value) }
            let v = ev(args[0])
            if v.errorCode == .na { return ev(args[1]) }
            return v
        case "ISBLANK":
            guard args.count == 1 else { return .err(.value) }
            return .bool(scalar(args[0]).isBlank)
        case "ISNUMBER":
            guard args.count == 1 else { return .err(.value) }
            if case .num = scalar(args[0]) { return .bool(true) }
            return .bool(false)
        case "ISTEXT":
            guard args.count == 1 else { return .err(.value) }
            if case .str = scalar(args[0]) { return .bool(true) }
            return .bool(false)
        case "ISERROR":
            guard args.count == 1 else { return .err(.value) }
            return .bool(scalar(args[0]).errorCode != nil)
        case "ISNA":
            guard args.count == 1 else { return .err(.value) }
            return .bool(scalar(args[0]).errorCode == .na)
        case "ISERR":
            guard args.count == 1 else { return .err(.value) }
            if let e = scalar(args[0]).errorCode, e != .na { return .bool(true) }
            return .bool(false)
        case "TRUE":
            guard args.isEmpty else { return .err(.value) }
            return .bool(true)
        case "FALSE":
            guard args.isEmpty else { return .err(.value) }
            return .bool(false)
        case "TODAY", "NOW":
            // Volatile date-only source (research 5.4, 7.5). Time-of-day NOW
            // is the v1 date-only TODAY; a true time fraction is deferred.
            guard args.isEmpty else { return .err(.value) }
            return .num(Double(todaySerial))
        default:
            // Phase 2 function library (BuiltinMath/Text/Lookup/Date).
            // Unknown functions stay `#NAME?` per research 6.
            return Builtins.dispatch(
                fn, args: args,
                ctx: BuiltinContext(
                    host: host, lookup: lookup,
                    resolver: resolver, todaySerial: todaySerial
                )
            )
        }
    }

    /// Short-circuit `AND`/`OR` per research 4.4: a decisive value (FALSE for
    /// AND, TRUE for OR) ends the scan, but an error seen *before* the
    /// decisive value wins. No args: AND is TRUE, OR is FALSE.
    static func evalAndOr(
        or: Bool, args: [Expr],
        scalar: (Expr) -> Value
    ) -> Value {
        var firstErr: ErrorCode?
        for a in args {
            let v = scalar(a)
            if let e = v.errorCode {
                if firstErr == nil { firstErr = e }
                continue
            }
            switch v.toBool() {
            case .failure(let code):
                if firstErr == nil { firstErr = code }
            case .success(let b):
                if b == or {
                    // Decisive: prior error wins, else decide now.
                    return firstErr.map(Value.err) ?? .bool(or)
                }
            }
        }
        if let e = firstErr { return .err(e) }
        return .bool(!or)
    }

    /// Row-major first address of a name target (top-left rule, research 6).
    static func topLeft(_ addrs: [Addr]) -> Addr {
        addrs.min() ?? addrs[0]
    }
}
