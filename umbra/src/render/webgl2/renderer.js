/**
 * Umbra WebGL2 tier-1 renderer: GLSL ports of the four passes over one
 * shared SceneDesc. Throws on any failure so the app falls back to Canvas2D.
 */

import { flattenSegments } from '../scene.js';
import { UMBRA_VS, UMBRA_BG_FS, UMBRA_SIL_FS, UMBRA_RIM_FS, UMBRA_PART_FS } from './shaders.js';

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`umbra: WebGL2 compile failed: ${log}`);
  }
  return sh;
}

function program(gl, fsSrc) {
  const pr = gl.createProgram();
  gl.attachShader(pr, compile(gl, gl.VERTEX_SHADER, UMBRA_VS));
  gl.attachShader(pr, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
    throw new Error(`umbra: WebGL2 link failed: ${gl.getProgramInfoLog(pr)}`);
  }
  return pr;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{tier:1, name:string, render:(scene:any, arena:any, opts?:any)=>void, dispose:()=>void}}
 */
export function createWebGL2Renderer(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    depth: false,
    stencil: false,
    alpha: false,
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('umbra: WebGL2 unavailable');

  const bgPr = program(gl, UMBRA_BG_FS);
  const silPr = program(gl, UMBRA_SIL_FS);
  const rimPr = program(gl, UMBRA_RIM_FS);
  const partPr = program(gl, UMBRA_PART_FS);

  const loc = (pr, name) => gl.getUniformLocation(pr, name);

  function setSegUniforms(pr, segs, aspect) {
    const segLoc = loc(pr, 'uSeg[0]');
    const wLoc = loc(pr, 'uW[0]');
    const segArr = new Float32Array(22 * 4);
    const wArr = new Float32Array(22 * 4);
    for (let i = 0; i < 22; i++) {
      const s = segs[i];
      segArr.set([s.ax, s.ay, s.bx, s.by], i * 4);
      wArr.set([s.w / aspect, 0, 0, 0], i * 4);
    }
    gl.uniform4fv(segLoc, segArr);
    gl.uniform4fv(wLoc, wArr);
  }

  function render(scene, arena, opts = {}) {
    const w = canvas.width || 960;
    const h = canvas.height || 540;
    const aspect = w / h;
    const reduced = !!opts.reducedMotion;
    const t = reduced ? 0 : scene.time;
    gl.viewport(0, 0, w, h);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    // Pass 0: background (opaque).
    gl.useProgram(bgPr);
    gl.uniform2f(loc(bgPr, 'uRes'), w, h);
    gl.uniform3fv(loc(bgPr, 'uTop'), arena.skyTop);
    gl.uniform3fv(loc(bgPr, 'uBottom'), arena.skyBottom);
    gl.uniform3fv(loc(bgPr, 'uGlow'), arena.glow);
    gl.uniform3fv(loc(bgPr, 'uGround'), arena.ground);
    gl.uniform4f(
      loc(bgPr, 'uParams'),
      t,
      arena.glowPos[0],
      arena.glowPos[1],
      reduced ? 0 : scene.layers[2],
    );
    gl.uniform4f(loc(bgPr, 'uRidge'), arena.ridge[0], arena.ridge[1], 0.24, 1.7);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const segs = flattenSegments(scene);

    // Pass 1: silhouettes (alpha blend).
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(silPr);
    gl.uniform2f(loc(silPr, 'uRes'), w, h);
    setSegUniforms(silPr, segs, aspect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 2: rim light (additive).
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(rimPr);
    gl.uniform2f(loc(rimPr, 'uRes'), w, h);
    setSegUniforms(rimPr, segs, aspect);
    gl.uniform4f(loc(rimPr, 'uLight'), arena.keyLight[0], arena.keyLight[1], 0.012, reduced ? 0.7 : 1.0);
    gl.uniform4f(loc(rimPr, 'uAccent'), arena.accent[0], arena.accent[1], arena.accent[2], 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 3: particles (additive; skipped under battery saver).
    if (!opts.batterySaver) {
      gl.useProgram(partPr);
      gl.uniform2f(loc(partPr, 'uRes'), w, h);
      const n = Math.min(64, scene.particles.length);
      const arr = new Float32Array(64 * 4);
      for (let i = 0; i < n; i++) {
        const p = scene.particles[i];
        arr.set([p.x, p.y, p.s, p.b * (reduced ? 0.4 : 1)], i * 4);
      }
      gl.uniform4fv(loc(partPr, 'uPts[0]'), arr);
      gl.uniform1f(loc(partPr, 'uCount'), n);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
  }

  function dispose() {
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }

  return { tier: 1, name: 'WebGL2', render, dispose };
}
