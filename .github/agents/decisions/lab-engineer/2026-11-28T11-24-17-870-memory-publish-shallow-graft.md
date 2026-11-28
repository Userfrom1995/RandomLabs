# Decision: Memory publish survives a shallow graft (issue #870)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-28T11:24:17Z
- **Applies to:** issue #870, maintainer memory publish step
- **Status:** accepted

## What was decided

1. **Restore full history before the publish loop.** If
   `git rev-parse --is-shallow-repository` reports `true`, the step runs
   `git fetch origin --unshallow` and warns loudly if that fails. This mirrors
   the issue #602 guard on the PAT merge sweep (a shallow check plus an
   unshallow before ancestry-dependent work).
2. **Force the private publish ref.** The in-loop fetch is now
   `git fetch --force origin +refs/heads/maintainer/logs:refs/remotes/origin/logs`,
   so a lingering graft or a non-fast-forward private-ref update can never
   block the fetch that feeds recomposition. The private ref is not a user
   branch and is rebuilt from the remote on every attempt.
3. **Probe the remote ref on a failed fetch.** A failed fetch is no longer
   treated as proof that `maintainer/logs` is absent. The step runs
   `git ls-remote --exit-code origin refs/heads/maintainer/logs`: exit 0 (or
   any probe failure) retries the real tip and skips composition; only exit 2
   (no matching ref) takes the orphan-bootstrap path. This prevents a shallow
   or network-rejected fetch from manufacturing an unrelated root.
4. **Move the bounded backoff to the top of the loop.** Attempts 2 and 3 sleep
   5 seconds before fetching; there is no sleep after the final attempt. The
   attempt count and total backoff are unchanged (3 attempts, 2 sleeps).
5. **Pin the incident shape in R23.** A new shallow fixture loads the older
   tip into `refs/remotes/origin/logs`, advances the remote to a concurrent
   commit, then depth-fetches that commit, which creates the shallow boundary
   behind the loaded ref. Scenario 11 fails the first publish fetch through
   the existing git shim (which now delegates `--unshallow` to real git) and
   asserts recovery on attempt 2 with both the concurrent entry and the
   session preserved. A legacy mutant without the shallow restore and forced
   refspec must fail the same fixture, proving the regression is load-bearing.
6. **Add a prompt guard.** The Maintainer prompt now tells the agent to fetch
   `maintainer/logs` with full history and never to use `--depth` or any
   shallow option when inspecting it. The hardcoded step repairs the state,
   but the prompt should not create it.

## Why not the alternatives

- **Trust the agent to avoid depth fetches:** rejected. The agent may run
  arbitrary read-only git commands while diagnosing; a prompt rule alone has
  no enforcement, and the failure is silent (the publish retries the same
  rejected fetch three times).
- **Retry the unforced fetch:** rejected. The shallow boundary makes the
  fetched tip an ancestor-walk stop, so the update is rejected on every
  attempt; retrying without changing the refspec or the shallow state cannot
  recover.
- **Bootstrap on any fetch failure:** rejected. That is the pre-existing
  behavior that turns a transient fetch rejection into an orphan root, and it
  loses the real memory history.
- **Run `--unshallow` inside every attempt:** rejected. It repeats a
  potentially expensive full-history fetch on each retry and still leaves the
  unforced update failure mode; the one pre-loop restore plus the forced
  refspec is the minimal closure.
- **Use `git fetch --depth=2147483647` or `--shallow-since`:** rejected.
  Those deepen or bound history instead of removing the shallow boundary, and
  they keep the graft semantics that caused the rejection.

## Evidence

- Local reproduction in `/tmp/shallowtest4`: the incident shape rejects an
  unforced `git fetch origin maintainer/logs:refs/remotes/origin/logs` with
  `! [rejected] maintainer/logs -> origin/logs (non-fast-forward)`; both
  `--force` and `--unshallow` recover, and `--unshallow` restores
  `is-shallow-repository=false`.
- The R23 sandbox executes the real extracted step under `bash -e` with the
  shim failing the first publish fetch. Scenario 11 passes (rc 0, shallow
  warning, attempt 2, rejected-fetch retry message, concurrent and session
  entries kept, one marker, state applied, green implies pushed). The legacy
  mutant fails red with the remote tip unchanged.
- Full audit: 38 passed, 0 failed, including R23 and the R26 pre-handler
  manifest regenerated from the extractor.
- `bash -n` on the extracted run block and the audit script is clean; the
  workflow YAML parses with `yaml.safe_load`.

## Notes

- The load step's unforced fetch is intentionally unchanged: it runs in a
  fresh full-depth checkout before the agent, and forcing it would not add
  safety there. The publish step is the only writer.
- Delegation ledger (this round): `general` (shallow-graft reproduction)
  re-derived the incident in /tmp and confirmed the unforced rejection, the
  forced-fetch recovery, the unshallow restore, and the ls-remote 0/2 exits;
  `general` (R23 scenario audit) inspected scenario 11 and the legacy mutant
  and ran the full audit (38 passed, 0 failed); `explore` (prompt/docs parity)
  confirmed the prompt, docs, and this note match the code and flagged the
  accuracy claims corrected here; the primary read the full diff of all six
  changed files and re-ran the full audit after the edits (38 passed, 0
  failed).
- Skills: no skill fits; the `customize-opencode` skill covers `opencode.json`,
  `.opencode/`, and opencode config internals, not lab workflow, audit, prompt,
  or documentation edits.
- the Lab Engineer
