#!/usr/bin/env bash
#
# silent-stall-audit.sh - Static regression checks for the issue #122 silent-stall
# hardening invariants (S1/S2/L1/L2) plus R6 model free-tier guard.
# Wired into auditor.yml as the R1-R6 matrix.
#
# Usage: silent-stall-audit.sh <path-to-opencode.yml> [health-issue-number]
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

check() {
  local name="$1" desc="$2" ok="$3"
  if [ "$ok" = "ok" ]; then
    pass=$((pass + 1))
    report="${report}
[R1-R5 PASS] $name: $desc"
    echo "PASS  $name: $desc"
  else
    fail=$((fail + 1))
    report="${report}
[R1-R5 FAIL] $name: $desc"
    echo "FAIL  $name: $desc"
  fi
}

if [ ! -f "$WF" ]; then
  echo "::error::opencode.yml not found at $WF"
  exit 0
fi

# [R1] Concurrency assertion: NO concurrency group may cancel in progress.
# Scan every `concurrency:` block and assert `cancel-in-progress: false`.
cancel_true=$(grep -nE 'cancel-in-progress:\s*true' "$WF" || true)
if [ -z "$cancel_true" ]; then
  check "R1" "no concurrency group sets cancel-in-progress: true (S2 non-cancellation)" "ok"
else
  check "R1" "found cancel-in-progress: true -> ${cancel_true} (violates S2)" "bad"
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
non_free_models=$(echo "$model_lines" | grep -vE 'opencode/[^ ]*-free' || true)
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

summary="Silent-stall regression audit (R1-R6) on ${WF}: ${pass} passed, ${fail} failed."
echo "$summary"

if [ "$fail" -gt 0 ]; then
  body="## Silent-stall regression audit FAILED (R1-R6)

${summary}
${report}

The issue #122 silent-stall hardening invariants were violated in ${WF}. Investigate before merging any opencode.yml change.

- the Auditor"
  if [ -n "$HEALTH_ISSUE" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
    gh issue comment "$HEALTH_ISSUE" --repo "$REPO" --body "$body" 2>/dev/null || echo "Failed to post to health issue #$HEALTH_ISSUE"
  fi
fi

exit 0
