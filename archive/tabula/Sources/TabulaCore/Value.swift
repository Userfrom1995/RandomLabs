import Foundation

/// Value domain, coercions, and comparison ordering (research 4.1-4.4).
///
/// Normative coercion table (research 4.3, every cell tested in Phase 1):
/// - `toNumber`: Num identity; Bool 1/0; trimmed numeric strings or `#VALUE!`
///   (`""` literal in arithmetic is `#VALUE!`; only a Blank *reference* is 0);
///   Blank 0; errors propagate.
/// - `toString`: Num via General rendering (locale-independent core);
///   Bool TRUE/FALSE; Blank ""; errors propagate.
/// - `toBool`: Num 0 false else true; trimmed case-insensitive TRUE/FALSE or
///   `#VALUE!`; Blank false; errors propagate.
/// - Comparisons do NOT coerce across types: total order
///   blank < number < string < bool (research 4.3, 9.4); `=`/`<>` across
///   types are FALSE/TRUE except blank = blank.
/// Error precedence (research 4.4) lives on `ErrorCode`; `combine` picks the
/// higher-precedence error when two meet in one operator.
public enum Value: Hashable, Sendable {
    case num(Double)
    case str(String)
    case bool(Bool)
    case err(ErrorCode)
    case blank

    public var errorCode: ErrorCode? {
        if case .err(let e) = self { return e }
        return nil
    }

    public var isBlank: Bool {
        if case .blank = self { return true }
        return false
    }
}

extension Value {
    /// Normative `toNumber` (research 4.3).
    public func toNumber() -> Result<Double, ErrorCode> {
        switch self {
        case .num(let x): return .success(x)
        case .bool(let b): return .success(b ? 1 : 0)
        case .blank: return .success(0)
        case .err(let e): return .failure(e)
        case .str(let s):
            if let v = parseGeneralNumber(s) { return .success(v) }
            return .failure(.value)
        }
    }

    /// Normative `toString` (research 4.3).
    public func toString() -> Result<String, ErrorCode> {
        switch self {
        case .num(let x): return .success(formatGeneral(x))
        case .str(let s): return .success(s)
        case .bool(let b): return .success(b ? "TRUE" : "FALSE")
        case .blank: return .success("")
        case .err(let e): return .failure(e)
        }
    }

    /// Normative `toBool` (research 4.3). Used by `IF` conditions.
    public func toBool() -> Result<Bool, ErrorCode> {
        switch self {
        case .bool(let b): return .success(b)
        case .num(let x): return .success(x != 0)
        case .blank: return .success(false)
        case .err(let e): return .failure(e)
        case .str(let s):
            let t = s.trimmingCharacters(in: .whitespaces)
            if t.caseInsensitiveCompare("TRUE") == .orderedSame { return .success(true) }
            if t.caseInsensitiveCompare("FALSE") == .orderedSame { return .success(false) }
            return .failure(.value)
        }
    }
}

/// Strict General-grammar number parse: optional sign, `digits[.digits]`,
/// or `.digits`, optional exponent. Rejects `nan`/`inf`/hex/empty by
/// construction. Returns nil for non-numeric strings (`#VALUE!` at call site).
/// Only ASCII space trimming applies (research 4.3: leading/trailing
/// whitespace ignored); the `""` literal trims to empty and fails.
public func parseGeneralNumber(_ s: String) -> Double? {
    let t = s.trimmingCharacters(in: .whitespaces)
    guard !t.isEmpty else { return nil }
    let u = Array(t.utf16)
    var k = 0
    if u[k] == 0x2B || u[k] == 0x2D { k += 1; guard k < u.count else { return nil } }
    var digits = 0
    while k < u.count && u[k] >= 0x30 && u[k] <= 0x39 { k += 1; digits += 1 }
    if k < u.count && u[k] == 0x2E {
        k += 1
        while k < u.count && u[k] >= 0x30 && u[k] <= 0x39 { k += 1; digits += 1 }
    }
    guard digits > 0 else { return nil }
    if k < u.count && (u[k] == 0x65 || u[k] == 0x45) {
        k += 1
        if k < u.count && (u[k] == 0x2B || u[k] == 0x2D) { k += 1 }
        var ed = 0
        while k < u.count && u[k] >= 0x30 && u[k] <= 0x39 { k += 1; ed += 1 }
        guard ed > 0 else { return nil }
    }
    guard k == u.count, let v = Double(t), v.isFinite else { return nil }
    return v
}

/// General-format float renderer (research 12.8): the single implementation
/// shared by native and WASM targets so snapshots are byte-identical.
/// Integers inside Int64 range render exactly; `-0` renders as `0`.
public func formatGeneral(_ v: Double) -> String {
    if v == 0 { return "0" }
    if v.rounded() == v && abs(v) < 9.0e14 {
        return String(Int64(v))
    }
    return String(v)
}

/// Three-way comparison over the total order blank < number < string < bool
/// (research 4.3, 9.4). Strings compare by Unicode scalar order
/// (case-sensitive; locale collation is display-only). Errors never compare:
/// any error operand short-circuits to that error (both errors combine).
public enum CmpResult: Sendable {
    case less, equal, greater
}

public func compareValues(_ l: Value, _ r: Value) -> Result<CmpResult, ErrorCode> {
    if case .err(let e) = l {
        if case .err(let f) = r { return .failure(ErrorCode.combine(e, f)) }
        return .failure(e)
    }
    if case .err(let f) = r { return .failure(f) }
    switch (l, r) {
    case (.blank, .blank): return .success(.equal)
    case (.blank, _): return .success(.less)
    case (_, .blank): return .success(.greater)
    case (.num(let a), .num(let b)):
        return .success(a < b ? .less : (a > b ? .greater : .equal))
    case (.str(let a), .str(let b)):
        return .success(a < b ? .less : (a > b ? .greater : .equal))
    case (.bool(let a), .bool(let b)):
        return .success(a == b ? .equal : (a ? .greater : .less))
    default:
        // Cross-type: rank number 1 < string 2 < bool 3, no coercion.
        return .success(sortRank(l) < sortRank(r) ? .less : .greater)
    }
}

/// Sort rank for the total order (research 9.4). Errors never sort (the grid
/// places error-keyed rows last and flags the column; Phase 4).
public func sortRank(_ v: Value) -> Int {
    switch v {
    case .blank: return 0
    case .num: return 1
    case .str: return 2
    case .bool: return 3
    case .err: return 4
    }
}
