# Tabula - From-Scratch Spreadsheet Engine in Swift: Algorithmic and Mathematical Specification

- **Issue:** #282 (Tabula - from-scratch spreadsheet engine in Swift, SwiftWasm, Pages-hosted at `/tabula/`)
- **Author role:** Researcher (Dr. Mob)
- **Target language:** Swift (SwiftWasm via carton + JavaScriptKit; headless SwiftPM core tested with `swift test`)
- **Hosting:** static GitHub Pages at `/tabula/index.html`, offline after first load
- **Handoff target:** Architect (module blueprint, SwiftWasm build, grid virtualization) then Builder (implementation)

This document is the scientific blueprint. It defines the formula grammar,
the lexer/parser/AST, the value domain and error lattice, the dependency graph
with cycle detection and topological recalculation, volatile-function
handling, per-function denotational semantics, reference systems (A1, R1C1,
absolute/relative, ranges, cross-sheet, named ranges), copy/paste and fill
adjustment laws, storage round-trip invariants, chart-as-view semantics, and
the benchmark and property-test acceptance gates. It contains no production
code; the Architect turns this into packages and the Builder implements it.

---

## 1. Scope and design goals

Tabula implements the deterministic core of a spreadsheet: a grid of cells
holding literals or formulas, a recalculation engine that keeps every
dependent cell consistent, and a pure view layer (formatting, conditional
formatting, sort/filter views, charts) that never perturbs calculation.

Binding scope from #282, in priority order:

1. **Formula engine (correctness critical):** lexer, recursive-descent parser,
   AST, dependency graph (directed, DFS cycle detection, topological recalc),
   volatile-function handling, error propagation (`#DIV/0!`, `#REF!`,
   `#CYCLE!`, `#VALUE!`, plus `#NAME?`, `#N/A`, `#NUM!`).
2. **Function library:** math (SUM, AVERAGE, MIN, MAX, ROUND, ABS, EXP, LOG,
   SQRT), text (CONCAT, LEFT, RIGHT, MID, LEN, TRIM, UPPER, LOWER), lookup
   (VLOOKUP, HLOOKUP, INDEX, MATCH, CHOOSE), date (TODAY, DATE, YEAR, MONTH,
   DAY, DATEDIF), logic (IF, AND, OR, NOT, IFERROR).
3. **Reference systems:** A1 and R1C1, absolute/relative (`$`), rectangular
   ranges (`A1:B10`), cross-sheet (`Sheet2!A1`), named ranges.
4. **Grid UX:** virtualized canvas grid, editing, formatting, conditional
   formatting, sorting/filtering, freeze panes, resize, copy/paste with
   reference adjustment, fill handle.
5. **Storage:** CSV import/export, JSON workbook save/load, OPFS persistence,
   clipboard integration.
6. **Charts:** bar/line/pie off selected ranges, live on recalc.
7. **Testing:** deterministic headless SwiftPM core (parser, graph, evaluator,
   cycles, topological order, function semantics, CSV round-trip), property
   tests for graph invariants, 10k-cell recalc perf budget.

Design priorities: recalc correctness first, determinism second (headless
reproducibility), then recalc performance, then UI polish. A spreadsheet that
computes the wrong value is broken no matter how smooth the grid scrolls.

---

## 2. Literature survey (what the Architect and Builder inherit)

### 2.1 Excel calculation chain

Excel maintains a dependency graph ("calc chain") persisted in the workbook:
each formula cell records its precedents; on edit only the transitive
dependents ("dirty" closure) are recalculated, in dependency order. Volatile
functions (`NOW`, `TODAY`, `RAND`, `OFFSET`, `INDIRECT`) mark their cells dirty
on every recalculation pass. Circular references are either rejected or
iterated a bounded number of times (we choose rejection with `#CYCLE!`, see
Section 5). Lesson for Tabula: separate the **dirty-marking pass** (graph
reachability) from the **evaluation pass** (topological order); never
re-evaluate clean cells.

### 2.2 Google Sheets recalculation

Sheets recalculates on a dependency graph server-side with aggressive
minimal-recalc and asynchronous function support (`IMPORT*` family). Its
observable semantics: edits propagate to all transitive dependents before the
UI commits the new frame; errors propagate outward (a precedent error poisons
dependents unless caught by `IFERROR`). Lesson: error propagation must be a
total, documented function over the value domain (Section 4), tested
cell-by-cell.

### 2.3 HyperFormula (the closest open-source reference)

HyperFormula (Handsontable) is a standalone JS calc engine with parser,
dependency graph, topological recalc, cycle detection, and a large function
library. Its architecture validates our split: `Parser -> AST -> Graph ->
Evaluator`, with the graph keyed by cell address and ranges expanded to edges.
Its documented weakness (for us to avoid): implicit type coercion rules that
differ subtly from Excel and surprise users. Lesson: write coercion rules down
as a table (Section 4.3) and test every cell of that table.

### 2.4 Handsontable and Luckysheet (grid UX layer)

Both render large grids with virtualization (only visible rows/columns in the
DOM or on canvas) and keep calculation out of the render path. Handsontable
delegates formulas to HyperFormula; Luckysheet bundles its own formula parser
with a similar dependency set. Lesson: the grid is a **view** over a
calculation model, connected by a narrow interface (Section 10). Virtualized
rendering must never change computed values; scrolling is O(visible), recalc
is O(dirty closure).

### 2.5 SwiftWasm and JavaScriptKit (platform constraint)

Swift compiles to WebAssembly via the SwiftWasm toolchain (carton builder);
JS interop goes through JavaScriptKit (typed Swift bindings over JS values).
Constraints the Architect must respect: no JIT, linear-memory heap, explicit
value marshaling at the Swift/JS boundary (pass strings/numbers in batches,
not per-cell JS calls in the hot loop), and `Foundation` date APIs that behave
slightly differently under WASI/WASM (pin the serial date-number epoch in the
spec, Section 7.5, rather than inheriting platform locale behavior). The
headless core must therefore be pure Swift with zero JS imports so `swift test`
covers it on Linux; only a thin bridge module touches JavaScriptKit.

**Survey conclusion.** No novel algorithm is required; the risk is semantic
drift across dozens of small decisions (coercions, error precedence, range
folding, date serials, sort stability). This spec pins each decision so the
Builder has exactly one correct behavior per case.

---

## 3. Formal model

### 3.1 Workbook, sheets, addresses

```
Workbook  = { sheets: [Sheet], names: Map<Name, RefTarget> }
Sheet     = { name: String, grid: Map<Addr, Cell> }
Addr      = (sheet: SheetId, col: Nat, row: Nat)   // 0-based internally
Cell      = Blank | Literal(Value) | Formula(SourceText, AST)
Value     = Num(Double) | Str(String) | Bool(Bool) | Err(ErrorCode) | BlankV
```

Column index maps to letters bijectively: `0->A ... 25->Z, 26->AA ...` via the
standard bijective base-26 encoding (no zero digit). Row `r` displays as
`r+1`. Maximum grid extent is an implementation cap (recommend 16384 cols x
1048576 rows addressable, sparse storage so empty cells cost nothing).

### 3.2 Formula grammar (EBNF)

All formulas begin with `=` followed by an expression. The grammar below is
the normative reference; the parser must accept exactly this language (plus
documented whitespace rules).

```
formula    = "=" expr
expr       = comparison
comparison = concat ( compOp concat )*
compOp     = "=" | "<>" | "<" | "<=" | ">" | ">="
concat     = sum ( "&" sum )*            // string concatenation operator
sum        = term ( ("+" | "-") term )*
term       = factor ( ("*" | "/") factor )*
factor     = ("-" | "+")* power
power      = primary ( "^" factor )?     // right associative, unary binds loosest above
primary    = number | string | boolLit | ref | funcCall | "(" expr ")" | "{" arrayRow ( ";" arrayRow )* "}"
funcCall   = name "(" [ expr ( "," expr )* ] ")"
ref        = sheetPrefix? cellOrRange | nameRef
sheetPrefix = ("'" quotedSheet "'" | bareSheet) "!"
cellOrRange = cell ( ":" cell )?
cell       = "$"? colLetters "$"? rowDigits      // A1 style
           | "R" ("[" signedInt "]" | digits)? "C" ("[" signedInt "]" | digits)?  // R1C1 style
number     = digits [ "." digits ] [ ("e"|"E") ["+"|"-"] digits ] | "." digits [ exponent ]
string     = '"' ( '""' | [^"] )* '"'            // "" escapes a quote
boolLit    = "TRUE" | "FALSE"                    // case-insensitive
name       = letter ( letter | digit | "_" | "." )*
```

Notes:

1. Function names and boolean literals are case-insensitive and stored
   uppercased in the AST. Cell references are case-insensitive (`a1` = `A1`).
2. Whitespace (space, tab) is allowed between any two tokens, never inside a
   token. Newlines are not allowed inside a formula bar string.
3. `%` postfix percent is supported as sugar: `p%` parses to `p/100` with one
   parse-level rewrite (documented so the AST printer round-trips it).
4. Array constants `{"a",1;2,3}` parse but v1 evaluator support is limited to
   passing them to functions that accept arrays; bare array display shows the
   top-left element (documented limitation, not silent misbehavior).
5. Cross-sheet bare names with spaces require single quotes: `'Q1 Sales'!A1`.
6. R1C1 reference forms: `RC` (this cell), `R[2]C[-1]` (relative), `R2C3`
   (absolute). `R` or `C` alone with no brackets means the current row/col.

### 3.3 Lexer

Token kinds: `Eq, Number, String, Bool, Ident, CellRef, SheetBang, LParen,
RParen, LBrace, RBrace, Comma, Semicolon, Colon, Caret, Amp, Plus, Minus, Star,
Slash, Percent, Lt, Le, Gt, Ge, Ne, Assign(= in comparisons), Bang(!),
Eof, ErrorTok`.

Lexing rules:

1. Maximal munch for multi-char operators (`<=`, `>=`, `<>`).
2. A `NameChar` run followed by `!` (or quoted `'...'!`) lexes as sheet prefix,
   not as name plus bang.
3. Cell-reference recognition is greedy but validated: `[A-Za-z]+[0-9]+` with
   column letters in range is a `CellRef`; otherwise it lexes as `Ident`
   (so `ABCDEF123456789` beyond grid caps becomes a name, resolved later to
   `#NAME?` if undefined, never a lexer crash).
4. Numbers follow the grammar; malformed numbers (`1e`, `1.2.3`) produce a
   single `ErrorTok` that the parser converts to `#VALUE!` with position info.
5. Strings are closed on the matching quote; unterminated strings are
   `ErrorTok` (parser reports `#VALUE!`, editor shows the position).

Lexer complexity: O(n) in source length, single pass, no backtracking.

### 3.4 Parser (recursive descent, one token lookahead)

Entry `parseFormula(source) -> Result<AST, ParseError>` where `ParseError =
{ position, message }` and any parse failure yields a formula cell whose value
is `#NAME?` (unknown identifier/function) or `#VALUE!` (malformed syntax),
with the editor retaining the source text and error position for display.

Precedence (lowest to highest): comparison, `&`, additive, multiplicative,
power (right-assoc), unary, postfix `%`, primary. This matches Excel: `-2^2 =
-(2^2) = -4`, and `2^3^2 = 2^(3^2) = 512`.

### 3.5 AST

```
Expr =
  | Num(Double)
  | Str(String)
  | Bool(Bool)
  | Ref(CellRef)                 // single cell
  | Range(lo: CellRef, hi: CellRef)  // normalized: lo <= hi per axis
  | Name(String)                 // named range or named formula
  | Call(fn: FnName, args: [Expr])
  | Unary(op: Neg|Pos, e: Expr)
  | Binary(op: Add|Sub|Mul|Div|Pow|Concat|Eq|Ne|Lt|Le|Gt|Ge, l: Expr, r: Expr)
  | Percent(Expr)
  | ArrayConst(rows: [[Expr]])   // literals only after const-fold check
  | ErrLit(ErrorCode)            // produced by const folding of literal errors
```

`CellRef = { sheet: SheetId?, col: Nat, row: Nat, colAbs: Bool, rowAbs: Bool,
r1c1: Bool }` preserving the author's notation for faithful reprint, plus a
`resolve(host: Addr) -> Addr` method implementing Section 8.1.

The AST must support: (a) `precedents(host) -> Set<Addr> ∪ {RangeRect}` for
graph building, (b) `toFormulaString()` that round-trips through the parser
(`parse(print(parse(s))) == parse(s)` as AST equality, a property test in
Section 12), (c) constant folding of pure literal subtrees at parse time
(optional optimization, must preserve error codes).

---

## 4. Value domain, coercion, and error lattice

### 4.1 Values and display

| Value | Internal | Display default |
|---|---|---|
| Number | IEEE-754 double | General format (Section 9) |
| String | Swift String (Unicode scalar) | as-is |
| Bool | Bool | TRUE/FALSE (localized only in display, never in formula text) |
| Error | ErrorCode enum | `#DIV/0!`, `#N/A`, `#NAME?`, `#NUM!`, `#REF!`, `#VALUE!`, `#CYCLE!` |
| Blank | singleton | empty cell |

Blank is a first-class value: `ISBLANK` sees it, arithmetic treats a blank
reference as 0, text context treats it as `""`, comparisons treat blank as
less than any number or string (matching Excel ordering: number < string <
bool, blank sorts first; see Section 9.4).

### 4.2 Error codes (normative)

| Code | Meaning |
|---|---|
| `#DIV/0!` | division by zero, MOD by zero, LOG/ SQRT domain errors that Excel reports as NUM stay NUM (see below) |
| `#VALUE!` | type error that coercion cannot repair; malformed syntax |
| `#REF!` | reference to deleted/overflowing cell, range, or sheet |
| `#NAME?` | unknown function or name |
| `#N/A` | lookup failure (VLOOKUP/MATCH miss) |
| `#NUM!` | numeric domain error (SQRT of negative, LOG of non-positive, EXP overflow, DATE out of range) |
| `#CYCLE!` | Tabula-specific: cell in or depending on a dependency cycle (Excel shows 0 with a warning; Tabula surfaces the error explicitly per #282 scope) |

### 4.3 Coercion table (normative, test every cell)

`toNumber(v)`:

- Num(x) -> x
- Bool(true/false) -> 1/0
- Str(s) -> trimmed s parsed as number (leading/trailing whitespace ignored,
  exactly one decimal point, optional exponent, empty string -> 0 only when the
  reference is blank, otherwise `#VALUE!` for `""` literal in arithmetic);
  non-numeric string -> `#VALUE!`
- Blank -> 0
- Err(e) -> propagate e (see 4.4)

`toString(v)`: Num -> General-format rendering (no locale dependence in the
core; locale formatting is display-only); Bool -> "TRUE"/"FALSE"; Blank -> "";
Err -> propagate.

`toBool(v)`: Num 0 -> false, nonzero -> true; Str "TRUE"/"FALSE"
(case-insensitive, trimmed) -> bool, other strings -> `#VALUE!`; Blank ->
false; Err -> propagate.

Comparison coercion: if both operands are numbers (after blank->0? No:
comparison does NOT coerce blank to 0; blank compares as blank, lowest), use
numeric order. If one is string and other is number/bool, apply type ordering
number < string < bool rather than coercing (Excel-compatible). `=` and `<>`
between different types return FALSE/TRUE respectively except blank = blank
(0-arg cell) which is TRUE. `IF` condition uses `toBool`.

### 4.4 Error propagation (theorem-backed, Section 6)

Evaluation is strict except for `IF`, `AND`/`OR` short-circuit (documented
below), and `IFERROR`. Rule: any subexpression evaluating to `Err(e)` causes
the enclosing call/operator to return `Err(e)` immediately, EXCEPT:

1. `IFERROR(v, fallback)`: returns fallback if v is any error (captures all
   codes including `#CYCLE!` and `#REF!`).
2. `IF(cond, t, f)`: evaluates only the taken branch (lazy); errors in the
   untaken branch are invisible.
3. `AND`/`OR`: short-circuit on decisive values (`AND` returns FALSE on first
   FALSE without evaluating rest; `OR` returns TRUE on first TRUE), but if a
   prior argument errored before the decisive value is found, the error wins.
   (Excel-compatible.)
4. Aggregation over ranges (SUM/AVERAGE/MIN/MAX/COUNT): ignores text and empty
   cells in ranges, but a literal error value inside the range propagates.

Precedence when two errors meet in one binary op: deterministic order
`#CYCLE! > #REF! > #DIV/0! > #NAME? > #VALUE! > #N/A > #NUM!` (cycle always
surfaces; reference loss next). Document this order; test all pairs.

---

## 5. Dependency graph, cycles, and recalculation

### 5.1 Graph model

Nodes are formula cells (literal cells are graph sources with no outgoing
precedent edges but may be precedents of others). For formula cell `c` with
AST `a`, `precedents(c)` is the set of addresses (single refs plus every cell
in each range rect, plus the resolution of each `Name`, plus cross-sheet
targets) referenced by `a`. Edges point precedent -> dependent (the direction
of value flow); the recalc order follows this direction.

Range expansion: ranges are expanded to member-cell edges at graph-build time
for correctness of dirty marking (a change to any member dirties the
dependent). For large ranges the implementation may store interval edges plus
a spatial index, but observable behavior must equal full expansion (prove via
the range-folding invariant test, Section 12.3).

### 5.2 Cycle detection (DFS, sound and complete)

Run iterative DFS with colors WHITE/GRAY/BLACK over the precedent->dependent
digraph restricted to formula cells plus referenced literals:

```
detectCycles():
  color = [WHITE] * N
  for each node u with color WHITE:
    iterative DFS from u tracking explicit stack
    on encountering edge u->v with color[v] == GRAY: record cycle path
    (stack slice from v to u plus closing edge)
  mark every node on or reachable-from (dependent direction) a cycle path
  as CYCLE_TAINTED; their values become #CYCLE!
```

Soundness: only true back edges (GRAY targets) are reported, so every
reported cycle is a real directed cycle. Completeness: every directed cycle
contains a back edge in any DFS forest, so every cycle is found. Iterative
(not recursive) DFS is mandatory: SwiftWasm stacks are small and deep chains
(A1->A2->...->A100000) must not overflow. Complexity O(V + E).

Self-reference (`A1 = A1+1`) is a 1-cycle. Range self-inclusion
(`A1 = SUM(A1:A5)`) is a cycle. `INDIRECT`-style dynamic refs are out of scope
for v1 (no INDIRECT function in the library), so the graph is fully static and
extractable from ASTs: no runtime edge discovery.

### 5.3 Topological recalculation (Kahn, minimal dirty closure)

```
recalc(editSet):
  dirty = closure over dependent edges from editSet (BFS/DFS following
          precedent->dependent direction), union volatile cells (5.4)
          and IFERROR/conditional dependents conservatively (all syntactic
          dependents; laziness affects values, not dirty marking)
  order = Kahn topological sort restricted to dirty formula cells:
    indegree within dirty subgraph; emit zero-indegree nodes first
  for c in order: value[c] = eval(AST[c], values)
  cells skipped (not dirty) keep cached values
  any dirty cell still unemitted after Kahn (indegree never zero) is in a
  cycle: value = #CYCLE! (consistent with 5.2; detection runs first so the
  message carries the cycle path for the inspector UI)
```

Full recalc is the special case `editSet = all cells`. Minimal recalc must be
observably identical to full recalc (property test 12.4: random edit
sequences, compare minimal vs full workbook snapshots).

Complexity: dirty closure O(V_d + E_d) for the dirty subgraph; Kahn O(V_d +
E_d); each cell evaluates once. Full rebuild O(V + E). Memory O(V + E) for
adjacency (forward + reverse edges for closure and Kahn).

### 5.4 Volatile functions

`TODAY()` (and its alias `NOW()` if the Builder adds time-of-day; date-only
TODAY is required) is volatile: its host cell is added to every recalc's
dirty set, and all transitive dependents are dirtied. `RAND`/`RANDBETWEEN` are
NOT in the v1 library (deliberate: they break determinism headlessly); if the
Architect admits them later they must be volatile plus seeded (specify the RNG
and seed channel now: splitmix64, seed stored in workbook metadata, advanced
once per recalc pass, recorded so headless replay reproduces the sequence).

### 5.5 Recalc correctness proofs (committed here for `tabula/docs/`)

**Theorem 1 (Topological evaluation is the least fixpoint).** Let the
precedent graph restricted to non-cyclic cells be a DAG and let each formula
denote a pure function of its precedents' values (volatile cells treated as
edited inputs). Then evaluating cells in any topological order yields the
unique simultaneous fixpoint of all equations, because each cell is evaluated
after all its precedents hold final values (induction on topological rank).
No iteration is needed: one pass suffices.

**Theorem 2 (Cycle detection is sound and complete).** Per 5.2: reported
cycles correspond exactly to directed cycles (soundness from GRAY = on-stack;
completeness from every directed cycle containing a back edge in the DFS
forest). `#CYCLE!` taint (cycle members plus their transitive dependents)
is exactly the set of cells whose equations admit no unique solution from
the static graph.

**Theorem 3 (Minimal recalc equals full recalc).** Dirty closure contains
precisely the cells whose inputs changed (edit set, volatile re-evaluation,
or a changed precedent). Cells outside the closure have unchanged precedents
and pure (non-volatile) formulas, so their cached values equal fresh
evaluation. Hence evaluating the closure in topological order and keeping all
other caches yields the full-recalc workbook.

**Theorem 4 (Error propagation is monotone).** With the precedence order of
4.4, replacing any precedent value by a higher-precedence error cannot lower
the dependent's error precedence (errors flow outward, never inward). In
particular `IFERROR` is the unique error-decreasing operator, and its
semantics (catch-all) is the only place error monotonicity is intentionally
broken. This justifies testing error pairs once per operator and generalizing.

---

## 6. Evaluator semantics

`eval(expr, env) -> Value` with `env: Addr -> Value` (post-topological values
for precedents; literals looked up directly):

- Arithmetic `+ - * / ^`: `toNumber` both sides, compute in Double, map
  domain failures (`/0` -> `#DIV/0!`, `0^negative` -> `#DIV/0!`, negative
  base to fractional power -> `#NUM!`, overflow to inf -> `#NUM!`).
- Comparison: Section 4.3 ordering; always returns Bool, never errors except
  propagated precedent errors.
- `&`: `toString` both sides, concatenate. Never errors except propagation.
- Unary minus/plus: `toNumber`.
- `%`: `toNumber(v)/100`.
- `Ref(a)`: `env(resolve(a))`, where dangling/deleted refs resolve to `#REF!`.
- `Range`: only valid as a function argument expecting an array; a bare range
  in scalar position evaluates to the range's top-left value (Excel implicit
  intersection simplified: document as top-left, not true intersection, for v1).
- `Call`: look up function (case-insensitive); unknown -> `#NAME?`; arity
  check -> `#N/A` for missing-required vs `#VALUE!` for too-many (pin one
  choice: unknown function `#NAME?`, wrong arity `#VALUE!`, lookup miss
  `#N/A`); evaluate args (strict except IF/AND/OR/IFERROR per 4.4), apply the
  function definition from Section 7.

Determinism: no wall-clock reads except TODAY (date only, injectable clock:
`eval` takes a `todaySerial` parameter; headless tests fix it). No RNG in v1
core. Map iteration is forbidden in evaluation paths; range folds iterate in
row-major address order; function arg order is source order.

---

## 7. Function library (denotational semantics)

Conventions: `N` = number after `toNumber`, `T` = text after `toString`,
`R` = range/array args folded per-function. Scalar args given a range use the
top-left rule. All names case-insensitive. Arity errors -> `#VALUE!`.

### 7.1 Math

- `SUM(args...)`: each arg is scalar or range; ranges contribute numeric
  cells only (skip text/blank, propagate errors per 4.4). No args -> 0.
- `AVERAGE(args...)`: mean over numeric cells in args; zero numeric cells ->
  `#DIV/0!`.
- `MIN/MAX(args...)`: over numeric cells; none -> 0 (Excel-compatible).
- `COUNT(args...)`: count of numeric values (numbers, numeric strings only if
  literal args not range members; range text never counts). `COUNTA` counts
  non-blank; `COUNTBLANK` counts blanks in range (required helpers; cheap).
- `ROUND(x, n)`: round half away from zero to n digits (n may be negative);
  non-integer n truncated toward zero before use.
- `ABS(x)`, `SQRT(x)` (`x<0` -> `#NUM!`), `EXP(x)` (overflow -> `#NUM!`),
  `LOG(x, [base=10])` (`x<=0` or base invalid -> `#NUM!`), `LN(x)`,
  `POWER(x,y) = x^y`, `MOD(x,y)` (`y=0` -> `#DIV/0!`, sign of result follows
  divisor, Excel-compatible), `INT(x)` (floor), `TRUNC(x,[n])`.
- `SUMPRODUCT`: pairwise products over equally-shaped ranges (shape mismatch
  -> `#VALUE!`).

### 7.2 Text

All text functions operate on Unicode scalar values; LEN counts scalars
(documented; grapheme-cluster counting is a v2 nicety). Indexing is 1-based.

- `CONCAT(args...)`: `toString` each scalar; ranges expand row-major.
- `LEFT(s,[n=1])`, `RIGHT(s,[n=1])`, `MID(s,start,n)`: `n<0` -> `#VALUE!`,
  `start<1` -> `#VALUE!`, overrun clamps to available text.
- `LEN(s)`, `TRIM(s)` (strip leading/trailing spaces, collapse internal runs
  to one space; only U+0020, documented), `UPPER(s)`, `LOWER(s)`,
  `TEXTJOIN(delim, ignoreEmpty, args...)`, `SPLIT` is NOT in v1 (array
  spill is out of scope; document).
- `VALUE(s)` = `toNumber(s)`; `TEXT(n, fmt)` supports `"0"`, `"0.00"`,
  `"0%"`, `"0.00%"` patterns only in v1 (full format codes are display-layer).

### 7.3 Lookup

- `VLOOKUP(key, table, colIdx, [approx=false])`: first-column search;
  exact mode miss -> `#N/A`; `colIdx<1` or beyond width -> `#REF!`.
  Approximate mode requires ascending first column (unsorted -> unspecified
  but deterministic: binary search result, documented as caller error).
- `HLOOKUP`: transpose of VLOOKUP.
- `INDEX(range, r, [c])`: 1-based; out of bounds -> `#REF!`.
- `MATCH(key, range, [type=0])`: type 0 exact (miss -> `#N/A`), type 1
  ascending-binary-search, type -1 descending-binary-search.
- `CHOOSE(n, v1, ...)`: `n<1` or `n>count` -> `#VALUE!`; non-integer n
  truncated toward zero.
- `XLOOKUP` is v2 (requires spill); document as explicitly deferred.

### 7.4 Logic

- `IF(cond, t, [f=false])`: lazy branches (4.4). `toBool(cond)`.
- `AND(args...)` / `OR(args...)`: short-circuit per 4.4; no args: AND -> TRUE,
  OR -> FALSE. `NOT(x)` = negation of `toBool(x)`.
- `IFERROR(v, fallback)`: catch-all (4.4). `IFNA(v, fallback)`: catches only
  `#N/A` (required companion; cheap and prevents over-catching in lookups).
- `ISBLANK`, `ISNUMBER`, `ISTEXT`, `ISERROR`, `ISNA`: type predicates that
  never propagate (return FALSE on error inputs except ISERROR/ISNA which
  return TRUE); `ISERR` = ISERROR minus `#N/A`.

### 7.5 Date

Serial model (normative): day numbers with epoch 1899-12-30 = 0
(Excel-compatible, including the Lotus 1900 leap bug: serial 60 =
1900-02-29 nonexistent, accepted on input, produced never). Time fraction =
fractional part (v1: TODAY has no fraction; DATE serials are integers).

- `TODAY()` volatile, date-only, injectable clock (Section 6).
- `DATE(y,m,d)`: month/year overflow normalizes (month 14 = Feb next year);
  `y<0` or serial out of `[0, 2958465]` (year 9999) -> `#NUM!`.
- `YEAR(s)`, `MONTH(s)`, `DAY(s)`: decompose serial (fraction truncated).
- `DATEDIF(a,b,unit)`: units "D" (days), "M" (whole months), "Y" (whole
  years), "MD"/"YM"/"YD" (Excel-compatible remainders); `a>b` -> `#NUM!`,
  bad unit -> `#VALUE!`.
- `EDATE`/`EOMONTH` recommended companions (month arithmetic with end-of-month
  clamping); same error rules as DATE.

---

## 8. References, names, and structural edits

### 8.1 A1 vs R1C1 and absolute/relative resolution

Internal storage is absolute `(sheet, col, row)`. The `colAbs/rowAbs` flags
record `$` per axis. `resolve(ref, host)`:

- A1 style: absolute axis takes the stored index; relative axis adds the
  offset `stored - hostAtParseTime + hostNow` (equivalently, stores the
  relative delta at parse). R1C1: bracketed components are deltas from host,
  unbracketed are absolute, bare R/C inherits host row/col.
- Display: reprint in the author's original notation (flags preserved),
  adjusting stored indices on structural edits (8.3).

### 8.2 Ranges, cross-sheet refs, named ranges

- Ranges normalize (`lo <= hi` per axis) at parse; `precedents` expands the
  rect (observable semantics; storage may use intervals per 5.1).
- Cross-sheet `Sheet!A1` and `Sheet!A1:B10` resolve `Sheet` case-insensitively;
  missing sheet -> `#REF!` (and the AST node is marked tainted so renaming a
  sheet back does not silently resurrect stale edges: re-resolve on rename).
- Named ranges: workbook-global map name -> (sheet, rect-or-cell-or-formula).
  Names shadow nothing (a name colliding with a cell address is rejected at
  definition). `precedents` includes the name target. Deleted target ->
  `#REF!` at use sites.

### 8.3 Structural edits (insert/delete rows/cols/sheets)

All stored refs (in ASTs, names, conditional-format rules, chart sources) are
translated by the edit: refs strictly inside deleted spans become `#REF!`
(tainted, sticky: undo restores only via undo stack, never auto); refs after
the span shift by the delta; refs spanning a partial deletion clamp or taint
per the rule "a range that loses any member to deletion keeps its endpoints
shifted, and evaluation skips the `#REF!` members only if the whole range
node is not itself tainted; a single-cell ref to a deleted cell is `#REF!`".
Sheet deletion taints all cross-sheet refs to it. These rules are pure
functions over `(workbook, edit)` and get property tests (12.5).

### 8.4 Copy/paste and fill handle laws

- Copy/paste: relative axes translate by `(dst - src)` per cell in the
  pasted block; absolute axes stay. Paste of a range preserves internal
  relative structure (fill-style translation, not textual copy).
- Fill handle drag: linear series detection for numbers/dates (constant step
  from last two values; text with trailing number increments the number;
  otherwise copy). Formula fill = copy/paste translation along the drag
  vector per cell. Autofill preview must be computable without committing
  (pure function of block + vector).

---

## 9. View layer (pure over the computed model)

Formatting, conditional formatting, sort/filter, freeze panes, and resize
never change values. The Architect enforces this by placing them in UI
modules that depend on read-only snapshots.

### 9.1 Cell formats

Number formats: general, fixed decimals, currency (symbol + decimals, symbol
from workbook locale tag, default `$`), percent (value x 100 + `%`), date
(ISO `yyyy-mm-dd` default; locale patterns display-only), text (no coercion
on entry: leading `'` forces text). Fill, borders, alignment, font style are
opaque style records keyed by cell. Format application is O(1) per cell and
never triggers recalc (except text-vs-number entry coercion at edit time,
which is an edit, not a format).

### 9.2 Conditional formatting

Rules are `(range, predicate-or-formula, style)` triples evaluated over
computed values after each recalc for visible cells only (lazy; full-grid
evaluation on export). Rule formulas reuse the parser/evaluator with host =
each member cell (relative refs resolve per member). Rule count per sheet is
capped (recommend 64) to bound repaint cost.

### 9.3 Sorting and filtering

Sort/filter produce **views** (row orderings + hidden sets), never rewriting
formulas: sorting a column reorders a view index; underlying addresses are
stable so refs do not taint. (Excel rewrites refs on sort; Tabula v1
deliberately keeps addresses stable and documents the difference.) Sort is
stable (equal keys keep prior order); filter hides non-matching rows in the
view. Charts and conditional formats follow the view for display but compute
over the model.

### 9.4 Comparison and sort ordering (normative)

Total order for sort and comparisons: blank < number < string < bool, with
numbers by value, strings by Unicode scalar order (case-sensitive, documented;
locale collation is display-only and out of scope), bools FALSE < TRUE.
Errors never sort (a sort key evaluating to error places the row last and
flags the column; deterministic).

---

## 10. Module boundaries (guidance, Architect decides)

```
TabulaCore (pure Swift, zero JS, SwiftPM-tested):
  Lexer.swift, Parser.swift, AST.swift, Value.swift (domain + coercions),
  Ref.swift (A1/R1C1 parse, resolve, translate), Graph.swift (edges, DFS
  cycles, Kahn, dirty closure), Eval.swift (eval + builtins Math/Text/
  Lookup/Date/Logic), Workbook.swift (sheets, names, structural edits,
  CSV/JSON codecs), Clock.swift (injectable today), Series.swift (fill laws)
TabulaBridge (JavaScriptKit only here):
  Bridge.swift (batch get/set values, dirty ranges, error strings; no
  per-cell JS round-trip inside recalc)
TabulaUI (JS/TS + canvas, calls Bridge):
  grid renderer (virtualized), formula bar, inspector (precedents/dependents,
  cycle path, topo rank), formatter panels, sort/filter views, chart views
  (SVG or canvas, re-rendered from snapshot on recalc), storage (OPFS,
  clipboard, file pickers), sample workbook loader
```

Dependency rule: UI -> Bridge -> Core; Core never imports Bridge or UI.
The recalc hot loop stays inside Core (WASM linear memory); the bridge ships
typed arrays of dirty cells per frame.

---

## 11. Storage semantics and invariants

- **JSON workbook** (canonical): `{ version, sheets: [{name, cells:
  {addr: {v | {f, cached?}}}], styles, condFormats, views, names, seed }`.
  Formulas persist as source text (not AST); ASTs rebuild on load (parse
  errors on load -> `#VALUE!` with position, load never fails). Version field
  gates migrations (unknown major -> refuse with message, never silent drop).
- **CSV import/export:** per-sheet; export writes computed values (General
  rendering, errors as codes, ISO dates); import parses each field as number
  (General grammar) else text, never as formula (leading `=` imports as text
  unless the user confirms formula mode; prevents formula injection).
  Round-trip invariant: `export(import(export(w))) == export(w)` field-wise
  (property test 12.6).
- **OPFS persistence:** autosave debounced snapshots of the JSON workbook;
  load order: OPFS snapshot > bundled sample > empty. Quota failure degrades
  to in-memory with a visible indicator, never silent loss.
- **Clipboard:** TSV for ranges (Excel-compatible), JSON for full fidelity;
  paste adjusts refs per 8.4.

---

## 12. Property tests and benchmark gates (binding on Builder/Tester)

All headless tests run under `swift test` against TabulaCore with fixed
`todaySerial` and no randomness (seeded only where specified).

### 12.1 Parser round-trip

For a corpus of valid formulas plus generated expressions: AST equality
`parse(print(parse(s))) == parse(s)`. Fuzz corpus >= 1000 cases.

### 12.2 Evaluator oracle

Hand-computed table of >= 300 cases covering every function in Section 7,
every coercion cell in 4.3, every error-precedence pair in 4.4, and the
tricky arithmetic identities (`-2^2 = -4`, `2^3^2 = 512`, `1/3*3 != 1`
floating-point documented, `MOD` sign, `ROUND` half-away, `VLOOKUP`/`MATCH`
miss semantics, `DATE` overflow normalization, `DATEDIF` remainders).

### 12.3 Graph invariants (property tests, randomized, seeded)

- Precedent extraction soundness: every address `eval` reads is in
  `precedents` (instrumented evaluator cross-check).
- Range folding equivalence: interval-edge implementation agrees with naive
  full-expansion on random workbooks.
- Cycle soundness/completeness: reported cycles verify as real cycles;
  injected cycles (self, 2-cycle, range self-inclusion, long chain closure)
  are all reported with `#CYCLE!` taint exactly on members plus dependents.
- Kahn validity: emitted order respects all edges; cyclic residue exactly
  equals DFS-tainted set.

### 12.4 Minimal vs full recalc agreement

Random edit sequences (value edits, formula edits, structural edits per 8.3)
over random workbooks: snapshot after minimal recalc equals snapshot after
full recalc, cell-for-cell including error codes.

### 12.5 Structural edit laws

Ref translation (8.3) and copy/paste/fill (8.4) tested as pure functions:
identity edit is identity; delete-then-undo restores sources; paste
translation commutes with resolve (`resolve(translate(r,d), host+d) ==
translate(resolve(r,host), d)` for relative axes; absolute axes fixed).

### 12.6 Storage round-trips

CSV field-wise idempotence (Section 11); JSON save/load preserves values,
formats, names, and views; malformed JSON/CSV inputs degrade to per-cell
errors, never loader crashes.

### 12.7 Performance budgets (binding)

- **10k-cell recalc:** chain + fan-out workbook (5000-chain depth plus 5000
  dependents on one source, mixed SUM/IF/VLOOKUP) recalcs in < 1 s on a
  desktop core in WASM (headless Swift native target < 250 ms as proxy during
  development). Report cold full-recalc and single-cell-edit minimal-recalc
  separately.
- **Parse throughput:** >= 50k formula parses/s (native proxy) on the fuzz
  corpus average length.
- **Grid scroll:** 60 fps pan over 100k-row sheet (virtualized; O(visible)
  DOM/canvas ops per frame, zero recalc on scroll).
- **Memory:** sparse storage; empty 1M-row sheet < 5 MB overhead;
  graph edges ~2 words per precedent edge.

### 12.8 Determinism

Same workbook + same edit script + same `todaySerial` + same seed ->
byte-identical JSON snapshot across runs and across native vs WASM core
(modulo float-to-string rendering, which is pinned to a single Ryu/dragonbox
implementation shared by both targets).

---

## 13. Risks and recommendations

1. **SwiftWasm is a new factory language.** De-risk first: Architect proves
   `carton build` hello-grid plus one `swift test` core test before any UI
   work; if the WASM toolchain blocks, the headless core still lands as a
   shippable SwiftPM package and the UI falls back to a thin prebuilt bundle.
2. **Do not invent formula semantics.** Every deviation from Sections 4/7/8
   needs a written justification citing Excel or HyperFormula behavior; silent
   drift is the top correctness risk.
3. **No spill arrays in v1.** Defer XLOOKUP/SPLIT/dynamic spill; document the
   boundary instead of half-implementing it (half spill corrupts the graph
   model).
4. **Sort stability over Excel fidelity.** The stable-addresses decision (9.3)
   differs from Excel deliberately; surface it in the user docs so the Tester
   does not file it as a bug.
5. **Date serials are pinned, not inherited.** Never call platform calendar
   APIs in the core; all date math goes through the serial functions of 7.5
   with the injectable clock.
6. **Bridge batching is a perf requirement, not a nicety.** Per-cell JS calls
   inside recalc will miss the 10k budget by orders of magnitude; ship typed
   dirty-range batches from day one.
7. **Cycle UX is a feature.** The inspector must show the cycle path and the
   topological rank of every cell (graph metadata is user-visible, per the
   #282 vision of a traceable engine).

---

## 14. Handoff to the Architect

The Architect should produce a blueprint that:

1. Lays out SwiftPM packages matching Section 10 (`TabulaCore` pure,
   `TabulaBridge` JavaScriptKit-only, `TabulaUI` JS/canvas), with the
   dependency rule UI -> Bridge -> Core and the hot loop inside Core.
2. Proves the SwiftWasm build (`carton`, JavaScriptKit version pin, Pages
   artifact at `/tabula/index.html` + `tabula/docs/`, offline service worker
   scope) before committing to UI depth.
3. Designs the canvas grid virtualization (visible-window rendering, freeze
   panes, resize handles, O(visible) frame budget) against read-only Core
   snapshots via batched Bridge transfers.
4. Schedules the Section 12 test gates as `swift test` suites plus recorded
  perf numbers, with the 10k-cell budget as a blocking acceptance criterion.
5. Plans the sample workbook (covers every function family, one displayed
   cycle, one conditional-format rule, one chart per type) and the docs pages
   carrying the Section 5 proofs into `tabula/docs/`.
6. Records explicit v2 deferrals (spill arrays, XLOOKUP/SPLIT, INDIRECT,
   RAND/RANDBETWEEN seeding, locale collation, grapheme LEN) so scope stays
   closed.

- Dr. Mob, the Researcher
