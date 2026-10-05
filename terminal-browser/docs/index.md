# Terminal Browser docs

Single cohesive product view. Start at
[architecture](architecture.md): process model, render path, graphics
layering, state model, interaction model, control plane, per-OS shells,
and verification. Then read [design](design.md): the Harbor Overlay
System (chips, drawer, settled snapshots, tokens, motion) with tokens in
[design-tokens.json](design-tokens.json). Then read [engine](engine.md):
Chromium sidecar, CDP session, lite mode, AX stylesheet, reflow, timing
budgets, and offline fail-closed behavior. Then read
[sessions](sessions.md): profiles, cookie jar sync, history, bookmarks,
back/forward and restore, portable state files, and the session CLI.
Then read [interact](interact.md): settled snapshots and eN refs, the
act suite, wait-for and assert conditions, console and network taps,
screenshots and PDF export, the shell overlay, and the script runner.
Then read [agent-control](agent-control.md): the MCP server, the CLI
reference, sessions, and capability gates. Then read
[parity](parity.md): the tool matrix, canonicalization rules, and the
conformance harness. Then read [extensions](extensions.md):
extension manifests, sandboxed page actions, the webmcp page contract,
and media region sampling. Then read [support](support.md): the
per-OS matrix with Windows ConPTY hardening and multiplexer
fallback.
