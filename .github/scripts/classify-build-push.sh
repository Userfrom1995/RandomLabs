#!/usr/bin/env bash
# Classify a remote branch tip move as the build session's own push or a
# foreign push (issue #690).
#
# Usage: classify-build-push.sh <baseline_head> <remote_tip> <branch>
#
# Prints "own" when the commits added since <baseline_head> include at least
# one commit whose subject starts with "builder:" (the Builder commit contract
# in builder.md), "foreign" otherwise. Exits 2 when the range cannot be
# inspected, so the caller fails closed instead of claiming a push.
#
# On 2026-10-18 the build verify compared only remote tips: the Tester's own
# authorized suite push moved the PR tip mid-run, the build session's
# zero-touch refusal was read as pushed=yes, and the post-push bookkeeping
# (recover tag, trailer strip, held-CI approval) ran against work the build
# never made. Every Builder commit subject starts with "builder:" and every
# Tester suite commit subject starts with "tester:", so the added range
# distinguishes the committing actor without trusting mutable local checkout
# state.

set -euo pipefail

baseline="${1:-}"
tip="${2:-}"
branch="${3:-}"

if [ -z "$tip" ] || [ -z "$branch" ]; then
  echo "usage: classify-build-push.sh <baseline_head> <remote_tip> <branch>" >&2
  exit 2
fi

if ! git fetch --no-tags --quiet origin "+refs/heads/$branch:refs/remotes/build-verify/target" 2>/dev/null; then
  echo "Could not fetch $branch for push attribution." >&2
  exit 2
fi

if ! git cat-file -e "${tip}^{commit}" 2>/dev/null; then
  echo "Remote tip $tip is not fetchable from $branch." >&2
  exit 2
fi

if ! git cat-file -e "${baseline}^{commit}" 2>/dev/null; then
  # No usable baseline: inspect the tip commit itself. A foreign push cannot
  # carry a builder: subject by contract, so the actor is still distinguished.
  baseline=""
fi

if [ -n "$baseline" ]; then
  subjects="$(git log --format=%s "${baseline}..${tip}" 2>/dev/null || true)"
else
  subjects="$(git log -1 --format=%s "$tip" 2>/dev/null || true)"
fi

if printf '%s\n' "$subjects" | grep -qE '^builder:'; then
  printf 'own\n'
else
  printf 'foreign\n'
fi
