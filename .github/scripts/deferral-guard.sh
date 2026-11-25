#!/usr/bin/env bash
#
# deferral-guard.sh - re-arm silent deferral promises on open PRs (issue #853).
#
# Issue #745 sat orphaned for 23 days after a Maintainer comment promised that
# the "next head-bound review follows in the next window" and no dispatch or
# run ever followed. The promise had no owner, no date, and no guard. This
# script scans open PRs for owner or bot deferral comments ("next window",
# "follows later", "when ... lands"), checks whether a later dispatch comment
# or workflow run followed, and posts one deduped re-arm note to the universal
# lab-health board resolved by the shared health-board.sh helper.
#
# The note never carries a trigger token: it is an audit signal for the
# Maintainer, not an automated dispatch.
#
# Env:
#   GITHUB_REPOSITORY        owner/repo (required)
#   DEFERRAL_WINDOW_HOURS    minimum age before a promise counts as stale (6)
#   DEFERRAL_MAX_AGE_DAYS    oldest deferral considered (90)
#   DEFERRAL_MAX_PRS         open PR scan cap (100)
#   DEFERRAL_NOW_EPOCH       fixed clock for fixtures (default: date -u +%s)
#   DEFERRAL_BOARD_HELPER    health-board.sh path override (fixtures only)
#
# Exit codes: 0 = scan completed, 1 = a required read failed (fail closed).

set -u

repo="${GITHUB_REPOSITORY:-}"
if [ -z "$repo" ]; then
  echo "deferral-guard: GITHUB_REPOSITORY is required." >&2
  exit 1
fi

window_hours="${DEFERRAL_WINDOW_HOURS:-6}"
max_age_days="${DEFERRAL_MAX_AGE_DAYS:-90}"
max_prs="${DEFERRAL_MAX_PRS:-100}"
now_epoch="${DEFERRAL_NOW_EPOCH:-$(date -u +%s)}"

case "$window_hours" in
  ''|*[!0-9]*) echo "deferral-guard: DEFERRAL_WINDOW_HOURS must be numeric." >&2; exit 1 ;;
esac
case "$max_age_days" in
  ''|*[!0-9]*) echo "deferral-guard: DEFERRAL_MAX_AGE_DAYS must be numeric." >&2; exit 1 ;;
esac
case "$max_prs" in
  ''|*[!0-9]*) echo "deferral-guard: DEFERRAL_MAX_PRS must be numeric." >&2; exit 1 ;;
esac
case "$now_epoch" in
  ''|*[!0-9]*) echo "deferral-guard: DEFERRAL_NOW_EPOCH must be epoch seconds." >&2; exit 1 ;;
esac
window_seconds=$((window_hours * 3600))
max_age_seconds=$((max_age_days * 86400))

helper="${DEFERRAL_BOARD_HELPER:-$(dirname "$0")/health-board.sh}"
if [ ! -f "$helper" ]; then
  echo "::error::deferral-guard: health-board helper not found at ${helper} (issue #853)."
  exit 1
fi
if ! board=$(bash "$helper"); then
  echo "::error::deferral-guard: health-board helper failed; refusing to post blind."
  exit 1
fi
if [ -z "$board" ] || [ "$board" = "null" ]; then
  echo "::error::deferral-guard: no universal lab-health board resolved; refusing to post re-arm notes."
  exit 1
fi

owner="${GITHUB_REPOSITORY_OWNER:-${repo%%/*}}"
deferral_re='next window|follows later|when .* lands|following window|later window|later pass|next pass'

prs_payload=$(gh api "repos/${repo}/pulls?state=open&per_page=${max_prs}" --paginate --slurp 2>/dev/null) || {
  echo "::error::deferral-guard: could not list open PRs for ${repo}."
  exit 1
}
printf '%s' "$prs_payload" | jq -e '
  type == "array" and
  all(.[]; type == "array" and
    all(.[]; type == "object" and
      (.state | type) == "string" and
      (if .state == "open" then
         ((.number | type) == "number") and
         ((.head | type) == "object") and
         ((.head.sha | type) == "string") and
         ((.head.sha | length) > 0)
       else true end)))
' >/dev/null 2>&1 || {
  echo "::error::deferral-guard: open PR payload was not a valid page array with open-PR head SHAs."
  exit 1
}
runs_payload=$(gh api "repos/${repo}/actions/runs?per_page=100" --paginate --slurp 2>/dev/null) || {
  echo "::error::deferral-guard: could not list workflow runs for ${repo}."
  exit 1
}
printf '%s' "$runs_payload" | jq -e '
  type == "array" and
  all(.[]; type == "object" and
    (.workflow_runs | type) == "array" and
    all(.workflow_runs[]; type == "object" and
      (.head_sha | type) == "string" and
      (.created_at | type) == "string"))
' >/dev/null 2>&1 || {
  echo "::error::deferral-guard: workflow-run payload was not a valid page array."
  exit 1
}
board_payload=$(gh api "repos/${repo}/issues/${board}/comments?per_page=100" --paginate --slurp 2>/dev/null) || {
  echo "::error::deferral-guard: could not read board #${board} comments."
  exit 1
}
printf '%s' "$board_payload" | jq -e '
  type == "array" and
  all(.[]; type == "array" and
    all(.[]; type == "object" and (.body | type) == "string"))
' >/dev/null 2>&1 || {
  echo "::error::deferral-guard: board comment payload was not a valid page array."
  exit 1
}

posted=0
pr_rows=$(printf '%s' "$prs_payload" | jq -r '.[][] | select(.state == "open") | [.number, .head.sha] | @tsv') || {
  echo "::error::deferral-guard: open PR payload could not be parsed."
  exit 1
}

while IFS=$'\t' read -r pr head; do
  [ -n "$pr" ] || continue
  [ -n "$head" ] || continue
  comments=$(gh api "repos/${repo}/issues/${pr}/comments?per_page=100" --paginate --slurp 2>/dev/null) || {
    echo "::error::deferral-guard: could not read comments on PR #${pr}; refusing to guess."
    exit 1
  }
  printf '%s' "$comments" | jq -e '
    type == "array" and
    all(.[]; type == "array" and
      all(.[]; type == "object" and
        (.id | type) == "number" and
        (.body | type) == "string" and
        (.created_at | type) == "string" and
        ((.user == null) or
          ((.user | type) == "object" and (.user.login | type) == "string"))))
  ' >/dev/null 2>&1 || {
    echo "::error::deferral-guard: comment payload for PR #${pr} was not a valid page array."
    exit 1
  }
  deferrals=$(printf '%s' "$comments" | jq -r --arg owner "$owner" --arg re "$deferral_re" '
    .[][] |
    select(((.user.login? // "") == $owner) or ((.user.login? // "") | endswith("[bot]"))) |
    select(.body | test($re; "i")) |
    [.id, .created_at, .user.login] | @tsv
  ') || {
    echo "::error::deferral-guard: comments on PR #${pr} could not be parsed."
    exit 1
  }
  [ -n "$deferrals" ] || continue
  while IFS=$'\t' read -r cid created login; do
    [ -n "$cid" ] || continue
    if ! deferral_epoch=$(date -u -d "$created" +%s 2>/dev/null); then
      echo "::error::deferral-guard: deferral comment ${cid} on PR #${pr} has an unparseable created_at (${created})."
      exit 1
    fi
    age=$((now_epoch - deferral_epoch))
    if [ "$age" -lt "$window_seconds" ] || [ "$age" -gt "$max_age_seconds" ]; then
      continue
    fi
    later_comment_ids=$(printf '%s' "$comments" | jq -r --arg since "$created" '
      .[][] | select(.created_at > $since) |
      select(.body | test("(^|[[:space:]])/(oc|opencode)([[:space:]]|$)"; "i")) | .id
    ') || {
      echo "::error::deferral-guard: could not compare later comments on PR #${pr}."
      exit 1
    }
    later_comment=$(printf '%s\n' "$later_comment_ids" | head -n 1)
    if [ -n "$later_comment" ]; then
      continue
    fi
    later_run_ids=$(printf '%s' "$runs_payload" | jq -r --arg head "$head" --arg since "$created" '
      .[] | .workflow_runs[] | select(.head_sha == $head) | select(.created_at > $since) | .id
    ') || {
      echo "::error::deferral-guard: could not compare later runs for PR #${pr}."
      exit 1
    }
    later_run=$(printf '%s\n' "$later_run_ids" | head -n 1)
    if [ -n "$later_run" ]; then
      continue
    fi
    marker="<!-- deferral-rearm:pr-${pr}-head-${head}-comment-${cid} -->"
    dedupe_hits=$(printf '%s' "$board_payload" | jq -r --arg marker "$marker" \
      '[.[][] | select((.body? // "") | contains($marker))] | length') || {
      echo "::error::deferral-guard: could not read the board ledger."
      exit 1
    }
    if [ "${dedupe_hits:-0}" -gt 0 ] 2>/dev/null; then
      echo "deferral-guard: PR #${pr} deferral ${cid} already re-armed."
      continue
    fi
    note="Deferral re-arm (issue #853): open PR #${pr} at head ${head:0:12} carries a deferral comment (id ${cid}, ${created}) authored by ${login} that promised a later pass. No dispatch or workflow run followed within ${window_hours} hours, so the promise has aged without an owner.

Re-arm the PR on the current head with a fresh head-bound pass.

${marker}

- the Auditor"
    if ! gh issue comment "$board" --repo "$repo" --body "$note" >/dev/null 2>&1; then
      echo "::error::deferral-guard: could not post the re-arm note to board #${board}."
      exit 1
    fi
    posted=$((posted + 1))
    board_payload=$(printf '%s' "$board_payload" | jq --arg body "$note" '. + [[{body: $body}]]') || {
      echo "::error::deferral-guard: could not update the board ledger after posting."
      exit 1
    }
    echo "deferral-guard: posted re-arm note for PR #${pr} (comment ${cid}) to board #${board}."
  done <<< "$deferrals"
done <<< "$pr_rows"

echo "deferral-guard: complete; posted=${posted}."
exit 0
