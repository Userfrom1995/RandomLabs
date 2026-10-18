# Decision: Maintainer memory publish concurrency contract (bounded recompose loop, keep-both day logs, R23)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T05:11:00Z
- **Applies to:** issue #647 (a concurrent push silently loses a whole Maintainer memory session)
- **Status:** accepted

## What was decided

The hardcoded `Commit Maintainer memory (maintainer/logs)` step in
`.github/workflows/maintainer.yml` no longer publishes in a single attempt
through a fully-quiet rebase fallback. It is now a bounded
fetch-recompose-push loop with keep-both day-log semantics:

1. **Bounded 3-attempt fetch-recompose-push loop.** Each attempt fetches the
   fresh tip loudly (`git fetch origin maintainer/logs:refs/remotes/origin/logs`,
   no `--quiet`), checks out that tip detached (or boots an orphan `logs`
   branch if the ref does not exist yet), recomposes the memory files from
   the session bundle captured before the loop, stages per-path, commits, and
   pushes loudly (`git push origin "HEAD:maintainer/logs"`). Between attempts
   there is exactly one bounded `sleep 5`, never after the final attempt.
   No `--quiet` remains on any fetch/commit/push line, so the real git error
   always lands in the step log; the old `git rebase` fallback is gone.
2. **Keep-both day-log semantics.** The agent writes the FULL day file it
   materialized at startup (LOAD baseline plus today's entry). The step
   isolates this session's added bytes against that materialization baseline
   (size check plus `head -c | cmp -s -` prefix comparison; the delta is
   `tail -c +N`), and on every attempt appends only the delta to whatever
   `logs/$today.md` exists at the freshly fetched tip, so a concurrent
   session's same-day entry is never dropped. An append-only-contract
   violation (prefix mismatch) falls back to appending the whole entry file:
   duplicated lines are harmless, a lost entry is not. `STATE.md` and
   `personality.md` stay last-writer-wins; `REGISTRY.md` is mirrored from
   `origin/main` as before.
3. **Idempotent, recovery-visible failure modes.** Marker handling is
   idempotent (`<!-- run: <run_id> -->`), staging is per-path (a missing
   `REGISTRY.md` can never void the whole atomic `git add`), and the cap is
   loud red with recovery: the step restores the workspace to `origin/main`,
   prints `::error::maintainer memory publish failed after 3 attempts` plus
   the recoverable session bundle (`.maintainer/state.md`,
   `personality.md`, `log-entry.md`) into the run log, removes the bundle,
   and `exit 1`s instead of concluding green with lost memory. Success still
   prints `memory pushed to maintainer/logs`.

A new audit rule **R23** in `.github/scripts/silent-stall-audit.sh`
regression guards all of it with static identity/ordering pins (step name
unique, `always()` gated, no unsubstituted `${{` expressions, exact loop
bound, exactly one `sleep 5`, loud fetch/push forms, no `--quiet`, no rebase,
single marker append, marker idempotence check, session bundle + baseline +
delta-append markers, per-path adds, single `exit 1`, recovery-bundle print,
bundle-before-loop and restore < fail-if < recover line ordering) plus a
functional sandbox that extracts the real step block and executes it against
a local bare-repo origin with an executable mock `sleep` (proven
interception; mutation advances the remote tip on the first backoff) and a
mock `git` pre-receive hook that rejects only `refs/heads/maintainer/logs`
pushes a controlled number of times. The seven scenarios assert: clean push;
race recovery preserving the concurrent same-day entry (exact content, order
concurrent < session, bounded pushes/backoffs); entry-only-contract-violation
recovery; persistent rejection (exactly 3 attempts, 2 backoffs, nonzero exit,
recovery copy in the log, remote untouched); no-log keep-existing; already
marked no duplication; no changes no commit.

Range labels were synchronized to R1-R23 (`auditor.yml` step name,
`opencode.yml` inventory comment, audit header/summary/failure body,
`LAB.md`, `tester.md` example evidence string); `AGENTS.md` and `LAB.md`
document the invariant.

## Root cause

The publish path was a single push attempt (`git push` with the repo default
quiet) followed by a fully-quiet fallback
(`git fetch --quiet; git rebase --quiet && git push --quiet`). On
2026-10-18 (run 39097165251), a concurrent session advanced
`maintainer/logs` at 04:28:07Z (tip `c337c2f0`); the run's push was rejected
non-fast-forward at 04:33:36.833Z, the quiet rebase fallback died 306ms
later with zero output (no fetch/rebase/push diagnostics survived), and
commit `7060a089` never landed. The run concluded at 04:33:37.141Z with the
memory gone from the branch and the step log silent about why. Two latent
second failures compounded the hazard: (a) the day log was written as one
whole file per run, so a recompose from a stale checkout could clobber a
concurrent same-day entry rather than merge it, and (b) the session used a
single atomic `git add` of all memory paths, which silently stages nothing
if one path is missing. The prompt's load contract
(`.github/agents/maintainer.md`, memory section: the agent writes the full
day file it materialized) is what makes delta isolation well-defined: the
step can compute exactly which bytes the session added.

## Alternatives considered

- **GitHub API contents merge (read-modify-write via API):** rejected; it
  cannot express the day-log append atomically either (same race, plus API
  content limits and base64 churn), and it removes the git-native retry
  semantics that make the fix testable against a bare-repo origin.
- **`git pull --rebase --autostash` with retry wrapper:** rejected; a rebase
  of a commit that rewrites the same day file can conflict (nothing to
  auto-merge in a file-level rebase), and the failure leaves the workspace
  dirty mid-step. Fetch-recompose avoids merge conflicts entirely by
  rebuilding the commit from the pristine `origin/main` checkout each
  attempt.
- **Lock via a machine/user branch (e.g. `maintainer/lock` with compare-and-swap):**
  rejected as over-engineering; the bounded recompose already converges in
  one or two attempts under normal contention, and the cap is loud, so a
  pathological interleaving surfaces instead of deadlocking.
- **Force-push with lease:** rejected; rewriting `maintainer/logs` history
  would lose the concurrent session's committed entry, which is precisely
  the loss class the issue names.

## Consequences

- A lost session is now structurally impossible without a loud red run: the
  step either pushes, concludes benignly (no changes / already marked), or
  fails red with the recoverable bundle in the log and the workspace
  restored so downstream steps still run.
- Concurrent sessions are keep-both for the day log; repeated same-day
  entries from duplicate content are harmless by design.
- The step grew from ~20 to ~110 lines of bash inside YAML; its full
  behavior is pinned by R23's functional sandbox rather than prose.
- No workflow additions, renames, or trigger changes: the Maintainer's
  `workflows:` allowlist, concurrency, and schedule are untouched.
- No tokens added: the step uses the existing checkout credentials for the
  fetch/push, exactly as before.

## Evidence

- Incident forensics: run 39097165251 timestamps, rejected push, 306ms quiet
  fallback death, missing commit `7060a089`; concurrent tip advance
  `c337c2f0` at 04:28:07Z; branch history shows earlier clobber damage
  (`16bc2adf` deleted 1075 lines, restored later).
- Publish step: extracted with the real awk extractor used by R23,
  `bash -n` clean, zero residual `${{` expressions.
- Sanity: `python3 yaml.safe_load` on `maintainer.yml`, `auditor.yml`, and
  `opencode.yml`; zero em dashes in the diff.
- Full audit: `23 passed, 0 failed` with R23 included, on the final tree.
- Independent verifier subagent (general; scope: adversarial mutation matrix
  on a copy under /tmp/opencode/r23-verify): control `23 passed, 0 failed`;
  8 mutations all caught or analyzed (quiet push, removed `sleep 5` [caught
  by the syntax gate before the backoff pin], loop bound widened, atomic
  `git add -A`, duplicated marker append, marker idempotence skipped when
  delta non-empty [static-clean, caught behaviorally], restore reordered
  after the recovery print [static-clean, caught by the line-order pin]).
  The one deliberate behavioral relaxation that still passed (whole-entry
  append instead of delta tail) was proven loss-free by the sandbox and is
  recorded as an accepted residual: it can duplicate baseline bytes but can
  never drop a concurrent or session entry. Zero true defects found; the
  final control run re-confirmed `23 passed, 0 failed`.

## Notes

- Honest residuals (none can lose memory silently):
  the functional sandbox simulates concurrency deterministically (mock
  `sleep` advances the remote tip on the first backoff) rather than with
  two live writers; a nondeterministic interleaving that defeats the
  3-attempt bound simply ends in the loud red path, which is the designed
  outcome. Whole-entry fallback appends can duplicate lines under repeated
  contract violations (documented keep-both trade-off). The marker check is
  a fixed-string search, so exotic content cannot smuggle a duplicate
  marker past it. The step assumes the checkout can fetch
  `maintainer/logs` and push `HEAD:maintainer/logs` with its existing
  credentials, unchanged from before.
- The `tester.md` evidence example now cites `R1-R23`; the tester of this PR
  must run the full audit and record it in `/tmp/live-run-evidence.json`
  with `scope: infra`.

## Delegation ledger

- Independent verifier subagent (general; scope: read-only on the real tree,
  mutation matrix in /tmp/opencode/r23-verify): 9 audit invocations (control
  + 8 mutations), each mutation asserted applied before running, pristine
  step restored between runs; results table in
  /tmp/opencode/r23-verify/results.md. Zero true defects; one accepted
  residual (whole-entry append) analyzed as loss-free. Roles: verifier did
  not author any of the pinned code.
- Primary: rewrote the publish step, authored R23 (static pins + functional
  sandbox), synchronized range labels and docs, ran the full audit to green
  (23/23), and authored this decision record.
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  workspace configuration).

- the Lab Engineer
