# STATE

Last updated: 2026-11-03T05:15Z by run 41582350876. Wake: the owner-authored `/oc maintainer` comment on #808 at 05:10:34Z after the round-7 lab push. This run dispatched nothing: the round-7 review is already queued on the new head, every other active lane is in flight, and no PR carries a fresh tester-plus-eval marker chain to merge.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 05:11-05:15Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Open PRs: #813, #809, #808, #804, #788, #745. Open issues: 23, including #812. Every active head is MERGEABLE/CLEAN except #745 CONFLICTING/DIRTY. Pages green at 05:10:37Z. Zero failed, timed-out, or real cancelled runs in the survey window (the maintainer run cancellations at 05:10-05:11Z are the designed single-pending-slot supersession, not failures).
- **#808 (this wake)**: head `c366370b2fa7267c723ef789410b798de4af0418`, MERGEABLE/CLEAN, body 5,296 chars, `Closes #799`. Lab run `41580662092` completed SUCCESS at 05:10:38Z and pushed `1972582e`, `c27e229e`, `b345008b`, `c366370b` (branch `5873359d` -> `c366370b`), closing round-6 review F1 (the SSH percent-decoding bypass: `ssh://` userinfo is now restricted to a plain `[A-Za-z0-9._-]+` username) and F2 (the body and round-6 note accuracy corrections), with the three percent negatives, two distinct-slug positives, and the historical mis-target membership pin. Verified from the pushed tree: targeted 22/22, landing 67/67, `bash -n` clean, `git://` bare-host rule intact, HTTPS/HTTP credentialed form intact, dot-owner guard intact. Review `41582350906` is queued on the new head from the lab workflow's `/oc review` at 05:10:26Z; no verdict yet.
- **#813**: head `aac6805d4fcb566ed64c8fbbaff27caf4e3a82c6`, MERGEABLE/CLEAN, `Closes #810`, 4 files. Review `41580750250` completed SUCCESS at 05:11:31Z with a `lab` verdict (the workflow gate and R32 behavioral matrix are correct; a finding remains). The report posted at 05:11:26Z and the review workflow forwarded `/oc lab` at 05:11:28Z; Lab Engineer `41582441854` is live on `aac6805d` since 05:11:31Z.
- **#809**: head `6cdb1b1e3338ccb90f350d874f73fe8f5bd62f2e`, MERGEABLE/CLEAN. The read-only Tester approved at 04:58:08Z (`scope: infra`, evidence gate passed); the workflow published the canonical `/oc approve-test` marker at 04:58:10Z. The binding eval `41581431601` is live since 05:01:24Z. No eval marker yet.
- **#788**: head `c7c3ff31a2aa06bc527294eebc69647d52315961`, MERGEABLE/CLEAN, stable. The manual head-bound review `41581013994` is live since 04:56:56Z on the unchanged head; no verdict yet. The two tester markers are from 2 November and bind older heads; no eval marker exists.
- **#804**: head `d1a4b5c90be4ad6251a6361a5afa05fc1a317e90`, MERGEABLE/CLEAN. Lab `41569642729` is live since 03:01:19Z (about 136 minutes, inside the 150-minute agent / 180-minute job cap) on the round-3 B1-B4 findings: two owner-PAT exfiltration paths (`GH_CONFIG_DIR` pre-plant and the workspace git credential helper), bypassable durable N5 persistence, and the R17 scan covering only two of the four required live paths.
- **#811**: open; its resume-metadata fix rides on #809 (`0877534b` plus the R11 pin). Close it on #809 merge evidence after verifying the fix on `main`.
- **#812**: open; the concurrent #809 tick added the Tester's non-blocking `--exclude-standard` note at 05:01:19Z. Still held behind #809 by design because both edit `silent-stall-audit.sh`, and serialized against #813 as well.
- **No merge candidate**: no open PR carries a fresh, head-bound, owner-authored tester verdict plus a fresh, head-bound `eval-verdict: approve-eval` marker. #809 has the tester verdict but its eval is in flight and no eval marker exists; #808's tester marker binds `cf626b9c`; #804 has no tester verdict at its head; #788's markers bind 2 November heads; #813 is in the lab lane.
- **Health**: all five live lanes are inside their caps (#808 review queued, #813 lab 4m, #809 eval 14m, #788 review 18m, #804 lab 136m). No provider-wall sample since the #788 review `41575070562` at 04:11:31Z (about 64 minutes). Main unchanged, Pages green, allowlist 19/19, zero held runs, zero real failures. **#745** parked CONFLICTING/DIRTY at `7a04fa4a`. **#803** queued behind the #788/#792 lanes. **#792** waits behind #788; #786 stays open until the #788 merge. #773/#774/#775 parked. #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## The live lanes (do not duplicate)

1. #808 review `41582350906` queued on `c366370b` (workflow-touching diff, so the Tester will be read-only). On a clean verdict the workflow forwards `/oc test`; on `fix` the Fixer; on `lab` the Lab Engineer with the exact finding.
2. #813 lab `41582441854` on `aac6805d`: close the review-round finding. On a push the lab workflow forwards `/oc review`, then the read-only Tester, then the binding eval, then the marker-chain merge with `Closes #810`.
3. #809 eval `41581431601` on `6cdb1b1e`. On `approve-eval` the marker chain unlocks the merge with `Closes #807`; on `fix` the verdict routes the Fixer.
4. #788 manual review `41581013994` on `c7c3ff31`. On approval the workflow forwards `/oc test`; on `fix` the forward starts the Fixer; on another wall death re-dispatch after the next 30-minute cooldown on a fresh runner.
5. #804 lab `41569642729` on `d1a4b5c9`: close B1-B4, including both owner-PAT exfiltration paths. On a push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #798`.

## The #808 chain

1. Read the round-7 review `41582350906` on `c366370b`. On approval the workflow forwards the read-only Tester; on `fix` the Fixer; on `lab` the Lab Engineer with the exact finding.
2. After the Tester, the binding eval must return `approve-eval`; then verify the owner-authored marker chain (tester verdict older than a fresh eval marker, both bound to the current head) and merge `--rebase` (fallback `--merge`, branch kept), closing #799.
3. The stale-head review risk: if an older review run posts `fix` or `lab` for a pre-`c366370b` head, do not treat it as a verdict on the new head; the review's head binding and the fresh run govern.

## The #813 chain

1. Read the lab push and its forwarded review. On approval the workflow forwards `/oc test` (read-only, the diff touches `.github/workflows`); on `fix` the Fixer; on `lab` the Lab Engineer.
2. After the Tester, the binding eval, then the marker-chain merge with `Closes #810`. Close nothing early: #810 is the defect issue this PR closes on merge.

## The #809 chain

1. Read the binding eval verdict on `6cdb1b1e`. On `approve-eval`, verify the owner-authored marker is head-bound, newer than the tester verdict and the latest eval trigger, with no newer owner-authored rejection or `/oc fix`; then merge `--rebase` (fallback `--merge`, branch kept) with `Closes #807`.
2. After the merge, verify the #811 fix on `main`, close #811 on that evidence, reconcile the #812 items against the merge head, drop the landed ones, and dispatch one lab pass for the rest.
3. Watch the `opencode-peros-test.yml` overlap with #804: both branches edit it, so the second merge may need a rebase.

## The #788 chain

1. Read the manual head-bound review verdict on `c7c3ff31`. On approval the workflow forwards `/oc test`; on `fix` the forward starts the Fixer; on another wall death re-dispatch after the next 30-minute cooldown on a fresh runner.
2. On Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head, so the native evidence binds the final head.
3. On a clean macOS and Linux pass, dispatch the binding eval on the new head; on `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence (the PR body says `Refs`, so this is a manual close), and dispatch `build` #792.
4. Do not treat unchanged-head markers from older chains as fresh. The review lifetime budget is spent, so any further crash needs a manual dispatch.

## The #812 follow-up (held)

- Covers the reproduced decoy-job bypass in `.github/scripts/silent-stall-audit.sh` (scope the R11 extraction to the unique `lab:` job, pin the linkage-guard-before-edit order, add the decoy and reordered fixtures) plus `LAB.md:1032-1034` (skip-worktree + intent-to-add + lane guard), the `opencode-test.yml` success-message wording, and the Tester's `--exclude-standard` note from #809.
- HOLD: do not dispatch a lab pass while #809 or #813 is open or in flight, because all three edit `silent-stall-audit.sh`. After both merge, verify each item on the merge head, drop the ones that landed, and triage the rest as one lab pass.

## The serialized infra queue

1. Live this tick: #808 review, #813 lab, #809 eval, #788 manual review, #804 lab.
2. After #809 merges: #812 triage on the merge evidence; close #811.
3. After #813 merges: reconcile its audit changes into the #812 pass.
4. #803 (lifetime retry budgets) after the #788/#792 lanes settle; #745 after that; #773/#774/#775 parked.
5. #792 immediately after the #788 merge; close #786 on the same evidence.

## Loose ends board

1. **#808**: round-7 lab landed on `c366370b`; the round-7 review is queued and is the next gate.
2. **#813**: review returned `lab`; the Lab Engineer lane is live on `aac6805d`.
3. **#809**: tester approved `6cdb1b1e`; the binding eval is live and is the next gate.
4. **#788**: manual review live on `c7c3ff31`; the lifetime retry budget is spent, so the next crash needs another manual pass after a fresh 30-minute cooldown.
5. **#804**: lab live on B1-B4 (two owner-PAT exfiltration paths), about 136 minutes in.
6. **#811**: close on #809 merge evidence. **#812**: held behind #809 and serialized against #813.
7. **Wall watch**: dormant since 04:11:31Z; every new dispatch is a fresh egress roll. Treat any death as per-egress: re-dispatch after the 30-minute failure cooldown; never park on `retry-after`.
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

1. Read the #808 round-7 review verdict and route the next lane.
2. Read the #813 lab push and its forwarded review.
3. Read the #809 binding eval verdict; on `approve-eval` verify the marker chain and merge with `Closes #807`, then verify #811 on `main`, close it, and reconcile #812.
4. Read the #788 manual review verdict and route the next lane.
5. Read the #804 lab push and its forwarded review.
6. After the #788 Tester approval: dispatch `test-macos` (the delegated acceptance) and `test-linux` as warranted on the tester-settled head, then the binding eval, then verify the marker chain and merge, close #786, and dispatch `build` #792.
7. On every failure, verify the head and artifacts against the live repo before claiming a change landed; never advance the ladder on a provider wall.

## Open questions

1. Does the #808 round-7 review approve `c366370b`, or does it return another parser divergence?
2. Does the #813 lab close the review finding in one round?
3. Does the #809 binding eval return `approve-eval` and clear the merge with `Closes #807`?
4. Does the #788 manual review survive the wall and approve `c7c3ff31` on this attempt?
5. Does the #804 lab close B1-B4, including both owner-PAT exfiltration paths?
6. Is the wall dormant (no new sample since 04:11:31Z) or does it return on the next fresh runner?

- Hephaestus, the Maintainer
