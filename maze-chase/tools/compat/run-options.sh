#!/usr/bin/env bash
# run-options.sh - shared option validation for the transcript runners.
#
# Sourced by run-linux.sh and run-macos.sh (never executed directly) so
# both runners accept exactly the same geometry syntax. Bash 3.2 (macOS
# /bin/bash) supports `=~` but treats a quoted right-hand side as a
# literal, so the pattern must stay unquoted.

# compat_require_value RUNNER FLAG ARGC
# Returns 2 with a usage message when FLAG was given without its value;
# under `set -u` the bare `$2` assignment would otherwise die with exit 1.
compat_require_value() {
  local runner="$1" flag="$2" argc="$3"
  if [ "$argc" -lt 2 ]; then
    printf '%s: %s requires a value\n' "$runner" "$flag" >&2
    return 2
  fi
  return 0
}

# compat_validate_geometry RUNNER FLAG VALUE
# Exits 2 with the runner's usage message when VALUE is not COLSxROWS.
compat_validate_geometry() {
  local runner="$1" flag="$2" value="$3"
  if [ -z "$value" ] || [[ ! "$value" =~ ^[0-9]+x[0-9]+$ ]]; then
    printf '%s: %s must be COLSxROWS (got: %s)\n' \
      "$runner" "$flag" "$value" >&2
    return 2
  fi
  return 0
}
