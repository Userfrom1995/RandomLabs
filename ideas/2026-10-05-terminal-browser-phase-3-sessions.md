# Terminal Browser Phase 3: durable sessions (cookies, history, profiles)

Phase 3 of the terminal-browser epic (#532): every profile becomes a
durable browser. The interesting constraint is the module's
stdlib-only rule (no third-party dependencies), which rules out a
SQLite driver. The build answers with atomic JSON documents that
keep the architecture's query contract: newest-first history search
with limits, keyed cookie merge, capped navigation stacks.

## What was built

- `terminal-browser/internal/engine/store.go`: `TB_HOME` root
  override, `ProfilesRoot`, atomic JSON read/write (temp file plus
  rename, `0600` files, `0700` dirs), corrupt files fail closed.
- `terminal-browser/internal/engine/history.go`: visit log (cap
  5000, oldest pruned), `QueryHistory` with substring filter and
  limit, bookmarks with update-on-re-add, `NavStack` with
  back/forward, truncate-on-new-visit, and restart restore.
- `terminal-browser/internal/engine/cookies.go`: CDP Storage
  get/set/clear on the live session, jar keyed by
  name/domain/path, `PushJar` before load and `SyncJar` after load
  wired into `Navigate`, portable `State` export/import files.
- TUI: visits record by default, `H`/`L` step the stack, `r`
  reloads without appending, `p` cycles profiles, interactive start
  restores the persisted entry, offscreen renders opt out.
- `tb-agent`: thirteen session commands in the shared JSON
  envelope, every error fail-closed with a machine code.
- Docs: `docs/sessions.md` plus README, hub, and architecture
  updates; static gate and `repro.sh` extended.

## Key files

- `terminal-browser/internal/engine/{store,history,cookies,session_test}.go`
- `terminal-browser/internal/tui/{shell,shell_session_test}.go`
- `terminal-browser/cmd/tb-agent/main.go`, `terminal-browser/cmd/tb/main.go`
- `terminal-browser/docs/sessions.md`

## Notes

- Storage deviation is documented honestly in `docs/sessions.md`:
  JSON today, SQLite-compatible API, migration without API change.
- Live cookie round-trip against a real echo target is for the
  Tester with Chrome plus network; hermetic suites cover every
  store, merge, stack, and edge contract.
