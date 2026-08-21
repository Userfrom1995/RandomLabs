#!/usr/bin/env bash
#
# recover.sh - automatic PR recovery engine for the Random lab.
#
# Recovers build PRs that were closed (not merged) while their branch kept
# advancing, including orphans that share no history with main. This is the
# machine core behind the `/oc recover` command and the auto-detect job.
#
# Usage:
#   bash recover.sh <PR_NUMBER>          # recover a specific (closed) build PR
#   bash recover.sh --detect             # scan all closed build PRs and recover in-flight ones
#
# The script never touches `main`: it only re-links a build branch onto main
# (via cherry-pick) and opens/updates a PR against main. Restoring main as a
# divergent/orphan root is strictly forbidden.
#
# Exit codes:
#   0  recovered / nothing to do
#   2  PR not found
#   3  branch and recover tag both missing (work truly lost)
#   4  re-link failed
#
# Safety: never use em dashes in comments (lab rule). Use hyphens.

set -uo pipefail

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"
export GH_TOKEN="${GH_TOKEN:-${INPUT_GH_TOKEN:-}}"

log() { echo "[recover] $*"; }
die() { echo "[recover][error] $*" >&2; exit "${1:-1}"; }

# ---------------------------------------------------------------------------
# Resolve the "current" tip of a build branch, restoring from the recover/<pr>
# tag if GitHub has already garbage-collected the PR's recorded head / branch.
# ---------------------------------------------------------------------------
resolve_tip() {
  local branch="$1" pr="$2"
  if git ls-remote --exit-code origin "refs/heads/$branch" >/dev/null 2>/dev/null; then
    git ls-remote origin "refs/heads/$branch" | awk '{print $1}'
    return 0
  fi
  log "branch $branch missing; attempting restore from tag recover/$pr"
  if git ls-remote --exit-code origin "refs/tags/recover/$pr" >/dev/null 2>/dev/null; then
    local sha
    sha=$(git ls-remote origin "refs/tags/recover/$pr" | awk '{print $1}')
    git fetch origin "$sha" --quiet 2>/dev/null || true
    git branch -f "$branch" "$sha" 2>/dev/null || true
    git push origin "HEAD:refs/heads/$branch" --quiet 2>/dev/null || true
    echo "$sha"
    return 0
  fi
  return 1
}

# ---------------------------------------------------------------------------
# Open (or reuse) a continuation PR for a build branch and comment on the
# original PR. Honors the one-PR rule: reuses an existing open PR if present.
# ---------------------------------------------------------------------------
open_continuation() {
  local pr="$1" branch="$2" title="$3"
  local existing
  existing=$(gh pr list --repo "$REPO" --state open --head "$branch" \
    --json number --jq '.[0].number' 2>/dev/null || echo "")
  local new_pr="$existing"
  if [ -z "$new_pr" ]; then
    new_pr=$(gh pr create --repo "$REPO" --base main --head "$branch" \
      --title "Recover: $title (PR #$pr)" \
      --body "Refs #$pr" 2>/dev/null || echo "")
  fi
  if [ -n "$new_pr" ]; then
    gh pr comment "$pr" --repo "$REPO" \
      --body "Recovery continuation: #$new_pr (branch \`$branch\` continues toward \`main\`)." 2>/dev/null || true
    echo "$new_pr"
  else
    echo ""
  fi
}

# ---------------------------------------------------------------------------
# Re-link an orphan branch onto main by cherry-picking only this project's own
# (bot-authored) commits, then force-pushing the branch. Never pushes to main.
# ---------------------------------------------------------------------------
relink_orphan() {
  local pr="$1" branch="$2" title="$3"
  git fetch origin "refs/heads/$branch" --quiet 2>/dev/null || true
  # Commits on the branch that are not in main, authored by the bot, in order.
  local commits
  commits=$(git log "origin/main..refs/heads/$branch" --author="github-actions\[bot\]" \
    --format='%H' --reverse 2>/dev/null)
  if [ -z "$commits" ]; then
    # Fallback: any commit not in main (author filter can miss some builds).
    commits=$(git log "origin/main..refs/heads/$branch" --format='%H' --reverse 2>/dev/null)
  fi
  if [ -z "$commits" ]; then
    log "orphan $branch has no cherry-pickable commits; nothing to re-link"
    return 4
  fi
  git checkout -B "$branch" "origin/main" 2>/dev/null || return 4
  local ok=1
  while read -r c; do
    [ -z "$c" ] && continue
    if git cherry-pick "$c" >/dev/null 2>&1; then
      :
    elif git diff --cached --quiet && git diff --quiet; then
      git cherry-pick --skip >/dev/null 2>&1 || { git cherry-pick --abort >/dev/null 2>&1; ok=0; break; }
    else
      git cherry-pick --abort >/dev/null 2>&1; ok=0; break
    fi
  done <<< "$commits"
  if [ "$ok" != "1" ]; then
    log "orphan re-link of $branch failed"
    return 4
  fi
  git push --force-with-lease origin "HEAD:refs/heads/$branch" --quiet 2>/dev/null \
    || git push --force origin "HEAD:refs/heads/$branch" --quiet 2>/dev/null \
    || return 4
  local new_pr
  new_pr=$(open_continuation "$pr" "$branch" "$title")
  if [ -n "$new_pr" ]; then
    gh pr comment "$pr" --repo "$REPO" \
      --body "Recovery (orphan re-link): branch \`$branch\` was re-based onto \`main\` (only this project's own commits) and continuation opened at #$new_pr." 2>/dev/null || true
    echo "$new_pr"
    return 0
  fi
  return 4
}

# ---------------------------------------------------------------------------
# Recover a single PR.
# ---------------------------------------------------------------------------
recover_pr() {
  local pr="$1"
  local pr_json
  pr_json=$(gh pr view "$pr" --repo "$REPO" \
    --json number,state,title,body,headRefName,headRefOid,merged 2>/dev/null)
  [ -z "$pr_json" ] && { log "PR #$pr not found"; return 2; }

  local state title branch recorded_head merged
  state=$(echo "$pr_json" | jq -r '.state')
  title=$(echo "$pr_json" | jq -r '.title')
  branch=$(echo "$pr_json" | jq -r '.headRefName')
  recorded_head=$(echo "$pr_json" | jq -r '.headRefOid')
  merged=$(echo "$pr_json" | jq -r '.merged')

  log "PR #$pr state=$state merged=$merged branch=$branch recorded_head=$recorded_head"

  if [ "$merged" = "true" ]; then
    log "PR #$pr was merged; nothing to recover."
    return 0
  fi
  if [ "$state" = "OPEN" ]; then
    log "PR #$pr is already open; nothing to recover."
    return 0
  fi

  git fetch origin main --quiet 2>/dev/null || true
  local tip
  tip=$(resolve_tip "$branch" "$pr") || {
    log "branch $branch and recover/$pr tag both missing; work is lost"
    return 3
  }
  log "resolved current tip of $branch = $tip"

  git fetch origin "+refs/heads/$branch:refs/buildbranch" --quiet 2>/dev/null || true
  local base
  base=$(git merge-base origin/main refs/buildbranch 2>/dev/null || echo "")

  if [ -n "$base" ]; then
    log "non-orphan path: $branch shares history with main (merge-base $base)"
    # If the recorded head still exists on the branch, reopen; otherwise open a
    # fresh continuation PR.
    if [ -n "$recorded_head" ] && git merge-base --is-ancestor "$recorded_head" refs/buildbranch 2>/dev/null; then
      if gh pr reopen "$pr" --repo "$REPO" 2>/dev/null; then
        log "reopened PR #$pr"
        gh pr comment "$pr" --repo "$REPO" \
          --body "Recovered by /oc recover: reopened (head advanced past the recorded head)." 2>/dev/null || true
        return 0
      fi
    fi
    local new_pr
    new_pr=$(open_continuation "$pr" "$branch" "$title")
    if [ -n "$new_pr" ]; then
      log "opened continuation PR #$new_pr for #$pr"
      # Resume the quality gate on the recovered PR.
      gh issue comment "$new_pr" --repo "$REPO" --body "/oc review" 2>/dev/null || true
      return 0
    fi
    return 4
  else
    log "orphan path: $branch has no common ancestor with main; re-linking"
    relink_orphan "$pr" "$branch" "$title"
    return $?
  fi
}

# ---------------------------------------------------------------------------
# Auto-detect closed (non-merged) build PRs whose branch advanced past the
# recorded head, and recover them. Skips PRs that already have an open
# continuation, avoiding loops.
# ---------------------------------------------------------------------------
detect() {
  log "auto-detect scan: looking for closed build PRs with in-flight work"
  local closed
  closed=$(gh pr list --repo "$REPO" --state closed \
    --json number,headRefName,headRefOid,merged,state 2>/dev/null \
    | jq -r '.[] | select(.merged==false) | select(.headRefName | startswith("opencode/issue") or startswith("opencode/lab")) | "\(.number)\t\(.headRefName)\t\(.headRefOid)"')
  [ -z "$closed" ] && { log "no candidates found"; return 0; }
  while IFS=$'\t' read -r num bname rhead; do
    [ -z "$num" ] && continue
    if ! git ls-remote --exit-code origin "refs/heads/$bname" >/dev/null 2>/dev/null; then
      # No live branch, but a recover/<num> tag may still let us restore later.
      continue
    fi
    local tip
    tip=$(git ls-remote origin "refs/heads/$bname" | awk '{print $1}')
    [ "$tip" = "$rhead" ] && continue
    # Skip if an open continuation PR for this branch already exists.
    local exist
    exist=$(gh pr list --repo "$REPO" --state open --head "$bname" \
      --json number --jq '.[0].number' 2>/dev/null || echo "")
    [ -n "$exist" ] && continue
    log "auto-detect: PR #$num closed with advanced branch $bname (tip $tip vs recorded $rhead) - recovering"
    recover_pr "$num" || true
  done <<< "$closed"
  return 0
}

main() {
  if [ "${1:-}" = "--detect" ]; then
    detect
    exit $?
  fi
  local pr="${1:-}"
  [ -z "$pr" ] && die 2 "usage: recover.sh <PR_NUMBER> | --detect"
  recover_pr "$pr"
  exit $?
}

main "$@"
