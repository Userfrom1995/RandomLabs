/// Phase 2 oracle: hand-computed table of 300+ cases covering every function
/// in research section 7, every tricky identity (MOD sign, ROUND half-away,
/// VLOOKUP/MATCH miss, DATE overflow, DATEDIF remainders), plus dispatch,
/// arity, and error-precedence spot checks. Binding test matrix (research
/// 12); all values hand-computed, never copied from implementation output.
import Foundation
import Testing

@testable import TabulaCore

// Host K11: relative A1 refs in the oracle resolve to the literal grid cells.
private let oracleHost = Addr(sheet: 0, col: 10, row: 10)

private func cell(_ col: Int, _ row: Int) -> Addr {
    Addr(sheet: 0, col: col, row: row)
}

private let oracleValues: [Addr: Value] = [
    cell(0, 0): .num(1), cell(0, 1): .num(2), cell(0, 2): .num(3),
    cell(1, 0): .num(10), cell(1, 1): .num(20), cell(1, 2): .num(30),
    cell(2, 0): .str("5"), cell(2, 1): .bool(true),
    cell(4, 0): .err(.div0), cell(4, 1): .err(.na),
    cell(4, 2): .err(.ref), cell(4, 3): .err(.value),
    cell(5, 0): .str("hello"),
    cell(6, 0): .str("apple"), cell(7, 0): .num(100),
    cell(6, 1): .str("Banana"), cell(7, 1): .num(200),
    cell(6, 2): .str("cherry"), cell(7, 2): .num(300),
    cell(9, 0): .num(1), cell(10, 0): .num(2), cell(11, 0): .num(3),
    cell(9, 1): .num(10), cell(10, 1): .num(20), cell(11, 1): .num(30),
    cell(12, 0): .num(3), cell(12, 1): .num(2), cell(12, 2): .num(1),
]

private func oParse(_ s: String) -> Expr {
    switch FormulaParser.parse(s, host: oracleHost) {
    case .success(let e): return e
    case .failure(let err): fatalError("oracle parse failed for \(s): \(err)")
    }
}

private func oEval(_ s: String, todaySerial: Int = 0) -> Value {
    Evaluator.eval(
        oParse(s), host: oracleHost,
        lookup: { oracleValues[$0] ?? .blank },
        todaySerial: todaySerial
    )
}

private func oSerial(_ y: Int, _ m: Int, _ d: Int) -> Value {
    .num(Double(dateToSerial(y: y, m: m, d: d)!))
}

/// Exact oracle row: one `#expect` per row.
private func checkOracle(_ rows: [(String, Value)], todaySerial: Int = 0) {
    for (formula, want) in rows {
        #expect(oEval(formula, todaySerial: todaySerial) == want, "\(formula)")
    }
}

@Suite("Oracle: math aggregation (research 7.1)")
struct OracleMathAggTests {
    @Test("SUM/AVERAGE/MIN/MAX/COUNT family, 52 cases")
    func agg() {
        checkOracle([
            ("=SUM()", .num(0)),
            ("=SUM(1,2,3)", .num(6)),
            ("=SUM(A1:A3)", .num(6)),
            ("=SUM(A1:B3)", .num(66)),
            ("=SUM(\"5\",TRUE)", .num(6)),
            ("=SUM(C1:C2)", .num(0)),
            ("=SUM(Z99)", .num(0)),
            ("=SUM(\"abc\")", .err(.value)),
            ("=SUM(E1)", .err(.div0)),
            ("=SUM(E1:E2)", .err(.div0)),
            ("=SUM(1,E1)", .err(.div0)),
            ("=SUM({1,2;3,4})", .num(10)),
            ("=SUM(A1:A3,100)", .num(106)),
            ("=SUM(-1,-2.5)", .num(-3.5)),
            ("=SUM(E3:E4)", .err(.ref)),
            ("=SUM(A1,E3:E4)", .err(.ref)),
            ("=AVERAGE(2,4)", .num(3)),
            ("=AVERAGE(A1:A3)", .num(2)),
            ("=AVERAGE()", .err(.div0)),
            ("=AVERAGE(C1:C2)", .err(.div0)),
            ("=AVERAGE(\"a\")", .err(.value)),
            ("=AVERAGE(E2)", .err(.na)),
            ("=AVERAGE(1,E1)", .err(.div0)),
            ("=AVERAGE(A1:B3)", .num(11)),
            ("=MIN(3,1,2)", .num(1)),
            ("=MAX(3,1,2)", .num(3)),
            ("=MIN()", .num(0)),
            ("=MAX()", .num(0)),
            ("=MIN(A1:A3)", .num(1)),
            ("=MAX(B1:B3)", .num(30)),
            ("=MIN(C1:C2)", .num(0)),
            ("=MIN(\"8\",2)", .num(2)),
            ("=MAX(E1,5)", .err(.div0)),
            ("=MAX(A1:B3)", .num(30)),
            ("=MIN(B1:B3)", .num(10)),
            ("=COUNT(1,2,\"5\",TRUE,\"x\")", .num(4)),
            ("=COUNT(A1:C2)", .num(4)),
            ("=COUNT()", .num(0)),
            ("=COUNT(\"x\")", .num(0)),
            ("=COUNT(C1:C2)", .num(0)),
            ("=COUNT(E1)", .err(.div0)),
            ("=COUNT({1,\"x\",TRUE})", .num(2)),
            ("=COUNTA(1,\"x\",TRUE)", .num(3)),
            ("=COUNTA(A1:C2,Z99)", .num(6)),
            ("=COUNTA(E1)", .num(1)),
            ("=COUNTA()", .num(0)),
            ("=COUNTA(\"\")", .num(1)),
            ("=COUNTBLANK(A1:A3)", .num(0)),
            ("=COUNTBLANK(Z98:Z100)", .num(3)),
            ("=COUNTBLANK(\"\")", .num(1)),
            ("=COUNTBLANK(E1)", .num(0)),
            ("=COUNTBLANK(C1:C2)", .num(0)),
        ])
    }
}

@Suite("Oracle: math scalars (research 7.1)")
struct OracleMathScalarTests {
    @Test("ROUND/TRUNC/ABS/MOD/POWER/INT/SUMPRODUCT, 65 cases")
    func scalars() {
        checkOracle([
            ("=ROUND(2.5,0)", .num(3)),
            ("=ROUND(-2.5,0)", .num(-3)),
            ("=ROUND(3.14159,2)", .num(3.14)),
            ("=ROUND(123.456,-1)", .num(120)),
            ("=ROUND(1.5,0)", .num(2)),
            ("=ROUND(-1.5,0)", .num(-2)),
            ("=ROUND(2.49,0)", .num(2)),
            ("=ROUND(5,2)", .num(5)),
            ("=ROUND(2.5)", .err(.value)),
            ("=ROUND(\"x\",0)", .err(.value)),
            ("=ROUND(3.14159,2.9)", .num(3.14)),
            ("=ROUND(0.5,0)", .num(1)),
            ("=ROUND(-0.5,0)", .num(-1)),
            ("=ROUND(123456,-2)", .num(123500)),
            ("=ROUND(2.45,1)", .num(2.5)),
            ("=ABS(-5)", .num(5)),
            ("=ABS(\" -3 \")", .num(3)),
            ("=ABS(\"x\")", .err(.value)),
            ("=ABS()", .err(.value)),
            ("=ABS(A1:A3)", .num(1)),
            ("=SQRT(4)", .num(2)),
            ("=SQRT(0)", .num(0)),
            ("=SQRT(-1)", .err(.num)),
            ("=INT(3.9)", .num(3)),
            ("=INT(-3.2)", .num(-4)),
            ("=INT(5)", .num(5)),
            ("=INT(\"7.9\")", .num(7)),
            ("=POWER(2,3)", .num(8)),
            ("=POWER(2,-2)", .num(0.25)),
            ("=POWER(0,-1)", .err(.div0)),
            ("=POWER(-2,0.5)", .err(.num)),
            ("=POWER(9,0.5)", .num(3)),
            ("=POWER(2)", .err(.value)),
            ("=MOD(5,3)", .num(2)),
            ("=MOD(-5,3)", .num(1)),
            ("=MOD(5,-3)", .num(-1)),
            ("=MOD(-5,-3)", .num(-2)),
            ("=MOD(5,0)", .err(.div0)),
            ("=MOD(6,3)", .num(0)),
            ("=MOD(7.5,2)", .num(1.5)),
            ("=TRUNC(3.99)", .num(3)),
            ("=TRUNC(-3.99)", .num(-3)),
            ("=TRUNC(123.456,1)", .num(123.4)),
            ("=TRUNC(-123.456,1)", .num(-123.4)),
            ("=TRUNC(123.456,-1)", .num(120)),
            ("=TRUNC(3.99,1.9)", .num(3.9)),
            ("=TRUNC(\"x\")", .err(.value)),
            ("=EXP(0)", .num(1)),
            ("=LN(1)", .num(0)),
            ("=LN(0)", .err(.num)),
            ("=LN(-5)", .err(.num)),
            ("=EXP(1000)", .err(.num)),
            ("=LOG(10,0)", .err(.num)),
            ("=LOG(10,1)", .err(.num)),
            ("=LOG(0)", .err(.num)),
            ("=LOG(-3)", .err(.num)),
            ("=LOG(10,-2)", .err(.num)),
            ("=SUMPRODUCT(A1:A3,B1:B3)", .num(140)),
            ("=SUMPRODUCT(A1:A3,A1:A3)", .num(14)),
            ("=SUMPRODUCT(A1:A2,B1:B3)", .err(.value)),
            ("=SUMPRODUCT()", .err(.value)),
            ("=SUMPRODUCT(2,3)", .num(6)),
            ("=SUMPRODUCT(C1:C2,A1:A2)", .num(2)),
            ("=SUMPRODUCT(E1,A1)", .err(.div0)),
            ("=SUMPRODUCT({1,2},{3,4})", .num(11)),
        ])
    }

    @Test("transcendentals within 1e-12")
    func close() {
        let rows: [(String, Double)] = [
            ("=SQRT(2)", 2.0.squareRoot()),
            ("=EXP(1)", Foundation.exp(1)),
            ("=LN(10)", Foundation.log(10)),
            ("=LOG(100)", 2),
            ("=LOG(100,10)", 2),
            ("=LOG(8,2)", 3),
        ]
        for (formula, want) in rows {
            let got = oEval(formula)
            guard case .num(let x) = got else {
                Issue.record("\(formula) is not numeric: \(got)")
                continue
            }
            #expect(abs(x - want) < 1e-12, "\(formula): \(x) vs \(want)")
        }
    }
}

@Suite("Oracle: text (research 7.2)")
struct OracleTextTests {
    @Test("CONCAT/LEFT/RIGHT/MID/LEN/TRIM/UPPER/LOWER/TEXTJOIN/VALUE/TEXT, 61 cases")
    func text() {
        checkOracle([
            ("=CONCAT(\"a\",\"b\",\"c\")", .str("abc")),
            ("=CONCAT()", .str("")),
            ("=CONCAT(1,TRUE)", .str("1TRUE")),
            ("=CONCAT(A1:B1)", .str("110")),
            ("=CONCAT(E1)", .err(.div0)),
            ("=CONCAT(Z99,\"x\")", .str("x")),
            ("=CONCAT(E1:E2)", .err(.div0)),
            ("=LEFT(\"hello\")", .str("h")),
            ("=LEFT(\"hello\",2)", .str("he")),
            ("=LEFT(\"hello\",0)", .str("")),
            ("=LEFT(\"hi\",10)", .str("hi")),
            ("=LEFT(\"hello\",-1)", .err(.value)),
            ("=LEFT(\"hello\",2.9)", .str("he")),
            ("=LEFT(\"hello\",\"x\")", .err(.value)),
            ("=RIGHT(\"hello\")", .str("o")),
            ("=RIGHT(\"hello\",2)", .str("lo")),
            ("=RIGHT(\"hello\",-1)", .err(.value)),
            ("=RIGHT(\"hello\",0)", .str("")),
            ("=MID(\"hello\",2,3)", .str("ell")),
            ("=MID(\"hello\",1,5)", .str("hello")),
            ("=MID(\"hi\",5,2)", .str("")),
            ("=MID(\"hello\",2,100)", .str("ello")),
            ("=MID(\"hello\",0,2)", .err(.value)),
            ("=MID(\"hello\",2,-1)", .err(.value)),
            ("=MID(\"hello\",2)", .err(.value)),
            ("=LEN(\"hello\")", .num(5)),
            ("=LEN(\"\")", .num(0)),
            ("=LEN(123)", .num(3)),
            ("=LEN(TRUE)", .num(4)),
            ("=LEN(\"日本語\")", .num(3)),
            ("=LEFT(\"日本語\",2)", .str("日本")),
            ("=TRIM(\"  a  b   \")", .str("a b")),
            ("=TRIM(\"a\")", .str("a")),
            ("=TRIM(\"   \")", .str("")),
            ("=TRIM(\" a \")", .str("a")),
            ("=UPPER(\"abc\")", .str("ABC")),
            ("=LOWER(\"ABC\")", .str("abc")),
            ("=UPPER(123)", .str("123")),
            ("=LOWER(\"HeLLo\")", .str("hello")),
            ("=TEXTJOIN(\", \",TRUE,\"a\",\"\",\"b\")", .str("a, b")),
            ("=TEXTJOIN(\", \",FALSE,\"a\",\"\",\"b\")", .str("a, , b")),
            ("=TEXTJOIN(\"-\",TRUE,A1:A3)", .str("1-2-3")),
            ("=TEXTJOIN(\", \",TRUE)", .err(.value)),
            ("=TEXTJOIN(\", \",\"x\",\"a\")", .err(.value)),
            ("=TEXTJOIN(\", \",TRUE,E1)", .err(.div0)),
            ("=TEXTJOIN(\"\",TRUE,\"a\",\"b\")", .str("ab")),
            ("=VALUE(\"3.5\")", .num(3.5)),
            ("=VALUE(\"  -2 \")", .num(-2)),
            ("=VALUE(\"abc\")", .err(.value)),
            ("=VALUE(TRUE)", .err(.value)),
            ("=VALUE(5)", .num(5)),
            ("=VALUE(\"\")", .err(.value)),
            ("=TEXT(3.14159,\"0.00\")", .str("3.14")),
            ("=TEXT(3.7,\"0\")", .str("4")),
            ("=TEXT(-3.2,\"0\")", .str("-3")),
            ("=TEXT(0.5,\"0%\")", .str("50%")),
            ("=TEXT(0.1234,\"0.00%\")", .str("12.34%")),
            ("=TEXT(1,\"x\")", .err(.value)),
            ("=TEXT(2.5,\"0.00\")", .str("2.50")),
            ("=TEXT(0.125,\"0.00\")", .str("0.13")),
            ("=TEXT(-0.5,\"0%\")", .str("-50%")),
        ])
    }
}

@Suite("Oracle: lookup (research 7.3)")
struct OracleLookupTests {
    @Test("VLOOKUP/HLOOKUP/INDEX/MATCH/CHOOSE, 60 cases")
    func lookup() {
        checkOracle([
            ("=VLOOKUP(2,A1:B3,2)", .num(20)),
            ("=VLOOKUP(3,A1:B3,1)", .num(3)),
            ("=VLOOKUP(9,A1:B3,2)", .err(.na)),
            ("=VLOOKUP(2,A1:B3,3)", .err(.ref)),
            ("=VLOOKUP(2,A1:B3,0)", .err(.ref)),
            ("=VLOOKUP(2,A1:B3)", .err(.value)),
            ("=VLOOKUP(\"BANANA\",G1:H3,2)", .num(200)),
            ("=VLOOKUP(\"apple\",G1:H3,2)", .num(100)),
            ("=VLOOKUP(\"durian\",G1:H3,2)", .err(.na)),
            ("=VLOOKUP(2.5,A1:B3,2,TRUE)", .num(20)),
            ("=VLOOKUP(0.5,A1:B3,2,TRUE)", .err(.na)),
            ("=VLOOKUP(5,A1:B3,2,TRUE)", .num(30)),
            ("=VLOOKUP(E1,A1:B3,2)", .err(.div0)),
            ("=VLOOKUP(2,5,1)", .err(.value)),
            ("=VLOOKUP(\"2\",A1:B3,2)", .err(.na)),
            ("=VLOOKUP(1,A1:B3,1,TRUE)", .num(1)),
            ("=VLOOKUP(2,A1:B2,2.9)", .num(20)),
            ("=HLOOKUP(2,J1:L2,2)", .num(20)),
            ("=HLOOKUP(9,J1:L2,2)", .err(.na)),
            ("=HLOOKUP(2,J1:L2,5)", .err(.ref)),
            ("=HLOOKUP(2.5,J1:L2,2,TRUE)", .num(20)),
            ("=HLOOKUP(2,J1:L2)", .err(.value)),
            ("=HLOOKUP(1,J1:L2,1)", .num(1)),
            ("=INDEX(A1:B3,2,2)", .num(20)),
            ("=INDEX(A1:B3,1,1)", .num(1)),
            ("=INDEX(A1:A3,2)", .num(2)),
            ("=INDEX(J1:L1,2)", .num(2)),
            ("=INDEX(A1:B3,4,1)", .err(.ref)),
            ("=INDEX(A1:B3,1,3)", .err(.ref)),
            ("=INDEX(A1:B3,0,1)", .err(.ref)),
            ("=INDEX(A1:B3,2)", .err(.ref)),
            ("=INDEX(5,1,1)", .num(5)),
            ("=INDEX(A1:B3,1.9,1)", .num(1)),
            ("=INDEX(A1:B3,2,2.9)", .num(20)),
            ("=MATCH(2,A1:A3,0)", .num(2)),
            ("=MATCH(2,A1:A3)", .num(2)),
            ("=MATCH(9,A1:A3,0)", .err(.na)),
            ("=MATCH(\"banana\",G1:G3,0)", .num(2)),
            ("=MATCH(2.5,A1:A3,1)", .num(2)),
            ("=MATCH(0.5,A1:A3,1)", .err(.na)),
            ("=MATCH(3,A1:A3,1)", .num(3)),
            ("=MATCH(2.5,M1:M3,-1)", .num(1)),
            ("=MATCH(0.5,M1:M3,-1)", .num(3)),
            ("=MATCH(5,M1:M3,-1)", .err(.na)),
            ("=MATCH(3,M1:M3,-1)", .num(1)),
            ("=MATCH(2,A1:B3,0)", .err(.na)),
            ("=MATCH(2,A1:A3,2)", .err(.na)),
            ("=MATCH(2,A1:A3,\"x\")", .err(.na)),
            ("=MATCH(\"APPLE\",G1:G3,0)", .num(1)),
            ("=CHOOSE(1,\"a\",\"b\",\"c\")", .str("a")),
            ("=CHOOSE(3,\"a\",\"b\",\"c\")", .str("c")),
            ("=CHOOSE(0,\"a\")", .err(.value)),
            ("=CHOOSE(2,\"a\")", .err(.value)),
            ("=CHOOSE(2.9,\"a\",\"b\",\"c\")", .str("b")),
            ("=CHOOSE(1,E1,\"ok\")", .err(.div0)),
            ("=CHOOSE(2,E1,\"ok\")", .str("ok")),
            ("=CHOOSE(1,\"ok\",E1)", .str("ok")),
            ("=CHOOSE(\"x\",\"a\")", .err(.value)),
            ("=CHOOSE(1)", .err(.value)),
            ("=CHOOSE(2,\"ok\",E1)", .err(.div0)),
        ])
    }
}

@Suite("Oracle: date (research 7.5)")
struct OracleDateTests {
    @Test("DATE/components/DATEDIF/EDATE/EOMONTH, 54 cases")
    func date() {
        checkOracle([
            ("=DATE(2024,1,15)", oSerial(2024, 1, 15)),
            ("=DATE(2023,14,1)", oSerial(2024, 2, 1)),
            ("=DATE(2024,2,30)", oSerial(2024, 3, 1)),
            ("=DATE(-1,1,1)", .err(.num)),
            ("=DATE(10000,1,1)", .err(.num)),
            ("=DATE(2024,1)", .err(.value)),
            ("=DATE(\"x\",1,1)", .err(.value)),
            ("=DATE(2024,13,1)", oSerial(2025, 1, 1)),
            ("=DATE(2023,0,1)", oSerial(2022, 12, 1)),
            ("=DATE(2024,1,0)", oSerial(2023, 12, 31)),
            ("=DATE(2023,2,29)", oSerial(2023, 3, 1)),
            ("=DATE(1900,2,29)", oSerial(1900, 3, 1)),
            ("=DATE(0,1,1)", .err(.num)),
            ("=YEAR(DATE(2024,6,15))", .num(2024)),
            ("=MONTH(DATE(2024,6,15))", .num(6)),
            ("=DAY(DATE(2024,6,15))", .num(15)),
            ("=YEAR(61)", .num(1900)),
            ("=MONTH(61)", .num(3)),
            ("=DAY(61)", .num(1)),
            ("=YEAR(60)", .num(1900)),
            ("=MONTH(60)", .num(2)),
            ("=DAY(60)", .num(29)),
            ("=YEAR(\"x\")", .err(.value)),
            ("=MONTH()", .err(.value)),
            ("=DAY(0.9)", .num(30)),
            ("=DAY(DATE(2024,1,15))", .num(15)),
            (
                "=DATEDIF(DATE(2024,1,1),DATE(2024,1,31),\"D\")",
                .num(30)
            ),
            (
                "=DATEDIF(DATE(2024,1,1),DATE(2024,3,15),\"M\")",
                .num(2)
            ),
            (
                "=DATEDIF(DATE(2024,1,15),DATE(2024,3,14),\"M\")",
                .num(1)
            ),
            (
                "=DATEDIF(DATE(2020,6,1),DATE(2024,5,31),\"Y\")",
                .num(3)
            ),
            (
                "=DATEDIF(DATE(2020,6,1),DATE(2024,6,1),\"Y\")",
                .num(4)
            ),
            (
                "=DATEDIF(DATE(2024,1,1),DATE(2024,1,31),\"MD\")",
                .num(30)
            ),
            (
                "=DATEDIF(DATE(2024,1,15),DATE(2024,3,10),\"MD\")",
                .num(24)
            ),
            (
                "=DATEDIF(DATE(2023,2,28),DATE(2023,3,1),\"MD\")",
                .num(1)
            ),
            (
                "=DATEDIF(DATE(2023,1,1),DATE(2024,3,15),\"YM\")",
                .num(2)
            ),
            (
                "=DATEDIF(DATE(2024,1,1),DATE(2024,3,1),\"YD\")",
                .num(60)
            ),
            (
                "=DATEDIF(DATE(2023,12,15),DATE(2024,1,10),\"YD\")",
                .num(26)
            ),
            (
                "=DATEDIF(DATE(2024,2,1),DATE(2024,1,1),\"D\")",
                .err(.num)
            ),
            (
                "=DATEDIF(DATE(2024,1,1),DATE(2024,1,2),\"X\")",
                .err(.value)
            ),
            (
                "=DATEDIF(DATE(2024,1,1),DATE(2024,1,31),\"d\")",
                .num(30)
            ),
            ("=DATEDIF(DATE(2024,1,1),DATE(2024,1,2))", .err(.value)),
            (
                "=DATEDIF(DATE(2024,2,28),DATE(2024,3,1),\"D\")",
                .num(2)
            ),
            (
                "=DATEDIF(DATE(2023,2,28),DATE(2023,3,1),\"D\")",
                .num(1)
            ),
            ("=EDATE(DATE(2024,1,31),1)", oSerial(2024, 2, 29)),
            ("=EDATE(DATE(2024,3,31),-1)", oSerial(2024, 2, 29)),
            ("=EDATE(DATE(2024,1,15),0)", oSerial(2024, 1, 15)),
            ("=EDATE(DATE(2024,2,29),12)", oSerial(2025, 2, 28)),
            ("=EOMONTH(DATE(2024,1,15),0)", oSerial(2024, 1, 31)),
            ("=EOMONTH(DATE(2024,1,15),1)", oSerial(2024, 2, 29)),
            ("=EOMONTH(DATE(2023,2,10),0)", oSerial(2023, 2, 28)),
            ("=EDATE(DATE(9999,12,31),1)", .err(.num)),
            ("=EDATE(\"x\",1)", .err(.value)),
            ("=EDATE(DATE(2024,1,1))", .err(.value)),
            ("=EOMONTH(DATE(2024,1,31),-1)", oSerial(2023, 12, 31)),
        ])
    }
}

@Suite("Oracle: dispatch and composition")
struct OracleDispatchTests {
    @Test("case-insensitivity, nesting, unknown names, 13 cases")
    func dispatch() {
        let today = dateToSerial(y: 2024, m: 2, d: 1)!
        checkOracle(
            [
                ("=FOO(1)", .err(.name)),
                ("=Sum(A1:A3)", .num(6)),
                ("=Vlookup(2,A1:B3,2)", .num(20)),
                ("=SUM(A1:A3)+AVERAGE(A1:A3)", .num(8)),
                ("=IF(SUM(A1:A3)>5,\"big\",\"small\")", .str("big")),
                ("=ROUND(SQRT(2)*100,0)", .num(141)),
                ("=LEN(CONCAT(\"a\",\"b\"))", .num(2)),
                ("=INDEX(A1:B3,MATCH(3,A1:A3,0),2)", .num(30)),
                ("=VLOOKUP(MAX(A1:A3),A1:B3,2)", .num(30)),
                ("=ABS(A1-B1)", .num(9)),
                ("=MOD(10,3)+MOD(10,4)", .num(3)),
                (
                    "=DATEDIF(DATE(2024,1,1),TODAY(),\"D\")",
                    .num(Double(today - dateToSerial(y: 2024, m: 1, d: 1)!))
                ),
            ],
            todaySerial: today
        )
        checkOracle([("=TODAY()", .num(Double(today))), ("=NOW()", .num(Double(today)))], todaySerial: today)
    }
}
