#!/usr/bin/env bash
# run-macos.sh - macOS arm of the real-terminal compatibility harness.
#
# Drives the shipped release binary inside real macOS terminals and
# writes one evidence file per run through collect.py. Windows are driven
# frontmost through System Events (the shared driver's `macos` path);
# screenshots are full-screen captures. Run this on a real Mac: the
# Aqua desktop cannot be synthesized.
#
# Usage:
#   tools/compat/run-macos.sh                       # Terminal (+ iTerm2/Ghostty when installed)
#   tools/compat/run-macos.sh --emulator terminal   # one terminal
#   tools/compat/run-macos.sh --skip-build          # reuse target/release/maze-chase-terminal
#
# Rows this script can produce:
#   terminal-auto   Apple Terminal           (truecolor or legacy cell tier)
#   iterm-auto      iTerm2, when installed   (truecolor cells today; kitty/Sixel later)
#   ghostty-auto    Ghostty, when installed  (truecolor cells; see the Ghostty row on Linux)
#
# Requirements: macOS, python3, jq (brew install jq).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EVIDENCE_DIR="$SCRIPT_DIR/evidence"

EMULATOR="all"
TIER="auto"
SKIP_BUILD="false"
INITIAL="100x40"
BINARY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --emulator) EMULATOR="$2"; shift 2 ;;
    --tier) TIER="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD="true"; shift ;;
    --initial) INITIAL="$2"; shift 2 ;;
    --binary) BINARY="$2"; shift 2 ;;
    --help|-h) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "run-macos.sh: unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ "$(uname -s)" = "Darwin" ] || { echo "run-macos.sh: this runner is not macOS" >&2; exit 3; }
for dep in python3 jq; do
  command -v "$dep" >/dev/null || { echo "run-macos.sh: missing dependency: $dep" >&2; exit 3; }
done

STAMP="$(date -u +%Y%m%d%H%M%S)"
OUTDIR="/tmp/maze-chase-compat-macos/$STAMP"
mkdir -p "$OUTDIR" "$EVIDENCE_DIR"

if [ -z "$BINARY" ]; then
  BINARY="$REPO_ROOT/target/release/maze-chase-terminal"
  if [ "$SKIP_BUILD" != "true" ] || [ ! -x "$BINARY" ]; then
    echo "build: cargo build --release -p maze-chase-terminal"
    (cd "$REPO_ROOT" && cargo build --release -p maze-chase-terminal)
  fi
fi
case "$BINARY" in /*) ;; *) BINARY="$PWD/$BINARY" ;; esac
[ -x "$BINARY" ] || { echo "run-macos.sh: binary not executable: $BINARY" >&2; exit 3; }

write_unverified() { # emulator reason
  local emu="$1" reason="$2"
  local rundir="$OUTDIR/unverified-$emu-$TIER"
  mkdir -p "$rundir/session"
  : > "$rundir/session/events.log"
  jq -n --arg emu "$emu" --arg tier "$TIER" --arg os "macos" \
    --arg arch "$(uname -m)" --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{emulator: $emu, emulator_version: "n/a", os: $os, arch: $arch,
      driver: "none", requested_tier: $tier, extra_env: [],
      transcript: "session/pty.log",
      runner: {host: "macos-tester", id: "compat-harness"},
      started_at: $at, geometry: {}, duration_s: 0, exit: null,
      notes: ["recorded as unverified by run-macos.sh"]}' \
    > "$rundir/session/meta.json"
  python3 "$SCRIPT_DIR/collect.py" --run-dir "$rundir" --emulator "$emu" \
    --os macos --tier "$TIER" --result unverified \
    --unverified-reason "$reason" \
    --evidence-dir "$EVIDENCE_DIR"
}

launch_terminal_app() { # rundir session
  # `osascript do script` opens a Terminal window running the session
  # script; the pty transcript still comes from `script` inside it.
  local runner="$1/session/run-game.sh"
  osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "$runner; exit"
end tell
APPLESCRIPT
}

launch_iterm() { # rundir session
  local runner="$1/session/run-game.sh"
  osascript <<APPLESCRIPT
tell application "iTerm2"
  activate
  create window with default profile command "$runner"
end tell
APPLESCRIPT
}

run_emulator() { # emulator tier
  local emu="$1" tier="$2"
  local name="$emu-$tier"
  local rundir="$OUTDIR/run-$name"
  local session="$rundir/session"
  mkdir -p "$session" "$rundir/config" "$rundir/home"

  case "$emu" in
    terminal)
      command -v osascript >/dev/null || { write_unverified "$emu" "osascript missing"; return 0; }
      ;;
    iterm)
      [ -d "/Applications/iTerm.app" ] || { write_unverified "$emu" "iTerm2 is not installed on this Mac"; return 0; }
      ;;
    ghostty)
      command -v ghostty >/dev/null || { write_unverified "$emu" "Ghostty is not installed on this Mac"; return 0; }
      ;;
  esac

  local tier_flag=""
  [ "$tier" != "auto" ] && tier_flag="--tier $tier"

  cat > "$session/run-game.sh" <<RUNNER
#!/usr/bin/env bash
echo \$\$ > "$session/game.pid"
export HOME="$rundir/home"
export MAZE_CHASE_TRACE="$session/trace.jsonl"
exec "$BINARY" --dir "$rundir/config" $tier_flag
RUNNER
  chmod +x "$session/run-game.sh"

  # The launcher is a small script so drive.sh can run it verbatim in the
  # background; its job is to open one window running the game through
  # `script` (which writes the raw escape transcript).
  local launcher="$session/launch.sh"
  case "$emu" in
    terminal)
      cat > "$launcher" <<LAUNCH
#!/usr/bin/env bash
exec osascript -e 'tell application "Terminal" to activate' \
  -e 'tell application "Terminal" to do script "script -q -f \"$session/pty.log\" $session/run-game.sh; exit"'
LAUNCH
      ;;
    iterm)
      cat > "$launcher" <<LAUNCH
#!/usr/bin/env bash
exec osascript -e 'tell application "iTerm2" to activate' \
  -e 'tell application "iTerm2" to create window with default profile command "script -q -f \\"$session/pty.log\\" $session/run-game.sh"'
LAUNCH
      ;;
    ghostty)
      cat > "$launcher" <<LAUNCH
#!/usr/bin/env bash
exec ghostty -e script -q -f -c '$session/run-game.sh' '$session/pty.log'
LAUNCH
      ;;
  esac
  chmod +x "$launcher"

  echo "run: $emu ($tier) -> $rundir"
  if bash "$SCRIPT_DIR/drive.sh" \
      --driver macos --launch "$launcher" --outdir "$rundir" \
      --emulator "$emu" --emulator-version "system" \
      --tier "$tier" --initial "$INITIAL" \
      --game-pid-file "$session/game.pid" \
      --transcript "$session/pty.log"; then
    local result="pass"
    grep -q "exited=true" "$session/events.log" || result="partial"
    if [ ! -s "$session/pty.log" ]; then
      python3 "$SCRIPT_DIR/collect.py" --run-dir "$rundir" --emulator "$emu" \
        --os macos --tier "$tier" --result unverified \
        --unverified-reason "session produced no escape transcript" \
        --evidence-dir "$EVIDENCE_DIR"
    else
      python3 "$SCRIPT_DIR/collect.py" --run-dir "$rundir" --emulator "$emu" \
        --os macos --tier "$tier" --result "$result" \
        --notes "session driven by tools/compat/drive.sh (macOS Aqua driver)" \
        --evidence-dir "$EVIDENCE_DIR"
    fi
  else
    python3 "$SCRIPT_DIR/collect.py" --run-dir "$rundir" --emulator "$emu" \
      --os macos --tier "$tier" --result unverified \
      --unverified-reason "drive session failed before evidence collection (see $rundir)" \
      --evidence-dir "$EVIDENCE_DIR" || true
  fi
  echo "  scratch at $rundir"
}

case "$EMULATOR" in
  all)
    run_emulator terminal "$TIER"
    run_emulator iterm "$TIER"
    run_emulator ghostty "$TIER"
    ;;
  terminal|iterm|ghostty) run_emulator "$EMULATOR" "$TIER" ;;
  *) echo "run-macos.sh: unknown emulator: $EMULATOR (terminal|iterm|ghostty|all)" >&2; exit 2 ;;
esac

echo "evidence written to $EVIDENCE_DIR"
