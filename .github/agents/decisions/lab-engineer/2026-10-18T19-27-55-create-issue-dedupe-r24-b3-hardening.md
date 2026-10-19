# Decision: Create-issue dedupe round-3 R24 hardening (tester findings B1-B3, adversarial escapes E1-E4 and round-3 attacks)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T19:27:55Z
- **Applies to:** PR #670 / issue #668 (create-issue dedupe; tester findings B1/B2/B3)
- **Status:** accepted; handed to the Reviewer

## What was decided

The Tester's blocking round-2 report on PR #670 filed three findings against
audit rule R24, and independent adversarial verification then found further
escape classes against the fixed guard. This round hardens R24 in
`.github/scripts/silent-stall-audit.sh` only; the production handler in
`.github/workflows/maintainer.yml` is untouched (md5 09f5118e, identical to
the reviewed revision).

1. **B1 (digit-stripping regex passed 24/0).** The normalization fixture
   matrix gained digit, space-placement, underscore, and >80-char long-tail
   pairs (`digits-discriminate-suffix`,
   `digits-discriminate-issue-number`, `space-placement-matters`,
   `underscore-equals-space`, `long-tail-differs`), so a digit-removing or
   truncating normalizer now fails `norm-fixtures`. Adversarial round 3 then
   showed the same class surviving at the CALL SITES (a digit strip after
   normalization), invisible to function-level fixtures; three
   digit-collision sandbox scenarios now close it in every direction:
   `Fix bug 42`/`Fix bug 43` (full-run strip at either or both sites),
   `Patch v10`/`Patch v1` (zero-favored strip, loader or both), and
   `Worker v1`/`Worker v10` (zero-favored strip at the lookup alone). A
   single-site full-run strip is caught by the new size sweep.
2. **B2 (query-shape pin file-wide, mock ignored argv).** The mock `gh`
   now requires the pinned query argv TOKEN FOR TOKEN: argument count 10
   and every positional element compared (`issue list --repo
   RandomLabs/RandomLabs --state open --limit 1000 --json number,title`), so
   a repeated scalar flag (pflag last-wins), an added `--search` filter, a
   reorder, or merged/split tokens (which a lossy space-joined comparison
   missed) empties the served fixture list and fails the skip assertions. A
   block-scoped query-shape pin inside the extracted handler block backs it
   statically.
3. **B3 (single-entry fixtures, matches never first/last).** The sandbox
   scenario matrix was rebuilt:
   - five newest-first five-issue lists (production order) where EVERY
     entry is a scenario match: index 0 `#670` (also the 97-char title and
     the concurrent-duplicate shape, so `items[1:]`/`items[-2:]` offsets and
     length gates fall), index 1 `#669`, index 2 `#668`, index 3 `#665`,
     index 4 `#663` (oldest entry, so `items[:k]` prefix truncations fall);
   - a size sweep of list sizes 1 through 8 whose last (oldest) entry is
     the match, with three-character, digit-bearing, single-word, and
     x-bearing titles cycling (`Bug 1`, `Fix`, `Proxy expiry`, `Fix
     xfails`, `Loop 5`, `Timeout`, `Minor stall`, `Bug 8`), so
     `len(index) == N` equality gates, `items[:k]` truncations with k < 8,
     number/length/word-count/charset per-entry gates at or below the sweep
     envelope, and order-dependent `all(n >= v)` rebuilds all fail at least
     one size;
   - a space-removal collision scenario (`Swift 6 migration`/`Swift6
     migration`): a consistent both-sites post-normalization space removal
     falsely skips;
   - a final-character long-title collision scenario (`path mode a`/`path
     mode b`): a consistent both-sites truncation merges the pair under
     EVERY proper cutoff and falsely skips (single-site truncations are
     killed by the identical-pair long-title skip scenario).
4. **Documentation sync:** the R24 property text, the PASS description,
   `AGENTS.md`, and `LAB.md` now describe the token-wise argv check, the
   newest-first lists, the collision scenarios, the size sweep, and the
   precise residual, and the absolute "no fixture-coverage gap" phrasing is
   replaced with the demonstrated-class wording.

## Evidence

Primary negative-mutation matrix (each mutation applied to a fresh tree copy
with an exact anchor assertion, real audit run per copy; harness
`/tmp/opencode/mut-matrix.py`, logs under `/tmp/opencode`):

- Final run: `matrix: 45 correct, 0 wrong` (control PASS-24/0; 44 mutations
  all FAILS-AUDIT with R24 `functional-*` tokens).
- New-class mutations each caught by the intended scenario: `m-items3`
  (n-sweep + prefix), `m-items4`, `m-items5`, `m-len-eq5` (n6), `m-num-min`
  (sweep), `m-len-min16`/`m-words-min3`/`m-charset-x`/`m-len-min4` (sweep),
  `m-digit-loader`/`m-digit-lookup`/`m-digit-both` (sweep + s10/s11/s14),
  `m-zero-loader`/`m-zero-lookup`/`m-zero-both` (s11/s14),
  `m-space-remove-both` (s13), `m-trunc80-both`/`m-trunc-final-both`
  (s12), `m-order-asc` (newest-first lists), `m-merge-repo`/
  `m-fuse-split`/`m-merge-tail` (token-wise mock).

Independent adversarial verification (subagent V1, same lineage across three
rounds; real tree read-only, copies under /tmp/opencode/v1r3*, exploits
proven lethally against the real extracted handler block):

- Round 3: 20 targeted mutations, 9 escaped the then-current guard
  (M05 `items[:5]`, M07 `len==5`, M11 number floor, M13/M14 length/word
  floors, M15/M16 call-site digit strip, M17 order-dependent rebuild,
  M20/M21 consistent call-site truncation) plus M10/M12 as the documented
  above-envelope residual. All nine escapes are now closed.
- Round 3b: re-run of the exact M01-M22 set against the hardened tree: 18/20
  caught; M10/M12 remain the intended residual; new-surface probes found
  four further realistic boundaries (truncation band 91-94, zero-favored
  digit strip, consistent space removal, 5-char length floor), all now
  fixed (N1-N5 FAILS-AUDIT in round 3c; N6 above-envelope residual).
- Round 3c (final, frozen hash af1d0977): N1 (`[:91]` both), N2 (`[:94]`
  both), N3 (zero-strip both), N4 (space-remove both), N5 (`len>=5` loader)
  all FAILS-AUDIT; N6/M10/M12 PASS as the documented residual. Real
  workspace untouched; hashes match the frozen guard exactly.
- V1 authored none of the guard code.

Primary self-checks: `bash -n` clean; full audit green (24 passed, 0 failed)
on the final tree; `yaml.safe_load` clean on maintainer.yml, opencode.yml,
auditor.yml; em-dash scan clean on all touched files; production handler
unchanged.

## Honest residuals (documented, review-gated)

- Deliberate fingerprinting of unavoidable sandbox identity (fixture token
  strings, sandbox paths, per-title charset gates).
- Call-site character-class transformations outside the tested digit
  (full-run and zero-favored), space-removal, and truncation classes.
- Truncation/cardinality/number/length/word-count thresholds ABOVE the
  fixture envelope (eight entries, issue numbers above 8, 97-char longest
  title; the round-5 hardening note lifts the match-required envelope to a
  147-char title): N6/M10/M12 are exactly this class and remain PASS by
  contract.
- A finite fixture set cannot defeat arbitrary tuning to its envelope; the
  guard's claim is limited to the demonstrated classes, and the residual is
  stated as such in the R24 property text, the PASS description,
  `AGENTS.md`, and `LAB.md`.

## Delegation ledger

- **V1** (adversarial escape hunt, rounds 3/3b/3c; scope: real tree
  read-only, copies under /tmp/opencode/v1r3*): round 3 found 9 escapes with
  mutation diffs, audit outputs, and lethality proofs; round 3b confirmed
  all 11 previously reported classes closed and surfaced the final four
  boundaries; round 3c confirmed N1-N5 closed and N6/M10/M12 as the
  documented residual. Authored none of the guard code.
- **V2** (round-2 independent verification, earlier session; task
  ses_eafcdaba2ffed5AtJvH14VEGZu): 23/1 and 56/56 handler matrices, docs
  sync check, and the source of the "no fixture-coverage gap" overclaim
  finding, now fixed by the demonstrated-class wording.
- **Primary (this session):** authored the B1-B3 fixes, the round-3
  scenarios and sweep, the token-wise mock, the mutation-matrix extensions,
  and the documentation sync; ran the full audit and the 45-mutation matrix
  to green; wrote the PR metadata handoff files and this record.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not opencode
  workspace configuration).

- the Lab Engineer
