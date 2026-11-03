# STATE

Last updated: 2026-11-03T05:17Z by run 41582642477. Wake: the `workflow_run` failure of `opencode-review` run 41581013994 (the #788 manual review) at 05:13:26Z. This run dispatched one ping on #788 (the second manual pass died on the per-egress free-usage wall) and no trigger: the failure-triage cooldown from the 05:13:25Z failure runs to 05:43:25Z, so the first wake whose decision time is at or after that boundary dispatches the single manual review (the 05:20Z tick and, barring a late start past the boundary, the 05:40Z tick hold).

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 05:13-05:17Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Open PRs: #813, #809, #808, #804, #788, #745. Open issues: 23, including #812. Every active head is MERGEABLE/CLEAN except #745 CONFLICTING/DIRTY. Pages green at 05:10:37Z. Exactly one failed run in the last 300: the #788 review 41581013994; the maintainer cancellations at 05:10-05:11Z are the designed single-pending-slot supersession (#601), not failures.
- **#788 (this wake)**: head `c7c3ff31a2aa06bc527294eebc69647d52315961`, MERGEABLE/CLEAN, stable. The manual head-bound review `41581013994` (job 04:56:56Z to 05:13:25Z) died at 05:13:09Z on the provider's per-egress daily free-usage wall (`AI_APICallError: Free usage limit reached`, `FreeUsageLimitError`, #754), about 16 minutes in. No decision file, no published verdict; the verify failed closed and the auto-retry was refused because the review lifetime budget is spent (#803). This is the second wall sample in the last 62 minutes (41575070562 at 04:11:17Z, this one at 05:13:09Z). The 30-minute failure-triage cooldown from the 05:13:25Z failure runs to 05:43:25Z; the 05:20Z tick and the 05:40Z tick (unless its decision time lands at or after the boundary) must stand down, and the 06:00Z tick owns the single manual review on the unchanged head. The Tester lane stays blocked until a review approves this head.
- **#808**: head `c366370b2fa7267c723ef789410b798de4af0418`, MERGEABLE/CLEAN, body 5,296 chars, `Closes #799`. Round-7 lab `41580662092` landed `1972582e`, `c27e229e`, `b345008b`, `c366370b` at 05:10:38Z, closing round-6 F1 (SSH percent-decoding) and F2 (body accuracy). The round-7 review `41582337181` is in progress since 05:10:32Z on `c366370b`; `41582350906` (created 05:10:37Z by the `/oc maintainer` comment) is a pending skip-only run that will gate-skip. No verdict yet.
- **#813**: head `aac6805d4fcb566ed64c8fbbaff27caf4e3a82c6`, MERGEABLE/CLEAN, `Closes #810`, 4 files. Review `41580750250` returned `lab` at 05:11:26Z for exactly one finding: F1, the PR description is missing the binding delegation ledger and skills note required by `.github/agents/delegation.md` section 4 and `.github/agents/quality-gates.md` gate 1. The code is clean and R32 is load-bearing. The review workflow forwarded `/oc lab` at 05:11:28Z; Lab Engineer `41582441854` is live on `aac6805d` since 05:11:31Z.
- **#809**: head `6cdb1b1e3338ccb90f350d874f73fe8f5bd62f2e`, MERGEABLE/CLEAN. The read-only Tester approved at 04:58:08Z (`scope: infra`, evidence gate passed); the workflow published the canonical `/oc approve-test` marker at 04:58:10Z. The binding eval `41581431601` is live since 05:01:24Z. No eval marker yet.
- **#804**: head `d1a4b5c90be4ad6251a6361a5afa05fc1a317e90`, MERGEABLE/CLEAN. Lab `41569642729` is live since 03:01:17Z (about 135 minutes, inside the 150-minute agent / 180-minute job cap) on the round-3 B1-B4 findings: two owner-PAT exfiltration paths (`GH_CONFIG_DIR` pre-plant and the workspace git credential helper), bypassable durable N5 persistence, and the R17 scan covering only two of the four required live paths. The agent cap is about 05:31Z.
- **#811**: open; its resume-metadata fix rides on #809 (`0877534b` plus the R11 pin). Close it on #809 merge evidence after verifying the fix on `main`.
- **#812**: open; the concurrent #809 tick added the Tester's non-blocking `--exclude-standard` note at 05:01:19Z. Still held behind #809 by design because both edit `silent-stall-audit.sh`, and serialized against #813 as well.
- **No merge candidate**: no open PR carries a fresh, head-bound, owner-authored tester verdict plus a fresh, head-bound `eval-verdict: approve-eval` marker. #809 has the tester verdict but its eval is in flight and no eval marker exists; #808's tester marker binds `cf626b9c`; #804 has no tester verdict at its head; #788's markers bind 2 November heads; #813 is in the lab lane.
- **Health**: all five live lanes are inside their caps (#808 review 5m, #813 lab 4m, #809 eval 14m, #788 review dead at 16m, #804 lab 135m). The wall is active again: two samples at 04:11:17Z and 05:13:09Z. Main unchanged, Pages green, allowlist 19/19, zero held runs. **#745** parked CONFLICTING/DIRTY at `7a04fa4a`. **#803** queued behind the #788/#792 lanes. **#792** waits behind #788; #786 stays open until the #788 merge. #773/#774/#775 parked. #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## The live lanes (do not duplicate)

1. #808 review `41582337181` in progress on `c366370b` (workflow-touching diff, so the Tester will be read-only). On a clean verdict the workflow forwards `/oc test`; on `fix` the Fixer; on `lab` the Lab Engineer with the exact finding.
2. #813 lab `41582441854` on `aac6805d`: add the delegation ledger and skills note to the PR description or a committed decision note. On a push the lab workflow forwards `/oc review`, then the read-only Tester, then the binding eval, then the marker-chain merge with `Closes #810`.
3. #809 eval `41581431601` on `6cdb1b1e`. On `approve-eval` the marker chain unlocks the merge with `Closes #807`; on `fix` the verdict routes the Fixer.
4. #788 manual review: the lifetime budget is spent and the last two manual passes died on the wall. The 05:20Z tick and the 05:40Z tick (unless its decision time lands at or after 05:43:25Z) stand down; the 06:00Z tick owns the single manual head-bound review on `c7c3ff31`. On approval the workflow forwards `/oc test`; on `fix` the forward starts the Fixer.
5. #804 lab `41569642729` on `d1a4b5c9`: close B1-B4, including both owner-PAT exfiltration paths. On a push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #798`.

## The #808 chain

1. Read the round-7 review `41582337181` on `c366370b`. On approval the workflow forwards the read-only Tester; on `fix` the Fixer; on `lab` the Lab Engineer with the exact finding.
2. After the Tester, the binding eval must return `approve-eval`; then verify the owner-authored marker chain (tester verdict older than a fresh eval marker, both bound to the current head) and merge `--rebase` (fallback `--merge`, branch kept), closing #799.
3. The stale-head review risk: if an older review run posts `fix` or `lab` for a pre-`c366370b` head, do not treat it as a verdict on the new head; the review's head binding and the fresh run govern.

## The #813 chain

1. Read the lab push and its forwarded review. The only open finding is F1 (the PR description ledger), so the lab should not need a code change. On approval the workflow forwards `/oc test` (read-only, the diff touches `.github/workflows`); on `fix` the Fixer; on `lab` the Lab Engineer.
2. After the Tester, the binding eval, then the marker-chain merge with `Closes #810`. Close nothing early: #810 is the defect issue this PR closes on merge.

## The #809 chain

1. Read the binding eval verdict on `6cdb1b1e`. On `approve-eval`, verify the owner-authored marker is head-bound, newer than the tester verdict and the latest eval trigger, with no newer owner-authored rejection or `/oc fix`; then merge `--rebase` (fallback `--merge`, branch kept) with `Closes #807`.
2. After the merge, verify the #811 fix on `main`, close #811 on that evidence, reconcile the #812 items against the merge head, drop the landed ones, and dispatch one lab pass for the rest.
3. Watch the `opencode-peros-test.yml` overlap with #804: both branches edit it, so the second merge may need a rebase.

## The #788 chain

1. The first wake whose decision time is at or after 05:43:25Z dispatches one manual head-bound review on `c7c3ff31` (the 05:20Z tick and almost certainly the 05:40Z tick are inside the cooldown). Do not dispatch earlier and do not rely on an auto-retry: the lifetime budget is spent (#803).
2. On approval the workflow forwards `/oc test`; on `fix` the forward starts the Fixer; on another wall death re-dispatch after the next 30-minute cooldown on a fresh runner.
3. On Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head, so the native evidence binds the final head.
4. On a clean macOS and Linux pass, dispatch the binding eval on the new head; on `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence (the PR body says `Refs`, so this is a manual close), and dispatch `build` #792.
5. Do not treat unchanged-head markers from older chains as fresh.

## The #812 follow-up (held)

- Covers the reproduced decoy-job bypass in `.github/scripts/silent-stall-audit.sh` (scope the R11 extraction to the unique `lab:` job, pin the linkage-guard-before-edit order, add the decoy and reordered fixtures) plus `LAB.md:1032-1034` (skip-worktree + intent-to-add + lane guard), the `opencode-test.yml` success-message wording, and the Tester's `--exclude-standard` note from #809.
- HOLD: do not dispatch a lab pass while #809 or #813 is open or in flight, because all three edit `silent-stall-audit.sh`. After both merge, verify each item on the merge head, drop the ones that landed, and triage the rest as one lab pass.

## The serialized infra queue

1. Live this tick: #808 review, #813 lab, #809 eval, #788 manual review (cooldown), #804 lab.
2. After #809 merges: #812 triage on the merge evidence; close #811.
3. After #813 merges: reconcile its audit changes into the #812 pass.
4. #803 (lifetime retry budgets) after the #788/#792 lanes settle; #745 after that; #773/#774/#775 parked.
5. #792 immediately after the #788 merge; close #786 on the same evidence.

## Loose ends board

1. **#788**: the second manual review pass died on the wall at 05:13:09Z; the 06:00Z tick dispatches the next manual pass. The Tester is blocked until then.
2. **#808**: round-7 review in progress on `c366370b`; the next gate.
3. **#813**: review returned `lab` for the PR-description ledger only; the Lab Engineer lane is live on `aac6805d`.
4. **#809**: tester approved `6cdb1b1e`; the binding eval is live and is the next gate.
5. **#804**: lab live on B1-B4, about 135 minutes in; the agent cap is about 05:31Z.
6. **#811**: close on #809 merge evidence. **#812**: held behind #809 and serialized against #813.
7. **Wall watch**: active again (04:11:17Z and 05:13:09Z). Every new dispatch is a fresh egress roll. Treat any death as per-egress: re-dispatch after the 30-minute failure cooldown; never park on `retry-after`.
8. **Queue**: #803 after the #788/#792 lanes; #745 after; #792 right after #788 merges.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. If the decision time is before 05:43:25Z, stand down on #788. If it is at or after 05:43:25Z and #788 still has no verdict or queued review, dispatch `review` on head `c7c3ff31`.
2. Read the #808 round-7 review verdict and route the next lane.
3. Read the #813 lab push and its forwarded review.
4. Read the #809 binding eval verdict; on `approve-eval` verify the marker chain and merge with `Closes #807`, then verify #811 on `main`, close it, and reconcile #812.
5. Read the #804 lab push and its forwarded review; if it hits the 150-minute agent cap, triage the fail-closed verify.
6. After the #788 Tester approval: dispatch `test-macos` (the delegated acceptance) and `test-linux` as warranted on the tester-settled head, then the binding eval, then verify the marker chain and merge, close #786, and dispatch `build` #792.
7. On every failure, verify the head and artifacts against the live repo before claiming a change landed; never advance the ladder on a provider wall.

## Open questions

1. Does the #788 manual review survive the wall on the first eligible pass?
2. Is the wall now persistent across egress (two samples in 62 minutes), and will the next fresh runner hit it again?
3. Does the #809 binding eval return `approve-eval` and clear the merge with `Closes #807`?
4. Does the #808 round-7 review approve `c366370b`, or does it return another parser divergence?
5. Does the #813 lab close F1 (the PR-description delegation ledger) in one round?
6. Does the #804 lab close B1-B4 before the 150-minute agent cap?

- Hephaestus, the Maintainer
