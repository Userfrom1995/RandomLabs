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
BOOT_SECONDS=12
KEY_DELAY=0.16
RESIZE_SETTLE=1.4
STEP_SETTLE=0.8
GAME_PID_FILE=""

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
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "drive.sh: unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ -n "$DRIVER" ] || { echo "drive.sh: --driver is required" >&2; exit 2; }
[ -n "$LAUNCH" ] || { echo "drive.sh: --launch is required" >&2; exit 2; }
[ -n "$OUTDIR" ] || { echo "drive.sh: --outdir is required" >&2; exit 2; }

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
CELL_W_PX=1
CELL_H_PX=1

driver_ready() {
  case "$DRIVER" in
    x11)
      command -v xdotool >/dev/null || { echo "drive.sh: xdotool missing (apt install xdotool)" >&2; exit 3; }
      command -v import >/dev/null || { echo "drive.sh: ImageMagick import missing" >&2; exit 3; }
      ;;
    macos)
      command -v osascript >/dev/null || { echo "drive.sh: osascript missing" >&2; exit 3; }
      command -v screencapture >/dev/null || { echo "drive.sh: screencapture missing" >&2; exit 3; }
      ;;
    none) : ;;
    *) echo "drive.sh: unknown driver: $DRIVER" >&2; exit 2 ;;
  esac
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

screenshot() { # name
  local name="$1"
  local path="$SHOTS/$name.png"
  case "$DRIVER" in
    x11) import -window "$WID" "$path" 2>/dev/null || cp /dev/null "$path" ;;
    macos) screencapture -x "$path" ;;
    none) return 0 ;;
  esac
  printf '%s\n' "$path"
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
  case "$DRIVER" in
    x11)
      local px_w=$(( cols * CELL_W_PX ))
      local px_h=$(( rows * CELL_H_PX ))
      xdotool windowsize "$WID" "$px_w" "$px_h"
      ;;
    macos)
      log_event note "resize ${cols}x${rows} unsupported on the macOS Aqua driver (Terminal.app cannot be resized reliably); geometry change not exercised" ""
      return 0
      ;;
    none) return 0 ;;
  esac
  log_event resize "${cols}x${rows}" ""
  sleep_s "$RESIZE_SETTLE"
}

checkpoint() { # name
  local name="$1"
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

driver_ready

# Launch the emulator (the launch command runs the game inside `script`
# so the raw escape stream lands in the transcript) and track its pid.
eval "$LAUNCH" &
LAUNCH_PID=$!

find_window

# Claim the X input focus before sending any key: GTK/Qt emulators grab
# focus on map, but xterm does not, and with no window manager running
# (Xvfb) keys otherwise never reach an xterm window (run 1 observed the
# game stuck on the title screen in exactly that state).
focus_window

# Give the emulator a moment to paint its first frame, then capture boot.
sleep_s 2.0
checkpoint title

if [ "$DRIVER" != "none" ]; then
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
  resize_to "$RESIZE_WIDE_COLS" "$RESIZE_WIDE_ROWS"
  checkpoint resized-wide

  # Shrink below the floor: the too-small card, then recover.
  resize_to "$RESIZE_SMALL_COLS" "$RESIZE_SMALL_ROWS"
  checkpoint too-small
  resize_to "$RESIZE_WIDE_COLS" "$RESIZE_WIDE_ROWS"
  checkpoint refit

  # Pause from Playing (Esc = Back = pause) and prove the pause surface.
  key Escape
  sleep_s "$STEP_SETTLE"
  checkpoint paused

  # Pause menu: cursor starts on Resume (0); one Down selects
  # "Quit to title", Confirm returns to the Title screen.
  key Down
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
if [ "$EXITED" = "true" ]; then
  wait_for_exit "$LAUNCH_PID" 4 || true
  kill "$LAUNCH_PID" 2>/dev/null || true
  sleep_s 0.5
  kill -9 "$LAUNCH_PID" 2>/dev/null || true
  EXIT_CODE=0
  wait "$LAUNCH_PID" 2>/dev/null || EXIT_CODE=$?
else
  kill "$LAUNCH_PID" 2>/dev/null || true
  sleep_s 0.5
  kill -9 "$LAUNCH_PID" 2>/dev/null || true
  KILLED="true"
fi

ENDED_MS="$(now_ms)"
log_event exit "exited=$EXITED killed=$KILLED" ""

ENV_JSON="[]"
if [ "${#EXTRA_ENV[@]}" -gt 0 ]; then
  ENV_JSON="$(printf '%s\n' "${EXTRA_ENV[@]}" | jq -R . | jq -s .)"
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
  --arg transcript "$TRANSCRIPT" \
  --argjson env "$ENV_JSON" \
  --argjson initial_cols "$INITIAL_COLS" \
  --argjson initial_rows "$INITIAL_ROWS" \
  --argjson wide_cols "$RESIZE_WIDE_COLS" \
  --argjson wide_rows "$RESIZE_WIDE_ROWS" \
  --argjson small_cols "$RESIZE_SMALL_COLS" \
  --argjson small_rows "$RESIZE_SMALL_ROWS" \
  --argjson px_w "$WID_PX_W" \
  --argjson px_h "$WID_PX_H" \
  --argjson cell_w "$CELL_W_PX" \
  --argjson cell_h "$CELL_H_PX" \
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
    runner: { host: $host, id: "compat-harness" },
    started_at: $started_at,
    geometry: {
      initial: { cols: $initial_cols, rows: $initial_rows, px_w: $px_w, px_h: $px_h },
      cell_px: { w: $cell_w, h: $cell_h },
      resizes: [
        { cols: $wide_cols, rows: $wide_rows },
        { cols: $small_cols, rows: $small_rows },
        { cols: $wide_cols, rows: $wide_rows }
      ]
    },
    duration_s: (($ended_ms - $started_ms) / 1000 | floor),
    exit: { code: $exit_code, killed: $killed, game_exited: $game_gone, process_exited: $game_gone }
  }' > "$META"

echo "drive: session complete ($EMULATOR, driver=$DRIVER, $(transcript_bytes) transcript bytes)"
