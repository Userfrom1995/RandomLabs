# R26 hardening round 18: F34/F35 literal spellings, adjacent-literal sibling, F36 artifacts

Round-18 review of PR #670 (issue #668) found two more literal spellings
that still executed a real `gh issue create` while the R26 scan reported
`26 passed, 0 failed`: bash locale quoting (F34) and the Python
`\N{...}`/`\U00000000` escapes (F35), plus an artifact finding in the
round-16 note (F36). This round's own adversarial verification then found a
sibling class in the same family: a token split across adjacent Python
string literals that compile-time concatenation joins. All three are fixed
audit-side; the production dedupe handler in `.github/workflows/maintainer.yml`
is untouched (`md5 05e477fa6a503fbfeb44365d6d5950a9`).

## Findings addressed

- **F34 (blocking):** `issue_create_in` folded ANSI-C quoting
  (`$'\x69ssue'`) but not bash locale quoting, so
  `$"gh" issue create --title x --body y` and the variants `$"g"h`,
  `gh $"iss"ue`, and `gh issue $"cre"ate` were green at 26/0 while
  executing. Fixed with the locale fold
  `re.sub(r'\$"([^"]*)"', r"\1", text)` plus four `_f29_red` fixtures.
- **F35 (blocking):** `decode_literal_escapes` folded `\xNN`, `\uNNNN`,
  and octal but not `\U00000000` or `\N{NAME}` (including behind an `rf`
  prefix, which had no fixture either). Fixed with the two decoders
  (`\N{...}` through `unicodedata.lookup` with a `KeyError` fallback) and
  three `_f31_red` fixtures: plain named escape, `rf` prefixed named
  escape, and `\U00000069ssue`.
- **F36 (minor):** the round-16 note's line 128 referenced a round-17
  decision note that does not exist (the round-17 session died before
  writing its decision file); its Round-17 correction section also lacked
  a delegation ledger or no-delegation reason plus skills line. The
  parenthetical now cites the round-17 review findings on PR #670, the
  ledger line is present, and a `Round-18 correction: F34/F35` section
  records this round.
- **Round-18 adjacent-literal sibling (adversarial verification finding,
  fixed with F34/F35):** `["gh", "iss" "\x75e", "create"]` (and the
  `\N`, `\U`, octal, `b` prefix, and `f` prefix variants, plus a split
  `"cre" "\x61te"`) executed a create while both layers stayed green: the
  word scan split the literals, and the normalized layer ran on the raw,
  undecoded text. Fixed by normalizing the decoded text in the combined
  detector and folding `b`/`r`/`u`/`f` prefixes in
  `normalized_create_form`, so adjacent literals join into `issue`.
  `_f30_red` gained direct f/b-prefix list fixtures and `_f31_red` gained
  seven adjacent-literal fixtures.

## What changed

1. `.github/scripts/silent-stall-audit.sh`: locale fold in
   `issue_create_in`; `\U` and `\N{...}` decoders in
   `decode_literal_escapes`; `unicodedata` import; prefix fold in
   `normalized_create_form`; decode-before-normalize in
   `issue_create_detected`; 4 `_f29_red`, 2 direct `_f30_red`, and 7
   `_f31_red` fixtures; header and section comments synced.
2. Contract text: the R26 PASS string now names locale quoting, the
   `\U`/`\N` escapes, adjacent-literal concatenation, the
   decode/prefix-fold behavior, F34/F35, and the round-18 sibling.
3. `AGENTS.md:76` and the LAB.md R26 paragraph mirror the same
   enumeration and self-test findings list.
4. `2026-10-19T15-09-06-create-issue-dedupe-r26-f30-hardening.md`: F36
   fixes plus the `Round-18 correction: F34/F35` section.

## Verification ledger (this session)

- Baseline on the working tree:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `26 passed, 0 failed` after every edit; `bash -n` clean.
- Positive controls appended after `maintainer.yml:1263`, each ->
  `25 passed, 1 failed` with
  `issue-create-outside-handler:maintainer:22`: `$"gh"`, `$"g"h`,
  `gh $"iss"ue`, `gh issue $"cre"ate`, `issu\N{LATIN SMALL LETTER E}`
  (plain and `rf` prefixed), and `\U00000069ssue`.
- Mutation integrity, each restored afterward: deleting the locale fold
  -> `f29-selftest-missed`; deleting the `\U` decoder ->
  `f31-combined-selftest-missed`; deleting the `\N` decoder ->
  `f31-combined-selftest-missed`; dropping the decode-before-normalize
  step -> `f31-combined-selftest-missed` on the adjacent fixture;
  removing the prefix fold -> `f31-normalized-selftest-missed` on the
  direct f-prefix fixture. Counts `25 passed, 1 failed` in every case.
- Negatives: `gh issue list`, an inert echo, and a plain `$"echo"` stay
  `26 passed, 0 failed`.
- Handler untouched: `git diff HEAD -- .github/workflows/maintainer.yml`
  empty; `md5sum` `05e477fa6a503fbfeb44365d6d5950a9`; `python3 -I -` is
  the single handler invocation (line 696).
- Zero U+2014 em dashes in the changed files; `yaml.safe_load` clean on
  `maintainer.yml`, `opencode.yml`, and `auditor.yml`.

## Delegation ledger

- **general subagent A (adversarial R26 hunt):** reproduced baseline
  26/0; all seven F34/F35 controls and all three detector mutations red
  with the expected tokens; negatives green; and surfaced the
  adjacent-literal concatenation class (seven spellings green at 26/0
  while executing against a proven mock `gh`), which this round fixed
  and fixtured. Workspace copy isolated under `/tmp`; real tree
  untouched.
- **general subagent B (independent verification):** confirmed the
  3-file dirty tree, empty handler diff and md5, `python3 -I -` line,
  `bash -n`, live 26/0, YAML loads, zero em dashes, and the doc/PASS
  text additions; flagged that AGENTS.md/LAB.md named F34/F35 only via
  the `F4-F35` range, which this round fixes.
- **explore subagent C (docs and scope sweep):** confirmed the exact
  changed-file scope, the rule inventory (R24 #692, R25 #701, R26 #668),
  zero em dashes, and the dangling round-17 reference while it was still
  present; identified the script-comment and self-test-parenthetical
  sync gaps, all fixed.
- **Primary verified itself:** every code edit, all five mutation
  checks, the seven positive controls, the baseline, the handler md5,
  and the final clean-tree check; read every cited pin directly.
- **Skills:** no skill fits (GitHub Actions lab infrastructure and audit
  engineering, not opencode workspace configuration).

## Known residual / gap boundary

- The documented residual is unchanged: direct REST creates, creates
  from inside a repo script, composite action, or reusable workflow,
  variable/command-substitution indirection, and creates assembled by
  runtime string construction (`${IFS}` word splitting, brace expansion
  such as `cr{e,}ate`, `"gh issue create".split()`) remain review-gated.
  The adjacent-literal class was compile-time literal concatenation, so
  it was fixed rather than residualized.
- Emptying any fixture list remains diff-review territory: fixtures are
  data, not structurally pinned, the same boundary that applies to every
  edit of the audit script itself.

Refs #668.

- the Lab Engineer
