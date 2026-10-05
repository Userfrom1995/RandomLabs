#!/bin/sh
# repro.sh: one-command reproduction for the terminal-browser Phase 2 gate.
# Builds, probes, renders, verifies the fixture manifest, and runs the
# hermetic suites. Live checks run only when Chrome plus network exist
# and never fail the hermetic gate when offline.
# Usage: ./repro.sh  (exit 0 prints PASS, nonzero prints FAIL plus step)
set -eu
cd "$(dirname "$0")"

pass() { printf 'PASS: %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

command -v go >/dev/null 2>&1 || fail "go toolchain missing"

echo "== build =="
go build ./... || fail "go build ./..."
pass "go build ./..."

echo "== vet =="
go vet ./... || fail "go vet ./..."
pass "go vet ./..."

echo "== fixture manifest =="
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum missing"
sha256sum -c tests/fixtures/MANIFEST.sha256 || fail "fixture manifest mismatch"
pass "fixtures/MANIFEST.sha256"

echo "== hermetic go tests =="
go test -short ./... || fail "go test -short ./..."
pass "go test -short ./..."

echo "== python static gate =="
if command -v python3 >/dev/null 2>&1; then
  python3 -m unittest discover -s tests -v || fail "python static gate"
  pass "python static gate"
else
  echo "SKIP: python3 missing, static gate not run"
fi

echo "== probe =="
go run ./cmd/tb-agent probe | grep -q '"success":true' || fail "tb-agent probe"
pass "tb-agent probe success=true"

echo "== render =="
go run ./cmd/tb-agent render --fixture home | grep -q '"success":true' || fail "tb-agent render"
pass "tb-agent render success=true"

echo "== offline fail-closed =="
if go run ./cmd/tb-agent fetch --url "fixture://home" >/tmp/tb-repro-fetch.json 2>&1; then
  fail "fixture:// fetch must exit 1"
else
  grep -q '"success":false' /tmp/tb-repro-fetch.json || fail "offline envelope success=false"
  pass "offline fail-closed success=false exit 1"
fi

echo "ALL GREEN: repro.sh PASS"
