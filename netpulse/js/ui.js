"use strict";
/* Netpulse UI primitives: tabs, source badges, empty states, banner, tables. */
(function (global) {
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function badge(source, level) {
    var b = el("span", "np-badge " + (level || ""));
    b.textContent = source;
    b.title = source;
    return b;
  }

  function emptyState(title, body, missingLabel) {
    var box = el("div", "np-empty");
    box.setAttribute("role", "status");
    var strong = el("strong", null, title);
    box.appendChild(strong);
    var p = el("p", null, body);
    p.style.margin = "0";
    box.appendChild(p);
    if (missingLabel) {
      box.appendChild(badge(missingLabel, "missing"));
    }
    return box;
  }

  function kvRow(dl, term, value, sourceLabel, sourceLevel) {
    var dt = el("dt", null, term);
    var dd = document.createElement("dd");
    var val = el("span", "np-val",
      (value === null || value === undefined || value === "")
        ? "not exposed" : String(value));
    dd.appendChild(val);
    if (sourceLabel) dd.appendChild(badge(sourceLabel, sourceLevel || ""));
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  function initTabs(tablist, onSelect) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var active = t === tab;
        t.setAttribute("aria-selected", active ? "true" : "false");
        t.tabIndex = active ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !active;
      });
      if (onSelect) onSelect(tab.dataset.tab);
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (ev) {
        var next = null;
        if (ev.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (ev.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (ev.key === "Home") next = tabs[0];
        if (ev.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          ev.preventDefault();
          next.focus();
          select(next);
        }
      });
    });
    if (tabs.length) select(tabs[0]);
  }

  function setBanner(bannerEl, online) {
    if (!bannerEl) return;
    bannerEl.classList.remove("is-offline", "is-online-flash");
    if (online) {
      bannerEl.textContent = "";
      bannerEl.hidden = true;
    } else {
      bannerEl.hidden = false;
      bannerEl.classList.add("is-offline");
      bannerEl.textContent = "You are offline. Live measurements are paused; panels show their last known state or honest empty states.";
    }
  }

  function flashReconnected(bannerEl) {
    if (!bannerEl) return;
    bannerEl.hidden = false;
    bannerEl.classList.add("is-online-flash");
    bannerEl.textContent = "Back online. Panels resume live readings.";
    setTimeout(function () {
      if (!bannerEl.classList.contains("is-online-flash")) return;
      bannerEl.classList.remove("is-online-flash");
      bannerEl.hidden = true;
      bannerEl.textContent = "";
    }, 4000);
  }

  global.NetpulseUI = {
    el: el,
    badge: badge,
    emptyState: emptyState,
    kvRow: kvRow,
    initTabs: initTabs,
    setBanner: setBanner,
    flashReconnected: flashReconnected
  };
})(typeof window !== "undefined" ? window : this);
