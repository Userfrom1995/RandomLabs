import { createBody, resetBodyIdCounter } from '../core/body.js';
import { createBox, createPolygon } from '../core/shapes.js';
import { hashState } from '../core/checksum.js';
import { buildScene } from '../sim/scenes.js';
import { drawWorld } from './renderer.js';
import { mulberry32 } from '../core/rng.js';
let world;
let seed = 42;
let paused = false;
let showAABBs = false;
let showContacts = false;
let showVelocities = false;
let enableSleep = true;
let gravityOn = true;
let lastManifolds = [];
let rng = mulberry32(seed);
function initWorld(scene) {
    resetBodyIdCounter();
    const s = scene;
    world = buildScene(s, seed);
    world.deterministicNoSleep = !enableSleep;
    world.gravity = gravityOn ? { x: 0, y: -9.81 } : { x: 0, y: 0 };
    rng = mulberry32(seed);
}
function spawn(type) {
    const x = (rng() - 0.5) * 6;
    const y = 10 + rng() * 4;
    if (type === 'box') {
        world.addBody(createBody({ shape: createBox(0.5, 0.5), p: { x, y }, q: (rng() - 0.5) * 0.5 }));
    }
    else if (type === 'circle') {
        const r = 0.3 + rng() * 0.3;
        world.addBody(createBody({ shape: { kind: 'circle', radius: r }, p: { x, y } }));
    }
    else if (type === 'poly') {
        const n = 3 + Math.floor(rng() * 4);
        const r = 0.4 + rng() * 0.3;
        const verts = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        world.addBody(createBody({ shape: createPolygon(verts), p: { x, y }, q: (rng() - 0.5) * Math.PI }));
    }
}
function setupCanvas() {
    const canvas = document.getElementById('canvas');
    const dpr = window.devicePixelRatio || 1;
    function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    return canvas;
}
function wireUI(canvas) {
    document.getElementById('btn-box').addEventListener('click', () => spawn('box'));
    document.getElementById('btn-circle').addEventListener('click', () => spawn('circle'));
    document.getElementById('btn-poly').addEventListener('click', () => spawn('poly'));
    document.getElementById('btn-reset').addEventListener('click', () => {
        const sel = document.getElementById('scene').value;
        initWorld(sel);
    });
    document.getElementById('btn-pause').addEventListener('click', () => { paused = !paused; document.getElementById('btn-pause').textContent = paused ? 'Resume' : 'Pause'; });
    document.getElementById('btn-step').addEventListener('click', () => { world.step(world.dt); });
    document.getElementById('btn-gravity').addEventListener('click', () => {
        gravityOn = !gravityOn;
        world.gravity = gravityOn ? { x: 0, y: -9.81 } : { x: 0, y: 0 };
        document.getElementById('btn-gravity').textContent = `Gravity: ${gravityOn ? 'ON' : 'OFF'}`;
    });
    document.getElementById('chk-aabb').addEventListener('change', (e) => { showAABBs = e.target.checked; });
    document.getElementById('chk-contacts').addEventListener('change', (e) => { showContacts = e.target.checked; });
    document.getElementById('chk-vel').addEventListener('change', (e) => { showVelocities = e.target.checked; });
    document.getElementById('chk-sleep').addEventListener('change', (e) => { enableSleep = e.target.checked; world.deterministicNoSleep = !enableSleep; });
    document.getElementById('scene').addEventListener('change', (e) => {
        seed = Number(document.getElementById('seed').value) || seed;
        initWorld(e.target.value);
    });
    document.getElementById('seed').addEventListener('change', (e) => {
        seed = Number(e.target.value) || 0;
        rng = mulberry32(seed);
        initWorld(document.getElementById('scene').value);
    });
    document.getElementById('btn-checksum').addEventListener('click', async () => {
        const cs = hashState(world.bodies);
        await navigator.clipboard.writeText(cs);
        const el = document.getElementById('checksum');
        const old = el.textContent;
        el.textContent = cs + ' (copied)';
        setTimeout(() => el.textContent = old, 1500);
    });
    // joint picking: simple two-click
    let picked = [];
    canvas.addEventListener('click', (e) => {
        if (!(e.shiftKey || document.getElementById('chk-joint')?.checked))
            return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        // world from screen
        const scale = 32;
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.width, H = canvas.height;
        const ox = W / (2 * dpr);
        const oy = H / dpr - 60;
        const wx = (sx - ox) / scale;
        const wy = (oy - sy) / scale;
        // find closest body
        let best = null;
        let bestD = 2;
        for (const b of world.bodies) {
            const d = Math.hypot(b.p.x - wx, b.p.y - wy);
            const rad = b.shape.kind === 'circle' ? b.shape.radius : 1.0;
            if (d < bestD && d < rad + 1) {
                bestD = d;
                best = b;
            }
        }
        if (!best)
            return;
        picked.push(best.id);
        if (picked.length === 2) {
            const mode = document.getElementById('joint-type').value;
            const A = picked[0], B = picked[1];
            const bA = world.bodies.find(b => b.id === A), bB = world.bodies.find(b => b.id === B);
            if (mode === 'revolute') {
                const mid = { x: (bA.p.x + bB.p.x) / 2, y: (bA.p.y + bB.p.y) / 2 };
                // create revolute at midpoint
                const ca = Math.cos(bA.q), sa = Math.sin(bA.q);
                const cb = Math.cos(bB.q), sb = Math.sin(bB.q);
                const dA = { x: mid.x - bA.p.x, y: mid.y - bA.p.y };
                const dB = { x: mid.x - bB.p.x, y: mid.y - bB.p.y };
                const localA = { x: dA.x * ca + dA.y * sa, y: -dA.x * sa + dA.y * ca };
                const localB = { x: dB.x * cb + dB.y * sb, y: -dB.x * sb + dB.y * cb };
                world.addJoint({ kind: 'revolute', A, B, localAnchorA: localA, localAnchorB: localB, accImpulses: [0, 0] });
            }
            else if (mode === 'distance') {
                const anchorA = { ...bA.p }, anchorB = { ...bB.p };
                const ca = Math.cos(bA.q), sa = Math.sin(bA.q);
                const cb = Math.cos(bB.q), sb = Math.sin(bB.q);
                const dA = { x: anchorA.x - bA.p.x, y: anchorA.y - bA.p.y };
                const dB = { x: anchorB.x - bB.p.x, y: anchorB.y - bB.p.y };
                const localA = { x: dA.x * ca + dA.y * sa, y: -dA.x * sa + dA.y * ca };
                const localB = { x: dB.x * cb + dB.y * sb, y: -dB.x * sb + dB.y * cb };
                const len = Math.hypot(anchorB.x - anchorA.x, anchorB.y - anchorA.y);
                world.addJoint({ kind: 'distance', A, B, localAnchorA: localA, localAnchorB: localB, length: len, accImpulses: [0] });
            }
            picked = [];
        }
    });
    // mouse fling: drag
    let dragStart = null;
    let dragBody = null;
    canvas.addEventListener('mousedown', (e) => {
        if (e.shiftKey)
            return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const scale = 32;
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.width, H = canvas.height;
        const ox = W / (2 * dpr);
        const oy = H / dpr - 60;
        const wx = (sx - ox) / scale, wy = (oy - sy) / scale;
        for (const b of world.bodies) {
            if (b.isStatic)
                continue;
            const d = Math.hypot(b.p.x - wx, b.p.y - wy);
            const rad = b.shape.kind === 'circle' ? b.shape.radius : 0.9;
            if (d < rad + 0.5) {
                dragBody = b;
                dragStart = { x: wx, y: wy };
                break;
            }
        }
    });
    canvas.addEventListener('mouseup', (e) => {
        if (!dragStart || !dragBody) {
            dragStart = null;
            dragBody = null;
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const scale = 32;
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.width, H = canvas.height;
        const ox = W / (2 * dpr);
        const oy = H / dpr - 60;
        const wx = (sx - ox) / scale, wy = (oy - sy) / scale;
        const dx = wx - dragStart.x, dy = wy - dragStart.y;
        const impulse = { x: dx * 8, y: dy * 8 };
        // apply impulse at center
        dragBody.v.x += impulse.x * dragBody.invMass;
        dragBody.v.y += impulse.y * dragBody.invMass;
        if (dragBody.sleeping) {
            dragBody.sleeping = false;
            dragBody.sleepTimer = 0;
        }
        dragStart = null;
        dragBody = null;
    });
}
function main() {
    const canvas = setupCanvas();
    const ctx = canvas.getContext('2d');
    initWorld('stack');
    wireUI(canvas);
    let lastT = performance.now();
    let frames = 0, lastFpsT = lastT, fps = 0;
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - lastT) / 1000, 0.1);
        lastT = now;
        frames++;
        if (now - lastFpsT > 500) {
            fps = Math.round(frames * 1000 / (now - lastFpsT));
            frames = 0;
            lastFpsT = now;
        }
        if (!paused) {
            world.stepFrame(dt);
        }
        // collect manifolds for debug (lightweight: we already have broadphase inside step; for viz we recompute narrowphase briefly)
        // Instead we just draw without manifolds unless we capture via patching - skip heavy recompute for now
        // We capture last manifolds by hooking world.step? For simplicity skip and set empty
        drawWorld(ctx, world, { showAABBs, showContacts, showVelocities }, lastManifolds);
        // telemetry
        document.getElementById('fps').textContent = String(fps);
        document.getElementById('body-count').textContent = String(world.bodies.length);
        document.getElementById('checksum').textContent = hashState(world.bodies);
        document.getElementById('ke').textContent = world.kineticEnergy().toFixed(3);
    }
    requestAnimationFrame(loop);
}
main();
//# sourceMappingURL=main.js.map