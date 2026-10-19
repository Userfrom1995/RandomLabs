# R15 tree-wide watchdog knob env ban (issue #653 review round 17)

## Context

Review round 17 on PR #654 (head `a3d86534`) found that R15's round-16
watchdog-knob check only scanned the two runner step regions in block-key
form. Workflow-level, job-level, caller-step, and flow-style `env` mappings
all reach the runner, so one declarative line (`HANG_IDLE_SECONDS: "86400"`
or `HANG_POLL_SECONDS: "3600"`) could push the first watchdog fire past every
step timeout and silently restore the pre-#653 stalled tick while the audit
stayed 24 passed / 0 failed. The reviewer reproduced all four spellings on
fresh exports.

## Change

- `.github/scripts/silent-stall-audit.sh`: added a one-shot tree-wide static
  ban over `.github/workflows` and `.github/actions` for any env mapping of
  `HANG_IDLE_SECONDS` or `HANG_POLL_SECONDS`, in block, quoted, caller-step,
  or flow spelling (label `behavioral(tree,watchdog-knob-env-mapping)`).
  The pattern skips the shell default references `${HANG_IDLE_SECONDS:-600}`
  and prose mentions. Positive and negative fixtures inside R15 prove the
  pattern itself is not vacuous
  (`behavioral(tree,watchdog-knob-env-mapping-self-test)` on failure).
- The round-16 step-region checks remain in place as defense in depth.
- R15's header comment, PASS summary, and failure list now state the
  tree-wide declarative ban and its reason.
- `AGENTS.md` and `LAB.md` #653 entries now name the tree-wide ban instead
  of claiming only the runner steps are bound. The AGENTS.md empty-stderr
  sentence was reworded so it describes the round-16 review evidence rather
  than implying an in-script assertion.
- Three earlier decision notes received their missing ledger detail: the
  round-1 note now records the verifier result it referenced, the
  attribution-correction note states explicitly that verification was
  primary-only by design, and the round-8 note names its independent
  verifier and the primary checks.

## Boundary

A `$GITHUB_ENV` write from earlier arbitrary step code remains out of scope;
the declarative YAML surface is the guardable contract.

## Evidence

- Control on the final tree after the main sync (which adds R25):
  `25 passed / 0 failed`, 0-byte stderr. On the pre-sync base it read
  `24 passed / 0 failed`.
- Four reviewer spellings, one mutant per fresh export, each with the fix:
  workflow-level `env` in `maintainer.yml`, job-level `env` under
  `jobs: maintainer:`, caller-step `env` in `opencode.yml`, and a flow-style
  `env` mapping on the composite `Run opencode` step. On the final tree each
  reads `24 passed / 1 failed` (`23 passed / 1 failed` pre-sync) with
  `behavioral(tree,watchdog-knob-env-mapping)` as the only R15 label, and
  0-byte stderr.
- Round-16 regression controls re-run on fresh exports: step-level knob
  override -> `run-step-watchdog-env-override` (plus the tree-wide label);
  the executing step's `shell: dash` -> `run-step-shell-not-bash`; quoted
  `"if": false` after the run block -> `run-step-conditional`. All
  `23 passed / 1 failed` pre-sync, 0-byte stderr.
- `bash -n` clean on the audit script; scope is the audit, `AGENTS.md`,
  `LAB.md`, and the four decision notes. This round changes no runtime YAML
  line.

## Delegation ledger

- Primary reproduced all four escapes on fresh exports before editing,
  designed the tree-wide pattern, ran the fixture self-test and the full
  control audit, and re-ran the round-16 regression controls.
- Independent verifier subagent (general; scope: fresh-export mutation
  campaign with its own applier under `/tmp`): reproduced the four escapes
  on the parent, confirmed each caught by the fix with the expected label,
  checked the positive/negative fixture matrix and the round-16 controls,
  and reported the workspace untouched.
- Skills: no available skill matched this in-repo GitHub Actions
  regression-audit work (not opencode configuration), so none was loaded;
  noted per `delegation.md` section 5.

- the Lab Engineer
