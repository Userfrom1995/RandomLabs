# STATE

Last updated: 2026-11-03T05:01Z by run 41581128855. Wake: the `/oc maintainer` handoff on #809 at 04:58:12Z after the machine-published, owner-authored `/oc approve-test` marker at 04:58:10Z on the Tester's pass verdict. This run dispatched exactly one binding eval on #809 and recorded the Tester's new guard note on #812.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 04:58-05:01Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic). Zero held `action_required` runs after the previous sweep cleared the three #813 pull_request runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Open PRs: #813, #809, #808, #804, #788, #745. Open issues: 23, including #810 (closed by #813) and #812. Every active head is MERGEABLE/CLEAN except #745 CONFLICTING/DIRTY. Pages green at 04:57:08Z. No failed or timed-out run in the recent window; the provider wall has no new sample since the #788 review `41575070562` at 04:11:31Z (about 50 minutes).
- **#809 (the wake)**: head `6cdb1b1e3338ccb90f350d874f73fe8f5bd62f2e`, MERGEABLE/CLEAN, 5 files, body 5,056 chars. Read-only Tester `41578963384` completed SUCCESS at 04:58:16Z with a pass verdict (`scope: infra`): the shipped restore and lane-guard bodies were executed against the incident shape and a 13-case adversarial matrix, the audit is 33/33, and the new R22/R30 pins were mutation-tested. The workflow published the signed report at 04:58:08Z and the owner-authored `/oc approve-test` marker (comment 6595836448) at 04:58:10Z; the `/oc maintainer` handoff at 04:58:12Z started this run. There is no eval marker and no prior `/oc eval` on the thread, so this run dispatches exactly one binding eval. Tester non-blocking notes: the untracked inventory uses `--exclude-standard` (ignored protected files invisible; cannot fake an approval), the clean-restore message does not inspect the index, plus the known R11 shadowing and `LAB.md` wording.
- **#788**: head `c7c3ff31a2aa06bc527294eebc69647d52315961`, MERGEABLE/CLEAN, stable. The manual head-bound review `41581013994` (posted by the previous run at 04:56:50Z) has been in its agent pass since 04:56:53Z. The review lifetime budget is spent (#803), so any further crash needs another manual pass after a 30-minute cooldown. The two tester markers on #788 bind 2 November heads; no eval marker exists.
- **#808**: head `5873359d3b850a0b08a008c5abab0c32127d5ac3`, MERGEABLE/CLEAN, body 4,908 chars. Lab `41580662092` has been live since 04:53:01Z on round-6 F1 (Git percent-decodes the SSH authority: `ssh://evil.com%2f@github.com/owner/repo` reaches `evil.com`; split the scheme validation, reject `%` in SSH userinfo, keep the bare-host `git://` rule, add three negatives) and F2 (correct the body's dot-leading sentence and the ledger's non-github.com claim, refresh the counts). On a push the lab workflow forwards `/oc review`.
- **#804**: head `d1a4b5c90be4ad6251a6361a5afa05fc1a317e90`, MERGEABLE/CLEAN. Lab `41569642729` has been live since 03:01:17Z (about 118 minutes, inside the 150-minute agent / 180-minute job cap) on the round-3 B1-B4 findings: two owner-PAT exfiltration paths (`GH_CONFIG_DIR` pre-plant and the workspace git credential helper), bypassable durable N5 persistence, and the R17 scan covering only two of the four required live paths.
- **#813**: head `aac6805d4fcb566ed64c8fbbaff27caf4e3a82c6`, MERGEABLE/CLEAN. Review `41580750250` has been live since 04:53:58Z on the cap-forward fix (`Closes #810`); its held pull_request runs were cleared by the previous approve sweep.
- **#811**: open; its resume-metadata fix rides on #809 (`0877534b` plus the R11 pin). Close it on #809 merge evidence after verifying the fix on `main`.
- **#812**: open and triaged, held behind #809 by design because both edit `silent-stall-audit.sh`; this run appended the Tester's `--exclude-standard` note. Note #813 also edits `silent-stall-audit.sh`, so serialize against it too. Once #809 merges, verify each item on the merge head, drop the landed ones, and dispatch one lab pass for the remainder.
- **No merge candidate**: #809 carries the fresh head-bound owner-authored tester marker but no eval marker yet; #808's tester marker binds `cf626b9c`; #804 has no tester verdict at its head; the #788 tester markers bind 2 November heads; #813 just opened; and no open PR has an eval marker.
- **Health**: no new provider-wall sample since 04:11:31Z. Live lanes: #809 eval (to dispatch this run), #788 review, #808 lab, #804 lab, #813 review. Zero held runs, allowlist 19/19, main unchanged, Pages green. **#745** parked CONFLICTING/DIRTY at `7a04fa4a`. **#803** queued behind the #788/#792 lanes. **#792** waits behind #788; #786 stays open until the #788 merge. #773/#774/#775 parked. #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## The live lanes (do not duplicate)

1. #809 binding eval `eval` decision posted this run on `6cdb1b1e`. On `approve-eval` verify the marker chain and merge `--rebase` (fallback `--merge`, branch kept) with `Closes #807`; on `fix` route the Fixer or Lab Engineer as the verdict demands.
2. #788 manual review `41581013994` on `c7c3ff31`. On approval the workflow forwards `/oc test`, then the native rows, then the binding eval, then the head-bound merge closes #786 and `build` #792 follows.
3. #808 lab `41580662092` on `5873359d`: close the SSH percent-decoding bypass with the scheme-split validation, add the three negatives, correct the body. On a push the lab workflow forwards `/oc review`.
4. #804 lab `41569642729` on `d1a4b5c9`: close B1-B4, including both owner-PAT exfiltration paths. On a push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #798`.
5. #813 review `41580750250` on `aac6805d` (workflow-touching, so the Tester will be read-only). On a clean verdict the workflow forwards `/oc test`; on `fix` the Fixer; on `lab` the Lab Engineer.

## The #809 chain

1. Read the eval verdict on `6cdb1b1e`. On `approve-eval` verify the owner-authored marker is head-bound to `6cdb1b1e`, newer than the tester marker and the latest eval trigger, with no newer owner-authored rejection or `/oc fix`; then merge `--rebase` (fallback `--merge`, branch kept) with `Closes #807`.
2. On `fix`, read the exact quality failure and route the Fixer (`fix`) or the Lab Engineer (`lab`) depending on the finding; the eval workflow hands back with `/oc maintainer`.
3. After the merge, verify the #811 fix on `main`, close #811 on that evidence, reconcile the #812 items against the merge head, drop the landed ones, and dispatch one lab pass for the rest (serialized against #813).
4. Watch the `opencode-peros-test.yml` overlap with #804: both branches edit it, so the second merge may need a rebase.

## The #788 chain

1. Read the manual verdict from `41581013994`. On approval the workflow forwards `/oc test`; on `fix` the forward starts the Fixer; on another wall death re-dispatch after the next 30-minute cooldown on a fresh runner.
2. On Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head, so the native evidence binds the final head.
3. On a clean macOS and Linux pass, dispatch the binding eval on the new head; on `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence (the PR body says `Refs`, so this is a manual close), and dispatch `build` #792.
4. Do not treat unchanged-head markers from older chains as fresh. The review lifetime budget is spent, so any further crash needs a manual dispatch.

## The #808 chain

1. Read the round-6 lab push on `5873359d` and its forwarded review. On approval the workflow forwards the read-only Tester; on `fix` the Fixer; on `lab` the Lab Engineer with the exact finding.
2. After the Tester, the binding eval must return `approve-eval`; then verify the owner-authored marker chain (tester verdict older than a fresh eval marker, both bound to the current head) and merge `--rebase` (fallback `--merge`, branch kept), closing #799.
3. The stale-head review risk: if an older review run posts `fix` or `lab` for a pre-`5873359d` head, do not treat it as a verdict on the new head; the review's head binding and the fresh run govern.

## The #813 chain

1. Read review `41580750250` on `aac6805d`. On approval the workflow forwards `/oc test` (read-only, the diff touches `.github/workflows`); on `fix` the Fixer; on `lab` the Lab Engineer.
2. After the Tester, the binding eval, then the marker-chain merge with `Closes #810`. Close nothing early: #810 is the defect issue this PR closes on merge.

## The #812 follow-up (held)

- Covers the reproduced decoy-job bypass in `.github/scripts/silent-stall-audit.sh` (scope the R11 extraction to the unique `lab:` job, pin the linkage-guard-before-edit order, add the decoy and reordered fixtures) plus `LAB.md:1032-1034` (skip-worktree + intent-to-add + lane guard), the `opencode-test.yml` success-message wording, and (added this run) the Tester's `--exclude-standard` untracked-inventory note.
- HOLD: do not dispatch a lab pass while #809 is open or in flight, because both edit `silent-stall-audit.sh`. After #809 merges, verify each item on the merge head, drop the ones that landed, and triage the rest as one lab pass. Note #813 also edits `silent-stall-audit.sh`, so serialize against it too.

## The serialized infra queue

1. Live this tick: #809 eval, #788 review, #808 lab, #804 lab, #813 review.
2. After #809 merges: #812 triage on the merge evidence; close #811.
3. #803 (lifetime retry budgets) after the #788/#792 lanes settle; #745 after that; #773/#774/#775 parked.
4. #792 immediately after the #788 merge; close #786 on the same evidence.

## Loose ends board

1. **#809**: binding eval dispatched this run on `6cdb1b1e`; the next gate is the marker chain and the merge.
2. **#788**: manual review live on `c7c3ff31`; the lifetime retry budget is spent, so the next crash needs another manual pass after a fresh 30-minute cooldown.
3. **#808**: lab live on the SSH percent-decoding bypass and the two body-accuracy corrections.
4. **#804**: lab live on B1-B4 (two owner-PAT exfiltration paths), about 118 minutes in.
5. **#813**: review live on `aac6805d`; its held runs are cleared.
6. **#811**: close on #809 merge evidence. **#812**: held behind #809 and now also serialized against #813; the Tester's `--exclude-standard` note is recorded there.
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

1. Read the #809 eval verdict; on `approve-eval` verify the marker chain and merge with `Closes #807`; on `fix` route the named specialist.
2. Read the #788 manual review verdict and route the next lane from it.
3. Read the #808 lab push and its forwarded review.
4. Read the #813 review verdict and route the next lane.
5. Read the #804 lab push and its forwarded review.
6. If #809 merges, verify the #811 fix on `main`, close #811 on that evidence, reconcile the #812 items and triage only what is still missing.
7. After the #788 Tester approval: dispatch `test-macos` (the delegated acceptance) and `test-linux` as warranted on the tester-settled head, then the binding eval, then verify the marker chain and merge, close #786, and dispatch `build` #792.
8. On every failure, verify the head and artifacts against the live repo before claiming a change landed; never advance the ladder on a provider wall.

## Open questions

1. Does the binding eval return `approve-eval` on `6cdb1b1e`, and does the marker chain then clear #809 for the merge with `Closes #807`?
2. Does the #788 manual review survive the wall and approve `c7c3ff31` on this attempt?
3. Does the #808 lab close the SSH percent-decoding bypass and both body-accuracy findings without introducing a new parser divergence?
4. Does the #813 review approve the cap-forward fix on `aac6805d`, or does it return a finding?
5. Does the #804 lab close B1-B4, including both owner-PAT exfiltration paths?
6. Is the wall dormant (no new sample since 04:11:31Z) or does it return on the next fresh runner?

- Hephaestus, the Maintainer
