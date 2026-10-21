#!/usr/bin/env bash
#
# publish-eval-marker.sh - publish the canonical Evaluator approval marker as an
# owner-PAT-authored comment and verify it persisted (issue #713).
#
# Why this exists: the PAT merge sweep in maintainer.yml is the only automated
# path that can land .github/workflows/* PRs, and it used to gate only on a
# fresh, head-bound /oc approve-test verdict. A workflow-touching PR could
# therefore merge with no binding Evaluator verdict at all. The sweep now also
# requires a fresh eval approval marker bound to the evaluated head and the
# eval trigger that started the run. Publishing that marker from the
# approve-eval machine handoff (only after the decision file and the evidence
# gate passed) and re-fetching it by id guarantees the marker shape by
# construction instead of depending on agent prose formatting, mirroring
# publish-tester-marker.sh (issue #629).
#
# The marker deliberately carries no /oc prefix: approve-eval is a decision
# action, never a trigger, so this comment can never be mistaken for a command.
#
# The marker body records two machine-readable bindings (issue #713 review
# round 3): `eval-head` is the exact commit the Evaluator checked out and
# `eval-trigger` is the id of the /oc eval comment that started the run. The
# sweep requires both, so an eval verdict for an older head, or a marker
# published after a newer eval trigger, can never merge a head it did not
# evaluate.
#
# Usage: publish-eval-marker.sh <pr-number> <score> <eval-head> <eval-trigger>
# Env:   GH_TOKEN           required; the workflow passes the owner PAT so the
#                           comment is authored by the repository owner. The
#                           evaluator agent holds only the read-only App token
#                           (issue #713 review round 13), so a PR-controlled
#                           script cannot forge an owner-authored marker.
#        GITHUB_REPOSITORY  repo slug (owner/name), set by Actions
#
# Exit 0 only when the marker was posted and re-fetches as an owner-authored
# comment whose first line is exactly the marker, whose eval-head and
# eval-trigger bindings match the requested values, and whose whole body is
# byte-identical to the composed body. Every other path exits 1 loudly so the
# fail-closed eval forward chain never hands an unverified verdict to the
# merge sweep.
#
# Issue #713 review round 9: score is a single-line numeric field (the
# evaluator's 0-10 rubric score) that used to be interpolated unchecked, and
# the publisher verified the FIRST eval-head/eval-trigger lines while the
# merge sweep parsed the LAST. A newline-bearing score could therefore inject
# a second binding that the publisher's first-line check ignored while the
# sweep honored it. Score is now validated, the composed and re-fetched
# bodies must each carry exactly one binding line of each kind, and the whole
# re-fetched body must equal the composed body.

set -u

target="${1:-}"
score="${2:-}"
eval_head="${3:-}"
eval_trigger="${4:-}"
repo="${GITHUB_REPOSITORY:-}"
marker="eval-verdict: approve-eval"
expected_author="${GITHUB_REPOSITORY_OWNER:-${repo%%/*}}"

if [ -z "$repo" ]; then
  echo "::error::publish-eval-marker.sh: GITHUB_REPOSITORY is empty; cannot resolve the repo slug."
  exit 1
fi

case "$target" in
  ''|*[!0-9]*)
    echo "::error::publish-eval-marker.sh: target '$target' is not a numeric PR number."
    exit 1
    ;;
esac

case "$eval_head" in
  ''|*[!0-9a-f]*)
    echo "::error::publish-eval-marker.sh: eval-head '$eval_head' is not a lowercase hex commit SHA."
    exit 1
    ;;
esac
if [ "${#eval_head}" -ne 40 ] && [ "${#eval_head}" -ne 64 ]; then
  echo "::error::publish-eval-marker.sh: eval-head '$eval_head' is not a 40 or 64 character commit SHA."
  exit 1
fi

case "$eval_trigger" in
  ''|*[!0-9]*)
    echo "::error::publish-eval-marker.sh: eval-trigger '$eval_trigger' is not a numeric comment id."
    exit 1
    ;;
esac

# Score is display text inside the marker body. It must be a single-line
# numeric rubric score (issue #713 review round 9): accepting arbitrary text
# let a newline split it into additional `eval-head:`/`eval-trigger:` lines.
case "$score" in
  ''|*[!0-9.]*|*.*.*)
    echo "::error::publish-eval-marker.sh: score '$score' is not a single-line numeric score."
    exit 1
    ;;
esac
if ! printf '%s' "$score" | grep -qE '^[0-9]{1,3}(\.[0-9]{1,3})?$'; then
  echo "::error::publish-eval-marker.sh: score '$score' is not a plain numeric rubric score."
  exit 1
fi

body=$(printf '%s\n' \
  "$marker" \
  '' \
  "eval-head: ${eval_head}" \
  "eval-trigger: ${eval_trigger}" \
  '' \
  "Machine-published Evaluator approval verdict for PR #${target} (Quality Council score: ${score}/10, evaluated head ${eval_head}, trigger comment ${eval_trigger}): the evaluator decision file passed the workflow gates. Published by the opencode-eval workflow (issue #713) so the merge sweep's first-line eval-verdict anchor is guaranteed by the workflow rather than by agent prose formatting.")

if [ "$(printf '%s\n' "$body" | grep -c '^eval-head: ')" -ne 1 ] \
  || [ "$(printf '%s\n' "$body" | grep -c '^eval-trigger: ')" -ne 1 ]; then
  echo "::error::publish-eval-marker.sh: composed marker body does not carry exactly one eval-head and one eval-trigger binding line (issue #713 review round 9)."
  exit 1
fi

response=$(gh api "repos/${repo}/issues/${target}/comments" -f body="$body" 2>&1) || {
  echo "::error::publish-eval-marker.sh: posting the eval approval marker to #${target} failed: ${response}"
  exit 1
}

comment_id=$(printf '%s' "$response" | jq -r '.id // empty' 2>/dev/null || true)
if [ -z "$comment_id" ]; then
  echo "::error::publish-eval-marker.sh: the GitHub API accepted the marker but returned no id; cannot verify it persisted (response head: $(printf '%s' "$response" | head -c 300))."
  exit 1
fi

fetched=$(gh api "repos/${repo}/issues/comments/${comment_id}" 2>&1) || {
  echo "::error::publish-eval-marker.sh: could not re-fetch posted marker comment ${comment_id}: ${fetched}"
  exit 1
}

author=$(printf '%s' "$fetched" | jq -r '.user.login // empty' 2>/dev/null || true)
html_url=$(printf '%s' "$fetched" | jq -r '.html_url // empty' 2>/dev/null || true)
fetched_body=$(printf '%s' "$fetched" | jq -r '.body // empty' 2>/dev/null | tr -d '\r' || true)
fetched_first=$(printf '%s' "$fetched_body" | head -n1 || true)
# Issue #713 review round 9: the sweep parses the LAST binding lines while the
# publisher used to verify the FIRST. Require exactly one of each before
# extracting, so last == first by construction and injected duplicates can
# never pass one reader and steer the other.
fetched_head_count=$(printf '%s\n' "$fetched_body" | grep -c '^eval-head: ' || true)
fetched_trigger_count=$(printf '%s\n' "$fetched_body" | grep -c '^eval-trigger: ' || true)
fetched_head=$(printf '%s' "$fetched_body" | sed -n 's/^eval-head: //p' | head -n1 || true)
fetched_trigger=$(printf '%s' "$fetched_body" | sed -n 's/^eval-trigger: //p' | head -n1 || true)

if [ -z "$expected_author" ] || [ "$author" != "$expected_author" ]; then
  echo "::error::publish-eval-marker.sh: posted marker comment ${comment_id} is authored by '${author}', not the repository owner '${expected_author:-unknown}'; the merge sweep's R30 predicate requires owner authorship (issue #713 review round 13)."
  exit 1
fi
if [ "$fetched_first" != "$marker" ]; then
  echo "::error::publish-eval-marker.sh: posted marker comment ${comment_id} does not carry the exact '${marker}' first line (fetched first line: '${fetched_first}'); the merge sweep would not recognize the verdict (issue #713)."
  exit 1
fi
if [ "$fetched_head_count" -ne 1 ] || [ "$fetched_trigger_count" -ne 1 ]; then
  echo "::error::publish-eval-marker.sh: posted marker comment ${comment_id} carries ${fetched_head_count} eval-head and ${fetched_trigger_count} eval-trigger binding lines; exactly one of each is required (issue #713 review round 9)."
  exit 1
fi
if [ "$fetched_body" != "$body" ]; then
  echo "::error::publish-eval-marker.sh: posted marker comment ${comment_id} body differs from the composed body; refusing to certify a marker that was altered in flight (issue #713 review round 9)."
  exit 1
fi
if [ "$fetched_head" != "$eval_head" ]; then
  echo "::error::publish-eval-marker.sh: posted marker comment ${comment_id} does not carry the exact eval-head binding (fetched: '${fetched_head}', want: '${eval_head}'); the merge sweep could not bind the verdict to its evaluated head (issue #713)."
  exit 1
fi
if [ "$fetched_trigger" != "$eval_trigger" ]; then
  echo "::error::publish-eval-marker.sh: posted marker comment ${comment_id} does not carry the exact eval-trigger binding (fetched: '${fetched_trigger}', want: '${eval_trigger}'); the merge sweep could not bind the verdict to its eval run (issue #713)."
  exit 1
fi

echo "Verified owner-authored eval approval marker comment ${comment_id} on #${target} (eval-head ${eval_head}, eval-trigger ${eval_trigger}): ${html_url}"
