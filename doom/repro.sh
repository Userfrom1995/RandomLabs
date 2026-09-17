// M1 serve + test + first-frame render + evidence regeneration.
// Usage: sh doom/repro.sh  (run from the repo root)
set -eu

SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR/.."

echo "--- 1/4: unit + red-team + evidence tests ---"
node --test "doom/tests/*.mjs"

echo "--- 2/4: first-frame render ---"
node doom/tools/render-first-frame.mjs

echo "--- 3/4: M1 evidence (bench + soak + layout audit) ---"
node doom/tools/bench-m1.mjs
node --expose-gc doom/tools/soak-m1.mjs
node doom/tools/audit-layout.mjs
node doom/tools/seal-manifest.mjs

echo "--- 4/4: static serve check ---"
python3 -c "import http.server, threading, urllib.request
srv = http.server.HTTPServer(('127.0.0.1', 0), http.server.SimpleHTTPRequestHandler)
port = srv.server_address[1]
t = threading.Thread(target=srv.serve_forever, daemon=True); t.start()
for path in ['/doom/', '/doom/index.html', '/doom/app.js']:
    r = urllib.request.urlopen(f'http://127.0.0.1:{port}{path}')
    assert r.status == 200, path
    print(f'200 {path} ({len(r.read())} bytes)')
srv.shutdown()"

echo "repro OK"
