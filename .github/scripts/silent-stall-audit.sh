#!/usr/bin/env bash
#
# silent-stall-audit.sh - Static regression checks for the issue #122 silent-stall
# hardening invariants (S1/S2/L1/L2), the R6 model free-tier guard, the R7
# review-restore ownership guard (PR #412 head rewind), the R8 vendored
# hardened runner guard, the R9 schedule/dispatch retry-parity guard
# (issue #422), the R10 PAT-step input-indirection guard, the R11
# post-agent PAT gate guard (both issue #422 residual hardening), the
# R12 actor-write gate guard (issue #428, extended by issue #696 to cover
# the maintainer inline runner and its clean-skip lane), the R13 bot-created
# triage parity guard (issue #450), the R14 heterogeneous-group queue-preservation
# guard (per-OS arms issue #594 plus the whole comment-triggered cohort issue
# #601), the R15 model fallback ladder guard (issue #591:
# provider model retirement / loud Model-not-found failure; extended by
# issue #620: transient provider FreeTierError rejection / bounded
# same-model retry; and by issue #653: transient provider 429/5xx terminal
# deaths / bounded same-model retry plus the provider-stall inactivity
# watchdog; the maintainer runner's only allowed step conditional is
# the shared actor-write gate, issue #696), the R16 shallow-workspace PAT merge guard (issue #602:
# a depth-limited opencode CLI
# session fetch re-shallows the Maintainer checkout, and merge-base-dependent
# merge checks then fail closed and silently skip a linked workflow PR), the
# R17 per-OS findings-report contract guard (issue #608: a PR-creating
# per-OS arm run turns the session's final message into the PR body and
# silently drops the findings report; issue #612 follow-up: the Windows arm's
# CRLF-translated re-fetch tripped the exact-body gate after the report had
# already posted, because Git Bash translates command-substituted line
# endings, so CR bytes are now normalized on both sides and an LF-normalized
# copy is posted). R17 is hybrid: static checks assert the
# three arms wire the shared poster with the exact gate lines, token envs, and
# a clean post run body, and a functional test executes the real poster against
# an executable mock `gh` (interception asserted, credentials scrubbed, live
# non-credential Actions env set realistically, sandbox outside the repo per
# delegation.md section 6) so wrong-author, unsigned, missing-report,
# tampered-body, post-failure, and missing-comment-id paths must all fail
# closed for all three OS labels, while CRLF report / CRLF re-fetch fixtures
# must verify green with a byte-exact LF-normalized posted body; only the
# verify-step run body and exotic
# sandbox-path fingerprinting remain review-gated boundaries (documented in
# the R17 comment), the R18 Windows MSYS argv-conversion guard (issue #612:
# Git Bash on the windows-latest arm rewrote a slash-leading "/oc" handoff
# body into a mangled "C:/Program Files/Git/..." path before gh saw it, so
# slash-leading argv bodies now require an MSYS conversion opt-out or a
# stdin transport), the R19 review-comment publication-evidence guard
# (issues #616, #637: a reviewer death between the decision-file write and
# the comment post forwarded an unread verdict with zero published findings,
# and a healthy session whose final message was not the signed decision
# comment lost its verdict without the bounded auto-retry),
# the R20 paginated comment-read guard (issue #621: unbounded comment
# enumerations read only the oldest 30 comments, so a retry cap on a busy
# thread reads 0 and a crash loop re-posts retry 1 forever), and the R21
# PAT merge approval-binding guard (issue #619: the sweep's unanchored
# contains() approval match merged an unreviewed workflow-touching PR off a
# Maintainer summary that merely quoted the tester marker, and the same run
# skipped the genuinely approved lane as mergeable=UNKNOWN), and the R22
# tester verdict-publication guard (issue #629: a prose-first tester verdict
# comment never matched R21's entire-first-line anchor and silently stalled
# the sweep, so tester maintainer decisions now require positive publication
# evidence and the workflow publishes the canonical bot-authored marker
# itself from the evidence-gated machine handoff), and the R23 maintainer
# memory-publish concurrency guard (issue #647: a single-shot fully-quiet
# rebase fallback lost a whole memory session to a concurrent push; the
# publish path is now a bounded 3-attempt fetch-recompose-push loop with
# keep-both day-log semantics, loud diagnostics, and a loud red give-up that
# prints the recoverable bundle, enforced by a functional sandbox executing
# the real step against a local bare-repo origin with injected push
# rejections and concurrent tip advance; its always() gate now also carries
# the shared actor-write gate so a denied trigger actor pushes nothing,
# issue #696), and the R24 per-OS arm cap-headroom
# and partial-report salvage guard (issue #692: the macOS arm died at its
# 90-minute agent-step cap with zero artifacts and no partial report
# survived, so every arm's agent cap must leave real headroom under its job
# cap and the macOS/Windows arms must salvage a signed partial report through
# the strict shared poster behind a provenance banner while the fail-closed
# verify still concludes the run red), and the R25 lab/fix agent cap-headroom
# guard (issue #701: after the per-OS arms were fixed, the lab arm's
# 90-minute cap under a 120-minute job killed lab rounds 18 on #654 and 14 on
# #670, and the fix arm's 60-minute cap under a 120-minute job killed three
# consecutive fix sessions on #693, all with no decision file and nothing
# pushed, so the lab arm now runs 150 minutes under a 180-minute job and the
# fix arm 120 under 180, each leaving at least 20 minutes of post-agent
# headroom for the verify/push/forward chain), and the R26 create-issue dedupe
# guard (issue #668: two concurrent per-target Maintainer ticks independently filed
# the same finding as #665/#666 because the hardcoded create_issue handler
# never compared titles; it now queries open issues before `gh issue create`,
# skips creation on an identical normalized title and self-triages the
# matched issue, and fails open loudly when the query fails).
# Wired into auditor.yml as the R1-R26 matrix.
#
# Usage: silent-stall-audit.sh <path-to-opencode.yml> [health-issue-number]
# R1-R6 are scoped to <path-to-opencode.yml>; R7-R26 audit the whole tree
# (the review-restore guard, the vendored runner, every schedule/dispatch
# agent arm, dispatch-input indirection, the lab post-agent PAT gates, the
# shared actor-write gate, the per-OS arm queue plus the comment-triggered
# group cohort, the model fallback
# ladder, the PAT merge shallow-workspace guard, the Windows MSYS
# argv-conversion guard, the per-OS findings-report contract, the
# review-comment publication-evidence guard, the paginated
# comment-read guard, the PAT merge approval binding, the tester
# verdict publication contract, the maintainer memory publish
# concurrency contract, the lab/fix agent cap-headroom contract, and the
# create-issue dedupe guard), so they trip on a
# bad curator.yml/auditor.yml/ideate.yml/lab.yml/maintainer.yml/peros arm no
# matter which file the audit was pointed at.
# Exit code is always 0 so it never breaks the auditor run; failures are reported
# on stdout and (when a health issue number is supplied and GITHUB_TOKEN is set)
# posted as a comment to the lab-health board.

set -u

# R26 audit-start checkout snapshot (review findings F22/F24): the R26
# static scan below reads the repo root AFTER earlier rules have run, so a
# repo-root shadow that unlinks itself on import (a self-deleting sourceless
# re.pyc, present at checkout and gone by the time the scan runs) would
# escape the live scan while the audit stayed green (25 passed, 0 failed).
# The R18 helper, whose non-isolated Python was the demonstrated consumer,
# now runs isolated (python3 -I -), but the snapshot stays as defense in
# depth: snapshot the importable-shape test for every watched module BEFORE
# any rule executes and OR the snapshot into the R26 scan, so a shadow that
# removes itself for any reason still fails the audit loudly.
R26_WATCH_MODULES="json os re subprocess time sys sitecustomize usercustomize"
R26_EARLY_SHADOWS=""
r26_shadow_present() {
  [ -f "$1/$2.py" ] || [ -f "$1/$2.pyc" ] || [ -f "$1/$2.so" ] || [ -f "$1/$2.pyd" ] \
    || compgen -G "$1/$2.*.so" >/dev/null 2>&1 \
    || compgen -G "$1/$2.*.pyd" >/dev/null 2>&1 \
    || { [ -d "$1/$2" ] && compgen -G "$1/$2/__init__.*" >/dev/null 2>&1; }
}
R26_EARLY_ROOT=$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)
if [ -n "$R26_EARLY_ROOT" ]; then
  for r26_mod in $R26_WATCH_MODULES; do
    if r26_shadow_present "$R26_EARLY_ROOT" "$r26_mod"; then
      R26_EARLY_SHADOWS="${R26_EARLY_SHADOWS} ${r26_mod}"
    fi
  done
fi

WF="${1:-.github/workflows/opencode.yml}"
HEALTH_ISSUE="${2:-}"
REPO="${GITHUB_REPOSITORY:-}"

pass=0
fail=0
report=""

# Bare-filename invocation (silent-stall-audit.sh opencode.yml) resolves to the
# real workflow, so R7's sibling lookup below finds opencode-review.yml too
# instead of false-failing on a path that never existed.
if [ ! -f "$WF" ] && [ -f ".github/workflows/$WF" ]; then
  WF=".github/workflows/$WF"
fi

check() {
  local name="$1" desc="$2" ok="$3"
  if [ "$ok" = "ok" ]; then
    pass=$((pass + 1))
    report="${report}
  [R1-R26 PASS] $name: $desc"
    echo "PASS  $name: $desc"
  else
    fail=$((fail + 1))
    report="${report}
  [R1-R26 FAIL] $name: $desc"
    echo "FAIL  $name: $desc"
  fi
}

if [ ! -f "$WF" ]; then
  echo "::error::opencode.yml not found at $WF"
  exit 0
fi

# [R1] Concurrency assertion, scoped to the file under audit ($WF): NO
# concurrency group IN THAT FILE may cancel in progress. This rule scans one
# file and claims nothing repo-wide; the deliberate superseding-only
# workflows (pages.yml deploys, tor-cli.yml CI) are named in AGENTS.md
# "Queued Execution" (ideate.yml queued with cancel-in-progress: false).
# Failures below therefore name the file they were found in.
cancel_true=$(grep -nE 'cancel-in-progress:\s*true' "$WF" || true)
if [ -z "$cancel_true" ]; then
  check "R1" "scan scope ${WF} only: no concurrency group sets cancel-in-progress: true (S2 non-cancellation)" "ok"
else
  check "R1" "scan scope ${WF}: cancel-in-progress: true found -> ${cancel_true} (violates S2)" "bad"
fi

# [R2] Self-heal cap: bounded K (must be a finite numeric cap, currently 2).
# Assert a bounded comparison AND a maintainer escalation branch exist.
heal_cap=$(grep -nE '\$heals"\s*-(lt|le)\s*[0-9]+' "$WF" || true)
heal_escalate=$(grep -nE '/oc maintainer' "$WF" | head -1 || true)
if [ -n "$heal_cap" ] && [ -n "$heal_escalate" ]; then
  check "R2" "bounded self-heal cap present (${heal_cap%:*}) with maintainer escalation (L1)" "ok"
else
  check "R2" "missing bounded self-heal cap or escalation branch (violates L1)" "bad"
fi

# [R3] No-fallback-to-zero: unreadable counter must escalate, never set heals=0.
# Assert the unreadable-counter branch posts /oc maintainer and that there is no
# assignment `heals=0` anywhere.
unreadable_escalate=$(grep -nE 'Could not enumerate prior auto-heals' "$WF" || true)
heals_zero=$(grep -nE 'heals=0' "$WF" || true)
if [ -n "$unreadable_escalate" ] && [ -z "$heals_zero" ]; then
  check "R3" "unreadable counter escalates to /oc maintainer; no heals=0 fallback (phantom-zero guard)" "ok"
else
  check "R3" "unreadable-counter escalation missing or heals=0 fallback present (violates R3)" "bad"
fi

# [R4] Mutual exclusion: self-heal step shares the verify-retry guard.
guard=$(grep -nE "steps\.verify\.outputs\.retry != 'true'" "$WF" || true)
if [ -n "$guard" ]; then
  check "R4" "self-heal/verify mutual-exclusion guard present (${guard%:*}) (L2)" "ok"
else
  check "R4" "missing steps.verify.outputs.retry != 'true' guard (violates L2)" "bad"
fi

# [R5] Decision-file fallback: missing decision file must route to /oc maintainer.
no_file=$(grep -nE 'No decision file found' "$WF" || true)
if [ -n "$no_file" ]; then
  check "R5" "missing decision file falls back to /oc maintainer (no stall) (${no_file%:*})" "ok"
else
  check "R5" "missing decision-file fallback to /oc maintainer not found (violates R5)" "bad"
fi

# [R6] Model free-tier compliance: all model pins must be free-tier (issue #130 free-tier model guard).
# Every `model:` in opencode.yml and both knobs in opencode.json must end in `-free`
# to avoid CreditsError (workspace billing requires payment method for paid models).
# This catches drift where a workflow or opencode.json points at a paid model.
model_lines=$(grep -nE 'model:\s*opencode/' "$WF" 2>/dev/null || true)
non_free_models=$(echo "$model_lines" | grep -vE 'opencode/[^ ]*-free$' || true)
json_models=""
if [ -f "opencode.json" ]; then
  json_model=$(jq -r '.model // empty' opencode.json 2>/dev/null || echo "")
  json_small=$(jq -r '.small_model // empty' opencode.json 2>/dev/null || echo "")
  json_models="${json_model} ${json_small}"
fi
json_non_free=""
for jm in $json_models; do
  if [ -n "$jm" ] && ! echo "$jm" | grep -qE -- '-free$'; then
    json_non_free="${json_non_free} $jm"
  fi
done
if [ -z "$non_free_models" ] && [ -z "$(echo "$json_non_free" | tr -d ' ')" ]; then
  if [ -n "$model_lines" ]; then
    check "R6" "all workflow model pins and opencode.json knobs are free-tier (${model_lines%%:*} free)" "ok"
  else
    check "R6" "no opencode/ model pins found in $WF (skip)" "ok"
  fi
else
  detail=""
  [ -n "$non_free_models" ] && detail="workflow: ${non_free_models}"
  [ -n "$(echo "$json_non_free" | tr -d ' ')" ] && detail="${detail} json:${json_non_free}"
  check "R6" "non-free model pin found -> ${detail} (violates free-tier model guard)" "bad"
fi

# [R7] Review-restore ownership gate (PR #412 head-rewind regression): the
# opencode-review restore step may only undo a head movement made from its own
# workspace, and must push with a lease. The pre-fix version force-pushed the
# snapshot captured at run START, so any push that landed while a review was
# still running (Fixer, Builder, owner) was silently reverted when the run
# ended - that is exactly how PR #412 lost 13 Fixer commits.
# The gate needs FIVE properties: a local-ref ownership test, a lease, the
# pre-push marker, a marker that records the PUSHED COMMIT (marker_sha) which
# must equal the live head, and an unbroken push chain (chain_ok) proving no
# external commit sits between the checked-out head and the live head - an
# existence-only marker or a marker without the chain survives a later
# external push and still rewinds it (Y2/Z2). A bare force push is banned
# outright.
# The marker closes the proxy hole: a local ref alone is advanced by a plain
# `git pull --ff-only` / `git reset --hard origin/<b>` that never pushed, so
# ref movement by itself still rewinds external work.
REVIEW_WF="$(dirname "$WF")/opencode-review.yml"
if [ ! -f "$REVIEW_WF" ] && [ -f ".github/workflows/opencode-review.yml" ]; then
  REVIEW_WF=".github/workflows/opencode-review.yml"
fi
restore_block=""
if [ -f "$REVIEW_WF" ]; then
  restore_block=$(sed -n '/- name: Restore PR head/,/^      - name: /p' "$REVIEW_WF" 2>/dev/null || true)
fi
if [ -z "$restore_block" ]; then
  check "R7" "restore step missing or renamed in ${REVIEW_WF} (head-rewind guard lost)" "bad"
else
  owns_local=$(printf '%s\n' "$restore_block" | grep -c 'rev-parse --verify "refs/heads/' || true)
  # Explicit lease form: `--force-with-lease=refs/heads/<branch>:<expected>`.
  # A bare `--force-with-lease` fails safe but would never restore, so it does
  # not satisfy the rule.
  leased=$(printf '%s\n' "$restore_block" | grep -cE -- '--force-with-lease="?refs/heads/' || true)
  marker=$(printf '%s\n' "$restore_block" | grep -c 'review-workspace-pushed' || true)
  marker_sha=$(printf '%s\n' "$restore_block" | grep -c 'marker_sha' || true)
  # Unbroken push chain: the marker's first push must start at the checked-out
  # head, each push must link to the previous one, and the last pushed commit
  # must be the live head - otherwise an external commit this workspace pulled
  # and pushed on top of is silently rewound (Y2/Z2).
  chain=$(printf '%s\n' "$restore_block" | grep -c 'chain_ok' || true)
  # Bare force push in any argument order: `git push --force origin`,
  # `git push origin --force`, or a trailing bare `git push --force`.
  bare_force=$(printf '%s\n' "$restore_block" | grep -cE 'git push[^|&;]*--force([^-]|$)' || true)
  if [ "$owns_local" -gt 0 ] && [ "$leased" -gt 0 ] && [ "$marker" -gt 0 ] && [ "$marker_sha" -gt 0 ] && [ "$chain" -gt 0 ] && [ "$bare_force" -eq 0 ]; then
    check "R7" "review restore gates on an unbroken chain of this workspace's own pushes up to the live head (marker commit == live head + local ref) and pushes with an explicit lease (PR #412 rewind guard)" "ok"
  else
    check "R7" "restore step in ${REVIEW_WF} missing local-ref ownership test (=${owns_local}), lease (=${leased}), push marker (=${marker}), marker commit check (=${marker_sha}), push chain (=${chain}), or force-pushes bare (=${bare_force})" "bad"
  fi
fi

# [R8] Vendored hardened runner (issue #422 A): every agent arm must run
# opencode through the in-repo composite action, never through the third-party
# anomalyco/opencode/github@latest, whose version step aborts the whole run
# (anonymous releases-API rate limit under `bash -e -o pipefail`) before the
# agent ever starts. The vendored step must keep all four hardening markers.
ACTION_FILE=".github/actions/opencode-run/action.yml"
# Scan all of .github/ (not just .github/workflows): a reintroduction under
# .github/actions/ or .github/agents/ must trip this rule just the same.
# The pattern requires whitespace after `uses:` so this script's own
# documentation of the pattern cannot match itself.
upstream_refs=$(grep -rnE 'uses:[[:space:]]+.*anomalyco/opencode' .github 2>/dev/null || true)
if [ -n "$upstream_refs" ]; then
  check "R8" "external anomalyco/opencode action still referenced -> $(echo "$upstream_refs" | head -3 | tr '\n' ' ') (issue #422 A: version step can abort the run before the agent starts)" "bad"
elif [ ! -f "$ACTION_FILE" ]; then
  check "R8" "vendored runner missing at ${ACTION_FILE} (issue #422 A)" "bad"
else
  missing=""
  grep -q 'Authorization: Bearer' "$ACTION_FILE" || missing="${missing} authenticated-lookup"
  grep -q 'VERSION:-latest' "$ACTION_FILE" || missing="${missing} version-fallback"
  grep -qE '\|\|[[:space:]]*true' "$ACTION_FILE" || missing="${missing} pipefail-guard"
  grep -q 'continue-on-error: true' "$ACTION_FILE" || missing="${missing} continue-on-error"
  if [ -z "$missing" ]; then
    check "R8" "vendored runner is in-repo and hardened (auth + fallback + pipefail guard + continue-on-error)" "ok"
  else
    check "R8" "vendored runner lost hardening marker(s):${missing} in ${ACTION_FILE} (issue #422 A)" "bad"
  fi
fi

# [R9] Schedule/dispatch retry parity (issue #422 B): every schedule- or
# dispatch-only agent arm must own the bounded self-heal instead of failing
# closed and burning a whole cron cycle (curator: 6h, auditor: 24h). Cohort:
#   curator.yml  schedule (6h) + dispatch  - the burn that triggered the audit
#   auditor.yml  schedule (24h) + dispatch
#   ideate.yml   dispatch arm (its issue_comment arm stays fail-closed)
#   lab.yml      dispatch arm (must forward issue_number to the retry run)
# opencode-recover.yml is deliberately out of cohort: its schedule/dispatch
# arms run the fully scripted detect job (no agent; the 20-minute detector is
# its own retry loop) and its agent arm is issue_comment-only with a scripted
# fallback step.
SELFHEAL_SCRIPT=".github/scripts/schedule-selfheal.sh"
r9_bad=""
for r9_wf in curator.yml auditor.yml ideate.yml lab.yml; do
  r9_path=".github/workflows/${r9_wf}"
  if [ ! -f "$r9_path" ]; then
    r9_bad="${r9_bad} ${r9_wf}(missing)"
    continue
  fi
  grep -q 'schedule-selfheal\.sh' "$r9_path" || r9_bad="${r9_bad} ${r9_wf}(no-selfheal-call)"
  grep -q 'selfheal_retry:' "$r9_path" || r9_bad="${r9_bad} ${r9_wf}(no-selfheal_retry-input)"
done
if [ ! -f "$SELFHEAL_SCRIPT" ]; then
  r9_bad="${r9_bad} schedule-selfheal.sh(missing)"
else
  grep -qE '^MAX_RETRIES=[0-9]+' "$SELFHEAL_SCRIPT" || r9_bad="${r9_bad} script(no-bounded-cap)"
  # The cap must also be SMALL: `MAX_RETRIES=999` is a "bounded" infinite
  # loop, so keep the hard ceiling at 3.
  r9_cap=$(grep -oE '^MAX_RETRIES=[0-9]+' "$SELFHEAL_SCRIPT" | head -1 | cut -d= -f2)
  if [ -n "$r9_cap" ] && [ "$r9_cap" -gt 3 ] 2>/dev/null; then
    r9_bad="${r9_bad} script(cap-${r9_cap}-exceeds-3)"
  fi
  grep -q '/oc maintainer' "$SELFHEAL_SCRIPT" || r9_bad="${r9_bad} script(no-maintainer-escalation)"
  grep -q 'refusing to fall back to 0' "$SELFHEAL_SCRIPT" || r9_bad="${r9_bad} script(no-phantom-zero-guard)"
fi
if [ -z "$r9_bad" ]; then
  check "R9" "schedule/dispatch arms (curator/auditor/ideate/lab) wired to bounded self-heal with maintainer escalation" "ok"
else
  check "R9" "schedule/dispatch retry parity missing:${r9_bad} (issue #422 B: a crash burns the whole cron cycle)" "bad"
fi

# [R10] Expression-injection guard (issue #422 residual): a free-form input
# (workflow_dispatch `inputs.*`, legacy `github.event.inputs.*`) or untrusted
# event text (comment body, issue/PR title or body, head branch) must NEVER be
# interpolated as `${{ }}` text inside a `run:` block. GitHub substitutes
# expressions into the SCRIPT SOURCE before bash parses it, so a double quote
# in the input escapes the surrounding quotes and executes as a command inside
# a step that may carry the owner PAT - a repo-write credential escalating to
# the owner identity (B3 repro: selfheal_retry='0"; touch /tmp/PWNED; echo "'
# ran the touch). The required pattern is env indirection: declare the value
# under `env:` and reference it as "$VAR" (repo standard: maintainer.yml
# OC_TARGET, poolduel-m1 TARGET_REF). The scan covers every `run:` form -
# named steps, list-style `- run:` steps, multi-line `run: |` blocks, and the
# composite action's `runs:` - and the cohort must additionally still MAP the
# indirection values, so a call site can never silently read an empty counter.
r10_bad=""
for r10_file in .github/workflows/*.yml .github/actions/*/action.yml; do
  [ -f "$r10_file" ] || continue
  r10_hits=$(awk '
    function gi(s) { match(s, /^[ \t]*/); return RLENGTH }
    function unsafe() {
      return ($0 ~ /\$\{[^}]*inputs[.]/ ||
              $0 ~ /\$\{[^}]*event[.](comment[.]body|issue[.]title|issue[.]body|pull_request[.]title|pull_request[.]body|workflow_run[.]head_branch)/ ||
              $0 ~ /\$\{[^}]*github[.]head_ref/)
    }
    FNR == 1 { inrun = 0 }
    {
      if (inrun && $0 !~ /^[ \t]*$/) {
        if (gi($0) <= runindent) { inrun = 0 }
        else {
          if (unsafe()) print FILENAME ":" FNR ": " $0
          next
        }
      }
      if ($0 ~ /^[ \t]*(-[ \t]+)?run:[ \t]*\|/) {
        match($0, /^[ \t]*(-[ \t]+)?[ \t]*/)
        runindent = RLENGTH
        inrun = 1
        next
      }
      if ($0 ~ /^[ \t]*(-[ \t]+)?run:[ \t]*[^|]/ && unsafe()) print FILENAME ":" FNR ": " $0
    }' "$r10_file")
  if [ -n "$r10_hits" ]; then
    r10_bad="${r10_bad}
$(echo "$r10_hits" | head -5)"
  fi
done
for r10_wf in curator.yml auditor.yml ideate.yml lab.yml; do
  r10_path=".github/workflows/${r10_wf}"
  if [ ! -f "$r10_path" ]; then
    r10_bad="${r10_bad} ${r10_wf}(missing)"
    continue
  fi
  grep -q 'SELFHEAL_RETRY: \${{ inputs\.selfheal_retry }}' "$r10_path" || r10_bad="${r10_bad} ${r10_wf}(no-SELFHEAL_RETRY-env-mapping)"
done
if [ -z "$r10_bad" ]; then
  check "R10" "no free-form input or untrusted event text interpolated into any run: block; cohort verify steps map SELFHEAL_RETRY via env (env indirection everywhere)" "ok"
else
  check "R10" "expression injection in run block(s):${r10_bad} (move the value to env: and read it as a shell variable)" "bad"
fi

# [R11] Post-agent PAT gates (issue #422 residual): lab.yml's owner-PAT strip
# (filter-branch over the PR branch) and push (branch push + PR open) steps
# must run only when the agent finished its contract, i.e. the decision file
# exists. They used to run under a bare `if: always()`, so a crashed run (no
# decision file) still rewrote and pushed the branch from partial state.
LAB_WF=".github/workflows/lab.yml"
r11_bad=""
if [ ! -f "$LAB_WF" ]; then
  r11_bad=" lab.yml(missing)"
else
  grep -q 'id: decision-gate' "$LAB_WF" || r11_bad="${r11_bad} lab.yml(no-decision-gate-step)"
  gate_block=$(grep -A8 -F -- "id: decision-gate" "$LAB_WF" || true)
  if ! echo "$gate_block" | grep -q 'random-lab-decision\.json'; then
    r11_bad="${r11_bad} lab.yml(decision-gate-ignores-decision-file)"
  fi
  for r11_name in "Strip owner Co-authored-by trailers from the PR branch" "Push PR branch or direct model updates (PAT-backed)"; do
    step_if=$(grep -A8 -F -- "- name: ${r11_name}" "$LAB_WF" | grep -m1 -E '^[[:space:]]*if:' || true)
    case "$step_if" in
      *"steps.decision-gate.outputs.present == 'true'"*) ;;
      *) r11_bad="${r11_bad} lab.yml(step-not-decision-gated:$(echo "$r11_name" | cut -d' ' -f1-2))" ;;
    esac
  done
fi
if [ -z "$r11_bad" ]; then
  check "R11" "lab.yml strip and push PAT steps are gated on the written decision file (crashed runs never push)" "ok"
else
  check "R11" "post-agent PAT gate missing:${r11_bad} (issue #422 residual: an ungated always() push ships partial state from crashed runs)" "bad"
fi

# [R12] Actor write gate (issue #428): every /oc-gated agent workflow (any
# workflow that runs the in-repo opencode-run composite action) must fail
# closed behind the shared actor-write gate BEFORE its agent step, so an
# unprivileged issue_comment / PR comment can never launch an agent and never
# reaches an owner-PAT auto-retry arm - the auto-retry re-posts the trigger as
# the owner (admin), which LAUNDERS the unprivileged actor past the CLI's
# write-permission assert and burns a noise comment on the first attempt.
# Per-file, two properties: the gate script is invoked, and every agent step
# is wired to its `steps.actor_gate.outputs.run` output; the gate-step count
# must also cover the agent-step count so a newly added agent job without its
# own gate trips the rule.
#
# maintainer.yml inline parity (issue #696): the Maintainer is the one agent
# arm that runs `opencode github run` directly instead of through the
# composite action, so the cohort loop below never sees it. It adopts the
# SAME shared gate right after checkout (GATE_LABEL=maintainer), wires its
# agent step to the gate output, gives its verify step the terminal third
# outcome (a denial is not a crash), and gates EVERY post-gate side-effect
# step - agent runner, stray-PR cleanup, emergency push, memory publish,
# comment poster, owner-PAT /oc triggers and merges, pages trigger, main
# integrity restore, ideator dispatch, held-CI approvals - on the same
# output, so an unprivileged bot pull_request event can never produce a red
# run, a noise comment, an owner trigger, a push, or a merge. Before this,
# every bot-authored PR open/close redded the run on the CLI's permission
# assert and posted the raw error as a public comment (issue #696: 15 red
# runs in one 24h window). The pins are strict by construction: the gate
# must sit IMMEDIATELY after checkout (no step boundary in between) and
# carry the exact id + GH_TOKEN/GATE_EVENT/GATE_ACTOR/GATE_LABEL mappings
# and an anchored shared-script invocation, the verify step must stay
# `if: always()`, and every listed side-effect step is matched as a full
# `      - name: ` line. A dropped condition, a substring-preserving rename
# of a listed step, a gate moved below the agent, a stale-id rename, a
# hardcoded actor, a frozen event, a tokenless gate, or a decoyed script
# line therefore all trip this rule (mutations measured against the first
# iteration of this rule found each of those escapes; review of PR #698).
r12_bad=""
r12_main_wf=".github/workflows/maintainer.yml"
for r12_path in .github/workflows/*.yml; do
  [ -f "$r12_path" ] || continue
  r12_name=$(basename "$r12_path")
  # Anchored to a real `uses:` line in every standard step spelling (own
  # line, inline sequence `- uses:`, and `uses :` with whitespace before the
  # colon) so #430's restore-step comment (which quotes
  # `uses: ./.github/actions/opencode-run` in prose) never counts as an agent
  # step and double-inflates the agent side of the comparison. The inline and
  # whitespace spellings were a real count miss caught by the Tester on
  # PR #702 (issue #701).
  r12_agents=$(grep -cE '^[[:space:]]*(-[[:space:]]+)?uses[[:space:]]*:[[:space:]]*\./\.github/actions/opencode-run[[:space:]]*(#.*)?$' "$r12_path" || true)
  [ "$r12_agents" -gt 0 ] || continue
  if ! grep -q 'actor-write-gate\.sh' "$r12_path"; then
    r12_bad="${r12_bad} ${r12_name}(no-gate-script)"
    continue
  fi
  if ! grep -q "steps\.actor_gate\.outputs\.run" "$r12_path"; then
    r12_bad="${r12_bad} ${r12_name}(no-gate-wiring)"
    continue
  fi
  r12_gates=$(grep -c 'bash \.github/scripts/actor-write-gate\.sh' "$r12_path" || true)
  if [ "$r12_gates" -lt "$r12_agents" ]; then
    r12_bad="${r12_bad} ${r12_name}(gates=${r12_gates}<agents=${r12_agents})"
  fi
done
# maintainer.yml inline-runner parity (issue #696): the gate step must sit
# IMMEDIATELY after checkout, carry the exact `id: actor_gate` and the
# GH_TOKEN / GATE_EVENT / GATE_ACTOR / GATE_LABEL mappings, invoke the
# shared script on an anchored `run:` line, keep `shell: bash`, and carry no
# `if:` / `continue-on-error:` of its own (a conditional gate step, a
# tolerated gate failure, or a non-bash shell silently disables every
# maintainer run); the agent step, the verify step's activation and its
# entire denial branch, and every post-gate
# side-effect step are pinned. Every pinned line is anchored whole-line
# (per-key anchored count `= 1` plus the exact pinned value for the gate
# `id`, mappings, and script run; `grep -qxF` for the verify env mapping;
# a byte-exact block comparison for the verify denial branch: conditional,
# notice, `exit 0`, `fi`), so a commented-out, duplicated, re-valued, or
# substring-preserving decoy line can never satisfy a pin (PR #698 rounds
# 2-4). The verify step may not carry `continue-on-error:` in any YAML key
# spelling (it would mute the loud red for a gate-allowed crash), must keep
# `shell: bash`, must keep the denial branch FIRST
# (an order swap feeds a denial into the loud red), and duplicate step
# `- name:` headers are rejected outright because the name-keyed extraction
# stops at the first match. The step list is explicit and matched against
# full `      - name: ` lines: a substring-preserving rename of a listed
# step trips the rule (its extracted block comes back empty), and a dropped
# gate condition on any listed step trips the rule. The list is backed by a
# generic sweep: every step block that reaches the owner PAT must carry the
# exact gate condition, so a newly inserted ungated PAT-touching step trips
# the rule even before its author extends the list. The match is the bare
# `OPENCODE` stem and a whole-file containment check requires every occurrence
# to be step-indented and attributed to a named step, so the bracket spelling
# (`secrets['OPENCODE_PAT']`), a job- or workflow-level mapping reached
# through a later `${{ env.X }}` indirection, and YAML-escaped spellings all
# fail closed (PR #698 rounds 6-7).
# Every step boundary must be a named `      - name: ` header: an unnamed
# `      - run:` step is invisible to the name-keyed extraction AND the PAT
# sweep, so an ungated owner-PAT step could ride every run (PR #698 round 5,
# finding 2). The
# verify lane itself is pinned BEHAVIORALLY, not only textually (PR #698
# rounds 5-7, findings 1): its real extracted run body is executed under
# bash -e across the full production outcome matrix (denial -> notice + exit
# 0; gate-allowed with a decision file -> exit 0; gate-allowed without one ->
# loud exit 1), varying BOTH AGENT_GATE and all four Action outcome values
# (success, failure, cancelled, skipped), inside a production-shaped env, so
# an outcome-keyed branch always changes at least one case (a `skipped`
# branch rode a denial clean-skip to a red, an inserted `AGENT_GATE=true`
# reds every denial, a final `exit 1` swap or deletion and an early `exit 0`
# restored the hollow green: all kept the textual pins green). The body is
# also pinned STRUCTURALLY to the pins it may read (PR #698 round 7): only
# AGENT_GATE and AGENT_OUTCOME references survive; any other `$` token
# ($0 differs between the harness and a production temp script, $?, ${!var}
# indirect expansion, command substitution) and any backtick trips the rule,
# so a branch keyed on any ambient Actions env var (an inserted
# `[ -n "${GITHUB_EVENT_NAME:-}" ]` restored the hollow green in production
# while the hermetic harness stayed green) fails by construction rather than
# only when the harness happens to set that var. The executable lines are
# ALSO pinned byte-exact (comments excluded, so prose stays editable), which
# closes ambient context read WITHOUT a `$` expansion (`[ -d .git ]`,
# `[ -d .github ]`, `env | grep GITHUB_SHA`, `pwd`) that the behavioral
# harness cannot see (PR #698 round 7, finding 4). YAML indirection is banned
# outright for the same reason: anchors/aliases can hide a key or the owner
# PAT behind a name the text pins never see, `?` complex keys sidestep the
# key regexes, and escape sequences (`\u002D`, `\x65`, `\u005F`) decode to
# tokens the searches never match; no such construct exists in the workflow
# today, and a job- OR workflow-level `env:` (the latter applies to every
# step) is rejected outright, so the owner PAT cannot reach an ungated step
# through an env indirection at any level.
# The gate header reject also matches YAML-equivalent key spellings
# (`if :`, `"if":`, `continue-on-error :`) so whitespace or quoting cannot
# smuggle a conditional gate past the pin (PR #698 round 5, finding 3). The
# JOB itself may not carry continue-on-error nor a job-level `env:` (PR #698
# rounds 6-8, finding 2 plus the round-7 job-key-order and job-key-spelling
# escapes): a job-level
# tolerance mutes both the gate's deliberate red and the verify lane's loud
# red for a gate-allowed crash, and a job-level env can leak the owner PAT to
# every step through an env indirection. YAML key order is free, so the scan
# covers the whole job block, not just the header before `steps:`; the
# workflow has exactly one job, so the 4-space key scan runs over the whole
# file, independent of the job key's spelling.
r12_main_steps=(
  "Remove maintainer stray PRs and branches (the Maintainer never opens PRs)"
  "Emergency-gated commit and push of workflow model updates to main"
  "Commit Maintainer memory (maintainer/logs)"
  "Post Maintainer comment"
  "Run /oc triggers as owner"
  "PAT-backed merge for approved workflow-touching PRs"
  "Trigger pages deployment if main advanced"
  "Main integrity guard (prevent orphan or divergent main rewrite)"
  "Dispatch ideator when asked"
  "Approve held CI runs (PR or repo-wide sweep)"
)
if [ ! -f "$r12_main_wf" ]; then
  r12_bad="${r12_bad} maintainer.yml(missing)"
else
  r12_main_gate_ln=$(grep -nxF -- '      - name: Actor write gate (issue #428)' "$r12_main_wf" | head -1 | cut -d: -f1)
  r12_main_checkout_ln=$(grep -nxF -- '      - name: Checkout repository' "$r12_main_wf" | head -1 | cut -d: -f1)
  r12_main_agent_ln=$(grep -nxF -- '      - name: Run Maintainer agent' "$r12_main_wf" | head -1 | cut -d: -f1)
  [ "$(grep -cxF -- '      - name: Actor write gate (issue #428)' "$r12_main_wf" || true)" = "1" ] || r12_bad="${r12_bad} maintainer.yml(gate-step-count)"
  if [ -z "$r12_main_gate_ln" ] || [ -z "$r12_main_checkout_ln" ] || [ -z "$r12_main_agent_ln" ] \
     || [ "$r12_main_gate_ln" -le "$r12_main_checkout_ln" ] || [ "$r12_main_gate_ln" -ge "$r12_main_agent_ln" ]; then
    r12_bad="${r12_bad} maintainer.yml(gate-not-between-checkout-and-agent:${r12_main_checkout_ln:-none}/${r12_main_gate_ln:-none}/${r12_main_agent_ln:-none})"
  elif [ "$(awk -v a="$r12_main_checkout_ln" -v b="$r12_main_gate_ln" 'NR>a && NR<b && /^      - name: /{n++} END{print n+0}' "$r12_main_wf")" != "0" ]; then
    r12_bad="${r12_bad} maintainer.yml(gate-not-immediately-after-checkout)"
  fi
  # Unique step names are what make the name-keyed extraction below sound (PR
  # #698 round 4, blocking finding 3): r12_main_block() stops at the FIRST
  # matching header, so a step that duplicates a pinned name and sits after
  # the real step is invisible to the explicit list AND to the generic PAT
  # sweep, letting a copy-pasted ungated owner-PAT step ride every Maintainer
  # run including a denied trigger. No current step name is duplicated.
  r12_dup_steps=$(grep '^      - name: ' "$r12_main_wf" | sed 's/^      - name: //' | sort | uniq -d)
  [ -z "$r12_dup_steps" ] || r12_bad="${r12_bad} maintainer.yml(duplicate-step-names:$(printf '%s' "$r12_dup_steps" | tr '\n' ';'))"
  # Every step boundary must be a named `      - name: ` header (PR #698 round
  # 5, finding 2): an unnamed `      - run:` / `      - uses:` step is never
  # extracted by r12_main_block() or the name-keyed PAT sweep, so an ungated
  # owner-PAT step could ride every Maintainer run including a denied trigger.
  r12_unnamed_steps=$(grep -nE '^      - ' "$r12_main_wf" | grep -vE '^[0-9]+:      - name: ' || true)
  [ -z "$r12_unnamed_steps" ] || r12_bad="${r12_bad} maintainer.yml(unnamed-step:$(printf '%s' "$r12_unnamed_steps" | tr '\n' ';'))"
  # The maintenance JOB itself may not tolerate failure nor carry a job-level
  # `env:` (PR #698 rounds 6-8, blocking finding 2 plus the round-7 escapes):
  # a job-level continue-on-error mutes the gate's deliberate red (an API
  # failure exits 1 with no `run=` output, which the verify step then reads as
  # a denial and exits 0) and the verify lane's loud red for a gate-allowed
  # crash for the whole job, and a job-level `env:` can hand the owner PAT to
  # every step through an env indirection (the line sits either before the
  # steps or after them, where the nearest-step attribution would blame a
  # gated step). YAML key order is free, so the job key may follow the whole
  # `steps:` list. The start anchor is byte-exact job-key spelling, so
  # YAML-equivalent spellings (`"maintainer":`, a trailing comment, trailing
  # whitespace, `maintainer :`) emptied the extracted block and skipped both
  # checks (PR #698 round 7, blocking finding 1). The workflow has exactly one
  # job, so scan every 4-space job key in the whole file instead: the job-key
  # spelling can no longer hide the block. A second job must scope this rule
  # and add review. Job keys are exactly 4-space indented, so step-level keys
  # at 8+ spaces cannot false-positive; quoted and whitespace-before-colon
  # spellings are matched too.
  if grep -qE "^    [\"']?continue-on-error[\"']?[[:space:]]*:" "$r12_main_wf"; then
    r12_bad="${r12_bad} maintainer.yml(job-continue-on-error)"
  fi
  if grep -qE "^    [\"']?env[\"']?[[:space:]]*:" "$r12_main_wf"; then
    r12_bad="${r12_bad} maintainer.yml(job-level-env)"
  fi
  # Workflow-level `env:` (column 0) applies to every step of every job just
  # like a job-level one (PR #698 round 7: it reaches all steps and, placed
  # after the steps list, the nearest-step PAT attribution would blame a gated
  # step).
  if grep -qE "^[\"']?env[\"']?[[:space:]]*:" "$r12_main_wf"; then
    r12_bad="${r12_bad} maintainer.yml(workflow-level-env)"
  fi
  # YAML indirection is banned outright (PR #698 round 7): anchors/aliases can
  # hide a key or a secret behind a name the text pins never see (a key-node
  # anchor on `continue-on-error`, an alias handing the owner PAT to an
  # ungated step), `?` complex keys sidestep the key regexes, and escape
  # sequences (`"continue\u002Don-error"`, `secrets.OPENCODE\u005FPAT`) decode
  # to tokens the text searches never match. None of these constructs exists
  # in this workflow today; a future legitimate use must extend this rule with
  # review.
  r12_yaml_indirect=$(grep -nE ':[[:space:]]*&[A-Za-z_]|-[[:space:]]*&[A-Za-z_]|:[[:space:]]*\*[A-Za-z_]|-[[:space:]]*\*[A-Za-z_]|^[[:space:]]*&[A-Za-z_]|^[[:space:]]*\*[A-Za-z_]|^[[:space:]]*\?[[:space:]]|\\[uUx][0-9a-fA-F]' "$r12_main_wf" || true)
  [ -z "$r12_yaml_indirect" ] || r12_bad="${r12_bad} maintainer.yml(yaml-indirection:$(printf '%s' "$r12_yaml_indirect" | cut -d: -f1-2 | tr '\n' ';'))"
  # Duplicate `steps:` keys are a strict-parser 422 today, but pin the count
  # anyway (PR #698 round 7): a last-wins parser would silently drop the whole
  # real steps list.
  [ "$(grep -cE '^    [\"']?steps[\"']?[[:space:]]*:' "$r12_main_wf" || true)" = "1" ] || r12_bad="${r12_bad} maintainer.yml(steps-key-count)"
  r12_main_block() {
    awk -v step="      - name: $1" '
      $0 == step { in_step=1; next }
      in_step && /^      - name: / { exit }
      in_step { print }
    ' "$r12_main_wf"
  }
  r12_main_gate_block=$(r12_main_block "Actor write gate (issue #428)")
  r12_main_gate_key_count() {
    printf '%s\n' "$r12_main_gate_block" | grep -cE "^$1" || true
  }
  # Each gate key must appear EXACTLY once (PR #698 round 3, observation 1):
  # an exact-value count alone misses a duplicated key carrying a different
  # value (a second `GATE_EVENT: schedule`), so the anchored key count and
  # the exact-value line are pinned together.
  [ "$(r12_main_gate_key_count '        id:')" = "1" ] || r12_bad="${r12_bad} maintainer.yml(gate-id-key-count)"
  printf '%s\n' "$r12_main_gate_block" | grep -qxF '        id: actor_gate' || r12_bad="${r12_bad} maintainer.yml(gate-no-id)"
  [ "$(r12_main_gate_key_count '          GH_TOKEN:')" = "1" ] || r12_bad="${r12_bad} maintainer.yml(gate-token-key-count)"
  printf '%s\n' "$r12_main_gate_block" | grep -qxF '          GH_TOKEN: ${{ github.token }}' || r12_bad="${r12_bad} maintainer.yml(gate-no-token-mapping)"
  [ "$(r12_main_gate_key_count '          GATE_EVENT:')" = "1" ] || r12_bad="${r12_bad} maintainer.yml(gate-event-key-count)"
  printf '%s\n' "$r12_main_gate_block" | grep -qxF '          GATE_EVENT: ${{ github.event_name }}' || r12_bad="${r12_bad} maintainer.yml(gate-no-event-mapping)"
  [ "$(r12_main_gate_key_count '          GATE_ACTOR:')" = "1" ] || r12_bad="${r12_bad} maintainer.yml(gate-actor-key-count)"
  printf '%s\n' "$r12_main_gate_block" | grep -qxF '          GATE_ACTOR: ${{ github.actor }}' || r12_bad="${r12_bad} maintainer.yml(gate-no-actor-mapping)"
  [ "$(r12_main_gate_key_count '          GATE_LABEL:')" = "1" ] || r12_bad="${r12_bad} maintainer.yml(gate-label-key-count)"
  printf '%s\n' "$r12_main_gate_block" | grep -qxF '          GATE_LABEL: maintainer' || r12_bad="${r12_bad} maintainer.yml(gate-no-label-mapping)"
  [ "$(r12_main_gate_key_count '        run:')" = "1" ] || r12_bad="${r12_bad} maintainer.yml(gate-run-key-count)"
  printf '%s\n' "$r12_main_gate_block" | grep -qxF '        run: bash .github/scripts/actor-write-gate.sh' || r12_bad="${r12_bad} maintainer.yml(no-gate-script-run)"
  # The step's shell is part of its activation (PR #698 round 7, blocking
  # finding 3): `shell: "true {0}"` (or any non-bash shell) makes the gate
  # exit 0 without running the script, so $GITHUB_OUTPUT never receives
  # `run=` and every trigger becomes a silent green no-op.
  [ "$(r12_main_gate_key_count '        shell:')" = "1" ] || r12_bad="${r12_bad} maintainer.yml(gate-shell-key-count)"
  printf '%s\n' "$r12_main_gate_block" | grep -qxF '        shell: bash' || r12_bad="${r12_bad} maintainer.yml(gate-not-bash-shell)"
  # The gate step's OWN activation and failure tolerance are pinned too (PR
  # #698 round 4, blocking finding 1): an `if:` on the gate step would let it
  # never run ($GITHUB_OUTPUT never receives `run=`, every trigger becomes a
  # silent green no-op forever: no agent, no comment, no merge, no memory
  # publish), and a `continue-on-error:` would turn the gate's deliberate red
  # paths (an empty output means the gate failed red) into fail-silent,
  # indistinguishable from a denial at the verify step. The key match accepts
  # YAML-equivalent spellings (whitespace before the colon, a quoted key), so
  # `if : false` or `"if": false` cannot sneak past (PR #698 round 5,
  # finding 3).
  r12_gate_hdr_bad=$(printf '%s\n' "$r12_main_gate_block" | grep -cE "^[[:space:]]*[\"']?(if|continue-on-error)[\"']?[[:space:]]*:" || true)
  [ "$r12_gate_hdr_bad" = "0" ] || r12_bad="${r12_bad} maintainer.yml(gate-conditional-or-tolerated-failure)"
  r12_agent_block=$(r12_main_block "Run Maintainer agent")
  if [ "$(printf '%s\n' "$r12_agent_block" | grep -cE '^[[:space:]]*if:' || true)" != "1" ] \
     || ! printf '%s\n' "$r12_agent_block" | grep -qxF "        if: steps.actor_gate.outputs.run == 'true'"; then
    r12_bad="${r12_bad} maintainer.yml(agent-not-gated)"
  fi
  r12_verify_block=$(r12_main_block "Verify Maintainer wrote its decision contract (loud failure, issue #591)")
  if [ -z "$r12_verify_block" ]; then
    r12_bad="${r12_bad} maintainer.yml(verify-step-missing-or-renamed)"
  else
    [ "$(printf '%s\n' "$r12_verify_block" | grep -cE '^[[:space:]]*if:' || true)" = "1" ] || r12_bad="${r12_bad} maintainer.yml(verify-if-count)"
    printf '%s\n' "$r12_verify_block" | grep -qxF '        if: always()' || r12_bad="${r12_bad} maintainer.yml(verify-not-always)"
    # Anchored whole-line pins (PR #698 rounds 3-4): the original unanchored
    # substrings let a commented-out decoy line (or a full-line comment-out of
    # the denial branch) disable the third outcome or the loud red while the
    # audit stayed green, so the env mapping is count-pinned and whole-line
    # pinned, and the denial branch below is pinned byte-exact.
    [ "$(printf '%s\n' "$r12_verify_block" | grep -cE '^[[:space:]]*AGENT_GATE:' || true)" = "1" ] || r12_bad="${r12_bad} maintainer.yml(verify-gate-key-count)"
    printf '%s\n' "$r12_verify_block" | grep -qxF '          AGENT_GATE: ${{ steps.actor_gate.outputs.run }}' || r12_bad="${r12_bad} maintainer.yml(verify-no-gate-env)"
    # The verify step may not tolerate failure either (PR #698 rounds 4-7,
    # blocking finding 1): a `continue-on-error:` there mutes the loud red for
    # a gate-allowed crash. The key match accepts YAML-equivalent spellings
    # (whitespace before the colon, a quoted key), so `continue-on-error :`
    # and `"continue-on-error":` cannot sneak past (PR #698 round 7,
    # blocking finding 2).
    if printf '%s\n' "$r12_verify_block" | grep -qE "^[[:space:]]*[\"']?continue-on-error[\"']?[[:space:]]*:"; then
      r12_bad="${r12_bad} maintainer.yml(verify-continue-on-error)"
    fi
    # The verify step's shell is part of its activation (PR #698 round 7,
    # blocking finding 3): a non-bash shell makes the body never execute, so a
    # gate-allowed crash with no decision file concludes green.
    [ "$(printf '%s\n' "$r12_verify_block" | grep -cE '^[[:space:]]*shell:' || true)" = "1" ] || r12_bad="${r12_bad} maintainer.yml(verify-shell-key-count)"
    printf '%s\n' "$r12_verify_block" | grep -qxF '        shell: bash' || r12_bad="${r12_bad} maintainer.yml(verify-not-bash-shell)"
    # The denial branch is pinned byte-exact AND first (PR #698 round 4,
    # blocking finding 2): neither its `exit 0` nor its position was pinned,
    # so `exit 1` redded denials (issue #696's exact symptom) and a branch
    # moved below the decision-file check fed a denial into the loud red.
    r12_verify_deny_block=$(printf '%s\n' "$r12_verify_block" | awk '
      $0 == "          if [ \"${AGENT_GATE:-}\" != \"true\" ]; then" { f=1 }
      f { print }
      f && $0 == "          fi" { exit }
    ')
    r12_verify_deny_expected='          if [ "${AGENT_GATE:-}" != "true" ]; then
            echo "::notice::Actor write gate skipped the Maintainer agent (issue #428): denial is not a crash - no agent run, no noise comment, no red, no self-heal, no /oc maintainer escalation."
            exit 0
          fi'
    [ "$r12_verify_deny_block" = "$r12_verify_deny_expected" ] || r12_bad="${r12_bad} maintainer.yml(verify-denial-branch-changed)"
    r12_verify_deny_ln=$(printf '%s\n' "$r12_verify_block" | grep -nxF '          if [ "${AGENT_GATE:-}" != "true" ]; then' | cut -d: -f1)
    r12_verify_decision_ln=$(printf '%s\n' "$r12_verify_block" | grep -nxF '          if [ -f .maintainer/decision.json ]; then' | cut -d: -f1)
    if [ -z "$r12_verify_deny_ln" ] || [ -z "$r12_verify_decision_ln" ] \
       || [ "$r12_verify_deny_ln" -ge "$r12_verify_decision_ln" ]; then
      r12_bad="${r12_bad} maintainer.yml(verify-denial-not-first)"
    fi
    # Functional pin for the verify lane (PR #698 rounds 5-7, finding 1):
    # the static pins kept passing shape-preserving mutations that silently
    # restored the hollow green (final `exit 1` swapped or deleted, an early
    # `exit 0`, an inserted `AGENT_GATE=true` that reds every denial, or an
    # outcome-keyed early exit for one outcome value), so execute the real
    # extracted run body under bash -e across the FULL production outcome
    # matrix inside a production-shaped env (as in the R19 harness). Every
    # case varies BOTH AGENT_GATE and AGENT_OUTCOME, and all four Action
    # outcome values (success, failure, cancelled, skipped; a denial's agent
    # step is skipped, a gate-allowed pre-agent setup failure is skipped too)
    # are exercised in both gate states, so any outcome-keyed branch changes
    # at least one case's exit code or notice. A no-op or truncated
    # extraction fails the notice/error assertions, so this cannot be
    # satisfied by text alone.
    r12_vsbx=$(mktemp -d) || r12_vsbx="/tmp/r12-verify-$$"
    r12_verify_run=$(printf '%s\n' "$r12_verify_block" | awk '
      /^[[:space:]]*run: \|/ { f=1; next }
      f { sub(/^          /, ""); print }
    ')
    # Structural pin (PR #698 round 7): the verify lane may depend only on the
    # gate output, the agent outcome, and the workspace decision file. Any
    # other variable reference or command substitution would key the lane on
    # ambient context (an inserted `[ -n "${GITHUB_EVENT_NAME:-}" ]` branch
    # silently restored the hollow green in production while the harness,
    # which does not set that var, stayed green). A future legitimate edit
    # must extend the allowlist with review.
    r12_verify_vars=$(printf '%s\n' "$r12_verify_run" | grep -oE '[$][{]?[A-Za-z_][A-Za-z0-9_]*' | sed 's/^[$][{]*//' | sort -u | grep -vE '^(AGENT_GATE|AGENT_OUTCOME)$' || true)
    [ -z "$r12_verify_vars" ] || r12_bad="${r12_bad} maintainer.yml(verify-ambient-env:$(printf '%s' "$r12_verify_vars" | tr '\n' ';'))"
    # Stronger structural pin: after removing the ONLY two allowed references,
    # any remaining `$` or backtick is an unexpected shell token. This closes
    # the spellings the name-list above cannot see ($0 differs between the
    # harness and a production temp script; $?/$#; ${!var} indirect
    # expansion; command substitution; backticks).
    r12_verify_stripped=$(printf '%s\n' "$r12_verify_run" | sed -e 's/${AGENT_GATE:-}/ /g' -e 's/$AGENT_OUTCOME/ /g')
    if printf '%s\n' "$r12_verify_stripped" | grep -q '[$`]'; then
      r12_bad="${r12_bad} maintainer.yml(verify-unexpected-shell-token)"
    fi
    r12_case() {
      rm -rf "$r12_vsbx/ws"; mkdir -p "$r12_vsbx/ws/.maintainer"
      if [ "$2" = "present" ]; then : > "$r12_vsbx/ws/.maintainer/decision.json"; fi
      local got out
      out=$(cd "$r12_vsbx/ws" && env -i PATH="$PATH" HOME="$r12_vsbx" CI=true GITHUB_ACTIONS=true GITHUB_REPOSITORY="RandomLabs/RandomLabs" GITHUB_EVENT_NAME=issue_comment GITHUB_ACTOR=github-actions\[bot\] AGENT_GATE="$1" AGENT_OUTCOME="${5:-success}" bash -e -c "$r12_verify_run" 2>&1)
      got=$?
      if [ "$got" != "$3" ] || ! printf '%s\n' "$out" | grep -qE "$4"; then
        r12_bad="${r12_bad} maintainer.yml(verify-lane-behavior:$1/$2/${5:-success}:exit=$got)"
      fi
    }
    r12_case false absent 0 '::notice::Actor write gate skipped the Maintainer agent' success
    r12_case false absent 0 '::notice::Actor write gate skipped the Maintainer agent' failure
    r12_case false absent 0 '::notice::Actor write gate skipped the Maintainer agent' skipped
    r12_case false absent 0 '::notice::Actor write gate skipped the Maintainer agent' cancelled
    r12_case false present 0 '::notice::Actor write gate skipped the Maintainer agent' skipped
    r12_case true present 0 'Maintainer decision contract present' success
    r12_case true present 0 'Maintainer decision contract present' failure
    r12_case true present 0 'Maintainer decision contract present' skipped
    r12_case true present 0 'Maintainer decision contract present' cancelled
    r12_case true absent 1 '::error::Maintainer agent finished' success
    r12_case true absent 1 '::error::Maintainer agent finished' failure
    r12_case true absent 1 '::error::Maintainer agent finished' skipped
    r12_case true absent 1 '::error::Maintainer agent finished' cancelled
    # Byte-exact code pin (PR #698 round 7, blocking finding 4): the
    # behavioral harness runs hermetically, so it cannot see ambient context
    # read without a `$` expansion (an inserted `[ -d .git ]`, `[ -d .github ]`,
    # `env | grep GITHUB_SHA`, or `pwd` predicate restored the hollow green in
    # production while the harness stayed green). Comments stay editable: the
    # executable lines, comment and blank lines stripped, must equal the
    # reviewed lane exactly.
    r12_verify_code=$(printf '%s\n' "$r12_verify_run" | grep -vE '^[[:space:]]*#' | grep -vE '^[[:space:]]*$')
    r12_verify_code_expected=$(cat <<'R12VERIFY'
if [ "${AGENT_GATE:-}" != "true" ]; then
  echo "::notice::Actor write gate skipped the Maintainer agent (issue #428): denial is not a crash - no agent run, no noise comment, no red, no self-heal, no /oc maintainer escalation."
  exit 0
fi
if [ -f .maintainer/decision.json ]; then
  echo "Maintainer decision contract present (outcome '$AGENT_OUTCOME')."
  exit 0
fi
echo "::error::Maintainer agent finished with outcome '$AGENT_OUTCOME' and no .maintainer/decision.json (model-resolution death, provider error, or crash). Failing loudly instead of concluding green without triage."
exit 1
R12VERIFY
)
    [ "$r12_verify_code" = "$r12_verify_code_expected" ] || r12_bad="${r12_bad} maintainer.yml(verify-lane-code-changed)"
    rm -rf "$r12_vsbx"
  fi
  for r12_step in "${r12_main_steps[@]}"; do
    r12_step_block=$(r12_main_block "$r12_step")
    if [ "$(printf '%s\n' "$r12_step_block" | grep -cE '^[[:space:]]*if:' || true)" != "1" ] \
       || ! printf '%s\n' "$r12_step_block" | grep -qxF "        if: always() && steps.actor_gate.outputs.run == 'true'"; then
      r12_bad="${r12_bad} maintainer.yml(step-not-gated:$(printf '%s' "$r12_step" | cut -d' ' -f1-2))"
    fi
  done
  # Generic PAT containment (PR #698 round 3, observation 2): the explicit
  # list above cannot see a newly inserted side-effect step, so pin the
  # stronger invariant directly: EVERY step block that reaches the owner PAT
  # must carry the exact gate condition. An ungated PAT-touching step trips
  # this even before its author extends the list.
  r12_pat_ungated=""
  while IFS= read -r r12_pat_name; do
    r12_pat_block=$(r12_main_block "$r12_pat_name")
    printf '%s\n' "$r12_pat_block" | grep -qF 'OPENCODE_PAT' || continue
    printf '%s\n' "$r12_pat_block" | grep -qxF "        if: always() && steps.actor_gate.outputs.run == 'true'" \
      || r12_pat_ungated="${r12_pat_ungated} [${r12_pat_name}]"
  done < <(grep '^      - name: ' "$r12_main_wf" | sed 's/^      - name: //')
  [ -z "$r12_pat_ungated" ] || r12_bad="${r12_bad} maintainer.yml(pat-step-ungated:${r12_pat_ungated})"
  # Whole-file PAT containment (PR #698 rounds 5-7, observation plus the
  # round-7 job-key-order and workflow-level-env escapes): the name-keyed
  # sweep only sees named step blocks, so a job- or workflow-level
  # `env: X: ${{ secrets.OPENCODE_PAT }}` (or the bracket spelling
  # `secrets['OPENCODE_PAT']`) plus a later ${{ env.X }} indirection could
  # hand the owner PAT to an ungated step. Match the bare `OPENCODE` stem
  # (catches the bracket spelling and any decoded-underscore variant the text
  # pins cannot see), require the line to be step-indented (>= 8 spaces; a
  # 4-space job key or 0-space workflow key is outside any step regardless of
  # key order), and attribute it to the nearest preceding named step (that
  # block is then covered by the sweep above).
  r12_pat_outside=""
  while IFS= read -r r12_pat_ln; do
    [ -n "$r12_pat_ln" ] || continue
    r12_pat_indent=$(awk -v n="$r12_pat_ln" 'NR==n { match($0, /^[ ]*/); print RLENGTH }' "$r12_main_wf")
    if [ "${r12_pat_indent:-0}" -lt 8 ]; then
      r12_pat_outside="${r12_pat_outside} line${r12_pat_ln}"
      continue
    fi
    r12_pat_owner=$(awk -v n="$r12_pat_ln" 'NR <= n && /^      - name: / { name = substr($0, 15) } NR == n { print name }' "$r12_main_wf")
    [ -n "$r12_pat_owner" ] || r12_pat_outside="${r12_pat_outside} line${r12_pat_ln}"
  done < <(grep -n 'OPENCODE' "$r12_main_wf" | cut -d: -f1)
  [ -z "$r12_pat_outside" ] || r12_bad="${r12_bad} maintainer.yml(pat-outside-step:${r12_pat_outside})"
fi
if [ -z "$r12_bad" ]; then
  check "R12" "every opencode-run agent workflow (and the maintainer inline runner, issue #696) fails closed behind the shared actor-write gate: gate invoked on bash, agent wired to the gate output, maintainer verify carries the terminal denial outcome and is executed across the full success/failure/cancelled/skipped outcome matrix with only AGENT_GATE/AGENT_OUTCOME readable (no other shell token, no backtick) and its executable code pinned byte-exact, every post-gate maintainer side-effect step is gated on the same output, every owner-PAT occurrence sits inside a gated step-indented line, no YAML anchor/alias/complex-key/escape indirection exists, and neither the gate, the verify step, nor the maintainer job (with no job- or workflow-level env) tolerates or bypasses failure under any YAML key spelling or non-bash shell" "ok"
else
  check "R12" "actor-write gate coverage missing:${r12_bad} (issues #428/#696: an unprivileged comment can launch an agent and its owner-PAT retry launders the actor; a bot pull_request event reds the maintainer run and posts a noise comment)" "bad"
fi

# [R13] Bot-created triage parity (issue #450): content created with
# GITHUB_TOKEN never emits issues/pull_request opened events, so a
# bot-created issue sat untriaged for ~3h until a human pinged it (#449).
# Two properties: maintainer.yml's create_issue path must self-dispatch a
# workflow_dispatch maintainer run carrying the new issue number (PAT-backed,
# since the bot token's own runs complete silently), and the Maintainer prompt
# must carry the UNTRIAGED sweep rule so any later run routes stragglers even
# if the self-dispatch misfires.
r13_bad=""
MAIN_WF=".github/workflows/maintainer.yml"
MAINT_PROMPT=".github/agents/maintainer.md"
if [ ! -f "$MAIN_WF" ]; then
  r13_bad=" maintainer.yml(missing)"
else
  grep -q 'SELF-TRIAGE (issue #450)' "$MAIN_WF" || r13_bad="${r13_bad} maintainer.yml(no-self-triage-marker)"
  grep -q 'gh.*workflow.*run.*maintainer.yml' "$MAIN_WF" || r13_bad="${r13_bad} maintainer.yml(no-maintainer-redispatch)"
fi
if [ ! -f "$MAINT_PROMPT" ]; then
  r13_bad="${r13_bad} maintainer.md(missing)"
elif ! grep -q 'UNTRIAGED' "$MAINT_PROMPT"; then
  r13_bad="${r13_bad} maintainer.md(no-UNTRIAGED-sweep-rule)"
fi
if [ -z "$r13_bad" ]; then
  check "R13" "bot-created issues/PRs self-dispatch maintainer triage and the prompt sweeps UNTRIAGED stragglers" "ok"
else
  check "R13" "bot-created triage parity missing:${r13_bad} (issue #450: a bot-created issue idles with no opened event until a human pings it)" "bad"
fi

# [R14] Heterogeneous group queue preservation (issues #594, #601): a group
# that serializes heterogeneous work (real triggers together with runs that
# skip at their job gate) must not rely on the default single pending slot,
# because GitHub cancels any previously PENDING run in the same group when a
# newer run is queued (cancel-in-progress: false protects only the RUNNING
# run). Two live losses: the per-OS Windows arm of #582 (run 39021803178 had
# zero jobs, issue #594) and the forwarded /oc review on PR #593 (run
# 39028030013) plus the forwarded /oc fix on PR #592 (run 39028202649), each
# displaced by a skip-only comment run landing behind it (issue #601).
# Every comment-triggered workflow whose issue_comment arm spawns a run for
# EVERY comment must carry `queue: max` on its workflow-level group: opencode,
# opencode-review, opencode-test, opencode-eval, lab, ideate, curator,
# auditor, opencode-recover, plus opencode-peros-test for the per-OS arms
# (whose three job-level per-OS groups must also exist; a workflow-level
# block may be absent there because the job groups alone serialize each arm).
# maintainer.yml is deliberately OUT of the cohort: its triggers are
# homogeneous (every run re-surveys fresh, the newest state wins) and a queue
# there would accumulate a FIFO backlog of stale schedule ticks, so it must
# keep its explicit "superseding by design" marker and must NOT grow a queue.
# No cohort group may cancel in progress.
# Workflow-level block = the column-0 `concurrency:` mapping. A same-name
# job-level `concurrency:` is indented, so it never matches the anchor. Any
# column-0 line ends the mapping, including a comment: otherwise a top-level
# comment after the block containing the marker text would satisfy the
# maintainer/discovery checks even after the in-block marker was removed
# (issue #601 review finding 2).
wf_concurrency_block() {
  awk '
    /^concurrency:/ { inblk=1 }
    inblk && /^[^[:space:]]/ && !/^concurrency:/ { exit }
    inblk { print }
  ' "$1" || true
}
PEROS_WF=".github/workflows/opencode-peros-test.yml"
r14_bad=""
if [ ! -f "$PEROS_WF" ]; then
  r14_bad=" ${PEROS_WF}(missing)"
else
  peros_wf_block=$(wf_concurrency_block "$PEROS_WF")
  if [ -n "$peros_wf_block" ] && ! printf '%s\n' "$peros_wf_block" | grep -qE '^[[:space:]]+queue:[[:space:]]*"?max"?'; then
    r14_bad="${r14_bad} peros(workflow-group-without-queue-max)"
  fi
  for peros_os in linux macos windows; do
    grep -q "opencode-peros-${peros_os}-" "$PEROS_WF" || r14_bad="${r14_bad} peros(no-${peros_os}-job-group)"
  done
  peros_cancel_true=$(grep -nE 'cancel-in-progress:\s*true' "$PEROS_WF" || true)
  [ -n "$peros_cancel_true" ] && r14_bad="${r14_bad} peros(cancel-in-progress-true)"
fi
for r14_wf in opencode.yml opencode-review.yml opencode-test.yml opencode-eval.yml lab.yml ideate.yml curator.yml auditor.yml opencode-recover.yml; do
  r14_path=".github/workflows/${r14_wf}"
  if [ ! -f "$r14_path" ]; then
    r14_bad="${r14_bad} ${r14_wf}(missing)"
    continue
  fi
  r14_block=$(wf_concurrency_block "$r14_path")
  if [ -z "$r14_block" ]; then
    r14_bad="${r14_bad} ${r14_wf}(no-workflow-group)"
  elif ! printf '%s\n' "$r14_block" | grep -qE '^[[:space:]]+queue:[[:space:]]*"?max"?'; then
    r14_bad="${r14_bad} ${r14_wf}(no-queue-max)"
  fi
  r14_cancel_true=$(grep -nE 'cancel-in-progress:\s*true' "$r14_path" || true)
  [ -n "$r14_cancel_true" ] && r14_bad="${r14_bad} ${r14_wf}(cancel-in-progress-true)"
done
if [ ! -f "$MAIN_WF" ]; then
  r14_bad="${r14_bad} maintainer.yml(missing)"
else
  main_block=$(wf_concurrency_block "$MAIN_WF")
  printf '%s\n' "$main_block" | grep -qF 'superseding by design' || r14_bad="${r14_bad} maintainer.yml(no-superseding-decision-marker)"
  # Anchored to the key form so the marker comment's own prose (which mentions
  # queue: max while explaining why it is wrong there) never trips the check.
  printf '%s\n' "$main_block" | grep -qE '^[[:space:]]+queue:[[:space:]]*"?max"?' && r14_bad="${r14_bad} maintainer.yml(queue-max-contradicts-superseding-decision)"
fi
# Discovery backstop (R12-style whole-tree scan): EVERY workflow that grows an
# issue_comment or pull_request_review_comment arm is subject to the same rule
# automatically, so a new comment-triggered workflow cannot silently regress;
# the scan covers both workflow extensions GitHub executes (.yml and .yaml,
# issue #601 review finding 3), and a deliberate homogeneous single-slot group
# records the explicit "superseding by design" marker inside its concurrency
# block.
for r14_path in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$r14_path" ] || continue
  r14_name=$(basename "$r14_path")
  grep -qE '^  (issue_comment|pull_request_review_comment):' "$r14_path" || continue
  r14_block=$(wf_concurrency_block "$r14_path")
  if printf '%s\n' "$r14_block" | grep -qF 'superseding by design'; then
    continue
  fi
  if [ -z "$r14_block" ]; then
    r14_bad="${r14_bad} ${r14_name}(discovered-no-workflow-group)"
  elif ! printf '%s\n' "$r14_block" | grep -qE '^[[:space:]]+queue:[[:space:]]*"?max"?'; then
    r14_bad="${r14_bad} ${r14_name}(discovered-no-queue-max)"
  fi
done
if [ -z "$r14_bad" ]; then
  check "R14" "heterogeneous groups cannot silently displace a queued real run: the whole comment-triggered cohort (plus any discovered issue_comment workflow) carries queue: max, all three per-OS job groups exist, and maintainer keeps its documented single-slot superseding decision (issues #594/#601)" "ok"
else
  check "R14" "heterogeneous group queue preservation missing:${r14_bad} (issues #594/#601: the default single pending slot cancels a queued real run)" "bad"
fi

# [R15] Model fallback ladder (issue #591): a provider-side retirement of the
# shared model pin used to kill every arm at once (including the Maintainer
# that would dispatch the repair), and Model-not-found deaths concluded their
# runs green (hollow green: `continue-on-error` plus no verify step), so
# workflow_run failure triage never fired. Properties:
#   1. the shared resolver exists and resolves against the live registry,
#      defaulting to the ladder file next to it, and degrades to pass-through
#      on a registry outage or an unparseable registry body (never blocks);
#   2. the ordered ladder exists, is non-empty, and every rung is a
#      free-tier model ref (a paid rung would trip the R6 free-tier guard);
#   3. the shared composite action calls the resolver, retries per rung on a
#      boundary-aware provider "Model not found" match (prose quoting a
#      different retired id must never advance the ladder), anchors the
#      exit-0 decision to the provider's terminal error line in the log tail
#      so a transcript echo of the phrase never advances a healthy run,
#      fails loudly when the log capture itself fails, and exits nonzero
#      after the last rung;
#   4. maintainer.yml (the arm that would otherwise dispatch the repair)
#      invokes the resolver, wires the candidate chain, carries the same
#      boundary-aware retry, exit-0 terminal anchoring, and tee-guard, and
#      has the verify step that tests for .maintainer/decision.json and goes
#      red without it;
#   5. the general arm (which had no verify step) carries its loud-failure
#      verify, and maintainer.yml plus the composite still expose the
#      loud-exhaustion marker;
#   6. issue #620: both runner paths carry a bounded transient-free-tier
#      retry: a FreeTierError terminal line (detected with the same tail +
#      column-0 anchoring as the #591 exit-0 detector, so a transcript echo
#      or the responseBody JSON envelope never matches) retries the SAME
#      model exactly once per arm, a second rejection fails loudly. A
#      functional test executes both extracted real detectors against the
#      incident's terminal lines (match) and echo / envelope / trailing-suffix
#      / stale-beyond-tail / superset-id forms (no match), plus the dotted-id
#      boundary pair (a real dotted rung id matches, its lookalike with the
#      dot position held by another character never does; review round F8)
#      and the tail-window lower-bound pair (a terminal line with 39 trailing
#      lines, 40 total, must still match; with 40 trailing lines, 41 total,
#      must fall out of the window, so a silently narrowed window fails the
#      must-match fixture and a widened one fails the must-not-match; review
#      round A2), and a LOOP-LEVEL behavioral test extracts each runner's
#      real `run:` block and executes it in an isolated sandbox against an
#      executable mock `opencode` plus a mock `sleep`, asserting the whole
#      contract by behavior: transient recovery on BOTH exit shapes with the
#      bounded backoff asserted exactly (one recorded sleep, value `sleep 15`,
#      so a decoy or a different sleep value fails; review round F6), exactly
#      one same-model retry, persistent rejection loud after exactly two
#      attempts and propagating the provider's own status across distinct
#      values (so a hardcoded exit can never pass), rung advance preserved
#      for Model-not-found, a Model-not-found advance consuming NO free-tier
#      budget (a later free-tier rejection on the advanced rung still retries
#      once; review round F8), the post-loop loud exhaustion actually reached
#      and asserted loud (an all-MNF ladder must exit nonzero with the
#      exhaustion message; review round F7), the budget shared across rungs,
#      an indented or quoted echo, a trailing suffixed line and a stale line
#      past the tail window never consuming the retry, a terminal line still
#      inside the window (3 trailing lines) honoring the retry (review round
#      A2), a superset model id never matching the boundary regex, a dotted
#      candidate whose dot-lookalike nonzero Model-not-found line must NOT
#      advance the rung (review round F8), a failing log capture (mock `tee`
#      exits 3) failing loudly instead of blind-advancing (review round A1),
#      and unclassified status propagation - with a per-scenario timeout so
#      any unbounded-retry re-spelling (decoys, relocations, loop rewrites)
#      fails the rule. Static anchored counts remain only as cheap
#      element-presence tripwires (review F5:
#      order/reachability cannot be expressed textually, so three rounds of
#      pin escapes landed until the guard executed the real blocks itself;
#      the round-F5 adversarial verdict's six escape classes - suffix
#      loosening, whole-log MNF match, stale tail window, prefix id regex,
#      constant exits, removed exit-0 backoff - are each covered by a
#      dedicated fixture or scenario).
#   7. issue #653: both runner paths also carry (a) a bounded transient
#      HTTP-error retry: an anchored 429/5xx terminal line (observed forms
#      `AI_APICallError: Rate limit exceeded. Please try again later.` and
#      `AI_APICallError: Internal Server Error`, plus the standard gateway
#      phrases; the `AI_RetryError: Failed after 3 attempts. ...` summary,
#      any transcript echo, and the responseBody envelope never match)
#      retries the SAME model exactly once per arm before failing loudly
#      (backoff `sleep 30`, value-scoped and wait-ordered in the harness so a
#      backgrounded or revalued wait cannot pass), and (b) a provider-stall
#      watchdog: the attempt's captured log is polled for growth
#      (HANG_IDLE_SECONDS / HANG_POLL_SECONDS, default 600/30, overridable
#      only by process env for this harness; no declarative workflow or
#      action YAML may map either key, review round 17) and a stalled attempt
#      is TERM/KILLed and
#      retried once on the SAME model (backoff `sleep 10`), a second stall
#      failing loudly. The FIFO capture shape keeps opencode and tee as
#      separate known PIDs (each waited separately); when mkfifo is
#      unavailable (some Windows Git Bash environments) the runner degrades
#      LOUDLY to the legacy inline pipeline without the watchdog instead of
#      bricking the arm, and the behavioral matrix exercises both shapes
#      (the degraded shape must still honor the bounded freetier and HTTP
#      retry contracts with loud persistence and rung advance). The #653
#      detector is executed functionally like the
#      #591/#620 pair (terminal/phrase matches; echo / envelope / suffix /
#      phrase-variant / uppercase / AI_RetryError-summary / stale no-match;
#      the tail-window lower-bound pair), and the behavioral matrix adds
#      HTTP recovery on both exit shapes, persistent HTTP loud on both
#      shapes, stall kill + same-model retry, a second stall loud, per-class
#      budget independence in both directions (a consumed HTTP budget leaves
#      the stall budget available; a stall leaves the HTTP budget
#      available), the no-mkfifo degraded shape still honoring the
#      freetier restart/retry contract, and the budget/invocation count
#      checks that bind both invocation sites to the extracted executing
#      step. Review F1/F2 land the same pass: every detector pipeline is
#      wrapped `( set +o pipefail; ... )` because production runs
#      `bash --noprofile --norc -eo pipefail` and a `grep -q` early exit can
#      SIGPIPE `tail` (141) whenever the 40-line window exceeds the 64 KiB
#      pipe buffer, silently masking a terminal line; the detector fixtures
#      therefore include a ~160 KiB match-first window and execute under
#      `set -o pipefail`, the behavioral blocks execute under the exact
#      production shell form, and one behavioral scenario replays the
#      160 KiB window end-to-end. Review F3 clamps both watchdog knobs to
#      sane positive bounds (`-ge 1`, idle `-le 86400`, overflow-safe) so a
#      0-poll busy loop or an integer-overflow value can never silently
#      disable the watchdog; a behavioral scenario exercises poll=0.
#      Tester round 2 closed a test-integrity hole: the free-tier budget's
#      cross-rung sharing was enforced behaviorally (deep-grant/deep-advance),
#      but the HTTP and stall budgets' arm-wide placement (all three counters
#      initialize once before the rung loop) was only a documented contract,
#      so relocating `transient_retry_used=0` / `hang_retry_used=0` into the
#      loop body silently passed (23/0). Four cross-rung scenarios now bind
#      all three budgets the same way: grant variants (rung 1 spends the
#      single retry, a Model-not-found advances, and a second terminal/stall
#      on rung 2 must be loud persistent with exactly one backoff - a
#      per-rung reset spends a second backoff and runs an extra attempt) and
#      advance variants (a rung-1 Model-not-found must not gate the retry
#      away from a later rung). R15 therefore fails on a relocation of
#      either counter into the loop body in either runner path.
#      Tester round 3 closed the last blind spot in that class: the degraded
#      no-mkfifo branch had no persistent-error and no cross-rung scenario,
#      so an arithmetic budget reset inserted there
#      (`freetier_retry_used=$((0))` after the mkfifo warning, a form the
#      literal count pins cannot see) turned the bounded retry into an
#      unbounded loop while the audit still read 23/0. `nofifo-persistent`
#      (a persistently rejecting free-tier provider must fail loudly after
#      exactly two attempts and one 15s backoff) and
#      `nofifo-http-deep-grant` (a rung-1 429 spends the retry, a
#      Model-not-found advances, and a second 429 on rung 2 must be loud
#      persistent with exactly one 30s backoff) now bind the degraded shape
#      the same way, and a static pin asserts the degraded else branch never
#      touches a retry-budget counter.
#      Tester round 4 closed three remaining blind classes. (a) The degraded
#      no-mkfifo branch's status/tee/stderr plumbing was unbound: `status`,
#      `tee_status`, the PIPESTATUS capture, and the `2>&1` merge are only
#      observably wrong on shapes the terminal-classified nofifo scenarios
#      never exercised, so `status=0` / `status="${st[1]}"` concluded silent
#      green on an unclassified death, `tee_status=0` / a masked PIPESTATUS
#      swallowed a failing degraded tee, and removing `2>&1` lost a
#      stderr-borne terminal line so the bounded retry silently vanished.
#      `nofifo-unclassified` (a nonzero unclassified degraded death must stay
#      loud with its own status), `nofifo-teefail` (a failing tee in the
#      degraded pipeline must fail loudly) and `nofifo-stderr-ft` (the
#      `2>&1` merge must carry a stderr terminal line into the log so the
#      free-tier retry still fires) bind that plumbing. (b) A cross-class
#      budget reset (an arithmetic `..._retry_used=$((0))` inside ANOTHER
#      class's retry branch, e.g. next to `freetier_retry_used=1`) evaded
#      both the literal count pins and every single-class scenario, so six
#      class-interleave scenarios repeat a class after another class's retry
#      was consumed (`mixed`, `mixed-nz`, `hang-mixed`, `hang-mixed-nz`,
#      `ft-hang-http`, `ft-hang-http-nz`) and cover every (resetting site,
#      reset budget) pair in both exit shapes of the FT and HTTP branches
#      plus the hang branch: the shipped code must fail loudly at the repeat,
#      while the reset spends an extra backoff and runs an extra attempt.
#      (c) The HTTP/stall deep pairs only reached rung 2, so a widening or
#      theft gated on rung 3 escaped; `widened`, `widened-advance`,
#      `hang-widened` and `hang-widened-advance` mirror the free-tier deep
#      pair at rung depth 3 (three candidates) for both budgets.
#      Tester round 5 closed three more blind classes. (a) The FIFO capture
#      shape's `2>&1` stderr merge (the primary shape, whose degraded
#      counterpart `nofifo-stderr-ft` already existed) was unbound: dropping
#      it sends a stderr-borne terminal line to the step output instead of
#      the captured log, so the exit-0 variant concludes silent green with no
#      retry and the nonzero variant loses the retry as unclassified.
#      `fifo-stderr-ft` / `fifo-stderr-ft0` bind it. (b) The watchdog's
#      silence accounting was unbound: `idle += 1` or a non-accumulating
#      `idle=$((hang_poll_seconds))` never reaches the threshold at the
#      production cadence, a zeroed byte-size read kills a live producer, and
#      dropping the re-arm (`last_size=$size`) means a post-output silence
#      never accumulates. `hang-poll-slow` (30s poll cadence, 90s threshold:
#      exactly three polling rounds must accumulate), `hang-active` (a
#      producing attempt past the threshold must not be killed) and
#      `out-then-hang` (one line, then silence: the re-arm is what lets the
#      threshold fire) bind them. (c) The NONZERO Model-not-found advance was
#      the last unbound budget-reset site: an arithmetic reset inserted there
#      (`transient_retry_used=$((0))` or the stall/free-tier analogue)
#      resurrects a spent budget on the next rung, so a persistent death
#      loops one extra bounded retry. `mnf-nz-mixed`, `ft-mnf-nz` and
#      `hang-mnf-nz` spend one budget, advance via that branch, and require
#      the repeat to be loud persistent with exactly one backoff. Exact-form
#      static pins on the stderr merge and the three watchdog arithmetic
#      sites were added as cheap tripwires; the semantics stay behavioral.
#      Review round 8 closed the last blind spot of that class: the round-5
#      mirrors advance through the nonzero-MNF branch only on rung 1, so a
#      reset GATED on a later rung (`[ "$model" != "${candidates%% *}" ] &&
#      transient_retry_used=$((0))` inserted after the advance warning) still
#      escaped in both runner paths. `mnf-nz-deep`, `ft-mnf-nz-deep` and
#      `hang-mnf-nz-deep` mirror the three budgets at rung depth 3: advance
#      via that branch on rungs 1 and 2, spend the single retry on rung 2,
#      and require the rung-3 repeat to be loud persistent with exactly one
#      backoff, so a rung-gated reset at the second advance spends a second
#      backoff and runs an extra c-free attempt.
#      Tester round 7 closed the fire-block ordering class: the watchdog's
#      escalation block was pinned by presence and count only, so a TERM/KILL
#      swap or the grace sleep moved before the first TERM or after the last
#      KILL kept R15 green while KILL landed before or back-to-back with
#      TERM, destroying the window in which a TERM-trapping opencode can
#      finish its cleanup. A normalized ordered pin over the escalation
#      lines, a `term-grace` behavioral scenario (traps TERM, can only
#      complete its cleanup through the real 5s grace, writes a marker a
#      reordered fire block can never produce), and exact pins on the
#      watchdog's loop gate plus post-sleep liveness re-check closed it.
#      Tester round 8 closed the last completeness class: the round-7 pin
#      filtered the extracted region down to the five escalation steps, so an
#      unknown line spliced between or around them (`sleep 1d` before the
#      first TERM or after the grace, a shadowed `if false; then ... fi`
#      around a KILL, an extra early kill) kept R15 green while the abort
#      window grew or the KILL escalation was neutered. The whole-region pin
#      now normalizes every line of the extracted block (leading/trailing
#      whitespace, an optional trailing `2>/dev/null`, blank lines) and
#      requires it to be EXACTLY the hang-flag write, the five steps in
#      order, and the success exit, nothing else; `hang-child-ignores-term`
#      binds the KILL behaviorally (an attempt that ignores TERM survives
#      until SIGKILL, so a neutered KILL blocks into the scenario timeout).
#      Review round 12 closed the wider completeness class around it: the
#      round-8 pin anchored its region at the hang-flag write, so a line
#      spliced anywhere else in the watchdog subshell (before the baseline
#      read, after the poll sleep, after the post-sleep liveness re-check,
#      between the idle accumulation and the threshold, between the threshold
#      and the warning echo, in the re-arm else branch) delayed the abort by
#      up to a day at the production defaults with R15 still green. The
#      whole-subshell pin requires the entire watchdog subshell to be exactly
#      the shipped loop: baseline read, poll, liveness checks, silence
#      accounting, fire block, and re-arm, nothing else. Review round 13
#      closed the window immediately outside it: the round-12 pin spanned
#      only the bare subshell open/close pair, so a line spliced at the
#      launch/reap path around it (before the `(`, after the `) &`, after
#      the watch_pid assignment, after the oc reap and status capture,
#      before the tee launch) delayed the watchdog launch, the reap, or the
#      whole capture pipeline by a day at the production defaults with R15
#      still green. The pin now spans the whole FIFO capture prelude from
#      the `if mkfifo` branch line through the branch's closing `set -e`:
#      the tee launch, the opencode launch, the subshell, the reap, and the
#      cleanup, nothing else (comment and blank lines dropped).
#      Review round 14 closed the whole-block residual: every pin above is
#      an exact region INSIDE the runner block, so a line spliced anywhere
#      else in it (the pre-attempt header, the degraded no-mkfifo else
#      branch, the post-`fi` classification/retry/budget logic) stayed green
#      while the block's behavior changed (six one-line `sleep 1d`
#      insertions at exactly those sites kept the parent at 23/0). Each
#      runner's ENTIRE extracted `run:` block is now pinned line-exact
#      against its regenerated literal (normalized like the region pins:
#      leading/trailing whitespace and an optional trailing `2>/dev/null`
#      stripped, comment and blank lines dropped), so any inserted or
#      modified non-comment line anywhere in the block fails
#      `${label}(run-block-not-exact)` alone; the region pins above remain
#      for precise failure labels.
r15_bad=""
# Review round 18 (issue #653 test integrity): every R15 step/run-block pin
# used to extract its subject textually, so a block scalar carrying a decoy
# `run: |` (for example inside the runner step's `env.PROMPT`) could win the
# extraction while the real step hid behind the valid `run: |2` spelling, and
# the step-key checks (an explicit `? if` / `: false`, an explicit
# `? HANG_IDLE_SECONDS` / `: "86400"`) never saw a key written in YAML
# explicit-key syntax even though GitHub Actions reads it exactly like the
# block spelling. The runner step, its `run` scalar, its key set, its env
# mapping, the resolver step, and the two verify steps are now resolved
# STRUCTURALLY with python3 + PyYAML (preinstalled on the auditor runner,
# same precedent as R18). A strict loader rejects duplicate mapping keys, so
# a second `run`/`if`/`shell` key can never silently override the audited
# one; parsing failures, a missing/duplicated runner step, and a missing
# python runtime all fail closed. The extracted `run` scalars are written to
# a private directory for the whole-block exact pin and the behavioral
# harness, so no textual decoy can ever become the audited body.
# Review round 19 (issue #653 test integrity): round 18 bound the verify
# steps' run BODIES but not their declarative keys, so a step-level
# `continue-on-error: true`, an `if: false`, or a hardcoded
# `AGENT_OUTCOME: success` hollow-greened or skipped the loud-failure
# verifies at a green audit. Each verify step's key surface is now bound
# structurally: exactly one `continue-on-error`-free step matching the
# name prefix, its exact `if` expression, an env mapping that is exactly
# `AGENT_OUTCOME` with the exact agent-step outcome expression, and no
# `shell`, `timeout-minutes`, or `working-directory` override (the
# Maintainer step's `shell: bash` is required exactly as shipped).
# Review round 20 (issue #653 test integrity): round 19 bound the verify
# steps but not their enclosing jobs, so a job-level `continue-on-error:
# true` (hollow-greens the whole run), a job-level `if: false` (silently
# skips the tick), or a job-level `defaults.run.shell` override (the
# general verify must carry no step shell, so the job default would
# execute its body as `true <path>`) kept the audit green. Each verify
# job is now bound structurally: its exact parsed `if` scalar (the
# shipped block scalars, trailing newline included), `runs-on:
# ubuntu-latest`, `timeout-minutes: 75`, the exact key set, and the
# absence of `continue-on-error`/`defaults`/`env`; neither workflow may
# carry workflow-level `defaults` or `env` either.
# Review round 21 (issue #653 test integrity): round 20 bound the verify
# jobs' key surface but not step-to-job CONTAINMENT. The extractor
# flattens every job's steps and resolves by name file-wide, so moving a
# bound step into a sibling job (a new `general-verify` or
# `maintainer-verify` job) kept the audit green: the moved step's pinned
# `if` references the old job's step outputs, which no longer exist, so
# GitHub silently skips it (and a sibling job could even hollow-green
# it). Each bound step is now required to live in its expected job:
# the Maintainer runner step and the Maintainer verify in `maintainer`,
# the general verify in `general`; the composite action-file runner step
# has no jobs (expected_job is None), and the file-wide uniqueness checks
# remain as defense in depth.
r15_struct_dir=$(mktemp -d 2>/dev/null || true)
if [ -z "$r15_struct_dir" ]; then
  r15_bad="${r15_bad} structural(mkdtemp-failed)"
else
  r15_struct_out=$(R15_STRUCT_DIR="$r15_struct_dir" python3 - <<'R15PY'
import glob
import os
import re
import sys

try:
    import yaml
except Exception as exc:
    sys.stdout.write("structural(python-runtime:no-pyyaml:%s)\n" % exc)
    raise SystemExit(0)

STRUCT = os.environ.get("R15_STRUCT_DIR", "")
KNOBS = {"HANG_IDLE_SECONDS", "HANG_POLL_SECONDS"}
# Review round 22 (issue #653 test integrity): the verify's AGENT_OUTCOME
# expression is bound by identity, so this pattern resolves its step id.
OUTCOME_EXPR = re.compile(
    r"^\$\{\{\s*steps\.([A-Za-z_][A-Za-z0-9_-]*)\.outcome\s*\}\}$"
)
problems = []

# Review round 20 (issue #653 test integrity): the verify steps' enclosing
# jobs and workflows are pinned too. These expected `if` values are the exact
# parsed scalars from the shipped files (block scalars, trailing newline
# preserved, no normalization or truncation). The job checks additionally
# bind runs-on, timeout-minutes, the exact key set, and the absence of
# continue-on-error/defaults/env, and reject workflow-level defaults/env.
EXPECTED_MAINTAINER_JOB_IF = "(github.event_name == 'workflow_run' && github.event.workflow_run.name != 'maintainer' && (github.event.workflow_run.conclusion == 'failure' || github.event.workflow_run.conclusion == 'timed_out')) ||\n(github.event_name != 'issue_comment' && github.event_name != 'workflow_run') ||\n(github.event_name == 'issue_comment' && github.event.comment.user.login != 'github-actions[bot]' &&\n !startsWith(github.event.comment.body, '/oc') &&\n !startsWith(github.event.comment.body, '/opencode')) ||\n(github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/oc maintainer'))\n"
EXPECTED_GENERAL_JOB_IF = "!startsWith(github.event.comment.body, '/oc review') &&\n!startsWith(github.event.comment.body, '/oc approve') &&\n!startsWith(github.event.comment.body, '/opencode review') &&\n!startsWith(github.event.comment.body, '/oc build') &&\n!startsWith(github.event.comment.body, '/opencode build') &&\n!startsWith(github.event.comment.body, '/oc continue') &&\n!startsWith(github.event.comment.body, '/opencode continue') &&\n!startsWith(github.event.comment.body, '/oc maintainer') &&\n!startsWith(github.event.comment.body, '/opencode maintainer') &&\n!startsWith(github.event.comment.body, '/oc test') &&\n!startsWith(github.event.comment.body, '/opencode test') &&\n!startsWith(github.event.comment.body, '/oc test-linux') &&\n!startsWith(github.event.comment.body, '/opencode test-linux') &&\n!startsWith(github.event.comment.body, '/oc test-macos') &&\n!startsWith(github.event.comment.body, '/opencode test-macos') &&\n!startsWith(github.event.comment.body, '/oc test-windows') &&\n!startsWith(github.event.comment.body, '/opencode test-windows') &&\n!startsWith(github.event.comment.body, '/oc architect') &&\n!startsWith(github.event.comment.body, '/opencode architect') &&\n!startsWith(github.event.comment.body, '/oc research') &&\n!startsWith(github.event.comment.body, '/opencode research') &&\n!startsWith(github.event.comment.body, '/oc plan') &&\n!startsWith(github.event.comment.body, '/opencode plan') &&\n!startsWith(github.event.comment.body, '/oc auditor') &&\n!startsWith(github.event.comment.body, '/opencode auditor') &&\n!startsWith(github.event.comment.body, '/oc lab') &&\n!startsWith(github.event.comment.body, '/opencode lab') &&\n!startsWith(github.event.comment.body, '/oc fix') &&\n!startsWith(github.event.comment.body, '/opencode fix') &&\n!startsWith(github.event.comment.body, '/oc recover') &&\n!startsWith(github.event.comment.body, '/opencode recover') &&\n!startsWith(github.event.comment.body, '/oc ideate') &&\n!startsWith(github.event.comment.body, '/opencode ideate') &&\n!startsWith(github.event.comment.body, '/oc curate') &&\n!startsWith(github.event.comment.body, '/opencode curate') &&\n!startsWith(github.event.comment.body, '/oc eval') &&\n!startsWith(github.event.comment.body, '/opencode eval') &&\n!startsWith(github.event.comment.body, '/oc design-ux') &&\n!startsWith(github.event.comment.body, '/opencode design-ux') &&\n!startsWith(github.event.comment.body, '/oc design-visual') &&\n!startsWith(github.event.comment.body, '/opencode design-visual') &&\n!startsWith(github.event.comment.body, '/oc design-motion') &&\n!startsWith(github.event.comment.body, '/opencode design-motion') &&\n!startsWith(github.event.comment.body, '/oc design') &&\n!startsWith(github.event.comment.body, '/opencode design') &&\n(contains(github.event.comment.body, ' /oc') ||\n startsWith(github.event.comment.body, '/oc') ||\n contains(github.event.comment.body, ' /opencode') ||\n startsWith(github.event.comment.body, '/opencode'))\n"


class StrictLoader(yaml.SafeLoader):
    pass


def strict_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        try:
            duplicate = key in mapping
        except TypeError:
            duplicate = False
        if duplicate:
            raise yaml.constructor.ConstructorError(
                None, None, "duplicate key %r" % (key,), key_node.start_mark
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


StrictLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, strict_mapping
)


def load(path):
    with open(path) as handle:
        return yaml.load(handle, Loader=StrictLoader)


def write_block(name, text):
    if not STRUCT:
        return
    with open(os.path.join(STRUCT, name), "w") as handle:
        handle.write(text)


def steps_of(doc):
    if isinstance(doc, dict) and isinstance(doc.get("runs"), dict):
        steps = doc["runs"].get("steps")
        return steps if isinstance(steps, list) else []
    jobs = doc.get("jobs") if isinstance(doc, dict) else None
    if not isinstance(jobs, dict):
        return []
    found = []
    for job in jobs.values():
        if isinstance(job, dict) and isinstance(job.get("steps"), list):
            found.extend(job["steps"])
    return found


def named_steps(steps, name):
    return [step for step in steps if isinstance(step, dict) and step.get("name") == name]


# Review round 21 (issue #653 test integrity): steps_of() flattens every job
# and drops the job ids, so a step moved out of its job into a sibling job
# stayed resolvable by name while its runtime gate (its `if` referencing
# steps of the old job, the job-level scope) was silently decoupled. This
# resolves the job that actually contains the step object, by identity.
def job_id_of_step(doc, step):
    jobs = doc.get("jobs") if isinstance(doc, dict) else None
    if not isinstance(jobs, dict):
        return None
    for job_id, job in jobs.items():
        if isinstance(job, dict) and isinstance(job.get("steps"), list):
            for candidate in job["steps"]:
                if candidate is step:
                    return job_id
    return None


def steps_of_job(doc, job_id):
    jobs = doc.get("jobs") if isinstance(doc, dict) else None
    job = jobs.get(job_id) if isinstance(jobs, dict) else None
    if isinstance(job, dict) and isinstance(job.get("steps"), list):
        return job["steps"]
    return []


def runner_key_hits(step, kind, gate_ok=False):
    hits = []
    if "if" in step:
        # Issue #696: the Maintainer runner is gated on the shared
        # actor-write gate. Exactly that one condition is allowed, and
        # only when the gate step it references is present in the file
        # (the same-file gate is asserted in runner_check).
        allowed = (
            kind == "maintainer"
            and step.get("if") == "steps.actor_gate.outputs.run == 'true'"
            and gate_ok
        )
        if not allowed:
            hits.append("run-step-conditional")
    env = step.get("env")
    if isinstance(env, dict) and (set(env) & KNOBS):
        hits.append("run-step-watchdog-env-override")
    if kind == "action":
        if "continue-on-error" in step:
            hits.append("run-step-continue-on-error")
        if "timeout-minutes" in step:
            hits.append("run-step-timeout-minutes")
    else:
        if step.get("continue-on-error") is not True:
            hits.append("run-step-continue-on-error-not-exact")
        if step.get("timeout-minutes") != 60:
            hits.append("run-step-timeout-minutes-not-exact")
    if step.get("shell") != "bash":
        hits.append("run-step-shell-not-bash")
    return hits


def runner_check(label, kind, path, step_name, block_name, expected_job=None):
    try:
        doc = load(path)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (label, exc))
        return
    steps = steps_of(doc)
    hits = named_steps(steps, step_name)
    if len(hits) != 1:
        problems.append("%s(run-step-not-unique)" % label)
        return
    step = hits[0]
    if expected_job is not None and job_id_of_step(doc, step) != expected_job:
        problems.append("%s(run-step-not-in-expected-job)" % label)
        return
    gate_ok = False
    if kind == "maintainer":
        gates = [
            candidate
            for candidate in steps
            if isinstance(candidate, dict) and candidate.get("id") == "actor_gate"
        ]
        if len(gates) != 1:
            problems.append("%s(run-gate-step-not-unique)" % label)
        else:
            gate_run = gates[0].get("run")
            gate_ok = (
                isinstance(gate_run, str)
                and ".github/scripts/actor-write-gate.sh" in gate_run
            )
            if not gate_ok:
                problems.append("%s(run-gate-step-not-shared-gate)" % label)
    for hit in runner_key_hits(step, kind, gate_ok):
        problems.append("behavioral(%s,%s)" % (label, hit))
    run = step.get("run")
    if not isinstance(run, str) or run.count("opencode github run") != 2:
        problems.append("%s(run-invocation-count)" % label)
    if isinstance(run, str):
        write_block(block_name, run)
    env = step.get("env") if isinstance(step.get("env"), dict) else {}
    candidates = env.get("MODEL_CANDIDATES")
    if not isinstance(candidates, str) or candidates.strip() != "${{ steps.model_ladder.outputs.candidates }}":
        problems.append("%s(candidate-env-not-resolver-output)" % label)
    if kind == "action":
        model = env.get("MODEL")
        if not isinstance(model, str) or model.strip() != "${{ steps.model_ladder.outputs.model }}":
            problems.append("%s(model-env-not-resolver-output)" % label)
    resolver = named_steps(steps, "Resolve model (bounded fallback ladder)")
    if len(resolver) != 1:
        problems.append("%s(resolver-step-not-unique)" % label)
    else:
        resolver_step = resolver[0]
        if resolver_step.get("id") != "model_ladder":
            problems.append("%s(resolver-step-no-model-ladder-id)" % label)
        resolver_run = resolver_step.get("run")
        if not isinstance(resolver_run, str) or "resolve-model.sh" not in resolver_run:
            problems.append("%s(resolver-step-no-resolver-invocation)" % label)


def verify_key_hits(
    step, expected_if, expected_outcome, expected_shell, expected_gate=None
):
    hits = []
    if "continue-on-error" in step:
        hits.append("verify-step-continue-on-error")
    if step.get("if") != expected_if:
        hits.append("verify-step-conditional")
    expected_env = {"AGENT_OUTCOME": expected_outcome}
    if expected_gate is not None:
        expected_env["AGENT_GATE"] = expected_gate
    env = step.get("env")
    if not isinstance(env, dict) or set(env) != set(expected_env):
        hits.append("verify-step-env-not-exact")
    elif env.get("AGENT_OUTCOME") != expected_outcome:
        hits.append("verify-outcome-env-not-agent-outcome")
    elif expected_gate is not None and env.get("AGENT_GATE") != expected_gate:
        hits.append("verify-gate-env-not-exact")
    if step.get("shell") != expected_shell:
        hits.append("verify-step-shell-not-expected")
    if "timeout-minutes" in step:
        hits.append("verify-step-timeout-minutes")
    if "working-directory" in step:
        hits.append("verify-step-working-directory")
    return hits


# Review round 22 (issue #653 test integrity): pinning the AGENT_OUTCOME
# expression text alone left the referenced step id free to be re-pointed.
# Giving the agent step another id and handing `opencode`/`maintainer_run` to
# an earlier always-succeeding step kept every text pin green while the verify
# read that decoy's outcome, so a failed agent still concluded hollow-green.
# The id must resolve to exactly one step in the verify's own job, and that
# step must itself be the agent runner step.
def outcome_source_hits(
    doc,
    verify_step,
    expected_job,
    expected_source_name,
    expected_runner,
):
    hits = []
    env = verify_step.get("env")
    outcome = env.get("AGENT_OUTCOME") if isinstance(env, dict) else None
    match = OUTCOME_EXPR.match(outcome) if isinstance(outcome, str) else None
    if match is None:
        hits.append("verify-outcome-source-not-step-outcome")
        return hits
    step_id = match.group(1)
    sources = [
        candidate
        for candidate in steps_of_job(doc, expected_job)
        if isinstance(candidate, dict) and candidate.get("id") == step_id
    ]
    if len(sources) != 1:
        hits.append("verify-outcome-source-not-unique-in-job")
        return hits
    source = sources[0]
    if source.get("name") != expected_source_name:
        hits.append("verify-outcome-source-not-agent-step")
        return hits
    if expected_runner == "composite" and (
        source.get("uses") != "./.github/actions/opencode-run"
        or source.get("continue-on-error") is not True
        or source.get("timeout-minutes") != 60
        or source.get("if") != "steps.actor_gate.outputs.run == 'true'"
    ):
        hits.append("verify-outcome-source-not-agent-step")
        return hits
    if expected_runner == "composite":
        # Round 24: count by path-normalized path, so a dot-segment spelling
        # of the same directory (for example
        # `./.github/actions/opencode-run/.`) cannot hide a duplicate
        # invocation from the uniqueness clause.
        canonical_uses = os.path.normpath("./.github/actions/opencode-run")
        invocations = [
            candidate
            for candidate in steps_of_job(doc, expected_job)
            if isinstance(candidate, dict)
            and isinstance(candidate.get("uses"), str)
            and os.path.normpath(candidate["uses"]) == canonical_uses
        ]
        if len(invocations) != 1:
            hits.append("verify-outcome-source-runner-not-unique")
            return hits
    return hits


def verify_check(
    label,
    path,
    step_prefix,
    block_name,
    expected_if,
    expected_outcome,
    expected_shell,
    expected_job=None,
    expected_outcome_step=None,
    expected_outcome_runner=None,
    expected_gate=None,
):
    try:
        doc = load(path)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (label, exc))
        return
    hits = [
        step
        for step in steps_of(doc)
        if isinstance(step, dict)
        and isinstance(step.get("name"), str)
        and step["name"].startswith(step_prefix)
    ]
    if len(hits) != 1:
        problems.append("%s(verify-step-not-unique)" % label)
        return
    step = hits[0]
    if expected_job is not None and job_id_of_step(doc, step) != expected_job:
        problems.append("%s(verify-step-not-in-expected-job)" % label)
        return
    for hit in verify_key_hits(
        step, expected_if, expected_outcome, expected_shell, expected_gate
    ):
        problems.append("%s(%s)" % (label, hit))
    if expected_outcome_step is not None:
        for hit in outcome_source_hits(
            doc,
            step,
            expected_job,
            expected_outcome_step,
            expected_outcome_runner,
        ):
            problems.append("%s(%s)" % (label, hit))
    run = step.get("run")
    if not isinstance(run, str) or not run.strip():
        problems.append("%s(verify-run-missing)" % label)
        return
    write_block(block_name, run)


def verify_job_hits(job, expected_if, expected_runs_on, expected_timeout):
    hits = []
    if "continue-on-error" in job:
        hits.append("job-continue-on-error")
    if job.get("if") != expected_if:
        hits.append("job-if-not-exact")
    if "defaults" in job:
        hits.append("job-defaults-override")
    if "env" in job:
        hits.append("job-env-override")
    if job.get("runs-on") != expected_runs_on:
        hits.append("job-runs-on-not-exact")
    if job.get("timeout-minutes") != expected_timeout:
        hits.append("job-timeout-minutes-not-exact")
    if set(job) != {"if", "runs-on", "timeout-minutes", "steps"}:
        hits.append("job-keys-not-exact")
    return hits


def verify_workflow_hits(doc):
    hits = []
    if not isinstance(doc, dict):
        return ["workflow-not-mapping"]
    if "defaults" in doc:
        hits.append("workflow-defaults-override")
    if "env" in doc:
        hits.append("workflow-env-override")
    return hits


def verify_job_check(label, path, job_id, expected_if, expected_runs_on, expected_timeout):
    try:
        doc = load(path)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (label, exc))
        return
    jobs = doc.get("jobs") if isinstance(doc, dict) else None
    job = jobs.get(job_id) if isinstance(jobs, dict) else None
    if not isinstance(job, dict):
        problems.append("%s(job-not-found:%s)" % (label, job_id))
        return
    for hit in verify_job_hits(job, expected_if, expected_runs_on, expected_timeout):
        problems.append("%s(%s)" % (label, hit))
    for hit in verify_workflow_hits(doc):
        problems.append("%s(%s)" % (label, hit))


def knob_env_hit(node):
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "env" and isinstance(value, dict) and (set(value) & KNOBS):
                return True
            if knob_env_hit(value):
                return True
    elif isinstance(node, list):
        for item in node:
            if knob_env_hit(item):
                return True
    return False


runner_check(
    "action-file",
    "action",
    ".github/actions/opencode-run/action.yml",
    "Run opencode",
    "action-file.run",
)
runner_check(
    "maintainer.yml",
    "maintainer",
    ".github/workflows/maintainer.yml",
    "Run Maintainer agent",
    "maintainer.yml.run",
    "maintainer",
)
verify_check(
    "maintainer.yml",
    ".github/workflows/maintainer.yml",
    "Verify Maintainer wrote its decision contract",
    "maintainer-verify.run",
    "always()",
    "${{ steps.maintainer_run.outcome }}",
    "bash",
    "maintainer",
    "Run Maintainer agent",
    "inline",
    "${{ steps.actor_gate.outputs.run }}",
)
verify_check(
    "opencode.yml",
    ".github/workflows/opencode.yml",
    "Verify general agent completed",
    "general-verify.run",
    "always() && steps.actor_gate.outputs.run == 'true'",
    "${{ steps.opencode.outcome }}",
    None,
    "general",
    "Run opencode general agent",
    "composite",
)
verify_job_check(
    "maintainer.yml",
    ".github/workflows/maintainer.yml",
    "maintainer",
    EXPECTED_MAINTAINER_JOB_IF,
    "ubuntu-latest",
    75,
)
verify_job_check(
    "opencode.yml",
    ".github/workflows/opencode.yml",
    "general",
    EXPECTED_GENERAL_JOB_IF,
    "ubuntu-latest",
    75,
)

for path in sorted(
    set(
        glob.glob(".github/workflows/*.yml")
        + glob.glob(".github/workflows/*.yaml")
        + glob.glob(".github/actions/**/action.yml", recursive=True)
        + glob.glob(".github/actions/**/action.yaml", recursive=True)
    )
):
    try:
        doc = load(path)
    except Exception as exc:
        problems.append("behavioral(tree,watchdog-knob-env-parse-error:%s:%s)" % (path, exc))
        continue
    if knob_env_hit(doc):
        problems.append("behavioral(tree,watchdog-knob-env-mapping)")

# Self-tests: the structural env walk must see every declarative spelling
# (block, job, caller-step, quoted, flow, and explicit-key), and it must not
# flag shell default references or prose. The step-key checks must see every
# explicit-key spelling too, since that is the class the round-17 text
# patterns could not bind.
env_fixtures = {
    "workflow-block": 'env:\n  HANG_IDLE_SECONDS: "86400"\n',
    "job-block": 'jobs:\n  maintainer:\n    env:\n      HANG_POLL_SECONDS: "3600"\n',
    "caller-step": '- name: Run opencode\n  env:\n    "HANG_IDLE_SECONDS": "86400"\n',
    "flow-style": 'env: {HANG_IDLE_SECONDS: "86400", HANG_POLL_SECONDS: "3600"}\n',
    "explicit-idle": 'env:\n  ? HANG_IDLE_SECONDS\n  : "86400"\n',
    "explicit-poll": 'env:\n  ? "HANG_POLL_SECONDS"\n  : "3600"\n',
}
for fixture_name, fixture_text in env_fixtures.items():
    try:
        fixture_doc = yaml.load(fixture_text, Loader=StrictLoader)
    except Exception:
        problems.append("behavioral(tree,watchdog-knob-env-mapping-self-test)")
        continue
    if not knob_env_hit(fixture_doc):
        problems.append("behavioral(tree,watchdog-knob-env-mapping-self-test)")
control_doc = yaml.load(
    'run: |\n'
    '  hang_idle_seconds="${HANG_IDLE_SECONDS:-600}"\n'
    '  hang_poll_seconds="${HANG_POLL_SECONDS:-30}"\n'
    '# HANG_IDLE_SECONDS is the watchdog idle threshold\n'
    'description: HANG_POLL_SECONDS\n',
    Loader=StrictLoader,
)
if knob_env_hit(control_doc):
    problems.append("behavioral(tree,watchdog-knob-env-mapping-self-test)")
step_fixture = (
    "- name: Run opencode\n"
    "  ? if\n"
    "  : false\n"
    "  ? continue-on-error\n"
    "  : true\n"
    "  ? timeout-minutes\n"
    "  : 1\n"
    "  ? shell\n"
    "  : dash\n"
    "  env:\n"
    "    ? HANG_IDLE_SECONDS\n"
    '    : "86400"\n'
)
try:
    parsed_steps = yaml.load(step_fixture, Loader=StrictLoader)
    fixture_hits = runner_key_hits(parsed_steps[0], "action")
    required_hits = {
        "run-step-conditional",
        "run-step-watchdog-env-override",
        "run-step-continue-on-error",
        "run-step-timeout-minutes",
        "run-step-shell-not-bash",
    }
    if not required_hits.issubset(set(fixture_hits)):
        problems.append("behavioral(tree,step-key-explicit-syntax-self-test)")
except Exception:
    problems.append("behavioral(tree,step-key-explicit-syntax-self-test)")
verify_good = {
    "name": "Verify general agent completed (loud failure, issue",
    "if": "always() && steps.actor_gate.outputs.run == 'true'",
    "env": {"AGENT_OUTCOME": "${{ steps.opencode.outcome }}"},
    "run": "exit 0\n",
}
verify_good_if = verify_good["if"]
verify_good_outcome = "${{ steps.opencode.outcome }}"
if verify_key_hits(verify_good, verify_good_if, verify_good_outcome, None):
    problems.append("behavioral(tree,verify-step-key-self-test)")
verify_mutants = {
    "continue-on-error": (
        {"continue-on-error": True},
        "verify-step-continue-on-error",
    ),
    "conditional": ({"if": "false"}, "verify-step-conditional"),
    "env-extra": (
        {
            "env": {
                "AGENT_OUTCOME": "${{ steps.opencode.outcome }}",
                "BASH_ENV": "/tmp/hollow",
            }
        },
        "verify-step-env-not-exact",
    ),
    "outcome-hardcoded": (
        {"env": {"AGENT_OUTCOME": "success"}},
        "verify-outcome-env-not-agent-outcome",
    ),
    "shell": ({"shell": "dash"}, "verify-step-shell-not-expected"),
    "timeout": ({"timeout-minutes": 1}, "verify-step-timeout-minutes"),
    "workdir": ({"working-directory": "/tmp"}, "verify-step-working-directory"),
}
for mutant_name, (patch, expected_hit) in verify_mutants.items():
    fixture = dict(verify_good)
    fixture.update(patch)
    if expected_hit not in verify_key_hits(
        fixture, verify_good_if, verify_good_outcome, None
    ):
        problems.append(
            "behavioral(tree,verify-step-key-self-test:%s)" % mutant_name
        )
job_good = {
    "if": "always()\n",
    "runs-on": "ubuntu-latest",
    "timeout-minutes": 75,
    "steps": [],
}
job_good_if = job_good["if"]
if verify_job_hits(job_good, job_good_if, "ubuntu-latest", 75):
    problems.append("behavioral(tree,verify-job-key-self-test)")
job_mutants = {
    "continue-on-error": ({"continue-on-error": True}, "job-continue-on-error"),
    "conditional": ({"if": "false"}, "job-if-not-exact"),
    "defaults": (
        {"defaults": {"run": {"shell": "true {0}"}}},
        "job-defaults-override",
    ),
    "env": ({"env": {"BASH_ENV": "/tmp/hollow"}}, "job-env-override"),
    "runs-on": ({"runs-on": "windows-latest"}, "job-runs-on-not-exact"),
    "timeout": ({"timeout-minutes": 1}, "job-timeout-minutes-not-exact"),
    "extra-key": ({"permissions": {}}, "job-keys-not-exact"),
}
for mutant_name, (patch, expected_hit) in job_mutants.items():
    fixture = dict(job_good)
    fixture.update(patch)
    if expected_hit not in verify_job_hits(
        fixture, job_good_if, "ubuntu-latest", 75
    ):
        problems.append(
            "behavioral(tree,verify-job-key-self-test:%s)" % mutant_name
        )
workflow_good = {"jobs": {}}
if verify_workflow_hits(workflow_good):
    problems.append("behavioral(tree,verify-job-key-self-test)")
workflow_mutants = {
    "defaults": (
        {"defaults": {"run": {"shell": "true {0}"}}},
        "workflow-defaults-override",
    ),
    "env": ({"env": {"BASH_ENV": "/tmp/hollow"}}, "workflow-env-override"),
}
for mutant_name, (patch, expected_hit) in workflow_mutants.items():
    fixture = dict(workflow_good)
    fixture.update(patch)
    if expected_hit not in verify_workflow_hits(fixture):
        problems.append(
            "behavioral(tree,verify-job-key-self-test:%s)" % mutant_name
        )
# Containment self-test: job_id_of_step must resolve the job that actually
# holds the step object (so a step moved into a sibling job cannot satisfy
# the expected-job pin) and must not resolve an object that lives in no job.
containment_doc = yaml.load(
    "jobs:\n"
    "  general:\n"
    "    steps:\n"
    "      - name: Verify general agent completed (loud failure, issue #591)\n"
    "        run: exit 0\n"
    "  general-verify:\n"
    "    steps:\n"
    "      - name: Moved verify step\n"
    "        run: exit 0\n"
    "runs:\n"
    "  using: composite\n"
    "  steps:\n"
    "    - name: Run opencode\n"
    "      run: exit 0\n",
    Loader=StrictLoader,
)
containment_in_job = containment_doc["jobs"]["general"]["steps"][0]
containment_moved = containment_doc["jobs"]["general-verify"]["steps"][0]
containment_composite = containment_doc["runs"]["steps"][0]
if job_id_of_step(containment_doc, containment_in_job) != "general":
    problems.append("behavioral(tree,step-job-containment-self-test:in-job)")
if job_id_of_step(containment_doc, containment_moved) == "general":
    problems.append("behavioral(tree,step-job-containment-self-test:moved)")
if job_id_of_step(containment_doc, containment_moved) != "general-verify":
    problems.append("behavioral(tree,step-job-containment-self-test:moved-id)")
if job_id_of_step(containment_doc, containment_composite) is not None:
    problems.append("behavioral(tree,step-job-containment-self-test:composite)")
# Outcome-source self-test (review round 22): the verify's AGENT_OUTCOME step
# id must resolve to the agent runner step itself in the verify's own job.
# A re-pointed id (a decoy step holding the agent's id), a missing or
# duplicated id, and a same-named source with runner attributes changed must
# all be flagged; the pristine fixture must stay clean.
def outcome_doc(runner):
    general = runner == "composite"
    job_id = "general" if general else "maintainer"
    agent_id = "opencode" if general else "maintainer_run"
    agent = {
        "name": "Run opencode general agent" if general else "Run Maintainer agent",
        "id": agent_id,
        "continue-on-error": True,
        "timeout-minutes": 60,
    }
    if general:
        agent["if"] = "steps.actor_gate.outputs.run == 'true'"
        agent["uses"] = "./.github/actions/opencode-run"
    else:
        agent["shell"] = "bash"
        agent["run"] = "true\n"
    return {
        "jobs": {
            job_id: {
                "steps": [
                    {"name": "Configure git identity", "run": "true\n"},
                    agent,
                    {
                        "name": "Verify step",
                        "env": {
                            "AGENT_OUTCOME": "${{ steps.%s.outcome }}" % agent_id
                        },
                        "run": "exit 0\n",
                    },
                ]
            }
        }
    }


outcome_good = outcome_doc("composite")
outcome_good_step = outcome_good["jobs"]["general"]["steps"][2]
if outcome_source_hits(
    outcome_good, outcome_good_step, "general", "Run opencode general agent", "composite"
):
    problems.append("behavioral(tree,verify-outcome-source-self-test:good)")
outcome_maintainer_good = outcome_doc("inline")
outcome_maintainer_step = outcome_maintainer_good["jobs"]["maintainer"]["steps"][2]
if outcome_source_hits(
    outcome_maintainer_good,
    outcome_maintainer_step,
    "maintainer",
    "Run Maintainer agent",
    "inline",
):
    problems.append("behavioral(tree,verify-outcome-source-self-test:good-maintainer)")
outcome_mutants = []
outcome_mutant = outcome_doc("composite")
outcome_mutant["jobs"]["general"]["steps"][0]["id"] = "opencode"
outcome_mutant["jobs"]["general"]["steps"][1]["id"] = "opencode_agent"
outcome_mutants.append(
    ("repointed", "general", "verify-outcome-source-not-agent-step", outcome_mutant)
)
outcome_mutant = outcome_doc("composite")
outcome_mutant["jobs"]["general"]["steps"][0]["id"] = "opencode"
outcome_mutants.append(
    ("duplicate-id", "general", "verify-outcome-source-not-unique-in-job", outcome_mutant)
)
outcome_mutant = outcome_doc("composite")
outcome_mutant["jobs"]["general"]["steps"][1]["id"] = "opencode_agent"
outcome_mutants.append(
    ("missing-id", "general", "verify-outcome-source-not-unique-in-job", outcome_mutant)
)
outcome_mutant = outcome_doc("composite")
outcome_mutant["jobs"]["general"]["steps"][1]["uses"] = "./.github/actions/other"
outcome_mutants.append(
    ("uses-changed", "general", "verify-outcome-source-not-agent-step", outcome_mutant)
)


def outcome_duplicate_doc(uses_literal):
    return yaml.load(
        "jobs:\n"
        "  general:\n"
        "    steps:\n"
        "      - name: Configure git identity\n"
        "        run: true\n"
        "      - name: Run opencode general agent\n"
        "        id: opencode\n"
        "        if: steps.actor_gate.outputs.run == 'true'\n"
        "        continue-on-error: true\n"
        "        timeout-minutes: 60\n"
        "        uses: " + uses_literal + "\n"
        "      - name: Run opencode general agent\n"
        "        id: opencode_agent\n"
        "        if: steps.actor_gate.outputs.run == 'true'\n"
        "        continue-on-error: true\n"
        "        timeout-minutes: 60\n"
        "        uses: ./.github/actions/opencode-run\n"
        "      - name: Verify step\n"
        "        env:\n"
        '          AGENT_OUTCOME: "${{ steps.opencode.outcome }}"\n'
        "        run: exit 0\n",
        Loader=StrictLoader,
    )


for mutant_name, uses_literal in (
    ("duplicate-invocation-unquoted", "./.github/actions/opencode-run"),
    ("duplicate-invocation-quoted", '"./.github/actions/opencode-run"'),
):
    outcome_mutants.append(
        (
            mutant_name,
            "general",
            "verify-outcome-source-runner-not-unique",
            outcome_duplicate_doc(uses_literal),
        )
    )
outcome_mutant = outcome_duplicate_doc("./.github/actions/opencode-run")
outcome_mutant["jobs"]["general"]["steps"][2]["uses"] = (
    "./.github/actions/opencode-run/."
)
outcome_mutants.append(
    (
        "duplicate-invocation-slashed",
        "general",
        "verify-outcome-source-runner-not-unique",
        outcome_mutant,
    )
)
outcome_mutant = outcome_doc("composite")
outcome_mutant["jobs"]["general"]["steps"][1]["continue-on-error"] = False
outcome_mutants.append(
    (
        "continue-on-error-flipped",
        "general",
        "verify-outcome-source-not-agent-step",
        outcome_mutant,
    )
)
outcome_mutant = outcome_doc("composite")
outcome_mutant["jobs"]["general"]["steps"][1]["timeout-minutes"] = 1
outcome_mutants.append(
    ("timeout-changed", "general", "verify-outcome-source-not-agent-step", outcome_mutant)
)
outcome_mutant = outcome_doc("composite")
outcome_mutant["jobs"]["general"]["steps"][1]["if"] = "true"
outcome_mutants.append(
    ("gate-changed", "general", "verify-outcome-source-not-agent-step", outcome_mutant)
)
outcome_mutant = outcome_doc("inline")
outcome_mutant["jobs"]["maintainer"]["steps"][0]["id"] = "maintainer_run"
outcome_mutant["jobs"]["maintainer"]["steps"][1]["id"] = "maintainer_agent"
outcome_mutants.append(
    (
        "maintainer-repointed",
        "maintainer",
        "verify-outcome-source-not-agent-step",
        outcome_mutant,
    )
)
for mutant_name, job_id, expected_hit, mutant_doc in outcome_mutants:
    mutant_step = [
        candidate
        for candidate in mutant_doc["jobs"][job_id]["steps"]
        if isinstance(candidate, dict) and candidate.get("name") == "Verify step"
    ][0]
    source_name = (
        "Run opencode general agent" if job_id == "general" else "Run Maintainer agent"
    )
    runner = "composite" if job_id == "general" else "inline"
    if expected_hit not in outcome_source_hits(
        mutant_doc, mutant_step, job_id, source_name, runner
    ):
        problems.append(
            "behavioral(tree,verify-outcome-source-self-test:%s)" % mutant_name
        )
try:
    yaml.load("run: one\nrun: two\n", Loader=StrictLoader)
    problems.append("structural(duplicate-key-loader-self-test)")
except yaml.constructor.ConstructorError:
    pass
except Exception:
    problems.append("structural(duplicate-key-loader-self-test)")

for problem in problems:
    sys.stdout.write(problem + "\n")
R15PY
  ) || r15_struct_out="structural(python-runtime-failed)"
  if [ -n "$r15_struct_out" ]; then
    while IFS= read -r r15_struct_line; do
      [ -n "$r15_struct_line" ] || continue
      r15_bad="${r15_bad} ${r15_struct_line}"
    done <<< "$r15_struct_out"
  fi
fi
LADDER_DIR=".github/actions/opencode-run"
RESOLVER="${LADDER_DIR}/resolve-model.sh"
LADDER_FILE="${LADDER_DIR}/model-ladder.txt"
if [ ! -f "$RESOLVER" ]; then
  r15_bad="${r15_bad} resolver(missing)"
else
  grep -q 'zen/v1/models' "$RESOLVER" || r15_bad="${r15_bad} resolver(no-live-registry-lookup)"
  grep -q 'model-ladder\.txt' "$RESOLVER" || r15_bad="${r15_bad} resolver(no-ladder-default)"
  grep -qF 'no parseable model ids' "$RESOLVER" || r15_bad="${r15_bad} resolver(no-unparseable-registry-passthrough)"
fi
if [ ! -f "$LADDER_FILE" ]; then
  r15_bad="${r15_bad} ladder-file(missing)"
else
  r15_rungs=$(grep -vE '^[[:space:]]*(#|$)' "$LADDER_FILE" || true)
  if [ -z "$r15_rungs" ]; then
    r15_bad="${r15_bad} ladder-file(empty)"
  fi
  if printf '%s\n' "$r15_rungs" | grep -vqE '^opencode/[A-Za-z0-9._-]+-free$'; then
    r15_bad="${r15_bad} ladder-file(non-free-or-malformed-rung)"
  fi
fi
# Issue #620 static tripwires: shared between the composite action and the
# maintainer inline copy. Anchored element-presence counts only: they catch a
# wholesale removal or rename of the retry machinery cheaply. The semantics
# (order, reachability, boundedness) live in the loop-level behavioral test
# below, which executes the real extracted runner blocks, so the brittle
# proximity windows pinned in review rounds F3/F4 (grep -B2/-A3/-B3/-A4
# around the cap, the marker, and the init) were trimmed in round F5: they
# false-failed benign edits (two comments or blank lines in the wrong place)
# and could never express execution order. Every element they guarded is
# covered behaviorally: a hoisted or relocated budget, a decoy cap, an
# in-loop init, a removed or reordered sleep, a rewritten loop construct,
# and a compensated loud-exit swap each trip the behavioral matrix, and an
# unboundedness re-spelling hangs into the per-scenario timeout.
# Review round 14: the normalized expected literals for the whole-run-block
# exact pin (see r15_freetier_pins). Generated from the shipped blocks: every
# non-comment line in order, leading/trailing whitespace and an optional
# trailing `2>/dev/null` stripped (the caller re-normalizes, so the literals
# stay byte-exact even if an editor alters surrounding blank captures).
r15_expected_run_block() {
  case "$1" in
  action-file)
    cat <<'R15RUNEOF'
candidates="${MODEL_CANDIDATES:-${MODEL:-}}"
if [ -z "$candidates" ]; then
echo "::error::No model candidates resolved; refusing to run opencode (the resolve step did not produce a candidate chain)."
exit 1
fi
model_error_terminal() {
( set +o pipefail; tail -n 40 "$1" | grep -qE "^(Error: )?Model not found: ${2//./\\.}(\. Did you mean: .*|\.?$)" )
}
freetier_error_terminal() {
( set +o pipefail; tail -n 40 "$1" | grep -qE "^(AI_APICallError: |APIError: |Error: )?OpenCode's free tier can only be used from within OpenCode\. Download it at https://opencode\.ai and keep building\.?$" )
}
transient_http_error_terminal() {
( set +o pipefail; tail -n 40 "$1" | grep -qE "^(AI_APICallError: |APIError: |Error: )?(Rate limit exceeded\. Please try again later\.|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\.?$" )
}
hang_idle_seconds="${HANG_IDLE_SECONDS:-600}"
hang_poll_seconds="${HANG_POLL_SECONDS:-30}"
case "$hang_idle_seconds" in ''|*[!0-9]*) hang_idle_seconds=600 ;; esac
case "$hang_poll_seconds" in ''|*[!0-9]*) hang_poll_seconds=30 ;; esac
[ "$hang_poll_seconds" -ge 1 ] 2>/dev/null || hang_poll_seconds=30
[ "$hang_idle_seconds" -ge 1 ] 2>/dev/null || hang_idle_seconds=600
[ "$hang_idle_seconds" -le 86400 ] 2>/dev/null || hang_idle_seconds=600
freetier_retry_used=0
transient_retry_used=0
hang_retry_used=0
status=1
for model in $candidates; do
while :; do
log="$(mktemp)"
fifo="${log}.fifo"
hang_flag="${log}.hang"
rm -f "$fifo" "$hang_flag"
echo "::notice::opencode run with model '$model'"
if mkfifo "$fifo" 2>/dev/null; then
set +e
tee "$log" < "$fifo" &
tee_pid=$!
MODEL="$model" opencode github run > "$fifo" 2>&1 &
oc_pid=$!
(
last_size=$(wc -c < "$log" 2>/dev/null || echo 0)
idle=0
while kill -0 "$oc_pid" 2>/dev/null; do
sleep "$hang_poll_seconds"
kill -0 "$oc_pid" 2>/dev/null || exit 0
size=$(wc -c < "$log" 2>/dev/null || echo 0)
if [ "$size" -eq "$last_size" ]; then
idle=$((idle + hang_poll_seconds))
if [ "$idle" -ge "$hang_idle_seconds" ]; then
echo "::warning::opencode produced no output for ${hang_idle_seconds}s on model '$model' (provider stall, issue #653); aborting this attempt."
printf 'hang\n' > "$hang_flag"
kill -TERM "$oc_pid"
kill -TERM "$tee_pid"
sleep 5
kill -KILL "$oc_pid"
kill -KILL "$tee_pid"
exit 0
fi
else
idle=0
last_size=$size
fi
done
) &
watch_pid=$!
wait "$oc_pid"; status=$?
wait "$tee_pid"; tee_status=$?
kill "$watch_pid"
wait "$watch_pid"
set -e
else
echo "::warning::mkfifo is unavailable on this runner; running model '$model' without the provider-stall watchdog (issue #653)."
set +e
MODEL="$model" opencode github run 2>&1 | tee "$log"
st=("${PIPESTATUS[@]}")
set -e
status="${st[0]}"; tee_status="${st[1]}"
fi
if [ -s "$hang_flag" ]; then
rm -f "$log" "$fifo" "$hang_flag"
if [ "$hang_retry_used" -lt 1 ]; then
hang_retry_used=1
echo "::warning::provider stall on model '$model' (issue #653); one bounded retry of the same model in 10s."
sleep 10
continue
fi
echo "::error::repeated provider stall on model '$model' after the bounded retry (issue #653); failing loudly instead of retrying unboundedly."
exit 1
fi
if [ "$tee_status" -ne 0 ]; then
echo "::error::could not capture the opencode log for model '$model' (tee exit $tee_status); failing loudly instead of risking a blind advance."
rm -f "$log" "$fifo" "$hang_flag"
exit 1
fi
if [ "$status" -eq 0 ]; then
if model_error_terminal "$log" "$model"; then
echo "::warning::model '$model' died at the provider (terminal Model-not-found error on an exit-0 run); advancing to the next ladder rung if any."
rm -f "$log" "$fifo" "$hang_flag"
continue 2
fi
if freetier_error_terminal "$log"; then
if [ "$freetier_retry_used" -lt 1 ]; then
freetier_retry_used=1
echo "::warning::transient free-tier rejection on model '$model' (exit-0 terminal FreeTierError, issue #620); one bounded retry of the same model in 15s."
rm -f "$log" "$fifo" "$hang_flag"
sleep 15
continue
fi
echo "::error::persistent free-tier rejection on model '$model' after the bounded retry (issue #620); failing loudly instead of retrying unboundedly."
rm -f "$log" "$fifo" "$hang_flag"
exit 1
fi
if transient_http_error_terminal "$log"; then
if [ "$transient_retry_used" -lt 1 ]; then
transient_retry_used=1
echo "::warning::transient HTTP error on model '$model' (exit-0 terminal 429/5xx error, issue #653); one bounded retry of the same model in 30s."
rm -f "$log" "$fifo" "$hang_flag"
sleep 30
continue
fi
echo "::error::persistent HTTP error on model '$model' after the bounded retry (issue #653); failing loudly instead of retrying unboundedly."
rm -f "$log" "$fifo" "$hang_flag"
exit 1
fi
rm -f "$log" "$fifo" "$hang_flag"
exit 0
fi
if grep -qE "Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)" "$log"; then
echo "::warning::model '$model' was not found by the provider; advancing to the next ladder rung if any."
rm -f "$log" "$fifo" "$hang_flag"
continue 2
fi
if freetier_error_terminal "$log"; then
if [ "$freetier_retry_used" -lt 1 ]; then
freetier_retry_used=1
echo "::warning::transient free-tier rejection on model '$model' (exit $status, issue #620); one bounded retry of the same model in 15s."
rm -f "$log" "$fifo" "$hang_flag"
sleep 15
continue
fi
echo "::error::persistent free-tier rejection on model '$model' (exit $status) after the bounded retry (issue #620); failing loudly instead of retrying unboundedly."
rm -f "$log" "$fifo" "$hang_flag"
exit "$status"
fi
if transient_http_error_terminal "$log"; then
if [ "$transient_retry_used" -lt 1 ]; then
transient_retry_used=1
echo "::warning::transient HTTP error on model '$model' (exit $status, issue #653); one bounded retry of the same model in 30s."
rm -f "$log" "$fifo" "$hang_flag"
sleep 30
continue
fi
echo "::error::persistent HTTP error on model '$model' (exit $status) after the bounded retry (issue #653); failing loudly instead of retrying unboundedly."
rm -f "$log" "$fifo" "$hang_flag"
exit "$status"
fi
echo "::error::opencode failed with exit status $status on model '$model' (not a model-resolution, free-tier, or transient-HTTP death; remaining rungs are not retried)."
rm -f "$log" "$fifo" "$hang_flag"
exit "$status"
done
done
echo "::error::opencode exhausted every model rung ($candidates) with 'Model not found' (issue #591 fallback ladder is dead); failing loudly so failure triage fires instead of a hollow green."
exit 1
R15RUNEOF
    ;;
  maintainer.yml)
    cat <<'R15RUNEOF'
if [ "${{ github.event_name }}" = "workflow_run" ]; then
export GITHUB_EVENT_NAME="workflow_dispatch"
fi
candidates="${MODEL_CANDIDATES:-}"
if [ -z "$candidates" ]; then
echo "::error::No model candidates resolved; refusing to run the Maintainer (the resolve step did not produce a candidate chain)."
exit 1
fi
model_error_terminal() {
( set +o pipefail; tail -n 40 "$1" | grep -qE "^(Error: )?Model not found: ${2//./\\.}(\. Did you mean: .*|\.?$)" )
}
freetier_error_terminal() {
( set +o pipefail; tail -n 40 "$1" | grep -qE "^(AI_APICallError: |APIError: |Error: )?OpenCode's free tier can only be used from within OpenCode\. Download it at https://opencode\.ai and keep building\.?$" )
}
transient_http_error_terminal() {
( set +o pipefail; tail -n 40 "$1" | grep -qE "^(AI_APICallError: |APIError: |Error: )?(Rate limit exceeded\. Please try again later\.|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\.?$" )
}
hang_idle_seconds="${HANG_IDLE_SECONDS:-600}"
hang_poll_seconds="${HANG_POLL_SECONDS:-30}"
case "$hang_idle_seconds" in ''|*[!0-9]*) hang_idle_seconds=600 ;; esac
case "$hang_poll_seconds" in ''|*[!0-9]*) hang_poll_seconds=30 ;; esac
[ "$hang_poll_seconds" -ge 1 ] 2>/dev/null || hang_poll_seconds=30
[ "$hang_idle_seconds" -ge 1 ] 2>/dev/null || hang_idle_seconds=600
[ "$hang_idle_seconds" -le 86400 ] 2>/dev/null || hang_idle_seconds=600
freetier_retry_used=0
transient_retry_used=0
hang_retry_used=0
status=1
for model in $candidates; do
while :; do
log="$(mktemp)"
fifo="${log}.fifo"
hang_flag="${log}.hang"
rm -f "$fifo" "$hang_flag"
echo "::notice::maintainer run with model '$model'"
if mkfifo "$fifo" 2>/dev/null; then
set +e
tee "$log" < "$fifo" &
tee_pid=$!
MODEL="$model" opencode github run > "$fifo" 2>&1 &
oc_pid=$!
(
last_size=$(wc -c < "$log" 2>/dev/null || echo 0)
idle=0
while kill -0 "$oc_pid" 2>/dev/null; do
sleep "$hang_poll_seconds"
kill -0 "$oc_pid" 2>/dev/null || exit 0
size=$(wc -c < "$log" 2>/dev/null || echo 0)
if [ "$size" -eq "$last_size" ]; then
idle=$((idle + hang_poll_seconds))
if [ "$idle" -ge "$hang_idle_seconds" ]; then
echo "::warning::opencode produced no output for ${hang_idle_seconds}s on model '$model' (provider stall, issue #653); aborting this attempt."
printf 'hang\n' > "$hang_flag"
kill -TERM "$oc_pid"
kill -TERM "$tee_pid"
sleep 5
kill -KILL "$oc_pid"
kill -KILL "$tee_pid"
exit 0
fi
else
idle=0
last_size=$size
fi
done
) &
watch_pid=$!
wait "$oc_pid"; status=$?
wait "$tee_pid"; tee_status=$?
kill "$watch_pid"
wait "$watch_pid"
set -e
else
echo "::warning::mkfifo is unavailable on this runner; running model '$model' without the provider-stall watchdog (issue #653)."
set +e
MODEL="$model" opencode github run 2>&1 | tee "$log"
st=("${PIPESTATUS[@]}")
set -e
status="${st[0]}"; tee_status="${st[1]}"
fi
if [ -s "$hang_flag" ]; then
rm -f "$log" "$fifo" "$hang_flag"
if [ "$hang_retry_used" -lt 1 ]; then
hang_retry_used=1
echo "::warning::provider stall on model '$model' (issue #653); one bounded retry of the same model in 10s."
sleep 10
continue
fi
echo "::error::repeated provider stall on model '$model' after the bounded retry (issue #653); failing loudly instead of retrying unboundedly."
exit 1
fi
if [ "$tee_status" -ne 0 ]; then
echo "::error::could not capture the Maintainer opencode log for model '$model' (tee exit $tee_status); failing loudly instead of risking a blind advance."
rm -f "$log" "$fifo" "$hang_flag"
exit 1
fi
if [ "$status" -eq 0 ]; then
if model_error_terminal "$log" "$model"; then
echo "::warning::model '$model' died at the provider (terminal Model-not-found error on an exit-0 run); advancing to the next ladder rung if any."
rm -f "$log" "$fifo" "$hang_flag"
continue 2
fi
if freetier_error_terminal "$log"; then
if [ "$freetier_retry_used" -lt 1 ]; then
freetier_retry_used=1
echo "::warning::transient free-tier rejection on model '$model' (exit-0 terminal FreeTierError, issue #620); one bounded retry of the same model in 15s."
rm -f "$log" "$fifo" "$hang_flag"
sleep 15
continue
fi
echo "::error::persistent free-tier rejection on model '$model' after the bounded retry (issue #620); failing loudly instead of retrying unboundedly."
rm -f "$log" "$fifo" "$hang_flag"
exit 1
fi
if transient_http_error_terminal "$log"; then
if [ "$transient_retry_used" -lt 1 ]; then
transient_retry_used=1
echo "::warning::transient HTTP error on model '$model' (exit-0 terminal 429/5xx error, issue #653); one bounded retry of the same model in 30s."
rm -f "$log" "$fifo" "$hang_flag"
sleep 30
continue
fi
echo "::error::persistent HTTP error on model '$model' after the bounded retry (issue #653); failing loudly instead of retrying unboundedly."
rm -f "$log" "$fifo" "$hang_flag"
exit 1
fi
rm -f "$log" "$fifo" "$hang_flag"
exit 0
fi
if grep -qE "Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)" "$log"; then
echo "::warning::model '$model' was not found by the provider; advancing to the next ladder rung if any."
rm -f "$log" "$fifo" "$hang_flag"
continue 2
fi
if freetier_error_terminal "$log"; then
if [ "$freetier_retry_used" -lt 1 ]; then
freetier_retry_used=1
echo "::warning::transient free-tier rejection on model '$model' (exit $status, issue #620); one bounded retry of the same model in 15s."
rm -f "$log" "$fifo" "$hang_flag"
sleep 15
continue
fi
echo "::error::persistent free-tier rejection on model '$model' (exit $status) after the bounded retry (issue #620); failing loudly instead of retrying unboundedly."
rm -f "$log" "$fifo" "$hang_flag"
exit "$status"
fi
if transient_http_error_terminal "$log"; then
if [ "$transient_retry_used" -lt 1 ]; then
transient_retry_used=1
echo "::warning::transient HTTP error on model '$model' (exit $status, issue #653); one bounded retry of the same model in 30s."
rm -f "$log" "$fifo" "$hang_flag"
sleep 30
continue
fi
echo "::error::persistent HTTP error on model '$model' (exit $status) after the bounded retry (issue #653); failing loudly instead of retrying unboundedly."
rm -f "$log" "$fifo" "$hang_flag"
exit "$status"
fi
echo "::error::Maintainer opencode run failed with exit status $status on model '$model' (not a model-resolution, free-tier, or transient-HTTP death; remaining rungs are not retried)."
rm -f "$log" "$fifo" "$hang_flag"
exit "$status"
done
done
echo "::error::Maintainer exhausted every model rung ($candidates) with 'Model not found' (issue #591 fallback ladder is dead); failing loudly so the run is visible to health audit and triage."
exit 1
R15RUNEOF
    ;;
  esac
}

r15_freetier_pins() {
  local label="$1" f="$2" fn n
  if [ ! -f "$f" ]; then
    r15_bad="${r15_bad} ${label}(missing)"
    return
  fi
  grep -qF 'freetier_error_terminal() {' "$f" || r15_bad="${r15_bad} ${label}(no-freetier-detector)"
  fn=$(sed -n '/freetier_error_terminal() {/,/^[[:space:]]*}[[:space:]]*$/p' "$f" | sed 's/^[[:space:]]*//')
  printf '%s\n' "$fn" | grep -qF '( set +o pipefail; tail -n 40 "$1" | grep -qE' || r15_bad="${r15_bad} ${label}(freetier-detector-not-pipefail-safe-tail-scoped)"
  printf '%s\n' "$fn" | grep -qF "(AI_APICallError: |APIError: |Error: )?OpenCode's free tier can only be used from within OpenCode\. Download it at https://opencode\.ai and keep building\.?\$" || r15_bad="${r15_bad} ${label}(no-anchored-freetier-terminal-form)"
  [ "$(grep -cE '^[[:space:]]*if freetier_error_terminal "\$log"; then$' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(freetier-detector-not-wired-both-paths)"
  [ "$(grep -cF 'freetier_retry_used=0' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-freetier-retry-counter)"
  [ "$(grep -cE '^[[:space:]]*if \[ "\$freetier_retry_used" -lt 1 \]; then$' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(no-bounded-freetier-retry-cap)"
  [ "$(grep -cF 'freetier_retry_used=1' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(no-freetier-retry-consumption)"
  [ "$(grep -cF 'one bounded retry of the same model in 15s' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(no-same-model-retry-marker)"
  [ "$(grep -cE '^[[:space:]]*continue 2$' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(rung-advance-continue2-count)"
  [ "$(grep -cE '^[[:space:]]*sleep 15$' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(no-bounded-retry-backoff)"
  # Review round 7 corrected tripwires: anchored live-form counts, so a
  # comment decoy quoting the pinned text can never satisfy them. The
  # behavioral matrix carries the semantics (the status-parameterized
  # failing-tee scenarios and the window lower-bound fixtures plus
  # ft-trailing), these are first-line element-presence checks. Review F9
  # showed a count-only pin is still satisfiable by a dead exact-form decoy,
  # so the tee guard's semantics now live in the behavioral fixtures: the
  # tee mock honors R15_TEE_FAIL and the matrix covers statuses 3, 1, and 2.
  [ "$(grep -cE '^[[:space:]]*if \[ "\$tee_status" -ne 0 \]; then$' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(tee-guard-decoyed-or-missing)"
  # The live detectors must carry the pipefail-safe wrap (issue #653 review
  # F1): the exact `( set +o pipefail; tail -n 40 "$1" | grep -qE` shape,
  # three times (model/freetier/transient-http). The functional big-window
  # fixtures below prove the semantics; this pin catches a shape drift or a
  # partial unwrap cheaply.
  [ "$(grep -cE '^[[:space:]]*\( set \+o pipefail; tail -n 40 "\$1" \| grep -qE' "$f" || true)" = "3" ] || r15_bad="${r15_bad} ${label}(detectors-not-pipefail-safe-tail-scoped-live)"
  # Loud persistence, exact-form and branch-tied: each persistent-rejection
  # branch must end in the nonzero exit matching its own message, so a
  # compensated swap (one branch's loud exit moved to the other, with the
  # real path exiting 0) can never pass by keeping the aggregate count. The
  # exit-0 message is a substring-free match for its branch (the nonzero
  # message inserts `(exit $status) ` before "after the bounded retry"), and
  # the text itself contains "(exit $status)", so the nonzero pin must match
  # full forms, not merely the token "exit" (verifier findings, 2026-10-17:
  # the loose token check and the pooled windows both let mutations through).
  # Both exit pins are column-anchored whole-line matches, so a decoy comment
  # quoting the pinned form cannot satisfy them (adversarial F5 verdict:
  # `exit 3 # decoy: exit "$status"` passed the old substring count).
  n=$(grep -A2 -F "persistent free-tier rejection on model '\$model' after the bounded retry" "$f" | grep -cE '^[[:space:]]*exit 1$' || true)
  [ "$n" = "1" ] || r15_bad="${r15_bad} ${label}(persistent-freetier-exit-0-path-not-loud)"
  n=$(grep -A2 -F "persistent free-tier rejection on model '\$model' (exit \$status) after the bounded retry" "$f" | grep -cE '^[[:space:]]*exit "\$status"$' || true)
  [ "$n" = "1" ] || r15_bad="${r15_bad} ${label}(persistent-freetier-exit-status-path-not-loud)"
  # Issue #653 element-presence pins: the transient-429/5xx detector plus its
  # bounded retry (shared shape on both exit paths, so those counts are 2)
  # and the provider-stall watchdog (a single attempt-shape branch ahead of
  # the exit-shape split, so its counts are 1). Anchored counts only; the
  # behavioral matrix owns the semantics.
  grep -qF 'transient_http_error_terminal() {' "$f" || r15_bad="${r15_bad} ${label}(no-transient-http-detector)"
  fn=$(sed -n '/transient_http_error_terminal() {/,/^[[:space:]]*}[[:space:]]*$/p' "$f" | sed 's/^[[:space:]]*//')
  printf '%s\n' "$fn" | grep -qF '( set +o pipefail; tail -n 40 "$1" | grep -qE' || r15_bad="${r15_bad} ${label}(transient-http-detector-not-pipefail-safe-tail-scoped)"
  printf '%s\n' "$fn" | grep -qF "(Rate limit exceeded\. Please try again later\.|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\.?\$" || r15_bad="${r15_bad} ${label}(no-anchored-transient-http-form)"
  [ "$(grep -cE '^[[:space:]]*if transient_http_error_terminal "\$log"; then$' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(transient-http-detector-not-wired-both-paths)"
  [ "$(grep -cF 'transient_retry_used=0' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-transient-http-retry-counter)"
  [ "$(grep -cE '^[[:space:]]*if \[ "\$transient_retry_used" -lt 1 \]; then$' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(no-bounded-transient-http-cap)"
  [ "$(grep -cF 'transient_retry_used=1' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(no-transient-http-retry-consumption)"
  [ "$(grep -cF 'one bounded retry of the same model in 30s' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(no-transient-http-retry-marker)"
  [ "$(grep -cE '^[[:space:]]*sleep 30$' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(no-transient-http-backoff)"
  n=$(grep -A2 -F "persistent HTTP error on model '\$model' after the bounded retry" "$f" | grep -cE '^[[:space:]]*exit 1$' || true)
  [ "$n" = "1" ] || r15_bad="${r15_bad} ${label}(persistent-transient-http-exit-0-path-not-loud)"
  n=$(grep -A2 -F "persistent HTTP error on model '\$model' (exit \$status) after the bounded retry" "$f" | grep -cE '^[[:space:]]*exit "\$status"$' || true)
  [ "$n" = "1" ] || r15_bad="${r15_bad} ${label}(persistent-transient-http-exit-status-path-not-loud)"
  grep -qF 'mkfifo "$fifo"' "$f" || r15_bad="${r15_bad} ${label}(no-fifo-capture-shape)"
  grep -qF 'mkfifo is unavailable on this runner' "$f" || r15_bad="${r15_bad} ${label}(no-loud-mkfifo-fallback)"
  grep -qF 'HANG_IDLE_SECONDS' "$f" || r15_bad="${r15_bad} ${label}(no-stall-idle-knob)"
  grep -qF 'HANG_POLL_SECONDS' "$f" || r15_bad="${r15_bad} ${label}(no-stall-poll-knob)"
  # Tester round 6 (watchdog production defaults): every behavioral scenario
  # overrides the knobs, so the default literals themselves are exact-pinned.
  # `:-86400` would need a full day of silence (past every step timeout),
  # `:-2` kills any attempt quiet for a single poll, and `:-3600` delays the
  # first check past the Maintainer step cap; each silently restores the
  # #653 incident behavior this guard exists to bound.
  grep -qF 'hang_idle_seconds="${HANG_IDLE_SECONDS:-600}"' "$f" || r15_bad="${r15_bad} ${label}(stall-idle-default-not-600)"
  grep -qF 'hang_poll_seconds="${HANG_POLL_SECONDS:-30}"' "$f" || r15_bad="${r15_bad} ${label}(stall-poll-default-not-30)"
  # Review F3: the knobs are clamped to sane positive bounds, so an env
  # override of 0 (busy-loop with `idle += 0`, watchdog silently disabled) or
  # a value beyond the shell's integer range (every `-ge` errors, watchdog
  # never fires) can never disable the watchdog. The poll=0 case is also
  # exercised behaviorally (scenario `hang-poll-zero`).
  grep -qF '[ "$hang_poll_seconds" -ge 1 ] 2>/dev/null || hang_poll_seconds=30' "$f" || r15_bad="${r15_bad} ${label}(no-stall-poll-lower-clamp)"
  grep -qF '[ "$hang_idle_seconds" -ge 1 ] 2>/dev/null || hang_idle_seconds=600' "$f" || r15_bad="${r15_bad} ${label}(no-stall-idle-lower-clamp)"
  grep -qF '[ "$hang_idle_seconds" -le 86400 ] 2>/dev/null || hang_idle_seconds=600' "$f" || r15_bad="${r15_bad} ${label}(no-stall-idle-upper-clamp)"
  [ "$(grep -cF 'wait "$oc_pid"; status=$?' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-separate-opencode-pid-wait)"
  [ "$(grep -cF 'wait "$tee_pid"; tee_status=$?' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-separate-tee-pid-wait)"
  [ "$(grep -cF 'kill -TERM "$oc_pid"' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-stall-term-kill)"
  [ "$(grep -cF 'kill -KILL "$oc_pid"' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-stall-kill-escalation)"
  # Tester round 6 (bounded TERM-to-KILL grace): the watchdog's escalation
  # window is extracted between the hang_flag write and its own `exit 0` and
  # must carry the exact five-step shape: TERM oc, TERM tee, a single bounded
  # `sleep 5` grace, KILL oc, KILL tee. A lengthened grace (`sleep 3600`)
  # would let a TERM-surviving child burn toward the step timeout instead of
  # the bounded escalation, and a dropped tee signal can orphan the capture
  # child.
  # Tester round 7 (fire-block order): presence and count alone never bound
  # the ORDER, so a TERM/KILL swap or the grace moved before the first TERM
  # or after the last KILL kept the audit green while KILL landed before or
  # back-to-back with TERM, destroying the window in which a TERM-trapping
  # opencode finishes its cleanup; `term-grace` backs the order behaviorally.
  # Tester round 8 (fire-region completeness): the round-7 pin filtered the
  # region down to the five escalation lines, so unknown lines spliced
  # between or around them escaped. The whole-region pin below normalizes
  # every line (leading/trailing whitespace, an optional trailing
  # `2>/dev/null`, blank lines) and requires exactly the hang-flag write,
  # the five steps in order, and `exit 0`, nothing else;
  # `hang-child-ignores-term` backs the KILL behaviorally (an attempt that
  # ignores TERM can only be ended by SIGKILL, so a neutered KILL blocks
  # into the scenario timeout).
  r15_fire=$(awk '
    index($0, "printf") && index($0, "> \"$hang_flag\"") { in_fire=1 }
    in_fire { print }
    in_fire && /^[[:space:]]*exit 0[[:space:]]*$/ { exit }
  ' "$f" 2>/dev/null || true)
  if [ "$(printf '%s\n' "$r15_fire" | grep -cE '^[[:space:]]*sleep [0-9]+$' || true)" != "1" ] \
     || ! printf '%s\n' "$r15_fire" | grep -qE '^[[:space:]]*sleep 5$'; then
    r15_bad="${r15_bad} ${label}(no-bounded-term-kill-grace)"
  fi
  for r15_step in 'kill -TERM "$oc_pid" 2>/dev/null' 'kill -TERM "$tee_pid" 2>/dev/null' 'kill -KILL "$oc_pid" 2>/dev/null' 'kill -KILL "$tee_pid" 2>/dev/null'; do
    printf '%s\n' "$r15_fire" | grep -qF "$r15_step" || r15_bad="${r15_bad} ${label}(stall-fire-block-incomplete-escalation)"
  done
  # Tester round 8 (whole-region completeness): the round-7 ordered pin
  # filtered the region down to matching lines, so any unknown line spliced
  # between or around the steps (`sleep 1d` before the first TERM or after
  # the grace, a shadowed `if false; then ... fi` around a KILL, an extra
  # early kill) passed while the abort window changed or the escalation was
  # neutered. The normalized whole-region pin strips leading/trailing
  # whitespace and an optional trailing `2>/dev/null`, drops blank lines, and
  # requires the extracted block to be EXACTLY the hang-flag write, the five
  # steps in order, and the success exit, with nothing else.
  # Review round 15 (injective compare): the round-8/12/13/14 region pins
  # joined the normalized line streams with `|` (tr '\n' '|'), which is not
  # injective: rewriting two real lines into one merged line (carrying a bare
  # `|`, no spaces) produced the same joined string and passed while the
  # first line's output was swallowed into the second command's stdin. The
  # compares are now direct multiline string comparisons at all four sites
  # (fire region, capture prelude, and both run-block streams).
  r15_fire_region=$(printf '%s\n' "$r15_fire" \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/[[:space:]]*2>\/dev\/null$//' -e 's/[[:space:]]*$//' \
    | grep -vE '^$' || true)
  r15_fire_expect=$(cat <<'R15FIREEOF'
printf 'hang\n' > "$hang_flag"
kill -TERM "$oc_pid"
kill -TERM "$tee_pid"
sleep 5
kill -KILL "$oc_pid"
kill -KILL "$tee_pid"
exit 0
R15FIREEOF
  )
  if [ "$r15_fire_region" != "$r15_fire_expect" ]; then
    r15_bad="${r15_bad} ${label}(stall-fire-region-not-exact-term-term-sleep-kill-kill)"
  fi
  # Review round 12 (whole-watchdog-subshell completeness): the round-8 pin
  # anchored its region at the hang-flag write, so a line spliced anywhere in
  # the watchdog outside the fire block (between the subshell open and the
  # baseline read, after the poll sleep, after the post-sleep liveness check,
  # between the idle accumulation and the threshold, between the threshold
  # and the warning echo, between the echo and the flag write, in the re-arm
  # else branch) kept R15 green while the abort window grew by a day and the
  # #653 stall class silently recurred. Review round 13 showed the round-12
  # window itself was still too narrow: a line spliced immediately outside
  # the bare subshell open/close pair (before the `(`, after the `) &`, after
  # the watch_pid assignment, after the oc reap and status capture, before
  # the tee launch) kept R15 green while the watchdog launch, the reap, or
  # the whole capture pipeline was delayed by a day at the production
  # defaults, so the bounded retry never happened within any step timeout
  # and the #653 class silently recurred. The pin below spans the whole FIFO
  # capture prelude from the `if mkfifo` branch line through the branch's
  # closing `set -e`: the tee launch, the opencode launch, the subshell, the
  # reap, and the cleanup, nothing else. Every line is normalized
  # (leading/trailing whitespace, an optional trailing `2>/dev/null`),
  # comment and blank lines are dropped so comment edits cannot brittle-fail
  # it. The region's outer boundary used to be the documented limit of
  # exact-region pins (a line inserted before the `if mkfifo` branch line or
  # after the branch's `set -e` was caught by neither this pin nor any other
  # exact region); review round 14 closed that residual by adding the
  # whole-run-block exact pin in r15_freetier_pins, so any such insertion
  # now fails `${label}(run-block-not-exact)`.
  r15_watch=$(awk '
    /^[[:space:]]*if mkfifo .*then[[:space:]]*$/ { in_w=1 }
    in_w { print }
    in_w && /^[[:space:]]*set -e[[:space:]]*$/ { exit }
  ' "$f" 2>/dev/null || true)
  r15_watch_region=$(printf '%s\n' "$r15_watch" \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/[[:space:]]*2>\/dev\/null$//' -e 's/[[:space:]]*$//' \
    | grep -vE '^#|^$' || true)
  r15_watch_expect=$(cat <<'R15WATCHEOF'
if mkfifo "$fifo" 2>/dev/null; then
set +e
tee "$log" < "$fifo" &
tee_pid=$!
MODEL="$model" opencode github run > "$fifo" 2>&1 &
oc_pid=$!
(
last_size=$(wc -c < "$log" 2>/dev/null || echo 0)
idle=0
while kill -0 "$oc_pid" 2>/dev/null; do
sleep "$hang_poll_seconds"
kill -0 "$oc_pid" 2>/dev/null || exit 0
size=$(wc -c < "$log" 2>/dev/null || echo 0)
if [ "$size" -eq "$last_size" ]; then
idle=$((idle + hang_poll_seconds))
if [ "$idle" -ge "$hang_idle_seconds" ]; then
echo "::warning::opencode produced no output for ${hang_idle_seconds}s on model '$model' (provider stall, issue #653); aborting this attempt."
printf 'hang\n' > "$hang_flag"
kill -TERM "$oc_pid"
kill -TERM "$tee_pid"
sleep 5
kill -KILL "$oc_pid"
kill -KILL "$tee_pid"
exit 0
fi
else
idle=0
last_size=$size
fi
done
) &
watch_pid=$!
wait "$oc_pid"; status=$?
wait "$tee_pid"; tee_status=$?
kill "$watch_pid"
wait "$watch_pid"
set -e
R15WATCHEOF
  )
  if [ "$r15_watch_region" != "$r15_watch_expect" ]; then
    r15_bad="${r15_bad} ${label}(watchdog-prelude-not-exact)"
  fi
  # Tester round 7 (watchdog liveness lines): the loop gate and the
  # post-sleep liveness re-check are what let the watchdog notice the attempt
  # exiting and stop watching instead of polling a dead pid; `while :` or
  # `|| true` keeps the audit green while the watchdog can never exit on its
  # own. Exact-form pins: the semantics stay behavioral elsewhere.
  grep -qF 'while kill -0 "$oc_pid" 2>/dev/null; do' "$f" || r15_bad="${r15_bad} ${label}(watchdog-loop-not-gated-on-oc-liveness)"
  grep -qF 'kill -0 "$oc_pid" 2>/dev/null || exit 0' "$f" || r15_bad="${r15_bad} ${label}(watchdog-post-sleep-liveness-check-missing)"
  [ "$(grep -cE '^[[:space:]]*if \[ -s "\$hang_flag" \]; then$' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-stall-flag-gate)"
  [ "$(grep -cF 'hang_retry_used=0' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-stall-retry-counter)"
  [ "$(grep -cE '^[[:space:]]*if \[ "\$hang_retry_used" -lt 1 \]; then$' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-bounded-stall-retry-cap)"
  [ "$(grep -cF 'hang_retry_used=1' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-stall-retry-consumption)"
  [ "$(grep -cF 'one bounded retry of the same model in 10s' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-stall-retry-marker)"
  [ "$(grep -cE '^[[:space:]]*sleep 10$' "$f" || true)" = "1" ] || r15_bad="${r15_bad} ${label}(no-stall-retry-backoff)"
  n=$(grep -A2 -F "repeated provider stall on model '\$model' after the bounded retry" "$f" | grep -cE '^[[:space:]]*exit 1$' || true)
  [ "$n" = "1" ] || r15_bad="${r15_bad} ${label}(persistent-stall-not-loud)"
  # Tester round 6 (success-path exit shape): a healthy completion must exit 0
  # itself; rewriting it to `true` falls through to the nonzero handlers and
  # annotates every healthy run with a false failure (and a loose nonzero-MNF
  # substring in a success log could even advance the rung). Exactly one
  # rm-of-the-capture-files line is immediately followed by `exit 0` (the
  # success path; `continue`, `sleep`, and every loud exit follow the others).
  n=$(grep -A1 -F 'rm -f "$log" "$fifo" "$hang_flag"' "$f" | grep -cE '^[[:space:]]*exit 0$' || true)
  [ "$n" = "1" ] || r15_bad="${r15_bad} ${label}(success-path-not-exit-0)"
  # Tester round 5 element-presence tripwires: the FIFO shape's stderr merge
  # and the watchdog's silence accounting are the exact one-line sites whose
  # rewrites evaded the matrix (dropping `2>&1` blinds every detector to
  # stderr-borne terminal lines; `idle += 1` or a non-accumulating idle never
  # reaches the threshold at the production cadence; a zeroed size read kills
  # a live producer; dropping the re-arm loses a post-output stall). The
  # round-5 scenarios (fifo-stderr-ft/ft0, hang-poll-slow, hang-active,
  # out-then-hang) own the semantics; these are cheap shape tripwires.
  grep -qF 'opencode github run > "$fifo" 2>&1 &' "$f" || r15_bad="${r15_bad} ${label}(fifo-capture-not-merging-stderr)"
  grep -qF 'idle=$((idle + hang_poll_seconds))' "$f" || r15_bad="${r15_bad} ${label}(watchdog-idle-not-accumulating-by-poll)"
  grep -qF 'last_size=$size' "$f" || r15_bad="${r15_bad} ${label}(watchdog-not-rearming-after-growth)"
  # The size-read pin is line-anchored: a plain fixed-string probe is also
  # satisfied by the `last_size=$(wc ...)` initializer (substring), so it
  # could never catch the poll line being rewritten (verifier finding D1).
  grep -qE '^[[:space:]]*size=\$\(wc -c < "\$log" 2>/dev/null \|\| echo 0\)$' "$f" || r15_bad="${r15_bad} ${label}(watchdog-size-read-missing)"
  # Tester round 6 (watchdog arithmetic and re-arm forms): the threshold check
  # must stay inclusive (`-ge`: fires at exactly the configured idle), the
  # poll sleep must consume the poll knob (a literal cadence decouples the
  # silence accounting from the configured interval), and the post-growth
  # re-arm must RESET the accumulator to zero: subtracting a poll interval
  # (`idle=$((idle - hang_poll_seconds))`) makes the required post-output
  # silence grow with the attempt's productive duration, so a long producing
  # run could outlive the threshold indefinitely. The re-arm pin is
  # line-anchored with an exact count (the initializer and the re-arm are the
  # only `idle=0` lines) plus a sequence check (the re-arm precedes the size
  # baseline update), so neither anchor can satisfy the other.
  grep -qF 'if [ "$idle" -ge "$hang_idle_seconds" ]; then' "$f" || r15_bad="${r15_bad} ${label}(watchdog-threshold-not-inclusive-ge)"
  grep -qF 'sleep "$hang_poll_seconds"' "$f" || r15_bad="${r15_bad} ${label}(watchdog-poll-not-using-poll-knob)"
  [ "$(grep -cE '^[[:space:]]*idle=0[[:space:]]*$' "$f" || true)" = "2" ] || r15_bad="${r15_bad} ${label}(watchdog-idle-reset-count)"
  grep -A1 -E '^[[:space:]]*idle=0[[:space:]]*$' "$f" | grep -qF 'last_size=$size' || r15_bad="${r15_bad} ${label}(watchdog-idle-rearm-not-followed-by-baseline-update)"
  # Tester round 3: the degraded no-mkfifo branch must never touch a retry
  # budget. Inserting e.g. `freetier_retry_used=$((0))` there resets the budget
  # once per attempt in that shape, turning the bounded retry into an
  # unbounded loop while the literal `..._retry_used=0` count pins stay green
  # (an arithmetic form evades them). The nofifo-persistent and
  # nofifo-http-deep-grant scenarios catch the live behavior change; this
  # extraction pin catches the shape cheaply by asserting the branch between
  # the mkfifo attempt and its closing `fi` mentions no budget counter.
  # (the extraction is indentation-aware: the FIFO branch nests its own
  # if/else/fi for the size comparison, so the branch boundaries are the
  # `else`/`fi` lines at exactly the mkfifo `if` line's indentation)
  r15_deg=$(awk '
    match($0, /^[[:space:]]*/) { ind = substr($0, 1, RLENGTH) }
    /if mkfifo "\$fifo" 2>\/dev\/null; then/ && !in_if { in_if=1; if_ind=ind; next }
    in_if && !in_else && $0 == if_ind "else" { in_else=1; next }
    in_else && $0 == if_ind "fi" { exit }
    in_else { print }
  ' "$f" 2>/dev/null || true)
  if ! printf '%s\n' "$r15_deg" | grep -qF 'mkfifo is unavailable'; then
    r15_bad="${r15_bad} ${label}(degraded-branch-extraction-empty)"
  elif printf '%s\n' "$r15_deg" | grep -qF 'retry_used'; then
    r15_bad="${r15_bad} ${label}(degraded-no-mkfifo-branch-touches-retry-budget)"
  fi
  # Review round 14 (whole-run-block completeness): every pin above binds an
  # exact region INSIDE the runner block, so a line spliced anywhere else in
  # it (the pre-attempt header, the degraded no-mkfifo else branch, the
  # post-`fi` classification/retry/budget logic) stayed green while the
  # block's behavior changed: six one-line `sleep 1d` insertions at those
  # sites kept the parent at 23/0, and at the production step timeouts the
  # delayed attempt start or retry never happened at all. The whole extracted
  # `run:` block is now pinned line-exact against the regenerated literal in
  # r15_expected_run_block, normalized exactly like the region pins above
  # (leading/trailing whitespace and an optional trailing `2>/dev/null`
  # stripped, comment and blank lines dropped): any inserted or modified
  # non-comment line anywhere in the block fails the exact compare. Review
  # round 15 removed the join's last hole: the normalized streams were joined
  # with `|`, so a rewrite merging two real lines into one (carrying a bare
  # `|`) compared equal; the compare is now a direct multiline string
  # comparison, which keeps every line boundary significant. Review round
  # 18 (F1) replaced the textual extraction itself: the `run` scalar now
  # comes from the python3/PyYAML structural pass at the top of R15 (strict
  # duplicate-key-rejecting loader, step resolved by its parsed `name`), so
  # a `run: |` decoy inside any block scalar in the step and the valid
  # `run: |2` spelling both resolve to the real executing body; a missing
  # structural extraction fails the compare, and an unknown label (missing
  # literal) fails rather than vacuously passing.
  r15_runblock=""
  if [ -n "${r15_struct_dir:-}" ] && [ -f "$r15_struct_dir/$label.run" ]; then
    r15_runblock=$(cat "$r15_struct_dir/$label.run" 2>/dev/null || true)
  fi
  r15_runblock_region=$(printf '%s\n' "$r15_runblock" \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/[[:space:]]*2>\/dev\/null$//' -e 's/[[:space:]]*$//' \
    | grep -vE '^#|^$' || true)
  r15_runblock_expect=$(r15_expected_run_block "$label" \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/[[:space:]]*2>\/dev\/null$//' -e 's/[[:space:]]*$//' \
    | grep -vE '^#|^$' || true)
  if [ -z "$r15_runblock_expect" ]; then
    r15_bad="${r15_bad} ${label}(run-block-expected-missing)"
  elif [ -z "$r15_runblock" ]; then
    r15_bad="${r15_bad} ${label}(run-block-extraction-empty)"
  elif [ "$r15_runblock_region" != "$r15_runblock_expect" ]; then
    r15_bad="${r15_bad} ${label}(run-block-not-exact)"
  fi
}
if [ ! -f "$ACTION_FILE" ]; then
  r15_bad="${r15_bad} action-file(missing)"
else
  grep -qF 'bash "$script"' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-resolver-invocation)"
  grep -qF 'Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-boundary-aware-per-rung-retry)"
  # Tester round 6 (nonzero-MNF advance anchoring): the advance grep is
  # deliberately UNANCHORED at column 0 so the wrapper's `Error: Model not
  # found: ...` catch-handler form also advances the rung; a `^` anchor
  # silently drops that form and turns a recoverable advance into an
  # unclassified nonzero death. The exact-form pin excludes `^`, and the
  # mnf-err-nz behavioral scenario binds the prefixed form end-to-end.
  grep -qF 'if grep -qE "Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)" "$log"; then' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(nonzero-mnf-grep-column0-anchored)"
  grep -qF 'model_error_terminal()' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-exit-0-terminal-detector)"
  grep -qF 'if model_error_terminal "$log" "$model"; then' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(exit-0-not-terminal-anchored)"
  grep -qF 'Model not found: ${2//./\\.}(\. Did you mean: .*|\.?$)' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-anchored-terminal-error-form)"
  grep -A1 'exhausted every model rung' "$ACTION_FILE" | grep -q 'exit 1' || r15_bad="${r15_bad} action-file(loud-exhaustion-not-exit-1)"
  # Non-blocking extraction hardening (review round F5 residual): the awk
  # extractor for the behavioral test takes the FIRST step matching the name,
  # so a duplicate compliant decoy step placed earlier could shadow a broken
  # real step. Exactly one such step must exist.
  [ "$(grep -cE '^[[:space:]]*-[[:space:]]*name: Run opencode[[:space:]]*$' "$ACTION_FILE" || true)" = "1" ] || r15_bad="${r15_bad} action-file(run-step-not-unique)"
  # Step identity (review round 7 non-blocking hardening): a dead decoy step
  # named like the runner and parked earlier (gated with `if: false`) must
  # never shadow the real step. Issue #653 makes the invocation count exactly
  # TWO inside the single executing step (the FIFO capture shape and the
  # mutually-exclusive no-mkfifo degraded shape); r15_behavioral executes the
  # structurally extracted block (review round 18 F1) and additionally
  # asserts both sites live inside the extracted block, so a third (decoy)
  # invocation anywhere in the file still fails, and the extracted step must
  # be unconditional - together the extracted step is the executing one.
  [ "$(grep -cF 'opencode github run' "$ACTION_FILE" || true)" = "2" ] || r15_bad="${r15_bad} action-file(run-invocation-count)"
  r15_freetier_pins "action-file" "$ACTION_FILE"
fi
if [ ! -f "$MAIN_WF" ]; then
  r15_bad="${r15_bad} maintainer.yml(missing)"
else
  grep -qF 'bash .github/actions/opencode-run/resolve-model.sh' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-resolver-invocation)"
  grep -q 'MODEL_CANDIDATES' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-candidate-chain)"
  grep -qF 'Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-boundary-aware-per-rung-retry)"
  # Tester round 6 (nonzero-MNF advance anchoring): same exact-form pin as the
  # composite (see there for the rationale; mnf-err-nz binds it behaviorally).
  grep -qF 'if grep -qE "Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)" "$log"; then' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(nonzero-mnf-grep-column0-anchored)"
  grep -qF 'model_error_terminal()' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-exit-0-terminal-detector)"
  grep -qF 'if model_error_terminal "$log" "$model"; then' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(exit-0-not-terminal-anchored)"
  grep -qF 'Model not found: ${2//./\\.}(\. Did you mean: .*|\.?$)' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-anchored-terminal-error-form)"
  grep -qF '.maintainer/decision.json' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-decision-contract-test)"
  grep -q 'id: verify_agent' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-loud-verify)"
  # Tester round 6 (pre-existing hollow-green class, closed in the same pass):
  # the Maintainer verify must exit 1 when the decision contract is absent; a
  # rewritten `exit 0` returns the #591 hollow green on a dead agent run. The
  # marker line is unique, so exactly its next line must be the loud exit.
  n=$(grep -A1 'no .maintainer/decision.json' "$MAIN_WF" | grep -cE '^[[:space:]]*exit 1$' || true)
  [ "$n" = "1" ] || r15_bad="${r15_bad} maintainer.yml(hollow-green-verify-not-exit-1)"
  grep -A1 'exhausted every model rung' "$MAIN_WF" | grep -q 'exit 1' || r15_bad="${r15_bad} maintainer.yml(loud-exhaustion-not-exit-1)"
  # Same identity pin as the composite: one runner step exactly, carrying
  # exactly the two #653 invocation shapes (FIFO + degraded fallback).
  [ "$(grep -cE '^[[:space:]]*-[[:space:]]*name: Run Maintainer agent[[:space:]]*$' "$MAIN_WF" || true)" = "1" ] || r15_bad="${r15_bad} maintainer.yml(run-step-not-unique)"
  [ "$(grep -cF 'opencode github run' "$MAIN_WF" || true)" = "2" ] || r15_bad="${r15_bad} maintainer.yml(run-invocation-count)"
  r15_freetier_pins "maintainer.yml" "$MAIN_WF"
fi
# Issue #620 functional detector test: executes the REAL extracted
# freetier_error_terminal AND model_error_terminal from both runner paths
# against the incident's terminal lines (match) and echo / envelope /
# trailing-suffix / stale-beyond-tail / superset-id forms (no match), so the
# anchoring contract is verified behaviorally, not only by grep pins (review
# F5 verification found that a suffix-loosened regex, a whole-log match, a
# tail-widened scope, or a boundary-less id regex could all pass the static
# pins when the pinned originals were kept as comments; these fixtures make
# the live detector's semantics observable directly).
r15_fn_dir=$(mktemp -d)
sed -n '/freetier_error_terminal() {/,/^[[:space:]]*}[[:space:]]*$/p' "$ACTION_FILE" > "$r15_fn_dir/action.fn" 2>/dev/null || true
sed -n '/freetier_error_terminal() {/,/^[[:space:]]*}[[:space:]]*$/p' "$MAIN_WF" > "$r15_fn_dir/maint.fn" 2>/dev/null || true
sed -n '/model_error_terminal() {/,/^[[:space:]]*}[[:space:]]*$/p' "$ACTION_FILE" > "$r15_fn_dir/action-mnf.fn" 2>/dev/null || true
sed -n '/model_error_terminal() {/,/^[[:space:]]*}[[:space:]]*$/p' "$MAIN_WF" > "$r15_fn_dir/maint-mnf.fn" 2>/dev/null || true
# Issue #653: the transient-HTTP detector pair, extracted the same way.
sed -n '/transient_http_error_terminal() {/,/^[[:space:]]*}[[:space:]]*$/p' "$ACTION_FILE" > "$r15_fn_dir/action-http.fn" 2>/dev/null || true
sed -n '/transient_http_error_terminal() {/,/^[[:space:]]*}[[:space:]]*$/p' "$MAIN_WF" > "$r15_fn_dir/maint-http.fn" 2>/dev/null || true
cat > "$r15_fn_dir/terminal.txt" <<'R15EOF'
AI_APICallError: OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building.
APIError: OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building.
R15EOF
cat > "$r15_fn_dir/echo.txt" <<'R15EOF'
  | AI_APICallError: OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building.
Here is prose quoting the provider line above.
R15EOF
cat > "$r15_fn_dir/envelope.txt" <<'R15EOF'
  responseBody: "{\"type\":\"error\",\"error\":{\"type\":\"FreeTierError\",\"message\":\"OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building.\"}}",
R15EOF
cat > "$r15_fn_dir/ft-suffix.txt" <<'R15EOF'
AI_APICallError: OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building. (quoted from a tool result)
R15EOF
cat > "$r15_fn_dir/ft-stale.txt" <<'R15EOF'
AI_APICallError: OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building.
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/ft-stale.txt"
done
printf 'Error: Model not found: opencode/model-a-free. Did you mean: opencode/glm-5.3-flash-free?\n' > "$r15_fn_dir/other.txt"
cat > "$r15_fn_dir/mnf-terminal.txt" <<'R15EOF'
Model not found: a-free. Did you mean: b-free?
R15EOF
cat > "$r15_fn_dir/mnf-echo.txt" <<'R15EOF'
  | Model not found: a-free. Did you mean: b-free?
Here is prose quoting the provider line above.
R15EOF
cat > "$r15_fn_dir/mnf-superset.txt" <<'R15EOF'
Model not found: a-free-plus. Did you mean: b-free?
R15EOF
cat > "$r15_fn_dir/mnf-stale.txt" <<'R15EOF'
Model not found: a-free. Did you mean: b-free?
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/mnf-stale.txt"
done
# Round-F8: the production rungs are DOTTED ids
# (opencode/deepseek-v4.1-flash-free). A real dotted id must match (the
# detector escapes each dot) while a lookalike with the dot position held by
# another character must not, so unescaping the live regex (leaving the
# pinned forms only in comments) can never pass.
cat > "$r15_fn_dir/mnf-dotted.txt" <<'R15EOF'
Model not found: opencode/deepseek-v4.1-flash-free. Did you mean: opencode/glm-5.3-flash-free?
R15EOF
cat > "$r15_fn_dir/mnf-dot-lookalike.txt" <<'R15EOF'
Model not found: opencode/deepseek-v4X1-flash-free. Did you mean: opencode/glm-5.3-flash-free?
R15EOF
# Round-A2: the tail window's LOWER bound. `tail -n 40` must still match a
# terminal line followed by 39 healthy lines (40 lines total), while a line
# followed by 40 healthy lines (41 total) must fall out of the window. A
# silently narrowed window (e.g. `tail -n 2`) fails the must-match fixture
# and a widened one fails the must-not-match fixture, so the pair pins the
# window to exactly 40 lines for both detectors.
cat > "$r15_fn_dir/ft-window39.txt" <<'R15EOF'
AI_APICallError: OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building.
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/ft-window39.txt"
done
cat > "$r15_fn_dir/ft-window40.txt" <<'R15EOF'
AI_APICallError: OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building.
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/ft-window40.txt"
done
cat > "$r15_fn_dir/mnf-window39.txt" <<'R15EOF'
Model not found: a-free. Did you mean: b-free?
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/mnf-window39.txt"
done
cat > "$r15_fn_dir/mnf-window40.txt" <<'R15EOF'
Model not found: a-free. Did you mean: b-free?
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/mnf-window40.txt"
done
# Round-7 hardening (case folding): both detectors must stay case-sensitive,
# so a transcript echo in another case can never advance the rung or consume
# the retry. A `grep -qiE` mutation passes every other fixture; these
# uppercase forms must not match.
cat > "$r15_fn_dir/ft-upper.txt" <<'R15EOF'
OPENCODE'S FREE TIER CAN ONLY BE USED FROM WITHIN OPENCODE. DOWNLOAD IT AT HTTPS://OPENCODE.AI AND KEEP BUILDING.
R15EOF
cat > "$r15_fn_dir/mnf-upper.txt" <<'R15EOF'
Model not found: A-FREE. Did you mean: b-free?
R15EOF
# Issue #653 functional fixtures for transient_http_error_terminal: the
# incident's terminal lines in every observed provider prefix form (match),
# plus the forms that must never consume the retry: an indented tool-call
# echo, the responseBody JSON envelope, a trailing-suffixed line, a phrase
# variant (different wording must not match), an uppercase line (the match
# stays case-sensitive), the provider's own `AI_RetryError: Failed after 3
# attempts. Last error: ...` summary (anchored whole-line form only), and a
# line stale beyond the tail window; the window lower-bound pair pins the
# window to exactly 40 lines here too.
cat > "$r15_fn_dir/http-terminal.txt" <<'R15EOF'
AI_APICallError: Internal Server Error
APIError: Internal Server Error.
Error: Rate limit exceeded. Please try again later.
AI_APICallError: Bad Gateway
APIError: Service Unavailable
Error: Gateway Timeout
R15EOF
cat > "$r15_fn_dir/http-echo.txt" <<'R15EOF'
  | AI_APICallError: Internal Server Error
Here is prose quoting the provider line above.
R15EOF
cat > "$r15_fn_dir/http-envelope.txt" <<'R15EOF'
  responseBody: "{\"type\":\"error\",\"error\":{\"message\":\"Internal Server Error\"}}",
R15EOF
cat > "$r15_fn_dir/http-suffix.txt" <<'R15EOF'
AI_APICallError: Internal Server Error (quoted from a tool result)
R15EOF
cat > "$r15_fn_dir/http-phrase-variant.txt" <<'R15EOF'
AI_APICallError: Rate limit exceeded. Please try again soon.
R15EOF
cat > "$r15_fn_dir/http-retry-summary.txt" <<'R15EOF'
AI_RetryError: Failed after 3 attempts. Last error: Internal Server Error
R15EOF
cat > "$r15_fn_dir/http-upper.txt" <<'R15EOF'
AI_APICallError: INTERNAL SERVER ERROR
R15EOF
cat > "$r15_fn_dir/http-stale.txt" <<'R15EOF'
AI_APICallError: Internal Server Error
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/http-stale.txt"
done
cat > "$r15_fn_dir/http-window39.txt" <<'R15EOF'
AI_APICallError: Internal Server Error
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/http-window39.txt"
done
cat > "$r15_fn_dir/http-window40.txt" <<'R15EOF'
AI_APICallError: Internal Server Error
R15EOF
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40; do
  printf 'healthy tail line %s\n' "$i" >> "$r15_fn_dir/http-window40.txt"
done
# Review F2: pipe-buffer-sized tail windows. Every `shell: bash` step runs as
# `bash --noprofile --norc -eo pipefail` (production), and `grep -q` exits at
# the first match while `tail` may still be writing: once the 40-line window
# exceeds the 64 KiB pipe buffer, tail takes SIGPIPE and a bare pipeline
# returns 141, so a genuine terminal line reads as "no match" (silent green on
# the exit-0 path, lost retry on the nonzero path). Each big-window fixture
# carries the terminal line FIRST plus 39 lines of ~4 KiB (about 160 KiB
# total, well past any pipe buffer), so the match sits before the remaining
# bytes and only a pipefail-safe detector can return 0. The detector-case
# helpers below run under `set -o pipefail` (the production shell shape), so
# reverting the ( set +o pipefail; ... ) wrap in either runner file fails R15.
r15_big_line=$(printf '%4088s' '' | tr ' ' x)
r15_write_big_window() {
  local first="$1" f="$2" i
  printf '%s\n' "$first" > "$f"
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39; do
    printf 'healthy tail line %s %s\n' "$i" "$r15_big_line" >> "$f"
  done
}
r15_write_big_window "AI_APICallError: OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building." "$r15_fn_dir/ft-bigwindow.txt"
r15_write_big_window "Model not found: a-free. Did you mean: b-free?" "$r15_fn_dir/mnf-bigwindow.txt"
r15_write_big_window "AI_APICallError: Internal Server Error" "$r15_fn_dir/http-bigwindow.txt"
r15_detector_case() {
  local got
  ( set +e; set -o pipefail; . "$1" >/dev/null 2>&1; freetier_error_terminal "$3" ) >/dev/null 2>&1
  got=$?
  if [ "$got" != "$2" ]; then
    r15_bad="${r15_bad} detector-functional($(basename "$1"),$(basename "$3"),rc=$got,want=$2)"
  fi
}
r15_mnf_detector_case() {
  local got
  ( set +e; set -o pipefail; . "$1" >/dev/null 2>&1; model_error_terminal "$3" "${4:-a-free}" ) >/dev/null 2>&1
  got=$?
  if [ "$got" != "$2" ]; then
    r15_bad="${r15_bad} mnf-detector-functional($(basename "$1"),$(basename "$3"),rc=$got,want=$2)"
  fi
}
r15_http_detector_case() {
  local got
  ( set +e; set -o pipefail; . "$1" >/dev/null 2>&1; transient_http_error_terminal "$3" ) >/dev/null 2>&1
  got=$?
  if [ "$got" != "$2" ]; then
    r15_bad="${r15_bad} http-detector-functional($(basename "$1"),$(basename "$3"),rc=$got,want=$2)"
  fi
}
for r15_fn in "$r15_fn_dir/action.fn" "$r15_fn_dir/maint.fn"; do
  if [ ! -s "$r15_fn" ]; then
    r15_bad="${r15_bad} detector-functional($(basename "$r15_fn"),empty)"
    continue
  fi
  r15_detector_case "$r15_fn" 0 "$r15_fn_dir/terminal.txt"
  r15_detector_case "$r15_fn" 1 "$r15_fn_dir/echo.txt"
  r15_detector_case "$r15_fn" 1 "$r15_fn_dir/envelope.txt"
  r15_detector_case "$r15_fn" 1 "$r15_fn_dir/other.txt"
  r15_detector_case "$r15_fn" 1 "$r15_fn_dir/ft-suffix.txt"
  r15_detector_case "$r15_fn" 1 "$r15_fn_dir/ft-stale.txt"
  r15_detector_case "$r15_fn" 0 "$r15_fn_dir/ft-window39.txt"
  r15_detector_case "$r15_fn" 1 "$r15_fn_dir/ft-window40.txt"
  r15_detector_case "$r15_fn" 0 "$r15_fn_dir/ft-bigwindow.txt"
  r15_detector_case "$r15_fn" 1 "$r15_fn_dir/ft-upper.txt"
done
for r15_fn in "$r15_fn_dir/action-mnf.fn" "$r15_fn_dir/maint-mnf.fn"; do
  if [ ! -s "$r15_fn" ]; then
    r15_bad="${r15_bad} mnf-detector-functional($(basename "$r15_fn"),empty)"
    continue
  fi
  r15_mnf_detector_case "$r15_fn" 0 "$r15_fn_dir/mnf-terminal.txt"
  r15_mnf_detector_case "$r15_fn" 1 "$r15_fn_dir/mnf-echo.txt"
  r15_mnf_detector_case "$r15_fn" 1 "$r15_fn_dir/mnf-superset.txt"
  r15_mnf_detector_case "$r15_fn" 1 "$r15_fn_dir/mnf-stale.txt"
  r15_mnf_detector_case "$r15_fn" 0 "$r15_fn_dir/mnf-dotted.txt" "opencode/deepseek-v4.1-flash-free"
  r15_mnf_detector_case "$r15_fn" 1 "$r15_fn_dir/mnf-dot-lookalike.txt" "opencode/deepseek-v4.1-flash-free"
  r15_mnf_detector_case "$r15_fn" 0 "$r15_fn_dir/mnf-window39.txt"
  r15_mnf_detector_case "$r15_fn" 1 "$r15_fn_dir/mnf-window40.txt"
  r15_mnf_detector_case "$r15_fn" 0 "$r15_fn_dir/mnf-bigwindow.txt"
  r15_mnf_detector_case "$r15_fn" 1 "$r15_fn_dir/mnf-upper.txt"
done
for r15_fn in "$r15_fn_dir/action-http.fn" "$r15_fn_dir/maint-http.fn"; do
  if [ ! -s "$r15_fn" ]; then
    r15_bad="${r15_bad} http-detector-functional($(basename "$r15_fn"),empty)"
    continue
  fi
  r15_http_detector_case "$r15_fn" 0 "$r15_fn_dir/http-terminal.txt"
  r15_http_detector_case "$r15_fn" 1 "$r15_fn_dir/http-echo.txt"
  r15_http_detector_case "$r15_fn" 1 "$r15_fn_dir/http-envelope.txt"
  r15_http_detector_case "$r15_fn" 1 "$r15_fn_dir/http-suffix.txt"
  r15_http_detector_case "$r15_fn" 1 "$r15_fn_dir/http-phrase-variant.txt"
  r15_http_detector_case "$r15_fn" 1 "$r15_fn_dir/http-retry-summary.txt"
  r15_http_detector_case "$r15_fn" 1 "$r15_fn_dir/http-upper.txt"
  r15_http_detector_case "$r15_fn" 1 "$r15_fn_dir/http-stale.txt"
  r15_http_detector_case "$r15_fn" 0 "$r15_fn_dir/http-window39.txt"
  r15_http_detector_case "$r15_fn" 1 "$r15_fn_dir/http-window40.txt"
  r15_http_detector_case "$r15_fn" 0 "$r15_fn_dir/http-bigwindow.txt"
done
rm -rf "$r15_fn_dir"
# Issue #620 loop-level behavioral test (review F5): static pins and a
# detector-only functional test cannot express execution order or
# reachability, so decoys, dead code, and one-line relocations satisfied them
# while the runtime contract changed (review rounds F3/F4/F5 each found
# escapes from textual pinning). This test extracts the REAL `run:` block of
# both runner paths, executes it in an isolated sandbox (mktemp outside the
# repo, execution cwd set to the sandbox so no relative path can escape it,
# executable mock `opencode` and mock `sleep`, live Actions env scrubbed per
# delegation.md section 6), and asserts the contract behaviorally: every
# scenario has a 10s timeout, so an unbounded retry re-spelling (cap decoy,
# dead consumption, in-loop budget reset) fails the rule instead of
# spinning. Interception is proven before any scenario: the sandbox PATH
# contains only the mock directory, `command -v opencode` must resolve to the
# mock, and a probe scenario must be answered by the mock. A hang or a
# missing harness binary fails closed, never skips. The extracted block is
# the real workflow body; its single Actions expression (the workflow_run
# guard) is substituted with `schedule`, matching the non-workflow_run arm.
# Round-7 hardening, widened in review rounds 15 and 16: the extracted step
# must be the executing one: its WHOLE step region (name line through the
# next sibling `- name:` or EOF) carries no `if:` key (the `if :`, `"if":`,
# and `'if':` spellings included) except, for maintainer.yml only, the exact
# shared actor-write gate condition of issue #696 (the gate step itself must
# be present in the same file); its block must carry BOTH #653 invocation
# sites (FIFO shape plus degraded no-mkfifo shape, allowed by the file-level
# count of exactly two); the step's remaining keys are bound too (no
# HANG_IDLE_SECONDS/HANG_POLL_SECONDS env override, no
# continue-on-error/timeout-minutes on the composite runner step, the
# Maintainer step's exact continue-on-error: true and timeout-minutes: 60
# each present exactly once, and exactly one `shell:` key whose exact line
# is `shell: bash`). The mock sleep records start/end timestamps KEYED BY
# the requested value and the matrix asserts, per expected value, that the
# next attempt started after that backoff actually completed (a backgrounded
# sleep cannot pass), and the fixtures and scenarios stay case-sensitive and
# three-rung deep enough that a case fold or a later-rung budget gate is
# observable. The watchdog's own poll sleeps (HANG_POLL_SECONDS, 1 by
# default; review F3 adds an explicit 0-override scenario) are value keyed
# too, so they can never masquerade as a 10/15/30s backoff. Review F2: the
# block runs under the exact production shell form (`bash --noprofile
# --norc -eo pipefail`), so a detector pipeline that is not pipefail-safe
# (grep -q SIGPIPE + tail 141 on a window past the pipe buffer) fails the
# behavioral matrix, not just the detector-level fixtures.
r15_timeout_bin=$(command -v timeout 2>/dev/null || true)
r15_env_bin=$(command -v env 2>/dev/null || true)
r15_bash_bin=$(command -v bash 2>/dev/null || true)
r15_sleep_bin=$(command -v sleep 2>/dev/null || true)
r15_mkfifo_bin=$(command -v mkfifo 2>/dev/null || true)
if [ -z "$r15_timeout_bin" ] || [ -z "$r15_env_bin" ] || [ -z "$r15_bash_bin" ] || [ -z "$r15_sleep_bin" ] || [ -z "$r15_mkfifo_bin" ]; then
  r15_bad="${r15_bad} behavioral-harness(missing-timeout-env-bash-sleep-or-mkfifo)"
fi
r15_behavioral() {
  local label="$1"
  local sbx block out tool p
  sbx=$(mktemp -d) || { r15_bad="${r15_bad} behavioral(${label},sandbox-failed)"; return; }
  block="$sbx/block.sh"; out="$sbx/out"
  mkdir -p "$sbx/bin" "$sbx/home" "$sbx/tmp"
  : > "$out"
  if [ -n "${r15_struct_dir:-}" ] && [ -f "$r15_struct_dir/$label.run" ]; then
    sed 's/\${{ github.event_name }}/schedule/g' "$r15_struct_dir/$label.run" > "$block" 2>/dev/null || true
  fi
  # Step identity, key set, env mapping, and candidate chain are bound
  # structurally by the python3 session above (review round 18): the step is
  # resolved by its parsed `name`, its parsed `run` scalar is what executes
  # here, duplicate keys are rejected by the loader, and explicit-key
  # spellings of `if`/watchdog env/`continue-on-error`/`timeout-minutes`/
  # `shell` are the same dict keys to the parser, so no textual spelling can
  # hide a key from the audit. That structural pass emits the same
  # `behavioral(<label>,...)` failures the old text scan emitted.
  if [ ! -s "$block" ] \
     || ! bash -n "$block" 2>/dev/null \
     || ! grep -qF 'freetier_error_terminal() {' "$block" \
     || ! grep -qF 'transient_http_error_terminal() {' "$block" \
     || ! grep -qF 'mkfifo "$fifo"' "$block" \
     || [ "$(grep -cF 'opencode github run' "$block" || true)" != "2" ] \
     || [ "$(grep -vE '^[[:space:]]*$' "$block" | tail -n 1 | grep -cE '^[[:space:]]*exit 1$' || true)" != "1" ]; then
    r15_bad="${r15_bad} behavioral(${label},extract-or-shape)"
    rm -rf "$sbx"
    return
  fi
  cat > "$sbx/bin/opencode" <<'R15MOCK'
#!/bin/bash
# Scenario-driven mock for the R15 loop-level behavioral test: records each
# invocation and answers per attempt from $R15_SCENARIO.
n=$(wc -l < "$R15_ATTEMPTS" 2>/dev/null); n=$(( ${n:-0} + 1 ))
# The start timestamp lets the harness prove the bounded backoff was actually
# waited before the next attempt (a backgrounded `sleep 15 &` starts the next
# attempt before the mock sleep's recorded end).
echo "model=${MODEL:-} $(date +%s%N)" >> "$R15_ATTEMPTS"
ft="OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building."
case "${R15_SCENARIO}:${n}" in
  probe:*) echo "probe ok"; exit 0 ;;
  transient-nonzero:1) echo "AI_APICallError: ${ft}"; exit 1 ;;
  transient-zero:1) echo "APIError: ${ft}"; exit 0 ;;
  transient-nonzero:*|transient-zero:*) echo "healthy success"; exit 0 ;;
  persistent-nonzero:*) echo "Error: ${ft}"; exit 3 ;;
  persistent-nonzero7:*) echo "Error: ${ft}"; exit 7 ;;
  persistent-zero:*) echo "AI_APICallError: ${ft}"; exit 0 ;;
  mnf-nonzero:1) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 4 ;;
  mnf-zero:1) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  mnf-nonzero:*|mnf-zero:*) echo "healthy success"; exit 0 ;;
  mnf-echo:*) printf '  | Model not found: %s. Did you mean: b-free?\n' "${MODEL}"; echo "healthy tail"; exit 0 ;;
  mnf-prefix:*) echo "Model not found: ${MODEL}-plus. Did you mean: b-free?"; exit 4 ;;
  mnf-stale:*) echo "Model not found: ${MODEL}. Did you mean: b-free?"; for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45; do echo "healthy tail line $i"; done; exit 0 ;;
  mnf-all:*) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  mnf-dot-lookalike:*) echo "Model not found: opencode/deepseek-v4X1-flash-free. Did you mean: opencode/glm-5.3-flash-free?"; exit 4 ;;
  echo-envelope:*) printf '  | AI_APICallError: %s\n' "${ft}"; printf '  responseBody: "{\\"type\\":\\"error\\"}",\n'; exit 0 ;;
  ft-echo-suffix:*) echo "AI_APICallError: ${ft} (quoted from a tool result)"; exit 0 ;;
  ft-stale:*) echo "AI_APICallError: ${ft}"; for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45; do echo "healthy tail line $i"; done; exit 0 ;;
  ft-trailing:1) echo "AI_APICallError: ${ft}"; echo "healthy tail line 1"; echo "healthy tail line 2"; echo "healthy tail line 3"; exit 0 ;;
  ft-trailing:*) echo "healthy success"; exit 0 ;;
  failing-tee*) echo "healthy success"; exit 0 ;;
  budget-rungs:1) echo "AI_APICallError: ${ft}"; exit 0 ;;
  budget-rungs:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  budget-rungs:*) echo "APIError: ${ft}"; exit 0 ;;
  mnf-then-ft:1) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 4 ;;
  mnf-then-ft:2) echo "APIError: ${ft}"; exit 0 ;;
  mnf-then-ft:*) echo "healthy success"; exit 0 ;;
  mnf-then-ft0:1) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  mnf-then-ft0:2) echo "APIError: ${ft}"; exit 0 ;;
  mnf-then-ft0:*) echo "healthy success"; exit 0 ;;
  deep-grant:1) echo "APIError: ${ft}"; exit 0 ;;
  deep-grant:2) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 0 ;;
  deep-grant:3) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 0 ;;
  deep-grant:*) echo "APIError: ${ft}"; exit 0 ;;
  deep-advance:1) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 0 ;;
  deep-advance:2) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 0 ;;
  deep-advance:3) echo "APIError: ${ft}"; exit 0 ;;
  deep-advance:*) echo "APIError: ${ft}"; exit 0 ;;
  unclassified:*) echo "some unrelated provider failure"; exit 5 ;;
  unclassified9:*) echo "some unrelated provider failure"; exit 9 ;;
  # Issue #653 scenarios: transient 429/5xx recovery on both exit shapes,
  # persistent loudness on both shapes, provider stalls (write nothing, keep
  # the process alive through the real sleep so the watchdog must kill it),
  # per-class budget independence, and the degraded no-mkfifo shape.
  http-nonzero:1) echo "AI_APICallError: Internal Server Error"; exit 1 ;;
  http-nonzero:*) echo "healthy success"; exit 0 ;;
  http-429:1) echo "AI_APICallError: Rate limit exceeded. Please try again later."; exit 1 ;;
  http-429:*) echo "healthy success"; exit 0 ;;
  http-zero:1) echo "APIError: Internal Server Error"; exit 0 ;;
  http-zero:*) echo "healthy success"; exit 0 ;;
  # Review F2 end-to-end pipe-buffer fixture: the terminal line first, then 39
  # lines of ~4 KiB (about 160 KiB, well past the 64 KiB pipe buffer), exit 0.
  # Under the production `-eo pipefail` shell the old bare detector pipeline
  # reads this as "no match" (tail SIGPIPE 141) and the run concludes green
  # with no retry; the pipefail-safe detector must retry the same model once.
  http-bigwindow:1) echo "AI_APICallError: Internal Server Error"; big=$(printf '%4088s' ''); big="${big// /x}"; for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39; do echo "healthy tail line $i $big"; done; exit 0 ;;
  http-bigwindow:*) echo "healthy success"; exit 0 ;;
  http-persistent:*) echo "Error: Internal Server Error"; exit 3 ;;
  http-zero-persistent:*) echo "AI_APICallError: Bad Gateway"; exit 0 ;;
  hang:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang:*) echo "healthy success"; exit 0 ;;
  hang-persistent:*) exec "$R15_REAL_SLEEP" 30 ;;
  # Review F3: same one-hang-then-healthy shape under a zero poll override.
  hang-poll-zero:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang-poll-zero:*) echo "healthy success"; exit 0 ;;
  http-then-hang:1) echo "AI_APICallError: Service Unavailable"; exit 0 ;;
  http-then-hang:2) exec "$R15_REAL_SLEEP" 30 ;;
  http-then-hang:*) echo "healthy success"; exit 0 ;;
  hang-then-http:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang-then-http:2) echo "AI_APICallError: Gateway Timeout"; exit 0 ;;
  hang-then-http:*) echo "healthy success"; exit 0 ;;
  nofifo-freetier:1) echo "AI_APICallError: ${ft}"; exit 1 ;;
  nofifo-freetier:*) echo "healthy success"; exit 0 ;;
  # Tester round 3 (test-integrity): the degraded no-mkfifo branch must honor
  # the same bounded-retry contract, so the nofifo scenarios include a
  # persistently rejecting provider (the bounded freetier retry must fail
  # loudly after exactly two attempts) and a cross-rung HTTP grant (a per-rung
  # or per-model budget reset inserted in that branch would spend a second
  # 30s backoff or loop forever).
  nofifo-persistent:*) echo "AI_APICallError: ${ft}"; exit 1 ;;
  nofifo-http-deep-grant:1) echo "AI_APICallError: Rate limit exceeded. Please try again later."; exit 0 ;;
  nofifo-http-deep-grant:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  nofifo-http-deep-grant:*) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  # Tester round 2 (test-integrity): cross-rung variants of the #653 HTTP and
  # stall budgets. Both budgets are arm-wide (all three counters initialize
  # once before the rung loop), so a per-rung reset (`transient_retry_used=0`
  # / `hang_retry_used=0` relocated into the loop body) would spend a second
  # backoff and run an extra attempt; these shapes make that observable.
  # Grant: rung 1 spends the single retry, a Model-not-found advance reaches
  # rung 2, and a second terminal/stall there must be loud persistent with
  # exactly ONE backoff.
  http-deep-grant:1) echo "AI_APICallError: Rate limit exceeded. Please try again later."; exit 0 ;;
  http-deep-grant:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  http-deep-grant:*) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  # Advance: a rung-1 Model-not-found must not gate the retry away from a
  # later rung, which still spends exactly one 30s backoff.
  http-deep-advance:1) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  http-deep-advance:2) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  http-deep-advance:*) echo "healthy success"; exit 0 ;;
  hang-deep-grant:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang-deep-grant:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  hang-deep-grant:*) exec "$R15_REAL_SLEEP" 30 ;;
  hang-deep-advance:1) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  hang-deep-advance:2) exec "$R15_REAL_SLEEP" 30 ;;
  hang-deep-advance:*) echo "healthy success"; exit 0 ;;
  # Tester round 4 (cross-class budget coupling): each class-interleave
  # scenario repeats a class AFTER another class's retry was consumed, so an
  # arithmetic reset of an already-spent budget inserted inside ANOTHER
  # class's retry branch (e.g. `transient_retry_used=$((0))` next to
  # `freetier_retry_used=1`, a form the literal count pins cannot see) spends
  # an extra backoff and runs an extra attempt, while the shipped code must
  # fail loudly at the repeat. The six shapes together cover every
  # (resetting site, reset budget) pair in both exit shapes of the FT and
  # HTTP branches plus the hang branch.
  mixed:1) echo "AI_APICallError: Rate limit exceeded. Please try again later."; exit 0 ;;
  mixed:2) echo "APIError: ${ft}"; exit 0 ;;
  mixed:3) exec "$R15_REAL_SLEEP" 30 ;;
  mixed:4) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  mixed:*) echo "healthy success"; exit 0 ;;
  mixed-nz:1) echo "AI_APICallError: Rate limit exceeded. Please try again later."; exit 0 ;;
  mixed-nz:2) echo "APIError: ${ft}"; exit 1 ;;
  mixed-nz:3) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  mixed-nz:*) echo "healthy success"; exit 0 ;;
  hang-mixed:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang-mixed:2) echo "APIError: ${ft}"; exit 0 ;;
  hang-mixed:3) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  hang-mixed:4) exec "$R15_REAL_SLEEP" 30 ;;
  hang-mixed:*) echo "healthy success"; exit 0 ;;
  hang-mixed-nz:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang-mixed-nz:2) echo "APIError: ${ft}"; exit 1 ;;
  hang-mixed-nz:3) echo "AI_APICallError: Internal Server Error"; exit 1 ;;
  hang-mixed-nz:4) exec "$R15_REAL_SLEEP" 30 ;;
  hang-mixed-nz:*) echo "healthy success"; exit 0 ;;
  ft-hang-http:1) echo "APIError: ${ft}"; exit 0 ;;
  ft-hang-http:2) exec "$R15_REAL_SLEEP" 30 ;;
  ft-hang-http:3) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  ft-hang-http:4) echo "APIError: ${ft}"; exit 0 ;;
  ft-hang-http:*) echo "healthy success"; exit 0 ;;
  ft-hang-http-nz:1) echo "APIError: ${ft}"; exit 0 ;;
  ft-hang-http-nz:2) exec "$R15_REAL_SLEEP" 30 ;;
  ft-hang-http-nz:3) echo "AI_APICallError: Internal Server Error"; exit 1 ;;
  ft-hang-http-nz:4) echo "APIError: ${ft}"; exit 0 ;;
  ft-hang-http-nz:*) echo "healthy success"; exit 0 ;;
  # Tester round 4 (rung-depth-3 widening): mirror the free-tier deep pair
  # for the HTTP and stall budgets with three candidates, so a widening or
  # theft gated on the third rung is observable (the two-rung deep pairs
  # cannot reach c-free).
  widened:1) echo "AI_APICallError: Rate limit exceeded. Please try again later."; exit 0 ;;
  widened:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  widened:3) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  widened:4) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  widened:5) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  widened:*) echo "healthy success"; exit 0 ;;
  widened-advance:1) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  widened-advance:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  widened-advance:3) echo "AI_APICallError: Internal Server Error"; exit 0 ;;
  widened-advance:*) echo "healthy success"; exit 0 ;;
  hang-widened:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang-widened:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  hang-widened:3) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  hang-widened:4) exec "$R15_REAL_SLEEP" 30 ;;
  hang-widened:5) exec "$R15_REAL_SLEEP" 30 ;;
  hang-widened:*) echo "healthy success"; exit 0 ;;
  hang-widened-advance:1) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  hang-widened-advance:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 0 ;;
  hang-widened-advance:3) exec "$R15_REAL_SLEEP" 30 ;;
  hang-widened-advance:*) echo "healthy success"; exit 0 ;;
  # Tester round 4 (degraded-shape plumbing): an unclassified nonzero death
  # must stay loud with its own status, a failing tee in the degraded
  # pipeline must fail loudly, and a terminal line written to stderr must
  # still reach the captured log through the `2>&1` merge so the bounded
  # retry fires.
  nofifo-unclassified:*) echo "some unrelated provider failure"; exit 5 ;;
  nofifo-stderr-ft:1) echo "AI_APICallError: ${ft}" >&2; exit 1 ;;
  nofifo-stderr-ft:*) echo "healthy success"; exit 0 ;;
  # Tester round 5 (FIFO-shape stderr merge): the FIFO capture shape is the
  # primary shape, and its `2>&1` merge is the counterpart of the degraded
  # nofifo-stderr-ft probe. A terminal line written to stderr must reach the
  # captured log so the bounded retry fires; without the merge the exit-0
  # variant concludes silent green with no retry and the nonzero variant
  # loses the retry as unclassified.
  fifo-stderr-ft:1) echo "AI_APICallError: ${ft}" >&2; exit 1 ;;
  fifo-stderr-ft:*) echo "healthy success"; exit 0 ;;
  fifo-stderr-ft0:1) echo "AI_APICallError: ${ft}" >&2; exit 0 ;;
  fifo-stderr-ft0:*) echo "healthy success"; exit 0 ;;
  # Tester round 5 (watchdog silence accounting): hang-poll-slow runs a
  # silent attempt at a 30s poll cadence under a 90s threshold, so exactly
  # three polling rounds must accumulate to fire (an increment of 1 per poll
  # or a non-accumulating assignment never reaches the threshold and the
  # attempt runs into the scenario timeout). hang-active keeps producing
  # output past a 3s threshold (a zero or stale byte-size read kills the
  # live producer and the extra attempt shows). out-then-hang emits one line
  # after the watchdog's baseline read and then stalls (without the re-arm
  # the post-output silence never accumulates).
  hang-poll-slow:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang-poll-slow:*) echo "healthy success"; exit 0 ;;
  hang-active:1) for i in 1 2 3 4 5 6 7 8 9 10; do "$R15_REAL_SLEEP" 0.1; echo "progress $i"; done; exit 0 ;;
  hang-active:*) echo "healthy success"; exit 0 ;;
  out-then-hang:1) "$R15_REAL_SLEEP" 0.3; echo "starting work"; exec "$R15_REAL_SLEEP" 30 ;;
  out-then-hang:*) echo "healthy success"; exit 0 ;;
  # Tester round 5 (nonzero-MNF advance reset sites): each scenario spends
  # one budget, advances across a NONZERO Model-not-found line (the
  # grep-based branch that `continue 2`s), then repeats the same class on
  # the next rung, which must be loud persistent. An arithmetic budget reset
  # inserted at that advance site (invisible to the literal count pins)
  # spends a second backoff and runs an extra attempt. One scenario per
  # budget class.
  mnf-nz-mixed:1) echo "AI_APICallError: Service Unavailable"; exit 2 ;;
  mnf-nz-mixed:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 4 ;;
  mnf-nz-mixed:3) echo "AI_APICallError: Service Unavailable"; exit 2 ;;
  mnf-nz-mixed:*) echo "healthy success"; exit 0 ;;
  ft-mnf-nz:1) echo "APIError: ${ft}"; exit 0 ;;
  ft-mnf-nz:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 4 ;;
  ft-mnf-nz:3) echo "APIError: ${ft}"; exit 0 ;;
  ft-mnf-nz:*) echo "healthy success"; exit 0 ;;
  hang-mnf-nz:1) exec "$R15_REAL_SLEEP" 30 ;;
  hang-mnf-nz:2) echo "Model not found: ${MODEL}. Did you mean: b-free?"; exit 4 ;;
  hang-mnf-nz:3) exec "$R15_REAL_SLEEP" 30 ;;
  hang-mnf-nz:*) echo "healthy success"; exit 0 ;;
  # Review round 8 (rung-gated reset at that same advance site): the round-5
  # mirrors only advance through the nonzero-MNF branch on rung 1, so a reset
  # GATED on a later rung (e.g. `[ "$model" != "${candidates%% *}" ] &&
  # transient_retry_used=$((0))` inserted right after the advance warning)
  # still escaped the matrix. These depth-3 mirrors advance via that branch
  # on rungs 1 AND 2, spend the class's single retry on rung 2, and require
  # the rung-3 repeat to be loud persistent with exactly one backoff; a
  # rung-gated reset at the second advance resurrects the spent budget,
  # spends a second backoff, and runs an extra c-free attempt.
  mnf-nz-deep:1) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 4 ;;
  mnf-nz-deep:2) echo "AI_APICallError: Rate limit exceeded. Please try again later."; exit 2 ;;
  mnf-nz-deep:3) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 4 ;;
  mnf-nz-deep:*) echo "AI_APICallError: Internal Server Error"; exit 2 ;;
  ft-mnf-nz-deep:1) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 4 ;;
  ft-mnf-nz-deep:2) echo "APIError: ${ft}"; exit 0 ;;
  ft-mnf-nz-deep:3) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 4 ;;
  ft-mnf-nz-deep:*) echo "APIError: ${ft}"; exit 0 ;;
  hang-mnf-nz-deep:1) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 4 ;;
  hang-mnf-nz-deep:2) exec "$R15_REAL_SLEEP" 30 ;;
  hang-mnf-nz-deep:3) echo "Model not found: ${MODEL}. Did you mean: next-free?"; exit 4 ;;
  hang-mnf-nz-deep:*) exec "$R15_REAL_SLEEP" 30 ;;
  # Tester round 6 (nonzero-MNF advance anchoring): the advance grep is
  # deliberately UNANCHORED at column 0, so the wrapper's
  # `Error: Model not found: ...` catch-handler form advances the rung too.
  # A `^` anchor (invisible to the substring pin) would silently drop the
  # prefixed form, turning the recoverable advance into an unclassified
  # nonzero death (rc 4, single attempt).
  mnf-err-nz:1) echo "Error: Model not found: ${MODEL}. Did you mean: b-free?"; exit 4 ;;
  mnf-err-nz:*) echo "healthy success"; exit 0 ;;
  # Tester round 7 (fire-block order): the attempt traps TERM, cleans up
  # through the real grace window (the sleep mock honors the real 5s for this
  # scenario only), writes its cleanup marker, and exits 0. A fire block
  # whose KILL lands before or back-to-back with TERM kills the attempt
  # before the marker lands, while rc and the attempt sequence alone would
  # look identical.
  term-grace:1)
    trap 'kill "$R15_GRACE_CHILD" 2>/dev/null; "$R15_REAL_SLEEP" 2; printf "term-cleanup\n" > "$R15_TERM_MARKER"; exit 0' TERM
    "$R15_REAL_SLEEP" 30 &
    R15_GRACE_CHILD=$!
    wait "$R15_GRACE_CHILD" 2>/dev/null || true
    ;;
  term-grace:*) echo "healthy success"; exit 0 ;;
  # Tester round 8 (fire-region completeness): an attempt that IGNORES TERM
  # (unlike term-grace, which traps it and cleans up) can only be ended by
  # the fire block's SIGKILL. The `trap ''` ignores TERM at the kernel level
  # and the SIG_IGN disposition survives the looping shell, so if the KILL is
  # shadowed or neutered the attempt runs into the scenario timeout (rc 124)
  # instead of the bounded same-model retry, exactly the #653 unbounded-stall
  # shape the guard exists to bound.
  hang-child-ignores-term:1) trap '' TERM; while :; do "$R15_REAL_SLEEP" 0.5; done ;;
  hang-child-ignores-term:*) echo "healthy success"; exit 0 ;;
esac
echo "unhandled R15 scenario ${R15_SCENARIO} attempt ${n}" >&2
exit 9
R15MOCK
  {
    echo '#!/bin/bash'
    echo '# Mock sleep: records the requested value, blocks for a small real interval'
    echo '# through the real sleep baked in at generation time, then records its end'
    echo '# timestamp KEYED BY the requested value. The harness asserts per value that'
    echo '# the final attempt started at or after that wait'"'"'s end, so a backgrounded'
    echo '# (`sleep 15 &`), reordered, or removed wait cannot pass while a decoy holds'
    echo '# the static count; value keying also keeps the watchdog'"'"'s poll sleeps'
    echo '# (HANG_POLL_SECONDS) from polluting the backoff assertions. Tester round 7:'
    echo '# in the term-grace scenario the fire block'"'"'s grace honors the real'
    echo '# requested duration, so a TERM-trapping attempt needs the real grace to'
    echo '# complete its cleanup and a reordered fire block can never produce its marker.'
    echo 'echo "sleep ${1:-} $(date +%s%N)" >> "$R15_SLEEPS"'
    echo 'if [ "${R15_SCENARIO:-}" = "term-grace" ] && [ "${1:-}" = "5" ]; then'
    printf '%s 5\n' "$r15_sleep_bin"
    echo 'else'
    printf '%s 0.2\n' "$r15_sleep_bin"
    echo 'fi'
    echo 'echo "end ${1:-} $(date +%s%N)" >> "$R15_SLEEPS"'
    echo 'exit 0'
  } > "$sbx/bin/sleep"
  chmod +x "$sbx/bin/opencode" "$sbx/bin/sleep"
  for tool in mktemp tee grep rm tail sed tr wc date mkfifo; do
    p=$(command -v "$tool" 2>/dev/null || true)
    [ -n "$p" ] && ln -sf "$p" "$sbx/bin/$tool"
  done
  # Failing-tee mock (review A1): swapped in for the real `tee` during the
  # failing-tee scenarios only. It preserves the real pipeline shape (writes
  # stdin through to the requested log path) and then exits with the
  # requested nonzero status (`R15_TEE_FAIL`, default 3), so the runner's
  # log-capture guard must fail loudly for ANY failing status; a decoy comment
  # holding the static pin, or a live condition narrowed to one fixture status
  # (review F9), cannot fake the behavior.
  cat > "$sbx/tee-fail" <<'R15TEE'
#!/bin/bash
while IFS= read -r line; do printf '%s\n' "$line" >> "$1"; done
exit "${R15_TEE_FAIL:-3}"
R15TEE
  chmod +x "$sbx/tee-fail"
  # Failing-mkfifo mock (issue #653): swapped in for the real mkfifo during
  # the nofifo- scenarios only, so the degraded capture shape is exercised
  # end-to-end (loud warning plus the legacy pipeline plus the full
  # non-watchdog retry contract).
  cat > "$sbx/mkfifo-fail" <<'R15MKFIFO'
#!/bin/bash
exit 1
R15MKFIFO
  chmod +x "$sbx/mkfifo-fail"
  if [ ! -x "$sbx/bin/opencode" ] \
     || [ "$(env PATH="$sbx/bin" "$r15_bash_bin" -c 'command -v opencode' 2>/dev/null || true)" != "$sbx/bin/opencode" ]; then
    r15_bad="${r15_bad} behavioral(${label},mock-not-intercepted)"
    rm -rf "$sbx"
    return
  fi
  r15_behavioral_run() {
    local scenario="$1" cands="${2:-a-free b-free}" tee_swap=0 fifo_swap=0 attempts sleeps
    # Per-run recording files (review F2 harness hardening): a finished
    # scenario can leave an orphaned mock `sleep` (the watchdog's own poll
    # sleep can be mid-flight when the block exits) and that orphan would
    # append its end timestamp into the next scenario's freshly truncated
    # shared file, corrupting the exact-count backoff assertions. Unique
    # per-run paths make any late write land in the finished run's own
    # files, which are no longer asserted against.
    attempts="$sbx/attempts.$(date +%s%N)"
    sleeps="$sbx/sleeps.$(date +%s%N)"
    : > "$attempts"; : > "$sleeps"
    # Failing-tee scenarios (review A1, widened in review F9): swap the real
    # tee symlink for the failing mock so the log-capture guard is exercised
    # end-to-end for every `failing-tee*` scenario; restore it afterwards so
    # every other scenario keeps the real pipeline shape. Tester round 4:
    # `nofifo-teefail` swaps tee too, so the same guard is exercised in the
    # degraded no-mkfifo pipeline (a masked PIPESTATUS there would otherwise
    # conclude silent green).
    if [ "${scenario#failing-tee}" != "$scenario" ] || [ "$scenario" = "nofifo-teefail" ]; then
      ln -sf "$sbx/tee-fail" "$sbx/bin/tee"
      tee_swap=1
    fi
    # Issue #653 degraded-shape scenarios: swap the real mkfifo symlink for a
    # failing mock so the runner must take its loud no-mkfifo fallback path
    # (legacy inline pipeline, no watchdog) while still honoring the retry
    # contract; restore afterwards.
    if [ "${scenario#nofifo-}" != "$scenario" ]; then
      ln -sf "$sbx/mkfifo-fail" "$sbx/bin/mkfifo"
      fifo_swap=1
    fi
    (
      cd "$sbx" || exit 1
      exec "$r15_timeout_bin" 10 "$r15_env_bin" -u GITHUB_TOKEN -u GITHUB_EVENT_PATH -u GITHUB_RUN_ID -u GITHUB_REPOSITORY -u GITHUB_ACTIONS \
        PATH="$sbx/bin" HOME="$sbx/home" TMPDIR="$sbx/tmp" \
        MODEL_CANDIDATES="$cands" MODEL="${cands%% *}" \
        R15_SCENARIO="$scenario" R15_ATTEMPTS="$attempts" R15_SLEEPS="$sleeps" \
        R15_TEE_FAIL="${R15_TEE_FAIL:-}" \
        R15_REAL_SLEEP="$r15_sleep_bin" \
        R15_TERM_MARKER="${R15_TERM_MARKER:-/dev/null}" \
        HANG_IDLE_SECONDS="${R15_HANG_IDLE:-600}" HANG_POLL_SECONDS="${R15_HANG_POLL:-1}" \
        "$r15_bash_bin" --noprofile --norc -eo pipefail "$block"
    ) > "$out" 2>&1
    r15_last_rc=$?
    r15_last_attempts="$attempts"
    r15_last_sleeps="$sleeps"
    if [ "$tee_swap" = "1" ]; then
      ln -sf "$(command -v tee)" "$sbx/bin/tee"
    fi
    if [ "$fifo_swap" = "1" ]; then
      ln -sf "$(command -v mkfifo)" "$sbx/bin/mkfifo"
    fi
    r15_last_models=$(sed -n 's/^model=\([^ ]*\).*/\1/p' "$attempts" | tr '\n' ' ')
    r15_last_models="${r15_last_models% }"
  }
  r15_behavioral_run probe
  if [ "$r15_last_rc" != "0" ] || [ "$r15_last_models" != "a-free" ]; then
    r15_bad="${r15_bad} behavioral(${label},mock-probe-failed)"
    rm -rf "$sbx"
    return
  fi
  r15_behavioral_case() {
    local scenario="$1" want_rc="$2" want_models="$3" want_out="$4" want_sleeps="$5" cands="${6:-a-free b-free}"
    r15_behavioral_run "$scenario" "$cands"
    [ "$r15_last_rc" = "$want_rc" ] || r15_bad="${r15_bad} behavioral(${label},${scenario}:rc=${r15_last_rc},want=${want_rc})"
    [ "$r15_last_models" = "$want_models" ] || r15_bad="${r15_bad} behavioral(${label},${scenario}:attempts='${r15_last_models}',want='${want_models}')"
    if [ -n "$want_out" ] && ! grep -qE "$want_out" "$out"; then
      r15_bad="${r15_bad} behavioral(${label},${scenario}:missing-output)"
    fi
    # Round-F6, generalized for #653: the backoff itself is asserted, not
    # just the presence of any sleep recording. want_sleeps is a
    # comma-separated `value:count` spec (e.g. `15:1` or `30:1,10:1`): for
    # each entry the mock must have recorded exactly `count` sleeps of that
    # value and exactly `count` matching ends, and the final attempt must
    # have started at or after the LAST end of every expected value. A
    # decoy/unreachable wait holding the static count while the live wait
    # becomes `sleep 31536000` fails on the value, and a backgrounded
    # (`sleep 15 &`), reordered, or removed wait fails on the ordering, even
    # though it records the right value; value keying keeps poll sleeps out
    # of every assertion.
    if [ -n "$want_sleeps" ]; then
      r15_spec_ok=1
      r15_spec_ends=""
      for r15_spec in $(printf '%s' "$want_sleeps" | tr ',' ' '); do
        r15_val="${r15_spec%%:*}"
        r15_cnt="${r15_spec##*:}"
        if [ "$(grep -cE "^sleep ${r15_val} " "$r15_last_sleeps" 2>/dev/null || true)" != "$r15_cnt" ] \
           || [ "$(grep -cE "^end ${r15_val} " "$r15_last_sleeps" 2>/dev/null || true)" != "$r15_cnt" ]; then
          r15_spec_ok=0
        fi
        for r15_e in $(sed -n "s/^end ${r15_val} //p" "$r15_last_sleeps" 2>/dev/null || true); do
          if [ -z "$r15_spec_ends" ] || [ "$r15_e" -gt "$r15_spec_ends" ]; then
            r15_spec_ends="$r15_e"
          fi
        done
      done
      if [ "$r15_spec_ok" != "1" ]; then
        r15_bad="${r15_bad} behavioral(${label},${scenario}:bad-backoff)"
      else
        r15_last_ts=$(sed -n 's/^model=[^ ]* //p' "$r15_last_attempts" 2>/dev/null | tail -n 1)
        if [ -z "$r15_spec_ends" ] || [ -z "$r15_last_ts" ] || [ "$r15_last_ts" -lt "$r15_spec_ends" ]; then
          r15_bad="${r15_bad} behavioral(${label},${scenario}:backoff-not-waited)"
        fi
      fi
    fi
  }
  r15_behavioral_case transient-nonzero 0 "a-free a-free" "" "15:1"
  r15_behavioral_case transient-zero 0 "a-free a-free" "" "15:1"
  r15_behavioral_case persistent-nonzero 3 "a-free a-free" "persistent free-tier rejection" ""
  r15_behavioral_case persistent-nonzero7 7 "a-free a-free" "persistent free-tier rejection" ""
  r15_behavioral_case persistent-zero 1 "a-free a-free" "persistent free-tier rejection" ""
  r15_behavioral_case mnf-nonzero 0 "a-free b-free" "" ""
  r15_behavioral_case mnf-zero 0 "a-free b-free" "" ""
  r15_behavioral_case mnf-echo 0 "a-free" "" ""
  r15_behavioral_case mnf-prefix 4 "a-free" "" ""
  r15_behavioral_case mnf-stale 0 "a-free" "" ""
  r15_behavioral_case mnf-all 1 "a-free b-free" "exhausted every model rung" ""
  r15_behavioral_case mnf-dot-lookalike 4 "opencode/deepseek-v4.1-flash-free" "" "" "opencode/deepseek-v4.1-flash-free opencode/glm-5.3-flash-free"
  r15_behavioral_case mnf-then-ft 0 "a-free b-free b-free" "" "15:1"
  r15_behavioral_case mnf-then-ft0 0 "a-free b-free b-free" "" "15:1"
  # Round-7 hardening (per-rung budget gating): a grant or theft of the
  # free-tier budget gated on a later rung is invisible to a two-rung matrix.
  # deep-grant consumes the budget on rung 1, advances to rung 3, and must
  # report the rung-3 rejection as persistent without a second retry;
  # deep-advance reaches rung 3 with the budget unused and must still spend
  # exactly one same-model retry there.
  r15_behavioral_case deep-grant 1 "a-free a-free b-free c-free" "persistent free-tier rejection" "15:1" "a-free b-free c-free"
  r15_behavioral_case deep-advance 1 "a-free b-free c-free c-free" "persistent free-tier rejection" "15:1" "a-free b-free c-free"
  r15_behavioral_case echo-envelope 0 "a-free" "" ""
  r15_behavioral_case ft-echo-suffix 0 "a-free" "" ""
  r15_behavioral_case ft-stale 0 "a-free" "" ""
  r15_behavioral_case ft-trailing 0 "a-free a-free" "" "15:1"
  r15_behavioral_case failing-tee 1 "a-free" "could not capture the (Maintainer )?opencode log" ""
  # Review F9: one fixture status cannot exercise a live condition narrowed to
  # that status. The same guard must fire for every failing tee status, so the
  # fixtures cover 3 (above), 1, and 2; any finite `-eq` narrowing misses at
  # least one, and the dead-decoy variant only held the anchored static count,
  # which these scenarios ignore.
  R15_TEE_FAIL=1 r15_behavioral_case failing-tee1 1 "a-free" "could not capture the (Maintainer )?opencode log" ""
  R15_TEE_FAIL=2 r15_behavioral_case failing-tee2 1 "a-free" "could not capture the (Maintainer )?opencode log" ""
  r15_behavioral_case budget-rungs 1 "a-free a-free b-free" "persistent free-tier rejection" ""
  r15_behavioral_case unclassified 5 "a-free" "" ""
  r15_behavioral_case unclassified9 9 "a-free" "" ""
  # Issue #653 behavioral matrix: transient 429/5xx recovery on BOTH exit
  # shapes (nonzero and exit-0 terminal), the incident's exact 429 wording,
  # persistent loudness on both shapes with the provider's own status
  # propagated, provider-stall kill + one same-model retry after `sleep 10`
  # (watchdog armed with HANG_IDLE_SECONDS=1 through R15_HANG_IDLE; the poll
  # interval stays 1 for every scenario so it can never collide with the 30s
  # transient backoff), a second stall loud, and per-class budget
  # independence in BOTH directions (http-then-hang spends the HTTP budget
  # then the stall budget; hang-then-http the reverse), proving neither
  # class consumes the other's retry.
  r15_behavioral_case http-nonzero 0 "a-free a-free" "" "30:1"
  r15_behavioral_case http-429 0 "a-free a-free" "" "30:1"
  r15_behavioral_case http-zero 0 "a-free a-free" "" "30:1"
  # Review F2: the pipe-buffer-sized window (terminal line first, then 39 ~4
  # KiB lines) still honors the same-model retry under the production
  # `-eo pipefail` shell; the old bare detector pipeline misses it and this
  # scenario then shows a single attempt with no 30s backoff.
  r15_behavioral_case http-bigwindow 0 "a-free a-free" "" "30:1"
  r15_behavioral_case http-persistent 3 "a-free a-free" "persistent HTTP error" "30:1"
  r15_behavioral_case http-zero-persistent 1 "a-free a-free" "persistent HTTP error" "30:1"
  R15_HANG_IDLE=1 r15_behavioral_case hang 0 "a-free a-free" "provider stall" "10:1"
  R15_HANG_IDLE=1 r15_behavioral_case hang-persistent 1 "a-free a-free" "repeated provider stall" "10:1"
  # Review F3: a zero poll override must not silently disable the watchdog
  # (`sleep 0` busy loop with `idle += 0` never reaching the threshold); the
  # clamp falls back to the 30s production default, so the stall is still
  # killed and retried once (a hang then a healthy same-model retry).
  R15_HANG_IDLE=1 R15_HANG_POLL=0 r15_behavioral_case hang-poll-zero 0 "a-free a-free" "" "10:1"
  # Reset explicitly: a prefix assignment on a function call is restored on
  # modern bash, but older bashes may persist it, and every later scenario
  # expects the default poll interval.
  R15_HANG_POLL=1
  R15_HANG_IDLE=1 r15_behavioral_case http-then-hang 0 "a-free a-free a-free" "" "30:1,10:1"
  R15_HANG_IDLE=1 r15_behavioral_case hang-then-http 0 "a-free a-free a-free" "" "10:1,30:1"
  # Tester round 2 (test-integrity): the #653 HTTP and stall budgets are
  # arm-wide exactly like the free-tier one (all three counters initialize
  # once before the rung loop), and a per-rung reset of either budget must be
  # observable. Grant variant: rung 1 spends the single retry, a
  # Model-not-found advance reaches rung 2, and a second terminal/stall there
  # must be loud persistent with exactly ONE backoff (the reset mutant spends
  # a second backoff and runs an extra attempt, failing the attempts and
  # backoff assertions). Advance variant: a rung-1 Model-not-found must not
  # gate the retry away from a later rung, which still spends exactly one
  # backoff.
  r15_behavioral_case http-deep-grant 1 "a-free a-free b-free" "persistent HTTP error" "30:1"
  r15_behavioral_case http-deep-advance 0 "a-free b-free b-free" "" "30:1"
  R15_HANG_IDLE=1 r15_behavioral_case hang-deep-grant 1 "a-free a-free b-free" "repeated provider stall" "10:1"
  R15_HANG_IDLE=1 r15_behavioral_case hang-deep-advance 0 "a-free b-free b-free" "" "10:1"
  r15_behavioral_case nofifo-freetier 0 "a-free a-free" "mkfifo is unavailable" "15:1"
  # Tester round 3 (test-integrity): bind the degraded shape's retry contract
  # too. nofifo-persistent: a persistently rejecting provider must fail loudly
  # after exactly two attempts and one 15s backoff (a budget reset inserted in
  # the degraded branch loops forever instead). nofifo-http-deep-grant: a
  # rung-1 429 spends the retry, a Model-not-found advance reaches rung 2, and
  # a second 429 there must be loud persistent with exactly one 30s backoff (a
  # model-change-gated per-rung reset spends a second backoff and runs an
  # extra attempt).
  r15_behavioral_case nofifo-persistent 1 "a-free a-free" "persistent free-tier rejection" "15:1"
  r15_behavioral_case nofifo-http-deep-grant 1 "a-free a-free b-free" "persistent HTTP error" "30:1"
  # Tester round 4 (degraded-shape plumbing): the nofifo scenarios above are
  # all terminal-classified, so `status`, `tee_status`, the PIPESTATUS
  # capture, and the `2>&1` merge were never observably wrong. These three
  # bind that plumbing: an unclassified nonzero degraded death must stay
  # loud with its own status (want_out matches both runner paths' message
  # wording), a failing degraded tee must fail loudly, and a stderr-borne
  # free-tier terminal line must reach the captured log so the bounded retry
  # still fires (without `2>&1` the log is empty, the death reads as
  # unclassified, and the retry is silently lost).
  r15_behavioral_case nofifo-unclassified 5 "a-free" "failed with exit status 5" ""
  r15_behavioral_case nofifo-teefail 1 "a-free" "could not capture the (Maintainer )?opencode log" ""
  r15_behavioral_case nofifo-stderr-ft 0 "a-free a-free" "" "15:1"
  # Tester round 5 (FIFO-shape stderr merge): the primary capture shape's
  # `2>&1` merge, bound exactly like the degraded probe above. Without it a
  # stderr-borne terminal line never reaches the captured log, so the exit-0
  # shape (`fifo-stderr-ft0`) concludes silent green with no retry and the
  # nonzero shape (`fifo-stderr-ft`) loses the retry as unclassified.
  r15_behavioral_case fifo-stderr-ft 0 "a-free a-free" "" "15:1"
  r15_behavioral_case fifo-stderr-ft0 0 "a-free a-free" "" "15:1"
  # Tester round 4 (cross-class budget coupling): six class-interleave
  # scenarios repeat a class AFTER another class's retry was consumed. The
  # shipped code fails loudly at the repeat; an arithmetic reset of the
  # repeated budget inside any other class's retry branch (both exit shapes
  # of the FT and HTTP branches plus the hang branch are covered by the set)
  # spends an extra backoff and runs an extra attempt, so the attempts,
  # backoff counts, and rc assertions catch it.
  R15_HANG_IDLE=1 r15_behavioral_case mixed 1 "a-free a-free a-free a-free" "persistent HTTP error" "30:1,15:1,10:1"
  r15_behavioral_case mixed-nz 1 "a-free a-free a-free" "persistent HTTP error" "30:1,15:1"
  R15_HANG_IDLE=1 r15_behavioral_case hang-mixed 1 "a-free a-free a-free a-free" "repeated provider stall" "10:1,15:1,30:1"
  R15_HANG_IDLE=1 r15_behavioral_case hang-mixed-nz 1 "a-free a-free a-free a-free" "repeated provider stall" "10:1,15:1,30:1"
  R15_HANG_IDLE=1 r15_behavioral_case ft-hang-http 1 "a-free a-free a-free a-free" "persistent free-tier rejection" "15:1,10:1,30:1"
  R15_HANG_IDLE=1 r15_behavioral_case ft-hang-http-nz 1 "a-free a-free a-free a-free" "persistent free-tier rejection" "15:1,10:1,30:1"
  # Tester round 4 (rung-depth-3 widening): mirror the free-tier deep pair
  # for the HTTP and stall budgets at rung depth 3 with three candidates, so
  # a widening (`..._retry_used=-1` gated on c-free) spends a second backoff
  # and runs an extra attempt, and a theft (`...=1`) blocks the rung-3 retry
  # and turns a healthy advance loud.
  r15_behavioral_case widened 1 "a-free a-free b-free c-free" "persistent HTTP error" "30:1" "a-free b-free c-free"
  r15_behavioral_case widened-advance 0 "a-free b-free c-free c-free" "" "30:1" "a-free b-free c-free"
  R15_HANG_IDLE=1 r15_behavioral_case hang-widened 1 "a-free a-free b-free c-free" "repeated provider stall" "10:1" "a-free b-free c-free"
  R15_HANG_IDLE=1 r15_behavioral_case hang-widened-advance 0 "a-free b-free c-free c-free" "" "10:1" "a-free b-free c-free"
  # Tester round 5 (nonzero-MNF advance reset sites): after a spent budget, a
  # rung advance across a NONZERO Model-not-found line must not resurrect that
  # budget. Each scenario spends one class's single retry, advances through
  # the grep-based nonzero-MNF branch, and repeats the class on the next rung,
  # which must be loud persistent with exactly one backoff; an arithmetic
  # reset inserted at that advance site spends a second backoff and runs an
  # extra attempt. One scenario per budget class (HTTP, free-tier, stall),
  # covering all three reset directions.
  r15_behavioral_case mnf-nz-mixed 2 "a-free a-free b-free" "persistent HTTP error" "30:1"
  r15_behavioral_case ft-mnf-nz 1 "a-free a-free b-free" "persistent free-tier rejection" "15:1"
  R15_HANG_IDLE=1 r15_behavioral_case hang-mnf-nz 1 "a-free a-free b-free" "repeated provider stall" "10:1"
  # Review round 8: the round-5 mirrors above only advance through the
  # nonzero-MNF branch on rung 1, so a reset GATED on a later rung escaped
  # (the depth-2 shapes never reach the second advance). These rung-depth-3
  # mirrors advance via that branch on rungs 1 and 2, spend the class's
  # single retry on rung 2, and require the rung-3 repeat to be loud
  # persistent with exactly one backoff; a rung-gated reset at the second
  # advance spends a second backoff and runs an extra c-free attempt.
  r15_behavioral_case mnf-nz-deep 2 "a-free b-free b-free c-free" "persistent HTTP error" "30:1" "a-free b-free c-free"
  r15_behavioral_case ft-mnf-nz-deep 1 "a-free b-free b-free c-free" "persistent free-tier rejection" "15:1" "a-free b-free c-free"
  R15_HANG_IDLE=1 r15_behavioral_case hang-mnf-nz-deep 1 "a-free b-free b-free c-free" "repeated provider stall" "10:1" "a-free b-free c-free"
  # Tester round 6 (nonzero-MNF advance anchoring): the prefixed
  # `Error: Model not found: ...` catch-handler form must still advance the
  # rung (an unanchored per-model grep); a column-0 `^` anchor drops it and
  # the run dies unclassified at rc 4 with a single attempt.
  r15_behavioral_case mnf-err-nz 0 "a-free b-free" "" ""
  # Tester round 5 (watchdog silence accounting): the stall-decision
  # arithmetic itself is now observable. hang-poll-slow runs a silent attempt
  # at a 30s poll cadence under a 90s threshold, so exactly three polling
  # rounds must accumulate to fire (an increment of 1 per poll or a
  # non-accumulating assignment never reaches the threshold and the attempt
  # runs into the scenario timeout). hang-active keeps producing output past
  # the threshold (a zeroed byte-size read kills a live producer and the
  # extra attempt shows). out-then-hang emits one line and then stalls (the
  # re-arm after growth is what lets the post-output silence accumulate).
  R15_HANG_POLL=30 R15_HANG_IDLE=90 r15_behavioral_case hang-poll-slow 0 "a-free a-free" "" "10:1"
  R15_HANG_POLL=1
  R15_HANG_IDLE=3 r15_behavioral_case hang-active 0 "a-free" "" ""
  R15_HANG_IDLE=3 r15_behavioral_case out-then-hang 0 "a-free a-free" "" "10:1"
  R15_HANG_POLL=1
  R15_HANG_IDLE=1
  # Tester round 7 (fire-block order): the real-grace behavioral probe. The
  # TERM-trapping attempt can only complete its cleanup while the fire block
  # holds TERM before KILL across the real 5s grace; a reordered fire block
  # (KILL first, or the grace before the first TERM / after the last KILL)
  # leaves the marker missing while rc and the attempts sequence stay
  # identical (the ordered static pin covers the tee pairs the marker cannot
  # observe).
  R15_TERM_MARKER="$sbx/term-marker.$(date +%s%N)"
  R15_HANG_IDLE=1 r15_behavioral_case term-grace 0 "a-free a-free" "" "10:1"
  [ -f "$R15_TERM_MARKER" ] || r15_bad="${r15_bad} behavioral(${label},term-grace:term-cleanup-marker-missing)"
  # Tester round 8 (fire-region completeness): the KILL step itself, bound
  # behaviorally. The attempt ignores TERM, so only the fire block's SIGKILL
  # can end it; with the KILL shadowed or neutered the scenario blocks into
  # its 10s timeout (rc 124, a single attempt) instead of recovering through
  # the bounded retry. The shipped code KILLs it at the grace, retries once
  # on the same model after 10s, and the healthy attempt 2 concludes rc 0.
  R15_HANG_IDLE=1 r15_behavioral_case hang-child-ignores-term 0 "a-free a-free" "provider stall" "10:1"
  rm -rf "$sbx"
}
if [ -n "$r15_timeout_bin" ] && [ -n "$r15_env_bin" ] && [ -n "$r15_bash_bin" ] && [ -n "$r15_sleep_bin" ] && [ -n "$r15_mkfifo_bin" ]; then
  r15_behavioral action-file
  r15_behavioral maintainer.yml
  # Review round 18 (F3, hollow-green verify): the round-6/11 pins were
  # presence checks, so deleting the general decision test while leaving the
  # echo/exit-token text, or appending `|| true` to the Maintainer's loud
  # exit, kept the audit green while a dead agent concluded success. The
  # structurally extracted verify bodies are now EXECUTED in a sandbox under
  # the production shell form: the Maintainer verify must exit nonzero with
  # no decision file and 0 once one exists, and the general verify must exit
  # 0 on AGENT_OUTCOME=success and nonzero on failure.
  r15_verify_sbx=$(mktemp -d) || r15_bad="${r15_bad} behavioral(verify,sandbox-failed)"
  if [ -n "${r15_verify_sbx:-}" ]; then
    mkdir -p "$r15_verify_sbx/home" "$r15_verify_sbx/maint/.maintainer" "$r15_verify_sbx/general"
    if [ -f "${r15_struct_dir:-}/maintainer-verify.run" ]; then
      ( cd "$r15_verify_sbx/maint" && "$r15_env_bin" -i HOME="$r15_verify_sbx/home" PATH="$PATH" AGENT_GATE=true AGENT_OUTCOME=success "$r15_bash_bin" --noprofile --norc -eo pipefail "$r15_struct_dir/maintainer-verify.run" ) >/dev/null 2>&1
      r15_verify_rc=$?
      [ "$r15_verify_rc" -ne 0 ] || r15_bad="${r15_bad} maintainer.yml(verify-missing-decision-not-loud)"
      : > "$r15_verify_sbx/maint/.maintainer/decision.json"
      ( cd "$r15_verify_sbx/maint" && "$r15_env_bin" -i HOME="$r15_verify_sbx/home" PATH="$PATH" AGENT_GATE=true AGENT_OUTCOME=success "$r15_bash_bin" --noprofile --norc -eo pipefail "$r15_struct_dir/maintainer-verify.run" ) >/dev/null 2>&1
      r15_verify_rc=$?
      [ "$r15_verify_rc" -eq 0 ] || r15_bad="${r15_bad} maintainer.yml(verify-present-decision-not-green)"
    else
      r15_bad="${r15_bad} maintainer.yml(verify-run-missing)"
    fi
    if [ -f "${r15_struct_dir:-}/general-verify.run" ]; then
      ( cd "$r15_verify_sbx/general" && "$r15_env_bin" -i HOME="$r15_verify_sbx/home" PATH="$PATH" AGENT_OUTCOME=success "$r15_bash_bin" --noprofile --norc -eo pipefail "$r15_struct_dir/general-verify.run" ) >/dev/null 2>&1
      r15_verify_rc=$?
      [ "$r15_verify_rc" -eq 0 ] || r15_bad="${r15_bad} opencode.yml(general-verify-success-not-green)"
      ( cd "$r15_verify_sbx/general" && "$r15_env_bin" -i HOME="$r15_verify_sbx/home" PATH="$PATH" AGENT_OUTCOME=failure "$r15_bash_bin" --noprofile --norc -eo pipefail "$r15_struct_dir/general-verify.run" ) >/dev/null 2>&1
      r15_verify_rc=$?
      [ "$r15_verify_rc" -ne 0 ] || r15_bad="${r15_bad} opencode.yml(general-verify-failure-not-loud)"
    else
      r15_bad="${r15_bad} opencode.yml(general-verify-run-missing)"
    fi
    rm -rf "$r15_verify_sbx"
  fi
fi
OPENCODE_WF=".github/workflows/opencode.yml"
if [ ! -f "$OPENCODE_WF" ]; then
  r15_bad="${r15_bad} opencode.yml(missing)"
else
  if ! grep -q 'Verify general agent completed' "$OPENCODE_WF"; then
    r15_bad="${r15_bad} opencode.yml(general-arm-no-loud-verify)"
  fi
  grep -A2 'General agent step finished' "$OPENCODE_WF" | grep -q 'exit 1' || r15_bad="${r15_bad} opencode.yml(general-verify-not-exit-1)"
fi
# Review round 17 (issue #653 test integrity): the watchdog knobs are
# process env, never declarative YAML config. Workflow-, job-, caller-step-
# and flow-style env mappings all reach the runner (a `uses:` composite step
# inherits workflow/job/caller-step env; the Maintainer inline step reads its
# own), and a single declarative line can push the first watchdog fire past
# every step/job timeout (HANG_IDLE_SECONDS=86400 needs 24h of silence) or to
# the cap (HANG_POLL_SECONDS=3600), silently restoring the pre-#653 stalled
# tick with every body and step-region pin green. The pattern matches an env
# mapping key in any spelling (block, quoted, flow) and skips the shell
# default references `"${HANG_IDLE_SECONDS:-600}"` plus prose mentions. The
# positive/negative fixtures prove the pattern itself is not vacuous; the
# tree-wide scan bans the keys from every declarative env surface in
# workflows and actions. A `$GITHUB_ENV` write from earlier arbitrary step
# code is out of scope by design.
r15_knob_pattern='HANG_(IDLE|POLL)_SECONDS["'"'"']?[[:space:]]*:[[:space:]]'
r15_knob_dir=$(mktemp -d) || r15_bad="${r15_bad} behavioral(tree,watchdog-knob-env-mapping-self-test)"
if [ -n "${r15_knob_dir:-}" ]; then
  printf '%s\n' 'env:' '  HANG_IDLE_SECONDS: "86400"' > "$r15_knob_dir/workflow-level.yml"
  printf '%s\n' 'jobs:' '  maintainer:' '    env:' '      HANG_POLL_SECONDS: "3600"' > "$r15_knob_dir/job-level.yml"
  printf '%s\n' '- name: Run opencode' '  env:' '    "HANG_IDLE_SECONDS": "86400"' > "$r15_knob_dir/caller-step.yml"
  printf '%s\n' 'env: {HANG_IDLE_SECONDS: "86400", HANG_POLL_SECONDS: "3600"}' > "$r15_knob_dir/flow-style.yml"
  printf '%s\n' 'hang_idle_seconds="${HANG_IDLE_SECONDS:-600}"' 'hang_poll_seconds="${HANG_POLL_SECONDS:-30}"' '# HANG_IDLE_SECONDS is the watchdog idle threshold' 'description: HANG_POLL_SECONDS' > "$r15_knob_dir/controls.yml"
  for r15_knob_fixture in "$r15_knob_dir"/workflow-level.yml "$r15_knob_dir"/job-level.yml "$r15_knob_dir"/caller-step.yml "$r15_knob_dir"/flow-style.yml; do
    grep -qE "$r15_knob_pattern" "$r15_knob_fixture" || r15_bad="${r15_bad} behavioral(tree,watchdog-knob-env-mapping-self-test)"
  done
  if grep -qE "$r15_knob_pattern" "$r15_knob_dir/controls.yml"; then
    r15_bad="${r15_bad} behavioral(tree,watchdog-knob-env-mapping-self-test)"
  fi
  rm -rf "$r15_knob_dir"
fi
if grep -rnE "$r15_knob_pattern" .github/workflows .github/actions >/dev/null 2>&1; then
  r15_bad="${r15_bad} behavioral(tree,watchdog-knob-env-mapping)"
fi
if [ -z "$r15_bad" ]; then
  check "R15" "model resilience wired: live-registry resolver + free-tier ladder rungs + boundary-aware per-rung retry with exit-0 terminal anchoring, a log-capture guard, loud exhaustion, the bounded transient FreeTierError same-model retry (anchored detector, cap 1, loud persistent failure), plus the #653 bounded transient 429/5xx same-model retry (anchored 429/5xx terminal detector, cap 1 shared across rungs, loud persistent failure) and the provider-stall watchdog (FIFO capture shape, HANG_IDLE_SECONDS/HANG_POLL_SECONDS growth poll, TERM/KILL of exactly the opencode and tee PIDs, one same-model retry after 10s, second stall loud, loud no-mkfifo fallback to the legacy pipeline) in the shared runner and the maintainer inline path, with loud-failure verify steps on the Maintainer and general arm, all enforced behaviorally: the extracted detectors are executed functionally (terminal match; echo/envelope/suffix/stale/superset no-match; dotted-id match with the dot-lookalike no-match; case-sensitive forms, so an uppercase id line never matches; the AI_RetryError summary and phrase variants never match; the tail window's lower-bound pair, 39 trailing lines must match and 40 must not; all executed under set -o pipefail with a ~160 KiB match-first window, so a grep -q SIGPIPE can never mask a terminal line), and both real runner run-blocks are executed loop-level under the exact production shell form (bash --noprofile --norc -eo pipefail) against an executable mock opencode + mock sleep (transient recovery on both exit shapes with the exact bounded backoff asserted and its wait ordering proven, exactly one same-model retry, persistent loudness after two attempts with the provider's own distinct statuses propagated, rung advance preserved without consuming the free-tier budget, post-loop exhaustion reached and loud, the free-tier budget shared across three rungs with a rung-gated grant or theft caught, echo/suffix/stale non-match, a terminal line with trailing healthy lines still retrying, superset-id non-match, a dotted-candidate dot-lookalike nonzero line not advancing the rung, a failing log capture failing loudly at every failing tee status (one fixture each for 3, 1, and 2, so a live guard narrowed to a single status cannot pass), unclassified status propagation in both capture shapes, per-scenario timeout, the #653 HTTP recovery on both exit shapes with the 30s backoff value-scoped and wait-ordered, persistent HTTP loud on both shapes with the provider status propagated, a stalled attempt killed by the watchdog and retried once on the same model after the 10s backoff (ordering proven), a second stall loud, per-class budget independence in both directions and cross-class budget interleaves (six interleave scenarios repeat a class after another class's retry was consumed, so an arithmetic reset of a spent budget inside any other class's retry branch, in either exit shape of the FT and HTTP branches plus the hang branch, spends an extra backoff and runs an extra attempt), the #653 HTTP and stall budgets proven arm-wide by cross-rung grant/advance pairs in the FIFO capture shape and at rung depth 3 by the widened/hang-widened grant and advance pairs (a widening or theft gated on the third rung spends an extra backoff or turns a healthy advance loud), the degraded no-mkfifo shape bound the same way for the free-tier and HTTP retries (a persistent degraded rejection failing loudly after exactly the bounded retry with its one backoff, and a degraded cross-rung HTTP grant spending exactly one 30s backoff, plus a static no-budget-assignment pin on the degraded branch, and its status/tee/stderr plumbing: an unclassified nonzero degraded death stays loud with its own status, a failing degraded tee fails loudly, and a stderr-borne terminal line still reaches the captured log so the bounded retry fires), the degraded no-mkfifo shape still honoring the free-tier retry contract loudly, the FIFO capture shape's \`2>&1\` stderr merge bound like the degraded probe (a stderr-borne terminal line must reach the captured log so the bounded retry fires on both exit shapes), the watchdog's silence accounting bound directly (a 30s-cadence/90s-threshold scenario where exactly three polling rounds must accumulate, a producing attempt kept alive past the threshold so a zeroed byte-size read cannot kill it, and an output-then-stall attempt whose post-output silence must accumulate through the re-arm), the watchdog's production defaults (600s idle / 30s poll) and its single bounded 5s TERM-to-KILL escalation grace whole-region pinned as exactly the hang-flag write, the ordered TERM oc, TERM tee, sleep 5, KILL oc, KILL tee sequence, and the exit, with nothing else (whitespace and 2>/dev/null tolerated, an inserted sleep or a shadowed KILL caught), and the whole FIFO capture prelude whole-region pinned line-exact so an inserted sleep anywhere in the watchdog or at the launch/reap path around it (before the tee launch, before the opencode launch, anywhere in the subshell outside the fire block: before the baseline read, after the poll, after the post-sleep liveness re-check, between the idle accumulation and the threshold, between the threshold and the warning echo, in the re-arm else branch, after the subshell close, after the watch_pid assignment, after the oc reap and status capture) also fails the audit, with a TERM-trapping attempt that can only complete its cleanup through the real grace window and a TERM-ignoring hang-child-ignores-term attempt that only SIGKILL can end (so a neutered KILL blocks into the scenario timeout), the watchdog loop gate and post-sleep liveness re-check pinned, the poll cadence bound to the poll knob, the inclusive -ge threshold and the post-growth reset to exactly zero line-anchored (a weakened re-arm would make the required silence grow with the attempt's productive duration), the nonzero Model-not-found advance site bound for all three budgets (a scenario per class spends its single retry, advances through that branch, and requires the repeat on the next rung to be loud persistent with exactly one backoff, with rung-depth-3 mirrors so a rung-gated reset at that site cannot resurrect a spent budget), the prefixed Error: Model not found: catch-handler form still advancing the rung (unanchored per-model grep pinned exactly, mnf-err-nz), the success path exiting 0 itself rather than falling through, and the Maintainer verify's loud exit 1 on a missing decision contract, a 160 KiB match-first terminal window still retrying the same model end-to-end, a zero poll override clamped to the production interval so the watchdog still kills and retries, and the extracted runner step proven the executing one: no if: (or \`if :\`, or the quoted \`\"if\":\` / \`'if':\` spellings) key anywhere in its whole step region, except the Maintainer runner's exact shared actor-write gate condition of issue #696 with its gate step present in the same file (the step name line through the next sibling \`- name:\` or EOF, so a step-level \`if: false\` inserted after the run block cannot skip the runner while the body stays pinned), its step key set bound too (no HANG_IDLE_SECONDS/HANG_POLL_SECONDS env override in either runner step, and a tree-wide static ban rejects any such env mapping anywhere in .github/workflows or .github/actions in block, quoted, caller-step, or flow spelling, since workflow-, job-, caller-step- and flow-level env all reach the runner and one declarative line can push the first watchdog fire past every step timeout, no continue-on-error/timeout-minutes key on the composite runner step, the Maintainer step's exact continue-on-error: true and timeout-minutes: 60 each present exactly once, and exactly one shell: key whose exact line is shell: bash), exactly the two #653 invocation sites allowed by the file-level count and both present in the extracted block, and each runner's entire extracted run block pinned line-exact against its regenerated normalized literal (leading/trailing whitespace and an optional trailing 2>/dev/null stripped, comment and blank lines dropped, compared as whole normalized line sequences so a rewrite merging two real lines into one cannot pass), so any inserted or modified non-comment line anywhere in the block (the pre-attempt header, the degraded no-mkfifo else branch, the post-fi classification/retry/budget logic) fails the audit alone; review round 18 made the whole extraction structural: python3/PyYAML (a strict, duplicate-key-rejecting loader) resolves each runner step by its parsed name, pins its parsed run scalar line-exact, treats explicit-key \`? if\` / \`: false\` and \`? HANG_IDLE_SECONDS\` / \`: \"86400\"\` spellings as the keys GitHub Actions sees, binds both runner steps' \`MODEL_CANDIDATES\` (and the composite's \`MODEL\`) to the resolver outputs by exact parsed value plus the resolver step's \`model_ladder\` id and \`resolve-model.sh\` invocation, and executes both verify steps behaviorally (the Maintainer verify must exit nonzero with no decision file and 0 with one; the general verify 0 on success and nonzero on failure), so a decoy \`run: |\` block scalar, the \`run: |2\` hide (F1), an explicit-key knob or step key (F2), a hollow-green \`|| true\` verify condition (F3), or a deleted candidate-chain env mapping (F4) can no longer pass, and a missing python runtime, a duplicate run/if/shell key, or a parse error fails closed; review round 19 binds each verify step's declarative key surface too: no continue-on-error, the exact if expression, an env mapping that is exactly AGENT_OUTCOME with the exact agent outcome expression, the Maintainer step's shell: bash exactly as shipped and no shell override on the general arm, and no timeout-minutes or working-directory override, so a continue-on-error: true, if: false, hardcoded AGENT_OUTCOME: success, shell, timeout, or cwd one-liner can no longer hollow-green or skip either loud-failure verify; review round 20 binds each verify step's enclosing job and workflow surface too: both the maintainer and general jobs must carry exactly the shipped key set with their exact parsed if scalars (block scalars, trailing newline included), runs-on: ubuntu-latest, timeout-minutes: 75, and steps, with no job-level continue-on-error, defaults, or env, and neither workflow may add workflow-level defaults or env, so a job-level continue-on-error: true, if: false, or defaults.run.shell override can no longer hollow-green or skip either loud-failure verify; review round 21 binds step-to-job containment too: the Maintainer runner step and the Maintainer verify must live in the maintainer job and the general verify in the general job, so moving a bound step into a sibling job (its pinned if references step outputs that no longer exist there, so GitHub silently skips it) can no longer pass; review round 22 binds each verify's AGENT_OUTCOME source by identity: the expression must be a steps.<id>.outcome reference whose id resolves to exactly one step in the verify's own job, and that step must be the agent runner step itself (the general arm's outcome source must be the Run opencode general agent composite runner with its exact uses, continue-on-error, timeout-minutes, and if; the Maintainer's maintainer_run must be the Run Maintainer agent step), so re-pointing the id to an always-success decoy step in the same job can no longer hollow-green the verify) (issues #591, #620, #653, #696)" "ok"
else
  check "R15" "model resilience guard missing:${r15_bad} (issues #591/#620/#653/#696: one retired pin kills every arm at once, Model-not-found deaths conclude green, a transient free-tier or 429/5xx rejection kills a gate with no bounded retry, a provider stall silently burns the whole tick, or the retries loop unboundedly / conclude silently green / silently blind-advance past a failed log capture / miss a rejection inside the tail window / miss a terminal line past the pipe buffer because the detector pipeline was not pipefail-safe / advance on a lookalike id / match a terminal form in the wrong case / record a backoff they never waited / busy-loop with a zero poll interval that silently disables the watchdog / run without the watchdog silently when mkfifo is unavailable / reset a retry budget inside the degraded no-mkfifo branch so the bounded retry loops unboundedly / silently green an unclassified death or swallow a failing tee in the degraded pipeline / drop a stderr-carried terminal line in the degraded pipeline so the bounded retry is lost / drop the FIFO shape's stderr merge so a stderr-carried terminal line never reaches the captured log / watchdog accounting that never accumulates toward the threshold, kills a live producer, or never re-arms after growth / reset a retry budget at the nonzero Model-not-found advance site (even behind a later-rung gate) so a spent budget resurrects / reset another class's retry budget so an already-spent budget silently retries again / widen or steal the HTTP or stall budget gated on a later rung / pin a wrong watchdog default (idle or poll) or an unbounded TERM-to-KILL grace / reorder, widen, or neuter the fire-block escalation (KILL before or back-to-back with TERM, an inserted sleep, a shadowed KILL) so a TERM-trapping attempt can never finish its cleanup and a TERM-ignoring attempt can never be ended / splice an unknown line anywhere outside the fire block (the watchdog loop, or the FIFO capture prelude's launch, reap, or cleanup path around the subshell) so the abort or the bounded retry is delayed past every step timeout / drop the watchdog liveness gate or its post-sleep re-check / decouple the poll cadence from the poll knob, weaken the inclusive threshold, or re-arm the accumulator with anything but an exact reset to zero / anchor the nonzero-MNF grep at column 0 so the prefixed Error: form loses the rung advance / splice or rewrite any non-comment line outside the bound sub-regions of a runner block (the pre-attempt header, the degraded no-mkfifo else branch, the post-fi classification/retry/budget logic) so a one-line insertion delays or neuters the attempt start, the retry, or the rejection handling while every sub-region pin stays satisfied / turn the success path's exit 0 into a silent fall-through / hollow-green the Maintainer verify / run a conditional or shadowed runner step (any condition other than the Maintainer runner's exact shared actor-write gate form of issue #696, including a step-level \`if:\` key placed after the run block, the \`if :\` spelling, or the quoted \`\"if\":\` / \`'if':\` spellings) / override the runner step's watchdog knobs through its step env (HANG_IDLE_SECONDS/HANG_POLL_SECONDS) or set either knob through any workflow-, job-, caller-step-, or flow-style env mapping in .github/workflows or .github/actions, add continue-on-error/timeout-minutes to the composite runner step, drop, alter, quote, or duplicate the Maintainer step's exact continue-on-error: true / timeout-minutes: 60 lines, override the runner step's \`shell:\` so the audited execution form differs from production, or add a second shell: key / merge two pinned lines into one to evade the exact compare / validate a textual decoy \`run: |\` block instead of the executing step's parsed run scalar, or hide the real body behind \`run: |2\` (F1) / miss an explicit-key \`? HANG_IDLE_SECONDS\` or \`? if\` spelling of a watchdog knob or step key (F2) / hollow-green either verify step with a \`|| true\` condition (F3) / leave a runner step's \`MODEL_CANDIDATES\` (or the composite's \`MODEL\`) unbound from the resolver outputs, or the resolver step without its \`model_ladder\` id and \`resolve-model.sh\` invocation (F4) / add continue-on-error: true, flip the if expression to false, hardcode AGENT_OUTCOME: success, override shell/timeout-minutes/working-directory, or otherwise change a verify step's declarative key surface so the loud-failure verify is hollow-greened or skipped (review round 19) / add a job-level continue-on-error, if: false, defaults, or env to either verify job, add a workflow-level defaults or env, change the job's runs-on or timeout-minutes, or add any extra job key so the verify job's execution contract is redefined (review round 20) / move a runner or verify step out of its expected job into a sibling job so its pinned if references step outputs that no longer exist and the step is silently skipped (review round 21) / re-point a verify's AGENT_OUTCOME step id to a decoy step in the same job (or drop or duplicate that id) so the verify reads an always-success outcome instead of the agent step's, or change the source step's runner identity/attributes while keeping its name (review round 22) / fail open when python3/PyYAML is unavailable, a YAML file has duplicate keys, or a runner/verify step cannot be resolved exactly once)" "bad"
fi

# [R16] Shallow-workspace PAT merge guard (issue #602): the PAT-backed merge
# sweep proves a workflow-touching PR shares history with main using
# merge-base-dependent commands (the three-dot workflow diff and the orphan
# guard). On a shallow workspace both fail closed: the three-dot diff exits
# "no merge base" (the PR is skipped as not touching workflows) and the orphan
# guard reads a linked PR as unrelated, so the merge is silently skipped with
# no error and no red run - and workflow-file PRs can only land through this
# PAT path (issue #283 class). The opencode CLI session bootstrap itself
# re-shallows the full-depth checkout: its PR checkout path fetches with
# --depth=max(commits,20) and its PR-create precheck falls back to --depth=1
# (verified against the installed CLI), and a depth-limited fetch into a full
# clone records a new shallow boundary. Properties:
#   1. the merge step detects the shallow state and restores full history
#      BEFORE its first merge-base-dependent command (ordering is checked
#      structurally, not just by marker presence);
#   2. the strict orphan check is retained at BOTH sites (a single-site flip
#      to fail-open `-n` must trip the rule, so the count of strict `-z`
#      checks is asserted and any `-n` merge-base check is banned);
#   3. a workspace still shallow after the unshallow attempt warns loudly
#      instead of skipping silently (the conditional detection line must
#      appear for both the outer guard and the inner re-check, so replacing
#      either with an unconditional `if true` trips the rule).
r16_bad=""
if [ ! -f "$MAIN_WF" ]; then
  r16_bad=" maintainer.yml(missing)"
else
  pat_block=$(sed -n '/- name: PAT-backed merge for approved workflow-touching PRs/,/^      - name: /p' "$MAIN_WF" 2>/dev/null || true)
  if [ -z "$pat_block" ]; then
    r16_bad="${r16_bad} maintainer.yml(pat-merge-step-missing-or-renamed)"
  else
    # The exact conditional detection line must appear TWICE: the outer guard
    # and the post-attempt still-shallow re-check. A weakened outer `if true`
    # leaves only the inner occurrence; removing detection entirely leaves
    # none.
    r16_detect=$(printf '%s\n' "$pat_block" | grep -cF 'if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = "true" ]; then' || true)
    [ "$r16_detect" -ge 2 ] || r16_bad="${r16_bad} maintainer.yml(shallow-detection-count=${r16_detect},want>=2)"
    printf '%s\n' "$pat_block" | grep -qE 'git fetch origin main[[:space:]]+--unshallow' || r16_bad="${r16_bad} maintainer.yml(no-unshallow-fetch)"
    printf '%s\n' "$pat_block" | grep -qF 'still shallow after the unshallow attempt' || r16_bad="${r16_bad} maintainer.yml(no-still-shallow-warning)"
    r16_strict=$(printf '%s\n' "$pat_block" | grep -cF '[ -z "$(git merge-base origin/main' || true)
    r16_failopen=$(printf '%s\n' "$pat_block" | grep -cF '[ -n "$(git merge-base origin/main' || true)
    [ "$r16_strict" -ge 2 ] || r16_bad="${r16_bad} maintainer.yml(orphan-check-not-strict:strict=${r16_strict},want>=2)"
    [ "$r16_failopen" -eq 0 ] || r16_bad="${r16_bad} maintainer.yml(orphan-check-fail-open:failopen=${r16_failopen})"
    r16_unshallow_line=$(printf '%s\n' "$pat_block" | grep -nE 'git fetch origin main[[:space:]]+--unshallow' | head -1 | cut -d: -f1)
    r16_dep_line=$(printf '%s\n' "$pat_block" | grep -nE 'git merge-base|git diff --name-only "origin/main' | head -1 | cut -d: -f1)
    if [ -z "$r16_unshallow_line" ] || [ -z "$r16_dep_line" ] || [ "$r16_unshallow_line" -ge "$r16_dep_line" ]; then
      r16_bad="${r16_bad} maintainer.yml(unshallow-not-before-merge-base:${r16_unshallow_line:-none}/${r16_dep_line:-none})"
    fi
  fi
fi
if [ -z "$r16_bad" ]; then
  check "R16" "shallow workspace is unshallowed before the PAT merge sweep's first merge-base-dependent command, the strict orphan check is retained, and a still-shallow workspace warns instead of skipping silently (issue #602)" "ok"
else
  check "R16" "shallow-workspace PAT merge guard missing:${r16_bad} (issue #602: a linked workflow PR is silently skipped as an orphan on a shallow workspace)" "bad"
fi

# [R17] Per-OS findings-report contract (issue #608): a per-OS arm session
# used to carry its findings report only in the session's final message. The
# wrapper posts that message as a comment when no PR is created, but a
# PR-creating run turns it into the PR body instead, so the report vanished
# into the run log (macOS arm run 39036858261, PR #606 on issue #582) and the
# Maintainer had to recover it by hand. Properties:
#   1. each arm clears the runtime findings file before the agent step and
#      its prompt requires the report at /tmp/random-lab-findings.md;
#   2. each fail-closed verify step requires the findings report alongside
#      the decision file;
#   3. each arm posts the report through the shared script with its own OS
#      label, keeps the post step's exact name/id/gate/env sequence (its own
#      actor-gate + verify-success condition, then github.token, then the
#      event-derived TARGET) before the single decision-forward step, whose
#      first line after its name is the exact actor-gate + verify +
#      findings-success condition (a block-wide or parked gate line does not
#      satisfy this), carries its actor-gate plus post-step github.token envs
#      (never a PAT), keeps the post step's run body free of anything but
#      comments and the invocation with the invocation itself present, and
#      keeps the forward step free of continue-on-error;
#   4. the shared script validates the sign-off, posts as github-actions[bot]
#      (never the owner PAT), and re-fetches the comment by id to verify
#      authorship, the sign-off tail, and the exact body: every guard is the
#      exact uncommented `if ...; then` line whose own failure block ends in
#      a hard `exit 1` before its `fi` with no nested `if` (a weakened or
#      wrapped condition, a commented-out guard, or a no-op `exit 1` all
#      trip the rule); a functional test executes the real script against an
#      executable mock `gh` (interception asserted, credentials scrubbed, live
#      non-credential Actions env set realistically so env-fingerprint
#      detection cannot green a broken poster, per-case mock behavior read
#      from a sandbox config file, sandbox outside the repo tree) and
#      requires fail-closed behavior on wrong author, unsigned report,
#      missing report, tampered body with an intact sign-off tail, failed
#      post, and missing comment id, across all three OS labels;
#   5. all three tester prompt files carry the contract.
#   Windows line endings (issue #612 follow-up, Windows arm run 39068849150
#   on PR #632): Git Bash translates line endings of command-substituted
#   output, so the Windows arm posted its findings comment and then the
#   exact-body gate rejected the clean-LF re-fetch. The poster must normalize
#   CR bytes on both sides of the exact comparison and post an LF-normalized
#   copy so the stored body is platform-stable, while a real content mismatch
#   stays red. The functional-test mock carries `crlf_fetch` (CRLF-translated
#   re-fetch output) and `posted_capture` (records the exact file handed to
#   `gh api -F body=@...`) knobs, and the fixture set includes a CRLF report,
#   a CRLF-translated LF re-fetch, a CRLF report posted on Windows, and a
#   CRLF tampered body with an intact sign-off tail. The CRLF fixture is
#   self-validating: the audit probes the mock directly and requires the
#   translated body to carry CR bytes through the poster's own jq -r decode
#   path, so a neutered mock cannot mask a poster normalization regression.
# Review-gated residual boundary: the verify step's own run body cannot be
# functionally executed statically, so an early `exit 0` inserted into it (or
# any arbitrary reshuffle of a step's control flow that still passes every
# exact-form check above) is caught by the review gate, not by this rule; the
# same applies to a poster that deliberately fingerprints the sandbox path or
# the mock `gh` itself (path-based detection is unbounded static territory,
# while env-fingerprint detection is banned statically and defeated by the
# realistic functional env).
r17_bad=""
R17_SCRIPT=".github/scripts/post-peros-findings.sh"
peros_arm_block() {
  awk -v job="  $1:" '
    $0 == job { inblk = 1 }
    inblk && /^  [a-z0-9-]+:$/ && $0 != job { exit }
    inblk { print }
  ' "$PEROS_WF" 2>/dev/null || true
}
if [ ! -f "$PEROS_WF" ]; then
  r17_bad=" opencode-peros-test.yml(missing)"
else
  for r17_os in linux macos windows; do
    r17_block=$(peros_arm_block "test-${r17_os}")
    if [ -z "$r17_block" ]; then
      r17_bad="${r17_bad} arm-${r17_os}(job-missing)"
      continue
    fi
    printf '%s\n' "$r17_block" | grep -qF 'rm -f /tmp/random-lab-decision.json /tmp/random-lab-findings.md' || r17_bad="${r17_bad} arm-${r17_os}(no-findings-clear)"
    printf '%s\n' "$r17_block" | grep -qF 'the COMPLETE findings report as Markdown to `/tmp/random-lab-findings.md`' || r17_bad="${r17_bad} arm-${r17_os}(prompt-not-file-based)"
    printf '%s\n' "$r17_block" | grep -qF '[ -s /tmp/random-lab-findings.md ] || missing="${missing} findings-report"' || r17_bad="${r17_bad} arm-${r17_os}(verify-not-requiring-findings-file)"
    printf '%s\n' "$r17_block" | grep -qF 'if [ "$need_poster" = "true" ]; then' || r17_bad="${r17_bad} arm-${r17_os}(no-poster-restore-for-older-heads)"
    printf '%s\n' "$r17_block" | grep -qF 'git archive "${GITHUB_SHA}" -- .github/scripts/post-peros-findings.sh' || r17_bad="${r17_bad} arm-${r17_os}(no-poster-archive-restore)"
    printf '%s\n' "$r17_block" | grep -qE '^          bash \.github/scripts/post-peros-findings\.sh '"${r17_os}"' "\$TARGET"$' || r17_bad="${r17_bad} arm-${r17_os}(no-shared-post-step)"
    printf '%s\n' "$r17_block" | sed 's/^[[:space:]]*//' | grep -qxF "if: always() && steps.actor_gate.outputs.run == 'true' && steps.verify-test.outcome == 'success'" || r17_bad="${r17_bad} arm-${r17_os}(post-step-gate-not-exact)"
    # The gate and the github.token env must live on the post step itself, in
    # order (github.token, then the event-derived TARGET): a parked exact line
    # on another step or a PAT env swap must trip (independent-verifier
    # finding Y7). Step names capitalize as Linux/macOS/Windows.
    case "$r17_os" in
      linux)   r17_os_tag="Linux" ;;
      macos)   r17_os_tag="macOS" ;;
      windows) r17_os_tag="Windows" ;;
    esac
    printf '%s\n' "$r17_block" | sed 's/^[[:space:]]*//' | awk -v tag="Post ${r17_os_tag} tester findings report" -v gate="if: always() && steps.actor_gate.outputs.run == 'true' && steps.verify-test.outcome == 'success'" '
      done { next }
      $0 == "- name: " tag { seq=1; next }
      seq >= 6 && $0 ~ /^- name: / { done=1; next }
      seq == 1 { if ($0 == "id: findings") { seq=2 } else { bad=1; seq=9 }; next }
      seq == 2 { if ($0 == gate) { seq=3 } else { bad=1; seq=9 }; next }
      seq == 3 { if ($0 == "env:") { seq=4 } else { bad=1; seq=9 }; next }
      seq == 4 { if ($0 == "GH_TOKEN: ${{ github.token }}") { seq=5 } else { bad=1; seq=9 }; next }
      seq == 5 { if ($0 == "TARGET: ${{ github.event.issue.number }}") { ok=1; seq=6 } else { bad=1; seq=9 }; next }
      seq == 6 { if ($0 ~ /^continue-on-error:/) { bad=1 }; next }
      seq == 9 { next }
      END { exit((ok && !bad) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(post-step-sequence-broken)"
    # The forward gate must live on the forward step itself, the arm must carry
    # exactly one post step and one forward step, and the post step must
    # precede the forward (round-2 reviewer finding F1): block-wide greps and a
    # first-occurrence match let a reordered arm green while the forward's
    # findings gate evaluated before the findings step ran, and let a parked
    # exact line on a dead duplicate step hide a dropped live gate.
    r17_post_name="      - name: Post ${r17_os_tag} tester findings report"
    r17_fwd_name="      - name: Forward ${r17_os_tag} tester decision"
    r17_post_count=$(printf '%s\n' "$r17_block" | grep -cF -- "$r17_post_name" || true)
    r17_fwd_count=$(printf '%s\n' "$r17_block" | grep -cF -- "$r17_fwd_name" || true)
    [ "$r17_post_count" -eq 1 ] || r17_bad="${r17_bad} arm-${r17_os}(post-step-count=${r17_post_count},want=1)"
    [ "$r17_fwd_count" -eq 1 ] || r17_bad="${r17_bad} arm-${r17_os}(forward-step-count=${r17_fwd_count},want=1)"
    r17_post_line=$(printf '%s\n' "$r17_block" | grep -nF -- "$r17_post_name" | head -n1 | cut -d: -f1)
    r17_fwd_line=$(printf '%s\n' "$r17_block" | grep -nF -- "$r17_fwd_name" | head -n1 | cut -d: -f1)
    if [ -z "$r17_post_line" ] || [ -z "$r17_fwd_line" ] || [ "$r17_post_line" -ge "$r17_fwd_line" ]; then
      r17_bad="${r17_bad} arm-${r17_os}(post-not-before-forward)"
    fi
    printf '%s\n' "$r17_block" | sed 's/^[[:space:]]*//' | awk -v tag="Forward ${r17_os_tag} tester decision" -v gate="if: always() && steps.actor_gate.outputs.run == 'true' && steps.verify-test.outcome == 'success' && steps.findings.outcome == 'success'" '
      done { next }
      $0 == "- name: " tag { seq=1; seen=1; next }
      seq == 2 && $0 ~ /^- name: / { done=1; next }
      seq == 1 { if ($0 == gate) { ok=1; seq=2 } else { bad=1; seq=3 }; next }
      seq == 3 { next }
      END { exit((seen && ok && !bad) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(forward-gate-not-on-forward-step)"
    r17_token_envs=$(printf '%s\n' "$r17_block" | sed 's/^[[:space:]]*//' | grep -cxF 'GH_TOKEN: ${{ github.token }}' || true)
    [ "$r17_token_envs" -ge 2 ] || r17_bad="${r17_bad} arm-${r17_os}(github-token-env-count=${r17_token_envs},want>=2)"
    # The post step's run body may contain only comments, blanks, and the exact
    # invocation, and the invocation must itself appear there (round-2
    # reviewer recommendation; independent-verifier findings Z1/Z2/W1/W2): an
    # inserted `exit 0`, extra command, `|| true`, a `run:` header other than
    # `|` (YAML would fold the comments and invocation into one comment line),
    # a `shell:`/`working-directory:` override, or a comment-only body with
    # the live invocation parked in another step would let the arm conclude
    # green with the report never posted.
    printf '%s\n' "$r17_block" | awk -v tag="      - name: Post ${r17_os_tag} tester findings report" -v want="bash .github/scripts/post-peros-findings.sh ${r17_os} \"\$TARGET\"" '
      $0 == tag { post=1; seen=1; next }
      post && $0 ~ /^      - / { post=0 }
      post && $0 ~ /^[[:space:]]*(shell|working-directory):/ { bad=1 }
      post && $0 ~ /^        run:/ { run=1; run_seen=1; if ($0 != "        run: |") bad=1; next }
      run && $0 ~ /^      - / { run=0 }
      run { s=$0; sub(/^[[:space:]]+/, "", s); if (s == "" || s ~ /^#/) next; if (s != want) { bad=1 } else { got=1 } }
      END { exit((seen && run_seen && !bad && got) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(post-run-body-modified)"
    # The forward step must not mask its own failures or re-shell itself (W3).
    printf '%s\n' "$r17_block" | awk -v tag="      - name: Forward ${r17_os_tag} tester decision" '
      $0 == tag { fwd=1; seen=1; next }
      fwd && $0 ~ /^      - / { fwd=0 }
      fwd && $0 ~ /^[[:space:]]*(continue-on-error|shell|working-directory):/ { bad=1 }
      END { exit((seen && !bad) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(forward-step-weakened)"
    # Job-level defaults would silently re-shell every contract step when
    # pointed at a neutered shell (W3; the Windows arm's `shell: bash` default
    # is required because windows-latest defaults to pwsh, so any defaults
    # block must be exactly that safe form, and shell/working-directory
    # overrides are banned elsewhere in the arm).
    printf '%s\n' "$r17_block" | awk '
      $0 == "    defaults:" { dcount++; line=1; next }
      line == 1 && $0 == "      run:" { line=2; next }
      line == 2 && $0 == "        shell: bash" { line=0; ok++; next }
      line > 0 { bad=1; line=0 }
      $0 ~ /^[[:space:]]*shell:/ && $0 != "        shell: bash" { bad=1 }
      $0 ~ /^[[:space:]]*working-directory:/ { bad=1 }
      END { exit((dcount == 0 || (dcount == 1 && ok == 1 && !bad)) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(unsafe-defaults-or-shell-override)"
    # The verify step must keep its exact id and always() gate, and must not
    # mask its own failure or re-shell itself (W5/W6/W7): a renamed id makes
    # the post/forward gate conditions reference a nonexistent step.
    printf '%s\n' "$r17_block" | awk '
      $0 == "      - name: Verify test decided, else fail closed" { v=1; seen=1; next }
      v && $0 ~ /^      - / { v=0 }
      v && $0 == "        id: verify-test" { id_ok=1 }
      v && $0 == "        if: always()" { if_ok=1 }
      v && $0 ~ /^[[:space:]]*(continue-on-error|shell|working-directory):/ { bad=1 }
      END { exit((seen && id_ok && if_ok && !bad) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(verify-step-weakened)"
  done
fi
if [ ! -f "$R17_SCRIPT" ]; then
  r17_bad="${r17_bad} post-peros-findings.sh(missing)"
else
  for r17_signoff in '- the Linux Tester' '- the macOS Tester' '- the Windows Tester'; do
    grep -qF -- "$r17_signoff" "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-signoff:$r17_signoff)"
  done
  grep -qF 'github-actions[bot]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-bot-author-check)"
  grep -qF 'if [ "$author" != "github-actions[bot]" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-bot-author-check)"
  grep -qF 'if [ "$last_line" != "$signoff" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-pre-post-signoff-validation)"
  grep -qF 'if [ "$fetched_last" != "$signoff" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-post-fetch-signoff-check)"
  grep -qF 'if [ "$fetched_body" != "$expected_body" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-body-equality-check)"
  grep -qF 'issues/comments/${comment_id}' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-re-fetch-verification)"
  grep -qF 'Verified bot-authored' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-verified-terminal-marker)"
  # Harness-detection ban and exact sign-off assignments (independent-verifier
  # findings P1-P4): the poster must not branch on CI-only env or hardcode the
  # production repo slug (the functional test runs with realistic values), and
  # each OS case must map to its literal sign-off line, not a derived value.
  grep -qF 'GITHUB_ACTIONS' "$R17_SCRIPT" && r17_bad="${r17_bad} script(poster-references-GITHUB_ACTIONS)"
  grep -qF 'MOCK_' "$R17_SCRIPT" && r17_bad="${r17_bad} script(poster-references-MOCK)"
  grep -qF 'RandomLabs/' "$R17_SCRIPT" && r17_bad="${r17_bad} script(poster-hardcodes-repo-slug)"
  sed 's/^[[:space:]]*//' "$R17_SCRIPT" | grep -qxF 'linux)   signoff="- the Linux Tester" ;;' || r17_bad="${r17_bad} script(linux-signoff-assignment-not-exact)"
  sed 's/^[[:space:]]*//' "$R17_SCRIPT" | grep -qxF 'macos)   signoff="- the macOS Tester" ;;' || r17_bad="${r17_bad} script(macos-signoff-assignment-not-exact)"
  sed 's/^[[:space:]]*//' "$R17_SCRIPT" | grep -qxF 'windows) signoff="- the Windows Tester" ;;' || r17_bad="${r17_bad} script(windows-signoff-assignment-not-exact)"
  # Structural assertions (independent-verifier findings X1/X2/X3, Y1/Y9, and
  # round-2 note N1): the literal greps above can be satisfied by weakened or
  # no-op code. Require each guard to be the exact uncommented `if ...; then`
  # line, and its own failure block (up to its closing `fi`, with no nested
  # control flow - `if`/`while`/`for`/`case`/`until` or a function definition -
  # and no early fall-through) to end in a real `exit 1`.
  r17_guard_block_has_exit() {
    sed 's/^[[:space:]]*//' "$R17_SCRIPT" | awk -v p="$1" '
      $0 == p { inblk=1; next }
      inblk && $0 ~ /^(if|while|for|case|until)[[:space:]]/ { nested=1 }
      inblk && $0 ~ /^[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\(\)[[:space:]]*\{/ { nested=1 }
      inblk && $0 == "exit 1" { found=1 }
      inblk && $0 == "fi" { closed=1; inblk=0 }
      END { exit((found && closed && !nested) ? 0 : 1) }'
  }
  for r17_guard in \
    'pre-post-signoff:if [ "$last_line" != "$signoff" ]; then' \
    'bot-author:if [ "$author" != "github-actions[bot]" ]; then' \
    'post-fetch-signoff:if [ "$fetched_last" != "$signoff" ]; then' \
    'body-equality:if [ "$fetched_body" != "$expected_body" ]; then'; do
    r17_guard_name="${r17_guard%%:*}"
    r17_guard_line="${r17_guard#*:}"
    sed 's/^[[:space:]]*//' "$R17_SCRIPT" | grep -qxF -- "$r17_guard_line" || r17_bad="${r17_bad} script(${r17_guard_name}-guard-not-exact)"
    r17_guard_block_has_exit "$r17_guard_line" || r17_bad="${r17_bad} script(${r17_guard_name}-guard-block-has-no-exit-1)"
  done
  # Functional contract test (independent-verifier findings Z3/Z4 and
  # round-4 P1-P4: text greps cannot prove the poster's runtime behavior, so
  # execute the real script). Per delegation.md section 6 the mock is
  # executable, interception is asserted BEFORE any poster run, credentials
  # are scrubbed, and the sandbox lives outside the repository tree. Live
  # non-credential Actions env is set realistically (GITHUB_ACTIONS=true and a
  # realistic repo slug whose owner segment differs from production) and
  # per-case mock behavior comes from a
  # case.cfg file, not from env, so env-fingerprint detection cannot green a
  # broken poster (the full production slug is statically banned, so an
  # owner-only fingerprint remains a review-gated boundary, round-2 note N3).
  # A body that keeps the sign-off tail but tampers with
  # earlier content must be rejected; a tampered-body run that exits 0
  # (guards unreachable or expected_body clobbered) trips the rule.
  r17_script_abs="$(pwd)/$R17_SCRIPT"
  r17_tmp=$(mktemp -d 2>/dev/null || true)
  if [ -z "$r17_tmp" ] || [ ! -d "$r17_tmp" ]; then
    r17_bad="${r17_bad} script(functional-sandbox-unavailable)"
  elif ! command -v jq >/dev/null 2>&1; then
    r17_bad="${r17_bad} script(functional-jq-missing)"
  else
    trap 'rm -rf "$r17_tmp"' EXIT
    r17_mockdir="$r17_tmp/bin"
    mkdir -p "$r17_mockdir"
    printf '{"action":"maintainer"}\n' > "$r17_tmp/event.json"
    cat > "$r17_mockdir/gh" <<'R17_MOCK'
#!/usr/bin/env bash
r17_cfg="$(cd "$(dirname "$0")/.." && pwd)/case.cfg"
author="github-actions[bot]"
fail_post="0"
no_id="0"
body_file=""
crlf_fetch="0"
posted_capture=""
# shellcheck disable=SC1090
. "$r17_cfg"
case "$*" in
  *"/issues/comments/"*)
    r17_body="$(cat "$body_file" 2>/dev/null || true)"
    if [ "$crlf_fetch" = "1" ]; then
      r17_body="$(printf '%s' "$r17_body" | sed 's/$/\r/')"
    fi
    jq -n --arg a "$author" --arg b "$r17_body" '{user:{login:$a},html_url:"https://example.invalid/comment",body:$b}'
    ;;
  *)
    if [ "$fail_post" = "1" ]; then
      echo "mock gh: post failed" >&2
      exit 1
    fi
    if [ -n "$posted_capture" ]; then
      r17_posted=""
      for r17_arg in "$@"; do
        case "$r17_arg" in
          body=@*) r17_posted="${r17_arg#body=@}" ;;
        esac
      done
      if [ -n "$r17_posted" ]; then
        cp "$r17_posted" "$posted_capture" 2>/dev/null || true
      fi
    fi
    if [ "$no_id" = "1" ]; then
      printf '{}\n'
    else
      printf '{"id":12345}\n'
    fi
    ;;
esac
R17_MOCK
    chmod +x "$r17_mockdir/gh"
    if [ "$(PATH="$r17_mockdir:$PATH" command -v gh)" != "$r17_mockdir/gh" ]; then
      r17_bad="${r17_bad} script(functional-mock-not-intercepted)"
    else
      r17_good_linux="$r17_tmp/good-linux.md"
      printf 'Finding one.\nFinding two.\n\n- the Linux Tester\n' > "$r17_good_linux"
      r17_good_macos="$r17_tmp/good-macos.md"
      printf 'Finding one.\nFinding two.\n\n- the macOS Tester\n' > "$r17_good_macos"
      r17_good_windows="$r17_tmp/good-windows.md"
      printf 'Finding one.\nFinding two.\n\n- the Windows Tester\n' > "$r17_good_windows"
      r17_tampered="$r17_tmp/tampered.md"
      printf 'Finding one tampered. Finding two gone.\n\n- the Linux Tester\n' > "$r17_tampered"
      r17_unsigned="$r17_tmp/unsigned.md"
      printf 'Finding one without a sign-off.\n' > "$r17_unsigned"
      r17_missing="$r17_tmp/missing.md"
      # Windows line-ending fixtures (issue #612 follow-up, Windows arm run
      # 39068849150 on PR #632): the tester wrote its report on Windows, and
      # Git Bash translates command-substituted output to CRLF, so a CRLF
      # report and/or a CRLF-translated re-fetch must verify green, and the
      # posted body must be the LF-normalized copy (captured by the mock).
      r17_crlf_windows="$r17_tmp/crlf-windows.md"
      printf 'Finding one.\r\nFinding two.\r\n\r\n- the Windows Tester\r\n' > "$r17_crlf_windows"
      r17_crlf_windows_norm="$r17_tmp/crlf-windows-normalized.md"
      tr -d '\r' < "$r17_crlf_windows" > "$r17_crlf_windows_norm"
      r17_crlf_tampered="$r17_tmp/crlf-tampered.md"
      printf 'Finding one tampered. Finding two gone.\r\n\r\n- the Windows Tester\r\n' > "$r17_crlf_tampered"
      # Self-validating fixture (finding F2 of the independent adversarial
      # verification): prove the crlf_fetch emulation really emits CR bytes
      # through the same jq -r decode path the poster uses, so a neutered
      # mock cannot mask a poster normalization regression.
      printf 'author="github-actions[bot]"\nfail_post="0"\nno_id="0"\nbody_file=%q\ncrlf_fetch="1"\nposted_capture=""\n' "$r17_good_linux" > "$r17_tmp/case.cfg"
      if PATH="$r17_mockdir:$PATH" gh api "repos/mock/mock/issues/comments/1" 2>/dev/null | jq -r '.body // empty' 2>/dev/null | grep -q $'\r'; then
        :
      else
        r17_bad="${r17_bad} script(functional-crlf-fetch-mock-not-translating)"
      fi
      r17_case() {
        r17_case_name="$1"; r17_case_want="$2"; r17_case_os="$3"; r17_case_report="$4"; shift 4
        {
          printf 'author="github-actions[bot]"\n'
          printf 'fail_post="0"\n'
          printf 'no_id="0"\n'
          printf 'body_file=%q\n' "$r17_case_report"
          for r17_kv in "$@"; do printf '%s\n' "$r17_kv"; done
        } > "$r17_tmp/case.cfg"
        r17_case_out=$(cd "$r17_tmp" && env -u GITHUB_TOKEN -u GH_TOKEN -u GH_API_TOKEN \
          PATH="$r17_mockdir:$PATH" GITHUB_ACTIONS=true GITHUB_REPOSITORY="RandomLabs/RandomLabs" \
          GITHUB_EVENT_PATH="$r17_tmp/event.json" \
          bash "$r17_script_abs" "$r17_case_os" 1 "$r17_case_report" 2>&1)
        r17_case_rc=$?
        if [ "$r17_case_rc" -ne "$r17_case_want" ]; then
          r17_bad="${r17_bad} script(functional-${r17_case_name}-rc=${r17_case_rc},want=${r17_case_want})"
          printf 'R17 functional case %s failed (rc=%s, want=%s); output:\n%s\n' "$r17_case_name" "$r17_case_rc" "$r17_case_want" "$r17_case_out" >&2
        fi
      }
      r17_case good-linux 0 linux "$r17_good_linux"
      r17_case missing-report 1 linux "$r17_missing"
      r17_case unsigned-report 1 linux "$r17_unsigned"
      r17_case tampered-body 1 linux "$r17_good_linux" "body_file=$r17_tampered"
      r17_case wrong-author 1 linux "$r17_good_linux" 'author="Userfrom1995"'
      r17_case post-failure 1 linux "$r17_good_linux" 'fail_post="1"'
      r17_case missing-comment-id 1 linux "$r17_good_linux" 'no_id="1"'
      r17_case good-macos 0 macos "$r17_good_macos"
      r17_case unsigned-macos 1 macos "$r17_unsigned"
      r17_case wrong-author-macos 1 macos "$r17_good_macos" 'author="Userfrom1995"'
      r17_case good-windows 0 windows "$r17_good_windows"
      r17_case unsigned-windows 1 windows "$r17_unsigned"
      r17_case wrong-author-windows 1 windows "$r17_good_windows" 'author="Userfrom1995"'
      r17_case crlf-fetch-linux 0 linux "$r17_good_linux" 'crlf_fetch="1"'
      r17_case crlf-report-plain-windows 0 windows "$r17_crlf_windows"
      r17_case crlf-report-windows 0 windows "$r17_crlf_windows" 'crlf_fetch="1"' "posted_capture=$r17_tmp/posted-crlf-report.md"
      r17_case crlf-tampered-windows 1 windows "$r17_crlf_windows" "body_file=$r17_crlf_tampered" 'crlf_fetch="1"'
      # The normalized LF copy is what must reach the API (issue #612
      # follow-up requirement b): the captured posted body must be
      # byte-identical to the LF-normalized report, never the raw CRLF file.
      if [ -f "$r17_tmp/posted-crlf-report.md" ] && cmp -s "$r17_tmp/posted-crlf-report.md" "$r17_crlf_windows_norm"; then
        :
      else
        r17_bad="${r17_bad} script(functional-crlf-report-not-posted-as-normalized-lf)"
      fi
    fi
  fi
fi
for r17_prompt in tester-linux.md tester-macos.md tester-windows.md; do
  r17_path=".github/agents/${r17_prompt}"
  if [ ! -f "$r17_path" ]; then
    r17_bad="${r17_bad} ${r17_prompt}(missing)"
    continue
  fi
  grep -qF '/tmp/random-lab-findings.md' "$r17_path" || r17_bad="${r17_bad} ${r17_prompt}(no-report-contract)"
  grep -qF 'Findings Report Contract' "$r17_path" || r17_bad="${r17_bad} ${r17_prompt}(no-contract-marker)"
done
if [ -z "$r17_bad" ]; then
  check "R17" "all three per-OS arms clear, require, post, and verify the signed /tmp/random-lab-findings.md report (bot-authored, re-fetched by id) before the decision forward, and the tester prompts carry the contract (issue #608)" "ok"
else
  check "R17" "per-OS findings-report contract missing:${r17_bad} (issue #608: a PR-creating arm run drops the report and only the run log has it)" "bad"
fi

# [R18] Windows MSYS argv conversion guard (issue #612): the per-OS decision
# forwarders run under Git Bash on the windows-latest arm, and MSYS2 path
# conversion rewrites any argv element that looks like a POSIX absolute path
# before the native child process sees it. The native Windows arm's handoff
# body was posted as the literal path "C:/Program Files/Git/oc maintainer"
# (comment on #582 at 15:08:55Z, run 39036859435), which is not a valid "/oc"
# trigger for any strict-prefix consumer. The rule parses the workflow YAML
# STRUCTURALLY (python3 + PyYAML, preinstalled on the auditor runner) instead
# of grepping raw text, because a raw-text check can be spoofed by dead
# comment/echo/heredoc content inside a run block (an independent adversarial
# pass defeated a first text-only draft exactly that way). Two properties:
#   1. whole-tree discovery: inside every job whose runner is Windows (static
#      or list-form runs-on values mentioning windows, or a matrix runs-on
#      whose matrix values mention windows), no bash-effective step (pwsh and
#      cmd steps have no MSYS layer and are skipped; on a Windows runner a
#      plain "sh" resolves to Git's MSYS sh and is scanned) may pass a
#      slash-leading body value ("/oc ...") through argv (--body / --body= /
#      gh's -b shorthand, separate or attached) unless a REAL env opt-out
#      applies to that step. Opt-out semantics are
#      taken from the MSYS2 runtime source, not from folklore:
#        - MSYS_NO_PATHCONV is a presence check (find_path_start_and_type
#          returns early whenever getenv() is non-NULL,
#          msys2_path_conv.cc:347), so any non-empty value at workflow, job,
#          or step level is a real opt-out ("1", "0", "false", "yes" all
#          work). An empty YAML value stays red: whether the runner exports a
#          key set to the empty string is not verifiable from the tree, so
#          the conservative reading wins.
#        - MSYS2_ARG_CONV_EXCL is read once at spawn (spawn.cc:292-299),
#          split on ";" only and never trimmed, and a token is honored only
#          when it is exactly "*" or a prefix of the argv word (path.cc:4208-
#          4212; empty tokens never match), so a comma-joined "foo,/oc", a
#          padded " /oc", or a quote-wrapped '"*"' is NOT an opt-out while
#          an exact "*" or "/oc" token is. MSYS prefix-matches whole argv
#          words, so "/octal" never covers "/oc maintainer", an exact "/oc"
#          token covers only the separate-token transport ("--body" then
#          "/oc ...") and never an attached word ("--body=/oc ...",
#          "-b/oc ..."), and it never covers a different slash body such as
#          "/review ...". Only the most specific
#          level that sets it takes effect (step > job > workflow), so an
#          ineffective step value is not rescued by a broader effective one.
#      An inline per-command assignment (MSYS_NO_PATHCONV=1 gh ...) and a
#      separate export statement are not env keys and stay red as
#      intentionally conservative false positives (modeling shell state
#      across a script is out of scope for a static tripwire); commented-out
#      text, heredoc prose, zero values, and similar spoofs never count.
#      Bash quoting is
#      modeled with a small state machine (NORMAL / single / double quotes /
#      $( ... ) command substitution, top-level positions only), comment
#      stripping follows shell word-start rules (a "x=${y#*/}" parameter
#      expansion is not a comment), backslash line continuations are joined,
#      workflow- and job-level defaults.run.shell are honored, and an
#      OR-composed if condition (e.g. "... || always()") is never treated as
#      a Windows skip. Composite action bash run steps under
#      .github/actions/ are scanned too (they run on the caller's runner),
#      with step-level env only: an action file cannot see the caller's
#      workflow/job env maps, so that scan stays conservative.
#   2. canonical per-OS forwarder contract: each of the three
#      "Forward ... tester decision" steps in opencode-peros-test.yml must
#      exist exactly once by YAML name inside its own job (test-linux /
#      test-macos / test-windows; a duplicate-named decoy step in another
#      job can neither stand in for nor hide a defaced forwarder), carry the
#      opt-out, deliver the body via stdin (a real top-level "--body-file -"
#      argument), and contain NO top-level --body (non-file) or -b token at
#      all, so neither the argv guard nor the conversion-proof transport can
#      silently regress (a helper that reverts to --body "$1", -b "$1", or
#      the attached -b"$1" is caught even though the runtime slash value is
#      invisible to a lexical scan, and a dead helper holding "--body-file -"
#      text cannot mask the reverted transport).
# Residual limitation (stated honestly): bash is undecidable, so a
# deliberately obfuscated rewrite that never spells "gh", "--body" or the
# slash value literally (string building, eval, arrays across lines) can
# still evade any static rule, and a run block that mutates the opt-out
# variables itself (unset ..., export KEY=..., writing to $GITHUB_ENV for a
# later step) evades the env-map model by design. Command-substitution and
# backtick bodies whose slash word IS spelled inside the substitution are
# covered (conservatively, see BODY_VALUE_PREFIX); what stays out of scope
# is a slash value that never appears literally at all (variable-built argv,
# eval, an expansion that only constructs the slash after the first closing
# delimiter). R18 is a tripwire for accidental reintroduction plus a strict
# canonical contract, and the human reviewer carries the semantic gate.
r18_bad=""
r18_python_out=$(python3 -I - <<'R18PY'
import glob
import os
import re
import sys

try:
    import yaml
except Exception as exc:
    sys.stdout.write("python-runtime(no-pyyaml:%s)\n" % exc)
    raise SystemExit(0)

PEROS = ".github/workflows/opencode-peros-test.yml"
FORWARDERS = (
    ("Linux", "test-linux"),
    ("macOS", "test-macos"),
    ("Windows", "test-windows"),
)
problems = []

GH_WORD_RE = re.compile(r"(^|[^A-Za-z0-9_.-])gh(\s|$|[);&|])")
# Slash-leading body forms, split by transport: attached ("--body=/oc x",
# "-b/oc x", '-b"/oc x"') keeps the body inside the same argv word as the
# flag, so no MSYS2_ARG_CONV_EXCL token can ever prefix-match it; separate
# ("--body /oc x", "-b /oc x") leaves the body in its own argv word.
# The value may be spelled as a plain quoted word ('/oc x', "/oc x"), an
# ANSI-C or locale quote ($'/oc x', $"/oc x" - bash strips the $ and expands
# the quoted text into the same argv word), or a default-value parameter
# expansion (${x:-/oc x} - expands to the default when x is unset), possibly
# under an enclosing quote ("${x:-/oc x}"); all of these spell the slash body
# literally, so BODY_VALUE_PREFIX accepts every spelling.
# A command substitution opener ($( ... ) or a backtick) is accepted up to
# its closing delimiter: at runtime the substitution expands to whatever it
# prints, so a slash word spelled inside it (--body "$(printf '/oc
# maintainer')", --body "`printf '/oc maintainer'`") is a real
# slash-leading argv word and is flagged conservatively. The value position
# is never executed, so the reading is lexical (a substitution that spells
# no slash word inside stays green).
# BODY_TOKEN_RE / SHORT_B_TOKEN_RE are the contract-side detectors: any
# --body that is not --body-file, and any standalone -b token, whatever
# transport follows (they catch the variable-indirection defacements that the
# slash-literal forms cannot see).
BODY_VALUE_PREFIX = (
    r"(?:[\"']?\$(?:[\"']|\{[A-Za-z_][A-Za-z0-9_]*:-)?[\"']?"
    r"|[\"']?\$\([^)]*"
    r"|[\"']?`[^`]*"
    r"|\$?[\"']?)"
)
BODY_LONG_ATTACHED_RE = re.compile(r"(?<![A-Za-z0-9_-])--body=" + BODY_VALUE_PREFIX + r"(/[^\s/][^\s/]?)")
BODY_LONG_SEPARATE_RE = re.compile(r"(?<![A-Za-z0-9_-])--body\s+" + BODY_VALUE_PREFIX + r"(/[^\s/][^\s/]?)")
BODY_SHORT_ATTACHED_RE = re.compile(r"(?<![A-Za-z0-9_-])-b=?" + BODY_VALUE_PREFIX + r"(/[^\s/][^\s/]?)")
BODY_SHORT_SEPARATE_RE = re.compile(r"(?<![A-Za-z0-9_-])-b\s+" + BODY_VALUE_PREFIX + r"(/[^\s/][^\s/]?)")
BODY_TOKEN_RE = re.compile(r"(?<![A-Za-z0-9_-])--body(?!-file)")
BODY_FILE_STDIN_RE = re.compile(r"--body-file(=|\s+)-\s*(\d?>|\|\||;|&|$)")
SHORT_B_TOKEN_RE = re.compile(r"(?<![A-Za-z0-9_-])-b(?![A-Za-z0-9_-])")
BARE_QUOTED_RE = re.compile(r"([\"'])([A-Za-z0-9_./-]+)\1")


def has_windows(value):
    if isinstance(value, str):
        return "windows" in value.lower()
    if isinstance(value, list):
        return any(has_windows(item) for item in value)
    if isinstance(value, dict):
        return any(has_windows(item) for item in value.values())
    return False


def is_windows_job(job):
    runs_on = job.get("runs-on")
    if isinstance(runs_on, str) and "matrix" in runs_on:
        strategy = job.get("strategy")
        matrix = strategy.get("matrix") if isinstance(strategy, dict) else None
        if matrix is not None and has_windows(matrix):
            return True
    return has_windows(runs_on)


def effective_shell(step, job, workflow_defaults):
    shell = step.get("shell")
    for defaults in (job.get("defaults"), workflow_defaults):
        if shell is not None:
            break
        run_defaults = defaults.get("run") if isinstance(defaults, dict) else None
        if isinstance(run_defaults, dict):
            shell = run_defaults.get("shell")
    if shell is None:
        return "pwsh" if is_windows_job(job) else "bash"
    return str(shell)


def is_bash_shell(shell):
    # "bash" covers Git for Windows' Git Bash; on a Windows runner a plain
    # "sh" resolves to the same MSYS2 layer (Git's sh.exe), including custom
    # templates whose first word names it ("sh -e {0}", an absolute sh.exe
    # path). Everything else (pwsh, cmd, python) has no MSYS conversion layer.
    text = str(shell).strip().lower()
    if "bash" in text:
        return True
    parts = text.split()
    if not parts:
        return False
    first = parts[0].replace("\\", "/").rsplit("/", 1)[-1]
    if first.endswith(".exe"):
        first = first[:-4]
    return first == "sh"


def skips_windows(step):
    cond = step.get("if")
    if not isinstance(cond, str):
        return False
    compact = cond.replace(" ", "")
    if "||" in compact:
        # An OR-composed condition can still run on Windows (for example
        # "runner.os != 'Windows' || always()"); never treat those as skips.
        return False
    return (
        "runner.os!='Windows'" in compact
        or 'runner.os!="Windows"' in compact
        or "runner.os=='Linux'" in compact
        or 'runner.os=="Linux"' in compact
        or "runner.os=='macOS'" in compact
        or 'runner.os=="macOS"' in compact
    )


def presence_optout(env):
    # MSYS_NO_PATHCONV is a presence check at runtime: find_path_start_and_type
    # disables conversion whenever getenv() is non-NULL (msys2_path_conv.cc:347),
    # so any non-empty value is a real opt-out ("0", "false", and "yes" all
    # work). An empty YAML value is rejected conservatively: whether the runner
    # exports a key set to the empty string is not verifiable from the tree.
    if not isinstance(env, dict):
        return False
    value = env.get("MSYS_NO_PATHCONV")
    return value is not None and str(value) != ""


def arg_conv_excl_optout(env, body=None, attached=False):
    # MSYS2_ARG_CONV_EXCL is read once at spawn and split on ";" only, with no
    # trimming (spawn.cc:292-299); a token is honored only when it is exactly
    # "*" or a prefix of the argv word, and empty tokens never match
    # (path.cc:4208-4212). So "foo,/oc", " /oc", and a quote-wrapped '"*"' are
    # NOT opt-outs (MSYS sees one padded or quoted token). An exact "*" covers
    # every word; an exact "/oc" token covers only a slash body carried in its
    # own argv word ("--body" then "/oc ..."), never an attached word
    # ("--body=/oc ...", "-b/oc ...") and never a different slash body.
    if not isinstance(env, dict):
        return False
    value = env.get("MSYS2_ARG_CONV_EXCL")
    if value is None:
        return False
    tokens = str(value).split(";")
    if "*" in tokens:
        return True
    return (
        "/oc" in tokens
        and not attached
        and body is not None
        and body.startswith("/oc")
    )


def env_optout(env, body=None, attached=False):
    return presence_optout(env) or arg_conv_excl_optout(env, body, attached)


def merged_optout(workflow_env, job_env, step_env, body=None, attached=False):
    # MSYS_NO_PATHCONV is presence-based, so any level that sets it wins.
    if presence_optout(step_env) or presence_optout(job_env) or presence_optout(workflow_env):
        return True
    # MSYS2_ARG_CONV_EXCL follows the env override chain: only the most
    # specific level that sets the key takes effect (step > job > workflow),
    # so an ineffective step value is never rescued by a broader effective one.
    for env in (step_env, job_env, workflow_env):
        if isinstance(env, dict) and "MSYS2_ARG_CONV_EXCL" in env:
            return arg_conv_excl_optout(env, body, attached)
    return False


def at_top_level(line, index):
    # State machine over shell quoting: NORMAL, single quotes, double quotes,
    # command substitution ($( ... )) and backtick command substitution.
    # Tokens inside $( ) or `...` are real commands even when the
    # substitution itself sits inside double quotes, so
    # "out=$(gh ... --body /oc)" and "out=`gh ... --body /oc`" must not hide
    # the invocation.
    stack = []
    i = 0
    while i < index and i < len(line):
        state = stack[-1] if stack else "normal"
        char = line[i]
        if state == "sq":
            if char == "'":
                stack.pop()
        elif state == "dq":
            if char == "\\":
                i += 1
            elif char == '"':
                stack.pop()
            elif char == "$" and i + 1 < len(line) and line[i + 1] == "(":
                stack.append("cmd")
                i += 1
            elif char == "`":
                stack.append("bt")
        elif state == "cmd":
            if char == "'":
                stack.append("sq")
            elif char == '"':
                stack.append("dq")
            elif char == "\\":
                i += 1
            elif char == "$" and i + 1 < len(line) and line[i + 1] == "(":
                stack.append("cmd")
                i += 1
            elif char == "`":
                stack.append("bt")
            elif char == ")":
                stack.pop()
        elif state == "bt":
            if char == "'":
                stack.append("sq")
            elif char == '"':
                stack.append("dq")
            elif char == "\\":
                i += 1
            elif char == "`":
                stack.pop()
        else:
            if char == "'":
                stack.append("sq")
            elif char == '"':
                stack.append("dq")
            elif char == "\\":
                i += 1
            elif char == "$" and i + 1 < len(line) and line[i + 1] == "(":
                stack.append("cmd")
                i += 1
            elif char == "`":
                stack.append("bt")
        i += 1
    return (not stack) or stack[-1] in ("cmd", "bt")


def logical_lines(run_text):
    joined = []
    buffer = ""
    for raw in run_text.split("\n"):
        line = raw.rstrip()
        if line.endswith("\\"):
            buffer += line[:-1] + " "
            continue
        joined.append(buffer + line)
        buffer = ""
    if buffer:
        joined.append(buffer)
    return joined


def strip_comment(line):
    # In shell a "#" starts a comment only at the start of a word (word start
    # or whitespace/;/&/|/( before it). A bare "char == '#'" test would cut
    # "x=${y#*/}; gh ... --body /oc" at the parameter-expansion # and hide a
    # real invocation.
    out = []
    quote = None
    for i, char in enumerate(line):
        if quote is not None:
            if char == quote:
                quote = None
            out.append(char)
        elif char in "\"'":
            quote = char
            out.append(char)
        elif char == "#" and (i == 0 or line[i - 1] in " \t;&|("):
            break
        else:
            out.append(char)
    return "".join(out)


def slash_body_hit(line):
    # The regexp consumes the character before "gh"; the state must be
    # evaluated AT the g (m.end(1)), because that char can itself open a
    # backtick substitution (`gh ...`). ANY top-level gh on the line enables
    # the scan: a quoted "gh" earlier on the line (echo "using gh" && gh ...)
    # must not suppress a later real invocation.
    if not any(at_top_level(line, match.end(1)) for match in GH_WORD_RE.finditer(line)):
        return []
    hits = []
    for regex, flag, attached in (
        (BODY_LONG_ATTACHED_RE, "--body", True),
        (BODY_LONG_SEPARATE_RE, "--body", False),
        (BODY_SHORT_ATTACHED_RE, "-b", True),
        (BODY_SHORT_SEPARATE_RE, "-b", False),
    ):
        # Every hit on the line matters: a step can carry several posting
        # commands, and an opt-out that fits one body/form must not mask an
        # unguarded sibling.
        for match in regex.finditer(line):
            if at_top_level(line, match.start()):
                hits.append((flag, attached, match.group(1)))
    return hits


def normalize_line(line):
    # A bare quoted command word ("gh", 'gh') is the same word to bash, and
    # ${IFS} (or $IFS) is a whitespace separator; normalizing both keeps the
    # lexical scan honest without executing anything.
    line = line.replace("${IFS}", " ").replace("$IFS", " ")
    return BARE_QUOTED_RE.sub(r"\2", line)


def slash_body_hits(run_text):
    hits = []
    for line in logical_lines(run_text):
        stripped = normalize_line(strip_comment(line)).strip()
        if not stripped:
            continue
        hits.extend(slash_body_hit(stripped))
    return hits


def safe_step_name(step):
    name = step.get("name")
    return str(name) if name is not None else "?"


for path in sorted(set(glob.glob(".github/workflows/*.yml") + glob.glob(".github/workflows/*.yaml"))):
    try:
        with open(path) as handle:
            doc = yaml.safe_load(handle)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (path, exc))
        continue
    jobs = (doc or {}).get("jobs") if isinstance(doc, dict) else None
    if not isinstance(jobs, dict):
        continue
    workflow_defaults = doc.get("defaults") if isinstance(doc, dict) else None
    workflow_env = doc.get("env") if isinstance(doc, dict) else None
    for job_name, job in jobs.items():
        if not isinstance(job, dict) or not is_windows_job(job):
            continue
        steps = job.get("steps")
        if not isinstance(steps, list):
            continue
        for step in steps:
            if not isinstance(step, dict):
                continue
            run_text = step.get("run")
            if not isinstance(run_text, str):
                continue
            if not is_bash_shell(effective_shell(step, job, workflow_defaults)):
                continue
            if skips_windows(step):
                continue
            hit_unguarded = any(
                not merged_optout(workflow_env, job.get("env"), step.get("env"), body, attached)
                for _flag, attached, body in slash_body_hits(run_text)
            )
            if hit_unguarded:
                problems.append(
                    "%s(job-%s/step-%s:unguarded-slash-body-argv)"
                    % (path, job_name, safe_step_name(step))
                )

if not os.path.exists(PEROS):
    problems.append("opencode-peros-test.yml(missing)")
else:
    try:
        with open(PEROS) as handle:
            peros_doc = yaml.safe_load(handle)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (PEROS, exc))
        peros_doc = None
    peros_env = peros_doc.get("env") if isinstance(peros_doc, dict) else None
    peros_jobs = (peros_doc or {}).get("jobs") if isinstance(peros_doc, dict) else None
    if not isinstance(peros_jobs, dict):
        peros_jobs = {}
    for os_name, job_id in FORWARDERS:
        want = "Forward %s tester decision" % os_name
        # Exact-name matches anywhere in the file: a duplicate is a decoy
        # (the forwarder is identified by name, so a second same-named step
        # could stand in for a defaced forwarder) and is always red.
        named = [
            step
            for job in peros_jobs.values()
            if isinstance(job, dict)
            for step in (job.get("steps") if isinstance(job.get("steps"), list) else [])
            if isinstance(step, dict) and step.get("name") == want
        ]
        if len(named) > 1:
            problems.append("peros(forward-%s-name-duplicate:%d)" % (os_name, len(named)))
            continue
        found = None
        job = peros_jobs.get(job_id)
        if isinstance(job, dict):
            for step in job.get("steps") if isinstance(job.get("steps"), list) else []:
                if isinstance(step, dict) and step.get("name") == want:
                    found = step
                    break
        if found is None:
            problems.append("peros(forward-%s-step-missing-in-%s)" % (os_name, job_id))
            continue
        step = found
        run_text = step.get("run") if isinstance(step.get("run"), str) else ""
        if not merged_optout(peros_env, job.get("env"), step.get("env")):
            problems.append("peros(forward-%s-no-msys-optout)" % os_name)
        transport = False
        raw_body = False
        for line in logical_lines(run_text):
            stripped = normalize_line(strip_comment(line)).strip()
            if not stripped:
                continue
            gh = GH_WORD_RE.search(stripped)
            if gh is not None and at_top_level(stripped, gh.end(1)):
                match = BODY_FILE_STDIN_RE.search(stripped)
                if match is not None and at_top_level(stripped, match.start()):
                    transport = True
            # Any top-level --body that is not --body-file, or any standalone
            # -b token (separate or attached, variable or literal), means a
            # handoff body can reach argv on this step.
            for regex in (BODY_TOKEN_RE, SHORT_B_TOKEN_RE):
                match = regex.search(stripped)
                if match is not None and at_top_level(stripped, match.start()):
                    raw_body = True
        if not transport:
            problems.append("peros(forward-%s-no-stdin-transport)" % os_name)
        if raw_body:
            problems.append("peros(forward-%s-raw-argv-body)" % os_name)

# Composite actions run on the caller's runner, so a bash run step holding a
# slash-leading gh body can execute under Git Bash on Windows just like an
# inline workflow step. There is no safe default here: every such composite
# invocation must carry an MSYS env opt-out (or none may exist at all).
for action_path in sorted(set(glob.glob(".github/actions/*/action.yml") + glob.glob(".github/actions/*/action.yaml"))):
    try:
        with open(action_path) as handle:
            action_doc = yaml.safe_load(handle)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (action_path, exc))
        continue
    runs = action_doc.get("runs") if isinstance(action_doc, dict) else None
    steps = runs.get("steps") if isinstance(runs, dict) else None
    if not isinstance(steps, list):
        continue
    for step in steps:
        if not isinstance(step, dict):
            continue
        run_text = step.get("run")
        if not isinstance(run_text, str):
            continue
        shell = str(step.get("shell") or "")
        if not is_bash_shell(shell):
            continue
        if skips_windows(step):
            # A composite step conditioned away from Windows (evaluated on
            # the caller's runner) can never hit MSYS path conversion.
            continue
        hit_unguarded = any(
            not env_optout(step.get("env"), body, attached)
            for _flag, attached, body in slash_body_hits(run_text)
        )
        if not hit_unguarded:
            continue
        problems.append(
            "%s(composite-step-%s:unguarded-slash-body-argv)"
            % (action_path, safe_step_name(step))
        )

for problem in problems:
    sys.stdout.write(problem + "\n")
R18PY
) || r18_python_out="python-runtime(exit-failure)"
if [ -n "$r18_python_out" ]; then
  while IFS= read -r r18_line; do
    [ -n "$r18_line" ] || continue
    r18_bad="${r18_bad} ${r18_line}"
  done <<< "$r18_python_out"
fi
if [ -z "$r18_bad" ]; then
  check "R18" "every Windows-runner bash step passes slash-leading bodies through argv only behind a real MSYS env opt-out, and the three per-OS forwarders carry the opt-out plus the stdin (--body-file -) transport with no raw-argv body (issue #612)" "ok"
else
  check "R18" "Windows MSYS argv-conversion guard missing:${r18_bad} (issue #612: a /oc handoff body can be posted as a mangled C:/Program Files/Git path)" "bad"
fi

# [R19] Review-comment publication evidence (issues #616, #637): the review
# verify step treated ANY present /tmp/random-lab-decision.json as a
# completed verdict, even when the reviewer died between the decision-file
# write and the comment post (provider api_key_expired at turn end, review
# run 39052018409 on PR #614): the gate forwarded an unread verdict with
# zero published findings. Issue #637 showed the other half of the class: a
# HEALTHY reviewer session that ends on any message other than the
# sign-off-bearing decision comment (the wrapper posts only the FINAL
# message, so a post-compaction wrap-up replaced the composed verdict;
# review run 39089530715 on PR #636) also has an unpublished verdict, but
# reports outcome=success and used to hit a fail-loud branch with NO
# auto-retry, losing the verdict until a human recovered it. Properties:
#   1. the shared script accepts only a github-actions[bot] comment created
#      after the triggering comment whose body carries the reviewer sign-off
#      line (the wrapper's final-message comment with its run footer and a
#      mid-session comment-tool post without one both qualify; the dying
#      run's sign-off-less APIError comment never does), and exits
#      0 published / 1 not published / 2 unverifiable;
#   2. the verify step reads the script from this run's own workflow commit
#      (never the checked-out PR head, so a PR can never weaken the gate
#      that reviews it) and fails closed when it is unavailable;
#   3. an unpublished verdict is discarded BEFORE the infra override and the
#      forward step can ever see it, and - regardless of the agent step's
#      outcome (issue #637) - sets the shared crash flag that gates the
#      same bounded auto-retry a failed agent step uses, so the
#      success+unpublished class can never bypass the retry again; the
#      exact shape is pinned (both detection branches set the flag, the
#      retry is gated on exactly that flag, and no second unpublished
#      fail-loud branch may exist after it); a verification failure (exit
#      2) neither forwards nor auto-retries a possibly-published review;
#   4. the force-lab-routing and forward steps are gated on the verify
#      step's success, so no forward path survives an inconclusive verify;
#   5. a functional test executes the real script against an executable mock
#      `gh` (interception asserted, credentials scrubbed, per-case payload
#      from a sandbox config file, sandbox outside the repo tree) across
#      published (footer + tool-posted + page-2 + trailing-space),
#      incident-error, stale, owner-authored, inline-mention, empty,
#      bad-json, and fetch-failure payloads;
#   6. a second functional test (issue #637) executes the REAL extracted
#      verify `run:` block (struct-anchored: the step is line-anchored to the
#      `id: verify-review` binding the static pins assert, the run key must be
#      the single 8-space-indent one in the step; four expression macros plus
#      the decision-file path substituted, integrity asserted) under the
#      runner's `bash -e` default in a sandbox git repo whose GITHUB_SHA
#      commit carries a scenario-driven evidence stub and whose workspace tip
#      is a poisoned always-published copy (so a HEAD-reading provenance
#      extractor fails the unpublished cases behaviorally), against a mock
#      `gh` bound to the sandbox endpoint
#      (repos/mockrepo/issues/614/comments; any other call fails the case)
#      that serves the retry enumeration and records posts (and can reject
#      them under scenario control):
#      success+unpublished MUST post `/oc review (auto-retry N)` and exit 0
#      (the #637 regression), a failed run without a verdict retries, a
#      prior-marker thread advances N, the cap is pinned to exactly 3 (a
#      2-prior thread posts retry 3, a 3-prior thread refuses),
#      foreign-authored and embedded (non-prefix) lookalike markers never
#      count, an enumeration failure refuses loudly, exit 2 never retries,
#      success+no-decision stays a loud no-retry no-op, a gate denial skips
#      everything, the #616 incident quadrant (failure + decision present +
#      unpublished) discards the verdict and retries while a published
#      verdict survives a failed agent step untouched, and a rejected retry
#      POST fails the step loudly (review round 3, F11-F12).
#   7. static expression pins (review rounds 2-4, F7-F9 and F14-F21)
#      close what the sandbox cannot see, because its substituted identity
#      literals make a hardcoded/rewired expression behaviorally
#      indistinguishable: the retry POST must be the exact whole line (no
#      `|| true` suffix or flag change), the enumeration URL, the
#      owner+startswith counter predicate, the PR-number binding, the
#      workflow-commit provenance probe and extraction, and the evidence
#      invocation (its `"$SINCE"` argument included) must be the exact
#      expressions or whole lines, a `GITHUB_SHA=` reassignment or a `HEAD:`
#      provenance path is banned outright, the missing-evidence branch must
#      exit nonzero (its `exit 1` cannot silently become `exit 0`), the
#      verify step's `if:` line, AGENT_GATE env mapping, and owner-PAT
#      GH_TOKEN, the step's single `run: |` key, the absence of
#      shell/continue-on-error/defaults overrides at step, job, and workflow
#      level, the forward step's five exact trigger bodies, its PAT token and
#      absent attribute overrides, and the review job's exact step sequence
#      must hold, harness
#      literals and CI-only env fingerprints (`mockowner`, `mockrepo`,
#      `R19P_`, `GITHUB_EVENT_PATH`, `GITHUB_RUN_ID`, `GITHUB_ACTIONS`,
#      `GITHUB_REPOSITORY`, `GITHUB_WORKFLOW`, `GITHUB_JOB`,
#      `GITHUB_EVENT_NAME`, `GITHUB_ACTOR`, `RUNNER_OS`, standalone `CI`)
#      are banned from the block, and no `set +` (quoted or not) / `trap`
#      may bypass the runner's `bash -e` fail-fast. The case environment
#      additionally sets SINCE, GITHUB_EVENT_PATH (with a parseable event
#      file), GITHUB_ACTIONS and GITHUB_REPOSITORY to production-shaped
#      values and sanitizes the remaining ambient CI fingerprints, so an
#      env-fingerprint branch cannot behave differently in the sandbox than
#      on the runner even before the static ban fires (review round 3,
#      F13), and the evidence stub validates its arguments so a weakened
#      invocation cannot masquerade as a valid check (review round 3, F15).
# Residual boundary (same as R17): exotic sandbox-path fingerprinting is
# caught by the review gate, not by this rule; the verify shell control flow
# itself is now executed behaviorally per property 6. The missing-evidence
# branch and the two forward steps are statically pinned, not executed.
r19_bad=""
R19_SCRIPT=".github/scripts/review-comment-published.sh"
R19_VERDICT_GATE="if: steps.pr-info.outputs.is_pr == 'true' && always() && steps.actor_gate.outputs.run == 'true' && steps.verify-review.outcome == 'success'"
# F5 (review round 1): the verify step's exact name line, computed from its
# unique step id below and reused by both the static extraction and the
# property-6 behavioral extraction.
r19_name_line=""
if [ ! -f "$R19_SCRIPT" ]; then
  r19_bad="${r19_bad} review-comment-published.sh(missing)"
else
  bash -n "$R19_SCRIPT" 2>/dev/null || r19_bad="${r19_bad} script(syntax)"
  [ -x "$R19_SCRIPT" ] || r19_bad="${r19_bad} script(not-executable)"
  # Exact evidence predicate: bot author + created after the trigger + a real
  # sign-off line. Weakening or removing any filter must trip the rule.
  sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -qxF '| select(.user.login == "github-actions[bot]")' || r19_bad="${r19_bad} script(no-bot-author-select)"
  sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -qxF '| select(.created_at > $since)' || r19_bad="${r19_bad} script(no-since-filter)"
  sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -qxF '| select(.body | test("(?m)^- the Reviewer[ \t]*$"))' || r19_bad="${r19_bad} script(no-signoff-regex)"
  # Paginated, slurped fetch (a single unpaginated page would miss the
  # decision comment on busy threads and silently read as unpublished).
  sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -qxF 'payload=$(gh api "repos/${REPO}/issues/${PR}/comments?per_page=100" --paginate --slurp 2>/dev/null) || {' || r19_bad="${r19_bad} script(no-paginated-slurp-fetch)"
  # Exit-code contract: exactly one published exit 0 and one not-published
  # exit 1; every failure path exits 2. An added silent `exit 0` (e.g. in
  # front of the fetch guard) or a weakened failure exit trips the counts.
  r19_exit0=$(sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -cxF 'exit 0' || true)
  r19_exit1=$(sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -cxF 'exit 1' || true)
  r19_exit2=$(sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -cxF 'exit 2' || true)
  [ "$r19_exit0" -eq 1 ] || r19_bad="${r19_bad} script(exit0-count=${r19_exit0},want=1)"
  [ "$r19_exit1" -eq 1 ] || r19_bad="${r19_bad} script(exit1-count=${r19_exit1},want=1)"
  [ "$r19_exit2" -ge 4 ] || r19_bad="${r19_bad} script(exit2-count=${r19_exit2},want>=4)"
  # Harness-detection bans: the functional test runs with realistic values,
  # so the script must not branch on CI-only env or hardcode a repo slug.
  grep -qF 'GITHUB_ACTIONS' "$R19_SCRIPT" && r19_bad="${r19_bad} script(references-GITHUB_ACTIONS)"
  grep -qF 'MOCK_' "$R19_SCRIPT" && r19_bad="${r19_bad} script(references-MOCK)"
  grep -qF 'Userfrom1995' "$R19_SCRIPT" && r19_bad="${r19_bad} script(hardcodes-repo-slug)"
  grep -qF 'RandomLabs/' "$R19_SCRIPT" && r19_bad="${r19_bad} script(hardcodes-repo-slug)"
fi
if [ ! -f "$REVIEW_WF" ]; then
  r19_bad="${r19_bad} opencode-review.yml(missing)"
else
  # Step identity (F5, review round 1): the verify step is located by its
  # unique `id: verify-review`, and the exact step name must sit immediately
  # above that id. A renamed real step, a name decoy placed elsewhere, or a
  # duplicate id satisfies neither, so the static pins below and the
  # property-6 behavioral extraction can never be pointed at a step that does
  # not execute under the id the downstream gates reference.
  r19_id_count=$(grep -cxF '        id: verify-review' "$REVIEW_WF" || true)
  if [ "$r19_id_count" -eq 1 ]; then
    r19_id_line=$(grep -nxF '        id: verify-review' "$REVIEW_WF" | head -1 | cut -d: -f1)
    [ -n "$r19_id_line" ] && r19_name_line=$((r19_id_line - 1))
  else
    r19_bad="${r19_bad} review.yml(verify-id-count=${r19_id_count},want=1)"
  fi
  if [ -z "$r19_name_line" ] || [ "$(sed -n "${r19_name_line}p" "$REVIEW_WF")" != "      - name: Verify review decided, else auto-retry" ]; then
    r19_bad="${r19_bad} review.yml(verify-step-name-not-bound-to-id)"
    r19_name_line=""
    r19_verify_block=""
  else
    r19_verify_block=$(sed -n "${r19_name_line},/^      - name: /p" "$REVIEW_WF" 2>/dev/null || true)
  fi
  if [ -z "$r19_verify_block" ]; then
    r19_bad="${r19_bad} review.yml(verify-step-missing-or-renamed)"
  else
    # F16 (review round 3): the step's own execution wiring is pinned. Its
    # `if:` line bound the gate to PR runs; `if: false` would silently
    # disable the whole publication check, retry, and forward path, and the
    # sandbox cannot see that because it executes the extracted run block
    # directly. Its AGENT_GATE env mapping is the actor-denial guard's input:
    # a hardcoded "true" would turn an unprivileged-trigger skip into the
    # crash signature and post an owner /oc review auto-retry under the PAT
    # (the issue #428 laundering the denial branch exists to prevent).
    r19_step_header=$(sed -n "${r19_name_line},$((r19_name_line + 6))p" "$REVIEW_WF")
    printf '%s\n' "$r19_step_header" | grep -qxF "        if: steps.pr-info.outputs.is_pr == 'true' && always()" || r19_bad="${r19_bad} review.yml(verify-if-not-exact)"
    printf '%s\n' "$r19_step_header" | grep -qxF '          AGENT_GATE: ${{ steps.actor_gate.outputs.run }}' || r19_bad="${r19_bad} review.yml(verify-gate-env-not-exact)"
    # F17-F19 (review round 4): struct-anchored extraction and execution
    # attributes. The step region must contain exactly one `run: |` key: a
    # nested or duplicate run key (a step-shaped decoy before or inside the
    # real one) would otherwise be harvested by, or corrupt, the property-6
    # extraction while production executes a different body. The verify step
    # may carry no shell / continue-on-error / defaults override, the review
    # job none at job level, and the workflow none at workflow level: any of
    # them voids the runner's `bash -e` fail-fast guarantee the retry POST's
    # fail-loud contract depends on, or swallows the job failure itself. And
    # the verify step's GH_TOKEN must stay the owner PAT: an issue_comment run
    # spawned by a github.token-authored retry comment never fires, so the
    # bounded auto-retry would silently die.
    r19_runkey_count=$(printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -cxF 'run: |' || true)
    [ "$r19_runkey_count" -eq 1 ] || r19_bad="${r19_bad} review.yml(run-key-count=${r19_runkey_count},want=1)"
    r19_step_end_line=$(awk -v s="$r19_name_line" 'NR > s && /^      - name: / { print NR; exit }' "$REVIEW_WF")
    [ -n "$r19_step_end_line" ] || r19_step_end_line=$(wc -l < "$REVIEW_WF" | tr -d '[:space:]')
    sed -n "${r19_name_line},${r19_step_end_line}p" "$REVIEW_WF" | grep -qE '^[[:space:]]*(shell|continue-on-error|defaults):' && r19_bad="${r19_bad} review.yml(verify-step-attribute-override)"
    awk '/^  review:$/ { f=1; next } f && /^  [A-Za-z_]+:/ { exit } f && /^    (defaults|shell|continue-on-error):/ { print }' "$REVIEW_WF" | grep -q . && r19_bad="${r19_bad} review.yml(job-run-attribute-override)"
    grep -qE '^defaults:' "$REVIEW_WF" && r19_bad="${r19_bad} review.yml(workflow-run-defaults-override)"
    printf '%s\n' "$r19_step_header" | grep -qxF '          GH_TOKEN: ${{ secrets.OPENCODE_PAT }}' || r19_bad="${r19_bad} review.yml(verify-gh-token-not-PAT)"
    # The trigger timestamp must arrive via env indirection, never expanded
    # into the run script text (R10).
    printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -qxF 'SINCE: ${{ github.event.comment.created_at }}' || r19_bad="${r19_bad} review.yml(no-since-env)"
    # Script provenance: this run's own workflow commit, never the PR head.
    # F14/F15 (review round 3): these are whole-line pins (leading whitespace
    # stripped), not substring greps. A substring grep is satisfied by a `#
    # decoy:` comment carrying the pinned text beside a weakened live line
    # (e.g. provenance switched to `HEAD:`), and the sandbox cannot see that
    # because its single-commit repo has HEAD == GITHUB_SHA. The evidence
    # invocation is whole-line pinned for the same reason: its `"$SINCE"`
    # argument must be the real env indirection, never a literal that lets an
    # old signed comment satisfy the gate.
    printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -qxF 'if ! git cat-file -e "${GITHUB_SHA}:.github/scripts/review-comment-published.sh" 2>/dev/null; then' || r19_bad="${r19_bad} review.yml(workflow-commit-probe-not-exact)"
    printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -qxF 'git show "${GITHUB_SHA}:.github/scripts/review-comment-published.sh" > "$evidence_script" 2>/dev/null || rm -f "$evidence_script"' || r19_bad="${r19_bad} review.yml(workflow-commit-extract-not-exact)"
    printf '%s\n' "$r19_verify_block" | grep -q 'bash \.github/scripts/review-comment-published\.sh' && r19_bad="${r19_bad} review.yml(head-workspace-script-invocation)"
    printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -qxF 'bash "$evidence_script" "$pr" "$SINCE" || pub_rc=$?' || r19_bad="${r19_bad} review.yml(evidence-invocation-not-exact)"
    # Fail-closed when the script cannot be extracted.
    printf '%s\n' "$r19_verify_block" | grep -qF 'if [ ! -s "$evidence_script" ]; then' || r19_bad="${r19_bad} review.yml(no-fail-closed-on-missing-script)"
    # Exit-code mapping: 0 published / 1 unpublished / anything else refuse.
    printf '%s\n' "$r19_verify_block" | grep -qF '0) published="true" ;;' || r19_bad="${r19_bad} review.yml(no-published-map)"
    printf '%s\n' "$r19_verify_block" | grep -qF '1) published="false" ;;' || r19_bad="${r19_bad} review.yml(no-unpublished-map)"
    r19_unknown_block=$(printf '%s\n' "$r19_verify_block" | awk '
      $0 ~ /^[[:space:]]*\*\)[[:space:]]*$/ { f=1 }
      f { print }
      f && $0 ~ /^[[:space:]]*;;[[:space:]]*$/ { exit }')
    printf '%s\n' "$r19_unknown_block" | grep -qF 'rm -f /tmp/random-lab-decision.json' || r19_bad="${r19_bad} review.yml(unknown-verify-keeps-verdict)"
    printf '%s\n' "$r19_unknown_block" | grep -qE '^[[:space:]]*exit 1$' || r19_bad="${r19_bad} review.yml(unknown-verify-not-exit-1)"
    printf '%s\n' "$r19_unknown_block" | grep -q 'gh api' && r19_bad="${r19_bad} review.yml(unknown-verify-auto-retries)"
    # Ordering (issues #616, #637): evidence before verdict, verdict before
    # the published guard, published guard before its exit 0, and the discard
    # of an unpublished verdict between the guard and the retry block.
    r19_line() { printf '%s\n' "$r19_verify_block" | grep -nF -- "$1" | head -1 | cut -d: -f1; }
    r19_ev_line=$(r19_line 'bash "$evidence_script" "$pr" "$SINCE" || pub_rc=$?')
    r19_verdict_line=$(r19_line 'if [ -f /tmp/random-lab-decision.json ]; then')
    r19_pubtrue_line=$(r19_line 'if [ "$published" = "true" ]; then')
    r19_pubexit_line=$(r19_line 'Review decision file present and the decision comment is published; gate produced a verdict.')
    r19_uverdict_line=$(r19_line 'unpublished_verdict="true"')
    # Issue #637 crash parity: both the failed-outcome branch and the
    # unpublished-verdict branch must set the shared crash flag, and the
    # bounded auto-retry must be gated on exactly that flag, so a healthy
    # session that lost its verdict cannot skip the retry again.
    r19_crinit_line=$(r19_line 'crash_signature="false"')
    r19_fail_line=$(r19_line 'if [ "$outcome" != "success" ]; then')
    r19_crset_line=$(r19_line 'crash_signature="true"')
    r19_unpubl_line=$(r19_line 'if [ "$unpublished_verdict" = "true" ]; then')
    r19_crash_line=$(r19_line 'if [ "$crash_signature" = "true" ]; then')
    r19_retries_line=$(r19_line 'retries=$(gh api')
    if [ -z "$r19_ev_line" ] || [ -z "$r19_verdict_line" ] || [ "$r19_ev_line" -ge "$r19_verdict_line" ]; then
      r19_bad="${r19_bad} review.yml(evidence-not-before-verdict:${r19_ev_line:-none}/${r19_verdict_line:-none})"
    fi
    if [ -z "$r19_verdict_line" ] || [ -z "$r19_pubtrue_line" ] || [ -z "$r19_pubexit_line" ] || [ "$r19_verdict_line" -ge "$r19_pubtrue_line" ] || [ "$r19_pubtrue_line" -ge "$r19_pubexit_line" ]; then
      r19_bad="${r19_bad} review.yml(published-guard-order:${r19_verdict_line:-none}/${r19_pubtrue_line:-none}/${r19_pubexit_line:-none})"
    fi
    if [ -z "$r19_crinit_line" ] || [ -z "$r19_fail_line" ] || [ -z "$r19_crset_line" ] || [ -z "$r19_unpubl_line" ] || [ -z "$r19_crash_line" ] || [ -z "$r19_retries_line" ] \
       || [ "$r19_uverdict_line" -ge "$r19_crinit_line" ] || [ "$r19_crinit_line" -ge "$r19_fail_line" ] || [ "$r19_fail_line" -ge "$r19_crset_line" ] \
       || [ "$r19_crset_line" -ge "$r19_unpubl_line" ] || [ "$r19_unpubl_line" -ge "$r19_crash_line" ] || [ "$r19_crash_line" -ge "$r19_retries_line" ]; then
      r19_bad="${r19_bad} review.yml(crash-gate-order:${r19_uverdict_line:-none}/${r19_crinit_line:-none}/${r19_fail_line:-none}/${r19_crset_line:-none}/${r19_unpubl_line:-none}/${r19_crash_line:-none}/${r19_retries_line:-none})"
    fi
    # Exactly one unpublished-verdict branch and exactly two crash-flag
    # setters: the pre-#637 shape (a second, post-retry fail-loud branch for
    # the success case) would leave one setter and one such branch, letting
    # the success+unpublished run bypass the retry gate again.
    r19_unpub_count=$(printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -cxF 'if [ "$unpublished_verdict" = "true" ]; then' || true)
    [ "$r19_unpub_count" -eq 1 ] || r19_bad="${r19_bad} review.yml(unpublished-branch-count=${r19_unpub_count},want=1)"
    r19_crset_count=$(printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -cxF 'crash_signature="true"' || true)
    [ "$r19_crset_count" -eq 2 ] || r19_bad="${r19_bad} review.yml(crash-set-count=${r19_crset_count},want=2)"
    r19_discard_line=$(printf '%s\n' "$r19_verify_block" | grep -nF 'rm -f /tmp/random-lab-decision.json' | awk -F: -v a="$r19_pubtrue_line" -v b="$r19_fail_line" '$1 > a && $1 < b {print $1; exit}')
    [ -n "$r19_discard_line" ] || r19_bad="${r19_bad} review.yml(no-discard-between-verdict-and-retry)"
    [ "$(printf '%s\n' "$r19_verify_block" | grep -cF 'rm -f /tmp/random-lab-decision.json' || true)" -ge 3 ] || r19_bad="${r19_bad} review.yml(discard-count-lt-3)"
    # F7/F8 (review round 2): static expression pins. The sandbox substitutes
    # the identity macros (${{ github.event.issue.number }},
    # ${{ github.repository_owner }}, ${{ github.repository }}) with sandbox
    # literals, so a workflow edit that hardcodes a substituted value, binds
    # another endpoint, decorates the retry POST (e.g. a `|| true` suffix
    # makes a failed POST exit 0: the exact F1 silent-stall class), or weakens
    # the counter predicate is behaviorally invisible to property 6. Only
    # exact static pins close that gap. The retry POST is pinned as an exact
    # whole line (leading whitespace stripped), so any suffix, flag, or URL
    # change reds; the enumeration URL and the owner+startswith predicate are
    # pinned by exact substrings; the PR-number binding must be the raw event
    # expression; harness literals and CI-only env fingerprints are banned
    # outright (a branch gated on them behaves differently in the sandbox and
    # in production); and no `set +` / `trap` may disable the runner's
    # `bash -e` fail-fast the F1 fix depends on.
    printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -qxF 'gh api "repos/${{ github.repository }}/issues/$pr/comments" -f body="/oc review (auto-retry $n)"' || r19_bad="${r19_bad} review.yml(retry-post-not-exact)"
    printf '%s\n' "$r19_verify_block" | grep -qF 'repos/${{ github.repository }}/issues/$pr/comments?per_page=100" --paginate --slurp' || r19_bad="${r19_bad} review.yml(enumeration-not-thread-bound)"
    printf '%s\n' "$r19_verify_block" | grep -qF 'select(.user.login == "${{ github.repository_owner }}" and (.body | startswith("/oc review (auto-retry"))' || r19_bad="${r19_bad} review.yml(counter-predicate-weakened)"
    printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -qxF 'pr="${{ github.event.issue.number }}"' || r19_bad="${r19_bad} review.yml(pr-not-bound-to-event)"
    # F13 (review round 3): the fingerprint ban covers every ambient CI env
    # var the case environment does not set realistically. GITHUB_ACTIONS and
    # GITHUB_REPOSITORY are both set to production-shaped values in the sandbox
    # (so a branch on them is behaviorally visible), and the rest are banned
    # statically here (branching on a runner-specific value would behave
    # differently in the sandbox than on the runner).
    printf '%s\n' "$r19_verify_block" | grep -qE 'mockowner|mockrepo|R19P_|GITHUB_EVENT_PATH|GITHUB_RUN_ID|GITHUB_ACTIONS|GITHUB_REPOSITORY|GITHUB_WORKFLOW|GITHUB_JOB|GITHUB_EVENT_NAME|GITHUB_ACTOR|RUNNER_OS|(^|[^A-Za-z_])CI([^A-Za-z_]|$)' && r19_bad="${r19_bad} review.yml(harness-literal-or-env-fingerprint)"
    # F20 (review round 4): provenance invariance beyond the whole-line pins
    # above. A `GITHUB_SHA=` reassignment (e.g. to `git rev-parse HEAD`)
    # defeats the workflow-commit probe/extraction pins textually, and a
    # literal `HEAD:.github/scripts/review-comment-published.sh` path reads
    # the checked-out PR head (the very PR under review). The sandbox
    # additionally commits a poisoned tip revision (an always-published stub)
    # while GITHUB_SHA points one commit back at the real scenario-driven
    # stub, so a HEAD-reading extractor fails the unpublished and
    # unverifiable cases behaviorally, not only statically.
    printf '%s\n' "$r19_verify_block" | grep -qE '(^|[[:space:]])GITHUB_SHA=' && r19_bad="${r19_bad} review.yml(github-sha-reassignment)"
    printf '%s\n' "$r19_verify_block" | grep -qF 'HEAD:.github/scripts/review-comment-published.sh' && r19_bad="${r19_bad} review.yml(pr-head-provenance)"
    # F8/F11 (review rounds 2 and 3): no fail-fast bypass. `set +e` (quoted or
    # not) or a `trap` would disable the runner's `bash -e` baseline the retry
    # POST's fail-fast guarantee depends on.
    printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -qE "(^|[[:space:];])(set[[:space:]]+[\"']?\+|trap )" && r19_bad="${r19_bad} review.yml(fail-fast-bypass)"
    # F9 (review round 2): the missing-evidence branch is unreachable in the
    # sandbox (the stub is always committed there), so its fail-closed exit
    # must be pinned statically: an `exit 1` silently turned `exit 0` would
    # let the step report success with no verdict on record.
    r19_missing_block=$(printf '%s\n' "$r19_verify_block" | awk 'index($0, "if [ ! -s \"$evidence_script\" ]; then") {f=1} f {print} f && $0 ~ /^[[:space:]]*fi[[:space:]]*$/ {exit}')
    printf '%s\n' "$r19_missing_block" | grep -qE '^[[:space:]]*exit 1$' || r19_bad="${r19_bad} review.yml(missing-script-not-fail-closed)"
    printf '%s\n' "$r19_missing_block" | grep -qE '^[[:space:]]*exit 0$' && r19_bad="${r19_bad} review.yml(missing-script-exits-0)"
    # No forward path survives an inconclusive verify: both the infra
    # override and the decision forward carry the exact verify-success gate.
    r19_gated=$(grep -cF "if: steps.pr-info.outputs.is_pr == 'true' && always() && steps.actor_gate.outputs.run == 'true' && steps.verify-review.outcome == 'success'" "$REVIEW_WF" || true)
    [ "$r19_gated" -eq 2 ] || r19_bad="${r19_bad} review.yml(verify-gated-forward-count=${r19_gated},want=2)"
    printf '%s\n' "$(grep -A1 -F -- '- name: Force lab routing for infrastructure PRs' "$REVIEW_WF" | tail -1 | sed 's/^[[:space:]]*//')" | grep -qxF "$R19_VERDICT_GATE" || r19_bad="${r19_bad} review.yml(force-lab-step-not-gated)"
    printf '%s\n' "$(grep -A1 -F -- '- name: Forward reviewer decision' "$REVIEW_WF" | tail -1 | sed 's/^[[:space:]]*//')" | grep -qxF "$R19_VERDICT_GATE" || r19_bad="${r19_bad} review.yml(forward-step-not-gated)"
    # F21 (review round 4): the forward path and the job's step sequence are
    # pinned. The forward step must post exactly the five canonical triggers
    # (an edit such as /oc test -> /oc fix silently misroutes every approved
    # review), may carry no shell/continue-on-error/defaults override, and its
    # GH_TOKEN must stay the owner PAT (an issue_comment run spawned by a
    # github.token-authored comment never fires). The review job's step
    # sequence is pinned in order, so an extra near-forward step (which could
    # re-introduce the #616 unread-verdict forward) or a reordering reds. The
    # wanted list uses a quoted heredoc because the restore step's name
    # contains an apostrophe.
    r19_fwd_line=$(grep -nxF '      - name: Forward reviewer decision' "$REVIEW_WF" | head -1 | cut -d: -f1)
    if [ -n "$r19_fwd_line" ]; then
      r19_fwd_block=$(sed -n "${r19_fwd_line},/^      - name: /p" "$REVIEW_WF" 2>/dev/null || true)
      for r19_body in \
        'gh issue comment "$pr" --repo "${{ github.repository }}" --body "/oc test"' \
        'gh issue comment "$pr" --repo "${{ github.repository }}" --body "/oc fix"' \
        'gh issue comment "$pr" --repo "${{ github.repository }}" --body "/oc continue"' \
        'gh issue comment "$pr" --repo "${{ github.repository }}" --body "/oc lab"' \
        'gh issue comment "$pr" --repo "${{ github.repository }}" --body "/oc maintainer"'; do
        printf '%s\n' "$r19_fwd_block" | sed 's/^[[:space:]]*//' | grep -qxF "$r19_body" || r19_bad="${r19_bad} review.yml(forward-body-not-exact)"
      done
      printf '%s\n' "$r19_fwd_block" | grep -qE '^[[:space:]]*(shell|continue-on-error|defaults):' && r19_bad="${r19_bad} review.yml(forward-step-attribute-override)"
      printf '%s\n' "$r19_fwd_block" | grep -qxF '          GH_TOKEN: ${{ secrets.OPENCODE_PAT }}' || r19_bad="${r19_bad} review.yml(forward-gh-token-not-PAT)"
    else
      r19_bad="${r19_bad} review.yml(forward-step-missing)"
    fi
    r19_seq=$(awk '/^  review:$/ { f=1; next } f && /^  [A-Za-z_]+:/ { exit } f && /^      - name: / { sub(/^      - name: /, ""); print }' "$REVIEW_WF")
    r19_seq_want=$(cat <<'R19_SEQ'
Get PR info
Checkout repository (PR head)
Actor write gate (issue #428)
Skip review for non-PR issue
Record checked-out PR head
Arm workspace push detector
Configure git identity
Clear runtime decision
Restore the vendored runner when the checked-out head predates it
Run opencode reviewer
Verify review decided, else auto-retry
Restore PR head only when this run's own agent moved it
Force lab routing for infrastructure PRs
Forward reviewer decision
R19_SEQ
)
    [ "$r19_seq" = "$r19_seq_want" ] || r19_bad="${r19_bad} review.yml(step-sequence-changed)"
  fi
fi
# Functional contract test (delegation.md section 6: executable mock,
# interception asserted before any run, credentials scrubbed, sandbox
# outside the repo tree, per-case behavior from a sandbox config file, live
# non-credential Actions env set realistically so env-fingerprint detection
# cannot green a broken script). The real script must classify real payload
# shapes, including paginated slurp pages.
if [ -f "$R19_SCRIPT" ]; then
  r19_script_abs="$(pwd)/$R19_SCRIPT"
  r19_tmp=$(mktemp -d 2>/dev/null || true)
  if [ -z "$r19_tmp" ] || [ ! -d "$r19_tmp" ]; then
    r19_bad="${r19_bad} script(functional-sandbox-unavailable)"
  elif ! command -v jq >/dev/null 2>&1; then
    r19_bad="${r19_bad} script(functional-jq-missing)"
  else
    trap 'rm -rf "$r19_tmp"' EXIT
    r19_mockdir="$r19_tmp/bin"
    mkdir -p "$r19_mockdir"
    cat > "$r19_mockdir/gh" <<'R19_MOCK'
#!/usr/bin/env bash
r19_cfg="$(cd "$(dirname "$0")/.." && pwd)/case.cfg"
payload_file=""
fail_fetch="0"
# shellcheck disable=SC1090
. "$r19_cfg"
case "$*" in
  *"/comments"*)
    if [ "$fail_fetch" = "1" ]; then
      echo "mock gh: api failure" >&2
      exit 1
    fi
    cat "$payload_file"
    ;;
  *)
    echo "mock gh: unexpected call: $*" >&2
    exit 1
    ;;
esac
R19_MOCK
    chmod +x "$r19_mockdir/gh"
    if [ "$(PATH="$r19_mockdir:$PATH" command -v gh)" != "$r19_mockdir/gh" ]; then
      r19_bad="${r19_bad} script(functional-mock-not-intercepted)"
    else
      r19_since="2026-10-17T17:12:07Z"
      r19_p_footer="$r19_tmp/p-footer.json"
      cat > "$r19_p_footer" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"## Review\n\nVerified the fix.\n\n- the Reviewer\n\n[github run](https://github.com/Userfrom1995/RandomLabs/actions/runs/39057481045)"}]]
R19_PAYLOAD
      r19_p_tool="$r19_tmp/p-tool.json"
      cat > "$r19_p_tool" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"## Review\n\n- the Reviewer\n"}]]
R19_PAYLOAD
      r19_p_page2="$r19_tmp/p-page2.json"
      cat > "$r19_p_page2" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:00:00Z","body":"old note"}],[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"- the Reviewer"}]]
R19_PAYLOAD
      r19_p_trail="$r19_tmp/p-trail.json"
      cat > "$r19_p_trail" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"## Review\n\n- the Reviewer   "}]]
R19_PAYLOAD
      r19_p_incident="$r19_tmp/p-incident.json"
      cat > "$r19_p_incident" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:12:08Z","body":"APIError: The operation was aborted. (api_key_expired)"}]]
R19_PAYLOAD
      r19_p_stale="$r19_tmp/p-stale.json"
      cat > "$r19_p_stale" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T16:00:00Z","body":"## Review\n\n- the Reviewer"}]]
R19_PAYLOAD
      r19_p_owner="$r19_tmp/p-owner.json"
      cat > "$r19_p_owner" <<'R19_PAYLOAD'
[[{"user":{"login":"Userfrom1995"},"created_at":"2026-10-17T17:20:00Z","body":"## Review\n\n- the Reviewer"}]]
R19_PAYLOAD
      r19_p_inline="$r19_tmp/p-inline.json"
      cat > "$r19_p_inline" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"See the line \"- the Reviewer\" quoted above."}]]
R19_PAYLOAD
      r19_p_empty="$r19_tmp/p-empty.json"
      printf '[[]]\n' > "$r19_p_empty"
      r19_p_badjson="$r19_tmp/p-badjson.json"
      printf '{"message":"Not Found"}\n' > "$r19_p_badjson"
      r19_case() {
        r19_case_name="$1"; r19_case_want="$2"; r19_case_payload="$3"; shift 3
        {
          printf 'payload_file=%q\n' "$r19_case_payload"
          printf 'fail_fetch="0"\n'
          for r19_kv in "$@"; do printf '%s\n' "$r19_kv"; done
        } > "$r19_tmp/case.cfg"
        r19_case_out=$(cd "$r19_tmp" && env -u GITHUB_TOKEN -u GH_TOKEN -u GH_API_TOKEN \
          PATH="$r19_mockdir:$PATH" GITHUB_ACTIONS=true GITHUB_REPOSITORY="Userfrom1995/RandomLabs" \
          bash "$r19_script_abs" 614 "$r19_since" 2>&1)
        r19_case_rc=$?
        if [ "$r19_case_rc" -ne "$r19_case_want" ]; then
          r19_bad="${r19_bad} script(functional-${r19_case_name}-rc=${r19_case_rc},want=${r19_case_want})"
          printf 'R19 functional case %s failed (rc=%s, want=%s); output:\n%s\n' "$r19_case_name" "$r19_case_rc" "$r19_case_want" "$r19_case_out" >&2
        fi
      }
      r19_case published-footer 0 "$r19_p_footer"
      r19_case published-tool 0 "$r19_p_tool"
      r19_case page2-signoff 0 "$r19_p_page2"
      r19_case trailing-space 0 "$r19_p_trail"
      r19_case incident-error 1 "$r19_p_incident"
      r19_case stale 1 "$r19_p_stale"
      r19_case owner-authored 1 "$r19_p_owner"
      r19_case inline-mention 1 "$r19_p_inline"
      r19_case empty 1 "$r19_p_empty"
      r19_case bad-json 2 "$r19_p_badjson"
      r19_case fetch-failure 2 "$r19_tmp/never-read.json" 'fail_fetch="1"'
    fi
  fi
fi
# R19 property 6 (issue #637): behavioral contract test of the REAL verify
# step. Static pins constrain the shape, but the class that lost a verdict
# (success + provably unpublished, review run 39089530715 on PR #636) needs
# executable proof that the bounded auto-retry fires, so the real `run:`
# block is extracted (struct-anchored to the name line whose
# `id: verify-review` binding the static pins assert, and to the step's
# single 8-space-indent `run:` key), four expression macros plus the
# decision-file path are substituted (integrity asserted: no `${{` and no raw
# decision path may survive), and it executes under the runner's `bash -e`
# default in a sandbox git repo whose GITHUB_SHA commit carries a
# scenario-driven evidence stub (whose arguments are validated, review round
# 3 F15) and whose workspace tip is a poisoned always-published copy (review
# round 4 F20, so a HEAD-reading provenance extractor fails behaviorally),
# with an executable mock `gh` bound to the sandbox endpoint
# (repos/mockrepo/issues/614/comments; any other call fails the case) that
# serves the retry enumeration, records auto-retry posts, and can reject a
# POST under scenario control (review round 3 F11). Every scenario asserts
# exit code, posted body, decision-file state, and a required output marker,
# so the pre-#637 fail-loud-without-retry shape turns the rule red; the retry
# cap is pinned to exactly 3 (a 2-prior thread posts retry 3, a 3-prior
# thread refuses), foreign-authored or embedded (non-prefix) lookalike
# markers must never count, the #616 incident quadrant (failure + decision
# present + unpublished) discards the unpublished verdict and retries while a
# published verdict survives a failed agent step (review round 3 F12), and a
# rejected retry POST fails the step loudly (review round 3 F11). Interception
# is asserted before the matrix, credentials are scrubbed, the mock is the
# only gh in PATH, the case env carries production-shaped CI values, and the
# sandbox lives outside the repo tree (delegation.md section 6).
r19p_bash_bin=$(command -v bash 2>/dev/null || true)
r19p_env_bin=$(command -v env 2>/dev/null || true)
r19p_timeout_bin=$(command -v timeout 2>/dev/null || true)
r19p_git_bin=$(command -v git 2>/dev/null || true)
if [ -z "$r19p_bash_bin" ] || [ -z "$r19p_env_bin" ] || [ -z "$r19p_timeout_bin" ] || [ -z "$r19p_git_bin" ]; then
  r19_bad="${r19_bad} verify-behavioral(required-binary-missing)"
elif [ -f "$REVIEW_WF" ] && [ -z "$r19_name_line" ]; then
  # F5 (review round 1): the static block above already failed the name/id
  # binding; never extract a possibly-decoy block.
  r19_bad="${r19_bad} verify-behavioral(verify-step-not-locatable)"
elif [ -f "$REVIEW_WF" ]; then
  r19p_tmp=$(mktemp -d 2>/dev/null || true)
  if [ -z "$r19p_tmp" ] || [ ! -d "$r19p_tmp" ]; then
    r19_bad="${r19_bad} verify-behavioral(sandbox-unavailable)"
  else
    # Extraction (F5, F17): starts exactly at the id-bound name line, so a
    # same-name decoy elsewhere in the file can never be harvested instead of
    # the executing step, and the run key is struct-anchored at exactly the
    # 8-space step-key indent (a nested `run: |` decoy at another indent can
    # never be harvested either; the run-key-count pin in the static block
    # additionally requires it to be the only one in the step).
    r19p_run=$(awk -v start="$r19_name_line" '
      NR < start { next }
      NR == start { in_step=1; next }
      in_step && /^      - name: / { exit }
      in_step && /^        run: \|[[:space:]]*$/ { in_run=1; next }
      in_run { sub(/^          /, ""); print }
    ' "$REVIEW_WF" 2>/dev/null || true)
    r19p_block="$r19p_tmp/verify.sh"
    printf '%s\n' "$r19p_run" \
      | sed -e 's/\${{ github\.event\.issue\.number }}/614/g' \
            -e 's/\${{ github\.repository_owner }}/mockowner/g' \
            -e 's/\${{ github\.repository }}/mockrepo/g' \
            -e 's/\${{ steps\.review\.outcome }}/\${R19P_OUTCOME}/g' \
            -e 's#/tmp/random-lab-decision\.json#${R19P_DECISION}#g' > "$r19p_block"
    if [ -z "$r19p_run" ] || grep -q '\${{' "$r19p_block" 2>/dev/null \
       || grep -qF '/tmp/random-lab-decision.json' "$r19p_block" 2>/dev/null \
       || ! grep -qF 'crash_signature="true"' "$r19p_block" 2>/dev/null \
       || ! "$r19p_bash_bin" -n "$r19p_block" 2>/dev/null; then
      r19_bad="${r19_bad} verify-behavioral(extract-substitute-syntax)"
    else
      r19p_repo="$r19p_tmp/repo"
      mkdir -p "$r19p_repo/.github/scripts" "$r19p_tmp/bin" "$r19p_tmp/home" "$r19p_tmp/run"
      # F10/F13 (review rounds 2 and 3): the case environment is realistic -
      # SINCE and GITHUB_EVENT_PATH are set (the event file exists and
      # parses), GITHUB_ACTIONS and GITHUB_REPOSITORY carry production-shaped
      # values, and the other ambient CI fingerprints are sanitized - so an
      # env-fingerprint branch cannot behave differently in the sandbox than
      # on the runner; the extended ban rejects such branches statically.
      printf '{}\n' > "$r19p_tmp/run/event.json"
      # F15 (review round 3): the stub validates its arguments. The real
      # script's `$2` is the `created_at > $since` bound; a stub that ignored
      # its arguments could not see a weakened invocation (e.g. a hardcoded
      # 1970 SINCE) classify a published verdict as unpublished or vice
      # versa, so wrong arguments exit 2 (unverifiable) and fail the case.
      cat > "$r19p_repo/.github/scripts/review-comment-published.sh" <<'R19P_EVIDENCE'
#!/usr/bin/env bash
echo "R19P evidence stub: pr=$1 since=$2"
[ "$1" = "614" ] || { echo "R19P stub: unexpected pr=$1" >&2; exit 2; }
[ "$2" = "$SINCE" ] || { echo "R19P stub: unexpected since=$2" >&2; exit 2; }
exit "${R19P_EVIDENCE_RC:-1}"
R19P_EVIDENCE
      (
        cd "$r19p_repo" || exit 1
        "$r19p_git_bin" init --quiet
        "$r19p_git_bin" config user.name "R19P Sandbox"
        "$r19p_git_bin" config user.email "r19p@example.invalid"
        "$r19p_git_bin" add .github/scripts/review-comment-published.sh
        "$r19p_git_bin" commit --quiet -m "r19p sandbox stub"
        # F20 (review round 4): the workspace tip is a poisoned copy (always
        # published, exit 0), while GITHUB_SHA points one commit back at the
        # real scenario-driven stub. Production reads the workflow commit;
        # an extractor that reads HEAD (the checked-out PR head in
        # production) pulls the poisoned copy and fails the unpublished and
        # unverifiable cases behaviorally, so provenance escapes are caught
        # even when their syntax dodges the static bans.
        printf '#!/usr/bin/env bash\nexit 0\n' > "$r19p_repo/.github/scripts/review-comment-published.sh"
        "$r19p_git_bin" add .github/scripts/review-comment-published.sh
        "$r19p_git_bin" commit --quiet -m "r19p head tip (poisoned copy)"
      ) > /dev/null 2>&1
      r19p_sha=$(cd "$r19p_repo" && "$r19p_git_bin" rev-parse HEAD~1 2>/dev/null || true)
      if [ -z "$r19p_sha" ]; then
        r19_bad="${r19_bad} verify-behavioral(sandbox-commit-failed)"
      else
        cat > "$r19p_tmp/bin/gh" <<'R19P_GH'
#!/usr/bin/env bash
# R19 property 6 mock (F2, review round 1; F11, review round 3):
# endpoint-bound to the sandbox thread the substituted block must use
# (repos/mockrepo/issues/614/comments). It serves the retry-enumeration
# payload, records auto-retry posts (and can reject them under
# R19P_POST_FAIL so a swallowed failed POST is caught), and refuses any
# other call outright, so a retry posted to, or an enumeration read from,
# another endpoint is a failed case, not a false green.
case "$*" in
  *"repos/mockrepo/issues/614/comments"*"--paginate --slurp"*)
    if [ "${R19P_ENUM_FAIL:-0}" = "1" ]; then
      echo "mock gh: enumeration failure" >&2
      exit 1
    fi
    cat "$R19P_PAYLOAD"
    ;;
  *"repos/mockrepo/issues/614/comments"*"-f body="*)
    if [ "${R19P_POST_FAIL:-0}" = "1" ]; then
      echo "mock gh: post rejected" >&2
      exit 1
    fi
    printf '%s\n' "$*" >> "$R19P_POSTS"
    ;;
  *)
    echo "mock gh: unexpected call: $*" >&2
    exit 1
    ;;
esac
R19P_GH
        chmod +x "$r19p_tmp/bin/gh"
        if [ "$(PATH="$r19p_tmp/bin:$PATH" command -v gh)" != "$r19p_tmp/bin/gh" ]; then
          r19_bad="${r19_bad} verify-behavioral(mock-not-intercepted)"
        else
          printf '[[]]\n' > "$r19p_tmp/p0.json"
          printf '[[{"user":{"login":"mockowner"},"created_at":"2026-10-18T01:00:00Z","body":"/oc review (auto-retry 1)"}]]\n' > "$r19p_tmp/p1.json"
          printf '[[{"user":{"login":"mockowner"},"created_at":"2026-10-18T01:00:00Z","body":"/oc review (auto-retry 1)"},{"user":{"login":"mockowner"},"created_at":"2026-10-18T01:01:00Z","body":"/oc review (auto-retry 2)"}]]\n' > "$r19p_tmp/p2.json"
          printf '[[{"user":{"login":"mockowner"},"created_at":"2026-10-18T01:00:00Z","body":"/oc review (auto-retry 1)"},{"user":{"login":"mockowner"},"created_at":"2026-10-18T01:01:00Z","body":"/oc review (auto-retry 2)"},{"user":{"login":"mockowner"},"created_at":"2026-10-18T01:02:00Z","body":"/oc review (auto-retry 3)"}]]\n' > "$r19p_tmp/p3.json"
          # F4 (review round 1): negative controls for the retry counter's
          # author filter and marker anchor. The foreign marker is canonical
          # but authored by a non-owner; the embedded marker is owner-authored
          # but does not start with the marker. Neither may count, so the
          # expected retry stays 1 (a dropped author filter or a weakened
          # startswith, e.g. contains(), advances it to 2 and fails the case).
          printf '[[{"user":{"login":"mockintruder"},"created_at":"2026-10-18T01:00:00Z","body":"/oc review (auto-retry 1)"}]]\n' > "$r19p_tmp/p-foreign.json"
          printf '[[{"user":{"login":"mockowner"},"created_at":"2026-10-18T01:00:00Z","body":"re: /oc review (auto-retry 1)"}]]\n' > "$r19p_tmp/p-embedded.json"
          # Interception probe: the mock itself must answer and record; a
          # non-executable mock would fall through to a real gh.
          : > "$r19p_tmp/posts"
          R19P_POSTS="$r19p_tmp/posts" R19P_PAYLOAD="$r19p_tmp/p0.json" \
            "$r19p_tmp/bin/gh" api "repos/mockrepo/issues/614/comments" -f body="/oc review (auto-retry 1)" > /dev/null 2>&1 || true
          grep -qF -- "/oc review (auto-retry 1)" "$r19p_tmp/posts" 2>/dev/null || r19_bad="${r19_bad} verify-behavioral(mock-probe-failed)"
          r19p_case() {
            local name="$1" want_rc="$2" ev_rc="$3" outcome="$4" dec_before="$5" dec_after="$6" payload="$7" enum_fail="$8" want_post="$9" gate="${10}" want_re="${11:-}" post_fail="${12:-}"
            : > "$r19p_tmp/posts"
            if [ "$dec_before" = "1" ]; then
              printf '{"action":"lab"}\n' > "$r19p_tmp/decision.json"
            else
              rm -f "$r19p_tmp/decision.json"
            fi
            (
              cd "$r19p_repo" || exit 1
              exec "$r19p_timeout_bin" 30 "$r19p_env_bin" \
                -u GITHUB_TOKEN -u GH_TOKEN -u GH_API_TOKEN -u GITHUB_RUN_ID \
                -u GITHUB_WORKFLOW -u GITHUB_JOB -u GITHUB_EVENT_NAME -u GITHUB_ACTOR -u RUNNER_OS -u CI \
                GITHUB_ACTIONS="true" GITHUB_REPOSITORY="mockowner/mockrepo" \
                SINCE="2026-10-17T17:12:07Z" GITHUB_EVENT_PATH="$r19p_tmp/run/event.json" \
                PATH="$r19p_tmp/bin:$PATH" HOME="$r19p_tmp/home" TMPDIR="$r19p_tmp/run" \
                RUNNER_TEMP="$r19p_tmp/run" GITHUB_SHA="$r19p_sha" GITHUB_OUTPUT="$r19p_tmp/run/github_output" \
                AGENT_GATE="$gate" R19P_OUTCOME="$outcome" R19P_DECISION="$r19p_tmp/decision.json" \
                R19P_EVIDENCE_RC="$ev_rc" R19P_PAYLOAD="$payload" R19P_ENUM_FAIL="$enum_fail" R19P_POSTS="$r19p_tmp/posts" \
                R19P_POST_FAIL="$post_fail" \
                "$r19p_bash_bin" -e "$r19p_block"
            ) > "$r19p_tmp/out" 2>&1
            r19p_rc=$?
            if [ "$r19p_rc" -ne "$want_rc" ]; then
              r19_bad="${r19_bad} verify-behavioral(${name}:rc=${r19p_rc},want=${want_rc})"
              printf 'R19 verify behavioral case %s failed (rc=%s, want=%s); output:\n%s\n' "$name" "$r19p_rc" "$want_rc" "$(cat "$r19p_tmp/out" 2>/dev/null || true)" >&2
            fi
            if [ -n "$want_post" ]; then
              grep -qF -- "$want_post" "$r19p_tmp/posts" 2>/dev/null || r19_bad="${r19_bad} verify-behavioral(${name}:missing-post)"
              [ "$(grep -c . "$r19p_tmp/posts" 2>/dev/null || true)" = "1" ] || r19_bad="${r19_bad} verify-behavioral(${name}:post-count-not-1)"
            else
              [ ! -s "$r19p_tmp/posts" ] || r19_bad="${r19_bad} verify-behavioral(${name}:unexpected-post)"
            fi
            if [ "$dec_after" = "1" ]; then
              [ -f "$r19p_tmp/decision.json" ] || r19_bad="${r19_bad} verify-behavioral(${name}:decision-lost)"
            else
              [ ! -f "$r19p_tmp/decision.json" ] || r19_bad="${r19_bad} verify-behavioral(${name}:decision-kept)"
            fi
            if [ -n "$want_re" ] && ! grep -qE "$want_re" "$r19p_tmp/out" 2>/dev/null; then
              r19_bad="${r19_bad} verify-behavioral(${name}:missing-output)"
            fi
          }
          r19p_case published-verdict 0 0 success 1 1 "$r19p_tmp/p0.json" 0 "" true "gate produced a verdict"
          # F12 (review round 3): the outcome quadrants. The #616 incident
          # shape is exactly failure + decision present + unpublished: the
          # verdict must be discarded (never forwarded unread) and the retry
          # must fire, while a published verdict must survive a failed agent
          # step untouched.
          r19p_case failure-published-verdict 0 0 failure 1 1 "$r19p_tmp/p0.json" 0 "" true "gate produced a verdict"
          r19p_case success-unpublished 0 1 success 1 0 "$r19p_tmp/p0.json" 0 "/oc review (auto-retry 1)" true "Posting auto-retry 1"
          # F11 (review round 3): a rejected retry POST must fail the step
          # loudly (the runner's bash -e), never fall through to exit 0 with
          # the retry silently lost.
          r19p_case success-unpublished-post-fail 1 1 success 1 0 "$r19p_tmp/p0.json" 0 "" true "Posting auto-retry 1" 1
          r19p_case failure-unpublished-verdict 0 1 failure 1 0 "$r19p_tmp/p0.json" 0 "/oc review (auto-retry 1)" true "Posting auto-retry 1"
          r19p_case success-unpublished-prior 0 1 success 1 0 "$r19p_tmp/p1.json" 0 "/oc review (auto-retry 2)" true "Posting auto-retry 2"
          r19p_case success-unpublished-prior2 0 1 success 1 0 "$r19p_tmp/p2.json" 0 "/oc review (auto-retry 3)" true "Posting auto-retry 3"
          r19p_case success-unpublished-foreign-marker 0 1 success 1 0 "$r19p_tmp/p-foreign.json" 0 "/oc review (auto-retry 1)" true "Posting auto-retry 1"
          r19p_case success-unpublished-embedded-marker 0 1 success 1 0 "$r19p_tmp/p-embedded.json" 0 "/oc review (auto-retry 1)" true "Posting auto-retry 1"
          r19p_case crash-no-verdict 0 1 failure 0 0 "$r19p_tmp/p0.json" 0 "/oc review (auto-retry 1)" true "crashed mid-run"
          r19p_case cap-reached 1 1 failure 0 0 "$r19p_tmp/p3.json" 0 "" true "still dead after 4 attempts"
          r19p_case enumeration-failure 1 1 failure 0 0 "$r19p_tmp/p0.json" 1 "" true "Could not enumerate"
          r19p_case unverifiable 1 2 success 1 0 "$r19p_tmp/p0.json" 0 "" true "Could not verify"
          r19p_case success-no-decision 1 1 success 0 0 "$r19p_tmp/p0.json" 0 "" true "silent no-op"
          r19p_case gate-denial 0 1 failure 0 0 "$r19p_tmp/p0.json" 0 "" false "denial is not a crash"
        fi
      fi
    fi
    rm -rf "$r19p_tmp"
  fi
fi
if [ -f .github/agents/reviewer.md ]; then
  # Whole-line pins (review round 3 minor): substring greps are satisfiable
  # by a decoy sentence; the operative contract lines are pinned exactly.
  grep -qxF '**Publication Contract (issues #616, #637)**: the review gate only recognizes' .github/agents/reviewer.md || r19_bad="${r19_bad} reviewer.md(no-publication-contract)"
  grep -qxF 'automatically, so that final message MUST BE the complete sign-off-bearing' .github/agents/reviewer.md || r19_bad="${r19_bad} reviewer.md(no-final-message-rule)"
else
  r19_bad="${r19_bad} reviewer.md(missing)"
fi
if [ -z "$r19_bad" ]; then
  check "R19" "review forwarding requires published decision-comment evidence: the shared script accepts only a bot-authored, post-trigger, reviewer-signed comment (exit 0/1/2), the verify step extracts it from this run's own workflow commit, discards unpublished verdicts before the retry and forward paths and runs the same bounded auto-retry regardless of the agent outcome (issue #637), fails closed on inconclusive verification, both forward steps are verify-success gated, the verify step is bound to its unique id: verify-review and its single run key, the retry POST line, enumeration URL, counter predicate, PR-number binding, missing-evidence fail-closed exit, step if: line, AGENT_GATE mapping, and owner-PAT GH_TOKEN, workflow-commit provenance probe/extraction and evidence invocation as exact whole lines with GITHUB_SHA-reassignment and HEAD-provenance bans, the absence of shell/continue-on-error/defaults overrides at step, job, and workflow level, the forward step's five exact trigger bodies, PAT token, and absent attribute overrides, the review job's exact step sequence, and the absence of harness/env fingerprints and fail-fast bypasses (including quoted set +e) are pinned statically, and the real extracted verify block is executed under the runner's bash -e default in a production-shaped env (GITHUB_ACTIONS/GITHUB_REPOSITORY set, ambient CI vars sanitized) with GITHUB_SHA pointing at the good evidence stub and a poisoned workspace tip against an endpoint-bound mock gh across the published, crash/unpublished, outcome-quadrant, rejected-POST, cap/denial/lookalike matrix with an argument-validating evidence stub and the retry cap pinned to exactly 3 (issues #616, #637)" "ok"
else
  check "R19" "review-comment publication-evidence guard missing:${r19_bad} (issues #616/#637: an unread verdict can be forwarded, or a lost success+unpublished verdict can skip the bounded auto-retry)" "bad"
fi

# [R20] Paginated comment-read guard (issue #621): every retry/auto-heal cap
# and gate-count enumeration read the thread comments with an UNPAGINATED
# `gh api .../comments` call. The REST API serves 30 comments per page, oldest
# first, so on any thread past 30 comments the recent retry markers fall
# outside page 1 and the count reads 0: the cap never trips and a crash-looping
# gate re-posts retry 1 forever (live on PR #609, 34 comments, 2026-10-17;
# flagged by both #618 quality gates). A truncated page is not an API failure,
# so the existing refuse-to-retry-on-enumeration-failure guard never fires.
# The required form is the paginated slurp: a ?per_page=100 query plus
# `--paginate --slurp` piped to `jq` with the `.[][]` page iterator
# (`--slurp` cannot be combined with `--jq`; it yields an array of pages).
# Properties:
#   1. every enumeration site in the cohort carries the exact paginated form
#      (per_page=100, --paginate --slurp, piped jq, no --jq flag);
#   2. no unpaginated issue-comment read remains in any workflow file (a
#      workflow-tree discovery scan, so a new read cannot regress silently);
#   3. a functional harness executes EVERY real extracted enumeration pipeline
#      against an executable mock `gh` bound to a 3-page slurp payload whose
#      markers sit on page 3 (34-comment thread shape, past the old
#      30-comment page boundary): each counter must read 3 (the cap trips) and
#      the freshness read must select the newest page-3 timestamp. The mock
#      refuses an unpaginated call, and interception is asserted first
#      (delegation.md section 6 harness isolation).
r20_bad=""
r20_files=".github/workflows/opencode.yml .github/workflows/opencode-review.yml .github/workflows/curator.yml .github/workflows/ideate.yml .github/workflows/opencode-eval.yml"
r20_found=""
# Real cohort extraction: the assignment line through the line that closes the
# command substitution, for every known enumeration variable. The old
# unpaginated `--jq` form in a workflow file is mutated by the verification
# matrix and must turn this rule red.
r20_snips_of() {
  awk '
    /^[ \t]*(retries|heals|recent|approval_comments)[=][$][(]gh api/ {
      buf = $0 "\n"
      if ($0 ~ /\|\|[ \t]*(true|echo)/) { printf "%s%c", buf, 0; buf=""; next }
      collecting = 1; next
    }
    collecting {
      buf = buf $0 "\n"
      if ($0 ~ /\|\|[ \t]*(true|echo)/) { printf "%s%c", buf, 0; collecting = 0; buf="" }
    }
  ' "$1" 2>/dev/null || true
}
for r20_file in $r20_files; do
  if [ ! -f "$r20_file" ]; then
    r20_bad="${r20_bad} ${r20_file}(missing)"
    continue
  fi
  while IFS= read -r -d '' r20_snip; do
    [ -n "$r20_snip" ] || continue
    r20_marker=$(printf '%s\n' "$r20_snip" | grep -oE '(startswith|contains)\("[^"]+"' | head -1 | sed -E 's/^(startswith|contains)\("//; s/"$//')
    if [ -z "$r20_marker" ]; then
      r20_bad="${r20_bad} ${r20_file}(enumeration-without-recognizable-marker)"
      continue
    fi
    r20_found="${r20_found}${r20_file}|${r20_marker}
"
    printf '%s\n' "$r20_snip" | grep -q '?per_page=100' || r20_bad="${r20_bad} ${r20_file}(${r20_marker}:no-per_page-100)"
    printf '%s\n' "$r20_snip" | grep -q -- '--paginate --slurp' || r20_bad="${r20_bad} ${r20_file}(${r20_marker}:no-paginate-slurp)"
    printf '%s\n' "$r20_snip" | grep -q -- '--jq' && r20_bad="${r20_bad} ${r20_file}(${r20_marker}:jq-flag-cannot-combine-with-slurp)"
    printf '%s\n' "$r20_snip" | grep -qE '\|[[:space:]]*jq ' || r20_bad="${r20_bad} ${r20_file}(${r20_marker}:no-piped-jq)"
    printf '%s\n' "$r20_snip" | grep -qF '.[][]' || r20_bad="${r20_bad} ${r20_file}(${r20_marker}:no-page-iterator)"
  done < <(r20_snips_of "$r20_file")
done
# Expected-site registry: every retry/auto-heal/gate enumeration must be
# present. Deleting a counter or renaming its marker trips the rule.
while IFS='|' read -r r20_ef r20_em; do
  [ -n "$r20_ef" ] || continue
  printf '%s\n' "$r20_found" | grep -qxF "${r20_ef}|${r20_em}" || r20_bad="${r20_bad} ${r20_ef}(missing-enumeration:${r20_em})"
done <<'R20_EXPECTED'
.github/workflows/opencode.yml|/oc research (auto-retry
.github/workflows/opencode.yml|/oc architect (auto-retry
.github/workflows/opencode.yml|/oc build this (auto-retry
.github/workflows/opencode.yml|/oc continue (auto-heal
.github/workflows/opencode.yml|/oc fix (auto-retry
.github/workflows/opencode.yml|/oc design (auto-retry
.github/workflows/opencode.yml|/oc design-ux (auto-retry
.github/workflows/opencode.yml|/oc design-visual (auto-retry
.github/workflows/opencode.yml|/oc design-motion (auto-retry
.github/workflows/opencode-review.yml|/oc review (auto-retry
.github/workflows/curator.yml|/oc curate (auto-retry
.github/workflows/ideate.yml|### Candidate:
.github/workflows/opencode-eval.yml|/oc approve-test
R20_EXPECTED
# Repo-wide discovery backstop: any issue-comment read that neither paginates
# nor targets a single comment trips, so a new workflow cannot silently
# regress. Posting calls (`-f body`) and the single-comment PATCH endpoint
# (`.../issues/comments/<id>`) are out of class by construction.
r20_unpaginated=$(grep -rnE 'gh api "[^"]*/comments"' .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null | grep -vE -- '--paginate|\?per_page=100' | grep -v -- '-f body' || true)
if [ -n "$r20_unpaginated" ]; then
  r20_bad="${r20_bad} unpaginated-read(s):$(printf '%s' "$r20_unpaginated" | head -3 | tr '\n' ' ')"
fi
# Functional harness: the real extracted pipelines against a mock gh that
# emits a 3-page slurp array and refuses any unpaginated call. The payload
# mirrors PR #609 (30 comments on page 1, 1 filler on page 2, 3 retry markers
# on page 3 = 34 comments): an unpaginated read sees page 1 only, so the mock
# refusal and the count assertion together prove the cap now trips.
if ! command -v jq >/dev/null 2>&1; then
  r20_bad="${r20_bad} harness(jq-missing)"
else
  r20_tmp=$(mktemp -d 2>/dev/null || true)
  if [ -z "$r20_tmp" ] || [ ! -d "$r20_tmp" ]; then
    r20_bad="${r20_bad} harness(sandbox-unavailable)"
  else
    r20_mockdir="$r20_tmp/bin"
    mkdir -p "$r20_mockdir"
    cat > "$r20_mockdir/gh" <<'R20_MOCK'
#!/usr/bin/env bash
case "$*" in
  *--slurp*) cat "$R20_PAYLOAD" ;;
  *) echo "mock gh: unpaginated comment read refused: $*" >&2; exit 1 ;;
esac
R20_MOCK
    chmod +x "$r20_mockdir/gh"
    if [ "$(PATH="$r20_mockdir:$PATH" command -v gh)" != "$r20_mockdir/gh" ]; then
      r20_bad="${r20_bad} harness(mock-not-intercepted)"
    else
      r20_case=0
      for r20_file in $r20_files; do
        [ -f "$r20_file" ] || continue
        while IFS= read -r -d '' r20_snip; do
          [ -n "$r20_snip" ] || continue
          r20_case=$((r20_case + 1))
          r20_marker=$(printf '%s\n' "$r20_snip" | grep -oE '(startswith|contains)\("[^"]+"' | head -1 | sed -E 's/^(startswith|contains)\("//; s/"$//')
          r20_login="mockowner"
          if printf '%s\n' "$r20_snip" | grep -qF 'github-actions[bot]'; then
            r20_login='github-actions[bot]'
          fi
          r20_payload_file="$r20_tmp/payload-$r20_case.json"
          jq -n --arg login "$r20_login" --arg marker "$r20_marker" '
            [ [range(30) | {user:{login:"filler"},created_at:"2026-10-16T00:00:00Z",body:"filler"}],
              [{user:{login:"filler"},created_at:"2026-10-16T00:00:01Z",body:"filler"}],
              [ {user:{login:$login},created_at:"2026-10-17T19:00:00Z",body:($marker + " 1)")},
                {user:{login:$login},created_at:"2026-10-17T19:01:00Z",body:($marker + " 2)")},
                {user:{login:$login},created_at:"2026-10-17T19:02:00Z",body:($marker + " 3)")} ] ]
          ' > "$r20_payload_file" 2>/dev/null
          {
            printf 'target=609 issue=609 pr=609 issue_num=609 board=609\n'
            printf '%s\n' "$r20_snip" \
              | sed -e 's/\${{ github\.repository_owner }}/mockowner/g' \
                    -e 's/\${{ github\.repository }}/mockrepo/g' \
                    -e 's/\${{ [^}]* }}/1/g'
            r20_var=$(printf '%s\n' "$r20_snip" | sed -n '1s/^[[:space:]]*\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p')
            printf 'printf "%%s" "$%s"\n' "$r20_var"
          } > "$r20_tmp/case.sh"
          r20_out=$(cd "$r20_tmp" && env -u GITHUB_TOKEN -u GITHUB_EVENT_PATH -u GITHUB_RUN_ID \
            -u GITHUB_REPOSITORY -u GITHUB_ACTIONS -u GH_TOKEN -u GH_API_TOKEN \
            PATH="$r20_mockdir:$PATH" R20_PAYLOAD="$r20_payload_file" bash "$r20_tmp/case.sh" 2>/dev/null)
          if printf '%s\n' "$r20_snip" | grep -q '| length'; then
            [ "$r20_out" = "3" ] || r20_bad="${r20_bad} harness(${r20_file}:${r20_marker}:count=${r20_out:-empty},want=3)"
          else
            [ "$(printf '%s' "$r20_out" | tr -d '"')" = "2026-10-17T19:02:00Z" ] || r20_bad="${r20_bad} harness(${r20_file}:${r20_marker}:latest=${r20_out:-empty},want=2026-10-17T19:02:00Z)"
          fi
        done < <(r20_snips_of "$r20_file")
      done
    fi
    rm -rf "$r20_tmp"
  fi
fi
if [ -z "$r20_bad" ]; then
  check "R20" "every retry/auto-heal and gate-count enumeration uses the paginated slurp form and the 3-page harness proves markers on page 3 are counted (cap trips); no unpaginated issue-comment read remains (issue #621)" "ok"
else
  check "R20" "paginated comment-read guard missing:${r20_bad} (issue #621: an unpaginated read sees only the oldest 30 comments, the cap reads 0, and a crash loop re-posts retry 1 forever)" "bad"
fi
# [R21] PAT merge approval binding (issue #619): the sweep's approval
# detection was an unanchored substring match over every github-actions[bot]
# comment (.body | contains("/oc approve-test")), so a Maintainer decisions
# summary that merely QUOTED the tester marker while describing another PR
# counted as this PR's verdict: the sweep merged workflow-touching #618 at
# 18:55:19Z with no review verdict and no read-only test (maintainer run
# 39059718673, matched comment 6239004626 at 18:55:04Z, while #618's first
# verdicts only arrived later: review 19:00:08Z, read-only test 19:08:19Z),
# and a third time at 19:38:31Z when a tester-marker quote inside maintainer
# run 39062904001's own summary comment (6239740609, 11 seconds earlier)
# merged #624 with zero verdicts on record. The same run then skipped the
# genuinely approved #609 as mergeable=UNKNOWN, because GitHub recomputes
# mergeability right after the sweep itself advanced main (post-merge
# recompute race). Anchoring alone is not enough: #609's genuine 18:50:48Z
# verdict is head-stale after its rebase, and an anchored-but-unbound match
# would merge the rebased head before its fresh read-only round. Properties:
#   1. the verdict predicate is anchored to the verdict SHAPE: the marker
#      must be the comment's entire first line, optionally backticked, and
#      the unanchored contains() form is banned from the sweep;
#   2. head-binding is mandatory: the verdict must not predate the head's
#      last push (the later of the head commits' committer dates and any
#      head_ref_force_pushed timeline event), computed before the check and
#      failing closed when the time cannot be established;
#   3. mergeable=UNKNOWN is re-queried a bounded number of times instead of
#      skipping on the first read;
#   4. a functional harness extracts the real predicate (from the single
#      live assignment line only: commented-out predicates are never
#      executed and a second live assignment is rejected) and the real
#      head-binding decision block from maintainer.yml and executes them
#      against genuine and hostile payloads (quoted mentions mid-prose and
#      on their own line, owner-authored, trailing prose, stale/force-push/
#      missing head times) with no network access, asserting the exact
#      verdict timestamp each genuine case returns and pinning both
#      head-time sort|tail reductions so a min-reducer swap cannot pass.
# Review-gated residual boundary: the surrounding sweep control flow is
# still review-gated, but every property above is pinned by exact fragments,
# ordering checks, and executable behavior. Honest limit: committer dates
# are author-settable and only force-push events carry a true push
# timestamp, so a fast-forward push of commits with forged older dates after
# a verdict would not stale it; the lab's bot pushes create fresh-dated
# commits, so this is outside the bot trust model.
r21_bad=""
if [ ! -f "$MAIN_WF" ]; then
  r21_bad=" maintainer.yml(missing)"
else
  r21_pat_block=$(sed -n '/- name: PAT-backed merge for approved workflow-touching PRs/,/^      - name: /p' "$MAIN_WF" 2>/dev/null || true)
  if [ -z "$r21_pat_block" ]; then
    r21_bad="${r21_bad} maintainer.yml(pat-merge-step-missing-or-renamed)"
  else
    # 1. Shape-anchored verdict predicate present verbatim; the unanchored
    #    contains() form is banned.
    r21_approve_line=$(printf '%s\n' "$r21_pat_block" | sed 's/^[[:space:]]*//' | grep -vE '^#' | grep -F 'approve_test_time=$(echo "$comments" | jq -r ' | head -1 || true)
    [ "$(printf '%s\n' "$r21_pat_block" | grep -cF 'approve_test_time=$(echo "$comments" | jq -r ')" -eq 1 ] || r21_bad="${r21_bad} maintainer.yml(verdict-predicate-not-single-live-assignment)"
    printf '%s\n' "$r21_approve_line" | grep -qF 'select(.user.login=="github-actions[bot]"' || r21_bad="${r21_bad} maintainer.yml(verdict-predicate-no-bot-author)"
    printf '%s\n' "$r21_approve_line" | grep -qF '(.body|split("\n")[0]|test("^`?/oc approve-test`?[[:space:]]*$"))' || r21_bad="${r21_bad} maintainer.yml(verdict-predicate-not-shape-anchored)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'contains("/oc approve-test")' && r21_bad="${r21_bad} maintainer.yml(unanchored-approve-test-contains)"
    # 2. Head-binding: both head-time sources, the max reducer, the
    #    fail-closed guard, and the stale-verdict check, ordered after the
    #    verdict read and before any merge action.
    printf '%s\n' "$r21_pat_block" | grep -qF 'head_commit_time=$(gh api "repos/${{ github.repository }}/pulls/$pr/commits?per_page=100"' || r21_bad="${r21_bad} maintainer.yml(no-head-commit-time-fetch)"
    printf '%s\n' "$r21_pat_block" | grep -qF -- "--jq '.[].commit.committer.date'" || r21_bad="${r21_bad} maintainer.yml(no-head-commit-date-field)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'head_force_push_time=$(gh api "repos/${{ github.repository }}/issues/$pr/timeline?per_page=100"' || r21_bad="${r21_bad} maintainer.yml(no-head-force-push-time-fetch)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'select(.event=="head_ref_force_pushed")' || r21_bad="${r21_bad} maintainer.yml(no-force-push-event-select)"
    printf '%s\n' "$r21_pat_block" | grep -qF '[ -z "$head_push_time" ] || [ "$candidate" \> "$head_push_time" ]' || r21_bad="${r21_bad} maintainer.yml(no-head-time-max-reducer)"
    [ "$(printf '%s\n' "$r21_pat_block" | grep -cF 'sort | tail -1')" -eq 2 ] || r21_bad="${r21_bad} maintainer.yml(head-time-reduction-not-pinned)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'if [ -z "$head_push_time" ]; then' || r21_bad="${r21_bad} maintainer.yml(no-head-time-fail-closed)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'if [ "$approve_test_time" \< "$head_push_time" ]; then' || r21_bad="${r21_bad} maintainer.yml(no-stale-verdict-check)"
    r21_line() { printf '%s\n' "$r21_pat_block" | grep -nF -- "$1" | head -1 | cut -d: -f1; }
    r21_approve_ln=$(r21_line 'approve_test_time=$(echo "$comments" | jq -r ')
    r21_commit_ln=$(r21_line 'head_commit_time=$(gh api "repos/${{ github.repository }}/pulls/$pr/commits?per_page=100"')
    r21_reducer_ln=$(r21_line 'head_push_time=""')
    r21_stale_ln=$(r21_line 'if [ "$approve_test_time" \< "$head_push_time" ]; then')
    if [ -z "$r21_approve_ln" ] || [ -z "$r21_reducer_ln" ] || [ "$r21_approve_ln" -ge "$r21_reducer_ln" ]; then
      r21_bad="${r21_bad} maintainer.yml(verdict-not-before-head-binding:${r21_approve_ln:-none}/${r21_reducer_ln:-none})"
    fi
    if [ -z "$r21_commit_ln" ] || [ -z "$r21_stale_ln" ] || [ "$r21_commit_ln" -ge "$r21_stale_ln" ]; then
      r21_bad="${r21_bad} maintainer.yml(head-time-not-before-stale-check:${r21_commit_ln:-none}/${r21_stale_ln:-none})"
    fi
    # 3. Bounded UNKNOWN re-query before the mergeability gate.
    printf '%s\n' "$r21_pat_block" | grep -qF 'for _ in 1 2 3 4 5 6; do' || r21_bad="${r21_bad} maintainer.yml(no-bounded-mergeable-requery-loop)"
    printf '%s\n' "$r21_pat_block" | grep -qF '[ "$mergeable" = "UNKNOWN" ] || break' || r21_bad="${r21_bad} maintainer.yml(no-mergeable-unknown-requery)"
    printf '%s\n' "$r21_pat_block" | grep -qE '^[[:space:]]*sleep [0-9]+$' || r21_bad="${r21_bad} maintainer.yml(no-requery-backoff)"
    r21_mergeable_reads=$(printf '%s\n' "$r21_pat_block" | grep -cF -- '--json mergeable' || true)
    [ "$r21_mergeable_reads" -ge 2 ] || r21_bad="${r21_bad} maintainer.yml(mergeable-reads=${r21_mergeable_reads},want>=2)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'if [ "$mergeable" != "MERGEABLE" ]; then' || r21_bad="${r21_bad} maintainer.yml(no-non-mergeable-skip)"
    # 4. Functional harness: extract the REAL predicate and the REAL decision
    #    block from maintainer.yml and execute them (no network access; the
    #    sandbox under mktemp -d is removed before the rule reports).
    if ! command -v jq >/dev/null 2>&1; then
      r21_bad="${r21_bad} maintainer.yml(functional-jq-missing)"
    elif [ -z "$r21_approve_line" ]; then
      r21_bad="${r21_bad} maintainer.yml(functional-predicate-missing)"
    else
      r21_tmp=$(mktemp -d 2>/dev/null || true)
      if [ -z "$r21_tmp" ] || [ ! -d "$r21_tmp" ]; then
        r21_bad="${r21_bad} maintainer.yml(functional-sandbox-unavailable)"
      else
        r21_start="jq -r '"
        r21_end="' 2>/dev/null"
        r21_jq="${r21_approve_line#*${r21_start}}"
        r21_jq="${r21_jq%%${r21_end}*}"
        r21_decide_block=$(printf '%s\n' "$r21_pat_block" | awk '
          /^[[:space:]]*head_push_time=""/ { f=1 }
          f { print }
          f && /predates the last head push/ { g=1 }
          g && /^[[:space:]]*fi[[:space:]]*$/ { exit }')
        if [ -z "$r21_jq" ] || [ "$r21_jq" = "$r21_approve_line" ]; then
          r21_bad="${r21_bad} maintainer.yml(functional-predicate-extraction)"
        else
          r21_pred_case() {
            r21_case_name="$1"; r21_case_want="$2"; r21_case_payload="$3"; r21_case_expect="${4:-}"
            r21_case_out=$(printf '%s' "$r21_case_payload" | jq -r "$r21_jq" 2>/dev/null || true)
            if [ "$r21_case_want" = "match" ]; then
              if [ -z "$r21_case_out" ]; then
                r21_bad="${r21_bad} maintainer.yml(functional-${r21_case_name}-no-match)"
              elif [ "$r21_case_out" != "$r21_case_expect" ]; then
                r21_bad="${r21_bad} maintainer.yml(functional-${r21_case_name}-wrong-timestamp)"
              fi
            elif [ "$r21_case_want" = "none" ] && [ -n "$r21_case_out" ]; then
              r21_bad="${r21_bad} maintainer.yml(functional-${r21_case_name}-false-match)"
            fi
          }
          r21_pred_case genuine-backticked match '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:50:48Z","body":"`/oc approve-test`\n\nInfrastructure PR #609 at `88cd5bc9`"}]' 2026-10-17T18:50:48Z
          r21_pred_case genuine-plain match '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T19:00:28Z","body":"/oc approve-test\nAll checks passed."}]' 2026-10-17T19:00:28Z
          r21_pred_case newest-genuine-wins match '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:50:48Z","body":"/oc approve-test\nfirst read-only round"},{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T19:08:19Z","body":"`/oc approve-test`\nsecond read-only round"}]' 2026-10-17T19:08:19Z
          r21_pred_case quoted-mid-prose none '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:55:04Z","body":"#609 cleared the read-only infra test (`/oc approve-test` 18:50:48Z)."}]' ''
          r21_pred_case quoted-own-line none '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:55:04Z","body":"Status:\n- `/oc approve-test` 18:50:48Z on #609"}]' ''
          r21_pred_case owner-authored none '[{"user":{"login":"Userfrom1995"},"created_at":"2026-10-17T18:50:48Z","body":"`/oc approve-test`"}]' ''
          r21_pred_case trailing-prose none '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:50:48Z","body":"`/oc approve-test` for PR #609"}]' ''
        fi
        if [ -z "$r21_decide_block" ]; then
          r21_bad="${r21_bad} maintainer.yml(functional-decision-block-extraction)"
        else
          r21_head_case() {
            r21_hc_name="$1"; r21_hc_hct="$2"; r21_hc_hfpt="$3"; r21_hc_att="$4"; r21_hc_want="$5"
            r21_skipped=0
            pr="1"
            head_commit_time="$r21_hc_hct"
            head_force_push_time="$r21_hc_hfpt"
            approve_test_time="$r21_hc_att"
            r21_body=$(printf '%s\n' "$r21_decide_block" | sed 's/^[[:space:]]*continue[[:space:]]*$/r21_skipped=1/')
            eval "$r21_body" >/dev/null 2>&1 || true
            if [ "$r21_skipped" != "$r21_hc_want" ]; then
              r21_bad="${r21_bad} maintainer.yml(functional-head-${r21_hc_name}-skip=${r21_skipped},want=${r21_hc_want})"
            fi
          }
          r21_head_case fresh 2026-10-17T18:00:00Z "" 2026-10-17T18:05:00Z 0
          r21_head_case stale-commit 2026-10-17T18:00:00Z "" 2026-10-17T17:55:00Z 1
          r21_head_case stale-force-push 2026-10-17T18:00:00Z 2026-10-17T18:06:00Z 2026-10-17T18:05:00Z 1
          r21_head_case force-push-before-verdict 2026-10-17T18:00:00Z 2026-10-17T17:50:00Z 2026-10-17T18:05:00Z 0
          r21_head_case no-head-time "" "" 2026-10-17T18:05:00Z 1
          r21_head_case same-second 2026-10-17T18:05:00Z "" 2026-10-17T18:05:00Z 0
        fi
        rm -rf "$r21_tmp"
      fi
    fi
  fi
fi
if [ -z "$r21_bad" ]; then
  check "R21" "PAT merge approval is shape-anchored and head-bound: the verdict marker must be the comment's entire first line (optionally backticked), the verdict must not predate the head's last push (commit committer dates plus head_ref_force_pushed events, fail closed when unavailable), and mergeable=UNKNOWN is re-queried a bounded number of times, all pinned by the extracted single-live-assignment predicate with exact returned timestamps, the extracted-decision functional cases, and both head-time max-reductions (issue #619)" "ok"
else
  check "R21" "PAT merge approval-binding guard missing:${r21_bad} (issue #619: an unanchored contains() match merged an unreviewed workflow PR off a quoted marker, and the approved lane stalled on mergeable=UNKNOWN)" "bad"
fi

# [R22] Tester verdict publication and canonical marker (issue #629): the PAT
# merge sweep recognizes a tester verdict only when the `/oc approve-test`
# marker is the ENTIRE first line of a github-actions[bot] comment (R21,
# issue #619), but nothing machine-checked the publication shape on the
# publisher side: the Tester's published report is prose-first in practice
# (PR #628 comment 6240760500 opened "All green. Posting the decision
# comment." with the marker on line 3; #614's read-only verdict 6240507941
# had the same shape), the test verify step looked only at the decision file,
# and the run concluded green while the sweep would skip the lane forever -
# and no App-token merge path exists for `.github/workflows/*` PRs. Two
# properties close the class:
#   1. positive publication evidence before any maintainer decision proceeds:
#      a github-actions[bot] comment created after the triggering comment
#      whose body carries the `- the Tester` sign-off line, checked by
#      .github/scripts/test-comment-published.sh (exit 0 published / 1 not
#      published / 2 unverifiable), read from this run's own workflow commit,
#      never the checked-out PR head; a missing or unpublished report is
#      discarded and the run fails closed (no forward), so the crash-parity
#      triage re-dispatches a fresh /oc test;
#   2. the canonical marker is published BY THE WORKFLOW from the machine
#      handoff (decision file plus live-run evidence): the new
#      .github/scripts/publish-tester-marker.sh posts a bot-authored comment
#      whose first line is exactly `/oc approve-test` (github.token, never
#      the owner PAT), re-fetches it by id, and verifies bot authorship and
#      the exact first line before the /oc maintainer handoff; no marker is
#      ever published for a non-maintainer decision or a scope=unrunnable
#      escalation, so the shape is guaranteed by construction instead of
#      depending on agent prose formatting (and never forged: the marker only
#      exists behind the decision file, the evidence gate, and the published
#      signed report).
# Review-gated residual boundary (same as R17/R19): the two workflow steps'
# own control flow cannot be executed by a static audit, so an arbitrary
# reshuffle that still passes every exact-form and ordering pin below is
# caught by the review gate, not by this rule; the script-level behavior is
# functionally executed instead.
r22_bad=""
R22_WF=".github/workflows/opencode-test.yml"
R22_CHECKER=".github/scripts/test-comment-published.sh"
R22_PUBLISHER=".github/scripts/publish-tester-marker.sh"
if [ ! -f "$R22_CHECKER" ]; then
  r22_bad="${r22_bad} test-comment-published.sh(missing)"
else
  bash -n "$R22_CHECKER" 2>/dev/null || r22_bad="${r22_bad} checker(syntax)"
  [ -x "$R22_CHECKER" ] || r22_bad="${r22_bad} checker(not-executable)"
  # Exact evidence predicate: bot author + created after the trigger + a real
  # tester sign-off line. Weakening or removing any filter must trip the rule.
  sed 's/^[[:space:]]*//' "$R22_CHECKER" | grep -qxF '| select(.user.login == "github-actions[bot]")' || r22_bad="${r22_bad} checker(no-bot-author-select)"
  sed 's/^[[:space:]]*//' "$R22_CHECKER" | grep -qxF '| select(.created_at > $since)' || r22_bad="${r22_bad} checker(no-since-filter)"
  sed 's/^[[:space:]]*//' "$R22_CHECKER" | grep -qxF '| select(.body | test("(?m)^- the Tester[ \t]*$"))' || r22_bad="${r22_bad} checker(no-signoff-regex)"
  # Paginated, slurped fetch (a single unpaginated page would miss the
  # decision comment on busy threads and silently read as unpublished; R20).
  sed 's/^[[:space:]]*//' "$R22_CHECKER" | grep -qxF 'payload=$(gh api "repos/${REPO}/issues/${PR}/comments?per_page=100" --paginate --slurp 2>/dev/null) || {' || r22_bad="${r22_bad} checker(no-paginated-slurp-fetch)"
  # Exit-code contract: exactly one published exit 0 and one not-published
  # exit 1; every failure path exits 2. An added silent `exit 0` (e.g. in
  # front of the fetch guard) or a weakened failure exit trips the counts.
  r22_exit0=$(sed 's/^[[:space:]]*//' "$R22_CHECKER" | grep -cxF 'exit 0' || true)
  r22_exit1=$(sed 's/^[[:space:]]*//' "$R22_CHECKER" | grep -cxF 'exit 1' || true)
  r22_exit2=$(sed 's/^[[:space:]]*//' "$R22_CHECKER" | grep -cxF 'exit 2' || true)
  [ "$r22_exit0" -eq 1 ] || r22_bad="${r22_bad} checker(exit0-count=${r22_exit0},want=1)"
  [ "$r22_exit1" -eq 1 ] || r22_bad="${r22_bad} checker(exit1-count=${r22_exit1},want=1)"
  [ "$r22_exit2" -ge 4 ] || r22_bad="${r22_bad} checker(exit2-count=${r22_exit2},want>=4)"
  # Harness-detection bans (the functional test runs with realistic values).
  grep -qF 'GITHUB_ACTIONS' "$R22_CHECKER" && r22_bad="${r22_bad} checker(references-GITHUB_ACTIONS)"
  grep -qF 'MOCK_' "$R22_CHECKER" && r22_bad="${r22_bad} checker(references-MOCK)"
  grep -qF 'Userfrom1995' "$R22_CHECKER" && r22_bad="${r22_bad} checker(hardcodes-repo-slug)"
  grep -qF 'RandomLabs/' "$R22_CHECKER" && r22_bad="${r22_bad} checker(hardcodes-repo-slug)"
fi
if [ ! -f "$R22_PUBLISHER" ]; then
  r22_bad="${r22_bad} publish-tester-marker.sh(missing)"
else
  bash -n "$R22_PUBLISHER" 2>/dev/null || r22_bad="${r22_bad} publisher(syntax)"
  [ -x "$R22_PUBLISHER" ] || r22_bad="${r22_bad} publisher(not-executable)"
  # The canonical body is built around the literal marker first line, and the
  # re-fetch check requires that exact first line back from the API.
  grep -qF "'/oc approve-test'" "$R22_PUBLISHER" || r22_bad="${r22_bad} publisher(no-marker-literal)"
  grep -qF '"$fetched_first" != "/oc approve-test"' "$R22_PUBLISHER" || r22_bad="${r22_bad} publisher(no-post-fetch-first-line-check)"
  # Bot authorship is re-verified after the post (a PAT-posted marker would
  # never match the sweep's R21 predicate).
  grep -qF 'if [ "$author" != "github-actions[bot]" ]; then' "$R22_PUBLISHER" || r22_bad="${r22_bad} publisher(no-bot-author-check)"
  grep -qF 'issues/comments/${comment_id}' "$R22_PUBLISHER" || r22_bad="${r22_bad} publisher(no-re-fetch-verification)"
  grep -qF 'Verified bot-authored tester approval marker' "$R22_PUBLISHER" || r22_bad="${r22_bad} publisher(no-verified-terminal-marker)"
  grep -qF "''|*[!0-9]*)" "$R22_PUBLISHER" || r22_bad="${r22_bad} publisher(no-numeric-target-guard)"
  grep -qF 'if [ -z "$repo" ]; then' "$R22_PUBLISHER" || r22_bad="${r22_bad} publisher(no-repo-guard)"
  grep -qF 'if [ -z "$comment_id" ]; then' "$R22_PUBLISHER" || r22_bad="${r22_bad} publisher(no-comment-id-guard)"
  grep -qF 'GITHUB_ACTIONS' "$R22_PUBLISHER" && r22_bad="${r22_bad} publisher(references-GITHUB_ACTIONS)"
  grep -qF 'MOCK_' "$R22_PUBLISHER" && r22_bad="${r22_bad} publisher(references-MOCK)"
  grep -qF 'Userfrom1995' "$R22_PUBLISHER" && r22_bad="${r22_bad} publisher(hardcodes-repo-slug)"
  grep -qF 'RandomLabs/' "$R22_PUBLISHER" && r22_bad="${r22_bad} publisher(hardcodes-repo-slug)"
  # Structural assertions: the literal greps above can be satisfied by
  # weakened or no-op code, so require each guard to be the exact uncommented
  # `if ...; then` line whose own failure block (up to its closing `fi`, with
  # no nested control flow) ends in a real `exit 1`.
  r22_guard_block_has_exit() {
    sed 's/^[[:space:]]*//' "$1" | awk -v p="$2" '
      $0 == p { inblk=1; next }
      inblk && $0 ~ /^(if|while|for|case|until)[[:space:]]/ { nested=1 }
      inblk && $0 ~ /^[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\(\)[[:space:]]*\{/ { nested=1 }
      inblk && $0 == "exit 1" { found=1 }
      inblk && $0 == "fi" { closed=1; inblk=0 }
      END { exit((found && closed && !nested) ? 0 : 1) }'
  }
  for r22_guard in \
    'repo-guard:if [ -z "$repo" ]; then' \
    'comment-id:if [ -z "$comment_id" ]; then' \
    'bot-author:if [ "$author" != "github-actions[bot]" ]; then' \
    'first-line:if [ "$fetched_first" != "/oc approve-test" ]; then'; do
    r22_guard_name="${r22_guard%%:*}"
    r22_guard_line="${r22_guard#*:}"
    sed 's/^[[:space:]]*//' "$R22_PUBLISHER" | grep -qxF -- "$r22_guard_line" || r22_bad="${r22_bad} publisher(${r22_guard_name}-guard-not-exact)"
    r22_guard_block_has_exit "$R22_PUBLISHER" "$r22_guard_line" || r22_bad="${r22_bad} publisher(${r22_guard_name}-guard-block-has-no-exit-1)"
  done
fi
if [ ! -f "$R22_WF" ]; then
  r22_bad="${r22_bad} opencode-test.yml(missing)"
else
  r22_pub_block=$(sed -n '/- name: Verify tester decision published, else fail closed/,/^      - name: /p' "$R22_WF" 2>/dev/null || true)
  r22_marker_block=$(sed -n '/- name: Publish tester approval marker (bot-authored)/,/^      - name: /p' "$R22_WF" 2>/dev/null || true)
  r22_fwd_block=$(sed -n '/- name: Forward tester decision/,/^      - name: /p' "$R22_WF" 2>/dev/null || true)
  if [ -z "$r22_pub_block" ] || [ -z "$r22_marker_block" ] || [ -z "$r22_fwd_block" ]; then
    r22_bad="${r22_bad} test.yml(publication-steps-missing-or-renamed)"
  else
    # Publication-gate step: exact gate, env-indirected trigger timestamp,
    # workflow-commit provenance, fail-closed missing script, exit mapping
    # with the verdict discarded on every non-published outcome.
    printf '%s\n' "$r22_pub_block" | sed 's/^[[:space:]]*//' | grep -qxF "if: always() && steps.actor_gate.outputs.run == 'true' && steps.evidence-gate.outcome == 'success'" || r22_bad="${r22_bad} test.yml(publish-gate-not-exact)"
    printf '%s\n' "$r22_pub_block" | sed 's/^[[:space:]]*//' | grep -qxF 'SINCE: ${{ github.event.comment.created_at }}' || r22_bad="${r22_bad} test.yml(no-since-env)"
    printf '%s\n' "$r22_pub_block" | grep -qF 'git cat-file -e "${GITHUB_SHA}:.github/scripts/test-comment-published.sh" 2>/dev/null; then' || r22_bad="${r22_bad} test.yml(no-checker-workflow-commit-probe)"
    printf '%s\n' "$r22_pub_block" | grep -qF 'git show "${GITHUB_SHA}:.github/scripts/test-comment-published.sh" > "$evidence_script" 2>/dev/null || rm -f "$evidence_script"' || r22_bad="${r22_bad} test.yml(no-checker-workflow-commit-extraction)"
    printf '%s\n' "$r22_pub_block" | grep -q 'bash \.github/scripts/test-comment-published\.sh' && r22_bad="${r22_bad} test.yml(head-workspace-checker-invocation)"
    printf '%s\n' "$r22_pub_block" | grep -qF 'bash "$evidence_script" "$pr" "$SINCE" || pub_rc=$?' || r22_bad="${r22_bad} test.yml(no-evidence-invocation)"
    printf '%s\n' "$r22_pub_block" | grep -qF 'if [ ! -s "$evidence_script" ]; then' || r22_bad="${r22_bad} test.yml(no-fail-closed-on-missing-checker)"
    printf '%s\n' "$r22_pub_block" | grep -qF 'Tester wrote a decision file but no signed decision comment was published' || r22_bad="${r22_bad} test.yml(no-unpublished-branch)"
    printf '%s\n' "$r22_pub_block" | grep -qF 'Could not verify whether the Tester' || r22_bad="${r22_bad} test.yml(no-unverifiable-branch)"
    printf '%s\n' "$r22_pub_block" | grep -qF 'if [ "$action" != "maintainer" ]; then' || r22_bad="${r22_bad} test.yml(no-maintainer-scope-guard)"
    [ "$(printf '%s\n' "$r22_pub_block" | grep -cF 'rm -f /tmp/random-lab-decision.json' || true)" -ge 3 ] || r22_bad="${r22_bad} test.yml(publish-gate-discard-count-lt-3)"
    # Marker step: exact gate, bot token, workflow-commit provenance, unrunnable
    # exclusion, and the forward-permitting ok output on every non-failing path.
    printf '%s\n' "$r22_marker_block" | sed 's/^[[:space:]]*//' | grep -qxF "if: always() && steps.actor_gate.outputs.run == 'true' && steps.publish-gate.outcome == 'success'" || r22_bad="${r22_bad} test.yml(marker-gate-not-exact)"
    printf '%s\n' "$r22_marker_block" | sed 's/^[[:space:]]*//' | grep -qxF 'GH_TOKEN: ${{ github.token }}' || r22_bad="${r22_bad} test.yml(marker-not-github-token)"
    printf '%s\n' "$r22_marker_block" | grep -q 'secrets\.' && r22_bad="${r22_bad} test.yml(marker-references-secrets)"
    printf '%s\n' "$r22_marker_block" | grep -qF 'git cat-file -e "${GITHUB_SHA}:.github/scripts/publish-tester-marker.sh" 2>/dev/null; then' || r22_bad="${r22_bad} test.yml(no-publisher-workflow-commit-probe)"
    printf '%s\n' "$r22_marker_block" | grep -qF 'git show "${GITHUB_SHA}:.github/scripts/publish-tester-marker.sh" > "$publisher" 2>/dev/null || rm -f "$publisher"' || r22_bad="${r22_bad} test.yml(no-publisher-workflow-commit-extraction)"
    printf '%s\n' "$r22_marker_block" | grep -q 'bash \.github/scripts/publish-tester-marker\.sh' && r22_bad="${r22_bad} test.yml(head-workspace-publisher-invocation)"
    printf '%s\n' "$r22_marker_block" | grep -qF 'if [ ! -s "$publisher" ]; then' || r22_bad="${r22_bad} test.yml(no-fail-closed-on-missing-publisher)"
    printf '%s\n' "$r22_marker_block" | sed 's/^[[:space:]]*//' | grep -qF "if [ -f \"\$ev\" ] && jq -e '.scope == \"unrunnable\"' \"\$ev\" >/dev/null 2>&1; then" || r22_bad="${r22_bad} test.yml(no-unrunnable-escalation-exclusion)"
    printf '%s\n' "$r22_marker_block" | grep -qF 'if ! bash "$publisher" "$pr" "$scope"; then' || r22_bad="${r22_bad} test.yml(no-publisher-invocation)"
    printf '%s\n' "$r22_marker_block" | grep -qF 'echo "ok=false" >> "$GITHUB_OUTPUT"' || r22_bad="${r22_bad} test.yml(no-marker-ok-default)"
    [ "$(printf '%s\n' "$r22_marker_block" | grep -cF 'echo "ok=true" >> "$GITHUB_OUTPUT"' || true)" -ge 4 ] || r22_bad="${r22_bad} test.yml(marker-ok-true-count-lt-4)"
    # Forward gate: the exact conjunction on the forward step itself, so no
    # forward path survives a failed publication check or a failed marker.
    r22_fwd_gate=$(grep -A1 -F -- '- name: Forward tester decision' "$R22_WF" | tail -1 | sed 's/^[[:space:]]*//')
    printf '%s\n' "$r22_fwd_gate" | grep -qxF "if: always() && steps.actor_gate.outputs.run == 'true' && steps.evidence-gate.outcome == 'success' && steps.publish-gate.outcome == 'success' && steps.marker.outputs.ok == 'true'" || r22_bad="${r22_bad} test.yml(forward-gate-not-exact)"
    printf '%s\n' "$r22_fwd_block" | grep -qF '/oc maintainer' || r22_bad="${r22_bad} test.yml(forward-maintainer-mapping-missing)"
    # Ordering: evidence gate -> publication gate -> marker -> forward.
    r22_line() { grep -nF -- "$1" "$R22_WF" | head -1 | cut -d: -f1; }
    r22_ev_ln=$(r22_line '- name: Enforce live-execution evidence gate')
    r22_pub_ln=$(r22_line '- name: Verify tester decision published, else fail closed')
    r22_marker_ln=$(r22_line '- name: Publish tester approval marker (bot-authored)')
    r22_fwd_ln=$(r22_line '- name: Forward tester decision')
    if [ -z "$r22_ev_ln" ] || [ -z "$r22_pub_ln" ] || [ -z "$r22_marker_ln" ] || [ -z "$r22_fwd_ln" ] || [ "$r22_ev_ln" -ge "$r22_pub_ln" ] || [ "$r22_pub_ln" -ge "$r22_marker_ln" ] || [ "$r22_marker_ln" -ge "$r22_fwd_ln" ]; then
      r22_bad="${r22_bad} test.yml(step-order:${r22_ev_ln:-none}/${r22_pub_ln:-none}/${r22_marker_ln:-none}/${r22_fwd_ln:-none})"
    fi
  fi
fi
if [ -f .github/agents/tester.md ]; then
  grep -qF 'Verdict Publication Contract (issue #629)' .github/agents/tester.md || r22_bad="${r22_bad} tester.md(no-publication-contract)"
  grep -qF 'canonical bot-authored' .github/agents/tester.md || r22_bad="${r22_bad} tester.md(no-machine-marker-contract)"
else
  r22_bad="${r22_bad} tester.md(missing)"
fi
# Functional contract tests (delegation.md section 6: executable mock,
# interception asserted before any run, credentials scrubbed, sandbox outside
# the repo tree, per-case behavior from a sandbox config file, live
# non-credential Actions env set realistically so env-fingerprint detection
# cannot green a broken script). The real scripts must classify real payload
# shapes: the checker across published (footer + tool-posted + page-2 +
# trailing-space) and hostile (incident-error, stale, owner-authored,
# inline-mention, empty, bad-json, fetch-failure) payloads, and the publisher
# across genuine and hostile post/fetch outcomes (prose-first fetched first
# line, wrong author, post failure, missing id) with the recorded posted body
# proving the exact marker first line.
if [ -f "$R22_CHECKER" ] && [ -f "$R22_PUBLISHER" ]; then
  r22_checker_abs="$(pwd)/$R22_CHECKER"
  r22_publisher_abs="$(pwd)/$R22_PUBLISHER"
  r22_tmp=$(mktemp -d 2>/dev/null || true)
  if [ -z "$r22_tmp" ] || [ ! -d "$r22_tmp" ]; then
    r22_bad="${r22_bad} scripts(functional-sandbox-unavailable)"
  elif ! command -v jq >/dev/null 2>&1; then
    r22_bad="${r22_bad} scripts(functional-jq-missing)"
  else
    r22_mockdir="$r22_tmp/bin"
    mkdir -p "$r22_mockdir"
    cat > "$r22_mockdir/gh" <<'R22_CHECKER_MOCK'
#!/usr/bin/env bash
r22_cfg="$(cd "$(dirname "$0")/.." && pwd)/case.cfg"
payload_file=""
fail_fetch="0"
# shellcheck disable=SC1090
. "$r22_cfg"
case "$*" in
  *"/comments"*)
    if [ "$fail_fetch" = "1" ]; then
      echo "mock gh: api failure" >&2
      exit 1
    fi
    cat "$payload_file"
    ;;
  *)
    echo "mock gh: unexpected call: $*" >&2
    exit 1
    ;;
esac
R22_CHECKER_MOCK
    chmod +x "$r22_mockdir/gh"
    if [ "$(PATH="$r22_mockdir:$PATH" command -v gh)" != "$r22_mockdir/gh" ]; then
      r22_bad="${r22_bad} scripts(functional-mock-not-intercepted)"
    else
      r22_since="2026-10-17T20:12:07Z"
      r22_p_footer="$r22_tmp/p-footer.json"
      cat > "$r22_p_footer" <<'R22_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T20:20:00Z","body":"## Tester report\n\nVerified end-to-end.\n\n- the Tester\n\n[github run](https://github.com/Userfrom1995/RandomLabs/actions/runs/39068463210)"}]]
R22_PAYLOAD
      r22_p_tool="$r22_tmp/p-tool.json"
      cat > "$r22_p_tool" <<'R22_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T20:20:00Z","body":"## Tester report\n\n- the Tester\n"}]]
R22_PAYLOAD
      r22_p_page2="$r22_tmp/p-page2.json"
      cat > "$r22_p_page2" <<'R22_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T20:00:00Z","body":"old note"}],[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T20:20:00Z","body":"- the Tester"}]]
R22_PAYLOAD
      r22_p_trail="$r22_tmp/p-trail.json"
      cat > "$r22_p_trail" <<'R22_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T20:20:00Z","body":"## Tester report\n\n- the Tester   "}]]
R22_PAYLOAD
      r22_p_incident="$r22_tmp/p-incident.json"
      cat > "$r22_p_incident" <<'R22_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T20:12:08Z","body":"APIError: The operation was aborted. (api_key_expired)"}]]
R22_PAYLOAD
      r22_p_stale="$r22_tmp/p-stale.json"
      cat > "$r22_p_stale" <<'R22_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T19:00:00Z","body":"## Tester report\n\n- the Tester"}]]
R22_PAYLOAD
      r22_p_owner="$r22_tmp/p-owner.json"
      cat > "$r22_p_owner" <<'R22_PAYLOAD'
[[{"user":{"login":"Userfrom1995"},"created_at":"2026-10-17T20:20:00Z","body":"## Tester report\n\n- the Tester"}]]
R22_PAYLOAD
      r22_p_inline="$r22_tmp/p-inline.json"
      cat > "$r22_p_inline" <<'R22_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T20:20:00Z","body":"See the line \"- the Tester\" quoted above."}]]
R22_PAYLOAD
      r22_p_empty="$r22_tmp/p-empty.json"
      printf '[[]]\n' > "$r22_p_empty"
      r22_p_badjson="$r22_tmp/p-badjson.json"
      printf '{"message":"Not Found"}\n' > "$r22_p_badjson"
      r22_checker_case() {
        r22_cc_name="$1"; r22_cc_want="$2"; r22_cc_payload="$3"; shift 3
        {
          printf 'payload_file=%q\n' "$r22_cc_payload"
          printf 'fail_fetch="0"\n'
          for r22_kv in "$@"; do printf '%s\n' "$r22_kv"; done
        } > "$r22_tmp/case.cfg"
        r22_cc_out=$(cd "$r22_tmp" && env -u GITHUB_TOKEN -u GH_TOKEN -u GH_API_TOKEN \
          PATH="$r22_mockdir:$PATH" GITHUB_ACTIONS=true GITHUB_REPOSITORY="RandomLabs/RandomLabs" \
          bash "$r22_checker_abs" 628 "$r22_since" 2>&1)
        r22_cc_rc=$?
        if [ "$r22_cc_rc" -ne "$r22_cc_want" ]; then
          r22_bad="${r22_bad} checker(functional-${r22_cc_name}-rc=${r22_cc_rc},want=${r22_cc_want})"
          printf 'R22 checker functional case %s failed (rc=%s, want=%s); output:\n%s\n' "$r22_cc_name" "$r22_cc_rc" "$r22_cc_want" "$r22_cc_out" >&2
        fi
      }
      r22_checker_case published-footer 0 "$r22_p_footer"
      r22_checker_case published-tool 0 "$r22_p_tool"
      r22_checker_case page2-signoff 0 "$r22_p_page2"
      r22_checker_case trailing-space 0 "$r22_p_trail"
      r22_checker_case incident-error 1 "$r22_p_incident"
      r22_checker_case stale 1 "$r22_p_stale"
      r22_checker_case owner-authored 1 "$r22_p_owner"
      r22_checker_case inline-mention 1 "$r22_p_inline"
      r22_checker_case empty 1 "$r22_p_empty"
      r22_checker_case bad-json 2 "$r22_p_badjson"
      r22_checker_case fetch-failure 2 "$r22_tmp/never-read.json" 'fail_fetch="1"'
      # Publisher mock: records the posted body and re-serves it on the
      # by-id fetch (or a fixed hostile body), so the real first-line and
      # authorship verifications are exercised end to end.
      cat > "$r22_mockdir/gh" <<'R22_PUBLISHER_MOCK'
#!/usr/bin/env bash
r22_cfg="$(cd "$(dirname "$0")/.." && pwd)/case.cfg"
author="github-actions[bot]"
fail_post="0"
no_id="0"
fetch_mode="posted"
fixed_body_file=""
posted_file=""
# shellcheck disable=SC1090
. "$r22_cfg"
case "$*" in
  *"/issues/comments/"*)
    if [ "$fetch_mode" = "fixed" ]; then
      jq -n --arg a "$author" --arg b "$(cat "$fixed_body_file" 2>/dev/null || true)" '{user:{login:$a},html_url:"https://example.invalid/comment",body:$b}'
    else
      jq -n --arg a "$author" --arg b "$(cat "$posted_file" 2>/dev/null || true)" '{user:{login:$a},html_url:"https://example.invalid/comment",body:$b}'
    fi
    ;;
  *)
    if [ "$fail_post" = "1" ]; then
      echo "mock gh: post failed" >&2
      exit 1
    fi
    for r22_arg in "$@"; do
      case "$r22_arg" in
        body=*) printf '%s' "${r22_arg#body=}" > "$posted_file" ;;
      esac
    done
    if [ "$no_id" = "1" ]; then
      printf '{}\n'
    else
      printf '{"id":12345}\n'
    fi
    ;;
esac
R22_PUBLISHER_MOCK
      chmod +x "$r22_mockdir/gh"
      if [ "$(PATH="$r22_mockdir:$PATH" command -v gh)" != "$r22_mockdir/gh" ]; then
        r22_bad="${r22_bad} publisher(functional-mock-not-intercepted)"
      else
        r22_prose="$r22_tmp/prose-first.txt"
        printf 'All green. Posting the decision comment.\n\n/oc approve-test\n\n- the Tester\n' > "$r22_prose"
        r22_pub_case() {
          r22_pc_name="$1"; r22_pc_want="$2"; r22_pc_target="$3"; shift 3
          {
            printf 'author="github-actions[bot]"\n'
            printf 'fail_post="0"\n'
            printf 'no_id="0"\n'
            printf 'fetch_mode="posted"\n'
            printf 'fixed_body_file=""\n'
            printf 'posted_file=%q\n' "$r22_tmp/posted-$r22_pc_name"
            for r22_kv in "$@"; do printf '%s\n' "$r22_kv"; done
          } > "$r22_tmp/case.cfg"
          rm -f "$r22_tmp/posted-$r22_pc_name"
          r22_pc_out=$(cd "$r22_tmp" && env -u GITHUB_TOKEN -u GH_TOKEN -u GH_API_TOKEN \
            PATH="$r22_mockdir:$PATH" GITHUB_ACTIONS=true GITHUB_REPOSITORY="RandomLabs/RandomLabs" \
            bash "$r22_publisher_abs" "$r22_pc_target" "infra" 2>&1)
          r22_pc_rc=$?
          if [ "$r22_pc_rc" -ne "$r22_pc_want" ]; then
            r22_bad="${r22_bad} publisher(functional-${r22_pc_name}-rc=${r22_pc_rc},want=${r22_pc_want})"
            printf 'R22 publisher functional case %s failed (rc=%s, want=%s); output:\n%s\n' "$r22_pc_name" "$r22_pc_rc" "$r22_pc_want" "$r22_pc_out" >&2
          fi
        }
        r22_pub_case good-marker 0 628
        r22_pub_case prose-first 1 628 'fetch_mode="fixed"' "fixed_body_file=$r22_prose"
        r22_pub_case wrong-author 1 628 'author="Userfrom1995"'
        r22_pub_case post-failure 1 628 'fail_post="1"'
        r22_pub_case missing-id 1 628 'no_id="1"'
        r22_pub_case bad-target 1 "abc"
        r22_posted_first=$(head -n1 "$r22_tmp/posted-good-marker" 2>/dev/null || true)
        [ "$r22_posted_first" = "/oc approve-test" ] || r22_bad="${r22_bad} publisher(functional-good-marker-posted-first-line='${r22_posted_first}')"
      fi
    fi
    rm -rf "$r22_tmp"
  fi
fi
if [ -z "$r22_bad" ]; then
  check "R22" "tester maintainer decisions require positive publication evidence (bot-authored, post-trigger, tester-signed comment checked from this run's own workflow commit; unpublished and unverifiable verdicts are discarded and fail closed) and the workflow publishes the canonical bot-authored first-line /oc approve-test marker itself from the evidence-gated machine handoff (never for a non-maintainer decision or a scope=unrunnable escalation, re-fetched and verified by id), so the PAT merge sweep's R21 anchor is guaranteed by construction instead of agent prose formatting (issue #629)" "ok"
else
  check "R22" "tester verdict publication guard missing:${r22_bad} (issue #629: a prose-first tester verdict silently stalls the PAT merge sweep and no publication-shape check existed)" "bad"
fi


# [R23] Maintainer memory publish concurrency guard (issue #647): the publish
# step's fallback was a single-shot, fully-quiet `git fetch && git rebase &&
# git push` chain. On 2026-10-18 (maintainer run 39097165251) a concurrent
# session advanced maintainer/logs seconds before the push, the
# non-fast-forward rejection hit the fallback, the rebase conflicted (both
# sessions had rewritten the same day file) and died 306ms later under
# --quiet, the step exited 1, and the session's whole memory (commit 7060a089)
# was silently lost. Properties pinned here:
#   1. bounded retry: at most 3 fetch-recompose-push attempts with a bounded
#      backoff between them, never an unbounded loop;
#   2. deterministic keep-both semantics: every attempt recomposes on the
#      freshly fetched tip and the day's log keeps every concurrent entry
#      (the session's addition is isolated against its materialization
#      baseline and appended, never a whole-file overwrite), while STATE.md
#      stays last-writer-wins;
#   3. loud diagnostics and loud give-up: no --quiet on the publish path, the
#      real git error is always in the step log, and after the cap the step
#      prints the recoverable session bundle and exits 1 (red run);
#   4. idempotence: a run whose marker is already in the day file never
#      duplicates its entry;
#   5. bootstrap idempotence and retry safety: the orphan bootstrap uses a
#      unique unborn root per attempt, so a retry under the runner's default
#      `bash -e {0}` run-step shell can never die on a reused branch name
#      before the loud give-up, and an empty bootstrap composition can never
#      conclude green without a published tip (review findings F1/F1b);
#   6. a functional harness executes the REAL extracted run block under that
#      same `bash -e` shell (review finding F2: under plain bash an aborting
#      orphan re-checkout was invisible and a silently-blessed unpushed green
#      passed) in an isolated sandbox (mktemp outside the repo, credentials
#      scrubbed) against a local bare-repo origin with a push-counting
#      pre-receive hook (rejections and concurrent-tip advance injected; a
#      mock sleep advances the tip during the bounded backoff) and asserts:
#      clean push, race recovery preserving the concurrent entry (the #647
#      regression), entry-only contract-violation recovery, persistent
#      rejection with exactly 3 attempts / 2 bounded backoffs / nonzero loud
#      exit / recovery bundle printed / remote untouched, no-log-entry
#      keep-existing, already-marked no-duplication, no-changes no-commit,
#      fresh-bootstrap recovery when the first push is rejected (the orphan
#      path as a whole), fresh-bootstrap persistent rejection reaching the
#      full cap loudly, persistent fetch failure on an existing branch
#      reaching the loud cap with the remote untouched (a PATH git shim fails
#      fetches; interception proven), and the invariant that any scenario
#      whose output claims `memory pushed to maintainer/logs` where a publish
#      was required must have advanced the remote tip. Mock interception is
#      proven before any scenario and every scenario is bounded by timeout,
#      so an unbounded-loop re-spelling fails the rule.
# Honest limits: the fixture races are injected deterministically (hook
# rejection plus tip advance on the first backoff), not by true concurrent
# processes; a nondeterministic interleaving that defeats the 3-attempt bound
# is review-gated. The empty-bootstrap no-green guard (F1b) is defense in
# depth: with the unique root the empty-composition state is unreachable, so
# no fixture can drive it through the real block (only the soft-orphan mutant
# manufactures it, and that mutant is caught functionally); the guard itself
# is pinned statically. The harness's `bash -e` fidelity is pinned by a
# self-check on its own invocation line.
r23_bad=""
R23_WF=".github/workflows/maintainer.yml"
R23_STEP_RE='- name: Commit Maintainer memory (maintainer/logs)'
if [ ! -f "$R23_WF" ]; then
  r23_bad="${r23_bad} maintainer.yml(missing)"
else
  [ "$(grep -cF -- '- name: Commit Maintainer memory (maintainer/logs)' "$R23_WF" || true)" = "1" ] || r23_bad="${r23_bad} maintainer.yml(step-name-not-unique)"
  r23_block=$(awk -v step="$R23_STEP_RE" '
    index($0, step) { in_step=1; next }
    in_step && /^[[:space:]]*run: \|[[:space:]]*$/ { in_run=1; indent=match($0, /[^ ]/); next }
    in_run {
      if ($0 ~ /^[[:space:]]*$/) { blanks = blanks "\n"; next }
      n = match($0, /[^ ]/)
      if (n < indent + 2) exit
      printf "%s", blanks; blanks = ""
      print
    }
  ' "$R23_WF" 2>/dev/null | sed -e 's/\${{ github.run_id }}/4242424242/g' -e 's/\${{ github.repository }}/RandomLabs\/RandomLabs/g' -e 's/\${{ github.event_name }}/schedule/g')
  if [ -z "$r23_block" ]; then
    r23_bad="${r23_bad} maintainer.yml(memory-step-missing-or-renamed)"
  elif ! bash -n <<< "$r23_block" 2>/dev/null; then
    r23_bad="${r23_bad} maintainer.yml(memory-step-syntax)"
  else
    # Step identity: the extracted step must be the executing one (always()
    # gated), so a dead decoy cannot shadow a broken real step. Issue #696:
    # a denied trigger actor must not push a marker/stub day entry either, so
    # the publish step may carry exactly one ADDITIONAL conditional - the
    # shared actor-write gate (allowed only while that pinned gate step and
    # its invocation are present in the same file). Any other header form
    # fails closed.
    r23_hdr=$(awk -v step="$R23_STEP_RE" '
      index($0, step) { in_step=1 }
      in_step && /^[[:space:]]*run: \|[[:space:]]*$/ { exit }
      in_step { print }
    ' "$R23_WF" 2>/dev/null || true)
    r23_hdr_if_count=$(printf '%s\n' "$r23_hdr" | grep -cE '^[[:space:]]*if:' || true)
    if [ "$r23_hdr_if_count" = "1" ] \
       && printf '%s\n' "$r23_hdr" | grep -qE '^[[:space:]]*if: always\(\)[[:space:]]*$'; then
      :
    elif [ "$r23_hdr_if_count" = "1" ] \
       && printf '%s\n' "$r23_hdr" | grep -qE "^[[:space:]]*if: always\(\) && steps\.actor_gate\.outputs\.run == 'true'[[:space:]]*\$" \
       && grep -qxF -- '      - name: Actor write gate (issue #428)' "$R23_WF" \
       && grep -qxF '        id: actor_gate' "$R23_WF" \
       && grep -qxF '          GH_TOKEN: ${{ github.token }}' "$R23_WF" \
       && grep -qxF '          GATE_EVENT: ${{ github.event_name }}' "$R23_WF" \
       && grep -qxF '          GATE_ACTOR: ${{ github.actor }}' "$R23_WF" \
       && grep -qxF '        run: bash .github/scripts/actor-write-gate.sh' "$R23_WF"; then
      :
    else
      r23_bad="${r23_bad} maintainer.yml(memory-step-not-always-gated)"
    fi
    printf '%s\n' "$r23_block" | grep -qF '${{' && r23_bad="${r23_bad} maintainer.yml(unsubstituted-expression)"
    # Bounded loop and bounded backoff.
    [ "$(printf '%s\n' "$r23_block" | grep -cE '^[[:space:]]*for attempt in 1 2 3; do$' || true)" = "1" ] || r23_bad="${r23_bad} maintainer.yml(no-bounded-3-attempt-loop)"
    [ "$(printf '%s\n' "$r23_block" | grep -cE '^[[:space:]]*sleep 5$' || true)" = "1" ] || r23_bad="${r23_bad} maintainer.yml(no-bounded-backoff)"
    # Loud publish path: unconditional fetch and push inside the loop, no
    # --quiet anywhere on a fetch/push line, and no lingering rebase fallback.
    [ "$(printf '%s\n' "$r23_block" | grep -cE '^[[:space:]]*if git fetch origin maintainer/logs:refs/remotes/origin/logs; then$' || true)" = "1" ] || r23_bad="${r23_bad} maintainer.yml(fetch-not-loud-unconditional)"
    [ "$(printf '%s\n' "$r23_block" | grep -cE '^[[:space:]]*if git push origin "HEAD:maintainer/logs"; then$' || true)" = "1" ] || r23_bad="${r23_bad} maintainer.yml(push-not-loud)"
    printf '%s\n' "$r23_block" | grep -E 'git (fetch|push)' | grep -q -- '--quiet' && r23_bad="${r23_bad} maintainer.yml(quiet-publish-path)"
    printf '%s\n' "$r23_block" | grep -qE '^[[:space:]]*git rebase' && r23_bad="${r23_bad} maintainer.yml(rebase-fallback-still-present)"
    # Bootstrap idempotence (review findings F1/F1b): a unique unborn root per
    # attempt keeps retries alive under `bash -e`, and an empty bootstrap
    # composition can never take the green no-changes shortcut.
    printf '%s\n' "$r23_block" | grep -qF 'git checkout --orphan "logs-bootstrap-$attempt" --quiet' || r23_bad="${r23_bad} maintainer.yml(no-unique-bootstrap-root)"
    printf '%s\n' "$r23_block" | grep -qF 'empty bootstrap composition on attempt $attempt; not concluding green' || r23_bad="${r23_bad} maintainer.yml(no-empty-bootstrap-guard)"
    # The sandbox itself must execute the real block under the runner's
    # default run-step shell (`bash -e {0}`), not plain bash (review finding
    # F2): plain bash hides an aborting orphan re-checkout and blesses the
    # silent loss class. Self-pin on the harness invocation; the pattern is
    # assembled from fragments so this pin line cannot match itself.
    r23_self="${BASH_SOURCE[0]:-$0}"
    [ -f "$r23_self" ] || r23_self=".github/scripts/silent-stall-audit.sh"
    r23_shell_pat='timeout 60 bash -e'
    r23_shell_pat="${r23_shell_pat} \"\$r23_tmp/block.sh\""
    [ "$(grep -cF -- "$r23_shell_pat" "$r23_self" 2>/dev/null || true)" = "1" ] || r23_bad="${r23_bad} harness(no-bash-e-fidelity)"
    # Keep-both log semantics: baseline + delta isolation, append (never
    # overwrite), exactly one marker append per committed attempt.
    printf '%s\n' "$r23_block" | grep -qF 'for f in state.md personality.md log-entry.md; do' || r23_bad="${r23_bad} maintainer.yml(no-session-bundle)"
    printf '%s\n' "$r23_block" | grep -qF 'log-baseline.md' || r23_bad="${r23_bad} maintainer.yml(no-materialization-baseline)"
    printf '%s\n' "$r23_block" | grep -qF 'cat "$bundle/log-delta.md" >> "logs/$today.md"' || r23_bad="${r23_bad} maintainer.yml(log-not-appended)"
    [ "$(printf '%s\n' "$r23_block" | grep -cE 'printf .*run_marker.*>> .*logs/\$today\.md' || true)" = "1" ] || r23_bad="${r23_bad} maintainer.yml(marker-append-count)"
    printf '%s\n' "$r23_block" | grep -qF 'grep -qF "$run_marker" "logs/$today.md"' || r23_bad="${r23_bad} maintainer.yml(no-marker-idempotence-check)"
    # Robust staging (per-path adds: a missing REGISTRY.md must not void the
    # whole atomic git add).
    printf '%s\n' "$r23_block" | grep -qF 'for f in STATE.md personality.md REGISTRY.md; do' || r23_bad="${r23_bad} maintainer.yml(no-per-path-adds)"
    printf '%s\n' "$r23_block" | grep -qF 'git add -- "$f"' || r23_bad="${r23_bad} maintainer.yml(no-per-path-add-line)"
    # Loud give-up: error marker, single exit 1, recoverable bundle printed,
    # workspace restored before the failure verdict.
    printf '%s\n' "$r23_block" | grep -qF 'maintainer memory publish failed after 3 attempts' || r23_bad="${r23_bad} maintainer.yml(no-loud-give-up)"
    printf '%s\n' "$r23_block" | grep -qF '(recoverable copy)' || r23_bad="${r23_bad} maintainer.yml(no-recovery-bundle-print)"
    [ "$(printf '%s\n' "$r23_block" | grep -cE '^[[:space:]]*exit 1$' || true)" = "1" ] || r23_bad="${r23_bad} maintainer.yml(exit1-count)"
    r23_grep_line() { printf '%s\n' "$r23_block" | grep -nF -- "$1" | head -1 | cut -d: -f1; }
    r23_bundle_ln=$(r23_grep_line 'bundle="$(mktemp -d)"')
    r23_loop_ln=$(r23_grep_line 'for attempt in 1 2 3; do')
    r23_restore_ln=$(r23_grep_line 'git checkout --force origin/main --quiet')
    r23_failif_ln=$(r23_grep_line 'if [ "$memory_pushed" != "1" ]; then')
    r23_recover_ln=$(r23_grep_line '(recoverable copy)')
    if [ -z "$r23_bundle_ln" ] || [ -z "$r23_loop_ln" ] || [ "$r23_bundle_ln" -ge "$r23_loop_ln" ]; then
      r23_bad="${r23_bad} maintainer.yml(bundle-not-before-loop:${r23_bundle_ln:-none}/${r23_loop_ln:-none})"
    fi
    if [ -z "$r23_restore_ln" ] || [ -z "$r23_failif_ln" ] || [ -z "$r23_recover_ln" ] \
       || [ "$r23_restore_ln" -ge "$r23_failif_ln" ] || [ "$r23_failif_ln" -ge "$r23_recover_ln" ]; then
      r23_bad="${r23_bad} maintainer.yml(recovery-order:${r23_restore_ln:-none}/${r23_failif_ln:-none}/${r23_recover_ln:-none})"
    fi
    # Functional harness (delegation.md section 6: executable mocks, proven
    # interception, credentials scrubbed, sandbox outside the repo, timeout
    # per scenario). No network access: the origin is a local bare repo.
    if ! command -v git >/dev/null 2>&1 || ! command -v timeout >/dev/null 2>&1 || ! command -v cmp >/dev/null 2>&1; then
      r23_bad="${r23_bad} maintainer.yml(functional-missing-git-timeout-or-cmp)"
    else
      r23_tmp=$(mktemp -d 2>/dev/null || true)
      if [ -z "$r23_tmp" ] || [ ! -d "$r23_tmp" ]; then
        r23_bad="${r23_bad} maintainer.yml(functional-sandbox-unavailable)"
      else
        r23_bin="$r23_tmp/bin"
        mkdir -p "$r23_bin" "$r23_tmp/home" "$r23_tmp/tmp"
        printf '%s\n' "$r23_block" > "$r23_tmp/block.sh"
        R23_TODAY="$(date -u +%Y-%m-%d)"
        R23_MARKER='<!-- run: 4242424242 -->'
        r23_base_log="# ${R23_TODAY}

## 04:00Z - earlier session

entry-baseline
"
        r23_conc_suffix="
## 04:30Z - concurrent session

entry-concurrent
"
        r23_session_entry="${r23_base_log}
## 05:00Z - this session

entry-session
"
        cat > "$r23_bin/sleep" <<'R23SLEEP'
#!/usr/bin/env bash
n=0; [ -n "${R23_SLEEP_COUNT:-}" ] && [ -f "$R23_SLEEP_COUNT" ] && n=$(cat "$R23_SLEEP_COUNT")
n=$((n + 1)); printf '%s\n' "$n" > "$R23_SLEEP_COUNT"
if [ "$n" = "1" ] && [ -n "${R23_ADVANCE_REF:-}" ]; then
  git --git-dir="$R23_REMOTE" update-ref refs/heads/maintainer/logs "$R23_ADVANCE_REF"
fi
exit 0
R23SLEEP
        chmod +x "$r23_bin/sleep"
        # R23 fetch-failure injector (review finding F2): the real git path is
        # captured before the shim goes on PATH; the shim fails up to
        # R23_FETCH_FAIL_COUNT `fetch` invocations (counting them in
        # R23_FETCH_COUNT) and always delegates to real git for everything
        # else, so checkout/commit/push/hooks still run genuine git.
        r23_real_git=$(command -v git)
        cat > "$r23_bin/git" <<R23GIT
#!/usr/bin/env bash
if [ "\${1:-}" = "fetch" ] && [ -n "\${R23_FETCH_FAIL_COUNT:-}" ]; then
  n=0
  [ -n "\${R23_FETCH_COUNT:-}" ] && [ -f "\$R23_FETCH_COUNT" ] && n=\$(cat "\$R23_FETCH_COUNT")
  n=\$((n + 1))
  [ -n "\${R23_FETCH_COUNT:-}" ] && printf '%s\n' "\$n" > "\$R23_FETCH_COUNT"
  if [ "\$n" -le "\$R23_FETCH_FAIL_COUNT" ]; then
    echo "R23 simulated fetch failure: maintainer/logs unreachable (fetch \$n)" >&2
    exit 128
  fi
fi
exec "$r23_real_git" "\$@"
R23GIT
        chmod +x "$r23_bin/git"
        if [ "$(env PATH="$r23_bin:$PATH" bash -c 'command -v sleep' 2>/dev/null || true)" != "$r23_bin/sleep" ] \
           || [ "$(env PATH="$r23_bin:$PATH" bash -c 'command -v git' 2>/dev/null || true)" != "$r23_bin/git" ]; then
          r23_bad="${r23_bad} maintainer.yml(functional-mock-not-intercepted)"
        else
          : > "$r23_tmp/probe-count"
          env PATH="$r23_bin:$PATH" R23_SLEEP_COUNT="$r23_tmp/probe-count" R23_REMOTE="" bash -c 'sleep 5' >/dev/null 2>&1 || true
          : > "$r23_tmp/fetch-probe-count"
          (cd "$r23_tmp" && env PATH="$r23_bin:$PATH" R23_FETCH_COUNT="$r23_tmp/fetch-probe-count" R23_FETCH_FAIL_COUNT=1 bash -c 'git fetch' >/dev/null 2>&1 || true)
          if [ "$(cat "$r23_tmp/probe-count" 2>/dev/null || true)" != "1" ]; then
            r23_bad="${r23_bad} maintainer.yml(functional-sleep-mock-probe-failed)"
          elif [ "$(cat "$r23_tmp/fetch-probe-count" 2>/dev/null || true)" != "1" ]; then
            r23_bad="${r23_bad} maintainer.yml(functional-git-mock-probe-failed)"
          elif ! env PATH="$r23_bin:$PATH" bash -c 'git --version' >/dev/null 2>&1; then
            r23_bad="${r23_bad} maintainer.yml(functional-git-mock-delegation-failed)"
          else
            r23_fail() { r23_bad="${r23_bad} maintainer.yml(functional-$1)"; }
            r23_check() { [ "$2" = "1" ] || r23_fail "$1"; }
            r23_write_hook() {
              local dir="$1"
              cat > "$dir/remote.git/hooks/pre-receive" <<'R23HOOK'
#!/usr/bin/env bash
gd=$(git rev-parse --git-dir)
n=0; [ -f "$gd/r23-push-count" ] && n=$(cat "$gd/r23-push-count")
while read -r old new ref; do
  [ "$ref" = "refs/heads/maintainer/logs" ] || continue
  n=$((n + 1)); printf '%s\n' "$n" > "$gd/r23-push-count"
  if [ "$n" -le "${R23_REJECT_COUNT:-0}" ]; then
    echo "R23 simulated rejection: concurrent session advanced the branch (push $n)" >&2
    exit 1
  fi
done
exit 0
R23HOOK
              chmod +x "$dir/remote.git/hooks/pre-receive" || return 1
            }
            r23_seed() {
              local dir="$1" base_log="$2" base_state="$3"
              rm -rf "$dir"; mkdir -p "$dir/home" "$dir/tmp"
              git init -q --bare "$dir/remote.git" 2>/dev/null || return 1
              git --git-dir="$dir/remote.git" symbolic-ref HEAD refs/heads/maintainer/logs || return 1
              git clone -q "$dir/remote.git" "$dir/seed" 2>/dev/null || return 1
              (
                cd "$dir/seed" || exit 1
                git checkout -q -b maintainer/logs || exit 1
                mkdir -p logs
                printf '%s' "$base_log" > "logs/$R23_TODAY.md"
                printf '%s' "$base_state" > STATE.md
                printf 'personality-seed\n' > personality.md
                git add -A
                git -c user.name=seed -c user.email=seed@example.invalid -c commit.gpgsign=false commit -q -m seed || exit 1
                git push -q origin maintainer/logs 2>/dev/null || exit 1
              ) || return 1
              r23_write_hook "$dir" || return 1
              git clone -q "$dir/remote.git" "$dir/work" 2>/dev/null || return 1
            }
            # Bootstrap fixture (review finding F2): an origin with NO
            # maintainer/logs branch yet. Every retry of such a run takes the
            # orphan-bootstrap path, which is exactly where the F1 abort and
            # the F1b blessed-silent-loss lived.
            r23_seed_empty() {
              local dir="$1"
              rm -rf "$dir"; mkdir -p "$dir/home" "$dir/tmp"
              git init -q --bare "$dir/remote.git" 2>/dev/null || return 1
              git --git-dir="$dir/remote.git" symbolic-ref HEAD refs/heads/maintainer/logs || return 1
              r23_write_hook "$dir" || return 1
              git clone -q "$dir/remote.git" "$dir/work" 2>/dev/null || return 1
            }
            r23_concurrent() {
              local dir="$1" suffix="$2"
              git clone -q "$dir/remote.git" "$dir/concurrent" 2>/dev/null || return 1
              (
                cd "$dir/concurrent" || exit 1
                git checkout -q maintainer/logs || exit 1
                printf '%s' "$suffix" >> "logs/$R23_TODAY.md"
                printf 'state-concurrent\n' > STATE.md
                git add -A
                git -c user.name=concurrent -c user.email=concurrent@example.invalid -c commit.gpgsign=false commit -q -m "concurrent session" || exit 1
                git push -q origin HEAD:refs/heads/concurrent 2>/dev/null || exit 1
                git rev-parse HEAD
              )
            }
            r23_session() {
              local dir="$1" baseline="$2" entry="$3" state="$4"
              mkdir -p "$dir/work/.maintainer"
              if [ -n "$state" ]; then printf '%s' "$state" > "$dir/work/.maintainer/state.md"; fi
              if [ -n "$entry" ]; then printf '%s' "$entry" > "$dir/work/.maintainer/log-entry.md"; fi
              if [ -n "$baseline" ]; then
                mkdir -p "$dir/work/.maintainer/memory/logs"
                printf '%s' "$baseline" > "$dir/work/.maintainer/memory/logs/$R23_TODAY.md"
              fi
            }
            r23_run() {
              local dir="$1" reject="$2" advance="$3" fetch_fail="${4:-0}"
              : > "$dir/sleeps"; : > "$dir/fetches"
              (
                cd "$dir/work" || exit 1
                env -u GITHUB_TOKEN -u GH_TOKEN -u GITHUB_ACTIONS -u GITHUB_REPOSITORY -u GITHUB_RUN_ID -u GITHUB_EVENT_PATH \
                  PATH="$r23_bin:$PATH" HOME="$dir/home" TMPDIR="$dir/tmp" \
                  R23_SLEEP_COUNT="$dir/sleeps" R23_REMOTE="$dir/remote.git" \
                  R23_REJECT_COUNT="$reject" R23_ADVANCE_REF="$advance" \
                  R23_FETCH_COUNT="$dir/fetches" R23_FETCH_FAIL_COUNT="$fetch_fail" \
                  timeout 60 bash -e "$r23_tmp/block.sh"
              ) > "$dir/out" 2>&1
              echo $? > "$dir/rc"
            }
            r23_show() { git --git-dir="$1/remote.git" show "refs/heads/maintainer/logs:$2" 2>/dev/null || true; }
            # --verify --quiet: a missing ref must yield empty output, not the
            # echoed refspec (plain rev-parse prints its unresolved argument on
            # stdout, which made a never-created branch look published).
            r23_tip() { git --git-dir="$1/remote.git" rev-parse --verify --quiet refs/heads/maintainer/logs 2>/dev/null || true; }
            r23_rc() { cat "$1/rc" 2>/dev/null || echo none; }
            # Review finding F2c: a scenario whose output claims a successful
            # publish must have actually advanced the remote tip. (Scenarios 6
            # and 7 are the documented benign no-op conclusions and are exempt;
            # their no-new-commit checks pin the opposite direction.) Runs the
            # block under the runner's default `bash -e {0}` shell, so an
            # aborting orphan re-checkout or an unpushed green is observable.
            r23_green_implies_pushed() {
              local dir="$1" pre="$2" tag="$3"
              local out tip
              out=$(cat "$dir/out" 2>/dev/null || true)
              tip=$(r23_tip "$dir")
              if printf '%s' "$out" | grep -qF 'memory pushed to maintainer/logs'; then
                { [ -n "$tip" ] && [ "$tip" != "$pre" ]; } || r23_fail "$tag-green-without-push"
              fi
            }
            # Scenario 1: clean push, no race.
            if ! r23_seed "$r23_tmp/s1" "$r23_base_log" "state-seed
"; then
              r23_fail "s1-setup"
            else
              r23_s1_tip=$(r23_tip "$r23_tmp/s1")
              r23_session "$r23_tmp/s1" "$r23_base_log" "$r23_session_entry" "state-session
"
              r23_run "$r23_tmp/s1" 0 ""
              r23_s1_log=$(r23_show "$r23_tmp/s1" "logs/$R23_TODAY.md")
              r23_check "s1-rc" "$([ "$(r23_rc "$r23_tmp/s1")" = "0" ] && echo 1 || echo 0)"
              r23_check "s1-baseline-kept" "$(printf '%s' "$r23_s1_log" | grep -qF 'entry-baseline' && echo 1 || echo 0)"
              r23_check "s1-session-kept" "$(printf '%s' "$r23_s1_log" | grep -qF 'entry-session' && echo 1 || echo 0)"
              r23_check "s1-marker-once" "$([ "$(printf '%s' "$r23_s1_log" | grep -cF "$R23_MARKER")" = "1" ] && echo 1 || echo 0)"
              r23_check "s1-state" "$([ "$(r23_show "$r23_tmp/s1" STATE.md)" = "state-session" ] && echo 1 || echo 0)"
              r23_green_implies_pushed "$r23_tmp/s1" "$r23_s1_tip" "s1"
            fi
            # Scenario 2 (the #647 regression): concurrent advance between the
            # failed push and the retry; both entries must survive.
            if ! r23_seed "$r23_tmp/s2" "$r23_base_log" "state-seed
"; then
              r23_fail "s2-setup"
            else
              r23_s2_conc=$(r23_concurrent "$r23_tmp/s2" "$r23_conc_suffix") || true
              if [ -z "$r23_s2_conc" ]; then
                r23_fail "s2-concurrent-commit"
              else
                r23_s2_tip=$(r23_tip "$r23_tmp/s2")
                r23_session "$r23_tmp/s2" "$r23_base_log" "$r23_session_entry" "state-session
"
                r23_run "$r23_tmp/s2" 1 "$r23_s2_conc"
                r23_s2_log=$(r23_show "$r23_tmp/s2" "logs/$R23_TODAY.md")
                r23_check "s2-rc" "$([ "$(r23_rc "$r23_tmp/s2")" = "0" ] && echo 1 || echo 0)"
                r23_check "s2-baseline-kept" "$(printf '%s' "$r23_s2_log" | grep -qF 'entry-baseline' && echo 1 || echo 0)"
                r23_check "s2-concurrent-kept" "$(printf '%s' "$r23_s2_log" | grep -qF 'entry-concurrent' && echo 1 || echo 0)"
                r23_check "s2-session-kept" "$(printf '%s' "$r23_s2_log" | grep -qF 'entry-session' && echo 1 || echo 0)"
                r23_check "s2-marker-once" "$([ "$(printf '%s' "$r23_s2_log" | grep -cF "$R23_MARKER")" = "1" ] && echo 1 || echo 0)"
                r23_check "s2-order" "$(printf '%s' "$r23_s2_log" | awk '/entry-concurrent/{c=NR} /entry-session/{s=NR} END{exit !(c && s && c < s)}' && echo 1 || echo 0)"
                r23_check "s2-state" "$([ "$(r23_show "$r23_tmp/s2" STATE.md)" = "state-session" ] && echo 1 || echo 0)"
                r23_check "s2-attempts" "$([ "$(cat "$r23_tmp/s2/remote.git/r23-push-count" 2>/dev/null)" = "2" ] && echo 1 || echo 0)"
                r23_check "s2-backoff" "$([ "$(cat "$r23_tmp/s2/sleeps" 2>/dev/null)" = "1" ] && echo 1 || echo 0)"
                r23_green_implies_pushed "$r23_tmp/s2" "$r23_s2_tip" "s2"
              fi
            fi
            # Scenario 3: race plus an entry-only contract violation (the agent
            # wrote only its own entry); nothing may be lost.
            if ! r23_seed "$r23_tmp/s3" "$r23_base_log" "state-seed
"; then
              r23_fail "s3-setup"
            else
              r23_s3_conc=$(r23_concurrent "$r23_tmp/s3" "$r23_conc_suffix") || true
              if [ -z "$r23_s3_conc" ]; then
                r23_fail "s3-concurrent-commit"
              else
                r23_s3_tip=$(r23_tip "$r23_tmp/s3")
                r23_session "$r23_tmp/s3" "$r23_base_log" "## 05:00Z - entry-only session

entry-only
" "state-session
"
                r23_run "$r23_tmp/s3" 1 "$r23_s3_conc"
                r23_s3_log=$(r23_show "$r23_tmp/s3" "logs/$R23_TODAY.md")
                r23_check "s3-rc" "$([ "$(r23_rc "$r23_tmp/s3")" = "0" ] && echo 1 || echo 0)"
                r23_check "s3-concurrent-kept" "$(printf '%s' "$r23_s3_log" | grep -qF 'entry-concurrent' && echo 1 || echo 0)"
                r23_check "s3-entry-only-kept" "$(printf '%s' "$r23_s3_log" | grep -qF 'entry-only' && echo 1 || echo 0)"
                r23_check "s3-marker-once" "$([ "$(printf '%s' "$r23_s3_log" | grep -cF "$R23_MARKER")" = "1" ] && echo 1 || echo 0)"
                r23_green_implies_pushed "$r23_tmp/s3" "$r23_s3_tip" "s3"
              fi
            fi
            # Scenario 4: persistent rejection; bounded loud give-up, recovery
            # bundle printed, remote untouched.
            if ! r23_seed "$r23_tmp/s4" "$r23_base_log" "state-seed
"; then
              r23_fail "s4-setup"
            else
              r23_s4_tip=$(r23_tip "$r23_tmp/s4")
              r23_session "$r23_tmp/s4" "$r23_base_log" "$r23_session_entry" "state-session
"
              r23_run "$r23_tmp/s4" 99 ""
              r23_s4_out=$(cat "$r23_tmp/s4/out" 2>/dev/null || true)
              r23_check "s4-rc-loud" "$([ "$(r23_rc "$r23_tmp/s4")" != "0" ] && echo 1 || echo 0)"
              r23_check "s4-error-marker" "$(printf '%s' "$r23_s4_out" | grep -qF 'maintainer memory publish failed after 3 attempts' && echo 1 || echo 0)"
              r23_check "s4-recovery-copy" "$(printf '%s' "$r23_s4_out" | grep -qF '(recoverable copy)' && echo 1 || echo 0)"
              r23_check "s4-recovery-content" "$(printf '%s' "$r23_s4_out" | grep -qF 'entry-session' && echo 1 || echo 0)"
              r23_check "s4-attempts-bounded" "$([ "$(cat "$r23_tmp/s4/remote.git/r23-push-count" 2>/dev/null)" = "3" ] && echo 1 || echo 0)"
              r23_check "s4-backoff-bounded" "$([ "$(cat "$r23_tmp/s4/sleeps" 2>/dev/null)" = "2" ] && echo 1 || echo 0)"
              r23_check "s4-remote-untouched" "$([ "$(r23_tip "$r23_tmp/s4")" = "$r23_s4_tip" ] && echo 1 || echo 0)"
            fi
            # Scenario 5: agent produced no log; the existing day file must be
            # kept (never replaced by a stub).
            if ! r23_seed "$r23_tmp/s5" "$r23_base_log" "state-seed
"; then
              r23_fail "s5-setup"
            else
              r23_s5_tip=$(r23_tip "$r23_tmp/s5")
              r23_session "$r23_tmp/s5" "$r23_base_log" "" "state-session
"
              r23_run "$r23_tmp/s5" 0 ""
              r23_s5_log=$(r23_show "$r23_tmp/s5" "logs/$R23_TODAY.md")
              r23_check "s5-rc" "$([ "$(r23_rc "$r23_tmp/s5")" = "0" ] && echo 1 || echo 0)"
              r23_check "s5-baseline-kept" "$(printf '%s' "$r23_s5_log" | grep -qF 'entry-baseline' && echo 1 || echo 0)"
              r23_check "s5-marker-once" "$([ "$(printf '%s' "$r23_s5_log" | grep -cF "$R23_MARKER")" = "1" ] && echo 1 || echo 0)"
              r23_check "s5-state" "$([ "$(r23_show "$r23_tmp/s5" STATE.md)" = "state-session" ] && echo 1 || echo 0)"
              r23_green_implies_pushed "$r23_tmp/s5" "$r23_s5_tip" "s5"
            fi
            # Scenario 6: rerun after this run's entry already landed; no
            # duplication, no new commit.
            if ! r23_seed "$r23_tmp/s6" "${r23_base_log}
## 05:00Z - this session

entry-session
${R23_MARKER}
" "state-session
"; then
              r23_fail "s6-setup"
            else
              r23_s6_tip=$(r23_tip "$r23_tmp/s6")
              r23_session "$r23_tmp/s6" "$r23_base_log" "$r23_session_entry" "state-session
"
              r23_run "$r23_tmp/s6" 0 ""
              r23_s6_log=$(r23_show "$r23_tmp/s6" "logs/$R23_TODAY.md")
              r23_check "s6-rc" "$([ "$(r23_rc "$r23_tmp/s6")" = "0" ] && echo 1 || echo 0)"
              r23_check "s6-entry-once" "$([ "$(printf '%s' "$r23_s6_log" | grep -cF 'entry-session')" = "1" ] && echo 1 || echo 0)"
              r23_check "s6-marker-once" "$([ "$(printf '%s' "$r23_s6_log" | grep -cF "$R23_MARKER")" = "1" ] && echo 1 || echo 0)"
              r23_check "s6-no-new-commit" "$([ "$(r23_tip "$r23_tmp/s6")" = "$r23_s6_tip" ] && echo 1 || echo 0)"
            fi
            # Scenario 7: nothing to publish; green no-op, no commit.
            if ! r23_seed "$r23_tmp/s7" "${r23_base_log}${R23_MARKER}
" "state-session
"; then
              r23_fail "s7-setup"
            else
              r23_s7_tip=$(r23_tip "$r23_tmp/s7")
              r23_session "$r23_tmp/s7" "$r23_base_log" "" "state-session
"
              r23_run "$r23_tmp/s7" 0 ""
              r23_s7_out=$(cat "$r23_tmp/s7/out" 2>/dev/null || true)
              r23_check "s7-rc" "$([ "$(r23_rc "$r23_tmp/s7")" = "0" ] && echo 1 || echo 0)"
              r23_check "s7-no-changes" "$(printf '%s' "$r23_s7_out" | grep -qF 'no memory changes' && echo 1 || echo 0)"
              r23_check "s7-no-new-commit" "$([ "$(r23_tip "$r23_tmp/s7")" = "$r23_s7_tip" ] && echo 1 || echo 0)"
            fi
            # Scenario 8 (review findings F1/F1b/F2): fresh maintainer/logs
            # bootstrap where the first push is rejected once. Every retry
            # takes the orphan path (the ref cannot exist until a push lands),
            # so a non-idempotent orphan re-checkout aborts attempt 2 under the
            # runner's bash -e (rc 128, no loud give-up) or blesses an
            # unpushed green in its soft variant. The fixed step must recover
            # on attempt 2 and actually publish the session entry.
            if ! r23_seed_empty "$r23_tmp/s8"; then
              r23_fail "s8-setup"
            else
              r23_s8_tip=$(r23_tip "$r23_tmp/s8")
              r23_session "$r23_tmp/s8" "$r23_base_log" "$r23_session_entry" "state-session
"
              r23_run "$r23_tmp/s8" 1 ""
              r23_s8_log=$(r23_show "$r23_tmp/s8" "logs/$R23_TODAY.md")
              r23_s8_out=$(cat "$r23_tmp/s8/out" 2>/dev/null || true)
              r23_check "s8-rc" "$([ "$(r23_rc "$r23_tmp/s8")" = "0" ] && echo 1 || echo 0)"
              r23_check "s8-attempt2" "$(printf '%s' "$r23_s8_out" | grep -qF 'attempt 2/3' && echo 1 || echo 0)"
              r23_check "s8-pushed-claim" "$(printf '%s' "$r23_s8_out" | grep -qF 'memory pushed to maintainer/logs' && echo 1 || echo 0)"
              r23_check "s8-entry-published" "$(printf '%s' "$r23_s8_log" | grep -qF 'entry-session' && echo 1 || echo 0)"
              r23_check "s8-marker-once" "$([ "$(printf '%s' "$r23_s8_log" | grep -cF "$R23_MARKER")" = "1" ] && echo 1 || echo 0)"
              r23_check "s8-state" "$([ "$(r23_show "$r23_tmp/s8" STATE.md)" = "state-session" ] && echo 1 || echo 0)"
              r23_check "s8-pushes" "$([ "$(cat "$r23_tmp/s8/remote.git/r23-push-count" 2>/dev/null)" = "2" ] && echo 1 || echo 0)"
              r23_check "s8-backoff" "$([ "$(cat "$r23_tmp/s8/sleeps" 2>/dev/null)" = "1" ] && echo 1 || echo 0)"
              r23_green_implies_pushed "$r23_tmp/s8" "$r23_s8_tip" "s8"
            fi
            # Scenario 9 (review finding F2b): every fetch fails while the
            # branch exists remotely. The unique-root orphan path must still
            # reach the full bounded cap loudly (a reused orphan name aborted
            # attempt 2 with rc 128 before the loud give-up under bash -e) and
            # the remote must stay untouched.
            if ! r23_seed "$r23_tmp/s9" "$r23_base_log" "state-seed
"; then
              r23_fail "s9-setup"
            else
              r23_s9_tip=$(r23_tip "$r23_tmp/s9")
              r23_session "$r23_tmp/s9" "$r23_base_log" "$r23_session_entry" "state-session
"
              r23_run "$r23_tmp/s9" 0 "" 99
              r23_s9_out=$(cat "$r23_tmp/s9/out" 2>/dev/null || true)
              r23_check "s9-rc-loud" "$([ "$(r23_rc "$r23_tmp/s9")" != "0" ] && echo 1 || echo 0)"
              r23_check "s9-fetch-warning" "$(printf '%s' "$r23_s9_out" | grep -qF 'maintainer/logs fetch failed' && echo 1 || echo 0)"
              r23_check "s9-error-marker" "$(printf '%s' "$r23_s9_out" | grep -qF 'maintainer memory publish failed after 3 attempts' && echo 1 || echo 0)"
              r23_check "s9-recovery-copy" "$(printf '%s' "$r23_s9_out" | grep -qF '(recoverable copy)' && echo 1 || echo 0)"
              r23_check "s9-recovery-content" "$(printf '%s' "$r23_s9_out" | grep -qF 'entry-session' && echo 1 || echo 0)"
              r23_check "s9-remote-untouched" "$([ "$(r23_tip "$r23_tmp/s9")" = "$r23_s9_tip" ] && echo 1 || echo 0)"
              r23_check "s9-no-pushed-claim" "$(printf '%s' "$r23_s9_out" | grep -qF 'memory pushed to maintainer/logs' && echo 0 || echo 1)"
              r23_check "s9-fetches-bounded" "$([ "$(cat "$r23_tmp/s9/fetches" 2>/dev/null)" = "3" ] && echo 1 || echo 0)"
            fi
            # Scenario 10 (review finding F1): the full cap on the bootstrap
            # orphan path. With a reused orphan name this aborted at attempt 2
            # (rc 128) without the loud give-up; the fixed step must reach all
            # 3 attempts and exit loud red with the recovery bundle, never
            # creating the remote branch.
            if ! r23_seed_empty "$r23_tmp/s10"; then
              r23_fail "s10-setup"
            else
              r23_session "$r23_tmp/s10" "$r23_base_log" "$r23_session_entry" "state-session
"
              r23_run "$r23_tmp/s10" 99 ""
              r23_s10_out=$(cat "$r23_tmp/s10/out" 2>/dev/null || true)
              r23_check "s10-rc-loud" "$([ "$(r23_rc "$r23_tmp/s10")" != "0" ] && echo 1 || echo 0)"
              r23_check "s10-error-marker" "$(printf '%s' "$r23_s10_out" | grep -qF 'maintainer memory publish failed after 3 attempts' && echo 1 || echo 0)"
              r23_check "s10-recovery-copy" "$(printf '%s' "$r23_s10_out" | grep -qF '(recoverable copy)' && echo 1 || echo 0)"
              r23_check "s10-recovery-content" "$(printf '%s' "$r23_s10_out" | grep -qF 'entry-session' && echo 1 || echo 0)"
              r23_check "s10-attempts" "$([ "$(cat "$r23_tmp/s10/remote.git/r23-push-count" 2>/dev/null)" = "3" ] && echo 1 || echo 0)"
              r23_check "s10-backoffs" "$([ "$(cat "$r23_tmp/s10/sleeps" 2>/dev/null)" = "2" ] && echo 1 || echo 0)"
              r23_check "s10-remote-absent" "$([ -z "$(r23_tip "$r23_tmp/s10")" ] && echo 1 || echo 0)"
              r23_check "s10-no-pushed-claim" "$(printf '%s' "$r23_s10_out" | grep -qF 'memory pushed to maintainer/logs' && echo 0 || echo 1)"
            fi
          fi
        fi
      fi
      rm -rf "$r23_tmp"
    fi
  fi
fi
if [ -z "$r23_bad" ]; then
  check "R23" "maintainer memory publish is a bounded 3-attempt fetch-recompose-push loop with keep-both day-log semantics (session delta isolated against the materialization baseline and appended, never a whole-file overwrite; STATE.md last-writer-wins), a loud never-quiet publish path, a loud red give-up that prints the recoverable bundle, idempotent marker handling, per-path memory staging, and a retry-safe bootstrap (unique unborn root per attempt; an empty bootstrap composition never concludes green), all enforced by a functional sandbox that executes the real extracted step under the runner's bash -e shell against a local bare-repo origin with injected push rejections and concurrent tip advance (clean push, race-recovery preserving the concurrent entry, entry-only-violation recovery, persistent-rejection bound 3 attempts / 2 backoffs / loud exit / untouched remote, no-log keep-existing, already-marked no-duplication, no-changes no-commit, bootstrap recovery after one rejected push, bootstrap persistent rejection reaching the full cap, persistent fetch failure on an existing branch via a proven git shim reaching the loud cap with the remote untouched, and every publishing scenario asserting that a green publish claim advanced the remote tip) (issue #647, review findings F1/F1b/F2)" "ok"
else
  check "R23" "maintainer memory publish guard missing:${r23_bad} (issue #647: a single-shot quiet rebase fallback silently lost a whole memory session to a concurrent push)" "bad"
fi

# [R24] Per-OS arm cap headroom and partial-report salvage (issue #692): the
# macOS per-OS arm died at its 90-minute agent-step cap with zero artifacts
# (run 39170578536: 5 of 9 planned passes still open, no decision file, the
# fail-closed verify red with `missing contract artifact(s): decision-file
# findings-report`, and no partial report survived the runner). The
# fail-closed gate itself behaved correctly; the defect was the cap shape
# (agent 90 under job 120 leaves the chain at the wire) plus an
# all-or-nothing artifact contract that lost every completed pass. Properties:
#   1. every per-OS arm's agent-step cap leaves at least 20 minutes of
#      headroom under its job cap, so the post-agent contract steps (verify,
#      salvage, findings post, decision forward) still run after a worst-case
#      agent cap death; the Linux arm keeps its measured 90-minute cap (it
#      completes in about 33 minutes), while macOS and Windows must carry at
#      least 120 under at least 140 job minutes;
#   2. the macOS and Windows arms carry exactly one salvage step (its name
#      unique across the whole workflow file), placed after the fail-closed
#      verify step and gated on that verify failing, whose run body's command
#      lines are pinned line-for-line: skip when the decision file exists
#      (verify then failed only over the report itself, so there is nothing
#      to salvage) or no partial report exists, compose a provenance banner
#      plus the partial report into /tmp/random-lab-findings-salvage.md, and
#      publish it through the strict shared poster with github.token (never
#      the owner PAT) so only a signed, bot-authored, re-fetchable report is
#      ever published. Comments and blank lines are free in the body, but any
#      extra command (an early exit, a second publication, a raw gh call)
#      breaks the exact-body match, and step-level YAML overrides
#      (continue-on-error, shell, working-directory) are banned.
# The poster's runtime behavior is functionally tested by R17; this rule pins
# the wiring and the run body verbatim so a removed step, a widened gate, an
# inverted decision-file guard, a dropped banner, a PAT swap, or a decoy copy
# of the step under a matching name cannot pass silently.
# Review-gated residual boundary: a renamed copy of the salvage step placed
# in another job is not scanned by name (same boundary class as R17).
r24_bad=""
r24_debug=""
if [ ! -f "$PEROS_WF" ]; then
  r24_bad=" ${PEROS_WF}(missing)"
else
  for r24_os in linux macos windows; do
    r24_block=$(peros_arm_block "test-${r24_os}")
    case "$r24_os" in
      linux)   r24_tag="Linux" ;;
      macos)   r24_tag="macOS" ;;
      windows) r24_tag="Windows" ;;
    esac
    if [ -z "$r24_block" ]; then
      r24_bad="${r24_bad} arm-${r24_os}(job-missing)"
      continue
    fi
    r24_job_cap=$(printf '%s\n' "$r24_block" | sed -n 's/^    timeout-minutes:[[:space:]]*//p' | head -n1)
    r24_agent_cap=$(printf '%s\n' "$r24_block" | awk -v tag="      - name: Run ${r24_tag} tester agent" '
      $0 == tag { s=1; next }
      s && $0 ~ /^      - / { exit }
      s && $0 ~ /^        timeout-minutes:/ { sub(/^        timeout-minutes:[[:space:]]*/, ""); print; exit }')
    printf '%s' "$r24_job_cap" | grep -qE '^[0-9]+$' || r24_bad="${r24_bad} arm-${r24_os}(job-cap-invalid='${r24_job_cap}')"
    printf '%s' "$r24_agent_cap" | grep -qE '^[0-9]+$' || r24_bad="${r24_bad} arm-${r24_os}(agent-cap-invalid='${r24_agent_cap}')"
    if printf '%s' "$r24_job_cap" | grep -qE '^[0-9]+$' && printf '%s' "$r24_agent_cap" | grep -qE '^[0-9]+$'; then
      r24_agent_min=90
      [ "$r24_os" = "linux" ] || r24_agent_min=120
      [ "$r24_agent_cap" -ge "$r24_agent_min" ] || r24_bad="${r24_bad} arm-${r24_os}(agent-cap=${r24_agent_cap},want>=${r24_agent_min})"
      [ "$r24_job_cap" -ge $((r24_agent_cap + 20)) ] || r24_bad="${r24_bad} arm-${r24_os}(headroom=$((r24_job_cap - r24_agent_cap))min,want>=20)"
    fi
    [ "$r24_os" = "linux" ] && continue
    r24_salv_name="      - name: Salvage partial ${r24_tag} findings report after a crashed or capped agent run (issue #692)"
    r24_salv_count=$(printf '%s\n' "$r24_block" | grep -cF -- "$r24_salv_name" || true)
    [ "$r24_salv_count" -eq 1 ] || r24_bad="${r24_bad} arm-${r24_os}(salvage-step-count=${r24_salv_count},want=1)"
    r24_salv_file_count=$(grep -cF -- "$r24_salv_name" "$PEROS_WF" || true)
    [ "$r24_salv_file_count" -eq 1 ] || r24_bad="${r24_bad} arm-${r24_os}(salvage-name-file-count=${r24_salv_file_count},want=1)"
    r24_salv=$(printf '%s\n' "$r24_block" | awk -v tag="$r24_salv_name" '
      $0 == tag { s=1; next }
      s && $0 ~ /^      - / { exit }
      s { print }')
    if [ -z "$r24_salv" ]; then
      r24_bad="${r24_bad} arm-${r24_os}(salvage-step-body-missing)"
    else
      r24_salv_body=$(printf '%s\n' "$r24_salv" | sed 's/^[[:space:]]*//')
      printf '%s\n' "$r24_salv_body" | grep -qxF 'id: salvage' || r24_bad="${r24_bad} arm-${r24_os}(salvage-no-exact-id)"
      printf '%s\n' "$r24_salv_body" | grep -qxF "if: always() && steps.actor_gate.outputs.run == 'true' && steps.verify-test.outcome == 'failure'" || r24_bad="${r24_bad} arm-${r24_os}(salvage-gate-not-exact)"
      printf '%s\n' "$r24_salv_body" | grep -qxF 'GH_TOKEN: ${{ github.token }}' || r24_bad="${r24_bad} arm-${r24_os}(salvage-no-github-token-env)"
      printf '%s\n' "$r24_salv_body" | grep -qxF 'TARGET: ${{ github.event.issue.number }}' || r24_bad="${r24_bad} arm-${r24_os}(salvage-no-target-env)"
      printf '%s\n' "$r24_salv" | grep -qF 'OPENCODE_PAT' && r24_bad="${r24_bad} arm-${r24_os}(salvage-carries-owner-pat)"
      printf '%s\n' "$r24_salv" | grep -qE '^[[:space:]]*(continue-on-error|shell|working-directory):' && r24_bad="${r24_bad} arm-${r24_os}(salvage-yaml-key-override)"
      r24_salv_run=$(printf '%s\n' "$r24_salv" | awk '
        /^        run: \|$/ { s=1; next }
        s { print }')
      r24_salv_cmds=$(printf '%s\n' "$r24_salv_run" | sed 's/^[[:space:]]*//' | grep -vE '^(#.*)?$' || true)
      r24_expected=$(cat <<'R24EOF'
if [ -f /tmp/random-lab-decision.json ]; then
echo "Decision file present; nothing to salvage on this crashed-run path."
exit 0
fi
if [ ! -s /tmp/random-lab-findings.md ]; then
echo "No partial findings report on disk; nothing to salvage."
exit 0
fi
{
printf '%s\n' "> **Salvaged partial findings report (issue #692).** The @TAG@ tester agent step"
printf '%s\n' "> ended without writing its decision artifact, so this arm failed closed and the"
printf '%s\n' "> workflow published the partial report it left behind. Sections may be incomplete."
printf '%s\n\n' "> Failing run: ${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
cat /tmp/random-lab-findings.md
} > /tmp/random-lab-findings-salvage.md
if bash .github/scripts/post-peros-findings.sh @OS@ "$TARGET" /tmp/random-lab-findings-salvage.md; then
echo "Salvaged partial @TAG@ findings report; the run still concludes red."
else
echo "::warning::Partial @TAG@ findings report exists but failed the strict poster checks (not signed or not verifiable); nothing was published."
fi
R24EOF
)
      r24_expected=$(printf '%s\n' "$r24_expected" | sed -e "s/@TAG@/${r24_tag}/g" -e "s/@OS@/${r24_os}/g")
      if [ "$r24_salv_cmds" != "$r24_expected" ]; then
        r24_bad="${r24_bad} arm-${r24_os}(salvage-body-not-exact)"
        r24_debug="${r24_debug}
[arm-${r24_os}] salvage body diff (expected vs actual):
$(diff <(printf '%s\n' "$r24_expected") <(printf '%s\n' "$r24_salv_cmds") | head -n 24)"
      fi
    fi
    r24_verify_line=$(printf '%s\n' "$r24_block" | grep -nF -- "      - name: Verify test decided, else fail closed" | head -n1 | cut -d: -f1)
    r24_salv_line=$(printf '%s\n' "$r24_block" | grep -nF -- "$r24_salv_name" | head -n1 | cut -d: -f1)
    if [ -z "$r24_verify_line" ] || [ -z "$r24_salv_line" ] || [ "$r24_salv_line" -le "$r24_verify_line" ]; then
      r24_bad="${r24_bad} arm-${r24_os}(salvage-not-after-verify)"
    fi
  done
fi
[ -n "$r24_debug" ] && printf '%s\n' "$r24_debug"
if [ -z "$r24_bad" ]; then
  check "R24" "every per-OS arm's agent cap leaves >= 20 minutes under its job cap (macOS/Windows agent >= 120 under job >= 140, Linux measured 90), and the macOS/Windows arms carry one post-verify salvage step (name unique file-wide, no YAML-key overrides) whose command lines exactly match the pinned body that guards on the decision file and partial report, composes a provenance banner plus the signed partial report into /tmp/random-lab-findings-salvage.md, and publishes it through the strict shared poster with github.token (issue #692)" "ok"
else
  check "R24" "per-OS cap headroom or partial-report salvage missing:${r24_bad} (issue #692: a 90-minute agent cap under a 120-minute job left no artifacts after a cap death)" "bad"
fi

# [R25] Lab and fix agent cap headroom (issue #701): after issue #692 fixed
# the per-OS arms, the lab and fix arms still ran near-wire caps and lost
# near-complete work three times in one morning. Lab round 18 on #654 (run
# 39208513680) and round 14 on #670 (run 39212805887) both died at the
# 90-minute lab agent cap under the 120-minute job with no decision file, and
# three consecutive fix sessions on #693 (runs 39203327749, 39203442325,
# 39208619311) died at the 60-minute fix agent cap with the edits nearly
# complete and unpushed; in every case the fail-closed verify correctly
# refused to publish partial state and the runner discarded the session.
# Properties:
#   1. the lab arm's agent-step cap is at least 150 minutes under a job cap
#      of at least 180 minutes;
#   2. the fix arm's agent-step cap is at least 120 minutes under a job cap
#      of at least 180 minutes;
#   3. each agent step leaves at least 20 minutes of headroom under its job
#      cap, so the post-agent chain (verify, strip, push, forward) still runs
#      after a worst-case cap death.
# The rule extracts the real job block and the canonical step block from
# each workflow file and fails loudly when a cap is missing, non-numeric, or
# lowered. Escape classes found in adversarial verification are closed:
#   - the job key must be unique in its file (a duplicate job key decoy is
#     already invalid YAML for Actions, but the check keeps the extraction
#     truthful);
#   - the canonical step name must be unique in its file, and inside the job
#     it must be the unique `uses: ./.github/actions/opencode-run` invocation
#     (matched as the whole YAML value in every standard step spelling: own
#     line, inline sequence `- uses:`, and `uses :` with whitespace before
#     the colon, so a renamed real agent step plus a dummy canonical-named
#     step with a compliant timeout, a switched action reference, or a
#     second shadow runner step cannot satisfy the rule; decoy-step and
#     inline-spelling bypasses found in verification and the Tester review
#     of PR #702);
#   - only a canonical decimal literal with no leading zeros and at most
#     four digits is accepted, so quoted/anchor forms and octal-looking
#     `0150` cannot pass as a 150;
#   - the job-block terminator matches the full Actions job-id charset, so a
#     following job with an uppercase id cannot be swallowed into the block;
#   - an optional trailing YAML comment after the digits is tolerated (the
#     established style keeps comments above the key, but this costs
#     nothing).
r25_bad=""
wf_job_block() {
  awk -v job="  $2:" '
    $0 == job { inblk = 1 }
    inblk && /^  [A-Za-z0-9_-]+:$/ && $0 != job { exit }
    inblk { print }
  ' "$1" 2>/dev/null || true
}
r25_check_arm() {
  local wf="$1" job="$2" step="$3" agent_min="$4" job_min="$5" tag="$6"
  local block step_block job_cap agent_cap step_count key_count uses_count
  if [ ! -f "$wf" ]; then
    r25_bad="${r25_bad} ${tag}(file-missing:${wf})"
    return
  fi
  key_count=$(grep -cxF -- "  ${job}:" "$wf" || true)
  [ "$key_count" -eq 1 ] || r25_bad="${r25_bad} ${tag}(job-key-count=${key_count},want=1)"
  block=$(wf_job_block "$wf" "$job")
  if [ -z "$block" ]; then
    r25_bad="${r25_bad} ${tag}(job-missing:${job})"
    return
  fi
  step_count=$(grep -cF -- "      - name: ${step}" "$wf" || true)
  [ "$step_count" -eq 1 ] || r25_bad="${r25_bad} ${tag}(agent-step-count=${step_count},want=1)"
  uses_count=$(printf '%s\n' "$block" | grep -cE '^[[:space:]]*(-[[:space:]]+)?uses[[:space:]]*:[[:space:]]*\./\.github/actions/opencode-run[[:space:]]*(#.*)?$' || true)
  [ "$uses_count" -eq 1 ] || r25_bad="${r25_bad} ${tag}(agent-uses-count=${uses_count},want=1)"
  step_block=$(printf '%s\n' "$block" | awk -v tag="      - name: ${step}" '
    $0 == tag { s=1; print; next }
    s && $0 ~ /^      - / { exit }
    s { print }')
  printf '%s\n' "$step_block" | grep -qE '^[[:space:]]*(-[[:space:]]+)?uses[[:space:]]*:[[:space:]]*\./\.github/actions/opencode-run[[:space:]]*(#.*)?$' || r25_bad="${r25_bad} ${tag}(canonical-step-not-the-runner)"
  job_cap=$(printf '%s\n' "$block" | sed -n 's/^    timeout-minutes:[[:space:]]*\([0-9][0-9]*\)[[:space:]]*\(#.*\)\{0,1\}$/\1/p' | head -n1)
  agent_cap=$(printf '%s\n' "$step_block" | awk '
    $0 ~ /^        timeout-minutes:/ {
      sub(/^        timeout-minutes:[[:space:]]*/, "")
      sub(/[[:space:]]*#.*$/, "")
      print
      exit
    }')
  printf '%s' "$job_cap" | grep -qE '^[1-9][0-9]{0,3}$' || r25_bad="${r25_bad} ${tag}(job-cap-invalid='${job_cap:-missing}')"
  printf '%s' "$agent_cap" | grep -qE '^[1-9][0-9]{0,3}$' || r25_bad="${r25_bad} ${tag}(agent-cap-invalid='${agent_cap:-missing}')"
  if printf '%s' "$job_cap" | grep -qE '^[1-9][0-9]{0,3}$' && printf '%s' "$agent_cap" | grep -qE '^[1-9][0-9]{0,3}$'; then
    [ "$agent_cap" -ge "$agent_min" ] || r25_bad="${r25_bad} ${tag}(agent-cap=${agent_cap},want>=${agent_min})"
    [ "$job_cap" -ge "$job_min" ] || r25_bad="${r25_bad} ${tag}(job-cap=${job_cap},want>=${job_min})"
    [ "$job_cap" -ge $((agent_cap + 20)) ] || r25_bad="${r25_bad} ${tag}(headroom=$((job_cap - agent_cap))min,want>=20)"
  fi
}
OPENCODE_WF="$(dirname "$WF")/opencode.yml"
if [ ! -f "$OPENCODE_WF" ] && [ -f ".github/workflows/opencode.yml" ]; then
  OPENCODE_WF=".github/workflows/opencode.yml"
fi
r25_check_arm "$LAB_WF" "lab" "Run opencode lab engineer agent" 150 180 "lab"
r25_check_arm "$OPENCODE_WF" "fix" "Run opencode fix agent" 120 180 "fix"
if [ -z "$r25_bad" ]; then
  check "R25" "the lab agent cap is >= 150 minutes under a job cap >= 180 and the fix agent cap is >= 120 under a job cap >= 180, each leaving >= 20 minutes of post-agent headroom for the verify/strip/push/forward chain; the job key is unique, the canonical agent step is unique file-wide and is the job's single opencode-run invocation, and caps are canonical decimal literals (no quotes, anchors, or leading zeros) (issue #701)" "ok"
else
  check "R25" "lab/fix cap headroom missing:${r25_bad} (issue #701: a 90-minute lab cap under 120 and a 60-minute fix cap under 120 discarded near-complete sessions at the wire)" "bad"
fi

# [R26] Create-issue dedupe guard (issue #668): Maintainer concurrency is
# per-target, so two ticks on different PRs can decide on the same global
# finding at once and each created its own issue: #665 was filed at
# 15:53:13Z by run 39141891238 (the 15:45Z tick on PR #654) and #666 at
# 15:55:43Z by the concurrent run 39141877509 (the tick on PR #664), before
# either tick could see the other's issue; the duplicate cost a self-triage
# run and was closed as a duplicate. The hardcoded create_issue handler in
# maintainer.yml now queries open issues before every `gh issue create`,
# compares titles under a deterministic normalization (casefold,
# non-alphanumerics to single spaces, whitespace collapsed), skips creation
# when an open issue carries the identical normalized title, prints the
# existing issue number, and self-triages the matched issue so the finding
# is never left untriaged. Properties pinned here:
#   1. query-before-create ordering inside the handler: the open-issue
#      lookup line precedes the `gh issue create` call, and the exact
#      control-flow lines are pinned (review finding F2): the loader
#      invocation (`loaded = _load_open_issue_titles()`), the `if existing:`
#      skip guard, and the skip branch's terminating `continue` between the
#      skip print and the create call; the lazy-load guard through the skip
#      guard are additionally pinned as five CONSECUTIVE code lines with
#      exact-trim matching (review finding F4: run-state/input-shape gates
#      such as `if len(body_text) > 1: existing = None` or
#      `if sweep_failed: existing = None` inserted in the chain passed the
#      first-round pins while disabling the dedupe for ordinary production
#      inputs); the skip branch itself is pinned as a six-consecutive-line
#      shape (the skip print, the in-run check, the in-run print, the
#      `else:`, the triage dispatch, and the terminating `continue`, which
#      must land immediately after the triage line), so a conditional
#      continue keyed on a dimension the fixtures never vary (a first-class
#      decision action such as `ping`, or `"\n\n" in body_text`) can no
#      longer pass the audit while leaking every match into
#      `gh issue create` behind a loud-looking skip line (review finding
#      F10); and the whole `_load_open_issue_titles()` body, from its def
#      line through `return index`, is pinned as exact trimmed text with
#      EXACTLY ONE def occurrence and exactly two loader-name occurrences in
#      the block, so a cross-dimensional conjunction gate on individually
#      in-envelope dimensions (`if len(items) >= 5 and len(decisions) == 2:
#      return {}`, whose conjuncts no single fixture held together), its
#      substitution variant (appending `and not (len(items) >= 5 and
#      len(decisions) == 2)` to the isinstance guard, adding no line), and
#      its conditional def-shadowing variant all fail structurally, not
#      only behaviorally (review finding F9 plus the class-closing
#      substitution and shadowing probes); the whole setup region ABOVE
#      the main loop is separately pinned as canonical trimmed text from
#      the block's first line through the line before `for d in decisions:`
#      (review finding F12: a gate keyed on the LEADING decision action,
#      such as `if decisions and decisions[0].get("action") == "ping":`
#      paired with `globals()["_open_issue_titles"] = {}`, a
#      `_norm_issue_title = lambda s: ""` rebind, or a decision-drop
#      comprehension, passed the whole matrix while disabling the dedupe on
#      ordinary production ticks, because the preamble window starts AT the
#      loop head, the sub-region pins (norm body, loader body) cover only
#      their own spans, and only s17 (sweep) and s20 (review) ever led a
#      fixture decision list), and the leading-action skip scenarios (s28
#      ping-first, s29 ideate-first, s30 lab-first) kill the family
#      behaviorally as well; the eleven code lines
#      immediately preceding that chain (loop head, loop-body guard,
#      action/target extraction, branch opener, title/body reads, the
#      create_issue guard, and the ntitle computation) are pinned as an
#      exact trimmed window, so no probe can be interposed between the
#      branch opener and the chain (adversarial escape hunt M1: an inserted
#      `gh search issues` probe is inert under the mock, whose unmodeled
#      subcommands exit 64, but succeeds against real gh and blanks ntitle
#      on every production run), every top-level `gh` command the whole
#      functional matrix executes is checked against the pristine allowlist
#      (issue/workflow/api/pr) so an inserted probe call fails loudly
#      wherever in the block it sits (escape hunt M1), and the index
#      sentinel stays literally `_open_issue_titles = None` by exact-text
#      pin, rejecting any conditional replacement that keeps the
#      assignment count and pre-seeds the index under production conditions
#      (escape hunt, init-replacement class); structurally, the run-local
#      index is
#      assigned only by its initialization and the single fail-open line and
#      accessed only via .get/.setdefault (adversarial verification finding:
#      an inserted env-conditional re-assignment or a .clear()/.update()/
#      .pop() sabotage now has to change the block's structure, not just its
#      runtime condition), and subscript writes/deletes of the index
#      (`_open_issue_titles[ntitle] = ...`, `del _open_issue_titles[...]`)
#      are rejected because they evade the bare-assignment and
#      attribute-use pins (review finding F5);
#   2. the skip/triage path also precedes creation and is loud: the skip
#      print carries the existing number, the matched issue is self-triaged
#      with a dedupe reason, and a title already created earlier in the same
#      run never dispatches a second triage;
#   3. the created path is loud and records the new number in the run-local
#      index so an in-run duplicate title is caught without a second query;
#   4. the query is fail-open to creation with a loud ::error:: on both a
#      nonzero query and unparseable JSON: a registry hiccup must never drop
#      a decision (the guard shrinks the concurrent-tick race window from
#      minutes to milliseconds; it is deliberately not a suppression layer);
#   5. functional fixtures execute the REAL extracted normalization function
#      and pin its semantics: case fold (including the Unicode pair
#      `Stra\u00dfe Fix` / `strasse fix`, so a `.lower()` swap fails),
#      punctuation/hyphen/underscore/whitespace collapse all match,
#      digit-bearing titles that differ only in digits stay NON-matching (so
#      a digit-stripping regex fails), `foo bar` vs `foobar` stays
#      NON-matching (space placement is real, so a `"".join` variant fails),
#      and a >80-char pair sharing a >80-char prefix and differing only in
#      the final word stays NON-matching (so a `[:60]`/`[:80]` truncation or
#      `len > 80` fragment gate fails); the extractor additionally requires
#      EXACTLY ONE `def _norm_issue_title` in the block (review finding F7:
#      a shadowing second definition would leave the fixture matrix testing
#      dead code, so the count is pinned), and the function body from its
#      def line through its return is pinned as exact trimmed text, so an
#      inserted context-conditional line or a replaced return expression
#      that stays semantically green under the sandbox but blanks titles in
#      production fails structurally (escape-hunt near-miss closure: the
#      demonstrated variants were already caught behaviorally by the
#      re-only fixture namespace raising NameError on os references, and
#      the exact body now rejects the whole class precisely); distinct
#      titles do not match, and
#      (kept as the documented conservative scope) the two 2026-10-18
#      paraphrase titles #665/#666 stay NON-matching, because a fuzzy
#      paraphrase matcher that suppresses a genuinely distinct finding would
#      lose work, which is worse than a duplicate issue (tester finding B1
#      plus adversarial escape E3);
#   6. a functional sandbox (review finding F2: the first-round guard was
#      string-presence plus file-wide `head -1` line ordering only, so
#      `loaded = {}`, `if False:`, or a removed skip-branch `continue` left
#      the dedupe dead while R26 reported 24/0) extracts the REAL run block
#      of the unique executing handler step, dedents it with the common
#      run-block indent (the embedded Python heredoc delimiter must land in
#      column 0), and executes it under the runner's `bash -e` shell against
#      an executable mock `gh` (interception proven before the matrix; the
#      handler environment is built from scratch with `env -i` so NO ambient
#      runner variable reaches it, credentials are fully absent, the
#      non-credential Actions context is production-shaped across the
#      standard variables (repository, owner, workflow, job, run id, event
#      name, actor, SHA, ref, ref name/type, server/API/GraphQL URLs,
#      workspace, RUNNER_OS/ARCH, CI), and the mock's
#      state paths are baked into the mock script, making detection of
#      env-keyed gates independent of the ambient CI environment and
#      closing the demonstrated env-sensing backdoor class for the seeded
#      set (escape hunt M5: a gate on SHA presence is inert only when SHA
#      is unseeded, so seeding it makes the gate fire under audit; the
#      event name is exercised for both production trigger shapes, schedule
#      and workflow_dispatch; context variables outside the seeded set
#      stay a documented residual); sandbox outside
#      the repo, per-scenario timeout) across: fresh-create (exactly one query,
#      one create on the bot token, one triage dispatch on the owner PAT for
#      the new number), FIVE normalized-match skip+triage scenarios against
#      newest-first five-issue lists where every entry is a scenario match,
#      sitting at index 0 (#670, s9; the 97-char title and the
#      concurrent-duplicate shape, so `items[1:]`/`items[-2:]` offsets and
#      entry-property length gates at or below the fixture envelope fall),
#      index 1 (#669, s8), index 2 (#668, s6), index 3 (#665, s2) and index
#      4 (#663, s7, the oldest entry, so `items[:k]` prefix truncations
#      fall), zero creates, one dispatch on the matched open issue, loud
#      skip line, so a cardinality gate at or below the fixture size, any
#      proper prefix truncation `items[:1]` through `items[:4]`, an
#      `items[1:]`/`items[-2:]` offset, an index/issue-number parity gate,
#      or an order-dependent `all(n >= v)` index rebuild (the newest-first
#      order production serves) fails at least one scenario (tester finding
#      B3 plus adversarial escapes E1/E4/L06/L07/P1/P2 and the round-3
#      order class), in-run duplicate against a non-empty open index (one
#      create, no second dispatch, one query; extended to THREE identical
#      decisions so a subscript-write/delete sabotage of the run-local index
#      is caught behaviorally as well, review finding F5), query-failure
#      fail-open
#      (loud ::error::, create proceeds), bad-JSON fail-open, a
#      THREE-decision scenario with the matching create LAST after two
#      successful creates (asserting exactly 2 creates and 3 dispatches, so
#      a decision-count or created-count gate creates a third issue and
#      fails), a matching decision carrying `target` (a target or
#      extra-key gate), and a mixed scenario with a failed sweep first and a
#      successfully posted comment second before the matching create
#      (sweep_failed and posted gates; the failed sweep also drives the
#      handler's loud SystemExit(1), asserted as rc 1), with realistic
#      multi-line >200-char bodies in every other scenario decision (a
#      body-length gate; the deliberate probes s21/s22/s24/s27 carry the
#      short, two-line, absent, and paragraph-break shapes), so the whole
#      inserted-gate family of review finding F4 is
#      caught behaviorally even when a decoy satisfies the adjacency pin,
#      and (review finding F8: a loader-internal `if len(decisions) == 2:
#      return {}` killed the dedupe on every two-decision tick while the
#      round-4 fixtures, whose decision counts were only 1 and 3, stayed
#      green) a decision-count sweep of ONE through FOUR decisions with the
#      matching create LAST, each asserting zero duplicates (a 2-decision
#      scenario asserting exactly 1 create and 2 dispatches, the existing
#      3-decision scenario asserting 2 creates and 3 dispatches, and a
#      4-decision scenario asserting 3 creates and 4 dispatches, so every
#      `== k` and `<=`/`>=` count gate inside 1-4 fires on at least one
#      scenario and the created-count envelope extends to 3; both the
#      2-decision and the 4-decision scenario run against FIVE-entry lists,
#      so a conjunction of an in-envelope list size with an in-envelope
#      decision count `len(items) >= 5 and len(decisions) == 2` cannot hide
#      behind fixtures whose two dimensions never held together, the exact
#      escape review finding F9 demonstrated), a COUNT SWEEP of decision
#      counts 5 through 23, each a five-entry list with the match at a
#      middle index and k-1 leading FRESH create_issue decisions so both
#      dimensions sweep together (k decisions with k-1 creates resolved
#      before the match), every scenario asserting the exact create count
#      (k-1), the exact dispatch count (k: one triage per created issue
#      plus the matched issue), the loud skip line, and rc 0, so an exact
#      gate on any count the earlier fixtures missed (`if len(decisions) ==
#      20: return {}`, demonstrated green at 24/0 by the escape hunt M6, or
#      a `len(_created_issue_numbers) >= 4` bound) now fires under audit and
#      fails the exact-count assertions (adversarial escape hunt M6 plus
#      its created-count sibling), a mixed
#      action context carrying ALL of the handler's action keywords
#      (review, test, test-linux, test-macos, test-windows, eval, continue,
#      build, auditor, curate, architect, research, design, design-ux,
#      design-visual, design-motion, lab, recover, fix, create_pr, plus
#      ping-with-target and ideate, the two first-class decision actions
#      whose absence from the fixture let a conditional skip-branch
#      continue keyed on `ping` pass the audit, review finding F10)
#      alongside the matching create LAST (F8 plus its independent escape
#      hunt: any action-keyword gate, including the create_pr sibling of
#      create_issue, breaks the skip assertion), absent-body, 23-char
#      short-single-line, and two-line body skip scenarios (F8:
#      `not body_text` and every `len(body_text) < N` with N >= 1,
#      newline-presence, line-count, and short-length predicates within the
#      absent-body to long-three-line envelope), a paragraph-break
#      blank-line-bearing body skip scenario (review finding F10's second
#      demonstrated key, `"\n\n" in body_text`, fires there while staying
#      green elsewhere), a matching create that is
#      NOT last with a trailing `lab` action (escape hunt: last-position
#      action predicates), a 147-char long-title skip scenario (escape
#      hunt: title-length predicates up to 146, lifting the match-required
#      title envelope above s9's 97 and s12's 98 characters), and a
#      workflow_dispatch-event skip scenario (the round-4 observation's
#      demonstrated event-name gate; schedule remains the default shape),
#      three leading-action skip scenarios with the matching create LAST
#      (ping-first with target, ideate-first, lab-first: 0 creates, exactly
#      one triage on the match, the loud skip line, and the leading
#      action's own inert/comment behavior asserted, so any gate keyed on
#      the leading decision action breaks the assertions; review finding
#      F12), THREE
#      digit-collision create scenarios ("Fix bug 42"/"Fix bug 43", "Patch
#      v10"/"Patch v1", "Worker v1"/"Worker v10": pristine creates, while a
#      digit strip (full-run at one or both sites, zero-favored at either
#      side) maps the pair to one string and falsely skips), a space-removal
#      collision create
#      scenario ("Swift 6 migration" vs "Swift6 migration": pristine
#      creates, a consistent both-sites `.replace(" ", "")` after
#      normalization falsely skips), one long-title collision create
#      scenario (distinct long titles differing only in their final
#      character: pristine creates, while a consistent both-sites
#      truncation merges them under EVERY proper cutoff and falsely skips;
#      single-site truncations are killed by the identical-pair s9), and a
#      SIZE SWEEP of list sizes 1 through 8 whose last (oldest) entry is
#      the match with three-character, digit-bearing, single-word, and
#      x-bearing titles cycling, so a `len(index) == N` equality gate, an
#      `items[:k]` truncation with k < 8, a number/length/word-count or
#      charset per-entry gate at or below the sweep envelope, and any
#      single-site digit strip all fail at least one size, so no plain
#      one-line control-flow mutation (in the loader chain, inside the
#      loader, in the skip branch, in the call-site preamble, or as an
#      inserted probe call, whose demonstrably escaping members the
#      structural, allowlist, and exact-text pins above now reject
#      outright), no demonstrated
#      fixture-coverage gap, or demonstrated env-sensing backdoor on a
#      seeded context variable
#      can conclude green while the dedupe is disabled. The mock requires
#      the query argv to equal the pinned invocation TOKEN FOR TOKEN
#      (tester finding B2 plus adversarial escapes E2/Q4/Q5): the argument
#      count and every positional element are compared, so a repeated
#      scalar flag (pflag last-wins), an added `--search` filter, a
#      reorder, or merged/split tokens (which a lossy space-joined string
#      comparison could not distinguish) empties the served fixture list, a
#      tamper hidden behind a decoy comment changes real behavior and fails
#      the skip assertions, and the exact query literal is additionally
#      pinned inside the extracted block. The mock additionally serves the
#      `gh issue list` fixture with the trailing newline real gh emits
#      (review finding F6: a loader gate on `r.stdout.endswith("\n")`
#      passed against a newline-less fixture while disabling the dedupe in
#      production) and an `api` subcommand for the mixed scenario's comment
#      post. Deliberate identity fingerprinting
#      on values no sandbox can avoid (fixture token strings, sandbox paths,
#      per-title charset gates), call-site character-class transformations
#      outside the tested digit (full-run and zero-favored), space-removal,
#      and truncation classes, and truncation/cardinality/number/length/
#      word-count thresholds ABOVE the built fixture envelope (eight list
#      entries, the 147-char longest match-required title, the
#      absent-body to long-three-line body shapes, exact decision- or
#      created-count gates above the swept envelope: counts 1-23 are every
#      one exercised (1-4 and 23 by dedicated scenarios, 5-22 by the count
#      sweep) and created counts 0-22 before a match are swept, so only
#      higher thresholds slip through), body-content
#      predicates keyed on prose absent from every fixture body, and
#      non-credential context values outside the seeded/exercised shapes,
#      such as unseeded context variables, event names beyond the
#      schedule/workflow_dispatch pair, or actor values), a create executed
#      from inside a repo script, composite action, or reusable workflow, or
#      reached through a variable or command-substitution indirection at the
#      call site, and an env-file channel or input rewrite reached through
#      one level of
#      indirection inside a repo-local script executed by a pinned
#      pre-handler step (review findings F26/F27) remain
#      review-gated and are documented as a residual.
#   7. GitHub-parser-faithful step identity and YAML well-formedness (review
#      findings F17/F18): the handler is resolved from the SAME YAML parse
#      tree GitHub runs, never by substring grep. The parse-tree walk
#      rejects ANY duplicate mapping key anywhere in the workflow (the
#      demonstrated duplicate `run:` spellings `"run":`, `run: |-`, and
#      `run: |2`: GitHub's parser rejects the file outright with Invalid
#      workflow file / 422, while a lenient last-wins scan would pin the
#      decoy value), and
#      exactly one step may carry the exact name
#      `Run /oc triggers as owner` (a comment line or a same-name decoy no
#      longer satisfies a grep count, and a renamed executing step fails).
#      That step must keep `if: always()` (an `if: false` decoy or a removed
#      gate fails), contain no `shell:`, no `working-directory:`, and no
#      `continue-on-error:` key, and carry EXACTLY the GH_TOKEN and BOT_TOKEN
#      env keys with both token expressions intact (a removed, emptied, or
#      role-swapped credential, an added BASH_ENV-style key, or a step-level
#      working directory fails; review finding F21). Each handler needle (the
#      dedupe marker, `_open_issue_titles`, and `_self_triage`) must appear
#      in exactly one step's run in the whole file, and that run must be the
#      anchored step, so a canonical decoy cannot be harvested while a named
#      or weakened executor carries any handler text. Any parse,
#      duplicate-key, or identity
#      failure is a loud named bad token and the block-scoped checks below
#      are skipped.
#   8. Effective execution shape and repo-root module identity (review
#      findings F20/F21/F23/F24): a workflow-level or job-level
#      `defaults: run: shell: cat {0}` (or `working-directory`) rewrites the
#      anchored step's effective shell or working directory without touching
#      the step's own keys, so both defaults scopes are rejected outright
#      (malformed non-mapping defaults shapes too). A workflow-level or
#      job-level `env:` key is rejected the same way: it merges into the
#      anchored step's environment, so an injected PYTHONPATH or BASH_ENV
#      would change what the handler executes while the step's own exact
#      env-key pin stays satisfied, and a job-level `container:` would
#      replace the whole runtime. Repo-root module shadowing is closed at
#      the execution layer, not only at the scan layer: the handler step
#      itself invokes the interpreter in isolated mode (`python3 -I -`,
#      pinned inside the exact-text handler block below), so cwd is never
#      on sys.path and no repo-root module of ANY name, spelling, or
#      transitive-import depth (the demonstrated `selectors` import of
#      subprocess included) can reach the handler process; removing or
#      weakening the -I isolation fails the exact-text handler pin. The
#      static scan below stays as belt and braces over the watched direct
#      imports and startup hooks (json, os, re, subprocess, time, sys,
#      sitecustomize, usercustomize) in EVERY importable spelling (source
#      json.py, sourceless bytecode json.pyc placed directly in the
#      directory, an extension module json.so / json.pyd bare or
#      version-tagged, or a package directory carrying any importable
#      __init__ artifact): a committed shadow still fails the audit loudly
#      even though the isolated handler can no longer import it, so an
#      accidental shadow is flagged before it can affect any other step.
#      The extractor and the fixture runner execute isolated (python3 -I,
#      so their own imports can never be redirected), the audit's own R18
#      YAML-consistency helper executes isolated too (review finding F24:
#      its non-isolated Python could previously import a repo-root module
#      that rewrote the workflow file under test, repairing a weakened
#      handler before R26 extracted it), and the functional sandbox still
#      mirrors the repo root's top-level files in every importable spelling
#      into its work dir as defense in depth, so an isolation regression
#      that somehow survives the text pin also surfaces behaviorally. The
#      static scan is ORed with an audit-start checkout snapshot taken
#      before any rule executes, so a repo-root shadow that unlinks itself
#      before the scan runs still fails loudly.
#      Review-gated boundary: a wholesale rewrite of the executing step into
#      unrelated code carrying none of the three needles (with a canonical
#      decoy left in place) is visible in the diff but not distinguishable
#      structurally from a genuine handler replacement.
#   9. Effective PATH and runner env-file channel (review finding F25): the
#      handler step's effective environment is defined by its own keys, the
#      workflow/job scopes pinned above, AND every earlier step of the same
#      job. The runner prepends each `$GITHUB_PATH` write's directories to
#      the PATH seen by all later steps and injects every `$GITHUB_ENV`
#      write as an environment variable, and a directory already on PATH
#      (the pinned `$HOME/.opencode/bin`) is an executable-planting
#      surface. A one-line mutation of a pre-handler step therefore kept
#      the whole audit green (25 passed, 0 failed) while the handler's
#      binary or interpreter was replaced: appending a repo-controlled
#      directory to GITHUB_PATH next to a committed fake `gh` (which
#      answered the dedupe query with `[]`, letting the exact duplicate
#      recur), exporting a BASH_ENV shim (a repo-controlled `python3`
#      executed the pinned `python3 -I -` line, defeating the F23
#      isolation at the binary layer), planting a fake `gh` into the pinned
#      PATH directory, or injecting LD_PRELOAD. The extractor now rejects
#      every pre-handler line that mentions the env-file channel, the
#      pinned PATH directory, or the decision-file input unless it is one
#      of the exact allowed lines parsed from the pinned workflow text
#      itself (the PATH echo, the two EMERGENCY_GATE writes, the cached
#      binary probes, and the decision-contract reads), requires the
#      PATH-adding step's body to be exactly the single pinned echo, and
#      enforces the exact pre-handler step sequence (the effective names
#      GitHub displays, including the YAML-comment-truncated decision
#      contract name). It also requires every LITERAL `gh issue create`
#      invocation in the whole workflow to live in the anchored handler
#      step: any other step or job creating issues directly would bypass the
#      guard (adversarial hunt closure). That scan is shell-faithful: it
#      folds backslash-newline continuations, ANSI-C quoting, and
#      quote/backslash word concatenation, splits on shell metacharacters,
#      accepts path-qualified executables and `env`/`command`/`bash -c`
#      prefixes, so every ordinary `gh issue create` spelling (tabs, `g""h`,
#      `g\` newline `h`, `/usr/bin/gh`, `gh -R owner/repo issue create`,
#      `gh issue --repo owner/repo create`, subshell and `;` forms) is
#      caught, as is the Python list form even when it spans lines, carries
#      shell-escaped quotes, splits a token across a comment, uses a
#      single-element `shell=True` container, splits a token across adjacent
#      string literals, or spells a token with a Python
#      `\xNN`/`\uNNNN`/`\U00000000`/`\N{...}`/octal escape or a
#      `b`/`r`/`u`/`f` prefix
#      (review findings F26/F29/F30/F32/F34/F35 plus the round-18
#      adjacent-literal sibling: the old space/quote-stripping check, the
#      first token-based rewrite, the normalized form's missing backslash
#      fold, and the missing escape/comment/container/locale-quote and
#      adjacent-literal folds each missed an ordinary literal spelling).
#      Each layer is self-tested
#      DIRECTLY (the word scan over `_f29_red`, the normalized form over
#      `_f30_red`) and the exact combined predicate the scan calls is
#      exercised over every red case (`_f29_red + _f30_red + _f31_red`),
#      so deleting or weakening either layer or the combined predicate
#      fails the audit itself (review finding F31); prose carrying separate
#      `gh`, `issue`, and `create` tokens in one command line is the known
#      accepted false-positive shape. A create executed from inside a repo
#      script, composite action, or reusable workflow, a create issued
#      through a direct REST call (`gh api --method POST .../issues`,
#      `curl .../issues`), or one reached through a variable or
#      command-substitution indirection at the call site
#      (`$(which gh) issue create`), is the documented residual. Repo-local
#      scripts executed by the pinned pre-handler steps are themselves
#      scanned for the env-file channel (review finding F27: appending
#      `echo "BASH_ENV=..." >> "$GITHUB_ENV"` to `resolve-model.sh` left the
#      audit green while the handler sourced the shim; the scan now rejects
#      GITHUB_ENV, GITHUB_PATH, BASH_ENV, the pinned `.opencode` PATH
#      directory, and the decision-file input in every such script body,
#      and recognizes the standard invocation spellings: bash/sh/source,
#      optional flags, absolute or quoted paths), with one level of
#      indirection inside such a script (a script invoking another script,
#      or an environment variable expanded into the target path) remaining
#      the documented residual.
#      Structurally, the ENTIRE pre-handler
#      region (step sequence, execution-shape keys, full env key maps
#      including values, `with:` maps, and
#      every run line with blank lines dropped) is pinned as canonical
#      exact text compared byte for byte, so no pre-handler line can be
#      inserted, re-indented, replaced, or re-ordered in ANY spelling
#      (including a constructed path such as `d="$HOME/.open";
#      d="${d}code/bin"`, a dynamically spelled `GITHUB_PATH` bucket name,
#      a sibling step that rewrites `.maintainer/decision.json` without
#      naming it, or an added `env:`/`if:` key), and a legitimate
#      pre-handler edit fails loudly until the canonical heredoc is
#      regenerated (run the extractor with the workflow plus two throwaway
#      output paths and paste its argv[2] output). Behaviorally, the
#      functional sandbox derives its PATH directories from the pinned
#      extractor output instead of hardcoding the mock, mirrors a
#      `$GITHUB_WORKSPACE`-derived directory from the repo (so a committed
#      executable planted there would shadow the mock exactly as it
#      shadows real gh), and carries a derived-PATH shadow scenario that
#      plants a failing fake `gh` into the first resolved derived
#      directory: an empty mock invocation log proves the composition order
#      (derived directories ahead of the mock bin) is load-bearing, so a
#      future reorder that silently neutralizes the derivation fails
#      loudly.
#      Review-gated boundary: the named scans cover the three demonstrated
#      channels; any OTHER effective-environment channel that lands in a
#      pre-handler step is caught by the canonical region pin (as a diff
#      would show), not by a per-channel semantic model, and a
#      pre-handler line that is itself part of the legitimate environment
#      surface added in a future reviewed edit is pinned only after the
#      canonical heredoc is regenerated in that same review. A channel
#      reached through one level of indirection inside a repo-local script
#      (a script invoking another script, or a variable-expanded path), and
#      an issue create executed from inside a repo script, composite action,
#      or reusable workflow, are likewise review-gated residuals: the
#      canonical region pin and the diff surface them, but no static model
#      follows arbitrary script execution.
r26_bad=""
R26_WF=".github/workflows/maintainer.yml"
# Repo root the audit is running against, for the repo-root module-shadow
# checks (static scan plus the sandbox mirror in r26_run; review finding F20).
R26_REPO_ROOT=$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)
if [ ! -f "$R26_WF" ]; then
  r26_bad=" maintainer.yml(missing)"
else
  # Static contract: marker, helpers, query shape, the fail-open branch, and
  # the exact control-flow lines whose one-word deletion silently disables the
  # dedupe (review finding F2: `loaded = {}`, `if False:`, or a removed
  # skip-branch `continue` all passed the first-round string/ordering checks).
  grep -qF 'CREATE_ISSUE DEDUPE (issue #668)' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(no-dedupe-marker)"
  grep -qF 'def _norm_issue_title(s):' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(no-norm-function)"
  grep -qF 'def _load_open_issue_titles():' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(no-open-issue-query-helper)"
  grep -qF '["gh", "issue", "list", "--repo", repo, "--state", "open", "--limit", "1000", "--json", "number,title"]' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(query-shape)"
  grep -qF 'create_issue dedupe query failed; creating without the guard this run (issue #668)' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(no-loud-query-failure)"
  grep -qF 'create_issue dedupe query returned unparseable JSON; creating without the guard this run (issue #668)' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(no-loud-bad-json)"
  grep -qF '_open_issue_titles = loaded if loaded is not None else {}' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(no-fail-open-to-create)"
  grep -qF 'loaded = _load_open_issue_titles()' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(no-loader-invocation)"
  grep -qF 'if existing:' "$R26_WF" || r26_bad="${r26_bad} maintainer.yml(no-skip-guard)"
  # Repo-root module shadowing (review findings F20/F22/F23/F24): production
  # used to execute the handler with cwd set to the workspace root, where a
  # committed top-level json, os, re, subprocess, time, sys, sitecustomize,
  # or usercustomize shadow (in ANY importable spelling) shadowed the stdlib
  # on sys.path[0] and could silently disable the dedupe (a shadow could
  # special-case the _load_open_issue_titles caller and return [] for it)
  # while every audit assertion stayed green. The handler step now invokes
  # the interpreter in isolated mode (`python3 -I -`, pinned inside the
  # exact-text handler block), so cwd is never on sys.path and no repo-root
  # module of ANY name (the demonstrated transitive `selectors` import
  # included), spelling, or transitive-import depth can reach the handler
  # process; the scan below stays as belt and braces: a committed shadow of
  # a watched module is still flagged loudly, and removing the -I isolation
  # fails the exact-text pin. The `import` name can arrive in
  # ANY importable spelling, so the scan covers all of them: source (json.py),
  # sourceless bytecode placed directly in the directory (json.pyc, the PEP
  # 3147 legacy layout), extension modules (json.so / json.pyd, bare or
  # version-tagged), and package directories carrying any importable __init__
  # artifact (__init__.py, __init__.pyc, __init__.*.so, ...). Fail loudly on
  # any such shadow, and mirror the repo root's top-level files in every
  # importable spelling into the sandbox work dir (r26_run) as defense in
  # depth, so an isolation regression that somehow survives the exact-text
  # pin also breaks the assertions behaviorally. The live scan is ORed with
  # the audit-start checkout snapshot taken before any rule executes, so a
  # shadow that unlinks itself before this scan runs still fails loudly even
  # though it is gone from the directory now. The R18 helper, the
  # demonstrated non-isolated consumer, now executes isolated as well
  # (python3 -I -; review finding F24: a repo-root glob.py could previously
  # execute during the audit and rewrite the workflow file under test).
  if [ -z "$R26_REPO_ROOT" ] || [ ! -f "$R26_REPO_ROOT/.github/scripts/silent-stall-audit.sh" ]; then
    r26_bad="${r26_bad} repo-root(unresolved)"
  else
    for r26_mod in $R26_WATCH_MODULES; do
      # Every importable spelling (review finding F22), not only the source
      # form: a sourceless top-level json.pyc (py_compile output placed
      # directly in the directory, the PEP 3147 legacy layout) or a package
      # directory carrying only an __init__.pyc is imported exactly like the
      # source form, and extension modules (json.so / json.pyd, bare or
      # version-tagged) are the third spelling of the same class; each could
      # special-case the _load_open_issue_titles caller to return [] while
      # every audit assertion stayed green (25 passed, 0 failed) before the
      # handler step was isolated (review finding F23). A snapshot
      # hit (present at audit start, possibly unlinked on import since) is
      # ORed into the live present-now test.
      r26_early=0
      case " $R26_EARLY_SHADOWS " in
        *" $r26_mod "*) r26_early=1 ;;
      esac
      if [ "$r26_early" = "1" ] || r26_shadow_present "$R26_REPO_ROOT" "$r26_mod"; then
        r26_bad="${r26_bad} repo-root(${r26_mod} shadows stdlib)"
      fi
    done
  fi
  # Step identity and extraction (review findings F17/F18): resolve the
  # handler from the SAME YAML parse tree GitHub runs, never by substring
  # grep (a comment line or a decoy step carrying the exact name satisfied
  # the old check while a renamed weakened executor actually ran) and never
  # by a lenient line scanner (a duplicate `run:` key written `"run":`, in a
  # second mapping, or with a `|2`/`|-` spelling is invisible to line
  # scanning while a last-wins parser would execute the weakened value;
  # GitHub's own parser rejects duplicate keys outright). The parse-tree walk
  # rejects any duplicate mapping key anywhere in the workflow; it then
  # requires EXACTLY ONE step named `Run /oc triggers as owner`
  # (comments cannot match), its `if:` to be exactly `always()` (an
  # `if: false` decoy or a removed gate fails), no `shell:` and no
  # `continue-on-error:` key (a cat-shell no-op step or a crash-swallowing
  # step fails), both token env expressions intact (GH_TOKEN:
  # ${{ secrets.OPENCODE_PAT }} and BOT_TOKEN: ${{ github.token }}, so a
  # removed, emptied, or role-swapped credential fails), and that each
  # handler needle (the dedupe marker, `_open_issue_titles`, and
  # `_self_triage`) lives in EXACTLY ONE step's run across the whole file,
  # which must be this anchored step (a canonical decoy plus a weakened
  # executor that still carries any handler text cannot satisfy the needles;
  # a wholesale rewrite of the executing step into unrelated code carrying
  # none of them remains the documented diff-review boundary at the end of
  # the header comment). The step's run value is emitted verbatim as the
  # extracted block every block-scoped and functional check below executes.
  r26_extract_err=$(mktemp 2>/dev/null || true)
  r26_premanifest_out=$(mktemp 2>/dev/null || true)
  r26_pathdirs_out=$(mktemp 2>/dev/null || true)
  r26_block=""
  r26_extract_failed=0
  r26_pathdirs_cfg=""
  if [ -z "$r26_extract_err" ] || [ -z "$r26_premanifest_out" ] || [ -z "$r26_pathdirs_out" ]; then
    r26_bad="${r26_bad} maintainer.yml(extract-tmp-unavailable)"
  else
    r26_block=$(python3 -I - "$R26_WF" "$r26_premanifest_out" "$r26_pathdirs_out" "$R26_REPO_ROOT" 2>"$r26_extract_err" <<'R26EXTRACT'
import codecs
import json
import os
import re
import sys
import unicodedata

import yaml


class DuplicateKey(Exception):
    pass


def walk(node):
    if isinstance(node, yaml.MappingNode):
        seen = set()
        for key_node, value_node in node.value:
            key = getattr(key_node, "value", None)
            if key in seen:
                raise DuplicateKey("duplicate-yaml-key:%s:line-%s" % (key, key_node.start_mark.line + 1))
            seen.add(key)
            walk(value_node)
    elif isinstance(node, yaml.SequenceNode):
        for child in node.value:
            walk(child)


path = sys.argv[1]
with open(path, "r", encoding="utf-8") as handle:
    text = handle.read()

try:
    tree = yaml.compose(text)
except Exception as exc:
    print("yaml-parse-error:%s" % exc, file=sys.stderr)
    sys.exit(2)

try:
    walk(tree)
except DuplicateKey as exc:
    print(str(exc), file=sys.stderr)
    sys.exit(3)

doc = yaml.safe_load(text)

targets = []
for job_name, job in (doc.get("jobs") or {}).items():
    for index, step in enumerate((job or {}).get("steps") or []):
        if isinstance(step, dict) and step.get("name") == "Run /oc triggers as owner":
            targets.append((job_name, index, step))

if len(targets) != 1:
    print("step-name-not-unique:%s" % len(targets), file=sys.stderr)
    sys.exit(4)

target_key = (targets[0][0], targets[0][1])
step = targets[0][2]

# Effective execution shape (review finding F21): a job-level or workflow-level
# `defaults: run: shell: cat {0}` (or `working-directory`) rewrites the
# anchored step's effective shell/working directory without touching the
# step's own keys, so the F17/F18 step pins alone left it green while the
# handler was dead in production. Reject any malformed failure shape and any
# defaults override on either scope.
target_job = (doc.get("jobs") or {}).get(target_key[0]) or {}
for scope_name, scope in (("workflow", doc), ("job", target_job)):
    defaults = scope.get("defaults")
    if defaults is not None and not isinstance(defaults, dict):
        print("handler-defaults-malformed:%s" % scope_name, file=sys.stderr)
        sys.exit(12)
    run_defaults = (defaults or {}).get("run")
    if run_defaults is not None and not isinstance(run_defaults, dict):
        print("handler-defaults-malformed:%s" % scope_name, file=sys.stderr)
        sys.exit(12)
    if run_defaults and ("shell" in run_defaults or "working-directory" in run_defaults):
        print("handler-effective-defaults-set:%s" % scope_name, file=sys.stderr)
        sys.exit(12)

# Effective environment (the same class as the defaults pin above): a
# workflow-level or job-level `env:` key merges into the anchored step's
# environment, so an injected PYTHONPATH or BASH_ENV would change what the
# handler actually executes while the step's own exact env-key pin stays
# satisfied. Both scopes must stay env-free, and a job-level `container:`
# would replace the whole runtime. The step-level env mapping is pinned to
# exactly {GH_TOKEN, BOT_TOKEN} below.
if "env" in doc:
    print("handler-workflow-env-set", file=sys.stderr)
    sys.exit(15)
if "env" in target_job:
    print("handler-job-env-set", file=sys.stderr)
    sys.exit(15)
if "container" in target_job:
    print("handler-job-container-set", file=sys.stderr)
    sys.exit(15)
if "strategy" in target_job:
    print("handler-job-strategy-set", file=sys.stderr)
    sys.exit(16)

if step.get("if") != "always()":
    print("handler-step-not-always-gated", file=sys.stderr)
    sys.exit(5)
if "shell" in step:
    print("handler-step-shell-set", file=sys.stderr)
    sys.exit(6)
if "working-directory" in step:
    print("handler-step-working-directory-set", file=sys.stderr)
    sys.exit(13)
if "continue-on-error" in step:
    print("handler-step-continue-on-error-set", file=sys.stderr)
    sys.exit(7)

env = step.get("env") or {}
if not isinstance(env, dict):
    print("handler-step-env-malformed", file=sys.stderr)
    sys.exit(14)
if env.get("GH_TOKEN") != "${{ secrets.OPENCODE_PAT }}":
    print("handler-step-gh-token-env-changed", file=sys.stderr)
    sys.exit(8)
if env.get("BOT_TOKEN") != "${{ github.token }}":
    print("handler-step-bot-token-env-changed", file=sys.stderr)
    sys.exit(9)
# Any EXTRA env key is an execution-shape change too (review finding F21: an
# added BASH_ENV passed the old checks): the handler step must carry exactly
# the two token variables and nothing else.
if set(env.keys()) != {"GH_TOKEN", "BOT_TOKEN"}:
    print("handler-step-env-keys-changed", file=sys.stderr)
    sys.exit(14)

def step_runs():
    for job_name, job in (doc.get("jobs") or {}).items():
        for index, other in enumerate((job or {}).get("steps") or []):
            if isinstance(other, dict):
                yield (job_name, index), (other.get("run") or "")


for needle in ("CREATE_ISSUE DEDUPE (issue #668)", "_open_issue_titles", "_self_triage"):
    hits = [key for key, value in step_runs() if needle in value]
    if hits != [target_key]:
        print("dedupe-handler-not-unique:%s=%s" % (needle, len(hits)), file=sys.stderr)
        sys.exit(10)

# Issue creation only through the guarded handler (adversarial hunt closure,
# hardened by review findings F26/F29/F31/F32): any OTHER step or job in this
# workflow that creates an issue directly (a shell `gh issue create`, a
# Python list or subprocess form, a bytes literal, or an escaped spelling)
# files duplicates with no query and no dedupe. The dedupe guard's whole
# invariant is that every created issue goes through the handler, so the
# invocation must exist in exactly one run in the whole file, and that run
# must be the anchored handler step. The scan is shell-faithful: backslash-
# newline continuations join the command word, ANSI-C and locale quoting are
# folded (`$'\x69ssue'` is `issue`, `$"gh"` is `gh`), shell metacharacters
# delimit commands, and
# quote/backslash concatenation inside a word is folded (`g""h`, `i""ssue`,
# `\g\h`), so a path-qualified executable (`/usr/bin/gh`, `./gh`), a leading
# `env`/`command`/`bash -c`, a tab separator, a global flag between `gh` and
# the subcommand (`gh -R owner/repo issue create`,
# `gh issue --repo owner/repo create`), or a subshell/`;`-separated command
# all fail loudly. The normalized form strips line comments, whitespace,
# quotes, and backslashes and folds string prefixes, so the Python list form
# is caught even when it spans lines, carries shell-escaped quotes, splits a
# token across a comment (review findings F30/F34), or splits a token across
# adjacent string literals that compile-time concatenation joins (`"iss"
# "\x75e"` is `issue`; round-18 adversarial sibling of F34/F35). Python
# literal escapes are decoded (`\x69ssue`, `\u0069ssue`, `\U00000069ssue`,
# `\N{LATIN SMALL LETTER E}`, `\151ssue`), string prefixes (`b`, `r`, `u`,
# `f`) and container punctuation are folded, so the bytes and escaped
# spellings cannot execute a create behind the scan (review finding F32).
# Each layer is self-tested DIRECTLY (the word scan over `_f29_red`, the
# normalized form over `_f30_red`) and the exact combined predicate the scan
# calls is exercised over every red case (`_f29_red + _f30_red + _f31_red`),
# so deleting or weakening either layer fails the audit itself (review
# finding F31). Known false-positive shape: prose carrying separate `gh`,
# `issue`, and `create` tokens in one command line. A create executed from
# inside a repo script, composite action, or reusable workflow, through
# variable/command substitution indirection, or assembled at runtime by
# non-literal string construction, is the documented residual below.
def decode_literal_escapes(text):
    def _named(match):
        try:
            return unicodedata.lookup(match.group(1))
        except KeyError:
            return match.group(0)
    text = re.sub(r"\\x([0-9a-fA-F]{2})", lambda m: chr(int(m.group(1), 16)), text)
    text = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), text)
    text = re.sub(r"\\U([0-9a-fA-F]{8})", lambda m: chr(int(m.group(1), 16)), text)
    text = re.sub(r"\\N\{([^}]*)\}", _named, text)
    text = re.sub(r"\\([0-7]{1,3})", lambda m: chr(int(m.group(1), 8)), text)
    return text


def normalized_create_form(text):
    text = re.sub(r"#[^\n]*", "", text or "")
    text = re.sub(r'(?i)\b(?:br|rb|fr|rf|b|r|u|f)(?=["\'])', "", text)
    return (re.sub(r"\s+", "", text)
            .replace('"', "").replace("'", "").replace("\\", ""))


def issue_create_in(text):
    text = decode_literal_escapes((text or "").replace("\\\n", ""))
    text = re.sub(r"\$'([^']*)'", lambda m: codecs.decode(m.group(1), "unicode_escape"), text)
    text = re.sub(r'\$"([^"]*)"', r"\1", text)
    for fragment in re.split(r"[;&|()`]+", text):
        words = []
        for raw_word in fragment.split():
            word = re.sub(r"[\"'\\]", "", raw_word).lower()
            word = word.strip("[](){},;:")
            word = re.sub(r"^(?:br|rb|fr|rf|b|r|f|u)(?=(?:gh|gh\.exe|issue|create)$)", "", word)
            words.append(word)
        for word_index, word in enumerate(words):
            executable = word.rsplit("/", 1)[-1]
            if (executable in ("gh", "gh.exe")
                    and "issue" in words[word_index + 1:]
                    and "create" in words[word_index + 1:]):
                return True
    return False


_f29_red = [
    "gh issue create --title x --body y",
    "/usr/bin/gh issue create --title x --body y",
    "./gh issue create --title x --body y",
    "command gh issue create --title x --body y",
    "env gh issue create --title x --body y",
    "g\\\nh issue create --title x --body y",
    "g\"\"h issue create --title x --body y",
    "gh i\"\"ssue create --title x --body y",
    "gh $'\\x69ssue' create --title x --body y",
    '$"gh" issue create --title x --body y',
    '$"g"h issue create --title x --body y',
    'gh $"iss"ue create --title x --body y',
    'gh issue $"cre"ate --title x --body y',
    'bash -c "/usr/bin/gh issue create --title x --body y"',
    "gh -R owner/repo issue create --title x --body y",
    "gh issue --repo owner/repo create --title x --body y",
    "(gh issue create --title x --body y)",
    "gh issue create --title x --body y;",
    "gh\tissue\tcreate --title x --body y",
]
_f29_green = [
    "gh issue list --state open --limit 1000 --json number,title",
    "hg issue create --title x --body y",
    "gh api --method POST repos/owner/repo/issues",
    "gh workflow run maintainer.yml",
]
for _case in _f29_red:
    if not issue_create_in(_case):
        print("f29-selftest-missed:%s" % _case, file=sys.stderr)
        sys.exit(21)
for _case in _f29_green:
    if issue_create_in(_case):
        print("f29-selftest-false-positive:%s" % _case, file=sys.stderr)
        sys.exit(21)


# Combined detector used by the workflow-wide scan: the shell-faithful word
# scan OR the whitespace/quote/backslash-normalized form. The self-tests
# below test each layer directly (the word scan over `_f29_red`, the
# normalized form over `_f30_red`) and then exercise the exact combined
# predicate the scan calls over every red case, so neither a layer deletion
# nor a combined-predicate weakening can leave the audit green (review
# findings F30/F31).
def issue_create_detected(text):
    return issue_create_in(text) or "issue,create" in normalized_create_form(decode_literal_escapes(text))


_f30_red = [
    'subprocess.run(["gh", "issue", "create"])',
    'subprocess.run([\n "gh",\n "issue",\n "create"])',
    'subprocess.run([\\"gh\\", \\"issue\\", \\"create\\"])',
    'subprocess.run([f"gh", f"issue", f"create"])',
    'subprocess.run([b"gh", b"issue", b"create"])',
]
_f30_green = [
    "gh issue list --state open --limit 1000 --json number,title",
    'echo "created an issue"',
]
# Literal create spellings that execute through a Python container, an
# escaped token, a bytes literal, or a token split across adjacent string
# literals that compile-time concatenation joins (review finding F32 plus
# the round-18 adversarial sibling). Each must be caught by the combined
# detector the scan runs, and each must survive the direct normalized-layer
# check where the normalized form is what catches the list-shaped forms.
_f31_red = [
    'subprocess.run(["gh issue create --title x --body y"], shell=True)',
    'subprocess.run(["gh", "issue",  # comment\n "create", "--title", "x"])',
    'subprocess.run(["gh", "iss"  # split\n "ue", "create", "--title", "x"])',
    'subprocess.run(["gh", "\\x69ssue", "create", "--title", "x"])',
    'subprocess.run(["gh", "\\u0069ssue", "create", "--title", "x"])',
    'subprocess.run(["gh", "\\151ssue", "create", "--title", "x"])',
    'subprocess.run([b"gh", b"issue", b"create"])',
    'subprocess.run(["gh", "issu\\N{LATIN SMALL LETTER E}", "create", "--title", "x"])',
    'subprocess.run([rf"gh", rf"issu\\N{LATIN SMALL LETTER E}", "create", "--title", "x"])',
    'subprocess.run(["gh", "\\U00000069ssue", "create", "--title", "x"])',
    'subprocess.run(["gh", "iss" "\\x75e", "create", "--title", "x"])',
    'subprocess.run(["gh", "iss" "\\N{LATIN SMALL LETTER U}e", "create", "--title", "x"])',
    'subprocess.run(["gh", "iss" "\\U00000075e", "create", "--title", "x"])',
    'subprocess.run(["gh", "iss" "\\165e", "create", "--title", "x"])',
    'subprocess.run([b"gh", b"iss" b"\\x75e", b"create", "--title", "x"])',
    'subprocess.run([f"g" f"\\x68", f"issue", f"create", "--title", "x"])',
    'subprocess.run(["gh", "issue", "cre" "\\x61te", "--title", "x"])',
]
for _case in _f30_red:
    if "issue,create" not in normalized_create_form(_case):
        print("f31-normalized-selftest-missed:%s" % _case, file=sys.stderr)
        sys.exit(21)
for _case in _f30_green:
    if issue_create_detected(_case):
        print("f30-selftest-false-positive:%s" % _case, file=sys.stderr)
        sys.exit(21)
for _case in _f29_red + _f30_red + _f31_red:
    if not issue_create_detected(_case):
        print("f31-combined-selftest-missed:%s" % _case, file=sys.stderr)
        sys.exit(21)

for key, value in step_runs():
    if key == target_key:
        continue
    if issue_create_detected(value):
        print("issue-create-outside-handler:%s:%s" % key, file=sys.stderr)
        sys.exit(21)

run = step.get("run") or ""
if not run.strip():
    print("handler-run-empty", file=sys.stderr)
    sys.exit(11)

# Effective PATH / runner env-file channel (review finding F25): the anchored
# step's effective environment is not defined by its own keys alone. The
# runner applies every earlier step's `$GITHUB_PATH` writes (prepended PATH
# directories) and `$GITHUB_ENV` writes (injected variables) to all later
# steps of the same job, and a directory that is already on PATH (the pinned
# `$HOME/.opencode/bin`) is an executable-planting surface. A one-line
# mutation of any pre-handler step therefore silently bypassed every pin
# above: appending a repo-controlled directory to GITHUB_PATH alongside a
# committed fake `gh` (the planted gh answers the dedupe query with `[]` and
# the duplicate class recurs, verified behaviorally), exporting a BASH_ENV
# shim (a repo-controlled `python3` executes the pinned `python3 -I -` line,
# defeating the F23 isolation at the binary layer), planting a fake `gh`
# into the pinned PATH directory, injecting LD_PRELOAD, or rewriting the
# handler's input file `.maintainer/decision.json` from a sibling step. The
# checks below reject every pre-handler line mentioning the env-file
# channel, the pinned PATH directory, or the decision-file input unless it
# is one of the exact allowed lines (hardcoded here and matching the
# pinned workflow text line for line); the shell section below additionally
# pins the ENTIRE pre-handler
# region (step sequence, execution-shape keys, and every run line) as
# canonical exact text, so no such mutation can land in any spelling that
# avoids the named scans either.
pre_steps = []
for index, other in enumerate(target_job.get("steps") or []):
    if index >= target_key[1]:
        break
    pre_steps.append((index, other if isinstance(other, dict) else {}))

# Effective step names as the runner displays them. (The pinned workflow
# text itself renders `issue #591)` as a YAML comment inside the plain
# scalar, so the parsed value ends at `issue`; the pin must use the
# effective name GitHub actually shows, and a future "fix" of that text is
# exactly the kind of pre-handler edit this pin exists to surface in
# review.)
expected_pre_names = [
    "Checkout repository",
    "Configure git identity",
    "Load Maintainer memory (maintainer/logs)",
    "Build run notification",
    "Record main SHA before",
    "Get opencode version",
    "Cache opencode",
    "Verify cached opencode binary (poisoned-cache guard)",
    "Install opencode",
    "Add opencode to PATH",
    "Resolve model (bounded fallback ladder)",
    "Run Maintainer agent",
    "Verify Maintainer wrote its decision contract (loud failure, issue",
    "Remove maintainer stray PRs and branches (the Maintainer never opens PRs)",
    "Emergency-gated commit and push of workflow model updates to main",
    "Commit Maintainer memory (maintainer/logs)",
    "Post Maintainer comment",
]
if [other.get("name") for _index, other in pre_steps] != expected_pre_names:
    print("handler-pre-step-sequence-changed", file=sys.stderr)
    sys.exit(16)

allowed_envfile_lines = {
    'echo "$HOME/.opencode/bin" >> $GITHUB_PATH',
    'echo "EMERGENCY_GATE=reverted" >> "$GITHUB_ENV"',
    'echo "EMERGENCY_GATE=pushed" >> "$GITHUB_ENV"',
}
allowed_opencode_lines = {
    'if [ -x "$HOME/.opencode/bin/opencode" ]; then',
    'test -x "$HOME/.opencode/bin/opencode"',
    'echo "$HOME/.opencode/bin" >> $GITHUB_PATH',
}
allowed_decision_lines = {
    '# A healthy Maintainer ALWAYS writes .maintainer/decision.json',
    'if [ -f .maintainer/decision.json ]; then',
    "echo \"::error::Maintainer agent finished with outcome '$AGENT_OUTCOME' and no .maintainer/decision.json (model-resolution death, provider error, or crash). Failing loudly instead of concluding green without triage.\"",
    'if os.path.exists(".maintainer/decision.json"):',
    'decisions = json.load(open(".maintainer/decision.json"))',
    'print(f"decision.json unparseable: {e}")',
}
for _index, other in pre_steps:
    for line in (other.get("run") or "").splitlines():
        stripped = line.strip()
        if ("GITHUB_PATH" in stripped or "GITHUB_ENV" in stripped) and stripped not in allowed_envfile_lines:
            print("handler-effective-envfile-write:%s" % stripped[:160], file=sys.stderr)
            sys.exit(17)
        if ".opencode" in stripped and stripped not in allowed_opencode_lines:
            print("handler-pre-opencode-mention:%s" % stripped[:160], file=sys.stderr)
            sys.exit(18)
        if "decision.json" in stripped and stripped not in allowed_decision_lines:
            print("handler-pre-decision-mention:%s" % stripped[:160], file=sys.stderr)
            sys.exit(19)

# Repo-local scripts executed by the pinned pre-handler steps (review finding
# F27): the literal scan above reads only the workflow's own run text, so a
# pinned invocation such as `bash .github/actions/opencode-run/resolve-model.sh`
# was a runtime channel. Appending
# `echo "BASH_ENV=$GITHUB_WORKSPACE/.shim" >> "$GITHUB_ENV"` to that script (or
# writing a repo-controlled directory to GITHUB_PATH, or planting a fake `gh`
# into the pinned `$HOME/.opencode/bin` directory) left the whole audit green
# at 25 passed, 0 failed while the handler sourced the shim or used the
# planted binary and filed the exact duplicate the guard exists to prevent.
# Every repo-local script the pinned pre-handler run lines execute is therefore
# scanned for the same env-file channel, the pinned PATH directory, and the
# decision-file input. One level of indirection inside such a script (a script
# invoking another script, or an environment variable expanded into the target
# path) remains the documented residual.
repo_root = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else "."
for _index, other in pre_steps:
    for _match in re.finditer(r"(?:^|[\s;&|()])(?:/bin/)?(?:bash|sh|source|\.)(?:[ \t]+-[A-Za-z]+)*[ \t]+[\"']?([A-Za-z0-9_./-]+\.(?:sh|bash))[\"']?\b", other.get("run") or ""):
        _rel = _match.group(1)
        _path = _rel if os.path.isabs(_rel) else os.path.join(repo_root, _rel)
        if not os.path.isfile(_path):
            continue
        try:
            with open(_path, encoding="utf-8", errors="replace") as _handle:
                _script = _handle.read()
        except OSError:
            print("handler-pre-script-unreadable:%s" % _rel, file=sys.stderr)
            sys.exit(22)
        for _token in ("GITHUB_ENV", "GITHUB_PATH", "BASH_ENV", ".opencode", "decision.json"):
            if _token in _script:
                print("handler-pre-script-channel:%s:%s" % (_rel, _token), file=sys.stderr)
                sys.exit(22)

# The PATH-adding step (exactly one, its body exactly one echo line) is the
# only way the pinned workflow puts a directory on the handler's PATH; the
# derived directory list is written to argv[3] for the functional sandbox
# below, which composes its PATH from these pinned steps instead of
# hardcoding the mock, so a repo-controlled directory would shadow the mock
# exactly as it shadows real gh in production.
path_step_runs = [other.get("run") or "" for _index, other in pre_steps if "GITHUB_PATH" in (other.get("run") or "")]
if path_step_runs != ['echo "$HOME/.opencode/bin" >> $GITHUB_PATH']:
    print("handler-path-step-not-exact", file=sys.stderr)
    sys.exit(20)
path_dirs = []
for run_text in path_step_runs:
    for line in run_text.splitlines():
        match = re.match(r'^echo "([^"]+)" >> \$GITHUB_PATH$', line.strip())
        if match:
            path_dirs.append(match.group(1))
with open(sys.argv[3], "w", encoding="utf-8") as handle:
    for path_dir in path_dirs:
        handle.write(path_dir + "\n")

# Pre-handler manifest (review finding F25, the structural pin): a
# deterministic, literal-only rendering of every pre-handler step (sequence,
# execution-shape keys, env key names, `with:` maps, and every run line with
# blank lines dropped). The shell section compares it byte for byte against
# a canonical heredoc, so no pre-handler line can be inserted, re-indented,
# replaced, or re-ordered in ANY spelling, not only the three channels the
# named scans above cover (e.g. a sibling step that merely OVERWRITES
# `.maintainer/decision.json` before the handler parses it is caught here
# even though it mentions no forbidden token). Regenerate the heredoc
# whenever a pre-handler step legitimately changes: run this extractor with
# the workflow, argv[3] a throwaway path, and paste argv[2] output.
manifest = []
for index, other in pre_steps:
    header = "### %d name=%s" % (index, other.get("name"))
    for key in ("id", "uses", "if", "shell", "working-directory", "continue-on-error", "timeout-minutes"):
        if key in other:
            header += " | %s=%s" % (key, other.get(key))
    env_map = other.get("env")
    if isinstance(env_map, dict):
        header += " | env=%s" % json.dumps(env_map, sort_keys=True, default=str)
    with_map = other.get("with")
    if isinstance(with_map, dict):
        header += " | with=%s" % json.dumps(with_map, sort_keys=True, default=str)
    manifest.append(header)
    for line in (other.get("run") or "").splitlines():
        if line.strip():
            manifest.append(line)
with open(sys.argv[2], "w", encoding="utf-8") as handle:
    handle.write("\n".join(manifest) + "\n")

sys.stdout.write(run)
R26EXTRACT
)
    r26_extract_rc=$?
    if [ "$r26_extract_rc" -ne 0 ]; then
      r26_extract_failed=1
      r26_reason=$(tr -d '\r\n' < "$r26_extract_err" | head -c 240)
      [ -n "$r26_reason" ] || r26_reason="rc=$r26_extract_rc"
      r26_bad="${r26_bad} maintainer.yml(${r26_reason})"
    fi
    rm -f "$r26_extract_err"
  fi
  # Pre-handler region pin (review finding F25): the anchored handler step's
  # effective environment is built from its own keys (pinned above), the
  # pinned workflow/job scopes, AND every earlier step of the same job:
  # `$GITHUB_PATH` writes prepend directories to PATH for every later step,
  # `$GITHUB_ENV` writes inject variables, and a directory already on PATH
  # (the pinned `$HOME/.opencode/bin`) is an executable-planting surface. A
  # one-line mutation of an existing pre-handler step - appending a
  # repo-controlled directory to GITHUB_PATH alongside a committed fake
  # `gh`, exporting a BASH_ENV shim, planting a fake `gh` into the pinned
  # PATH directory, injecting LD_PRELOAD, or rewriting
  # `.maintainer/decision.json` - left the entire audit green (25 passed, 0
  # failed) while the handler used the planted binary/shim and filed the
  # exact duplicate this guard exists to prevent. The ENTIRE pre-handler
  # region (step sequence, execution-shape keys, env key names, `with:`
  # maps, and every run line with blank lines dropped) is therefore pinned
  # as canonical exact text by the extractor above, so NO pre-handler line
  # can be inserted, re-indented, replaced, or re-ordered in any spelling;
  # the extractor's env-file/mention allowlist scans stay as named
  # diagnostics for the three demonstrated channels. The derived PATH
  # directory list from the extractor is captured for the functional
  # sandbox, which composes its PATH from these pinned steps.
  if [ -s "$r26_premanifest_out" ]; then
    r26_premanifest_actual=$(cat "$r26_premanifest_out")
    r26_premanifest_expected=$(cat <<'R26PRE'
### 0 name=Checkout repository | uses=actions/checkout@v6 | with={"fetch-depth": 0, "persist-credentials": true, "token": "${{ github.token }}"}
### 1 name=Configure git identity
git config --global user.name "Hephaestus (Maintainer)"
git config --global user.email "github-actions[bot]@users.noreply.github.com"
### 2 name=Load Maintainer memory (maintainer/logs)
mkdir -p .maintainer/memory/logs
git fetch origin maintainer/logs:refs/remotes/origin/logs --quiet || echo "no memory branch yet (first run)"
for f in STATE.md personality.md REGISTRY.md; do
  if git cat-file -e "refs/remotes/origin/logs:$f" 2>/dev/null; then
    git show "refs/remotes/origin/logs:$f" > ".maintainer/memory/$f"
  fi
done
for d in 0 1 2 3 4 5 6; do
  day=$(date -u -d "-$d day" +%Y-%m-%d 2>/dev/null || date -u -v-$d'd' +%Y-%m-%d)
  if git cat-file -e "refs/remotes/origin/logs:logs/$day.md" 2>/dev/null; then
    git show "refs/remotes/origin/logs:logs/$day.md" > ".maintainer/memory/logs/$day.md"
  fi
done
ls -la .maintainer/memory .maintainer/memory/logs 2>/dev/null
### 3 name=Build run notification
{
  echo "WORKFLOW: ${{ github.workflow }}"
  echo "REPO: ${{ github.repository }}"
  echo "RUN: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
  echo "--- event payload (jq) ---"
  jq -r '
    "EVENT: \(.action // "" // "unknown")",
    "ISSUE: \(.issue.number // "" // "")",
    "PR_NUMBER: \(.pull_request.number // "" // "")",
    "PR_TITLE: \(.pull_request.title // "" // "")",
    "PR_HEAD: \(.pull_request.head.sha // "" // "")",
    "PR_HEAD_REF: \(.pull_request.head.ref // "" // "")",
    "PR_MERGED: \(.pull_request.merged // false)",
    "PR_AUTHOR: \(.pull_request.user.login // .issue.user.login // "" // "")",
    "PR_BODY: \(.pull_request.body // "" // "")",
    "COMMENT_AUTHOR: \(.comment.user.login // "" // "")",
    "ISSUE_TITLE: \(.issue.title // "" // "")",
    "ISSUE_USER: \(.issue.user.login // "" // "")",
    "WORKFLOW_RUN_NAME: \(.workflow_run.name // "" // "")",
    "WORKFLOW_RUN_CONCLUSION: \(.workflow_run.conclusion // "" // "")",
    "WORKFLOW_RUN_BRANCH: \(.workflow_run.head_branch // "" // "")",
    "WORKFLOW_RUN_SHA: \(.workflow_run.head_sha // "" // "")",
    "WORKFLOW_RUN_ID: \(.workflow_run.id // "" // "")",
    "WORKFLOW_RUN_PR: \(.workflow_run.pull_requests[0].number // "" // "")",
    "INPUTS: \((.inputs // {}) | tostring)"' "$GITHUB_EVENT_PATH"
} > .maintainer/notification.txt
echo "--- notification ---"
cat .maintainer/notification.txt
### 4 name=Record main SHA before | id=pre_agent
echo "sha=$(git ls-remote origin main | awk '{print $1}')" >> $GITHUB_OUTPUT
### 5 name=Get opencode version | id=opencode_version | shell=bash | continue-on-error=True | env={"GH_TOKEN": "${{ github.token }}"}
# Authenticated (5000 req/hour, per-repo) so shared-runner-IP
# unauthenticated rate limits (60 req/hour) stop applying.
# Retry loop with backoff; the `|| true` keeps `pipefail` from
# aborting on curl non-2xx or grep no-match, so the
# `${VERSION:-latest}` fallback always engages.
VERSION=""
for attempt in 1 2 3; do
  VERSION=$(curl -sf --retry 2 --retry-delay 5 -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" https://api.github.com/repos/anomalyco/opencode/releases/latest | grep -o '"tag_name": *"[^"]*"' | cut -d'"' -f4 || true)
  if [ -n "$VERSION" ]; then
    break
  fi
  echo "version lookup attempt $attempt failed; retrying..."
  sleep $((attempt * 10))
done
echo "version=${VERSION:-latest}" >> $GITHUB_OUTPUT
echo "resolved opencode version: ${VERSION:-latest}"
### 6 name=Cache opencode | id=opencode_cache | uses=actions/cache@v4 | with={"key": "opencode-${{ runner.os }}-${{ runner.arch }}-${{ steps.opencode_version.outputs.version }}", "path": "~/.opencode/bin"}
### 7 name=Verify cached opencode binary (poisoned-cache guard) | id=opencode_verify | shell=bash
# Same guard as the vendored composite action: a poisoned cache
# entry restores fine but holds no binary, which used to surface
# as "opencode: command not found" (exit 127) under
# continue-on-error (hollow-green, no decisions).
if [ -x "$HOME/.opencode/bin/opencode" ]; then
  echo "present=true" >> "$GITHUB_OUTPUT"
else
  echo "present=false" >> "$GITHUB_OUTPUT"
fi
### 8 name=Install opencode | if=steps.opencode_cache.outputs.cache-hit != 'true' || steps.opencode_verify.outputs.present != 'true' | shell=bash
curl -fsSL --retry 3 --retry-delay 10 https://opencode.ai/install | bash
test -x "$HOME/.opencode/bin/opencode"
### 9 name=Add opencode to PATH | shell=bash
echo "$HOME/.opencode/bin" >> $GITHUB_PATH
### 10 name=Resolve model (bounded fallback ladder) | id=model_ladder | shell=bash | env={"REQUESTED_MODEL": "opencode/deepseek-v4.1-flash-free"}
bash .github/actions/opencode-run/resolve-model.sh
### 11 name=Run Maintainer agent | id=maintainer_run | shell=bash | continue-on-error=True | timeout-minutes=60 | env={"GITHUB_TOKEN": "${{ github.token }}", "MODEL_CANDIDATES": "${{ steps.model_ladder.outputs.candidates }}", "OPENROUTER_API_KEY": "${{ secrets.OPENROUTER_API_KEY }}", "PROMPT": "You are the lab Maintainer (Hephaestus) on the Random repo, in a scheduled/dispatched/event run.\n\nREAD FIRST: `.github/agents/maintainer.md` - that file IS your complete system prompt; every rule there is binding and outranks this envelope except the safety net below.\n\nYou also have, on disk:\n- `.maintainer/memory/` - your memory bundle: STATE.md (live checkpoint), personality.md, REGISTRY.md, and logs/*.md (last 7 days). Read it all before deciding.\n- `.maintainer/notification.txt` - why this run started. It is a heads-up, never a limit: re-survey the whole repo fresh with gh (open PRs/issues, comments, progress/*.md) and act on everything that needs you.\n\nSAFETY NET (always binding): you NEVER post comments with \"/oc\" (a hardcoded step posts triggers for you); you never create issues or PRs and never push feature code to main or PR branches; you NEVER run git commit, git push, git checkout -b, or any branch command yourself; and you NEVER edit .github/workflows/**, .github/agents/**, opencode.json, AGENTS.md, or LAB.md as part of routine work - ALL infra, workflow, agent, and model changes route through {\"action\": \"lab\"} (the Lab Engineer). The ONLY exception is the emergency revival contract: after a dispatched lab run demonstrably failed (or lab.yml itself cannot execute because its own model is dead/rate-limited) AND production is fully halted, you MAY write .maintainer/emergency.json and leave your .github/workflows/*.yml edits UNCOMMITTED in the tree for the hardcoded PAT step to verify, commit, and push. Without a valid declaration file, any protected-path edits you leave behind are reverted automatically and never pushed. Otherwise you only write the output files below; everything you write is later committed to the maintainer/logs branch by hardcoded steps. Never print or reference any PAT or secret.\n\nOUTPUT CONTRACT - write exactly these files (hardcoded steps act on them):\n1. `.maintainer/decision.json` - a JSON array of {action, pr?, issue?, head?, target?, message?} entries, actions: review | continue | architect | research | design | build | lab | auditor | curate | fix | ideate | recover | ping | test | eval. One entry max per PR/issue. Empty array [] is fine - do not invent work.\n2. `.maintainer/comment.md` - your public bot comment for this run's target PR/issue (or leave empty). It must end with the sign-off ` -  Hephaestus, the Maintainer` (a hardcoded step appends it if missing).\n3. `.maintainer/log-entry.md` - the FULL content of today's logs/YYYY-MM-DD.md (preserve what you found in memory, append today's entry: state snapshot, decisions + rationale, callbacks, run link, open questions). MANDATORY - write it in EVERY run, even a quiet day: this file is how maintainer instances talk to each other across runs.\n4. `.maintainer/state.md` - the FULL new STATE.md content (current pipeline status per PR/issue, next steps, open questions).\n5. `.maintainer/personality.md` - updated identity ONLY if it genuinely evolved today; otherwise leave empty.\n6. `.maintainer/emergency.json` - ONLY under the emergency revival contract above (a failed/broken lab attempt you can link + production halted): exactly {\"reason\": \"...\", \"lab_run\": \"<failing lab run URL>\", \"production_stopped\": true}. Omit the file entirely in every other run - its presence unlocks a direct push to main.\n\nWhen you finish, print a one-line summary of what you decided (the decision list is the deliverable).\n", "USE_GITHUB_TOKEN": "true", "VARIANT": "max"}
# opencode CLI does not natively recognize workflow_run events (it only supports
# issue_comment, pull_request_review_comment, issues, pull_request, schedule, workflow_dispatch).
# For workflow_run triggers, present the event as workflow_dispatch so opencode handles
# repo-level autonomous triage while the notification file (.maintainer/notification.txt)
# conveys the failing workflow run details.
if [ "${{ github.event_name }}" = "workflow_run" ]; then
  export GITHUB_EVENT_NAME="workflow_dispatch"
fi
# FALLBACK-LADDER (issue #591): per-rung retry on provider
# "Model not found" (opencode may exit nonzero OR exit 0 after
# posting its error comment), exactly once per rung; the match is
# boundary-aware so prose quoting a different retired id can never
# trigger a false advance; on an exit-0 run only the provider's
# anchored terminal error line in the tail advances (a transcript
# echo of the phrase re-ran a healthy completed session on
# 2026-10-17, finding 7, so the whole-log substring match is gone
# from that path); any other failure exits immediately; a failed
# log capture and a dead ladder both exit 1 loudly so the verify
# step below goes red instead of the 2026-10-17 hollow green.
# FREE-TIER TRANSIENT RETRY (issue #620): the provider
# intermittently rejects free-tier calls with FreeTierError
# ("OpenCode's free tier can only be used from within OpenCode
# ...") seconds into the agent step, killing the wake-up with no
# decision file; maintainer run 39060571484, 2026-10-17. Such a
# death retries the SAME model exactly once per arm (bounded), with
# the same tail + column-0 terminal anchoring as the #591 detector
# so a transcript echo or the responseBody JSON envelope never
# consumes the retry; a second rejection fails loudly.
candidates="${MODEL_CANDIDATES:-}"
if [ -z "$candidates" ]; then
  echo "::error::No model candidates resolved; refusing to run the Maintainer (the resolve step did not produce a candidate chain)."
  exit 1
fi
# The wrapper prints the provider's terminal error at column 0 (the
# final text part `Model not found: <id>. Did you mean: ...`, or
# `Error: Model not found: ...` when its catch handler prints the
# throw), while a transcript echo of the phrase (a tool-call echo
# rendered with the tool prefix, a quoted log line embedded in
# prose) cannot match both the column-0 anchor and the terminal
# form. Residual (documented): a healthy run whose own final
# response contains the exact terminal form as a standalone
# column-0 line could still match; none has ever been observed.
model_error_terminal() {
  tail -n 40 "$1" | grep -qE "^(Error: )?Model not found: ${2//./\\.}(\. Did you mean: .*|\.?$)"
}
# FreeTierError detector (issue #620), same tail + column-0 terminal
# anchoring as model_error_terminal: the provider prints the terminal
# line bare from its AI SDK (`AI_APICallError: ...`) or from the CLI's
# catch handler (`APIError: ...`), while a transcript echo (tool-call
# echo, quoted log line in prose) and the responseBody JSON envelope
# cannot match the anchored whole-line form.
freetier_error_terminal() {
  tail -n 40 "$1" | grep -qE "^(AI_APICallError: |APIError: |Error: )?OpenCode's free tier can only be used from within OpenCode\. Download it at https://opencode\.ai and keep building\.?$"
}
freetier_retry_used=0
status=1
for model in $candidates; do
  while :; do
    log="$(mktemp)"
    echo "::notice::maintainer run with model '$model'"
    set +e
    MODEL="$model" opencode github run 2>&1 | tee "$log"
    # Capture BOTH pipeline statuses in one assignment: a following
    # t=${PIPESTATUS[1]} would be empty because the first assignment
    # resets PIPESTATUS. A failed tee (e.g. full RUNNER_TEMP) leaves an
    # empty log whose grep can never match, so an exit-0 Model-not-found
    # death would take the success branch; fail loudly instead.
    st=("${PIPESTATUS[@]}")
    set -e
    status="${st[0]}"; tee_status="${st[1]}"
    if [ "$tee_status" -ne 0 ]; then
      echo "::error::could not capture the Maintainer opencode log for model '$model' (tee exit $tee_status); failing loudly instead of risking a blind advance."
      rm -f "$log"
      exit 1
    fi
    if [ "$status" -eq 0 ]; then
      if model_error_terminal "$log" "$model"; then
        echo "::warning::model '$model' died at the provider (terminal Model-not-found error on an exit-0 run); advancing to the next ladder rung if any."
        rm -f "$log"
        continue 2
      fi
      if freetier_error_terminal "$log"; then
        if [ "$freetier_retry_used" -lt 1 ]; then
          freetier_retry_used=1
          echo "::warning::transient free-tier rejection on model '$model' (exit-0 terminal FreeTierError, issue #620); one bounded retry of the same model in 15s."
          rm -f "$log"
          sleep 15
          continue
        fi
        echo "::error::persistent free-tier rejection on model '$model' after the bounded retry (issue #620); failing loudly instead of retrying unboundedly."
        rm -f "$log"
        exit 1
      fi
      rm -f "$log"
      exit 0
    fi
    if grep -qE "Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)" "$log"; then
      echo "::warning::model '$model' was not found by the provider; advancing to the next ladder rung if any."
      rm -f "$log"
      continue 2
    fi
    if freetier_error_terminal "$log"; then
      if [ "$freetier_retry_used" -lt 1 ]; then
        freetier_retry_used=1
        echo "::warning::transient free-tier rejection on model '$model' (exit $status, issue #620); one bounded retry of the same model in 15s."
        rm -f "$log"
        sleep 15
        continue
      fi
      echo "::error::persistent free-tier rejection on model '$model' (exit $status) after the bounded retry (issue #620); failing loudly instead of retrying unboundedly."
      rm -f "$log"
      exit "$status"
    fi
    echo "::error::Maintainer opencode run failed with exit status $status on model '$model' (not a model-resolution or free-tier transient death; remaining rungs are not retried)."
    rm -f "$log"
    exit "$status"
  done
done
echo "::error::Maintainer exhausted every model rung ($candidates) with 'Model not found' (issue #591 fallback ladder is dead); failing loudly so the run is visible to health audit and triage."
exit 1
### 12 name=Verify Maintainer wrote its decision contract (loud failure, issue | id=verify_agent | if=always() | shell=bash | env={"AGENT_OUTCOME": "${{ steps.maintainer_run.outcome }}"}
# A healthy Maintainer ALWAYS writes .maintainer/decision.json
# (an empty array [] is a valid quiet run), so its absence is a
# broken contract: the 2026-10-17 outage's Model-not-found deaths
# concluded green under continue-on-error with only a warning. Go RED
# instead. Note: the Maintainer is self-excluded from the
# workflow_run failure allowlist, so the observable coverage of this
# red is the failed run itself plus its recurring 20-minute schedule (and the
# Auditor's silent-stall survey), not failure-triggered triage.
# Also intended until the actor-permission preflight (issue #427)
# lands: on a bot-authored PR's pull_request event the opencode CLI
# refuses the bot actor and writes no decision file, so this step
# reds that redundant arm too. The real triage arm is the
# /oc maintainer comment triggered by opencode-pr-trigger.yml.
if [ -f .maintainer/decision.json ]; then
  echo "Maintainer decision contract present (outcome '$AGENT_OUTCOME')."
  exit 0
fi
echo "::error::Maintainer agent finished with outcome '$AGENT_OUTCOME' and no .maintainer/decision.json (model-resolution death, provider error, or crash). Failing loudly instead of concluding green without triage."
exit 1
### 13 name=Remove maintainer stray PRs and branches (the Maintainer never opens PRs) | if=always()
gh pr list --author app/github-actions --state open --json number,headRefName \
  --jq '.[] | select(.headRefName | startswith("opencode/schedule-") or startswith("opencode/dispatch-") or startswith("opencode/issue")) | .number' \
  | while read num; do
      gh pr close "$num" --delete-branch --comment "auto-closed by hardcoded cleanup: the Maintainer never opens PRs - its state lives on the maintainer/logs branch." || true
    done
gh api --paginate repos/${{ github.repository }}/branches --jq '.[].name' 2>/dev/null \
  | grep -E '^opencode/(schedule-|dispatch-|issue)' \
  | while read br; do
      enc=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$br")
      gh api -X DELETE "repos/${{ github.repository }}/git/refs/heads/$enc" || true
    done
echo "stray cleanup complete"
### 14 name=Emergency-gated commit and push of workflow model updates to main | if=always() | env={"GH_TOKEN": "${{ secrets.OPENCODE_PAT }}", "GIT_AUTHOR_EMAIL": "github-actions[bot]@users.noreply.github.com", "GIT_AUTHOR_NAME": "Hephaestus (Maintainer)", "GIT_COMMITTER_EMAIL": "github-actions[bot]@users.noreply.github.com", "GIT_COMMITTER_NAME": "Hephaestus (Maintainer)"}
dirty=$(git status --porcelain -- .github/workflows .github/agents opencode.json AGENTS.md LAB.md 2>/dev/null || true)
if [ -z "$dirty" ]; then
  echo "No protected-path modifications left by the Maintainer; nothing to do."
  exit 0
fi
# Gate: a direct push to main requires a complete emergency declaration:
# {"reason": "...", "lab_run": "<failing lab run URL>", "production_stopped": true}
ok=0
if [ -f .maintainer/emergency.json ]; then
  echo "Emergency declaration found:"; cat .maintainer/emergency.json
  decl=$(python3 - <<'PY'
import json
try:
    d = json.load(open('.maintainer/emergency.json'))
    valid = (
        isinstance(d, dict)
        and bool(str(d.get('reason', '')).strip())
        and bool(str(d.get('lab_run', '')).strip())
        and d.get('production_stopped') is True
    )
    print('valid' if valid else 'invalid')
except Exception:
    print('invalid')
PY
  )
  if [ "$decl" = "valid" ]; then
    ok=1
    echo "Emergency declaration complete; revival contract unlocked."
  else
    echo "::warning::.maintainer/emergency.json exists but is incomplete/unparseable; treating as absent."
  fi
fi
if [ "$ok" != "1" ]; then
  echo "::warning::Protected-path modifications found WITHOUT a valid emergency declaration. Reverting them; infra/model/workflow changes must be routed to the Lab Engineer ({\"action\": \"lab\"})."
  for p in .github/workflows .github/agents opencode.json AGENTS.md LAB.md; do
    git checkout -- "$p" 2>/dev/null || true
  done
  git clean -fd -- .github/workflows .github/agents opencode.json AGENTS.md LAB.md >/dev/null 2>&1 || true
  echo "EMERGENCY_GATE=reverted" >> "$GITHUB_ENV"
  exit 0
fi
echo "Emergency contract satisfied. Staging and committing strictly as Hephaestus (Maintainer)..."
# Remove actions/checkout credential injection so the PAT URL actually authenticates:
# checkout v6 stores the App-token extraheader in $RUNNER_TEMP/git-credentials-*.config,
# referenced via includeIf.gitdir:* entries; a plain unset of http.extraheader cannot remove it.
git config --local --unset-all 'http.https://github.com/.extraheader' 2>/dev/null || true
for cfg in $(git config --local --name-only --get-regexp '^includeIf\.gitdir:.*\.path$' 2>/dev/null); do
  git config --local --unset-all "$cfg" 2>/dev/null || true
done
git add .github/workflows/*.yml
[ -f opencode.json ] && git add opencode.json || true
git commit --author="Hephaestus (Maintainer) <github-actions[bot]@users.noreply.github.com>" -m "maintainer: emergency revival - update workflow model configuration (see .maintainer/emergency.json declaration in run log)"
git fetch origin main --quiet
# Orphan guard: never push a history that would rewrite main as a divergent/orphan root.
# main must stay a strict descendant of origin/main (fast-forwardable). Rebase first if needed;
# if the rebase cannot make HEAD a descendant of origin/main, ABORT instead of orphaning main.
if ! git merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
  echo "Local main is NOT a descendant of origin/main; rebasing to preserve full main history..."
  git rebase origin/main --quiet || {
    echo "::error::Rebase onto origin/main failed; aborting main push to avoid orphaning main."
    exit 1
  }
fi
git push "https://x-access-token:${{ secrets.OPENCODE_PAT }}@github.com/${{ github.repository }}.git" HEAD:main || {
  echo "Push failed, attempting rebase..."
  git fetch origin main --quiet
  git rebase origin/main --quiet
  git push "https://x-access-token:${{ secrets.OPENCODE_PAT }}@github.com/${{ github.repository }}.git" HEAD:main
}
echo "EMERGENCY_GATE=pushed" >> "$GITHUB_ENV"
echo "Emergency revival pushed to main as Hephaestus (Maintainer)."
### 15 name=Commit Maintainer memory (maintainer/logs) | if=always()
# Issue #647: bounded 3-attempt fetch-recompose-push loop with
# keep-both log semantics and loud diagnostics. The old single-shot,
# fully-quiet rebase fallback lost a session's whole memory silently
# (run 39097165251: push rejected non-fast-forward at 04:33:36.833Z,
# fallback died 306ms later with zero output, commit 7060a089 gone).
today="$(date -u +%Y-%m-%d)"
run_marker='<!-- run: ${{ github.run_id }} -->'
bundle="$(mktemp -d)"
for f in state.md personality.md log-entry.md; do
  if [ -s ".maintainer/$f" ]; then cp ".maintainer/$f" "$bundle/$f"; fi
done
if [ -s ".maintainer/memory/logs/$today.md" ]; then
  cp ".maintainer/memory/logs/$today.md" "$bundle/log-baseline.md"
fi
# The agent writes the FULL day file it materialized (existing entries
# plus today's). Isolate the bytes it actually added against that
# materialization baseline, so recomposing on a fresh tip can never
# drop a concurrent session's entry for the same day (issue #647).
: > "$bundle/log-delta.md"
if [ -s "$bundle/log-entry.md" ]; then
  if [ -s "$bundle/log-baseline.md" ] \
     && [ "$(wc -c < "$bundle/log-entry.md")" -ge "$(wc -c < "$bundle/log-baseline.md")" ] \
     && head -c "$(wc -c < "$bundle/log-baseline.md")" "$bundle/log-entry.md" | cmp -s - "$bundle/log-baseline.md"; then
    tail -c +"$(( $(wc -c < "$bundle/log-baseline.md") + 1 ))" "$bundle/log-entry.md" > "$bundle/log-delta.md"
  else
    # Append-only contract violated (agent wrote a partial file): keep
    # both by appending its whole content under the current tip.
    # Duplicated lines are harmless; a lost entry is not.
    cp "$bundle/log-entry.md" "$bundle/log-delta.md"
  fi
fi
memory_pushed=0
for attempt in 1 2 3; do
  echo "== maintainer memory publish attempt $attempt/3 =="
  have_tip=0
  if git fetch origin maintainer/logs:refs/remotes/origin/logs; then
    if git rev-parse --verify refs/remotes/origin/logs >/dev/null 2>&1; then have_tip=1; fi
  else
    echo "::warning::maintainer/logs fetch failed on attempt $attempt (loud on purpose, issue #647)"
  fi
  if [ "$have_tip" = "1" ]; then
    git checkout --force --detach refs/remotes/origin/logs --quiet
  else
    # Unique unborn root per attempt (review finding F1): reusing one
    # name dies on the second bootstrap attempt under the runner's
    # default `bash -e {0}` shell ("a branch named logs-bootstrap
    # already exists"), aborting before the loud give-up. A fresh
    # root also guarantees the "no changes" shortcut below can never
    # mask a previous attempt's unpushed commit (F1b).
    git checkout --orphan "logs-bootstrap-$attempt" --quiet
    git rm -rf . --quiet 2>/dev/null || true
  fi
  mkdir -p logs
  if [ -s "$bundle/state.md" ]; then cp "$bundle/state.md" STATE.md; fi
  if [ -s "$bundle/personality.md" ]; then cp "$bundle/personality.md" personality.md; fi
  if [ -f "logs/$today.md" ] && grep -qF "$run_marker" "logs/$today.md"; then
    echo "this run's marker is already in logs/$today.md; not duplicating the entry"
  else
    if [ -s "$bundle/log-delta.md" ]; then
      if [ -f "logs/$today.md" ] && [ -s "logs/$today.md" ]; then
        [ -n "$(tail -c 1 "logs/$today.md")" ] && printf '\n' >> "logs/$today.md"
        printf '\n' >> "logs/$today.md"
      fi
      cat "$bundle/log-delta.md" >> "logs/$today.md"
      [ -n "$(tail -c 1 "logs/$today.md")" ] && printf '\n' >> "logs/$today.md"
    elif [ ! -f "logs/$today.md" ]; then
      printf '# %s - auto entry (agent produced no log)\n\nRun: https://github.com/%s/actions/runs/%s (%s)\n> [!WARNING]\n> Agent Output Missing\n\nNote: the agent finished without writing a log entry; this stub keeps instances in sync. See the run logs for details.\n' \
        "$today" "${{ github.repository }}" "${{ github.run_id }}" "${{ github.event_name }}" > "logs/$today.md"
    fi
    printf '%s\n' "$run_marker" >> "logs/$today.md"
  fi
  if git cat-file -e "origin/main:.github/agents/REGISTRY.md" 2>/dev/null; then
    git show "origin/main:.github/agents/REGISTRY.md" > REGISTRY.md
  elif [ -f .github/agents/REGISTRY.md ]; then
    cp .github/agents/REGISTRY.md REGISTRY.md
  fi
  # Stage ONLY the memory files that exist - never the whole repo.
  # Per-path adds: one missing path makes a single atomic `git add`
  # of all paths a silent no-op, which would lose the whole publish.
  for f in STATE.md personality.md REGISTRY.md; do
    if [ -f "$f" ]; then git add -- "$f"; fi
  done
  if [ -d logs ]; then git add -- logs; fi
  if git diff --cached --quiet; then
    if [ "$have_tip" != "1" ]; then
      # Never conclude green without a tip (review finding F1b): a
      # bootstrap attempt starts from an unborn root, so an empty
      # composition here means a stale tree, not a successful
      # publish. Fall through to the bounded retry/red path.
      echo "::warning::empty bootstrap composition on attempt $attempt; not concluding green"
    else
      echo "no memory changes on attempt $attempt"
      memory_pushed=1
      break
    fi
  fi
  if git -c user.name="Hephaestus (Maintainer)" -c user.email="github-actions[bot]@users.noreply.github.com" \
    commit -m "maintainer: memory update $(date -u +%Y-%m-%dT%H:%MZ)"; then
    # Loud publish path (issue #647): no --quiet on fetch/commit/push,
    # so the real git error is always in the step log.
    if git push origin "HEAD:maintainer/logs"; then
      memory_pushed=1
      break
    fi
    echo "::warning::memory push rejected on attempt $attempt (git output above); refetching the fresh tip and recomposing"
  else
    echo "::warning::memory commit failed on attempt $attempt"
  fi
  if [ "$attempt" -lt 3 ]; then
    sleep 5
  fi
done
# Restore workspace to origin/main so subsequent steps have access to repo scripts
git checkout --force origin/main --quiet || git checkout --force main --quiet || true
if [ "$memory_pushed" != "1" ]; then
  echo "::error::maintainer memory publish failed after 3 attempts; this session's memory was NOT persisted to maintainer/logs. The recoverable bundle follows so the entries can be restored from this run log; the next Maintainer tick starts from the last persisted tip."
  for f in state.md personality.md log-entry.md; do
    if [ -s "$bundle/$f" ]; then
      echo "----- .maintainer/$f (recoverable copy) -----"
      cat "$bundle/$f"
      echo "----- end .maintainer/$f -----"
    fi
  done
  rm -rf "$bundle"
  exit 1
fi
echo "memory pushed to maintainer/logs"
rm -rf "$bundle"
### 16 name=Post Maintainer comment | if=always() | env={"GH_TOKEN": "${{ github.token }}", "OC_TARGET": "${{ github.event.pull_request.number || github.event.issue.number || inputs.issue_number || inputs.pr_number || '' }}"}
python3 - <<'PY'
import json, os, subprocess
repo = os.environ["GITHUB_REPOSITORY"]
target = os.environ.get("OC_TARGET", "")
decisions = []
if os.path.exists(".maintainer/decision.json"):
    try:
        decisions = json.load(open(".maintainer/decision.json"))
    except Exception as e:
        print(f"decision.json unparseable: {e}")
if isinstance(decisions, dict):
    decisions = [decisions]
elif not isinstance(decisions, list):
    decisions = []
posts = []
for d in decisions:
    if not isinstance(d, dict):
        continue
    if d.get("action") == "ping" and d.get("target"):
        posts.append((d["target"], d.get("message", ""), False))
if os.path.isfile(".maintainer/comment.md") and os.path.getsize(".maintainer/comment.md") > 0 and target:
    posts.append((target, open(".maintainer/comment.md").read(), True))
# Emergency-gate transparency: keep Hephaestus's public comments consistent with
# what the hardcoded steps actually did with any protected-path edits.
gate_notice = ""
gate = os.environ.get("EMERGENCY_GATE", "")
if gate == "reverted":
    gate_notice = (
        "[lab-gate] This run left workflow/config edits WITHOUT the required emergency declaration "
        "(.maintainer/emergency.json), so a hardcoded step reverted them before anything was pushed. "
        "Infra/model/workflow changes must route to the Lab Engineer ({\"action\": \"lab\"}).\n\n"
    )
elif gate == "pushed":
    gate_notice = (
        "[emergency-revival] This run's workflow changes landed on main under the emergency revival "
        "contract (a failed/broken Lab Engineer attempt plus halted production, declared in "
        ".maintainer/emergency.json).\n\n"
    )
sign = "- Hephaestus, the Maintainer"
for t, body, is_main_comment in posts:
    body = body.strip()
    if not body:
        continue
    if is_main_comment and gate_notice:
        body = gate_notice + body
    if sign not in body:
        body = body + "\n\n" + sign
    subprocess.run(
        ["gh", "api", f"repos/{repo}/issues/{t}/comments", "-f", f"body={body}"],
        check=False,
    )
    print(f"posted comment on #{t}")
PY
R26PRE
)
    [ "$r26_premanifest_actual" = "$r26_premanifest_expected" ] || r26_bad="${r26_bad} maintainer.yml(pre-handler-block-changed)"
  elif [ "$r26_extract_failed" = "0" ]; then
    r26_bad="${r26_bad} maintainer.yml(pre-handler-manifest-missing)"
  fi
  r26_pathdirs_cfg=$(cat "$r26_pathdirs_out" 2>/dev/null || true)
  rm -f "$r26_premanifest_out" "$r26_pathdirs_out"
  if [ -z "$r26_block" ]; then
    [ "$r26_extract_failed" = "1" ] || r26_bad="${r26_bad} maintainer.yml(handler-block-not-extractable)"
  elif ! bash -n <<< "$r26_block" 2>/dev/null; then
    r26_bad="${r26_bad} maintainer.yml(handler-block-syntax)"
  else
    printf '%s\n' "$r26_block" | grep -qF '${{' && r26_bad="${r26_bad} maintainer.yml(unsubstituted-expression)"
    # Block-scoped query-shape pin (tester finding B2): the exact open-issue
    # query literal must appear inside the extracted handler block, so a
    # file-wide pin cannot be satisfied by a copy planted outside the
    # executing step. A decoy copy inside the block is caught behaviorally by
    # the argv-aware mock below, which only serves the fixture list for the
    # pinned shape.
    printf '%s\n' "$r26_block" | grep -qF '["gh", "issue", "list", "--repo", repo, "--state", "open", "--limit", "1000", "--json", "number,title"]' || r26_bad="${r26_bad} maintainer.yml(query-shape-not-in-block)"
    # Ordering inside the real block: lookup and skip/triage before the
    # create call; in-run dedupe guard present; created branch records the
    # new number; the skip branch's terminating `continue` lies between the
    # skip print and the create call.
    r26_ln() { printf '%s\n' "$r26_block" | grep -nF -- "$1" | head -1 | cut -d: -f1; }
    r26_lookup=$(r26_ln 'existing = _open_issue_titles.get(ntitle) if ntitle else None')
    r26_skip=$(r26_ln "skip create_issue '{title}': open issue #{existing} already carries the identical normalized title (dedupe, issue #668)")
    r26_triage=$(r26_ln '_self_triage("issue_number", existing, reason=f"dedupe match: open issue #{existing} already carries the identical normalized title (issue #668)")')
    r26_inrun=$(r26_ln 'created earlier in this run; triage already dispatched (no duplicate dispatch)')
    r26_create=$(r26_ln '["gh", "issue", "create", "--repo", repo, "--title", title, "--body", body_text]')
    r26_created_log=$(r26_ln 'Created new issue #{m.group(1)}: {title}')
    r26_index=$(r26_ln '_open_issue_titles.setdefault(ntitle, int(m.group(1)))')
    if [ -z "$r26_lookup" ] || [ -z "$r26_create" ] || [ "$r26_lookup" -ge "$r26_create" ]; then
      r26_bad="${r26_bad} maintainer.yml(lookup-not-before-create)"
    fi
    if [ -z "$r26_skip" ] || [ -z "$r26_create" ] || [ "$r26_skip" -ge "$r26_create" ]; then
      r26_bad="${r26_bad} maintainer.yml(skip-log-not-before-create)"
    fi
    if [ -z "$r26_triage" ] || [ -z "$r26_create" ] || [ "$r26_triage" -ge "$r26_create" ]; then
      r26_bad="${r26_bad} maintainer.yml(skip-triage-not-before-create)"
    fi
    if [ -z "$r26_inrun" ] || [ -z "$r26_create" ] || [ "$r26_inrun" -ge "$r26_create" ]; then
      r26_bad="${r26_bad} maintainer.yml(in-run-dedupe-not-before-create)"
    fi
    if [ -z "$r26_created_log" ] || [ -z "$r26_index" ] || [ "$r26_index" -ge "$r26_created_log" ]; then
      r26_bad="${r26_bad} maintainer.yml(created-index-not-before-log)"
    fi
    # Loader-chain adjacency (review finding F4): the five lines from the
    # lazy-load guard through the skip guard must be CONSECUTIVE code lines,
    # so no run-state or input-shape gate (`if len(body_text) > 1: existing =
    # None`, `if len(decisions) >= 3: ...`, `if target: ...`, a created-count
    # gate, `if posted: ...`, `if sweep_failed: ...`) can be interposed
    # between the lookup and the skip test regardless of the dimension it
    # gates on. Matching is exact-trim equality, so a `#`-prefixed comment
    # decoy line does not satisfy the chain (a genuine decoy chain would
    # additionally trip the assignment-structure pin below); any gate that
    # still reaches runtime is killed behaviorally by the varied fixture
    # dimensions (multi-line bodies everywhere, the three-decision scenario
    # with the matching create last, the target-carrying decision, and the
    # mixed failed-sweep/posted-comment scenario).
    r26_ln_trim() { printf '%s\n' "$r26_block" | awk -v pat="$1" '{ t=$0; sub(/^[[:space:]]+/, "", t); sub(/[[:space:]]+$/, "", t); if (t == pat) { print NR; exit } }'; }
    # Index-initialization exact pin (adversarial escape hunt, init-replacement
    # class): the lazy-load sentinel must stay literally `_open_issue_titles =
    # None`. A conditional replacement (`= {} if os.environ.get(...) else
    # None`) keeps the assignment-count pin's count and can stay inert under
    # every fixture while pre-seeding the index in production, so the loading
    # never happens and the dedupe never fires; locating the line by exact
    # trimmed text rejects any such replacement regardless of which context
    # variable it senses.
    r26_init=$(r26_ln_trim '_open_issue_titles = None')
    [ -n "$r26_init" ] || r26_bad="${r26_bad} maintainer.yml(index-init-changed)"
    # Normalization-body exact pin (adversarial escape-hunt class, raised by
    # this round's own review of remaining unpinned regions): the whole
    # `_norm_issue_title()` body, def line through its return, must equal
    # the canonical trimmed text. The functional fixture matrix exercises
    # the function's SEMANTICS but cannot see a context-conditional inserted
    # line (`if os.environ.get("GITHUB_WORKFLOW_REF"): return ""` before the
    # real return) that is inert under the seeded sandbox and blanks every
    # title in production, killing the dedupe; the exact body rejects any
    # inserted line, replacement return, or shadowing variant.
    r26_norm_body=$(printf '%s\n' "$r26_block" | awk '/^[[:space:]]*def _norm_issue_title\(s\):[[:space:]]*$/ { in_n=1 } in_n { t=$0; sub(/^[[:space:]]+/, "", t); sub(/[[:space:]]+$/, "", t); if (t == "") next; print t; if (t ~ /^return /) exit }')
    r26_norm_expected='def _norm_issue_title(s):
return " ".join(re.sub(r"[^0-9a-z]+", " ", (s or "").casefold()).split())'
    [ "$r26_norm_body" = "$r26_norm_expected" ] || r26_bad="${r26_bad} maintainer.yml(norm-body-changed)"
    r26_chain1=$(r26_ln_trim 'if _open_issue_titles is None:')
    r26_chain2=$(r26_ln_trim 'loaded = _load_open_issue_titles()')
    r26_chain3=$(r26_ln_trim '_open_issue_titles = loaded if loaded is not None else {}')
    r26_chain4=$(r26_ln_trim 'existing = _open_issue_titles.get(ntitle) if ntitle else None')
    r26_chain5=$(r26_ln_trim 'if existing:')
    if [ -z "$r26_chain1" ] || [ -z "$r26_chain2" ] || [ -z "$r26_chain3" ] || [ -z "$r26_chain4" ] || [ -z "$r26_chain5" ]; then
      r26_bad="${r26_bad} maintainer.yml(loader-chain-missing)"
    elif [ "$r26_chain2" != "$((r26_chain1 + 1))" ] || [ "$r26_chain3" != "$((r26_chain2 + 1))" ] || [ "$r26_chain4" != "$((r26_chain3 + 1))" ] || [ "$r26_chain5" != "$((r26_chain4 + 1))" ]; then
      r26_bad="${r26_bad} maintainer.yml(loader-chain-not-adjacent)"
    fi
    # Call-site preamble window (adversarial escape hunt M1): the eleven
    # code lines immediately preceding the lazy-load chain (loop head,
    # loop-body guard, action/target extraction, branch opener, title/body
    # reads, create_issue guard, and the ntitle computation) must equal the
    # canonical trimmed text in order and contiguously, so no probe line can
    # be inserted between the branch opener and the chain. The demonstrated
    # escape inserted `gh search issues` there: the probe is inert under the
    # mock (an unmodeled subcommand exits 64, so its result cannot gate
    # anything under audit) but succeeds against real gh, blanks ntitle, and
    # defeats the dedupe on every production run while all functional
    # assertions stay green. Matching drops blank lines: the window has none
    # in the pristine handler, so an inserted blank line also fails.
    if [ -n "$r26_chain1" ]; then
      r26_pre=$(printf '%s\n' "$r26_block" | awk -v c="$r26_chain1" 'NR >= c - 11 && NR <= c - 1 { t=$0; sub(/^[[:space:]]+/, "", t); sub(/[[:space:]]+$/, "", t); if (t != "") print t }')
      r26_pre_expected='for d in decisions:
if not isinstance(d, dict):
continue
action = d.get("action")
pr = d.get("pr")
target = d.get("target") or pr or d.get("issue")
if action in ("create_issue", "create_pr"):
title = d.get("title", "New Item")
body_text = d.get("body", "")
if action == "create_issue":
ntitle = _norm_issue_title(title)'
      [ "$r26_pre" = "$r26_pre_expected" ] || r26_bad="${r26_bad} maintainer.yml(preamble-window-changed)"
    fi
    # Skip-branch shape (review finding F10): the skip print through the
    # terminating `continue` must be six CONSECUTIVE code lines (skip print,
    # in-run check, in-run print, `else:`, triage dispatch, `continue`),
    # with the skip print immediately after `if existing:` and the continue
    # immediately after the triage line. The previous pin only counted
    # `continue` lines between the skip print and the create call, so
    # replacing the bare continue with a conditional (keyed on `ping`, a
    # first-class decision action absent from the fixture set, or on
    # `"\n\n" in body_text`) kept one continue line in range and passed
    # 24/0 while the skip path fell through to `gh issue create`; the full
    # shape pin closes every conditional-continue and inserted-`elif`
    # variant regardless of the gated dimension. The `else:` is located by
    # range so an earlier unrelated `else:` elsewhere in the block cannot
    # satisfy it.
    r26_sb_if=$(r26_ln_trim 'if ntitle in _created_issue_numbers:')
    r26_sb_else=$(printf '%s\n' "$r26_block" | awk -v lo="${r26_skip:-0}" -v hi="${r26_create:-0}" 'NR > lo && NR < hi { t=$0; sub(/^[[:space:]]+/, "", t); sub(/[[:space:]]+$/, "", t); if (t == "else:") { print NR; exit } }')
    if [ -z "$r26_skip" ] || [ -z "$r26_create" ] || [ -z "$r26_triage" ] || [ -z "$r26_inrun" ] || [ -z "$r26_sb_if" ] || [ -z "$r26_sb_else" ] || [ -z "$r26_chain5" ]; then
      r26_bad="${r26_bad} maintainer.yml(skip-branch-missing)"
    else
      r26_skip_cont=$(printf '%s\n' "$r26_block" | grep -nE '^[[:space:]]*continue[[:space:]]*$' | awk -F: -v lo="$r26_skip" -v hi="$r26_create" '$1 > lo && $1 < hi { print $1; exit }')
      if [ "$r26_skip" != "$((r26_chain5 + 1))" ] \
        || [ "$r26_sb_if" != "$((r26_skip + 1))" ] \
        || [ "$r26_inrun" != "$((r26_skip + 2))" ] \
        || [ "$r26_sb_else" != "$((r26_skip + 3))" ] \
        || [ "$r26_triage" != "$((r26_skip + 4))" ] \
        || [ -z "$r26_skip_cont" ] \
        || [ "$r26_skip_cont" != "$((r26_skip + 5))" ]; then
        r26_bad="${r26_bad} maintainer.yml(skip-branch-not-adjacent)"
      fi
    fi
    # Loader-region body pin (review finding F9): the whole
    # `_load_open_issue_titles()` body, from its def line through
    # `return index`, must equal the canonical trimmed-line text below
    # (outer whitespace trimmed, blank lines dropped). This is the
    # class-closing closure for gates that are INERT under every fixture
    # while lethal in production: a cross-dimensional conjunction on
    # individually in-envelope dimensions (`if len(items) >= 5 and
    # len(decisions) == 2: return {}` passed 24/0 because no fixture held
    # five list entries and exactly two decisions together), its
    # no-added-line substitution variant (an extra conjunct appended to the
    # isinstance guard), and its conditional def-shadowing variant (an
    # injected second def whose conditional keeps the real body under audit
    # values) all change this text, add a def occurrence, or add a
    # loader-name occurrence, so each fails structurally. The exact body also
    # rejects index/substrate emptying, early returns, and any edit to the
    # query, parse, or index-build lines; a future legitimate loader edit
    # must update this expected text in the same change, which is the
    # intended audit coupling.
    r26_loader=$(printf '%s\n' "$r26_block" | awk '/^[[:space:]]*def _load_open_issue_titles\(\):[[:space:]]*$/ { in_l=1 } in_l { print; if (/^[[:space:]]*return index[[:space:]]*$/) exit }')
    r26_loader_norm=$(printf '%s\n' "$r26_loader" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -v '^$')
    r26_loader_expected='def _load_open_issue_titles():
r = subprocess.run(
["gh", "issue", "list", "--repo", repo, "--state", "open", "--limit", "1000", "--json", "number,title"],
capture_output=True, text=True, check=False, env=bot_env)
if r.returncode != 0:
print(f"::error::create_issue dedupe query failed; creating without the guard this run (issue #668): {r.stderr.strip()}")
return None
try:
items = json.loads(r.stdout or "[]")
except Exception as e:
print(f"::error::create_issue dedupe query returned unparseable JSON; creating without the guard this run (issue #668): {e}")
return None
index = {}
for it in items:
if not isinstance(it, dict):
continue
n = it.get("number")
t = _norm_issue_title(it.get("title", ""))
if isinstance(n, int) and t and t not in index:
index[t] = n
return index'
    [ "$r26_loader_norm" = "$r26_loader_expected" ] || r26_bad="${r26_bad} maintainer.yml(loader-body-changed)"
    r26_loader_defs=$(printf '%s\n' "$r26_block" | grep -c 'def _load_open_issue_titles' || true)
    [ "${r26_loader_defs:-0}" = "1" ] || r26_bad="${r26_bad} maintainer.yml(loader-def-count:${r26_loader_defs:-0})"
    r26_loader_refs=$(printf '%s\n' "$r26_block" | grep -c '_load_open_issue_titles' || true)
    [ "${r26_loader_refs:-0}" = "2" ] || r26_bad="${r26_bad} maintainer.yml(loader-occurrence-count:${r26_loader_refs:-0})"
    # Whole-handler-block pin (review findings F13/F14/F15; this generalizes
    # and supersedes the F12 setup-prefix pin): every line of the extracted
    # handler block, from its first line through the trailing `PY`, must
    # equal the canonical expected text below, compared RAW (only blank
    # lines dropped, so an indentation-only mutation is caught as well:
    # indentation is syntax in Python, and the trimmed comparisons of the
    # sub-region pins above cannot see it). The F12 pin covered only the
    # region above the main loop, which left three demonstrated families
    # green at 24/0: (F13) a blank-line-keyed gate inserted before the
    # create call silently dropped every create whose body carried a
    # paragraph break (the shape most production bodies have); (F14) a
    # decoy two-line `for d in decisions:` loop inserted before the real
    # loop head stopped the old prefix extraction at the decoy and evaded
    # the eleven-line preamble window, so a `recover`-first tick filed
    # duplicates with zero queries; (F15) an alias of the run-local index
    # cleared by a conditional in the post-create-branch region defeated
    # every lexical structural pin (bare assignments, dotted attribute
    # uses, subscript/delete forms) and re-created an in-run duplicate.
    # Pinning the whole block closes all three plus any future insertion
    # anywhere, indentation changes included; the exact-form loop-head
    # count is pinned separately as belt-and-braces so the F14 shape is
    # rejected by name, and the s31-s36 scenarios below close the same
    # families behaviorally (recover-first leading skip; create-path
    # paragraph-break, absent, and short bodies; posted-comment-before-a-
    # fresh-create; create-lab-create-identical). The sub-region pins above
    # stay for diagnostics. A future legitimate handler edit must update
    # this expected text in the same change, the intended audit coupling
    # already accepted for the loader body and the preamble window.
    r26_full=$(printf '%s\n' "$r26_block" | awk 'NF { print }')
    r26_full_expected=$(cat <<'R26FULL'
python3 -I - <<'PY'
import json, os, re, subprocess, time
repo = os.environ["GITHUB_REPOSITORY"]
owner = os.environ["GITHUB_REPOSITORY_OWNER"]
# Strip GITHUB_TOKEN from env so gh CLI authenticates exclusively via GH_TOKEN (OPENCODE_PAT as owner)
os.environ.pop("GITHUB_TOKEN", None)
bot_env = os.environ.copy()
bot_env["GH_TOKEN"] = os.environ.get("BOT_TOKEN", "")
bot_env.pop("GITHUB_TOKEN", None)
def api(*args, check=True):
    r = subprocess.run(["gh", "api", *args], capture_output=True, text=True, check=check)
    return r.stdout.strip(), r
def pr_info(n):
    out, _ = api(f"repos/{repo}/pulls/{n}", check=False)
    try:
        return json.loads(out)
    except Exception:
        return {}
decisions = []
if os.path.exists(".maintainer/decision.json"):
    try:
        decisions = json.load(open(".maintainer/decision.json"))
    except Exception as e:
        print(f"decision.json unparseable: {e}")
if isinstance(decisions, dict):
    decisions = [decisions]
elif not isinstance(decisions, list):
    decisions = []
if not decisions:
    print("::warning::Maintainer produced no decisions (missing or empty decision.json). "
          "Check the 'Run Maintainer agent' step log: a step timeout, a model/billing error, "
          "or an earlier setup step failure (Get opencode version, Cache opencode, Install opencode) "
          "may have stopped the agent before it wrote its output files. No /oc triggers were posted.")
posted = set()
sweep_failed = False
# SELF-TRIAGE (issue #450): content created with GITHUB_TOKEN never
# emits issues/pull_request opened events, so without a follow-up
# nothing summons triage for the new item. Dispatch a
# workflow_dispatch maintainer run (owner PAT, the default credential
# in this step) carrying the new number, so triage lands within one
# schedule interval with no human ping.
def _self_triage(kind, num, reason=None):
    if not reason:
        reason = f"self-triage bot-created {kind} #{num}"
    rr = subprocess.run(["gh", "workflow", "run", "maintainer.yml", "--repo", repo, "--ref", "main", "-f", f"{kind}={num}", "-f", f"reason={reason}"], capture_output=True, text=True, check=False)
    if rr.returncode == 0:
        print(f"self-triage dispatched for {kind} #{num}")
    else:
        print(f"::error::Failed to self-dispatch triage for {kind} #{num}: {rr.stderr.strip()}")
# CREATE_ISSUE DEDUPE (issue #668): Maintainer concurrency is
# per-target, so two ticks on different PRs can decide on the same
# global finding at once and each created its own issue (#665 filed
# 15:53:13Z by run 39141891238; #666 filed 15:55:43Z by the
# concurrent run 39141877509, before either tick could see the
# other's issue). Before every `gh issue create`, compare the
# decision title against every open issue title under a
# deterministic normalization (casefold, non-alphanumerics to
# spaces, whitespace collapsed) and skip creation when an identical
# normalized title is already open, self-triaging the matched issue
# instead so the finding is never left behind. Query-before-create
# shrinks the concurrent-tick race window from minutes to
# milliseconds; full atomicity is not required (a same-instant race
# between the query and the create can still duplicate). The query
# is fail-open to creation with a loud error: a registry hiccup must
# never drop a decision.
def _norm_issue_title(s):
    return " ".join(re.sub(r"[^0-9a-z]+", " ", (s or "").casefold()).split())
# norm title -> open issue number; None until first needed ({} means
# the query failed and this run creates without the guard).
_open_issue_titles = None
_created_issue_numbers = {}
def _load_open_issue_titles():
    r = subprocess.run(
        ["gh", "issue", "list", "--repo", repo, "--state", "open", "--limit", "1000", "--json", "number,title"],
        capture_output=True, text=True, check=False, env=bot_env)
    if r.returncode != 0:
        print(f"::error::create_issue dedupe query failed; creating without the guard this run (issue #668): {r.stderr.strip()}")
        return None
    try:
        items = json.loads(r.stdout or "[]")
    except Exception as e:
        print(f"::error::create_issue dedupe query returned unparseable JSON; creating without the guard this run (issue #668): {e}")
        return None
    index = {}
    for it in items:
        if not isinstance(it, dict):
            continue
        n = it.get("number")
        t = _norm_issue_title(it.get("title", ""))
        if isinstance(n, int) and t and t not in index:
            index[t] = n
    return index
for d in decisions:
    if not isinstance(d, dict):
        continue
    action = d.get("action")
    pr = d.get("pr")
    target = d.get("target") or pr or d.get("issue")
    if action in ("create_issue", "create_pr"):
        title = d.get("title", "New Item")
        body_text = d.get("body", "")
        if action == "create_issue":
            ntitle = _norm_issue_title(title)
            if _open_issue_titles is None:
                loaded = _load_open_issue_titles()
                _open_issue_titles = loaded if loaded is not None else {}
            existing = _open_issue_titles.get(ntitle) if ntitle else None
            if existing:
                print(f"skip create_issue '{title}': open issue #{existing} already carries the identical normalized title (dedupe, issue #668)")
                if ntitle in _created_issue_numbers:
                    print(f"issue #{existing} was created earlier in this run; triage already dispatched (no duplicate dispatch)")
                else:
                    _self_triage("issue_number", existing, reason=f"dedupe match: open issue #{existing} already carries the identical normalized title (issue #668)")
                continue
            r = subprocess.run(["gh", "issue", "create", "--repo", repo, "--title", title, "--body", body_text], capture_output=True, text=True, check=False, env=bot_env)
            if r.returncode == 0:
                m = re.search(r"/issues/(\d+)", r.stdout or "")
                if m:
                    if ntitle:
                        _created_issue_numbers[ntitle] = int(m.group(1))
                        _open_issue_titles.setdefault(ntitle, int(m.group(1)))
                    print(f"Created new issue #{m.group(1)}: {title}")
                    _self_triage("issue_number", m.group(1))
                else:
                    print(f"Created new issue: {title}")
                    print(f"::error::Could not parse new issue number from: {(r.stdout or '').strip()[:200]} (triage falls back to schedule plus the UNTRIAGED sweep rule)")
            else:
                print(f"::error::Failed to create issue '{title}': {r.stderr.strip()}")
        else:
            head = d.get("head", "")
            if head:
                r = subprocess.run(["gh", "pr", "create", "--repo", repo, "--head", head, "--base", "main", "--title", title, "--body", body_text], capture_output=True, text=True, check=False, env=bot_env)
                if r.returncode == 0:
                    print(f"Created new PR for branch: {head}")
                    m = re.search(r"/pull/(\d+)", r.stdout or "")
                    if m:
                        _self_triage("pr_number", m.group(1))
                    else:
                        print(f"::error::Could not parse new PR number from: {(r.stdout or '').strip()[:200]} (triage falls back to schedule plus the UNTRIAGED sweep rule)")
                else:
                    print(f"::error::Failed to create PR for '{head}': {r.stderr.strip()}")
        continue
    # SWEEP DISPATCH (PAT-backed): run a sweep/train workflow whose
    # completion must summon triage. Runs dispatched with the bot
    # token do NOT emit workflow_run triggers (platform
    # anti-recursion), so their failures complete silently - sweeps
    # must go out with the owner credential. Handled here (never
    # via an agent-run gh call, never via /oc comment) because no
    # agent env may hold the PAT.
    SWEEP_ALLOWLIST = ("poolduel-m1", "poolduel-m2", "poolduel-m9", "poolduel-m10-soak", "tor-cli", "pet-release")
    if action == "sweep":
        wf = d.get("workflow", "")
        ref = d.get("ref", "") or "main"
        inputs = d.get("inputs", "") or {}
        skey = ("sweep", wf, ref, json.dumps(inputs, sort_keys=True) if isinstance(inputs, dict) else str(inputs))
        if skey in posted:
            print(f"skip sweep '{wf}' (duplicate in this run)")
            continue
        if wf not in SWEEP_ALLOWLIST:
            print(f"::error::Refusing sweep dispatch for '{wf}': not in allowlist {list(SWEEP_ALLOWLIST)} (route new sweep workflows via lab first)")
            sweep_failed = True
            continue
        if not isinstance(inputs, dict):
            print(f"::error::sweep 'inputs' must be an object for '{wf}'")
            sweep_failed = True
            continue
        cmd = ["gh", "workflow", "run", wf, "--repo", repo, "--ref", ref]
        for k, v in inputs.items():
            cmd += ["-f", f"{k}={v}"]
        r = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if r.returncode != 0:
            print(f"::error::Failed to dispatch sweep '{wf}': {r.stderr.strip()}")
            sweep_failed = True
            continue
        print(f"dispatched sweep '{wf}' on ref '{ref}'" + (f" inputs {inputs}" if inputs else " (defaults)"))
        # Run-existence verification (issue #399): a dispatch that
        # emits no run must fail loudly instead of silently
        # blocking closure. Resolve the ref to its head SHA, then
        # poll for a matching workflow_dispatch run.
        expected_sha = ""
        rr = subprocess.run(["gh", "api", f"repos/{repo}/git/ref/heads/{ref}", "--jq", ".object.sha"], capture_output=True, text=True, check=False)
        if rr.returncode == 0 and rr.stdout.strip():
            expected_sha = rr.stdout.strip().lower()
        elif len(ref) >= 4 and all(c in "0123456789abcdef" for c in ref.lower()):
            expected_sha = ref.lower()
        def _sweep_match(run):
            if run.get("event") != "workflow_dispatch":
                return False
            if expected_sha:
                return run.get("headSha", "").lower().startswith(expected_sha[:12])
            return run.get("headBranch", "") == ref
        found = False
        for attempt in range(6):
            time.sleep(30)
            lr = subprocess.run(["gh", "run", "list", "--repo", repo, "--workflow", wf, "--event", "workflow_dispatch", "--limit", "10", "--json", "databaseId,headSha,headBranch,event,createdAt"], capture_output=True, text=True, check=False)
            try:
                runs = json.loads(lr.stdout) if lr.returncode == 0 else []
            except Exception:
                runs = []
            for run in runs:
                if _sweep_match(run):
                    print(f"verified sweep '{wf}' run {run.get('databaseId')} on {(run.get('headSha') or '')[:12]} (attempt {attempt + 1})")
                    found = True
                    break
            if found:
                break
            print(f"sweep '{wf}' run not yet visible (attempt {attempt + 1}/6)")
        if found:
            posted.add(skey)
        else:
            print(f"::error::Sweep '{wf}' dispatched on ref '{ref}' but no workflow_dispatch run on {(expected_sha[:12] if expected_sha else ref)} appeared within 3m (dispatch misfire or allowlist drift)")
            sweep_failed = True
        continue
    if not target:
        continue
    try:
        target = int(target)
    except (ValueError, TypeError):
        print(f"::warning::Skipping malformed target '{target}' for action '{action}'")
        continue
    key = (action, target)
    if key in posted:
        print(f"skip {action} #{target} (one trigger per PR per run)")
        continue
    body = None
    if action == "review":
        head = d.get("head", "")
        body = f"/oc review (head {head})"
    elif action == "test":
        body = "/oc test"
    elif action == "test-linux":
        body = "/oc test-linux"
    elif action == "test-macos":
        body = "/oc test-macos"
    elif action == "test-windows":
        body = "/oc test-windows"
    elif action == "eval":
        body = "/oc eval"
    elif action == "continue":
        body = "/oc continue"
    elif action == "build":
        body = "/oc build this"
    elif action == "auditor":
        body = "/oc auditor"
    elif action == "curate":
        body = "/oc curate"
    elif action == "architect":
        body = "/oc architect"
    elif action == "research":
        body = "/oc research"
    elif action == "design":
        body = "/oc design"
    elif action == "design-ux":
        body = "/oc design-ux"
    elif action == "design-visual":
        body = "/oc design-visual"
    elif action == "design-motion":
        body = "/oc design-motion"
    elif action == "lab":
        extra = d.get("instruction") or d.get("mode") or ""
        if extra:
            body = f"/oc lab {extra}"
        else:
            body = "/oc lab"
    elif action == "recover":
        # Maintainer's ONLY self-initiated branch/PR action: recover
        # in-flight work from a closed/orphaned build PR. Never opens
        # a new project; only continues existing work (recover.sh and
        # recover.yml enforce this). This is the governance exception
        # granted by issue #112.
        body = "/oc recover"
    elif action == "fix":
        info = pr_info(target)
        author = info.get("user", {}).get("login", "")
        head_repo = (info.get("head", {}) or {}).get("repo", {}) or {}
        same_repo = head_repo.get("full_name", "") == repo
        if author not in ("github-actions[bot]", "app/github-actions") or not same_repo:
            print(f"skip fix #{target} (not a same-repo bot PR: author={author} repo={head_repo.get('full_name')})")
            continue
        body = "/oc fix"
    if body:
        r = subprocess.run(
            ["gh", "api", f"repos/{repo}/issues/{target}/comments", "-f", f"body={body}"],
            capture_output=True,
            text=True,
            check=False,
        )
        if r.returncode == 0:
            posted.add(key)
            print(f"posted '{body}' on #{target}")
        else:
            print(f"::error::Failed to post '{body}' on #{target}: {r.stderr.strip()}")
if sweep_failed:
    print("::error::Sweep dispatch or run-existence verification failed (see errors above); failing loudly so the missing-run gap pages triage instead of silently blocking closure")
    raise SystemExit(1)
PY
R26FULL
)
    [ "$r26_full" = "$r26_full_expected" ] || r26_bad="${r26_bad} maintainer.yml(handler-block-changed)"
    r26_loop_heads=$(printf '%s\n' "$r26_block" | grep -cE '^[[:space:]]*for d in decisions:[[:space:]]*$' || true)
    [ "${r26_loop_heads:-0}" = "1" ] || r26_bad="${r26_bad} maintainer.yml(loop-head-count:${r26_loop_heads:-0})"

    # Structural pins (adversarial verification finding, applied): the
    # run-local index may only be assigned by its initialization and the
    # single fail-open line, so an inserted environment-conditional
    # re-assignment (the demonstrated `{} if "R26_CALLS" not in os.environ
    # else ...` / GITHUB_ACTIONS backdoor shape) lands as an extra
    # assignment; and the only attribute accesses on it are the .get lookup
    # and the .setdefault record, so a .clear()/.update()/.pop() sabotage
    # needs no new assignment line to empty the index.
    r26_assign_n=$(printf '%s\n' "$r26_block" | grep -cE '^[[:space:]]*_open_issue_titles[[:space:]]*=[^=]' || true)
    [ "${r26_assign_n:-0}" = "2" ] || r26_bad="${r26_bad} maintainer.yml(index-assignments:${r26_assign_n:-0})"
    r26_attr=$(printf '%s\n' "$r26_block" | grep -oE '_open_issue_titles\.[A-Za-z_]+' | sort -u | tr '\n' '|' || true)
    [ "$r26_attr" = "_open_issue_titles.get|_open_issue_titles.setdefault|" ] || r26_bad="${r26_bad} maintainer.yml(index-attribute-uses:${r26_attr})"
    # Subscript writes/deletes (review finding F5): `_open_issue_titles[
    # ntitle] = None` or `del _open_issue_titles[ntitle]` in the skip branch
    # defeats the in-run dedupe while the bare-assignment and attribute pins
    # above stay satisfied, so both forms are rejected; the extended
    # three-decision in-run scenario below catches them behaviorally as well.
    printf '%s\n' "$r26_block" | grep -qE '_open_issue_titles[[:space:]]*\[|del[[:space:]]+_open_issue_titles' && r26_bad="${r26_bad} maintainer.yml(index-subscript-or-delete)"
  # Functional: extract the REAL normalization function body from the
  # extracted block and run it, so a semantics change (fuzzy matching, case
  # fold removed, punctuation kept) cannot land while the static markers
  # still pass. The extractor takes the first definition, so exactly one must
  # exist (review finding F7): a shadowing second definition would otherwise
  # leave the fixture matrix testing dead code.
  r26_norm_defs=$(printf '%s\n' "$r26_block" | grep -c 'def _norm_issue_title' || true)
  [ "${r26_norm_defs:-0}" = "1" ] || r26_bad="${r26_bad} maintainer.yml(norm-def-count:${r26_norm_defs:-0})"
  r26_fn=$(printf '%s\n' "$r26_block" | awk '/def _norm_issue_title\(s\):/ { in_fn=1 } in_fn { print; if (/return /) exit }' 2>/dev/null)
  if [ -z "$r26_fn" ]; then
    r26_bad="${r26_bad} maintainer.yml(norm-function-not-extractable)"
  else
    r26_fixture_out=$(R26_FN="$r26_fn" python3 -I - <<'R26PY' 2>&1
import os, re, textwrap
src = textwrap.dedent(os.environ["R26_FN"])
ns = {"re": re}
exec(src, ns)
f = ns["_norm_issue_title"]
sid_665 = "[Infra] postformer-cpu-train targets pre-archive paths: every dispatch fails (retire or repoint)"
sid_666 = "[Infra] postformer-cpu-train.yml targets the pre-archive postformer/ path and fails on any dispatch"
# Long-tail pair (tester finding B1): both titles exceed 80 characters,
# share a >80-character prefix, and differ only in the final word, so any
# truncation (`[:60]`, `[:80]`) or a `len > 80` fragment gate collapses them
# into a false match and the expected-NON-match fixture fails.
long_a = "[Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path alpha"
long_b = "[Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path bravo"
cases = [
    ("case-fold-matches", "Postformer CPU Train", "postformer cpu train", True),
    ("unicode-casefold", "Stra\u00dfe Fix", "strasse fix", True),
    ("punctuation-space-collapse", "[Infra] Foo: bar, baz! (v2)", "[INFRA]  foo bar   baz v2", True),
    ("hyphen-equals-space", "postformer-cpu-train", "postformer cpu train", True),
    ("underscore-equals-space", "postformer_cpu_train", "postformer cpu train", True),
    ("digits-discriminate-suffix", "[Infra] poolduel-m1 sweep fails", "[Infra] poolduel-m2 sweep fails", False),
    ("digits-discriminate-issue-number", "issue 665 cleanup", "issue 666 cleanup", False),
    ("space-placement-matters", "foo bar", "foobar", False),
    ("long-tail-differs", long_a, long_b, False),
    ("distinct-titles-differ", "Alpha defect", "Beta defect", False),
    ("none-is-empty", None, "", True),
    ("paraphrase-pair-conservative", sid_665, sid_666, False),
]
bad = []
for name, a, b, want in cases:
    got = f(a) == f(b)
    if got != want:
        bad.append(f"{name}(got {got} want {want})")
print(";".join(bad))
R26PY
)
    if [ -n "$r26_fixture_out" ]; then
      r26_bad="${r26_bad} functional(norm-fixtures: ${r26_fixture_out})"
    fi
  fi
  # Functional sandbox (review finding F2; delegation.md section 6: executable
  # mocks, interception proven before the matrix, non-credential Actions env
  # set production-shaped, credentials scrubbed, sandbox outside the repo,
  # per-scenario timeout): execute the REAL extracted handler block under the
  # runner's `bash -e` shell against a mock `gh` across the fresh-create,
  # normalized-match skip+triage, in-run duplicate, query-failure fail-open,
  # and bad-JSON fail-open scenarios, so no plain one-line control-flow
  # mutation (`loaded = {}`, `if False:`, a removed skip-branch `continue`, a
  # dead triage dispatch, a dropped in-run index record) can conclude green
  # while the dedupe is disabled. The demonstrated env-sensing backdoor class
  # (fingering GITHUB_ACTIONS or a harness-specific variable so the sabotage
  # keeps the guard only under audit) is closed as well: GITHUB_ACTIONS and
  # the non-credential context are set production-shaped (matching the
  # R17/R19/R22 harnesses) and NO harness-specific variable reaches the
  # handler; the mock's state paths are baked into the mock script itself.
  # Deliberate identity fingerprinting on values a sandbox cannot avoid
  # (fixture token strings, sandbox paths) remains review-gated and is
  # documented as a residual.
  if ! command -v python3 >/dev/null 2>&1 || ! command -v timeout >/dev/null 2>&1; then
    r26_bad="${r26_bad} maintainer.yml(functional-missing-python3-or-timeout)"
  else
    r26_tmp=$(mktemp -d 2>/dev/null || true)
    if [ -z "$r26_tmp" ] || [ ! -d "$r26_tmp" ]; then
      r26_bad="${r26_bad} maintainer.yml(functional-sandbox-unavailable)"
    else
      r26_bin="$r26_tmp/bin"
      r26_state="$r26_tmp/state"
      mkdir -p "$r26_bin" "$r26_state" "$r26_tmp/home" "$r26_tmp/tmp"
      printf '%s\n' "$r26_block" > "$r26_tmp/block.sh"
      R26_PAT='owner-pat-fixture'
      R26_BOT='bot-token-fixture'
      cat > "$r26_bin/gh.tpl" <<'R26GH'
#!/usr/bin/env bash
state="__R26_STATE__"
# One log line per invocation: argv newlines (a realistic multi-line issue
# body) are flattened to spaces so token/flag assertions stay on the call's
# own line.
r26_logline=$(printf '%s' "gh $* token=${GH_TOKEN:-}" | tr '\n' ' ')
printf '%s\n' "$r26_logline" >> "$state/calls"
case "${1:-}" in
  issue)
    case "${2:-}" in
      list)
        mode="ok"
        [ -f "$state/mode" ] && mode=$(cat "$state/mode")
        case "$mode" in
          fail) echo "R26 simulated registry failure" >&2; exit 1 ;;
          garbage) printf 'not-json{\n'; exit 0 ;;
        esac
        # Exact element-wise argv enforcement (tester finding B2 plus
        # adversarial escapes E2/Q4/Q5): the fixture list is served ONLY when
        # the query argv matches the pinned invocation token for token.
        # Substring presence was not enough (a repeated scalar flag is
        # pflag last-wins, an added --search filter changes the result set),
        # and a lossy space-joined `"$*"` comparison was not enough either
        # (merging adjacent tokens into one argv element reproduced the
        # joined string while real gh sees an unknown flag and fail-opens).
        # Comparing the argument COUNT plus every positional element rejects
        # reorders, repeated flags, added filters, and merged/split tokens
        # alike; any deviation empties the served list, so the tampering
        # handler creates and fails the skip assertions instead of passing
        # behind a decoy string/comment pin.
        if [ "$#" -ne 10 ] \
          || [ "$1" != "issue" ] || [ "$2" != "list" ] \
          || [ "$3" != "--repo" ] || [ "$4" != "RandomLabs/RandomLabs" ] \
          || [ "$5" != "--state" ] || [ "$6" != "open" ] \
          || [ "$7" != "--limit" ] || [ "$8" != "1000" ] \
          || [ "$9" != "--json" ] || [ "${10}" != "number,title" ]; then
          printf '[]\n'; exit 0
        fi
        # Newline fidelity (review finding F6): real `gh ... --json` output
        # ends with a trailing newline (`od -c` on live gh shows `] \n`), so
        # the mock emits one on every path; without it a loader gate like
        # `if r.stdout.endswith("\n"): return {}` would pass the audit while
        # disabling the dedupe in production.
        if [ -f "$state/list.json" ]; then
          cat "$state/list.json"
          printf '\n'
        else
          printf '[]\n'
        fi
        ;;
      create)
        n=0
        [ -f "$state/create-count" ] && n=$(cat "$state/create-count")
        n=$((n + 1))
        printf '%s\n' "$n" > "$state/create-count"
        printf 'https://github.com/RandomLabs/RandomLabs/issues/%s\n' "$((899 + n))"
        ;;
      *) echo "R26 mock gh: unexpected issue subcommand '${2:-}'" >&2; exit 64 ;;
    esac
    ;;
  workflow)
    [ "${2:-}" = "run" ] || { echo "R26 mock gh: unexpected workflow subcommand '${2:-}'" >&2; exit 64; }
    ;;
  api)
    # Comment posting from ordinary non-create actions (the mixed-action
    # scenario posts before the matching create so a `posted`-keyed gate
    # cannot hide behind an empty run-state).
    printf '{}\n'
    ;;
  *) echo "R26 mock gh: unexpected command '${1:-}'" >&2; exit 64 ;;
esac
exit 0
R26GH
      sed "s|__R26_STATE__|$r26_state|" "$r26_bin/gh.tpl" > "$r26_bin/gh" && rm -f "$r26_bin/gh.tpl"
      chmod +x "$r26_bin/gh"
      if [ "$(env PATH="$r26_bin:$PATH" bash -c 'command -v gh' 2>/dev/null || true)" != "$r26_bin/gh" ]; then
        r26_bad="${r26_bad} maintainer.yml(functional-mock-not-intercepted)"
      else
        : > "$r26_state/calls"
        : > "$r26_state/calls-all"
        env PATH="$r26_bin:$PATH" GH_TOKEN=probe bash -c 'gh issue list --repo probe --state open --limit 1000 --json number,title' >/dev/null 2>&1 || true
        if ! grep -qF 'gh issue list' "$r26_state/calls" 2>/dev/null; then
          r26_bad="${r26_bad} maintainer.yml(functional-mock-probe-failed)"
        else
          r26_fail() { r26_bad="${r26_bad} maintainer.yml(functional-$1)"; }
          r26_check() { [ "$2" = "1" ] || r26_fail "$1"; }
          r26_calls() { grep -cF -- "$1" "$r26_state/calls" 2>/dev/null || true; }
          r26_out_has() { grep -qF -- "$1" "$2/out" 2>/dev/null && echo 1 || echo 0; }
          r26_rc0() { [ "$(cat "$1/rc" 2>/dev/null)" = "0" ] && echo 1 || echo 0; }
          r26_rc_is() { [ "$(cat "$1/rc" 2>/dev/null)" = "$2" ] && echo 1 || echo 0; }
          r26_triage_on() { grep -F 'gh workflow run' "$r26_state/calls" 2>/dev/null | grep -qF -- "issue_number=$1" && echo 1 || echo 0; }
          r26_token_on() { grep -F -- "$1" "$r26_state/calls" 2>/dev/null | grep -qF -- "token=$2" && echo 1 || echo 0; }
          r26_run() {
            local dir="$1" mode="$2" list_file="$3" dec="$4" event="${5:-schedule}" plant_gh="${6:-}"
            rm -rf "$dir"
            mkdir -p "$dir/work/.maintainer" "$dir/home" "$dir/tmp"
            printf '%s' "$dec" > "$dir/work/.maintainer/decision.json"
            # Repo-root shadow mirror (review findings F20/F22/F23): the
            # handler step now runs isolated (`python3 -I -`, pinned in the
            # exact-text handler block), so a repo-root module can no longer
            # reach it; mirror the repo root's top-level files in EVERY
            # importable spelling (*.py, *.pyc, *.so, *.pyd) and package
            # directories carrying any importable __init__ artifact into the
            # work dir as defense in depth, so an isolation regression that
            # somehow survives the exact-text pin also surfaces behaviorally
            # (the static scan above already fails loudly on a watched-module
            # shadow).
            if [ -n "$R26_REPO_ROOT" ]; then
              for r26_shadow in "$R26_REPO_ROOT"/*.py "$R26_REPO_ROOT"/*.pyc "$R26_REPO_ROOT"/*.so "$R26_REPO_ROOT"/*.pyd; do
                [ -e "$r26_shadow" ] || continue
                ln -sf "$r26_shadow" "$dir/work/$(basename "$r26_shadow")"
              done
              for r26_shadow_dir in "$R26_REPO_ROOT"/*/; do
                [ -d "$r26_shadow_dir" ] || continue
                if [ -f "${r26_shadow_dir}__init__.py" ] || compgen -G "${r26_shadow_dir}__init__.*" >/dev/null 2>&1; then
                  ln -sfn "${r26_shadow_dir%/}" "$dir/work/$(basename "${r26_shadow_dir%/}")"
                fi
              done
            fi
            printf '%s\n' "$mode" > "$r26_state/mode"
            if [ -n "$list_file" ] && [ -f "$list_file" ]; then
              cp "$list_file" "$r26_state/list.json"
            else
              printf '[]' > "$r26_state/list.json"
            fi
            cat "$r26_state/calls" >> "$r26_state/calls-all" 2>/dev/null || true
            : > "$r26_state/calls"
            : > "$r26_state/create-count"
            # PATH composition from the pinned workflow steps (review finding
            # F25, defense in depth): the extractor derived the directory
            # list from the exact-pinned `$GITHUB_PATH` step(s), and the
            # runner puts those directories ahead of everything else on a
            # later step's PATH. The sandbox mirrors that order honestly: a
            # derived directory that resolves under $GITHUB_WORKSPACE is
            # materialized from the repo (so a committed executable planted
            # there would shadow the mock exactly as it shadows real gh in
            # production and drain the invocation log), and every derived
            # directory is prepended BEFORE the mock bin. The static pins
            # above already reject any unlisted GITHUB_PATH write, so this
            # layer only matters if a future escape defeats them, and then
            # the fixture assertions fail loudly instead of passing with a
            # hijacked binary.
            r26_path_prefix=""
            if [ -n "$r26_pathdirs_cfg" ]; then
              while IFS= read -r r26_pd; do
                [ -n "$r26_pd" ] || continue
                case "$r26_pd" in
                  '$HOME'*)
                    r26_pd_resolved="$dir/home${r26_pd#\$HOME}"
                    ;;
                  '$GITHUB_WORKSPACE'*)
                    r26_pd_rel="${r26_pd#\$GITHUB_WORKSPACE/}"
                    [ -n "$r26_pd_rel" ] || continue
                    if [ -n "$R26_REPO_ROOT" ] && [ -e "$R26_REPO_ROOT/$r26_pd_rel" ]; then
                      mkdir -p "$dir/work/$(dirname "$r26_pd_rel")"
                      cp -R "$R26_REPO_ROOT/$r26_pd_rel" "$dir/work/$r26_pd_rel" 2>/dev/null || true
                    fi
                    r26_pd_resolved="$dir/work/$r26_pd_rel"
                    ;;
                  /*)
                    r26_pd_resolved="$r26_pd"
                    ;;
                  *)
                    r26_pd_resolved="$dir/work/$r26_pd"
                    ;;
                esac
                mkdir -p "$r26_pd_resolved" 2>/dev/null || true
                r26_path_prefix="${r26_path_prefix}${r26_pd_resolved}:"
              done <<< "$r26_pathdirs_cfg"
            fi
            # Derived-PATH shadow probe (review finding F25, defense in
            # depth): plant a failing fake `gh` into the FIRST resolved
            # derived directory (the pinned $HOME/.opencode/bin). If the
            # composed PATH still puts derived directories ahead of the mock
            # bin, the planted binary is what the handler invokes and the
            # mock invocation log stays empty; a reordering regression
            # (mock bin first) flips the pathshadow scenario's assertions
            # loudly instead of silently neutralizing the composition.
            if [ "$plant_gh" = "plant" ] && [ -n "$r26_path_prefix" ]; then
              r26_first_resolved="${r26_path_prefix%%:*}"
              printf '#!/usr/bin/env bash\nexit 64\n' > "$r26_first_resolved/gh"
              chmod +x "$r26_first_resolved/gh"
            fi
            (
              cd "$dir/work" || exit 1
              # Fully hermetic env (review observation): `env -i` builds the
              # handler environment from scratch, so NO ambient runner
              # variable (GITHUB_*, ACTIONS_*, or anything else) reaches the
              # handler - only the explicit production-shaped set below.
              # Detection of env-keyed gates is therefore independent of the
              # ambient CI environment, not just of the six unset secrets.
              env -i \
                PATH="${r26_path_prefix}$r26_bin:$PATH" HOME="$dir/home" TMPDIR="$dir/tmp" \
                GITHUB_ACTIONS=true GITHUB_REPOSITORY="RandomLabs/RandomLabs" GITHUB_REPOSITORY_OWNER="RandomLabs" \
                GITHUB_WORKFLOW=maintainer GITHUB_JOB=maintainer GITHUB_RUN_ID=4242424242 \
                GITHUB_EVENT_NAME=$event GITHUB_ACTOR="github-actions[bot]" \
                GITHUB_SHA=0123456789abcdef0123456789abcdef01234567 GITHUB_REF=refs/heads/main \
                GITHUB_REF_NAME=main GITHUB_REF_TYPE=branch \
                GITHUB_SERVER_URL=https://github.com GITHUB_API_URL=https://api.github.com \
                GITHUB_GRAPHQL_URL=https://api.github.com/graphql GITHUB_WORKSPACE="$dir/work" \
                RUNNER_OS=Linux RUNNER_ARCH=X64 CI=true \
                GH_TOKEN="$R26_PAT" BOT_TOKEN="$R26_BOT" \
                timeout 60 bash -e "$r26_tmp/block.sh"
            ) > "$dir/out" 2>&1
            echo $? > "$dir/rc"
          }
          # Realistic multi-line bodies in every scenario decision EXCEPT
          # the deliberate short-body (s21, 23 chars) and absent-body (s24)
          # probes (review finding F4 plus its escape hunt): the previous
          # one-character bodies made the whole fixture set blind to a gate
          # on the decision body length (`if len(body_text) > 1: existing =
          # None` kills the dedupe on every real tick while the fixtures
          # stayed green); the body below is production-shaped, multi-line
          # and >200 characters.
          r26_body="Finding: two concurrent Maintainer ticks filed the same global issue twice before either could see the other.\nEvidence: run 39141891238 filed #665 at 15:53:13Z; run 39141877509 filed #666 at 15:55:43Z.\nFix: query open issues before creating and skip on an identical normalized title."
          r26_dec_s1="[{\"action\": \"create_issue\", \"title\": \"Brand New Finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s2="[{\"action\": \"create_issue\", \"title\": \"[Infra] Postformer-CPU-TRAIN targets pre-archive paths! (retire or repoint)\", \"body\": \"$r26_body\"}]"
          r26_dec_s3="[{\"action\": \"create_issue\", \"title\": \"Duplicate Finding\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"duplicate-finding\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"Duplicate  Finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s4="[{\"action\": \"create_issue\", \"title\": \"Fail Open Finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s5="[{\"action\": \"create_issue\", \"title\": \"Garbage JSON Finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s6="[{\"action\": \"create_issue\", \"title\": \"A Repeat Finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s7="[{\"action\": \"create_issue\", \"title\": \"Legacy Repeat Finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s8="[{\"action\": \"create_issue\", \"title\": \"Third Repeat Finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s9="[{\"action\": \"create_issue\", \"title\": \"[Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path alpha\", \"body\": \"$r26_body\"}]"
          r26_dec_s10="[{\"action\": \"create_issue\", \"title\": \"Fix bug 43\", \"body\": \"$r26_body\"}]"
          r26_dec_s11="[{\"action\": \"create_issue\", \"title\": \"Patch v1\", \"body\": \"$r26_body\"}]"
          r26_dec_s12="[{\"action\": \"create_issue\", \"title\": \"[Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path mode b\", \"body\": \"$r26_body\"}]"
          r26_dec_s13="[{\"action\": \"create_issue\", \"title\": \"Swift6 migration\", \"body\": \"$r26_body\"}]"
          r26_dec_s14="[{\"action\": \"create_issue\", \"title\": \"Worker v10\", \"body\": \"$r26_body\"}]"
          r26_dec_s15="[{\"action\": \"create_issue\", \"title\": \"First Fresh Finding\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"Second Fresh Finding\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"third-time-finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s16="[{\"action\": \"create_issue\", \"title\": \"targeted-finding\", \"body\": \"$r26_body\", \"target\": \"main\"}]"
          r26_dec_s17="[{\"action\": \"sweep\", \"workflow\": \"r26-unallowlisted-workflow\", \"ref\": \"main\"}, {\"action\": \"test\", \"pr\": 123}, {\"action\": \"create_issue\", \"title\": \"Mixed Context Finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s18="[{\"action\": \"create_issue\", \"title\": \"First Two-Decision Finding\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"two decision finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s19="[{\"action\": \"create_issue\", \"title\": \"First Four-Decision Finding\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"Second Four-Decision Finding\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"Third Four-Decision Finding\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"four decision finding\", \"body\": \"$r26_body\"}]"
          r26_multi_actions="["
          for r26_act in review test test-linux test-macos test-windows eval continue build auditor curate architect research design design-ux design-visual design-motion lab recover fix; do
            r26_multi_actions="$r26_multi_actions{\"action\": \"$r26_act\", \"pr\": 200}, "
          done
          # ping (with target) and ideate are first-class maintainer decision
          # actions (the decision schema) that this handler must stay inert
          # on: the trigger handler posts nothing for them, so the comment
          # count stays 18 and the fixture change is behavior-neutral;
          # their presence in the decision list is what makes a conditional
          # skip-branch continue keyed on either action fire under audit
          # (review finding F10's demonstrated `ping` key).
          r26_multi_actions="$r26_multi_actions{\"action\": \"ping\", \"target\": 582, \"message\": \"r26 fixture ping\"}, {\"action\": \"ideate\"}, "
          r26_multi_actions="$r26_multi_actions{\"action\": \"create_pr\", \"head\": \"opencode/lab-r26-fixture\", \"title\": \"r26 fixture pr\", \"body\": \"$r26_body\"}, {\"action\": \"create_issue\", \"title\": \"non create context finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s20="$r26_multi_actions"
          r26_dec_s21="[{\"action\": \"create_issue\", \"title\": \"short body finding\", \"body\": \"Short single-line body.\"}]"
          r26_dec_s22="[{\"action\": \"create_issue\", \"title\": \"two line body finding\", \"body\": \"Two-line dedupe body line one, about seventy characters long overall.\nLine two closes the body.\"}]"
          r26_dec_s23="[{\"action\": \"create_issue\", \"title\": \"event dispatch finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s24="[{\"action\": \"create_issue\", \"title\": \"absent body finding\"}]"
          r26_dec_s25="[{\"action\": \"create_issue\", \"title\": \"early match finding\", \"body\": \"$r26_body\"}, {\"action\": \"lab\", \"pr\": 124}]"
          # Paragraph-break body (review finding F10's second demonstrated
          # key): real issue bodies routinely carry blank lines, so a gate on
          # `"\n\n" in body_text` is invisible to every fixture body (the
          # production-shaped r26_body, the 23-char single-line s21 body, and
          # the two-line s22 body carry no consecutive newlines); s27's body
          # does, so the gate fires under audit.
          r26_dec_s27="[{\"action\": \"create_issue\", \"title\": \"paragraph break finding\", \"body\": \"Paragraph one about the duplicate finding, long enough to look like a real body on its own.\\n\\nParagraph two after a blank line, which real maintainer bodies routinely have.\"}]"
          # Leading-action scenarios (review finding F12): the fixture set
          # previously led with a non-create action only in s17 (sweep) and
          # s20 (review), so a gate above the loop keyed on the LEADING
          # decision action (`if decisions and decisions[0].get("action") ==
          # "ping":` plus an index emptying, a norm-lambda rebind, or a
          # decision-drop comprehension) never fired under audit while
          # disabling the dedupe on ping-first production ticks (this
          # thread's own maintainer ticks post `[ping #687, ping #669]`).
          # ping (with target), ideate (targetless), and lab (comment post)
          # now each lead the matching decision, so any leading-action-keyed
          # gate breaks the zero-create, one-triage, loud-skip assertions.
          r26_dec_s28="[{\"action\": \"ping\", \"target\": 582, \"message\": \"r26 fixture leading ping\"}, {\"action\": \"create_issue\", \"title\": \"leading ping finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s29="[{\"action\": \"ideate\"}, {\"action\": \"create_issue\", \"title\": \"leading ideate finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s30="[{\"action\": \"lab\", \"pr\": 124}, {\"action\": \"create_issue\", \"title\": \"leading lab finding\", \"body\": \"$r26_body\"}]"
          # Round-7 findings F13/F14/F15 behavioral scenarios (defense-in-
          # depth for the whole-block pin): F13's create-path gates are
          # caught by s32-s35 (a paragraph-break, an absent, and a short
          # body on the CREATE path, plus a posted comment before a fresh
          # create), F14's leading-action key by s31 (recover-first), and
          # F15's index-alias clear by s36 (create, lab, create-identical:
          # a cleared or rebuilt run-local index re-creates the duplicate
          # on the third decision).
          r26_dec_s31="[{\"action\": \"recover\", \"pr\": 600}, {\"action\": \"create_issue\", \"title\": \"leading recover finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s32="[{\"action\": \"create_issue\", \"title\": \"blank line create finding\", \"body\": \"Paragraph one about the duplicate finding, long enough to look like a real body on its own.\\n\\nParagraph two after a blank line, which real maintainer bodies routinely have.\"}]"
          r26_dec_s33="[{\"action\": \"create_issue\", \"title\": \"absent body create finding\"}]"
          r26_dec_s34="[{\"action\": \"create_issue\", \"title\": \"short body create finding\", \"body\": \"Short single-line body.\"}]"
          r26_dec_s35="[{\"action\": \"test\", \"pr\": 200}, {\"action\": \"create_issue\", \"title\": \"posted context finding\", \"body\": \"$r26_body\"}]"
          r26_dec_s36="[{\"action\": \"create_issue\", \"title\": \"Alias Clear Finding\", \"body\": \"$r26_body\"}, {\"action\": \"lab\", \"pr\": 124}, {\"action\": \"create_issue\", \"title\": \"alias clear finding\", \"body\": \"$r26_body\"}]"
          r26_long_title="[Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path with a deliberately long appended tail for the envelope"
          r26_dec_s26="[{\"action\": \"create_issue\", \"title\": \"$r26_long_title\", \"body\": \"$r26_body\"}]"
          # Five-entry fixture lists in the newest-first order that real
          # `gh issue list` serves (tester finding B3 plus adversarial escapes
          # E1/E4/L06/L07/P1/P2 and the round-3 order-dependent rebuild):
          # EVERY entry is a scenario match, at index 0 (#670, s9), index 1
          # (#669, s8), index 2 (#668, s6), index 3 (#665, s2) and index 4
          # (#663, s7), so a cardinality gate at or below the fixture
          # envelope, a prefix truncation `items[:1]` through `items[:4]`, an
          # `items[1:]`/`items[-2:]` offset, an even/odd index or
          # issue-number parity gate, or an entry-property length gate at or
          # below the longest fixture title (97 chars) misses at least one
          # scenario and fails; the newest-first order additionally kills
          # order-dependent index rebuilds (`all(n >= v)` keeps only the
          # first entry). Gates/truncations ABOVE the fixture envelope and
          # per-title fingerprinting of fixture identity stay the documented
          # residual.
          printf '%s' '[{"number": 670, "title": "A fifth unrelated open issue"}, {"number": 669, "title": "A fourth unrelated open issue"}, {"number": 668, "title": "Yet another unrelated open issue"}, {"number": 667, "title": "Another unrelated open issue"}, {"number": 663, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s1.json"
          printf '%s' '[{"number": 670, "title": "[Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path alpha"}, {"number": 669, "title": "third-repeat-finding"}, {"number": 668, "title": "A Repeat Finding"}, {"number": 665, "title": "[INFRA] postformer  cpu-train targets pre-archive paths (retire or repoint)"}, {"number": 663, "title": "legacy-repeat-finding"}]' > "$r26_tmp/list-s2.json"
          printf '%s' '[{"number": 711, "title": "Fix bug 42"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s10.json"
          printf '%s' '[{"number": 711, "title": "Patch v10"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s11.json"
          printf '%s' '[{"number": 712, "title": "[Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path mode a"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s12.json"
          printf '%s' '[{"number": 713, "title": "Swift 6 migration"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s13.json"
          printf '%s' '[{"number": 714, "title": "Worker v1"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s14.json"
          printf '%s' '[{"number": 715, "title": "Third Time Finding"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s15.json"
          printf '%s' '[{"number": 716, "title": "targeted finding"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s16.json"
          printf '%s' '[{"number": 717, "title": "mixed context finding"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s17.json"
          # s18/s19 run against FIVE-entry lists (review finding F9): the
          # demonstrated escape `if len(items) >= 5 and len(decisions) == 2:
          # return {}` lived precisely in the gap that no fixture ever held
          # five list entries and two decisions together (the 2-decision
          # scenario used a 2-entry list and the five-entry lists carried one
          # decision each); with five entries and the match at a middle
          # index, the conjunction fires under audit and breaks the
          # exact-count assertions.
          printf '%s' '[{"number": 730, "title": "An unrelated newer open issue"}, {"number": 729, "title": "Another unrelated open issue"}, {"number": 718, "title": "Two Decision Finding"}, {"number": 717, "title": "A fourth unrelated open issue"}, {"number": 663, "title": "A fifth unrelated open issue"}]' > "$r26_tmp/list-s18.json"
          printf '%s' '[{"number": 731, "title": "Unrelated open issue one"}, {"number": 719, "title": "Four Decision Finding"}, {"number": 732, "title": "Unrelated open issue two"}, {"number": 733, "title": "Unrelated open issue three"}, {"number": 663, "title": "Unrelated open issue four"}]' > "$r26_tmp/list-s19.json"
          printf '%s' '[{"number": 720, "title": "Non Create Context Finding"}, {"number": 710, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s20.json"
          printf '%s' '[{"number": 721, "title": "Short Body Finding"}]' > "$r26_tmp/list-s21.json"
          printf '%s' '[{"number": 722, "title": "Two Line Body Finding"}]' > "$r26_tmp/list-s22.json"
          printf '%s' '[{"number": 723, "title": "Event Dispatch Finding"}]' > "$r26_tmp/list-s23.json"
          printf '%s' '[{"number": 724, "title": "Absent Body Finding"}]' > "$r26_tmp/list-s24.json"
          printf '%s' '[{"number": 725, "title": "Early Match Finding"}]' > "$r26_tmp/list-s25.json"
          printf '%s' "[{\"number\": 726, \"title\": \"$r26_long_title\"}]" > "$r26_tmp/list-s26.json"
          printf '%s' '[{"number": 727, "title": "Paragraph Break Finding"}]' > "$r26_tmp/list-s27.json"
          printf '%s' '[{"number": 745, "title": "Leading Ping Finding"}]' > "$r26_tmp/list-s28.json"
          printf '%s' '[{"number": 746, "title": "Leading Ideate Finding"}]' > "$r26_tmp/list-s29.json"
          printf '%s' '[{"number": 747, "title": "Leading Lab Finding"}]' > "$r26_tmp/list-s30.json"
          # s31 matches; s32-s36 carry no match, so their creates are the
          # asserted pristine behavior (the F13 create-path gates drop them).
          printf '%s' '[{"number": 748, "title": "Leading Recover Finding"}]' > "$r26_tmp/list-s31.json"
          printf '%s' '[{"number": 749, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s32.json"
          printf '%s' '[{"number": 750, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s33.json"
          printf '%s' '[{"number": 751, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s34.json"
          printf '%s' '[{"number": 752, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s35.json"
          printf '%s' '[{"number": 753, "title": "Some unrelated open issue"}]' > "$r26_tmp/list-s36.json"
          # Count-sweep list (adversarial escape hunt M6): five entries with
          # the match at a middle index, so an exact decision- or created-count
          # gate that fires on any swept count breaks the exact-count
          # assertions while a conjunction with an in-envelope list size
          # cannot hide (the count sweep never holds fewer than five entries).
          printf '%s' '[{"number": 740, "title": "Unrelated count sweep issue"}, {"number": 739, "title": "Another unrelated count sweep issue"}, {"number": 741, "title": "Count Sweep Finding"}, {"number": 738, "title": "Third unrelated count sweep issue"}, {"number": 737, "title": "Fourth unrelated count sweep issue"}]' > "$r26_tmp/list-count.json"
          printf '%s' '[]' > "$r26_tmp/list-empty.json"
          # Scenario 1: fresh title; exactly one query, one create on the bot
          # token, one triage dispatch on the owner PAT for the new number.
          r26_run "$r26_tmp/s1" ok "$r26_tmp/list-s1.json" "$r26_dec_s1"
          r26_check "s1-rc" "$(r26_rc0 "$r26_tmp/s1")"
          r26_check "s1-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s1-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s1-create-title" "$([ "$(r26_calls '--title Brand New Finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s1-created-loud" "$(r26_out_has 'Created new issue #900: Brand New Finding' "$r26_tmp/s1")"
          r26_check "s1-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s1-triage-900" "$(r26_triage_on 900)"
          r26_check "s1-list-bot-token" "$(r26_token_on 'gh issue list' "$R26_BOT")"
          r26_check "s1-create-bot-token" "$(r26_token_on 'gh issue create' "$R26_BOT")"
          r26_check "s1-triage-pat-token" "$(r26_token_on 'gh workflow run' "$R26_PAT")"
          # Scenario 2: the normalized match on an open issue (the #665
          # shape); zero creates, one dispatch on the matched issue, loud skip.
          r26_run "$r26_tmp/s2" ok "$r26_tmp/list-s2.json" "$r26_dec_s2"
          r26_check "s2-rc" "$(r26_rc0 "$r26_tmp/s2")"
          r26_check "s2-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s2-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s2-skip-loud" "$(r26_out_has "skip create_issue '[Infra] Postformer-CPU-TRAIN targets pre-archive paths! (retire or repoint)': open issue #665 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s2")"
          r26_check "s2-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s2-triage-665" "$(r26_triage_on 665)"
          r26_check "s2-dedupe-reason" "$(grep -F 'gh workflow run' "$r26_state/calls" 2>/dev/null | grep -qF 'dedupe match: open issue #665' && echo 1 || echo 0)"
          r26_check "s2-triage-pat-token" "$(r26_token_on 'gh workflow run' "$R26_PAT")"
          # Scenario 3: in-run duplicate against a non-empty three-issue open
          # index (s1 fixture); one create total, no second dispatch, and a
          # count-gated sabotage inside the handler crashes or misbehaves
          # here instead of passing against an empty index. THREE identical
          # decisions (review finding F5): a subscript-write/delete sabotage
          # of the run-local index executes on the first skip and is caught
          # when the THIRD decision re-creates a duplicate.
          r26_run "$r26_tmp/s3" ok "$r26_tmp/list-s1.json" "$r26_dec_s3"
          r26_check "s3-rc" "$(r26_rc0 "$r26_tmp/s3")"
          r26_check "s3-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s3-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s3-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s3-triage-900" "$(r26_triage_on 900)"
          r26_check "s3-two-inrun-skips" "$([ "$(grep -cF 'created earlier in this run; triage already dispatched (no duplicate dispatch)' "$r26_tmp/s3/out" 2>/dev/null || true)" = "2" ] && echo 1 || echo 0)"
          r26_check "s3-inrun-skip" "$(r26_out_has 'created earlier in this run; triage already dispatched (no duplicate dispatch)' "$r26_tmp/s3")"
          # Scenario 4: query failure; fail-open to creation, loud ::error::.
          r26_run "$r26_tmp/s4" fail "" "$r26_dec_s4"
          r26_check "s4-rc" "$(r26_rc0 "$r26_tmp/s4")"
          r26_check "s4-loud-error" "$(r26_out_has '::error::create_issue dedupe query failed; creating without the guard this run (issue #668)' "$r26_tmp/s4")"
          r26_check "s4-create-proceeds" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s4-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s4-create-bot-token" "$(r26_token_on 'gh issue create' "$R26_BOT")"
          # Scenario 5: unparseable JSON; fail-open to creation, loud ::error::.
          r26_run "$r26_tmp/s5" garbage "" "$r26_dec_s5"
          r26_check "s5-rc" "$(r26_rc0 "$r26_tmp/s5")"
          r26_check "s5-loud-error" "$(r26_out_has 'unparseable JSON; creating without the guard this run (issue #668)' "$r26_tmp/s5")"
          r26_check "s5-create-proceeds" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s5-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          # Scenario 6: the normalized match sits at index 2 of the
          # five-issue list (tester finding B3, the even index parity: #668;
          # s9's #670 sits at index 0, s8's #669 at index 1, s2's #665 at
          # index 3 and s7's #663 at index 4). Zero creates, one dispatch on
          # #668, loud skip. A parity-gated or count-gated index build must
          # fail at least one of s2/s6/s7/s8/s9.
          r26_run "$r26_tmp/s6" ok "$r26_tmp/list-s2.json" "$r26_dec_s6"
          r26_check "s6-rc" "$(r26_rc0 "$r26_tmp/s6")"
          r26_check "s6-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s6-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s6-skip-loud" "$(r26_out_has "skip create_issue 'A Repeat Finding': open issue #668 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s6")"
          r26_check "s6-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s6-triage-668" "$(r26_triage_on 668)"
          r26_check "s6-triage-pat-token" "$(r26_token_on 'gh workflow run' "$R26_PAT")"
          # Scenario 7: the normalized match is the LAST (oldest) entry of
          # the newest-first five-issue list, so any `items[:k]` prefix
          # truncation or trailing-entry drop misses it. Zero creates, one
          # dispatch on #663, loud skip.
          r26_run "$r26_tmp/s7" ok "$r26_tmp/list-s2.json" "$r26_dec_s7"
          r26_check "s7-rc" "$(r26_rc0 "$r26_tmp/s7")"
          r26_check "s7-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s7-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s7-skip-loud" "$(r26_out_has "skip create_issue 'Legacy Repeat Finding': open issue #663 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s7")"
          r26_check "s7-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s7-triage-663" "$(r26_triage_on 663)"
          # Scenario 8: match at index 1 of the newest-first five-issue list
          # (#669), closing the `items[:1]`/`items[:2]` prefix-truncation
          # class together with s9's index-0 long-title match.
          r26_run "$r26_tmp/s8" ok "$r26_tmp/list-s2.json" "$r26_dec_s8"
          r26_check "s8-rc" "$(r26_rc0 "$r26_tmp/s8")"
          r26_check "s8-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s8-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s8-skip-loud" "$(r26_out_has "skip create_issue 'Third Repeat Finding': open issue #669 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s8")"
          r26_check "s8-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s8-triage-669" "$(r26_triage_on 669)"
          # Scenario 9: match at index 0 of the newest-first five-issue list
          # (#670) with a 97-character title; the FIRST entry is the
          # concurrent-duplicate shape in production, so an `items[1:]`/
          # `items[-2:]` offset loader drops it (adversarial escape E1), and
          # entry-property length gates at or below the fixture envelope
          # (`len(title) > N` skip with N <= 96) drop it too; the long-tail
          # normalization fixture separately catches truncating normalizers.
          r26_run "$r26_tmp/s9" ok "$r26_tmp/list-s2.json" "$r26_dec_s9"
          r26_check "s9-rc" "$(r26_rc0 "$r26_tmp/s9")"
          r26_check "s9-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s9-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s9-skip-loud" "$(r26_out_has "skip create_issue '[Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path alpha': open issue #670 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s9")"
          r26_check "s9-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s9-triage-670" "$(r26_triage_on 670)"
          # Scenario 10: two distinct digit-bearing titles ("Fix bug 42" open
          # vs "Fix bug 43" decision); pristine behavior creates. A digit
          # strip applied CONSISTENTLY to both call sites maps both to
          # "fix bug " (the separator space survives re.sub) and falsely
          # skips; any SINGLE-site strip is caught by the sweep below, whose
          # match titles are identical on both sides, so the round-3
          # call-site digit-strip class (invisible to the function-level
          # digit fixtures) fails in every direction.
          r26_run "$r26_tmp/s10" ok "$r26_tmp/list-s10.json" "$r26_dec_s10"
          r26_check "s10-rc" "$(r26_rc0 "$r26_tmp/s10")"
          r26_check "s10-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s10-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s10-create-title" "$([ "$(r26_calls '--title Fix bug 43')" = "1" ] && echo 1 || echo 0)"
          r26_check "s10-created-loud" "$(r26_out_has 'Created new issue #900: Fix bug 43' "$r26_tmp/s10")"
          r26_check "s10-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s10-triage-900" "$(r26_triage_on 900)"
          # Scenario 11: the same digit-strip collision in a zero-favored
          # shape ("Patch v10" open vs "Patch v1" decision: a full-run strip
          # maps both to "patch v ", a strip of only the digit 0 maps both
          # to "patch v1"); pristine behavior creates.
          r26_run "$r26_tmp/s11" ok "$r26_tmp/list-s11.json" "$r26_dec_s11"
          r26_check "s11-rc" "$(r26_rc0 "$r26_tmp/s11")"
          r26_check "s11-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s11-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s11-create-title" "$([ "$(r26_calls '--title Patch v1')" = "1" ] && echo 1 || echo 0)"
          r26_check "s11-created-loud" "$(r26_out_has 'Created new issue #900: Patch v1' "$r26_tmp/s11")"
          r26_check "s11-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s11-triage-900" "$(r26_triage_on 900)"
          # Scenario 12: two distinct long titles differing only in their
          # FINAL character ("path mode a" vs "path mode b"); pristine
          # behavior creates. A CONSISTENT call-site truncation applied to
          # both the loader and the lookup (which s9 cannot see, since it
          # uses an identical long pair) merges them under EVERY proper
          # truncation cutoff and falsely skips, closing the round-3
          # both-sites truncation class. Single-site truncations are killed
          # by s9.
          r26_run "$r26_tmp/s12" ok "$r26_tmp/list-s12.json" "$r26_dec_s12"
          r26_check "s12-rc" "$(r26_rc0 "$r26_tmp/s12")"
          r26_check "s12-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s12-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s12-create-title" "$([ "$(r26_calls '--title [Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path mode b')" = "1" ] && echo 1 || echo 0)"
          r26_check "s12-created-loud" "$(r26_out_has 'Created new issue #900: [Infra] sweep validation fails on every dispatch for the archived pre-archive pipeline path mode b' "$r26_tmp/s12")"
          r26_check "s12-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s12-triage-900" "$(r26_triage_on 900)"
          # Scenario 13: a consistent both-sites space REMOVAL (a call-site
          # `.replace(" ", "")` after normalization) maps "Swift 6 migration"
          # and "Swift6 migration" to one string and falsely skips; pristine
          # behavior creates (the function-level space-collapse fixtures pin
          # only the function, not a post-normalization call-site rewrite).
          r26_run "$r26_tmp/s13" ok "$r26_tmp/list-s13.json" "$r26_dec_s13"
          r26_check "s13-rc" "$(r26_rc0 "$r26_tmp/s13")"
          r26_check "s13-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s13-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s13-create-title" "$([ "$(r26_calls '--title Swift6 migration')" = "1" ] && echo 1 || echo 0)"
          r26_check "s13-created-loud" "$(r26_out_has 'Created new issue #900: Swift6 migration' "$r26_tmp/s13")"
          r26_check "s13-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s13-triage-900" "$(r26_triage_on 900)"
          # Scenario 14: the lookup-side mirror of s11 ("Worker v1" open vs
          # "Worker v10" decision): a zero-only strip applied at the lookup
          # alone maps the decision to the open title and falsely skips;
          # loader-side and consistent zero strips are killed by s11, and
          # full-run single-site strips by the sweep.
          r26_run "$r26_tmp/s14" ok "$r26_tmp/list-s14.json" "$r26_dec_s14"
          r26_check "s14-rc" "$(r26_rc0 "$r26_tmp/s14")"
          r26_check "s14-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s14-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s14-create-title" "$([ "$(r26_calls '--title Worker v10')" = "1" ] && echo 1 || echo 0)"
          r26_check "s14-created-loud" "$(r26_out_has 'Created new issue #900: Worker v10' "$r26_tmp/s14")"
          r26_check "s14-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s14-triage-900" "$(r26_triage_on 900)"
          # Scenario 15 (review finding F4): THREE decisions where the
          # matching create is LAST, after two successful creates. A gate on
          # the decision count (`len(decisions) >= 3`) or on the created
          # count (`len(_created_issue_numbers) >= 2`, two creates already
          # recorded) disables the skip and creates a third issue; pristine
          # behavior is exactly 2 creates and 3 dispatches (#900, #901, and
          # the matched #715).
          r26_run "$r26_tmp/s15" ok "$r26_tmp/list-s15.json" "$r26_dec_s15"
          r26_check "s15-rc" "$(r26_rc0 "$r26_tmp/s15")"
          r26_check "s15-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s15-two-creates" "$([ "$(r26_calls 'gh issue create')" = "2" ] && echo 1 || echo 0)"
          r26_check "s15-create-first" "$([ "$(r26_calls '--title First Fresh Finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s15-create-second" "$([ "$(r26_calls '--title Second Fresh Finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s15-created-900" "$(r26_out_has 'Created new issue #900: First Fresh Finding' "$r26_tmp/s15")"
          r26_check "s15-created-901" "$(r26_out_has 'Created new issue #901: Second Fresh Finding' "$r26_tmp/s15")"
          r26_check "s15-skip-loud" "$(r26_out_has "skip create_issue 'third-time-finding': open issue #715 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s15")"
          r26_check "s15-three-dispatches" "$([ "$(r26_calls 'gh workflow run')" = "3" ] && echo 1 || echo 0)"
          r26_check "s15-triage-900" "$(r26_triage_on 900)"
          r26_check "s15-triage-901" "$(r26_triage_on 901)"
          r26_check "s15-triage-715" "$(r26_triage_on 715)"
          # Scenario 16 (review finding F4): the matching decision carries a
          # `target` key, so a `if target: existing = None` gate (or any
          # extra-key gate) fires; pristine behavior skips and triages #716.
          r26_run "$r26_tmp/s16" ok "$r26_tmp/list-s16.json" "$r26_dec_s16"
          r26_check "s16-rc" "$(r26_rc0 "$r26_tmp/s16")"
          r26_check "s16-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s16-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s16-skip-loud" "$(r26_out_has "skip create_issue 'targeted-finding': open issue #716 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s16")"
          r26_check "s16-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s16-triage-716" "$(r26_triage_on 716)"
          # Scenario 17 (review finding F4): a failed sweep first
          # (sweep_failed True) and a successfully posted comment second
          # (posted non-empty) before the matching create, so a gate on
          # either run-state flag (`if sweep_failed: ...`, `if posted: ...`)
          # disables the skip; pristine behavior skips and triages #717. The
          # failed sweep also drives the handler's final loud SystemExit(1),
          # so rc must be 1 (not 0).
          r26_run "$r26_tmp/s17" ok "$r26_tmp/list-s17.json" "$r26_dec_s17"
          r26_check "s17-rc1" "$(r26_rc_is "$r26_tmp/s17" 1)"
          r26_check "s17-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s17-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s17-skip-loud" "$(r26_out_has "skip create_issue 'Mixed Context Finding': open issue #717 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s17")"
          r26_check "s17-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s17-triage-717" "$(r26_triage_on 717)"
          r26_check "s17-comment-posted" "$([ "$(r26_calls 'gh api')" = "1" ] && echo 1 || echo 0)"
          r26_check "s17-sweep-failed-loud" "$(r26_out_has '::error::Refusing sweep dispatch for' "$r26_tmp/s17")"
          # Scenario 18 (review finding F8): TWO decisions with the matching
          # create LAST. A loader-internal gate on the decision count
          # (`if len(decisions) == 2: return {}`) disabled the dedupe for
          # every two-decision tick of a real maintainer run while the
          # round-4 fixtures (counts 1 and 3 only) stayed green; together
          # with the single-decision skip scenarios and s15/s19 this sweeps
          # decision counts 1 through 4, killing `== k` and `<=`/`>=` gates
          # inside that range. Pristine: exactly 1 create (#900, the fresh
          # first decision) and 2 dispatches (900, 718).
          r26_run "$r26_tmp/s18" ok "$r26_tmp/list-s18.json" "$r26_dec_s18"
          r26_check "s18-rc" "$(r26_rc0 "$r26_tmp/s18")"
          r26_check "s18-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s18-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s18-create-first" "$([ "$(r26_calls '--title First Two-Decision Finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s18-created-loud" "$(r26_out_has 'Created new issue #900: First Two-Decision Finding' "$r26_tmp/s18")"
          r26_check "s18-skip-loud" "$(r26_out_has "skip create_issue 'two decision finding': open issue #718 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s18")"
          r26_check "s18-two-dispatches" "$([ "$(r26_calls 'gh workflow run')" = "2" ] && echo 1 || echo 0)"
          r26_check "s18-triage-900" "$(r26_triage_on 900)"
          r26_check "s18-triage-718" "$(r26_triage_on 718)"
          # Scenario 19 (review finding F8): FOUR decisions with the matching
          # create LAST after THREE successful creates, extending the
          # created-count envelope from 2 to 3: a `len(decisions) == 4` or
          # `len(_created_issue_numbers) >= 3` loader gate disabled the dedupe
          # from the third create onward while the round-4 fixtures stayed
          # green. Pristine: exactly 3 creates (#900/#901/#902) and 4
          # dispatches (900, 901, 902, 719).
          r26_run "$r26_tmp/s19" ok "$r26_tmp/list-s19.json" "$r26_dec_s19"
          r26_check "s19-rc" "$(r26_rc0 "$r26_tmp/s19")"
          r26_check "s19-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s19-three-creates" "$([ "$(r26_calls 'gh issue create')" = "3" ] && echo 1 || echo 0)"
          r26_check "s19-created-900" "$(r26_out_has 'Created new issue #900: First Four-Decision Finding' "$r26_tmp/s19")"
          r26_check "s19-created-901" "$(r26_out_has 'Created new issue #901: Second Four-Decision Finding' "$r26_tmp/s19")"
          r26_check "s19-created-902" "$(r26_out_has 'Created new issue #902: Third Four-Decision Finding' "$r26_tmp/s19")"
          r26_check "s19-skip-loud" "$(r26_out_has "skip create_issue 'four decision finding': open issue #719 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s19")"
          r26_check "s19-four-dispatches" "$([ "$(r26_calls 'gh workflow run')" = "4" ] && echo 1 || echo 0)"
          r26_check "s19-triage-900" "$(r26_triage_on 900)"
          r26_check "s19-triage-901" "$(r26_triage_on 901)"
          r26_check "s19-triage-902" "$(r26_triage_on 902)"
          r26_check "s19-triage-719" "$(r26_triage_on 719)"
          # Scenario 20 (review finding F8 plus its independent escape hunt,
          # extended by F10): a mixed action context carrying ALL of the
          # handler's action keywords (review, test, test-linux, test-macos,
          # test-windows, eval, continue, build, auditor, curate, architect,
          # research, design, design-ux, design-visual, design-motion, lab,
          # recover, fix, create_pr) plus the two first-class decision
          # actions the handler must stay inert on, ping (with target) and
          # ideate, alongside the matching create LAST, so any
          # action-keyword gate (`if any(d.get("action") == "lab" ...): return
          # {}`, or the same keyed on ping or ideate) breaks the skip
          # assertion instead of hiding behind an all-create fixture set; the
          # create_pr sibling of create_issue is exercised too. Pristine:
          # 0 creates, 18 comment posts on #200 (one per comment-posting
          # action; ping and ideate post nothing in this handler, so the
          # count is unchanged), one `gh api .../pulls/200` probe for the
          # skipped fix action, one `gh pr create` attempt for create_pr,
          # and 1 triage on #720.
          r26_run "$r26_tmp/s20" ok "$r26_tmp/list-s20.json" "$r26_dec_s20"
          r26_check "s20-rc" "$(r26_rc0 "$r26_tmp/s20")"
          r26_check "s20-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s20-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s20-action-comments" "$([ "$(r26_calls 'gh api repos/RandomLabs/RandomLabs/issues/200/comments')" = "18" ] && echo 1 || echo 0)"
          r26_check "s20-fix-probe" "$([ "$(r26_calls 'gh api repos/RandomLabs/RandomLabs/pulls/200')" = "1" ] && echo 1 || echo 0)"
          r26_check "s20-pr-attempt" "$([ "$(r26_calls 'gh pr create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s20-api-body" "$([ "$(r26_calls 'body=/oc lab')" = "1" ] && echo 1 || echo 0)"
          r26_check "s20-skip-loud" "$(r26_out_has "skip create_issue 'non create context finding': open issue #720 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s20")"
          r26_check "s20-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s20-triage-720" "$(r26_triage_on 720)"
          # Scenario 21 (review finding F8): a matching decision with a
          # SHORT SINGLE-LINE 23-char body (no newline), closing
          # loader-internal newline-presence and short-length body predicates
          # (`body_text.count("\n") < 2: return {}`, `len(body_text) < N`)
          # within the short-single-line to long-three-line envelope.
          # Pristine: 0 creates, skip, 1 triage on #721.
          r26_run "$r26_tmp/s21" ok "$r26_tmp/list-s21.json" "$r26_dec_s21"
          r26_check "s21-rc" "$(r26_rc0 "$r26_tmp/s21")"
          r26_check "s21-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s21-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s21-skip-loud" "$(r26_out_has "skip create_issue 'short body finding': open issue #721 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s21")"
          r26_check "s21-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s21-triage-721" "$(r26_triage_on 721)"
          # Scenario 22 (review finding F8): a matching decision with a
          # TWO-LINE body (one newline), between the single-line and the
          # three-line shapes, so the newline-count envelope is 0/1/2.
          # Pristine: 0 creates, skip, 1 triage on #722.
          r26_run "$r26_tmp/s22" ok "$r26_tmp/list-s22.json" "$r26_dec_s22"
          r26_check "s22-rc" "$(r26_rc0 "$r26_tmp/s22")"
          r26_check "s22-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s22-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s22-skip-loud" "$(r26_out_has "skip create_issue 'two line body finding': open issue #722 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s22")"
          r26_check "s22-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s22-triage-722" "$(r26_triage_on 722)"
          # Scenario 23 (round-4 non-blocking observation, closed while the
          # runner is touched): the same normalized-match skip under
          # GITHUB_EVENT_NAME=workflow_dispatch (the other production trigger
          # shape next to schedule), so the demonstrated event-name-keyed gate
          # probe (`if os.environ.get("GITHUB_EVENT_NAME") ==
          # "workflow_dispatch": return {}`) breaks the skip assertion.
          # Pristine: 0 creates, skip, 1 triage on #723.
          r26_run "$r26_tmp/s23" ok "$r26_tmp/list-s23.json" "$r26_dec_s23" workflow_dispatch
          r26_check "s23-rc" "$(r26_rc0 "$r26_tmp/s23")"
          r26_check "s23-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s23-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s23-skip-loud" "$(r26_out_has "skip create_issue 'event dispatch finding': open issue #723 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s23")"
          r26_check "s23-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s23-triage-723" "$(r26_triage_on 723)"
          # Scenario 24 (F8 escape-hunt round): a matching decision with NO
          # body key at all (body_text defaults to ""), so `if not
          # body_text: return {}` and EVERY `len(body_text) < N` predicate
          # with N >= 1 fire and break the skip assertion; together with the
          # 23-char single-line s21 body this closes the short-length family
          # down to the absent-body shape. Pristine: 0 creates, skip, 1
          # triage on #724.
          r26_run "$r26_tmp/s24" ok "$r26_tmp/list-s24.json" "$r26_dec_s24"
          r26_check "s24-rc" "$(r26_rc0 "$r26_tmp/s24")"
          r26_check "s24-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s24-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s24-skip-loud" "$(r26_out_has "skip create_issue 'absent body finding': open issue #724 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s24")"
          r26_check "s24-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s24-triage-724" "$(r26_triage_on 724)"
          # Scenario 25 (F8 escape-hunt round): the matching create is FIRST
          # with a non-create `lab` action LAST, so a gate on the LAST
          # decision's action (`if decisions[-1].get("action") !=
          # "create_issue": return {}`) or any trailing-position predicate
          # breaks the skip assertion; every other fixture ends on a
          # create_issue or the matching create. Pristine: 0 creates, 1
          # triage on #725, 1 api comment on #124.
          r26_run "$r26_tmp/s25" ok "$r26_tmp/list-s25.json" "$r26_dec_s25"
          r26_check "s25-rc" "$(r26_rc0 "$r26_tmp/s25")"
          r26_check "s25-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s25-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s25-skip-loud" "$(r26_out_has "skip create_issue 'early match finding': open issue #725 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s25")"
          r26_check "s25-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s25-triage-725" "$(r26_triage_on 725)"
          r26_check "s25-trailing-comment" "$([ "$(r26_calls 'gh api repos/RandomLabs/RandomLabs/issues/124/comments')" = "1" ] && echo 1 || echo 0)"
          # Scenario 26 (F8 escape-hunt round): a 147-char identical pair, so
          # entry-property title-length predicates (`len(title) > N` with
          # N <= 146) fire and break the skip assertion; this lifts the
          # match-required title envelope above the 97-char s9 and the
          # 98-char create-shape s12 pair. Pristine: 0 creates, skip, 1
          # triage on #726.
          r26_run "$r26_tmp/s26" ok "$r26_tmp/list-s26.json" "$r26_dec_s26"
          r26_check "s26-rc" "$(r26_rc0 "$r26_tmp/s26")"
          r26_check "s26-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s26-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s26-skip-loud" "$(r26_out_has "skip create_issue '$r26_long_title': open issue #726 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s26")"
          r26_check "s26-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s26-triage-726" "$(r26_triage_on 726)"
          # Scenario 27 (review finding F10's second demonstrated key): a
          # matching decision whose body carries a paragraph break
          # (`"\n\n"`), the shape real maintainer bodies routinely have and
          # no other fixture body does; a gate on the double newline (at the
          # skip-branch terminator or in the loader) breaks the skip
          # assertion or is rejected structurally. Pristine: 0 creates,
          # skip, 1 triage on #727.
          r26_run "$r26_tmp/s27" ok "$r26_tmp/list-s27.json" "$r26_dec_s27"
          r26_check "s27-rc" "$(r26_rc0 "$r26_tmp/s27")"
          r26_check "s27-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s27-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s27-skip-loud" "$(r26_out_has "skip create_issue 'paragraph break finding': open issue #727 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s27")"
          r26_check "s27-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s27-triage-727" "$(r26_triage_on 727)"
          # Scenario 28 (review finding F12): a ping-with-target decision
          # LEADS the list (the production ping-first tick shape) before the
          # matching create, closing the leading-action-keyed gate class
          # behaviorally. Pristine: the ping path posts nothing and stays
          # inert (no comment call, no dispatch); 0 creates, skip, 1 triage
          # on #745.
          r26_run "$r26_tmp/s28" ok "$r26_tmp/list-s28.json" "$r26_dec_s28"
          r26_check "s28-rc" "$(r26_rc0 "$r26_tmp/s28")"
          r26_check "s28-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s28-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s28-skip-loud" "$(r26_out_has "skip create_issue 'leading ping finding': open issue #745 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s28")"
          r26_check "s28-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s28-triage-745" "$(r26_triage_on 745)"
          r26_check "s28-ping-inert" "$([ "$(r26_calls 'issues/582/comments')" = "0" ] && echo 1 || echo 0)"
          # Scenario 29 (review finding F12): an ideate decision (targetless)
          # LEADS the list before the matching create. Pristine: 0 creates,
          # skip, 1 triage on #746.
          r26_run "$r26_tmp/s29" ok "$r26_tmp/list-s29.json" "$r26_dec_s29"
          r26_check "s29-rc" "$(r26_rc0 "$r26_tmp/s29")"
          r26_check "s29-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s29-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s29-skip-loud" "$(r26_out_has "skip create_issue 'leading ideate finding': open issue #746 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s29")"
          r26_check "s29-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s29-triage-746" "$(r26_triage_on 746)"
          # Scenario 30 (review finding F12): a lab decision (comment post on
          # #124) LEADS the list before the matching create, so a
          # leading-action gate keyed on a comment-posting action fires.
          # Pristine: 1 comment on #124, 0 creates, skip, 1 triage on #747.
          r26_run "$r26_tmp/s30" ok "$r26_tmp/list-s30.json" "$r26_dec_s30"
          r26_check "s30-rc" "$(r26_rc0 "$r26_tmp/s30")"
          r26_check "s30-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s30-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s30-skip-loud" "$(r26_out_has "skip create_issue 'leading lab finding': open issue #747 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s30")"
          r26_check "s30-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s30-triage-747" "$(r26_triage_on 747)"
          r26_check "s30-leading-comment" "$([ "$(r26_calls 'gh api repos/RandomLabs/RandomLabs/issues/124/comments')" = "1" ] && echo 1 || echo 0)"
          # Scenario 31 (review finding F14): a recover decision LEADS the
          # list before the matching create; the recover action posts
          # /oc recover on its target (#600), so a leading-action gate keyed
          # on recover (the demonstrated F14 key) breaks the assertions.
          # Pristine: 1 comment on #600, 0 creates, skip, 1 triage on #748.
          r26_run "$r26_tmp/s31" ok "$r26_tmp/list-s31.json" "$r26_dec_s31"
          r26_check "s31-rc" "$(r26_rc0 "$r26_tmp/s31")"
          r26_check "s31-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s31-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
          r26_check "s31-skip-loud" "$(r26_out_has "skip create_issue 'leading recover finding': open issue #748 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/s31")"
          r26_check "s31-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s31-triage-748" "$(r26_triage_on 748)"
          r26_check "s31-recover-comment" "$([ "$(r26_calls 'gh api repos/RandomLabs/RandomLabs/issues/600/comments')" = "1" ] && echo 1 || echo 0)"
          # Scenario 32 (review finding F13): a CREATE-path decision whose
          # body carries a paragraph break against an unmatched list, so a
          # gate on `"\n\n" in body_text` inserted before the create call
          # (the demonstrated F13 escape) drops the create and fails the
          # count/triage assertions. Pristine: 1 create (#900), 1 triage.
          r26_run "$r26_tmp/s32" ok "$r26_tmp/list-s32.json" "$r26_dec_s32"
          r26_check "s32-rc" "$(r26_rc0 "$r26_tmp/s32")"
          r26_check "s32-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s32-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s32-create-title" "$([ "$(r26_calls '--title blank line create finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s32-created-loud" "$(r26_out_has 'Created new issue #900: blank line create finding' "$r26_tmp/s32")"
          r26_check "s32-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s32-triage-900" "$(r26_triage_on 900)"
          # Scenario 33 (review finding F13): the absent-body shape on the
          # CREATE path, so `if not body_text: continue` before the create
          # call (or any short-body predicate) drops the create. Pristine:
          # 1 create (#900), 1 triage.
          r26_run "$r26_tmp/s33" ok "$r26_tmp/list-s33.json" "$r26_dec_s33"
          r26_check "s33-rc" "$(r26_rc0 "$r26_tmp/s33")"
          r26_check "s33-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s33-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s33-create-title" "$([ "$(r26_calls '--title absent body create finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s33-created-loud" "$(r26_out_has 'Created new issue #900: absent body create finding' "$r26_tmp/s33")"
          r26_check "s33-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s33-triage-900" "$(r26_triage_on 900)"
          # Scenario 34 (review finding F13): the 23-char short-body shape
          # on the CREATE path, closing short-length predicates there.
          # Pristine: 1 create (#900), 1 triage.
          r26_run "$r26_tmp/s34" ok "$r26_tmp/list-s34.json" "$r26_dec_s34"
          r26_check "s34-rc" "$(r26_rc0 "$r26_tmp/s34")"
          r26_check "s34-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s34-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s34-create-title" "$([ "$(r26_calls '--title short body create finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s34-created-loud" "$(r26_out_has 'Created new issue #900: short body create finding' "$r26_tmp/s34")"
          r26_check "s34-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s34-triage-900" "$(r26_triage_on 900)"
          # Scenario 35 (review finding F13): a comment-post decision (test
          # on #200) runs before a FRESH create, so an `if posted: continue`
          # gate before the create call drops the create (posted is
          # otherwise only exercised on the skip path by s17). Pristine:
          # 1 comment on #200, 1 create (#900), 1 triage.
          r26_run "$r26_tmp/s35" ok "$r26_tmp/list-s35.json" "$r26_dec_s35"
          r26_check "s35-rc" "$(r26_rc0 "$r26_tmp/s35")"
          r26_check "s35-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s35-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s35-create-title" "$([ "$(r26_calls '--title posted context finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s35-created-loud" "$(r26_out_has 'Created new issue #900: posted context finding' "$r26_tmp/s35")"
          r26_check "s35-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s35-triage-900" "$(r26_triage_on 900)"
          r26_check "s35-posted-comment" "$([ "$(r26_calls 'gh api repos/RandomLabs/RandomLabs/issues/200/comments')" = "1" ] && echo 1 || echo 0)"
          # Scenario 36 (review finding F15): create, a lab comment, then an
          # identical create. An alias clear of the run-local index in the
          # post-create-branch region (the demonstrated F15 escape) loses
          # the in-run record, so the third decision re-creates the
          # duplicate; pristine suppresses it with the in-run skip print.
          # Pristine: 1 create (#900), 1 triage, 1 comment on #124, 1 in-run
          # skip print.
          r26_run "$r26_tmp/s36" ok "$r26_tmp/list-s36.json" "$r26_dec_s36"
          r26_check "s36-rc" "$(r26_rc0 "$r26_tmp/s36")"
          r26_check "s36-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
          r26_check "s36-one-create" "$([ "$(r26_calls 'gh issue create')" = "1" ] && echo 1 || echo 0)"
          r26_check "s36-create-title" "$([ "$(r26_calls '--title Alias Clear Finding')" = "1" ] && echo 1 || echo 0)"
          r26_check "s36-created-loud" "$(r26_out_has 'Created new issue #900: Alias Clear Finding' "$r26_tmp/s36")"
          r26_check "s36-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
          r26_check "s36-triage-900" "$(r26_triage_on 900)"
          r26_check "s36-lab-comment" "$([ "$(r26_calls 'gh api repos/RandomLabs/RandomLabs/issues/124/comments')" = "1" ] && echo 1 || echo 0)"
          r26_check "s36-inrun-skip" "$(r26_out_has 'created earlier in this run; triage already dispatched (no duplicate dispatch)' "$r26_tmp/s36")"
          # Size sweep (round-3 adversarial escapes): for list sizes 1 through
          # 8 the LAST entry (oldest, issue #1, newest-first order) is the
          # normalized match while every other entry carries an unrelated
          # title; the match titles cycle short, digit-bearing, single-word,
          # and x-bearing shapes. A `len(index) == N` equality gate, an
          # `items[:k]` truncation with k < 8, an order-dependent
          # `all(n >= v)` rebuild, a number/length/word-count gate at or
          # below the envelope, and a digit-stripping or charset per-entry
          # skip all fail at least one size.
          r26_sweep_titles=("Bug 1" "Fix" "Proxy expiry" "Fix xfails" "Loop 5" "Timeout" "Minor stall" "Bug 8")
          r26_sweep_n=1
          while [ "$r26_sweep_n" -le 8 ]; do
            r26_sweep_title="${r26_sweep_titles[$((r26_sweep_n - 1))]}"
            r26_sweep_list="["
            r26_sweep_first=1
            r26_sweep_i="$r26_sweep_n"
            while [ "$r26_sweep_i" -ge 1 ]; do
              if [ "$r26_sweep_first" = "1" ]; then r26_sweep_first=0; else r26_sweep_list="$r26_sweep_list, "; fi
              if [ "$r26_sweep_i" -eq 1 ]; then
                r26_sweep_list="$r26_sweep_list{\"number\": 1, \"title\": \"$r26_sweep_title\"}"
              else
                r26_sweep_list="$r26_sweep_list{\"number\": $r26_sweep_i, \"title\": \"Other finding $r26_sweep_i\"}"
              fi
              r26_sweep_i=$((r26_sweep_i - 1))
            done
            r26_sweep_list="$r26_sweep_list]"
            printf '%s' "$r26_sweep_list" > "$r26_tmp/list-n$r26_sweep_n.json"
            r26_sweep_dec="[{\"action\": \"create_issue\", \"title\": \"$r26_sweep_title\", \"body\": \"$r26_body\"}]"
            r26_run "$r26_tmp/n$r26_sweep_n" ok "$r26_tmp/list-n$r26_sweep_n.json" "$r26_sweep_dec"
            r26_check "n$r26_sweep_n-rc" "$(r26_rc0 "$r26_tmp/n$r26_sweep_n")"
            r26_check "n$r26_sweep_n-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
            r26_check "n$r26_sweep_n-no-create" "$([ "$(r26_calls 'gh issue create')" = "0" ] && echo 1 || echo 0)"
            r26_check "n$r26_sweep_n-skip-loud" "$(r26_out_has "skip create_issue '$r26_sweep_title': open issue #1 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/n$r26_sweep_n")"
            r26_check "n$r26_sweep_n-one-triage" "$([ "$(r26_calls 'gh workflow run')" = "1" ] && echo 1 || echo 0)"
            r26_check "n$r26_sweep_n-triage-1" "$(r26_triage_on 1)"
            r26_sweep_n=$((r26_sweep_n + 1))
          done
          # Decision-count / created-count sweep (adversarial escape hunt
          # M6): counts 5 through 23, each a five-entry list with the match
          # at a middle index and k-1 leading fresh create_issue decisions so
          # BOTH dimensions sweep together (k decisions with k-1 creates
          # before the match). The earlier suite pinned counts 1, 2, 3, 4 and
          # 23 only, so an exact gate on any other count (`if len(decisions)
          # == 20: return {}`, demonstrated green at 24/0 by the escape hunt)
          # or on the created count (`if len(_created_issue_numbers) >= 4:
          # return {}`) stayed inert under every fixture while disabling the
          # dedupe in production. Every scenario asserts the exact create
          # count (k-1), the exact dispatch count (k: one triage per created
          # issue plus the matched issue), the skip line, and rc 0, so any
          # exact or bound count gate firing on a swept count fails.
          r26_count_n=5
          while [ "$r26_count_n" -le 23 ]; do
            r26_count_dec="["
            r26_count_i=1
            while [ "$r26_count_i" -lt "$r26_count_n" ]; do
              [ "$r26_count_i" -gt 1 ] && r26_count_dec="$r26_count_dec, "
              r26_count_dec="$r26_count_dec{\"action\": \"create_issue\", \"title\": \"count sweep filler $r26_count_i finding\", \"body\": \"$r26_body\"}"
              r26_count_i=$((r26_count_i + 1))
            done
            r26_count_dec="$r26_count_dec, {\"action\": \"create_issue\", \"title\": \"count sweep finding\", \"body\": \"$r26_body\"}]"
            r26_run "$r26_tmp/count$r26_count_n" ok "$r26_tmp/list-count.json" "$r26_count_dec"
            r26_check "count$r26_count_n-rc" "$(r26_rc0 "$r26_tmp/count$r26_count_n")"
            r26_check "count$r26_count_n-lists-once" "$([ "$(r26_calls 'gh issue list')" = "1" ] && echo 1 || echo 0)"
            r26_check "count$r26_count_n-creates" "$([ "$(r26_calls 'gh issue create')" = "$((r26_count_n - 1))" ] && echo 1 || echo 0)"
            r26_check "count$r26_count_n-skip-loud" "$(r26_out_has "skip create_issue 'count sweep finding': open issue #741 already carries the identical normalized title (dedupe, issue #668)" "$r26_tmp/count$r26_count_n")"
            r26_check "count$r26_count_n-dispatches" "$([ "$(r26_calls 'gh workflow run')" = "$r26_count_n" ] && echo 1 || echo 0)"
            r26_check "count$r26_count_n-triage-first" "$(r26_triage_on 900)"
            r26_check "count$r26_count_n-triage-last" "$(r26_triage_on "$((899 + r26_count_n - 1))")"
            r26_check "count$r26_count_n-triage-741" "$(r26_triage_on 741)"
            r26_count_n=$((r26_count_n + 1))
          done
          # Derived-PATH shadow scenario (review finding F25, defense in
          # depth): with a fake `gh` planted into the first resolved derived
          # PATH directory (the pinned $HOME/.opencode/bin), the handler
          # must invoke THAT binary, never the mock: an empty mock log
          # proves the composition order (derived dirs ahead of the mock
          # bin) is load-bearing, so a future reorder that silently
          # neutralizes the derivation fails this scenario loudly.
          r26_run "$r26_tmp/pathshadow" ok "" "$r26_dec_s1" schedule plant
          r26_check "pathshadow-mock-drained" "$([ "$(r26_calls 'gh ')" = "0" ] && echo 1 || echo 0)"
          # Unknown-gh-command check (adversarial escape hunt M1): the mock
          # exits 64 for any command outside its model, so an inserted probe
          # call is inert under audit while real gh answers it and the probe
          # result can gate the dedupe. The accumulated invocation log must
          # therefore contain no top-level command other than the ones the
          # pristine handler uses (issue, workflow, api, pr); an inserted
          # probe (e.g. `gh search issues`) fails the audit loudly no matter
          # where in the block it sits, even though its result is only
          # consumed under production conditions.
          cat "$r26_state/calls" >> "$r26_state/calls-all" 2>/dev/null || true
          r26_unknown=$(awk '/^gh / { print $2 }' "$r26_state/calls-all" 2>/dev/null | sort -u | grep -vE '^(issue|workflow|api|pr)$' | tr '\n' '|' || true)
          [ -z "$r26_unknown" ] || r26_bad="${r26_bad} maintainer.yml(functional-unknown-gh-command:${r26_unknown})"
          rm -rf "$r26_tmp"
        fi
      fi
    fi
  fi
  fi
fi
if [ -z "$r26_bad" ]; then
  check "R26" "create_issue dedupe: the handler queries open issues before every gh issue create and skips creation on an identical normalized title (casefold, non-alphanumerics to spaces, whitespace collapsed) while printing the existing number and self-triaging the match, with an in-run duplicate dispatching no second triage, a loud created branch that records the new number, a loud fail-open query path (a registry failure creates rather than drops a decision), the executing step resolved from the SAME YAML parse tree GitHub runs with ANY duplicate mapping key rejected outright (GitHub's parser rejects such a file with Invalid workflow file / 422, while a lenient last-wins scan would pin the decoy value; review finding F18) and with EXACTLY ONE step carrying the exact anchored name, if: always(), no shell, no working-directory, no continue-on-error, EXACTLY the two token env keys with both token expressions intact, no workflow-level or job-level env key, no job-level container, and no job-level strategy matrix (a merged PYTHONPATH or BASH_ENV would change the effective environment while the step env stayed exact; review finding F21), and each handler needle (the dedupe marker, _open_issue_titles, and _self_triage) in exactly one run which must be that step, so a comment-line anchor, a same-name decoy, a renamed or weakened executor, a removed, emptied, or role-swapped credential, or a cat-shell or crash-swallowing step fails loudly (review findings F17/F18; a wholesale executing-step rewrite carrying none of the three needles remains the documented diff-review boundary), the workflow-level and job-level defaults.run shell and working-directory overrides rejected outright with malformed defaults shapes too (a defaults: run: shell: cat {0} on either scope rewrote the anchored step's effective shell without touching the step keys and left the handler dead in production; review finding F21), the workflow-level and job-level env keys and a job-level container rejected as effective-environment changes (a merged PYTHONPATH or BASH_ENV would alter what the handler executes while the step env mapping stayed exact), and any repo-root Python module or package shadowing a module the handler imports or a startup hook (json, os, re, subprocess, time, sys, sitecustomize, usercustomize) in ANY importable spelling (source json.py, sourceless bytecode json.pyc placed directly in the directory, an extension module json.so or json.pyd bare or version-tagged, or a package directory carrying any importable __init__ artifact such as __init__.pyc) failing the audit loudly (including a shadow that unlinks itself on import, caught by an audit-start checkout snapshot taken before any rule executes and ORed into the scan) with the handler step itself invoking the interpreter in isolated mode (python3 -I -, pinned inside the exact-text handler block, so no repo-root module of ANY name, spelling, or transitive-import depth, the demonstrated transitive selectors import included, can reach the handler process; review finding F23), while the extractor, the fixture runner, and the audit's own R18 YAML-consistency helper execute isolated (python3 -I; review finding F24: the helper's non-isolated Python could previously import a repo-root module that rewrote the workflow file under test) and the functional sandbox mirrors the repo root's top-level files in every importable spelling into its work dir as defense in depth, so an isolation regression that somehow survives the exact-text pin also breaks the assertions (review findings F20/F22), exact control-flow pins on the loader invocation, the skip guard, and the skip branch's terminating continue plus five-consecutive-line adjacency of the lazy-load guard through the skip guard with exact-trim matching, so no run-state or input-shape gate can be interposed regardless of the dimension it gates on (review findings F2/F4), the eleven-line call-site preamble immediately preceding that chain pinned as an exact trimmed window plus the index sentinel pinned as exact text and a no-unknown-gh-command check over the accumulated invocation log against the pristine issue/workflow/api/pr allowlist, so an inserted probe between the branch opener and the chain (the demonstrated gh search issues call, inert under the mock at rc 64 but lethal against real gh) or a conditional sentinel replacement that pre-seeds the index under production conditions fails structurally or loudly (escape-hunt closures M1 and the init-replacement class), the ENTIRE handler block pinned as canonical exact text from its first line through the trailing PY with only blank lines dropped (indentation compared too) and the exact-form loop head required exactly once, so no line can be inserted, re-indented, or replaced anywhere in the handler without failing the audit, closing the three F13/F14/F15 families that lived outside the sub-region pins: a create-path gate silently dropping decisions, a decoy duplicate 'for d in decisions:' loop head that stopped the old setup-prefix extraction early, and an index-alias clear in the post-create-branch region (review findings F12/F13/F14/F15), the skip branch pinned as a six-consecutive-line shape with the skip print immediately after the skip guard and the terminating continue immediately after the triage dispatch (a conditional continue keyed on a first-class decision action such as ping or on a blank-line-bearing body can no longer pass the audit while leaking every match into gh issue create; review finding F10), and the whole _load_open_issue_titles() body from its def line through return index pinned as exact trimmed text with exactly one def occurrence and exactly two loader-name occurrences in the block, so a cross-dimensional conjunction on individually in-envelope dimensions (len(items) >= 5 and len(decisions) == 2), its no-added-line substitution variant, and its conditional def-shadowing variant fail structurally as well as behaviorally (review finding F9), block-scoped query-shape and ordering pins extracted from the real handler step, structural pins that the run-local index is assigned exactly twice (initialization and the fail-open line) and accessed only via .get/.setdefault, with subscript writes and deletes rejected because they evade the assignment and attribute pins (adversarial verification finding plus review finding F5), functional fixtures executing the real extracted normalization function with exactly one definition required in the block (review finding F7: a shadowing second definition would leave the fixtures testing dead code) and the function body from its def line through its return pinned as exact trimmed text so an inserted context-conditional line or replaced return expression that is sandbox-inert fails structurally (escape-hunt near-miss closure) (case fold including a Unicode casefold pair so a .lower() swap fails, punctuation/hyphen/underscore/whitespace collapse, and digit, space-placement, and >80-char long-tail pairs pinned non-matching so a digit-stripping regex, a \"\".join variant, or a truncating/fragmenting normalization fails; tester finding B1 plus adversarial escape E3; plus the 2026-10-18 paraphrase pair deliberately non-matching because fuzzy suppression could lose a distinct finding), and a functional sandbox that executes the real extracted handler block under the runner's bash -e shell against an executable mock gh (interception proven before the matrix; the handler environment is built from scratch with env -i: no ambient runner variable reaches it, credentials are fully absent, the non-credential Actions context is production-shaped across the standard variables (SHA, ref, ref name/type, server/API/GraphQL URLs, workspace, RUNNER_OS/ARCH, CI), and the mock's state paths are baked into the mock script, so env-keyed gate detection is independent of the ambient CI environment and the demonstrated env-sensing backdoor class is closed for the seeded set (escape hunt M5: a gate on SHA presence fires under audit once SHA is seeded) and for both exercised event shapes (schedule and workflow_dispatch); the mock requires the pinned query argv token for token (argument count plus every positional element), so a repeated scalar flag, an added --search filter, a reorder, or merged/split tokens cannot keep the audit green while the real query returns a different set or fail-opens, and the whole matrix's accumulated gh invocation log must stay inside the pristine issue/workflow/api/pr allowlist so an inserted probe call (unmodeled subcommands are mock-inert but real-gh-live) fails loudly wherever it sits; tester finding B2 plus adversarial escapes E2/Q4/Q5 and escape hunt M1, and emits the trailing newline real gh emits on every list output so a loader gate on the stdout newline is caught (review finding F6); sandbox outside the repo) across fresh-create (one query, one create on the bot token, one triage dispatch on the owner PAT), normalized-match skip+triage five times against newest-first five-issue lists where every entry is a scenario match at index 0 (#670, the 97-char title and the concurrent-duplicate shape so an items[1:]/items[-2:] offset or a length gate falls), index 1 (#669), index 2 (#668), index 3 (#665) and index 4 (#663, the oldest entry so items[:k] prefix truncations fall), so a cardinality gate at or below the fixture size, any proper prefix truncation through items[:4], an offset, a parity-gated index build, or an order-dependent all(n >= v) rebuild fails (tester finding B3 plus adversarial escapes E1/E4/L06/L07/P1/P2 and the round-3 order class), in-run duplicate against a non-empty open index via THREE identical decisions (one create, no second dispatch, two in-run skip prints, so a subscript-write or delete sabotage of the run-local index is caught behaviorally as well; review finding F5), query-failure fail-open, bad-JSON fail-open, a THREE-decision scenario with the matching create LAST after two successful creates (exactly 2 creates and 3 dispatches asserted, so a decision-count or created-count gate creates a third issue and fails), a matching decision carrying target (any target or extra-key gate), and a mixed scenario with a failed sweep first and a successfully posted comment second before the matching create (sweep_failed and posted gates; the failed sweep drives the handler's loud SystemExit(1), asserted as rc 1), a decision-count sweep of 1-4 decisions with the matching create LAST, each asserting zero duplicates (a 2-decision scenario with exactly 1 create and 2 dispatches, the existing 3-decision scenario with 2 creates and 3 dispatches, and a 4-decision scenario with 3 creates and 4 dispatches asserting all three created-number triages, so every ==k and <=/>= count gate inside 1-4 fires on at least one scenario and the created-count envelope extends to 3; the 2-decision and 4-decision scenarios run against FIVE-entry lists with the match at a middle index, so a conjunction of an in-envelope list size with an in-envelope decision count (len(items) >= 5 and len(decisions) == 2, review finding F9's demonstrated escape) can no longer hide behind fixture pairs that never hold both dimensions together) plus a COUNT SWEEP of decision counts 5 through 23 (each k a five-entry list with the match at a middle index and k-1 leading fresh creates before the matching create LAST, asserting the exact create count k-1 and dispatch count k), so every decision count 1-23 is exercised and an exact or bound gate on any swept count fires at least once (escape hunt M6: the demonstrated len(decisions) == 20 escape, and its created-count sibling len(_created_issue_numbers) >= 4, both now caught), a mixed action context carrying ALL of the handler's action keywords (review, test, test-linux, test-macos, test-windows, eval, continue, build, auditor, curate, architect, research, design, design-ux, design-visual, design-motion, lab, recover, fix, create_pr, ping-with-target, ideate) alongside the matching create LAST (0 creates, 18 comment posts, the skipped-fix probe, and the create_pr attempt asserted, so any action-keyword gate including one keyed on ping or ideate breaks the skip assertion; review finding F10), absent-body, 23-char short-single-line, two-line body, and paragraph-break (blank-line-bearing) body skip scenarios (not body_text and every len(body_text) < N with N >= 1, newline-presence, line-count, and short-length predicates inside the absent-body to long-three-line envelope), a matching create that is NOT last with a trailing lab action (last-position action predicates), a 147-char long-title skip scenario (title-length predicates up to 146), and a workflow_dispatch-event skip scenario (the demonstrated event-name gate; schedule remains the default shape), plus leading-action skip scenarios (ping-first with target, ideate-first, lab-first, recover-first: 0 creates, exactly one triage on the match, the loud skip line, and each leading action's own inert/comment behavior asserted, so any gate keyed on the leading decision action breaks the assertions; review findings F12/F14), create-path scenarios carrying a paragraph-break body, an absent body, and a short body against unmatched lists (the create must happen, so an F13 create-path gate drops the decision and fails the assertions), a posted-comment-before-a-fresh-create scenario (an if-posted create-path gate), and a create-lab-create-identical scenario asserting exactly one create, one triage, and the in-run skip print (an index-alias clear re-creates the duplicate; review finding F15), all with realistic multi-line >200-char bodies in every other scenario decision (a body-length gate), so the whole inserted-gate family is caught behaviorally even when a decoy satisfies the adjacency pin (review findings F4/F8), three digit-collision create scenarios ('Fix bug 42'/'Fix bug 43', 'Patch v10'/'Patch v1', 'Worker v1'/'Worker v10': pristine creates, a digit strip (full-run at one or both sites, zero-favored at either side) falsely skips, and any single-site strip fails the sweep), a space-removal collision create scenario ('Swift 6 migration' vs 'Swift6 migration': pristine creates, a consistent both-sites space removal after normalization falsely skips), one long-title collision create scenario (distinct long titles differing only in their final character: pristine creates, a consistent both-sites truncation merges them under every proper cutoff and falsely skips), and a size sweep of list sizes 1-8 whose last entry is the match with three-character, digit-bearing, single-word, and x-bearing titles cycling (a len(index)==N equality gate, an items[:k] truncation with k<8, or a number/length/word-count/charset per-entry gate at or below the sweep envelope fails), so no plain one-line disabled control flow, demonstrated fixture-coverage gap (offsets, prefix truncations, cardinality and parity gates at or below the fixture envelope, inserted run-state or input-shape gates at the loader chain, inside the loader, in the skip branch, in the call-site preamble, or as an inserted gh probe call, inserted gates anywhere in the handler (the whole block is exact-text pinned), including leading-action gates above the main loop, create-path gates, decoy duplicate loop heads, indentation changes, index subscript writes or deletes, a shadowing normalization definition or loader definition, stdout-newline gates, argument tampers, normalization weakening, call-site digit stripping, call-site space removal, consistent call-site truncation, order-dependent rebuilds), or demonstrated env-sensing backdoor, or a repo-root stdlib-shadowing module or an effective-shell defaults or effective-environment override, or a pre-handler step appending a directory to GITHUB_PATH next to a committed fake gh, exporting a BASH_ENV shim over the pinned python3 -I - invocation, planting a fake gh into the pinned HOME/.opencode/bin PATH directory, or rewriting the decision-file input, can conclude green (review findings F20/F21/F22/F23/F24/F25), with the ENTIRE pre-handler region (step sequence under the effective names GitHub displays, execution-shape keys, full env key maps including values, with: maps, and every run line with blank lines dropped) pinned as canonical exact text alongside a named env-file/mention allowlist, the PATH step body pinned to exactly the single echo line, and the functional sandbox deriving its PATH directories from the pinned extractor output (mirroring repo-provided GITHUB_WORKSPACE directories) with a derived-PATH shadow scenario proving the derived directories precede the mock bin, plus a shell-faithful check that every literal gh issue create invocation in the workflow lives in the anchored handler step (path-qualified executables such as /usr/bin/gh and ./gh, env/command/bash -c prefixes, tabs, backslash-newline continuations, quote/backslash word concatenation such as g''h, ANSI-C quoting such as $'\x69ssue', locale quoting such as $\"gh\", shell metacharacter separation, global flags between gh and the subcommand, the multi-line Python list form, the shell-escaped-quote Python one-liner, a single-element shell=True list, a comment-split token, Python \xNN/\uNNNN/\U00000000/\N{...}/octal escape spellings, b/r/u/f string prefixes, and a token split across adjacent string literals such as \"iss\" \"\x75e\" included, with the decoded, whitespace/quote/backslash-normalized form stripping line comments, folding string prefixes, and joining adjacent literals so the escaped, comment-split, and adjacent-literal spellings are caught) exercised by self-tests that test EACH layer directly (the word scan over _f29_red, the normalized form over _f30_red) and then exercise the exact combined predicate the scan calls over every red case (_f29_red + _f30_red + _f31_red), so deleting or weakening either layer or the combined predicate fails the audit itself (review findings F26/F29/F30/F31/F32/F34/F35 plus the round-18 adjacent-literal concatenation sibling; prose carrying separate gh, issue, and create tokens in one command line is a known accepted false-positive shape), and repo-local scripts executed by the pinned pre-handler steps in any standard invocation spelling (bash/sh/source, optional flags, absolute or quoted paths) scanned for GITHUB_ENV, GITHUB_PATH, BASH_ENV, the pinned .opencode PATH directory, and the decision-file input so a script body cannot write the runner env-file channel or plant the handler's binary or input (review finding F27: appending a BASH_ENV write to resolve-model.sh kept the audit green while the handler sourced the shim; each demonstrated one-line variant above kept the whole audit green at 25 passed, 0 failed while the handler used the planted binary or shim and filed the exact duplicate the guard exists to prevent), with deliberate identity fingerprinting (fixture token strings, sandbox paths, per-title charset gates), call-site character-class transformations outside the tested digit (full-run and zero-favored), space-removal, and truncation classes, or truncation/cardinality/number/length/word-count thresholds above the eight-entry, 147-char fixture envelope, exact decision- or created-count gates above the swept envelope (decision counts 1-23 and created counts 0-22 before a match are every one exercised), body-content predicates keyed on prose absent from every fixture body, create-path body-length predicates above the 283-char fixture envelope, or non-credential context values outside the seeded/exercised shapes (unseeded context variables, event names beyond the schedule/workflow_dispatch pair, actor values), a wholesale rewrite of the executing step into unrelated code carrying none of the three handler needles while a canonical decoy remains (visible in the diff, not distinguishable structurally from a genuine handler replacement), a create executed from inside a repo script, composite action, or reusable workflow, a gh create reached through a variable or command-substitution indirection at the call site, a create issued through a direct REST call (gh api --method POST .../issues or curl .../issues), a create assembled by shell expansion or runtime string construction (IFS word splitting, brace expansion such as cr{e,}ate, or a runtime-split Python string), or an env-file channel reached through one level of indirection inside a repo-local script, review-gated as a documented residual (review findings F4-F35 plus the F16 print fix; issue #668)" "ok"
else
  check "R26" "create-issue dedupe guard missing:${r26_bad} (issue #668: concurrent per-target Maintainer ticks independently filed the same finding as #665/#666)" "bad"
fi
summary="Silent-stall regression audit (R1-R26) on ${WF}: ${pass} passed, ${fail} failed."
echo "$summary"

if [ "$fail" -gt 0 ]; then
  body="## Silent-stall regression audit FAILED (R1-R26)

${summary}
${report}

A lab CI invariant was violated in the audited workflow set rooted at ${WF} (silent-stall S1/S2/L1/L2, R6 free-tier model pins, R7 review-restore ownership, R8 vendored hardened runner, R9 schedule/dispatch retry parity, R10 dispatch-input indirection, R11 post-agent PAT gates, R12 actor-write gate, R13 bot-created triage parity, R14 heterogeneous-group queue preservation, R15 model fallback ladder plus transient free-tier, 429/5xx, and provider-stall bounded retries, R16 shallow-workspace PAT merge guard, R17 per-OS findings-report contract, R18 Windows MSYS argv-conversion guard, R19 review-comment publication evidence, R20 paginated comment reads, R21 PAT merge approval binding, R22 tester verdict publication, R23 maintainer memory publish concurrency, R24 per-OS cap headroom and partial-report salvage, R25 lab/fix agent cap headroom, or R26 create-issue dedupe). Investigate before merging any workflow change.

- the Auditor"
  if [ -n "$HEALTH_ISSUE" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
    gh issue comment "$HEALTH_ISSUE" --repo "$REPO" --body "$body" 2>/dev/null || echo "Failed to post to health issue #$HEALTH_ISSUE"
  fi
fi

exit 0
