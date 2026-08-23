export function aabbFromBody(body) {
    const shape = body.shape;
    if (shape.kind === 'circle') {
        const r = shape.radius;
        return { minX: body.p.x - r, minY: body.p.y - r, maxX: body.p.x + r, maxY: body.p.y + r };
    }
    else {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const v of shape.worldVerts) {
            if (v.x < minX)
                minX = v.x;
            if (v.y < minY)
                minY = v.y;
            if (v.x > maxX)
                maxX = v.x;
            if (v.y > maxY)
                maxY = v.y;
        }
        // pad slightly
        const pad = 0.01;
        return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    }
}
export function aabbOverlap(a, b) {
    return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
//# sourceMappingURL=aabb.js.map