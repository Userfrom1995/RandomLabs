import type { Body } from '../core/body.js';
import type { Vec2 } from '../core/vec2.js';
import { vSub, vDot, vAdd, vScale, vLength, vPerp, vNeg } from '../core/vec2.js';
import { getWorldNormals } from '../core/shapes.js';
import type { Manifold, ContactPoint } from './manifold.js';

export function collide(A: Body, B: Body): Manifold | null {
  const sa = A.shape, sb = B.shape;
  if (sa.kind === 'circle' && sb.kind === 'circle') return circleCircle(A, B);
  if (sa.kind === 'circle' && sb.kind === 'polygon') {
    const m = circlePolygon(B, A); // B poly, A circle ; need to flip normal
    if (m) { m.normal = vNeg(m.normal); const tmp = m.A; m.A = m.B; m.B = tmp; }
    return m;
  }
  if (sa.kind === 'polygon' && sb.kind === 'circle') return circlePolygon(A, B);
  if (sa.kind === 'polygon' && sb.kind === 'polygon') return polygonPolygon(A, B);
  return null;
}

function circleCircle(A: Body, B: Body): Manifold | null {
  const ca = A.shape as { kind: 'circle'; radius: number };
  const cb = B.shape as { kind: 'circle'; radius: number };
  const d = vSub(B.p, A.p);
  const dist = vLength(d);
  const r = ca.radius + cb.radius;
  if (dist > r) return null;
  let n: Vec2;
  if (dist < 1e-9) n = { x: 1, y: 0 };
  else n = { x: d.x / dist, y: d.y / dist };
  const penetration = r - dist;
  const point = { x: A.p.x + n.x * (ca.radius - penetration / 2), y: A.p.y + n.y * (ca.radius - penetration / 2) };
  return { A: A.id, B: B.id, normal: n, points: [{ point, penetration, Pn: 0, Pt: 0, featureId: 0 }] };
}

function circlePolygon(polyBody: Body, circleBody: Body): Manifold | null {
  const poly = polyBody.shape as import('../core/shapes.js').Polygon;
  const circle = circleBody.shape as { kind: 'circle'; radius: number };
  const center = circleBody.p;
  const normals = getWorldNormals(poly, polyBody.q);
  const verts = poly.worldVerts;
  const nVerts = verts.length;

  // Find max separation (most positive distance from face to circle center)
  let bestDist = -Infinity;
  let bestIdx = -1;
  for (let i = 0; i < nVerts; i++) {
    const n = normals[i]!;
    const v = verts[i]!;
    const d = vDot(n, vSub(center, v));
    if (d > bestDist) { bestDist = d; bestIdx = i; }
  }
  if (bestDist > circle.radius) return null;

  // Find closest feature
  // Determine if center is inside poly (all separations <=0)
  let normal: Vec2;
  let penetration: number;
  let point: Vec2;
  let featureId: number;

  if (bestDist < 0) {
    // inside: normal is face normal pointing from poly to circle? actually we want A->B (poly->circle)
    // best face is closest wall; normal is that face normal
    normal = normals[bestIdx]!;
    penetration = circle.radius - bestDist; // wait bestDist negative, so radius - negative = radius+|dist|
    // contact point: circle center projected onto face? or along -normal
    // For inside, push circle out along -normal? But we want normal from poly to circle = -best normal? Hmm.
    // If center inside, the separation is negative, meaning center is on interior side.
    // The normal from poly to circle should point opposite to face normal (into interior). Actually face normals are outward.
    // If center inside, outward normal points away from center, so center is opposite to normal. So poly->circle is -normal.
    // But our bestDist = dot(n, center - v) negative means center is inside relative to that face.
    // So to push circle out, move along -n.
    // Let's use -n as manifold normal (poly->circle).
    normal = vNeg(normal);
    // contact point is on circle surface along normal? compute penetration as radius + bestDist? bestDist negative so radius + dist_in?
    // penetration should be radius - (-dist_to_face)? Actually distance from center to face = -bestDist (positive inside).
    // penetration = radius + (something)? For inside, contact point is circle center + normal * radius ?? Wait.
    // Simpler: penetration = circle.radius - bestDist  (since bestDist negative)
    // point = center + normal * ( -radius + penetration/2?) Use generic midpoint.
    // Use point on face closest to center
    const faceV = verts[bestIdx]!;
    // project center onto face line: closest point on face segment
    const faceNext = verts[(bestIdx + 1) % nVerts]!;
    const edge = vSub(faceNext, faceV);
    const edgeLen2 = edge.x * edge.x + edge.y * edge.y;
    let t = edgeLen2 > 1e-12 ? vDot(vSub(center, faceV), edge) / edgeLen2 : 0;
    t = Math.max(0, Math.min(1, t));
    const closestOnFace = { x: faceV.x + edge.x * t, y: faceV.y + edge.y * t };
    point = { x: (closestOnFace.x + center.x) / 2, y: (closestOnFace.y + center.y) / 2 }; // midpoint approx
    penetration = circle.radius - bestDist;
    featureId = bestIdx;
  } else {
    // outside: check Voronoi region
    const bestN = normals[bestIdx]!;
    const v0 = verts[bestIdx]!;
    const v1 = verts[(bestIdx + 1) % nVerts]!;
    const edge = vSub(v1, v0);
    const edgeLen2 = edge.x * edge.x + edge.y * edge.y;
    let t = edgeLen2 > 1e-12 ? vDot(vSub(center, v0), edge) / edgeLen2 : 0;
    if (t < 0) {
      // closest to v0 vertex
      const toCenter = vSub(center, v0);
      const dist = vLength(toCenter);
      if (dist > circle.radius) return null;
      if (dist < 1e-9) { normal = vNeg(bestN); } else normal = { x: toCenter.x / dist, y: toCenter.y / dist };
      // normal should be poly->circle => toCenter normalized
      penetration = circle.radius - dist;
      point = { x: v0.x + normal.x * (dist / 2), y: v0.y + normal.y * (dist / 2) };
      if (penetration < -1e-9) return null;
      featureId = bestIdx * 100 + 77;
    } else if (t > 1) {
      const toCenter = vSub(center, v1);
      const dist = vLength(toCenter);
      if (dist > circle.radius) return null;
      if (dist < 1e-9) { normal = vNeg(bestN); } else normal = { x: toCenter.x / dist, y: toCenter.y / dist };
      penetration = circle.radius - dist;
      point = { x: v1.x + normal.x * (dist / 2), y: v1.y + normal.y * (dist / 2) };
      featureId = bestIdx * 100 + 78;
    } else {
      // face region
      const dist = vDot(bestN, vSub(center, v0));
      if (dist > circle.radius) return null;
      normal = bestN; // poly->circle is outward
      penetration = circle.radius - dist;
      // contact point: center - normal * radius/?
      point = { x: center.x - normal.x * (circle.radius - penetration / 2), y: center.y - normal.y * (circle.radius - penetration / 2) };
      featureId = bestIdx * 100 + 79;
    }
  }
  return { A: polyBody.id, B: circleBody.id, normal, points: [{ point, penetration, Pn: 0, Pt: 0, featureId }] };
}

function polygonPolygon(A: Body, B: Body): Manifold | null {
  const polyA = A.shape as import('../core/shapes.js').Polygon;
  const polyB = B.shape as import('../core/shapes.js').Polygon;
  const normalsA = getWorldNormals(polyA, A.q);
  const normalsB = getWorldNormals(polyB, B.q);
  const vertsA = polyA.worldVerts;
  const vertsB = polyB.worldVerts;

  let bestPenA = -Infinity, bestIdxA = -1;
  for (let i = 0; i < normalsA.length; i++) {
    const n = normalsA[i]!;
    const v = vertsA[i]!;
    // support B along -n => minimal distance
    let min = Infinity;
    for (const vb of vertsB) { const d = vDot(n, vSub(vb, v)); if (d < min) min = d; }
    if (min > 0) return null;
    if (min > bestPenA) { bestPenA = min; bestIdxA = i; }
  }
  let bestPenB = -Infinity, bestIdxB = -1;
  for (let i = 0; i < normalsB.length; i++) {
    const n = normalsB[i]!;
    const v = vertsB[i]!;
    let min = Infinity;
    for (const va of vertsA) { const d = vDot(n, vSub(va, v)); if (d < min) min = d; }
    if (min > 0) return null;
    if (min > bestPenB) { bestPenB = min; bestIdxB = i; }
  }
  // choose reference
  let refPoly: { verts: Vec2[]; normals: Vec2[]; bodyId: number }, incPoly: { verts: Vec2[]; normals: Vec2[]; bodyId: number };
  let refIdx: number, refNormal: Vec2;
  let flip = false;
  if (bestPenA > bestPenB) {
    refPoly = { verts: vertsA, normals: normalsA, bodyId: A.id };
    incPoly = { verts: vertsB, normals: normalsB, bodyId: B.id };
    refIdx = bestIdxA; refNormal = normalsA[bestIdxA]!;
    flip = false; // ref is A, normal A->B is outward of A
  } else {
    refPoly = { verts: vertsB, normals: normalsB, bodyId: B.id };
    incPoly = { verts: vertsA, normals: normalsA, bodyId: A.id };
    refIdx = bestIdxB; refNormal = normalsB[bestIdxB]!;
    flip = true; // ref is B, normal currently B->A, need to flip to A->B
  }
  let manifoldNormal = flip ? vNeg(refNormal) : refNormal;

  // find incident face: most anti-parallel to refNormal
  let incIdx = -1;
  let minDot = Infinity;
  for (let i = 0; i < incPoly.normals.length; i++) {
    const d = vDot(incPoly.normals[i]!, refNormal);
    if (d < minDot) { minDot = d; incIdx = i; }
  }
  const incV0 = incPoly.verts[incIdx]!;
  const incV1 = incPoly.verts[(incIdx + 1) % incPoly.verts.length]!;

  // clip incident face against side planes of reference face
  const refV0 = refPoly.verts[refIdx]!;
  const refV1 = refPoly.verts[(refIdx + 1) % refPoly.verts.length]!;
  const refEdge = vSub(refV1, refV0);
  const refLen = vLength(refEdge);
  if (refLen < 1e-12) return null;
  const refDir = { x: refEdge.x / refLen, y: refEdge.y / refLen };

  // side planes: through refV0 and refV1, with normals along refDir and -refDir
  // Actually side planes are perpendicular to ref edge: plane normals are +-refDir, points refV0/refV1
  // Clip segment against two side planes: keep points within [refV0, refV1] projection

  function clipSegment(ps: Vec2[], planePoint: Vec2, planeNormal: Vec2): Vec2[] {
    const out: Vec2[] = [];
    if (ps.length === 0) return out;
    // For Sutherland against a half-space defined by dot(p - planePoint, planeNormal) <= 0? Let's define keep if behind.
    // We want keep points where projection along refDir is within segment.
    // For plane at refV0 with normal -refDir: keep if dot(p - refV0, -refDir) <=0 => dot(p - refV0, refDir) >=0
    // For plane at refV1 with normal refDir: keep if dot(p - refV1, refDir) <=0
    // So two cases:
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i]!, b = ps[(i + 1) % ps.length]!; // actually just 2 points
      // We'll implement generic segment clip for 2 points
      break;
    }
    return out;
  }

  // simpler: do segment clip manually for 2 points
  let clipped: Vec2[] = [incV0, incV1];
  // clip against plane at refV0, normal -refDir? keep dot(p - refV0, refDir) >=0
  clipped = clipAgainstPlane(clipped, refV0, vNeg(refDir));
  if (clipped.length === 0) return null;
  clipped = clipAgainstPlane(clipped, refV1, refDir);
  if (clipped.length === 0) return null;

  // Now compute penetration for each clipped point: dot(refNormal, refV0 - point) ??? Wait manifoldNormal is A->B.
  // If ref is A, refNormal is A->B, plane point refV0, penetration = dot(refNormal, point - refV0)? Let's use standard: penetration = -dot(refNormal, point - refV0) ??? need sign correct: if point is beyond ref face outward, it penetrates.
  // For ref A, face at refV0 with normal outward. A point on B inside A would be behind the face (negative dot). Penetration = -dot(n, p - v0).
  // Let's test: refV0 at origin, n=(0,1) pointing up from A? Actually think boxes stacked: A bottom box, B top box sitting on A. Ref could be top face of A (normal up). B bottom vertices slightly inside? B points have y slightly below top face? Then dot(n, p - v0) would be negative small? Hmm.
  // alternative formula: penetration = dot(n, v0 - p) ??? whichever yields positive when penetrating.
  // Use: penetration = -dot(refNormal, p - refV0)  => if p behind face, dot negative => penetration positive.
  const points: ContactPoint[] = [];
  for (const p of clipped) {
    // pen computed below via flip logic
    // But if ref was B (flip), refNormal originally pointed B->A? Wait we set manifoldNormal = -refNormal when flip. refNormal variable still holds original B outward.
    // Penetration should be measured along manifoldNormal (A->B). For flip case, manifoldNormal = -refNormal.
    // So we should compute penFlip = vDot(manifoldNormal, refV0 - p)? Let's make unified:
    // penetration = vDot(manifoldNormal, pRefClosest? Hmm.
    // Simpler: compute penetration along manifoldNormal: if ref is B, then B is incident? Wait confusion.
    // Let's recompute cleanly: penetration positive when bodies overlap along manifoldNormal.
    // For ref A case: manifoldNormal = refNormal (A->B). Penetration of incident point p (on B) relative to ref face: dot(manifoldNormal, ???)
    // As above penA = -dot(refNormal, p - refV0).
    // For ref B case: refNormal points B->A (since outward of B). manifoldNormal = -refNormal = A->B. Incident poly is A, point p on A. Penetration = -dot(refNormal_of_B, p - refV0_B)? Ref face is on B, point on A. For A below B, ref B bottom face normal points down (B outward down). p on A top face. dot(refNormal (down), p - refV0 (p below face?)? This gets messy.
    // Equivalent: penetration = dot(manifoldNormal, refV0 - p)? For ref A: manifold = refNormal, so dot(n, v0 - p) = -dot(n, p - v0) = same as before.
    // For ref B: manifold = -refNormal, so dot(manifold, v0 - p) = dot(-refN, v0 - p) = dot(refN, p - v0) = -(-dot(refN,...))??? Let's just compute flip pen = vDot(manifoldNormal, vSub(refV0, p)) ? Evaluate both produce positive when overlapping?
    // We can compute both and take max? Let's just compute pen = vDot(manifoldNormal, vSub(refV0, p)) ??? For ref A: pen = dot(n, v0 - p) = -dot(n,p - v0) correct.
    // For ref B: pen = dot(-refN, v0 - p) = dot(-refN, v0 - p). But -dot(refN, p - v0) = dot(refN, v0 - p) = - dot(-refN, v0 - p) = not same.
    // Let's unify: pen = dot(manifoldNormal, refV0 - p) ??? For ref A: manifold=refN => pen = dot(refN, v0 - p) = -dot(refN, p - v0) = earlier. For ref B: manifold=-refN => pen = dot(-refN, v0 - p) = dot(refN, p - v0). Which one is positive for overlap? Need to test with stacking.
    // Instead compute using absolute: penetration should be positive when p is on opposite side of face from normal. For ref A, interior of A is opposite normal? Actually outward is away from A interior. So B point inside A's expanded? Hard.
    // Let's just compute penAlt = vDot(manifoldNormal, vSub(p, refV0)) with sign flip? Might be easier to brute force: ensure penetration positive.
    // We'll compute penCandidate = -vDot(refNormal, vSub(p, refV0)) if not flip, else vDot(refNormal, vSub(p, refV0)).
    // Simplify: pen = flip ? vDot(refNormal, vSub(p, refV0)) : -vDot(refNormal, vSub(p, refV0));
    // Test flip case: ref B bottom face normal down (0,-1), p on A top (y slightly below B bottom). refV0 y = b_y - hh, p y = a_y + hh. If penetrating, p y < refV0? Actually B sits on A, so B bottom is above A top with small penetration => p y < refV0? Wait A top is at a_y + hh, B bottom at b_y - hh, penetration means B bottom below A top => b_y - hh < a_y + hh => p (A top point) is above B bottom => p y > refV0 y. Then p - v0 y positive, refNormal y = -1, dot = -1 * positive = negative, flip ? dot = negative => pen negative but we want positive penetration. So flip formula gives negative.
    // So maybe penetration = vDot(manifoldNormal, vSub(p, refV0))? For ref A case manifold up (0,1), p on B (B bottom) slight below top face: p y < refV0 y? Actually B bottom slight below A top => p y < v0 y => p - v0 negative => dot with up = negative => but penetration positive should be -dot.
    // Hmm.
    // Let's just compute penetration as absolute projection onto manifold and check logic via simulation test.
    let penVal: number;
    penVal = -vDot(refNormal, vSub(p, refV0));
    // But for flip we computed earlier dot(manifold, v0 - p)= dot(-refN, v0 - p)= dot(refN, p - v0)= same as vDot(refNormal, vSub(p, refV0))
    // So penVal as above.
    // Empirically ensure positive for overlap: if penVal <0, then no penetration? However for good manifold pen should be >= -tolerance.
    if (penVal < -0.01) continue; // allow small negative slop
    const pen = Math.max(penVal, 0);
    // contact point: use clipped point itself? Or mix? Keep clipped point
    points.push({ point: { ...p }, penetration: pen, Pn: 0, Pt: 0, featureId: refIdx * 100 + incIdx });
  }

  if (points.length === 0) return null;
  // we want up to 2 points; if 1 keep it; if 2 keep both; if more than 2? shouldn't happen (2 max)
  // ensure normal is A->B consistently: manifoldNormal already correct
  // For ref A, normal is already A->B; for ref B, manifoldNormal is A->B as computed.

  // deduplicate points that are very close
  if (points.length === 2) {
    const d2 = (points[0]!.point.x - points[1]!.point.x) ** 2 + (points[0]!.point.y - points[1]!.point.y) ** 2;
    if (d2 < 1e-8) points.pop();
  }

  return { A: A.id, B: B.id, normal: manifoldNormal, points };
}

function clipAgainstPlane(pts: Vec2[], planePoint: Vec2, planeNormal: Vec2): Vec2[] {
  // keep points where dot(p - planePoint, planeNormal) <= 0
  if (pts.length < 2) return pts;
  const a = pts[0]!, b = pts[1]!;
  const da = vDot(vSub(a, planePoint), planeNormal);
  const db = vDot(vSub(b, planePoint), planeNormal);
  const insideA = da <= 0;
  const insideB = db <= 0;
  if (insideA && insideB) return [a, b];
  if (insideA && !insideB) {
    const t = da / (da - db); // fraction from a to b where plane crossed
    const inter = vAdd(a, vScale(vSub(b, a), t));
    return [a, inter];
  }
  if (!insideA && insideB) {
    const t = da / (da - db);
    const inter = vAdd(a, vScale(vSub(b, a), t));
    return [inter, b];
  }
  return [];
}
