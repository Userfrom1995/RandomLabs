# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32624140162, owner `/oc maintainer` + `/oc continue` on PR #121). Re-survey confirms: **B7 shipped on PR #121** (build `32623315056`, head `6e0a229`) - the real Squeeze + MA-tree greedy split with mandatory `llc_class`/`sibling_class` (R11-A guard satisfied, M3). The owner's `/oc continue` at 06:54:08Z (B8 driver) was CANCELLED with zero jobs by the same-issue `/oc maintainer` concurrency, so NO B8 build is in flight; this run re-dispatches `continue` on #121 to recover it. PR #118 has two leftover builds (`32623717752` in_progress + `32623724512` pending) from the last #118 `/oc continue` (06:44:35Z); they will land + pause and are dropped from rotation. PR #121 MERGEABLE, kept OPEN (no premature #117 close).

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root `60748e88`; promoted to Current via merged PR #115; docs cleaned by merged PR #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 (Obsidian umbrella) is now CLOSED.
- **NEXT PRIORITY (owner):** build **Prism (issue #103, M0 MERGED via #104)** - beats JPEG XL (~8.71 bpp on Kodak). M1-M4 continuation in flight (issue #117, PR #118, now PR #121 carries the live code). Owner override: NO merge until M0+M1+M2+M3 met bit-exactly on REAL Kodak (M3 < JPEG XL 8.71). The merge gate is tied to the ACTUAL project goal, not any iteration/round limit.
- **Iteration limit LIFTED (2026-08-22T14:51Z):** owner removed the 20-round/iteration cap and said "keep working". The circuit-breaker budget is now unlimited by owner action. A further main commit ("Remove halt/breaker on factory pipeline", `91c8707`) formally DELETED the breaker entirely, so the loop may run unbounded without manual re-pings.
- **Model switch (owner-authorized, RE-APPLIED run 32623724573):** `opencode/x-preview-f-free` for research/architect/build/fixer (opencode.yml) + lab engineer (lab.yml) + opencode.json `model`. `general` stays `opencode/hy3-free`; `small_model` stays `opencode/mimo-v2.5-free` (both free, outside owner scope).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism is THE priority; board candidates parked until Prism clears the JXL gate.
- **Quality-gate directive:** quality gates are the ONLY merge criteria.
- **`/oc lab` is a NO-OP:** `opencode.yml` has no `lab` job and `opencode-lab.yml` does not exist; model switches handled by Mae directly via the WORKFLOW-FILE PUSH WALL.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `91c87078919e17f7244a659b2cbf5552c4052502`** (owner commit "Remove halt/breaker on factory pipeline"). Obsidian lives in `obsidian/` on `main`. Both Prism branches are CLEAN DESCENDANTS of `main` (verified merge-base = `91c8707` for both; NOT orphan).
- **Models (post RE-APPLY 2026-08-23, run 32623724573):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; opencode.json `model` = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production deploy succeeded (main). PR previews deploy via PR-preview staging (env approval).
- **CIRCUIT BREAKER: REMOVED** (main commit `91c8707`). The auto-guard no longer exists; the loop runs unbounded.
- **CONCURRENCY NOTE (learned this run):** the `opencode` workflow's concurrency group is keyed by ISSUE number, so two comments on the same issue (e.g. `/oc continue` then `/oc maintainer`) cause the later one to CANCEL the earlier same-issue run. A `/oc continue` posted immediately before `/oc maintainer` on the same PR will be killed. Mitigation: if the owner posts both, the build must be re-dispatched by the Maintainer (this run did exactly that for #121 B8).

## IN FLIGHT (builds)
- **PR #121 (Architect blueprint + live code, branch `opencode/issue117-20260823061608`):** head `6e0a229` (Builder B7 shipped: Squeeze + MA-tree greedy split, R11-A guard satisfied, M3; 23/23 gtest + fuzz 1000 PASS). **B8 build NOT yet in flight** - the owner's `/oc continue` (06:54:08Z) was cancelled by the same-issue `/oc maintainer` (06:54:16Z); this maintainer run re-dispatches `continue` on #121 to recover it (CM + LZP never-expand net, M4 < 8.0).
  - B7 satisfied R11-A: mandatory `llc_class`/`sibling_class` present; coupled path beat no-Squeeze baseline (synthetic 42.6% win). But the merge gate needs REAL Kodak < 8.71 bit-exactly - current evidence is synthetic only.
  - KEPT OPEN (do not merge; body "Closes #117" would prematurely close unmet-gate tracking issue).
- **PR #118 (original Prism M1-M4, branch `opencode/117-prism-m1-m4-optimization`):** head `a160c53f` (B5.48, 11.025 bpp, 0% vs B5.47 - saturated dead end). Two leftover builds from last `/oc continue` (06:44:35Z): `32623717752` in_progress + `32623724512` pending. No new #118 trigger since; these will land and pause. **Dropped from rotation** (never delete branch); fold any residual wins into #121 later.

## PENDING (in order)
    1. **Recover the B8 build on #121** (this run's `continue` dispatch re-drives it after the cancelled 06:54:08 trigger). B8 = CM + LZP never-expand net (M4 < 8.0) + B9/B10 per blueprint.
    2. **Reach the JXL gate (M3 < 8.71) on REAL Kodak.** Only real B7 (done) paired with B8 (CM+LZP) can close the ~2.32 bpp / ~21% gap. Current gains are synthetic; the durable `prism/benchmarks/results/*.csv` (SHA256 pinned) must show mean_summed < 8.71 bit-exactly.
    3. **Once M3 < 8.71 bit-exactly:** fire Reviewer -> Tester before ANY merge.
    4. **Consolidation:** after #118's leftover builds land/pause, fold any #118-only residual wins into #121; drop idle #118 from rotation (never delete the branch).
    5. **PR #121:** stays open as the armed build/blueprint; do NOT merge (would close #117). #117 stays open until gate met.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #118/#121.
- **#117 (Prism M1-M4)** - OPEN (tracking; goal-tied merge gate). Held open until M3 < 8.71 bit-exactly on REAL Kodak.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked behind Prism.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 / #119 / #120** - CLOSED (resolved/redundant).
- **#121 (Architect B7 blueprint + live code PR)** - OPEN, MERGEABLE, KEPT OPEN as active build branch (do not merge; would close #117 prematurely).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `91c87078919e17f7244a659b2cbf5552c4052502`.
- Build agent (workflow `model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized, RE-APPLIED run 32623724573; in effect).
- **Lab Engineer:** `/oc lab` is a NO-OP (no `lab` job in opencode.yml, no `opencode-lab.yml`); model switches handled directly by Mae.
- **Circuit breaker:** REMOVED (owner commit `91c8707`).

## NEXT STEPS
    1. **B8 build on #121** recovered via this run's `continue` dispatch (owner's 06:54:08 trigger was cancelled). No duplicate; it is recovery of a failed trigger.
    2. **Verify B8 ships CM + LZP never-expand net** and that a REAL Kodak < 8.71 CSV exists (not synthetic). If B8 still posts only synthetic wins, escalate to `research`.
    3. **Next resume:** if a real-Kodak gate CSV clears M3, fire Reviewer -> Tester before any merge.
    4. Consolidate onto #121 (fold #118 residual wins, drop idle #118 from rotation).
    5. Brainstorm board #42 stays parked behind Prism per owner directive.
    6. PR #121 kept open as the armed build/blueprint; do not merge (would close #117).

## OPEN QUESTIONS
- After B8 (CM + LZP never-expand net) lands, is there a REAL Kodak `prism/benchmarks/results/*.csv` with mean_summed < 8.71 bit-exactly? Current evidence is synthetic only; the merge gate is tied to real Kodak.
- Will the recovered B8 build actually run (the prior same-issue `/oc maintainer` concurrency cancelled the first attempt)? This run re-dispatched `continue` to guarantee it.
- When/if a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
- Consolidation: after #118's leftover builds land, is #121 cleanly the single source of truth, with #118 residual wins folded in? Drop idle #118 from rotation (never delete branch).
- PR #121 / #117: keep #121 open as armed build; #117 open until gate met.
- Brainstorm board #42: parked behind Prism; no picks until Prism resolves per owner directive.

- Mae, the Maintainer
