# Tabula scoreboard (measured, Phase 5)

Binding gates: blueprint performance budgets (research 12.7). Method notes
are recorded so every number is reproducible.

## Recalculation gate (10k cells: 5000-chain + 5000 dependents)

| Engine | Cold full | Single-edit minimal | Verdict |
|---|---|---|---|
| Swift native proxy (`swift test`, debug, this run) | 136 ms | 93 ms | PASS (< 250 ms) |
| JS fallback (`node`, this runner) cheap-mixed workload | 760 ms | 739 ms | PASS (< 1 s) |

Workloads: the Swift proxy is the Phase 3 chain+fan-out suite. The JS
fallback workload builds 5000 `=A{i}+1` chain cells plus 5000 dependents
(`=A$1*2` / `=IF(A$1>0,...)`) via `setCell`, then forces a full recalc
with a same-value `applyEdit` on A1 (note: `fullSnapshot` serializes only;
`applyEdit` recalculates). The single edit changes A1 to 2 and dirties all
10000 cells, which is correct: every cell transitively depends on A1.

Minimality evidence (JS fallback): mid-chain edit at A2500 dirties 2502
cells with the tail exact (A5000 = 102499); unrelated-cell edit dirties
exactly 1. A triangular-`SUM(A$1:A{i})` variant costs 4110 ms full, which
is expected O(n-squared) range-fold work, not a closure defect.

## Parse throughput gate (>= 50k formulas/s native proxy)

JS fallback: 77519 parses/s over an 8-formula corpus x 20000 (`node`).
PASS.

## Oracle parity (Swift authority vs JS fallback)

74 shared cases green, 0 fail: precedence identities (`-2^2 = -4`,
`2^3^2 = 512`, `2^-3`), coercion cells, error precedence, MOD divisor
sign, ROUND half-away, VLOOKUP/HLOOKUP exact + `#N/A` miss, MATCH/INDEX/
CHOOSE, lazy IF, AND/OR prior-error-wins, IFERROR/IFNA, IS* predicates,
DATE overflow + Lotus anchors (`DATE(1900,1,1) = 1`, `DATE(1900,2,28) =
59`, `DATE(1900,3,1) = 61`, `DATE(2024,1,15) = 45306`), DATEDIF/EDATE/
EOMONTH remainders, case-sensitive `=` (research 9.4), `#NAME?` for
out-of-surface names (FIND/SEARCH/SUBSTITUTE/REPT are v1 `#NAME?` on both
engines), 2-cycle `#CYCLE!` taint. Two genuine fallback defects found and
fixed by this run: date serials +1 for all serials >= 60, and the
VLOOKUP/HLOOKUP approx flag inverted.

## Suites

`swift test`: 77/77 green (Phases 1-4). `node --check`: clean on all 11
web modules. Charts `parseRange`/`collect` unit-checked in `node`;
`parseCSV` RFC-4180-checked (quoted commas, doubled quotes, embedded
newlines). Grid scroll performs zero recalc by construction (paint reads
the last snapshot only). Empty-1M-row memory and 60 fps pan targets are
architectural (sparse maps, O(visible) canvas ops) and await the Tester's
Playwright pass for machine numbers.
