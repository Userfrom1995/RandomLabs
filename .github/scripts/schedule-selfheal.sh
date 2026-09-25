#!/usr/bin/env bash
#
# schedule-selfheal.sh - Bounded crash self-heal for the lab's schedule- and
# dispatch-only agent arms (issue #422).
#
# Why this exists: the issue_comment arms (opencode.yml, opencode-review.yml,
# curator.yml) carry crash-parity auto-retry caps, but the schedule and
# workflow_dispatch arms used to fail closed. A single pre-agent crash (for
# example the upstream version-fetch step dying on an anonymous rate limit)
# therefore burned an entire cron cycle - curator: 6 hours, auditor: 24
# hours - with no recovery until the next tick. This script gives those arms
# the same bounded self-heal: re-dispatch THIS workflow once, and at the cap
# escalate to the Maintainer on the lab-health board instead of looping.
#
# Usage: schedule-selfheal.sh <workflow-file> <retry-n> [key=value ...]
#
#   <workflow-file>  workflow to re-dispatch (e.g. curator.yml)
#   <retry-n>        the current run's `selfheal_retry` dispatch input; empty
#                    means this is the original schedule/dispatch attempt
#   key=value        extra workflow_dispatch inputs to forward verbatim
#                    (e.g. issue_number=422 for lab.yml)
#
# Required env: GH_TOKEN (needs actions: write), GITHUB_REPOSITORY,
#               GITHUB_REF_NAME (falls back to main).
#
# Exit codes: 0 = re-dispatched (the caller must exit 0 so the run that just
# queued its own retry does not also fail), 1 = capped, escalated, or the
# re-dispatch itself failed (fail closed so maintainer triage triggers).

set -u

WF="${1:-}"
RETRY="${2:-}"
if [ "$#" -ge 2 ]; then
  shift 2
else
  set --
fi

# Single re-dispatch, then escalate: a hard, finite cap (issue #422 B).
MAX_RETRIES=1

health_issue() {
  gh api "repos/${GITHUB_REPOSITORY}/issues?state=open&labels=lab-health" \
    --jq '.[0].number' 2>/dev/null || true
}

# Escalation path at the cap (and on an unreadable counter): tell the
# Maintainer on the lab-health board, then exit 1 so the workflow_run
# failure trigger fires too. Never silently green.
escalate() {
  echo "::error::$1"
  local health
  health=$(health_issue)
  if [ -n "$health" ] && [ "$health" != "null" ]; then
    gh issue comment "$health" --repo "$GITHUB_REPOSITORY" \
      --body "Schedule/dispatch self-heal exhausted for ${WF}: $1 Manual triage required. /oc maintainer" \
      2>/dev/null || echo "::warning::Could not post the escalation to the lab-health board."
  else
    echo "::warning::No open lab-health board found; relying on the workflow_run failure trigger."
  fi
  exit 1
}

if [ -z "$WF" ]; then
  escalate "no workflow file argument was passed to schedule-selfheal.sh."
fi

# Phantom-zero guard (mirrors silent-stall-audit.sh R3): an unreadable
# counter must escalate, never degrade to 0, which would make the cap never
# trip and turn one crash into an infinite dispatch loop.
case "$RETRY" in
  "") RETRY=0 ;;
  *[!0-9]*) escalate "unreadable selfheal_retry counter '${RETRY}' (refusing to fall back to 0)." ;;
esac

if [ "$RETRY" -lt "$MAX_RETRIES" ]; then
  n=$((RETRY + 1))
  ref="${GITHUB_REF_NAME:-main}"
  extra=()
  for kv in "$@"; do
    extra+=(-f "$kv")
  done
  if gh workflow run "$WF" --ref "$ref" -f "selfheal_retry=$n" \
      ${extra[@]+"${extra[@]}"}; then
    echo "Self-heal re-dispatch $n of $WF queued on $ref (selfheal_retry=$n)."
    exit 0
  fi
  escalate "the re-dispatch of ${WF} could not be queued (gh workflow run failed)."
fi

escalate "cap of $MAX_RETRIES re-dispatch(es) for ${WF} reached after this crash."
