/// Cell formats: opaque style records (research 9.1, normative).
///
/// Formats NEVER change values: `Workbook.setStyle` writes a record only and
/// never triggers recalculation (a Phase 3 test pins this). The single
/// exception is entry-time text-vs-number coercion (leading `'` forces text),
/// which is an edit handled by `Workbook.setCell`, not a format.
///
/// Number formats: general (locale-independent core rendering), fixed
/// decimals, currency (symbol + decimals), percent (value x 100 + `%`), ISO
/// date (`yyyy-mm-dd` default; locale patterns are display-only and out of
/// scope), text (display as-is). Fill, borders, alignment, and font flags are
/// stored opaquely for the Phase 4 panels.
import Foundation

public enum NumberFormat: Hashable, Sendable, Codable {
    case general
    case fixed(decimals: Int)
    case currency(symbol: String, decimals: Int)
    case percent(decimals: Int)
    case isoDate
    case text
}

public struct StyleRecord: Hashable, Sendable, Codable {
    public var numberFormat: NumberFormat
    public var bold: Bool
    public var italic: Bool
    public var fillRGB: String?
    public var alignment: String?

    public init(
        numberFormat: NumberFormat = .general,
        bold: Bool = false,
        italic: Bool = false,
        fillRGB: String? = nil,
        alignment: String? = nil
    ) {
        self.numberFormat = numberFormat
        self.bold = bold
        self.italic = italic
        self.fillRGB = fillRGB
        self.alignment = alignment
    }

    public static var `default`: StyleRecord { StyleRecord() }
}

public enum Format {
    /// Display rendering of a computed value under a number format.
    /// Errors render as their codes, blanks as empty, bools as TRUE/FALSE,
    /// strings as-is (formats never coerce the value, only its display).
    public static func display(_ value: Value, as fmt: NumberFormat) -> String {
        switch value {
        case .err(let e): return e.rawValue
        case .blank: return ""
        case .bool(let b): return b ? "TRUE" : "FALSE"
        case .str(let s): return s
        case .num(let x):
            switch fmt {
            case .general, .text: return formatGeneral(x)
            case .fixed(let d): return fixed(x, decimals: d)
            case .currency(let sym, let d): return sym + fixed(x, decimals: d)
            case .percent(let d): return fixed(x * 100, decimals: d) + "%"
            case .isoDate:
                let (y, m, d) = serialToYMD(Int(x.rounded(.towardZero)))
                return String(format: "%04d-%02d-%02d", y, m, d)
            }
        }
    }

    /// Fixed-decimal rendering with half-away-from-zero rounding (matches
    /// `ROUND` semantics, research 7.1). `-0` renders as `0`-family.
    static func fixed(_ x: Double, decimals: Int) -> String {
        guard x.isFinite else { return formatGeneral(x) }
        let d = max(0, decimals)
        let f = pow(10.0, Double(d))
        var r = (x * f).rounded(.toNearestOrAwayFromZero) / f
        if r == 0 { r = 0 }
        if d == 0 { return String(Int64(r)) }
        var s = String(r)
        if let dot = s.firstIndex(of: ".") {
            let have = s.distance(from: dot, to: s.endIndex) - 1
            if have < d {
                s += String(repeating: "0", count: d - have)
            } else if have > d {
                s = String(s.prefix(s.count - (have - d)))
            }
        } else {
            s += "." + String(repeating: "0", count: d)
        }
        return s
    }
}
