/// TabulaCore: pure-Swift spreadsheet calculation core (issue #282).
///
/// Zero JS imports. Zero platform calendar access. Determinism rules (binding,
/// research sections 6 and 12.8): no wall-clock reads except through the
/// injectable clock (Clock.swift, Phase 1); no RNG in v1 core; range folds
/// iterate in row-major address order; `Dictionary` iteration is forbidden in
/// evaluation paths.
///
/// Module order (blueprint milestones 1-3):
///   Phase 1: Lexer, Parser, AST, Value (+ coercions), Ref, Graph, Eval, Clock
///   Phase 2: BuiltinMath, BuiltinText, BuiltinLookup, BuiltinDate, BuiltinLogic
///   Phase 3: Workbook, Series, Format, CSV/JSON codecs, property suites
public enum TabulaCore {
    /// Core semantic version. Bumped only on normative behavior change; the
    /// JSON workbook `version` field (research section 11) gates migrations.
    public static let version = "0.1.0-phase0"

    /// Maximum addressable grid extent (research 3.1). Storage is sparse so
    /// empty cells cost nothing; these caps only bound address parsing.
    public static let maxColumns = 16_384
    public static let maxRows = 1_048_576
}
