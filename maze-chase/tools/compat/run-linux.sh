#!/usr/bin/env bash
# run-linux.sh - Linux arm of the real-terminal compatibility harness.
#
# Drives the release binary in real terminal emulators (Kitty,
# Ghostty, xterm) on Linux, captures checkpoint screenshots plus the raw
# escape transcript, and writes one evidence file per run through
# collect.py. Every row is either executed with real captures or recorded
# as `unverified` with the exact reason; nothing is ever guessed.
#
# Usage:
#   tools/compat/run-linux.sh                       # kitty + ghostty + xterm, auto tier
#   tools/compat/run-linux.sh --emulator kitty      # one emulator
#   tools/compat/run-linux.sh --emulator ghostty --tier kitty   # forced-tier probe
#   tools/compat/run-linux.sh --install-deps        # apt-install missing emulators
#   tools/compat/run-linux.sh --outdir /tmp/compat  # scratch location
#   tools/compat/run-linux.sh --emulator xterm --tier auto \
#       --row-name xterm-dark-linux-auto            # distinct evidence row id
#   MAZE_CHASE_COMPAT_PAUSE_SELECT=1 \
#     tools/compat/run-linux.sh --emulator ghostty --tier kitty --skip-build
#                                                   # paused capture with the
#                                                   # cursor on Quit to title
#   tools/compat/run-linux.sh --keep                # retain the scratch transcripts
#
# Every row records its build identity in the run metadata: the commit
# checked out when the row ran (`git rev-parse HEAD`), whether the
# checked-out Rust sources were dirty, and the release binary's SHA-256.
# Rows needing an independently rendered pause capture (the forced-tier
# rows, whose paused panel would otherwise be byte-identical to the auto
# row of the same emulator) set MAZE_CHASE_COMPAT_PAUSE_SELECT to move
# the menu cursor before the paused checkpoint.
#
# Requirements: Linux, python3, jq, xdotool, ImageMagick (import), Xvfb
# when headless, and a release binary (`--skip-build` reuses one).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EVIDENCE_DIR="$SCRIPT_DIR/evidence"

EMULATOR="all"
TIER="auto"
OUTDIR=""
BINARY=""
SKIP_BUILD="false"
INSTALL_DEPS="false"
KEEP="false"
INITIAL="100x40"
WIDE="143x64"
SMALL="80x24"
GAME_ENV=()
ROW_NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --emulator) EMULATOR="$2"; shift 2 ;;
    --tier) TIER="$2"; shift 2 ;;
    --outdir) OUTDIR="$2"; shift 2 ;;
    --binary) BINARY="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD="true"; shift ;;
    --install-deps) INSTALL_DEPS="true"; shift ;;
    --keep) KEEP="true"; shift ;;
    --initial) INITIAL="$2"; shift 2 ;;
    --wide) WIDE="$2"; shift 2 ;;
    --small) SMALL="$2"; shift 2 ;;
    --game-env) GAME_ENV+=("$2"); shift 2 ;;
    --row-name) ROW_NAME="$2"; shift 2 ;;
    --help|-h) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "run-linux.sh: unknown argument: $1" >&2; exit 2 ;;
  esac
done

for dep in python3 jq; do
  command -v "$dep" >/dev/null || { echo "run-linux.sh: missing dependency: $dep" >&2; exit 3; }
done

[ -n "$OUTDIR" ] || OUTDIR="$(mktemp -d "${TMPDIR:-/tmp}/maze-chase-compat.XXXXXX")"
mkdir -p "$OUTDIR" "$EVIDENCE_DIR"

# ---------------------------------------------------------------- display
XVFB_PID=""
start_display() {
  if [ -z "${DISPLAY:-}" ]; then
    command -v Xvfb >/dev/null || { echo "run-linux.sh: no DISPLAY and no Xvfb" >&2; exit 3; }
    Xvfb :99 -screen 0 2048x1536x24 -nolisten tcp >"$OUTDIR/xvfb.log" 2>&1 &
    XVFB_PID=$!
    export DISPLAY=:99
    sleep 1
    echo "display: started Xvfb on :99 (pid $XVFB_PID)"
  else
    echo "display: using $DISPLAY"
  fi
}
cleanup() {
  [ -n "$XVFB_PID" ] && kill "$XVFB_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ---------------------------------------------------------------- binary
if [ -z "$BINARY" ]; then
  BINARY="$REPO_ROOT/target/release/maze-chase-terminal"
  if [ "$SKIP_BUILD" != "true" ] || [ ! -x "$BINARY" ]; then
    echo "build: cargo build --release -p maze-chase-terminal"
    (cd "$REPO_ROOT" && cargo build --release -p maze-chase-terminal)
  fi
fi
case "$BINARY" in /*) ;; *) BINARY="$PWD/$BINARY" ;; esac
[ -x "$BINARY" ] || { echo "run-linux.sh: binary not executable: $BINARY" >&2; exit 3; }

# ---------------------------------------------------------------- identity
# Provenance for every row: the commit checked out when the row ran,
# whether those sources were dirty, and the exact binary hash. A
# --skip-build run can reuse a binary built at an earlier commit, so the
# SHA-256 is authoritative and the commit names the checkout the row ran
# from. Evidence rows record this so a bundle always names its binary
# instead of implying the current head produced it.
BUILD_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
BINARY_SHA256="$(sha256sum "$BINARY" 2>/dev/null | awk '{print $1}')"
if [ -n "$(git -C "$REPO_ROOT" status --porcelain -- crates Cargo.toml Cargo.lock 2>/dev/null)" ]; then
  SOURCES_DIRTY="true"
else
  SOURCES_DIRTY="false"
fi
PAUSE_SELECT="${MAZE_CHASE_COMPAT_PAUSE_SELECT:-0}"
echo "identity: commit $BUILD_COMMIT, binary sha256 ${BINARY_SHA256:-unknown}, sources_dirty $SOURCES_DIRTY"

# ---------------------------------------------------------------- helpers
emulator_version() { # name
  case "$1" in
    kitty) command -v kitty >/dev/null && kitty --version 2>/dev/null | head -n1 || echo "missing" ;;
    ghostty) command -v ghostty >/dev/null && ghostty --version 2>/dev/null | head -n1 || echo "missing" ;;
    xterm) command -v xterm >/dev/null && xterm -version 2>&1 | head -n1 || echo "missing" ;;
    *) echo "unknown" ;;
  esac
}

install_emulator() { # name; failures are logged loudly, never hidden
  case "$1" in
    kitty|xterm)
      sudo apt-get install -y -qq "$1"
      ;;
    ghostty)
      # The community PPA (ppa:mkasberg/ghostty-ubuntu) builds the
      # upstream Ghostty releases for supported Ubuntu versions; it is
      # third-party, not part of the distribution archive. The evidence
      # records the exact version string it produced.
      sudo add-apt-repository -y ppa:mkasberg/ghostty-ubuntu
      sudo apt-get update -qq
      sudo apt-get install -y -qq ghostty
      ;;
  esac
}

write_unverified() { # emulator reason
  local emu="$1" reason="$2"
  local rundir="$OUTDIR/unverified-$emu-$TIER"
  mkdir -p "$rundir/session"
  : > "$rundir/session/events.log"
  jq -n --arg emu "$emu" --arg ver "$(emulator_version "$emu")" \
    --arg tier "$TIER" --arg os "linux" --arg arch "$(uname -m)" \
    --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg host "$(hostname)" \
    '{emulator: $emu, emulator_version: $ver, os: $os, arch: $arch,
      driver: "none", requested_tier: $tier, extra_env: [],
      transcript: "session/pty.log",
      runner: {host: $host, id: "compat-harness"},
      started_at: $at, geometry: {}, duration_s: 0,
      exit: null,
      notes: ["emulator unavailable; row recorded as unverified by run-linux.sh"]}' \
    > "$rundir/session/meta.json"
  python3 "$SCRIPT_DIR/collect.py" --run-dir "$rundir" --emulator "$emu" \
    --os linux --tier "$TIER" --result unverified \
    --unverified-reason "$reason" \
    ${ROW_NAME:+--row-name "$ROW_NAME"} \
    --notes "recorded by run-linux.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --evidence-dir "$EVIDENCE_DIR"
}

run_emulator() { # emulator tier
  local emu="$1" tier="$2"
  local name="$emu-$tier"
  local rundir="$OUTDIR/run-$name"
  local session="$rundir/session"
  mkdir -p "$session" "$rundir/config" "$rundir/home"

  if ! command -v "$emu" >/dev/null; then
    if [ "$INSTALL_DEPS" = "true" ]; then
      echo "install: $emu"
      if ! install_emulator "$emu"; then
        echo "install: $emu failed (see the installer output above)" >&2
      fi
      hash -r 2>/dev/null || true
    fi
  fi
  if ! command -v "$emu" >/dev/null; then
    write_unverified "$emu" "emulator '$emu' not installed and not installable from the configured package sources on this runner"
    return 0
  fi

  local tier_flag=""
  [ "$tier" != "auto" ] && tier_flag="--tier $tier"

  # The game runs through `script` so the raw escape stream is captured;
  # MAZE_CHASE_TRACE is exported now so the trace ingestion path is live
  # the moment the binary emits the mode. `--game-env` entries travel to
  # drive.sh's `--env` (applied to the launch environment and recorded in
  # the evidence metadata).
  cat > "$session/run-game.sh" <<RUNNER
#!/usr/bin/env bash
echo \$\$ > "$session/game.pid"
export HOME="$rundir/home"
export MAZE_CHASE_TRACE="$session/trace.jsonl"
exec "$BINARY" --dir "$rundir/config" $tier_flag
RUNNER
  chmod +x "$session/run-game.sh"

  local -a env_args=()
  for kv in "${GAME_ENV[@]:-}"; do
    [ -n "$kv" ] && env_args+=(--env "$kv")
  done

  local launch
  case "$emu" in
    kitty)
      # remember_window_size=no is required: without it kitty restores
      # the previous run's window and the requested initial cell size is
      # silently ignored (observed on the first evidence run).
      launch="LIBGL_ALWAYS_SOFTWARE=1 kitty --title maze-chase-compat --config NONE \
        -o initial_window_width=${INITIAL%x*}c -o initial_window_height=${INITIAL#*x}c \
        -o remember_window_size=no -o font_size=9 -o confirm_os_window_close=0 \
        -e script -q -f -c '$session/run-game.sh' '$session/pty.log'"
      ;;
    ghostty)
      launch="GDK_BACKEND=x11 LIBGL_ALWAYS_SOFTWARE=1 ghostty --title=maze-chase-compat \
        --window-width=${INITIAL%x*} --window-height=${INITIAL#*x} \
        --font-size=9 --gtk-single-instance=false \
        -e script -q -f -c '$session/run-game.sh' '$session/pty.log'"
      ;;
    xterm)
      launch="xterm ${MAZE_CHASE_COMPAT_XTERM_FLAGS:-} -title maze-chase-compat -geometry ${INITIAL} \
        -e script -q -f -c '$session/run-game.sh' '$session/pty.log'"
      ;;
    *)
      launch="$emu -e script -q -f -c '$session/run-game.sh' '$session/pty.log'"
      ;;
  esac

  echo "run: $emu ($tier) -> $rundir"
  local exit_status=0
  bash "$SCRIPT_DIR/drive.sh" \
      --driver x11 --launch "$launch" --outdir "$rundir" \
      --emulator "$emu" --emulator-version "$(emulator_version "$emu")" \
      --tier "$tier" --initial "$INITIAL" \
      --resize-wide "$WIDE" --resize-small "$SMALL" \
      --build-commit "$BUILD_COMMIT" --binary-sha256 "$BINARY_SHA256" \
      --sources-dirty "$SOURCES_DIRTY" --pause-select "$PAUSE_SELECT" \
      "${env_args[@]}" \
      --game-pid-file "$session/game.pid" \
      --transcript "$session/pty.log" || exit_status=$?
  if [ "$exit_status" -eq 0 ]; then
    local result="pass"
    if ! grep -q "exited=true" "$session/events.log"; then
      result="partial"
    fi
    if [ ! -s "$session/pty.log" ]; then
      result="unverified"
      python3 "$SCRIPT_DIR/collect.py" --run-dir "$rundir" --emulator "$emu" \
        --os linux --tier "$tier" --result unverified \
        --unverified-reason "session produced no escape transcript; the emulator did not run the game" \
        ${ROW_NAME:+--row-name "$ROW_NAME"} \
        --evidence-dir "$EVIDENCE_DIR"
    else
      local note="session driven by tools/compat/drive.sh on a real $emu window"
      if [ "$emu" = "xterm" ] && [ -n "${MAZE_CHASE_COMPAT_XTERM_FLAGS:-}" ]; then
        note="$note (xterm flags: $MAZE_CHASE_COMPAT_XTERM_FLAGS)"
      fi
      if [ "$PAUSE_SELECT" -gt 0 ]; then
        note="$note (paused capture taken with the menu cursor on \"Quit to title\", so same-emulator rows never commit byte-identical pause images)"
      fi
      python3 "$SCRIPT_DIR/collect.py" --run-dir "$rundir" --emulator "$emu" \
        --os linux --tier "$tier" --result "$result" \
        ${ROW_NAME:+--row-name "$ROW_NAME"} \
        --notes "$note" \
        --evidence-dir "$EVIDENCE_DIR"
    fi
  else
    python3 "$SCRIPT_DIR/collect.py" --run-dir "$rundir" --emulator "$emu" \
      --os linux --tier "$tier" --result unverified \
      --unverified-reason "drive session failed before evidence collection (see $rundir)" \
      ${ROW_NAME:+--row-name "$ROW_NAME"} \
      --evidence-dir "$EVIDENCE_DIR" || true
  fi
  if [ "$KEEP" = "true" ]; then
    echo "  scratch kept at $rundir (transcript included; --keep)"
  elif [ "$exit_status" -ne 0 ]; then
    echo "  scratch kept at $rundir (drive failed; inspect it)" >&2
  else
    rm -rf "$rundir"
    echo "  scratch removed (pass --keep to retain transcripts)"
  fi
}

# ---------------------------------------------------------------- runs
start_display

case "$EMULATOR" in
  all)
    run_emulator kitty "$TIER"
    run_emulator ghostty "$TIER"
    run_emulator xterm "$TIER"
    ;;
  kitty|ghostty|xterm)
    run_emulator "$EMULATOR" "$TIER"
    ;;
  *)
    echo "run-linux.sh: unknown emulator: $EMULATOR (kitty|ghostty|xterm|all)" >&2
    exit 2
    ;;
esac

echo "evidence written to $EVIDENCE_DIR"
