// WebGL fullscreen quad presenter (M2, Tier 0/1).
// Same present(fb)/setPalette shape as the Canvas2D presenter: the app swaps
// presenters without changing the loop. R8 paletted path (WebGL2) does the
// palette lookup plus damage flash plus gamma in one shader pass over a
// single NEAREST quad; the RGBA path (WebGL1) samples a CPU-expanded texture.
// Any GL failure throws GlUnavailable so the caller falls down the tier
// ladder instead of showing a black canvas.
import { chooseUploadFormat, expandToRGBA, UNPACK_ALIGNMENT } from './upload.js';
import { createPaletteManager } from './palette.js';

export class GlUnavailable extends Error {
  constructor(reason) {
    super(`WebGL presenter unavailable: ${reason}`);
    this.code = 'E_GL';
  }
}

export const VERT_SRC = `
attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() { vUV = aUV; gl_Position = vec4(aPos, 0.0, 1.0); }
`.trim();

// Paletted fragment shader: R channel carries the 8-bit index (R8 texture
// sampled normalized), palette is a 256x1 RGB texture. Damage flash mixes
// toward red; gamma applies a power curve; pillarbox is handled by canvas CSS.
export const FRAG_PAL_SRC = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uFrame;
uniform sampler2D uPalette;
uniform float uFlash;
uniform float uGamma;
void main() {
  float index = texture2D(uFrame, vUV).r * 255.0;
  vec3 color = texture2D(uPalette, vec2((index + 0.5) / 256.0, 0.5)).rgb;
  color = mix(color, vec3(1.0, 0.0, 0.0), uFlash);
  color = pow(color, vec3(uGamma));
  gl_FragColor = vec4(color, 1.0);
}
`.trim();

export const FRAG_RGBA_SRC = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uFrame;
uniform float uFlash;
uniform float uGamma;
void main() {
  vec3 color = texture2D(uFrame, vUV).rgb;
  color = mix(color, vec3(1.0, 0.0, 0.0), uFlash);
  color = pow(color, vec3(uGamma));
  gl_FragColor = vec4(color, 1.0);
}
`.trim();

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new GlUnavailable('shader compile failed');
  }
  return sh;
}

function createProgram(gl, fragSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT_SRC));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new GlUnavailable('program link failed');
  }
  return prog;
}

// format: 'r8' | 'rgba' (see upload.chooseUploadFormat). Throws GlUnavailable
// when the canvas cannot provide a context, keeping the tier ladder intact.
export function createGLPresenter(view, opts = {}) {
  if (!view || typeof view.getContext !== 'function') {
    throw new GlUnavailable('no canvas');
  }
  const requested = opts.format || chooseUploadFormat({ webgl2: true });
  let gl = null;
  let format = requested;
  if (format === 'r8') {
    gl = view.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) {
      gl = view.getContext('webgl', { antialias: false, alpha: false });
      format = gl ? 'rgba' : format;
    }
  } else {
    gl = view.getContext('webgl', { antialias: false, alpha: false });
  }
  if (!gl) throw new GlUnavailable('context creation failed');

  const program = createProgram(gl, format === 'r8' ? FRAG_PAL_SRC : FRAG_RGBA_SRC);
  gl.useProgram(program);
  const palManager = createPaletteManager(opts.palette);

  const quad = new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0]);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  const aUV = gl.getAttribLocation(program, 'aUV');
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8);

  const frameTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, frameTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let palTex = null;
  if (format === 'r8') {
    palTex = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, UNPACK_ALIGNMENT);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, palTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(gl.getUniformLocation(program, 'uPalette'), 1);
    gl.activeTexture(gl.TEXTURE0);
  }
  gl.uniform1i(gl.getUniformLocation(program, 'uFrame'), 0);
  const uFlash = gl.getUniformLocation(program, 'uFlash');
  const uGamma = gl.getUniformLocation(program, 'uGamma');

  let flash = 0;
  let gamma = 1.0;

  function uploadPalette() {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, palTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, UNPACK_ALIGNMENT);
    const p = palManager.palette;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 256, 1, 0, gl.RGB, gl.UNSIGNED_BYTE,
      new Uint8Array(p.buffer, p.byteOffset, 768));
    gl.activeTexture(gl.TEXTURE0);
    palManager.markUploaded();
  }

  return {
    kind: format === 'r8' ? 'webgl2-paletted' : 'webgl-rgba',
    format,
    setPalette(p) { palManager.setPalette(p); },
    setFlash(v) { flash = Math.max(0, Math.min(1, Number(v) || 0)); },
    setGamma(v) { if (Number.isFinite(v)) gamma = Math.max(0.4, Math.min(2.5, v)); },
    present(fb) {
      const w = fb.width, h = fb.height;
      gl.viewport(0, 0, view.width, view.height);
      gl.bindTexture(gl.TEXTURE_2D, frameTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, UNPACK_ALIGNMENT);
      if (format === 'r8') {
        if (palManager.needsUpload()) uploadPalette();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, fb.data);
      } else {
        const rgba = expandToRGBA(fb.data, palManager.palette);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      }
      gl.uniform1f(uFlash, flash);
      gl.uniform1f(uGamma, gamma);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      try {
        gl.deleteTexture(frameTex);
        if (palTex) gl.deleteTexture(palTex);
        gl.deleteBuffer(vbo);
        gl.deleteProgram(program);
      } catch { /* dispose is best-effort */ }
    },
  };
}
