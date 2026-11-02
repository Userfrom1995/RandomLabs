# STATE

Last updated: 2026-11-02T03:58Z by run 41385141280 (intake on #788: the Tester is live on `8723172c`; the #754 gate merged as `eab27e42` and the lab queue opened with #798).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T03:50-03:58Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, the rebase merge of #802 (10 commits). #754 auto-closed at 03:49:12Z; the branch `opencode/issue754-20261101124316` is kept at `29804d03`. The post-merge Pages deploy `41385142547` succeeded for `eab27e42` at 03:49:31Z. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Zero held `action_required` runs. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). No failure, timed-out, or startup-failure run in the newest 100.
- **#788 head `8723172c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. The Tester `41380189329` is in its agent step since 02:54:47Z (120-minute cap under a 180-minute job) and pushed one test-only commit at 03:47:14Z: `8723172c` "tester: pin Chrome command-name resolution in the runner" (57 insertions in `maze-chase/web/e2e/tests/run-browser-e2e.test.js` only). Round-7 review `41336790727` approved `358d5c4b` at 19:24:33Z; the only commit after that approval is the test-only one. Head checks green (`trigger`, `comment`, GitGuardian; `deploy` skipped), and the `8723172c` preview deploy `41384963118` succeeded at 03:47:21Z. No Tester verdict or marker yet.
  - On Tester approval: dispatch `test-linux` + `test-macos` together on the settled head, then the binding eval on that head, then merge with the branch kept and close #786 on the native evidence. On `fix`, the workflow posts `/oc fix`.
- **#798 lab is in flight**: the #802-close maintainer run `41385118705` verified the merge at 03:53Z (comment on #802) and posted `/oc lab` on #798 at 03:53:40Z; Lab Engineer `41385494018` is in its agent step since 03:53:43Z. Scope: a trusted staged trailer-strip step plus a protected-path scope guard for each per-OS arm, with R17/R24 audit coverage and functional fixtures.
- **Lab queue after #798: #799, then #803**, serialized to avoid `.github/scripts/silent-stall-audit.sh` conflicts. #792 waits behind #788. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked after the queue (its lane overlaps the lab files). #773/#774/#775 parked.
- **Open issues: 19**, all triaged: #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. #754 closed with #802. #786 closes on #788's native evidence.
- **Curator/auditor schedules:** the curator's next 6-hour slot is about 06:00Z (historically delayed); the auditor's last audit `41274768125` succeeded 05:12Z on 11-01 and today's 00:00 slot has not fired yet (historical delays up to about 5 hours). No manual re-dispatch for either.
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap moved this checkout from `main` to the #788 head `8723172c`; the staged prompt is trusted and stays authoritative, while the maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after the queue.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #788 intake note. No `emergency.json`.

- No `lab` #798: the #802-close maintainer run dispatched it at 03:53:40Z and the Lab Engineer is live; a second trigger would queue a duplicate heavy session in group `lab-798`.
- No `review` / `fix` / `test` #788: round 7 approved `358d5c4b` and the Tester is live on the settled head; the lone commit after the approval is test-only.
- No `test-linux` / `test-macos` / `eval` / merge #788: no Tester approval marker exists on `8723172c` yet; every downstream lane re-binds to the head the Tester settles.
- No `lab` #799/#803/#745: serialized behind #798 to avoid audit-script conflicts and concurrent heavy sessions on the fragile quota window.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: schedules own the recurring passes, no request, nothing stranded.
- No merge: no owner-authored `eval-verdict: approve-eval` marker for #788; the stale `34571cce` rejection must never be used.

## Next run

1. **Read the #788 Tester verdict.** On approval dispatch `test-linux` + `test-macos` on the settled head, then the binding eval on that head, then merge (`--rebase`, fallback `--merge`, branch kept) and close #786 on the native evidence. On `fix`, the workflow posts `/oc fix`; triage a repeated provider death as the #754 class now on main, not a code finding.
2. **Watch #798's lab PR:** route a workflow-touching head only via `lab` (never `fix`/`continue`); verify the trailer strip, the scope guard, the audit, and the fixtures. Then #799, then #803, serially.
3. **#792** after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
4. **Curator/auditor:** let the schedules run; triage a fresh crash as the wall unless it names a new class.

## Open questions

1. Does the Tester approve `8723172c`, and do both native rows plus the binding eval converge on one head?
2. Does the merged #754 classifier now make a provider-quota death cost seconds instead of the 21-minute watchdog burn (watch the next wall)?
3. Does #798 land in one lab pass with the trailer strip, the scope guard, and a green audit?
4. Do #799 and #803 land serially after #798 without audit-script conflicts?
5. Does #745 still need the recorded provenance fix after the queue settles?

- Hephaestus, the Maintainer
