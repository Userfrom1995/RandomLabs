# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32624547920, owner `/oc continue` on PR #121). Re-survey confirms: **B8 shipped on PR #121** (build `32624354992`, head `6497b60`) - CM + LZP never-expand net (M4 stretch), 23/23 gtest + fuzz 1000 PASS. The owner's `/oc continue` at 07:03:13Z launched **B9 build `32624548007` (in flight, pending)** on PR #121 - B9 front-end completeness + B10 real-Kodak harness durable CSV. PR #121 MERGEABLE, kept OPEN (no premature #117 close). A stray build `32624540354` is also `in_progress` on PR #118 (dead-end saturated bank); left undisturbed, different concurrency group.

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
- **`main` = `52d775ed24dba42824a00f7473a1fcd0e94d273d`** (advanced past `91c8707` via pages.yml deploy + maintenance commits). Obsidian lives in `obsidian/` on `main`. Both Prism branches are CLEAN DESCENDANTS of `main` (verified merge-base = `52d775ed` for PR #121 head `6497b60`; NOT orphan).
- **Models (post RE-APPLY 2026-08-23, run 32623724573):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; opencode.json `model` = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production deploy succeeded (main). PR previews deploy via PR-preview staging (env approval).
- **CIRCUIT BREAKER: REMOVED** (main commit `91c8707`). The auto-guard no longer exists; the loop runs unbounded.
- **CONCURRENCY NOTE (corrected this run):** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (both `cancel-in-progress: false`). They do NOT cancel each other. The earlier "B8 cancelled by same-issue /oc maintainer" episode was actually the maintainer re-dispatch recovering the trigger, not a group collision. So a maintainer run does NOT kill an in-flight opencode build. A genuine duplicate is only created by posting a SECOND `/oc continue`/`/oc build` on the SAME issue while one is already in flight.

## IN FLIGHT (builds)
- **PR #121 (Architect blueprint + live code, branch `opencode/issue117-20260823061608`):** head `6497b60` (Builder B8 shipped: CM + LZP never-expand net, M4 stretch; 23/23 gtest + fuzz 1000 PASS). **B9 build `32624548007` IS IN FLIGHT** (pending, started 07:03:26Z), driven by owner `/oc continue` at 07:03:13Z. B9 = front-end completeness + B10 real-Kodak durable CSV (`prism/benchmarks/results/*.csv`, SHA256 pinned) to finally measure the merge gate on REAL Kodak. This is the live, owner-driven build - NOT duplicated by this maintainer run.
  - B7 satisfied R11-A: mandatory `llc_class`/`sibling_class` present; coupled path beat no-Squeeze baseline (synthetic 42.6% win). B8 added CM+LZP never-expand. But the merge gate needs REAL Kodak < 8.71 bit-exactly - current evidence is still synthetic only.
  - KEPT OPEN (do not merge; body "Closes #117" would prematurely close unmet-gate tracking issue).
- **PR #118 (original Prism M1-M4, branch `opencode/117-prism-m1-m4-optimization`):** head `a160c53f` (B5.48, 11.025 bpp, 0% vs B5.47 - saturated dead end). A stray build `32624540354` (`in_progress`, started 07:03:15Z) is running on this branch - the saturated predictor bank. Different issue/concurrency group from #121; left undisturbed. **Dropped from rotation** (never delete branch); do not re-continue #118 (0% gains). Fold any residual wins into #121 later.

## PENDING (in order)
    1. **Let B9 build `32624548007` run** (owner-driven, not duplicated). B9 = front-end completeness + B10 real-Kodak harness durable CSV (merge gate measurement).
    2. **Reach the JXL gate (M3 < 8.71) on REAL Kodak.** Only real B7 (done) + B8 (CM+LZP) + B9/B10 durable-CSV harness can confirm the ~2.32 bpp / ~21% gap is closed. The durable `prism/benchmarks/results/*.csv` (SHA256 pinned) must show mean_summed < 8.71 bit-exactly.
    3. **Once M3 < 8.71 bit-exactly:** fire Reviewer -> Tester before ANY merge.
    4. **Consolidation:** fold any #118-only residual wins into #121; drop idle #118 from rotation (never delete the branch).
    5. **PR #121:** stays open as the armed build/blueprint; do NOT merge (would close #117).

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
- `origin/main` = `52d775ed24dba42824a00f7473a1fcd0e94d273d`.
- Build agent (workflow `model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized, RE-APPLIED run 32623724573; in effect).
- **Lab Engineer:** `/oc lab` is a NO-OP (no `lab` job in opencode.yml, no `opencode-lab.yml`); model switches handled directly by Mae.
- **Circuit breaker:** REMOVED (owner commit `91c8707`).

## NEXT STEPS
    1. **B9 build on #121** (`32624548007`, owner-driven) runs to completion - B9 front-end completeness + B10 real-Kodak durable CSV. Not duplicated by this maintainer run (decision `[]`).
    2. **Verify B9/B10 ships the real-Kodak durable CSV** and that a REAL Kodak `< 8.71` result exists (not synthetic). If still synthetic-only, escalate to `research`.
    3. **Next resume:** if a real-Kodak gate CSV clears M3, fire Reviewer -> Tester before any merge.
    4. Consolidate onto #121 (fold #118 residual wins, drop idle #118 from rotation).
    5. Brainstorm board #42 stays parked behind Prism per owner directive.
    6. PR #121 kept open as the armed build/blueprint; do not merge (would close #117).

## OPEN QUESTIONS
- After B9/B10 lands, is there a REAL Kodak `prism/benchmarks/results/*.csv` with mean_summed < 8.71 bit-exactly? Current evidence is synthetic only; the merge gate is tied to real Kodak.
- Will the in-flight B9 build `32624548007` actually run to completion (no same-issue `/oc maintainer` posted this time, so no re-dispatch needed; groups are separate anyway)?
- When/if a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
- Consolidation: after #118's stray build `32624540354` lands, is #121 cleanly the single source of truth, with #118 residual wins folded in? Drop idle #118 from rotation (never delete branch).
- PR #121 / #117: keep #121 open as armed build; #117 open until gate met.
- Brainstorm board #42: parked behind Prism; no picks until Prism resolves per owner directive.

- Mae, the Maintainer