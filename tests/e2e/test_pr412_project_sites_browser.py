"""Browser E2E tests for PR #412 (Fixes #411): the tor-cli and Prism project sites.

Drives the shipped pages in a real Chromium via Playwright (system chromium or
a Playwright-managed build), covering:
- clean load: zero console errors, zero page errors, zero failed requests
- responsive layout at 1440 / 1200 / 768 / 390 with no horizontal overflow
- mobile nav: every anchor reachable, click scrolls its section into view
- copy buttons: real clipboard round trip for every payload, 1600 ms reset,
  and the hostile "clipboard denied" path showing Copy failed
- skip link reveals on focus and jumps to #main-content
- focusable table region scrolls horizontally with the keyboard at 390
- landing page Website links navigate to both new project sites
- hostile: a missing page answers 404

Skips cleanly when Playwright or a browser binary is unavailable, so the
stdlib suite in tests/landing/ remains the CI-safe floor.
Run: python3 tests/e2e/test_pr412_project_sites_browser.py
"""
import functools
import http.server
import shutil
import threading
import unittest
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright

    HAVE_PW = True
except Exception:  # pragma: no cover - optional dependency
    HAVE_PW = False

ROOT = Path(__file__).resolve().parents[2]
PAGES = {
    "tor-cli": "/tor-cli/index.html",
    "prism": "/prism/index.html",
}
VIEWPORTS = [(1440, 900), (1200, 800), (768, 900), (390, 844)]

SYSTEM_CHROMIUM = next(
    (
        p
        for p in (
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/usr/bin/google-chrome",
            shutil.which("chromium") or "",
            shutil.which("google-chrome") or "",
        )
        if p and Path(p).exists()
    ),
    None,
)


def _browser_args():
    return ["--no-sandbox", "--disable-dev-shm-usage"]


@unittest.skipUnless(HAVE_PW, "playwright not installed")
class SitesBrowserE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class _Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *args):  # noqa: D102 - silence access log
                pass

        handler = functools.partial(_Quiet, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

        cls.playwright = sync_playwright().start()
        try:
            cls.browser = cls.playwright.chromium.launch(
                executable_path=SYSTEM_CHROMIUM, args=_browser_args()
            )
        except Exception:
            cls.browser = cls.playwright.chromium.launch(args=_browser_args())

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.thread.join()
        cls.server.server_close()

    def _new_page(self, viewport=(1440, 900), init=None):
        ctx = self.browser.new_context(
            viewport={"width": viewport[0], "height": viewport[1]},
            permissions=["clipboard-read", "clipboard-write"],
        )
        if init:
            ctx.add_init_script(init)
        page = ctx.new_page()
        errors, failed = [], []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on(
            "response",
            lambda r: failed.append(f"{r.status} {r.url}")
            if r.status >= 400
            else None,
        )
        return ctx, page, errors, failed

    def test_loads_clean_no_console_errors_or_failed_requests(self):
        for name, path in PAGES.items():
            ctx, page, errors, failed = self._new_page()
            try:
                resp = page.goto(self.base + path, wait_until="networkidle")
                self.assertEqual(resp.status, 200, f"{name}: page status")
                self.assertEqual(errors, [], f"{name}: console/page errors {errors}")
                self.assertEqual(failed, [], f"{name}: failed requests {failed}")
                self.assertTrue(page.title(), f"{name}: empty title")
            finally:
                ctx.close()

    def test_responsive_layout_no_horizontal_overflow(self):
        for name, path in PAGES.items():
            for w, h in VIEWPORTS:
                ctx, page, errors, _ = self._new_page((w, h))
                try:
                    page.goto(self.base + path, wait_until="networkidle")
                    scroll_w = page.evaluate(
                        "() => document.documentElement.scrollWidth"
                    )
                    self.assertLessEqual(
                        scroll_w, w,
                        f"{name}@{w}: horizontal overflow (scrollWidth {scroll_w})",
                    )
                    # nav anchors all present and visible at every width
                    nav = page.locator('nav.nav .nav-links a[href^="#"]')
                    count = nav.count()
                    self.assertGreaterEqual(count, 4, f"{name}@{w}: nav too sparse")
                    for i in range(count):
                        self.assertTrue(
                            nav.nth(i).is_visible(),
                            f"{name}@{w}: nav link {i} hidden",
                        )
                    self.assertEqual(errors, [], f"{name}@{w}: console errors")
                finally:
                    ctx.close()

    def test_nav_click_scrolls_target_into_view(self):
        for name, path in PAGES.items():
            ctx, page, _, _ = self._new_page((390, 844))
            try:
                page.goto(self.base + path, wait_until="networkidle")
                page.evaluate(
                    "() => { document.documentElement.style.scrollBehavior = 'auto'; }"
                )
                links = page.locator('a[href^="#"]:not(.skip-link)')
                for i in range(links.count()):
                    link = links.nth(i)
                    href = link.get_attribute("href")
                    link.click()
                    page.wait_for_timeout(250)
                    self.assertEqual(
                        page.evaluate("() => location.hash"), href,
                        f"{name}: click {href} did not set hash",
                    )
                    in_view = page.evaluate(
                        """(id) => {
                            const el = document.getElementById(id);
                            if (!el) return false;
                            const r = el.getBoundingClientRect();
                            return r.top >= -2 && r.top < window.innerHeight;
                        }""",
                        href[1:],
                    )
                    self.assertTrue(
                        in_view, f"{name}: target {href} not scrolled into view"
                    )
            finally:
                ctx.close()

    def test_copy_buttons_round_trip_and_reset(self):
        for name, path in PAGES.items():
            ctx, page, _, _ = self._new_page()
            try:
                page.goto(self.base + path, wait_until="networkidle")
                buttons = page.locator("button.copy-btn")
                total = buttons.count()
                self.assertGreaterEqual(total, 4, f"{name}: too few copy buttons")
                for i in range(total):
                    btn = buttons.nth(i)
                    payload = btn.get_attribute("data-copy")
                    self.assertIsNotNone(payload, f"{name} button {i}: no payload")
                    self.assertEqual(
                        btn.get_attribute("aria-live"), "polite",
                        f"{name} button {i}: aria-live set at runtime",
                    )
                    btn.click()
                    page.wait_for_function(
                        "(b) => b.textContent !== 'Copy'", arg=btn.element_handle()
                    )
                    text = btn.text_content()
                    self.assertEqual(
                        text, "Copied", f"{name} button {i}: label {text!r}"
                    )
                    clip = page.evaluate("() => navigator.clipboard.readText()")
                    self.assertEqual(
                        clip, payload,
                        f"{name} button {i}: clipboard != data-copy",
                    )
                    page.wait_for_timeout(1700)
                    self.assertEqual(
                        btn.text_content(), "Copy",
                        f"{name} button {i}: label did not reset after 1600 ms",
                    )
            finally:
                ctx.close()

    def test_copy_failure_path_shows_copy_failed(self):
        hostile_init = """
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                get: () => ({ writeText: () => Promise.reject(new Error('denied')) })
            });
            document.execCommand = () => false;
        """
        for name, path in PAGES.items():
            ctx, page, _, _ = self._new_page(init=hostile_init)
            try:
                page.goto(self.base + path, wait_until="networkidle")
                btn = page.locator("button.copy-btn").first
                btn.click()
                page.wait_for_function(
                    "() => document.querySelector('button.copy-btn').textContent !== 'Copy'"
                )
                self.assertEqual(
                    btn.text_content(), "Copy failed",
                    f"{name}: hostile clipboard path must show Copy failed",
                )
                page.wait_for_timeout(1700)
                self.assertEqual(btn.text_content(), "Copy")
            finally:
                ctx.close()

    def test_skip_link_reveals_and_targets_main(self):
        for name, path in PAGES.items():
            ctx, page, _, _ = self._new_page((390, 844))
            try:
                page.goto(self.base + path, wait_until="networkidle")
                page.keyboard.press("Tab")
                focused = page.evaluate("() => document.activeElement.className")
                self.assertIn(
                    "skip-link", focused, f"{name}: first tab stop must be skip link"
                )
                box = page.locator("a.skip-link").bounding_box()
                self.assertIsNotNone(box, f"{name}: skip link has no box when focused")
                self.assertGreater(box["width"], 0, f"{name}: skip link hidden on focus")
                page.keyboard.press("Enter")
                page.wait_for_timeout(250)
                self.assertEqual(
                    page.evaluate("() => location.hash"),
                    "#main-content",
                    f"{name}: skip link must target #main-content",
                )
            finally:
                ctx.close()

    def test_table_region_keyboard_scrollable_at_390(self):
        for name, path in PAGES.items():
            ctx, page, _, _ = self._new_page((390, 844))
            try:
                page.goto(self.base + path, wait_until="networkidle")
                wrap = page.locator(".table-wrap").first
                self.assertEqual(
                    wrap.get_attribute("role"), "region", f"{name}: table role"
                )
                self.assertEqual(
                    wrap.get_attribute("tabindex"), "0", f"{name}: table tabindex"
                )
                wrap.focus()
                dims = page.evaluate(
                    """() => {
                        const el = document.querySelector('.table-wrap');
                        return {sw: el.scrollWidth, cw: el.clientWidth};
                    }"""
                )
                self.assertGreater(
                    dims["sw"], dims["cw"],
                    f"{name}: ledger table must scroll horizontally at 390",
                )
                before = page.evaluate(
                    "() => document.querySelector('.table-wrap').scrollLeft"
                )
                page.keyboard.press("ArrowRight")
                page.wait_for_timeout(150)
                after = page.evaluate(
                    "() => document.querySelector('.table-wrap').scrollLeft"
                )
                self.assertGreater(
                    after, before, f"{name}: keyboard must scroll the table region"
                )
            finally:
                ctx.close()

    def test_landing_website_links_reach_both_sites(self):
        """Landing 'Website' links point at the production Pages URLs, and a
        click on each reaches the page this PR ships (fulfilled locally so the
        test does not depend on the not-yet-deployed Pages site)."""
        def _fulfill(route):
            rel = route.request.url.split("RandomLabs/", 1)[1].rstrip("/")
            cand = ROOT / rel
            if not rel.endswith(".html"):
                cand = cand / "index.html"
            body = (
                cand.read_text(encoding="utf-8")
                if cand.exists()
                else "<!DOCTYPE html><title>404</title>"
            )
            route.fulfill(
                status=200, content_type="text/html; charset=utf-8", body=body
            )

        ctx, page, errors, _ = self._new_page()
        try:
            page.route("https://userfrom1995.github.io/RandomLabs/**", _fulfill)
            page.goto(self.base + "/index.html", wait_until="networkidle")
            for proj, frag in (("tor-cli", "torshim"), ("prism", "Prism")):
                link = page.locator(f'a[href$="RandomLabs/{proj}/"]').first
                self.assertTrue(
                    link.is_visible(), f"landing {proj} Website link not visible"
                )
                link.click()
                page.wait_for_load_state("networkidle")
                self.assertEqual(
                    page.url,
                    f"https://userfrom1995.github.io/RandomLabs/{proj}/",
                    f"click went to {page.url}",
                )
                self.assertIn(
                    frag, page.title() + page.inner_text("body"),
                    f"{proj} page content missing",
                )
                page.go_back()
                page.wait_for_load_state("networkidle")
            self.assertEqual(errors, [], f"landing navigation errors {errors}")
        finally:
            ctx.close()

    def test_hostile_missing_page_returns_404(self):
        ctx, page, _, _ = self._new_page()
        try:
            resp = page.goto(self.base + "/tor-cli/definitely-missing.html")
            self.assertEqual(resp.status, 404)
        finally:
            ctx.close()


if __name__ == "__main__":
    unittest.main()
