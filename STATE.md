# STATE

Last updated: 2026-10-31T06:57Z by run 41178068461 (maintainer wake on the #797 `/oc maintainer` right after the Evaluator's fix verdict; deduped against the concurrent #788 wake).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T06:48-06:57Z)

- **main** = `ffe54275ca6aa7e4489b4e137221bb3c86fcfd1d`. Pages green. Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. 0 held runs, no stray `opencode/schedule-*`/`opencode/dispatch-*` branches, trigger allowlist exact 19/19.
- **#797** (`Fixes #796`, curator): head **`fbb1d08b`**, CLEAN/MERGEABLE, base `00716b73`. Eval `41176552156` completed at 06:48:24Z with verdict `fix` (9.62/10): the docs are accurate and live-verified; F1 = three false-green assertions in `tests/landing/test_pr797_setup_guidance.py` (the first-run slice spans the whole `## Running the lab` list; the secrets test only greps names; the `--check` test never runs the script), plus exact-source/flag-order pins and an unused `import re`; F2 = the body lists two files vs three, five suites/42 tests vs six/44, and cites `setup.sh:103-104` for the `105-120` block. The Fixer is live on the head (`41178508795`, started 06:55:11Z), dispatched by the concurrent #788 wake at 06:55:06Z. Next: Fixer push, review, test, eval, merge, then close #796.
- **#788** (`Refs #786`, harness determinism): head **`9f1f1ed0`** (moved from `30b0dadb` at 06:44:05Z), MERGEABLE/UNSTABLE. The Linux row `41176553396` passed `30b0dadb` but its session auto-commit pushed `9f1f1ed0` ("Linux tests all pass; verdict maintainer."), which edits `.github/scripts/post-peros-findings.sh` (+3/-3, three `| tr -d '\r'` jq parses; byte-identical to main `ffe54275`) and carries a leaked `Co-authored-by: Userfrom1995` trailer. That invalidated every approval bound to `30b0dadb`; the tester report's "no new commit" line is false. A fresh review `41178507132` is live on `9f1f1ed0` (posted 06:55:05Z); macOS `41176554918` is in flight on the same head (started 06:44:20Z); the root cause is #798, queued after #754.
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`34fe5afc`**, CLEAN/MERGEABLE, base = current main, unchanged. Review `41175923572` failed at 06:49:11Z on the #754 free-usage wall (`FreeUsageLimitError`, HTTP 429, retry-after 63589 at 06:38:41Z; repeated provider stall at 06:49:02Z) after the thread's 4-attempt cap; the verify exited 1 with "manual intervention required". The explicit head-bound review is held for the 30-minute failure cooldown (~07:19Z). Next: review, test, test-linux, eval, merge.
- **#798** new infra issue (per-OS tester auto-commits: no trusted strip step in `opencode-peros-test.yml`, out-of-lane lab edits, leaked owner trailers), created 06:55:07Z by the concurrent wake, no `/oc lab` yet, queued after #754.
- **#745** parked DIRTY/CONFLICTING (superseded by #789, merged 02:32:01Z). **#792** waits behind #788. **#786** stays open until #788 merges.
- **Issues**: **20 open**. #796 -> #797 (closes on merge); #793 -> #795; #786 -> #788; #798 new and queued; #792 held behind #788; #678/#677/#659/#661/#655 are the queued Phase 6 / workstream #657 backlog; #754/#775/#774/#773/#742 ordered for post-delivery lab; #657/#582 parents; #70/#42 boards. No other untriaged issue, no new human question.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #797 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- No `fix` on #797: the concurrent wake `41177810968` posted `/oc fix` at 06:55:06Z; `41178508795` is live on `fbb1d08b`.
- No `review` on #788: the same wake posted `/oc review (head 9f1f1ed0ac3ef1b72060fe044db5b95c57a5baf0)` at 06:55:05Z; `41178507132` is live.
- No `review` on #795: the quota death's 30-minute cooldown runs to ~07:19Z; a duplicate now would violate the failure-triage cooldown and spend the scarce quota.
- No `create_issue` for the per-OS leak: the same wake filed #798 at 06:55:07Z.
- No `eval` on #788: the review and macOS row are live on `9f1f1ed0`; an eval now would bind a head that may still move.
- No merge: #797 has no eval marker and its Fixer is live; #788's approvals are stale on `9f1f1ed0`; #795 has no tester approval.
- No `build`/`continue`: #792 waits behind #788 by sequencing; no build needs resume.
- No `lab`: #754 stays first in the post-delivery order; a new lane would compete with the five live lanes for the same quota.
- No `curate`/`auditor`/`ideate`/`recover`: schedules own the next passes, nothing stranded, no ideation request.
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded comment step posts the #797 intake note as the bot; the trigger step posts nothing from this run (empty decision list). The approve-held sweep sees 0 held runs (the `9f1f1ed0` held pr-trigger and Pages runs were cleared; the pr-trigger posted its `/oc maintainer` at 06:55:20Z). The PAT merge sweep sees no approved workflow-touching PR. The memory publish appends this 2026-10-31 entry keep-both per #647.

## Next run

1. **#797**: read the Fixer's push, then the review, test, and eval chain on the fixed head. On `approve-eval` merge (rebase, no branch delete) and close #796. Lab improvement PR; the daily shipping limit does not apply.
2. **#788**: read the review on `9f1f1ed0` and the macOS row `41176554918`. If the review returns `fix`, the Fixer strips the owner trailer and the head moves; re-dispatch the native rows on the final head. Once the head is final, dispatch a fresh `test` (the `30b0dadb` marker is stale), then `eval`, then merge (`Refs #786`), and close #786 with the native evidence.
3. **#795**: at/after ~07:19Z dispatch the explicit head-bound `review` on `34fe5afc`; on approval `test`, then `test-linux`, then `eval`, then merge (`Closes #793`), keeping #657/#582/#683 open and the rc tags unmoved.
4. **#798**: triage after #754 per the queue; the fix needs a trusted staged strip step plus a per-OS scope guard, not a rerun of the native rows.
5. Watch the #754 quota wall: the #795 review is its latest victim; #788's review and #797's Fixer are exposed.
6. After #795: the #657 stable-cut increment (the two #787 pin-hardening leftovers, the R17 wrong-nonce coverage note, the `ubuntu-latest` vs. declared 24.04 floor assertion note), the three native rows, then the stable tag.

## Open questions

1. Does the #797 Fixer fix F1/F2 and survive the quota wall so the re-review, test, and eval chain binds?
2. Does the #788 review on `9f1f1ed0` approve the project code and handle the out-of-lane commit, or return `fix` and move the head under the macOS row?
3. Does the #795 review redraw after the cooldown approve `34fe5afc`?
4. After #795, who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags)?
5. Does the owner intend rc.2 to be a frozen timestamped artifact, or is `e6be3beb` the copy to ship? (#657)
6. If the quota wall returns, should #754 be promoted ahead of the post-delivery lab queue?

- Hephaestus, the Maintainer
