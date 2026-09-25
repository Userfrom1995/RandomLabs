#!/usr/bin/env bash
#
# actor-write-gate.sh - Shared actor-permission preflight for every /oc-gated
# agent job (issue #428).
#
# Why this exists: the opencode CLI itself asserts that the TRIGGER ACTOR holds
# admin|write BEFORE its session starts on issue_comment,
# pull_request_review_comment, issues, and pull_request events (it calls
# GET /repos/{owner}/{repo}/collaborators/{actor}/permission and throws when
# the value is not in ["admin","write"], posting the raw error as a comment).
# On those comment-triggered jobs the CLI assert used to be the ONLY actor
# gate, and its failure mode was both noisy and launderable:
#
#   1. Noise: an unprivileged comment crashed the agent step with
#      "User <actor> does not have write permissions" posted as a comment,
#      while continue-on-error kept the job green.
#   2. Laundering: the crash-parity verify steps could not tell that pre-start
#      denial from a mid-stream provider crash, so they posted
#      "/oc <keyword> (auto-retry N)" with the OWNER PAT. The retry run's
#      github.actor is therefore the owner (admin), the CLI assert passes, and
#      the workflow executes the very run the unprivileged trigger was denied.
#
# This gate performs the identical permission check BEFORE the agent step, so a
# denied actor skips the job cleanly: no agent run, no noise comment, and no
# owner auto-retry (the verify steps below it treat the skip as a terminal
# third outcome - a denial is not a crash). Genuine mid-stream crashes from
# privileged triggers keep their existing bounded retries and escalation.
#
# Maintainer parity: this is the issue #427 maintainer preflight extracted into
# one shared gate (maintainer.yml keeps its own copy until PR #429 lands).
#
# Env inputs:
#   GATE_EVENT       required - github.event_name
#   GATE_ACTOR       required - github.actor
#   GATE_LABEL       optional - job label used in log messages (default "agent")
#   GH_TOKEN         token used to resolve the collaborator permission
#   GITHUB_REPOSITORY  owner/repo (provided by the runner)
#
# Outputs (appended to $GITHUB_OUTPUT):
#   run=true|false   false only when the actor demonstrably lacks admin|write.
#                    An empty value means the gate failed red instead.
#
# Exit codes:
#   0 - allowed (run=true) or denied (run=false); both are clean terminal states
#   1 - the permission could not be resolved (API failure or unknown actor):
#       fail red and loud rather than run blind or silently skip (parity with
#       the issue #427 maintainer preflight).

set -u

event="${GATE_EVENT:-}"
actor="${GATE_ACTOR:-}"
label="${GATE_LABEL:-agent}"
out="${GITHUB_OUTPUT:-/dev/null}"
repo="${GITHUB_REPOSITORY:-}"

fail() {
  echo "::error::actor-write-gate: $*"
  exit 1
}

[ -n "$event" ] || fail "GATE_EVENT is empty; refusing to run the $label agent blind."
[ -n "$actor" ] || fail "GATE_ACTOR is empty; refusing to run the $label agent blind."
[ -n "$repo" ] || fail "GITHUB_REPOSITORY is empty; refusing to run the $label agent blind."

case "$event" in
  schedule|workflow_dispatch|workflow_run)
    # No trigger-actor assert on these events: the CLI only asserts on
    # issue_comment / pull_request_review_comment / issues / pull_request, and
    # the agent step presents workflow_run to the CLI as workflow_dispatch.
    # Nothing to preflight - always allow.
    echo "run=true" >> "$out"
    echo "actor-write-gate: '$event' carries no trigger-actor assert; $label agent allowed."
    exit 0
    ;;
  issue_comment|pull_request_review_comment|issues|pull_request) ;;
  *)
    # Unknown event: the CLI refuses it outright ("Unsupported event type").
    # Fail red instead of guessing what the assert would have done.
    fail "event '$event' is not a trigger-actor-assert event and not an allowed schedule/dispatch event; refusing to run the $label agent blind."
    ;;
esac

# URL-encode the actor: 'github-actions[bot]' contains brackets.
enc=$(printf '%s' "$actor" | jq -sRr @uri)
perm=$(gh api "repos/${repo}/collaborators/${enc}/permission" --jq '.permission' 2>/dev/null) || perm=""

case "$perm" in
  admin|write)
    # Mirror of the CLI's own allow-list (["admin","write"]).
    echo "run=true" >> "$out"
    echo "actor-write-gate: actor '$actor' holds '$perm'; $label agent allowed."
    ;;
  "")
    # Unresolvable permission (API failure / 404): skipping silently would
    # recreate the green-but-no-op class this lab hunts, and running blind
    # would crash into a noise comment for exactly the actors that need
    # gating. Fail red and loud instead.
    fail "could not resolve the repository permission of actor '$actor'; refusing to run the $label agent blind (issue #428 gate)."
    ;;
  *)
    echo "run=false" >> "$out"
    echo "::notice::actor-write-gate: actor '$actor' holds '$perm' (not admin|write); skipping the $label agent (issue #428). A denial is not a crash: no agent run, no noise comment, and no owner auto-retry. Genuine mid-stream crashes from privileged triggers keep the bounded retry."
    ;;
esac

exit 0
