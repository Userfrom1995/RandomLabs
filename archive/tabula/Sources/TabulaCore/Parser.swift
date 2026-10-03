/// Parser for Tabula formulas (research 3.4, normative).
///
/// Recursive descent with one token lookahead over `Lexer.lex` output.
/// Entry `FormulaParser.parse(source:host:sheets:)` requires the leading `=`
/// and a single trailing `.eof`, and returns either the AST or a `ParseError`
/// carrying the offending token position for the formula-bar display.
///
/// Precedence, lowest to highest (research 3.4, Excel-compatible):
/// comparison (`=`,`<>`,`<`,`<=`,`>`,`>=`), `&`, additive, multiplicative,
/// power (right-associative), unary (`-`/`+` bind looser than power, so
/// `-2^2 = -(2^2) = -4`), postfix `%` (so `-5% = -(5%)`), primary.
/// Power's right operand is factor-level, so `2^-3 = 2^(-3)` and right
/// associativity gives `2^3^2 = 2^(3^2) = 512`.
///
/// Malformed syntax yields `ParseError`; the Workbook layer (Phase 3) maps it
/// to a `#VALUE!` cell that retains source text plus position. Unknown names
/// and functions parse fine and evaluate to `#NAME?` (research 6).
public struct ParseError: Hashable, Sendable, Error {
    /// UTF-16 offset of the offending token (matches editor columns).
    public var pos: Int
    public var message: String

    public init(pos: Int, message: String) {
        self.pos = pos
        self.message = message
    }
}

public enum FormulaParser {
    /// Parse a full formula source including the leading `=`.
    public static func parse(
        _ source: String,
        host: Addr = Addr(sheet: 0, col: 0, row: 0),
        sheets: ParseSheets = .none
    ) -> Result<Expr, ParseError> {
        var p = Parser(tokens: Lexer.lex(source), host: host, sheets: sheets)
        return p.parseFormula()
    }
}

private struct Parser {
    var tokens: [Token]
    var pos: Int = 0
    var host: Addr
    var sheets: ParseSheets

    var peek: Token { tokens[pos] }
    var atEnd: Bool {
        if case .eof = peek.kind { return true }
        return false
    }

    mutating func advance() -> Token {
        let t = tokens[pos]
        if pos + 1 < tokens.count { pos += 1 }
        return t
    }

    func fail(_ t: Token, _ message: String) -> ParseError {
        ParseError(pos: t.pos, message: message)
    }

    mutating func parseFormula() -> Result<Expr, ParseError> {
        let first = advance()
        guard case .eq = first.kind else {
            return .failure(ParseError(pos: first.pos, message: "formula must start with ="))
        }
        if atEnd {
            return .failure(ParseError(pos: peek.pos, message: "empty formula"))
        }
        let expr: Expr
        do {
            expr = try parseComparison()
        } catch let e as ParseError {
            return .failure(e)
        } catch {
            return .failure(ParseError(pos: peek.pos, message: "parse failed"))
        }
        if !atEnd {
            return .failure(ParseError(pos: peek.pos, message: "unexpected trailing input"))
        }
        return .success(expr)
    }

    // MARK: - precedence chain

    mutating func parseComparison() throws -> Expr {
        var left = try parseConcat()
        while true {
            let op: BinOp
            switch peek.kind {
            case .eq: op = .eq
            case .ne: op = .ne
            case .lt: op = .lt
            case .le: op = .le
            case .gt: op = .gt
            case .ge: op = .ge
            case .error(let m): throw fail(peek, m)
            default: return left
            }
            _ = advance()
            let right = try parseConcat()
            left = .binary(op, left, right)
        }
    }

    mutating func parseConcat() throws -> Expr {
        var left = try parseAdd()
        while true {
            guard case .amp = peek.kind else { return left }
            _ = advance()
            let right = try parseAdd()
            left = .binary(.concat, left, right)
        }
    }

    mutating func parseAdd() throws -> Expr {
        var left = try parseMul()
        while true {
            let op: BinOp
            switch peek.kind {
            case .plus: op = .add
            case .minus: op = .sub
            default: return left
            }
            _ = advance()
            let right = try parseMul()
            left = .binary(op, left, right)
        }
    }

    mutating func parseMul() throws -> Expr {
        var left = try parseUnary()
        while true {
            let op: BinOp
            switch peek.kind {
            case .star: op = .mul
            case .slash: op = .div
            case .error(let m): throw fail(peek, m)
            default: return left
            }
            _ = advance()
            let right = try parseUnary()
            left = .binary(op, left, right)
        }
    }

    /// Factor level: leading signs, then power. Signs nest as unary nodes so
    /// `--5` is `neg(neg(5))` and the printer round-trips it.
    mutating func parseUnary() throws -> Expr {
        switch peek.kind {
        case .minus:
            _ = advance()
            return .unary(.neg, try parseUnary())
        case .plus:
            _ = advance()
            return .unary(.pos, try parseUnary())
        case .error(let m): throw fail(peek, m)
        default:
            return try parsePower()
        }
    }

    /// Power is right-associative with a factor-level right operand, so
    /// `2^3^2 = 2^(3^2)` and `2^-3 = 2^(-3)`.
    mutating func parsePower() throws -> Expr {
        let base = try parsePercent()
        guard case .caret = peek.kind else { return base }
        _ = advance()
        let exp = try parseUnary()
        return .binary(.pow, base, exp)
    }

    /// Postfix `%` binds tighter than unary: `-5%` is `-(5%)`.
    mutating func parsePercent() throws -> Expr {
        var e = try parsePrimary()
        while true {
            guard case .percent = peek.kind else { return e }
            _ = advance()
            e = .percent(e)
        }
    }

    // MARK: - primary

    mutating func parsePrimary() throws -> Expr {
        let t = peek
        switch t.kind {
        case .number(let v, _):
            _ = advance()
            return .num(v)
        case .string(let s):
            _ = advance()
            return .str(s)
        case .cellRef(let raw):
            _ = advance()
            let ref = try requireA1(raw, sheet: nil, sheetName: nil, pos: t.pos)
            return parseRangeTail(left: .ref(ref), pos: t.pos)
        case .r1c1(let raw):
            _ = advance()
            let ref = try requireR1C1(raw, sheet: nil, sheetName: nil, pos: t.pos)
            return parseRangeTail(left: .ref(ref), pos: t.pos)
        case .sheet(let name, _):
            _ = advance()
            return try parseSheetQualified(sheetName: name, pos: t.pos)
        case .ident(let word):
            _ = advance()
            return try parseIdent(word, pos: t.pos)
        case .lparen:
            _ = advance()
            let e = try parseComparison()
            guard case .rparen = peek.kind else { throw fail(peek, "expected )") }
            _ = advance()
            return e
        case .lbrace:
            return try parseArray()
        case .error(let m):
            throw fail(t, m)
        case .eof:
            throw fail(t, "unexpected end of formula")
        default:
            throw fail(t, "unexpected token in formula")
        }
    }

    /// An `Ident` word: boolean literal, function call, or named reference.
    /// Names and function names are case-insensitive, stored uppercased
    /// (research 3.2 note 1).
    mutating func parseIdent(_ word: String, pos: Int) throws -> Expr {
        let upper = word.uppercased()
        if upper == "TRUE" { return .bool(true) }
        if upper == "FALSE" { return .bool(false) }
        if case .lparen = peek.kind {
            _ = advance()
            var args: [Expr] = []
            if case .rparen = peek.kind {
                _ = advance()
                return .call(upper, args)
            }
            while true {
                args.append(try parseComparison())
                switch peek.kind {
                case .comma:
                    _ = advance()
                case .rparen:
                    _ = advance()
                    return .call(upper, args)
                case .error(let m):
                    throw fail(peek, m)
                default:
                    throw fail(peek, "expected , or ) in function call")
                }
            }
        }
        let e: Expr = .name(upper)
        if case .colon = peek.kind {
            throw fail(peek, "ranges over names are not supported in v1")
        }
        return e
    }

    /// After a primary cell ref, fold an optional `:ref` range tail.
    /// Only cell endpoints form ranges in v1; names never do.
    mutating func parseRangeTail(left: Expr, pos: Int) -> Expr {
        guard case .colon = peek.kind else { return left }
        guard case .ref = left else { return left }
        _ = advance()
        let t = peek
        switch t.kind {
        case .cellRef(let raw):
            _ = advance()
            guard let hi = parseA1CellRef(raw, host: host) else {
                return left
            }
            if case .ref(let lo) = left {
                return .range(RangeRef(lo: lo, hi: hi).normalized())
            }
            return left
        case .r1c1(let raw):
            _ = advance()
            guard let hi = parseR1C1CellRef(raw, host: host) else {
                return left
            }
            if case .ref(let lo) = left {
                return .range(RangeRef(lo: lo, hi: hi).normalized())
            }
            return left
        case .sheet(let name, _):
            _ = advance()
            let rt = peek
            switch rt.kind {
            case .cellRef(let raw2):
                _ = advance()
                guard let hi = parseA1CellRef(
                    raw2, host: host,
                    sheet: sheets.resolve(name), sheetName: name
                ) else { return left }
                if case .ref(let lo) = left {
                    return .range(RangeRef(lo: lo, hi: hi).normalized())
                }
                return left
            case .r1c1(let raw2):
                _ = advance()
                guard let hi = parseR1C1CellRef(
                    raw2, host: host,
                    sheet: sheets.resolve(name), sheetName: name
                ) else { return left }
                if case .ref(let lo) = left {
                    return .range(RangeRef(lo: lo, hi: hi).normalized())
                }
                return left
            default:
                return left
            }
        default:
            return left
        }
    }

    /// A sheet prefix followed by a cell ref, R1C1 ref, or bare name.
    /// Missing sheets stay unresolved (`sheetName` set, `sheet` nil) and
    /// evaluate to sticky `#REF!` per research 8.2; the AST keeps the name
    /// so a later rename can re-resolve.
    mutating func parseSheetQualified(sheetName: String, pos: Int) throws -> Expr {
        let idx = sheets.resolve(sheetName)
        let t = peek
        switch t.kind {
        case .cellRef(let raw):
            _ = advance()
            let ref = try requireA1(raw, sheet: idx, sheetName: sheetName, pos: t.pos)
            return parseRangeTail(left: .ref(ref), pos: t.pos)
        case .r1c1(let raw):
            _ = advance()
            let ref = try requireR1C1(raw, sheet: idx, sheetName: sheetName, pos: t.pos)
            return parseRangeTail(left: .ref(ref), pos: t.pos)
        case .ident(let word):
            _ = advance()
            let upper = word.uppercased()
            if upper == "TRUE" || upper == "FALSE" {
                throw fail(t, "boolean literal cannot be sheet-qualified")
            }
            if case .lparen = peek.kind {
                throw fail(peek, "function calls cannot be sheet-qualified")
            }
            return .name((sheetName + "!" + word).uppercased())
        case .error(let m):
            throw fail(t, m)
        default:
            throw fail(t, "expected a cell reference after sheet prefix")
        }
    }

    mutating func parseArray() throws -> Expr {
        _ = advance() // {
        var rows: [[Expr]] = []
        if case .rbrace = peek.kind {
            _ = advance()
            throw fail(peek, "empty array constant")
        }
        while true {
            var row: [Expr] = [try parseComparison()]
            while true {
                guard case .comma = peek.kind else { break }
                _ = advance()
                row.append(try parseComparison())
            }
            rows.append(row)
            switch peek.kind {
            case .semicolon:
                _ = advance()
            case .rbrace:
                _ = advance()
                return .arrayConst(rows)
            case .error(let m):
                throw fail(peek, m)
            default:
                throw fail(peek, "expected , ; or } in array constant")
            }
        }
    }

    // MARK: - ref decoding

    func requireA1(_ raw: String, sheet: Int?, sheetName: String?, pos: Int) throws -> CellRef {
        guard var ref = parseA1CellRef(raw, host: host, sheet: sheet, sheetName: sheetName) else {
            throw ParseError(pos: pos, message: "invalid cell reference")
        }
        if sheetName != nil && sheet == nil {
            ref.sheet = nil
            ref.sheetName = sheetName
        }
        return ref
    }

    func requireR1C1(_ raw: String, sheet: Int?, sheetName: String?, pos: Int) throws -> CellRef {
        guard var ref = parseR1C1CellRef(raw, host: host, sheet: sheet, sheetName: sheetName) else {
            throw ParseError(pos: pos, message: "invalid R1C1 reference")
        }
        if sheetName != nil && sheet == nil {
            ref.sheet = nil
            ref.sheetName = sheetName
        }
        return ref
    }
}
