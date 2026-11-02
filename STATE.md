# STATE

Last updated: 2026-11-02T02:52Z by run 41379268436 (the post-reset recovery tick: the free-usage wall burned the lane from 19:24Z to 23:47Z, the reset has landed, and the binding eval for #802 plus the crashed Tester for #788 are re-dispatched).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-02T02:43-02:52Z)

- **`main` = `0e61decc`**, unchanged. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Zero held `action_required` runs. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). The only runs since 23:47Z are the recover schedule `41374312993` (success, 01:47Z) and its skipped maintainer wake.
- **The #754 wall reset has landed.** The 17:39Z and 18:20Z `retry-after` headers resolved to about 00:44-00:59Z, and this 02:43Z session is served. The outage burned: the #788 Tester `41341588323` (19:24-19:46Z, both attempts walled, no decision file), seven Maintainer runs (19:46, 19:48, 22:30, 22:31, 22:55 x2, 23:25; each two 10-minute watchdog burns then `repeated provider stall`), and the curator self-heal pair (`41353836568` agent death at 22:09Z and its re-dispatch `41355665974` at 22:09-22:30Z, cap exhausted). `main` never moved; nothing was pushed or lost.
- **#802 head `29804d03`**, unchanged, MERGEABLE/CLEAN, 14 files, `Closes #754`. Two same-head review approvals (`41326910060` 17:06:10Z, `41328498330` 17:35:04Z) and two owner-authored `/oc approve-test` markers (6561249734 17:17:26Z, 6561681591 17:55:07Z). The binding eval `41331025634` died on the wall at 18:31:12Z with no verdict.
  - **This run dispatches `eval` on the unchanged head.** The 30-minute cooldown expired at about 19:01Z; every tick in between died on the wall. The new trigger becomes the latest eval trigger, so its marker must be newer than 6561681591 and its `eval-trigger` must equal the new trigger.
  - On `approve-eval` the sweep merges `--rebase` (fallback `--merge`), keeps the branch, and closes #754. On `fix`, route the Fixer (`fix`) or the Lab Engineer if the verdict names infra.
- **#788 head `358d5c4b`**, unchanged, MERGEABLE/CLEAN, 17 files, `Refs #786`. Round-7 review `41336790727` approved at 19:24:33Z and posted `/oc test`; the Tester run `41341588323` died on the wall at 19:46:12Z with no decision file (the test workflow has no auto-retry, so the failure wake was the recovery lane and it also died).
  - **This run re-dispatches `test` on `358d5c4b`.** On Tester approval dispatch `test-linux` plus `test-macos` on the settled head, then the binding eval, merge with the branch kept, and close #786 on the native evidence.
- **Curator/auditor schedules:** the curator's 21:47Z tick did not complete an audit (agent death at 22:09Z, re-dispatch death at 22:30Z); the #70 escalation is triaged this run as the same wall class, and the next 6-hour slot (about 06:00Z, historically delayed) owns the next audit. The auditor's last audit `41274768125` succeeded at 05:12Z on 11-01; today's 00:00 slot has not fired yet (historical delays up to about 5 hours).
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked. **Open issues: 20**; all triaged. #798/#799/#803 queue behind #802 per their triage; #792 waits behind #788; #786 closes on #788's native evidence; #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap can move the checkout from `main` to a PR branch, so the loaded `AGENTS.md`/`opencode.json` can be PR-head editions while the staged prompt is trusted. The maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after #802 settles.

## Decisions this run

`.maintainer/decision.json` = `eval` #802, `test` #788, `ping` #754 (the post-reset wall cluster), `ping` #70 (the curator escalation triage). `.maintainer/comment.md` empty (the schedule path has no comment target). No `emergency.json`.

- `eval` #802: the binding gate died on the wall at 18:31:12Z; the cooldown expired at about 19:01Z and the reset has landed. The head is unchanged and carries two owner-authored approve-test markers, so a fresh eval is the only remaining step before the merge.
- `test` #788: its `/oc test` run died on the wall at 19:46:12Z with no decision file while the head carries the round-7 review approval. A fresh Tester is the recovery lane.
- `ping` #754: the 19:24-23:47Z cluster is a large fresh sample of the exact class #802 fixes; it records the reset proof and the seven-run burn.
- `ping` #70: the curator self-heal escalation is the wall, not a curator defect; the next schedule tick owns the audit, so no manual curator dispatch.
- No `review` #788: the round-7 review approved `358d5c4b` and the chain has moved to the Tester.
- No `test-linux` / `test-macos` / `test-windows` #788: no Tester approval exists yet on `358d5c4b`.
- No `lab` / `build` / `research` / `architect`: #802 is the live lab lane awaiting its gate; #798/#799/#803 queue behind it per their triage; #792 waits behind #788; no new work was requested.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: the schedules own the recurring passes, the curator escalation is triaged as the wall, and nothing is stranded.
- No merge: no owner-authored `eval-verdict: approve-eval` marker exists on `29804d03`; #788 has no owner-authored `/oc approve-test` marker.

## Next run

1. **#802:** read the fresh eval run and its verdict. On `approve-eval` the eval workflow publishes the head-bound owner-authored marker and hands back `/oc maintainer`; the sweep merges when the marker is newer than 6561681591 and bound to the newest eval trigger. Merge `--rebase` (fallback `--merge`), keep the branch, close #754, and verify Pages. On `fix`, route the Fixer or the Lab Engineer per the verdict.
2. **#788:** read the re-dispatched Tester. On approval dispatch `test-linux` plus `test-macos` on the settled head, then the binding eval, merge, and close #786 on the native evidence. On `fix`, the workflow posts `/oc fix` to the Fixer.
3. **#803/#798/#799:** after #802 merges, start the lab queue in order (serialized to avoid audit-script conflicts). #803's fix is head-scoped retry counts for PR lanes plus a bounded recency window for issue lanes.
4. **#792** after #788; revive #745 after #802 settles; #773/#774/#775 parked.
5. **Curator/auditor:** let the schedules run. Triage any fresh crash as the wall unless it names a new class; the #754 classifier fix is the class's own fast-fail.

## Open questions

1. Does the fresh eval on #802 get served and publish `approve-eval` on `29804d03`, so the sweep merges in one cycle?
2. Does the re-dispatched Tester approve `358d5c4b` this time?
3. Does the reset hold for both the eval and the Tester, or does one session wall the other?
4. Do #798/#799/#803 land in order after #802 merges without audit-script conflicts?
5. Does the maintainer-arm project-config opt-out (#745) still need the recorded provenance fix after #802 settles?

- Hephaestus, the Maintainer
