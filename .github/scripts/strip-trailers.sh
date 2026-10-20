#!/usr/bin/env bash
# Remove leaked owner attribution trailers from an agent PR branch.
# Called by every agent workflow after the agent pushed.
#
# Two event shapes (issue #689):
#   * A comment on a PR (issue_comment on a PR, pull_request_review_comment):
#     the triggering PR's head is the only branch this step may touch. It is
#     resolved directly. A Refs-only PR is named for its parent issue, not for
#     its own number (PR #685 carried opencode/issue582-... for issue #582),
#     so re-applying the issue-number naming guard here reds every session on
#     that thread. A PR whose head is not on this repository (a fork, or a
#     deleted head repository) is a loud no-op: fetching its branch name would
#     resolve a same-named branch here, which is not the triggering work.
#   * A comment on an issue: resolve the same-repository open PR whose head is
#     this issue's build namespace opencode/issue<issue#>-* and keep the strict
#     unexpected-branch refusal.
#
# On the PR-comment path a branch outside the opencode/ lab namespace is only
# refused when it actually carries an owner trailer. With nothing to strip the
# step exits 0 loudly, so a general request on a human PR cannot red. A fork or
# deleted-head PR is likewise a loud no-op: nothing on this repository can be
# attributed to it.
#
# Usage: strip-trailers.sh (reads GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GH_TOKEN)
# Exit:  0 = nothing to sanitize, a non-same-repository PR, or trailers stripped
#        1 = the target branch cannot be proven to belong to this work, or its
#            trailer state cannot be read

set -euo pipefail

event_path="${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH is required}"
repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

if ! jq -e . "$event_path" >/dev/null 2>&1; then
  echo "Could not parse the workflow event payload; refusing to rewrite history."
  exit 1
fi

thread="$(jq -r '.issue.number // .pull_request.number // empty' "$event_path")"
case "$thread" in
  ''|*[!0-9]*)
    echo "No issue/PR number in the workflow event; refusing to rewrite history."
    exit 1
    ;;
esac

is_pr="$(jq -r 'if .issue.pull_request then "yes" elif .pull_request then "yes" else "" end' "$event_path")"

if [ "$is_pr" = "yes" ]; then
  pr_number="$thread"
else
  pr_list="$(gh pr list --repo "$repo" --state open --limit 100 \
    --json number,headRefName,createdAt,isCrossRepository,headRepository)" || {
    echo "Could not list open PRs for issue #$thread; refusing to rewrite history."
    exit 1
  }
  pr_number="$(printf '%s' "$pr_list" | jq -r --arg repo "$repo" --arg prefix "opencode/issue${thread}-" '
    [.[] | select(.isCrossRepository == false
                  and .headRepository.nameWithOwner == $repo
                  and (.headRefName | startswith($prefix)))]
    | sort_by(.createdAt) | last | .number // empty')" || {
    echo "Could not parse open PRs for issue #$thread; refusing to rewrite history."
    exit 1
  }
  if [ -z "$pr_number" ]; then
    echo "No open PR is associated with issue #$thread; nothing to sanitize."
    exit 0
  fi
fi

pr_json="$(gh pr view "$pr_number" --repo "$repo" --json headRefName,isCrossRepository,headRepository)" || {
  echo "Could not resolve PR #$pr_number; refusing to rewrite history."
  exit 1
}
branch="$(printf '%s' "$pr_json" | jq -r '.headRefName // empty')"
cross_repo="$(printf '%s' "$pr_json" | jq -r '.isCrossRepository | tostring')"
head_repo="$(printf '%s' "$pr_json" | jq -r '.headRepository.nameWithOwner // empty')"

if [ -z "$branch" ]; then
  echo "PR #$pr_number has no resolvable head branch; refusing to rewrite history."
  exit 1
fi

# A fork PR's branch name resolves to a same-named branch on THIS repository
# when fetched, which is not the triggering work, so cross-repository PRs are
# never rewritten. The head repository identity is checked too because a
# deleted head repository can report isCrossRepository as false. Nothing on
# this repository can be attributed to such a PR, so this is a loud no-op and
# never a red on a fork or deleted-head thread.
if [ "$cross_repo" != "false" ] || [ "$head_repo" != "$repo" ]; then
  echo "No same-repository head on PR #$pr_number (head=${head_repo:-unknown}, crossRepository=${cross_repo:-unknown}); nothing to sanitize."
  exit 0
fi

# The issue lookup is the only path that selects a PR from a pattern, so it
# keeps the strict namespace refusal even when there is nothing to strip.
if [ "$is_pr" != "yes" ]; then
  case "$branch" in
    opencode/issue"$thread"-*) ;;
    *)
      echo "Refusing to rewrite unexpected branch '$branch'."
      exit 1
      ;;
  esac
fi

git fetch origin "refs/heads/$branch:refs/remotes/origin/prbranch" --quiet || {
  echo "Could not fetch branch '$branch'; refusing to rewrite history."
  exit 1
}

if ! range_log="$(git log --format=%B refs/remotes/origin/main..refs/remotes/origin/prbranch 2>&1)"; then
  echo "Could not read commits for branch '$branch'; refusing to rewrite history."
  exit 1
fi
bad="$(printf '%s\n' "$range_log" | grep -c '^Co-authored-by: Userfrom1995' || true)"

if [ "$bad" -eq 0 ]; then
  echo "No leaked owner trailers on $branch."
  exit 0
fi

# On the PR-comment path the head belongs to the triggering PR by
# construction, but a branch outside the lab namespace is still never
# rewritten. Reaching here means there is a trailer to remove, so refuse.
if [ "$is_pr" = "yes" ]; then
  case "$branch" in
    opencode/*) ;;
    *)
      echo "Refusing to rewrite branch '$branch' on PR #$pr_number: not an opencode/ lab branch."
      exit 1
      ;;
  esac
fi

echo "Stripping $bad leaked owner trailer(s) from $branch."
git checkout --detach refs/remotes/origin/prbranch --quiet
git filter-branch -f --msg-filter 'sed "/^Co-authored-by: Userfrom1995.*/d"' refs/remotes/origin/main..HEAD >/dev/null
git push --force origin "HEAD:refs/heads/$branch" --quiet
echo "Trailers stripped and branch updated: $branch"
