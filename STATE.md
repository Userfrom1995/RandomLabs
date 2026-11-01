# STATE

Last updated: 2026-11-01T02:57Z by run 41265433597 (intake; the Tester's approval marker and the owner's `/oc maintainer` woke me. #795's Linux native row is now dispatched on the tester-settled head).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-11-01T02:49-02:57Z)

- **main** = `f3e28d3d64ec0e8bc992cdb2806fd81fded3b999` (unchanged since 2026-10-31T08:19Z). Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. Pages: last main deploy green on `f3e28d3d`; the new-head previews are held for approval. Trigger allowlist exact 19/19 (every non-maintainer workflow name is listed). No failed or timed-out run since the quota reset; the last failures are the 2026-10-31 #754 quota deaths (22:35Z and earlier).
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`ce39ee5c`** (14 commits, MERGEABLE/UNSTABLE, 0 behind / 14 ahead of `main`). The Tester (`41263749597`) approved at 02:29:43Z after live-verifying clean Ubuntu 24.04, Debian 13, Fedora 40, AlmaLinux 10, and Rocky Linux 10 installs, desktop Xvfb probes, terminal pty sessions, same-NEVRA reinstall/replacepkgs, and removal; the adversarial smoke matrix and 675 site assertions are green. It pushed the test-only suite commit `ce39ee5c` at 02:28:31Z; the machine-published owner marker is at 02:29:47Z, after that push. This run dispatched exactly one Linux native row (`test-linux`) on `ce39ee5c`. Next: read that report. If it passes and the head is unmoved, dispatch the binding `eval`; if it pushes a per-OS commit, first dispatch a fresh `test` on the moved head, then the eval. On `approve-eval` verify the owner marker is bound to the current head, newer than the tester marker and the latest eval trigger, with no newer fix/rejection, then merge (`--rebase`, no branch delete) with `Closes #793`, keeping #657/#582/#683 open and the rc tags unmoved.
- **#788** (`Refs #786`, harness determinism): head **`cb48249d`** (19 commits, MERGEABLE/UNSTABLE, 3 behind / 19 ahead of `main`). The fresh Tester `41262176478` is still in its agent pass since 01:51Z; it pushed the durable suite commit `cb48249d` at 02:15:58Z. The 2026-10-31 approval (`30b0dadb`) is stale by head. Next: on approval dispatch `test-linux` + `test-macos` on the tester-settled head, then the binding eval, then merge (`Refs #786`) and close #786 with the native evidence. The rebase merge handles the 3-commit lag at landing time.
- **Held runs**: exactly the four tester-push runs (Pages preview + PR trigger on `ce39ee5c` and on `cb48249d`); the hardcoded approve sweep clears them.
- **#745** (`Refs #742`): CONFLICTING at `7a04fa4a`, parked.
- **Lab queue**: #754 first (the quota fast-fail), #798 second, #799 third; held until delivery clears under the owner's delivery-first directive. **#792** waits behind #788. **#786** stays open until #788 merges. **#793** closes only when #795 merges.
- **Issues**: 20 open, all triaged. No new human subject or question since 2026-10-31T08:20Z; the newest events are the tester report, the machine marker, and the owner trigger. Curator next schedule tick should recover on fresh quota.

## Decisions this run

`.maintainer/decision.json` = `[{"action": "test-linux", "pr": 795}]`. `.maintainer/comment.md` is the #795 intake note. No `emergency.json`.

- `test-linux` #795: the packaging and docs changed, so the Linux native acceptance must bind the tester-settled head `ce39ee5c`; no per-OS row exists on this PR yet.
- No `eval` on #795 yet: the binding Evaluator gate is sequenced after the native row; the eval must bind the settled head, and the native row can push a per-OS commit.
- No `test` on #795: the Tester just approved; a fresh test would duplicate and could race the native row.
- No `test`/`test-linux`/`test-macos` on #788: its Tester is live and will push; the native rows bind its settled head.
- No merge: #795 has the tester half but no eval marker; #788 has neither a fresh tester approval nor an eval marker.
- No `review`/`fix`/`continue`: no findings, no stalled build, no unapproved review pending.
- No `lab`: delivery-first; #754 is the first post-delivery infra item and the quota must serve the live gates. #798/#799 stay queued behind it.
- No `build`/`research`/`architect`: #792 waits behind #788; no active build.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`/`ping`: schedules own the recurring passes, no request, nothing stranded, no new human question.
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded step posts the Linux native row as the owner and the intake comment as the bot. The approve-held sweep clears the four held tester-push runs. The PAT merge sweep sees no merge-ready PR (no tester-plus-eval pair). The Pages trigger step sees main unchanged. The memory publish appends this entry keep-both per #647.

## Next run

1. **#795 (first)**: read the Linux native report on `ce39ee5c`. If it passes and the head is unmoved, dispatch the binding `eval`; if it pushes a per-OS commit, first dispatch a fresh `test` on the moved head (the tester approval must bind the final head), then the eval. On `approve-eval` verify the owner marker is head-bound, newer than the tester marker and the latest eval trigger, with no newer fix/rejection, then merge (`--rebase`, no branch delete) with `Closes #793`, keeping #657/#582/#683 open and the rc tags unmoved. On a native `fix`, the per-OS workflow forwards the Fixer; do not duplicate.
2. **#788**: read the Tester on `cb48249d`. On approval dispatch `test-linux` + `test-macos` on the tester-settled head, then the binding eval, then merge (`Refs #786`) and close #786 with the native evidence.
3. **#754/#798/#799**: hold the lab lanes until delivery clears; #754 first, #798 second, #799 third. #745 stays parked; #792 starts only after #788 merges.
4. **Watch the quota**: the wall hit ~08:20Z on 2026-10-31 and reset ~00:49Z. If it recurs before the delivery chains finish, #754's fast-fail is the first lab item.
5. **After #795 and #788**: the #657 stable-cut increment (the #787 pin-hardening leftovers, the R17 wrong-nonce coverage note, the `ubuntu-latest` vs declared 24.04 floor note), the remaining native rows, then the stable tag.

## Open questions

1. Does the Linux native row pass `ce39ee5c` without moving the head, so the eval and the merge can bind it in one cycle?
2. Does #788's fresh Tester settle `cb48249d` cleanly and leave a head both native rows can bind?
3. Does the quota hold long enough to finish both delivery chains today?
4. Who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags), and is rc.2 frozen or `e6be3beb` the copy to ship? (#657)
5. Do the maintainer schedule ticks normalize after the 2026-10-31 drop between 22:35Z and 01:27Z, or should that route to lab?

- Hephaestus, the Maintainer
