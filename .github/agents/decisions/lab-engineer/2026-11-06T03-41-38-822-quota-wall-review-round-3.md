# Decision: #820 quota-wall recovery follow-up, review round 3 (PR #822)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-06T03:41:38Z
- **Applies to:** PR #822 / issues #820 and #775
- **Status:** accepted

## What was decided

Review round 3 rejected head `bb40eaba` with two blocking findings:

- B1: the R9 token ban `/(oc|opencode)([^A-Za-z0-9_-]|$)` required a
  non-word character AFTER the token, so a note carrying ` /oc-maintainer`
  or ` /ocfoo` passed. The curator pin also stopped at the body's closing
  quote (`)"`), so a trigger appended after the quote passed both the
  exact-body check and the token check.
- B2: the intake detector's claimed transcript negative fixture did not
  exist, and the fixture set could not distinguish the runner's own
  rendered `##[error]` line from a transcript that quotes it.

Both are fixed. B1 mirrors the general lane's own wake shape
(`(^|[[:space:]])/(oc|opencode)`, the four `contains`/`startsWith` lines in
`opencode.yml`), pins the FULL trimmed curator comment line (closing quote
and `|| true` included), and asserts the specific failing tag in each R9
self-test. B2 reads the triggering run's CHECK-RUN ANNOTATIONS through the
checks API instead of the job log, and adds a real transcript fixture plus a
behavioral mutant that swaps the detector back to the log path.

## Scope corrections

- Issue #820 lists four proposals; this PR implements the two technical ones
  (1, bounded fresh-run recovery, and 2, wall-aware intake) and does NOT
  implement 3 (an owner capacity decision) or 4 (the immediate manual
  unblock). The PR body now says so instead of claiming "both" proposals.
- Issue #775 proposals 1 (post the trigger as a separate first-line comment)
  and 2 (tighten the general gate to a line-anchored match) were NOT
  implemented. The chosen fix is strictly stronger for the machine path that
  #775 reported: every machine escalation note is now token-free, so it can
  never wake the General arm at all. The general gate's pre-existing
  mid-body match for human prose is unchanged and remains the behavior #775
  proposal 2 would alter; that is deliberately out of scope here.

## Changes

- `maintainer.yml` permissions: `checks: read`.
- Intake: enumerate the failed run's jobs
  (`actions/runs/<id>/jobs --paginate --jq '.jobs[].id'`), read each job's
  `check-runs/<id>/annotations --paginate --jq '.[].message'`, tolerate a
  per-job API failure, and match only an annotation whose message starts
  with the canonical `provider daily free-usage limit reached ...
  (FreeUsageLimitError, issue #754)` phrase. The read is wrapped in a
  pipefail-off subshell (SIGPIPE guard). The job log is never read. The
  dedupe read now accepts only bot-authored comments
  (`select(.user.login == "github-actions[bot]")`), matching the
  bot-only dedupe rule R34 requires.
- Recovery hardening (non-blocking review items): exact marker content
  `provider-daily-free-usage-wall`; the agent step outcome must be
  `failure` (`AGENT_OUTCOME`); an out-of-range `quota_recovery` input is
  clamped to the cap (never reset to 0); a manual re-run
  (`github.run_attempt > 1`) dispatches nothing; jitter is 30-60 seconds
  inclusive (`(RANDOM % 31) + 30`).
- R9: gate-shaped regex, full-line curator pin, new ` /oc-maintainer` and
  ` /ocfoo` self-heal/curator mutants, and specific-tag assertions so a
  wrong failure tag cannot pass.
- R34: static pins for the jobs/annotations pipeline, the anchored regex
  (escaped close paren included), the pipefail guard, the bot-author
  dedupe, `checks: read`, the `AGENT_OUTCOME` binding, and the marker,
  outcome, clamp, rerun, and jitter guards; mock `gh` jobs/annotations
  routes; fixtures `ann-wall`, `ann-warning`, `ann-provider`, `ann-none`,
  and `log-transcript` (rendered annotation plus ANSI source echo plus raw
  provider line); behavioral cases for transcript/source/provider
  negatives, spoofed dedupe, and every attempt input; mutants for the log
  detector swap, the provider-phrase detector, the clamp, the marker
  check, and the outcome check.
- R26: the pre-handler manifest was regenerated for the edited steps and
  passes.
- Docs: `AGENTS.md` and `LAB.md` now describe the annotations API, the
  `checks: read` grant, the transcript negative fixture, the recovery
  guards, and the 30-60 second jitter; `.github/agents/tester.md` cites
  `R1`-`R34`.
- R30: because `tester.md` is a SHA-256-pinned prompt, its one-line audit
  reference refresh required the expected-hash pin to move with it
  (`0c1cb7fe...` to `15c92427...`). This is a documentation-only prompt
  change; the staging body pin and the staged-prompt reachability checks are
  unchanged.

## Delegation ledger

- general (independent diff review, round 3): returned no blocking findings
  and two nits (a manual re-run of a cap recovery run re-posts the
  escalation note while staying red; the documented marker-trust residual);
  verified the annotations endpoints, the outcome/clamp/rerun logic, the R9
  regex and pins, the R34 needles/fixtures/mutants, and the doc consistency.
- Primary: performed every edit and read the changed regions directly;
  ran the syntax, YAML, and full audit verification.
- Skills: no skill fits because this round edits workflow YAML, shell audit
  rules, and docs, not opencode configuration.

## Verification

- `bash -n .github/scripts/silent-stall-audit.sh`: clean.
- `yaml.safe_load` on `maintainer.yml`, `curator.yml`, and `opencode.yml`:
  OK.
- `env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh
  .github/workflows/opencode.yml`: 34 passed, 0 failed (R9, R26, R30, and
  R34 included) after the tester-prompt pin refresh.
- Checks API evidence: the failed wall runs 41796370639, 41889667166, and
  41933093526 expose the exact canonical annotation message on their
  agent-step check run; successful run 41991790055 exposes none; the
  `actions/runs/<id>/jobs` id equals the `check-runs/<id>` id on live data.
- Diff review: no em dashes in any changed file.

## Residuals

- Marker trust: the agent shares the workspace, so an exactly-contented
  marker plus a failed agent outcome is bounded defense in depth, not an
  execution-isolation boundary. A failing session that planted the exact
  marker could still request up to two dispatches, which the recovery cap
  then bounds.
- A manual re-run of a cap recovery run re-enters the cap branch and posts
  the escalation note again; it dispatches nothing and stays red, so this
  is accepted as cosmetic.
- `silent-stall-audit.sh` exits 0 even when rules fail (it posts a
  lab-health comment instead); pre-existing and out of scope here.

- the Lab Engineer
