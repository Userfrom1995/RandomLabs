#!/usr/bin/env bash
#
# silent-stall-audit.sh - Static regression checks for the issue #122 silent-stall
# hardening invariants (S1/S2/L1/L2), the R6 model free-tier guard, the R7
# review-restore ownership guard (PR #412 head rewind), the R8 vendored
# hardened runner guard, the R9 schedule/dispatch retry-parity guard
# (issue #422), the R10 PAT-step input-indirection guard, and the R11
# post-agent PAT gate guard (both issue #422 residual hardening).
# Wired into auditor.yml as the R1-R11 matrix.
#
# Usage: silent-stall-audit.sh <path-to-opencode.yml> [health-issue-number]
# R1-R6 are scoped to <path-to-opencode.yml>; R7-R11 audit the whole tree
# (the review-restore guard, the vendored runner, every schedule/dispatch
# agent arm, dispatch-input indirection, and the lab post-agent PAT gates),
# so they trip on a bad curator.yml/auditor.yml/ideate.yml/lab.yml/maintainer.yml
# no matter which file the audit was pointed at.
# Exit code is always 0 so it never breaks the auditor run; failures are reported
# on stdout and (when a health issue number is supplied and GITHUB_TOKEN is set)
# posted as a comment to the lab-health board.

set -u

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
 [R1-R11 PASS] $name: $desc"
    echo "PASS  $name: $desc"
  else
    fail=$((fail + 1))
    report="${report}
 [R1-R11 FAIL] $name: $desc"
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

# [R6] Model free-tier compliance: all model pins must be free-tier (issue #130 two-knob guard).
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
  check "R6" "non-free model pin found -> ${detail} (violates two-knob free guard)" "bad"
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

# [R10] Dispatch-input shell indirection (issue #422 residual): a
# `${{ inputs.* }}` expression expanded INSIDE a `run:` block is substituted by
# the runner before the shell starts, so the value executes as SHELL with the
# step's env - and the verify/push/approve steps carry the owner PAT there
# (B3 repro: selfheal_retry='0"; touch /tmp/PWNED; echo "' ran the touch).
# Inputs must reach shell only through `env:` mappings, where the same
# expression is inert data. The scan covers every run block in every workflow;
# the cohort additionally must still map SELFHEAL_RETRY so the indirection
# call sites can never silently read an empty counter.
run_input_hits=$(awk '
  function gi(s) { match(s, /^[ \t]*/); return RLENGTH }
  FNR == 1 { cap = 0 }
  $0 ~ /^[ \t]*(-[ \t]+)?run:[ \t]*\|/ { indent = gi($0); cap = 1; next }
  cap {
    if ($0 ~ /^[ \t]*$/) next
    ind = gi($0)
    if (ind > indent) {
      if ($0 ~ /\$\{\{[^}]*inputs\./) print FILENAME ":" FNR ": " $0
      next
    }
    cap = 0
  }
  $0 ~ /^[ \t]*(-[ \t]+)?run:/ && $0 ~ /\$\{\{[^}]*inputs\./ { print FILENAME ":" FNR ": " $0 }
' .github/workflows/*.yml 2>/dev/null || true)
r10_bad=""
if [ -n "$run_input_hits" ]; then
  r10_bad=" inline-inputs:$(echo "$run_input_hits" | tr '\n' ';')"
fi
for r10_wf in curator.yml auditor.yml ideate.yml lab.yml; do
  r10_path=".github/workflows/${r10_wf}"
  if [ ! -f "$r10_path" ]; then
    r10_bad="${r10_bad} ${r10_wf}(missing)"
    continue
  fi
  grep -q 'SELFHEAL_RETRY: \${{ inputs\.selfheal_retry }}' "$r10_path" || r10_bad="${r10_bad} ${r10_wf}(no-SELFHEAL_RETRY-env-mapping)"
done
if [ -z "$r10_bad" ]; then
  check "R10" "no \${{ inputs.* }} expansion inside any run: block; cohort verify steps map SELFHEAL_RETRY via env (PAT-step input indirection)" "ok"
else
  check "R10" "input indirection broken:${r10_bad} (issue #422 residual: inline expansion runs dispatch inputs as shell against the step's PAT env)" "bad"
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

summary="Silent-stall regression audit (R1-R11) on ${WF}: ${pass} passed, ${fail} failed."
echo "$summary"

if [ "$fail" -gt 0 ]; then
  body="## Silent-stall regression audit FAILED (R1-R11)

${summary}
${report}

A lab CI invariant was violated in the audited workflow set rooted at ${WF} (silent-stall S1/S2/L1/L2, R6 two-knob free tier, R7 review-restore ownership, R8 vendored hardened runner, R9 schedule/dispatch retry parity, R10 dispatch-input indirection, or R11 post-agent PAT gates). Investigate before merging any workflow change.

- the Auditor"
  if [ -n "$HEALTH_ISSUE" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
    gh issue comment "$HEALTH_ISSUE" --repo "$REPO" --body "$body" 2>/dev/null || echo "Failed to post to health issue #$HEALTH_ISSUE"
  fi
fi

exit 0
