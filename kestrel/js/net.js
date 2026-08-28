/* KestrelNet - a dependency-free JavaScript mirror of Kestrel's forward pass.
 *
 * Mirrors exactly the math in Kestrel's Julia core (matmul, bias add, relu,
 * stable softmax) so a model exported from Julia classifies identically in the
 * browser. The weight layout matches `export_weights`: `w` is an
 * output-major matrix (row i = weights into output i), `b` a column vector.
 */
(function (global) {
  "use strict";

  function matvec(w, v) {
    // w: (out x in), v: length `in` -> length `out`
    var out = new Array(w.length);
    for (var i = 0; i < w.length; i++) {
      var row = w[i];
      var s = 0;
      for (var j = 0; j < row.length; j++) s += row[j] * v[j];
      out[i] = s;
    }
    return out;
  }

  function addBias(z, b) {
    for (var i = 0; i < z.length; i++) z[i] += b[i][0];
    return z;
  }

  function relu(z) {
    for (var i = 0; i < z.length; i++) z[i] = z[i] > 0 ? z[i] : 0;
    return z;
  }

  function softmax(z) {
    var m = z[0];
    for (var i = 1; i < z.length; i++) if (z[i] > m) m = z[i];
    var e = new Array(z.length);
    var s = 0;
    for (var i = 0; i < z.length; i++) {
      e[i] = Math.exp(z[i] - m);
      s += e[i];
    }
    for (var i = 0; i < z.length; i++) e[i] /= s;
    return e;
  }

  function forward(model, x) {
    var v = x;
    for (var i = 0; i < model.arch.length; i++) {
      var layer = model.weights[i];
      var act = model.arch[i].activation;
      v = addBias(matvec(layer.w, v), layer.b);
      if (act === "relu") v = relu(v);
      // "identity" (and anything else) leaves the activations untouched.
    }
    return softmax(v);
  }

  global.KestrelNet = { forward: forward };
})(typeof window !== "undefined" ? window : globalThis);