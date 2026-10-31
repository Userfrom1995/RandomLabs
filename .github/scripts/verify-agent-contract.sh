#!/usr/bin/env bash
# verify-agent-contract.sh - pre-finish self-check for the run-bound handoff.
#
# The workflow gates (publish-agent-report.sh, post-peros-findings.sh, and the
# per-lane verify steps) reject a decision file or report that is not bound to
# the current run's LAB_RUN_NONCE, and a rejected handoff fails the run without
# an auto-retry. This helper is staged next to the maintained prompt so the
# agent can prove both files satisfy the contract before it ends, instead of
# discovering the violation only in the post-agent gate (review run
# 40457674498: a valid fix verdict was discarded because context compaction
# dropped the nonce instructions and both files were written unbound).
#
# Usage:
#   verify-agent-contract.sh --decision <path> --action <a,b> \
#     [--report <path> --signoff <line>] [--nonce-env LAB_RUN_NONCE]
#
# Exit 0 when every requested check passes; 1 with one line per problem
# otherwise; 2 on a usage error. Read-only: never writes or repairs a file.
set -u

decision=""
report=""
actions=""
signoff=""
nonce_env="LAB_RUN_NONCE"

usage() {
  echo "usage: $0 --decision <path> --action <a,b> [--report <path> --signoff <line>] [--nonce-env <name>]" >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --decision) [ "$#" -ge 2 ] || usage; decision="$2"; shift 2 ;;
    --report) [ "$#" -ge 2 ] || usage; report="$2"; shift 2 ;;
    --action) [ "$#" -ge 2 ] || usage; actions="$2"; shift 2 ;;
    --signoff) [ "$#" -ge 2 ] || usage; signoff="$2"; shift 2 ;;
    --nonce-env) [ "$#" -ge 2 ] || usage; nonce_env="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "verify-agent-contract.sh: unknown argument '$1'" >&2; usage ;;
  esac
done

[ -n "$decision" ] || usage
[ -n "$actions" ] || usage

problems=0
problem() {
  echo "contract: $*" >&2
  problems=$((problems + 1))
}

if ! command -v jq >/dev/null 2>&1; then
  echo "contract: jq is required to validate the handoff files" >&2
  exit 2
fi

nonce=$(printf '%s' "${!nonce_env:-}")
if [ -z "$nonce" ]; then
  echo "contract: warning: $nonce_env is empty; skipping the nonce binding checks (an older lane without a run nonce)." >&2
fi

if [ ! -f "$decision" ]; then
  problem "decision file '$decision' does not exist"
elif ! jq -e 'type == "object"' < "$decision" >/dev/null 2>&1; then
  problem "decision file '$decision' is not a JSON object"
else
  # Issue #791: read the decision file through stdin, never as a jq path
  # argument, so an MSYS lane with MSYS_NO_PATHCONV=1 (issue #612) cannot stop
  # Git Bash converting the /tmp path for a native Windows jq.exe. Native jq
  # can also append a CR to `-r` output, so strip CR before comparing.
  action=$(jq -r '.action // empty' < "$decision" 2>/dev/null | tr -d '\r')
  if [ -z "$action" ]; then
    problem "decision file has no non-empty .action"
  else
    case ",$actions," in
      *",$action,"*) ;;
      *) problem "decision action '$action' is not one of: $actions" ;;
    esac
  fi
  if [ -n "$nonce" ]; then
    got=$(jq -r '.run_nonce // empty' < "$decision" 2>/dev/null | tr -d '\r')
    if [ "$got" != "$nonce" ]; then
      problem "decision file run_nonce is '${got:-<missing>}', not this run's $nonce_env"
    fi
  fi
fi

if [ -n "$report" ]; then
  if [ ! -f "$report" ]; then
    problem "report file '$report' does not exist"
  elif [ ! -s "$report" ]; then
    problem "report file '$report' is empty"
  else
    if [ -n "$nonce" ]; then
      count=$(awk '/^[[:space:]]*run-nonce:[[:space:]]*/ { c++ } END { print c+0 }' "$report")
      if [ "$count" -ne 1 ]; then
        problem "report '$report' must carry exactly one 'run-nonce: <value>' line (found $count)"
      else
        got=$(awk '/^[[:space:]]*run-nonce:[[:space:]]*/ { line=$0; sub(/^[[:space:]]*run-nonce:[[:space:]]*/, "", line); sub(/[[:space:]]+$/, "", line); print line; exit }' "$report")
        if [ "$got" != "$nonce" ]; then
          problem "report run-nonce is '$got', not this run's $nonce_env"
        fi
      fi
    fi
    if [ -n "$signoff" ]; then
      last=$(awk 'NF { line=$0 } END { print line }' "$report")
      # Git Bash on Windows can hand the report back with CRLF line endings;
      # the publisher normalizes them, so the self-check must too or a correct
      # report would be reported as a bad sign-off (issue #612 follow-up).
      last=${last%$'\r'}
      if [ "$last" != "$signoff" ]; then
        problem "report last non-blank line is '$last', not the required sign-off '$signoff'"
      fi
    fi
  fi
fi

if [ "$problems" -ne 0 ]; then
  echo "contract: FAILED ($problems problem(s)); fix the files above and rerun this check." >&2
  exit 1
fi

echo "contract: OK"
