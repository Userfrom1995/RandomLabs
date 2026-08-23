# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32622891909, owner `/oc maintainer` on PR #121). Re-survey confirms TWO owner-authorized builds now in flight: `32622267175` (#118, B5.47, 11.025 bpp) and `32622884576` (#121, B5 acoder scaffold, owner `/oc continue` at 06:25:23Z). PR #121 is now the ACTIVE canonical Prism branch (carries blueprint + B5 code). No duplicate triggers dispatched. PR #121 kept OPEN (its "Closes #117" would prematurely close the unmet-gate tracking issue).

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root `60748e88`; promoted to Current via merged PR #115; docs cleaned by merged PR #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 (Obsidian umbrella) is now CLOSED.
- **NEXT PRIORITY (owner):** build **Prism (issue #103, M0 MERGED via #104)** - beats JPEG XL (~8.71 bpp on Kodak). M1-M4 continuation in flight (issue #117, PR #118, now PR #121 carries the live code). Owner override: NO merge until M0+M1+M2+M3 met bit-exactly on REAL Kodak (M3 < JPEG XL 8.71). The merge gate is tied to the ACTUAL project goal, not any iteration/round limit.
- **Iteration limit LIFTED (2026-08-22T14:51Z):** owner removed the 20-round/iteration cap and said "keep working". The circuit-breaker budget is now unlimited by owner action. A further main commit ("Remove halt/breaker on factory pipeline", `91c8707`) formally DELETED the breaker entirely, so the loop may run unbounded without manual re-pings.
- **Model switch (2026-08-23T05:43:32Z, owner-authorized):** set research/architect/build/fixer (opencode.yml) + lab-engineer (lab.yml) + opencode.json `model` to `opencode/x-preview-f-free` (free, confirmed via zen). `general` job left on `hy3-free`; `small_model` stays `mimo-v2.5-free` (free). Next build/agent runs use the new model.
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism is THE priority; board candidates parked until Prism clears the JXL gate.
- **Quality-gate directive:** quality gates are the ONLY merge criteria.
- **(2026-08-22T04:48Z):** infra/workflow changes MUST be delegated to the Lab Engineer, never the Fixer. Enforced in reviewer.md (committed 770a756); `lab.yml` routes `/oc lab` to Lab Engineer for `.github/agents/*.md` edits only.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `91c87078919e17f7244a659b2cbf5552c4052502`** (owner commit "Remove halt/breaker on factory pipeline"). Obsidian lives in `obsidian/` on `main`. Both Prism branches are CLEAN DESCENDANTS of `main` (verified merge-base = `91c8707` for both `4c8c9d2` #118 and `7b69c8d` #121; NOT orphan).
- **Models (post-switch 2026-08-23):** research/architect/build/fixer/lab-engineer = `opencode/x-preview-f-free`; opencode.json `model` = `opencode/x-preview-f-free`, `small_model` = `opencode/mimo-v2.5-free` (both free). `general` = `opencode/hy3-free`.
- **pages.yml:** production deploy succeeded (main). PR previews deploy via PR-preview staging (env approval).
- **CIRCUIT BREAKER: REMOVED** (main commit `91c8707`). The auto-guard no longer exists; the loop runs unbounded.
- **WORKFLOW-FILE PUSH WALL:** the owner's PAT (used by the maintainer push step) carries `workflows: write`, so Mae's directly-edited `.github/workflows/*.yml` model switches are pushed by that step.

## IN FLIGHT (TWO concurrent, both owner-authorized)
- **PR #118 (original Prism M1-M4, branch `opencode/117-prism-m1-m4-optimization`):** head `4c8c9d2` (B5.47, 11.025 bpp, byte-exact). Build `32622267175` STILL `in_progress` (started 06:11:14Z), building B5.48+ on the SATURATED predictor bank. Will land its last B5.x increment then PAUSE (no new owner trigger on #118). Effectively being superseded by #121.
  - Predictor bank FULLY SATURATED (16/16 nibble, top13, thr55). B6 5/3 lifting done but inert (+0.8%, disabled). B7 Squeeze+MA-tree NEVER genuinely built. ~2.32 bpp / ~21% from JXL gate.
- **PR #121 (Architect blueprint + now live B5 code, branch `opencode/issue117-20260823061608`):** head `7b69c8d` (Builder B5 scaffold: FIFO `acoder.h` adaptive range coder + B5 predictor/ResDiff, 23/23 gtest + fuzz 1000 PASS, synthetic 8-15% bpp win). Build `32622884576` `in_progress` (started 06:25:25Z), driven by owner `/oc continue` at 06:25:23Z. **THIS is now the active canonical Prism build branch.**
  - Armed blueprint `prism/docs/architecture-m1-m4.md` + R11-A guard: B7 Squeeze+MA-tree greedy split (depth 6, leaves 16-32, mandatory `llc_class`/`sibling_class`); coupled path must beat no-Squeeze baseline or commit rejected.
  - KEPT OPEN (do not merge; body "Closes #117" would prematurely close unmet-gate tracking issue).

## PENDING (in order)
    1. **Let both in-flight builds land** (no duplicate triggers). #121's `32622884576` is the live owner-driven build; #118's `32622267175` lands B5.48 then pauses.
    2. **Consolidate onto #121** on the next resume: confirm #121 is the single source of truth, fold any #118-only residual wins in, drop idle #118 from rotation (never delete the branch).
    3. **B7 Squeeze + MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard)** is the ONLY proven >10% closure path to JXL 8.71. If the resumed #121 build still posts only a B5.x micro-tweak, escalate to `research` for new methodology.
    4. **Reach the JXL gate (M3 < 8.71).** Only real B7 paired with B6 (5/3 lifting + int32 widening) and B8 (CM+LZP never-expand net) can close the gap.
    5. **Once M3 < 8.71 bit-exactly:** fire Reviewer -> Tester before ANY merge.
    6. **PR #121:** stays open as the armed build/blueprint; do NOT merge (would close #117). #117 stays open until gate met.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #118/#121.
- **#117 (Prism M1-M4)** - OPEN (tracking; goal-tied merge gate). Held open until M3 < 8.71 bit-exactly.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked behind Prism.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 / #119 / #120** - CLOSED (resolved/redundant).
- **#121 (Architect B7 blueprint + live B5 code PR)** - OPEN, MERGEABLE, KEPT OPEN as active build branch (do not merge; would close #117 prematurely).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `91c87078919e17f7244a659b2cbf5552c4052502`.
- Build agent (workflow `model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized switch, active since run 32621066396).
- **Lab Engineer:** reachable via `lab.yml` (`/oc lab`) for PROMPT edits only.
- **Circuit breaker:** REMOVED (owner commit `91c8707`).

## NEXT STEPS
    1. **Both builds in flight:** no duplicate triggers. Watch `32622884576` (#121) as the live build; `32622267175` (#118) lands B5.48 then pauses.
    2. **Next resume:** consolidate onto #121; redirect the live build to the REAL B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard). Another B5.x micro-tweak escalates to `research`.
    3. If a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
    4. Brainstorm board #42 stays parked behind Prism per owner directive.
    5. PR #121 kept open as the armed build/blueprint; do not merge (would close #117).

## OPEN QUESTIONS
- Will the in-flight #121 build (`32622884576`) finally implement the REAL B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard)? Both micro-tweak banks are saturated; the ~21% JXL gap cannot close without B7.
- If the next #121 resume STILL posts only a B5.x micro-tweak, escalate to `research` for new methodology.
- Consolidation: after both builds land, is #121 cleanly the single source of truth, with #118 residual wins folded in? Drop idle #118 from rotation (never delete branch).
- When/if a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
- PR #121 / #117: keep #121 open as armed build; #117 open until gate met.
- Brainstorm board #42: parked behind Prism; no picks until Prism resolves per owner directive.

- Mae, the Maintainer
