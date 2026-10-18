// Zero-copy framebuffer view contract (spec 4.5).
// Wasm path: Uint8Array view over memory.buffer, rebound on memory.grow,
// never sliced. JS-core path: plain Uint8Array of the same shape.
export function createFrameBuffer(width, height) {
  return { width, height, data: new Uint8Array(width * height) };
}

export function viewOverMemory(memory, ptr, width, height) {
  const size = width * height;
  if (ptr < 0 || ptr + size > memory.buffer.byteLength) {
    throw new RangeError(`framebuffer [${ptr}, ${ptr + size}) outside memory (${memory.buffer.byteLength})`);
  }
  return new Uint8Array(memory.buffer, ptr, size);
}

// Rebind helper: call after any Wasm call that may grow memory.
export function rebindView(getter) {
  return getter();
}
