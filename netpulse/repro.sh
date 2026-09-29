#!/bin/bash
# Netpulse one-command repro (Refs #489).
# Runs the syntax gate plus every dependency-free python suite, then prints
# how to run the live browser selftest. Exit nonzero on the first failure.
set -e
cd "$(dirname "$0")"
echo "== node --check =="
node --check js/export.js
node --check js/app.js
echo "== python suites =="
python3 tests/test_netpulse.py
python3 tests/test_dns_identity.py
python3 tests/test_traffic_monitor.py
python3 tests/test_quality_probes.py
python3 tests/test_export_report.py
python3 tests/test_tester_final_reports.py
python3 tests/test_tester_phase3_dns.py
python3 tests/test_phase4_tester_regression.py
echo "== live browser =="
echo "Serve this folder over HTTP and open index.html?selftest=1 in Chromium;"
echo "expect ALL PASS with 0 failing on desktop and 390 px widths."
echo "REPRO: ALL PASS"
