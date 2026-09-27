import { vSub, vDot, vAdd, vScale, vLength, vNeg } from '../core/vec2.js';
import { getWorldNormals } from '../core/shapes.js';
export function collide(A, B) {
    const sa = A.shape, sb = B.shape;
    if (sa.kind === 'circle' && sb.kind === 'circle')
        return circleCircle(A, B);
    if (sa.kind === 'circle' && sb.kind === 'polygon') {
        const m = circlePolygon(B, A); // B poly, A circle ; need to flip normal
        if (m) {
            m.normal = vNeg(m.normal);
            const tmp = m.A;
            m.A = m.B;
            m.B = tmp;
        }
        return m;
    }
    if (sa.kind === 'polygon' && sb.kind === 'circle')
        return circlePolygon(A, B);
    if (sa.kind === 'polygon' && sb.kind === 'polygon')
        return polygonPolygon(A, B);
    return null;
}
function circleCircle(A, B) {
    const ca = A.shape;
    const cb = B.shape;
    const d = vSub(B.p, A.p);
    const dist = vLength(d);
    const r = ca.radius + cb.radius;
    if (dist > r)
        return null;
    let n;
    if (dist < 1e-9)
        n = { x: 1, y: 0 };
    else
        n = { x: d.x / dist, y: d.y / dist };
    const penetration = r - dist;
    const point = { x: A.p.x + n.x * (ca.radius - penetration / 2), y: A.p.y + n.y * (ca.radius - penetration / 2) };
    return { A: A.id, B: B.id, normal: n, points: [{ point, penetration, Pn: 0, Pt: 0, featureId: 0 }] };
}
function circlePolygon(polyBody, circleBody) {
    const poly = polyBody.shape;
    const circle = circleBody.shape;
    const center = circleBody.p;
    const normals = getWorldNormals(poly, polyBody.q);
    const verts = poly.worldVerts;
    const nVerts = verts.length;
    // Find max separation (most positive distance from face to circle center)
    let bestDist = -Infinity;
    let bestIdx = -1;
    for (let i = 0; i < nVerts; i++) {
        const n = normals[i];
        const v = verts[i];
        const d = vDot(n, vSub(center, v));
        if (d > bestDist) {
            bestDist = d;
            bestIdx = i;
        }
    }
    if (bestDist > circle.radius)
        return null;
    // Find closest feature
    // Determine if center is inside poly (all separations <=0)
    let normal;
    let penetration;
    let point;
    let featureId;
    if (bestDist < 0) {
        // center inside the polygon: manifold normal points from poly to circle (opposite the face normal)
        normal = vNeg(normals[bestIdx]);
        const faceV = verts[bestIdx];
        const faceNext = verts[(bestIdx + 1) % nVerts];
        const edge = vSub(faceNext, faceV);
        const edgeLen2 = edge.x * edge.x + edge.y * edge.y;
        let t = edgeLen2 > 1e-12 ? vDot(vSub(center, faceV), edge) / edgeLen2 : 0;
        t = Math.max(0, Math.min(1, t));
        const closestOnFace = { x: faceV.x + edge.x * t, y: faceV.y + edge.y * t };
        // contact point is the midpoint between the face and the circle center
        point = { x: (closestOnFace.x + center.x) / 2, y: (closestOnFace.y + center.y) / 2 };
        penetration = circle.radius - bestDist;
        featureId = bestIdx;
    }
    else {
        // outside: check Voronoi region
        const bestN = normals[bestIdx];
        const v0 = verts[bestIdx];
        const v1 = verts[(bestIdx + 1) % nVerts];
        const edge = vSub(v1, v0);
        const edgeLen2 = edge.x * edge.x + edge.y * edge.y;
        let t = edgeLen2 > 1e-12 ? vDot(vSub(center, v0), edge) / edgeLen2 : 0;
        if (t < 0) {
            // closest to v0 vertex
            const toCenter = vSub(center, v0);
            const dist = vLength(toCenter);
            if (dist > circle.radius)
                return null;
            if (dist < 1e-9) {
                normal = vNeg(bestN);
            }
            else
                normal = { x: toCenter.x / dist, y: toCenter.y / dist };
            // normal should be poly->circle => toCenter normalized
            penetration = circle.radius - dist;
            point = { x: v0.x + normal.x * (dist / 2), y: v0.y + normal.y * (dist / 2) };
            if (penetration < -1e-9)
                return null;
            featureId = bestIdx * 100 + 77;
        }
        else if (t > 1) {
            const toCenter = vSub(center, v1);
            const dist = vLength(toCenter);
            if (dist > circle.radius)
                return null;
            if (dist < 1e-9) {
                normal = vNeg(bestN);
            }
            else
                normal = { x: toCenter.x / dist, y: toCenter.y / dist };
            penetration = circle.radius - dist;
            point = { x: v1.x + normal.x * (dist / 2), y: v1.y + normal.y * (dist / 2) };
            featureId = bestIdx * 100 + 78;
        }
        else {
            // face region
            const dist = vDot(bestN, vSub(center, v0));
            if (dist > circle.radius)
                return null;
            normal = bestN; // poly->circle is outward
            penetration = circle.radius - dist;
            // contact point: center - normal * radius/?
            point = { x: center.x - normal.x * (circle.radius - penetration / 2), y: center.y - normal.y * (circle.radius - penetration / 2) };
            featureId = bestIdx * 100 + 79;
        }
    }
    return { A: polyBody.id, B: circleBody.id, normal, points: [{ point, penetration, Pn: 0, Pt: 0, featureId }] };
}
function polygonPolygon(A, B) {
    const polyA = A.shape;
    const polyB = B.shape;
    const normalsA = getWorldNormals(polyA, A.q);
    const normalsB = getWorldNormals(polyB, B.q);
    const vertsA = polyA.worldVerts;
    const vertsB = polyB.worldVerts;
    let bestPenA = -Infinity, bestIdxA = -1;
    for (let i = 0; i < normalsA.length; i++) {
        const n = normalsA[i];
        const v = vertsA[i];
        // support B along -n => minimal distance
        let min = Infinity;
        for (const vb of vertsB) {
            const d = vDot(n, vSub(vb, v));
            if (d < min)
                min = d;
        }
        if (min > 0)
            return null;
        if (min > bestPenA) {
            bestPenA = min;
            bestIdxA = i;
        }
    }
    let bestPenB = -Infinity, bestIdxB = -1;
    for (let i = 0; i < normalsB.length; i++) {
        const n = normalsB[i];
        const v = vertsB[i];
        let min = Infinity;
        for (const va of vertsA) {
            const d = vDot(n, vSub(va, v));
            if (d < min)
                min = d;
        }
        if (min > 0)
            return null;
        if (min > bestPenB) {
            bestPenB = min;
            bestIdxB = i;
        }
    }
    // choose reference
    let refPoly, incPoly;
    let refIdx, refNormal;
    let flip = false;
    if (bestPenA > bestPenB) {
        refPoly = { verts: vertsA, normals: normalsA, bodyId: A.id };
        incPoly = { verts: vertsB, normals: normalsB, bodyId: B.id };
        refIdx = bestIdxA;
        refNormal = normalsA[bestIdxA];
        flip = false; // ref is A, normal A->B is outward of A
    }
    else {
        refPoly = { verts: vertsB, normals: normalsB, bodyId: B.id };
        incPoly = { verts: vertsA, normals: normalsA, bodyId: A.id };
        refIdx = bestIdxB;
        refNormal = normalsB[bestIdxB];
        flip = true; // ref is B, normal currently B->A, need to flip to A->B
    }
    let manifoldNormal = flip ? vNeg(refNormal) : refNormal;
    // find incident face: most anti-parallel to refNormal
    let incIdx = -1;
    let minDot = Infinity;
    for (let i = 0; i < incPoly.normals.length; i++) {
        const d = vDot(incPoly.normals[i], refNormal);
        if (d < minDot) {
            minDot = d;
            incIdx = i;
        }
    }
    const incV0 = incPoly.verts[incIdx];
    const incV1 = incPoly.verts[(incIdx + 1) % incPoly.verts.length];
    // clip incident face against side planes of reference face
    const refV0 = refPoly.verts[refIdx];
    const refV1 = refPoly.verts[(refIdx + 1) % refPoly.verts.length];
    const refEdge = vSub(refV1, refV0);
    const refLen = vLength(refEdge);
    if (refLen < 1e-12)
        return null;
    const refDir = { x: refEdge.x / refLen, y: refEdge.y / refLen };
    // side planes: through refV0 and refV1, with normals along refDir and -refDir
    // Actually side planes are perpendicular to ref edge: plane normals are +-refDir, points refV0/refV1
    // Clip segment against two side planes: keep points within [refV0, refV1] projection
    // clip incident face segment against the two side planes of the reference face
    let clipped = [incV0, incV1];
    // clip against plane at refV0, normal -refDir? keep dot(p - refV0, refDir) >=0
    clipped = clipAgainstPlane(clipped, refV0, vNeg(refDir));
    if (clipped.length === 0)
        return null;
    clipped = clipAgainstPlane(clipped, refV1, refDir);
    if (clipped.length === 0)
        return null;
    // penetration measured along the reference face normal (positive when overlapping)
    const points = [];
    for (const p of clipped) {
        const penVal = -vDot(refNormal, vSub(p, refV0));
        if (penVal < -0.01)
            continue; // allow small negative slop
        const pen = Math.max(penVal, 0);
        points.push({ point: { ...p }, penetration: pen, Pn: 0, Pt: 0, featureId: refIdx * 100 + incIdx });
    }
    if (points.length === 0)
        return null;
    // we want up to 2 points; if 1 keep it; if 2 keep both; if more than 2? shouldn't happen (2 max)
    // ensure normal is A->B consistently: manifoldNormal already correct
    // For ref A, normal is already A->B; for ref B, manifoldNormal is A->B as computed.
    // deduplicate points that are very close
    if (points.length === 2) {
        const d2 = (points[0].point.x - points[1].point.x) ** 2 + (points[0].point.y - points[1].point.y) ** 2;
        if (d2 < 1e-8)
            points.pop();
    }
    return { A: A.id, B: B.id, normal: manifoldNormal, points };
}
function clipAgainstPlane(pts, planePoint, planeNormal) {
    // keep points where dot(p - planePoint, planeNormal) <= 0
    if (pts.length < 2)
        return pts;
    const a = pts[0], b = pts[1];
    const da = vDot(vSub(a, planePoint), planeNormal);
    const db = vDot(vSub(b, planePoint), planeNormal);
    const insideA = da <= 0;
    const insideB = db <= 0;
    if (insideA && insideB)
        return [a, b];
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
//# sourceMappingURL=narrowphase.js.map