#!/usr/bin/env bash
#
# silent-stall-audit.sh - Static regression checks for the issue #122 silent-stall
# hardening invariants (S1/S2/L1/L2), the R6 model free-tier guard, the R7
# review-restore ownership guard (PR #412 head rewind), the R8 vendored
# hardened runner guard, the R9 schedule/dispatch retry-parity guard
# (issue #422), the R10 PAT-step input-indirection guard, the R11
# post-agent PAT gate guard (both issue #422 residual hardening), the
# R12 actor-write gate guard (issue #428), the R13 bot-created triage
# parity guard (issue #450), the R14 heterogeneous-group queue-preservation
# guard (per-OS arms issue #594 plus the whole comment-triggered cohort issue
# #601), the R15 model fallback ladder guard (issue #591:
# provider model retirement / loud Model-not-found failure), the R16
# shallow-workspace PAT merge guard (issue #602: a depth-limited opencode CLI
# session fetch re-shallows the Maintainer checkout, and merge-base-dependent
# merge checks then fail closed and silently skip a linked workflow PR), and
# the R17 per-OS findings-report contract guard (issue #608: a PR-creating
# per-OS arm run turns the session's final message into the PR body and
# silently drops the findings report).
# Wired into auditor.yml as the R1-R17 matrix.
#
# Usage: silent-stall-audit.sh <path-to-opencode.yml> [health-issue-number]
# R1-R6 are scoped to <path-to-opencode.yml>; R7-R17 audit the whole tree
# (the review-restore guard, the vendored runner, every schedule/dispatch
# agent arm, dispatch-input indirection, the lab post-agent PAT gates, the
# shared actor-write gate, the per-OS arm queue plus the comment-triggered
# group cohort, the model fallback
# ladder, the PAT merge shallow-workspace guard, and the per-OS
# findings-report contract), so they trip on a bad
# curator.yml/auditor.yml/ideate.yml/lab.yml/maintainer.yml no matter which
# file the audit was pointed at.
# Exit code is always 0 so it never breaks the auditor run; failures are reported
# on stdout and (when a health issue number is supplied and GITHUB_TOKEN is set)
# posted as a comment to the lab-health board.

set -u

WF="${1:-.github/workflows/opencode.yml}"
HEALTH_ISSUE="${2:-}"
REPO="${GITHUB_REPOSITORY:-}"

pass=0
fail=0
report=""

# Bare-filename invocation (silent-stall-audit.sh opencode.yml) resolves to the
# real workflow, so R7's sibling lookup below finds opencode-review.yml too
# instead of false-failing on a path that never existed.
if [ ! -f "$WF" ] && [ -f ".github/workflows/$WF" ]; then
  WF=".github/workflows/$WF"
fi

check() {
  local name="$1" desc="$2" ok="$3"
  if [ "$ok" = "ok" ]; then
    pass=$((pass + 1))
    report="${report}
  [R1-R17 PASS] $name: $desc"
    echo "PASS  $name: $desc"
  else
    fail=$((fail + 1))
    report="${report}
  [R1-R17 FAIL] $name: $desc"
    echo "FAIL  $name: $desc"
  fi
}

if [ ! -f "$WF" ]; then
  echo "::error::opencode.yml not found at $WF"
  exit 0
fi

# [R1] Concurrency assertion, scoped to the file under audit ($WF): NO
# concurrency group IN THAT FILE may cancel in progress. This rule scans one
# file and claims nothing repo-wide; the deliberate superseding-only
# workflows (pages.yml deploys, tor-cli.yml CI) are named in AGENTS.md
# "Queued Execution" (ideate.yml queued with cancel-in-progress: false).
# Failures below therefore name the file they were found in.
cancel_true=$(grep -nE 'cancel-in-progress:\s*true' "$WF" || true)
if [ -z "$cancel_true" ]; then
  check "R1" "scan scope ${WF} only: no concurrency group sets cancel-in-progress: true (S2 non-cancellation)" "ok"
else
  check "R1" "scan scope ${WF}: cancel-in-progress: true found -> ${cancel_true} (violates S2)" "bad"
fi

# [R2] Self-heal cap: bounded K (must be a finite numeric cap, currently 2).
# Assert a bounded comparison AND a maintainer escalation branch exist.
heal_cap=$(grep -nE '\$heals"\s*-(lt|le)\s*[0-9]+' "$WF" || true)
heal_escalate=$(grep -nE '/oc maintainer' "$WF" | head -1 || true)
if [ -n "$heal_cap" ] && [ -n "$heal_escalate" ]; then
  check "R2" "bounded self-heal cap present (${heal_cap%:*}) with maintainer escalation (L1)" "ok"
else
  check "R2" "missing bounded self-heal cap or escalation branch (violates L1)" "bad"
fi

# [R3] No-fallback-to-zero: unreadable counter must escalate, never set heals=0.
# Assert the unreadable-counter branch posts /oc maintainer and that there is no
# assignment `heals=0` anywhere.
unreadable_escalate=$(grep -nE 'Could not enumerate prior auto-heals' "$WF" || true)
heals_zero=$(grep -nE 'heals=0' "$WF" || true)
if [ -n "$unreadable_escalate" ] && [ -z "$heals_zero" ]; then
  check "R3" "unreadable counter escalates to /oc maintainer; no heals=0 fallback (phantom-zero guard)" "ok"
else
  check "R3" "unreadable-counter escalation missing or heals=0 fallback present (violates R3)" "bad"
fi

# [R4] Mutual exclusion: self-heal step shares the verify-retry guard.
guard=$(grep -nE "steps\.verify\.outputs\.retry != 'true'" "$WF" || true)
if [ -n "$guard" ]; then
  check "R4" "self-heal/verify mutual-exclusion guard present (${guard%:*}) (L2)" "ok"
else
  check "R4" "missing steps.verify.outputs.retry != 'true' guard (violates L2)" "bad"
fi

# [R5] Decision-file fallback: missing decision file must route to /oc maintainer.
no_file=$(grep -nE 'No decision file found' "$WF" || true)
if [ -n "$no_file" ]; then
  check "R5" "missing decision file falls back to /oc maintainer (no stall) (${no_file%:*})" "ok"
else
  check "R5" "missing decision-file fallback to /oc maintainer not found (violates R5)" "bad"
fi

# [R6] Model free-tier compliance: all model pins must be free-tier (issue #130 free-tier model guard).
# Every `model:` in opencode.yml and both knobs in opencode.json must end in `-free`
# to avoid CreditsError (workspace billing requires payment method for paid models).
# This catches drift where a workflow or opencode.json points at a paid model.
model_lines=$(grep -nE 'model:\s*opencode/' "$WF" 2>/dev/null || true)
non_free_models=$(echo "$model_lines" | grep -vE 'opencode/[^ ]*-free$' || true)
json_models=""
if [ -f "opencode.json" ]; then
  json_model=$(jq -r '.model // empty' opencode.json 2>/dev/null || echo "")
  json_small=$(jq -r '.small_model // empty' opencode.json 2>/dev/null || echo "")
  json_models="${json_model} ${json_small}"
fi
json_non_free=""
for jm in $json_models; do
  if [ -n "$jm" ] && ! echo "$jm" | grep -qE -- '-free$'; then
    json_non_free="${json_non_free} $jm"
  fi
done
if [ -z "$non_free_models" ] && [ -z "$(echo "$json_non_free" | tr -d ' ')" ]; then
  if [ -n "$model_lines" ]; then
    check "R6" "all workflow model pins and opencode.json knobs are free-tier (${model_lines%%:*} free)" "ok"
  else
    check "R6" "no opencode/ model pins found in $WF (skip)" "ok"
  fi
else
  detail=""
  [ -n "$non_free_models" ] && detail="workflow: ${non_free_models}"
  [ -n "$(echo "$json_non_free" | tr -d ' ')" ] && detail="${detail} json:${json_non_free}"
  check "R6" "non-free model pin found -> ${detail} (violates free-tier model guard)" "bad"
fi

# [R7] Review-restore ownership gate (PR #412 head-rewind regression): the
# opencode-review restore step may only undo a head movement made from its own
# workspace, and must push with a lease. The pre-fix version force-pushed the
# snapshot captured at run START, so any push that landed while a review was
# still running (Fixer, Builder, owner) was silently reverted when the run
# ended - that is exactly how PR #412 lost 13 Fixer commits.
# The gate needs FIVE properties: a local-ref ownership test, a lease, the
# pre-push marker, a marker that records the PUSHED COMMIT (marker_sha) which
# must equal the live head, and an unbroken push chain (chain_ok) proving no
# external commit sits between the checked-out head and the live head - an
# existence-only marker or a marker without the chain survives a later
# external push and still rewinds it (Y2/Z2). A bare force push is banned
# outright.
# The marker closes the proxy hole: a local ref alone is advanced by a plain
# `git pull --ff-only` / `git reset --hard origin/<b>` that never pushed, so
# ref movement by itself still rewinds external work.
REVIEW_WF="$(dirname "$WF")/opencode-review.yml"
if [ ! -f "$REVIEW_WF" ] && [ -f ".github/workflows/opencode-review.yml" ]; then
  REVIEW_WF=".github/workflows/opencode-review.yml"
fi
restore_block=""
if [ -f "$REVIEW_WF" ]; then
  restore_block=$(sed -n '/- name: Restore PR head/,/^      - name: /p' "$REVIEW_WF" 2>/dev/null || true)
fi
if [ -z "$restore_block" ]; then
  check "R7" "restore step missing or renamed in ${REVIEW_WF} (head-rewind guard lost)" "bad"
else
  owns_local=$(printf '%s\n' "$restore_block" | grep -c 'rev-parse --verify "refs/heads/' || true)
  # Explicit lease form: `--force-with-lease=refs/heads/<branch>:<expected>`.
  # A bare `--force-with-lease` fails safe but would never restore, so it does
  # not satisfy the rule.
  leased=$(printf '%s\n' "$restore_block" | grep -cE -- '--force-with-lease="?refs/heads/' || true)
  marker=$(printf '%s\n' "$restore_block" | grep -c 'review-workspace-pushed' || true)
  marker_sha=$(printf '%s\n' "$restore_block" | grep -c 'marker_sha' || true)
  # Unbroken push chain: the marker's first push must start at the checked-out
  # head, each push must link to the previous one, and the last pushed commit
  # must be the live head - otherwise an external commit this workspace pulled
  # and pushed on top of is silently rewound (Y2/Z2).
  chain=$(printf '%s\n' "$restore_block" | grep -c 'chain_ok' || true)
  # Bare force push in any argument order: `git push --force origin`,
  # `git push origin --force`, or a trailing bare `git push --force`.
  bare_force=$(printf '%s\n' "$restore_block" | grep -cE 'git push[^|&;]*--force([^-]|$)' || true)
  if [ "$owns_local" -gt 0 ] && [ "$leased" -gt 0 ] && [ "$marker" -gt 0 ] && [ "$marker_sha" -gt 0 ] && [ "$chain" -gt 0 ] && [ "$bare_force" -eq 0 ]; then
    check "R7" "review restore gates on an unbroken chain of this workspace's own pushes up to the live head (marker commit == live head + local ref) and pushes with an explicit lease (PR #412 rewind guard)" "ok"
  else
    check "R7" "restore step in ${REVIEW_WF} missing local-ref ownership test (=${owns_local}), lease (=${leased}), push marker (=${marker}), marker commit check (=${marker_sha}), push chain (=${chain}), or force-pushes bare (=${bare_force})" "bad"
  fi
fi

# [R8] Vendored hardened runner (issue #422 A): every agent arm must run
# opencode through the in-repo composite action, never through the third-party
# anomalyco/opencode/github@latest, whose version step aborts the whole run
# (anonymous releases-API rate limit under `bash -e -o pipefail`) before the
# agent ever starts. The vendored step must keep all four hardening markers.
ACTION_FILE=".github/actions/opencode-run/action.yml"
# Scan all of .github/ (not just .github/workflows): a reintroduction under
# .github/actions/ or .github/agents/ must trip this rule just the same.
# The pattern requires whitespace after `uses:` so this script's own
# documentation of the pattern cannot match itself.
upstream_refs=$(grep -rnE 'uses:[[:space:]]+.*anomalyco/opencode' .github 2>/dev/null || true)
if [ -n "$upstream_refs" ]; then
  check "R8" "external anomalyco/opencode action still referenced -> $(echo "$upstream_refs" | head -3 | tr '\n' ' ') (issue #422 A: version step can abort the run before the agent starts)" "bad"
elif [ ! -f "$ACTION_FILE" ]; then
  check "R8" "vendored runner missing at ${ACTION_FILE} (issue #422 A)" "bad"
else
  missing=""
  grep -q 'Authorization: Bearer' "$ACTION_FILE" || missing="${missing} authenticated-lookup"
  grep -q 'VERSION:-latest' "$ACTION_FILE" || missing="${missing} version-fallback"
  grep -qE '\|\|[[:space:]]*true' "$ACTION_FILE" || missing="${missing} pipefail-guard"
  grep -q 'continue-on-error: true' "$ACTION_FILE" || missing="${missing} continue-on-error"
  if [ -z "$missing" ]; then
    check "R8" "vendored runner is in-repo and hardened (auth + fallback + pipefail guard + continue-on-error)" "ok"
  else
    check "R8" "vendored runner lost hardening marker(s):${missing} in ${ACTION_FILE} (issue #422 A)" "bad"
  fi
fi

# [R9] Schedule/dispatch retry parity (issue #422 B): every schedule- or
# dispatch-only agent arm must own the bounded self-heal instead of failing
# closed and burning a whole cron cycle (curator: 6h, auditor: 24h). Cohort:
#   curator.yml  schedule (6h) + dispatch  - the burn that triggered the audit
#   auditor.yml  schedule (24h) + dispatch
#   ideate.yml   dispatch arm (its issue_comment arm stays fail-closed)
#   lab.yml      dispatch arm (must forward issue_number to the retry run)
# opencode-recover.yml is deliberately out of cohort: its schedule/dispatch
# arms run the fully scripted detect job (no agent; the 20-minute detector is
# its own retry loop) and its agent arm is issue_comment-only with a scripted
# fallback step.
SELFHEAL_SCRIPT=".github/scripts/schedule-selfheal.sh"
r9_bad=""
for r9_wf in curator.yml auditor.yml ideate.yml lab.yml; do
  r9_path=".github/workflows/${r9_wf}"
  if [ ! -f "$r9_path" ]; then
    r9_bad="${r9_bad} ${r9_wf}(missing)"
    continue
  fi
  grep -q 'schedule-selfheal\.sh' "$r9_path" || r9_bad="${r9_bad} ${r9_wf}(no-selfheal-call)"
  grep -q 'selfheal_retry:' "$r9_path" || r9_bad="${r9_bad} ${r9_wf}(no-selfheal_retry-input)"
done
if [ ! -f "$SELFHEAL_SCRIPT" ]; then
  r9_bad="${r9_bad} schedule-selfheal.sh(missing)"
else
  grep -qE '^MAX_RETRIES=[0-9]+' "$SELFHEAL_SCRIPT" || r9_bad="${r9_bad} script(no-bounded-cap)"
  # The cap must also be SMALL: `MAX_RETRIES=999` is a "bounded" infinite
  # loop, so keep the hard ceiling at 3.
  r9_cap=$(grep -oE '^MAX_RETRIES=[0-9]+' "$SELFHEAL_SCRIPT" | head -1 | cut -d= -f2)
  if [ -n "$r9_cap" ] && [ "$r9_cap" -gt 3 ] 2>/dev/null; then
    r9_bad="${r9_bad} script(cap-${r9_cap}-exceeds-3)"
  fi
  grep -q '/oc maintainer' "$SELFHEAL_SCRIPT" || r9_bad="${r9_bad} script(no-maintainer-escalation)"
  grep -q 'refusing to fall back to 0' "$SELFHEAL_SCRIPT" || r9_bad="${r9_bad} script(no-phantom-zero-guard)"
fi
if [ -z "$r9_bad" ]; then
  check "R9" "schedule/dispatch arms (curator/auditor/ideate/lab) wired to bounded self-heal with maintainer escalation" "ok"
else
  check "R9" "schedule/dispatch retry parity missing:${r9_bad} (issue #422 B: a crash burns the whole cron cycle)" "bad"
fi

# [R10] Expression-injection guard (issue #422 residual): a free-form input
# (workflow_dispatch `inputs.*`, legacy `github.event.inputs.*`) or untrusted
# event text (comment body, issue/PR title or body, head branch) must NEVER be
# interpolated as `${{ }}` text inside a `run:` block. GitHub substitutes
# expressions into the SCRIPT SOURCE before bash parses it, so a double quote
# in the input escapes the surrounding quotes and executes as a command inside
# a step that may carry the owner PAT - a repo-write credential escalating to
# the owner identity (B3 repro: selfheal_retry='0"; touch /tmp/PWNED; echo "'
# ran the touch). The required pattern is env indirection: declare the value
# under `env:` and reference it as "$VAR" (repo standard: maintainer.yml
# OC_TARGET, poolduel-m1 TARGET_REF). The scan covers every `run:` form -
# named steps, list-style `- run:` steps, multi-line `run: |` blocks, and the
# composite action's `runs:` - and the cohort must additionally still MAP the
# indirection values, so a call site can never silently read an empty counter.
r10_bad=""
for r10_file in .github/workflows/*.yml .github/actions/*/action.yml; do
  [ -f "$r10_file" ] || continue
  r10_hits=$(awk '
    function gi(s) { match(s, /^[ \t]*/); return RLENGTH }
    function unsafe() {
      return ($0 ~ /\$\{[^}]*inputs[.]/ ||
              $0 ~ /\$\{[^}]*event[.](comment[.]body|issue[.]title|issue[.]body|pull_request[.]title|pull_request[.]body|workflow_run[.]head_branch)/ ||
              $0 ~ /\$\{[^}]*github[.]head_ref/)
    }
    FNR == 1 { inrun = 0 }
    {
      if (inrun && $0 !~ /^[ \t]*$/) {
        if (gi($0) <= runindent) { inrun = 0 }
        else {
          if (unsafe()) print FILENAME ":" FNR ": " $0
          next
        }
      }
      if ($0 ~ /^[ \t]*(-[ \t]+)?run:[ \t]*\|/) {
        match($0, /^[ \t]*(-[ \t]+)?[ \t]*/)
        runindent = RLENGTH
        inrun = 1
        next
      }
      if ($0 ~ /^[ \t]*(-[ \t]+)?run:[ \t]*[^|]/ && unsafe()) print FILENAME ":" FNR ": " $0
    }' "$r10_file")
  if [ -n "$r10_hits" ]; then
    r10_bad="${r10_bad}
$(echo "$r10_hits" | head -5)"
  fi
done
for r10_wf in curator.yml auditor.yml ideate.yml lab.yml; do
  r10_path=".github/workflows/${r10_wf}"
  if [ ! -f "$r10_path" ]; then
    r10_bad="${r10_bad} ${r10_wf}(missing)"
    continue
  fi
  grep -q 'SELFHEAL_RETRY: \${{ inputs\.selfheal_retry }}' "$r10_path" || r10_bad="${r10_bad} ${r10_wf}(no-SELFHEAL_RETRY-env-mapping)"
done
if [ -z "$r10_bad" ]; then
  check "R10" "no free-form input or untrusted event text interpolated into any run: block; cohort verify steps map SELFHEAL_RETRY via env (env indirection everywhere)" "ok"
else
  check "R10" "expression injection in run block(s):${r10_bad} (move the value to env: and read it as a shell variable)" "bad"
fi

# [R11] Post-agent PAT gates (issue #422 residual): lab.yml's owner-PAT strip
# (filter-branch over the PR branch) and push (branch push + PR open) steps
# must run only when the agent finished its contract, i.e. the decision file
# exists. They used to run under a bare `if: always()`, so a crashed run (no
# decision file) still rewrote and pushed the branch from partial state.
LAB_WF=".github/workflows/lab.yml"
r11_bad=""
if [ ! -f "$LAB_WF" ]; then
  r11_bad=" lab.yml(missing)"
else
  grep -q 'id: decision-gate' "$LAB_WF" || r11_bad="${r11_bad} lab.yml(no-decision-gate-step)"
  gate_block=$(grep -A8 -F -- "id: decision-gate" "$LAB_WF" || true)
  if ! echo "$gate_block" | grep -q 'random-lab-decision\.json'; then
    r11_bad="${r11_bad} lab.yml(decision-gate-ignores-decision-file)"
  fi
  for r11_name in "Strip owner Co-authored-by trailers from the PR branch" "Push PR branch or direct model updates (PAT-backed)"; do
    step_if=$(grep -A8 -F -- "- name: ${r11_name}" "$LAB_WF" | grep -m1 -E '^[[:space:]]*if:' || true)
    case "$step_if" in
      *"steps.decision-gate.outputs.present == 'true'"*) ;;
      *) r11_bad="${r11_bad} lab.yml(step-not-decision-gated:$(echo "$r11_name" | cut -d' ' -f1-2))" ;;
    esac
  done
fi
if [ -z "$r11_bad" ]; then
  check "R11" "lab.yml strip and push PAT steps are gated on the written decision file (crashed runs never push)" "ok"
else
  check "R11" "post-agent PAT gate missing:${r11_bad} (issue #422 residual: an ungated always() push ships partial state from crashed runs)" "bad"
fi

# [R12] Actor write gate (issue #428): every /oc-gated agent workflow (any
# workflow that runs the in-repo opencode-run composite action) must fail
# closed behind the shared actor-write gate BEFORE its agent step, so an
# unprivileged issue_comment / PR comment can never launch an agent and never
# reaches an owner-PAT auto-retry arm - the auto-retry re-posts the trigger as
# the owner (admin), which LAUNDERS the unprivileged actor past the CLI's
# write-permission assert and burns a noise comment on the first attempt.
# Per-file, two properties: the gate script is invoked, and every agent step
# is wired to its `steps.actor_gate.outputs.run` output; the gate-step count
# must also cover the agent-step count so a newly added agent job without its
# own gate trips the rule. maintainer.yml is deliberately out of cohort: it
# invokes `opencode github run` directly (not the composite action), and its
# own inline actor permission preflight is still pending in issue #427 /
# PR #429 - until it lands the maintainer arm relies on the CLI assert alone.
r12_bad=""
for r12_path in .github/workflows/*.yml; do
  [ -f "$r12_path" ] || continue
  r12_name=$(basename "$r12_path")
  # Anchored to a real `uses:` line so #430's restore-step comment (which
  # quotes `uses: ./.github/actions/opencode-run` in prose) never counts as
  # an agent step and double-inflates the agent side of the comparison.
  r12_agents=$(grep -c '^[[:space:]]*uses: \./\.github/actions/opencode-run' "$r12_path" || true)
  [ "$r12_agents" -gt 0 ] || continue
  if ! grep -q 'actor-write-gate\.sh' "$r12_path"; then
    r12_bad="${r12_bad} ${r12_name}(no-gate-script)"
    continue
  fi
  if ! grep -q "steps\.actor_gate\.outputs\.run" "$r12_path"; then
    r12_bad="${r12_bad} ${r12_name}(no-gate-wiring)"
    continue
  fi
  r12_gates=$(grep -c 'bash \.github/scripts/actor-write-gate\.sh' "$r12_path" || true)
  if [ "$r12_gates" -lt "$r12_agents" ]; then
    r12_bad="${r12_bad} ${r12_name}(gates=${r12_gates}<agents=${r12_agents})"
  fi
done
if [ -z "$r12_bad" ]; then
  check "R12" "every opencode-run agent workflow invokes the shared actor-write gate and wires its agent steps to the gate output" "ok"
else
  check "R12" "actor-write gate coverage missing:${r12_bad} (issue #428: an unprivileged comment can launch an agent and its owner-PAT retry launders the actor)" "bad"
fi

# [R13] Bot-created triage parity (issue #450): content created with
# GITHUB_TOKEN never emits issues/pull_request opened events, so a
# bot-created issue sat untriaged for ~3h until a human pinged it (#449).
# Two properties: maintainer.yml's create_issue path must self-dispatch a
# workflow_dispatch maintainer run carrying the new issue number (PAT-backed,
# since the bot token's own runs complete silently), and the Maintainer prompt
# must carry the UNTRIAGED sweep rule so any later run routes stragglers even
# if the self-dispatch misfires.
r13_bad=""
MAIN_WF=".github/workflows/maintainer.yml"
MAINT_PROMPT=".github/agents/maintainer.md"
if [ ! -f "$MAIN_WF" ]; then
  r13_bad=" maintainer.yml(missing)"
else
  grep -q 'SELF-TRIAGE (issue #450)' "$MAIN_WF" || r13_bad="${r13_bad} maintainer.yml(no-self-triage-marker)"
  grep -q 'gh.*workflow.*run.*maintainer.yml' "$MAIN_WF" || r13_bad="${r13_bad} maintainer.yml(no-maintainer-redispatch)"
fi
if [ ! -f "$MAINT_PROMPT" ]; then
  r13_bad="${r13_bad} maintainer.md(missing)"
elif ! grep -q 'UNTRIAGED' "$MAINT_PROMPT"; then
  r13_bad="${r13_bad} maintainer.md(no-UNTRIAGED-sweep-rule)"
fi
if [ -z "$r13_bad" ]; then
  check "R13" "bot-created issues/PRs self-dispatch maintainer triage and the prompt sweeps UNTRIAGED stragglers" "ok"
else
  check "R13" "bot-created triage parity missing:${r13_bad} (issue #450: a bot-created issue idles with no opened event until a human pings it)" "bad"
fi

# [R14] Heterogeneous group queue preservation (issues #594, #601): a group
# that serializes heterogeneous work (real triggers together with runs that
# skip at their job gate) must not rely on the default single pending slot,
# because GitHub cancels any previously PENDING run in the same group when a
# newer run is queued (cancel-in-progress: false protects only the RUNNING
# run). Two live losses: the per-OS Windows arm of #582 (run 39021803178 had
# zero jobs, issue #594) and the forwarded /oc review on PR #593 (run
# 39028030013) plus the forwarded /oc fix on PR #592 (run 39028202649), each
# displaced by a skip-only comment run landing behind it (issue #601).
# Every comment-triggered workflow whose issue_comment arm spawns a run for
# EVERY comment must carry `queue: max` on its workflow-level group: opencode,
# opencode-review, opencode-test, opencode-eval, lab, ideate, curator,
# auditor, opencode-recover, plus opencode-peros-test for the per-OS arms
# (whose three job-level per-OS groups must also exist; a workflow-level
# block may be absent there because the job groups alone serialize each arm).
# maintainer.yml is deliberately OUT of the cohort: its triggers are
# homogeneous (every run re-surveys fresh, the newest state wins) and a queue
# there would accumulate a FIFO backlog of stale schedule ticks, so it must
# keep its explicit "superseding by design" marker and must NOT grow a queue.
# No cohort group may cancel in progress.
# Workflow-level block = the column-0 `concurrency:` mapping. A same-name
# job-level `concurrency:` is indented, so it never matches the anchor. Any
# column-0 line ends the mapping, including a comment: otherwise a top-level
# comment after the block containing the marker text would satisfy the
# maintainer/discovery checks even after the in-block marker was removed
# (issue #601 review finding 2).
wf_concurrency_block() {
  awk '
    /^concurrency:/ { inblk=1 }
    inblk && /^[^[:space:]]/ && !/^concurrency:/ { exit }
    inblk { print }
  ' "$1" || true
}
PEROS_WF=".github/workflows/opencode-peros-test.yml"
r14_bad=""
if [ ! -f "$PEROS_WF" ]; then
  r14_bad=" ${PEROS_WF}(missing)"
else
  peros_wf_block=$(wf_concurrency_block "$PEROS_WF")
  if [ -n "$peros_wf_block" ] && ! printf '%s\n' "$peros_wf_block" | grep -qE '^[[:space:]]+queue:[[:space:]]*"?max"?'; then
    r14_bad="${r14_bad} peros(workflow-group-without-queue-max)"
  fi
  for peros_os in linux macos windows; do
    grep -q "opencode-peros-${peros_os}-" "$PEROS_WF" || r14_bad="${r14_bad} peros(no-${peros_os}-job-group)"
  done
  peros_cancel_true=$(grep -nE 'cancel-in-progress:\s*true' "$PEROS_WF" || true)
  [ -n "$peros_cancel_true" ] && r14_bad="${r14_bad} peros(cancel-in-progress-true)"
fi
for r14_wf in opencode.yml opencode-review.yml opencode-test.yml opencode-eval.yml lab.yml ideate.yml curator.yml auditor.yml opencode-recover.yml; do
  r14_path=".github/workflows/${r14_wf}"
  if [ ! -f "$r14_path" ]; then
    r14_bad="${r14_bad} ${r14_wf}(missing)"
    continue
  fi
  r14_block=$(wf_concurrency_block "$r14_path")
  if [ -z "$r14_block" ]; then
    r14_bad="${r14_bad} ${r14_wf}(no-workflow-group)"
  elif ! printf '%s\n' "$r14_block" | grep -qE '^[[:space:]]+queue:[[:space:]]*"?max"?'; then
    r14_bad="${r14_bad} ${r14_wf}(no-queue-max)"
  fi
  r14_cancel_true=$(grep -nE 'cancel-in-progress:\s*true' "$r14_path" || true)
  [ -n "$r14_cancel_true" ] && r14_bad="${r14_bad} ${r14_wf}(cancel-in-progress-true)"
done
if [ ! -f "$MAIN_WF" ]; then
  r14_bad="${r14_bad} maintainer.yml(missing)"
else
  main_block=$(wf_concurrency_block "$MAIN_WF")
  printf '%s\n' "$main_block" | grep -qF 'superseding by design' || r14_bad="${r14_bad} maintainer.yml(no-superseding-decision-marker)"
  # Anchored to the key form so the marker comment's own prose (which mentions
  # queue: max while explaining why it is wrong there) never trips the check.
  printf '%s\n' "$main_block" | grep -qE '^[[:space:]]+queue:[[:space:]]*"?max"?' && r14_bad="${r14_bad} maintainer.yml(queue-max-contradicts-superseding-decision)"
fi
# Discovery backstop (R12-style whole-tree scan): EVERY workflow that grows an
# issue_comment or pull_request_review_comment arm is subject to the same rule
# automatically, so a new comment-triggered workflow cannot silently regress;
# the scan covers both workflow extensions GitHub executes (.yml and .yaml,
# issue #601 review finding 3), and a deliberate homogeneous single-slot group
# records the explicit "superseding by design" marker inside its concurrency
# block.
for r14_path in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$r14_path" ] || continue
  r14_name=$(basename "$r14_path")
  grep -qE '^  (issue_comment|pull_request_review_comment):' "$r14_path" || continue
  r14_block=$(wf_concurrency_block "$r14_path")
  if printf '%s\n' "$r14_block" | grep -qF 'superseding by design'; then
    continue
  fi
  if [ -z "$r14_block" ]; then
    r14_bad="${r14_bad} ${r14_name}(discovered-no-workflow-group)"
  elif ! printf '%s\n' "$r14_block" | grep -qE '^[[:space:]]+queue:[[:space:]]*"?max"?'; then
    r14_bad="${r14_bad} ${r14_name}(discovered-no-queue-max)"
  fi
done
if [ -z "$r14_bad" ]; then
  check "R14" "heterogeneous groups cannot silently displace a queued real run: the whole comment-triggered cohort (plus any discovered issue_comment workflow) carries queue: max, all three per-OS job groups exist, and maintainer keeps its documented single-slot superseding decision (issues #594/#601)" "ok"
else
  check "R14" "heterogeneous group queue preservation missing:${r14_bad} (issues #594/#601: the default single pending slot cancels a queued real run)" "bad"
fi

# [R15] Model fallback ladder (issue #591): a provider-side retirement of the
# shared model pin used to kill every arm at once (including the Maintainer
# that would dispatch the repair), and Model-not-found deaths concluded their
# runs green (hollow green: `continue-on-error` plus no verify step), so
# workflow_run failure triage never fired. Properties:
#   1. the shared resolver exists and resolves against the live registry,
#      defaulting to the ladder file next to it, and degrades to pass-through
#      on a registry outage or an unparseable registry body (never blocks);
#   2. the ordered ladder exists, is non-empty, and every rung is a
#      free-tier model ref (a paid rung would trip the R6 free-tier guard);
#   3. the shared composite action calls the resolver, retries per rung on a
#      boundary-aware provider "Model not found" match (prose quoting a
#      different retired id must never advance the ladder), anchors the
#      exit-0 decision to the provider's terminal error line in the log tail
#      so a transcript echo of the phrase never advances a healthy run,
#      fails loudly when the log capture itself fails, and exits nonzero
#      after the last rung;
#   4. maintainer.yml (the arm that would otherwise dispatch the repair)
#      invokes the resolver, wires the candidate chain, carries the same
#      boundary-aware retry, exit-0 terminal anchoring, and tee-guard, and
#      has the verify step that tests for .maintainer/decision.json and goes
#      red without it;
#   5. the general arm (which had no verify step) carries its loud-failure
#      verify, and maintainer.yml plus the composite still expose the
#      loud-exhaustion marker.
r15_bad=""
LADDER_DIR=".github/actions/opencode-run"
RESOLVER="${LADDER_DIR}/resolve-model.sh"
LADDER_FILE="${LADDER_DIR}/model-ladder.txt"
if [ ! -f "$RESOLVER" ]; then
  r15_bad="${r15_bad} resolver(missing)"
else
  grep -q 'zen/v1/models' "$RESOLVER" || r15_bad="${r15_bad} resolver(no-live-registry-lookup)"
  grep -q 'model-ladder\.txt' "$RESOLVER" || r15_bad="${r15_bad} resolver(no-ladder-default)"
  grep -qF 'no parseable model ids' "$RESOLVER" || r15_bad="${r15_bad} resolver(no-unparseable-registry-passthrough)"
fi
if [ ! -f "$LADDER_FILE" ]; then
  r15_bad="${r15_bad} ladder-file(missing)"
else
  r15_rungs=$(grep -vE '^[[:space:]]*(#|$)' "$LADDER_FILE" || true)
  if [ -z "$r15_rungs" ]; then
    r15_bad="${r15_bad} ladder-file(empty)"
  fi
  if printf '%s\n' "$r15_rungs" | grep -vqE '^opencode/[A-Za-z0-9._-]+-free$'; then
    r15_bad="${r15_bad} ladder-file(non-free-or-malformed-rung)"
  fi
fi
if [ ! -f "$ACTION_FILE" ]; then
  r15_bad="${r15_bad} action-file(missing)"
else
  grep -qF 'bash "$script"' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-resolver-invocation)"
  grep -qF 'Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-boundary-aware-per-rung-retry)"
  grep -qF 'if [ "$tee_status" -ne 0 ]' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-log-capture-failure-guard)"
  grep -qF 'model_error_terminal()' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-exit-0-terminal-detector)"
  grep -qF 'if ! model_error_terminal "$log" "$model"; then' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(exit-0-not-terminal-anchored)"
  grep -qF 'tail -n 40 "$1" | grep -qE' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(exit-0-detector-not-tail-scoped)"
  grep -qF 'Model not found: ${2//./\\.}(\. Did you mean: .*|\.?$)' "$ACTION_FILE" || r15_bad="${r15_bad} action-file(no-anchored-terminal-error-form)"
  grep -A1 'exhausted every model rung' "$ACTION_FILE" | grep -q 'exit 1' || r15_bad="${r15_bad} action-file(loud-exhaustion-not-exit-1)"
fi
if [ ! -f "$MAIN_WF" ]; then
  r15_bad="${r15_bad} maintainer.yml(missing)"
else
  grep -qF 'bash .github/actions/opencode-run/resolve-model.sh' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-resolver-invocation)"
  grep -q 'MODEL_CANDIDATES' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-candidate-chain)"
  grep -qF 'Model not found: ${model//./\\.}([^A-Za-z0-9_-]|$)' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-boundary-aware-per-rung-retry)"
  grep -qF 'if [ "$tee_status" -ne 0 ]' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-log-capture-failure-guard)"
  grep -qF 'model_error_terminal()' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-exit-0-terminal-detector)"
  grep -qF 'if ! model_error_terminal "$log" "$model"; then' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(exit-0-not-terminal-anchored)"
  grep -qF 'tail -n 40 "$1" | grep -qE' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(exit-0-detector-not-tail-scoped)"
  grep -qF 'Model not found: ${2//./\\.}(\. Did you mean: .*|\.?$)' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-anchored-terminal-error-form)"
  grep -qF '.maintainer/decision.json' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-decision-contract-test)"
  grep -q 'id: verify_agent' "$MAIN_WF" || r15_bad="${r15_bad} maintainer.yml(no-loud-verify)"
  grep -A1 'exhausted every model rung' "$MAIN_WF" | grep -q 'exit 1' || r15_bad="${r15_bad} maintainer.yml(loud-exhaustion-not-exit-1)"
fi
OPENCODE_WF=".github/workflows/opencode.yml"
if [ ! -f "$OPENCODE_WF" ]; then
  r15_bad="${r15_bad} opencode.yml(missing)"
else
  if ! grep -q 'Verify general agent completed' "$OPENCODE_WF"; then
    r15_bad="${r15_bad} opencode.yml(general-arm-no-loud-verify)"
  fi
  grep -A2 'General agent step finished' "$OPENCODE_WF" | grep -q 'exit 1' || r15_bad="${r15_bad} opencode.yml(general-verify-not-exit-1)"
fi
if [ -z "$r15_bad" ]; then
  check "R15" "model fallback ladder wired: live-registry resolver + free-tier ladder rungs + boundary-aware per-rung retry with exit-0 terminal anchoring, a log-capture guard, and loud exhaustion in the shared runner and the maintainer inline path, with loud-failure verify steps on the Maintainer and general arm (issue #591)" "ok"
else
  check "R15" "model fallback ladder missing:${r15_bad} (issue #591: one retired pin kills every arm at once and Model-not-found deaths conclude green)" "bad"
fi

# [R16] Shallow-workspace PAT merge guard (issue #602): the PAT-backed merge
# sweep proves a workflow-touching PR shares history with main using
# merge-base-dependent commands (the three-dot workflow diff and the orphan
# guard). On a shallow workspace both fail closed: the three-dot diff exits
# "no merge base" (the PR is skipped as not touching workflows) and the orphan
# guard reads a linked PR as unrelated, so the merge is silently skipped with
# no error and no red run - and workflow-file PRs can only land through this
# PAT path (issue #283 class). The opencode CLI session bootstrap itself
# re-shallows the full-depth checkout: its PR checkout path fetches with
# --depth=max(commits,20) and its PR-create precheck falls back to --depth=1
# (verified against the installed CLI), and a depth-limited fetch into a full
# clone records a new shallow boundary. Properties:
#   1. the merge step detects the shallow state and restores full history
#      BEFORE its first merge-base-dependent command (ordering is checked
#      structurally, not just by marker presence);
#   2. the strict orphan check is retained at BOTH sites (a single-site flip
#      to fail-open `-n` must trip the rule, so the count of strict `-z`
#      checks is asserted and any `-n` merge-base check is banned);
#   3. a workspace still shallow after the unshallow attempt warns loudly
#      instead of skipping silently (the conditional detection line must
#      appear for both the outer guard and the inner re-check, so replacing
#      either with an unconditional `if true` trips the rule).
r16_bad=""
if [ ! -f "$MAIN_WF" ]; then
  r16_bad=" maintainer.yml(missing)"
else
  pat_block=$(sed -n '/- name: PAT-backed merge for approved workflow-touching PRs/,/^      - name: /p' "$MAIN_WF" 2>/dev/null || true)
  if [ -z "$pat_block" ]; then
    r16_bad="${r16_bad} maintainer.yml(pat-merge-step-missing-or-renamed)"
  else
    # The exact conditional detection line must appear TWICE: the outer guard
    # and the post-attempt still-shallow re-check. A weakened outer `if true`
    # leaves only the inner occurrence; removing detection entirely leaves
    # none.
    r16_detect=$(printf '%s\n' "$pat_block" | grep -cF 'if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = "true" ]; then' || true)
    [ "$r16_detect" -ge 2 ] || r16_bad="${r16_bad} maintainer.yml(shallow-detection-count=${r16_detect},want>=2)"
    printf '%s\n' "$pat_block" | grep -qE 'git fetch origin main[[:space:]]+--unshallow' || r16_bad="${r16_bad} maintainer.yml(no-unshallow-fetch)"
    printf '%s\n' "$pat_block" | grep -qF 'still shallow after the unshallow attempt' || r16_bad="${r16_bad} maintainer.yml(no-still-shallow-warning)"
    r16_strict=$(printf '%s\n' "$pat_block" | grep -cF '[ -z "$(git merge-base origin/main' || true)
    r16_failopen=$(printf '%s\n' "$pat_block" | grep -cF '[ -n "$(git merge-base origin/main' || true)
    [ "$r16_strict" -ge 2 ] || r16_bad="${r16_bad} maintainer.yml(orphan-check-not-strict:strict=${r16_strict},want>=2)"
    [ "$r16_failopen" -eq 0 ] || r16_bad="${r16_bad} maintainer.yml(orphan-check-fail-open:failopen=${r16_failopen})"
    r16_unshallow_line=$(printf '%s\n' "$pat_block" | grep -nE 'git fetch origin main[[:space:]]+--unshallow' | head -1 | cut -d: -f1)
    r16_dep_line=$(printf '%s\n' "$pat_block" | grep -nE 'git merge-base|git diff --name-only "origin/main' | head -1 | cut -d: -f1)
    if [ -z "$r16_unshallow_line" ] || [ -z "$r16_dep_line" ] || [ "$r16_unshallow_line" -ge "$r16_dep_line" ]; then
      r16_bad="${r16_bad} maintainer.yml(unshallow-not-before-merge-base:${r16_unshallow_line:-none}/${r16_dep_line:-none})"
    fi
  fi
fi
if [ -z "$r16_bad" ]; then
  check "R16" "shallow workspace is unshallowed before the PAT merge sweep's first merge-base-dependent command, the strict orphan check is retained, and a still-shallow workspace warns instead of skipping silently (issue #602)" "ok"
else
  check "R16" "shallow-workspace PAT merge guard missing:${r16_bad} (issue #602: a linked workflow PR is silently skipped as an orphan on a shallow workspace)" "bad"
fi

# [R17] Per-OS findings-report contract (issue #608): a per-OS arm session
# used to carry its findings report only in the session's final message. The
# wrapper posts that message as a comment when no PR is created, but a
# PR-creating run turns it into the PR body instead, so the report vanished
# into the run log (macOS arm run 39036858261, PR #606 on issue #582) and the
# Maintainer had to recover it by hand. Properties:
#   1. each arm clears the runtime findings file before the agent step and
#      its prompt requires the report at /tmp/random-lab-findings.md;
#   2. each fail-closed verify step requires the findings report alongside
#      the decision file;
#   3. each arm posts the report through the shared script with its own OS
#      label and gates the decision forward on that step's success;
#   4. the shared script validates the sign-off, posts as github-actions[bot]
#      (never the owner PAT), and re-fetches the comment by id to verify
#      authorship and the exact body;
#   5. all three tester prompt files carry the contract.
r17_bad=""
R17_SCRIPT=".github/scripts/post-peros-findings.sh"
peros_arm_block() {
  awk -v job="  $1:" '
    $0 == job { inblk = 1 }
    inblk && /^  [a-z0-9-]+:$/ && $0 != job { exit }
    inblk { print }
  ' "$PEROS_WF" 2>/dev/null || true
}
if [ ! -f "$PEROS_WF" ]; then
  r17_bad=" opencode-peros-test.yml(missing)"
else
  for r17_os in linux macos windows; do
    r17_block=$(peros_arm_block "test-${r17_os}")
    if [ -z "$r17_block" ]; then
      r17_bad="${r17_bad} arm-${r17_os}(job-missing)"
      continue
    fi
    printf '%s\n' "$r17_block" | grep -qF 'rm -f /tmp/random-lab-decision.json /tmp/random-lab-findings.md' || r17_bad="${r17_bad} arm-${r17_os}(no-findings-clear)"
    printf '%s\n' "$r17_block" | grep -qF 'the COMPLETE findings report as Markdown to `/tmp/random-lab-findings.md`' || r17_bad="${r17_bad} arm-${r17_os}(prompt-not-file-based)"
    printf '%s\n' "$r17_block" | grep -qF '[ -s /tmp/random-lab-findings.md ] || missing="${missing} findings-report"' || r17_bad="${r17_bad} arm-${r17_os}(verify-not-requiring-findings-file)"
    printf '%s\n' "$r17_block" | grep -qF 'if [ "$need_poster" = "true" ]' || r17_bad="${r17_bad} arm-${r17_os}(no-poster-restore-for-older-heads)"
    printf '%s\n' "$r17_block" | grep -qF 'git archive "${GITHUB_SHA}" -- .github/scripts/post-peros-findings.sh' || r17_bad="${r17_bad} arm-${r17_os}(no-poster-archive-restore)"
    printf '%s\n' "$r17_block" | grep -qE "post-peros-findings\\.sh ${r17_os} " || r17_bad="${r17_bad} arm-${r17_os}(no-shared-post-step)"
    printf '%s\n' "$r17_block" | grep -qF "steps.findings.outcome == 'success'" || r17_bad="${r17_bad} arm-${r17_os}(forward-not-gated-on-findings)"
  done
fi
if [ ! -f "$R17_SCRIPT" ]; then
  r17_bad="${r17_bad} post-peros-findings.sh(missing)"
else
  for r17_signoff in '- the Linux Tester' '- the macOS Tester' '- the Windows Tester'; do
    grep -qF -- "$r17_signoff" "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-signoff:$r17_signoff)"
  done
  grep -qF 'github-actions[bot]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-bot-author-check)"
  grep -qF 'if [ "$last_line" != "$signoff" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-pre-post-signoff-validation)"
  grep -qF 'issues/comments/${comment_id}' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-re-fetch-verification)"
  grep -qF 'Verified bot-authored' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-verified-terminal-marker)"
fi
for r17_prompt in tester-linux.md tester-macos.md tester-windows.md; do
  r17_path=".github/agents/${r17_prompt}"
  if [ ! -f "$r17_path" ]; then
    r17_bad="${r17_bad} ${r17_prompt}(missing)"
    continue
  fi
  grep -qF '/tmp/random-lab-findings.md' "$r17_path" || r17_bad="${r17_bad} ${r17_prompt}(no-report-contract)"
  grep -qF 'Findings Report Contract' "$r17_path" || r17_bad="${r17_bad} ${r17_prompt}(no-contract-marker)"
done
if [ -z "$r17_bad" ]; then
  check "R17" "all three per-OS arms clear, require, post, and verify the signed /tmp/random-lab-findings.md report (bot-authored, re-fetched by id) before the decision forward, and the tester prompts carry the contract (issue #608)" "ok"
else
  check "R17" "per-OS findings-report contract missing:${r17_bad} (issue #608: a PR-creating arm run drops the report and only the run log has it)" "bad"
fi

summary="Silent-stall regression audit (R1-R17) on ${WF}: ${pass} passed, ${fail} failed."
echo "$summary"

if [ "$fail" -gt 0 ]; then
  body="## Silent-stall regression audit FAILED (R1-R17)

${summary}
${report}

A lab CI invariant was violated in the audited workflow set rooted at ${WF} (silent-stall S1/S2/L1/L2, R6 free-tier model pins, R7 review-restore ownership, R8 vendored hardened runner, R9 schedule/dispatch retry parity, R10 dispatch-input indirection, R11 post-agent PAT gates, R12 actor-write gate, R13 bot-created triage parity, R14 heterogeneous-group queue preservation, R15 model fallback ladder, R16 shallow-workspace PAT merge guard, or R17 per-OS findings-report contract). Investigate before merging any workflow change.

- the Auditor"
  if [ -n "$HEALTH_ISSUE" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
    gh issue comment "$HEALTH_ISSUE" --repo "$REPO" --body "$body" 2>/dev/null || echo "Failed to post to health issue #$HEALTH_ISSUE"
  fi
fi

exit 0
