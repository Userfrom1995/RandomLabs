#!/usr/bin/env bash
# drive.sh - shared scripted-session driver for the compatibility harness.
#
# Runs one emulator command (built by run-linux.sh / run-macos.sh), waits
# for its window, drives a fixed session through the game's real key
# surface, captures named checkpoint screenshots, and records every event
# with the transcript byte offset at that moment. collect.py turns the
# run directory into an evidence file.
#
# Drivers:
#   x11     xdotool keys + ImageMagick import screenshots (Linux, X11)
#   macos   System Events keystrokes + screencapture (macOS Aqua)
#   none    no window driving; boot capture only (deterministic env replays)
#
# The session (keys as sent, checkpoints as named) is deliberately fixed
# so the same script runs on every OS and every emulator. It follows the
# game's real state machine (crates/terminal/src/{app,screens}.rs):
#   Title -Confirm-> Playing; Playing -Back-> Paused;
#   Paused: Down then Confirm on "Quit to title" -> Title;
#   Title: Down/Confirm walks Help, Scores, Settings then Quit.
# Esc must never be pressed while on the Title screen (that quits).
# With `--pause-select 1` the paused checkpoint is captured after moving
# the menu cursor to "Quit to title" (the forced-tier rows use it: the
# pause panel is deterministic text, so two rows of the same emulator
# would otherwise commit byte-identical pause captures); the extra Down
# key is recorded in events.log like every other key. `--build-commit`,
# `--binary-sha256`, and `--sources-dirty` record the generating build
# identity in the run metadata (run-linux.sh fills them in).
#
# Before the title checkpoint the driver waits (bounded by
# `--ready-seconds`, default 30) for the first transcript output, so a
# cold terminal cannot record an empty title phase. The wait is logged as
# a `readiness` event (or `readiness-timeout`) and the collector refuses
# a pass without the fixed session's non-empty, captured checkpoints.
#
# Window resizes are only exercised by the X11 driver (xdotool can set
# exact window sizes). The macOS Aqua driver cannot resize Terminal.app
# windows reliably, so its rows skip the resize checkpoints and record
# that as a note instead of capturing resize-named images.
set -euo pipefail

TITLE="maze-chase-compat"
DRIVER=""
LAUNCH=""
OUTDIR=""
EMULATOR=""
EMULATOR_VERSION="unknown"
TIER_REQUEST="auto"
INITIAL_COLS=143
INITIAL_ROWS=64
RESIZE_WIDE_COLS=143
RESIZE_WIDE_ROWS=64
RESIZE_SMALL_COLS=80
RESIZE_SMALL_ROWS=24
EXTRA_ENV=()
TRANSCRIPT=""
BOOT_SECONDS=2
READY_SECONDS=30
READY_POLL_SECONDS=0.25
KEY_DELAY=0.16
RESIZE_SETTLE=1.4
STEP_SETTLE=0.8
GAME_PID_FILE=""
PAUSE_SELECT=0
BUILD_COMMIT=""
BINARY_SHA256=""
SOURCES_DIRTY="unknown"

while [ $# -gt 0 ]; do
  case "$1" in
    --title) TITLE="$2"; shift 2 ;;
    --driver) DRIVER="$2"; shift 2 ;;
    --launch) LAUNCH="$2"; shift 2 ;;
    --outdir) OUTDIR="$2"; shift 2 ;;
    --emulator) EMULATOR="$2"; shift 2 ;;
    --emulator-version) EMULATOR_VERSION="$2"; shift 2 ;;
    --tier) TIER_REQUEST="$2"; shift 2 ;;
    --initial) INITIAL_COLS="${2%x*}"; INITIAL_ROWS="${2#*x}"; shift 2 ;;
    --resize-wide) RESIZE_WIDE_COLS="${2%x*}"; RESIZE_WIDE_ROWS="${2#*x}"; shift 2 ;;
    --resize-small) RESIZE_SMALL_COLS="${2%x*}"; RESIZE_SMALL_ROWS="${2#*x}"; shift 2 ;;
    --env) EXTRA_ENV+=("$2"); shift 2 ;;
    --game-pid-file) GAME_PID_FILE="$2"; shift 2 ;;
    --transcript) TRANSCRIPT="$2"; shift 2 ;;
    --boot-seconds) BOOT_SECONDS="$2"; shift 2 ;;
    --ready-seconds) READY_SECONDS="$2"; shift 2 ;;
    --pause-select) PAUSE_SELECT="$2"; shift 2 ;;
    --build-commit) BUILD_COMMIT="$2"; shift 2 ;;
    --binary-sha256) BINARY_SHA256="$2"; shift 2 ;;
    --sources-dirty) SOURCES_DIRTY="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "drive.sh: unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ -n "$DRIVER" ] || { echo "drive.sh: --driver is required" >&2; exit 2; }
[ -n "$LAUNCH" ] || { echo "drive.sh: --launch is required" >&2; exit 2; }
[ -n "$OUTDIR" ] || { echo "drive.sh: --outdir is required" >&2; exit 2; }
case "$PAUSE_SELECT" in
  0|1) ;;
  *) echo "drive.sh: --pause-select must be 0 or 1 (the pause menu has two items and the session must still leave via Quit to title)" >&2; exit 2 ;;
esac
case "$SOURCES_DIRTY" in
  true|false|unknown) ;;
  *) echo "drive.sh: --sources-dirty must be true, false, or unknown" >&2; exit 2 ;;
esac
case "$READY_SECONDS" in
  ''|*[!0-9]*) echo "drive.sh: --ready-seconds must be a positive integer" >&2; exit 2 ;;
esac
[ "$READY_SECONDS" -ge 1 ] || {
  echo "drive.sh: --ready-seconds must be a positive integer" >&2
  exit 2
}
# Bash arithmetic reads a leading zero as octal, so `--ready-seconds 08`
# is an arithmetic error and `010` means 8 seconds. Normalize the validated
# decimal string before it reaches any arithmetic context.
READY_SECONDS=$((10#$READY_SECONDS))

# Resolve --outdir to an absolute path on entry: the transcript path is
# recorded in meta.json for collect.py, which resolves relative transcript
# paths against the run directory, so a CWD-relative value would silently
# point at the wrong file.
case "$OUTDIR" in
  /*) ;;
  *) OUTDIR="$PWD/$OUTDIR" ;;
esac

SESSION="$OUTDIR/session"
SHOTS="$SESSION/screenshots"
mkdir -p "$SHOTS"
EVENTS="$SESSION/events.log"
META="$SESSION/meta.json"
: > "$EVENTS"
[ -n "$TRANSCRIPT" ] || TRANSCRIPT="$SESSION/pty.log"

now_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }
sleep_s() { sleep "$1" 2>/dev/null || sleep 1; }

STARTED_MS="$(now_ms)"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo unknown)"
HOST_ID="${MAZE_CHASE_COMPAT_HOST:-$(hostname 2>/dev/null || echo unknown)}"

transcript_bytes() {
  if [ -f "$TRANSCRIPT" ]; then
    stat -c %s "$TRANSCRIPT" 2>/dev/null || stat -f %z "$TRANSCRIPT" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

log_event() { # type detail screenshot
  printf '%s\t%s\t%s\t%s\t%s\n' "$(now_ms)" "$1" "$2" "$(transcript_bytes)" "${3:-}" >> "$EVENTS"
}

WID=""
WID_PX_W=0
WID_PX_H=0
INITIAL_PX_W=0
INITIAL_PX_H=0
CELL_W_PX=1
CELL_H_PX=1
RESIZE_SUPPORTED="false"
MEASURED_RESIZES=()

driver_ready() {
  case "$DRIVER" in
    x11)
      command -v xdotool >/dev/null || { echo "drive.sh: xdotool missing (apt install xdotool)" >&2; exit 3; }
      command -v import >/dev/null || { echo "drive.sh: ImageMagick import missing" >&2; exit 3; }
      RESIZE_SUPPORTED="true"
      ;;
    macos)
      command -v osascript >/dev/null || { echo "drive.sh: osascript missing" >&2; exit 3; }
      command -v screencapture >/dev/null || { echo "drive.sh: screencapture missing" >&2; exit 3; }
      ;;
    none) : ;;
    *) echo "drive.sh: unknown driver: $DRIVER" >&2; exit 2 ;;
  esac
}

measure_geometry() {
  # Re-read the real window pixel size (never trust the requested size:
  # terminal emulators may restore a remembered geometry). Every
  # checkpoint logs the measured size so the committed events.log proves
  # what the captures actually show. Only the X11 driver can read window
  # pixels; other drivers record measured geometry as unavailable instead
  # of inventing it.
  case "$DRIVER" in
    x11)
      eval "$(xdotool getwindowgeometry --shell "$WID" 2>/dev/null || true)"
      [ -n "${WIDTH:-}" ] && WID_PX_W="$WIDTH"
      [ -n "${HEIGHT:-}" ] && WID_PX_H="$HEIGHT"
      ;;
    *) return 0 ;;
  esac
  if [ "$INITIAL_PX_W" -eq 0 ]; then
    INITIAL_PX_W="$WID_PX_W"
    INITIAL_PX_H="$WID_PX_H"
  fi
  log_event geometry "${WID_PX_W}x${WID_PX_H}" ""
}

find_window() {
  case "$DRIVER" in
    x11)
      local deadline=$(( $(date +%s) + 30 ))
      while [ "$(date +%s)" -lt "$deadline" ]; do
        WID="$(xdotool search --onlyvisible --name "$TITLE" 2>/dev/null | head -n1 || true)"
        [ -n "$WID" ] && break
        sleep 0.3
      done
      [ -n "$WID" ] || { echo "drive.sh: window '$TITLE' never appeared" >&2; return 1; }
      eval "$(xdotool getwindowgeometry --shell "$WID" 2>/dev/null || true)"
      WID_PX_W="${WIDTH:-$INITIAL_COLS}"
      WID_PX_H="${HEIGHT:-$INITIAL_ROWS}"
      ;;
    macos)
      WID="screen"
      WID_PX_W=0
      WID_PX_H=0
      ;;
    none) WID="none" ;;
  esac
  CELL_W_PX=$(( WID_PX_W / INITIAL_COLS ))
  CELL_H_PX=$(( WID_PX_H / INITIAL_ROWS ))
  [ "$CELL_W_PX" -lt 1 ] && CELL_W_PX=1
  [ "$CELL_H_PX" -lt 1 ] && CELL_H_PX=1
  return 0
}

focus_window() {
  case "$DRIVER" in
    x11)
      xdotool windowfocus --sync "$WID" 2>/dev/null || true
      xdotool windowraise "$WID" 2>/dev/null || true
      ;;
    macos)
      # The launcher activates the terminal app; System Events sends
      # keystrokes to whatever is frontmost, so there is nothing else to
      # claim here.
      :
      ;;
    none) : ;;
  esac
}

valid_png() { # path; full structure check: signature, IHDR
  # dimensions, every chunk length, and a decompressible IDAT stream, so
  # a truncated or corrupt-body PNG is rejected before it enters
  # evidence (a 24-byte header check alone would accept it).
  python3 - "$1" <<'PY' >/dev/null 2>&1
import struct, sys, zlib
try:
    with open(sys.argv[1], "rb") as fh:
        data = fh.read()
except OSError:
    sys.exit(1)
if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
    sys.exit(1)
pos = 8
width = height = 0
idat = []
saw_end = False
while pos + 8 <= len(data):
    length = int.from_bytes(data[pos:pos + 4], "big")
    kind = data[pos + 4:pos + 8]
    if pos + 12 + length > len(data):
        sys.exit(1)
    chunk = data[pos + 8:pos + 8 + length]
    pos += 12 + length
    if kind == b"IHDR" and len(chunk) == 13:
        width, height = struct.unpack(">II", chunk[:8])
    elif kind == b"IDAT":
        idat.append(chunk)
    elif kind == b"IEND":
        saw_end = True
        break
if not saw_end or width == 0 or height == 0 or not idat:
    sys.exit(1)
try:
    zlib.decompress(b"".join(idat))
except zlib.error:
    sys.exit(1)
sys.exit(0)
PY
}

screenshot() { # name
  local name="$1"
  local path="$SHOTS/$name.png"
  rm -f "$path"
  case "$DRIVER" in
    x11) import -window "$WID" "$path" 2>/dev/null || true ;;
    macos) screencapture -x "$path" 2>/dev/null || true ;;
    none) return 0 ;;
  esac
  if ! valid_png "$path"; then
    rm -f "$path"
    log_event note "capture '$name' produced no valid PNG; checkpoint recorded without an image" ""
    return 1
  fi
  # Log the path relative to the run directory: the committed events.log
  # must never carry the runner's scratch root.
  printf 'session/screenshots/%s.png\n' "$name"
}

key() { # xdotool key name
  local k="$1"
  case "$DRIVER" in
    x11) xdotool key --clearmodifiers "$k" ;;
    macos)
      case "$k" in
        Return) osascript -e 'tell application "System Events" to key code 36' ;;
        Escape) osascript -e 'tell application "System Events" to key code 53' ;;
        Up) osascript -e 'tell application "System Events" to key code 126' ;;
        Down) osascript -e 'tell application "System Events" to key code 125' ;;
        Left) osascript -e 'tell application "System Events" to key code 123' ;;
        Right) osascript -e 'tell application "System Events" to key code 124' ;;
        *) osascript -e "tell application \"System Events\" to keystroke \"$k\"" ;;
      esac
      ;;
    none) : ;;
  esac
  log_event key "$k" ""
  sleep_s "$KEY_DELAY"
}

resize_to() { # cols rows
  local cols="$1" rows="$2"
  local px_w=$(( cols * CELL_W_PX ))
  local px_h=$(( rows * CELL_H_PX ))
  xdotool windowsize "$WID" "$px_w" "$px_h"
  log_event resize "${cols}x${rows} (requested)" ""
  sleep_s "$RESIZE_SETTLE"
  measure_geometry
  MEASURED_RESIZES+=("${WID_PX_W}x${WID_PX_H}")
}

checkpoint() { # name
  local name="$1"
  measure_geometry
  local shot=""
  [ "$DRIVER" != "none" ] && shot="$(screenshot "$name" || true)"
  if [ -n "$shot" ]; then
    log_event checkpoint "$name" "$shot"
  else
    log_event checkpoint "$name" ""
  fi
  echo "checkpoint: $name"
}

wait_for_exit() { # pid seconds
  local pid="$1" seconds="$2"
  local deadline=$(( $(date +%s) + seconds ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.3
  done
  return 1
}

wait_for_first_output() { # baseline_bytes; bounded by READY_SECONDS from launch
  local baseline="$1"
  local deadline=$(( READY_START_MS / 1000 + READY_SECONDS ))
  local first waited
  while :; do
    first="$(transcript_bytes)"
    if [ "$first" -gt "$baseline" ]; then
      waited=$(( $(now_ms) - READY_START_MS ))
      log_event readiness "waited_ms=$waited baseline_bytes=$baseline first_output_bytes=$first" ""
      echo "readiness: first transcript output after ${waited}ms (${first} bytes)"
      return 0
    fi
    [ "$(date +%s)" -ge "$deadline" ] && break
    sleep_s "$READY_POLL_SECONDS"
  done
  waited=$(( $(now_ms) - READY_START_MS ))
  first="$(transcript_bytes)"
  log_event readiness-timeout "waited_ms=$waited baseline_bytes=$baseline first_output_bytes=$first" ""
  echo "drive.sh: no transcript output within ${READY_SECONDS}s of launch; refusing to drive a blank session" >&2
  return 1
}

driver_ready

# Launch the emulator (the launch command runs the game inside `script`
# so the raw escape stream lands in the transcript) and track its pid.
# `--env KEY=VALUE` entries are applied to the launch environment itself
# (they could not be applied anywhere else) and recorded verbatim in the
# evidence metadata.
ENV_PREFIX=""
for kv in "${EXTRA_ENV[@]:-}"; do
  [ -n "$kv" ] || continue
  printf -v _q '%q' "$kv"
  ENV_PREFIX+="$_q "
done
# Baseline the transcript before launch and time the first output from the
# same instant, so the readiness wait is measured from the launch, not from
# whenever the window happened to appear. A reused --outdir can still hold
# a previous run's transcript (the launchers' `script` truncates it at
# launch, but only after this point), so truncate first: the baseline must
# be this run's starting point, never a stale byte count the new launch
# can never exceed.
: > "$TRANSCRIPT"
READY_BASELINE="$(transcript_bytes)"
READY_START_MS="$(now_ms)"
eval "${ENV_PREFIX}$LAUNCH" &
LAUNCH_PID=$!

find_window

# Claim the X input focus before sending any key: GTK/Qt emulators grab
# focus on map, but xterm does not, and with no window manager running
# (Xvfb) keys otherwise never reach an xterm window (run 1 observed the
# game stuck on the title screen in exactly that state).
focus_window

# A cold terminal can take longer than BOOT_SECONDS to start the game and
# paint its first frame. Wait (bounded) for the transcript to carry output
# before capturing the title checkpoint, so a cold start can never record
# an empty title phase and still sign a pass. A timeout is recorded as an
# event and the collector grades the row unverified; the session is not
# driven into a blank screen.
READINESS_OK="true"
if ! wait_for_first_output "$READY_BASELINE"; then
  READINESS_OK="false"
fi
if [ "$READINESS_OK" = "true" ]; then
  # Give the emulator a moment to paint its first frame, then capture boot.
  sleep_s "$BOOT_SECONDS"
  checkpoint title
fi

if [ "$DRIVER" != "none" ] && [ "$READINESS_OK" = "true" ]; then
  # Play: start, then steer so the session produces real movement frames.
  key Return
  sleep_s 2.2
  key Right; key Right; key Right
  key Up; key Up
  key Left; key Left
  key Down
  sleep_s 0.6
  checkpoint playing

  # Resize wide while playing: the game must re-fit without restarting.
  # Only the X11 driver can set exact window sizes; the macOS Aqua driver
  # skips these checkpoints and records the skip instead of capturing
  # resize-named images it could not produce.
  if [ "$RESIZE_SUPPORTED" = "true" ]; then
    resize_to "$RESIZE_WIDE_COLS" "$RESIZE_WIDE_ROWS"
    checkpoint resized-wide

    # Shrink below the floor: the too-small card, then recover.
    resize_to "$RESIZE_SMALL_COLS" "$RESIZE_SMALL_ROWS"
    checkpoint too-small
    resize_to "$RESIZE_WIDE_COLS" "$RESIZE_WIDE_ROWS"
    checkpoint refit
  else
    log_event note "resize checkpoints skipped: the $DRIVER driver cannot set window sizes; geometry changes were not exercised" ""
  fi

  # Pause from Playing (Esc = Back = pause) and prove the pause surface.
  key Escape
  sleep_s "$STEP_SETTLE"
  if [ "$PAUSE_SELECT" -gt 0 ]; then
    # The paused panel is deterministic text, so two rows of the same
    # emulator would otherwise commit byte-identical pause captures
    # (not independent visual evidence). Moving the menu cursor to
    # "Quit to title" first keeps this row's pause capture
    # independently rendered; the key order is recorded in events.log
    # like every other event.
    key Down
    sleep_s "$STEP_SETTLE"
    log_event note "pause capture taken with the menu cursor on \"Quit to title\"" ""
  fi
  checkpoint paused

  # Pause menu: cursor starts on Resume (0); one Down selects
  # "Quit to title", Confirm returns to the Title screen. When the
  # cursor was already moved for the paused capture, only Confirm
  # remains.
  if [ "$PAUSE_SELECT" -eq 0 ]; then
    key Down
  fi
  key Return
  sleep_s "$STEP_SETTLE"
  checkpoint title-return

  # Title menu tour from a known cursor (0 = Play):
  # Down (1 = Help) + Confirm, Esc back, Down (2) + Confirm (Scores),
  # Esc, Down (3) + Confirm (Settings), Esc.
  key Down
  key Return
  sleep_s "$STEP_SETTLE"
  checkpoint help
  key Escape
  sleep_s "$STEP_SETTLE"

  key Down
  key Return
  sleep_s "$STEP_SETTLE"
  checkpoint scores
  key Escape
  sleep_s "$STEP_SETTLE"

  key Down
  key Return
  sleep_s "$STEP_SETTLE"
  checkpoint settings
  key Escape
  sleep_s "$STEP_SETTLE"

  # Down (4 = Quit) + Confirm quits the game; the emulator closes.
  key Down
  key Return
  sleep_s 1.0
fi

EXITED="false"
KILLED="false"
EXIT_CODE=""
GAME_GONE="false"
wait_game_gone() { # seconds; pid file first, launcher pid as fallback
  local seconds="$1"
  local deadline=$(( $(date +%s) + seconds ))
  local pid=""
  if [ -n "$GAME_PID_FILE" ] && [ -s "$GAME_PID_FILE" ]; then
    pid="$(cat "$GAME_PID_FILE" 2>/dev/null || true)"
  fi
  if [ -n "$pid" ]; then
    while [ "$(date +%s)" -lt "$deadline" ]; do
      kill -0 "$pid" 2>/dev/null || return 0
      sleep 0.3
    done
    return 1
  fi
  wait_for_exit "$LAUNCH_PID" "$seconds"
}
if [ "$DRIVER" = "none" ]; then
  # Deterministic boot capture: no keys are sent, so the process is
  # stopped after the boot window instead of guessing a quit path.
  if wait_game_gone 1; then
    EXITED="true"
    GAME_GONE="true"
  fi
else
  if wait_game_gone 8; then
    EXITED="true"
    GAME_GONE="true"
  fi
fi
reap_game() {
  # The terminal process may die without propagating the signal to the
  # game process running inside it (observed: a ghostty session left its
  # game spinning after the window closed, burning CPU and polluting
  # later runs). TERM then KILL the recorded game pid directly.
  local pid=""
  if [ -n "$GAME_PID_FILE" ] && [ -s "$GAME_PID_FILE" ]; then
    pid="$(cat "$GAME_PID_FILE" 2>/dev/null || true)"
  fi
  [ -n "$pid" ] || return 0
  kill -0 "$pid" 2>/dev/null || return 0
  kill "$pid" 2>/dev/null || true
  sleep_s 0.3
  kill -9 "$pid" 2>/dev/null || true
}
if [ "$EXITED" = "true" ]; then
  wait_for_exit "$LAUNCH_PID" 4 || true
  kill "$LAUNCH_PID" 2>/dev/null || true
  sleep_s 0.5
  kill -9 "$LAUNCH_PID" 2>/dev/null || true
  reap_game
  EXIT_CODE=0
  wait "$LAUNCH_PID" 2>/dev/null || EXIT_CODE=$?
else
  kill "$LAUNCH_PID" 2>/dev/null || true
  sleep_s 0.5
  kill -9 "$LAUNCH_PID" 2>/dev/null || true
  reap_game
  KILLED="true"
fi

ENDED_MS="$(now_ms)"
ENDED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo unknown)"
log_event exit "exited=$EXITED killed=$KILLED" ""

ENV_JSON="[]"
if [ "${#EXTRA_ENV[@]}" -gt 0 ]; then
  ENV_JSON="$(printf '%s\n' "${EXTRA_ENV[@]}" | jq -R . | jq -s .)"
fi
MEASURED_RESIZES_JSON="[]"
if [ "${#MEASURED_RESIZES[@]}" -gt 0 ]; then
  MEASURED_RESIZES_JSON="$(printf '%s\n' "${MEASURED_RESIZES[@]}" \
    | jq -R 'split("x") | {px_w: (.[0] | tonumber), px_h: (.[1] | tonumber)}' | jq -s .)"
fi
MEASURED_JSON="null"
if [ "$RESIZE_SUPPORTED" = "true" ]; then
  MEASURED_JSON="$(jq -n \
    --argjson px_w "${INITIAL_PX_W:-0}" --argjson px_h "${INITIAL_PX_H:-0}" \
    --argjson cell_w "$CELL_W_PX" --argjson cell_h "$CELL_H_PX" \
    --argjson resizes "$MEASURED_RESIZES_JSON" \
    '{initial: {px_w: $px_w, px_h: $px_h}, resizes: $resizes, cell_px: {w: $cell_w, h: $cell_h}}')"
fi

BUILD_JSON="null"
if [ -n "$BUILD_COMMIT" ] || [ -n "$BINARY_SHA256" ]; then
  BUILD_JSON="$(jq -n \
    --arg commit "$BUILD_COMMIT" \
    --arg commit_short "${BUILD_COMMIT:0:12}" \
    --arg sha "$BINARY_SHA256" \
    --arg dirty "$SOURCES_DIRTY" \
    '{commit: $commit, commit_short: $commit_short,
      binary_sha256: $sha, sources_dirty: ($dirty == "true")}')"
fi

jq -n \
  --arg emulator "$EMULATOR" \
  --arg emulator_version "$EMULATOR_VERSION" \
  --arg os "$(uname -s | tr '[:upper:]' '[:lower:]')" \
  --arg arch "$(uname -m)" \
  --arg driver "$DRIVER" \
  --arg tier "$TIER_REQUEST" \
  --arg host "$HOST_ID" \
  --arg started_at "$STARTED_AT" \
  --arg ended_at "$ENDED_AT" \
  --arg transcript "$TRANSCRIPT" \
  --argjson env "$ENV_JSON" \
  --argjson initial_cols "$INITIAL_COLS" \
  --argjson initial_rows "$INITIAL_ROWS" \
  --argjson wide_cols "$RESIZE_WIDE_COLS" \
  --argjson wide_rows "$RESIZE_WIDE_ROWS" \
  --argjson small_cols "$RESIZE_SMALL_COLS" \
  --argjson small_rows "$RESIZE_SMALL_ROWS" \
  --argjson measured "$MEASURED_JSON" \
  --argjson build "$BUILD_JSON" \
  --argjson pause_select "$PAUSE_SELECT" \
  --argjson resize_exercised "$([ "$RESIZE_SUPPORTED" = true ] && echo true || echo false)" \
  --argjson started_ms "$STARTED_MS" \
  --argjson ended_ms "$ENDED_MS" \
  --argjson exit_code "${EXIT_CODE:-null}" \
  --argjson killed "$([ "$KILLED" = true ] && echo true || echo false)" \
  --argjson game_gone "$([ "$GAME_GONE" = true ] && echo true || echo false)" \
  '{
    emulator: $emulator,
    emulator_version: $emulator_version,
    os: $os,
    arch: $arch,
    driver: $driver,
    requested_tier: $tier,
    extra_env: $env,
    transcript: $transcript,
    build: $build,
    pause_select: $pause_select,
    runner: { host: $host, id: "compat-harness" },
    started_at: $started_at,
    ended_at: $ended_at,
    geometry: {
      requested: {
        initial: { cols: $initial_cols, rows: $initial_rows },
        resizes: [
          { cols: $wide_cols, rows: $wide_rows },
          { cols: $small_cols, rows: $small_rows },
          { cols: $wide_cols, rows: $wide_rows }
        ]
      },
      measured: $measured,
      resize_exercised: $resize_exercised
    },
    duration_s: (($ended_ms - $started_ms) / 1000 | floor),
    exit: { code: $exit_code, killed: $killed, game_exited: $game_gone, process_exited: $game_gone }
  }' > "$META"

echo "drive: session complete ($EMULATOR, driver=$DRIVER, $(transcript_bytes) transcript bytes)"
