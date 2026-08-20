#!/usr/bin/env bash
# Circuit breaker for runaway autonomous /oc dispatch loops.
#
# Counts bot-authored "/oc (continue|build|research|architect|review|test|fix|lab)"
# dispatch comments on an issue. If the count meets or exceeds LOOP_HALT, this
# script posts a clear "circuit breaker tripped" comment and exits non-zero so
# the caller (a Forward step in opencode.yml) skips the auto-dispatch. Under
# budget it exits 0 and the caller proceeds as today.
#
# This is a strict superset of existing behaviour: it only adds a stop
# condition, never changes the push/retry/forward logic when under budget.
#
# Reset: a human removes the runaway by closing/reopening the issue or pruning
# old dispatch comments, then re-issues an explicit directive.
set -euo pipefail

REPO="${1:?usage: loop-budget.sh <repo> <issue> [target]}"
ISSUE="${2:?missing issue}"
TARGET="${3:-$ISSUE}"
LOOP_HALT="${LOOP_HALT:-20}"
LOOP_WARN="${LOOP_WARN:-15}"

# gh api --paginate applies --jq per page, so we emit one id per matching
# comment and count lines instead of summing per-page lengths.
count=$(gh api "repos/${REPO}/issues/${ISSUE}/comments" --paginate \
  --jq '.[] | select(.user.login=="github-actions[bot]") | select(.body | test("/oc (continue|build|research|architect|review|test|fix|lab)")) | .id' \
  2>/dev/null | wc -l | tr -d ' ')

echo "loop-budget: bot dispatch comments on #${ISSUE} = ${count} (warn=${LOOP_WARN} halt=${LOOP_HALT})"

if [ "${count}" -ge "${LOOP_HALT}" ]; then
  echo "::error::Circuit breaker tripped on #${ISSUE}: ${count} autonomous dispatches >= budget ${LOOP_HALT}. Halting auto-loop."
  gh issue comment "${TARGET}" --repo "${REPO}" --body \
    "Lab circuit breaker tripped on #${TARGET}: ${count} autonomous build/research/architect re-dispatches have exceeded the budget of ${LOOP_HALT} without converging. The auto-loop is halted to prevent unbounded agent-slot burn (the Obsidian PR #93 spanned 10+ net-negative paradigms over many hours with no gate progress). A human (owner or Maintainer) must review the trajectory and either repivot/close the issue or explicitly raise the budget. No further auto-dispatches will be issued by this guard." \
    2>/dev/null || true
  exit 2
elif [ "${count}" -ge "${LOOP_WARN}" ]; then
  echo "::warning::Loop budget warning on #${ISSUE}: ${count}/${LOOP_HALT} autonomous dispatches. Approaching circuit-breaker limit."
fi

exit 0
