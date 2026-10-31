#!/usr/bin/env bash
# run-browser-e2e.sh - run the Chrome/CDP E2E suites with a fresh Chrome
# (and a fresh profile) per script.
#
# The suites were designed to run one at a time against their own browser.
# Reusing one Chrome across them leaks storage, service workers, and
# pending CDP sessions between suites, which showed up as boot-gate and
# rebind failures and a Node undici assertion on a second site-e2e run.
# This runner isolates every suite: one browser process, one profile, one
# debug port, and one Node process per script.
#
# Usage (from the maze-chase/ directory):
#   web/e2e/run-browser-e2e.sh                     # all CDP suites
#   web/e2e/run-browser-e2e.sh site-e2e.js         # selected suites
#   web/e2e/run-browser-e2e.sh --base-url URL      # external static server
#   web/e2e/run-browser-e2e.sh --chrome PATH       # explicit Chrome binary
#   web/e2e/run-browser-e2e.sh --plan              # print the per-suite plan
#
# Defaults: starts a static server on 127.0.0.1:<ephemeral> rooted at the
# maze-chase/ directory, finds Chrome (the CHROME environment variable or
# a platform candidate), and runs boot-gate-e2e.js, browser-e2e.js,
# tester-rebind-lifecycle.js, tester-audio-e2e.js, and site-e2e.js in
# that order. Requires node 22+ (built-in WebSocket) and python3 (for the
# static server and a free debug port).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BASE_URL=""
CHROME_BIN="${CHROME:-}"
PLAN=0
SCRIPTS=()
DEFAULT_SCRIPTS=(
  boot-gate-e2e.js
  browser-e2e.js
  tester-rebind-lifecycle.js
  tester-audio-e2e.js
  site-e2e.js
)

while [ $# -gt 0 ]; do
  case "$1" in
    --base-url|--chrome)
      if [ "$#" -lt 2 ] || [ "${2#-}" != "$2" ]; then
        echo "run-browser-e2e.sh: $1 requires a value" >&2
        exit 2
      fi
      if [ "$1" = "--base-url" ]; then BASE_URL="$2"; else CHROME_BIN="$2"; fi
      shift 2 ;;
    --plan|--dry-run) PLAN=1; shift ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    -*) echo "run-browser-e2e.sh: unknown option: $1" >&2; exit 2 ;;
    *) SCRIPTS+=("$1"); shift ;;
  esac
done

# A duplicated suite argument would reuse the same profile and Chrome log,
# violating the fresh-profile contract, so keep only the first occurrence.
if [ "${#SCRIPTS[@]}" -gt 0 ]; then
  DEDUPED_SCRIPTS=()
  for script in "${SCRIPTS[@]}"; do
    duplicate=0
    for seen in "${DEDUPED_SCRIPTS[@]:-}"; do
      if [ "$seen" = "$script" ]; then
        duplicate=1
        break
      fi
    done
    if [ "$duplicate" -eq 0 ]; then
      DEDUPED_SCRIPTS+=("$script")
    fi
  done
  SCRIPTS=("${DEDUPED_SCRIPTS[@]}")
fi

if [ "${#SCRIPTS[@]}" -eq 0 ]; then
  SCRIPTS=("${DEFAULT_SCRIPTS[@]}")
fi
for script in "${SCRIPTS[@]}"; do
  case "$script" in
    boot-gate-e2e.js|browser-e2e.js|tester-rebind-lifecycle.js|tester-audio-e2e.js|site-e2e.js) ;;
    *)
      echo "run-browser-e2e.sh: not a Chrome/CDP suite: $script" >&2
      echo "  (the Node-only suites run directly: wasm-smoke.js, tester-regression.js, macos-case-audit.js)" >&2
      exit 2
      ;;
  esac
  [ -f "$SCRIPT_DIR/$script" ] || {
    echo "run-browser-e2e.sh: missing suite: $SCRIPT_DIR/$script" >&2
    exit 2
  }
done

suite_url() { # script base
  local script="$1" base="$2"
  case "$base" in
    */) ;;
    *) base="$base/" ;;
  esac
  if [ "$script" = "site-e2e.js" ]; then
    printf '%s\n' "$base"
  else
    printf '%sindex.html\n' "$base"
  fi
}

free_port() {
  python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()'
}

if [ "$PLAN" = "1" ]; then
  command -v python3 >/dev/null 2>&1 || {
    echo "run-browser-e2e.sh: python3 is required to allocate plan ports" >&2
    exit 3
  }
  PLAN_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/maze-chase-e2e-plan.XXXXXX")"
  trap 'rm -rf "$PLAN_ROOT"' EXIT
  PLAN_BASE="${BASE_URL:-http://127.0.0.1:0/}"
  SEEN_PORTS=" "
  for script in "${SCRIPTS[@]}"; do
    port="$(free_port)"
    while :; do
      case "$SEEN_PORTS" in
        *" $port "*) port="$(free_port)" ;;
        *) break ;;
      esac
    done
    SEEN_PORTS="$SEEN_PORTS$port "
    printf '%s\t%s\t%s\t%s\n' \
      "$script" "$(suite_url "$script" "$PLAN_BASE")" "$port" \
      "$PLAN_ROOT/profile-${script%.js}"
  done
  exit 0
fi

command -v node >/dev/null 2>&1 || {
  echo "run-browser-e2e.sh: node is required" >&2
  exit 3
}
node -e 'process.exit(typeof WebSocket === "undefined" ? 1 : 0)' || {
  echo "run-browser-e2e.sh: node 22+ is required (global WebSocket)" >&2
  exit 3
}
command -v python3 >/dev/null 2>&1 || {
  echo "run-browser-e2e.sh: python3 is required for the static server" >&2
  exit 3
}

find_chrome() {
  local candidate
  if [ -n "$CHROME_BIN" ]; then
    if [ -x "$CHROME_BIN" ]; then
      printf '%s\n' "$CHROME_BIN"
      return 0
    fi
    echo "run-browser-e2e.sh: Chrome is not executable: $CHROME_BIN" >&2
    return 1
  fi
  for candidate in chromium chromium-browser google-chrome google-chrome-stable chrome; do
    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  echo "run-browser-e2e.sh: no Chrome/Chromium found; pass --chrome PATH or set CHROME" >&2
  return 1
}

CHROME_BIN="$(find_chrome)" || exit 3

SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/maze-chase-e2e.XXXXXX")"
SERVER_PID=""
CHROME_PID=""
NODE_PID=""

cleanup() {
  local status=$?
  set +e
  if [ -n "$NODE_PID" ]; then
    kill "$NODE_PID" 2>/dev/null
    wait "$NODE_PID" 2>/dev/null
    NODE_PID=""
  fi
  if [ -n "$CHROME_PID" ]; then
    kill "$CHROME_PID" 2>/dev/null
    wait "$CHROME_PID" 2>/dev/null
    CHROME_PID=""
  fi
  # Chrome descendants can outlive the browser process and keep writing
  # the profile, so kill any survivor before removing the scratch tree.
  pkill -TERM -f -- "--user-data-dir=$SCRATCH/" 2>/dev/null
  pkill -TERM -f -- "$SCRATCH/" 2>/dev/null
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
    SERVER_PID=""
  fi
  # Retry the removal: a surviving writer can make a single rm fail with
  # "Directory not empty", and a failing EXIT trap overrides the script's
  # exit status (turning a green run into exit 1) and leaks the profile.
  local attempt=0
  while [ "$attempt" -lt 20 ]; do
    rm -rf "$SCRATCH" 2>/dev/null && break
    sleep 0.1
    attempt=$((attempt + 1))
  done
  return "$status"
}

stop() { # signal status
  if [ -n "$NODE_PID" ]; then
    kill -s "$1" "$NODE_PID" 2>/dev/null || true
  fi
  if [ -n "$CHROME_PID" ]; then
    kill -s "$1" "$CHROME_PID" 2>/dev/null || true
  fi
  exit "$2"
}
trap cleanup EXIT
trap 'stop INT 130' INT
trap 'stop TERM 143' TERM

start_server() {
  local url_file="$SCRATCH/server-url"
  local server_log="$SCRATCH/server.log"
  python3 - "$WEB_ROOT" >"$url_file" 2>"$server_log" <<'PY' &
import http.server
import os
import socketserver
import sys

os.chdir(sys.argv[1])


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(("127.0.0.1", 0), QuietHandler) as httpd:
    print("http://127.0.0.1:%d/" % httpd.server_address[1], flush=True)
    httpd.serve_forever()
PY
  SERVER_PID=$!
  local tries=0
  while [ ! -s "$url_file" ] && [ "$tries" -lt 100 ]; do
    sleep 0.1
    tries=$((tries + 1))
  done
  if [ ! -s "$url_file" ]; then
    echo "run-browser-e2e.sh: static server failed to start" >&2
    cat "$server_log" >&2 || true
    return 1
  fi
  BASE_URL="$(head -n 1 "$url_file")"
  echo "server: $BASE_URL (root $WEB_ROOT)"
}

wait_for_debug_port() { # port pid
  local port="$1"
  local pid="$2"
  local tries=0
  while [ "$tries" -lt 150 ]; do
    kill -0 "$pid" 2>/dev/null || return 1
    if node -e '
      fetch("http://127.0.0.1:" + process.argv[1] + "/json/version",
        { signal: AbortSignal.timeout(1000) })
        .then((r) => process.exit(r.ok ? 0 : 1))
        .catch(() => process.exit(1));
    ' "$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.1
    tries=$((tries + 1))
  done
  return 1
}

run_suite() { # script
  local script="$1"
  local port profile log url rc=0
  port="$(free_port)"
  profile="$SCRATCH/profile-${script%.js}"
  log="$SCRATCH/${script%.js}.chrome.log"
  mkdir -p "$profile"
  "$CHROME_BIN" \
    --headless=new \
    --disable-gpu \
    --no-sandbox \
    --no-first-run \
    --no-default-browser-check \
    --disable-extensions \
    --remote-debugging-port="$port" \
    --user-data-dir="$profile" \
    --window-size=1280,900 \
    about:blank >"$log" 2>&1 &
  CHROME_PID=$!
  if ! wait_for_debug_port "$port" "$CHROME_PID"; then
    echo "run-browser-e2e.sh: Chrome did not expose CDP on port $port (Chrome log follows)" >&2
    cat "$log" >&2 || true
    kill "$CHROME_PID" 2>/dev/null || true
    wait "$CHROME_PID" 2>/dev/null || true
    CHROME_PID=""
    return 1
  fi
  url="$(suite_url "$script" "$BASE_URL")"
  echo "== $script (fresh Chrome, CDP port $port, profile $profile)"
  # Background the suite so the INT/TERM traps can run immediately and
  # forward the signal; a foreground child defers the trap until the suite
  # exits, which leaves a hung CDP run uncancellable.
  node "$SCRIPT_DIR/$script" "$url" "$port" &
  NODE_PID=$!
  if wait "$NODE_PID"; then
    rc=0
  else
    rc=$?
  fi
  NODE_PID=""
  kill "$CHROME_PID" 2>/dev/null || true
  wait "$CHROME_PID" 2>/dev/null || true
  CHROME_PID=""
  if [ "$rc" -ne 0 ]; then
    echo "FAILED: $script (exit $rc)" >&2
    return 1
  fi
  echo "PASSED: $script"
}

if [ -z "$BASE_URL" ]; then
  start_server
else
  case "$BASE_URL" in
    */) ;;
    *) BASE_URL="$BASE_URL/" ;;
  esac
  echo "server: using $BASE_URL"
fi

FAILED_COUNT=0
FAILED_NAMES=""
for script in "${SCRIPTS[@]}"; do
  if ! run_suite "$script"; then
    FAILED_COUNT=$((FAILED_COUNT + 1))
    FAILED_NAMES="$FAILED_NAMES $script"
  fi
done

if [ "$FAILED_COUNT" -gt 0 ]; then
  echo "run-browser-e2e.sh: $FAILED_COUNT suite(s) failed:$FAILED_NAMES" >&2
  exit 1
fi
echo "run-browser-e2e.sh: all ${#SCRIPTS[@]} suite(s) green with a fresh Chrome each"
