# Decision: torshim M5 ships with CI staged for Lab install; PR uses Refs #387

- **Decider:** the Builder
- **Date:** 2026-09-23T23:45:00Z
- **Applies to:** issue #387, branch `opencode/issue387-tor-cli-m5`
- **Status:** accepted

## What was decided

The tri-OS CI matrix for torshim M5 is staged verbatim at
`tor-cli/ci/tor-cli.yml` for Lab Engineer install (`/oc lab`,
PAT-backed push) instead of being committed directly to
`.github/workflows/`, because Builder App-token pushes are rejected
for workflow files ("refusing to allow a GitHub App ... without
workflows permission", observed this run). Tun2socks system-wide
backends for macOS/Windows stay deferred (honest exit 4, documented
as not shipped rather than landing in some future milestone).

## Why

No agent session in BUILD mode can push workflow files; attempting to
force it would violate the lab's credential boundaries (no PAT in
agent env). Staging the reviewed content plus executing every job
equivalently (linux green locally, darwin/windows cross-vetted) keeps
the milestone real without pretending CI is installed. Per the
Binding Performance Gate invariant, the PR therefore uses `Refs #387`:
the issue closes only after Lab install, green CI, and
Tester/Evaluator sign-off.

## Consequences

Reviewer: do not flag the missing `.github/workflows/tor-cli.yml` as
a gap; it is this recorded decision. Tester: validate everything
except workflow execution (read-only infra guard applies anyway).
Maintainer: after merging, dispatch `/oc lab` to install the staged
file, then Tester (`/oc test`) and Evaluator (`/oc eval`).
