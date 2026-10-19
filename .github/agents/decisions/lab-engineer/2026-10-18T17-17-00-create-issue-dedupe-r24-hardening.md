# Decision: Create-issue dedupe review-fix round (F1 delegation record, F2 R24 hardening, F3 inventory sync)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T17:17:00Z
- **Applies to:** PR #670 / issue #668 (create-issue dedupe; review findings F1/F2/F3)
- **Status:** accepted; handed to the Reviewer

## What was decided

The Reviewer's round-1 audit of PR #670 filed three findings. This record is
the fix round; it also discharges F1 by being the run's durable artifact.

1. **F2 (blocking, guard gap): R24 gets structural pins plus a
   production-shaped functional sandbox.** Round-1 R24 pinned the three exact
   control-flow lines (loader invocation, `if existing:` skip guard, the skip
   branch's terminating `continue`) and ran the real extracted handler block
   against a mock `gh`, but two sabotage classes still concluded 24/0 while
   the dedupe was dead in production:
   - An **inserted** environment-conditional re-assignment right after the
     fail-open line (for example
     `_open_issue_titles = {} if "R24_CALLS" not in os.environ else _open_issue_titles`
     or the `GITHUB_ACTIONS`-keyed twin) changed no pinned line, and the old
     sandbox both passed `R24_*` variables through the handler env and
     scrubbed `GITHUB_ACTIONS`, so the sabotage was inert precisely under
     audit (independent verifier V1's E9/E9b, with exploit diffs and a
     production-shape lethality proof).
   - A `.clear()`/`.update()`-style call could empty the index with no new
     assignment line at all.
   Round-2 corrections in `.github/scripts/silent-stall-audit.sh`:
   - **Structural pins** (lines 4325-4336): the run-local
     `_open_issue_titles` index must be assigned exactly twice in the
     extracted block (its initialization and the single fail-open line), and
     the only attribute accesses on it must be exactly `.get` and
     `.setdefault` (the two legal uses). An inserted re-assignment lands as
     `index-assignments:3`; any other attribute call lands as
     `index-attribute-uses:...`.
   - **Production-shaped sandbox env** (r24_run, env block at lines
     4473-4480): `GITHUB_ACTIONS=true`, `GITHUB_REPOSITORY=RandomLabs/RandomLabs`,
     `GITHUB_REPOSITORY_OWNER=RandomLabs`, `GITHUB_WORKFLOW`, `GITHUB_JOB`,
     `GITHUB_RUN_ID`, `GITHUB_EVENT_NAME`, `GITHUB_ACTOR` set; credentials
     (`GITHUB_TOKEN`, `GH_API_TOKEN`, `GITHUB_EVENT_PATH`,
     `ACTIONS_RUNTIME_TOKEN`, `ACTIONS_ID_TOKEN_*`) scrubbed; **no
     harness-specific variable reaches the handler**: the mock's state
     (mode, list fixture, call log, create counter) is baked into the
     generated mock script itself via an `__R24_STATE__` placeholder
     substituted at generation time (lines 4406, 4441), matching the
     R17/R19/R22 harness precedent of a realistic non-credential Actions
     context.
2. **F1 (blocking, delegation ledger): this record is the artifact.** It
   carries the Delegation ledger (subagent scopes, what each produced, what
   the primary verified) and the skills line, following the PR
   #652/#667 precedent.
3. **F3 (minor, stale inventory):** `.github/workflows/opencode.yml`'s rule
   inventory now enumerates through R23 and R24 (its clauses previously
   stopped at R22 while the header claimed R1-R24), and the header word
   "statically audited" was corrected to "audited" because R17-R24 are
   hybrid static plus functional rules.
4. **Documentation sync:** `AGENTS.md` (dedupe bullet) and `LAB.md`
   (Maintainer section) now describe the structural pins, the
   production-shaped sandbox env, and the documented residual instead of the
   stale "live Actions env scrubbed" wording.

## Evidence

Round-2 primary matrix (each mutation applied to a fresh tree copy with an
exact anchor assertion, full audit run per copy; logs under /tmp/opencode):

| mutation | R24 | tokens |
| --- | --- | --- |
| control | PASS 24/0 | - |
| M1 loader -> `loaded = {}` | FAIL | no-loader-invocation + 5 functional-s2 |
| M2 `if existing:` -> `if False:` | FAIL | no-skip-guard + functional |
| M3 remove skip `continue` | FAIL | skip-continue pin + 2 functional-s2 |
| M4 triage -> `pass` | FAIL | skip-triage pin + functional |
| M5 drop `setdefault` | FAIL | created-index pin + functional-s3 |
| M6 decoy comment + narrowed guard | FAIL | no-skip-guard + functional |
| M7 `if _open_issue_titles is None:` -> `if False:` | FAIL | 7 functional |
| E9 inserted R24_CALLS-keyed re-assignment | FAIL | index-assignments:3 + 4 functional-s2 |
| E9b inserted GITHUB_ACTIONS-keyed re-assignment | FAIL | index-assignments:3 + 4 functional-s2 |
| E9c inserted HOME-keyed re-assignment | FAIL | index-assignments:3 |
| E9d HOME-keyed `_open_issue_titles.clear()` | FAIL | index-attribute-uses |
| E10 helper-internal HOME-keyed index fabrication | PASS 24/0 | documented residual (below) |
| H1 sandbox PATH drops the mock (guard stub first on PATH) | FAIL | 11 functional tokens, 11 guard-stub calls, no network |
| H2 mock chmod -x | FAIL | functional-mock-not-intercepted |

E9/E9b now fail both structurally and **functionally** (the functional-s2
tokens prove the production-shaped env catches them, not just the new pin).

Independent round-2 verification (subagent V3, /tmp/opencode/v3, real tree
read-only): control 24/0 under strace with 102 `gh` execs all resolving to
generated mock paths and zero AF_INET/AF_INET6 sockets; its own V-a..V-f
matrix reproduced every verdict above (V-d is E10); V-d lethality evidence
proves the mutated helper yields `{}` under `HOME=/home/runner` and the real
index under a `/tmp` HOME; sandbox temp dirs cleaned; docs sweep produced the
three stale-wording findings that were all applied before this commit.

## Honest residuals (documented, review-gated)

- **In-band mock distinguishability inside unpinned helper internals.** A
  sabotage that keeps every pinned line intact and keys on an attribute no
  sandbox can hide (for example `HOME.startswith("/home/")`) can still make
  the helper fabricate an empty index under audit while being dead in
  production (E10/V-d). This is the same accepted limitation class as R23's
  PATH `git` shim: a static audit that executes the real code against an
  in-band mock cannot defeat arbitrary environment fingerprinting. The
  demonstrated flag-based classes (writer's V1 E9/E9b) are closed; the
  residual is documented in the R24 property text, the PASS description,
  `AGENTS.md`, and `LAB.md`, and is review-gated.
- The sandbox's fixture tokens (`owner-pat-fixture`, `bot-token-fixture`) and
  sandbox paths remain fingerprintable by deliberate sabotage; assertions
  need distinguishable tokens, and sandbox isolation needs private HOME/TMPDIR
  paths.

## Out-of-scope observation (not touched by this PR)

V3 observed that each full audit run leaks one R17-shaped `/tmp/tmp.*`
directory: R17 installs `trap 'rm -rf "$r17_tmp"' EXIT`
(silent-stall-audit.sh:1509) and R19 later overwrites the same EXIT trap
(:2595), so R17's cleanup never runs. Pre-existing hygiene, unrelated to the
dedupe; flagged here for Maintainer triage (candidate for a future R-level
regression guard).

## Delegation ledger

- **V1** (adversarial mutation matrix; scope: real tree read-only, copies under
  /tmp/opencode/v1): control 24/0; E1-E8d all caught (E8c/E8d functional-only,
  proving the sandbox's teeth); found the E9/E9b env-sensing escapes with
  exploit diffs and a production-shape lethality proof; analyzed harness
  mutations H1/H2. Recommended the production-shaped env plus baked mock
  state paths that round 2 implements. V1 authored none of the guard code.
- **V2** (independent functional reproduction plus docs sweep; scope:
  /tmp/opencode/v2): rebuilt its own extractor and harness, 37/37 scenario
  assertions on the real block, strace-confirmed mock-only interception
  (15 execs, 0 real `gh`), confirmed the F3 inventory scope and R24 wording.
- **V3** (round-2 independent adversarial verification; scope: real tree
  read-only, /tmp/opencode/v3): control 24/0 with strace no-network proof;
  V-a..V-f verdict table (all caught except the documented V-d residual);
  sandbox cleanup verified; docs-consistency sweep produced AGENTS.md:76,
  LAB.md:188-194, and opencode.yml:59 findings, all applied before commit.
  V3 authored none of the pinned code.
- **Primary (this session):** authored the structural pins, the
  production-shaped sandbox env, and the baked-state mock on top of the
  round-1 guard; updated `AGENTS.md`, `LAB.md`, `opencode.yml`; ran the
  M1-M7/E9-E10/H1/H2 matrix; ran the full audit to green (24/0) on the final
  tree; wrote the PR metadata handoff files and this record.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not opencode
  workspace configuration).

- the Lab Engineer
