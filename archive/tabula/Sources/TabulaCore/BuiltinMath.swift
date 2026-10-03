/// Math builtins (research 7.1, normative).
///
/// Aggregation rule: member values (range/name cells) contribute only `.num`
/// cells; text/bool/blank members are skipped; member errors propagate by
/// precedence (research 4.4). Literal values (scalar args, array elements)
/// coerce through `toNumber`, so `SUM("5", TRUE)` is 6 while `SUM` over a
/// range holding `"5"`/`TRUE` ignores those cells, Excel-compatible.
import Foundation

public enum BuiltinMath {
    // MARK: - aggregation

    /// Collect numeric contributions plus errors from all args.
    static func collect(_ args: [Expr], _ ctx: BuiltinContext)
        -> (nums: [Double], errs: [ErrorCode])
    {
        var nums: [Double] = []
        var errs: [ErrorCode] = []
        for a in args {
            for (v, lit) in ctx.expand(a) {
                switch v {
                case .num(let x):
                    nums.append(x)
                case .err(let e):
                    errs.append(e)
                case .blank:
                    if lit {
                        // Scalar blank (blank ref): coerces to 0 in SUM-family.
                        nums.append(0)
                    }
                case .bool(let b):
                    if lit { nums.append(b ? 1 : 0) }
                case .str(let s):
                    if lit {
                        switch Value.str(s).toNumber() {
                        case .success(let x): nums.append(x)
                        case .failure(let e): errs.append(e)
                        }
                    }
                }
            }
        }
        return (nums, errs)
    }

    public static func sum(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        let (nums, errs) = collect(args, ctx)
        if let e = Builtins.combined(errs) { return .err(e) }
        let total = nums.reduce(0, +)
        guard total.isFinite else { return .err(.num) }
        return .num(total)
    }

    public static func average(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        let (nums, errs) = collect(args, ctx)
        if let e = Builtins.combined(errs) { return .err(e) }
        guard !nums.isEmpty else { return .err(.div0) }
        let mean = nums.reduce(0, +) / Double(nums.count)
        guard mean.isFinite else { return .err(.num) }
        return .num(mean)
    }

    public static func minMax(
        _ args: [Expr], _ ctx: BuiltinContext, wantMin: Bool
    ) -> Value {
        let (nums, errs) = collect(args, ctx)
        if let e = Builtins.combined(errs) { return .err(e) }
        guard let first = nums.first else { return .num(0) }
        let out = nums.dropFirst().reduce(first) {
            wantMin ? Swift.min($0, $1) : Swift.max($0, $1)
        }
        return .num(out)
    }

    public static func count(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        var n = 0
        var errs: [ErrorCode] = []
        for a in args {
            for (v, lit) in ctx.expand(a) {
                switch v {
                case .num: n += 1
                case .err(let e): errs.append(e)
                case .blank: break
                case .bool: if lit { n += 1 }
                case .str(let s):
                    if lit, parseGeneralNumber(s) != nil { n += 1 }
                }
            }
        }
        if let e = Builtins.combined(errs) { return .err(e) }
        return .num(Double(n))
    }

    /// Counts non-blank values, including error cells (Excel-compatible: an
    /// error cell is non-blank, so `COUNTA` never propagates).
    public static func countA(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        var n = 0
        for a in args {
            for (v, _) in ctx.expand(a) {
                if !v.isBlank { n += 1 }
            }
        }
        return .num(Double(n))
    }

    /// Counts blank cells plus `""` results (Excel `COUNTBLANK` counts both);
    /// error cells are non-blank and never propagate.
    public static func countBlank(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        var n = 0
        for a in args {
            for (v, _) in ctx.expand(a) {
                switch v {
                case .blank: n += 1
                case .str(let s): if s.isEmpty { n += 1 }
                default: break
                }
            }
        }
        return .num(Double(n))
    }

    // MARK: - scalar helpers

    /// Exactly-one-arg scalar coercion through `toNumber`.
    static func oneNum(
        _ args: [Expr], _ ctx: BuiltinContext
    ) -> Result<Double, ErrorCode> {
        guard args.count == 1 else { return .failure(.value) }
        return ctx.scalar(args[0]).toNumber()
    }

    public static func unary(
        _ args: [Expr], _ ctx: BuiltinContext, _ fn: String
    ) -> Value {
        let x: Double
        switch oneNum(args, ctx) {
        case .failure(let e): return .err(e)
        case .success(let v): x = v
        }
        switch fn {
        case "ABS": return .num(abs(x))
        case "SQRT":
            guard x >= 0 else { return .err(.num) }
            return .num(x.squareRoot())
        case "EXP":
            let y = Foundation.exp(x)
            guard y.isFinite else { return .err(.num) }
            return .num(y)
        case "LN":
            guard x > 0 else { return .err(.num) }
            return .num(Foundation.log(x))
        case "INT":
            guard x.isFinite else { return .err(.num) }
            return .num(Foundation.floor(x))
        default: return .err(.name)
        }
    }

    public static func binary(
        _ args: [Expr], _ ctx: BuiltinContext, _ fn: String
    ) -> Value {
        guard args.count == 2 else { return .err(.value) }
        let x: Double
        switch ctx.scalar(args[0]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let v): x = v
        }
        let y: Double
        switch ctx.scalar(args[1]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let v): y = v
        }
        switch fn {
        case "POWER": return Evaluator.arith(.pow, x: x, y: y)
        case "MOD":
            // Excel-compatible: y = 0 -> #DIV/0!, sign follows the divisor.
            guard y != 0 else { return .err(.div0) }
            guard x.isFinite, y.isFinite else { return .err(.num) }
            let r = x - y * Foundation.floor(x / y)
            guard r.isFinite else { return .err(.num) }
            return .num(r == 0 ? 0 : r)
        default: return .err(.name)
        }
    }

    public static func log(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 1 || args.count == 2 else {
            return .err(.value)
        }
        let x: Double
        switch ctx.scalar(args[0]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let v): x = v
        }
        var base = 10.0
        if args.count == 2 {
            switch ctx.scalar(args[1]).toNumber() {
            case .failure(let e): return .err(e)
            case .success(let v): base = v
            }
        }
        guard x > 0, base > 0, base != 1 else { return .err(.num) }
        let y = Foundation.log(x) / Foundation.log(base)
        guard y.isFinite else { return .err(.num) }
        return .num(y)
    }

    public static func round(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 2 else { return .err(.value) }
        let x: Double
        switch ctx.scalar(args[0]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let v): x = v
        }
        let rawN: Double
        switch ctx.scalar(args[1]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let v): rawN = v
        }
        // Non-integer n truncates toward zero (research 7.1).
        guard let n = Builtins.truncInt(rawN) else { return .err(.num) }
        guard x.isFinite else { return .err(.num) }
        // Half away from zero: sign(x) * floor(|x| * 10^n + 0.5), scaled back
        // by division for n >= 0 (correctly rounded, matches literals) and by
        // exact-power multiplication for n < 0 (division by 0.1 is inexact:
        // 12 / 0.1 is 119.999... not 120).
        let mag: Double
        let out: Double
        if n >= 0 {
            let f = Foundation.pow(10, Double(n))
            guard f.isFinite else { return .err(.num) }
            let scaled = x * f
            guard scaled.isFinite else { return .err(.num) }
            mag = Foundation.floor(abs(scaled) + 0.5) * (x < 0 ? -1 : 1)
            out = mag / f
        } else {
            let f = Foundation.pow(10, Double(-n))
            guard f.isFinite else { return .err(.num) }
            let scaled = x / f
            guard scaled.isFinite else { return .err(.num) }
            mag = Foundation.floor(abs(scaled) + 0.5) * (x < 0 ? -1 : 1)
            out = mag * f
        }
        guard out.isFinite else { return .err(.num) }
        return .num(out == 0 ? 0 : out)
    }

    public static func trunc(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 1 || args.count == 2 else {
            return .err(.value)
        }
        let x: Double
        switch ctx.scalar(args[0]).toNumber() {
        case .failure(let e): return .err(e)
        case .success(let v): x = v
        }
        var n = 0
        if args.count == 2 {
            switch ctx.scalar(args[1]).toNumber() {
            case .failure(let e): return .err(e)
            case .success(let v):
                guard let t = Builtins.truncInt(v) else {
                    return .err(.num)
                }
                n = t
            }
        }
        guard x.isFinite else { return .err(.num) }
        // Toward zero: sign(x) * floor(|scaled|); same split scaling as
        // ROUND so negative precisions stay exact (12, not 119.999...).
        let mag: Double
        let out: Double
        if n >= 0 {
            let f = Foundation.pow(10, Double(n))
            guard f.isFinite else { return .err(.num) }
            let scaled = x * f
            guard scaled.isFinite else { return .err(.num) }
            mag = Foundation.floor(abs(scaled)) * (x < 0 ? -1 : 1)
            out = mag / f
        } else {
            let f = Foundation.pow(10, Double(-n))
            guard f.isFinite else { return .err(.num) }
            let scaled = x / f
            guard scaled.isFinite else { return .err(.num) }
            mag = Foundation.floor(abs(scaled)) * (x < 0 ? -1 : 1)
            out = mag * f
        }
        guard out.isFinite else { return .err(.num) }
        return .num(out == 0 ? 0 : out)
    }

    // MARK: - SUMPRODUCT

    /// Pairwise products over equally-shaped args (research 7.1). Every arg
    /// flattens row-major; lengths must agree or `#VALUE!`. Non-numeric
    /// entries (text, blank) count as zero, booleans coerce, errors propagate.
    public static func sumProduct(
        _ args: [Expr], _ ctx: BuiltinContext
    ) -> Value {
        guard !args.isEmpty else { return .err(.value) }
        var cols: [[Double]] = []
        var errs: [ErrorCode] = []
        for a in args {
            var col: [Double] = []
            for (v, _) in ctx.expand(a) {
                switch v {
                case .num(let x): col.append(x)
                case .bool(let b): col.append(b ? 1 : 0)
                case .blank: col.append(0)
                case .str: col.append(0)
                case .err(let e): errs.append(e)
                }
            }
            cols.append(col)
        }
        if let e = Builtins.combined(errs) { return .err(e) }
        guard let width = cols.first?.count else { return .err(.value) }
        guard cols.allSatisfy({ $0.count == width }) else {
            return .err(.value)
        }
        var total = 0.0
        for i in 0..<width {
            var p = 1.0
            for col in cols { p *= col[i] }
            total += p
        }
        guard total.isFinite else { return .err(.num) }
        return .num(total)
    }
}
