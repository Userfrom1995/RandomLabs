/// Cell addresses and the bijective base-26 column codec (research 3.1, 8.1).
///
/// Internal storage is absolute and 0-based: column 0 displays as `A`, row 0
/// displays as `1`. The `$` flags and the R1C1 flag preserve author notation
/// for faithful reprint; they do not affect identity or hashing.
public struct Addr: Hashable, Sendable, Codable {
    /// 0-based sheet index.
    public var sheet: Int
    /// 0-based column index (`0` = A).
    public var col: Int
    /// 0-based row index (`0` = row 1).
    public var row: Int

    public init(sheet: Int, col: Int, row: Int) {
        self.sheet = sheet
        self.col = col
        self.row = row
    }

    /// True when every axis is inside the addressable grid (research 3.1).
    public var isInBounds: Bool {
        sheet >= 0 && col >= 0 && row >= 0
            && col < TabulaCore.maxColumns && row < TabulaCore.maxRows
    }
}

/// A single-cell reference as authored, with notation flags (research 3.5).
public struct CellRef: Hashable, Sendable, Codable {
    /// Nil means "same sheet as the host cell".
    public var sheet: Int?
    public var col: Int
    public var row: Int
    public var colAbs: Bool
    public var rowAbs: Bool
    /// True when authored in R1C1 notation (reprint preserves it).
    public var r1c1: Bool

    public init(sheet: Int? = nil, col: Int, row: Int,
                colAbs: Bool = false, rowAbs: Bool = false, r1c1: Bool = false) {
        self.sheet = sheet
        self.col = col
        self.row = row
        self.colAbs = colAbs
        self.rowAbs = rowAbs
        self.r1c1 = r1c1
    }
}

/// Normalized rectangular range (research 3.5, 8.2): `lo <= hi` per axis.
/// Normalization happens at parse time; graph expansion observes the rect.
public struct RangeRect: Hashable, Sendable, Codable {
    public var sheet: Int?
    public var loCol: Int
    public var loRow: Int
    public var hiCol: Int
    public var hiRow: Int

    public init(sheet: Int? = nil, loCol: Int, loRow: Int, hiCol: Int, hiRow: Int) {
        self.sheet = sheet
        self.loCol = min(loCol, hiCol)
        self.loRow = min(loRow, hiRow)
        self.hiCol = max(loCol, hiCol)
        self.hiRow = max(loRow, hiRow)
    }

    /// Member count. Callers expanding large ranges must use interval edges
    /// (research 5.1) rather than materializing this sequence.
    public var cellCount: Int { (hiCol - loCol + 1) * (hiRow - loRow + 1) }
}

/// Bijective base-26 column codec: `0->A ... 25->Z, 26->AA ...` (research 3.1).
/// There is no zero digit: `A` is 1 in codec space, so encode adds one first.
public enum ColumnCodec {
    /// `0 -> "A"`, `25 -> "Z"`, `26 -> "AA"`, `27 -> "AB"`. Negative input
    /// returns nil (caller maps it to `#REF!`, never a crash).
    public static func encode(_ col: Int) -> String? {
        guard col >= 0 && col < TabulaCore.maxColumns else { return nil }
        var n = col + 1
        var letters = ""
        while n > 0 {
            n -= 1
            letters = String(UnicodeScalar(65 + n % 26)!) + letters
            n /= 26
        }
        return letters
    }

    /// Inverse of `encode`. Returns nil for empty strings, non-letters, or
    /// columns beyond the grid cap (research 3.3 rule 3: over-range text lexes
    /// as a name and resolves to `#NAME?` later, never a lexer crash).
    public static func decode(_ letters: String) -> Int? {
        guard !letters.isEmpty && letters.count <= 7 else { return nil }
        var n = 0
        for scalar in letters.uppercased().unicodeScalars {
            guard scalar.value >= 65 && scalar.value <= 90 else { return nil }
            n = n * 26 + Int(scalar.value - 64)
            guard n <= TabulaCore.maxColumns else { return nil }
        }
        return n - 1
    }
}
