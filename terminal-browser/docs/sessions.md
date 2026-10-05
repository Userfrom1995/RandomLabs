# Sessions: profiles, cookies, history, bookmarks, restore

One profile is one isolated browser: its own Chromium user-data
directory, its own cookie jar, its own history, bookmarks, and
back/forward stack. Everything persists under one root so a login
session survives a full process restart, and every command below has
a JSON twin so agents and humans share the exact same surface.

## Profiles

Profiles live at `~/.terminal-browser/profiles/<name>/` (or
`$TB_HOME/.terminal-browser/profiles/<name>/` when `TB_HOME` is set,
which tests and portable installs use). Names must match
`[a-zA-Z0-9_-]` (max 64 chars); anything else fails closed with
`bad_profile` instead of escaping the directory. Profile directories
are `0700`, store files are `0600`, and every write is atomic
(temp file plus rename), so a crash mid-write never tears a store.

The interactive shell starts on `default` (`tb --profile work`
starts on `work`), shows the active profile in the tab strip, and
`p` cycles through known profiles. The `tb-agent` commands all take
`--profile`.

## Cookies

Each profile keeps a jar at `cookies.json` in CDP Storage shape.
Navigation pushes the jar into the fresh page context before the
load (resumed logins) and merges the live cookies back after a
successful load (new logins persist). Rows the page refuses
(expired, domain mismatch) skip without failing the navigation;
`fetch` reports `jar_applied` and `jar_synced` counts.

```sh
./tb-agent cookies --profile work
./tb-agent cookies-set --profile work --name sid --value abc --domain example.com
./tb-agent cookies-clear --profile work
```

`cookies-set` validates the name and fails closed with `bad_cookie`
on an empty one. Inspect, set, and clear all operate on the real
persisted jar, never on a preview copy.

## History and bookmarks

Successful navigations append to `history.json` (cap 5000,
oldest pruned first). `history` queries newest-first with a
case-insensitive substring filter and a bounded limit:

```sh
./tb-agent history --profile work --query example --limit 20
./tb-agent history-clear --profile work
./tb-agent bookmark-add --profile work --url https://example.com/ --title Example
./tb-agent bookmarks --profile work
./tb-agent bookmark-remove --profile work --url https://example.com/
```

Re-adding a bookmark updates its title instead of duplicating the
row; removing a missing URL fails closed with `not_found`.

## Back, forward, reload, restore

`session.json` holds the navigation stack: entries in visit order
plus the index of the current entry. `H` and `L` step back and
forward, `r` reloads without appending (refreshes repeat the visit,
they never fork it), and a new visit after Back discards the redo
path, matching browser semantics. Restarting `tb` restores the
current entry: fixture pages repaint instantly, live pages restore
their address with a reload prompt instead of blocking startup.

```sh
./tb-agent session --profile work
./tb-agent session-back --profile work
./tb-agent session-forward --profile work
./tb-agent session-reload --profile work
```

Stepping past either edge returns `moved: false` with a null
target and exit 0: the edge is a normal boundary, not an error.

## Portable state files

`state-save` exports cookies, bookmarks, and the stack to one file;
`state-load` imports it over a profile (replacing all three). This
moves a login session across machines and backs it up before risky
automation. Missing or corrupt snapshot files fail closed before
touching any store.

```sh
./tb-agent state-save --profile work --file /tmp/work-state.json
./tb-agent state-load --profile work --file /tmp/work-state.json
```

Storage note: the module is dependency-free, so the durable layer
is atomic JSON documents rather than SQLite tables. The query
semantics (newest-first search with limits, keyed cookie merge,
capped stacks) match the architecture contract, and the file layout
migrates to SQLite without API changes if a driver ever lands.
