/// AST for Tabula formulas (research 3.5, normative).
///
/// `CellRef` (in `Addr.swift`) preserves the author's notation (`$` flags,
/// R1C1 flag) plus the parse-time host base for faithful reprint and correct
/// relative resolution. This file owns the expression tree, precedence levels
/// for printing, and the round-trip printer `toFormulaString()` with the
/// binding invariant `parse(print(parse(s))) == parse(s)` as AST equality
/// (research 3.5b, property test in Phase 1 suites).
public enum UnOp: Hashable, Sendable {
    case neg, pos
}

public enum BinOp: Hashable, Sendable {
    case add, sub, mul, div, pow
    case concat
    case eq, ne, lt, le, gt, ge
}

/// A rectangular range with per-endpoint notation preserved (research 3.5,
/// 8.2). Normalization (`lo <= hi` per axis) happens at parse time; the graph
/// expands the rect for observable semantics (research 5.1).
public struct RangeRef: Hashable, Sendable {
    public var lo: CellRef
    public var hi: CellRef

    public init(lo: CellRef, hi: CellRef) {
        self.lo = lo
        self.hi = hi
    }

    /// Per-axis normalization: swap column (value + flag + base) and row
    /// triples independently so `B2:A1` observes the same rect as `A1:B2`.
    /// Safe because both endpoints share one parse-time host base.
    public func normalized() -> RangeRef {
        var lo = lo
        var hi = hi
        if lo.col > hi.col {
            (lo.col, hi.col) = (hi.col, lo.col)
            (lo.colAbs, hi.colAbs) = (hi.colAbs, lo.colAbs)
            (lo.baseCol, hi.baseCol) = (hi.baseCol, lo.baseCol)
        }
        if lo.row > hi.row {
            (lo.row, hi.row) = (hi.row, lo.row)
            (lo.rowAbs, hi.rowAbs) = (hi.rowAbs, lo.rowAbs)
            (lo.baseRow, hi.baseRow) = (hi.baseRow, lo.baseRow)
        }
        return RangeRef(lo: lo, hi: hi)
    }
}

public indirect enum Expr: Hashable, Sendable {
    case num(Double)
    case str(String)
    case bool(Bool)
    case ref(CellRef)
    case range(RangeRef)
    /// Workbook-global name, stored uppercased (case-insensitive per 3.2.1).
    case name(String)
    /// Function call, name stored uppercased (case-insensitive per 3.2.1).
    case call(String, [Expr])
    case unary(UnOp, Expr)
    case binary(BinOp, Expr, Expr)
    /// Postfix `%` sugar: evaluates to `v/100` (research 3.2 note 3). Kept as
    /// its own node so the printer round-trips `p%` instead of `p/100`.
    case percent(Expr)
    /// Array constants `{"a",1;2,3}` (research 3.2 note 4). v1 evaluator
    /// support is limited; a bare array in scalar position yields its top-left
    /// element (documented, not silent).
    case arrayConst([[Expr]])
    /// Literal error from constant folding.
    case errLit(ErrorCode)
}

extension Expr {
    /// Precedence level (lowest to highest): comparison 1, `&` 2, additive 3,
    /// multiplicative 4, power 5 (right-assoc), unary 6, postfix `%` 7,
    /// primary 8. Matches the parser so the printer parenthesizes correctly.
    var prec: Int {
        switch self {
        case .binary(let op, _, _):
            switch op {
            case .eq, .ne, .lt, .le, .gt, .ge: return 1
            case .concat: return 2
            case .add, .sub: return 3
            case .mul, .div: return 4
            case .pow: return 5
            }
        case .unary: return 6
        case .percent: return 7
        default: return 8
        }
    }

    /// Canonical formula source, starting with `=`. Round-trip invariant:
    /// `parse(print(parse(s))) == parse(s)` as AST equality.
    public func toFormulaString() -> String {
        "=" + printed(minPrec: 0)
    }

    func printed(minPrec: Int) -> String {
        switch self {
        case .num(let v):
            return printNum(v, minPrec)
        case .str(let s):
            return "\"" + s.replacingOccurrences(of: "\"", with: "\"\"") + "\""
        case .bool(let b):
            return b ? "TRUE" : "FALSE"
        case .ref(let r):
            return r.toA1String()
        case .range(let rr):
            return rr.lo.toA1String() + ":" + rr.hi.toA1String()
        case .name(let n):
            return n
        case .call(let fn, let args):
            return fn + "(" + args.map { $0.printed(minPrec: 0) }.joined(separator: ",") + ")"
        case .unary(let op, let e):
            // Operand printed at prec 5 so `-2^2` reprints bare and reparses
            // to the same tree (power binds tighter than unary per 3.4).
            let inner = e.printed(minPrec: 5)
            let s = (op == .neg ? "-" : "+") + inner
            return prec < minPrec ? "(" + s + ")" : s
        case .binary(let op, let l, let r):
            let sym: String
            switch op {
            case .add: sym = "+"; case .sub: sym = "-"
            case .mul: sym = "*"; case .div: sym = "/"
            case .pow: sym = "^"; case .concat: sym = "&"
            case .eq: sym = "="; case .ne: sym = "<>"
            case .lt: sym = "<"; case .le: sym = "<="
            case .gt: sym = ">"; case .ge: sym = ">="
            }
            let p = prec
            let left: String
            let right: String
            if op == .pow {
                // Right associative: `2^3^2` = `2^(3^2)`.
                left = l.printed(minPrec: p + 1)
                right = r.printed(minPrec: p)
            } else if p == 1 {
                // Comparisons fold left; `a<b<c` reprints bare, reparses same.
                left = l.printed(minPrec: p)
                right = r.printed(minPrec: p + 1)
            } else {
                left = l.printed(minPrec: p)
                right = r.printed(minPrec: p + 1)
            }
            let s = left + sym + right
            return p < minPrec ? "(" + s + ")" : s
        case .percent(let e):
            let s = e.printed(minPrec: 7) + "%"
            return prec < minPrec ? "(" + s + ")" : s
        case .arrayConst(let rows):
            let body = rows.map { row in
                row.map { $0.printed(minPrec: 0) }.joined(separator: ",")
            }.joined(separator: ";")
            return "{" + body + "}"
        case .errLit(let e):
            return e.rawValue
        }
    }

    private func printNum(_ v: Double, _ minPrec: Int) -> String {
        // Unary minus prints at prec 6: a negative literal needs parens when
        // the context binds tighter than unary (e.g. `2^-3` stays bare? no:
        // `2^-3` parses as 2^(-3) since factor handles signs, so bare is
        // correct; but `(-3)^2` differs from `-3^2`, hence parens).
        if v < 0 || (v == 0 && v.sign == .minus) {
            let s = formatGeneral(-v)
            let inner = "-" + s
            return 6 < minPrec ? "(" + inner + ")" : inner
        }
        return formatGeneral(v)
    }
}
