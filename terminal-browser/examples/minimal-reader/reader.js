// Minimal Reader sample extension: publishes one page action that
// summarizes the current page into deterministic JSON. It runs in the
// extension isolated world (separate globals, shared DOM), so page
// scripts can neither see nor clobber __tbActions.
window.__tbActions = {
  summarize: function (args) {
    var max = (args && typeof args.max === "number" && args.max > 0) ? Math.floor(args.max) : 20;
    var pick = function (sel) {
      var out = [];
      var els = document.querySelectorAll(sel);
      for (var i = 0; i < els.length && out.length < max; i++) {
        var text = (els[i].innerText || els[i].textContent || "").replace(/\s+/g, " ").trim();
        if (text) {
          out.push(text.slice(0, 200));
        }
      }
      return out;
    };
    return {
      title: document.title || "",
      url: document.URL || "",
      headings: pick("h1, h2, h3"),
      links: pick("a")
    };
  }
};
