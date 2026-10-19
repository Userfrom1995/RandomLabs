# R26 round-23 hardening: rebase onto main and exact pre-handler script-body pin

Round-23 review of PR #670 (head `12450c8b`) found two blockers:

- **B1 (blocking, reviewer):** the branch was `CONFLICTING`, 24 commits
  behind `main` at `a570ee39`, and the conflict was in
  `.github/scripts/silent-stall-audit.sh`. The branch had to be rebased
  onto current `main`, keeping main's PATH-normalized R15
  verify-uniqueness rule alongside the branch's R26 dedupe rule, and any
  pinned region text changed by the rebase had to be re-baselined.
- **F44 (blocking, reviewer):** appending a system-PATH shim plant to
  `.github/actions/opencode-run/resolve-model.sh` (a `/usr/local/bin/gh`
  write, or `sudo install ... /usr/bin/gh`) kept the whole audit green at
  `26 passed, 0 failed`. `/usr/local/bin` is mode 777 on the runner and
  `sudo -n` succeeds, so the spelling-sensitive token scan was not a
  load-bearing guard. A token-free behavioral edit (an always-deny gate)
  was equally invisible.

## Changes

- Rebased all 19 branch commits onto `a570ee39`. The single conflict in
  the audit's "A lab CI invariant" failure body was resolved by keeping
  main's R15 wording and appending `, or R26 create-issue dedupe` before
  the closing parenthesis. Main's R15 verify-uniqueness rule is preserved.
- Regenerated the pinned R26 pre-handler manifest (`R26PRE`) from the
  rebased `maintainer.yml`; the handler block pin (`R26FULL`) was
  confirmed byte-identical and left unchanged.
- Added exact SHA-256 body pinning in the R26 extractor for the two
  repo-local scripts the pinned pre-handler steps execute:
  `.github/scripts/actor-write-gate.sh`
  (`3a59433f9e5bfec46d272aec906cf0131d5411119c8fc717c248698183a6a03e`)
  and `.github/actions/opencode-run/resolve-model.sh`
  (`dd9ddfa0a1329796ea32fd60c5295c4d6eb63020a7d3d43c0676af5d0795a136`).
  An unexpected script path fails with
  `handler-pre-script-unexpected:<rel>`; a changed or missing body fails
  with `handler-pre-script-body:<rel>:<digest>` or
  `handler-pre-script-missing:<rel>`.
- Added `/usr/local/bin` and `sudo` to the banned-token scan as defense
  in depth. The exact-body pin is the load-bearing guard.
- Added a shell negative self-test that executes the real extractor
  heredoc against a temp repo copy with one appended comment on each
  pinned script, and requires a nonzero exit with the script's
  `handler-pre-script-body:` token.
- Synced the R26 contract comments, PASS text, `AGENTS.md`, and `LAB.md`
  with the F44 behavior, the residual range `F2/F4-F44`, and the
  job-level `if` residual. Backslash-escaped backticks are used in the
  R26 PASS string because it is a double-quoted shell argument.
- Narrowed the "any standard invocation spelling" claim to the invocation
  spellings the pinned workflow uses. Adding a new spelling is already
  review-gated by the exact pre-handler manifest pin; the hash map and the
  self-test list carry a keep-in-sync note for a future pinned script.

## Self-inflicted regression found and fixed during this round

The first F44 PASS-text edit added unescaped backticks around three
command-like spans. Bash command-substituted them on every green R26 run,
executing a planted `/usr/local/bin/gh`, `sudo install ... /usr/bin/gh`,
and `sudo -n`. Independent verifiers reproduced the class on the hosted
runner. All six backticks are now escaped (`\``), all `$HOME` literals in
that string are escaped, the R15 PASS lines were restored from
`origin/main` (the earlier global unescape cleanup had stripped their
escapes), and a clean audit now emits zero stderr bytes. A fake `sudo`
harness recorded zero invocations.

## Verification

- `bash -n .github/scripts/silent-stall-audit.sh` passes.
- `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `26 passed, 0 failed`, exit 0, empty stderr.
- Fake-`sudo` harness: `sudo_log_bytes=0`, empty stderr, 26/0.
- Reviewer's F44 repro in a temp copy (append the `/usr/local/bin/gh`
  plant to `resolve-model.sh`) -> `FAIL R26 ... handler-pre-script-body:
  .github/actions/opencode-run/resolve-model.sh:<digest>`, `25 passed,
  1 failed`. The `sudo install` variant fails the same way before the
  token scan runs.
- Pristine temp copy control -> `26 passed, 0 failed`.
- Both pinned hashes match the real scripts; the handler block remains
  untouched (`5c52d8239c31e16e97483d70f4470091`, 14,624 bytes).
- No em dashes in the changed files; `git status` shows only the audit
  script, `AGENTS.md`, `LAB.md`, and this note.

## Delegation ledger

- General subagent, F44 mutation reproduction: confirmed both the
  `/usr/local/bin/gh` plant and the `sudo install` variant now fail R26
  with `handler-pre-script-body`, and the pristine copy stays 26/0.
- General subagent, adversarial bypass review: found the unescaped-backtick
  command-substitution blocker in the new PASS text (fixed here), plus
  advisories on regex coverage, a silent missing-script skip (fixed here),
  self-test list derivation, and token-scan spelling sensitivity.
- General subagent, docs consistency check: independently flagged the same
  backtick blocker, the missing job-level `if` residual, and a stale
  "scan below" phrase; all three were corrected.
- Primary verified directly: rebase ancestry, regenerated `R26PRE`,
  `bash -n`, the full 26-rule audit, empty stderr, the fake-`sudo`
  harness, both mutation reproductions, the pinned hashes, and the
  em-dash scan.

## Skills

No skill fits: this is GitHub Actions lab infrastructure review follow-up,
not opencode workspace configuration.

## Residual

The R26 residual boundary is unchanged: a pre-handler script edit is now a
diff-visible, review-gated change that fails the audit by exact body hash,
and one level of indirection inside such a script remains review-gated.
A job-level `if` on the handler's job remains review-gated. Pinning the
bodies of repo-local scripts used by OTHER workflows (for example the
schedule self-heal scripts) is outside R26's pre-handler scope and is a
candidate for a separate lab hardening issue; it is not changed here.
