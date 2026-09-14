/* Poolduel shared UI (M11d): enhancement-only. Every page reads fully
 * with JavaScript disabled; this script adds theme toggle, heading
 * permalinks, contender picker jumps, BibTeX copy, and FAQ open-all.
 * No CDN, no fetch, no prompts. */
(function () {
  "use strict";
  function themeButton() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    try {
      var saved = localStorage.getItem("poolduel-theme");
      if (saved === "light" || saved === "dark") {
        document.documentElement.setAttribute("data-theme", saved);
        btn.textContent = saved === "light" ? "Dark theme" : "Light theme";
      }
    } catch (e) { /* storage unavailable: stay dark */ }
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var next = cur === "light" ? "dark" : "light";
      if (next === "dark") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", next);
      }
      btn.textContent = next === "light" ? "Dark theme" : "Light theme";
      try { localStorage.setItem("poolduel-theme", next); } catch (e) {}
    });
  }
  function permalinks() {
    Array.prototype.forEach.call(
      document.querySelectorAll("h2[id], h3[id]"), function (h) {
        if (h.querySelector(".permalink")) return;
        var a = document.createElement("a");
        a.className = "permalink";
        a.href = "#" + h.id;
        a.textContent = "#";
        a.setAttribute("aria-label", "permalink to " + h.id);
        h.appendChild(a);
      });
  }
  function picker() {
    var sel = document.getElementById("contender-picker");
    if (!sel) return;
    sel.addEventListener("change", function () {
      if (sel.value) window.location.href = sel.value;
    });
  }
  function bibtex() {
    var btn = document.getElementById("bibtex-copy");
    var pre = document.getElementById("bibtex-block");
    if (!btn || !pre) return;
    btn.addEventListener("click", function () {
      var text = pre.textContent;
      function done(ok) {
        btn.textContent = ok ? "Copied" : "Copy failed";
        setTimeout(function () { btn.textContent = "Copy BibTeX"; }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); },
          function () { done(false); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { done(document.execCommand("copy")); } catch (e) { done(false); }
        document.body.removeChild(ta);
      }
    });
  }
  function faqAll() {
    var btn = document.getElementById("faq-toggle-all");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var items = document.querySelectorAll("details.faq");
      var anyClosed = false;
      Array.prototype.forEach.call(items, function (d) {
        if (!d.open) anyClosed = true;
      });
      Array.prototype.forEach.call(items, function (d) {
        d.open = anyClosed;
      });
      btn.textContent = anyClosed ? "Close all" : "Open all";
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      themeButton(); permalinks(); picker(); bibtex(); faqAll();
    });
  } else {
    themeButton(); permalinks(); picker(); bibtex(); faqAll();
  }
})();
