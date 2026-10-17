#!/usr/bin/env bash
#
# publish-tester-marker.sh - publish the canonical Tester approval marker as a
# bot-authored comment and verify it persisted (issue #629).
#
# Why this exists: the PAT merge sweep recognizes a tester verdict only when
# the `/oc approve-test` marker is the ENTIRE first line of a
# github-actions[bot] comment (issue #619, audit rule R21). The Tester's own
# published report is prose-first in practice (PR #628 comment 6240760500:
# "All green. Posting the decision comment." on line 1, the marker on line 3),
# which silently stalls every workflow-touching PR because no App-token merge
# path exists for `.github/workflows/*` changes. The opencode-test workflow
# therefore publishes the canonical marker itself, from the machine handoff,
# and only after the decision file passed the live-execution evidence gate
# AND the Tester's signed report is verified published (see
# test-comment-published.sh in the same directory): the marker shape is
# guaranteed by construction instead of depending on agent prose formatting,
# and no marker is ever posted for an escalation or an unpublished verdict.
#
# Usage: publish-tester-marker.sh <pr-number> <evidence-scope>
# Env:   GH_TOKEN           required; the workflow passes github.token (never
#                           the owner PAT) so the comment is authored by
#                           github-actions[bot]
#        GITHUB_REPOSITORY  repo slug (owner/name), set by Actions
#
# Exit 0 only when the marker was posted and re-fetches as a bot-authored
# comment whose first line is exactly the marker. Every other path exits 1
# loudly so the fail-closed verify/forward chain in opencode-test.yml never
# reports a false green.

set -u

target="${1:-}"
scope="${2:-}"
repo="${GITHUB_REPOSITORY:-}"

if [ -z "$repo" ]; then
  echo "::error::publish-tester-marker.sh: GITHUB_REPOSITORY is empty; cannot resolve the repo slug."
  exit 1
fi

case "$target" in
  ''|*[!0-9]*)
    echo "::error::publish-tester-marker.sh: target '$target' is not a numeric PR number."
    exit 1
    ;;
esac

body=$(printf '%s\n' \
  '/oc approve-test' \
  '' \
  "Machine-published Tester verdict for PR #${target} (evidence scope: ${scope}): the Tester's signed decision report is on this thread and the live-execution evidence gate passed. Published by the opencode-test workflow (issue #629) so the merge sweep's first-line marker shape is guaranteed by the workflow rather than by agent prose formatting.")

response=$(gh api "repos/${repo}/issues/${target}/comments" -f body="$body" 2>&1) || {
  echo "::error::publish-tester-marker.sh: posting the tester approval marker to #${target} failed: ${response}"
  exit 1
}

comment_id=$(printf '%s' "$response" | jq -r '.id // empty' 2>/dev/null || true)
if [ -z "$comment_id" ]; then
  echo "::error::publish-tester-marker.sh: the GitHub API accepted the marker but returned no id; cannot verify it persisted (response head: $(printf '%s' "$response" | head -c 300))."
  exit 1
fi

fetched=$(gh api "repos/${repo}/issues/comments/${comment_id}" 2>&1) || {
  echo "::error::publish-tester-marker.sh: could not re-fetch posted marker comment ${comment_id}: ${fetched}"
  exit 1
}

author=$(printf '%s' "$fetched" | jq -r '.user.login // empty' 2>/dev/null || true)
html_url=$(printf '%s' "$fetched" | jq -r '.html_url // empty' 2>/dev/null || true)
fetched_first=$(printf '%s' "$fetched" | jq -r '.body // empty' 2>/dev/null | tr -d '\r' | head -n1 || true)

if [ "$author" != "github-actions[bot]" ]; then
  echo "::error::publish-tester-marker.sh: posted marker comment ${comment_id} is authored by '${author}', not github-actions[bot]; the merge sweep's R21 predicate requires bot authorship (issue #629)."
  exit 1
fi
if [ "$fetched_first" != "/oc approve-test" ]; then
  echo "::error::publish-tester-marker.sh: posted marker comment ${comment_id} does not start with the exact /oc approve-test first line (fetched first line: '${fetched_first}'); the merge sweep would not recognize the verdict (issue #629)."
  exit 1
fi

echo "Verified bot-authored tester approval marker comment ${comment_id} on #${target}: ${html_url}"
