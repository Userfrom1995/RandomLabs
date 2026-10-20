#!/usr/bin/env bash
# Resolve the target thread for a lab phase handoff (issue #690).
#
# Usage: resolve-thread-target.sh <thread|parent>
#
#   thread  the issue/PR number the workflow event fired on.
#   parent  the logical parent issue when the event fired on a phase PR whose
#           head branch is opencode/issue<N>-*, otherwise the trigger thread.
#
# Phase PRs carry their parent issue in the head branch name
# (opencode/issue<N>-<timestamp>). A phase forward or auto-retry must never
# resolve the newest open phase PR: on 2026-10-18 the design retry and the
# design-completion /oc build were both posted onto #685 (an in-test phase PR
# of issue #582), resetting the per-thread retry counter and binding a fresh
# build session to the approved head. Callers bind retries to the trigger
# thread and forwards to the logical parent issue.
#
# Exits 1 loudly when the event carries no thread number or a phase PR head
# cannot be resolved, so a caller never posts a mis-targeted trigger.

set -euo pipefail

mode="${1:-}"
case "$mode" in
  thread|parent) ;;
  *)
    echo "usage: resolve-thread-target.sh <thread|parent>" >&2
    exit 2
    ;;
esac

event_path="${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH is required}"

thread="$(jq -r '.issue.number // .pull_request.number // empty' "$event_path" 2>/dev/null || true)"
case "$thread" in
  ''|*[!0-9]*)
    echo "No issue/PR number in the workflow event; refusing to resolve a target." >&2
    exit 1
    ;;
esac

if [ "$mode" = "thread" ]; then
  printf '%s\n' "$thread"
  exit 0
fi

is_pr="$(jq -r 'if .issue.pull_request then "yes" elif .pull_request then "yes" else "" end' "$event_path" 2>/dev/null || true)"
if [ "$is_pr" != "yes" ]; then
  printf '%s\n' "$thread"
  exit 0
fi

head_ref="$(gh pr view "$thread" --repo "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}" --json headRefName --jq '.headRefName' 2>/dev/null || true)"
if [ -z "$head_ref" ]; then
  echo "Could not resolve the head branch of PR #$thread; refusing to guess a forward target." >&2
  exit 1
fi

case "$head_ref" in
  opencode/issue*-*)
    parent="${head_ref#opencode/issue}"
    parent="${parent%%-*}"
    ;;
  *)
    parent=""
    ;;
esac

case "$parent" in
  ''|*[!0-9]*)
    printf '%s\n' "$thread"
    ;;
  *)
    printf '%s\n' "$parent"
    ;;
esac
