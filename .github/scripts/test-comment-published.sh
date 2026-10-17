#!/usr/bin/env bash
#
# test-comment-published.sh - Positive publication evidence for the tester
# approval gate (issue #629). The Tester's decision comment reaches the thread
# through one of two wrapper paths: the opencode wrapper posts the session's
# final message as a comment (which carries a `[github run](.../actions/runs/<id>)`
# footer), or the Tester posts its findings mid-session with the comment tool
# (no footer). In BOTH cases the comment is authored by `github-actions[bot]`
# and ends with the `- the Tester` sign-off line. A run that dies between the
# decision-file write and the comment post leaves only the wrapper's raw
# APIError comment behind, which has NO sign-off - so a sign-off-bearing bot
# comment created after the triggering comment is exactly the positive
# evidence the gate must require before it forwards a maintainer decision
# (the #616 contract applied to the tester gate; PR #628 forwarded an
# approval whose only comment was prose-first).
#
# Usage: test-comment-published.sh <pr-number> <since-iso8601>
# Env:   GITHUB_REPOSITORY (owner/repo), GH_TOKEN
# Exit:  0 = published (safe to proceed with the maintainer decision)
#        1 = not published (crash signature; never forward)
#        2 = could not verify (API/parse failure; never forward)
set -u

PR="${1:-}"
SINCE="${2:-}"
REPO="${GITHUB_REPOSITORY:-}"

if [ -z "$PR" ] || [ -z "$SINCE" ] || [ -z "$REPO" ]; then
  echo "usage: test-comment-published.sh <pr> <since-iso8601>; GITHUB_REPOSITORY and GH_TOKEN required" >&2
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
    | select(.body | test("(?m)^- the Tester[ \t]*$"))
  ] | length' 2>/dev/null) || {
  echo "could not parse comments payload for #${PR}" >&2
  exit 2
}

if [ "$count" -ge 1 ] 2>/dev/null; then
  echo "Decision comment published: ${count} tester-signed comment(s) created after ${SINCE}."
  exit 0
fi
echo "No tester-signed decision comment found created after ${SINCE} on #${PR}." >&2
exit 1
