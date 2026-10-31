# Decision: Verify the #787 Gatekeeper copy and record the delegation ledger

- **Decider:** the Lab Engineer
- **Date:** 2026-10-31T02:27:43Z
- **Applies to:** #787, PR #790
- **Status:** accepted

## What was decided

The review of PR #790 found the Gatekeeper copy, byte parity, and the
contract pin correct but blocked the artifact for a missing delegation
ledger and skills note. This run independently re-verifies the change,
records the required ledger, applies the reviewer's non-blocking advisory
on macOS version scoping, and pins the full truthful phrases in the
packaging contract test.

The shipped release-notes paragraph now scopes the approval path to the
declared `LSMinimumSystemVersion` 11.0: macOS 13 and later use
System Settings > Privacy & Security > Security > Open Anyway, and macOS
11-12 use System Preferences > Security & Privacy > General. The
version-scoped phrases are pinned in `tester_packaging.rs`, and the retired
right-click recipe remains rejected.

## Rationale

- `macos-app.sh:48` declares `LSMinimumSystemVersion` 11.0, so an
  unconditional System Settings path would misdirect macOS 11-12 users.
  Apple's Gatekeeper guides place the approval under System Settings >
  Privacy & Security > Security for macOS 13+, and under System Preferences
  > Security & Privacy > General for macOS 11-12.
- The bundle is ad-hoc signed (`codesign --force --deep --sign -`) with no
  Developer ID or notarization path, so "ad-hoc signed, not notarized" and
  "not a damaged-app refusal" remain truthful.
- Pinning `is ad-hoc signed, not notarized` and `is not a damaged-app
  refusal` closes the negation-flip gap in the previous substring pins. The
  duplicate negative clause is removed because `right-click Open` already
  subsumes `Gatekeeper needs a right-click Open`.
- The packaging source and the installed workflow remain byte-identical
  (SHA-256 `bf5c7b9ebe29df4020fd22fdbe65ff5b0331588d573cbbae6d8cad49890fa977`),
  and no release tag or asset moves.

## Delegation ledger

- `explore` (Gatekeeper copy accuracy): confirmed ad-hoc signing without notarization, found `LSMinimumSystemVersion` 11.0, and returned the version-scoped wording that keeps macOS 11-12 users on the correct path.
- `explore` (heredoc, parity, contract pins): confirmed byte parity, YAML and shell safety, and that the previous substring pins were negation-flippable; returned the hardened full-phrase assertions.
- Primary verified itself: read the diff and both workflow copies, checked `cmp`/SHA-256 byte parity and `yaml.safe_load`, ran `cargo test -p maze-chase-terminal --test tester_packaging`, and ran `bash .github/scripts/silent-stall-audit.sh` with `env -u LAB_RUN_NONCE`.
- Skills: no available skill fits; the only listed skill covers opencode configuration, and this is GitHub Actions release copy plus a Rust contract test.

## Notes

The reviewer advisories on version scoping and negation-proof pins are
applied. The internal packaging comments in `macos-app.sh` and
`macos-dmg.sh` remain outside #787's scope; the public docs and site copy
are tracked by #785/#789.
