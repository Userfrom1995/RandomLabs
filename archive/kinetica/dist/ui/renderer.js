export function drawWorld(ctx, world, opts, manifolds) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const dpr = window.devicePixelRatio || 1;
    // clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    // world to screen: world y up, screen y down. World origin at canvas center bottom-ish.
    const scale = 32; // px per meter
    const ox = W / (2 * dpr);
    const oy = H / dpr - 60;
    function toScreen(p) {
        return { x: ox + p.x * scale, y: oy - p.y * scale };
    }
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = -12; x <= 12; x++) {
        const a = toScreen({ x, y: -5 }), b = toScreen({ x, y: 20 });
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    for (let y = 0; y <= 20; y += 2) {
        const a = toScreen({ x: -12, y }), b = toScreen({ x: 12, y });
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    // bodies
    for (const body of world.bodies) {
        if (body.shape.kind === 'circle') {
            const c = toScreen(body.p);
            const r = body.shape.radius * scale;
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
            ctx.fillStyle = body.isStatic ? '#334155' : body.sleeping ? '#475569' : '#4fd1c5';
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // orientation line
            const ax = c.x + Math.cos(body.q) * r * 0.7;
            const ay = c.y - Math.sin(body.q) * r * 0.7;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(ax, ay);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        else {
            const pts = body.shape.worldVerts.map(toScreen);
            if (pts.length === 0)
                continue;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++)
                ctx.lineTo(pts[i].x, pts[i].y);
            ctx.closePath();
            ctx.fillStyle = body.isStatic ? '#334155' : body.sleeping ? '#475569' : '#60a5fa';
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // COM dot
            const cp = toScreen(body.p);
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#f472b6';
            ctx.fill();
        }
        if (opts.showAABBs) {
            // compute aabb
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            if (body.shape.kind === 'circle') {
                minX = body.p.x - body.shape.radius;
                maxX = body.p.x + body.shape.radius;
                minY = body.p.y - body.shape.radius;
                maxY = body.p.y + body.shape.radius;
            }
            else {
                for (const v of body.shape.worldVerts) {
                    minX = Math.min(minX, v.x);
                    maxX = Math.max(maxX, v.x);
                    minY = Math.min(minY, v.y);
                    maxY = Math.max(maxY, v.y);
                }
            }
            const a = toScreen({ x: minX, y: maxY });
            const b = toScreen({ x: maxX, y: minY });
            ctx.strokeStyle = 'rgba(251,191,36,0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        }
        if (opts.showVelocities && !body.isStatic) {
            const p = toScreen(body.p);
            const v = { x: body.v.x * 0.3, y: body.v.y * 0.3 };
            const q = toScreen({ x: body.p.x + v.x, y: body.p.y + v.y });
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    // joints
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    for (const j of world.joints) {
        const a = world.bodies.find(b => b.id === j.A);
        const b = world.bodies.find(b => b.id === j.B);
        if (!a || !b)
            continue;
        const pa = toScreen(a.p);
        const pb = toScreen(b.p);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        // anchors
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pb.x, pb.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    // contacts
    if (opts.showContacts && manifolds) {
        for (const m of manifolds) {
            for (const cp of m.points) {
                const p = toScreen(cp.point);
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#e879f9';
                ctx.fill();
                const nlen = 16;
                const q = toScreen({ x: cp.point.x + m.normal.x * 0.5, y: cp.point.y + m.normal.y * 0.5 });
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.strokeStyle = '#e879f9';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
}
export function worldFromScreen(canvas, sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width, H = canvas.height;
    const scale = 32;
    const ox = W / (2 * dpr);
    const oy = H / dpr - 60;
    const x = (sx - rect.left - 0) / 1; // sx is clientX - rect.left already? We'll handle in main
    // caller passes canvas-relative coords
    // convert: screen px = ox + world.x * scale  => world.x = (screen - ox)/scale
    // screen y = oy - world.y * scale => world.y = (oy - screen)/scale
    return { x: (sx - ox) / scale, y: (oy - sy) / scale };
}
//# sourceMappingURL=renderer.js.map