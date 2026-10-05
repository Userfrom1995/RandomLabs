#!/bin/sh
# repro.sh: one-command reproduction for the terminal-browser gates.
# Builds, probes, renders, verifies the fixture manifest, replays the
# cookie/bookmark/state session round-trip under an isolated TB_HOME,
# and runs the hermetic suites. Live checks run only when Chrome plus
# network exist and never fail the hermetic gate when offline.
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

echo "== session round-trip (isolated TB_HOME) =="
export TB_HOME=/tmp/tb-repro-home
rm -rf "$TB_HOME"
go run ./cmd/tb-agent cookies-set --profile repro --name sid --value abc --domain example.com | grep -q '"success":true' || fail "cookies-set"
go run ./cmd/tb-agent cookies --profile repro | grep -q '"sid"' || fail "cookies list shows sid"
go run ./cmd/tb-agent bookmark-add --profile repro --url "https://example.com/" --title Example | grep -q '"success":true' || fail "bookmark-add"
go run ./cmd/tb-agent bookmarks --profile repro | grep -q 'example.com' || fail "bookmarks list"
go run ./cmd/tb-agent state-save --profile repro --file /tmp/tb-repro-state.json | grep -q '"success":true' || fail "state-save"
go run ./cmd/tb-agent cookies-clear --profile repro | grep -q '"cleared":1' || fail "cookies-clear count"
go run ./cmd/tb-agent state-load --profile repro --file /tmp/tb-repro-state.json | grep -q '"cookies":1' || fail "state-load restores jar"
go run ./cmd/tb-agent history --profile repro | grep -q '"success":true' || fail "history query"
go run ./cmd/tb-agent session --profile repro | grep -q '"success":true' || fail "session status"
pass "session round-trip green"

echo "== interact validation (hermetic, no Chrome) =="
go run ./cmd/tb-agent interact --url "https://example.com/" --profile "../escape" --do '{"op":"snapshot"}' >/tmp/tb-repro-interact.json 2>&1 && fail "traversal profile must exit 1" || true
grep -q '"code":"bad_profile"' /tmp/tb-repro-interact.json || fail "interact traversal code bad_profile"
go run ./cmd/tb-agent interact --profile repro --do '{"op":"snapshot"}' >/tmp/tb-repro-interact.json 2>&1 && fail "missing url must exit 1" || true
grep -q '"code":"bad_url"' /tmp/tb-repro-interact.json || fail "interact missing url code bad_url"
go run ./cmd/tb-agent interact --url "https://example.com/" --do '{"op":"teleport","ref":"e1"}' >/tmp/tb-repro-interact.json 2>&1 && fail "unknown op must exit 1" || true
grep -q '"code":"bad_step"' /tmp/tb-repro-interact.json || fail "interact unknown op code bad_step"
go run ./cmd/tb-agent interact --url "https://example.com/" --do '{"op":"click"}' >/tmp/tb-repro-interact.json 2>&1 && fail "missing ref must exit 1" || true
grep -q '"code":"bad_step"' /tmp/tb-repro-interact.json || fail "interact missing ref code bad_step"
pass "interact validation green"

echo "ALL GREEN: repro.sh PASS"
