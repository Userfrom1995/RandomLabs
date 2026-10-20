#!/usr/bin/env bash
#
# publish-eval-marker.sh - publish the canonical Evaluator approval marker as a
# bot-authored comment and verify it persisted (issue #713).
#
# Why this exists: the PAT merge sweep in maintainer.yml is the only automated
# path that can land .github/workflows/* PRs, and it used to gate only on a
# fresh, head-bound /oc approve-test verdict. A workflow-touching PR could
# therefore merge with no binding Evaluator verdict at all. The sweep now also
# requires a fresh, head-bound eval approval marker. Publishing that marker
# from the approve-eval machine handoff (only after the decision file and the
# evidence gate passed) and re-fetching it by id guarantees the marker shape
# by construction instead of depending on agent prose formatting, mirroring
# publish-tester-marker.sh (issue #629).
#
# The marker deliberately carries no /oc prefix: approve-eval is a decision
# action, never a trigger, so this comment can never be mistaken for a command.
#
# Usage: publish-eval-marker.sh <pr-number> [score]
# Env:   GH_TOKEN           required; the workflow passes github.token (never
#                           the owner PAT) so the comment is authored by
#                           github-actions[bot]
#        GITHUB_REPOSITORY  repo slug (owner/name), set by Actions
#
# Exit 0 only when the marker was posted and re-fetches as a bot-authored
# comment whose first line is exactly the marker. Every other path exits 1
# loudly so the fail-closed eval forward chain never hands an unverified
# verdict to the merge sweep.

set -u

target="${1:-}"
score="${2:-N/A}"
repo="${GITHUB_REPOSITORY:-}"
marker="eval-verdict: approve-eval"

if [ -z "$repo" ]; then
  echo "::error::publish-eval-marker.sh: GITHUB_REPOSITORY is empty; cannot resolve the repo slug."
  exit 1
fi

case "$target" in
  ''|*[!0-9]*)
    echo "::error::publish-eval-marker.sh: target '$target' is not a numeric PR number."
    exit 1
    ;;
esac

body=$(printf '%s\n' \
  "$marker" \
  '' \
  "Machine-published Evaluator approval verdict for PR #${target} (Quality Council score: ${score}/10): the evaluator decision file passed the workflow gates. Published by the opencode-eval workflow (issue #713) so the merge sweep's first-line eval-verdict anchor is guaranteed by the workflow rather than by agent prose formatting.")

response=$(gh api "repos/${repo}/issues/${target}/comments" -f body="$body" 2>&1) || {
  echo "::error::publish-eval-marker.sh: posting the eval approval marker to #${target} failed: ${response}"
  exit 1
}

comment_id=$(printf '%s' "$response" | jq -r '.id // empty' 2>/dev/null || true)
if [ -z "$comment_id" ]; then
  echo "::error::publish-eval-marker.sh: the GitHub API accepted the marker but returned no id; cannot verify it persisted (response head: $(printf '%s' "$response" | head -c 300))."
  exit 1
fi

fetched=$(gh api "repos/${repo}/issues/comments/${comment_id}" 2>&1) || {
  echo "::error::publish-eval-marker.sh: could not re-fetch posted marker comment ${comment_id}: ${fetched}"
  exit 1
}

author=$(printf '%s' "$fetched" | jq -r '.user.login // empty' 2>/dev/null || true)
html_url=$(printf '%s' "$fetched" | jq -r '.html_url // empty' 2>/dev/null || true)
fetched_first=$(printf '%s' "$fetched" | jq -r '.body // empty' 2>/dev/null | tr -d '\r' | head -n1 || true)

if [ "$author" != "github-actions[bot]" ]; then
  echo "::error::publish-eval-marker.sh: posted marker comment ${comment_id} is authored by '${author}', not github-actions[bot]; the merge sweep's R30 predicate requires bot authorship (issue #713)."
  exit 1
fi
if [ "$fetched_first" != "$marker" ]; then
  echo "::error::publish-eval-marker.sh: posted marker comment ${comment_id} does not carry the exact '${marker}' first line (fetched first line: '${fetched_first}'); the merge sweep would not recognize the verdict (issue #713)."
  exit 1
fi

echo "Verified bot-authored eval approval marker comment ${comment_id} on #${target}: ${html_url}"
