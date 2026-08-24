#!/usr/bin/env bash
# Approve workflow runs held for owner approval (status: action_required).
#
# Used by every "Approve held CI runs" step in opencode.yml and maintainer.yml
# so the self-healing logic lives in exactly one place (issue #137).
#
# Behavior:
#   Phase 1 (only if APPROVE_PR is set): stable-head polling - approve held runs
#   matching the PR's CURRENT head SHA, up to 30 polls x 5s.
#
#   Phase 2 (always): terminal repo-wide sweep over ALL action_required runs,
#   up to 10 passes x 5s. This is what closes issue #137: a session that pushes
#   commit N+1 before any sweep executes makes runs held for commit N invisible
#   to head-scoped polling forever. Repo-wide sweeping of this repository's own
#   held runs is already standing policy for context-less runs.
#
#   Phase 3 (only if APPROVE_NOTIFY_ISSUE is set AND phase 2 exhausted without
#   clearing every held run): post one best-effort comment asking the owner to
#   approve manually, preserving the documented fallback in AGENTS.md.
#
# Env inputs:
#   GH_TOKEN              required (the runner PAT; approve needs actions:write)
#   APPROVE_PR            optional PR number for the head-scoped phase
#   APPROVE_NOTIFY_ISSUE  optional issue/PR number for the manual-approval ping
#   APPROVE_SERVER        optional server base URL (default https://github.com)
#
# Always exits 0: calling steps are continue-on-error and annotations carry the
# signal (::warning:: on an exhausted final sweep).

set +e

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"
SERVER="${APPROVE_SERVER:-https://github.com}"

approve_one() {
  gh api --method POST "repos/${REPO}/actions/runs/$1/approve" \
    -H "Accept: application/vnd.github+json" >/dev/null 2>&1
}

repo_wide_sweep() {
  local i run held
  for i in $(seq 1 10); do
    held=$(gh run list --repo "${REPO}" --status action_required --limit 100 \
      --json databaseId --jq '.[].databaseId' 2>/dev/null)
    if [ -z "$held" ]; then
      echo "No held runs remain (repo-wide sweep $i)"
      return 0
    fi
    for run in $held; do
      if approve_one "$run"; then
        echo "Approved run $run"
      else
        echo "APPROVE FAILED for run $run (a later sweep or a human click will retry)"
      fi
    done
    sleep 5
  done
  echo "::warning::Held workflow runs could not all be auto-approved after the terminal repo-wide sweep."
  return 1
}

if [ -n "$APPROVE_PR" ]; then
  i=0
  while [ $i -lt 30 ]; do
    i=$((i + 1))
    head_sha=$(gh pr view "$APPROVE_PR" --repo "${REPO}" --json headRefOid --jq '.headRefOid' 2>/dev/null)
    if [ -z "$head_sha" ]; then
      echo "PR #$APPROVE_PR gone (poll $i); moving to repo-wide sweep"
      break
    fi
    echo "Looking for held runs on PR #$APPROVE_PR (head $head_sha)"
    held=$(gh run list --repo "${REPO}" --commit "$head_sha" --status action_required \
      --json databaseId --jq '.[].databaseId' 2>/dev/null)
    if [ -z "$held" ]; then
      echo "No held runs on current head (poll $i)"
      break
    fi
    for run in $held; do
      if approve_one "$run"; then
        echo "Approved run $run"
      else
        echo "APPROVE FAILED for run $run"
      fi
    done
    sleep 5
  done
else
  echo "No PR context - repo-wide sweep of held runs"
fi

# Terminal repo-wide pass (issue #137): catches runs held on INTERMEDIATE head
# SHAs that head-scoped polling can never match again.
if repo_wide_sweep; then
  exit 0
fi

if [ -n "$APPROVE_NOTIFY_ISSUE" ]; then
  gh api "repos/${REPO}/issues/${APPROVE_NOTIFY_ISSUE}/comments" \
    -f body="Workflow runs are awaiting approval and could not be auto-approved. Please approve them in the Actions tab so the review loop can continue: ${SERVER}/${REPO}/actions" >/dev/null 2>&1 || true
fi
exit 0
