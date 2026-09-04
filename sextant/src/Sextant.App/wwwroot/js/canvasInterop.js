// Sextant canvas interop: the ONLY JS file with draw calls.
// No style logic, no math, no state. C# owns scene graph + style cascade;
// JS owns CanvasRenderingContext2D calls fed by Float32Array batches.
window.sextantCanvas = (() => {
  let canvas = null;
  let ctx = null;

  function ensure(id) {
    if (ctx) return true;
    canvas = document.getElementById(id);
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    return !!ctx;
  }

  function isPenUp(x, y) {
    return Number.isNaN(x) || Number.isNaN(y);
  }

  function strokePath(vertices) {
    ctx.beginPath();
    let penDown = false;
    for (let i = 0; i + 1 < vertices.length; i += 2) {
      const x = vertices[i], y = vertices[i + 1];
      if (isPenUp(x, y)) { penDown = false; continue; }
      if (!penDown) { ctx.moveTo(x, y); penDown = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function fillPath(vertices) {
    ctx.beginPath();
    let penDown = false;
    for (let i = 0; i + 1 < vertices.length; i += 2) {
      const x = vertices[i], y = vertices[i + 1];
      if (isPenUp(x, y)) {
        if (penDown) ctx.closePath();
        penDown = false;
        continue;
      }
      if (!penDown) { ctx.moveTo(x, y); penDown = true; }
      else ctx.lineTo(x, y);
    }
    if (penDown) ctx.closePath();
    ctx.fill();
  }

  return {
    clear(id) {
      if (!ensure(id)) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    resize(id, w, h, dpr) {
      if (!ensure(id)) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    drawBatches(id, batches) {
      if (!ensure(id)) return;
      for (const b of batches) {
        const v = b.vertices;
        if (!v || v.length < 4) continue;
        ctx.lineWidth = b.lineWidth || 1;
        if (b.kind === "fill") {
          ctx.fillStyle = b.fill || "#888";
          fillPath(v);
        } else {
          ctx.strokeStyle = b.stroke || "#fff";
          strokePath(v);
        }
      }
    },
    drawOverlays(id, overlays) {
      if (!ensure(id) || !overlays) return;
      if (overlays.routeLine && overlays.routeLine.length >= 4) {
        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 3;
        strokePath(overlays.routeLine);
      }
      if (overlays.frontierDots && overlays.frontierDots.length >= 2) {
        ctx.fillStyle = "rgba(37, 99, 235, 0.6)";
        const d = overlays.frontierDots;
        for (let i = 0; i + 1 < d.length; i += 2) {
          ctx.fillRect(d[i] - 1, d[i + 1] - 1, 2, 2);
        }
      }
      if (overlays.isochroneFill && overlays.isochroneFill.length >= 6) {
        ctx.fillStyle = "rgba(22, 163, 74, 0.25)";
        fillPath(overlays.isochroneFill);
      }
    }
  };
})();
