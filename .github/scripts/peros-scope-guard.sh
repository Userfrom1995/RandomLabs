#!/usr/bin/env bash
# Per-OS tester commit-scope guard (issue #798).
#
# The per-OS tester agent runs through the vendored runner with
# use_github_token: true, and the CLI auto-commits the session's dirty
# workspace at exit. On PR #788 the Linux arm's auto-commit (9f1f1ed0)
# edited .github/scripts/post-peros-findings.sh, a lab file the arm must
# treat as read-only, and the commit sat outside the PR's project lane.
# The trailer half of that incident is owned by strip-trailers.sh; this
# helper owns the scope half. It inspects only the commits the arm itself
# pushed after its captured pre-agent baseline and fails closed when any of
# them leaves the project test lane or touches a protected lab path.
#
# Every protected-path touch is judged for every commit in the range,
# regardless of committer identity: identity is self-asserted, so an agent
# that forges a "foreign" committer must still never ship a lab edit. The
# out-of-lane check stays tester-only because another lane may legitimately
# touch project code.
#
# When the violating range belongs entirely to this arm's tester identity,
# the guard also force-pushes the captured baseline back to the branch, so the
# auto-commit cannot ship at all. When the range also contains a concurrent
# foreign commit, dropping it would destroy another lane's work, so the guard
# pushes a small PEROS_SCOPE_VIOLATION marker commit on top of the tip instead
# and fails closed: the next run's baseline capture refuses a marked branch, so
# the violation can never be forwarded silently on a later run. A marker is a
# hard stop: the guard never rewrites, drops, or supersedes a range that
# already contains one, and the marker path itself is a protected path. Only
# the named per-OS tester identity is judged as tester work (the generic
# `github-actions[bot]` name is foreign), so another lane's bot commit or a
# marker can never be dropped as this arm's range (issue #798 review N5).
#
# All remote access runs from a fresh scratch repository created by this
# script, never through the post-agent workspace `origin` config: the agent
# can rewrite `.git/config` (including url.*.insteadOf) after the fact, and a
# pinned REMOTE_URL alone does not stop a local URL rewrite. The scratch
# repository is configured only by the pinned step env (GIT_CONFIG_*), so the
# fetch and push always reach the trusted repository.
#
# Resolution matches strip-trailers.sh. The per-OS lane passes the PR number,
# head branch, and head repository identity captured by the pre-agent
# `Resolve the per-OS PR trust anchor` step, so an agent that rewrites the
# event payload or re-resolves a different PR can never redirect the judgment
# (PEROS_ANCHOR=1). A direct invocation without the anchor values falls back to
# the event payload and gh lookup for compatibility.
#
# Usage: peros-scope-guard.sh <baseline-sha> <linux|macos|windows>
# Env:   GITHUB_REPOSITORY, REMOTE_URL, GH_TOKEN
#        PEROS_ANCHOR=1 with PR_NUMBER, HEAD_REF, PR_CROSS_REPO, PR_HEAD_REPO
#        (the pre-agent trust anchor); otherwise GITHUB_EVENT_PATH is read.
# Exit:  0 = nothing new, a non-same-repository PR, an absent head branch,
#            or a new range that stays inside the project test lane
#        1 = a new range that leaves the test lane or touches a protected
#            path (after dropping a fully tester-owned range, or recording a
#            marker when foreign commits are interleaved), an unresolvable
#            branch, or unreadable metadata/history

set -euo pipefail

# Drop Git plumbing seams an agent could have exported through $GITHUB_ENV.
# The workflow also pins the GIT_CONFIG_* files; this removes the remaining
# environment redirections before any git command runs. GIT_GRAFT_FILE and
# GIT_SHALLOW_FILE can fabricate a second parent (skipping the merge
# exemption) or make main a child of a violating revert (excluding it from the
# judged range), so both are unset alongside the replace seam (issue #798
# review B3). The GIT_CONFIG_* names are re-pinned to safe values below so
# unsetting an agent-exported value never falls back to a writable global file.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY \
  GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR GIT_NAMESPACE \
  GIT_CONFIG GIT_CONFIG_PARAMETERS GIT_EXEC_PATH \
  GIT_GRAFT_FILE GIT_SHALLOW_FILE GIT_REPLACE_REF_BASE \
  GIT_CONFIG_GLOBAL GIT_CONFIG_SYSTEM GIT_CONFIG_NOSYSTEM \
  GIT_CONFIG_COUNT 2>/dev/null || true
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null
export GIT_CONFIG_NOSYSTEM=1
export GIT_CONFIG_COUNT=0
# Issue #798 Quality Council env-seam finding: an agent can export proxy/TLS
# redirections through $GITHUB_ENV, and the post-agent step env is not the only
# path those values can reach this helper. Remove them before the first git
# command so the trusted fetch and push can never be routed through a decoy
# proxy or trust a decoy CA. The workflow pins the same names empty as defense
# in depth; this unset makes the helper itself safe.
unset HTTPS_PROXY https_proxy HTTP_PROXY http_proxy ALL_PROXY all_proxy \
  NO_PROXY no_proxy GIT_SSL_NO_VERIFY GIT_SSL_CAINFO GIT_SSL_CAPATH \
  SSL_CERT_FILE SSL_CERT_DIR CURL_CA_BUNDLE GIT_PROXY_COMMAND 2>/dev/null || true
export GIT_TERMINAL_PROMPT=0

fail() {
  printf '::error::%s\n' "$*" >&2
  exit 1
}

note() {
  printf '%s\n' "$*"
}

# Issue #798 review B3: the durable invariant is judged from history, so the
# identity and path classifiers are shared between the pre-agent preflight
# (PEROS_PREFLIGHT=1) and the post-agent judgment below. Only the three named
# per-OS tester identities are ever attributed as tester work (the generic
# github-actions[bot] name is foreign), and a protected path is protected for
# every committer.
tester_email="github-actions[bot]@users.noreply.github.com"

is_named_peros_tester() {
  local name="$1" email="$2"
  [ "$email" = "$tester_email" ] || return 1
  case "$name" in
    "The Linux Tester"|"The macOS Tester"|"The Windows Tester") return 0 ;;
  esac
  return 1
}

is_protected_path() {
  case "$1" in
    .github|.github/*|AGENTS.md|LAB.md|setup.sh|shutdown.sh|opencode.json|PEROS_SCOPE_VIOLATION)
      return 0
      ;;
  esac
  return 1
}

is_test_lane_path() {
  case "/$1/" in
    */tests/*|*/test/*|*/e2e/*|*/spec/*|*/specs/*|*/__tests__/*|*/testdata/*|*/test-data/*|*/test_data/*|*/fixtures/*|*/fixture/*)
      return 0
      ;;
  esac
  local base="${1##*/}"
  case "$base" in
    test_*|tests_*|*_test.*|*_tests.*|*.test.*|*.spec.*|*_spec.*|*_e2e.*|*.e2e.*)
      return 0
      ;;
  esac
  return 1
}

# Issue #798 review B1/B2: the old merge exemption skipped any protected path
# whose merge blob matched main or the baseline, even when the merge authored a
# revert or dropped main's advance, and it ran only inside the protected branch
# so a clean main merge touching non-protected files was dropped as out of
# lane. A merge path is exempt only when the merge itself authored nothing.
# Issue #804 Quality Council findings: compare whole tree entries (mode, type,
# and object id), not just blob ids, so a mode-only change with the same blob
# is still an authored path. Judge the merge against its own immutable parents,
# not the live main tip fetched after the agent, so a genuinely clean merge of
# main stays exempt after main advances again. A carry is a merge whose result
# equals the first parent and whose second parent's entry equals the merge-base
# entry; a clean import is a merge whose result equals the second parent and
# whose first parent's entry equals the merge-base entry. The second parent
# must also be an ancestor of the fetched main tip, so a fabricated side branch
# cannot masquerade as a clean import. Both the durable preflight and the
# post-agent judge use this helper so the two decisions cannot drift.
git_at() {
  local runner="$1"
  shift
  if [ "$runner" = "scratch" ]; then
    scratch "$@"
  else
    git "$@"
  fi
}

# A canonical repository path has no empty, "." or ".." component and no
# leading or trailing slash. A crafted raw tree written with git hash-object
# --literally can carry such a name, and diff-tree reports it verbatim, but
# ls-tree normalizes the components away and returns an empty successful
# lookup. Refuse the path up front so the empty result can never be read as
# ABSENT (issue #798 review).
is_canonical_repo_path() {
  case "$1" in
    ''|/*|*/) return 1 ;;
  esac
  case "/$1/" in
    *//*|*/./*|*/../*) return 1 ;;
  esac
  return 0
}

entry_of() {
  local runner="$1" rev="$2" path="$3" entry
  # Issue #798 review: the diff path is literal data, but ls-tree parses its
  # final argument as a pathspec, so a root-level name such as ":evil.py" or
  # ":(glob)evil.py" is read as pathspec magic. `:(literal)` neutralizes the
  # magic, and a failed lookup returns nonzero instead of pretending the path
  # is ABSENT, so a lookup error can never compare equal to another ABSENT and
  # exempt a merge that authored a real path.
  is_canonical_repo_path "$path" || return 1
  entry="$(git_at "$runner" ls-tree --full-tree "$rev" -- ":(literal)$path" 2>/dev/null)" || return 1
  if [ -n "$entry" ]; then
    printf '%s' "$entry"
  else
    printf 'ABSENT'
  fi
}

merge_base_of() {
  local runner="$1" first="$2" second="$3"
  git_at "$runner" merge-base "$first" "$second" 2>/dev/null || true
}

merge_path_is_exempt() {
  local runner="$1" commit="$2" path="$3"
  local merge_entry first_entry second_entry base_entry merge_base
  if ! git_at "$runner" merge-base --is-ancestor \
    "$commit^2" refs/remotes/origin/main 2>/dev/null; then
    return 1
  fi
  merge_entry="$(entry_of "$runner" "$commit" "$path")" || return 1
  first_entry="$(entry_of "$runner" "$commit^1" "$path")" || return 1
  second_entry="$(entry_of "$runner" "$commit^2" "$path")" || return 1
  merge_base="$(merge_base_of "$runner" "$commit^1" "$commit^2")"
  if [ -z "$merge_base" ]; then
    return 1
  fi
  base_entry="$(entry_of "$runner" "$merge_base" "$path")" || return 1
  if [ "$merge_entry" = "$first_entry" ] && [ "$second_entry" = "$base_entry" ]; then
    return 0
  fi
  if [ "$merge_entry" = "$second_entry" ] && [ "$first_entry" = "$base_entry" ]; then
    return 0
  fi
  return 1
}

# Issue #798 review B3/B7: run BEFORE the agent from the baseline step. A
# concurrent push after the sanitizer, or a sanitizer drop/marker push that
# failed, leaves a violating tester commit in history; the next run would
# otherwise adopt it as pre-baseline and forward the branch clean. Judge every
# commit since the merge base with main and refuse the branch while any
# tester-identity commit is outside the project test lane, while a protected
# lab path is touched by a tester-identity commit or by any commit at or after
# the first named per-OS tester commit (B6: a protected edit interleaved with a
# tester session can be an adopted violation, and committer identity is
# self-asserted), and while any commit creates or deletes the
# PEROS_SCOPE_VIOLATION marker. The PR's own pre-tester history is exempt from
# the protected scan (B7): an infrastructure PR legitimately edits protected
# paths, and its read-only per-OS session must still start. The workspace is
# trusted at this point (the agent has not run), and the helper itself is read
# from the workflow commit by the caller.
if [ "${PEROS_PREFLIGHT:-}" = "1" ]; then
  preflight_base=""
  if git rev-parse --verify -q refs/remotes/origin/main >/dev/null 2>&1; then
    preflight_base="$(git merge-base refs/remotes/origin/main HEAD 2>/dev/null)" || preflight_base=""
  elif git fetch --quiet --no-tags origin "+refs/heads/main:refs/remotes/origin/main" 2>/dev/null; then
    preflight_base="$(git merge-base refs/remotes/origin/main HEAD 2>/dev/null)" || preflight_base=""
  fi
  case "$preflight_base" in
    ''|*[!0-9a-f]*)
      fail "Could not resolve the branch merge base against main for the durable per-OS tester-lane preflight; refusing to start (issue #798)." ;;
  esac
  # Issue #798 review F1: the pre-tester boundary is topological, not
  # commit-date ordered. Plain `--reverse` emits a newer-dated pre-tester infra
  # commit after the first tester commit, which would falsely refuse a
  # legitimate infrastructure branch under committer-date skew.
  # Issue #798 review B14: commits already on the trusted main tip are not
  # branch-authored history. Exclude them so a clean merge of main is not
  # judged as a protected edit; a non-merge commit on this branch is still
  # included even when its content matches main.
  preflight_commits="$(git rev-list --topo-order --reverse "$preflight_base..HEAD" --not refs/remotes/origin/main 2>/dev/null)" || {
    fail "Could not read the branch history after the merge base for the durable per-OS tester-lane preflight; refusing to start (issue #798)."
  }
  preflight_paths="$(mktemp 2>/dev/null || true)"
  if [ -z "$preflight_paths" ] || [ ! -e "$preflight_paths" ]; then
    fail "Could not create a temporary file for the durable per-OS tester-lane preflight; refusing to start (issue #798)."
  fi
  preflight_bad=""
  preflight_seen_tester=0
  while IFS= read -r preflight_commit; do
    [ -n "$preflight_commit" ] || continue
    preflight_name="$(git show -s --format=%cn "$preflight_commit" 2>/dev/null)" || {
      rm -f "$preflight_paths"
      fail "Could not read the committer of $preflight_commit; refusing to start (issue #798)."
    }
    preflight_mail="$(git show -s --format=%ce "$preflight_commit" 2>/dev/null)" || {
      rm -f "$preflight_paths"
      fail "Could not read the committer email of $preflight_commit; refusing to start (issue #798)."
    }
    preflight_tester=0
    if is_named_peros_tester "$preflight_name" "$preflight_mail"; then
      preflight_tester=1
      preflight_seen_tester=1
    fi
    if ! git diff-tree --no-commit-id --name-only -r -m --root -z "$preflight_commit" > "$preflight_paths"; then
      rm -f "$preflight_paths"
      fail "Could not read the file list of $preflight_commit; refusing to start (issue #798)."
    fi
    preflight_parents="$(git rev-list --parents -n 1 "$preflight_commit" 2>/dev/null | awk 'NF > 0 { print NF - 1; exit }')" || preflight_parents=""
    case "$preflight_parents" in
      ''|*[!0-9]*)
        rm -f "$preflight_paths"
        fail "Could not read the parent count of $preflight_commit; refusing to start (issue #798)." ;;
    esac
    while IFS= read -r -d '' preflight_path; do
      [ -n "$preflight_path" ] || continue
      # Issue #798 review B7: the violation marker is a hard stop. Any commit
      # in the range that creates or deletes it is refused, regardless of
      # identity or position, so a marker can never be erased and adopted as
      # pre-baseline history.
      if [ "$preflight_path" = "PEROS_SCOPE_VIOLATION" ]; then
        preflight_bad="${preflight_bad} ${preflight_commit:0:12}(protected:${preflight_path})"
        continue
      fi
      # Issue #798 review B1/B2 and issue #804 Quality Council: a merge path is
      # exempt only when the merge authored nothing (tree-entry carry or clean
      # import against its own parents), and the exemption applies to every
      # path, before the protected/out-of-lane classification, so a clean main
      # merge touching only project files is not dropped.
      if [ "$preflight_parents" -ge 2 ] && merge_path_is_exempt workspace "$preflight_commit" "$preflight_path"; then
        continue
      fi
      # Issue #798 review B6/B7: a protected edit is a durable violation when a
      # named per-OS tester made it, and also when any commit at or after the
      # first named tester commit in the range touches it (identity is
      # self-asserted, so a foreign-identity protected edit interleaved with a
      # tester session must not be adopted). Before the first tester commit the
      # range is the PR's own history, which an infrastructure PR legitimately
      # edits, so it is exempt: the read-only per-OS session on an infra PR
      # must still start (B7). Only the out-of-lane check stays tester-specific,
      # because another lane may legitimately touch project code.
      if is_protected_path "$preflight_path" && { [ "$preflight_tester" -eq 1 ] || [ "$preflight_seen_tester" -eq 1 ]; }; then
        preflight_bad="${preflight_bad} ${preflight_commit:0:12}(protected:${preflight_path})"
      elif [ "$preflight_tester" -eq 1 ] && ! is_test_lane_path "$preflight_path"; then
        preflight_bad="${preflight_bad} ${preflight_commit:0:12}(outside:${preflight_path})"
      fi
    done < "$preflight_paths"
  done <<< "$preflight_commits"
  rm -f "$preflight_paths"
  if [ -n "$preflight_bad" ]; then
    fail "The branch history already carries per-OS tester commits outside the project test lane or protected lab-path edits after a tester session:${preflight_bad}. Refusing to start a new tester session until the Maintainer resolves it (issue #798)."
  fi
  note "Per-OS durable preflight: every tester-identity commit since main stays inside the project test lane, no protected lab path is touched at or after the first tester commit, and the violation marker is absent."
  exit 0
fi

baseline="${1:-}"
os_label="${2:-}"
repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
remote_url="${REMOTE_URL:?REMOTE_URL is required}"

case "$baseline" in
  ''|*[!0-9a-f]*)
    fail "Per-OS scope guard received no valid pre-agent baseline SHA (got '$baseline'); refusing to judge the branch scope (issue #798)."
    ;;
esac
if [ "${#baseline}" -lt 7 ]; then
  fail "Per-OS scope guard baseline '$baseline' is too short to be a commit id; refusing to judge the branch scope (issue #798)."
fi

case "$os_label" in
  linux)
    tester_name="The Linux Tester"
    ;;
  macos)
    tester_name="The macOS Tester"
    ;;
  windows)
    tester_name="The Windows Tester"
    ;;
  *)
    fail "Per-OS scope guard received an unknown OS label '$os_label' (want linux, macos, or windows); refusing to guess the tester identity (issue #798)."
    ;;
esac
case "$remote_url" in
  */"$repo") ;;
  *)
    fail "Per-OS scope guard remote '$remote_url' does not end in the trusted repository '$repo'; refusing to judge an unknown remote (issue #798)."
    ;;
esac

pr_number=""
branch=""
cross_repo=""
head_repo=""

if [ "${PEROS_ANCHOR:-}" = "1" ]; then
  # Issue #798 review F7: the event payload and the workspace remote are
  # agent-writable after the agent ran, so the per-OS lane binds the PR
  # identity captured before the agent started.
  pr_number="${PR_NUMBER:-}"
  branch="${HEAD_REF:-}"
  cross_repo="${PR_CROSS_REPO:-}"
  head_repo="${PR_HEAD_REPO:-}"
  if [ -z "$pr_number" ]; then
    fail "The per-OS PR trust anchor has no PR number; refusing to judge the branch scope (issue #798, fail closed)."
  fi
  case "$pr_number" in
    *[!0-9]*)
      fail "The pre-agent PR binding '$pr_number' is not a PR number; refusing to judge the branch scope (issue #798)."
      ;;
  esac
  if [ -z "$branch" ]; then
    fail "The pre-agent PR binding has no head branch; refusing to judge the branch scope (issue #798)."
  fi
  if [ "$cross_repo" != "false" ] || [ "$head_repo" != "$repo" ]; then
    note "No same-repository head on PR #$pr_number (head=${head_repo:-unknown}, crossRepository=${cross_repo:-unknown}); nothing to judge."
    exit 0
  fi
else
  event_path="${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH is required}"
  # A valid non-object payload (an array, a string) has no event fields; a
  # bare `jq -e .` accepts it and then fails later with a raw jq error.
  if ! jq -e 'type == "object"' "$event_path" >/dev/null 2>&1; then
    fail "Could not parse the workflow event payload; refusing to judge the branch scope (issue #798)."
  fi

  thread="$(jq -r '.issue.number // .pull_request.number // empty' "$event_path")"
  case "$thread" in
    ''|*[!0-9]*)
      fail "No issue/PR number in the workflow event; refusing to judge the branch scope (issue #798)."
      ;;
  esac

  is_pr="$(jq -r 'if .issue.pull_request then "yes" elif .pull_request then "yes" else "" end' "$event_path")"

  if [ "$is_pr" = "yes" ]; then
    pr_number="$thread"
  else
    pr_list="$(gh pr list --repo "$repo" --state open --limit 100 \
      --json number,headRefName,createdAt,isCrossRepository,headRepository)" || {
      fail "Could not list open PRs for issue #$thread; refusing to judge the branch scope (issue #798)."
    }
    pr_number="$(printf '%s' "$pr_list" | jq -r --arg repo "$repo" --arg prefix "opencode/issue${thread}-" '
      [.[] | select(.isCrossRepository == false
                    and .headRepository.nameWithOwner == $repo
                    and (.headRefName | startswith($prefix)))]
      | sort_by(.createdAt) | last | .number // empty')" || {
      fail "Could not parse open PRs for issue #$thread; refusing to judge the branch scope (issue #798)."
    }
    if [ -z "$pr_number" ]; then
      note "No open PR is associated with issue #$thread; nothing to judge."
      exit 0
    fi
  fi

  pr_json="$(gh pr view "$pr_number" --repo "$repo" --json headRefName,isCrossRepository,headRepository)" || {
    fail "Could not resolve PR #$pr_number; refusing to judge the branch scope (issue #798)."
  }
  pr_fields="$(printf '%s' "$pr_json" | jq -er '[.headRefName // "", (.isCrossRepository | tostring), (.headRepository.nameWithOwner // "")] | @tsv')" || {
    fail "Could not parse the PR metadata for #$pr_number; refusing to judge the branch scope (issue #798)."
  }
  IFS=$'\t' read -r branch cross_repo head_repo <<< "$pr_fields"

  if [ -z "$branch" ]; then
    fail "PR #$pr_number has no resolvable head branch; refusing to judge the branch scope (issue #798)."
  fi

  # A fork PR's branch name resolves to a same-named branch on THIS repository
  # when fetched, which is not the triggering work. Nothing on this repository
  # can be attributed to such a PR, so this is a loud no-op and never a red.
  if [ "$cross_repo" != "false" ] || [ "$head_repo" != "$repo" ]; then
    note "No same-repository head on PR #$pr_number (head=${head_repo:-unknown}, crossRepository=${cross_repo:-unknown}); nothing to judge."
    exit 0
  fi

  if [ "$is_pr" != "yes" ]; then
    case "$branch" in
      opencode/issue"$thread"-*) ;;
      *)
        fail "Refusing to judge unexpected branch '$branch' for issue #$thread (issue #798)."
        ;;
    esac
  fi
fi

# Issue #798 review F3/F7: judge from a scratch repository so the post-agent
# workspace `.git/config` (including url.*.insteadOf) can never redirect the
# fetch or the push. The pinned step env supplies GIT_CONFIG_GLOBAL and
# GIT_CONFIG_NOSYSTEM, and this repository's own config is created here.
scratch_dir="$(mktemp -d 2>/dev/null || true)"
if [ -z "$scratch_dir" ] || [ ! -d "$scratch_dir" ]; then
  fail "Could not create a scratch repository for the branch scope check; refusing to judge the branch scope (issue #798)."
fi
trap 'rm -rf "$scratch_dir"' EXIT
if ! git init -q --bare "$scratch_dir"; then
  fail "Could not initialize the scratch repository for the branch scope check; refusing to judge the branch scope (issue #798)."
fi
# The scratch repository has no checkout-managed credential helper, so give it
# the job token the step env holds. The token lives only in the temporary
# scratch config, which the EXIT trap removes.
if [ -n "${GH_TOKEN:-}" ]; then
  auth_header="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 | tr -d '\n')"
  if ! git -C "$scratch_dir" config http.extraheader "$auth_header"; then
    fail "Could not configure the scratch repository credentials; refusing to judge the branch scope (issue #798)."
  fi
fi

scratch() {
  git -C "$scratch_dir" "$@"
}

ls_rc=0
scratch ls-remote --exit-code --heads "$remote_url" "refs/heads/$branch" >/dev/null 2>&1 || ls_rc=$?
if [ "$ls_rc" -eq 2 ]; then
  note "PR head branch '$branch' no longer exists on origin; nothing to judge."
  exit 0
fi
if [ "$ls_rc" -ne 0 ]; then
  fail "Could not query branch '$branch'; refusing to judge the branch scope (issue #798)."
fi

paths_file="$(mktemp 2>/dev/null || true)"
if [ -z "$paths_file" ] || [ ! -e "$paths_file" ]; then
  fail "Could not create a temporary file for the commit file lists; refusing to judge the branch scope (issue #798)."
fi
trap 'rm -rf "$scratch_dir"; rm -f "$paths_file"' EXIT

is_tester_commit() {
  local commit="$1" name email
  name="$(scratch show -s --format=%cn "$commit" 2>/dev/null)" || return 1
  email="$(scratch show -s --format=%ce "$commit" 2>/dev/null)" || return 1
  # Issue #798 review N5: the generic bot name is not this arm's tester.
  # The incident commit 9f1f1ed0 was committed by the named tester, and the
  # violation marker is committed as github-actions[bot]; accepting the
  # generic name let a concurrent run treat a marker (or another lane's bot
  # commit) as tester work and drop it with the range.
  [ "$email" = "$tester_email" ] && [ "$name" = "$tester_name" ]
}

add_unique() {
  local value="$1" current="$2"
  case "|$current|" in
    *"|$value|"*) printf '%s' "$current" ;;
    *) printf '%s' "${current:+$current, }$value" ;;
  esac
}

judged_commits=""
judged_protected=""
judged_out_of_lane=""
judged_foreign=""

# Issue #798 review B3: the judged range is re-read on every round, so a
# concurrent advance is judged at its actual tip instead of failing on a stale
# lease. Sets judged_protected/judged_out_of_lane/judged_foreign for the caller.
judge_range() {
  local commit tester path
  judged_protected=""
  judged_out_of_lane=""
  judged_foreign=""
  while IFS= read -r commit; do
    [ -n "$commit" ] || continue
    tester=0
    if is_tester_commit "$commit"; then
      tester=1
    else
      judged_foreign="${judged_foreign}${commit}
"
    fi
    # Issue #798 review F6: a merge commit's combined diff prints no paths, so a
    # tester merge could import a protected edit from a side parent and look
    # clean. diff-tree -m lists the paths against every parent.
    if ! scratch diff-tree --no-commit-id --name-only -r -m --root -z "$commit" > "$paths_file"; then
      return 1
    fi
    parent_line="$(scratch rev-list --parents -n 1 "$commit" 2>/dev/null)" || return 1
    parent_count="$(printf '%s\n' "$parent_line" | awk 'NF > 0 { print NF - 1; exit }')"
    case "$parent_count" in
      ''|*[!0-9]*) return 1 ;;
    esac
    while IFS= read -r -d '' path; do
      [ -n "$path" ] || continue
      # Issue #798 review B1/B2 and issue #804 Quality Council: a merge path is
      # exempt only when the merge authored nothing (tree-entry carry or clean
      # import against its own parents), and the exemption applies to every
      # path, before the protected/out-of-lane classification, so a clean main
      # merge touching only project files is not dropped.
      if [ "$parent_count" -ge 2 ] && merge_path_is_exempt scratch "$commit" "$path"; then
        continue
      fi
      # Issue #798 review F4: judge protected paths for every commit, not only
      # tester-attributed ones; committer identity is self-asserted.
      if is_protected_path "$path"; then
        judged_protected="$(add_unique "$path" "$judged_protected")"
        continue
      fi
      [ "$tester" -eq 1 ] || continue
      is_test_lane_path "$path" && continue
      judged_out_of_lane="$(add_unique "$path" "$judged_out_of_lane")"
    done < "$paths_file"
  done <<< "$judged_commits"
  return 0
}

round=1
while :; do
  # Issue #798 evaluation finding: fetch main too, so a baseline object that
  # exists on main but is not an ancestor of the branch reaches the dedicated
  # ancestry check below. With only the branch fetched, that shape died on the
  # missing-object check and the ancestry branch was never exercised.
  if ! scratch fetch --no-tags --quiet "$remote_url" "+refs/heads/$branch:refs/remotes/origin/prbranch" "+refs/heads/main:refs/remotes/origin/main"; then
    fail "Could not fetch branch '$branch'; refusing to judge the branch scope (issue #798)."
  fi
  tip="$(scratch rev-parse --verify refs/remotes/origin/prbranch 2>/dev/null)" || {
    fail "Could not resolve the fetched tip of '$branch'; refusing to judge the branch scope (issue #798)."
  }

  if [ "$tip" = "$baseline" ]; then
    note "No commits were pushed after the captured baseline on $branch; the scope is clean."
    exit 0
  fi
  if ! scratch cat-file -e "${baseline}^{commit}" 2>/dev/null; then
    fail "The captured baseline $baseline is not present on $branch tip $tip (a concurrent rewrite happened); refusing to judge or rewrite the branch (issue #798)."
  fi
  if ! scratch merge-base --is-ancestor "$baseline" "$tip"; then
    fail "The captured baseline $baseline is not an ancestor of $branch tip $tip (a concurrent rewrite happened); refusing to judge or rewrite the branch (issue #798)."
  fi

  # Issue #798 review B14: a merge of main brings trusted main commits into
  # the range. Exclude commits reachable from the fetched main tip so their
  # protected files are not judged as branch edits; a non-merge commit on this
  # branch is still included even when its content matches main.
  judged_commits="$(scratch rev-list --reverse "$baseline..$tip" --not refs/remotes/origin/main)" || {
    fail "Could not read the commit range after the captured baseline; refusing to judge the branch scope (issue #798)."
  }

  # Issue #798 review N5: a marker commit is a durable block owned by the
  # Maintainer. Never rewrite, drop, or supersede it: a concurrent run whose
  # baseline predates the marker would otherwise classify the marker commit as
  # tester work and force the branch back, destroying the block (and any clean
  # commit after it). Refuse before any classification or push.
  marker_seen=0
  while IFS= read -r commit; do
    [ -n "$commit" ] || continue
    if scratch cat-file -e "$commit:PEROS_SCOPE_VIOLATION" 2>/dev/null; then
      marker_seen=1
      break
    fi
  done <<< "$judged_commits"
  if [ "$marker_seen" -eq 1 ]; then
    fail "The judged range contains a PEROS_SCOPE_VIOLATION marker; refusing to rewrite a branch the Maintainer must resolve (issue #798)."
  fi

  if ! judge_range; then
    fail "Could not read the file list of a judged commit; refusing to judge the branch scope (issue #798)."
  fi
  if [ -z "$judged_protected" ] && [ -z "$judged_out_of_lane" ]; then
    note "Per-OS scope guard: the new commits on $branch stay inside the project test lane."
    exit 0
  fi

  if [ -n "$judged_protected" ]; then
    printf '::error::Per-OS scope guard: the new commits on %s touch protected lab paths (%s); a native test pass may never ship a lab edit (issue #798).\n' \
      "$branch" "$judged_protected" >&2
  fi
  if [ -n "$judged_out_of_lane" ]; then
    printf '::error::Per-OS scope guard: the %s tester commits on %s touch files outside the project test lane (%s); only test directories and test files may be authored (issue #798).\n' \
      "$os_label" "$branch" "$judged_out_of_lane" >&2
  fi

  # Issue #798 review F8: a violating range interleaved with a foreign commit
  # cannot be dropped without destroying another lane's work. Record a marker
  # commit on top of the tip instead, so the next run's baseline capture refuses
  # the branch: a violation can never become pre-baseline history that a later
  # clean run silently forwards.
  if [ -n "$judged_foreign" ]; then
    printf '::warning::Per-OS scope guard: non-tester commits are interleaved in %s..%s, so the violating tester range cannot be dropped without destroying another lane. A PEROS_SCOPE_VIOLATION marker is recorded and the branch is left for the Maintainer (issue #798).\n' \
      "$baseline" "$tip" >&2
    marker_blob="$(printf 'Per-OS tester commit-scope violation (issue #798)\n\nbranch: %s\nrange: %s..%s\nprotected: %s\nout_of_lane: %s\n\nRemove this file only after repairing the flagged paths.\n' \
      "$branch" "$baseline" "$tip" "${judged_protected:-none}" "${judged_out_of_lane:-none}" \
      | scratch hash-object -w --stdin)" || {
      fail "Could not prepare the per-OS violation marker; the branch still carries a lab edit (issue #798)."
    }
    if ! scratch read-tree "$tip" \
      || ! scratch update-index --add --cacheinfo "100644,$marker_blob,PEROS_SCOPE_VIOLATION" \
      || ! marker_tree="$(scratch write-tree)"; then
      fail "Could not build the per-OS violation marker tree; the branch still carries a lab edit (issue #798)."
    fi
    marker_commit="$(scratch -c user.name="github-actions[bot]" -c user.email="$tester_email" \
      commit-tree "$marker_tree" -p "$tip" -m "bot: record a per-OS commit-scope violation (issue #798)")" || {
      fail "Could not create the per-OS violation marker commit; the branch still carries a lab edit (issue #798)."
    }
    push_target="$marker_commit:refs/heads/$branch"
    push_desc="record the per-OS violation marker"
  else
    printf 'Per-OS scope guard: dropping the tester-owned commit range %s..%s and restoring %s on %s.\n' \
      "$baseline" "$tip" "$baseline" "$branch"
    push_target="$baseline:refs/heads/$branch"
    push_desc="drop the violating tester commit range"
  fi

  push_rc=0
  scratch push --force-with-lease="refs/heads/$branch:$tip" "$remote_url" "$push_target" || push_rc=$?
  if [ "$push_rc" -eq 0 ]; then
    if [ -n "$judged_foreign" ]; then
      note "Per-OS scope guard: recorded a PEROS_SCOPE_VIOLATION marker on $branch; the branch is blocked until the Maintainer resolves it."
    else
      note "Per-OS scope guard: dropped the violating tester commit range from $branch."
    fi
    exit 1
  fi

  # Issue #798 review B3: a rejected push means a concurrent advance. Re-fetch
  # and re-judge at the new tip (the violation may have been dropped by the
  # concurrent actor, become clean, or now interleave a foreign commit). A
  # bounded 3-round budget keeps a persistently rejected lane loud without an
  # unbounded retry loop.
  if [ "$round" -ge 3 ]; then
    fail "Could not ${push_desc} on $branch after 3 bounded re-fetch/re-judge attempts; the branch still carries a lab edit (issue #798)."
  fi
  note "Per-OS scope guard: the push for $branch was rejected; re-fetching and re-judging the branch (round $((round + 1))/3) (issue #798)."
  sleep 2
  round=$((round + 1))
done
