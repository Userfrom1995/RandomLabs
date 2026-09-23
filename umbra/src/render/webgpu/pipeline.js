/**
 * Umbra WebGPU tier-0 renderer: four passes (background, silhouette,
 * rim-light, particles) over one shared SceneDesc. Throws on any failure
 * so the app can fall back to WebGL2/Canvas2D.
 */

import { flattenSegments } from '../scene.js';

const FULLSCREEN_VS = /* wgsl */ `
@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}
`;

/**
 * Extract the fragment entry from a pass file that also declares its own
 * fullscreen vertex stage. Each pass file stays self-contained; the
 * fragment module is built as shared-VS + fragment-only source.
 */
function fragmentOnly(source) {
  const idx = source.indexOf('@fragment');
  if (idx < 0) throw new Error('umbra: shader has no @fragment entry');
  return source.slice(idx);
}

async function fetchText(name) {
  const url = new URL(`./${name}`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`umbra: missing shader ${name}`);
  return res.text();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{tier:0, name:string, render:(scene:any, arena:any, opts?:any)=>void, dispose:()=>void}>}
 */
export async function createWebGPURenderer(canvas) {
  const gpu = navigator.gpu;
  if (!gpu) throw new Error('umbra: WebGPU unavailable');
  const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('umbra: no WebGPU adapter');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('umbra: webgpu canvas context unavailable');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  const [bgSrc, silSrc, rimSrc, partSrc] = await Promise.all([
    fetchText('background.wgsl'),
    fetchText('silhouette.wgsl'),
    fetchText('rimlight.wgsl'),
    fetchText('particles.wgsl'),
  ]);

  const vsModule = device.createShaderModule({ code: FULLSCREEN_VS });
  const pass = (fragSrc, blend) =>
    device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: vsModule, entryPoint: 'vs' },
      fragment: {
        module: device.createShaderModule({ code: FULLSCREEN_VS + '\n' + fragmentOnly(fragSrc) }),
        entryPoint: 'fs',
        targets: [{ format, blend }],
      },
      primitive: { topology: 'triangle-list' },
    });

  const bgPipe = pass(bgSrc, undefined);
  const alphaBlend = {
    color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  };
  const additive = {
    color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  };
  const silPipe = pass(silSrc, alphaBlend);
  const rimPipe = pass(rimSrc, additive);
  const partPipe = pass(partSrc, additive);

  // Uniform buffers: res(16) + payload.
  const bgBuf = device.createBuffer({ size: 16 + 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const segBuf = device.createBuffer({ size: 16 + 704, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const rimBuf = device.createBuffer({ size: 16 + 704 + 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const partBuf = device.createBuffer({
    size: 16 + 1024 + 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bgBind = device.createBindGroup({
    layout: bgPipe.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: bgBuf } }],
  });
  const silBind = device.createBindGroup({
    layout: silPipe.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: segBuf } }],
  });
  const rimBind = device.createBindGroup({
    layout: rimPipe.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: rimBuf } }],
  });
  const partBind = device.createBindGroup({
    layout: partPipe.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: partBuf } }],
  });

  const scratch = new ArrayBuffer(16 + 1024 + 16);
  const f32 = new Float32Array(scratch);

  function render(scene, arena, opts = {}) {
    const w = canvas.width || 960;
    const h = canvas.height || 540;
    const aspect = w / h;
    const reduced = !!opts.reducedMotion;
    const t = reduced ? 0 : scene.time;

    // Background uniforms.
    const bg = new Float32Array(24);
    bg.set([w, h, aspect, 0], 0);
    bg.set(arena.skyTop, 4);
    bg.set(arena.skyBottom, 8);
    bg.set(arena.glow, 12);
    bg.set(arena.ground, 16);
    bg.set([t, arena.glowPos[0], arena.glowPos[1], reduced ? 0 : scene.layers[2]], 20);
    device.queue.writeBuffer(bgBuf, 0, bg);

    // Segment uniforms (shared layout for silhouette + rim).
    const segs = flattenSegments(scene);
    const seg = new Float32Array(16 / 4 + 22 * 4 + 22 * 4);
    seg.set([w, h, aspect, 0], 0);
    for (let i = 0; i < 22; i++) {
      const s = segs[i];
      // Arena x in [-1,1] maps to frame UV via (x*0.5+0.5); y already 0..1.
      seg.set([s.ax * 0.5 + 0.5, s.ay, s.bx * 0.5 + 0.5, s.by], 4 + i * 4);
      seg.set([s.w / aspect, 0, 0, 0], 4 + 88 + i * 4);
    }
    device.queue.writeBuffer(segBuf, 0, seg);

    const rim = new Float32Array(seg.length + 8);
    rim.set(seg, 0);
    rim.set([...arena.keyLight, 0.012, reduced ? 0.7 : 1.0], seg.length);
    rim.set([...arena.accent, 0], seg.length + 4);
    device.queue.writeBuffer(rimBuf, 0, rim);

    // Particles (skipped under battery saver, dimmed under reduced motion).
    // M4 weapon trails ride the spare particle slots after the ambient
    // motes (arena x mapped to 0..1 UV like the silhouette pass). M5
    // hit sparks take priority over trails (transient combat feedback).
    f32.fill(0);
    f32[0] = w;
    f32[1] = h;
    f32[2] = aspect;
    let n = 0;
    if (!opts.batterySaver) {
      const ambient = Math.min(48, scene.particles.length);
      for (let i = 0; i < ambient && n < 64; i++, n++) {
        const p = scene.particles[i];
        f32[4 + n * 4] = p.x;
        f32[5 + n * 4] = p.y;
        f32[6 + n * 4] = p.s;
        f32[7 + n * 4] = p.b * (reduced ? 0.4 : 1);
      }
      const sparks = Array.isArray(opts.sparks) ? opts.sparks : [];
      for (const p of sparks) {
        if (n >= 64 || !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.a)) continue;
        const alpha = Math.max(0, Math.min(1, p.a)) * (reduced ? 0.5 : 1);
        f32[4 + n * 4] = p.x * 0.5 + 0.5;
        f32[5 + n * 4] = p.y;
        f32[6 + n * 4] = 0.016;
        f32[7 + n * 4] = alpha;
        n += 1;
      }
      for (const sideTrails of scene.weapons || []) {
        for (const tr of sideTrails || []) {
          if (!tr || !Array.isArray(tr.points)) continue;
          for (const pt of tr.points) {
            if (n >= 64) break;
            f32[4 + n * 4] = pt.x * 0.5 + 0.5;
            f32[5 + n * 4] = pt.y;
            f32[6 + n * 4] = 0.012;
            f32[7 + n * 4] = reduced ? 0.4 : 0.9;
            n += 1;
          }
        }
      }
    }
    f32[4 + 256] = n;
    device.queue.writeBuffer(partBuf, 0, f32);

    const enc = device.createCommandEncoder();
    const view = context.getCurrentTexture().createView();
    const run = (pipe, bind, loadOp) => {
      const rp = enc.beginRenderPass({
        colorAttachments: [{ view, loadOp, storeOp: 'store' }],
      });
      rp.setPipeline(pipe);
      rp.setBindGroup(0, bind);
      rp.draw(3);
      rp.end();
    };
    run(bgPipe, bgBind, 'clear');
    run(silPipe, silBind, 'load');
    run(rimPipe, rimBind, 'load');
    run(partPipe, partBind, 'load');
    device.queue.submit([enc.finish()]);
  }

  function dispose() {
    device.destroy();
  }

  return { tier: 0, name: 'WebGPU', render, dispose };
}
