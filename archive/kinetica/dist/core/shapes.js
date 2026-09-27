import { vSub, vLength, vDot } from './vec2.js';
export function computeCircleMass(radius, density) {
    const mass = density * Math.PI * radius * radius;
    const inertia = 0.5 * mass * radius * radius;
    return { mass, invMass: mass > 0 ? 1 / mass : 0, inertia, invI: inertia > 0 ? 1 / inertia : 0 };
}
export function computePolygonMass(verts, density) {
    const n = verts.length;
    if (n < 3)
        return { mass: 0, invMass: 0, inertia: 0, invI: 0, centroid: { x: 0, y: 0 } };
    let area = 0;
    let cx = 0, cy = 0;
    let inertia = 0;
    for (let i = 0; i < n; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % n];
        const cross = a.x * b.y - b.x * a.y;
        area += cross;
        cx += (a.x + b.x) * cross;
        cy += (a.y + b.y) * cross;
    }
    area *= 0.5;
    const absArea = Math.abs(area);
    if (absArea < 1e-12)
        return { mass: 0, invMass: 0, inertia: 0, invI: 0, centroid: { x: 0, y: 0 } };
    cx /= 6 * area;
    cy /= 6 * area;
    const centroid = { x: cx, y: cy };
    // inertia about centroid: use parallel shift formula via summation
    // shift verts to centroid
    const shifted = verts.map(v => ({ x: v.x - cx, y: v.y - cy }));
    let I = 0;
    for (let i = 0; i < n; i++) {
        const a = shifted[i];
        const b = shifted[(i + 1) % n];
        const cross = a.x * b.y - b.x * a.y;
        const intx2 = a.x * a.x + a.x * b.x + b.x * b.x;
        const inty2 = a.y * a.y + a.y * b.y + b.y * b.y;
        I += cross * (intx2 + inty2);
    }
    I = (density * I) / 12;
    // abs because winding may be CW
    I = Math.abs(I);
    const mass = density * absArea;
    return { mass, invMass: mass > 0 ? 1 / mass : 0, inertia: I, invI: I > 1e-12 ? 1 / I : 0, centroid };
}
export function createPolygon(localVerts) {
    // Ensure CCW - compute area and reverse if needed
    let area2 = 0;
    for (let i = 0; i < localVerts.length; i++) {
        const a = localVerts[i], b = localVerts[(i + 1) % localVerts.length];
        area2 += a.x * b.y - b.x * a.y;
    }
    let verts = localVerts;
    if (area2 < 0)
        verts = [...localVerts].reverse();
    // compute centroid via mass props and recenter
    const md = computePolygonMass(verts, 1);
    const centered = verts.map(v => ({ x: v.x - md.centroid.x, y: v.y - md.centroid.y }));
    const normals = [];
    for (let i = 0; i < centered.length; i++) {
        const a = centered[i], b = centered[(i + 1) % centered.length];
        const edge = vSub(b, a);
        const len = vLength(edge);
        if (len < 1e-12) {
            normals.push({ x: 0, y: 1 });
            continue;
        }
        // outward normal for CCW: (edge.y? wait: for CCW interior is left of edge, outward is right)
        // edge (ex,ey), outward = (ey, -ex) normalized
        normals.push({ x: edge.y / len, y: -edge.x / len });
    }
    return { kind: 'polygon', localVerts: centered, worldVerts: centered.map(v => ({ ...v })), faceNormals: normals, centroid: { x: 0, y: 0 } };
}
export function createBox(hw, hh) {
    return createPolygon([
        { x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }
    ]);
}
export function updateWorldVerts(poly, pos, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let i = 0; i < poly.localVerts.length; i++) {
        const lv = poly.localVerts[i];
        poly.worldVerts[i] = { x: lv.x * c - lv.y * s + pos.x, y: lv.x * s + lv.y * c + pos.y };
    }
    // rotate normals
    // we store faceNormals in local? Actually stored as local but need world normals each step.
    // Instead caller should compute world normals on fly. We keep local normals implicitly.
    // For now worldVerts is updated; normals computed separately.
}
export function getWorldNormals(poly, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const out = [];
    for (let i = 0; i < poly.localVerts.length; i++) {
        const a = poly.localVerts[i], b = poly.localVerts[(i + 1) % poly.localVerts.length];
        const edge = vSub(b, a);
        const len = vLength(edge);
        if (len < 1e-12) {
            out.push({ x: 0, y: 1 });
            continue;
        }
        // local outward
        let nx = edge.y / len, ny = -edge.x / len;
        // rotate to world
        out.push({ x: nx * c - ny * s, y: nx * s + ny * c });
    }
    return out;
}
export function polygonSupport(poly, dir) {
    let best = poly.worldVerts[0];
    let bestDot = vDot(best, dir);
    for (let i = 1; i < poly.worldVerts.length; i++) {
        const d = vDot(poly.worldVerts[i], dir);
        if (d > bestDot) {
            bestDot = d;
            best = poly.worldVerts[i];
        }
    }
    return best;
}
//# sourceMappingURL=shapes.js.map