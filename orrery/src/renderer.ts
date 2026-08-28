// renderer.ts — the WebGL renderer. Owns every GPU resource (programs,
// meshes, textures) and draws one frame given a camera, a projection, the
// simulated time, and a selected body. Also provides ray picking so a click
// can select and fly to a planet.

import {
  AU_SCALE,
  Body,
  BODIES,
  PLANETS_ONLY,
  SUN,
  TextureKind,
} from "./bodies.js";
import {
  Mat4,
  Vec3,
  mat4Identity,
  mat4Inverse,
  mat4Multiply,
  mat4Perspective,
  mat4RotationY,
  mat4RotationZ,
  mat4Scale,
  mat4Translation,
  mat4Trs,
  vec3,
  vec3Normalize,
  vec3Scale,
  vec3Sub,
  vec3Transform,
} from "./math.js";
import { orbitPath, orbitalPosition } from "./kepler.js";
import { FreeCamera } from "./camera.js";
import {
  Program,
  bindAttrib,
  createArrayBuffer,
  createIndexBuffer,
  createProgram,
  getContext,
  setUniform1f,
  setUniform1i,
  setUniformMat3,
  setUniformMat4,
  setUniformVec3,
} from "./gl.js";
import { LIT_SOURCE, SPRITE_SOURCE, UNLIT_SOURCE } from "./shaders.js";
import {
  VERTEX_STRIDE,
  InterleavedMesh,
  PositionMesh,
  pointGeometry,
  polylineGeometry,
  quadGeometry,
  ringGeometry,
  sphereGeometry,
  unitCircle,
  unitSpherePoints,
} from "./geometry.js";
import { makeBodyTexture, makeGlowTexture, makeRingTexture } from "./textures.js";

const NEAR = 0.1;
const FAR = 50000;
const STAR_DISTANCE = 20000;

const SPHERE_W = 48;
const SPHERE_H = 32;

const STAR_DIM_COUNT = 2000;
const STAR_BRIGHT_COUNT = 350;
const ORBIT_SEGMENTS = 220;
const RING_SEGMENTS = 96;
const CIRCLE_SEGMENTS = 96;

/** Planet spin rates, radians per real second (visual only). */
const SPIN_SPEED: Record<TextureKind, number> = {
  sun: 0.05, mercury: 0.012, venus: -0.004, earth: 0.23, mars: 0.22,
  jupiter: 0.36, saturn: 0.32, uranus: 0.21, neptune: 0.19,
};

/** Axial tilt in radians (visual approximation). */
const AXIAL_TILT: Record<TextureKind, number> = {
  sun: 0, mercury: 0.01, venus: 3.1, earth: 0.41, mars: 0.44,
  jupiter: 0.05, saturn: 0.47, uranus: 1.71, neptune: 0.49,
};

interface DrawOptions {
  selected: string | null;
  timeSec: number;
}

class Mesh {
  readonly vertexBuffer: WebGLBuffer;
  readonly indexBuffer: WebGLBuffer;
  readonly indexCount: number;

  constructor(gl: WebGLRenderingContext, mesh: InterleavedMesh) {
    this.vertexBuffer = createArrayBuffer(gl, mesh.vertices);
    this.indexBuffer = createIndexBuffer(gl, mesh.indices);
    this.indexCount = mesh.indices.length;
  }
}

class LineMesh {
  readonly vertexBuffer: WebGLBuffer;
  readonly vertexCount: number;

  constructor(gl: WebGLRenderingContext, mesh: PositionMesh) {
    this.vertexBuffer = createArrayBuffer(gl, mesh.vertices);
    this.vertexCount = mesh.vertices.length / 3;
  }
}

/** World-space position of a body at the simulated time. */
const bodyPosition = (body: Body, simDays: number): Vec3 => {
  if (body.elements.semiMajorAxisAU === 0) return vec3(0, 0, 0);
  const p = orbitalPosition(body.elements, simDays);
  return vec3(p.x * AU_SCALE, p.y * AU_SCALE, p.z * AU_SCALE);
};

export class Renderer {
  private readonly gl: WebGLRenderingContext;
  private readonly lit: Program;
  private readonly unlit: Program;
  private readonly sprite: Program;

  private readonly sphere: Mesh;
  private readonly ring: Mesh;
  private readonly quad: Mesh;
  private readonly selectionCircle: LineMesh;
  private readonly starDim: LineMesh;
  private readonly starBright: LineMesh;

  private readonly textures = new Map<TextureKind, WebGLTexture>();
  private readonly ringTexture: WebGLTexture;
  private readonly glowTexture: WebGLTexture;

  private readonly orbitMeshes = new Map<string, LineMesh>();

  private viewportWidth = 1;
  private viewportHeight = 1;

  constructor(canvas: HTMLCanvasElement) {
    const gl = getContext(canvas);
    if (!gl) throw new Error("webgl: WebGL is not supported in this browser");
    this.gl = gl;

    this.lit = createProgram(gl, LIT_SOURCE.vertex, LIT_SOURCE.fragment);
    this.unlit = createProgram(gl, UNLIT_SOURCE.vertex, UNLIT_SOURCE.fragment);
    this.sprite = createProgram(gl, SPRITE_SOURCE.vertex, SPRITE_SOURCE.fragment);

    this.sphere = new Mesh(gl, sphereGeometry(1, SPHERE_W, SPHERE_H));
    this.quad = new Mesh(gl, quadGeometry());
    this.selectionCircle = new LineMesh(gl, polylineGeometry(unitCircle(CIRCLE_SEGMENTS)));
    this.ring = new Mesh(gl, this.buildRingMesh());

    const starRng = seededRandom(1337);
    this.starDim = new LineMesh(gl, pointGeometry(unitSpherePoints(STAR_DIM_COUNT, starRng)));
    this.starBright = new LineMesh(gl, pointGeometry(unitSpherePoints(STAR_BRIGHT_COUNT, starRng)));

    for (const body of [SUN, ...PLANETS_ONLY]) {
      this.textures.set(body.visual.kind, makeBodyTexture(gl, body.visual.kind));
    }
    this.ringTexture = makeRingTexture(gl);
    this.glowTexture = makeGlowTexture(gl);

    for (const body of PLANETS_ONLY) {
      const pts = orbitPath(body.elements, ORBIT_SEGMENTS).map((p) => vec3(p.x * AU_SCALE, p.y * AU_SCALE, p.z * AU_SCALE));
      this.orbitMeshes.set(body.id, new LineMesh(gl, polylineGeometry(pts)));
    }

    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
  }

  private buildRingMesh(): InterleavedMesh {
    const saturn = PLANETS_ONLY.find((b) => b.visual.rings);
    const spec = saturn?.visual.rings;
    if (!spec) return ringGeometry(0.5, 1, RING_SEGMENTS);
    return ringGeometry(spec.innerRatio / spec.outerRatio, 1, RING_SEGMENTS);
  }

  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.gl.viewport(0, 0, width, height);
  }

  projection(): Mat4 {
    const aspect = this.viewportWidth / Math.max(1, this.viewportHeight);
    return mat4Perspective(0.9, aspect, NEAR, FAR);
  }

  draw(camera: FreeCamera, simDays: number, options: DrawOptions): void {
    const gl = this.gl;
    const projection = this.projection();

    gl.clearColor(0.015, 0.02, 0.045, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.drawStars(camera, projection);
    this.drawOrbits(camera, projection, options.selected);
    this.drawBodies(camera, projection, simDays, options.timeSec);
    this.drawRings(camera, projection, simDays);
    this.drawSunGlow(camera, projection);
    this.drawSelection(camera, projection, simDays, options.selected);
  }

  private drawStars(camera: FreeCamera, projection: Mat4): void {
    const gl = this.gl;
    const program = this.unlit;
    gl.useProgram(program.program);
    gl.disable(gl.DEPTH_TEST);
    setUniformMat4(program, "uView", camera.viewRotationMatrix());
    setUniformMat4(program, "uProjection", projection);
    setUniformMat4(program, "uModel", mat4Scale(vec3(STAR_DISTANCE, STAR_DISTANCE, STAR_DISTANCE)));
    setUniformVec3(program, "uColor", [0.55, 0.62, 0.8]);
    setUniform1f(program, "uAlpha", 1);
    setUniform1f(program, "uPointSize", 1.6);
    this.drawPoints(program, this.starDim);
    setUniformVec3(program, "uColor", [0.85, 0.9, 1]);
    setUniform1f(program, "uPointSize", 3);
    this.drawPoints(program, this.starBright);
    gl.enable(gl.DEPTH_TEST);
  }

  private drawOrbits(camera: FreeCamera, projection: Mat4, selected: string | null): void {
    const gl = this.gl;
    const program = this.unlit;
    gl.useProgram(program.program);
    setUniformMat4(program, "uView", camera.viewMatrix());
    setUniformMat4(program, "uProjection", projection);
    setUniformMat4(program, "uModel", mat4Identity());
    setUniform1f(program, "uPointSize", 1);
    for (const body of PLANETS_ONLY) {
      const mesh = this.orbitMeshes.get(body.id);
      if (!mesh) continue;
      if (body.id === selected) {
        setUniformVec3(program, "uColor", [0.55, 0.95, 0.8]);
        setUniform1f(program, "uAlpha", 0.95);
      } else {
        setUniformVec3(program, "uColor", [0.32, 0.4, 0.6]);
        setUniform1f(program, "uAlpha", 0.5);
      }
      this.drawLines(program, mesh);
    }
  }

  private drawBodies(camera: FreeCamera, projection: Mat4, simDays: number, timeSec: number): void {
    const gl = this.gl;
    const program = this.lit;
    gl.useProgram(program.program);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    setUniformMat4(program, "uView", camera.viewMatrix());
    setUniformMat4(program, "uProjection", projection);
    setUniformVec3(program, "uCameraPos", [camera.eye.x, camera.eye.y, camera.eye.z]);

    for (const body of BODIES) {
      const texture = this.textures.get(body.visual.kind);
      if (!texture) continue;
      const pos = bodyPosition(body, simDays);
      const model = this.bodyModel(body, pos, timeSec);
      setUniformMat4(program, "uModel", model);
      setUniformMat3(program, "uNormalMatrix", normalMatrix(model));
      setUniformVec3(program, "uBaseColor", body.visual.baseColor);
      setUniformVec3(program, "uLightDir", [-pos.x, -pos.y, -pos.z]);
      setUniform1f(program, "uAlbedo", body.visual.albedo);
      setUniform1f(program, "uSpecular", body.visual.specular);
      setUniform1f(program, "uShininess", body.visual.shininess);
      setUniform1f(program, "uEmissive", body.id === "sun" ? 1 : 0);
      setUniform1f(program, "uAlpha", 1);
      setUniform1i(program, "uTexture", 0);
      bindTextureUnit(gl, texture, 0);
      this.drawMesh(program, this.sphere);
    }
  }

  private drawRings(camera: FreeCamera, projection: Mat4, simDays: number): void {
    const gl = this.gl;
    const program = this.lit;
    gl.useProgram(program.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    setUniformMat4(program, "uView", camera.viewMatrix());
    setUniformMat4(program, "uProjection", projection);
    setUniformVec3(program, "uCameraPos", [camera.eye.x, camera.eye.y, camera.eye.z]);
    setUniformVec3(program, "uBaseColor", [1, 1, 1]);
    setUniform1f(program, "uAlbedo", 0.5);
    setUniform1f(program, "uSpecular", 0);
    setUniform1f(program, "uShininess", 1);
    setUniform1f(program, "uEmissive", 0);
    setUniform1f(program, "uAlpha", 1);
    setUniform1i(program, "uTexture", 0);
    bindTextureUnit(gl, this.ringTexture, 0);

    for (const body of PLANETS_ONLY) {
      const spec = body.visual.rings;
      if (!spec) continue;
      const pos = bodyPosition(body, simDays);
      const tilt = mat4RotationZ(AXIAL_TILT[body.visual.kind]);
      const scale = mat4Scale(vec3(body.visual.radius * spec.outerRatio, body.visual.radius * spec.outerRatio, 1));
      const model = mat4Multiply(mat4Multiply(mat4Translation(pos), tilt), scale);
      setUniformMat4(program, "uModel", model);
      setUniformMat3(program, "uNormalMatrix", normalMatrix(model));
      setUniformVec3(program, "uLightDir", [-pos.x, -pos.y, -pos.z]);
      this.drawMesh(program, this.ring);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  private drawSunGlow(camera: FreeCamera, projection: Mat4): void {
    const gl = this.gl;
    const program = this.sprite;
    gl.useProgram(program.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    setUniformMat4(program, "uView", camera.viewMatrix());
    setUniformMat4(program, "uProjection", projection);
    setUniform1i(program, "uTexture", 0);
    bindTextureUnit(gl, this.glowTexture, 0);

    const size = SUN.visual.radius;
    const billboard = cameraBillboardMatrix(camera);
    for (const [scaleFactor, alpha, color] of [[2.8, 0.9, [1.0, 0.75, 0.3]], [5.4, 0.5, [1.0, 0.55, 0.18]], [9.5, 0.25, [1.0, 0.4, 0.1]]] as [number, number, number[]][]) {
      const model = mat4Multiply(billboard, mat4Scale(vec3(size * scaleFactor, size * scaleFactor, 1)));
      setUniformMat4(program, "uModel", model);
      setUniformVec3(program, "uColor", color);
      setUniform1f(program, "uAlpha", alpha);
      this.drawMesh(program, this.quad);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  private drawSelection(camera: FreeCamera, projection: Mat4, simDays: number, selected: string | null): void {
    if (!selected) return;
    const body = BODIES.find((b) => b.id === selected);
    if (!body) return;
    const pos = bodyPosition(body, simDays);
    const gl = this.gl;
    const program = this.unlit;
    gl.useProgram(program.program);
    gl.disable(gl.DEPTH_TEST);
    setUniformMat4(program, "uView", camera.viewMatrix());
    setUniformMat4(program, "uProjection", projection);
    const radius = Math.max(body.visual.radius * 1.8, body.visual.radius + 1);
    setUniformMat4(program, "uModel", mat4Trs(pos, mat4Identity(), vec3(radius, radius, radius)));
    setUniformVec3(program, "uColor", [0.4, 0.95, 0.75]);
    setUniform1f(program, "uAlpha", 0.85);
    setUniform1f(program, "uPointSize", 1);
    this.drawLines(program, this.selectionCircle);
    gl.enable(gl.DEPTH_TEST);
  }

  private bodyModel(body: Body, pos: Vec3, timeSec: number): Mat4 {
    const tilt = mat4RotationZ(AXIAL_TILT[body.visual.kind]);
    const spin = mat4RotationY(timeSec * SPIN_SPEED[body.visual.kind]);
    return mat4Trs(pos, mat4Multiply(tilt, spin), vec3(body.visual.radius, body.visual.radius, body.visual.radius));
  }

  private drawMesh(program: Program, mesh: Mesh): void {
    const gl = this.gl;
    bindAttrib(gl, program.attributes.aPosition, mesh.vertexBuffer, 3, gl.FLOAT, VERTEX_STRIDE, 0);
    if (program.attributes.aNormal !== undefined) {
      bindAttrib(gl, program.attributes.aNormal, mesh.vertexBuffer, 3, gl.FLOAT, VERTEX_STRIDE, 12);
    }
    if (program.attributes.aTexCoord !== undefined) {
      bindAttrib(gl, program.attributes.aTexCoord, mesh.vertexBuffer, 2, gl.FLOAT, VERTEX_STRIDE, 24);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  private drawLines(program: Program, mesh: LineMesh): void {
    const gl = this.gl;
    bindAttrib(gl, program.attributes.aPosition, mesh.vertexBuffer, 3, gl.FLOAT, 12, 0);
    gl.drawArrays(gl.LINE_LOOP, 0, mesh.vertexCount);
  }

  private drawPoints(program: Program, mesh: LineMesh): void {
    const gl = this.gl;
    bindAttrib(gl, program.attributes.aPosition, mesh.vertexBuffer, 3, gl.FLOAT, 12, 0);
    gl.drawArrays(gl.POINTS, 0, mesh.vertexCount);
  }

  /**
   * Ray-cast a normalized-device-coordinate click (x, y ∈ [-1, 1]) against
   * every planet sphere; returns the closest hit body id or null.
   */
  pick(camera: FreeCamera, simDays: number, ndcX: number, ndcY: number): string | null {
    const projection = this.projection();
    const view = camera.viewMatrix();
    const viewProj = mat4Multiply(projection, view);
    const inv = mat4Inverse(viewProj);
    const near = vec3Transform(inv, vec3(ndcX, ndcY, -1));
    const far = vec3Transform(inv, vec3(ndcX, ndcY, 1));
    const dir = vec3Normalize(vec3Sub(far, near));
    const origin = camera.eye;

    let bestT = Infinity;
    let bestId: string | null = null;
    for (const body of PLANETS_ONLY) {
      const center = bodyPosition(body, simDays);
      const oc = vec3Sub(origin, center);
      const b = oc.x * dir.x + oc.y * dir.y + oc.z * dir.z;
      const c = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - body.visual.radius * body.visual.radius;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < bestT) {
        bestT = t;
        bestId = body.id;
      }
    }
    return bestId;
  }
}

/** Normal matrix: inverse-transpose of the model's upper-left 3×3. */
const normalMatrix = (model: Mat4): Float32Array => {
  const inv = mat4Inverse(model);
  return new Float32Array([
    inv[0], inv[4], inv[8],
    inv[1], inv[5], inv[9],
    inv[2], inv[6], inv[10],
  ]);
};

const bindTextureUnit = (gl: WebGLRenderingContext, texture: WebGLTexture, unit: number): void => {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
};

/** Deterministic PRNG for the starfield (so it looks the same every load). */
const seededRandom = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const cameraBillboardMatrix = (camera: FreeCamera): Mat4 => {
  const right = camera.right();
  const up = camera.up();
  const back = vec3Scale(camera.forward(), -1);
  return new Float32Array([
    right.x, up.x, back.x, 0,
    right.y, up.y, back.y, 0,
    right.z, up.z, back.z, 0,
    0, 0, 0, 1,
  ]);
};