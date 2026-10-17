# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39066759473 (~20:31Z) (#614 unification rebase LANDED on `69e1737b` (audit 21/0, R1-R21, R18 in position) after the Tester approved the pre-rebase head; review live on the new head; #622 review round 3 in flight; #627 read-only test in flight; #626 triage run still in flight; main `d6c809e3`; held 0; failures 0; allowlist EXACT 19/19)**

## PRs & Issues
 - **#614** (head `69e1737b`, MERGEABLE/CLEAN, `Refs #612`): the round-6 unification rebase landed ~20:29:56Z (lab run 39066694606 SUCCESS: audit 21 passed / 0 failed; R17<R18<R19<R20<R21 in numbered position; labels R1-R21; both AGENTS.md bullets; peros forwarders + lab.yml budget raise byte-identical; verified raw script from the branch). `/oc review` forwarded 20:29:56Z -> review 39066957542 IN FLIGHT since 20:29:58Z. The Tester's read-only approval (20:27:01Z) bound the PRE-rebase `a7b64cbe` and is stale under head-binding; the new head runs its own review -> read-only test cycle. On test approve -> PAT sweep merge; on merge dispatch the NATIVE PAIR on #582 IN-RUN (a pre-merge Windows dispatch runs main's unfixed YAML and can only reproduce the mangle). Wrapper push-rejection comment 6240540163 (20:29:53Z) = documented expected noise; PAT step landed the head (ls-remote agrees).
 - **#622** (`opencode/lab-620-freetier-retry`, head `274f2c10`, CONFLICTING/DIRTY, `Closes #620`): review round 3 39066073234 IN FLIGHT since 20:17:21Z (pre-flip checkout; conflict is the likely blocking finding) + queued duplicate review 39066206132. Routing: approve -> /oc test (conflict still blocks merge -> lab rebase); findings -> /oc lab rebase+fold. Then read-only test -> PAT merge.
 - **#627** (Curator PR for #625, head `9ce47b5d`, `Fixes #625`, MERGEABLE/UNSTABLE): review approved round 1 20:25:33Z; read-only test 39066659045 IN FLIGHT since 20:25:38Z. On approve-test -> sweep merge (`Fixes #625`).
 - **#626** (Curator escalation): triage maintainer run 39066491498 STILL IN FLIGHT (since 20:23:15Z); only comment is the `/oc maintainer` trigger. If it concludes without a lab dispatch, next tick dispatches `{"action":"lab","issue":626}` (option (a): drop the SHOWCASE.md refs; `git rm .tmp/random-lab-decision.json`).
 - **#625**: fix via #627; no separate dispatch.
 - **#612/#582**: gated on #614's merge; byte-exact Windows handoff proof = the post-merge native pair on #582, folded back on #612.
 - **#620**: gated on #622. **#552**: owner window ~Oct 23. **#70/#42**: standing boards.
 - **Merged today:** #609 `8ccab113`; #617 `0fe01fd3`; #618 `17e324579`; #613 `c1a27582`; #610 `5b65c701`; #624 `b560ed38`; #623 `d6c809e3`. Main tip `d6c809e3` (ls-remote + API agree).
 - **RULE LABELS:** main = R1-R17, R19, R20, R21 (ranges R1-R21); #614's rebased head now carries the complete R1-R21 set with R18 in position.
 - **Bot-actor red (documented class):** #627 pull_request maintainer run 39066450457 (20:22:43Z) + "does not have write permissions" comment; no dispatch.
 - **Boards/health:** allowlist EXACT 19/19 both directions (maintainer.yml:38 list vs live non-maintainer non-native workflow names); held `action_required` 0 repo-wide; failure sweep last 100 runs: ZERO; pages success 20:23:22Z on `d6c809e3` + preview deploys on new heads; untriaged issues: none.

## IN FLIGHT
 - **#614 REVIEW on `69e1737b` (39066957542 since 20:29:58Z)** -> approve: workflow forwards /oc test -> read-only test -> PAT sweep merge (`Refs #612` stays open); findings: lab.
 - **#622 REVIEW round 3 (39066073234, pre-flip)** -> verdict routing -> rebase/fold -> read-only test -> PAT merge (`Closes #620`).
 - **#627 READ-ONLY TEST (39066659045 since 20:25:38Z)** -> approve-test -> sweep merge (`Fixes #625`); findings -> lab fold.
 - **#626 triage (39066491498)** -> verify lab dispatch after it concludes.
 - **Sibling concurrency (by design):** this run 39066759473 overlapped 39066491498 (#626), 39066206140, and the post-rebase fan-outs (39066967916, 39066973696 pending); last-commit-wins on shared memory files; nothing re-done.
 - STANDING WATCHES: shallow-clone caveat (#602: verify linkage via `gh api compare/main...<branch>` if a merge is skipped); pages verification after every new main tip; wrapper push-rejection noise expected on workflow-touching branches (PAT step lands the branch; admit on-thread, no post-mortem); test-crash rule (retry once; second consecutive silent death -> lab; never a third); bot-actor class; infra routing guard (`.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only, never fix/continue); orphan-main protection before every merge; IP hold (God of War declined; mythic-duel alternative awaiting owner); standing-board close guard (#70/#42 never `Closes`); shipping limit 2 new-project merges/day (not binding); keyless auth + pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder) with `variant: max`.

## NEXT-RUN PLAYBOOK
   1. **#614 (highest priority):** watch review 39066957542 on `69e1737b` -> on approve, the workflow forwards the read-only test -> on its approve-test, the PAT sweep merges (`Refs #612`, issue stays open) -> dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` IN-RUN; on green fold the parity row and assess closing #612 (native byte-exact proof only, never structure alone).
   2. #622: review round 3 -> verdict routing -> lab rebase+fold if blocking -> read-only test -> PAT merge (`Closes #620`).
   3. #627: watch the read-only test -> sweep merge (`Fixes #625`); findings -> lab fold.
   4. #626: verify 39066491498 dispatched lab; else dispatch `{"action":"lab","issue":626}`.
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweep is automatic; investigate any survivor and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the review on `69e1737b` approve the round-6 rebase cleanly, and does the read-only test follow in one pass?
  - Does #622's round-3 review flag the conflict as blocking (likely) or approve the pre-flip head?
  - Does #627's read-only test approve as the first curator sweep merge of the R1-R21 era?
  - Does the #626 triage run dispatch lab before it concludes?

 - Hephaestus, the Maintainer
