/// Error codes (research 4.2, normative).
///
/// Display strings are exact: `#DIV/0!`, `#N/A`, `#NAME?`, `#NUM!`, `#REF!`,
/// `#VALUE!`, `#CYCLE!`. `#CYCLE!` is Tabula-specific (Excel shows 0 with a
/// warning; Tabula surfaces the error explicitly per issue #282 scope).
public enum ErrorCode: String, Hashable, Sendable, Codable, CaseIterable, Error {
    case div0 = "#DIV/0!"
    case ref = "#REF!"
    case cycle = "#CYCLE!"
    case value = "#VALUE!"
    case name = "#NAME?"
    case na = "#N/A"
    case num = "#NUM!"

    /// Deterministic precedence when two errors meet in one binary op
    /// (research 4.4): `#CYCLE! > #REF! > #DIV/0! > #NAME? > #VALUE! > #N/A
    /// > #NUM!`. Cycle always surfaces; reference loss is next.
    /// Higher number wins.
    public var precedence: Int {
        switch self {
        case .cycle: return 7
        case .ref: return 6
        case .div0: return 5
        case .name: return 4
        case .value: return 3
        case .na: return 2
        case .num: return 1
        }
    }

    /// The winning error when two errors meet. Total and deterministic
    /// (research Theorem 4: error propagation is monotone).
    public static func combine(_ a: ErrorCode, _ b: ErrorCode) -> ErrorCode {
        a.precedence >= b.precedence ? a : b
    }
}
