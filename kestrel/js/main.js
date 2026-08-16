/* Kestrel playground - draw a digit, get a live classification.
 *
 * The drawing canvas is 280x280; the model input is 28x28, so each input cell
 * averages a 10x10 block. The resulting 784-vector is normalized to [0,1]
 * (divided by its max when non-zero) and run through KestrelNet.
 */
(function () {
  "use strict";

  var SIZE = 280;
  var INPUT = 28;
  var CELL = SIZE / INPUT;

  var canvas = document.getElementById("draw");
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";

  var drawing = false;

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (SIZE / r.width),
      y: (e.clientY - r.top) * (SIZE / r.height)
    };
  }

  canvas.addEventListener("pointerdown", function (e) {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    var p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drawing) return;
    var p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  canvas.addEventListener("pointerup", function (e) {
    drawing = false;
  });
  canvas.addEventListener("pointerleave", function () {
    drawing = false;
  });

  function clear() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SIZE, SIZE);
    classify();
  }
  document.getElementById("clear").addEventListener("click", clear);

  // 5x7 bitmap glyphs for the ten digits, mirroring Kestrel's synthetic
  // generator so the demo digit looks like the training data.
  var GLYPHS = [
    ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    ["01110", "10001", "10001", "01111", "00001", "00010", "01100"]
  ];

  // Render a random synthetic digit (random scale/shift, mild noise) straight
  // onto the canvas, then classify it: exercises the whole input -> network
  // path on something the model was trained on.
  function randomDemo() {
    var digit = Math.floor(Math.random() * 10);
    var glyph = GLYPHS[digit];
    var scale = 0.9 + Math.random() * 0.5;
    var dx = (Math.random() * 2 - 1) * 3.0;
    var dy = (Math.random() * 2 - 1) * 3.0;
    var cell = SIZE / 28;
    var cx = 14 + dx;
    var cy = 14 + dy;
    var x0 = cx - 2.5 * scale;
    var y0 = cy - 3.5 * scale;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#fff";
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 5; c++) {
        if (glyph[r].charAt(c) !== "1") continue;
        var px = (x0 + c * scale) * cell;
        var py = (y0 + r * scale) * cell;
        var w = scale * cell + 0.5;
        ctx.fillRect(px, py, w, w);
      }
    }
    // faint Gaussian-ish noise so it looks like the perturbed training data
    for (var i = 0; i < 400; i++) {
      var x = Math.floor(Math.random() * SIZE);
      var y = Math.floor(Math.random() * SIZE);
      var a = Math.random() * 0.05;
      ctx.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = "#fff";
    classify();
  }
  document.getElementById("demo").addEventListener("click", randomDemo);

  function downscale() {
    var img = ctx.getImageData(0, 0, SIZE, SIZE).data;
    var cells = new Float64Array(INPUT * INPUT);
    for (var y = 0; y < INPUT; y++) {
      for (var x = 0; x < INPUT; x++) {
        var sum = 0;
        for (var dy = 0; dy < CELL; dy++) {
          var row = (y * CELL + dy) * SIZE;
          for (var dx = 0; dx < CELL; dx++) {
            sum += img[(row + x * CELL + dx) * 4]; // red channel (white = 255)
          }
        }
        cells[y * INPUT + x] = sum / (CELL * CELL * 255);
      }
    }
    var max = 0;
    for (var i = 0; i < cells.length; i++) if (cells[i] > max) max = cells[i];
    if (max > 0) for (var i = 0; i < cells.length; i++) cells[i] /= max;
    return cells;
  }

  var bars = [];
  var labels = document.getElementById("bars").children;

  function classify() {
    if (!window.KESTREL) return;
    var x = downscale();
    var probs = window.KestrelNet.forward(window.KESTREL, x);
    var top = 0;
    for (var i = 1; i < probs.length; i++) if (probs[i] > probs[top]) top = i;
    var hasInk = false;
    for (var i = 0; i < x.length; i++) if (x[i] > 0) { hasInk = true; break; }

    for (var i = 0; i < bars.length; i++) {
      bars[i].style.width = (probs[i] * 100).toFixed(2) + "%";
      labels[i].classList.toggle("top", i === top && hasInk);
      labels[i].querySelector(".pct").textContent =
        hasInk ? (probs[i] * 100).toFixed(1) + "%" : "";
    }
    document.getElementById("guess").textContent =
      hasInk ? String(top) : "?";
    document.getElementById("guess-sub").textContent =
      hasInk ? "best guess" : "draw a digit";
  }

  // build bar rows from the template
  var rowTpl = document.getElementById("bar-row").content;
  var frag = document.createDocumentFragment();
  for (var i = 0; i < 10; i++) {
    var row = rowTpl.cloneNode(true);
    row.querySelector(".digit").textContent = String(i);
    bars.push(row.querySelector(".fill"));
    frag.appendChild(row);
  }
  document.getElementById("bars").appendChild(frag);

  // classify as you draw (throttled by rAF)
  var pending = false;
  function requestClassify() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      classify();
    });
  }
  canvas.addEventListener("pointerup", requestClassify);
  canvas.addEventListener("pointermove", function () {
    if (drawing) requestClassify();
  });

  classify();
})();