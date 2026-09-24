// gl.ts — thin WebGL1 helpers: context creation, shader compilation, program
// linking, buffers, and attribute/uniform binding. No external deps. Failures
// throw Error with a `webgl:` prefix so the app can degrade gracefully.

export interface Program {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  attributes: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

/** Create a WebGL1 context, falling back to the experimental variant. */
export const getContext = (canvas: HTMLCanvasElement): WebGLRenderingContext | null => {
  const attrs: WebGLContextAttributes = {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
  };
  const gl = (canvas.getContext("webgl", attrs) ||
    canvas.getContext("experimental-webgl", attrs)) as WebGLRenderingContext | null;
  return gl;
};

const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("webgl: failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown error";
    gl.deleteShader(shader);
    throw new Error(`webgl: shader compile failed: ${log}`);
  }
  return shader;
};

/** Compile and link a vertex/fragment pair; throws on failure with the GL log. */
export const createProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string): Program => {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  if (!program) throw new Error("webgl: failed to create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown error";
    gl.deleteProgram(program);
    throw new Error(`webgl: program link failed: ${log}`);
  }
  const attributes: Record<string, number> = {};
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const attribCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < attribCount; i++) {
    const info = gl.getActiveAttrib(program, i);
    if (info) attributes[info.name] = gl.getAttribLocation(program, info.name);
  }
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { gl, program, attributes, uniforms };
};

export const createArrayBuffer = (gl: WebGLRenderingContext, data: ArrayBufferView): WebGLBuffer => {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("webgl: failed to create array buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};

export const createIndexBuffer = (gl: WebGLRenderingContext, data: Uint16Array): WebGLBuffer => {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("webgl: failed to create index buffer");
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};

/** Bind an array buffer to a vertex-attrib location. */
export const bindAttrib = (
  gl: WebGLRenderingContext,
  location: number,
  buffer: WebGLBuffer,
  size: number,
  type: number,
  stride: number,
  offset: number,
): void => {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, type, false, stride, offset);
};

const uniformOf = (p: Program, name: string): WebGLUniformLocation | null => p.uniforms[name] ?? null;

export const setUniformMat4 = (p: Program, name: string, value: Float32Array): void => {
  const loc = uniformOf(p, name);
  if (loc) p.gl.uniformMatrix4fv(loc, false, value);
};

export const setUniformMat3 = (p: Program, name: string, value: Float32Array): void => {
  const loc = uniformOf(p, name);
  if (loc) p.gl.uniformMatrix3fv(loc, false, value);
};

export const setUniformVec3 = (p: Program, name: string, value: number[]): void => {
  const loc = uniformOf(p, name);
  if (loc) p.gl.uniform3f(loc, value[0], value[1], value[2]);
};

export const setUniform1f = (p: Program, name: string, value: number): void => {
  const loc = uniformOf(p, name);
  if (loc) p.gl.uniform1f(loc, value);
};

export const setUniform1i = (p: Program, name: string, value: number): void => {
  const loc = uniformOf(p, name);
  if (loc) p.gl.uniform1i(loc, value);
};

/** Upload a canvas/ImageData to a texture unit. */
export const uploadTexture = (gl: WebGLRenderingContext, texture: WebGLTexture, source: TexImageSource, unit: number): void => {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
};

/** Create a texture object (not yet populated). */
export const createEmptyTexture = (gl: WebGLRenderingContext): WebGLTexture => {
  const texture = gl.createTexture();
  if (!texture) throw new Error("webgl: failed to create texture");
  return texture;
};