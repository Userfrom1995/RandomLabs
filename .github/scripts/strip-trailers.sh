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
# attributed to it. A head branch that no longer exists on origin (a closed or
# merged PR) is a loud no-op too, while a failed remote query still fails
# closed.
#
# Issue #798 hardening (the per-OS lane passes a baseline and REMOTE_URL):
#   * Only commits after the captured pre-agent baseline are inspected and
#     rewritten, so stripping can never change the baseline commit a later
#     scope guard needs as its ancestor. A trailer that predates the baseline
#     is pre-existing history and is left alone. The anchored lane refuses to
#     run without a captured baseline (a failed baseline step must never fall
#     back to origin/main and rewrite pre-baseline history), and it requires
#     the baseline to be an ancestor of the fetched branch tip, so a
#     force-pushed-backward branch cannot make the strip rewrite a range the
#     scope guard will refuse (issue #798 review N1/N6).
#   * The remote operations run from a fresh scratch repository created by this
#     script, never through the post-agent workspace `origin` config: the agent
#     can rewrite `.git/config` (including url.*.insteadOf) after the fact, and
#     a pinned REMOTE_URL alone does not stop a local URL rewrite. The scratch
#     repository is configured only by the pinned step env (GIT_CONFIG_*), so
#     the fetch and push always reach the trusted repository. The push is
#     guarded by `--force-with-lease` against the fetched tip.
#   * The per-OS lane passes the PR number, head branch, and head repository
#     identity captured by the pre-agent `Resolve the per-OS PR trust anchor`
#     step (PEROS_ANCHOR=1), so an agent that rewrites the event payload or
#     re-resolves a different PR can never redirect the rewrite.
#
# Usage: strip-trailers.sh [baseline-sha]
# Env:   GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GH_TOKEN
#        REMOTE_URL (optional: use a scratch repository and this URL)
#        PEROS_ANCHOR=1 with PR_NUMBER, HEAD_REF, PR_CROSS_REPO, PR_HEAD_REPO
#        (the pre-agent trust anchor; otherwise GITHUB_EVENT_PATH is read).
# Exit:  0 = nothing to sanitize, a non-same-repository PR, an absent head
#            branch, or trailers stripped
#        1 = the target branch cannot be proven to belong to this work, or its
#            metadata/trailer state cannot be read, or the rewrite cannot be
#            pushed

set -euo pipefail

# Drop Git plumbing seams an agent could have exported through $GITHUB_ENV.
# The workflow also pins the GIT_CONFIG_* files; this removes the remaining
# environment redirections before any git command runs. GIT_EXEC_PATH is
# included because git resolves subcommands (git-filter-branch) and remote
# helpers through it: an agent-exported path could turn the strip into a
# no-op while the leaked owner trailer ships, or execute agent code inside
# this step (issue #798 review N2).
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY \
  GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR GIT_NAMESPACE \
  GIT_CONFIG GIT_CONFIG_PARAMETERS GIT_EXEC_PATH 2>/dev/null || true
# Issue #798 Quality Council env-seam finding: an agent can export proxy/TLS
# redirections through $GITHUB_ENV, and the post-agent step env is not the only
# path those values can reach this helper. Remove them before the first git
# command so the trusted fetch and push can never be routed through a decoy
# proxy or trust a decoy CA. The workflow pins the same names empty as defense
# in depth; this unset makes the helper itself safe.
unset HTTPS_PROXY https_proxy HTTP_PROXY http_proxy ALL_PROXY all_proxy \
  NO_PROXY no_proxy GIT_SSL_NO_VERIFY GIT_SSL_CAINFO GIT_SSL_CAPATH \
  SSL_CERT_FILE SSL_CERT_DIR CURL_CA_BUNDLE GIT_PROXY_COMMAND 2>/dev/null || true

baseline_arg="${1:-}"
repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
if [ "${PEROS_ANCHOR:-}" = "1" ]; then
  # Issue #798 review N11: the anchored lane must never fall back to the
  # post-agent workspace remote, whose URL config the agent can rewrite.
  remote_url="${REMOTE_URL:?REMOTE_URL is required in the anchored per-OS lane (issue #798 review N11)}"
else
  remote_url="${REMOTE_URL:-}"
fi
export GIT_TERMINAL_PROMPT=0

fail() {
  echo "$*"
  exit 1
}

if [ "${PEROS_ANCHOR:-}" = "1" ] && [ -z "$baseline_arg" ]; then
  fail "No captured pre-agent baseline was supplied to the anchored per-OS lane; refusing to rewrite history (issue #798 review N1)."
fi
if [ -n "$baseline_arg" ]; then
  case "$baseline_arg" in
    *[!0-9a-f]*)
      fail "Baseline '$baseline_arg' is not a commit id; refusing to rewrite history (issue #798)."
      ;;
  esac
  if [ "${#baseline_arg}" -lt 7 ]; then
    fail "Baseline '$baseline_arg' is too short to be a commit id; refusing to rewrite history (issue #798)."
  fi
fi

pr_number=""
branch=""
cross_repo=""
head_repo=""
is_pr=""

if [ "${PEROS_ANCHOR:-}" = "1" ]; then
  # Issue #798 review F7: the event payload and the workspace remote are
  # agent-writable after the agent ran, so the per-OS lane binds the PR
  # identity captured before the agent started.
  pr_number="${PR_NUMBER:-}"
  branch="${HEAD_REF:-}"
  cross_repo="${PR_CROSS_REPO:-}"
  head_repo="${PR_HEAD_REPO:-}"
  if [ -z "$pr_number" ]; then
    fail "The per-OS PR trust anchor has no PR number; refusing to rewrite history (issue #798, fail closed)."
  fi
  case "$pr_number" in
    *[!0-9]*)
      fail "The pre-agent PR binding '$pr_number' is not a PR number; refusing to rewrite history (issue #798)."
      ;;
  esac
  if [ -z "$branch" ]; then
    fail "The pre-agent PR binding has no head branch; refusing to rewrite history (issue #798)."
  fi
  if [ "$cross_repo" != "false" ] || [ "$head_repo" != "$repo" ]; then
    echo "No same-repository head on PR #$pr_number (head=${head_repo:-unknown}, crossRepository=${cross_repo:-unknown}); nothing to sanitize."
    exit 0
  fi
  is_pr="yes"
else
  event_path="${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH is required}"

  # A valid non-object payload (an array, a string) has no event fields; a bare
  # `jq -e .` accepts it and then fails later with a raw jq error.
  if ! jq -e 'type == "object"' "$event_path" >/dev/null 2>&1; then
    fail "Could not parse the workflow event payload; refusing to rewrite history."
  fi

  thread="$(jq -r '.issue.number // .pull_request.number // empty' "$event_path")"
  case "$thread" in
    ''|*[!0-9]*)
      fail "No issue/PR number in the workflow event; refusing to rewrite history."
      ;;
  esac

  is_pr="$(jq -r 'if .issue.pull_request then "yes" elif .pull_request then "yes" else "" end' "$event_path")"

  if [ "$is_pr" = "yes" ]; then
    pr_number="$thread"
  else
    pr_list="$(gh pr list --repo "$repo" --state open --limit 100 \
      --json number,headRefName,createdAt,isCrossRepository,headRepository)" || {
      fail "Could not list open PRs for issue #$thread; refusing to rewrite history."
    }
    pr_number="$(printf '%s' "$pr_list" | jq -r --arg repo "$repo" --arg prefix "opencode/issue${thread}-" '
      [.[] | select(.isCrossRepository == false
                    and .headRepository.nameWithOwner == $repo
                    and (.headRefName | startswith($prefix)))]
      | sort_by(.createdAt) | last | .number // empty')" || {
      fail "Could not parse open PRs for issue #$thread; refusing to rewrite history."
    }
    if [ -z "$pr_number" ]; then
      echo "No open PR is associated with issue #$thread; nothing to sanitize."
      exit 0
    fi
  fi

  pr_json="$(gh pr view "$pr_number" --repo "$repo" --json headRefName,isCrossRepository,headRepository)" || {
    fail "Could not resolve PR #$pr_number; refusing to rewrite history."
  }
  # Extract the three identity fields in one strict pass: a malformed or
  # non-object payload must fail loudly instead of leaking a raw jq error (rc 5)
  # from each bare substitution.
  pr_fields="$(printf '%s' "$pr_json" | jq -er '[.headRefName // "", (.isCrossRepository | tostring), (.headRepository.nameWithOwner // "")] | @tsv')" || {
    fail "Could not parse the PR metadata for #$pr_number; refusing to rewrite history."
  }
  IFS=$'\t' read -r branch cross_repo head_repo <<< "$pr_fields"

  if [ -z "$branch" ]; then
    fail "PR #$pr_number has no resolvable head branch; refusing to rewrite history."
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
        fail "Refusing to rewrite unexpected branch '$branch'."
        ;;
    esac
  fi
fi

# Issue #798 review F3/F7: when a pinned REMOTE_URL is supplied, every remote
# operation runs from a fresh scratch repository whose config this script
# creates. The post-agent workspace `.git/config` (url.*.insteadOf, remote
# rewrites, includeIf) is never consulted. Without REMOTE_URL the historical
# workspace flow is kept for the other lanes.
scratch_dir=""
if [ -n "$remote_url" ]; then
  scratch_dir="$(mktemp -d 2>/dev/null || true)"
  if [ -z "$scratch_dir" ] || [ ! -d "$scratch_dir" ]; then
    fail "Could not create a scratch repository for the trailer strip; refusing to rewrite history (issue #798)."
  fi
  trap 'rm -rf "$scratch_dir"' EXIT
  if ! git init -q --bare "$scratch_dir"; then
    fail "Could not initialize the scratch repository for the trailer strip; refusing to rewrite history (issue #798)."
  fi
  # The scratch repository has no checkout-managed credential helper, so give
  # it the job token the step env holds. The token lives only in the temporary
  # scratch config, which the EXIT trap removes.
  if [ -n "${GH_TOKEN:-}" ]; then
    auth_header="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 | tr -d '\n')"
    if ! git -C "$scratch_dir" config http.extraheader "$auth_header"; then
      fail "Could not configure the scratch repository credentials; refusing to rewrite history (issue #798)."
    fi
  fi
  run_git() {
    git -C "$scratch_dir" "$@"
  }
  fetch_url="$remote_url"
  pr_ref="refs/remotes/origin/prbranch"
  if [ -n "$baseline_arg" ]; then
    base_ref="$baseline_arg"
  else
    base_ref="refs/remotes/origin/main"
  fi
else
  run_git() {
    git "$@"
  }
  fetch_url="origin"
  pr_ref="refs/remotes/origin/prbranch"
  if [ -n "$baseline_arg" ]; then
    base_ref="$baseline_arg"
  else
    base_ref="refs/remotes/origin/main"
  fi
fi

# Distinguish a definitively absent head (a closed/merged PR whose branch was
# deleted: `ls-remote --exit-code` returns 2) from a transport/auth error. The
# former has nothing to sanitize and must stay a loud no-op, not the false red
# this issue is fixing; the latter must still fail closed.
ls_rc=0
run_git ls-remote --exit-code --heads "$fetch_url" "refs/heads/$branch" >/dev/null 2>&1 || ls_rc=$?
if [ "$ls_rc" -eq 2 ]; then
  echo "PR head branch '$branch' no longer exists on origin; nothing to sanitize."
  exit 0
fi
if [ "$ls_rc" -ne 0 ]; then
  fail "Could not query branch '$branch'; refusing to rewrite history."
fi

if [ -n "$scratch_dir" ]; then
  if ! run_git fetch --no-tags --quiet "$fetch_url" \
    "+refs/heads/$branch:$pr_ref" "+refs/heads/main:refs/remotes/origin/main"; then
    fail "Could not fetch branch '$branch'; refusing to rewrite history."
  fi
else
  git fetch origin "refs/heads/$branch:$pr_ref" --quiet || {
    fail "Could not fetch branch '$branch'; refusing to rewrite history."
  }
fi

tip="$(run_git rev-parse --verify "$pr_ref" 2>/dev/null)" || {
  fail "Could not resolve the fetched tip of '$branch'; refusing to rewrite history."
}
if ! run_git cat-file -e "${base_ref}^{commit}" 2>/dev/null; then
  fail "The trailer-strip baseline '$base_ref' is not present on branch '$branch'; refusing to rewrite history (issue #798)."
fi
# Issue #798 review N6: a baseline object can exist (for example as a main
# commit) yet not be an ancestor of the branch, which would make the rewrite
# cover pre-baseline history the scope guard never judges. Refuse instead.
# Issue #798 review B11: that refusal is anchored-lane-only. The nine legacy
# lanes pass no explicit baseline and default the base to origin/main, which
# is not an ancestor of a branch that is merely behind main (the normal state
# between rebases); the range origin/main..branch still contains only the
# branch's own commits, so refusing there broke the legacy strip and let the
# owner trailer survive. Gate the check on an explicit captured baseline.
if [ -n "$baseline_arg" ] && ! run_git merge-base --is-ancestor "$base_ref" "$pr_ref"; then
  fail "The trailer-strip baseline '$base_ref' is not an ancestor of branch '$branch'; refusing to rewrite history (issue #798)."
fi

if ! range_log="$(run_git log --format=%B "$base_ref..$pr_ref" 2>&1)"; then
  fail "Could not read commits for branch '$branch'; refusing to rewrite history."
fi
# Issue #798 review N9: accept leading whitespace and a case-insensitive
# marker, so a differently-cased or indented owner trailer cannot invalidate
# approvals. Issue #798 review B13: GitHub attributes a co-author by the
# email, so a trailer with a different display name but the owner email is
# still owner attribution. Use one shared, email-aware regex for the count and
# the rewrite filter, and apply it case-insensitively on both sides: a count
# that tolerates mixed case while the rewrite does not would print success
# while the trailer survived. The owner identity stays exact, and the optional
# numeric prefix is the noreply form GitHub emits.
trailer_re='^[[:space:]]*[Cc][Oo]-[Aa][Uu][Tt][Hh][Oo][Rr][Ee][Dd]-[Bb][Yy]:[[:space:]]*([Uu]serfrom1995([[:space:]]*<[^>]*>)?|[^<]*<([0-9]+\+)?[Uu]serfrom1995@[Uu]sers\.noreply\.github\.com>)[[:space:]]*$'
export TRAILER_RE="$trailer_re"
# Issue #798 review N10: in the anchored per-OS lane only the named per-OS
# tester commits are rewritten. The previous --msg-filter ran over the whole
# captured range and stripped an owner trailer from ANY commit, including a
# foreign concurrent commit that merely carried the same trailer (rewriting
# another lane's commit message). The commit filter sees the original committer
# identity and the message on stdin; a foreign commit is passed through
# unchanged.
#
# Issue #798 evaluation finding: the trailer count that decides whether a
# rewrite runs and whether success is claimed must use the same identity scope
# as the anchored commit filter. The previous count covered the whole range, so
# a foreign commit's owner trailer printed "Stripping" and "Trailers stripped
# and branch updated" while the anchored filter rewrote nothing. Count only
# trailers on named per-OS tester commits here; report foreign trailers as
# preserved without claiming a rewrite.
count_anchored_owner_trailers() {
  local commit name email body matches owner=0 foreign=0 commits
  commits="$(run_git rev-list --reverse "$base_ref..$pr_ref" 2>/dev/null)" || return 1
  while IFS= read -r commit; do
    [ -n "$commit" ] || continue
    name="$(run_git show -s --format=%cn "$commit" 2>/dev/null)" || return 1
    email="$(run_git show -s --format=%ce "$commit" 2>/dev/null)" || return 1
    body="$(run_git show -s --format=%B "$commit" 2>/dev/null)" || return 1
    matches="$(printf '%s\n' "$body" | grep -ciE "$trailer_re" || true)"
    [ "$matches" -gt 0 ] || continue
    if [ "$email" = "github-actions[bot]@users.noreply.github.com" ]; then
      case "$name" in
        "The Linux Tester"|"The macOS Tester"|"The Windows Tester")
          owner=$((owner + matches))
          ;;
        *)
          foreign=$((foreign + matches))
          ;;
      esac
    else
      foreign=$((foreign + matches))
    fi
  done <<< "$commits"
  printf '%s %s\n' "$owner" "$foreign"
}
#
# Issue #798 review B5: the strict identity filter is anchored-lane only. The
# nine non-per-OS lanes call this helper without PEROS_ANCHOR=1 and commit as
# their own personas (Dr. Mob, The Architect, The Builder, The Fixer, the
# design agents, General Agent), so applying the tester-only filter there made
# every strip a false success: it printed "Trailers stripped" while the leaked
# owner trailer survived, reintroducing the approval-invalidating incident
# class (#689/#798). Those lanes keep the legacy unconditional message filter,
# which strips an owner trailer from every commit in the range.
peros_commit_filter='
strip=0
if [ "${GIT_COMMITTER_EMAIL:-}" = "github-actions[bot]@users.noreply.github.com" ]; then
  case "${GIT_COMMITTER_NAME:-}" in
    "The Linux Tester"|"The macOS Tester"|"The Windows Tester") strip=1 ;;
  esac
fi
if [ "$strip" -eq 1 ]; then
  { grep -viE "$TRAILER_RE" || [ $? -eq 1 ]; } | git commit-tree "$@"
else
  git commit-tree "$@"
fi'
legacy_commit_filter='
{ grep -viE "$TRAILER_RE" || [ $? -eq 1 ]; } | git commit-tree "$@"'
if [ "${PEROS_ANCHOR:-}" = "1" ]; then
  commit_filter="$peros_commit_filter"
else
  commit_filter="$legacy_commit_filter"
fi
tester_bad=0
foreign_bad=0
if [ "${PEROS_ANCHOR:-}" = "1" ]; then
  if ! anchored_counts="$(count_anchored_owner_trailers)"; then
    fail "Could not read the named per-OS tester commits of branch '$branch'; refusing to rewrite history."
  fi
  read -r tester_bad foreign_bad <<< "$anchored_counts"
  case "${tester_bad}:${foreign_bad}" in
    [0-9]*:[0-9]*) ;;
    *)
      fail "Could not parse the named per-OS tester trailer counts of branch '$branch'; refusing to rewrite history."
      ;;
  esac
else
  # The nine non-per-OS lanes keep the legacy whole-range count and the
  # unconditional message filter (issue #798 review B5).
  tester_bad="$(printf '%s\n' "$range_log" | grep -ciE "$trailer_re" || true)"
fi

if [ "$tester_bad" -eq 0 ]; then
  if [ "${PEROS_ANCHOR:-}" = "1" ] && [ "$foreign_bad" -gt 0 ]; then
    echo "No leaked owner trailers on named per-OS tester commits of $branch; preserved $foreign_bad owner trailer(s) on foreign commits unchanged."
  else
    echo "No leaked owner trailers on $branch."
  fi
  exit 0
fi

# On the PR-comment path the head belongs to the triggering PR by
# construction, but a branch outside the lab namespace is still never
# rewritten. Reaching here means there is a tester-owned trailer to remove,
# so refuse.
if [ "$is_pr" = "yes" ]; then
  case "$branch" in
    opencode/*) ;;
    *)
      fail "Refusing to rewrite branch '$branch' on PR #$pr_number: not an opencode/ lab branch."
      ;;
  esac
fi

verify_legacy_rewrite() {
  local ref="$1" rewritten remaining
  rewritten="$(run_git log --format=%B "$base_ref..$ref" 2>/dev/null)" || return 1
  remaining="$(printf '%s\n' "$rewritten" | grep -ciE "$trailer_re" || true)"
  case "$remaining" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$remaining" -eq 0 ]
}
if [ "${PEROS_ANCHOR:-}" = "1" ]; then
  echo "Stripping $tester_bad leaked owner trailer(s) from named per-OS tester commits on $branch."
else
  echo "Stripping $tester_bad leaked owner trailer(s) from $branch."
fi
if [ -n "$scratch_dir" ]; then
  # A bare scratch repository has no work tree, so filter-branch rewrites the
  # fetched ref in place. The original author and committer are preserved by
  # filter-branch; the pinned env only guarantees a fallback identity.
  if ! run_git filter-branch -f --commit-filter "$commit_filter" "$base_ref..$pr_ref" >/dev/null; then
    fail "Could not rewrite branch $branch after stripping trailers; refusing to report success."
  fi
  if [ "${PEROS_ANCHOR:-}" != "1" ] && ! verify_legacy_rewrite "$pr_ref"; then
    fail "The trailer rewrite left an owner trailer in '$base_ref..$pr_ref' on branch '$branch'; refusing to report success (issue #798 review B13)."
  fi
  if ! run_git push --force-with-lease="refs/heads/$branch:$tip" "$fetch_url" "$pr_ref:refs/heads/$branch"; then
    fail "Could not update branch $branch after stripping trailers; refusing to report success."
  fi
else
  git checkout --detach "$pr_ref" --quiet
  if ! git filter-branch -f --commit-filter "$commit_filter" "$base_ref..HEAD" >/dev/null; then
    fail "Could not rewrite branch $branch after stripping trailers; refusing to report success."
  fi
  if [ "${PEROS_ANCHOR:-}" != "1" ] && ! verify_legacy_rewrite HEAD; then
    fail "The trailer rewrite left an owner trailer in '$base_ref..HEAD' on branch '$branch'; refusing to report success (issue #798 review B13)."
  fi
  if ! git push --force-with-lease="refs/heads/$branch:$tip" origin "HEAD:refs/heads/$branch" --quiet; then
    fail "Could not update branch $branch after stripping trailers; refusing to report success."
  fi
fi
if [ "${PEROS_ANCHOR:-}" = "1" ]; then
  # Issue #798 evaluation finding: prove the anchored rewrite actually removed
  # every tester-owned trailer before claiming success. A shadowed git
  # subcommand (GIT_EXEC_PATH is unset above) or any silent no-op must fail
  # loudly instead of printing a success line over a surviving trailer.
  if ! rewritten_counts="$(count_anchored_owner_trailers)"; then
    fail "Could not verify the rewritten named per-OS tester commits of branch '$branch'; refusing to report success."
  fi
  read -r rewritten_tester rewritten_foreign <<< "$rewritten_counts"
  case "${rewritten_tester}:${rewritten_foreign}" in
    [0-9]*:[0-9]*) ;;
    *)
      fail "Could not parse the rewritten named per-OS tester trailer counts of branch '$branch'; refusing to report success."
      ;;
  esac
  if [ "$rewritten_tester" -ne 0 ]; then
    fail "The trailer rewrite left $rewritten_tester owner trailer(s) on named per-OS tester commits of branch '$branch'; refusing to report success."
  fi
  if [ "$foreign_bad" -gt 0 ]; then
    echo "Preserved $rewritten_foreign owner trailer(s) on foreign commits unchanged."
  fi
fi
echo "Trailers stripped and branch updated: $branch"
