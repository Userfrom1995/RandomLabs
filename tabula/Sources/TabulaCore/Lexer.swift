/// Lexer for Tabula formulas (research 3.3, normative).
///
/// Single-pass O(n) scan over the source, no backtracking. Token kinds mirror
/// the research spec: `Eq, Number, String, Bool, Ident, CellRef, SheetBang,
/// LParen, RParen, LBrace, RBrace, Comma, Semicolon, Colon, Caret, Amp, Plus,
/// Minus, Star, Slash, Percent, Lt, Le, Gt, Ge, Ne, Assign, Bang, Eof,
/// ErrorTok`. Whitespace (space, tab) is allowed between any two tokens, never
/// inside a token. Newlines are rejected as `ErrorTok` (the formula bar is a
/// single line per research 3.2 note 2).
///
/// Greedy-but-validated cell-ref recognition (research 3.3 rule 3):
/// `[A-Za-z]+[0-9]+` with column letters in range is a `CellRef`; over-range
/// text lexes as `Ident` and resolves later to `#NAME?`, never a lexer crash.
/// A bare name run followed by `!` (or a quoted `'...'!`) lexes as a sheet
/// prefix, not as name plus bang (rule 2). Multi-char operators use maximal
/// munch (rule 1). Malformed numbers and unterminated strings produce a single
/// `ErrorTok` that the parser converts to `#VALUE!` with position info
/// (rules 4-5).
public enum TokenKind: Hashable, Sendable {
    case number(Double, String)
    case string(String)
    case ident(String)
    /// Raw A1 text as authored, e.g. `$A$1`. Decoded by `Ref.swift`.
    case cellRef(String)
    /// Raw R1C1 text as authored, e.g. `R[2]C[-1]`. Decoded by `Ref.swift`.
    case r1c1(String)
    /// Sheet prefix with the `!` consumed. `name` is unquoted/unescaped.
    case sheet(String, quoted: Bool)
    case lparen, rparen, lbrace, rbrace, comma, semicolon, colon
    case caret, amp, plus, minus, star, slash, percent
    case lt, le, gt, ge, ne, eq
    case bang, eof
    /// Single error token with a human message; the parser turns it into a
    /// `ParseError` carrying this token's position.
    case error(String)
}

/// A lexed token with its UTF-16 offset in the source for editor display.
public struct Token: Hashable, Sendable {
    public var kind: TokenKind
    /// UTF-16 code-unit offset of the token start (matches editor columns).
    public var pos: Int

    public init(kind: TokenKind, pos: Int) {
        self.kind = kind
        self.pos = pos
    }
}

public enum Lexer {
    /// Lex a full formula source (including the leading `=`). Always returns
    /// a token array terminated by exactly one `.eof` token.
    public static func lex(_ source: String) -> [Token] {
        var lx = LexState(source)
        lx.run()
        return lx.tokens
    }
}

private struct LexState {
    let units: [UInt16]
    var i: Int = 0
    var tokens: [Token] = []

    init(_ source: String) {
        units = Array(source.utf16)
    }

    var atEnd: Bool { i >= units.count }

    mutating func run() {
        while !atEnd {
            let c = units[i]
            // Whitespace between tokens: space and tab only.
            if c == 0x20 || c == 0x09 { i += 1; continue }
            let pos = i
            switch c {
            case 0x3D: // =
                i += 1
                tokens.append(Token(kind: .eq, pos: pos))
            case 0x28: i += 1; tokens.append(Token(kind: .lparen, pos: pos))
            case 0x29: i += 1; tokens.append(Token(kind: .rparen, pos: pos))
            case 0x7B: i += 1; tokens.append(Token(kind: .lbrace, pos: pos))
            case 0x7D: i += 1; tokens.append(Token(kind: .rbrace, pos: pos))
            case 0x2C: i += 1; tokens.append(Token(kind: .comma, pos: pos))
            case 0x3B: i += 1; tokens.append(Token(kind: .semicolon, pos: pos))
            case 0x3A: i += 1; tokens.append(Token(kind: .colon, pos: pos))
            case 0x5E: i += 1; tokens.append(Token(kind: .caret, pos: pos))
            case 0x26: i += 1; tokens.append(Token(kind: .amp, pos: pos))
            case 0x2B: i += 1; tokens.append(Token(kind: .plus, pos: pos))
            case 0x2D: i += 1; tokens.append(Token(kind: .minus, pos: pos))
            case 0x2A: i += 1; tokens.append(Token(kind: .star, pos: pos))
            case 0x2F: i += 1; tokens.append(Token(kind: .slash, pos: pos))
            case 0x25: i += 1; tokens.append(Token(kind: .percent, pos: pos))
            case 0x3C: // < <= <>
                i += 1
                if !atEnd && units[i] == 0x3D { i += 1; tokens.append(Token(kind: .le, pos: pos)) }
                else if !atEnd && units[i] == 0x3E { i += 1; tokens.append(Token(kind: .ne, pos: pos)) }
                else { tokens.append(Token(kind: .lt, pos: pos)) }
            case 0x3E: // > >=
                i += 1
                if !atEnd && units[i] == 0x3D { i += 1; tokens.append(Token(kind: .ge, pos: pos)) }
                else { tokens.append(Token(kind: .gt, pos: pos)) }
            case 0x21: // ! alone (sheet prefixes consume their own !)
                i += 1
                tokens.append(Token(kind: .bang, pos: pos))
            case 0x22: lexString(start: pos)
            case 0x27: lexQuotedSheetOrError(start: pos)
            case 0x24: lexDollarWord(start: pos) // $A$1 or $name
            default:
                if isDigit(c) || (c == 0x2E && nextIsDigit) {
                    lexNumber(start: pos)
                } else if isLetter(c) || c == 0x5F {
                    lexWord(start: pos)
                } else if c == 0x0A || c == 0x0D {
                    i += 1
                    tokens.append(Token(kind: .error("newline not allowed inside a formula"), pos: pos))
                } else {
                    i += 1
                    tokens.append(Token(kind: .error("unexpected character"), pos: pos))
                }
            }
        }
        tokens.append(Token(kind: .eof, pos: i))
    }

    // MARK: - helpers

    var nextIsDigit: Bool {
        i + 1 < units.count && isDigit(units[i + 1])
    }

    func isDigit(_ c: UInt16) -> Bool { c >= 0x30 && c <= 0x39 }
    func isLetter(_ c: UInt16) -> Bool {
        (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)
    }
    func isNameChar(_ c: UInt16) -> Bool {
        isLetter(c) || isDigit(c) || c == 0x5F || c == 0x2E
    }

    func str(_ from: Int, _ to: Int) -> String {
        String(decoding: units[from..<to], as: UTF16.self)
    }

    // MARK: - strings

    mutating func lexString(start: Int) {
        // Opening quote at i. "" escapes a quote.
        i += 1
        var out = ""
        var closed = false
        while !atEnd {
            let c = units[i]
            if c == 0x22 {
                if i + 1 < units.count && units[i + 1] == 0x22 {
                    out.append("\"")
                    i += 2
                } else {
                    i += 1
                    closed = true
                    break
                }
            } else if c == 0x0A || c == 0x0D {
                break
            } else {
                let (ch, n) = decodeUnit(units, i)
                out.append(ch)
                i += n
            }
        }
        if closed {
            tokens.append(Token(kind: .string(out), pos: start))
        } else {
            tokens.append(Token(kind: .error("unterminated string"), pos: start))
        }
    }

    // MARK: - sheet prefixes

    /// `'Q1 Sales'!A1`. A quote run NOT followed by `!` is a stray error.
    mutating func lexQuotedSheetOrError(start: Int) {
        var j = i + 1
        var name = ""
        var closed = false
        while j < units.count {
            let c = units[j]
            if c == 0x27 {
                if j + 1 < units.count && units[j + 1] == 0x27 {
                    name.append("'")
                    j += 2
                } else {
                    j += 1
                    closed = true
                    break
                }
            } else if c == 0x0A || c == 0x0D {
                break
            } else {
                let (ch, n) = decodeUnit(units, j)
                name.append(ch)
                j += n
            }
        }
        if closed && j < units.count && units[j] == 0x21 {
            i = j + 1
            tokens.append(Token(kind: .sheet(name, quoted: true), pos: start))
        } else {
            i = j
            tokens.append(Token(kind: .error("quoted text must be followed by ! to form a sheet reference"), pos: start))
        }
    }

    // MARK: - words, refs, names

    /// Words starting with `$`: either `$A$1`-style refs or `$`-led idents.
    mutating func lexDollarWord(start: Int) {
        var j = i + 1
        while j < units.count && isLetter(units[j]) { j += 1 }
        let letters = str(i + 1, j)
        var k = j
        if k < units.count && units[k] == 0x24 { k += 1 } // second $
        var m = k
        while m < units.count && isDigit(units[m]) { m += 1 }
        if !letters.isEmpty && m > k {
            let raw = str(i, m)
            if RefValidate.isA1Ref(raw) {
                i = m
                tokens.append(Token(kind: .cellRef(raw), pos: start))
                return
            }
        }
        // Not a ref: scan a $-led ident tail and emit as ident.
        var n = i + 1
        while n < units.count && isNameChar(units[n]) { n += 1 }
        if n == i + 1 { n = i + 1 }
        i = n
        tokens.append(Token(kind: .ident(str(start, n)), pos: start))
    }

    /// Words starting with a letter or `_`: R1C1 attempt, then bare-sheet
    /// check, then A1-or-name. A ref-shaped run immediately followed by `(`
    /// is a function call (`LOG10(100)`), never a cell ref: Excel resolves
    /// the same ambiguity toward calls.
    mutating func lexWord(start: Int) {
        // R1C1 attempt for R/r starts (R2C3 would otherwise mis-lex).
        if units[i] == 0x52 || units[i] == 0x72 {
            if let end = RefValidate.r1c1End(units, from: i) {
                // Guard: a longer name run continues (e.g. R2C3Q)? R1C1 runs
                // never contain letters beyond the R...C shape, so any letter
                // right after means this was a name after all. A `(` right
                // after means a function call (same rule as A1 below).
                let followsLetter = end < units.count && isLetter(units[end])
                let followsParen = end < units.count && units[end] == 0x28
                if !followsLetter && !followsParen {
                    i = end
                    tokens.append(Token(kind: .r1c1(str(start, end)), pos: start))
                    return
                }
                if followsParen {
                    var j = i
                    while j < units.count && isNameChar(units[j]) { j += 1 }
                    i = j
                    tokens.append(Token(kind: .ident(str(start, j)), pos: start))
                    return
                }
            }
        }
        var j = i
        // The run includes `$` so mixed refs (`A$1`) stay one token for the
        // A1 validator; `$`-led words still enter via `lexDollarWord`.
        while j < units.count && (isNameChar(units[j]) || units[j] == 0x24) { j += 1 }
        // Bare sheet prefix: NameChar run followed by `!`.
        if j < units.count && units[j] == 0x21 && j > i {
            let raw = str(i, j)
            // A run that is exactly a valid cell ref (A1) followed by `!` is
            // still a sheet name (quoted form is preferred, but accept it).
            if raw.first?.isLetter ?? false {
                i = j + 1
                tokens.append(Token(kind: .sheet(raw, quoted: false), pos: start))
                return
            }
        }
        let raw = str(i, j)
        i = j
        if RefValidate.isA1Ref(raw) && !(j < units.count && units[j] == 0x28) {
            tokens.append(Token(kind: .cellRef(raw), pos: start))
        } else {
            tokens.append(Token(kind: .ident(raw), pos: start))
        }
    }

    // MARK: - numbers

    /// Grammar: `digits [. digits] [e[+-]digits] | . digits [exponent]`.
    /// Malformed numbers (`1e`, `1.2.3`) produce one `ErrorTok`.
    mutating func lexNumber(start: Int) {
        var j = i
        while j < units.count && isDigit(units[j]) { j += 1 }
        let intEnd = j
        var hasFrac = false
        if j < units.count && units[j] == 0x2E {
            // Accept `1.` only if no second dot follows (else `1.2.3` error).
            var k = j + 1
            while k < units.count && isDigit(units[k]) { k += 1 }
            if k > j + 1 || intEnd > i {
                // Check for a second dot immediately (malformed `1.2.3`).
                if k < units.count && units[k] == 0x2E {
                    i = k + 1
                    tokens.append(Token(kind: .error("malformed number"), pos: start))
                    return
                }
                hasFrac = true
                j = k
            }
        }
        var expEnd = j
        if j < units.count && (units[j] == 0x65 || units[j] == 0x45) {
            var k = j + 1
            if k < units.count && (units[k] == 0x2B || units[k] == 0x2D) { k += 1 }
            let d0 = k
            while k < units.count && isDigit(units[k]) { k += 1 }
            if k == d0 {
                // `1e` with no digits: malformed, consume the `e[sign]`.
                i = k
                tokens.append(Token(kind: .error("malformed number exponent"), pos: start))
                return
            }
            expEnd = k
            j = k
        }
        _ = hasFrac
        _ = expEnd
        let raw = str(i, j)
        i = j
        // Non-finite literals (e.g. `1e999`) are rejected at lex time so no
        // `Num(inf)` ever enters the AST; computation overflow maps to `#NUM!`
        // in the evaluator instead (research 6).
        if let v = Double(raw), v.isFinite {
            tokens.append(Token(kind: .number(v, raw), pos: start))
        } else {
            tokens.append(Token(kind: .error("number out of range"), pos: start))
        }
    }
}

/// Decode one UTF-16 unit at `idx` (combining surrogate pairs into the
/// astral character), returning the character plus units consumed. Unpaired
/// surrogates degrade to U+FFFD, never a crash.
private func decodeUnit(_ units: [UInt16], _ idx: Int) -> (Character, Int) {
    let c = units[idx]
    if c >= 0xD800 && c <= 0xDBFF, idx + 1 < units.count {
        let lo = units[idx + 1]
        if lo >= 0xDC00 && lo <= 0xDFFF {
            let v = 0x10000 + (UInt32(c - 0xD800) << 10) + UInt32(lo - 0xDC00)
            return (Character(UnicodeScalar(v)!), 2)
        }
    }
    if let s = UnicodeScalar(c) { return (Character(s), 1) }
    return ("�", 1)
}

/// Pure validation helpers shared by the lexer and `Ref.swift`.
public enum RefValidate {
    /// True for `$?letters$?digits` with the column inside the grid cap and
    /// the row in `1...maxRows` (research 3.3 rule 3). Over-range text must
    /// lex as `Ident`, never crash.
    public static func isA1Ref(_ raw: String) -> Bool {
        var s = raw
        if s.hasPrefix("$") { s = String(s.dropFirst()) }
        var li = s.startIndex
        while li < s.endIndex && s[li].isLetter { li = s.index(after: li) }
        let letPart = String(s[..<li])
        if letPart.isEmpty { return false }
        var rest = String(s[li...])
        if rest.hasPrefix("$") { rest = String(rest.dropFirst()) }
        if rest.isEmpty || !rest.allSatisfy({ $0.isNumber }) { return false }
        guard ColumnCodec.decode(letPart) != nil else { return false }
        guard let row = Int(rest), row >= 1 && row <= TabulaCore.maxRows else { return false }
        return true
    }

    /// If units[from...] starts a complete R1C1 ref, return the end offset.
    /// Forms: `RC`, `R5C`, `RC3`, `R5C3`, `R[1]C`, `RC[-2]`, `R[1]C[-2]`.
    /// Requires the `C`; bare `R5` stays on the A1/name path.
    public static func r1c1End(_ units: [UInt16], from: Int) -> Int? {
        var k = from + 1 // past R
        // Optional row part: [sint] or digits.
        if k < units.count && units[k] == 0x5B {
            k += 1
            if k < units.count && (units[k] == 0x2B || units[k] == 0x2D) { k += 1 }
            let d0 = k
            while k < units.count && units[k] >= 0x30 && units[k] <= 0x39 { k += 1 }
            if k == d0 || k >= units.count || units[k] != 0x5D { return nil }
            k += 1
        } else {
            while k < units.count && units[k] >= 0x30 && units[k] <= 0x39 { k += 1 }
        }
        guard k < units.count && (units[k] == 0x43 || units[k] == 0x63) else { return nil }
        k += 1
        if k < units.count && units[k] == 0x5B {
            k += 1
            if k < units.count && (units[k] == 0x2B || units[k] == 0x2D) { k += 1 }
            let d0 = k
            while k < units.count && units[k] >= 0x30 && units[k] <= 0x39 { k += 1 }
            if k == d0 || k >= units.count || units[k] != 0x5D { return nil }
            k += 1
        } else {
            while k < units.count && units[k] >= 0x30 && units[k] <= 0x39 { k += 1 }
        }
        return k
    }

    private static func isASCIILetter(_ c: UInt16) -> Bool {
        (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)
    }
}
