"use strict";
(() => {
  // src/bodies.ts
  var AU_SCALE = 100;
  var DAYS_PER_SECOND = 365.25 / 60;
  var EPOCH_MS = Date.UTC(2e3, 0, 1, 12, 0, 0);
  var TIME_WARP_STEPS = [0.05, 0.25, 1, 4, 16, 64, 256, 1024, 4096];
  var el = (a, periodDays, e, i, node, peri, L0) => ({
    semiMajorAxisAU: a,
    periodDays,
    eccentricity: e,
    inclinationDeg: i,
    nodeLongitudeDeg: node,
    perihelionArgDeg: peri,
    meanLongitudeEpochDeg: L0
  });
  var SUN = {
    id: "sun",
    name: "Sun",
    elements: el(0, 0, 0, 0, 0, 0, 0),
    visual: { kind: "sun", radius: 6, baseColor: [1, 0.85, 0.45], albedo: 0, specular: 0, shininess: 1 }
  };
  var PLANETS = [
    {
      id: "mercury",
      name: "Mercury",
      elements: el(0.387098, 87.9691, 0.20563, 7.005, 48.331, 29.124, 252.251),
      visual: { kind: "mercury", radius: 0.7, baseColor: [0.55, 0.55, 0.58], albedo: 0.55, specular: 0.05, shininess: 2 }
    },
    {
      id: "venus",
      name: "Venus",
      elements: el(0.723332, 224.701, 677e-5, 3.395, 76.68, 54.884, 181.98),
      visual: { kind: "venus", radius: 1, baseColor: [0.92, 0.82, 0.55], albedo: 0.9, specular: 0.25, shininess: 8 }
    },
    {
      id: "earth",
      name: "Earth",
      elements: el(1.000001, 365.256, 0.01671, 0, 0, 114.208, 100.464),
      visual: { kind: "earth", radius: 1.1, baseColor: [0.2, 0.5, 0.9], albedo: 0.55, specular: 0.35, shininess: 16 }
    },
    {
      id: "mars",
      name: "Mars",
      elements: el(1.523679, 686.98, 0.0934, 1.85, 49.558, 286.502, 355.453),
      visual: { kind: "mars", radius: 0.9, baseColor: [0.75, 0.35, 0.2], albedo: 0.6, specular: 0.12, shininess: 6 }
    },
    {
      id: "jupiter",
      name: "Jupiter",
      elements: el(5.202603, 4332.589, 0.04849, 1.303, 100.556, 273.867, 34.404),
      visual: { kind: "jupiter", radius: 5.2, baseColor: [0.85, 0.72, 0.55], albedo: 0.8, specular: 0.15, shininess: 4 }
    },
    {
      id: "saturn",
      name: "Saturn",
      elements: el(9.537, 10759.22, 0.05551, 2.489, 113.716, 339.392, 49.945),
      visual: {
        kind: "saturn",
        radius: 4.4,
        baseColor: [0.9, 0.82, 0.62],
        albedo: 0.85,
        specular: 0.1,
        shininess: 4,
        rings: { innerRatio: 1.24, outerRatio: 2.27 }
      }
    },
    {
      id: "uranus",
      name: "Uranus",
      elements: el(19.19126, 30688.5, 0.0463, 0.773, 74.229, 96.998, 313.238),
      visual: { kind: "uranus", radius: 2.9, baseColor: [0.55, 0.85, 0.9], albedo: 0.85, specular: 0.2, shininess: 6 }
    },
    {
      id: "neptune",
      name: "Neptune",
      elements: el(30.11, 60182, 899e-5, 1.77, 131.784, 276.336, 304.88),
      visual: { kind: "neptune", radius: 2.8, baseColor: [0.25, 0.35, 0.9], albedo: 0.85, specular: 0.2, shininess: 6 }
    }
  ];
  var BODIES = [SUN, ...PLANETS];
  var PLANETS_ONLY = PLANETS;
  var findBody = (id) => BODIES.find((b) => b.id === id);

  // src/math.ts
  var EPSILON = 1e-7;
  var vec3 = (x, y, z) => ({ x, y, z });
  var vec3Add = (a, b) => vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  var vec3Sub = (a, b) => vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  var vec3Scale = (a, s) => vec3(a.x * s, a.y * s, a.z * s);
  var vec3Dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  var vec3Cross = (a, b) => vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  var vec3Length = (a) => Math.sqrt(vec3Dot(a, a));
  var vec3Normalize = (a) => {
    const len = vec3Length(a);
    if (len < EPSILON) return vec3(0, 0, 0);
    return vec3Scale(a, 1 / len);
  };
  var vec3Transform = (m, v) => {
    const d = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
    const w = Math.abs(d) < EPSILON ? 1 : 1 / d;
    return vec3(
      (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) * w,
      (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) * w,
      (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) * w
    );
  };
  var mat4Identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  var mat4Multiply = (a, b) => {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
        out[col * 4 + row] = sum;
      }
    }
    return out;
  };
  var mat4Perspective = (fovyRad, aspect, near, far) => {
    const f = 1 / Math.tan(fovyRad / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (far + near) * nf,
      -1,
      0,
      0,
      2 * far * near * nf,
      0
    ]);
  };
  var mat4LookAt = (eye, center, up) => {
    const f = vec3Normalize(vec3Sub(center, eye));
    const s = vec3Normalize(vec3Cross(f, up));
    const u = vec3Cross(s, f);
    const out = new Float32Array(16);
    out[0] = s.x;
    out[4] = s.y;
    out[8] = s.z;
    out[1] = u.x;
    out[5] = u.y;
    out[9] = u.z;
    out[2] = -f.x;
    out[6] = -f.y;
    out[10] = -f.z;
    out[12] = -vec3Dot(s, eye);
    out[13] = -vec3Dot(u, eye);
    out[14] = vec3Dot(f, eye);
    out[15] = 1;
    return out;
  };
  var mat4Translation = (v) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v.x, v.y, v.z, 1]);
  var mat4RotationY = (rad) => {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  };
  var mat4RotationZ = (rad) => {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  };
  var mat4Scale = (s) => new Float32Array([s.x, 0, 0, 0, 0, s.y, 0, 0, 0, 0, s.z, 0, 0, 0, 0, 1]);
  var mat4Trs = (translation, rotation, scale) => mat4Multiply(mat4Multiply(mat4Translation(translation), rotation), mat4Scale(scale));
  var mat4Inverse = (m) => {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return mat4Identity();
    det = 1 / det;
    const out = new Float32Array(16);
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  };
  var DEG2RAD = Math.PI / 180;
  var RAD2DEG = 180 / Math.PI;
  var wrapAngle = (rad) => {
    const tau = Math.PI * 2;
    const w = rad % tau;
    return w < 0 ? w + tau : w;
  };
  var smoothstep = (t) => {
    const k = Math.min(1, Math.max(0, t));
    return k * k * (3 - 2 * k);
  };

  // src/kepler.ts
  var DEG2RAD2 = Math.PI / 180;
  var solveKepler = (meanAnomaly, eccentricity) => {
    const e = eccentricity;
    let E = e < 0.8 ? meanAnomaly : Math.PI;
    for (let i = 0; i < 40; i++) {
      const d = E - e * Math.sin(E) - meanAnomaly;
      const denom = 1 - e * Math.cos(E);
      const step = denom === 0 ? d * 0.5 : d / denom;
      E -= step;
      if (Math.abs(step) < 1e-11) break;
    }
    return E;
  };
  var meanAnomalyAt = (elements, daysFromEpoch) => {
    const m0 = (elements.meanLongitudeEpochDeg - elements.nodeLongitudeDeg - elements.perihelionArgDeg) * DEG2RAD2;
    const n = 2 * Math.PI / elements.periodDays;
    return wrapAngle(m0 + n * daysFromEpoch);
  };
  var orbitalPosition = (elements, daysFromEpoch) => {
    const M = meanAnomalyAt(elements, daysFromEpoch);
    const e = elements.eccentricity;
    const E = solveKepler(M, e);
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const xOrb = elements.semiMajorAxisAU * (cosE - e);
    const yOrb = elements.semiMajorAxisAU * Math.sqrt(1 - e * e) * sinE;
    const inc = elements.inclinationDeg * DEG2RAD2;
    const node = elements.nodeLongitudeDeg * DEG2RAD2;
    const peri = elements.perihelionArgDeg * DEG2RAD2;
    const cosNode = Math.cos(node), sinNode = Math.sin(node);
    const cosInc = Math.cos(inc), sinInc = Math.sin(inc);
    const cosPeri = Math.cos(peri), sinPeri = Math.sin(peri);
    return vec3(
      (cosNode * cosPeri - sinNode * sinPeri * cosInc) * xOrb + (-cosNode * sinPeri - sinNode * cosPeri * cosInc) * yOrb,
      (sinNode * cosPeri + cosNode * sinPeri * cosInc) * xOrb + (-sinNode * sinPeri + cosNode * cosPeri * cosInc) * yOrb,
      sinPeri * sinInc * xOrb + cosPeri * sinInc * yOrb
    );
  };
  var orbitPath = (elements, segments) => {
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const days = i / segments * elements.periodDays;
      pts.push(orbitalPosition(elements, days));
    }
    return pts;
  };

  // src/gl.ts
  var getContext = (canvas) => {
    const attrs = {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: true
    };
    const gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs);
    return gl;
  };
  var compileShader = (gl, type, source) => {
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
  var createProgram = (gl, vsSource, fsSource) => {
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
    const attributes = {};
    const uniforms = {};
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
  var createArrayBuffer = (gl, data) => {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("webgl: failed to create array buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
  };
  var createIndexBuffer = (gl, data) => {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("webgl: failed to create index buffer");
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
  };
  var bindAttrib = (gl, location, buffer, size, type, stride, offset) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, type, false, stride, offset);
  };
  var uniformOf = (p, name) => p.uniforms[name] ?? null;
  var setUniformMat4 = (p, name, value) => {
    const loc = uniformOf(p, name);
    if (loc) p.gl.uniformMatrix4fv(loc, false, value);
  };
  var setUniformMat3 = (p, name, value) => {
    const loc = uniformOf(p, name);
    if (loc) p.gl.uniformMatrix3fv(loc, false, value);
  };
  var setUniformVec3 = (p, name, value) => {
    const loc = uniformOf(p, name);
    if (loc) p.gl.uniform3f(loc, value[0], value[1], value[2]);
  };
  var setUniform1f = (p, name, value) => {
    const loc = uniformOf(p, name);
    if (loc) p.gl.uniform1f(loc, value);
  };
  var setUniform1i = (p, name, value) => {
    const loc = uniformOf(p, name);
    if (loc) p.gl.uniform1i(loc, value);
  };
  var uploadTexture = (gl, texture, source, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  var createEmptyTexture = (gl) => {
    const texture = gl.createTexture();
    if (!texture) throw new Error("webgl: failed to create texture");
    return texture;
  };

  // src/shaders.ts
  var VERTEX_LIT = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vTexCoord;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = uNormalMatrix * aNormal;
  vTexCoord = aTexCoord;
  gl_Position = uProjection * uView * world;
}
`;
  var FRAGMENT_LIT = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec3 uLightDir;
uniform vec3 uCameraPos;
uniform vec3 uBaseColor;
uniform float uAlbedo;
uniform float uSpecular;
uniform float uShininess;
uniform float uEmissive;
uniform float uAlpha;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vTexCoord;
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  vec3 texColor = texture2D(uTexture, vTexCoord).rgb * uBaseColor;
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 H = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  float ndh = pow(max(dot(N, H), 0.0), uShininess);
  vec3 ambient = texColor * 0.06;
  vec3 diffuse = texColor * uAlbedo * ndl;
  vec3 specular = vec3(uSpecular) * ndh * ndl;
  vec3 emissive = texColor * uEmissive;
  gl_FragColor = vec4(ambient + diffuse + specular + emissive, uAlpha);
}
`;
  var VERTEX_UNLIT = `
attribute vec3 aPosition;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform float uPointSize;
void main() {
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  gl_PointSize = uPointSize;
}
`;
  var FRAGMENT_UNLIT = `
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  gl_FragColor = vec4(uColor, uAlpha);
}
`;
  var VERTEX_SPRITE = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
varying vec2 vTexCoord;
void main() {
  vTexCoord = aTexCoord;
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
`;
  var FRAGMENT_SPRITE = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uAlpha;
varying vec2 vTexCoord;
void main() {
  float a = texture2D(uTexture, vTexCoord).a;
  gl_FragColor = vec4(uColor, a * uAlpha);
}
`;
  var LIT_SOURCE = { vertex: VERTEX_LIT, fragment: FRAGMENT_LIT };
  var UNLIT_SOURCE = { vertex: VERTEX_UNLIT, fragment: FRAGMENT_UNLIT };
  var SPRITE_SOURCE = { vertex: VERTEX_SPRITE, fragment: FRAGMENT_SPRITE };

  // src/geometry.ts
  var VERTEX_STRIDE = 8 * 4;
  var sphereGeometry = (radius, widthSegments, heightSegments) => {
    const v = new Float32Array((widthSegments + 1) * (heightSegments + 1) * 8);
    const idx = new Uint16Array(widthSegments * heightSegments * 6);
    let vi = 0;
    let ii = 0;
    for (let j = 0; j <= heightSegments; j++) {
      const vv = j / heightSegments;
      const theta = vv * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      for (let i = 0; i <= widthSegments; i++) {
        const uu = i / widthSegments;
        const phi = uu * Math.PI * 2;
        const px = radius * sinTheta * Math.cos(phi);
        const py = radius * cosTheta;
        const pz = radius * sinTheta * Math.sin(phi);
        const il = 1 / radius;
        v[vi++] = px;
        v[vi++] = py;
        v[vi++] = pz;
        v[vi++] = px * il;
        v[vi++] = py * il;
        v[vi++] = pz * il;
        v[vi++] = uu;
        v[vi++] = vv;
      }
    }
    for (let j = 0; j < heightSegments; j++) {
      for (let i = 0; i < widthSegments; i++) {
        const a = j * (widthSegments + 1) + i;
        const b = a + 1;
        const c = a + (widthSegments + 1);
        const d = c + 1;
        idx[ii++] = a;
        idx[ii++] = c;
        idx[ii++] = b;
        idx[ii++] = b;
        idx[ii++] = c;
        idx[ii++] = d;
      }
    }
    return { vertices: v, indices: idx };
  };
  var ringGeometry = (innerRadius, outerRadius, segments) => {
    const v = new Float32Array((segments + 1) * 2 * 8);
    const idx = new Uint16Array(segments * 2 * 3);
    let vi = 0;
    let ii = 0;
    for (let i = 0; i <= segments; i++) {
      const uu = i / segments;
      const phi = uu * Math.PI * 2;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      for (let ring = 0; ring < 2; ring++) {
        const rr = ring === 0 ? innerRadius : outerRadius;
        const vv = ring === 0 ? 0 : 1;
        v[vi++] = rr * cosPhi;
        v[vi++] = rr * sinPhi;
        v[vi++] = 0;
        v[vi++] = 0;
        v[vi++] = 0;
        v[vi++] = 1;
        v[vi++] = uu;
        v[vi++] = vv;
      }
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      idx[ii++] = a;
      idx[ii++] = b;
      idx[ii++] = c;
      idx[ii++] = b;
      idx[ii++] = d;
      idx[ii++] = c;
    }
    return { vertices: v, indices: idx };
  };
  var quadGeometry = () => {
    const v = new Float32Array([
      -0.5,
      -0.5,
      0,
      0,
      0,
      1,
      0,
      0,
      0.5,
      -0.5,
      0,
      0,
      0,
      1,
      1,
      0,
      0.5,
      0.5,
      0,
      0,
      0,
      1,
      1,
      1,
      -0.5,
      0.5,
      0,
      0,
      0,
      1,
      0,
      1
    ]);
    const idx = new Uint16Array([0, 1, 2, 0, 2, 3]);
    return { vertices: v, indices: idx };
  };
  var polylineGeometry = (points) => {
    const v = new Float32Array(points.length * 3);
    let i = 0;
    for (const p of points) {
      v[i++] = p.x;
      v[i++] = p.y;
      v[i++] = p.z;
    }
    return { vertices: v };
  };
  var pointGeometry = (points) => {
    const v = new Float32Array(points.length * 3);
    let i = 0;
    for (const p of points) {
      v[i++] = p.x;
      v[i++] = p.y;
      v[i++] = p.z;
    }
    return { vertices: v };
  };
  var unitSpherePoints = (count, random) => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const u = random() * 2 - 1;
      const phi = random() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - u * u));
      out.push({ x: r * Math.cos(phi), y: u, z: r * Math.sin(phi) });
    }
    return out;
  };
  var unitCircle = (segments) => {
    const out = [];
    for (let i = 0; i < segments; i++) {
      const phi = i / segments * Math.PI * 2;
      out.push({ x: Math.cos(phi), y: 0, z: Math.sin(phi) });
    }
    return out;
  };

  // src/noise.ts
  var createRng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  var FADE = (t) => t * t * (3 - 2 * t);
  var Noise = class {
    constructor(seed) {
      const rng = createRng(seed);
      const table = new Uint8Array(256);
      for (let i = 0; i < 256; i++) table[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = table[i];
        table[i] = table[j];
        table[j] = tmp;
      }
      this.perm = table;
    }
    /** Lattice value at integer coordinates, mapped to [0,1). */
    lattice(x, y) {
      return this.perm[this.perm[x & 255] + y & 255] / 255;
    }
    /** Single-octave value noise at (x, y), [0,1). */
    value2(x, y) {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const u = FADE(xf);
      const v = FADE(yf);
      const a = this.lattice(xi, yi);
      const b = this.lattice(xi + 1, yi);
      const c = this.lattice(xi, yi + 1);
      const d = this.lattice(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    /**
     * Fractal Brownian motion: layered value noise. Result is approximately
     * [0,1) (amplitudes normalized; clamped defensively).
     */
    fbm2(x, y, octaves, lacunarity = 2, gain = 0.5) {
      let amp = 1;
      let freq = 1;
      let sum = 0;
      let norm = 0;
      for (let i = 0; i < octaves; i++) {
        sum += amp * this.value2(x * freq, y * freq);
        norm += amp;
        amp *= gain;
        freq *= lacunarity;
      }
      const out = sum / norm;
      return out < 0 ? 0 : out > 1 ? 1 : out;
    }
  };

  // src/textures.ts
  var TEXTURE_SIZE = 512;
  var RING_TEXTURE_SIZE = 256;
  var GLOW_TEXTURE_SIZE = 128;
  var hashSeed = (name) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < name.length; i++) {
      h ^= name.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  var lerpColor = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
  var WHITE = [255, 255, 255];
  var paintImage = (size, fn) => {
    const img = new ImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const [r, g, b, a] = fn(x, y);
        const i = (y * size + x) * 4;
        d[i] = Math.max(0, Math.min(255, Math.round(r)));
        d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        d[i + 3] = Math.max(0, Math.min(255, Math.round(a)));
      }
    }
    return img;
  };
  var seamDist = (u) => Math.min(u, 1 - u);
  var polarFactor = (v) => Math.abs(Math.cos(v * Math.PI));
  var paintSun = (n, x, y) => {
    const u = x / TEXTURE_SIZE;
    const v = y / TEXTURE_SIZE;
    const granule = n.fbm2(u * 24, v * 24, 5);
    const base = lerpColor([255, 250, 220], [255, 186, 60], granule);
    const spots = n.fbm2(u * 40 + 13.7, v * 40 - 7.3, 4);
    const spotFactor = smoothstep((spots - 0.7) / 0.12);
    const dark = lerpColor(base, [180, 84, 20], 0.85 * spotFactor);
    return [dark[0], dark[1], dark[2], 255];
  };
  var paintMercury = (n, x, y) => {
    const u = x / TEXTURE_SIZE;
    const v = y / TEXTURE_SIZE;
    const f = n.fbm2(u * 24, v * 24, 6);
    let r = 118 + f * 70;
    let g = 112 + f * 64;
    let b = 104 + f * 56;
    const crater = n.value2(u * 64 + 3, v * 64 - 9);
    if (crater > 0.86) {
      const k = smoothstep((crater - 0.86) / 0.12);
      const shade = lerpColor([r, g, b], [70, 66, 62], k * 0.8);
      r = shade[0];
      g = shade[1];
      b = shade[2];
    }
    return [r, g, b, 255];
  };
  var paintVenus = (n, x, y) => {
    const u = x / TEXTURE_SIZE;
    const v = y / TEXTURE_SIZE;
    const swirl = n.fbm2(u * 14 + 20, v * 14 - 30, 4, 2, 0.6);
    const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 10 + swirl * 5);
    const cream = lerpColor([226, 203, 142], [250, 232, 178], band);
    const r = cream[0] + (swirl - 0.5) * 24;
    const g = cream[1] + (swirl - 0.5) * 20;
    const b = cream[2] + (swirl - 0.5) * 12;
    return [r, g, b, 255];
  };
  var paintEarth = (n, x, y) => {
    const u = x / TEXTURE_SIZE;
    const v = y / TEXTURE_SIZE;
    const elevation = n.fbm2(u * 8, v * 8, 6);
    const bias = n.fbm2(u * 3 + 11, v * 3 + 7, 4);
    const threshold = 0.46 + (bias - 0.5) * 0.34;
    const land = elevation > threshold;
    const detail = (n.fbm2(u * 48, v * 48, 4) - 0.5) * 0.22;
    if (polarFactor(v) > 0.88) {
      const ice = lerpColor([235, 242, 250], WHITE, n.fbm2(u * 10, v * 10, 3));
      return [ice[0], ice[1], ice[2], 255];
    }
    if (land) {
      const t = Math.min(1, Math.max(0, (elevation - threshold) / 0.5));
      const equator = 1 - Math.max(0, polarFactor(v) * 2 - 0.4);
      const green = lerpColor([60, 120, 48], [150, 140, 90], equator);
      const landColor = lerpColor(green, [178, 152, 108], t);
      const shaded = lerpColor(landColor, [30, 50, 30], Math.max(0, detail * -1));
      return [shaded[0], shaded[1], shaded[2], 255];
    }
    const deep = lerpColor([18, 56, 122], [38, 96, 168], n.fbm2(u * 20 + 5, v * 20 - 5, 4));
    const ocean = lerpColor(deep, [20, 60, 110], detail);
    return [ocean[0], ocean[1], ocean[2], 255];
  };
  var paintMars = (n, x, y) => {
    const u = x / TEXTURE_SIZE;
    const v = y / TEXTURE_SIZE;
    if (polarFactor(v) > 0.9) {
      const ice = lerpColor([250, 245, 235], [220, 210, 195], n.fbm2(u * 12, v * 12, 3));
      return [ice[0], ice[1], ice[2], 255];
    }
    const f = n.fbm2(u * 18, v * 18, 6);
    const base = lerpColor([140, 68, 30], [216, 126, 62], f);
    const darkRegion = n.fbm2(u * 26 + 40, v * 26 - 12, 4);
    const darkFactor = smoothstep((darkRegion - 0.62) / 0.16);
    const shaded = lerpColor(base, [96, 44, 20], darkFactor * 0.75);
    return [shaded[0], shaded[1], shaded[2], 255];
  };
  var paintStriped = (n, x, y, bands, warpStrength, light, dark, spot) => {
    const u = x / TEXTURE_SIZE;
    const v = y / TEXTURE_SIZE;
    const turbulence = n.fbm2(u * 8 + 3, v * 20 - 7, 3);
    const vv = Math.min(1, Math.max(0, v + (turbulence - 0.5) * warpStrength));
    const phase = turbulence * 4;
    const stripe = Math.sin(vv * Math.PI * bands + phase);
    const tone = lerpColor(dark, light, 0.5 + 0.5 * stripe);
    const bandEdge = Math.abs(stripe) < 0.06;
    const edge = bandEdge ? lerpColor(tone, [0, 0, 0], 0.35) : tone;
    let r = edge[0];
    let g = edge[1];
    let b = edge[2];
    if (spot) {
      const du = seamDist(Math.abs(u - spot.u));
      const dv = Math.abs(v - spot.v);
      const d = Math.sqrt(du * du + dv * dv);
      if (d < spot.radius) {
        const k = smoothstep((d - spot.radius * 0.6) / (spot.radius * 0.4) + 1);
        const mix = lerpColor([r, g, b], spot.color, 1 - k);
        r = mix[0];
        g = mix[1];
        b = mix[2];
      }
    }
    return [r, g, b, 255];
  };
  var paintJupiter = (n, x, y) => paintStriped(
    n,
    x,
    y,
    16,
    0.09,
    [222, 198, 160],
    [150, 104, 66],
    { u: 0.78, v: 0.62, radius: 0.05, color: [196, 90, 50] }
  );
  var paintSaturn = (n, x, y) => paintStriped(n, x, y, 10, 0.04, [224, 200, 150], [176, 148, 102]);
  var paintUranus = (n, x, y) => {
    const u = x / TEXTURE_SIZE;
    const v = y / TEXTURE_SIZE;
    const f = n.fbm2(u * 8, v * 8, 3) * 0.5 + n.fbm2(u * 4 + 20, v * 4 + 40, 3) * 0.5;
    const r = 138 + (f - 0.5) * 26;
    const g = 214 + (f - 0.5) * 22;
    const b = 228 + (f - 0.5) * 18;
    return [r, g, b, 255];
  };
  var paintNeptune = (n, x, y) => paintStriped(
    n,
    x,
    y,
    14,
    0.05,
    [82, 116, 222],
    [48, 74, 176],
    { u: 0.35, v: 0.55, radius: 0.05, color: [30, 52, 130] }
  );
  var paintRing = (n, x, y) => {
    const u = x / RING_TEXTURE_SIZE;
    const t = y / RING_TEXTURE_SIZE;
    const fade = smoothstep(t / 0.08) * (1 - smoothstep((t - 0.86) / 0.14));
    const band = 0.5 + 0.5 * Math.sin(t * 46 + n.fbm2(u * 12, t * 30, 3) * 3);
    const shade = lerpColor([212, 184, 148], [150, 122, 92], band);
    const alpha = fade * (0.72 + 0.28 * band);
    return [shade[0], shade[1], shade[2], alpha * 255];
  };
  var paintGlow = (size, x, y) => {
    const dx = (x + 0.5) / size - 0.5;
    const dy = (y + 0.5) / size - 0.5;
    const d = Math.sqrt(dx * dx + dy * dy) * 2;
    const a = d >= 1 ? 0 : Math.pow(1 - d, 2.2);
    return [255, 255, 255, a * 255];
  };
  var PAINTERS = {
    sun: paintSun,
    mercury: paintMercury,
    venus: paintVenus,
    earth: paintEarth,
    mars: paintMars,
    jupiter: paintJupiter,
    saturn: paintSaturn,
    uranus: paintUranus,
    neptune: paintNeptune
  };
  var makeBodyTexture = (gl, kind) => {
    const painter = PAINTERS[kind];
    const seed = hashSeed(kind);
    const n = new Noise(seed);
    const img = paintImage(TEXTURE_SIZE, (x, y) => painter(n, x, y));
    const texture = createEmptyTexture(gl);
    uploadTexture(gl, texture, img, 0);
    return texture;
  };
  var makeRingTexture = (gl) => {
    const n = new Noise(hashSeed("saturn-rings"));
    const img = paintImage(RING_TEXTURE_SIZE, (x, y) => paintRing(n, x, y));
    const texture = createEmptyTexture(gl);
    uploadTexture(gl, texture, img, 0);
    return texture;
  };
  var makeGlowTexture = (gl) => {
    const img = paintImage(GLOW_TEXTURE_SIZE, (x, y) => paintGlow(GLOW_TEXTURE_SIZE, x, y));
    const texture = createEmptyTexture(gl);
    uploadTexture(gl, texture, img, 0);
    return texture;
  };

  // src/renderer.ts
  var NEAR = 0.1;
  var FAR = 5e4;
  var STAR_DISTANCE = 2e4;
  var SPHERE_W = 48;
  var SPHERE_H = 32;
  var STAR_DIM_COUNT = 2e3;
  var STAR_BRIGHT_COUNT = 350;
  var ORBIT_SEGMENTS = 220;
  var RING_SEGMENTS = 96;
  var CIRCLE_SEGMENTS = 96;
  var SPIN_SPEED = {
    sun: 0.05,
    mercury: 0.012,
    venus: -4e-3,
    earth: 0.23,
    mars: 0.22,
    jupiter: 0.36,
    saturn: 0.32,
    uranus: 0.21,
    neptune: 0.19
  };
  var AXIAL_TILT = {
    sun: 0,
    mercury: 0.01,
    venus: 3.1,
    earth: 0.41,
    mars: 0.44,
    jupiter: 0.05,
    saturn: 0.47,
    uranus: 1.71,
    neptune: 0.49
  };
  var Mesh = class {
    constructor(gl, mesh) {
      this.vertexBuffer = createArrayBuffer(gl, mesh.vertices);
      this.indexBuffer = createIndexBuffer(gl, mesh.indices);
      this.indexCount = mesh.indices.length;
    }
  };
  var LineMesh = class {
    constructor(gl, mesh) {
      this.vertexBuffer = createArrayBuffer(gl, mesh.vertices);
      this.vertexCount = mesh.vertices.length / 3;
    }
  };
  var bodyPosition = (body, simDays) => {
    if (body.elements.semiMajorAxisAU === 0) return vec3(0, 0, 0);
    const p = orbitalPosition(body.elements, simDays);
    return vec3(p.x * AU_SCALE, p.y * AU_SCALE, p.z * AU_SCALE);
  };
  var Renderer = class {
    constructor(canvas) {
      this.textures = /* @__PURE__ */ new Map();
      this.orbitMeshes = /* @__PURE__ */ new Map();
      this.viewportWidth = 1;
      this.viewportHeight = 1;
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
    buildRingMesh() {
      const saturn = PLANETS_ONLY.find((b) => b.visual.rings);
      const spec = saturn?.visual.rings;
      if (!spec) return ringGeometry(0.5, 1, RING_SEGMENTS);
      return ringGeometry(spec.innerRatio / spec.outerRatio, 1, RING_SEGMENTS);
    }
    setViewport(width, height) {
      this.viewportWidth = width;
      this.viewportHeight = height;
      this.gl.viewport(0, 0, width, height);
    }
    projection() {
      const aspect = this.viewportWidth / Math.max(1, this.viewportHeight);
      return mat4Perspective(0.9, aspect, NEAR, FAR);
    }
    draw(camera, simDays, options) {
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
    drawStars(camera, projection) {
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
    drawOrbits(camera, projection, selected) {
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
    drawBodies(camera, projection, simDays, timeSec) {
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
    drawRings(camera, projection, simDays) {
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
    drawSunGlow(camera, projection) {
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
      for (const [scaleFactor, alpha, color] of [[2.8, 0.9, [1, 0.75, 0.3]], [5.4, 0.5, [1, 0.55, 0.18]], [9.5, 0.25, [1, 0.4, 0.1]]]) {
        const model = mat4Multiply(billboard, mat4Scale(vec3(size * scaleFactor, size * scaleFactor, 1)));
        setUniformMat4(program, "uModel", model);
        setUniformVec3(program, "uColor", color);
        setUniform1f(program, "uAlpha", alpha);
        this.drawMesh(program, this.quad);
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    drawSelection(camera, projection, simDays, selected) {
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
    bodyModel(body, pos, timeSec) {
      const tilt = mat4RotationZ(AXIAL_TILT[body.visual.kind]);
      const spin = mat4RotationY(timeSec * SPIN_SPEED[body.visual.kind]);
      return mat4Trs(pos, mat4Multiply(tilt, spin), vec3(body.visual.radius, body.visual.radius, body.visual.radius));
    }
    drawMesh(program, mesh) {
      const gl = this.gl;
      bindAttrib(gl, program.attributes.aPosition, mesh.vertexBuffer, 3, gl.FLOAT, VERTEX_STRIDE, 0);
      if (program.attributes.aNormal !== void 0) {
        bindAttrib(gl, program.attributes.aNormal, mesh.vertexBuffer, 3, gl.FLOAT, VERTEX_STRIDE, 12);
      }
      if (program.attributes.aTexCoord !== void 0) {
        bindAttrib(gl, program.attributes.aTexCoord, mesh.vertexBuffer, 2, gl.FLOAT, VERTEX_STRIDE, 24);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }
    drawLines(program, mesh) {
      const gl = this.gl;
      bindAttrib(gl, program.attributes.aPosition, mesh.vertexBuffer, 3, gl.FLOAT, 12, 0);
      gl.drawArrays(gl.LINE_LOOP, 0, mesh.vertexCount);
    }
    drawPoints(program, mesh) {
      const gl = this.gl;
      bindAttrib(gl, program.attributes.aPosition, mesh.vertexBuffer, 3, gl.FLOAT, 12, 0);
      gl.drawArrays(gl.POINTS, 0, mesh.vertexCount);
    }
    /**
     * Ray-cast a normalized-device-coordinate click (x, y ∈ [-1, 1]) against
     * every planet sphere; returns the closest hit body id or null.
     */
    pick(camera, simDays, ndcX, ndcY) {
      const projection = this.projection();
      const view = camera.viewMatrix();
      const viewProj = mat4Multiply(projection, view);
      const inv = mat4Inverse(viewProj);
      const near = vec3Transform(inv, vec3(ndcX, ndcY, -1));
      const far = vec3Transform(inv, vec3(ndcX, ndcY, 1));
      const dir = vec3Normalize(vec3Sub(far, near));
      const origin = camera.eye;
      let bestT = Infinity;
      let bestId = null;
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
  };
  var normalMatrix = (model) => {
    const inv = mat4Inverse(model);
    return new Float32Array([
      inv[0],
      inv[4],
      inv[8],
      inv[1],
      inv[5],
      inv[9],
      inv[2],
      inv[6],
      inv[10]
    ]);
  };
  var bindTextureUnit = (gl, texture, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  };
  var seededRandom = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  var cameraBillboardMatrix = (camera) => {
    const right = camera.right();
    const up = camera.up();
    const back = vec3Scale(camera.forward(), -1);
    return new Float32Array([
      right.x,
      up.x,
      back.x,
      0,
      right.y,
      up.y,
      back.y,
      0,
      right.z,
      up.z,
      back.z,
      0,
      0,
      0,
      0,
      1
    ]);
  };

  // src/camera.ts
  var CLAMP_PITCH = 1.55;
  var MIN_SPEED = 4;
  var MAX_SPEED = 8e3;
  var FreeCamera = class {
    constructor() {
      this.eye = vec3(0, 90, 190);
      this.yaw = 0;
      this.pitch = -0.28;
      this.speed = 80;
      this.keyForward = 0;
      this.keyStrafe = 0;
      this.keyVertical = 0;
    }
    /** Target for the movement keys; move() reads and resets these. */
    consumeInput() {
      const input = {
        forward: this.keyForward,
        strafe: this.keyStrafe,
        vertical: this.keyVertical
      };
      this.keyForward = 0;
      this.keyStrafe = 0;
      this.keyVertical = 0;
      return input;
    }
    setKey(axis, value) {
      if (axis === "forward") this.keyForward = Math.max(-1, Math.min(1, value));
      else if (axis === "strafe") this.keyStrafe = Math.max(-1, Math.min(1, value));
      else this.keyVertical = Math.max(-1, Math.min(1, value));
    }
    /** Rotate by (dyaw, dpitch) radians. */
    rotate(dyaw, dpitch) {
      this.yaw += dyaw;
      this.pitch = Math.max(-CLAMP_PITCH, Math.min(CLAMP_PITCH, this.pitch + dpitch));
    }
    /** Multiply the flight speed by a factor, clamped. */
    scaleSpeed(factor) {
      this.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, this.speed * factor));
    }
    /** Move along the camera's basis by the accumulated key input. */
    move(dt) {
      const { forward, strafe, vertical } = this.consumeInput();
      const f = this.forward();
      const r = this.right();
      const dist = this.speed * dt;
      const dx = r.x * strafe + f.x * forward;
      const dy = vertical;
      const dz = r.z * strafe + f.z * forward;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-9) return;
      const s = dist / len;
      this.eye = vec3Add(this.eye, vec3(dx * s, dy * s, dz * s));
    }
    /** Pan the camera in its own plane (right-drag): dx/dy are pixel deltas. */
    pan(dx, dy) {
      const r = this.right();
      const up = this.up();
      const dist = this.speed * 8e-3;
      this.eye = vec3Add(this.eye, vec3Add(vec3Scale(r, -dx * dist), vec3Scale(up, dy * dist)));
    }
    forward() {
      const cp = Math.cos(this.pitch);
      return vec3(cp * Math.sin(this.yaw), Math.sin(this.pitch), cp * Math.cos(this.yaw));
    }
    right() {
      return vec3Normalize(vec3Cross(this.forward(), vec3(0, 1, 0)));
    }
    up() {
      return vec3Cross(this.right(), this.forward());
    }
    /** Snap orientation to look from `eye` toward `target`. */
    lookAt(target) {
      const dir = vec3Normalize(vec3Sub(target, this.eye));
      this.yaw = Math.atan2(dir.x, dir.z);
      this.pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    }
    /** Continuous-damping approach toward a target position. */
    approach(target, dt) {
      const k = 1 - Math.exp(-dt * 2.6);
      const to = vec3Sub(target, this.eye);
      this.eye = vec3Add(this.eye, vec3Scale(to, Math.min(1, k)));
    }
    /** View matrix for the current pose. */
    viewMatrix() {
      return mat4LookAt(this.eye, vec3Add(this.eye, this.forward()), this.up());
    }
    /** Rotation-only view matrix (stars stay fixed at "infinity"). */
    viewRotationMatrix() {
      const view = this.viewMatrix();
      const out = new Float32Array(16);
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) out[c * 4 + r] = view[c * 4 + r];
      }
      out[15] = 1;
      return out;
    }
  };

  // src/ui.ts
  var warpLabel = (index) => {
    const v = TIME_WARP_STEPS[index] ?? 1;
    return v < 1 ? `${v.toFixed(2)}\xD7` : `${v}\xD7`;
  };
  var Hud = class {
    constructor(callbacks) {
      this.dragging = false;
      this.moved = 0;
      this.lastX = 0;
      this.lastY = 0;
      this.pointers = /* @__PURE__ */ new Map();
      this.pinchDist = 0;
      this.callbacks = callbacks;
      this.root = mustGet("#hud-root");
      this.dateEl = mustGet("#hud-date");
      this.pausedEl = mustGet("#hud-paused");
      this.warpEl = mustGet("#hud-warp");
      this.bodyEl = mustGet("#hud-body");
      this.pauseBtn = mustGet("#btn-pause");
      this.warpSlider = mustGet("#warp-slider");
      this.flySelect = mustGet("#fly-select");
      for (const planet of PLANETS_ONLY) {
        const opt = document.createElement("option");
        opt.value = planet.id;
        opt.textContent = planet.name;
        this.flySelect.appendChild(opt);
      }
      this.pauseBtn.addEventListener("click", () => this.callbacks.onPauseToggle());
      mustGet("#btn-warp-down").addEventListener("click", () => this.callbacks.onWarpDelta(-1));
      mustGet("#btn-warp-up").addEventListener("click", () => this.callbacks.onWarpDelta(1));
      this.warpSlider.addEventListener("input", () => {
        this.callbacks.onWarpSet(Number(this.warpSlider.value));
      });
      this.flySelect.addEventListener("change", () => {
        const id = this.flySelect.value || null;
        this.callbacks.onFlyTo(id);
      });
      mustGet("#btn-hud").addEventListener("click", () => {
        this.root.classList.toggle("hidden");
        this.callbacks.onHudToggle();
      });
      this.wirePointer();
      this.wireWheel();
    }
    /** Repaint the HUD readout; called every frame. */
    update(state) {
      const date = new Date(EPOCH_MS + state.simDays * 864e5);
      this.dateEl.textContent = date.toISOString().slice(0, 19).replace("T", " ");
      this.pausedEl.textContent = state.paused ? "paused" : "running";
      this.pausedEl.classList.toggle("paused", state.paused);
      this.warpEl.textContent = warpLabel(state.warpIndex);
      this.bodyEl.textContent = state.selected ? PLANETS_ONLY.find((p) => p.id === state.selected)?.name ?? "\u2014" : "\u2014";
      this.warpSlider.value = String(state.warpIndex);
      this.pauseBtn.textContent = state.paused ? "\u25B6 Resume" : "\u275A\u275A Pause";
    }
    /** Programmatic selection change (e.g. from a click-pick). */
    setSelected(id) {
      this.flySelect.value = id ?? "";
    }
    wireWheel() {
      const onWheel = (e) => {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 12e-4);
        if (e.ctrlKey) {
          this.callbacks.onWarpDelta(Math.sign(e.deltaY));
        } else {
          this.callbacks.onZoom(factor);
        }
      };
      window.addEventListener("wheel", onWheel, { passive: false });
    }
    wirePointer() {
      const canvas = mustGet("#gl-canvas");
      const rect = () => canvas.getBoundingClientRect();
      canvas.addEventListener("pointerdown", (e) => {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        canvas.setPointerCapture(e.pointerId);
        if (this.pointers.size === 1) {
          this.dragging = true;
          this.moved = 0;
          this.lastX = e.clientX;
          this.lastY = e.clientY;
        } else if (this.pointers.size === 2) {
          this.pinchDist = pointerDistance(this.pointers);
        }
      });
      canvas.addEventListener("pointermove", (e) => {
        const pt = this.pointers.get(e.pointerId);
        if (pt) {
          pt.x = e.clientX;
          pt.y = e.clientY;
        }
        if (this.pointers.size === 2) {
          const d = pointerDistance(this.pointers);
          if (this.pinchDist > 0) {
            this.callbacks.onZoom(d / this.pinchDist);
          }
          this.pinchDist = d;
          return;
        }
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.moved += Math.abs(dx) + Math.abs(dy);
        const isPrimary = e.buttons === 1;
        const isPan = e.buttons === 2 || e.buttons === 4;
        if (isPan) this.callbacks.onPan(dx, dy);
        else if (isPrimary) this.callbacks.onRotate(dx * 35e-4, dy * 35e-4);
      });
      canvas.addEventListener("pointerup", (e) => {
        const wasDragging = this.dragging && this.pointers.size === 1;
        this.pointers.delete(e.pointerId);
        if (this.pointers.size === 0) {
          this.dragging = false;
          this.pinchDist = 0;
        }
        if (wasDragging && this.moved < 6 && e.button === 0) {
          const r = rect();
          const ndcX = (e.clientX - r.left) / r.width * 2 - 1;
          const ndcY = -((e.clientY - r.top) / r.height) * 2 + 1;
          this.callbacks.onPick(ndcX, ndcY);
        }
      });
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  };
  var pointerDistance = (pointers) => {
    const pts = [...pointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  var mustGet = (selector) => {
    const el2 = document.querySelector(selector);
    if (!el2) throw new Error(`ui: missing element ${selector}`);
    return el2;
  };

  // src/main.ts
  var WARP_INDEX_START = 2;
  var bodyPosition2 = (body, simDays) => {
    if (body.elements.semiMajorAxisAU === 0) return vec3(0, 0, 0);
    const p = orbitalPosition(body.elements, simDays);
    return vec3(p.x * AU_SCALE, p.y * AU_SCALE, p.z * AU_SCALE);
  };
  var main = () => {
    const canvas = document.getElementById("gl-canvas");
    if (!canvas) throw new Error("orrery: #gl-canvas not found");
    const overlay = document.getElementById("overlay");
    let renderer;
    try {
      renderer = new Renderer(canvas);
    } catch (err) {
      showOverlay(overlay, `WebGL is required \u2014 ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    const camera = new FreeCamera();
    let simDays = 0;
    let timeSec = 0;
    let paused = false;
    let warpIndex = WARP_INDEX_START;
    let selected = null;
    let follow = null;
    const hud = new Hud({
      onPauseToggle: () => {
        paused = !paused;
      },
      onWarpDelta: (delta) => {
        warpIndex = Math.max(0, Math.min(TIME_WARP_STEPS.length - 1, warpIndex + delta));
      },
      onWarpSet: (index) => {
        warpIndex = Math.max(0, Math.min(TIME_WARP_STEPS.length - 1, index));
      },
      onFlyTo: (id) => {
        if (id) {
          const body = findBody(id) ?? null;
          follow = body;
          selected = body ? body.id : null;
          hud.setSelected(selected);
        } else {
          follow = null;
          selected = null;
          hud.setSelected(null);
        }
      },
      onHudToggle: () => {
      },
      onPick: (ndcX, ndcY) => {
        const id = renderer.pick(camera, simDays, ndcX, ndcY);
        if (id) {
          follow = findBody(id) ?? null;
          selected = id;
          hud.setSelected(id);
        } else {
          follow = null;
          selected = null;
          hud.setSelected(null);
        }
      },
      onRotate: (dx, dy) => {
        camera.rotate(dx, dy);
        follow = null;
      },
      onPan: (dx, dy) => {
        camera.pan(dx, dy);
        follow = null;
      },
      onZoom: (factor) => {
        camera.scaleSpeed(factor);
      }
    });
    const keys = /* @__PURE__ */ new Set();
    const keyDown = (e) => {
      keys.add(e.code);
      if (e.code === "Space") {
        e.preventDefault();
        paused = !paused;
      } else if (e.code === "Equal" || e.code === "NumpadAdd") {
        warpIndex = Math.max(0, Math.min(TIME_WARP_STEPS.length - 1, warpIndex + 1));
      } else if (e.code === "Minus" || e.code === "NumpadSubtract") {
        warpIndex = Math.max(0, Math.min(TIME_WARP_STEPS.length - 1, warpIndex - 1));
      } else if (e.code === "KeyH") {
        document.getElementById("hud-root")?.classList.toggle("hidden");
      } else if (e.code === "KeyF") {
        const target = follow ? null : findBody(selected ?? "") ?? null;
        follow = target;
        if (target) {
          selected = target.id;
          hud.setSelected(target.id);
        }
      } else if (e.code === "Escape") {
        follow = null;
        selected = null;
        hud.setSelected(null);
      }
    };
    const keyUp = (e) => {
      keys.delete(e.code);
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        renderer.setViewport(width, height);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    const breakFollowIfMoving = () => {
      const forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
      const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
      const vertical = (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
      camera.setKey("forward", forward);
      camera.setKey("strafe", strafe);
      camera.setKey("vertical", vertical);
      if (follow && (forward !== 0 || strafe !== 0 || vertical !== 0)) {
        follow = null;
      }
    };
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1e3));
      last = now;
      timeSec += dt;
      breakFollowIfMoving();
      camera.move(dt);
      if (follow) {
        const pos = bodyPosition2(follow, simDays);
        const outward = vec3Normalize(pos);
        const target = vec3Add(pos, vec3Scale(outward, follow.visual.radius * 5 + 2));
        camera.approach(target, dt);
        camera.lookAt(pos);
      }
      if (!paused) {
        simDays += TIME_WARP_STEPS[warpIndex] * DAYS_PER_SECOND * dt;
      }
      renderer.draw(camera, simDays, { selected, timeSec });
      hud.update({ simDays, paused, warpIndex, selected });
      if (overlay) overlay.classList.add("hidden");
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  var showOverlay = (overlay, message) => {
    if (!overlay) return;
    overlay.textContent = message;
    overlay.classList.remove("hidden");
    document.getElementById("controls")?.classList.add("hidden");
    document.getElementById("hud-root")?.classList.add("hidden");
  };
  main();
})();
