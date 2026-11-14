#!/usr/bin/env bash
#
# health-board.sh - resolve the universal lab health board (issue #848).
#
# Why this exists: issues #70 (the universal `Lab Health & Audit Logs` board)
# and #836 (a specific `[Audit]` escalation) both carried the `lab-health`
# label, and several workflow steps resolved "the lab-health board" with a
# newest-first lookup. They selected #836, so 30 quota-wall intake notes and 4
# schedule/dispatch self-heal escalations were posted away from the universal
# board. Every board lookup now calls this one helper so the six call sites
# agree by construction.
#
# Usage: health-board.sh
#
# Env: GITHUB_REPOSITORY (owner/repo), GH_TOKEN (used by gh).
#
# Prints the issue number on stdout (empty when no board exists).
#
# Resolution order:
#   1. the open non-PR issue titled exactly "Lab Health & Audit Logs" (the
#      pinned universal board; title-first, so a duplicate label can never
#      redirect the audit trail)
#   2. else the oldest open non-PR issue labeled lab-health
#   3. else empty (no board)
#
# Since issue #848 the lab-health label belongs to the universal board ONLY.
# If more than one open non-PR issue carries it, this helper still resolves
# deterministically (title first, then oldest) but prints a loud ::warning::
# naming the extra board-bearing issues; silent-stall audit rule R36 fails on
# a second board-bearing issue so the split audit trail cannot persist.
#
# Exit codes: 0 = resolved or empty, 1 = the title/source issue list could
# not be read and no title board resolves (a label-read failure after the
# title resolves is a loud warning, not an outage).

set -u

BOARD_TITLE='Lab Health & Audit Logs'
repo="${GITHUB_REPOSITORY:-}"

if [ -z "$repo" ]; then
  echo "health-board: GITHUB_REPOSITORY is required." >&2
  exit 1
fi

list_title() {
  local expr
  expr=$(printf '.[] | select(.pull_request == null) | select(.title == "%s") | .number' "$BOARD_TITLE")
  gh api "repos/${repo}/issues?state=open&sort=created&direction=asc&per_page=100" \
    --paginate \
    --jq "$expr" \
    2>/dev/null
}

list_labeled() {
  gh api "repos/${repo}/issues?state=open&labels=lab-health&sort=created&direction=asc&per_page=100" \
    --paginate \
    --jq '.[] | select(.pull_request == null) | .number' \
    2>/dev/null
}

count_lines() {
  printf '%s\n' "$1" | grep -cE '^[0-9]+$' 2>/dev/null || true
}

first_line() {
  printf '%s\n' "$1" | grep -E '^[0-9]+$' 2>/dev/null | sed -n '1p'
}

# Both reads run even when the title resolves: the labeled count is the
# single-board invariant, and a failed read must never silently hide a
# duplicate label.
if ! title_hits=$(list_title); then
  echo "health-board: could not read open issues for ${repo}." >&2
  exit 1
fi
if ! labeled_hits=$(list_labeled); then
  if [ -z "$(first_line "$title_hits")" ]; then
    echo "health-board: could not read open lab-health issues for ${repo}." >&2
    exit 1
  fi
  echo "::warning::health-board: could not verify the lab-health invariant for ${repo}; using the title board." >&2
  labeled_hits=""
fi

title_count=$(count_lines "$title_hits")
labeled_count=$(count_lines "$labeled_hits")

if [ "$title_count" -gt 1 ]; then
  echo "::warning::health-board: ${title_count} open non-PR issues are titled '${BOARD_TITLE}' ($(printf '%s' "$title_hits" | tr '\n' ' ')); the universal board must be unique (issue #848)." >&2
fi
if [ "$labeled_count" -gt 1 ]; then
  echo "::warning::health-board: ${labeled_count} open non-PR issues carry the lab-health label ($(printf '%s' "$labeled_hits" | tr '\n' ' ')); only the universal board may carry it (issue #848)." >&2
fi

board=$(first_line "$title_hits")
if [ -z "$board" ]; then
  board=$(first_line "$labeled_hits")
fi

printf '%s\n' "$board"
