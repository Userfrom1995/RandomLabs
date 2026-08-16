/* Meridian web UI. Loads the exported index, runs the browser mirror engine,
 * and renders ranked results with highlighted snippets and score breakdowns.
 *
 * The pure rendering helpers (byte-offset mapping, snippet markup, doc-term
 * spans) are exported for headless testing under node; the DOM wiring runs
 * only when a document exists. */
(function (root) {
  'use strict';

  var index = null;
  var docCache = {};
  var currentScorer = 'bm25';
  var currentOpts = { stem: false, signals: true, stopwords: true };
  var lastQuery = '';
  var lastPlan = null;
  var pageSize = 10;
  var page = 0;
  var pageTotal = 0;

  var $q = null;
  var $go = null;
  var $suggest = null;
  var $results = null;
  var $status = null;
  var $stats = null;
  var $chips = null;
  var $modal = null;
  var $pager = null;
  var $dvTitle = null;
  var $dvSource = null;
  var $dvBody = null;

  /* ---------- small helpers ---------- */
  function utf8Len(cp) {
    if (cp < 0x80) return 1;
    if (cp < 0x800) return 2;
    if (cp < 0x10000) return 3;
    return 4;
  }

  function byteToCharIndex(text, targetByte) {
    var off = 0;
    for (var i = 0; i < text.length; i++) {
      if (off >= targetByte) return i;
      var cp = text.codePointAt(i);
      off += utf8Len(cp);
      if (cp > 0xffff) i++;
    }
    return text.length;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function isWordChar(c) {
    return /[\p{L}\p{N}]/u.test(c);
  }

  function renderSnippet(snippet) {
    var text = snippet.text;
    var out = '';
    var last = 0;
    snippet.highlights.forEach(function (hl) {
      var cs = byteToCharIndex(text, hl[0]);
      var ce = byteToCharIndex(text, hl[1]);
      out += escapeHtml(text.slice(last, cs));
      out += '<mark>' + escapeHtml(text.slice(cs, ce)) + '</mark>';
      last = ce;
    });
    out += escapeHtml(text.slice(last));
    return out;
  }

  /* Byte spans of any of `terms` in `text` (word-bound, case-insensitive),
   * mirroring the engine's word rule. */
  function termSpansIn(text, terms) {
    var spans = [];
    var termsSet = {};
    terms.forEach(function (t) {
      termsSet[t] = true;
    });
    var word = '';
    var inWord = false;
    var wordStart = 0;
    var byteOff = 0;
    var chars = Array.from(text);
    var charBytes = chars.map(function (c) {
      return utf8Len(c.codePointAt(0));
    });
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var len = charBytes[i];
      if (isWordChar(c)) {
        if (!inWord) {
          inWord = true;
          wordStart = byteOff;
          word = '';
        }
        word += c.toLowerCase();
      } else if (c === "'" && inWord && i + 1 < chars.length && isWordChar(chars[i + 1])) {
        word += "'";
        byteOff += len;
        continue;
      } else {
        flush();
      }
      byteOff += len;
    }
    flush();
    function flush() {
      if (inWord && termsSet[word]) {
        spans.push([wordStart, byteOff]);
      }
      inWord = false;
    }
    return spans;
  }

  /* The pure API is usable under node for headless testing. */
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        byteToCharIndex: byteToCharIndex,
        escapeHtml: escapeHtml,
        renderSnippet: renderSnippet,
        termSpansIn: termSpansIn,
      };
    }
    return;
  }

  $q = document.getElementById('q');
  $go = document.getElementById('go');
  $suggest = document.getElementById('suggest');
  $results = document.getElementById('results');
  $status = document.getElementById('status');
  $stats = document.getElementById('stats');
  $chips = document.getElementById('chips');
  $modal = document.getElementById('modal');
  $pager = document.getElementById('pager');
  $dvTitle = document.getElementById('dv-title');
  $dvSource = document.getElementById('dv-source');
  $dvBody = document.getElementById('dv-body');

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var self = this;
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(self, args);
      }, ms);
    };
  }

  /* ---------- data loading ---------- */
  function fetchDoc(doc) {
    if (docCache[doc.id] !== undefined) return Promise.resolve(docCache[doc.id]);
    return fetch(doc.url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (t) {
        docCache[doc.id] = t;
        doc.text = t;
        return t;
      })
      .catch(function () {
        docCache[doc.id] = '';
        doc.text = '';
        return '';
      });
  }

  function loadStats() {
    var terms = index.terms;
    var totalPostings = 0;
    var rawEst = 0;
    var compressed = 0;
    terms.forEach(function (e) {
      e.postings.forEach(function (p) {
        totalPostings += p.tf;
        rawEst += p.tf * 8;
      });
    });
    // Re-encode sizes like the Rust stats command does.
    terms.forEach(function (e) {
      var bytes = [];
      e.postings.forEach(function (p, i) {
        var prev = i > 0 ? e.postings[i - 1].docId : 0;
        pushVarint(bytes, p.docId - prev);
        pushVarint(bytes, p.tf);
        var pp = 0;
        p.positions.forEach(function (pos) {
          pushVarint(bytes, pos - pp);
          pp = pos;
        });
      });
      compressed += bytes.length;
    });
    var ratio = rawEst / Math.max(1, compressed);
    $stats.style.display = 'grid';
    $stats.innerHTML =
      stat('documents', index.totalDocs) +
      stat('tokens', index.totalTokens) +
      stat('vocabulary', index.terms.size) +
      stat('postings', totalPostings) +
      stat('compressed', fmtBytes(compressed)) +
      stat('compression', ratio.toFixed(1) + 'x');
    function stat(k, v) {
      return '<div class="stat"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>';
    }
    function fmtBytes(n) {
      if (n < 1024) return n + ' B';
      if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
      return (n / 1048576).toFixed(2) + ' MB';
    }
    function pushVarint(arr, v) {
      v = v >>> 0;
      while (v >= 0x80) {
        arr.push((v & 0x7f) | 0x80);
        v >>>= 7;
      }
      arr.push(v);
    }
  }

  function setupSuggestions() {
    var q = $q.value.trim();
    if (!q) {
      $suggest.style.display = 'none';
      return;
    }
    var words = q.split(/\s+/);
    var last = words[words.length - 1].toLowerCase();
    if (!last) {
      $suggest.style.display = 'none';
      return;
    }
    var matches = Meridian.suggestPrefix(index, last, 6).map(function (term) {
      var e = index.terms.get(term);
      return { term: term, df: e ? e.df : 0 };
    });
    if (!matches.length) {
      $suggest.style.display = 'none';
      return;
    }
    var html = '';
    matches.forEach(function (m) {
      html +=
        '<div class="sg" data-term="' + escapeHtml(m.term) + '"><span>' +
        escapeHtml(m.term) +
        '</span><span class="n">' + m.df + ' docs</span></div>';
    });
    $suggest.innerHTML = html;
    $suggest.style.display = 'block';
  }

  /* ---------- search + render ---------- */
  function runSearch() {
    var query = $q.value.trim();
    if (!query) return;
    lastQuery = query;
    $suggest.style.display = 'none';
    var plan;
    try {
      plan = Meridian.parseQuery(query);
    } catch (e) {
      $status.innerHTML = 'could not parse query: <b>' + escapeHtml(e.message) + '</b>';
      $results.innerHTML = '';
      return;
    }
    lastPlan = plan;
    page = 0;
    renderPage(plan);
  }

  function renderPage(plan) {
    var started = performance.now();
    var offset = page * pageSize;
    var meta = Meridian.searchWithMeta(index, currentScorer, currentOpts, plan, 10, offset, pageSize);
    var ms = (performance.now() - started).toFixed(1);
    var hits = meta.hits;
    var total = meta.totalHits;
    pageTotal = meta.pages;
    var suggestions = Meridian.suggestions(index, plan);
    $status.innerHTML =
      'about <b>' + total + '</b> result' + (total === 1 ? '' : 's') +
      ' for <b>' + escapeHtml(lastQuery) + '</b> &middot; ' +
      currentScorer.toUpperCase() +
      (currentOpts.stem ? ' + stem' : '') +
      (currentOpts.signals ? ' + signals' : '') +
      (currentOpts.stopwords ? ' + stopwords' : '') +
      ' &middot; ' + ms + ' ms';

    if (suggestions.length) {
      $results.innerHTML =
        '<div class="suggest-line">Did you mean: ' +
        suggestions
          .map(function (s) {
            return '<span class="sg-click" data-term="' + escapeHtml(s) + '">' + escapeHtml(s) + '</span>';
          })
          .join(', ') +
        '?</div>';
    }

    if (!hits.length) {
      if (!suggestions.length) {
        $results.innerHTML =
          '<div class="empty">No documents matched. Try fewer terms, or check the query help.</div>';
      }
      renderPager();
      return;
    }

    var maxScore = 1e-9;
    hits.forEach(function (h) {
      if (h.score > maxScore) maxScore = h.score;
    });

    var html = '';
    hits.forEach(function (h, rank) {
      var doc = index.docs[h.docId];
      html +=
        '<div class="result" data-doc="' + doc.id + '">' +
        '<div class="r-top"><span class="r-rank">' + (offset + rank + 1) + '</span>' +
        '<span class="r-title">' + escapeHtml(doc.title) + '</span></div>' +
        '<div class="r-source">' + escapeHtml(doc.source) + '</div>' +
        '<div class="r-snippet" data-doc="' + doc.id + '">loading&hellip;</div>' +
        '<div class="r-score">' +
        breakdownHtml(h.breakdown, maxScore) +
        '</div></div>';
    });
    $results.innerHTML = html;
    renderPager();

    // Load doc text lazily for snippets.
    hits.forEach(function (h) {
      var doc = index.docs[h.docId];
      fetchDoc(doc).then(function (text) {
        var el = $results.querySelector('.r-snippet[data-doc="' + doc.id + '"]');
        if (!el || !text) {
          if (el) el.textContent = '(text unavailable)';
          return;
        }
        var snip = Meridian.generateSnippet(text, h.matches, 220);
        el.innerHTML = renderSnippet(snip);
      });
    });
  }

  function renderPager() {
    if (pageTotal <= 1) {
      $pager.style.display = 'none';
      $pager.innerHTML = '';
      return;
    }
    var html = '';
    var start = Math.max(0, page - 2);
    var end = Math.min(pageTotal, page + 3);
    if (start > 0) html += '<button class="pg" data-p="-1">&laquo;</button>';
    for (var i = start; i < end; i++) {
      html += '<button class="pg' + (i === page ? ' on' : '') + '" data-p="' + i + '">' + (i + 1) + '</button>';
    }
    if (end < pageTotal) html += '<button class="pg" data-p="-2">&raquo;</button>';
    $pager.innerHTML = html;
    $pager.style.display = 'block';
  }

  function breakdownHtml(breakdown, maxScore) {
    if (!breakdown.length) return '';
    var html = '';
    breakdown.forEach(function (b) {
      var w = Math.max(3, Math.round((b.score / maxScore) * 100));
      var tag = b.title ? ' <span class="bar-tag">title</span>' : '';
      html +=
        '<div class="bar-row"><span class="bar-label">' + escapeHtml(b.term) + tag + '</span>' +
        '<div class="bar"><i style="width:' + w + '%"></i></div>' +
        '<span class="bar-label">' + b.score.toFixed(3) + '</span></div>';
    });
    return html;
  }

  /* ---------- document viewer ---------- */
  function openDoc(docId, queryTerms) {
    var doc = index.docs[docId];
    fetchDoc(doc).then(function (text) {
      $dvTitle.textContent = doc.title;
      $dvSource.textContent = doc.source + '  (' + doc.length + ' tokens)';
      if (!text) {
        $dvBody.textContent = '(text unavailable)';
      } else {
        var spans = termSpansIn(text, queryTerms);
        var out = '';
        var last = 0;
        spans.forEach(function (sp) {
          var cs = byteToCharIndex(text, sp[0]);
          var ce = byteToCharIndex(text, sp[1]);
          out += escapeHtml(text.slice(last, cs));
          out += '<mark>' + escapeHtml(text.slice(cs, ce)) + '</mark>';
          last = ce;
        });
        out += escapeHtml(text.slice(last));
        $dvBody.innerHTML = out;
      }
      $modal.classList.add('open');
    });
  }

  function closeModal() {
    $modal.classList.remove('open');
  }

  /* ---------- help ---------- */
  function toggleHelp() {
    var help = document.getElementById('help-panel');
    if (help) {
      help.remove();
      return;
    }
    var panel = document.createElement('div');
    panel.id = 'help-panel';
    panel.style.cssText =
      'max-width:880px;margin:6px auto 0;padding:14px 20px;background:var(--panel);' +
      'border:1px solid var(--border);border-radius:12px;font-size:13.5px;color:var(--muted);line-height:1.7';
    panel.innerHTML =
      '<b style="color:var(--text)">Query syntax</b><br>' +
      'Plain words are a ranked search: <span class="kbd">seismic waves</span> scores documents by relevance.<br>' +
      '<span class="kbd">AND</span>, <span class="kbd">OR</span>, <span class="kbd">NOT</span> and parentheses build exact boolean queries: ' +
      '<span class="kbd">rust AND (cargo OR bm25)</span>, <span class="kbd">rust AND NOT chess</span>.<br>' +
      'Quoted phrases match consecutive words in order: <span class="kbd">"inverted index"</span>.<br>' +
      'Fuzzy search tolerates typos: <span class="kbd">indexing~</span> (1 edit) or <span class="kbd">indexing~2</span> (2 edits).<br>' +
      'Wildcards match prefixes and single letters: <span class="kbd">search*</span>, <span class="kbd">sear?h</span>.<br>' +
      'Fielded search restricts to a field: <span class="kbd">title:rust</span>, <span class="kbd">source:docs*</span>.<br>' +
      'Phrases allow a slop for gaps between words: <span class="kbd">"search engine"~2</span>.<br>' +
      'Term boost lifts a word: <span class="kbd">rust^3</span>, <span class="kbd">title:rust^2</span>.<br>' +
      'CJK text segments into n-grams: <span class="kbd">搜索引擎</span> matches Chinese, Japanese and Korean documents.<br>' +
      'Toggle <span class="kbd">stem</span> to expand a word to its whole morphological family (searching, searched, search&hellip;).<br>' +
      'Toggle <span class="kbd">stopwords</span> to drop common function words from ranked queries.<br>' +
      'Results are always ranked (BM25 or TF-IDF); the AND/OR/NOT set the candidate set first.';
    var toolbar = document.querySelector('.toolbar');
    toolbar.parentNode.insertBefore(panel, toolbar.nextSibling);
  }

  /* ---------- wiring ---------- */
  function setScorer(s) {
    currentScorer = s;
    document.querySelectorAll('#scorer button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.scorer === s);
    });
    if (lastQuery && $q.value.trim() === lastQuery) runSearch();
    else if ($q.value.trim()) runSearch();
  }

  var exampleQueries = [
    'seismic waves',
    'rust AND chess',
    '"inverted index"',
    'gambit AND NOT python',
    'indexing~',
    'search*',
    'title:rust',
    '"search engine"~2',
    'rust^3',
    '搜索引擎',
    'sorting algorithm',
    'neural network',
    'webgl OR canvas',
  ];
  $chips.innerHTML = exampleQueries
    .map(function (q) {
      return '<span class="chip" data-q="' + escapeHtml(q) + '">' + escapeHtml(q) + '</span>';
    })
    .join('');

  $chips.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    $q.value = chip.dataset.q;
    runSearch();
  });

  document.querySelectorAll('#scorer button').forEach(function (b) {
    b.addEventListener('click', function () {
      setScorer(b.dataset.scorer);
    });
  });

  function bindToggle(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.checked = currentOpts[key];
    el.addEventListener('change', function () {
      currentOpts[key] = el.checked;
      if ($q.value.trim()) runSearch();
    });
  }
  bindToggle('toggle-stem', 'stem');
  bindToggle('toggle-signals', 'signals');
  bindToggle('toggle-stopwords', 'stopwords');

  $go.addEventListener('click', runSearch);
  $q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') runSearch();
  });
  $pager.addEventListener('click', function (e) {
    var btn = e.target.closest('.pg');
    if (!btn) return;
    var p = parseInt(btn.dataset.p, 10);
    if (p === -1) page = Math.max(0, page - 1);
    else if (p === -2) page = Math.min(pageTotal - 1, page + 1);
    else page = p;
    renderPage(lastPlan);
    window.scrollTo(0, 0);
  });
  $q.addEventListener('input', debounce(setupSuggestions, 120));
  $suggest.addEventListener('click', function (e) {
    var item = e.target.closest('.sg');
    if (!item) return;
    var words = $q.value.trim().split(/\s+/);
    words.pop();
    words.push(item.dataset.term);
    $q.value = words.join(' ');
    runSearch();
  });
  document.addEventListener('click', function (e) {
    if (!$suggest.contains(e.target) && e.target !== $q) {
      $suggest.style.display = 'none';
    }
  });

  $results.addEventListener('click', function (e) {
    var sug = e.target.closest('.sg-click');
    if (sug) {
      $q.value = sug.dataset.term;
      runSearch();
      return;
    }
    var el = e.target.closest('.result');
    if (!el) return;
    var terms = Meridian.scoredTerms(lastPlan || Meridian.parseQuery($q.value.trim()));
    openDoc(parseInt(el.dataset.doc, 10), terms);
  });

  $modal.addEventListener('click', function (e) {
    if (e.target === $modal || e.target.id === 'modal-close') closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
  document.getElementById('open-help').addEventListener('click', toggleHelp);

  /* ---------- init ---------- */
  fetch('data/index.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      index = Meridian.loadIndex(data);
      loadStats();
      $status.innerHTML =
        'indexed <b>' + index.totalDocs + '</b> documents, <b>' + index.terms.size +
        '</b> terms - ready.';
      runSearch();
    })
    .catch(function (e) {
      $status.innerHTML = 'failed to load the index: <b>' + escapeHtml(String(e)) + '</b>';
    });
})();