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

  function strokePath(vertices) {
    ctx.beginPath();
    for (let i = 0; i + 1 < vertices.length; i += 2) {
      if (i === 0) ctx.moveTo(vertices[i], vertices[i + 1]);
      else ctx.lineTo(vertices[i], vertices[i + 1]);
    }
    ctx.stroke();
  }

  function fillPath(vertices) {
    ctx.beginPath();
    for (let i = 0; i + 1 < vertices.length; i += 2) {
      if (i === 0) ctx.moveTo(vertices[i], vertices[i + 1]);
      else ctx.lineTo(vertices[i], vertices[i + 1]);
    }
    ctx.closePath();
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
