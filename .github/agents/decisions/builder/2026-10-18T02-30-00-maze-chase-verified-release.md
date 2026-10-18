# Decision: sign the native parity rows and carry `Closes #582` on the verified release

- **Decider:** the Builder
- **Date:** 2026-10-18T02:30:00Z
- **Applies to:** issue #582, branch `opencode/issue582-verified-release`, PR #636
- **Status:** accepted

## What was decided

The two native per-OS tester passes count as the per-platform proof
the parity checklist demanded, so every native row flips to signed and
the release PR carries `Closes #582`. The evidence composition is
deliberate and recorded in `maze-chase/docs/parity.md`:

- macOS: pass run 39068848280 verified the full tree natively (398/0
  across 41 targets, verify 19/19, PTY 28/28, staged `.app`,
  byte-identical wasm rebuild), merged via vehicle PR #631.
- Windows: pass run 39068849150 verified the same surface natively on
  Windows Server 2025 (374/0 across 41 targets, CLI matrix, ConPTY
  sessions, packaged zip and reference PPM byte-identical). The pass
  found three defects (terminal Release-key double fire, desktop
  `--probe` option order, CRLF wasm drift); all three fixes merged via
  vehicle PR #632 with regression contracts that the review, the
  Tester, and the Quality Council round (approve-eval 9.8/10)
  independently executed red on the pre-fix head and green on the
  fixed head.
- Linux: this pass re-verified the exact release tree end to end (407
  tests across 45 targets, verify 19/19, byte-identical wasm, node
  plus real-browser E2E, both packaging scripts staged, installed,
  probed).

The platform-independent character of the three Windows fixes is what
makes this composition sufficient without a fresh native Windows run:
the key-kind filter is pure input translation pinned by contracts that
run on every platform, the `--probe` parser is pure CLI parsing, and
the CRLF drift is a checkout-hygiene pin proven by an
`autocrlf=true` scratch clone. No platform-conditional code changed.

This pass ships documentation only. No engine, layer, packaging, or
workflow code changes; `pacman/` stays untouched, and the #552
retirement remains the Maintainer's explicit post-merge step.

## Why

The owner order's release bar is "implemented, tested, and verified
against acceptance criteria", and the Maintainer's dispatched playbook
expects the release PR to carry `Closes #582` once both native rows are
signed. Holding the release for a third native Windows run after all
defects are fixed would gate the release on re-executing tests whose
contracts are platform-independent and already executed red/green by
the independent Council round; the checklist's native-proof intent (a
real OS ran the layer and its packaging) is satisfied.

## Consequences

Reviewer: verify the evidence citations against the linked runs and
hold the no-code-change claim. Tester: the docs-language guard plus
the full workspace suite must stay green; the packaging smoke on this
branch is recorded in the scoreboard. Maintainer: after the merge,
take the explicit #552 retirement step and verify #582 auto-closes;
open non-blocking follow-ups (#634 resize race, #608/#612 findings
hardening) continue on their own vehicles.
