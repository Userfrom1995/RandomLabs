#!/usr/bin/env bash
# shutdown.sh - undo the lab: back up and remove the agent workflows and
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

# Resolve the target repository from GITHUB_REPOSITORY or a recognized
# github.com origin URL only. Local paths, file:// remotes, and non-GitHub
# hosts are rejected so --purge can never silently delete secrets on an
# unrelated repository (issue #799 evaluator finding F1).
valid_repo_slug() {
  local slug="$1" owner
  [[ "$slug" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]] || return 1
  # GitHub owners cannot start with a dot, so dot-leading owners such as
  # `.git` and `...` are path-like text, not repositories.
  owner="${slug%%/*}"
  case "$owner" in
    .*) return 1 ;;
  esac
  case "$slug" in
    */.|*/..) return 1 ;;
  esac
  return 0
}

resolve_github_repo() {
  local url="$1" scheme rest authority path owner repo
  url="${url%/}"
  case "$url" in
    git@github.com:*)
      path="${url#git@github.com:}"
      ;;
    *://*)
      scheme="${url%%://*}"
      rest="${url#*://}"
      authority="${rest%%/*}"
      path="${rest#*/}"
      # Validate the whole unstripped authority in one anchored match. A
      # query or fragment must never smuggle an `@github.com` suffix past the
      # host check: `https://evil.invalid?x@github.com/owner/repo` is not
      # github.com, and stripping to the last `@` would accept it (review
      # round-4 finding F1).
      case "$scheme" in
        https|http)
          # Credentialed HTTP(S) userinfo is not percent-decoded by curl, so
          # the host stays github.com and the existing form is safe.
          if ! [[ "$authority" =~ ^([^@/?#[:space:]]+@)?github\.com(:[0-9]{1,5})?$ ]]; then
            return 1
          fi
          ;;
        ssh)
          # Git percent-decodes the SSH authority before it splits user and
          # host, so `ssh://evil.com%2f@github.com/owner/repo` reaches the
          # host `evil.com` while the raw text still ends in `@github.com`.
          # Only a plain safe username is accepted here (review round-7
          # finding F1).
          if ! [[ "$authority" =~ ^([A-Za-z0-9._-]+@)?github\.com(:[0-9]{1,5})?$ ]]; then
            return 1
          fi
          ;;
        git)
          # git:// has no userinfo: git treats `user@github.com` as the whole
          # hostname, so `git://evil.invalid@github.com/owner/repo` is not a
          # github.com origin (review round-5 finding F1).
          if ! [[ "$authority" =~ ^github\.com(:[0-9]{1,5})?$ ]]; then
            return 1
          fi
          ;;
        *) return 1 ;;
      esac
      ;;
    *)
      return 1
      ;;
  esac
  case "$path" in
    */*) ;;
    *) return 1 ;;
  esac
  # The single trailing slash was already stripped from `url` above. Do not
  # strip a second one here: `github.com/a//` would otherwise collapse to the
  # plausible but wrong slug `a/a` (review finding F1, 2026-11-03).
  owner="${path%/*}"
  repo="${path##*/}"
  repo="${repo%.git}"
  valid_repo_slug "$owner/$repo" || return 1
  printf '%s/%s\n' "$owner" "$repo"
}

warn_unresolved_repo() {
  local why="$1"
  if [ "$PURGE" -eq 1 ]; then
    echo "warning: $why; purge will not delete secrets."
  else
    echo "warning: $why."
  fi
}

REPO="${GITHUB_REPOSITORY:-}"
if [ -n "$REPO" ] && ! valid_repo_slug "$REPO"; then
  echo "warning: GITHUB_REPOSITORY is not a valid owner/repo slug; ignoring it and trying the origin remote."
  REPO=""
fi
origin_url="$(git remote get-url origin 2>/dev/null || true)"
if [ -z "$REPO" ] && [ -n "$origin_url" ]; then
  REPO="$(resolve_github_repo "$origin_url" || true)"
  if [ -z "$REPO" ]; then
    warn_unresolved_repo "could not determine the GitHub repo from the origin remote (only github.com HTTPS/HTTP, SSH, and git URLs are recognized; set GITHUB_REPOSITORY for other hosts)"
  fi
elif [ -z "$REPO" ]; then
  warn_unresolved_repo "could not determine the GitHub repo (no GITHUB_REPOSITORY and no origin remote)"
fi

WORKFLOWS=(
  "maintainer.yml"
  "ideate.yml"
  "auditor.yml"
  "opencode.yml"
  "opencode-review.yml"
  "opencode-pr-trigger.yml"
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
[ "$PURGE" -eq 1 ] && [ -n "$REPO" ] && echo "Purge mode:   also deleting OPENCODE_API_KEY / OPENCODE_PAT secrets"
echo

if [ "$MODE" = "check" ]; then
  echo "(check mode - nothing changed)"
  exit 0
fi

if [ "$YES" -ne 1 ]; then
  read -r -p "Continue? This removes the lab from this repo (files are backed up). [y/N] " ans
  case "$ans" in
    y|Y|yes|YES) ;;
    *) echo "Aborted - nothing changed."; exit 0 ;;
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
    # agents/ lives under .github/agents - back it up separately but keep removal clean
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
ls .github/workflows 2>/dev/null && echo "(pages.yml kept - the site deploy needs it)"
echo
echo "Lab stopped. Human control restored."
echo "Restore anytime: the backup is at $BACKUP (or run the lab's setup again from git history)."