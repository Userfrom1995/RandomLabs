# Tabula semantics (normative contracts, from research 4.3, 4.4, 7, 9.4)

Source (binding): `docs/research/issue-282-tabula-spreadsheet.md`. Both
engines implement exactly these tables; the 74-case oracle-parity run in
`scoreboard.md` checks the fallback against them.

## Coercion table (research 4.3)

`toNumber(v)`: Num(x) -> x; Bool -> 1/0; Str -> trimmed numeric parse
(one decimal point, optional exponent; empty string -> 0 only for blank
references, else `#VALUE!`); Blank -> 0; Err -> propagate.

`toString(v)`: Num -> General-format rendering (locale-independent);
Bool -> "TRUE"/"FALSE"; Blank -> ""; Err -> propagate.

`toBool(v)`: Num 0 -> false, nonzero -> true; Str "TRUE"/"FALSE"
(case-insensitive, trimmed) -> bool, other strings -> `#VALUE!`;
Blank -> false; Err -> propagate.

Comparisons: numbers compare numerically; otherwise type order
number < string < bool (no cross-type coercion). `=`/`<>` across types are
FALSE/TRUE except blank = blank (TRUE). Strings compare by Unicode scalar
order, case-sensitive (research 9.4; locale collation is display-only).
Blank compares lowest and never coerces to 0 in comparisons. `IF`
conditions use `toBool`.

## Error precedence (research 4.4)

`#CYCLE! > #REF! > #DIV/0! > #NAME? > #VALUE! > #N/A > #NUM!`

Evaluation is strict except: lazy `IF` branches, `AND`/`OR` short-circuit
with prior-error-wins, catch-all `IFERROR`, `#N/A`-only `IFNA`, and the
non-propagating `IS*` predicates. Range folds skip range text/bools but
propagate literal errors; unknown function names are `#NAME?`.

## Function surface (v1, research 7)

Math: SUM AVERAGE MIN MAX COUNT COUNTA COUNTBLANK ROUND ABS SQRT EXP LN
LOG LOG10 POWER MOD INT TRUNC SUMPRODUCT PRODUCT SIN COS TAN PI.
Text: CONCAT CONCATENATE LEFT RIGHT MID LEN TRIM UPPER LOWER TEXTJOIN
VALUE TEXT. Lookup: VLOOKUP HLOOKUP INDEX MATCH CHOOSE ROW COLUMN
(`VLOOKUP(key, table, colIdx, [approx=false])`: the 4th argument is approx
directly, default exact). Logic: IF AND OR NOT IFERROR IFNA ISNUMBER
ISTEXT ISBLANK ISERROR ISNA ISLOGICAL TRUE FALSE. Date: TODAY NOW DATE
YEAR MONTH DAY WEEKDAY DAYS EDATE EOMONTH DATEDIF. Serial epoch
1899-12-30 = 0 with the Lotus phantom (serial 60 = 1900-02-29, accepted on
input, never produced); `DATE` caps at year 9999-12-31 (`#NUM!` beyond).
TODAY is volatile and injectable (no wall-clock reads in Core).

## Sort order (research 9.4, mirrored by Bridge SheetView and web views)

Errors sort last; otherwise blanks first ascending (last descending),
then numbers/bools numerically, then strings by scalar order. Sorts are
stable and presentation-only: model addresses never move, so references
never taint (documented Excel difference, surfaced in the status line).

## Deferred to v2 (binding)

Spill arrays, XLOOKUP, SPLIT, INDIRECT, RAND/RANDBETWEEN, locale collation,
grapheme-cluster LEN, time-of-day NOW, true Excel intersection (v1 uses the
top-left rule), formula-based conditional-format rules (v1 ships one
threshold rule, view-only).
