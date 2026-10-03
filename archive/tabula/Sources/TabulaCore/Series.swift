/// Fill-handle series detection as a pure function (research 8.4, normative).
///
/// `Series.extend(values:count:)` previews the next `count` atoms after the
/// given block without touching the workbook, so the UI can render an autofill
/// preview before commit. Laws (research 8.4):
/// - numbers/dates: constant step from the last two values (single value
///   copies; Excel-compatible copy-on-single).
/// - text with a trailing number: increments the trailing number (step from
///   the last two when they share a prefix, else +1); otherwise copies.
/// - everything else (bools, blanks, mixed without a numeric run): copies the
///   last atom.
///
/// Formula fill is NOT handled here: formula cells fill by copy/paste
/// translation along the drag vector (`Workbook.fillRange`), per research 8.4.
public enum FillAtom: Hashable, Sendable {
    case num(Double)
    case text(String)
    case bool(Bool)
    case blank
}

public enum Series {
    /// Preview the next `count` fill atoms after `values`. Pure: no workbook
    /// access, deterministic, total (empty input yields blanks).
    public static func extend(_ values: [FillAtom], count: Int) -> [FillAtom] {
        guard count > 0 else { return [] }
        guard let last = values.last else {
            return Array(repeating: .blank, count: count)
        }
        if let step = numericStep(values) {
            // Numeric run: continue the arithmetic progression.
            let base: Double
            switch last {
            case .num(let x): base = x
            case .text(let s):
                let (_, n, _) = splitTrailingNumber(s)
                base = Double(n ?? 0)
            default: base = 0
            }
            return (1...count).map { k in
                applyNumericStep(last: last, base: base, step: step, k: k)
            }
        }
        if case .text(let s) = last, splitTrailingNumber(s).number != nil {
            // Single trailing-number text: increment by one.
            return (1...count).map { k in bumpTrailing(s, by: Double(k)) }
        }
        return Array(repeating: last, count: count)
    }

    // MARK: - internals

    /// Step of the trailing numeric run, or nil when the last two atoms do
    /// not form a numeric run. A single trailing numeric atom is NOT a run
    /// (nil): lone numbers copy, lone trailing-number texts increment by one
    /// (handled in `extend`), per research 8.4.
    static func numericStep(_ values: [FillAtom]) -> Double? {
        let tail = Array(values.suffix(2).filter { $0 != .blank })
        guard tail.count == 2 else { return nil }
        guard let a = numericValue(tail[0]), let b = numericValue(tail[1])
        else { return nil }
        // Text atoms only join a run when both carry trailing numbers with
        // the same prefix; otherwise the tail is not a numeric run.
        if case .text(let s0) = tail[0], case .text(let s1) = tail[1] {
            let (p0, n0, _) = splitTrailingNumber(s0)
            let (p1, n1, _) = splitTrailingNumber(s1)
            guard n0 != nil, n1 != nil, p0 == p1 else { return nil }
            return Double(n1! - n0!)
        }
        return b - a
    }

    /// Numeric value of an atom for run detection: nums directly, trailing
    /// numbers of text; bools/blanks never join.
    static func numericValue(_ atom: FillAtom) -> Double? {
        switch atom {
        case .num(let x): return x
        case .text(let s):
            if let n = splitTrailingNumber(s).number { return Double(n) }
            return nil
        case .bool, .blank: return nil
        }
    }

    static func applyNumericStep(
        last: FillAtom, base: Double, step: Double, k: Int
    ) -> FillAtom {
        switch last {
        case .num:
            return .num(base + step * Double(k))
        case .text(let s):
            return bumpTrailing(s, by: step * Double(k))
        case .bool, .blank:
            return last
        }
    }

    /// Increment the trailing integer of `s` by `delta` (truncated toward
    /// zero). Preserves the authored zero-padding width when the result fits.
    static func bumpTrailing(_ s: String, by delta: Double) -> FillAtom {
        let (prefix, number, width) = splitTrailingNumber(s)
        guard let n = number else { return .text(s) }
        let step = Int(delta.rounded(.towardZero))
        let next = n + step
        let sign = next < 0 ? "-" : ""
        var body = String(abs(next))
        if body.count < width {
            body = String(repeating: "0", count: width - body.count) + body
        }
        return .text(prefix + sign + body)
    }

    /// Split `s` into (non-digit prefix, trailing integer, digit width).
    /// Returns (s, nil, 0) when there is no trailing digit run. The width is
    /// the authored digit count (so `A09` pads to width 2, not `Int` width 1).
    static func splitTrailingNumber(
        _ s: String
    ) -> (prefix: String, number: Int?, width: Int) {
        let end = s.endIndex
        var start = end
        while start > s.startIndex, s[s.index(before: start)].isNumber {
            start = s.index(before: start)
        }
        guard start < end else { return (s, nil, 0) }
        let digits = String(s[start..<end])
        guard let n = Int(digits) else { return (s, nil, 0) }
        return (String(s[..<start]), n, digits.count)
    }
}
