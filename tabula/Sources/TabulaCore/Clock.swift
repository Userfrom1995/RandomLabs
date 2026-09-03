/// Injectable clock and serial date model (research 6, 7.5, normative).
///
/// Core never reads the platform calendar: `eval` takes a `todaySerial`
/// parameter, and headless tests fix it. This file owns the serial <-> civil
/// conversion as pure integer math (Howard Hinnant's civil algorithms), so
/// native and WASM targets agree byte-for-byte.
///
/// Serial model (research 7.5): day numbers with epoch 1899-12-30 = 0,
/// Excel-compatible *including* the Lotus 1900 leap bug: serial 60 is the
/// nonexistent 1900-02-29 (accepted on input, produced never by normal
/// arithmetic), serial 59 is 1900-02-28, serial 61 is 1900-03-01. Dates on or
/// after 1900-03-01 equal true days since the epoch; dates from 1900-01-01 to
/// 1900-02-28 read one less (serial 1 = 1900-01-01); 1899-12-31 is
/// unrepresentable and never produced. `DATE` serials are integers; TODAY has
/// no time fraction in v1.
public struct TabulaClock: Hashable, Sendable {
    /// Injected "today" as a serial day number. Tests fix this; the UI feeds
    /// the real date through the Bridge (never through Core calendar APIs).
    public var todaySerial: Int

    public init(todaySerial: Int) {
        self.todaySerial = todaySerial
    }
}

/// Largest serial `DATE` may produce: year 9999-12-31 (research 7.5).
/// Larger results are `#NUM!`, never clamped.
public let tabulaMaxSerial = 2_958_465

/// Convert a civil date to a serial. Returns nil for year < 0 (caller maps to
/// `#NUM!`); month/day overflow must be normalized by the caller (`DATE`
/// semantics, research 7.5) before calling. The phantom 1900-02-29 maps to 60.
public func dateToSerial(y: Int, m: Int, d: Int) -> Int? {
    guard y >= 0 else { return nil }
    if y == 1900 && m == 2 && d == 29 { return 60 }
    let t = daysFromCivil(y: y, m: m, d: d) - daysFromCivil(y: 1899, m: 12, d: 30)
    if t <= 0 { return t }
    if t < 61 { return t - 1 }
    return t
}

/// Convert a serial to a civil date. Serial 60 yields the phantom
/// 1900-02-29 (displayed, never produced by arithmetic).
public func serialToYMD(_ s: Int) -> (y: Int, m: Int, d: Int) {
    if s == 60 { return (1900, 2, 29) }
    let base = daysFromCivil(y: 1899, m: 12, d: 30)
    if s >= 61 || s <= 0 {
        return civilFromDays(base + s)
    }
    return civilFromDays(base + s + 1)
}

/// Days since the civil epoch 1970-01-01 for a proleptic Gregorian date.
/// Pure integer math, valid for the full `DATE` input range.
public func daysFromCivil(y: Int, m: Int, d: Int) -> Int {
    var y = y
    var m = m
    if m <= 2 { y -= 1; m += 12 }
    let era = (y >= 0 ? y : y - 399) / 400
    let yoe = y - era * 400
    let doy = (153 * (m - 3) + 2) / 5 + d - 1
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
    return era * 146097 + doe - 719468
}

/// Inverse of `daysFromCivil`.
public func civilFromDays(_ z: Int) -> (y: Int, m: Int, d: Int) {
    let z2 = z + 719468
    let era = (z2 >= 0 ? z2 : z2 - 146096) / 146097
    let doe = z2 - era * 146097
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
    let y = yoe + era * 400
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
    let mp = (5 * doy + 2) / 153
    let d = doy - (153 * mp + 2) / 5 + 1
    let m = mp < 10 ? mp + 3 : mp - 9
    return (mp < 10 ? y : y + 1, m, d)
}
