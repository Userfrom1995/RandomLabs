# R24 hardening round 9: parse-tree step identity and duplicate-key rejection (F17/F18)

Round-8 review of PR #670 (issue #668) filed two blocking test-integrity
escapes against audit rule R24 plus non-blocking docs updates. This round
closes both blocking findings. The shipped handler is byte-identical to
HEAD (md5 `09f5118e2691d8ccad4ce33fc4da7c19`, `git diff HEAD` empty for
`.github/workflows/maintainer.yml`).

## Findings addressed

- **F17 (blocking):** the old step-identity check was a substring count
  (`grep -cF -- '- name: Run /oc triggers as owner'`) and the extraction
  took the first awk substring match, so the step's metadata was never
  inspected. A comment line holding the anchor text, a same-name decoy
  step, or a renamed weakened executor all satisfied it while the real
  executing step ran unverified (the reviewer's m05/m05b/m05d/m05e/m07/
  m08/m11/m12/m16/m17/m19 mutation family).
- **F18 (blocking):** a duplicate YAML mapping key (`run:` plus `"run":` /
  `run: |-` / `run: |2`) was invisible to line scanning and a lenient
  last-wins parser would pin the decoy value; GitHub's own parser rejects
  such a workflow file outright (Invalid workflow file / 422).

## What changed

1. **Parse-tree extraction and identity** (`.github/scripts/silent-stall-audit.sh`,
   R24 extraction Python heredoc): the handler is resolved from the SAME
   YAML parse tree GitHub runs. The extractor exits nonzero with a named
   reason on: unparseable YAML (`yaml-parse-error`), ANY duplicate mapping
   key anywhere in the workflow (`duplicate-yaml-key:<key>:line-N`; the
   parse-tree walk raising `DuplicateKey`, since `yaml.compose` itself
   does not reject duplicates), not exactly one step named
   `Run /oc triggers as owner` (`step-name-not-unique:N`), `if` not
   exactly `always()` (`handler-step-not-always-gated`), a `shell:` key
   (`handler-step-shell-set`), a `continue-on-error:` key
   (`handler-step-continue-on-error-set`), altered GH_TOKEN/BOT_TOKEN
   expressions (`handler-step-gh-token-env-changed` /
   `handler-step-bot-token-env-changed`), any handler needle (the dedupe
   marker, `_open_issue_titles`, `_self_triage`) not appearing in exactly
   one step's run which must be the anchored step
   (`dedupe-handler-not-unique`), or an empty run (`handler-run-empty`).
   The extractor emits the run value verbatim; every block-scoped and
   functional check downstream is unchanged (byte-identical extraction,
   see V2). The shell appends one sanitized bad token per failure and
   skips the block-scoped checks on extraction failure.
2. **Mutation closure verified** (V1): the full reviewer mutation family
   plus a comment-only negative control; every mutation fails with its
   intended token, the control stays 24/0.
3. **Contract text sync:** R24 header property 7, the extraction comment,
   the R24 PASS text, `AGENTS.md` (dedupe bullet) and `LAB.md` (R24
   Maintainer section) all state the F17/F18 contract and the documented
   review-gated boundary: a wholesale rewrite of the executing step into
   unrelated code carrying none of the three handler needles (with a
   canonical decoy left in place) is visible in the diff but not
   distinguishable structurally from a genuine handler replacement.
   Residual ranges updated to F4-F18.

## Verification ledger (this session, after all edits)

- `bash -n` on the audit script: OK. Control audit:
  `24 passed, 0 failed`, rc 0 (V2 reran it from a fresh /tmp copy too).
- Mutation closure (V1, independent rebuild, /tmp/opencode/v1): 14/14
  mutations FAIL as intended (m05 `handler-step-not-always-gated`, m05b
  same, m05d `handler-step-not-always-gated`, m05e
  `dedupe-handler-not-unique` marker=2, m05f `_open_issue_titles=2`, m06/
  m11/m12 `handler-step-gh-token-env-changed`, m16
  `handler-step-bot-token-env-changed`, m07 `handler-step-not-always-gated`,
  m08 `handler-step-continue-on-error-set`, m18/m18c
  `duplicate-yaml-key:run:line-N`, m19 `handler-step-shell-set`); the
  comment-anchor negative control stays 24/0. Handler md5 and
  `git diff HEAD` rechecked clean.
- Extraction equivalence (V2, independent from-scratch extractor plus the
 historical awk logic, /tmp/opencode/v2): all three outputs byte-identical
  (sha256 `51dc0a1682dac7deb50e1aa1305c1979484b411c9af3428d8342f5c30ecd8ce1`),
  output equals the YAML run scalar verbatim (trailing newline preserved),
  cwd/env independent (no `os.environ` or relative paths), PyYAML 6.0.1.
- Docs-vs-code contract (V3, read-only adversarial pass): all four sites
  agree; flagged three wording defects which the primary fixed before
  commit (the `yaml.compose` duplicate-key attribution, the unqualified
  "cannot be harvested" sentence, and "lower checks are skipped" now
  correctly scoped to the block-scoped checks).
- Observation carried, not new: a failing audit still exits 0 (the
  failure signal is the summary line and the health-issue post); V1
  confirmed this is the shipped design for all rules, unchanged here.
- Diff scope: exactly `.github/scripts/silent-stall-audit.sh`, `AGENTS.md`,
  `LAB.md`; zero untracked files; zero em dashes in the diff (V2/V3).

## Delegation ledger

- **V1** (general; adversarial mutation closure, /tmp/opencode/v1): rebuilt
  the reviewer's 14-mutation family plus a comment-only negative control
  from scratch; 14/14 expected FAIL tokens observed, control 24/0, handler
  md5 unchanged, each copy differing only in `maintainer.yml`.
- **V2** (general; extraction byte-identity, /tmp/opencode/v2): byte-equal
  extraction across PyYAML, an independent from-scratch extractor, and the
  historical awk logic; verbatim scalar; cwd/env independence; PyYAML
  6.0.1; end-to-end 24/0 from a fresh copy; hygiene checks.
- **V3** (general; docs-vs-code contract, read-only): header property 7,
  extraction comment, PASS text, AGENTS.md, and LAB.md mutually
  consistent and behaviorally accurate; three wording defects found and
  fixed by the primary.
- **Primary (this session):** implemented the parse-tree extraction,
  metadata pins, and needle uniqueness; updated the contract text in the
  audit script and both docs; reran the control audit after every edit.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not
  opencode workspace configuration).

## Known residual / gap boundary

- A wholesale rewrite of the executing step into unrelated code carrying
  none of the three handler needles, with a canonical decoy left in
  place, passes the structural checks; it is visible in the diff and
  documented as the review-gated boundary (V3 verified the docs state it
  rather than overclaim).
- `handler-run-empty` is effectively unreachable (the needle check exits
  first on a truly empty anchored run); retained as defense in depth.
- The expected text lives in the audit script beside the checker, so a PR
  editing both handler and audit passes the in-tree audit; unchanged from
  prior rounds, and exactly what the review gate exists for.

- the Lab Engineer
