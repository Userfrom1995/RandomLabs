# STATE

Last updated: 2026-11-01T04:05Z by run 41270670112 (the peros Linux-row failure wake; the #754 quota wall is still active, all heavy dispatches held).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T03:52-04:05Z)

- **Open PRs:** #795 (head `ce39ee5c`, 14 commits, CLEAN/MERGEABLE, Tester approval marker 02:29:47Z binds this head, binding eval pending), #788 (head `cb48249d`, 19 commits, `Refs #786`, NO tester verdict: its Tester died on the wall 03:02-03:22), #745 (owner-PAT env sanitization, CONFLICTING at `7a04fa4a`, parked).
- **The #754 free-usage wall is active and it killed the #795 Linux native row.** `41267213850` ran its agent 02:57:48-03:49:06Z and did ~40 minutes of real verification (clean Ubuntu 24.04/Debian 13/Fedora 40/AlmaLinux 10/Rocky Linux 10 resolving installs, desktop probes, unit suite) before two terminal `FreeUsageLimitError` lines at 03:37:09.772Z and 03:38:59.940Z (HTTP 429, both on delegated `general` subagents). The #653 watchdog then waited the full 600s silence window and retried the same model into the wall; the arm ended red with no decision file and no findings report. Nothing was pushed; head stays `ce39ee5c`. This is the quota class, not a code finding, and the row left no verdict.
- **The reset boundary moved later:** the new `retry-after` samples (75023s at 03:37:09Z, 74913s at 03:38:59Z) both resolve to **2026-11-02T00:27:32Z**, 13m48s later than the **00:13:44Z** computed from the 03:02:06Z/03:12:52Z samples on #788. Per the 2026-10-25 #754 observation the header is a per-bucket estimate, never an authoritative day boundary: treat ~00:27Z as the planning estimate and probe before trusting it.
- **Duplicate wakes:** this run `41270670112`; `41270676325` is pending from the same `workflow_run` fan-out. The earlier failure wake `41268900079` stood down because `41268126000` had covered the #788 tester death. No new human comment or question since 2026-10-31T08:20Z; the newest thread events are the concurrent run's 03:28Z #788 note and #754 ping.
- **Lab queue (owner directive: delivery first):** after delivery, #754 (first, now with three lanes + the subagent pattern + the moving boundary + the post-wall burn), then #798, #799. #792 waits behind #788. #745 stays parked. #786 stays open until #788 merges. #657/#582/#683 stay open.
- **Health:** `main` = `f3e28d3d`, unchanged since 2026-10-31T08:19Z; tags intact (`rc.1` = `11a0037b`, `rc.2` = `e6be3beb`); Pages main deploy `41267504976` green at 03:11:25Z; 0 held runs; trigger allowlist exact 19/19; 20 open issues all triaged; the only failure in the last 60 runs is the peros row above.

## Decisions this run

`.maintainer/decision.json` = two pings (#754, #795). `.maintainer/comment.md` is empty. No `emergency.json`.

- `ping` #754: third-lane recurrence (03:37/03:38), the two `retry-after` values and the moved boundary, the subagent evidence, and the ~12-minute post-wall watchdog burn. The fast-fail must cut on the terminal quota line and surface the provider's `retry-after` verbatim.
- `ping` #795: the Linux row died on quota after ~40 minutes of real verification with no report; head unmoved, Tester approval intact, eval held. Infra death, not a finding.
- Held every heavy dispatch (`test` #788, `test-linux`/`test-macos` #788, `eval` #795/#788, `lab`): the wall is active and heavy lanes burn 40+ minutes before dying; feeding it is the #754 anti-pattern.
- No `fix` (infra death, no finding), no merge (no `approve-eval` on either PR), no `review`/`continue`/`build`/`research`/`architect`/`curate`/`auditor`/`ideate`/`recover`/`create_*` (no findings, nothing stalled, #792 waits behind #788, schedules own the recurring passes, nothing stranded), no `emergency` (the Lab Engineer lane is healthy; production is blocked by the provider, not a repo defect).

## Next run (estimate 2026-11-02T00:27:32Z; probe before trusting)

1. **Probe, do not assume.** Read the newest agent-run logs for a terminal `FreeUsageLimitError` after the boundary. If one appears, hold again and log; the header is an estimate (2026-10-25 #754 note).
2. **#795 first** (one gate from merge): if the head is still `ce39ee5c` and no wall line appears, dispatch the binding `eval` #795. On `approve-eval`: verify the owner-authored marker is head-bound, newer than the Tester approval and the latest eval trigger, no newer fix/rejection, then `gh pr merge --rebase` (fallback `--merge`), never delete the branch, `Closes #793`, keep #657/#582/#683 open, rc tags unmoved. If the head moved, re-test first.
3. **Then #788:** re-dispatch `test` on `cb48249d`, then `test-linux` + `test-macos` on the tester-settled head, then the binding eval, then merge (`Refs #786`), then close #786 with the native evidence.
4. Optional re-run of the #795 Linux row after the eval if the native gate is still wanted; the evaluation is the merge gate, the row is evidence. If the eval passes but the row never runs, note it in the merge record.
5. **Lab queue after delivery:** #754 first, #798 second, #799 third. #792 after #788; #745 parked.

## Open questions

1. Why does the reset boundary move (00:13:44Z -> 00:27:32Z)? A rolling window would explain it; per the 10-25 #754 observation, the detector should not compute a park horizon at all, just fail fast and let a fresh run try.
2. Will a fresh heavy lane at ~00:27Z get served long enough to finish #795's eval (~40-70 minutes of allowance observed today)?
3. Does the Linux row's ~40 minutes of work leave usable evidence? No report was written, so no; the run log is the only record.
4. Is the Linux arm's lack of an incremental/salvage contract (only macOS and Windows have it per issue #692) worth a lab item? The 90/120 headroom was the design reason; today's 51-minute death lost the report but stayed inside the cap. Not opening an issue now (delivery-first); noted for later.

- Hephaestus, the Maintainer
