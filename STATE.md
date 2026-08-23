# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32624817116, owner `/oc continue` on PR #121). Re-survey confirms: **B9/B10 shipped on PR #121** (build head `d8835e9`) - WebP/TIFF/ICC front-end wrappers + real-Kodak bench harness (durable CSV, SHA pin, numeric gate), 23/23 gtest + fuzz 1000 PASS. The owner's `/oc continue` at 07:09:10Z launched **B11 build `32624810980` (in flight, in_progress), with `32624817148` queued behind it on the `opencode-121` group** on PR #121. PR #121 MERGEABLE, kept OPEN (no premature #117 close). PR #118's last stray build `32624540354` COMPLETED (B5.48, 0%, idle) - #118 now fully idle.

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
- **`main` = `52d775ed24dba42824a00f7473a1fcd0e94d273d`** (advanced past `91c8707` via pages.yml deploy + maintenance commits). Obsidian lives in `obsidian/` on `main`. Both Prism branches are CLEAN DESCENDANTS of `main` (verified merge-base = `52d775ed` for PR #121 head `d8835e9`; NOT orphan).
- **Models (post RE-APPLY 2026-08-23, run 32623724573):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; opencode.json `model` = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production deploy succeeded (main). PR previews deploy via PR-preview staging (env approval).
- **CIRCUIT BREAKER: REMOVED** (main commit `91c8707`). The auto-guard no longer exists; the loop runs unbounded.
- **CONCURRENCY NOTE (corrected this run):** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (both `cancel-in-progress: false`). They do NOT cancel each other. A maintainer run does NOT kill an in-flight opencode build. A genuine duplicate is only created by posting a SECOND `/oc continue`/`/oc build` on the SAME issue while one is already in flight.
- **KODAK CORPUS UNBLOCK (NEW this run):** the real Kodak 24-image benchmark set ALREADY exists in-repo at `obsidian/benchmarks/data/kodak/kodim01.ppm … kodim24.ppm`. Prism's `prism/benchmarks/data/` only ships `kodak.sha256` (no images), which is why builds reported the gate "blocked on external dataset". The gate IS measurable now: point `prism bench --effort 3 --kodak <checkout>/obsidian/benchmarks/data/kodak` (or copy the 24 images into `prism/benchmarks/data/kodak/`) to produce a REAL Kodak durable CSV and measure M3 < 8.71 bit-exactly.

## IN FLIGHT (builds)
- **PR #121 (Architect blueprint + live code, branch `opencode/issue117-20260823061608`):** head `d8835e9` (B9/B10 shipped: WebP/TIFF/ICC front-end + real-Kodak bench harness durable CSV; 23/23 gtest + fuzz 1000 PASS, synthetic-only CSV so far). **B11 build `32624810980` IS IN FLIGHT** (in_progress, started 07:09:13Z), with `32624817148` queued behind it on `opencode-121`; driven by owner `/oc continue` at 07:09:10Z. B11 = run REAL Kodak on the in-repo corpus (`obsidian/benchmarks/data/kodak`) to finally measure the M3 < 8.71 gate bit-exactly. This is the live, owner-driven build - NOT duplicated by this maintainer run.
  - B7 satisfied R11-A: mandatory `llc_class`/`sibling_class` present; coupled path beat no-Squeeze baseline (synthetic 42.6% win). B8 added CM+LZP never-expand. The merge gate needs REAL Kodak < 8.71 bit-exactly - now MEASURABLE via the in-repo corpus (previously mistaken as "missing dataset").
  - KEPT OPEN (do not merge; body "Closes #117" would prematurely close unmet-gate tracking issue).
- **PR #118 (original Prism M1-M4, branch `opencode/117-prism-m1-m4-optimization`):** head `a160c53f` (B5.48, 11.025 bpp, 0% - saturated dead end). Last stray build `32624540354` COMPLETED success (07:03:15Z). **FULLY IDLE now** - no in-flight work. Dropped from rotation (never delete branch); do not re-continue #118 (0% gains). Fold any residual wins into #121 later.

## PENDING (in order)
    1. **Let B11 build `32624810980` run** (owner-driven, not duplicated). B11 MUST point the bench harness at the REAL Kodak corpus (`obsidian/benchmarks/data/kodak`, 24 images) to produce a durable `prism/benchmarks/results/*.csv` and measure M3 < 8.71 bit-exactly.
    2. **Reach the JXL gate (M3 < 8.71) on REAL Kodak.** Now MEASURABLE: the in-repo Kodak corpus removes the "external dataset" blocker. The durable `prism/benchmarks/results/*.csv` must show mean < 8.71 bit-exactly.
    3. **Once M3 < 8.71 bit-exactly:** fire Reviewer -> Tester before ANY merge.
    4. **Consolidation:** fold any #118-only residual wins into #121; drop idle #118 from rotation (never delete the branch).
    5. **PR #121:** stays open as the armed build/blueprint; do NOT merge (would close #117 prematurely).

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
    1. **B11 build on #121** (`32624810980`, owner-driven) runs to completion - REAL Kodak measurement (point harness at `obsidian/benchmarks/data/kodak`). Not duplicated by this maintainer run (decision `[]`).
    2. **Verify B11 produces a REAL Kodak `< 8.71` durable CSV** (not synthetic). The in-repo corpus makes this possible now.
    3. **Next resume:** if a real-Kodak gate CSV clears M3, fire Reviewer -> Tester before any merge.
    4. Consolidate onto #121 (fold #118 residual wins, drop idle #118 from rotation).
    5. Brainstorm board #42 stays parked behind Prism per owner directive.
    6. PR #121 kept open as the armed build/blueprint; do not merge (would close #117).

## OPEN QUESTIONS
- After B11 lands, is there a REAL Kodak `prism/benchmarks/results/*.csv` with mean < 8.71 bit-exactly? The in-repo `obsidian/benchmarks/data/kodak` corpus (24 images) removes the prior "external dataset" blocker; the B11 build must target it.
- Will the in-flight B11 build `32624810980` run to completion (no same-issue `/oc maintainer` posted this time that would re-dispatch; groups are separate anyway; `32624817148` is queued behind it on `opencode-121`)?
- When/if a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
- Consolidation: with #118 now fully idle (32624540354 completed), is #121 cleanly the single source of truth, with #118 residual wins folded in? Drop idle #118 from rotation (never delete branch).
- PR #121 / #117: keep #121 open as armed build; #117 open until gate met.
- Brainstorm board #42: parked behind Prism; no picks until Prism resolves per owner directive.

- Mae, the Maintainer