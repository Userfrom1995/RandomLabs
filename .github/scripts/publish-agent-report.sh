#!/usr/bin/env bash
#
# publish-agent-report.sh - publish an agent's signed report as an
# owner-authored comment and verify it persisted (issue #713).
#
# Why this exists: the tester, reviewer, and per-OS agent sessions execute
# PR-controlled code, so they must not hold an issues:write token. Their
# tokens are read-only for issues; the hardcoded workflow steps own every
# comment post with the owner PAT, which is never exposed to the agent. This
# script is the shared poster: it validates the report contract, posts the
# LF-normalized body with the owner PAT, and re-fetches the comment by id to
# verify authorship and the exact body before the workflow may conclude green
# or forward a verdict.
#
# Usage: publish-agent-report.sh <target-number> <report-file> <signoff>
# Env:   GH_TOKEN           required; owner PAT (never exposed to the agent)
#        GITHUB_REPOSITORY  repo slug (owner/name), set by Actions
#
# Exit 0 only when the report exists, is signed, was posted by the owner, and
# re-fetches with the same body. Every other path exits 1 loudly.

set -u

target="${1:-}"
report="${2:-}"
signoff="${3:-}"
repo="${GITHUB_REPOSITORY:-}"
owner="${GITHUB_REPOSITORY_OWNER:-${repo%%/*}}"

if [ -z "$repo" ] || [ -z "$owner" ]; then
  echo "::error::publish-agent-report.sh: GITHUB_REPOSITORY is empty; cannot resolve the repo slug."
  exit 1
fi

case "$target" in
  ''|*[!0-9]*)
    echo "::error::publish-agent-report.sh: target '$target' is not a numeric issue/PR number."
    exit 1
    ;;
esac

if [ -z "$signoff" ]; then
  echo "::error::publish-agent-report.sh: no sign-off argument supplied; refusing to post an unverified report."
  exit 1
fi

if [ ! -s "$report" ]; then
  echo "::error::publish-agent-report.sh: report '$report' is missing or empty; the agent must write it before ending the run (issue #713)."
  exit 1
fi

normalized_report=$(mktemp) || true
if [ -z "$normalized_report" ] || [ ! -f "$normalized_report" ]; then
  echo "::error::publish-agent-report.sh: could not create the LF-normalized report copy; refusing to post without the exact-body verification (issue #713)."
  exit 1
fi
trap 'rm -f "$normalized_report"' EXIT
tr -d '\r' < "$report" > "$normalized_report"
# Issue #713 round 17: read the report once and use that exact value for both
# the post and the re-fetch comparison, so a writer racing the file after the
# post can never satisfy the exact-body check.
expected_body="$(cat "$normalized_report")"

# Issue #713 round 16: the PAT merge sweep anchors the tester verdict to the
# first line of an owner-authored comment, and this publisher posts arbitrary
# agent-written report content under the owner PAT. A report whose first
# non-blank line is a command trigger would therefore be consumable as a
# forged owner-authored verdict. Refuse it before it reaches the API.
first_line=$(awk 'NF { line=$0; sub(/^[[:space:]]+/, "", line); sub(/^`+/, "", line); print line; exit }' "$normalized_report")
case "$first_line" in
  '/oc'|'/oc '*|'/opencode'|'/opencode '*)
    echo "::error::publish-agent-report.sh: report '$report' begins with the command trigger '$first_line'; refusing to publish a report that could be consumed as a verdict trigger (issue #713)."
    exit 1
    ;;
esac

last_line=$(awk 'NF { line=$0 } END { print line }' "$normalized_report")
if [ "$last_line" != "$signoff" ]; then
  echo "::error::publish-agent-report.sh: report '$report' does not end with the required sign-off '$signoff' (last non-blank line: '$last_line'); refusing to post an unsigned report (issue #713)."
  exit 1
fi

response=$(gh api "repos/${repo}/issues/${target}/comments" --raw-field body="$expected_body" 2>&1) || {
  echo "::error::publish-agent-report.sh: posting the signed report to #${target} failed: ${response}"
  exit 1
}

comment_id=$(printf '%s' "$response" | jq -r '.id // empty' 2>/dev/null || true)
if [ -z "$comment_id" ]; then
  echo "::error::publish-agent-report.sh: the GitHub API accepted the comment but returned no id; cannot verify it persisted (response head: $(printf '%s' "$response" | head -c 300))."
  exit 1
fi

fetched=$(gh api "repos/${repo}/issues/comments/${comment_id}" 2>&1) || {
  echo "::error::publish-agent-report.sh: could not re-fetch posted report comment ${comment_id}: ${fetched}"
  exit 1
}
author=$(printf '%s' "$fetched" | jq -r '.user.login // empty' 2>/dev/null || true)
html_url=$(printf '%s' "$fetched" | jq -r '.html_url // empty' 2>/dev/null || true)
fetched_body=$(printf '%s' "$fetched" | jq -r '.body // empty' 2>/dev/null | tr -d '\r' || true)
fetched_last=$(printf '%s' "$fetched_body" | awk 'NF { line=$0 } END { print line }')

if [ "$author" != "$owner" ]; then
  echo "::error::publish-agent-report.sh: posted report comment ${comment_id} is authored by '${author}', not the repository owner '${owner}'; the workflow must publish with the owner PAT (issue #713)."
  exit 1
fi
if [ "$fetched_last" != "$signoff" ]; then
  echo "::error::publish-agent-report.sh: posted report comment ${comment_id} does not end with the sign-off '$signoff' (issue #713)."
  exit 1
fi
if [ "$fetched_body" != "$expected_body" ]; then
  echo "::error::publish-agent-report.sh: posted report comment ${comment_id} body differs from the LF-normalized report content (expected $(printf '%s' "$expected_body" | wc -c | tr -d ' ') bytes, stored $(printf '%s' "$fetched_body" | wc -c | tr -d ' ') bytes); the stored comment diverged from the report (issue #713)."
  exit 1
fi

echo "Verified owner-authored signed report comment ${comment_id} on #${target}: ${html_url}"
