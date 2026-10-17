#!/usr/bin/env bash
#
# post-peros-findings.sh - post a per-OS tester's findings report as a
# bot-authored comment on the target issue/PR and verify it persisted
# (issue #608).
#
# Why this exists: the per-OS arms depended on the opencode session's final
# message for the findings report. The wrapper posts the final message as a
# comment only when no PR is created; a PR-creating run turns it into the PR
# body instead, so the report existed only in the run log (macOS arm run
# 39036858261, PR #606, target issue #582) and the Maintainer had to recover
# it by hand. The report is now a file contract: the session writes
# /tmp/random-lab-findings.md, and this script validates it (non-empty, last
# non-blank line is the tester's sign-off), posts it as github-actions[bot],
# and re-fetches the posted comment by id to verify authorship and the exact
# body before the arm can conclude green.
#
# Usage: post-peros-findings.sh <linux|macos|windows> <target-number> [report-file]
# Env:   GH_TOKEN           required; the workflow passes github.token (never
#                           the owner PAT) so the comment is authored by
#                           github-actions[bot]
#        GITHUB_REPOSITORY  repo slug (owner/name), set by Actions
#
# Exit 0 only when the report exists, is signed, was posted by the bot, and
# re-fetches with the same body. Every other path exits 1 loudly so the
# fail-closed verify/forward chain in opencode-peros-test.yml never reports
# a false green.

set -u

os_label="${1:-}"
target="${2:-}"
report="${3:-/tmp/random-lab-findings.md}"
repo="${GITHUB_REPOSITORY:-}"

case "$os_label" in
  linux)   signoff="- the Linux Tester" ;;
  macos)   signoff="- the macOS Tester" ;;
  windows) signoff="- the Windows Tester" ;;
  *)
    echo "::error::post-peros-findings.sh: unknown OS label '${os_label}' (expected linux, macos, or windows)."
    exit 1
    ;;
esac

if [ -z "$repo" ]; then
  echo "::error::post-peros-findings.sh: GITHUB_REPOSITORY is empty; cannot resolve the repo slug."
  exit 1
fi

case "$target" in
  ''|*[!0-9]*)
    echo "::error::post-peros-findings.sh: target '$target' is not a numeric issue/PR number."
    exit 1
    ;;
esac

if [ ! -s "$report" ]; then
  echo "::error::post-peros-findings.sh: findings report '$report' is missing or empty; the ${os_label} tester must write it before ending the run (issue #608)."
  exit 1
fi

last_line=$(tr -d '\r' < "$report" | awk 'NF { line=$0 } END { print line }')
if [ "$last_line" != "$signoff" ]; then
  echo "::error::post-peros-findings.sh: findings report '$report' does not end with the required sign-off '$signoff' (last non-blank line: '$last_line'); refusing to post an unsigned report (issue #608)."
  exit 1
fi

response=$(gh api "repos/${repo}/issues/${target}/comments" -F body=@"$report" 2>&1) || {
  echo "::error::post-peros-findings.sh: posting the ${os_label} findings report to #${target} failed: ${response}"
  exit 1
}

comment_id=$(printf '%s' "$response" | jq -r '.id // empty' 2>/dev/null || true)
if [ -z "$comment_id" ]; then
  echo "::error::post-peros-findings.sh: the GitHub API accepted the comment but returned no id; cannot verify it persisted (response head: $(printf '%s' "$response" | head -c 300))."
  exit 1
fi

fetched=$(gh api "repos/${repo}/issues/comments/${comment_id}" 2>&1) || {
  echo "::error::post-peros-findings.sh: could not re-fetch posted findings comment ${comment_id}: ${fetched}"
  exit 1
}
author=$(printf '%s' "$fetched" | jq -r '.user.login // empty' 2>/dev/null || true)
html_url=$(printf '%s' "$fetched" | jq -r '.html_url // empty' 2>/dev/null || true)
fetched_body=$(printf '%s' "$fetched" | jq -r '.body // empty' 2>/dev/null || true)
fetched_last=$(printf '%s' "$fetched_body" | tr -d '\r' | awk 'NF { line=$0 } END { print line }')
expected_body="$(cat "$report")"

if [ "$author" != "github-actions[bot]" ]; then
  echo "::error::post-peros-findings.sh: posted findings comment ${comment_id} is authored by '${author}', not github-actions[bot] (issue #608)."
  exit 1
fi
if [ "$fetched_last" != "$signoff" ]; then
  echo "::error::post-peros-findings.sh: posted findings comment ${comment_id} does not end with the sign-off '$signoff' (issue #608)."
  exit 1
fi
if [ "$fetched_body" != "$expected_body" ]; then
  echo "::error::post-peros-findings.sh: posted findings comment ${comment_id} does not match the report file body after trailing-newline normalization (issue #608)."
  exit 1
fi

echo "Verified bot-authored ${os_label} findings comment ${comment_id} on #${target}: ${html_url}"
