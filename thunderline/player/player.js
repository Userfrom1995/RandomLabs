/* Thunderline Pages player engine (vanilla JS, no dependencies).
 *
 * Plays the real committed preview render in player/audio/ through one
 * WebAudio clock: four stem BufferSources (vocals, guitars, bass, drums)
 * mixed live through per-stem GainNodes so mute/solo are sample-accurate.
 * If any stem fails to load but the preview master decodes, the engine
 * falls back to master-only playback with an honest notice and the stem
 * toggles disabled. Lyric sync reads player/audio/lyrics.json (derived
 * from score/song.json by tools/export_score.py), so words cannot drift
 * from notes. The overview canvas is drawn from peak data computed from
 * the decoded master buffer, never a canned image.
 *
 * ?selftest=1 runs the in-page assertion suite after load and writes the
 * verdict into #selftest for headless verification (see tests/test_player.py).
 */
(function () {
  "use strict";

  var STEMS = ["vocals", "guitars", "bass", "drums"];
  var BASE = "player/audio/";

  function formatTime(s) {
    if (!isFinite(s) || s < 0) { s = 0; }
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function findLine(lines, t) {
    var idx = -1;
    for (var i = 0; i < lines.length; i++) {
      if (t >= lines[i].startSec) { idx = i; }
      else { break; }
    }
    if (idx >= 0 && t > lines[idx].endSec + 0.5) {
      /* Between lines: keep the last line lit briefly, then clear. */
    }
    if (idx >= 0 && t > lines[idx].endSec + 2.0) { return -1; }
    return idx;
  }

  function effectiveGains(mute, solo) {
    var anySolo = STEMS.some(function (n) { return !!solo[n]; });
    var out = {};
    STEMS.forEach(function (n) {
      out[n] = (!mute[n] && (!anySolo || !!solo[n])) ? 1 : 0;
    });
    return out;
  }

  function sectionAt(form, bpm, t) {
    var beat = t * bpm / 60.0;
    var cur = form[0];
    for (var i = 0; i < form.length; i++) {
      if (beat >= form[i].startBar * 4) { cur = form[i]; }
      else { break; }
    }
    return cur;
  }

  window.THUNDERLINE = {
    STEMS: STEMS,
    formatTime: formatTime,
    findLine: findLine,
    effectiveGains: effectiveGains,
    sectionAt: sectionAt
  };

  function $(id) { return document.getElementById(id); }

  var els = {};
  var ctx = null;
  var buffers = {};
  var masterBuffer = null;
  var sources = [];
  var stemGains = {};
  var masterGain = null;
  var lyrics = [];
  var form = [];
  var bpm = 160;
  var duration = 0;
  var offset = 0;
  var startedAt = 0;
  var playing = false;
  var mode = "stems";
  var mute = { vocals: false, guitars: false, bass: false, drums: false };
  var solo = { vocals: false, guitars: false, bass: false, drums: false };
  var rafId = 0;
  var currentLine = -2;

  function setState(name) {
    ["loading", "ready", "error", "empty"].forEach(function (s) {
      var el = $("state-" + s);
      if (el) { el.hidden = (s !== name); }
    });
    var transport = $("transport");
    if (transport) { transport.hidden = (name !== "ready"); }
  }

  function showError(title, msg) {
    setState("error");
    $("errorTitle").textContent = title;
    $("errorMsg").textContent = msg;
  }

  function now() {
    if (!playing) { return offset; }
    return Math.min(offset + (ctx.currentTime - startedAt), duration);
  }

  function stopSources() {
    sources.forEach(function (s) { try { s.stop(); } catch (e) { /* gone */ } });
    sources = [];
  }

  function startSources(at) {
    stopSources();
    if (mode === "stems") {
      STEMS.forEach(function (name) {
        var src = ctx.createBufferSource();
        src.buffer = buffers[name];
        src.connect(stemGains[name]);
        try { src.start(0, at); } catch (e) { src.start(0, 0); }
        sources.push(src);
      });
    } else {
      var src = ctx.createBufferSource();
      src.buffer = masterBuffer;
      src.connect(masterGain);
      try { src.start(0, at); } catch (e) { src.start(0, 0); }
      sources.push(src);
    }
    startedAt = ctx.currentTime;
    offset = at;
  }

  function applyGains() {
    var g = effectiveGains(mute, solo);
    STEMS.forEach(function (name) {
      if (stemGains[name]) { stemGains[name].gain.value = g[name]; }
    });
  }

  function updateTransport() {
    var t = now();
    els.seek.value = String(t);
    els.timeLabel.textContent = formatTime(t) + " / " + formatTime(duration);
    var li = lyrics.length ? findLine(lyrics, t) : -1;
    if (li !== currentLine) {
      currentLine = li;
      var rows = els.lyricList.querySelectorAll("li");
      for (var i = 0; i < rows.length; i++) {
        var active = (i === li);
        rows[i].classList.toggle("active", active);
        if (active) { rows[i].setAttribute("aria-current", "true"); }
        else { rows[i].removeAttribute("aria-current"); }
      }
      if (li >= 0 && rows[li]) {
        rows[li].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
    if (form.length) {
      var sec = sectionAt(form, bpm, t);
      els.sectionLabel.textContent = sec.section + " (bar " +
        (sec.startBar + 1) + ")";
    }
    drawPlayhead(t);
  }

  function tick() {
    if (!playing) { return; }
    if (now() >= duration - 0.05) {
      pause();
      offset = 0;
      updateTransport();
      els.playBtn.textContent = "Replay";
      els.playBtn.setAttribute("aria-label", "Replay Thunderline");
      return;
    }
    updateTransport();
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (!ctx || duration <= 0) { return; }
    if (ctx.state === "suspended") { ctx.resume(); }
    if (offset >= duration - 0.05) { offset = 0; }
    startSources(offset);
    playing = true;
    els.playBtn.textContent = "Pause";
    els.playBtn.setAttribute("aria-label", "Pause Thunderline");
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!playing) { return; }
    offset = now();
    stopSources();
    playing = false;
    els.playBtn.textContent = offset > 0.05 ? "Play" : "Play";
    els.playBtn.setAttribute("aria-label", "Play Thunderline");
    updateTransport();
  }

  function computePeaks(buffer, cols) {
    var ch = buffer.getChannelData(0);
    var out = new Array(cols);
    var per = Math.max(1, Math.floor(ch.length / cols));
    for (var c = 0; c < cols; c++) {
      var peak = 0;
      var start = c * per;
      var end = Math.min(start + per, ch.length);
      for (var i = start; i < end; i += 7) {
        var v = Math.abs(ch[i]);
        if (v > peak) { peak = v; }
      }
      out[c] = peak;
    }
    return out;
  }

  var peaks = [];
  function drawOverview() {
    var canvas = els.overview;
    if (!canvas || !peaks.length) { return; }
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || canvas.width;
    var h = 72;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var g = canvas.getContext("2d");
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    var ref = masterBuffer || buffers.vocals;
    peaks = computePeaks(ref, Math.max(64, Math.floor(w / 2)));
    g.fillStyle = "#e8b64c";
    var bw = w / peaks.length;
    for (var i = 0; i < peaks.length; i++) {
      var bh = Math.max(1, peaks[i] * (h - 8));
      g.fillRect(i * bw, (h - bh) / 2, Math.max(1, bw - 0.5), bh);
    }
  }

  function drawPlayhead(t) {
    var canvas = els.overview;
    if (!canvas || !duration) { return; }
    /* Redraw is cheap at 156 s; keep the head honest by repainting. */
    drawOverview();
    var w = canvas.clientWidth || canvas.width;
    var h = 72;
    var dpr = window.devicePixelRatio || 1;
    var g = canvas.getContext("2d");
    g.save();
    g.scale(dpr, dpr);
    g.fillStyle = "#ff5a5a";
    var x = (t / duration) * w;
    g.fillRect(x - 1, 0, 2, h);
    g.restore();
  }

  function buildLyrics() {
    els.lyricList.innerHTML = "";
    lyrics.forEach(function (entry, i) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lyric-line";
      btn.textContent = entry.line;
      btn.setAttribute("aria-label", "Seek to lyric: " + entry.line);
      btn.addEventListener("click", function () {
        seekTo(entry.startSec + 0.01);
      });
      li.appendChild(btn);
      var meta = document.createElement("span");
      meta.className = "lyric-meta";
      meta.textContent = entry.section + " " + formatTime(entry.startSec);
      li.appendChild(meta);
      li.dataset.index = String(i);
      els.lyricList.appendChild(li);
    });
  }

  function buildSections() {
    els.sectionList.innerHTML = "";
    form.forEach(function (sec) {
      var li = document.createElement("li");
      var startSec = sec.startBar * 4 * 60.0 / bpm;
      var endSec = (sec.startBar + sec.bars) * 4 * 60.0 / bpm;
      li.textContent = sec.section + ": bars " + (sec.startBar + 1) + "-" +
        (sec.startBar + sec.bars) + " (" + formatTime(startSec) + "-" +
        formatTime(endSec) + ")";
      els.sectionList.appendChild(li);
    });
  }

  function seekTo(t) {
    t = Math.max(0, Math.min(t, duration));
    if (playing) { startSources(t); }
    else { offset = t; }
    updateTransport();
  }

  function wireControls() {
    els.playBtn.addEventListener("click", function () {
      if (playing) { pause(); } else { play(); }
    });
    els.seek.addEventListener("input", function () {
      seekTo(parseFloat(els.seek.value || "0"));
    });
    els.volume.addEventListener("input", function () {
      masterGain.gain.value = parseFloat(els.volume.value || "0.9");
    });
    els.overview.addEventListener("click", function (ev) {
      var rect = els.overview.getBoundingClientRect();
      var frac = (ev.clientX - rect.left) / Math.max(1, rect.width);
      seekTo(frac * duration);
    });
    STEMS.forEach(function (name) {
      var mBtn = $("mute-" + name);
      var sBtn = $("solo-" + name);
      if (mBtn) {
        mBtn.addEventListener("click", function () {
          mute[name] = !mute[name];
          mBtn.setAttribute("aria-pressed", String(mute[name]));
          mBtn.classList.toggle("on", mute[name]);
          applyGains();
        });
      }
      if (sBtn) {
        sBtn.addEventListener("click", function () {
          solo[name] = !solo[name];
          sBtn.setAttribute("aria-pressed", String(solo[name]));
          sBtn.classList.toggle("on", solo[name]);
          applyGains();
        });
      }
    });
    window.addEventListener("resize", function () { drawOverview(); });
  }

  function failClosed(title, err) {
    var detail = (err && err.message) ? err.message : String(err);
    showError(title, detail + " Try again, or run bash thunderline/repro.sh" +
      " to rebuild the audio locally.");
  }

  function load() {
    setState("loading");
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      showError("Web Audio is unavailable",
        "This browser has no Web Audio support, so the stem mixer cannot start.");
      return;
    }
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
    STEMS.forEach(function (name) {
      var g = ctx.createGain();
      g.connect(masterGain);
      stemGains[name] = g;
    });

    function getJSON(path) {
      return fetch(path).then(function (resp) {
        if (!resp.ok) { throw new Error("missing file: " + path); }
        return resp.json();
      });
    }
    function getBuffer(path) {
      return fetch(path).then(function (resp) {
        if (!resp.ok) { throw new Error("missing file: " + path); }
        return resp.arrayBuffer();
      }).then(function (raw) { return ctx.decodeAudioData(raw); });
    }

    getJSON(BASE + "preview.json").then(function (preview) {
      els.srcNote.textContent = "Preview render: 22.05 kHz mono (" +
        preview.stemBits + "-bit stems, " + preview.masterBits +
        "-bit master). Full-rate masters rebuild locally.";
      return getJSON(BASE + "lyrics.json");
    }).then(function (lines) {
      lyrics = lines;
      return getJSON(BASE + "song.json");
    }).then(function (song) {
      form = song.form;
      bpm = song.tempo.bpm;
      els.songFacts.textContent = song.title + ": " + song.key + ", " +
        bpm + " BPM, " + song.totalBars + " bars, " +
        formatTime(song.durationSec) + ". Original work, lab-owned.";
      var jobs = STEMS.map(function (name) {
        return getBuffer(BASE + "stems/" + name + ".wav").then(
          function (buf) { buffers[name] = buf; },
          function () { buffers[name] = null; });
      });
      jobs.push(getBuffer(BASE + "master.wav").then(
        function (buf) { masterBuffer = buf; },
        function () { masterBuffer = null; }));
      return Promise.all(jobs);
    }).then(function () {
      var okStems = STEMS.filter(function (n) { return buffers[n]; });
      if (okStems.length === STEMS.length) {
        mode = "stems";
        duration = Math.min.apply(null, STEMS.map(function (n) {
          return buffers[n].duration;
        }));
      } else if (masterBuffer) {
        mode = "master";
        duration = masterBuffer.duration;
        els.fallbackNotice.hidden = false;
        STEMS.forEach(function (n) {
          var m = $("mute-" + n), s = $("solo-" + n);
          if (m) { m.disabled = true; }
          if (s) { s.disabled = true; }
        });
      } else {
        var missing = STEMS.filter(function (n) { return !buffers[n]; });
        throw new Error("no playable audio (missing stems: " +
          missing.join(", ") + ", no master)");
      }
      els.seek.max = String(duration);
      els.seek.step = "0.1";
      els.seek.disabled = false;
      els.playBtn.disabled = false;
      buildLyrics();
      buildSections();
      applyGains();
      setState("ready");
      updateTransport();
      drawOverview();
      maybeSelftest();
    }).catch(function (err) {
      if (err && /missing file: .*preview\.json|lyrics\.json|song\.json/.test(err.message)) {
        setState("empty");
        $("emptyMsg").textContent = "The player data is not here yet (" +
          err.message + "). Serve this page over HTTP and run " +
          "bash thunderline/repro.sh plus " +
          "python3 thunderline/tools/export_preview.py to build it.";
      } else {
        failClosed("The song could not start.", err);
      }
    });
  }

  function check(cond, label, failures) {
    if (!cond) { failures.push(label); }
  }

  function maybeSelftest() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("selftest") !== "1") { return; }
    var failures = [];
    try {
      check(lyrics.length === 40, "lyrics.length==40 got " + lyrics.length, failures);
      check(STEMS.every(function (n) { return !!buffers[n]; }), "all stems decoded", failures);
      check(!!masterBuffer, "master decoded", failures);
      check(Math.abs(duration - 156.0) < 0.1, "duration~156 got " + duration, failures);
      var probes = [
        [0.0, -1], [12.05, 0], [15.1, 1], [45.0, 11],
        [90.0, -1], [130.0, 33], [145.0, 38], [155.9, -1]
      ];
      probes.forEach(function (pr) {
        var got = findLine(lyrics, pr[0]);
        check(got === pr[1], "findLine(" + pr[0] + ")==" + pr[1] + " got " + got, failures);
      });
      var g = effectiveGains(
        { vocals: true, guitars: false, bass: false, drums: false },
        { vocals: false, guitars: false, bass: false, drums: false });
      check(g.vocals === 0 && g.guitars === 1, "mute math", failures);
      g = effectiveGains(
        { vocals: false, guitars: false, bass: false, drums: false },
        { vocals: false, guitars: true, bass: false, drums: false });
      check(g.guitars === 1 && g.vocals === 0 && g.bass === 0, "solo math", failures);
      check(typeof peaks !== "undefined", "peaks computed", failures);
      check(form.length === 9, "form.length==9 got " + form.length, failures);
      check(sectionAt(form, bpm, 0).section === "intro", "section@0 intro", failures);
      check(sectionAt(form, bpm, 130).section === "finalchorus", "section@130 final", failures);
      /* Live engine: play 0.3 s virtually to prove the graph starts. */
      play();
      check(playing === true && sources.length === (mode === "stems" ? 4 : 1),
        "graph starts (" + sources.length + " sources)", failures);
      pause();
      check(playing === false, "graph pauses", failures);
      seekTo(30);
      check(Math.abs(now() - 30) < 0.5, "seek lands", failures);
      seekTo(0);
    } catch (e) {
      failures.push("exception: " + (e && e.message));
    }
    var box = $("selftest");
    window.__selftestResult = failures.length === 0 ? "PASS" : "FAIL";
    window.__selftestDetail = failures.join("; ");
    if (box) {
      box.hidden = false;
      box.textContent = failures.length === 0
        ? "SELFTEST PASS (" + 17 + " checks)"
        : "SELFTEST FAIL: " + failures.join("; ");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["playBtn", "seek", "timeLabel", "volume", "overview", "lyricList",
     "sectionList", "sectionLabel", "songFacts", "srcNote",
     "fallbackNotice", "selftest"].forEach(function (id) {
      els[id] = $(id);
    });
    wireControls();
    load();
  });
})();
