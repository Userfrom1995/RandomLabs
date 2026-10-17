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
# merge checks then fail closed and silently skip a linked workflow PR), the
# R17 per-OS findings-report contract guard (issue #608: a PR-creating
# per-OS arm run turns the session's final message into the PR body and
# silently drops the findings report). R17 is hybrid: static checks assert the
# three arms wire the shared poster with the exact gate lines, token envs, and
# a clean post run body, and a functional test executes the real poster against
# an executable mock `gh` (interception asserted, credentials scrubbed, live
# non-credential Actions env set realistically, sandbox outside the repo per
# delegation.md section 6) so wrong-author, unsigned, missing-report,
# tampered-body, post-failure, and missing-comment-id paths must all fail
# closed for all three OS labels; only the verify-step run body and exotic
# sandbox-path fingerprinting remain review-gated boundaries (documented in
# the R17 comment), the R18 Windows MSYS argv-conversion guard (issue #612:
# Git Bash on the windows-latest arm rewrote a slash-leading "/oc" handoff
# body into a mangled "C:/Program Files/Git/..." path before gh saw it, so
# slash-leading argv bodies now require an MSYS conversion opt-out or a
# stdin transport), the R19 review-comment publication-evidence guard
# (issue #616: a reviewer death between the decision-file write and the
# comment post forwarded an unread verdict with zero published findings),
# the R20 paginated comment-read guard (issue #621: unbounded comment
# enumerations read only the oldest 30 comments, so a retry cap on a busy
# thread reads 0 and a crash loop re-posts retry 1 forever), and the R21
# PAT merge approval-binding guard (issue #619: the sweep's unanchored
# contains() approval match merged an unreviewed workflow-touching PR off a
# Maintainer summary that merely quoted the tester marker, and the same run
# skipped the genuinely approved lane as mergeable=UNKNOWN).
# Wired into auditor.yml as the R1-R21 matrix.
#
# Usage: silent-stall-audit.sh <path-to-opencode.yml> [health-issue-number]
# R1-R6 are scoped to <path-to-opencode.yml>; R7-R21 audit the whole tree
# (the review-restore guard, the vendored runner, every schedule/dispatch
# agent arm, dispatch-input indirection, the lab post-agent PAT gates, the
# shared actor-write gate, the per-OS arm queue plus the comment-triggered
# group cohort, the model fallback
# ladder, the PAT merge shallow-workspace guard, the Windows MSYS
# argv-conversion guard, the per-OS findings-report contract, the
# review-comment publication-evidence guard, the paginated
# comment-read guard, and the PAT merge approval binding), so they trip on a
# bad curator.yml/auditor.yml/ideate.yml/lab.yml/maintainer.yml/peros arm no
# matter which file the audit was pointed at.
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
  [R1-R21 PASS] $name: $desc"
    echo "PASS  $name: $desc"
  else
    fail=$((fail + 1))
    report="${report}
  [R1-R21 FAIL] $name: $desc"
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
#      label, keeps the post step's exact name/id/gate/env sequence (its own
#      actor-gate + verify-success condition, then github.token, then the
#      event-derived TARGET) before the single decision-forward step, whose
#      first line after its name is the exact actor-gate + verify +
#      findings-success condition (a block-wide or parked gate line does not
#      satisfy this), carries its actor-gate plus post-step github.token envs
#      (never a PAT), keeps the post step's run body free of anything but
#      comments and the invocation with the invocation itself present, and
#      keeps the forward step free of continue-on-error;
#   4. the shared script validates the sign-off, posts as github-actions[bot]
#      (never the owner PAT), and re-fetches the comment by id to verify
#      authorship, the sign-off tail, and the exact body: every guard is the
#      exact uncommented `if ...; then` line whose own failure block ends in
#      a hard `exit 1` before its `fi` with no nested `if` (a weakened or
#      wrapped condition, a commented-out guard, or a no-op `exit 1` all
#      trip the rule); a functional test executes the real script against an
#      executable mock `gh` (interception asserted, credentials scrubbed, live
#      non-credential Actions env set realistically so env-fingerprint
#      detection cannot green a broken poster, per-case mock behavior read
#      from a sandbox config file, sandbox outside the repo tree) and
#      requires fail-closed behavior on wrong author, unsigned report,
#      missing report, tampered body with an intact sign-off tail, failed
#      post, and missing comment id, across all three OS labels;
#   5. all three tester prompt files carry the contract.
# Review-gated residual boundary: the verify step's own run body cannot be
# functionally executed statically, so an early `exit 0` inserted into it (or
# any arbitrary reshuffle of a step's control flow that still passes every
# exact-form check above) is caught by the review gate, not by this rule; the
# same applies to a poster that deliberately fingerprints the sandbox path or
# the mock `gh` itself (path-based detection is unbounded static territory,
# while env-fingerprint detection is banned statically and defeated by the
# realistic functional env).
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
    printf '%s\n' "$r17_block" | grep -qF 'if [ "$need_poster" = "true" ]; then' || r17_bad="${r17_bad} arm-${r17_os}(no-poster-restore-for-older-heads)"
    printf '%s\n' "$r17_block" | grep -qF 'git archive "${GITHUB_SHA}" -- .github/scripts/post-peros-findings.sh' || r17_bad="${r17_bad} arm-${r17_os}(no-poster-archive-restore)"
    printf '%s\n' "$r17_block" | grep -qE '^          bash \.github/scripts/post-peros-findings\.sh '"${r17_os}"' "\$TARGET"$' || r17_bad="${r17_bad} arm-${r17_os}(no-shared-post-step)"
    printf '%s\n' "$r17_block" | sed 's/^[[:space:]]*//' | grep -qxF "if: always() && steps.actor_gate.outputs.run == 'true' && steps.verify-test.outcome == 'success'" || r17_bad="${r17_bad} arm-${r17_os}(post-step-gate-not-exact)"
    # The gate and the github.token env must live on the post step itself, in
    # order (github.token, then the event-derived TARGET): a parked exact line
    # on another step or a PAT env swap must trip (independent-verifier
    # finding Y7). Step names capitalize as Linux/macOS/Windows.
    case "$r17_os" in
      linux)   r17_os_tag="Linux" ;;
      macos)   r17_os_tag="macOS" ;;
      windows) r17_os_tag="Windows" ;;
    esac
    printf '%s\n' "$r17_block" | sed 's/^[[:space:]]*//' | awk -v tag="Post ${r17_os_tag} tester findings report" -v gate="if: always() && steps.actor_gate.outputs.run == 'true' && steps.verify-test.outcome == 'success'" '
      done { next }
      $0 == "- name: " tag { seq=1; next }
      seq >= 6 && $0 ~ /^- name: / { done=1; next }
      seq == 1 { if ($0 == "id: findings") { seq=2 } else { bad=1; seq=9 }; next }
      seq == 2 { if ($0 == gate) { seq=3 } else { bad=1; seq=9 }; next }
      seq == 3 { if ($0 == "env:") { seq=4 } else { bad=1; seq=9 }; next }
      seq == 4 { if ($0 == "GH_TOKEN: ${{ github.token }}") { seq=5 } else { bad=1; seq=9 }; next }
      seq == 5 { if ($0 == "TARGET: ${{ github.event.issue.number }}") { ok=1; seq=6 } else { bad=1; seq=9 }; next }
      seq == 6 { if ($0 ~ /^continue-on-error:/) { bad=1 }; next }
      seq == 9 { next }
      END { exit((ok && !bad) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(post-step-sequence-broken)"
    # The forward gate must live on the forward step itself, the arm must carry
    # exactly one post step and one forward step, and the post step must
    # precede the forward (round-2 reviewer finding F1): block-wide greps and a
    # first-occurrence match let a reordered arm green while the forward's
    # findings gate evaluated before the findings step ran, and let a parked
    # exact line on a dead duplicate step hide a dropped live gate.
    r17_post_name="      - name: Post ${r17_os_tag} tester findings report"
    r17_fwd_name="      - name: Forward ${r17_os_tag} tester decision"
    r17_post_count=$(printf '%s\n' "$r17_block" | grep -cF -- "$r17_post_name" || true)
    r17_fwd_count=$(printf '%s\n' "$r17_block" | grep -cF -- "$r17_fwd_name" || true)
    [ "$r17_post_count" -eq 1 ] || r17_bad="${r17_bad} arm-${r17_os}(post-step-count=${r17_post_count},want=1)"
    [ "$r17_fwd_count" -eq 1 ] || r17_bad="${r17_bad} arm-${r17_os}(forward-step-count=${r17_fwd_count},want=1)"
    r17_post_line=$(printf '%s\n' "$r17_block" | grep -nF -- "$r17_post_name" | head -n1 | cut -d: -f1)
    r17_fwd_line=$(printf '%s\n' "$r17_block" | grep -nF -- "$r17_fwd_name" | head -n1 | cut -d: -f1)
    if [ -z "$r17_post_line" ] || [ -z "$r17_fwd_line" ] || [ "$r17_post_line" -ge "$r17_fwd_line" ]; then
      r17_bad="${r17_bad} arm-${r17_os}(post-not-before-forward)"
    fi
    printf '%s\n' "$r17_block" | sed 's/^[[:space:]]*//' | awk -v tag="Forward ${r17_os_tag} tester decision" -v gate="if: always() && steps.actor_gate.outputs.run == 'true' && steps.verify-test.outcome == 'success' && steps.findings.outcome == 'success'" '
      done { next }
      $0 == "- name: " tag { seq=1; seen=1; next }
      seq == 2 && $0 ~ /^- name: / { done=1; next }
      seq == 1 { if ($0 == gate) { ok=1; seq=2 } else { bad=1; seq=3 }; next }
      seq == 3 { next }
      END { exit((seen && ok && !bad) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(forward-gate-not-on-forward-step)"
    r17_token_envs=$(printf '%s\n' "$r17_block" | sed 's/^[[:space:]]*//' | grep -cxF 'GH_TOKEN: ${{ github.token }}' || true)
    [ "$r17_token_envs" -ge 2 ] || r17_bad="${r17_bad} arm-${r17_os}(github-token-env-count=${r17_token_envs},want>=2)"
    # The post step's run body may contain only comments, blanks, and the exact
    # invocation, and the invocation must itself appear there (round-2
    # reviewer recommendation; independent-verifier findings Z1/Z2/W1/W2): an
    # inserted `exit 0`, extra command, `|| true`, a `run:` header other than
    # `|` (YAML would fold the comments and invocation into one comment line),
    # a `shell:`/`working-directory:` override, or a comment-only body with
    # the live invocation parked in another step would let the arm conclude
    # green with the report never posted.
    printf '%s\n' "$r17_block" | awk -v tag="      - name: Post ${r17_os_tag} tester findings report" -v want="bash .github/scripts/post-peros-findings.sh ${r17_os} \"\$TARGET\"" '
      $0 == tag { post=1; seen=1; next }
      post && $0 ~ /^      - / { post=0 }
      post && $0 ~ /^[[:space:]]*(shell|working-directory):/ { bad=1 }
      post && $0 ~ /^        run:/ { run=1; run_seen=1; if ($0 != "        run: |") bad=1; next }
      run && $0 ~ /^      - / { run=0 }
      run { s=$0; sub(/^[[:space:]]+/, "", s); if (s == "" || s ~ /^#/) next; if (s != want) { bad=1 } else { got=1 } }
      END { exit((seen && run_seen && !bad && got) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(post-run-body-modified)"
    # The forward step must not mask its own failures or re-shell itself (W3).
    printf '%s\n' "$r17_block" | awk -v tag="      - name: Forward ${r17_os_tag} tester decision" '
      $0 == tag { fwd=1; seen=1; next }
      fwd && $0 ~ /^      - / { fwd=0 }
      fwd && $0 ~ /^[[:space:]]*(continue-on-error|shell|working-directory):/ { bad=1 }
      END { exit((seen && !bad) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(forward-step-weakened)"
    # Job-level defaults would silently re-shell every contract step when
    # pointed at a neutered shell (W3; the Windows arm's `shell: bash` default
    # is required because windows-latest defaults to pwsh, so any defaults
    # block must be exactly that safe form, and shell/working-directory
    # overrides are banned elsewhere in the arm).
    printf '%s\n' "$r17_block" | awk '
      $0 == "    defaults:" { dcount++; line=1; next }
      line == 1 && $0 == "      run:" { line=2; next }
      line == 2 && $0 == "        shell: bash" { line=0; ok++; next }
      line > 0 { bad=1; line=0 }
      $0 ~ /^[[:space:]]*shell:/ && $0 != "        shell: bash" { bad=1 }
      $0 ~ /^[[:space:]]*working-directory:/ { bad=1 }
      END { exit((dcount == 0 || (dcount == 1 && ok == 1 && !bad)) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(unsafe-defaults-or-shell-override)"
    # The verify step must keep its exact id and always() gate, and must not
    # mask its own failure or re-shell itself (W5/W6/W7): a renamed id makes
    # the post/forward gate conditions reference a nonexistent step.
    printf '%s\n' "$r17_block" | awk '
      $0 == "      - name: Verify test decided, else fail closed" { v=1; seen=1; next }
      v && $0 ~ /^      - / { v=0 }
      v && $0 == "        id: verify-test" { id_ok=1 }
      v && $0 == "        if: always()" { if_ok=1 }
      v && $0 ~ /^[[:space:]]*(continue-on-error|shell|working-directory):/ { bad=1 }
      END { exit((seen && id_ok && if_ok && !bad) ? 0 : 1) }' || r17_bad="${r17_bad} arm-${r17_os}(verify-step-weakened)"
  done
fi
if [ ! -f "$R17_SCRIPT" ]; then
  r17_bad="${r17_bad} post-peros-findings.sh(missing)"
else
  for r17_signoff in '- the Linux Tester' '- the macOS Tester' '- the Windows Tester'; do
    grep -qF -- "$r17_signoff" "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-signoff:$r17_signoff)"
  done
  grep -qF 'github-actions[bot]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-bot-author-check)"
  grep -qF 'if [ "$author" != "github-actions[bot]" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-bot-author-check)"
  grep -qF 'if [ "$last_line" != "$signoff" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-pre-post-signoff-validation)"
  grep -qF 'if [ "$fetched_last" != "$signoff" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-post-fetch-signoff-check)"
  grep -qF 'if [ "$fetched_body" != "$expected_body" ]' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-body-equality-check)"
  grep -qF 'issues/comments/${comment_id}' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-re-fetch-verification)"
  grep -qF 'Verified bot-authored' "$R17_SCRIPT" || r17_bad="${r17_bad} script(no-verified-terminal-marker)"
  # Harness-detection ban and exact sign-off assignments (independent-verifier
  # findings P1-P4): the poster must not branch on CI-only env or hardcode the
  # production repo slug (the functional test runs with realistic values), and
  # each OS case must map to its literal sign-off line, not a derived value.
  grep -qF 'GITHUB_ACTIONS' "$R17_SCRIPT" && r17_bad="${r17_bad} script(poster-references-GITHUB_ACTIONS)"
  grep -qF 'MOCK_' "$R17_SCRIPT" && r17_bad="${r17_bad} script(poster-references-MOCK)"
  grep -qF 'RandomLabs/' "$R17_SCRIPT" && r17_bad="${r17_bad} script(poster-hardcodes-repo-slug)"
  sed 's/^[[:space:]]*//' "$R17_SCRIPT" | grep -qxF 'linux)   signoff="- the Linux Tester" ;;' || r17_bad="${r17_bad} script(linux-signoff-assignment-not-exact)"
  sed 's/^[[:space:]]*//' "$R17_SCRIPT" | grep -qxF 'macos)   signoff="- the macOS Tester" ;;' || r17_bad="${r17_bad} script(macos-signoff-assignment-not-exact)"
  sed 's/^[[:space:]]*//' "$R17_SCRIPT" | grep -qxF 'windows) signoff="- the Windows Tester" ;;' || r17_bad="${r17_bad} script(windows-signoff-assignment-not-exact)"
  # Structural assertions (independent-verifier findings X1/X2/X3, Y1/Y9, and
  # round-2 note N1): the literal greps above can be satisfied by weakened or
  # no-op code. Require each guard to be the exact uncommented `if ...; then`
  # line, and its own failure block (up to its closing `fi`, with no nested
  # control flow - `if`/`while`/`for`/`case`/`until` or a function definition -
  # and no early fall-through) to end in a real `exit 1`.
  r17_guard_block_has_exit() {
    sed 's/^[[:space:]]*//' "$R17_SCRIPT" | awk -v p="$1" '
      $0 == p { inblk=1; next }
      inblk && $0 ~ /^(if|while|for|case|until)[[:space:]]/ { nested=1 }
      inblk && $0 ~ /^[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\(\)[[:space:]]*\{/ { nested=1 }
      inblk && $0 == "exit 1" { found=1 }
      inblk && $0 == "fi" { closed=1; inblk=0 }
      END { exit((found && closed && !nested) ? 0 : 1) }'
  }
  for r17_guard in \
    'pre-post-signoff:if [ "$last_line" != "$signoff" ]; then' \
    'bot-author:if [ "$author" != "github-actions[bot]" ]; then' \
    'post-fetch-signoff:if [ "$fetched_last" != "$signoff" ]; then' \
    'body-equality:if [ "$fetched_body" != "$expected_body" ]; then'; do
    r17_guard_name="${r17_guard%%:*}"
    r17_guard_line="${r17_guard#*:}"
    sed 's/^[[:space:]]*//' "$R17_SCRIPT" | grep -qxF -- "$r17_guard_line" || r17_bad="${r17_bad} script(${r17_guard_name}-guard-not-exact)"
    r17_guard_block_has_exit "$r17_guard_line" || r17_bad="${r17_bad} script(${r17_guard_name}-guard-block-has-no-exit-1)"
  done
  # Functional contract test (independent-verifier findings Z3/Z4 and
  # round-4 P1-P4: text greps cannot prove the poster's runtime behavior, so
  # execute the real script). Per delegation.md section 6 the mock is
  # executable, interception is asserted BEFORE any poster run, credentials
  # are scrubbed, and the sandbox lives outside the repository tree. Live
  # non-credential Actions env is set realistically (GITHUB_ACTIONS=true and a
  # realistic repo slug whose owner segment differs from production) and
  # per-case mock behavior comes from a
  # case.cfg file, not from env, so env-fingerprint detection cannot green a
  # broken poster (the full production slug is statically banned, so an
  # owner-only fingerprint remains a review-gated boundary, round-2 note N3).
  # A body that keeps the sign-off tail but tampers with
  # earlier content must be rejected; a tampered-body run that exits 0
  # (guards unreachable or expected_body clobbered) trips the rule.
  r17_script_abs="$(pwd)/$R17_SCRIPT"
  r17_tmp=$(mktemp -d 2>/dev/null || true)
  if [ -z "$r17_tmp" ] || [ ! -d "$r17_tmp" ]; then
    r17_bad="${r17_bad} script(functional-sandbox-unavailable)"
  elif ! command -v jq >/dev/null 2>&1; then
    r17_bad="${r17_bad} script(functional-jq-missing)"
  else
    trap 'rm -rf "$r17_tmp"' EXIT
    r17_mockdir="$r17_tmp/bin"
    mkdir -p "$r17_mockdir"
    printf '{"action":"maintainer"}\n' > "$r17_tmp/event.json"
    cat > "$r17_mockdir/gh" <<'R17_MOCK'
#!/usr/bin/env bash
r17_cfg="$(cd "$(dirname "$0")/.." && pwd)/case.cfg"
author="github-actions[bot]"
fail_post="0"
no_id="0"
body_file=""
# shellcheck disable=SC1090
. "$r17_cfg"
case "$*" in
  *"/issues/comments/"*)
    jq -n --arg a "$author" --arg b "$(cat "$body_file" 2>/dev/null || true)" '{user:{login:$a},html_url:"https://example.invalid/comment",body:$b}'
    ;;
  *)
    if [ "$fail_post" = "1" ]; then
      echo "mock gh: post failed" >&2
      exit 1
    fi
    if [ "$no_id" = "1" ]; then
      printf '{}\n'
    else
      printf '{"id":12345}\n'
    fi
    ;;
esac
R17_MOCK
    chmod +x "$r17_mockdir/gh"
    if [ "$(PATH="$r17_mockdir:$PATH" command -v gh)" != "$r17_mockdir/gh" ]; then
      r17_bad="${r17_bad} script(functional-mock-not-intercepted)"
    else
      r17_good_linux="$r17_tmp/good-linux.md"
      printf 'Finding one.\nFinding two.\n\n- the Linux Tester\n' > "$r17_good_linux"
      r17_good_macos="$r17_tmp/good-macos.md"
      printf 'Finding one.\nFinding two.\n\n- the macOS Tester\n' > "$r17_good_macos"
      r17_good_windows="$r17_tmp/good-windows.md"
      printf 'Finding one.\nFinding two.\n\n- the Windows Tester\n' > "$r17_good_windows"
      r17_tampered="$r17_tmp/tampered.md"
      printf 'Finding one tampered. Finding two gone.\n\n- the Linux Tester\n' > "$r17_tampered"
      r17_unsigned="$r17_tmp/unsigned.md"
      printf 'Finding one without a sign-off.\n' > "$r17_unsigned"
      r17_missing="$r17_tmp/missing.md"
      r17_case() {
        r17_case_name="$1"; r17_case_want="$2"; r17_case_os="$3"; r17_case_report="$4"; shift 4
        {
          printf 'author="github-actions[bot]"\n'
          printf 'fail_post="0"\n'
          printf 'no_id="0"\n'
          printf 'body_file=%q\n' "$r17_case_report"
          for r17_kv in "$@"; do printf '%s\n' "$r17_kv"; done
        } > "$r17_tmp/case.cfg"
        r17_case_out=$(cd "$r17_tmp" && env -u GITHUB_TOKEN -u GH_TOKEN -u GH_API_TOKEN \
          PATH="$r17_mockdir:$PATH" GITHUB_ACTIONS=true GITHUB_REPOSITORY="RandomLabs/RandomLabs" \
          GITHUB_EVENT_PATH="$r17_tmp/event.json" \
          bash "$r17_script_abs" "$r17_case_os" 1 "$r17_case_report" 2>&1)
        r17_case_rc=$?
        if [ "$r17_case_rc" -ne "$r17_case_want" ]; then
          r17_bad="${r17_bad} script(functional-${r17_case_name}-rc=${r17_case_rc},want=${r17_case_want})"
          printf 'R17 functional case %s failed (rc=%s, want=%s); output:\n%s\n' "$r17_case_name" "$r17_case_rc" "$r17_case_want" "$r17_case_out" >&2
        fi
      }
      r17_case good-linux 0 linux "$r17_good_linux"
      r17_case missing-report 1 linux "$r17_missing"
      r17_case unsigned-report 1 linux "$r17_unsigned"
      r17_case tampered-body 1 linux "$r17_good_linux" "body_file=$r17_tampered"
      r17_case wrong-author 1 linux "$r17_good_linux" 'author="Userfrom1995"'
      r17_case post-failure 1 linux "$r17_good_linux" 'fail_post="1"'
      r17_case missing-comment-id 1 linux "$r17_good_linux" 'no_id="1"'
      r17_case good-macos 0 macos "$r17_good_macos"
      r17_case unsigned-macos 1 macos "$r17_unsigned"
      r17_case wrong-author-macos 1 macos "$r17_good_macos" 'author="Userfrom1995"'
      r17_case good-windows 0 windows "$r17_good_windows"
      r17_case unsigned-windows 1 windows "$r17_unsigned"
      r17_case wrong-author-windows 1 windows "$r17_good_windows" 'author="Userfrom1995"'
    fi
  fi
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

# [R18] Windows MSYS argv conversion guard (issue #612): the per-OS decision
# forwarders run under Git Bash on the windows-latest arm, and MSYS2 path
# conversion rewrites any argv element that looks like a POSIX absolute path
# before the native child process sees it. The native Windows arm's handoff
# body was posted as the literal path "C:/Program Files/Git/oc maintainer"
# (comment on #582 at 15:08:55Z, run 39036859435), which is not a valid "/oc"
# trigger for any strict-prefix consumer. The rule parses the workflow YAML
# STRUCTURALLY (python3 + PyYAML, preinstalled on the auditor runner) instead
# of grepping raw text, because a raw-text check can be spoofed by dead
# comment/echo/heredoc content inside a run block (an independent adversarial
# pass defeated a first text-only draft exactly that way). Two properties:
#   1. whole-tree discovery: inside every job whose runner is Windows (static
#      or list-form runs-on values mentioning windows, or a matrix runs-on
#      whose matrix values mention windows), no bash-effective step (pwsh and
#      cmd steps have no MSYS layer and are skipped; on a Windows runner a
#      plain "sh" resolves to Git's MSYS sh and is scanned) may pass a
#      slash-leading body value ("/oc ...") through argv (--body / --body= /
#      gh's -b shorthand, separate or attached) unless a REAL env opt-out
#      applies to that step. Opt-out semantics are
#      taken from the MSYS2 runtime source, not from folklore:
#        - MSYS_NO_PATHCONV is a presence check (find_path_start_and_type
#          returns early whenever getenv() is non-NULL,
#          msys2_path_conv.cc:347), so any non-empty value at workflow, job,
#          or step level is a real opt-out ("1", "0", "false", "yes" all
#          work). An empty YAML value stays red: whether the runner exports a
#          key set to the empty string is not verifiable from the tree, so
#          the conservative reading wins.
#        - MSYS2_ARG_CONV_EXCL is read once at spawn (spawn.cc:292-299),
#          split on ";" only and never trimmed, and a token is honored only
#          when it is exactly "*" or a prefix of the argv word (path.cc:4208-
#          4212; empty tokens never match), so a comma-joined "foo,/oc", a
#          padded " /oc", or a quote-wrapped '"*"' is NOT an opt-out while
#          an exact "*" or "/oc" token is. MSYS prefix-matches whole argv
#          words, so "/octal" never covers "/oc maintainer", an exact "/oc"
#          token covers only the separate-token transport ("--body" then
#          "/oc ...") and never an attached word ("--body=/oc ...",
#          "-b/oc ..."), and it never covers a different slash body such as
#          "/review ...". Only the most specific
#          level that sets it takes effect (step > job > workflow), so an
#          ineffective step value is not rescued by a broader effective one.
#      An inline per-command assignment (MSYS_NO_PATHCONV=1 gh ...) and a
#      separate export statement are not env keys and stay red as
#      intentionally conservative false positives (modeling shell state
#      across a script is out of scope for a static tripwire); commented-out
#      text, heredoc prose, zero values, and similar spoofs never count.
#      Bash quoting is
#      modeled with a small state machine (NORMAL / single / double quotes /
#      $( ... ) command substitution, top-level positions only), comment
#      stripping follows shell word-start rules (a "x=${y#*/}" parameter
#      expansion is not a comment), backslash line continuations are joined,
#      workflow- and job-level defaults.run.shell are honored, and an
#      OR-composed if condition (e.g. "... || always()") is never treated as
#      a Windows skip. Composite action bash run steps under
#      .github/actions/ are scanned too (they run on the caller's runner),
#      with step-level env only: an action file cannot see the caller's
#      workflow/job env maps, so that scan stays conservative.
#   2. canonical per-OS forwarder contract: each of the three
#      "Forward ... tester decision" steps in opencode-peros-test.yml must
#      exist exactly once by YAML name inside its own job (test-linux /
#      test-macos / test-windows; a duplicate-named decoy step in another
#      job can neither stand in for nor hide a defaced forwarder), carry the
#      opt-out, deliver the body via stdin (a real top-level "--body-file -"
#      argument), and contain NO top-level --body (non-file) or -b token at
#      all, so neither the argv guard nor the conversion-proof transport can
#      silently regress (a helper that reverts to --body "$1", -b "$1", or
#      the attached -b"$1" is caught even though the runtime slash value is
#      invisible to a lexical scan, and a dead helper holding "--body-file -"
#      text cannot mask the reverted transport).
# Residual limitation (stated honestly): bash is undecidable, so a
# deliberately obfuscated rewrite that never spells "gh", "--body" or the
# slash value literally (string building, eval, arrays across lines) can
# still evade any static rule, and a run block that mutates the opt-out
# variables itself (unset ..., export KEY=..., writing to $GITHUB_ENV for a
# later step) evades the env-map model by design; R18 is a tripwire for
# accidental reintroduction plus a strict canonical contract, and the human
# reviewer carries the semantic gate.
r18_bad=""
r18_python_out=$(python3 - <<'R18PY'
import glob
import os
import re
import sys

try:
    import yaml
except Exception as exc:
    sys.stdout.write("python-runtime(no-pyyaml:%s)\n" % exc)
    raise SystemExit(0)

PEROS = ".github/workflows/opencode-peros-test.yml"
FORWARDERS = (
    ("Linux", "test-linux"),
    ("macOS", "test-macos"),
    ("Windows", "test-windows"),
)
problems = []

GH_WORD_RE = re.compile(r"(^|[^A-Za-z0-9_.-])gh(\s|$|[);&|])")
# Slash-leading body forms, split by transport: attached ("--body=/oc x",
# "-b/oc x", '-b"/oc x"') keeps the body inside the same argv word as the
# flag, so no MSYS2_ARG_CONV_EXCL token can ever prefix-match it; separate
# ("--body /oc x", "-b /oc x") leaves the body in its own argv word.
# BODY_TOKEN_RE / SHORT_B_TOKEN_RE are the contract-side detectors: any
# --body that is not --body-file, and any standalone -b token, whatever
# transport follows (they catch the variable-indirection defacements that the
# slash-literal forms cannot see).
BODY_LONG_ATTACHED_RE = re.compile(r"(?<![A-Za-z0-9_-])--body=[\"']?(/[^\s/][^\s/]?)")
BODY_LONG_SEPARATE_RE = re.compile(r"(?<![A-Za-z0-9_-])--body\s+[\"']?(/[^\s/][^\s/]?)")
BODY_SHORT_ATTACHED_RE = re.compile(r"(?<![A-Za-z0-9_-])-b=?[\"']?(/[^\s/][^\s/]?)")
BODY_SHORT_SEPARATE_RE = re.compile(r"(?<![A-Za-z0-9_-])-b\s+[\"']?(/[^\s/][^\s/]?)")
BODY_TOKEN_RE = re.compile(r"(?<![A-Za-z0-9_-])--body(?!-file)")
BODY_FILE_STDIN_RE = re.compile(r"--body-file(=|\s+)-\s*(\d?>|\|\||;|&|$)")
SHORT_B_TOKEN_RE = re.compile(r"(?<![A-Za-z0-9_-])-b(?![A-Za-z0-9_-])")
BARE_QUOTED_RE = re.compile(r"([\"'])([A-Za-z0-9_./-]+)\1")


def has_windows(value):
    if isinstance(value, str):
        return "windows" in value.lower()
    if isinstance(value, list):
        return any(has_windows(item) for item in value)
    if isinstance(value, dict):
        return any(has_windows(item) for item in value.values())
    return False


def is_windows_job(job):
    runs_on = job.get("runs-on")
    if isinstance(runs_on, str) and "matrix" in runs_on:
        strategy = job.get("strategy")
        matrix = strategy.get("matrix") if isinstance(strategy, dict) else None
        if matrix is not None and has_windows(matrix):
            return True
    return has_windows(runs_on)


def effective_shell(step, job, workflow_defaults):
    shell = step.get("shell")
    for defaults in (job.get("defaults"), workflow_defaults):
        if shell is not None:
            break
        run_defaults = defaults.get("run") if isinstance(defaults, dict) else None
        if isinstance(run_defaults, dict):
            shell = run_defaults.get("shell")
    if shell is None:
        return "pwsh" if is_windows_job(job) else "bash"
    return str(shell)


def is_bash_shell(shell):
    # "bash" covers Git for Windows' Git Bash; on a Windows runner a plain
    # "sh" resolves to the same MSYS2 layer (Git's sh.exe), including custom
    # templates whose first word names it ("sh -e {0}", an absolute sh.exe
    # path). Everything else (pwsh, cmd, python) has no MSYS conversion layer.
    text = str(shell).strip().lower()
    if "bash" in text:
        return True
    parts = text.split()
    if not parts:
        return False
    first = parts[0].replace("\\", "/").rsplit("/", 1)[-1]
    if first.endswith(".exe"):
        first = first[:-4]
    return first == "sh"


def skips_windows(step):
    cond = step.get("if")
    if not isinstance(cond, str):
        return False
    compact = cond.replace(" ", "")
    if "||" in compact:
        # An OR-composed condition can still run on Windows (for example
        # "runner.os != 'Windows' || always()"); never treat those as skips.
        return False
    return (
        "runner.os!='Windows'" in compact
        or 'runner.os!="Windows"' in compact
        or "runner.os=='Linux'" in compact
        or 'runner.os=="Linux"' in compact
        or "runner.os=='macOS'" in compact
        or 'runner.os=="macOS"' in compact
    )


def presence_optout(env):
    # MSYS_NO_PATHCONV is a presence check at runtime: find_path_start_and_type
    # disables conversion whenever getenv() is non-NULL (msys2_path_conv.cc:347),
    # so any non-empty value is a real opt-out ("0", "false", and "yes" all
    # work). An empty YAML value is rejected conservatively: whether the runner
    # exports a key set to the empty string is not verifiable from the tree.
    if not isinstance(env, dict):
        return False
    value = env.get("MSYS_NO_PATHCONV")
    return value is not None and str(value) != ""


def arg_conv_excl_optout(env, body=None, attached=False):
    # MSYS2_ARG_CONV_EXCL is read once at spawn and split on ";" only, with no
    # trimming (spawn.cc:292-299); a token is honored only when it is exactly
    # "*" or a prefix of the argv word, and empty tokens never match
    # (path.cc:4208-4212). So "foo,/oc", " /oc", and a quote-wrapped '"*"' are
    # NOT opt-outs (MSYS sees one padded or quoted token). An exact "*" covers
    # every word; an exact "/oc" token covers only a slash body carried in its
    # own argv word ("--body" then "/oc ..."), never an attached word
    # ("--body=/oc ...", "-b/oc ...") and never a different slash body.
    if not isinstance(env, dict):
        return False
    value = env.get("MSYS2_ARG_CONV_EXCL")
    if value is None:
        return False
    tokens = str(value).split(";")
    if "*" in tokens:
        return True
    return (
        "/oc" in tokens
        and not attached
        and body is not None
        and body.startswith("/oc")
    )


def env_optout(env, body=None, attached=False):
    return presence_optout(env) or arg_conv_excl_optout(env, body, attached)


def merged_optout(workflow_env, job_env, step_env, body=None, attached=False):
    # MSYS_NO_PATHCONV is presence-based, so any level that sets it wins.
    if presence_optout(step_env) or presence_optout(job_env) or presence_optout(workflow_env):
        return True
    # MSYS2_ARG_CONV_EXCL follows the env override chain: only the most
    # specific level that sets the key takes effect (step > job > workflow),
    # so an ineffective step value is never rescued by a broader effective one.
    for env in (step_env, job_env, workflow_env):
        if isinstance(env, dict) and "MSYS2_ARG_CONV_EXCL" in env:
            return arg_conv_excl_optout(env, body, attached)
    return False


def at_top_level(line, index):
    # State machine over shell quoting: NORMAL, single quotes, double quotes,
    # command substitution ($( ... )) and backtick command substitution.
    # Tokens inside $( ) or `...` are real commands even when the
    # substitution itself sits inside double quotes, so
    # "out=$(gh ... --body /oc)" and "out=`gh ... --body /oc`" must not hide
    # the invocation.
    stack = []
    i = 0
    while i < index and i < len(line):
        state = stack[-1] if stack else "normal"
        char = line[i]
        if state == "sq":
            if char == "'":
                stack.pop()
        elif state == "dq":
            if char == "\\":
                i += 1
            elif char == '"':
                stack.pop()
            elif char == "$" and i + 1 < len(line) and line[i + 1] == "(":
                stack.append("cmd")
                i += 1
            elif char == "`":
                stack.append("bt")
        elif state == "cmd":
            if char == "'":
                stack.append("sq")
            elif char == '"':
                stack.append("dq")
            elif char == "\\":
                i += 1
            elif char == "$" and i + 1 < len(line) and line[i + 1] == "(":
                stack.append("cmd")
                i += 1
            elif char == "`":
                stack.append("bt")
            elif char == ")":
                stack.pop()
        elif state == "bt":
            if char == "'":
                stack.append("sq")
            elif char == '"':
                stack.append("dq")
            elif char == "\\":
                i += 1
            elif char == "`":
                stack.pop()
        else:
            if char == "'":
                stack.append("sq")
            elif char == '"':
                stack.append("dq")
            elif char == "\\":
                i += 1
            elif char == "$" and i + 1 < len(line) and line[i + 1] == "(":
                stack.append("cmd")
                i += 1
            elif char == "`":
                stack.append("bt")
        i += 1
    return (not stack) or stack[-1] in ("cmd", "bt")


def logical_lines(run_text):
    joined = []
    buffer = ""
    for raw in run_text.split("\n"):
        line = raw.rstrip()
        if line.endswith("\\"):
            buffer += line[:-1] + " "
            continue
        joined.append(buffer + line)
        buffer = ""
    if buffer:
        joined.append(buffer)
    return joined


def strip_comment(line):
    # In shell a "#" starts a comment only at the start of a word (word start
    # or whitespace/;/&/|/( before it). A bare "char == '#'" test would cut
    # "x=${y#*/}; gh ... --body /oc" at the parameter-expansion # and hide a
    # real invocation.
    out = []
    quote = None
    for i, char in enumerate(line):
        if quote is not None:
            if char == quote:
                quote = None
            out.append(char)
        elif char in "\"'":
            quote = char
            out.append(char)
        elif char == "#" and (i == 0 or line[i - 1] in " \t;&|("):
            break
        else:
            out.append(char)
    return "".join(out)


def slash_body_hit(line):
    # The regexp consumes the character before "gh"; the state must be
    # evaluated AT the g (m.end(1)), because that char can itself open a
    # backtick substitution (`gh ...`). ANY top-level gh on the line enables
    # the scan: a quoted "gh" earlier on the line (echo "using gh" && gh ...)
    # must not suppress a later real invocation.
    if not any(at_top_level(line, match.end(1)) for match in GH_WORD_RE.finditer(line)):
        return []
    hits = []
    for regex, flag, attached in (
        (BODY_LONG_ATTACHED_RE, "--body", True),
        (BODY_LONG_SEPARATE_RE, "--body", False),
        (BODY_SHORT_ATTACHED_RE, "-b", True),
        (BODY_SHORT_SEPARATE_RE, "-b", False),
    ):
        # Every hit on the line matters: a step can carry several posting
        # commands, and an opt-out that fits one body/form must not mask an
        # unguarded sibling.
        for match in regex.finditer(line):
            if at_top_level(line, match.start()):
                hits.append((flag, attached, match.group(1)))
    return hits


def normalize_line(line):
    # A bare quoted command word ("gh", 'gh') is the same word to bash, and
    # ${IFS} (or $IFS) is a whitespace separator; normalizing both keeps the
    # lexical scan honest without executing anything.
    line = line.replace("${IFS}", " ").replace("$IFS", " ")
    return BARE_QUOTED_RE.sub(r"\2", line)


def slash_body_hits(run_text):
    hits = []
    for line in logical_lines(run_text):
        stripped = normalize_line(strip_comment(line)).strip()
        if not stripped:
            continue
        hits.extend(slash_body_hit(stripped))
    return hits


def safe_step_name(step):
    name = step.get("name")
    return str(name) if name is not None else "?"


for path in sorted(set(glob.glob(".github/workflows/*.yml") + glob.glob(".github/workflows/*.yaml"))):
    try:
        with open(path) as handle:
            doc = yaml.safe_load(handle)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (path, exc))
        continue
    jobs = (doc or {}).get("jobs") if isinstance(doc, dict) else None
    if not isinstance(jobs, dict):
        continue
    workflow_defaults = doc.get("defaults") if isinstance(doc, dict) else None
    workflow_env = doc.get("env") if isinstance(doc, dict) else None
    for job_name, job in jobs.items():
        if not isinstance(job, dict) or not is_windows_job(job):
            continue
        steps = job.get("steps")
        if not isinstance(steps, list):
            continue
        for step in steps:
            if not isinstance(step, dict):
                continue
            run_text = step.get("run")
            if not isinstance(run_text, str):
                continue
            if not is_bash_shell(effective_shell(step, job, workflow_defaults)):
                continue
            if skips_windows(step):
                continue
            hit_unguarded = any(
                not merged_optout(workflow_env, job.get("env"), step.get("env"), body, attached)
                for _flag, attached, body in slash_body_hits(run_text)
            )
            if hit_unguarded:
                problems.append(
                    "%s(job-%s/step-%s:unguarded-slash-body-argv)"
                    % (path, job_name, safe_step_name(step))
                )

if not os.path.exists(PEROS):
    problems.append("opencode-peros-test.yml(missing)")
else:
    try:
        with open(PEROS) as handle:
            peros_doc = yaml.safe_load(handle)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (PEROS, exc))
        peros_doc = None
    peros_env = peros_doc.get("env") if isinstance(peros_doc, dict) else None
    peros_jobs = (peros_doc or {}).get("jobs") if isinstance(peros_doc, dict) else None
    if not isinstance(peros_jobs, dict):
        peros_jobs = {}
    for os_name, job_id in FORWARDERS:
        want = "Forward %s tester decision" % os_name
        # Exact-name matches anywhere in the file: a duplicate is a decoy
        # (the forwarder is identified by name, so a second same-named step
        # could stand in for a defaced forwarder) and is always red.
        named = [
            step
            for job in peros_jobs.values()
            if isinstance(job, dict)
            for step in (job.get("steps") if isinstance(job.get("steps"), list) else [])
            if isinstance(step, dict) and step.get("name") == want
        ]
        if len(named) > 1:
            problems.append("peros(forward-%s-name-duplicate:%d)" % (os_name, len(named)))
            continue
        found = None
        job = peros_jobs.get(job_id)
        if isinstance(job, dict):
            for step in job.get("steps") if isinstance(job.get("steps"), list) else []:
                if isinstance(step, dict) and step.get("name") == want:
                    found = step
                    break
        if found is None:
            problems.append("peros(forward-%s-step-missing-in-%s)" % (os_name, job_id))
            continue
        step = found
        run_text = step.get("run") if isinstance(step.get("run"), str) else ""
        if not merged_optout(peros_env, job.get("env"), step.get("env")):
            problems.append("peros(forward-%s-no-msys-optout)" % os_name)
        transport = False
        raw_body = False
        for line in logical_lines(run_text):
            stripped = normalize_line(strip_comment(line)).strip()
            if not stripped:
                continue
            gh = GH_WORD_RE.search(stripped)
            if gh is not None and at_top_level(stripped, gh.end(1)):
                match = BODY_FILE_STDIN_RE.search(stripped)
                if match is not None and at_top_level(stripped, match.start()):
                    transport = True
            # Any top-level --body that is not --body-file, or any standalone
            # -b token (separate or attached, variable or literal), means a
            # handoff body can reach argv on this step.
            for regex in (BODY_TOKEN_RE, SHORT_B_TOKEN_RE):
                match = regex.search(stripped)
                if match is not None and at_top_level(stripped, match.start()):
                    raw_body = True
        if not transport:
            problems.append("peros(forward-%s-no-stdin-transport)" % os_name)
        if raw_body:
            problems.append("peros(forward-%s-raw-argv-body)" % os_name)

# Composite actions run on the caller's runner, so a bash run step holding a
# slash-leading gh body can execute under Git Bash on Windows just like an
# inline workflow step. There is no safe default here: every such composite
# invocation must carry an MSYS env opt-out (or none may exist at all).
for action_path in sorted(set(glob.glob(".github/actions/*/action.yml") + glob.glob(".github/actions/*/action.yaml"))):
    try:
        with open(action_path) as handle:
            action_doc = yaml.safe_load(handle)
    except Exception as exc:
        problems.append("%s(yaml-parse-error:%s)" % (action_path, exc))
        continue
    runs = action_doc.get("runs") if isinstance(action_doc, dict) else None
    steps = runs.get("steps") if isinstance(runs, dict) else None
    if not isinstance(steps, list):
        continue
    for step in steps:
        if not isinstance(step, dict):
            continue
        run_text = step.get("run")
        if not isinstance(run_text, str):
            continue
        shell = str(step.get("shell") or "")
        if not is_bash_shell(shell):
            continue
        if skips_windows(step):
            # A composite step conditioned away from Windows (evaluated on
            # the caller's runner) can never hit MSYS path conversion.
            continue
        hit_unguarded = any(
            not env_optout(step.get("env"), body, attached)
            for _flag, attached, body in slash_body_hits(run_text)
        )
        if not hit_unguarded:
            continue
        problems.append(
            "%s(composite-step-%s:unguarded-slash-body-argv)"
            % (action_path, safe_step_name(step))
        )

for problem in problems:
    sys.stdout.write(problem + "\n")
R18PY
) || r18_python_out="python-runtime(exit-failure)"
if [ -n "$r18_python_out" ]; then
  while IFS= read -r r18_line; do
    [ -n "$r18_line" ] || continue
    r18_bad="${r18_bad} ${r18_line}"
  done <<< "$r18_python_out"
fi
if [ -z "$r18_bad" ]; then
  check "R18" "every Windows-runner bash step passes slash-leading bodies through argv only behind a real MSYS env opt-out, and the three per-OS forwarders carry the opt-out plus the stdin (--body-file -) transport with no raw-argv body (issue #612)" "ok"
else
  check "R18" "Windows MSYS argv-conversion guard missing:${r18_bad} (issue #612: a /oc handoff body can be posted as a mangled C:/Program Files/Git path)" "bad"
fi

# [R19] Review-comment publication evidence (issue #616): the review verify
# step treated ANY present /tmp/random-lab-decision.json as a completed
# verdict, even when the reviewer died between the decision-file write and
# the comment post (provider api_key_expired at turn end, review run
# 39052018409 on PR #614): the gate forwarded an unread verdict with zero
# published findings. Properties:
#   1. the shared script accepts only a github-actions[bot] comment created
#      after the triggering comment whose body carries the reviewer sign-off
#      line (the wrapper's final-message comment with its run footer and a
#      mid-session comment-tool post without one both qualify; the dying
#      run's sign-off-less APIError comment never does), and exits
#      0 published / 1 not published / 2 unverifiable;
#   2. the verify step reads the script from this run's own workflow commit
#      (never the checked-out PR head, so a PR can never weaken the gate
#      that reviews it) and fails closed when it is unavailable;
#   3. an unpublished verdict is discarded BEFORE the infra override and the
#      forward step can ever see it, and a failed agent step falls into the
#      existing bounded auto-retry; a verification failure (exit 2) neither
#      forwards nor auto-retries a possibly-published review;
#   4. the force-lab-routing and forward steps are gated on the verify
#      step's success, so no forward path survives an inconclusive verify;
#   5. a functional test executes the real script against an executable mock
#      `gh` (interception asserted, credentials scrubbed, per-case payload
#      from a sandbox config file, sandbox outside the repo tree) across
#      published (footer + tool-posted + page-2 + trailing-space),
#      incident-error, stale, owner-authored, inline-mention, empty,
#      bad-json, and fetch-failure payloads.
# Review-gated residual boundary (same as R17): the verify step's own shell
# control flow cannot be executed by a static audit, so an arbitrary
# reshuffle that still passes every exact-form and ordering pin below is
# caught by the review gate, not by this rule.
r19_bad=""
R19_SCRIPT=".github/scripts/review-comment-published.sh"
R19_VERDICT_GATE="if: steps.pr-info.outputs.is_pr == 'true' && always() && steps.actor_gate.outputs.run == 'true' && steps.verify-review.outcome == 'success'"
if [ ! -f "$R19_SCRIPT" ]; then
  r19_bad="${r19_bad} review-comment-published.sh(missing)"
else
  bash -n "$R19_SCRIPT" 2>/dev/null || r19_bad="${r19_bad} script(syntax)"
  [ -x "$R19_SCRIPT" ] || r19_bad="${r19_bad} script(not-executable)"
  # Exact evidence predicate: bot author + created after the trigger + a real
  # sign-off line. Weakening or removing any filter must trip the rule.
  sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -qxF '| select(.user.login == "github-actions[bot]")' || r19_bad="${r19_bad} script(no-bot-author-select)"
  sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -qxF '| select(.created_at > $since)' || r19_bad="${r19_bad} script(no-since-filter)"
  sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -qxF '| select(.body | test("(?m)^- the Reviewer[ \t]*$"))' || r19_bad="${r19_bad} script(no-signoff-regex)"
  # Paginated, slurped fetch (a single unpaginated page would miss the
  # decision comment on busy threads and silently read as unpublished).
  sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -qxF 'payload=$(gh api "repos/${REPO}/issues/${PR}/comments?per_page=100" --paginate --slurp 2>/dev/null) || {' || r19_bad="${r19_bad} script(no-paginated-slurp-fetch)"
  # Exit-code contract: exactly one published exit 0 and one not-published
  # exit 1; every failure path exits 2. An added silent `exit 0` (e.g. in
  # front of the fetch guard) or a weakened failure exit trips the counts.
  r19_exit0=$(sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -cxF 'exit 0' || true)
  r19_exit1=$(sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -cxF 'exit 1' || true)
  r19_exit2=$(sed 's/^[[:space:]]*//' "$R19_SCRIPT" | grep -cxF 'exit 2' || true)
  [ "$r19_exit0" -eq 1 ] || r19_bad="${r19_bad} script(exit0-count=${r19_exit0},want=1)"
  [ "$r19_exit1" -eq 1 ] || r19_bad="${r19_bad} script(exit1-count=${r19_exit1},want=1)"
  [ "$r19_exit2" -ge 4 ] || r19_bad="${r19_bad} script(exit2-count=${r19_exit2},want>=4)"
  # Harness-detection bans: the functional test runs with realistic values,
  # so the script must not branch on CI-only env or hardcode a repo slug.
  grep -qF 'GITHUB_ACTIONS' "$R19_SCRIPT" && r19_bad="${r19_bad} script(references-GITHUB_ACTIONS)"
  grep -qF 'MOCK_' "$R19_SCRIPT" && r19_bad="${r19_bad} script(references-MOCK)"
  grep -qF 'Userfrom1995' "$R19_SCRIPT" && r19_bad="${r19_bad} script(hardcodes-repo-slug)"
  grep -qF 'RandomLabs/' "$R19_SCRIPT" && r19_bad="${r19_bad} script(hardcodes-repo-slug)"
fi
if [ ! -f "$REVIEW_WF" ]; then
  r19_bad="${r19_bad} opencode-review.yml(missing)"
else
  r19_verify_block=$(sed -n '/- name: Verify review decided, else auto-retry/,/^      - name: /p' "$REVIEW_WF" 2>/dev/null || true)
  if [ -z "$r19_verify_block" ]; then
    r19_bad="${r19_bad} review.yml(verify-step-missing-or-renamed)"
  else
    # The trigger timestamp must arrive via env indirection, never expanded
    # into the run script text (R10).
    printf '%s\n' "$r19_verify_block" | sed 's/^[[:space:]]*//' | grep -qxF 'SINCE: ${{ github.event.comment.created_at }}' || r19_bad="${r19_bad} review.yml(no-since-env)"
    # Script provenance: this run's own workflow commit, never the PR head.
    printf '%s\n' "$r19_verify_block" | grep -qF 'if ! git cat-file -e "${GITHUB_SHA}:.github/scripts/review-comment-published.sh" 2>/dev/null; then' || r19_bad="${r19_bad} review.yml(no-workflow-commit-probe)"
    printf '%s\n' "$r19_verify_block" | grep -qF 'git show "${GITHUB_SHA}:.github/scripts/review-comment-published.sh" > "$evidence_script" 2>/dev/null || rm -f "$evidence_script"' || r19_bad="${r19_bad} review.yml(no-workflow-commit-extraction)"
    printf '%s\n' "$r19_verify_block" | grep -q 'bash \.github/scripts/review-comment-published\.sh' && r19_bad="${r19_bad} review.yml(head-workspace-script-invocation)"
    printf '%s\n' "$r19_verify_block" | grep -qF 'bash "$evidence_script" "$pr" "$SINCE" || pub_rc=$?' || r19_bad="${r19_bad} review.yml(no-evidence-invocation)"
    # Fail-closed when the script cannot be extracted.
    printf '%s\n' "$r19_verify_block" | grep -qF 'if [ ! -s "$evidence_script" ]; then' || r19_bad="${r19_bad} review.yml(no-fail-closed-on-missing-script)"
    # Exit-code mapping: 0 published / 1 unpublished / anything else refuse.
    printf '%s\n' "$r19_verify_block" | grep -qF '0) published="true" ;;' || r19_bad="${r19_bad} review.yml(no-published-map)"
    printf '%s\n' "$r19_verify_block" | grep -qF '1) published="false" ;;' || r19_bad="${r19_bad} review.yml(no-unpublished-map)"
    r19_unknown_block=$(printf '%s\n' "$r19_verify_block" | awk '
      $0 ~ /^[[:space:]]*\*\)[[:space:]]*$/ { f=1 }
      f { print }
      f && $0 ~ /^[[:space:]]*;;[[:space:]]*$/ { exit }')
    printf '%s\n' "$r19_unknown_block" | grep -qF 'rm -f /tmp/random-lab-decision.json' || r19_bad="${r19_bad} review.yml(unknown-verify-keeps-verdict)"
    printf '%s\n' "$r19_unknown_block" | grep -qE '^[[:space:]]*exit 1$' || r19_bad="${r19_bad} review.yml(unknown-verify-not-exit-1)"
    printf '%s\n' "$r19_unknown_block" | grep -q 'gh api' && r19_bad="${r19_bad} review.yml(unknown-verify-auto-retries)"
    # Ordering (issue #616 core): evidence before verdict, verdict before the
    # published guard, published guard before its exit 0, and the discard of
    # an unpublished verdict between the guard and the retry block.
    r19_line() { printf '%s\n' "$r19_verify_block" | grep -nF -- "$1" | head -1 | cut -d: -f1; }
    r19_ev_line=$(r19_line 'bash "$evidence_script" "$pr" "$SINCE" || pub_rc=$?')
    r19_verdict_line=$(r19_line 'if [ -f /tmp/random-lab-decision.json ]; then')
    r19_pubtrue_line=$(r19_line 'if [ "$published" = "true" ]; then')
    r19_pubexit_line=$(r19_line 'Review decision file present and the decision comment is published; gate produced a verdict.')
    r19_retry_line=$(r19_line 'if [ "$outcome" != "success" ]; then')
    r19_unpubl_line=$(r19_line 'if [ "$unpublished_verdict" = "true" ]; then')
    r19_uverdict_line=$(r19_line 'unpublished_verdict="true"')
    if [ -z "$r19_ev_line" ] || [ -z "$r19_verdict_line" ] || [ "$r19_ev_line" -ge "$r19_verdict_line" ]; then
      r19_bad="${r19_bad} review.yml(evidence-not-before-verdict:${r19_ev_line:-none}/${r19_verdict_line:-none})"
    fi
    if [ -z "$r19_verdict_line" ] || [ -z "$r19_pubtrue_line" ] || [ -z "$r19_pubexit_line" ] || [ "$r19_verdict_line" -ge "$r19_pubtrue_line" ] || [ "$r19_pubtrue_line" -ge "$r19_pubexit_line" ]; then
      r19_bad="${r19_bad} review.yml(published-guard-order:${r19_verdict_line:-none}/${r19_pubtrue_line:-none}/${r19_pubexit_line:-none})"
    fi
    if [ -z "$r19_retry_line" ] || [ -z "$r19_unpubl_line" ] || [ -z "$r19_uverdict_line" ] || [ "$r19_uverdict_line" -ge "$r19_retry_line" ] || [ "$r19_retry_line" -ge "$r19_unpubl_line" ]; then
      r19_bad="${r19_bad} review.yml(unpublished-discard-order:${r19_uverdict_line:-none}/${r19_retry_line:-none}/${r19_unpubl_line:-none})"
    fi
    r19_discard_line=$(printf '%s\n' "$r19_verify_block" | grep -nF 'rm -f /tmp/random-lab-decision.json' | awk -F: -v a="$r19_pubtrue_line" -v b="$r19_retry_line" '$1 > a && $1 < b {print $1; exit}')
    [ -n "$r19_discard_line" ] || r19_bad="${r19_bad} review.yml(no-discard-between-verdict-and-retry)"
    [ "$(printf '%s\n' "$r19_verify_block" | grep -cF 'rm -f /tmp/random-lab-decision.json' || true)" -ge 3 ] || r19_bad="${r19_bad} review.yml(discard-count-lt-3)"
    # No forward path survives an inconclusive verify: both the infra
    # override and the decision forward carry the exact verify-success gate.
    r19_gated=$(grep -cF "if: steps.pr-info.outputs.is_pr == 'true' && always() && steps.actor_gate.outputs.run == 'true' && steps.verify-review.outcome == 'success'" "$REVIEW_WF" || true)
    [ "$r19_gated" -eq 2 ] || r19_bad="${r19_bad} review.yml(verify-gated-forward-count=${r19_gated},want=2)"
    printf '%s\n' "$(grep -A1 -F -- '- name: Force lab routing for infrastructure PRs' "$REVIEW_WF" | tail -1 | sed 's/^[[:space:]]*//')" | grep -qxF "$R19_VERDICT_GATE" || r19_bad="${r19_bad} review.yml(force-lab-step-not-gated)"
    printf '%s\n' "$(grep -A1 -F -- '- name: Forward reviewer decision' "$REVIEW_WF" | tail -1 | sed 's/^[[:space:]]*//')" | grep -qxF "$R19_VERDICT_GATE" || r19_bad="${r19_bad} review.yml(forward-step-not-gated)"
  fi
fi
# Functional contract test (delegation.md section 6: executable mock,
# interception asserted before any run, credentials scrubbed, sandbox
# outside the repo tree, per-case behavior from a sandbox config file, live
# non-credential Actions env set realistically so env-fingerprint detection
# cannot green a broken script). The real script must classify real payload
# shapes, including paginated slurp pages.
if [ -f "$R19_SCRIPT" ]; then
  r19_script_abs="$(pwd)/$R19_SCRIPT"
  r19_tmp=$(mktemp -d 2>/dev/null || true)
  if [ -z "$r19_tmp" ] || [ ! -d "$r19_tmp" ]; then
    r19_bad="${r19_bad} script(functional-sandbox-unavailable)"
  elif ! command -v jq >/dev/null 2>&1; then
    r19_bad="${r19_bad} script(functional-jq-missing)"
  else
    trap 'rm -rf "$r19_tmp"' EXIT
    r19_mockdir="$r19_tmp/bin"
    mkdir -p "$r19_mockdir"
    cat > "$r19_mockdir/gh" <<'R19_MOCK'
#!/usr/bin/env bash
r19_cfg="$(cd "$(dirname "$0")/.." && pwd)/case.cfg"
payload_file=""
fail_fetch="0"
# shellcheck disable=SC1090
. "$r19_cfg"
case "$*" in
  *"/comments"*)
    if [ "$fail_fetch" = "1" ]; then
      echo "mock gh: api failure" >&2
      exit 1
    fi
    cat "$payload_file"
    ;;
  *)
    echo "mock gh: unexpected call: $*" >&2
    exit 1
    ;;
esac
R19_MOCK
    chmod +x "$r19_mockdir/gh"
    if [ "$(PATH="$r19_mockdir:$PATH" command -v gh)" != "$r19_mockdir/gh" ]; then
      r19_bad="${r19_bad} script(functional-mock-not-intercepted)"
    else
      r19_since="2026-10-17T17:12:07Z"
      r19_p_footer="$r19_tmp/p-footer.json"
      cat > "$r19_p_footer" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"## Review\n\nVerified the fix.\n\n- the Reviewer\n\n[github run](https://github.com/Userfrom1995/RandomLabs/actions/runs/39057481045)"}]]
R19_PAYLOAD
      r19_p_tool="$r19_tmp/p-tool.json"
      cat > "$r19_p_tool" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"## Review\n\n- the Reviewer\n"}]]
R19_PAYLOAD
      r19_p_page2="$r19_tmp/p-page2.json"
      cat > "$r19_p_page2" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:00:00Z","body":"old note"}],[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"- the Reviewer"}]]
R19_PAYLOAD
      r19_p_trail="$r19_tmp/p-trail.json"
      cat > "$r19_p_trail" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"## Review\n\n- the Reviewer   "}]]
R19_PAYLOAD
      r19_p_incident="$r19_tmp/p-incident.json"
      cat > "$r19_p_incident" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:12:08Z","body":"APIError: The operation was aborted. (api_key_expired)"}]]
R19_PAYLOAD
      r19_p_stale="$r19_tmp/p-stale.json"
      cat > "$r19_p_stale" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T16:00:00Z","body":"## Review\n\n- the Reviewer"}]]
R19_PAYLOAD
      r19_p_owner="$r19_tmp/p-owner.json"
      cat > "$r19_p_owner" <<'R19_PAYLOAD'
[[{"user":{"login":"Userfrom1995"},"created_at":"2026-10-17T17:20:00Z","body":"## Review\n\n- the Reviewer"}]]
R19_PAYLOAD
      r19_p_inline="$r19_tmp/p-inline.json"
      cat > "$r19_p_inline" <<'R19_PAYLOAD'
[[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T17:20:00Z","body":"See the line \"- the Reviewer\" quoted above."}]]
R19_PAYLOAD
      r19_p_empty="$r19_tmp/p-empty.json"
      printf '[[]]\n' > "$r19_p_empty"
      r19_p_badjson="$r19_tmp/p-badjson.json"
      printf '{"message":"Not Found"}\n' > "$r19_p_badjson"
      r19_case() {
        r19_case_name="$1"; r19_case_want="$2"; r19_case_payload="$3"; shift 3
        {
          printf 'payload_file=%q\n' "$r19_case_payload"
          printf 'fail_fetch="0"\n'
          for r19_kv in "$@"; do printf '%s\n' "$r19_kv"; done
        } > "$r19_tmp/case.cfg"
        r19_case_out=$(cd "$r19_tmp" && env -u GITHUB_TOKEN -u GH_TOKEN -u GH_API_TOKEN \
          PATH="$r19_mockdir:$PATH" GITHUB_ACTIONS=true GITHUB_REPOSITORY="Userfrom1995/RandomLabs" \
          bash "$r19_script_abs" 614 "$r19_since" 2>&1)
        r19_case_rc=$?
        if [ "$r19_case_rc" -ne "$r19_case_want" ]; then
          r19_bad="${r19_bad} script(functional-${r19_case_name}-rc=${r19_case_rc},want=${r19_case_want})"
          printf 'R19 functional case %s failed (rc=%s, want=%s); output:\n%s\n' "$r19_case_name" "$r19_case_rc" "$r19_case_want" "$r19_case_out" >&2
        fi
      }
      r19_case published-footer 0 "$r19_p_footer"
      r19_case published-tool 0 "$r19_p_tool"
      r19_case page2-signoff 0 "$r19_p_page2"
      r19_case trailing-space 0 "$r19_p_trail"
      r19_case incident-error 1 "$r19_p_incident"
      r19_case stale 1 "$r19_p_stale"
      r19_case owner-authored 1 "$r19_p_owner"
      r19_case inline-mention 1 "$r19_p_inline"
      r19_case empty 1 "$r19_p_empty"
      r19_case bad-json 2 "$r19_p_badjson"
      r19_case fetch-failure 2 "$r19_tmp/never-read.json" 'fail_fetch="1"'
    fi
  fi
fi
if [ -f .github/agents/reviewer.md ]; then
  grep -qF 'Publication Contract (issue #616)' .github/agents/reviewer.md || r19_bad="${r19_bad} reviewer.md(no-publication-contract)"
else
  r19_bad="${r19_bad} reviewer.md(missing)"
fi
if [ -z "$r19_bad" ]; then
  check "R19" "review forwarding requires published decision-comment evidence: the shared script accepts only a bot-authored, post-trigger, reviewer-signed comment (exit 0/1/2), the verify step extracts it from this run's own workflow commit, discards unpublished verdicts before the retry and forward paths, fails closed on inconclusive verification, and both forward steps are verify-success gated (issue #616)" "ok"
else
  check "R19" "review-comment publication-evidence guard missing:${r19_bad} (issue #616: a reviewer death between the decision-file write and the comment post forwards an unread verdict with zero published findings)" "bad"
fi

# [R20] Paginated comment-read guard (issue #621): every retry/auto-heal cap
# and gate-count enumeration read the thread comments with an UNPAGINATED
# `gh api .../comments` call. The REST API serves 30 comments per page, oldest
# first, so on any thread past 30 comments the recent retry markers fall
# outside page 1 and the count reads 0: the cap never trips and a crash-looping
# gate re-posts retry 1 forever (live on PR #609, 34 comments, 2026-10-17;
# flagged by both #618 quality gates). A truncated page is not an API failure,
# so the existing refuse-to-retry-on-enumeration-failure guard never fires.
# The required form is the paginated slurp: a ?per_page=100 query plus
# `--paginate --slurp` piped to `jq` with the `.[][]` page iterator
# (`--slurp` cannot be combined with `--jq`; it yields an array of pages).
# Properties:
#   1. every enumeration site in the cohort carries the exact paginated form
#      (per_page=100, --paginate --slurp, piped jq, no --jq flag);
#   2. no unpaginated issue-comment read remains in any workflow file (a
#      workflow-tree discovery scan, so a new read cannot regress silently);
#   3. a functional harness executes EVERY real extracted enumeration pipeline
#      against an executable mock `gh` bound to a 3-page slurp payload whose
#      markers sit on page 3 (34-comment thread shape, past the old
#      30-comment page boundary): each counter must read 3 (the cap trips) and
#      the freshness read must select the newest page-3 timestamp. The mock
#      refuses an unpaginated call, and interception is asserted first
#      (delegation.md section 6 harness isolation).
r20_bad=""
r20_files=".github/workflows/opencode.yml .github/workflows/opencode-review.yml .github/workflows/curator.yml .github/workflows/ideate.yml .github/workflows/opencode-eval.yml"
r20_found=""
# Real cohort extraction: the assignment line through the line that closes the
# command substitution, for every known enumeration variable. The old
# unpaginated `--jq` form in a workflow file is mutated by the verification
# matrix and must turn this rule red.
r20_snips_of() {
  awk '
    /^[ \t]*(retries|heals|recent|approval_comments)[=][$][(]gh api/ {
      buf = $0 "\n"
      if ($0 ~ /\|\|[ \t]*(true|echo)/) { printf "%s%c", buf, 0; buf=""; next }
      collecting = 1; next
    }
    collecting {
      buf = buf $0 "\n"
      if ($0 ~ /\|\|[ \t]*(true|echo)/) { printf "%s%c", buf, 0; collecting = 0; buf="" }
    }
  ' "$1" 2>/dev/null || true
}
for r20_file in $r20_files; do
  if [ ! -f "$r20_file" ]; then
    r20_bad="${r20_bad} ${r20_file}(missing)"
    continue
  fi
  while IFS= read -r -d '' r20_snip; do
    [ -n "$r20_snip" ] || continue
    r20_marker=$(printf '%s\n' "$r20_snip" | grep -oE '(startswith|contains)\("[^"]+"' | head -1 | sed -E 's/^(startswith|contains)\("//; s/"$//')
    if [ -z "$r20_marker" ]; then
      r20_bad="${r20_bad} ${r20_file}(enumeration-without-recognizable-marker)"
      continue
    fi
    r20_found="${r20_found}${r20_file}|${r20_marker}
"
    printf '%s\n' "$r20_snip" | grep -q '?per_page=100' || r20_bad="${r20_bad} ${r20_file}(${r20_marker}:no-per_page-100)"
    printf '%s\n' "$r20_snip" | grep -q -- '--paginate --slurp' || r20_bad="${r20_bad} ${r20_file}(${r20_marker}:no-paginate-slurp)"
    printf '%s\n' "$r20_snip" | grep -q -- '--jq' && r20_bad="${r20_bad} ${r20_file}(${r20_marker}:jq-flag-cannot-combine-with-slurp)"
    printf '%s\n' "$r20_snip" | grep -qE '\|[[:space:]]*jq ' || r20_bad="${r20_bad} ${r20_file}(${r20_marker}:no-piped-jq)"
    printf '%s\n' "$r20_snip" | grep -qF '.[][]' || r20_bad="${r20_bad} ${r20_file}(${r20_marker}:no-page-iterator)"
  done < <(r20_snips_of "$r20_file")
done
# Expected-site registry: every retry/auto-heal/gate enumeration must be
# present. Deleting a counter or renaming its marker trips the rule.
while IFS='|' read -r r20_ef r20_em; do
  [ -n "$r20_ef" ] || continue
  printf '%s\n' "$r20_found" | grep -qxF "${r20_ef}|${r20_em}" || r20_bad="${r20_bad} ${r20_ef}(missing-enumeration:${r20_em})"
done <<'R20_EXPECTED'
.github/workflows/opencode.yml|/oc research (auto-retry
.github/workflows/opencode.yml|/oc architect (auto-retry
.github/workflows/opencode.yml|/oc build this (auto-retry
.github/workflows/opencode.yml|/oc continue (auto-heal
.github/workflows/opencode.yml|/oc fix (auto-retry
.github/workflows/opencode.yml|/oc design (auto-retry
.github/workflows/opencode.yml|/oc design-ux (auto-retry
.github/workflows/opencode.yml|/oc design-visual (auto-retry
.github/workflows/opencode.yml|/oc design-motion (auto-retry
.github/workflows/opencode-review.yml|/oc review (auto-retry
.github/workflows/curator.yml|/oc curate (auto-retry
.github/workflows/ideate.yml|### Candidate:
.github/workflows/opencode-eval.yml|/oc approve-test
R20_EXPECTED
# Repo-wide discovery backstop: any issue-comment read that neither paginates
# nor targets a single comment trips, so a new workflow cannot silently
# regress. Posting calls (`-f body`) and the single-comment PATCH endpoint
# (`.../issues/comments/<id>`) are out of class by construction.
r20_unpaginated=$(grep -rnE 'gh api "[^"]*/comments"' .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null | grep -vE -- '--paginate|\?per_page=100' | grep -v -- '-f body' || true)
if [ -n "$r20_unpaginated" ]; then
  r20_bad="${r20_bad} unpaginated-read(s):$(printf '%s' "$r20_unpaginated" | head -3 | tr '\n' ' ')"
fi
# Functional harness: the real extracted pipelines against a mock gh that
# emits a 3-page slurp array and refuses any unpaginated call. The payload
# mirrors PR #609 (30 comments on page 1, 1 filler on page 2, 3 retry markers
# on page 3 = 34 comments): an unpaginated read sees page 1 only, so the mock
# refusal and the count assertion together prove the cap now trips.
if ! command -v jq >/dev/null 2>&1; then
  r20_bad="${r20_bad} harness(jq-missing)"
else
  r20_tmp=$(mktemp -d 2>/dev/null || true)
  if [ -z "$r20_tmp" ] || [ ! -d "$r20_tmp" ]; then
    r20_bad="${r20_bad} harness(sandbox-unavailable)"
  else
    r20_mockdir="$r20_tmp/bin"
    mkdir -p "$r20_mockdir"
    cat > "$r20_mockdir/gh" <<'R20_MOCK'
#!/usr/bin/env bash
case "$*" in
  *--slurp*) cat "$R20_PAYLOAD" ;;
  *) echo "mock gh: unpaginated comment read refused: $*" >&2; exit 1 ;;
esac
R20_MOCK
    chmod +x "$r20_mockdir/gh"
    if [ "$(PATH="$r20_mockdir:$PATH" command -v gh)" != "$r20_mockdir/gh" ]; then
      r20_bad="${r20_bad} harness(mock-not-intercepted)"
    else
      r20_case=0
      for r20_file in $r20_files; do
        [ -f "$r20_file" ] || continue
        while IFS= read -r -d '' r20_snip; do
          [ -n "$r20_snip" ] || continue
          r20_case=$((r20_case + 1))
          r20_marker=$(printf '%s\n' "$r20_snip" | grep -oE '(startswith|contains)\("[^"]+"' | head -1 | sed -E 's/^(startswith|contains)\("//; s/"$//')
          r20_login="mockowner"
          if printf '%s\n' "$r20_snip" | grep -qF 'github-actions[bot]'; then
            r20_login='github-actions[bot]'
          fi
          r20_payload_file="$r20_tmp/payload-$r20_case.json"
          jq -n --arg login "$r20_login" --arg marker "$r20_marker" '
            [ [range(30) | {user:{login:"filler"},created_at:"2026-10-16T00:00:00Z",body:"filler"}],
              [{user:{login:"filler"},created_at:"2026-10-16T00:00:01Z",body:"filler"}],
              [ {user:{login:$login},created_at:"2026-10-17T19:00:00Z",body:($marker + " 1)")},
                {user:{login:$login},created_at:"2026-10-17T19:01:00Z",body:($marker + " 2)")},
                {user:{login:$login},created_at:"2026-10-17T19:02:00Z",body:($marker + " 3)")} ] ]
          ' > "$r20_payload_file" 2>/dev/null
          {
            printf 'target=609 issue=609 pr=609 issue_num=609 board=609\n'
            printf '%s\n' "$r20_snip" \
              | sed -e 's/\${{ github\.repository_owner }}/mockowner/g' \
                    -e 's/\${{ github\.repository }}/mockrepo/g' \
                    -e 's/\${{ [^}]* }}/1/g'
            r20_var=$(printf '%s\n' "$r20_snip" | sed -n '1s/^[[:space:]]*\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p')
            printf 'printf "%%s" "$%s"\n' "$r20_var"
          } > "$r20_tmp/case.sh"
          r20_out=$(cd "$r20_tmp" && env -u GITHUB_TOKEN -u GITHUB_EVENT_PATH -u GITHUB_RUN_ID \
            -u GITHUB_REPOSITORY -u GITHUB_ACTIONS -u GH_TOKEN -u GH_API_TOKEN \
            PATH="$r20_mockdir:$PATH" R20_PAYLOAD="$r20_payload_file" bash "$r20_tmp/case.sh" 2>/dev/null)
          if printf '%s\n' "$r20_snip" | grep -q '| length'; then
            [ "$r20_out" = "3" ] || r20_bad="${r20_bad} harness(${r20_file}:${r20_marker}:count=${r20_out:-empty},want=3)"
          else
            [ "$(printf '%s' "$r20_out" | tr -d '"')" = "2026-10-17T19:02:00Z" ] || r20_bad="${r20_bad} harness(${r20_file}:${r20_marker}:latest=${r20_out:-empty},want=2026-10-17T19:02:00Z)"
          fi
        done < <(r20_snips_of "$r20_file")
      done
    fi
    rm -rf "$r20_tmp"
  fi
fi
if [ -z "$r20_bad" ]; then
  check "R20" "every retry/auto-heal and gate-count enumeration uses the paginated slurp form and the 3-page harness proves markers on page 3 are counted (cap trips); no unpaginated issue-comment read remains (issue #621)" "ok"
else
  check "R20" "paginated comment-read guard missing:${r20_bad} (issue #621: an unpaginated read sees only the oldest 30 comments, the cap reads 0, and a crash loop re-posts retry 1 forever)" "bad"
fi
# [R21] PAT merge approval binding (issue #619): the sweep's approval
# detection was an unanchored substring match over every github-actions[bot]
# comment (.body | contains("/oc approve-test")), so a Maintainer decisions
# summary that merely QUOTED the tester marker while describing another PR
# counted as this PR's verdict: the sweep merged workflow-touching #618 at
# 18:55:19Z with no review verdict and no read-only test (maintainer run
# 39059718673, matched comment 6239004626 at 18:55:04Z, while #618's first
# verdicts only arrived later: review 19:00:08Z, read-only test 19:08:19Z),
# and a third time at 19:38:31Z when a tester-marker quote inside maintainer
# run 39062904001's own summary comment (6239740609, 11 seconds earlier)
# merged #624 with zero verdicts on record. The same run then skipped the
# genuinely approved #609 as mergeable=UNKNOWN, because GitHub recomputes
# mergeability right after the sweep itself advanced main (post-merge
# recompute race). Anchoring alone is not enough: #609's genuine 18:50:48Z
# verdict is head-stale after its rebase, and an anchored-but-unbound match
# would merge the rebased head before its fresh read-only round. Properties:
#   1. the verdict predicate is anchored to the verdict SHAPE: the marker
#      must be the comment's entire first line, optionally backticked, and
#      the unanchored contains() form is banned from the sweep;
#   2. head-binding is mandatory: the verdict must not predate the head's
#      last push (the later of the head commits' committer dates and any
#      head_ref_force_pushed timeline event), computed before the check and
#      failing closed when the time cannot be established;
#   3. mergeable=UNKNOWN is re-queried a bounded number of times instead of
#      skipping on the first read;
#   4. a functional harness extracts the real predicate (from the single
#      live assignment line only: commented-out predicates are never
#      executed and a second live assignment is rejected) and the real
#      head-binding decision block from maintainer.yml and executes them
#      against genuine and hostile payloads (quoted mentions mid-prose and
#      on their own line, owner-authored, trailing prose, stale/force-push/
#      missing head times) with no network access, asserting the exact
#      verdict timestamp each genuine case returns and pinning both
#      head-time sort|tail reductions so a min-reducer swap cannot pass.
# Review-gated residual boundary: the surrounding sweep control flow is
# still review-gated, but every property above is pinned by exact fragments,
# ordering checks, and executable behavior. Honest limit: committer dates
# are author-settable and only force-push events carry a true push
# timestamp, so a fast-forward push of commits with forged older dates after
# a verdict would not stale it; the lab's bot pushes create fresh-dated
# commits, so this is outside the bot trust model.
r21_bad=""
if [ ! -f "$MAIN_WF" ]; then
  r21_bad=" maintainer.yml(missing)"
else
  r21_pat_block=$(sed -n '/- name: PAT-backed merge for approved workflow-touching PRs/,/^      - name: /p' "$MAIN_WF" 2>/dev/null || true)
  if [ -z "$r21_pat_block" ]; then
    r21_bad="${r21_bad} maintainer.yml(pat-merge-step-missing-or-renamed)"
  else
    # 1. Shape-anchored verdict predicate present verbatim; the unanchored
    #    contains() form is banned.
    r21_approve_line=$(printf '%s\n' "$r21_pat_block" | sed 's/^[[:space:]]*//' | grep -vE '^#' | grep -F 'approve_test_time=$(echo "$comments" | jq -r ' | head -1 || true)
    [ "$(printf '%s\n' "$r21_pat_block" | grep -cF 'approve_test_time=$(echo "$comments" | jq -r ')" -eq 1 ] || r21_bad="${r21_bad} maintainer.yml(verdict-predicate-not-single-live-assignment)"
    printf '%s\n' "$r21_approve_line" | grep -qF 'select(.user.login=="github-actions[bot]"' || r21_bad="${r21_bad} maintainer.yml(verdict-predicate-no-bot-author)"
    printf '%s\n' "$r21_approve_line" | grep -qF '(.body|split("\n")[0]|test("^`?/oc approve-test`?[[:space:]]*$"))' || r21_bad="${r21_bad} maintainer.yml(verdict-predicate-not-shape-anchored)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'contains("/oc approve-test")' && r21_bad="${r21_bad} maintainer.yml(unanchored-approve-test-contains)"
    # 2. Head-binding: both head-time sources, the max reducer, the
    #    fail-closed guard, and the stale-verdict check, ordered after the
    #    verdict read and before any merge action.
    printf '%s\n' "$r21_pat_block" | grep -qF 'head_commit_time=$(gh api "repos/${{ github.repository }}/pulls/$pr/commits?per_page=100"' || r21_bad="${r21_bad} maintainer.yml(no-head-commit-time-fetch)"
    printf '%s\n' "$r21_pat_block" | grep -qF -- "--jq '.[].commit.committer.date'" || r21_bad="${r21_bad} maintainer.yml(no-head-commit-date-field)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'head_force_push_time=$(gh api "repos/${{ github.repository }}/issues/$pr/timeline?per_page=100"' || r21_bad="${r21_bad} maintainer.yml(no-head-force-push-time-fetch)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'select(.event=="head_ref_force_pushed")' || r21_bad="${r21_bad} maintainer.yml(no-force-push-event-select)"
    printf '%s\n' "$r21_pat_block" | grep -qF '[ -z "$head_push_time" ] || [ "$candidate" \> "$head_push_time" ]' || r21_bad="${r21_bad} maintainer.yml(no-head-time-max-reducer)"
    [ "$(printf '%s\n' "$r21_pat_block" | grep -cF 'sort | tail -1')" -eq 2 ] || r21_bad="${r21_bad} maintainer.yml(head-time-reduction-not-pinned)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'if [ -z "$head_push_time" ]; then' || r21_bad="${r21_bad} maintainer.yml(no-head-time-fail-closed)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'if [ "$approve_test_time" \< "$head_push_time" ]; then' || r21_bad="${r21_bad} maintainer.yml(no-stale-verdict-check)"
    r21_line() { printf '%s\n' "$r21_pat_block" | grep -nF -- "$1" | head -1 | cut -d: -f1; }
    r21_approve_ln=$(r21_line 'approve_test_time=$(echo "$comments" | jq -r ')
    r21_commit_ln=$(r21_line 'head_commit_time=$(gh api "repos/${{ github.repository }}/pulls/$pr/commits?per_page=100"')
    r21_reducer_ln=$(r21_line 'head_push_time=""')
    r21_stale_ln=$(r21_line 'if [ "$approve_test_time" \< "$head_push_time" ]; then')
    if [ -z "$r21_approve_ln" ] || [ -z "$r21_reducer_ln" ] || [ "$r21_approve_ln" -ge "$r21_reducer_ln" ]; then
      r21_bad="${r21_bad} maintainer.yml(verdict-not-before-head-binding:${r21_approve_ln:-none}/${r21_reducer_ln:-none})"
    fi
    if [ -z "$r21_commit_ln" ] || [ -z "$r21_stale_ln" ] || [ "$r21_commit_ln" -ge "$r21_stale_ln" ]; then
      r21_bad="${r21_bad} maintainer.yml(head-time-not-before-stale-check:${r21_commit_ln:-none}/${r21_stale_ln:-none})"
    fi
    # 3. Bounded UNKNOWN re-query before the mergeability gate.
    printf '%s\n' "$r21_pat_block" | grep -qF 'for _ in 1 2 3 4 5 6; do' || r21_bad="${r21_bad} maintainer.yml(no-bounded-mergeable-requery-loop)"
    printf '%s\n' "$r21_pat_block" | grep -qF '[ "$mergeable" = "UNKNOWN" ] || break' || r21_bad="${r21_bad} maintainer.yml(no-mergeable-unknown-requery)"
    printf '%s\n' "$r21_pat_block" | grep -qE '^[[:space:]]*sleep [0-9]+$' || r21_bad="${r21_bad} maintainer.yml(no-requery-backoff)"
    r21_mergeable_reads=$(printf '%s\n' "$r21_pat_block" | grep -cF -- '--json mergeable' || true)
    [ "$r21_mergeable_reads" -ge 2 ] || r21_bad="${r21_bad} maintainer.yml(mergeable-reads=${r21_mergeable_reads},want>=2)"
    printf '%s\n' "$r21_pat_block" | grep -qF 'if [ "$mergeable" != "MERGEABLE" ]; then' || r21_bad="${r21_bad} maintainer.yml(no-non-mergeable-skip)"
    # 4. Functional harness: extract the REAL predicate and the REAL decision
    #    block from maintainer.yml and execute them (no network access; the
    #    sandbox under mktemp -d is removed before the rule reports).
    if ! command -v jq >/dev/null 2>&1; then
      r21_bad="${r21_bad} maintainer.yml(functional-jq-missing)"
    elif [ -z "$r21_approve_line" ]; then
      r21_bad="${r21_bad} maintainer.yml(functional-predicate-missing)"
    else
      r21_tmp=$(mktemp -d 2>/dev/null || true)
      if [ -z "$r21_tmp" ] || [ ! -d "$r21_tmp" ]; then
        r21_bad="${r21_bad} maintainer.yml(functional-sandbox-unavailable)"
      else
        r21_start="jq -r '"
        r21_end="' 2>/dev/null"
        r21_jq="${r21_approve_line#*${r21_start}}"
        r21_jq="${r21_jq%%${r21_end}*}"
        r21_decide_block=$(printf '%s\n' "$r21_pat_block" | awk '
          /^[[:space:]]*head_push_time=""/ { f=1 }
          f { print }
          f && /predates the last head push/ { g=1 }
          g && /^[[:space:]]*fi[[:space:]]*$/ { exit }')
        if [ -z "$r21_jq" ] || [ "$r21_jq" = "$r21_approve_line" ]; then
          r21_bad="${r21_bad} maintainer.yml(functional-predicate-extraction)"
        else
          r21_pred_case() {
            r21_case_name="$1"; r21_case_want="$2"; r21_case_payload="$3"; r21_case_expect="${4:-}"
            r21_case_out=$(printf '%s' "$r21_case_payload" | jq -r "$r21_jq" 2>/dev/null || true)
            if [ "$r21_case_want" = "match" ]; then
              if [ -z "$r21_case_out" ]; then
                r21_bad="${r21_bad} maintainer.yml(functional-${r21_case_name}-no-match)"
              elif [ "$r21_case_out" != "$r21_case_expect" ]; then
                r21_bad="${r21_bad} maintainer.yml(functional-${r21_case_name}-wrong-timestamp)"
              fi
            elif [ "$r21_case_want" = "none" ] && [ -n "$r21_case_out" ]; then
              r21_bad="${r21_bad} maintainer.yml(functional-${r21_case_name}-false-match)"
            fi
          }
          r21_pred_case genuine-backticked match '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:50:48Z","body":"`/oc approve-test`\n\nInfrastructure PR #609 at `88cd5bc9`"}]' 2026-10-17T18:50:48Z
          r21_pred_case genuine-plain match '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T19:00:28Z","body":"/oc approve-test\nAll checks passed."}]' 2026-10-17T19:00:28Z
          r21_pred_case newest-genuine-wins match '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:50:48Z","body":"/oc approve-test\nfirst read-only round"},{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T19:08:19Z","body":"`/oc approve-test`\nsecond read-only round"}]' 2026-10-17T19:08:19Z
          r21_pred_case quoted-mid-prose none '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:55:04Z","body":"#609 cleared the read-only infra test (`/oc approve-test` 18:50:48Z)."}]' ''
          r21_pred_case quoted-own-line none '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:55:04Z","body":"Status:\n- `/oc approve-test` 18:50:48Z on #609"}]' ''
          r21_pred_case owner-authored none '[{"user":{"login":"Userfrom1995"},"created_at":"2026-10-17T18:50:48Z","body":"`/oc approve-test`"}]' ''
          r21_pred_case trailing-prose none '[{"user":{"login":"github-actions[bot]"},"created_at":"2026-10-17T18:50:48Z","body":"`/oc approve-test` for PR #609"}]' ''
        fi
        if [ -z "$r21_decide_block" ]; then
          r21_bad="${r21_bad} maintainer.yml(functional-decision-block-extraction)"
        else
          r21_head_case() {
            r21_hc_name="$1"; r21_hc_hct="$2"; r21_hc_hfpt="$3"; r21_hc_att="$4"; r21_hc_want="$5"
            r21_skipped=0
            pr="1"
            head_commit_time="$r21_hc_hct"
            head_force_push_time="$r21_hc_hfpt"
            approve_test_time="$r21_hc_att"
            r21_body=$(printf '%s\n' "$r21_decide_block" | sed 's/^[[:space:]]*continue[[:space:]]*$/r21_skipped=1/')
            eval "$r21_body" >/dev/null 2>&1 || true
            if [ "$r21_skipped" != "$r21_hc_want" ]; then
              r21_bad="${r21_bad} maintainer.yml(functional-head-${r21_hc_name}-skip=${r21_skipped},want=${r21_hc_want})"
            fi
          }
          r21_head_case fresh 2026-10-17T18:00:00Z "" 2026-10-17T18:05:00Z 0
          r21_head_case stale-commit 2026-10-17T18:00:00Z "" 2026-10-17T17:55:00Z 1
          r21_head_case stale-force-push 2026-10-17T18:00:00Z 2026-10-17T18:06:00Z 2026-10-17T18:05:00Z 1
          r21_head_case force-push-before-verdict 2026-10-17T18:00:00Z 2026-10-17T17:50:00Z 2026-10-17T18:05:00Z 0
          r21_head_case no-head-time "" "" 2026-10-17T18:05:00Z 1
          r21_head_case same-second 2026-10-17T18:05:00Z "" 2026-10-17T18:05:00Z 0
        fi
        rm -rf "$r21_tmp"
      fi
    fi
  fi
fi
if [ -z "$r21_bad" ]; then
  check "R21" "PAT merge approval is shape-anchored and head-bound: the verdict marker must be the comment's entire first line (optionally backticked), the verdict must not predate the head's last push (commit committer dates plus head_ref_force_pushed events, fail closed when unavailable), and mergeable=UNKNOWN is re-queried a bounded number of times, all pinned by the extracted single-live-assignment predicate with exact returned timestamps, the extracted-decision functional cases, and both head-time max-reductions (issue #619)" "ok"
else
  check "R21" "PAT merge approval-binding guard missing:${r21_bad} (issue #619: an unanchored contains() match merged an unreviewed workflow PR off a quoted marker, and the approved lane stalled on mergeable=UNKNOWN)" "bad"
fi

summary="Silent-stall regression audit (R1-R21) on ${WF}: ${pass} passed, ${fail} failed."
echo "$summary"

if [ "$fail" -gt 0 ]; then
  body="## Silent-stall regression audit FAILED (R1-R21)

${summary}
${report}

A lab CI invariant was violated in the audited workflow set rooted at ${WF} (silent-stall S1/S2/L1/L2, R6 free-tier model pins, R7 review-restore ownership, R8 vendored hardened runner, R9 schedule/dispatch retry parity, R10 dispatch-input indirection, R11 post-agent PAT gates, R12 actor-write gate, R13 bot-created triage parity, R14 heterogeneous-group queue preservation, R15 model fallback ladder, R16 shallow-workspace PAT merge guard, R17 per-OS findings-report contract, R18 Windows MSYS argv-conversion guard, R19 review-comment publication evidence, R20 paginated comment reads, or R21 PAT merge approval binding). Investigate before merging any workflow change.

- the Auditor"
  if [ -n "$HEALTH_ISSUE" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
    gh issue comment "$HEALTH_ISSUE" --repo "$REPO" --body "$body" 2>/dev/null || echo "Failed to post to health issue #$HEALTH_ISSUE"
  fi
fi

exit 0
