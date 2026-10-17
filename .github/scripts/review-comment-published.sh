#!/usr/bin/env bash
#
# review-comment-published.sh - Positive publication evidence for the review
# gate (issue #616). The reviewer's decision comment reaches the thread through
# one of two wrapper paths: the opencode wrapper posts the session's final
# message as a comment (which carries a `[github run](.../actions/runs/<id>)`
# footer), or the reviewer posts its findings mid-session with the comment tool
# (no footer). In BOTH cases the comment is authored by `github-actions[bot]`
# and ends with the reviewer sign-off line. A run that dies between the
# decision-file write and the comment post (provider api_key_expired at turn
# end, review run 39052018409 on PR #614) leaves only the wrapper's raw
# APIError comment behind, which has NO sign-off - so a sign-off-bearing bot
# comment created after the triggering comment is exactly the positive
# evidence the gate must require before it forwards a verdict.
#
# Usage: review-comment-published.sh <issue-or-pr-number> <since-iso8601>
# Env:   GITHUB_REPOSITORY (owner/repo), GH_TOKEN
# Exit:  0 = published (safe to forward the decision)
#        1 = not published (crash signature; never forward)
#        2 = could not verify (API/parse failure; never forward, never
#            auto-retry a possibly-published review)
set -u

PR="${1:-}"
SINCE="${2:-}"
REPO="${GITHUB_REPOSITORY:-}"

if [ -z "$PR" ] || [ -z "$SINCE" ] || [ -z "$REPO" ]; then
  echo "usage: review-comment-published.sh <pr> <since-iso8601>; GITHUB_REPOSITORY and GH_TOKEN required" >&2
  exit 2
fi

payload=$(gh api "repos/${REPO}/issues/${PR}/comments?per_page=100" --paginate --slurp 2>/dev/null) || {
  echo "could not fetch comments for #${PR}" >&2
  exit 2
}
case "$payload" in
  '['*) ;;
  *)
    echo "unexpected comments payload for #${PR}" >&2
    exit 2
    ;;
esac

count=$(printf '%s' "$payload" | jq --arg since "$SINCE" '
  [ .[][]
    | select(.user.login == "github-actions[bot]")
    | select(.created_at > $since)
    | select(.body | test("(?m)^- the Reviewer[ \t]*$"))
  ] | length' 2>/dev/null) || {
  echo "could not parse comments payload for #${PR}" >&2
  exit 2
}

if [ "$count" -ge 1 ] 2>/dev/null; then
  echo "Decision comment published: ${count} reviewer-signed comment(s) created after ${SINCE}."
  exit 0
fi
echo "No reviewer-signed decision comment found created after ${SINCE} on #${PR}." >&2
exit 1
