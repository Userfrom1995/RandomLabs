# Tabula correctness proofs (slimmed from research 5.5)

Source (binding): `docs/research/issue-282-tabula-spreadsheet.md`, section
5.5. The proofs are stated for the workbook model both engines implement
(Swift `TabulaCore` as the semantic authority, `web/engine.js` as the
verified fallback). Each theorem names the suites that pin it.

## Theorem 1 - Topological evaluation is the least fixpoint

Let the precedent graph restricted to non-cyclic cells be a DAG and let each
formula denote a pure function of its precedents' values (volatile cells
treated as edited inputs). Then evaluating cells in any topological order
yields the unique simultaneous fixpoint of all equations, because each cell
is evaluated after all its precedents hold final values (induction on
topological rank). No iteration is needed: one pass suffices.

Pinned by: `Graph.swift` Kahn order validity (emitted order respects every
edge), `Phase3Tests` minimal-vs-full agreement over seeded edit sequences.

## Theorem 2 - Cycle detection is sound and complete

Reported cycles correspond exactly to directed cycles (soundness from
GRAY = on-stack in the iterative DFS; completeness from every directed cycle
containing a back edge in the DFS forest). `#CYCLE!` taint (cycle members
plus their transitive dependents) is exactly the set of cells whose
equations admit no unique solution from the static graph.

Pinned by: `Phase1Tests` graph suites (self, 2-cycle, range self-inclusion,
long-chain closure), Kahn residue equals DFS-tainted set, inspector cycle
paths with jump-to-cell.

## Theorem 3 - Minimal recalc equals full recalc

Dirty closure contains precisely the cells whose inputs changed (edit set,
volatile re-evaluation, or a changed precedent). Cells outside the closure
have unchanged precedents and pure (non-volatile) formulas, so their cached
values equal fresh evaluation. Hence evaluating the closure in topological
order and keeping all other caches yields the full-recalc workbook.

Pinned by: `Phase3Tests` seeded minimal-vs-full cell-for-cell agreement
(including error codes); fallback evidence: mid-chain edit dirties 2502 of
5000 chain cells with the tail recomputed exactly (102499), unrelated edit
dirties exactly 1 (see `scoreboard.md`).

## Theorem 4 - Error propagation is monotone

With the precedence order of `semantics.md` (`#CYCLE! > #REF! > #DIV/0! >
#NAME? > #VALUE! > #N/A > #NUM!`), replacing any precedent value by a
higher-precedence error cannot lower the dependent's error precedence
(errors flow outward, never inward). `IFERROR` is the unique
error-decreasing operator, and its catch-all semantics is the only place
error monotonicity is intentionally broken. This justifies testing error
pairs once per operator and generalizing.

Pinned by: `Phase1Tests` all-49 error-precedence pairs; `Eval.swift`
strict core with the four documented exceptions (`IF` laziness, `AND`/`OR`
prior-error-wins short-circuit, `IFERROR`/`IFNA`, non-propagating `IS*`).
