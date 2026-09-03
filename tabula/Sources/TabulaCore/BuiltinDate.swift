/// Date builtins (research 7.5, normative).
///
/// Serial model: day numbers with epoch 1899-12-30 = 0, Excel-compatible
/// including the Lotus 1900 leap bug (serial 60 is the phantom 1900-02-29:
/// accepted on input, never produced by arithmetic since civil conversion is
/// proleptic Gregorian). Serials are integers; fractions truncate toward
/// zero. `DATE` results outside `[0, tabulaMaxSerial]` (year 9999) are
/// `#NUM!`, never clamped.
public enum BuiltinDate {
    // MARK: - shared plumbing

    /// Coerce a scalar arg to a truncated serial/code integer.
    static func intArg(_ e: Expr, _ ctx: BuiltinContext)
        -> Result<Int, ErrorCode>
    {
        switch ctx.scalar(e).toNumber() {
        case .failure(let err): return .failure(err)
        case .success(let x):
            guard let n = Builtins.truncInt(x) else {
                return .failure(.num)
            }
            return .success(n)
        }
    }

    /// Days in a normalized month (1-12), proleptic Gregorian leap rule.
    public static func daysInMonth(y: Int, m: Int) -> Int {
        switch m {
        case 1, 3, 5, 7, 8, 10, 12: return 31
        case 4, 6, 9, 11: return 30
        default:
            let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
            return leap ? 29 : 28
        }
    }

    static func floorDiv(_ a: Int, _ b: Int) -> Int {
        let q = a / b
        return (a % b != 0 && ((a < 0) != (b < 0))) ? q - 1 : q
    }

    static func floorMod(_ a: Int, _ b: Int) -> Int {
        a - floorDiv(a, b) * b
    }

    /// Normalize `(y, m)` with month overflow, then shift by `add` months with
    /// end-of-month clamping of `d`. Returns nil when the year leaves `[0,
    /// 9999]` (caller maps to `#NUM!`).
    static func shiftMonths(y: Int, m: Int, d: Int, add: Int)
        -> (y: Int, m: Int, d: Int)?
    {
        let total = y * 12 + (m - 1) + add
        let yn = floorDiv(total, 12)
        guard yn >= 0, yn <= 9999 else { return nil }
        let mn = floorMod(total, 12) + 1
        return (yn, mn, min(d, daysInMonth(y: yn, m: mn)))
    }

    /// Serial for a civil date, or nil when unrepresentable (year < 0).
    static func serialOf(y: Int, m: Int, d: Int) -> Int? {
        dateToSerial(y: y, m: m, d: d)
    }

    // MARK: - DATE / components

    /// `DATE(y, m, d)`: month/year overflow normalizes; day overflow spills
    /// through civil arithmetic (Feb 30 becomes Mar 1/2).
    public static func dateFn(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 3 else { return .err(.value) }
        let y: Int
        switch intArg(args[0], ctx) {
        case .failure(let e): return .err(e)
        case .success(let n): y = n
        }
        let m: Int
        switch intArg(args[1], ctx) {
        case .failure(let e): return .err(e)
        case .success(let n): m = n
        }
        let d: Int
        switch intArg(args[2], ctx) {
        case .failure(let e): return .err(e)
        case .success(let n): d = n
        }
        // Normalize month overflow first (month 14 = Feb next year).
        let total = y * 12 + (m - 1)
        let yn = floorDiv(total, 12)
        let mn = floorMod(total, 12) + 1
        guard yn >= 0, yn <= 9999 else { return .err(.num) }
        // Day overflow via absolute-day arithmetic from the month start.
        let absDay = daysFromCivil(y: yn, m: mn, d: 1) + (d - 1)
        let civil = civilFromDays(absDay)
        guard let s = serialOf(y: civil.0, m: civil.1, d: civil.2) else {
            return .err(.num)
        }
        guard s >= 0, s <= tabulaMaxSerial else { return .err(.num) }
        return .num(Double(s))
    }

    public enum DatePart { case year, month, day }

    /// `YEAR`/`MONTH`/`DAY`: decompose the truncated serial.
    public static func component(
        _ args: [Expr], _ ctx: BuiltinContext, part: DatePart
    ) -> Value {
        guard args.count == 1 else { return .err(.value) }
        let s: Int
        switch intArg(args[0], ctx) {
        case .failure(let e): return .err(e)
        case .success(let n): s = n
        }
        let ymd = serialToYMD(s)
        switch part {
        case .year: return .num(Double(ymd.0))
        case .month: return .num(Double(ymd.1))
        case .day: return .num(Double(ymd.2))
        }
    }

    // MARK: - DATEDIF

    /// `DATEDIF(a, b, unit)` with Excel-compatible remainders. `a > b` is
    /// `#NUM!`; an unknown unit is `#VALUE!`.
    public static func dateDif(_ args: [Expr], _ ctx: BuiltinContext) -> Value {
        guard args.count == 3 else { return .err(.value) }
        let a: Int
        switch intArg(args[0], ctx) {
        case .failure(let e): return .err(e)
        case .success(let n): a = n
        }
        let b: Int
        switch intArg(args[1], ctx) {
        case .failure(let e): return .err(e)
        case .success(let n): b = n
        }
        let unit: String
        switch ctx.scalar(args[2]).toString() {
        case .failure(let e): return .err(e)
        case .success(let s):
            unit = s.trimmingCharacters(in: .whitespaces).uppercased()
        }
        guard a <= b else { return .err(.num) }
        let ya = serialToYMD(a), yb = serialToYMD(b)
        let (yaY, maM, daD) = (ya.0, ya.1, ya.2)
        let (ybY, mbM, dbD) = (yb.0, yb.1, yb.2)
        switch unit {
        case "D":
            return .num(Double(b - a))
        case "M":
            let months = (ybY - yaY) * 12 + (mbM - maM)
                - (dbD < daD ? 1 : 0)
            return .num(Double(months))
        case "Y":
            let years = (ybY - yaY)
                - ((mbM < maM || (mbM == maM && dbD < daD)) ? 1 : 0)
            return .num(Double(years))
        case "MD":
            // Day remainder within the month. Excel-compatible including the
            // known negative quirk when the start day exceeds the previous
            // month's length (documented, research 7.5).
            if dbD >= daD { return .num(Double(dbD - daD)) }
            let prevM = mbM == 1 ? 12 : mbM - 1
            let prevY = mbM == 1 ? ybY - 1 : ybY
            return .num(Double(daysInMonth(y: prevY, m: prevM) - daD + dbD))
        case "YM":
            let months = (ybY - yaY) * 12 + (mbM - maM)
                - (dbD < daD ? 1 : 0)
            return .num(Double(months % 12))
        case "YD":
            // Days since the last anniversary of `a` on or before `b`.
            let clamped = min(daD, daysInMonth(y: ybY, m: maM))
            var anniv = dateToSerial(y: ybY, m: maM, d: clamped) ?? 0
            if anniv > b {
                let c2 = min(daD, daysInMonth(y: ybY - 1, m: maM))
                anniv = dateToSerial(y: ybY - 1, m: maM, d: c2) ?? 0
            }
            return .num(Double(b - anniv))
        default:
            return .err(.value)
        }
    }

    // MARK: - EDATE / EOMONTH

    /// Month arithmetic with end-of-month clamping; `EOMONTH` returns the last
    /// day of the target month. Same `#NUM!` range rules as `DATE`.
    public static func eDate(
        _ args: [Expr], _ ctx: BuiltinContext, endOfMonth: Bool
    ) -> Value {
        guard args.count == 2 else { return .err(.value) }
        let s: Int
        switch intArg(args[0], ctx) {
        case .failure(let e): return .err(e)
        case .success(let n): s = n
        }
        let add: Int
        switch intArg(args[1], ctx) {
        case .failure(let e): return .err(e)
        case .success(let n): add = n
        }
        let ymd = serialToYMD(s)
        guard let t = shiftMonths(y: ymd.0, m: ymd.1, d: ymd.2, add: add) else {
            return .err(.num)
        }
        let day = endOfMonth ? daysInMonth(y: t.y, m: t.m) : t.d
        guard let out = serialOf(y: t.y, m: t.m, d: day) else {
            return .err(.num)
        }
        guard out >= 0, out <= tabulaMaxSerial else { return .err(.num) }
        return .num(Double(out))
    }
}
