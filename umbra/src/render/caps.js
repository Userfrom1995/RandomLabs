/**
 * Umbra browser capability probe (DOM-dependent; NOT imported by Node tests).
 * Tier 0: WebGPU via navigator.gpu.requestAdapter.
 * Tier 1: WebGL2 via a throwaway canvas context.
 * Tier 2: Canvas2D always available as the last resort.
 */

/**
 * @returns {Promise<0|1|2>} best tier this browser can offer
 */
export async function probeCapabilities() {
  try {
    const gpu = navigator.gpu;
    if (gpu) {
      const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (adapter) return 0;
    }
  } catch {
    // Fall through to WebGL2.
  }
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { antialias: false, depth: false, stencil: false });
    if (gl) {
      gl.getExtension('EXT_color_buffer_float');
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return 1;
    }
  } catch {
    // Fall through to Canvas2D.
  }
  return 2;
}
