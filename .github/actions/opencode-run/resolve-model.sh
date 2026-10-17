#!/usr/bin/env bash
# resolve-model.sh - bounded model fallback ladder (issue #591).
#
# Problem: every lab arm shares one provider-side model pin. A provider
# retirement is unilateral, so the shared pin becomes a lab-wide outage (the
# Maintainer that would dispatch the repair dies with everyone else), and the
# Model-not-found death used to conclude runs hollow green. This script
# resolves the requested model against the live registry before the agent
# starts; the shared runner (opencode-run/action.yml plus maintainer.yml's
# inline copy) then retries the next rung once per rung on a provider
# "Model not found" and fails loudly when the whole ladder is dead.
#
# Inputs (env):
#   REQUESTED_MODEL    (required) the pinned model ref, e.g. opencode/foo-free
#   MODEL_LADDER_FILE  (optional) ordered fallback rungs; default is the
#                      model-ladder.txt sitting next to this script
#   MODEL_REGISTRY_URL (optional) live registry; default zen/v1/models
#
# Behavior:
#   1. Query the registry with bounded retries. A registry failure NEVER
#      blocks the run: it degrades to the requested model plus the full
#      (unverified) ladder, and the runtime per-rung retry still protects.
#   2. Requested model live  -> it leads; live free rungs follow (deduped).
#   3. Requested model dead  -> it is dropped (a retired ref only produces a
#      provider error comment) and the live free rungs lead instead.
#   4. Registry live but no candidate live -> exit 1 LOUDLY (the step fails;
#      the crash-parity verify steps decide retry/escalation).
#
# Outputs (via $GITHUB_OUTPUT when set):
#   model           first candidate (what the run uses directly)
#   candidates      space-separated ordered chain for the per-rung retry loop
#   resolution      requested | fallback | passthrough
#   requested_live  yes | no | unknown
#   rung_count      number of candidates in the chain
#
# Only ids matching ^opencode/[A-Za-z0-9._-]+$ ever reach the outputs, so the
# untrusted registry response can never inject shell text through a caller.

set -u

REQUESTED_MODEL="${REQUESTED_MODEL:-}"
MODEL_REGISTRY_URL="${MODEL_REGISTRY_URL:-https://opencode.ai/zen/v1/models}"

if [ -z "$REQUESTED_MODEL" ]; then
  echo "::error::resolve-model: REQUESTED_MODEL is empty; cannot resolve a model."
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_LADDER_FILE="${MODEL_LADDER_FILE:-$script_dir/model-ladder.txt}"

ladder=""
if [ -f "$MODEL_LADDER_FILE" ]; then
  ladder=$(sed -e 's/\r$//' "$MODEL_LADDER_FILE" \
    | grep -vE '^[[:space:]]*(#|$)' \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
    | grep -E '^opencode/[A-Za-z0-9._-]+$' || true)
else
  echo "::warning::resolve-model: ladder file '$MODEL_LADDER_FILE' not found; falling back to the requested model only."
fi

# Free-tier rungs only: a non-free rung would trip the CreditsError two-knob
# guard (R6) and can never be a valid fallback for this lab.
free_ladder="$(printf '%s\n' "$ladder" | grep -E -- '-free$' || true)"

# Registry lookup, bounded. Never fatal by itself: an unreachable registry
# degrades to requested + unverified ladder, and the runtime retry covers it.
registry=""
for attempt in 1 2 3; do
  registry=$(curl -fsS --connect-timeout 10 --max-time 20 "$MODEL_REGISTRY_URL" 2>/dev/null || true)
  if [ -n "$registry" ]; then
    break
  fi
  if [ "$attempt" -lt 3 ]; then
    echo "resolve-model: registry lookup attempt $attempt failed; retrying..." >&2
    sleep 3
  fi
done

candidates=""
append_candidate() {
  case " $candidates " in
    *" $1 "*) ;;
    *) candidates="${candidates:+$candidates }$1" ;;
  esac
}

resolution=""
requested_live="unknown"

if [ -z "$registry" ]; then
  echo "::warning::resolve-model: model registry unreachable after 3 attempts; passing through '$REQUESTED_MODEL' plus the unverified ladder. The runtime per-rung retry still covers a Model-not-found death."
  resolution="passthrough"
  append_candidate "$REQUESTED_MODEL"
  for rung in $free_ladder; do
    append_candidate "$rung"
  done
else
  live_ids=$(printf '%s' "$registry" \
    | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' \
    | sed -E 's/.*"id"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' \
    | grep -E '^[A-Za-z0-9._-]+$' || true)

  requested_missing="no"
  if printf '%s\n' "$live_ids" | grep -qxF "${REQUESTED_MODEL#opencode/}"; then
    requested_live="yes"
    resolution="requested"
    append_candidate "$REQUESTED_MODEL"
  else
    requested_live="no"
    requested_missing="yes"
  fi

  for rung in $free_ladder; do
    if printf '%s\n' "$live_ids" | grep -qxF "${rung#opencode/}"; then
      append_candidate "$rung"
    fi
  done

  if [ -z "$candidates" ]; then
    echo "::error::resolve-model: model ladder exhausted: '$REQUESTED_MODEL' is not live and no ladder rung is live. Checked rungs: ${free_ladder:-<empty>}. Re-verify https://opencode.ai/zen/v1/models and update the pin plus the ladder (Lab Engineer / owner intervention)."
    exit 1
  fi

  if [ "$requested_missing" = "yes" ]; then
    resolution="fallback"
    echo "::warning::resolve-model: requested model '$REQUESTED_MODEL' is not present in the live registry (provider retirement or pin drift); substituting the first live ladder rung."
  fi
fi

first="$(printf '%s' "$candidates" | awk '{print $1}')"
rung_count="$(printf '%s' "$candidates" | awk '{print NF}')"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "model=$first"
    echo "candidates=$candidates"
    echo "resolution=$resolution"
    echo "requested_live=$requested_live"
    echo "rung_count=$rung_count"
  } >> "$GITHUB_OUTPUT"
else
  echo "model=$first"
  echo "candidates=$candidates"
  echo "resolution=$resolution"
  echo "requested_live=$requested_live"
  echo "rung_count=$rung_count"
fi

echo "resolve-model: requested='$REQUESTED_MODEL' resolution='$resolution' candidates='$candidates'"
