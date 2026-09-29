#!/usr/bin/env python3
"""Static gate for Netpulse Phase 2: app shell, connection profile, and
active quality probes.

Checks file wiring, the no-CDN rule, honest-render markers, responsive CSS,
probe-engine hygiene, and docs unity. Dependency-free, stdlib only.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []


def fail(msg):
    FAILURES.append(msg)


def check_exists(rel):
    p = ROOT / rel
    if not p.is_file():
        fail("missing required file: " + rel)
        return None
    return p


def main():
    required = [
        "index.html",
        "README.md",
        "probe.bin",
        "css/netpulse.css",
        "js/capabilities.js",
        "js/store.js",
        "js/netinfo.js",
        "js/ui.js",
        "js/charts.js",
        "js/probes.js",
        "js/app.js",
        "docs/index.md",
        "docs/index.html",
    ]
    for rel in required:
        check_exists(rel)

    idx = check_exists("index.html")
    if idx is not None:
        html = idx.read_text(encoding="utf-8", errors="replace")
        for token in ["np-tabs", "panel-connection", "panel-online",
                      "panel-device", "panel-capabilities", "event-log",
                      "np-banner", 'role="tablist"', "selftest-box",
                      "tab-quality", "tabpanel-quality",
                      "result-latency", "result-download", "result-upload",
                      "result-loss", "chart-latency", "chart-download",
                      "history-body", "btn-latency", "btn-download",
                      "btn-upload", "btn-history-clear",
                      "status-latency", "status-download", "status-upload"]:
            if token not in html:
                fail("index.html missing token: " + token)
        for script in ["js/capabilities.js", "js/store.js", "js/ui.js",
                       "js/charts.js", "js/probes.js",
                       "js/netinfo.js", "js/app.js"]:
            if script not in html:
                fail("index.html missing script wiring: " + script)
        # No-CDN rule: no external script/link/img URLs.
        for m in re.finditer(r'<script[^>]+src="([^"]+)"', html):
            src = m.group(1)
            if src.startswith("http://") or src.startswith("https://") or src.startswith("//"):
                fail("external script URL forbidden: " + src)
        for m in re.finditer(r'<link[^>]+href="([^"]+)"', html):
            href = m.group(1)
            if href.startswith("http://") or href.startswith("https://") or href.startswith("//"):
                fail("external stylesheet URL forbidden: " + href)
        if "TODO" in html or "coming soon" in html.lower():
            fail("index.html contains stub markers")
        if "\u2014" in html:
            fail("index.html contains em dash (use hyphen)")

    css_p = check_exists("css/netpulse.css")
    if css_p is not None:
        css = css_p.read_text(encoding="utf-8", errors="replace")
        for token in ["390", "focus-visible", "@media print", ".np-badge", ".np-empty",
                      ".np-field", ".np-input", ".np-status", ".np-chart-svg"]:
            if token not in css:
                fail("css missing token: " + token)
        if "http://" in css or "https://" in css:
            fail("css must not reference external URLs (no-CDN rule)")

    for rel in ["js/capabilities.js", "js/netinfo.js", "js/store.js",
                "js/ui.js", "js/charts.js", "js/probes.js", "js/app.js"]:
        p = ROOT / rel
        if not p.is_file():
            continue
        src = p.read_text(encoding="utf-8", errors="replace")
        if "TODO" in src or "FIXME" in src:
            fail(rel + " contains stub markers")
        if "\u2014" in src:
            fail(rel + " contains em dash")

    netinfo = ROOT / "js/netinfo.js"
    if netinfo.is_file():
        src = netinfo.read_text(encoding="utf-8", errors="replace")
        if "not exposed by this browser" not in src:
            fail("netinfo.js must render honest unsupported card")
        if "navigator.connection" not in src and "connection" not in src:
            fail("netinfo.js must read navigator.connection")

    caps = ROOT / "js/capabilities.js"
    if caps.is_file():
        src = caps.read_text(encoding="utf-8", errors="replace")
        if "detectCapabilities" not in src:
            fail("capabilities.js must expose detectCapabilities")

    # Facade guard: no fabricated-throughput literals in app code.
    facade = re.compile(r"\b\d+\.\d+\s*Mbps\b|\bsimulated packets?\b|\bplaceholder gauge\b", re.IGNORECASE)
    for rel in ["index.html", "js/capabilities.js", "js/netinfo.js",
                "js/store.js", "js/ui.js", "js/charts.js", "js/probes.js",
                "js/app.js"]:
        p = ROOT / rel
        if p.is_file() and facade.search(p.read_text(encoding="utf-8", errors="replace")):
            fail(rel + " contains facade markers (fabricated numbers or simulated traffic)")

    probes = ROOT / "js/probes.js"
    if probes.is_file():
        src = probes.read_text(encoding="utf-8", errors="replace")
        for token in ["median", "percentile", "jitter", "runLatency",
                      "runDownload", "runUpload", "lossApproximation",
                      "loadHistory", "saveRun", "no-store", "arrayBuffer",
                      "performance"]:
            if token not in src:
                fail("probes.js missing engine token: " + token)
        if "ICMP" in src:
            # Every ICMP mention must sit inside an honest denial.
            lines = [ln for ln in src.splitlines() if "ICMP" in ln]
            honest = ("no invented" in src.lower() or "never labeled" in src.lower()
                      or "not ICMP" in src or "cannot send ICMP" in src
                      or "No ICMP" in src)
            if not honest or not lines:
                fail("probes.js must never claim ICMP capability")
        if "clamp" in src.lower() or "simulat" in src.lower():
            fail("probes.js must not simulate measurements")

    charts = ROOT / "js/charts.js"
    if charts.is_file():
        src = charts.read_text(encoding="utf-8", errors="replace")
        for token in ["lineChart", "createElementNS", "emptyState",
                      "No samples yet"]:
            if token not in src:
                fail("charts.js missing token: " + token)

    app = ROOT / "js/app.js"
    if app.is_file():
        src = app.read_text(encoding="utf-8", errors="replace")
        for token in ["bootQuality", "renderHistory", "tabpanel-quality",
                      "stats-median-odd", "loss-math", "chart-plots-points"]:
            if token not in src:
                fail("app.js missing quality wiring token: " + token)

    docs = check_exists("docs/index.md")
    if docs is not None:
        text = docs.read_text(encoding="utf-8", errors="replace")
        if "navigator.connection" not in text:
            fail("docs must document the capability matrix")
        for token in ["median", "p95", "cache-bust", "loss"]:
            if token not in text:
                fail("docs must document probe methods: missing " + token)
        for marker in ["M1", "M2", "M3", "this milestone", "sprint"]:
            if marker in text:
                fail("docs leak internal milestone markers: " + marker)

    readme = ROOT / "README.md"
    if readme.is_file():
        text = readme.read_text(encoding="utf-8", errors="replace")
        if "netpulse/index.html" not in text and "index.html" not in text:
            fail("README must point at the live entrypoint")

    probe = ROOT / "probe.bin"
    if probe.is_file() and probe.stat().st_size == 0:
        fail("probe.bin must not be empty")

    if FAILURES:
        print("NETPULSE STATIC GATE: %d FAILING" % len(FAILURES))
        for f in FAILURES:
            print("FAIL " + f)
        return 1
    print("NETPULSE STATIC GATE: ALL PASS (%d files checked)" % len(required))
    return 0


if __name__ == "__main__":
    sys.exit(main())
