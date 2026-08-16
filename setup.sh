#!/usr/bin/env bash
# setup.sh — one-command setup/validation for the Random factory.
# Idempotent and safe: it never deletes anything. Run from the repo root.
#
#   bash setup.sh              # check/print status, guided prompts
#   bash setup.sh --secrets    # also write the required repo secrets (asks for values)
#   bash setup.sh --dispatch   # also dispatch the Maintainer once (first run)
#   bash setup.sh --check      # read-only status report, exit 0/1
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

MODE="${1:-interactive}"
DO_SECRETS=0
DO_DISPATCH=0
for arg in "$@"; do
  case "$arg" in
    --secrets) DO_SECRETS=1 ;;
    --dispatch) DO_DISPATCH=1 ;;
    --check) MODE=check ;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING: $1 — install it first."; return 1; }; }
status() { printf '%-34s %s\n' "$1" "$2"; }

echo "== Random Factory setup =="
echo

ok=1

# 1. Tools
for tool in git gh; do
  if need "$tool"; then status "$tool" "ok"; else ok=0; fi
done

# 2. Repo files (the factory body)
FACTORY_FILES=(
  "FACTORY.md"
  "AGENTS.md"
  "BOARD.md"
  "progress"
  "CHANGELOG.md"
  ".github/agents/REGISTRY.md"
  ".github/agents/maintainer.md"
  ".github/agents/ideator.md"
  ".github/agents/architect.md"
  ".github/agents/researcher.md"
  ".github/agents/builder.md"
  ".github/agents/fixer.md"
  ".github/agents/reviewer.md"
  ".github/agents/tester.md"
  ".github/agents/general.md"
  ".github/agents/decisions/README.md"
)
for f in "${FACTORY_FILES[@]}"; do
  if [ -e "$f" ]; then
    status "$f" "ok"
  else
    status "$f" "MISSING (factory incomplete)"
    ok=0
  fi
done

# 3. Workflows
FACTORY_WORKFLOWS=(
  ".github/workflows/maintainer.yml"
  ".github/workflows/ideate.yml"
  ".github/workflows/opencode.yml"
  ".github/workflows/opencode-review.yml"
  ".github/workflows/opencode-review-trigger.yml"
  ".github/workflows/pages.yml"
)
for f in "${FACTORY_WORKFLOWS[@]}"; do
  if [ -e "$f" ]; then
    status "$f" "ok"
  else
    status "$f" "MISSING (workflow missing)"
    ok=0
  fi
done

echo
if [ "$ok" -eq 0 ]; then
  echo "Factory files/workflows are incomplete — fix the MISSING items before continuing."
  [ "$MODE" = "check" ] && exit 1
fi

# 4. Secrets
REPO="${GITHUB_REPOSITORY:-$(git remote get-url origin 2>/dev/null | sed -E 's#.*[:/]([^/]+/[^/]+)(\.git)?$#\1#')}"
if [ -z "$REPO" ] || [ "$REPO" = "." ]; then
  echo "warning: could not determine the GitHub repo (git remote). Target repo unknown."
  REPO=""
fi

if [ -n "$REPO" ]; then
  echo "Target repo: $REPO"
  if command -v gh >/dev/null 2>&1; then
    echo "-- secrets currently set (names only) --"
    gh secret list --repo "$REPO" 2>/dev/null | awk 'NR==1 || $1 ~ /OPENCODE|BOT/' || true
    echo
  fi
fi

if [ "$DO_SECRETS" -eq 1 ] && [ -n "$REPO" ]; then
  echo "== Writing required secrets =="
  set_gh_secret() {
    local name="$1" desc="$2" value
    if [ -n "${!name:-}" ]; then
      value="${!name}"
    else
      read -r -s -p "$desc: " value
      echo
      [ -z "$value" ] && { echo "skipped (empty)"; return; }
    fi
    printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
    echo "$name set."
  }
  set_gh_secret OPENCODE_API_KEY "opencode API key (OPENCODE_API_KEY)"
  set_gh_secret OPENCODE_PAT "GitHub PAT for /oc triggers (OPENCODE_PAT)"
else
  echo "Skipping secrets (pass --secrets to set OPENCODE_API_KEY and OPENCODE_PAT)."
fi

# 5. Branch protection guidance (needs admin; print, don't apply)
echo
echo "== Branch protection on main (requires admin — apply manually or via API) =="
echo "  • Require a pull request before merging"
echo "  • Require approvals: the Reviewer's /oc approve is the gate (bot merges approved PRs only)"
echo "  • Do NOT require status checks on bot runs you want to stay auto (held runs are auto-approved)"
echo

# 6. First run
if [ "$DO_DISPATCH" -eq 1 ] && [ -n "$REPO" ] && command -v gh >/dev/null 2>&1; then
  echo "== Dispatching the Maintainer (first run — approval-exempt) =="
  gh workflow run maintainer.yml --repo "$REPO"
  echo "Dispatched. Watch it at https://github.com/$REPO/actions"
fi

echo
echo "== Onboarding =="
echo "• For the first ~14 days, GitHub may hold workflow runs on the bot's PRs."
echo "  opencode.yml auto-approves held runs after every push; if it cannot, a"
echo "  comment asks you to click Approve — do that once and the loop resumes."
echo "• Talk to the factory with /oc comments: /oc build …, /oc continue, /oc fix,"
echo "  /oc review, /oc approve|decline, /oc help (see AGENTS.md)."
echo "• Undo anytime: bash shutdown.sh"
echo
echo "Setup/validation done."