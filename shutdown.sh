#!/usr/bin/env bash
# shutdown.sh — undo the lab: back up and remove the agent workflows and
# prompts, stop the Maintainer, hand control back to humans. Safety net.
#
#   bash shutdown.sh           # interactive: confirm before anything is removed
#   bash shutdown.sh --yes     # skip the confirmation prompt
#   bash shutdown.sh --purge   # also delete OPENCODE_* secrets and lab docs
#   bash shutdown.sh --check   # read-only: show what would be removed
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

YES=0
PURGE=0
MODE="run"
for arg in "$@"; do
  case "$arg" in
    --yes) YES=1 ;;
    --purge) PURGE=1 ;;
    --check) MODE=check ;;
  esac
done

TS="$(date -u +%Y%m%d-%H%M%S)"
BACKUP=".github/lab-backup-$TS"
REPO="$(git remote get-url origin 2>/dev/null | sed -E 's#.*[:/]([^/]+/[^/]+)(\.git)?$#\1#')"

WORKFLOWS=(
  "maintainer.yml"
  "ideate.yml"
  "auditor.yml"
  "opencode.yml"
  "opencode-review.yml"
  "opencode-review-trigger.yml"
)
REMOVE_PATHS=(
  ".github/agents"
  "progress"
  "LAB.md"
)

echo "== Random Lab shutdown =="
echo
echo "Backup dir:   $BACKUP"
if [ -n "$REPO" ]; then echo "Target repo:  $REPO"; fi
echo "Workflows to remove: ${WORKFLOWS[*]}"
echo "Paths to remove:     ${REMOVE_PATHS[*]}"
[ "$PURGE" -eq 1 ] && echo "Purge mode:   also deleting OPENCODE_API_KEY / OPENCODE_PAT secrets"
echo

if [ "$MODE" = "check" ]; then
  echo "(check mode — nothing changed)"
  exit 0
fi

if [ "$YES" -ne 1 ]; then
  read -r -p "Continue? This removes the lab from this repo (files are backed up). [y/N] " ans
  case "$ans" in
    y|Y|yes|YES) ;;
    *) echo "Aborted — nothing changed."; exit 0 ;;
  esac
fi

mkdir -p "$BACKUP/workflows" "$BACKUP/agents"
for wf in "${WORKFLOWS[@]}"; do
  if [ -f ".github/workflows/$wf" ]; then
    cp ".github/workflows/$wf" "$BACKUP/workflows/"
    git rm -q --cached ".github/workflows/$wf" 2>/dev/null || rm -f ".github/workflows/$wf"
    rm -f ".github/workflows/$wf"
    echo "removed workflow: $wf (backed up)"
  fi
done

for p in "${REMOVE_PATHS[@]}"; do
  if [ -e "$p" ]; then
    git rm -q -r --cached "$p" 2>/dev/null || true
    cp -r "$p" "$BACKUP/agents/" 2>/dev/null || true
    rm -rf "$p"
    # agents/ lives under .github/agents — back it up separately but keep removal clean
    rm -rf ".github/agents" 2>/dev/null || true
    echo "removed: $p (backed up)"
  fi
done

if [ "$PURGE" -eq 1 ] && [ -n "$REPO" ] && command -v gh >/dev/null 2>&1; then
  for secret in OPENCODE_API_KEY OPENCODE_PAT; do
    gh secret delete "$secret" --repo "$REPO" 2>/dev/null && echo "deleted secret: $secret" || true
  done
fi

echo
echo "== Remaining agent-ish files (left for history: docs/, ideas/, README) =="
ls .github/workflows 2>/dev/null && echo "(pages.yml kept — the site deploy needs it)"
echo
echo "Lab stopped. Human control restored."
echo "Restore anytime: the backup is at $BACKUP (or run the lab's setup again from git history)."