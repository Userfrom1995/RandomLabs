#!/usr/bin/env bash
#
# post-peros-findings.sh - post a per-OS tester's findings report as a
# owner-authored comment on the target issue/PR and verify it persisted
# (issue #608).
#
# Why this exists: the per-OS arms depended on the opencode session's final
# message for the findings report. The wrapper posts the final message as a
# comment only when no PR is created; a PR-creating run turns it into the PR
# body instead, so the report existed only in the run log (macOS arm run
# 39036858261, PR #606, target issue #582) and the Maintainer had to recover
# it by hand. The report is now a file contract: the session writes
# /tmp/random-lab-findings.md, and this script validates it (non-empty, last
# non-blank line is the tester's sign-off), posts it with the owner PAT (never
# exposed to the agent), and re-fetches the posted comment by id to verify
# authorship and the exact body before the arm can conclude green.
#
# Line-ending contract (issue #612 follow-up, Windows arm run 39068849150 on
# PR #632): Git Bash on windows-latest translates line endings of
# command-substituted output, so on 2026-10-17 the Windows arm posted its
# findings comment (6242535208 on #582) and then this script's exact-body gate
# rejected the re-fetch although the stored body was clean LF and matched the
# report. Line endings are therefore normalized to LF on both sides before the
# comparison, and the posted body is an LF-normalized copy of the report so
# the stored comment is byte-stable on every runner. The gate stays exact:
# any real content difference (beyond CR bytes and trailing newlines) still
# fails closed.
#
# Usage: post-peros-findings.sh <linux|macos|windows> <target-number> [report-file]
# Env:   GH_TOKEN           required; the workflow passes the owner PAT
#                           (never exposed to the agent) so the comment is
#                           owner-authored (issue #713)
#        GITHUB_REPOSITORY  repo slug (owner/name), set by Actions
#
# Exit 0 only when the report exists, is signed, was posted by the owner, and
# re-fetches with the same body. Every other path exits 1 loudly so the
# fail-closed verify/forward chain in opencode-peros-test.yml never reports
# a false green.

set -u

os_label="${1:-}"
target="${2:-}"
report="${3:-/tmp/random-lab-findings.md}"
repo="${GITHUB_REPOSITORY:-}"
owner="${GITHUB_REPOSITORY_OWNER:-${repo%%/*}}"

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

# Normalize CR bytes out of the report once, before posting and comparing
# (issue #612 follow-up): Git Bash on windows-latest translates the line
# endings of command-substituted output, so a CRLF report or a CRLF-translated
# re-fetch used to fail the exact-body gate after the comment had already
# posted (Windows arm run 39068849150). The normalized LF copy is both the
# posted body (byte-stable storage on every runner) and the comparison source,
# so CR can never decide the outcome.
normalized_report=$(mktemp) || true
if [ -z "$normalized_report" ] || [ ! -f "$normalized_report" ]; then
  echo "::error::post-peros-findings.sh: could not create the LF-normalized findings copy; refusing to post without the exact-body verification (issue #608)."
  exit 1
fi
trap 'rm -f "$normalized_report"' EXIT
tr -d '\r' < "$report" > "$normalized_report"
expected_body="$(cat "$normalized_report")"

# Issue #713 round 18: bind the report to this run's contract nonce. A blind
# or stale replacement cannot know LAB_RUN_NONCE; the poster verifies the
# standalone line, strips it from the posted body, and never republishes the
# nonce. A process spawned by the agent can read the environment and forge
# this, so it rejects a blind replacement, not a determined in-session writer.
expected_nonce="${LAB_RUN_NONCE:-}"
nonce_count=$(printf '%s\n' "$expected_body" | awk '/^[[:space:]]*run-nonce:[[:space:]]*/ { c++ } END { print c+0 }')
nonce_value=$(printf '%s\n' "$expected_body" | awk '/^[[:space:]]*run-nonce:[[:space:]]*/ { line=$0; sub(/^[[:space:]]*run-nonce:[[:space:]]*/, "", line); print line; exit }')
if [ -n "$expected_nonce" ]; then
  if [ "$nonce_count" -ne 1 ]; then
    echo "::error::post-peros-findings.sh: findings report '$report' must carry exactly one 'run-nonce: <value>' line for this run (found ${nonce_count}); refusing an unbound or ambiguous report (issue #713 round 18)."
    exit 1
  fi
  if [ "$nonce_value" != "$expected_nonce" ]; then
    echo "::error::post-peros-findings.sh: findings report '$report' carries a run nonce that does not match this run; refusing a stale or blind replacement report (issue #713 round 18)."
    exit 1
  fi
  expected_body=$(printf '%s\n' "$expected_body" | awk '! /^[[:space:]]*run-nonce:[[:space:]]*/')
else
  if [ "$nonce_count" -ne 0 ]; then
    echo "::error::post-peros-findings.sh: findings report '$report' carries a run nonce but this workflow lane did not issue one; refusing an unbound report (issue #713 round 18)."
    exit 1
  fi
fi

# Issue #713 round 16: this poster posts arbitrary agent-written findings
# under the owner PAT. A report whose first non-blank line is a command
# trigger could be consumed as an owner-authored verdict, so refuse it
# before it reaches the API.
# Issue #713 round 19: the merge sweep also accepts an owner-authored
# `eval-verdict: approve-eval` marker, so refuse that marker in plain,
# backticked, and trailing-space forms too.
first_line=$(awk 'NF { line=$0; sub(/^[[:space:]]+/, "", line); gsub(/`/, "", line); sub(/[[:space:]]+$/, "", line); print line; exit }' <<< "$expected_body")
case "$first_line" in
  '/oc'|'/oc '*|'/opencode'|'/opencode '*|'eval-verdict:'*)
    echo "::error::post-peros-findings.sh: findings report '$report' begins with the command trigger or merge-gate marker '$first_line'; refusing to publish a report that could be consumed as a verdict (issue #713)."
    exit 1
    ;;
esac

last_line=$(awk 'NF { line=$0 } END { print line }' <<< "$expected_body")
if [ "$last_line" != "$signoff" ]; then
  echo "::error::post-peros-findings.sh: findings report '$report' does not end with the required sign-off '$signoff' (last non-blank line: '$last_line'); refusing to post an unsigned report (issue #608)."
  exit 1
fi

# Post the in-memory snapshot, never re-read the /tmp file at post time:
# a background writer could otherwise replace the body after the nonce and
# sign-off checks (issue #713 round 18).
response=$(gh api "repos/${repo}/issues/${target}/comments" --raw-field body="$expected_body" 2>&1) || {
  echo "::error::post-peros-findings.sh: posting the ${os_label} findings report to #${target} failed: ${response}"
  exit 1
}

comment_id=$(printf '%s' "$response" | jq -r '.id // empty' 2>/dev/null | tr -d '\r' || true)
if [ -z "$comment_id" ]; then
  echo "::error::post-peros-findings.sh: the GitHub API accepted the comment but returned no id; cannot verify it persisted (response head: $(printf '%s' "$response" | head -c 300))."
  exit 1
fi

fetched=$(gh api "repos/${repo}/issues/comments/${comment_id}" 2>&1) || {
  echo "::error::post-peros-findings.sh: could not re-fetch posted findings comment ${comment_id}: ${fetched}"
  exit 1
}
author=$(printf '%s' "$fetched" | jq -r '.user.login // empty' 2>/dev/null | tr -d '\r' || true)
html_url=$(printf '%s' "$fetched" | jq -r '.html_url // empty' 2>/dev/null | tr -d '\r' || true)
fetched_body=$(printf '%s' "$fetched" | jq -r '.body // empty' 2>/dev/null | tr -d '\r' || true)
fetched_last=$(printf '%s' "$fetched_body" | awk 'NF { line=$0 } END { print line }')

if [ "$author" != "$owner" ]; then
  echo "::error::post-peros-findings.sh: posted findings comment ${comment_id} is authored by '${author}', not the repository owner '${owner}' (issues #608, #713)."
  exit 1
fi
if [ "$fetched_last" != "$signoff" ]; then
  echo "::error::post-peros-findings.sh: posted findings comment ${comment_id} does not end with the sign-off '$signoff' (issue #608)."
  exit 1
fi
if [ "$fetched_body" != "$expected_body" ]; then
  echo "::error::post-peros-findings.sh: posted findings comment ${comment_id} body differs from the LF-normalized report content after CR and trailing-newline normalization (expected $(printf '%s' "$expected_body" | wc -c | tr -d ' ') bytes, stored $(printf '%s' "$fetched_body" | wc -c | tr -d ' ') bytes); the stored comment diverged from the report (issue #608)."
  exit 1
fi

echo "Verified owner-authored ${os_label} findings comment ${comment_id} on #${target}: ${html_url}"
