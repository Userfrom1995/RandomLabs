# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32623724573, owner `/oc maintainer` on PR #118). Re-survey confirms: TWO builds in flight - `32623717752` on PR #118 (B5.48+, saturated bank, 0% gains) and `32623315056` on PR #121 (the REAL B7 Squeeze+MA-tree attempt, canonical branch). Model switch (research/architect/build/fixer/lab-engineer -> `x-preview-f-free`) RE-APPLIED this run after the prior attempt (32621066396) failed to land on disk; committed by the maintainer push step. PR #118 still MERGEABLE, kept OPEN (its "Closes #117" would prematurely close the unmet-gate tracking issue).

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root `60748e88`; promoted to Current via merged PR #115; docs cleaned by merged PR #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 (Obsidian umbrella) is now CLOSED.
- **NEXT PRIORITY (owner):** build **Prism (issue #103, M0 MERGED via #104)** - beats JPEG XL (~8.71 bpp on Kodak). M1-M4 continuation in flight (issue #117, PR #118, now PR #121 carries the live code). Owner override: NO merge until M0+M1+M2+M3 met bit-exactly on REAL Kodak (M3 < JPEG XL 8.71). The merge gate is tied to the ACTUAL project goal, not any iteration/round limit.
- **Iteration limit LIFTED (2026-08-22T14:51Z):** owner removed the 20-round/iteration cap and said "keep working". The circuit-breaker budget is now unlimited by owner action. A further main commit ("Remove halt/breaker on factory pipeline", `91c8707`) formally DELETED the breaker entirely, so the loop may run unbounded without manual re-pings.
- **Model switch (owner-authorized, RE-APPLIED this run 32623724573):** `opencode/x-preview-f-free` for research/architect/build/fixer (opencode.yml) + lab engineer (lab.yml) + opencode.json `model`. `general` stays `opencode/hy3-free`; `small_model` stays `opencode/mimo-v2.5-free` (both free, outside owner scope). The prior attempt (32621066396) did NOT land on disk; this run re-edited the workflow files and the push step commits them. Takes effect on FUTURE runs only (in-flight builds still on prior models).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism is THE priority; board candidates parked until Prism clears the JXL gate.
- **Quality-gate directive:** quality gates are the ONLY merge criteria.
- **(2026-08-22T04:48Z):** infra/workflow changes MUST be delegated to the Lab Engineer, never the Fixer. Enforced in reviewer.md; `lab.yml` routes `/oc lab` to Lab Engineer for `.github/agents/*.md` edits only.
- **`/oc lab` is a NO-OP:** `opencode.yml` has no `lab` job and `opencode-lab.yml` does not exist, so `/oc lab` comments only spawn skipped runs. The owner's `/oc lab` at 06:39:22Z therefore did nothing; the model switch was handled by Mae directly (permitted Maintainer action for model switching via the WORKFLOW-FILE PUSH WALL), not via a Lab Engineer run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `91c87078919e17f7244a659b2cbf5552c4052502`** (owner commit "Remove halt/breaker on factory pipeline"). Obsidian lives in `obsidian/` on `main`. Both Prism branches are CLEAN DESCENDANTS of `main` (verified merge-base = `91c8707` for both; NOT orphan).
- **Models (post RE-APPLY 2026-08-23, run 32623724573):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; opencode.json `model` = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production deploy succeeded (main). PR previews deploy via PR-preview staging (env approval).
- **CIRCUIT BREAKER: REMOVED** (main commit `91c8707`). The auto-guard no longer exists; the loop runs unbounded.
- **WORKFLOW-FILE PUSH WALL:** the owner's PAT (used by the maintainer push step) carries `workflows: write`, so Mae's directly-edited `.github/workflows/*.yml` model switches are pushed by that step (re-applied this run).

## IN FLIGHT (builds)
- **PR #118 (original Prism M1-M4, branch `opencode/117-prism-m1-m4-optimization`):** head `a160c53f` (B5.48, 11.025 bpp, byte-exact, 0% vs B5.47). Build `32623717752` IN FLIGHT (started 06:44:37Z, owner `/oc continue` 06:44:35Z) - grinding B5.49 on the SATURATED predictor bank. Predictor bank FULLY SATURATED (16/16 nibble, top13, thr55); residual entropy saturated since B5.44. Continuing this branch yields ~0% gains. ~2.32 bpp / ~21% from JXL gate.
  - This branch is now a DEAD END for closing the gate; recommend the owner stop `/oc continue` here and pivot to #121.
- **PR #121 (Architect blueprint + live code, branch `opencode/issue117-20260823061608`):** head `2fbebd6` (Builder B6: CFL + 5/3 lifting + 16-bit widening, M2 scaffold; 23/23 gtest + fuzz 1000 PASS). Build `32623315056` IN FLIGHT (started 06:35:15Z, owner `/oc continue` 06:35:12Z) - **the live, owner-driven B7 build. This is the ACTIVE canonical Prism branch.**
  - Armed blueprint `prism/docs/architecture-m1-m4.md` + R11-A guard: B7 Squeeze+MA-tree greedy split (depth 6, leaves 16-32, mandatory `llc_class`/`sibling_class`); coupled path must beat no-Squeeze baseline or commit rejected.
  - KEPT OPEN (do not merge; body "Closes #117" would prematurely close unmet-gate tracking issue).

## PENDING (in order)
    1. **Let the #121 B7 build `32623315056` run uninterrupted** (no duplicate triggers from me). It MUST implement the REAL B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard). If it posts only a B5.x micro-tweak again, escalate to `research`.
    2. **Recommend the owner pivot `/oc continue` to PR #121, not PR #118.** PR #118 is a saturated dead end (B5.48 = 0%); continuing it wastes build slots.
    3. **B7 Squeeze + MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard)** is the ONLY proven >10% closure path to JXL 8.71. Both micro-tweak banks are saturated; the ~2.32 bpp / ~21% gap cannot close via predictors or lifting.
    4. **Reach the JXL gate (M3 < 8.71).** Only real B7 paired with B6 (5/3 lifting + int32 widening) and B8 (CM+LZP never-expand net) can close the gap.
    5. **Once M3 < 8.71 bit-exactly:** fire Reviewer -> Tester before ANY merge.
    6. **PR #121:** stays open as the armed build/blueprint; do NOT merge (would close #117). #117 stays open until gate met. **PR #118:** keep open but stop continuing it; fold any residual wins into #121 later (never delete the branch).

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #118/#121.
- **#117 (Prism M1-M4)** - OPEN (tracking; goal-tied merge gate). Held open until M3 < 8.71 bit-exactly.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked behind Prism.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 / #119 / #120** - CLOSED (resolved/redundant).
- **#121 (Architect B7 blueprint + live code PR)** - OPEN, MERGEABLE, KEPT OPEN as active build branch (do not merge; would close #117 prematurely).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `91c87078919e17f7244a659b2cbf5552c4052502`.
- Build agent (workflow `model:` input): now `opencode/x-preview-f-free` (FREE, owner-authorized, RE-APPLIED this run 32623724573; takes effect on next runs).
- **Lab Engineer:** `/oc lab` is a NO-OP (no `lab` job in opencode.yml, no `opencode-lab.yml`). The owner's `/oc lab` at 06:39:22Z did nothing; model switch handled directly by Mae.
- **Circuit breaker:** REMOVED (owner commit `91c8707`).

## NEXT STEPS
    1. **#121 B7 build `32623315056` in flight:** no duplicate triggers. Watch it implement the REAL B7 (mandatory `llc_class`/`sibling_class`, R11-A guard).
    2. **Pivot the owner to continue #121, not #118** (comment.md guidance this run). PR #118 is saturated (B5.48 = 0%).
    3. **Next resume:** if B7 shipped and cleared R11-A, push toward the JXL gate; if only a B5.x micro-tweak, escalate to `research`. Then consolidate onto #121 (fold #118 residual wins, drop idle #118 from rotation).
    4. If a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
    5. Brainstorm board #42 stays parked behind Prism per owner directive.
    6. PR #121 kept open as the armed build/blueprint; do not merge (would close #117).

## OPEN QUESTIONS
- Will the in-flight #121 B7 build (`32623315056`) finally implement the REAL B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard)? Both micro-tweak banks are saturated; the ~21% JXL gap cannot close without B7.
- Will the owner pivot `/oc continue` to PR #121 (the canonical branch) instead of grinding the saturated #118 bank?
- If the next #121 resume STILL posts only a B5.x micro-tweak, escalate to `research` for new methodology.
- Consolidation: after the #118 build lands/pauses, is #121 cleanly the single source of truth, with #118 residual wins folded in? Drop idle #118 from rotation (never delete branch).
- When/if a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
- PR #121 / #117: keep #121 open as armed build; #117 open until gate met.
- Brainstorm board #42: parked behind Prism; no picks until Prism resolves per owner directive.

- Mae, the Maintainer
