/**
 * Umbra M2 hitboxes: capsule-vs-capsule tests evaluated in facing space.
 * Pure functions, no DOM, no Math.random, no Date.now.
 */

/**
 * Strike interval of an attack rooted at ax and extending toward facing.
 * @param {number} ax attacker origin on the x axis
 * @param {1|-1} facing attacker facing
 * @param {number} range reach in arena units
 * @returns {{lo:number, hi:number}} closed interval covering the strike
 */
export function hitRange(ax, facing, range) {
  const x = Number(ax);
  const r = Math.max(0, Number(range));
  const f = facing === -1 ? -1 : 1;
  return f === 1 ? { lo: x, hi: x + r } : { lo: x - r, hi: x };
}

/**
 * Defender height above which grounded strikes whiff: a mid-jump fighter
 * dodges jabs, crosses, kicks, and sweeps. The rising uppercut is the
 * anti-air exception and connects at any height.
 */
export const AIR_DODGE_HEIGHT = 0.12;

/**
 * Test whether a defender point lies inside the attacker's strike interval.
 * @param {number} attX attacker origin
 * @param {1|-1} attFacing attacker facing
 * @param {number} range attack reach
 * @param {number} defX defender position
 * @param {number} [defY] defender height above ground (0 = grounded)
 * @param {string|null} [moveId] attacking move id ("uppercut" hits airborne)
 * @returns {boolean}
 */
export function attackHits(attX, attFacing, range, defX, defY = 0, moveId = null) {
  const { lo, hi } = hitRange(attX, attFacing, range);
  const d = Number(defX);
  if (!(d >= lo && d <= hi)) return false;
  const y = Number(defY);
  if (Number.isFinite(y) && y > AIR_DODGE_HEIGHT && moveId !== "uppercut") return false;
  return true;
}

function ptSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t - px;
  const qy = ay + dy * t - py;
  return Math.sqrt(qx * qx + qy * qy);
}

function orient(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSeg(ax, ay, bx, by, cx, cy) {
  return (
    cx >= Math.min(ax, bx) &&
    cx <= Math.max(ax, bx) &&
    cy >= Math.min(ay, by) &&
    cy <= Math.max(ay, by)
  );
}

function segsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  const EPS = 1e-12;
  if (Math.abs(o1) <= EPS && onSeg(ax, ay, bx, by, cx, cy)) return true;
  if (Math.abs(o2) <= EPS && onSeg(ax, ay, bx, by, dx, dy)) return true;
  if (Math.abs(o3) <= EPS && onSeg(cx, cy, dx, dy, ax, ay)) return true;
  if (Math.abs(o4) <= EPS && onSeg(cx, cy, dx, dy, bx, by)) return true;
  return false;
}

/**
 * Closest distance between 2D segments p1-p2 and p3-p4.
 * @returns {number} segment-segment distance (>= 0, finite for finite inputs)
 */
export function segSegDist(ax, ay, bx, by, cx, cy, dx, dy) {
  if (segsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
  return Math.min(
    ptSegDist(ax, ay, cx, cy, dx, dy),
    ptSegDist(bx, by, cx, cy, dx, dy),
    ptSegDist(cx, cy, ax, ay, bx, by),
    ptSegDist(dx, dy, ax, ay, bx, by),
  );
}

function radiusOf(seg, fallback) {
  if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
  if (seg != null && typeof seg === "object") {
    if (typeof seg.r === "number" && Number.isFinite(seg.r)) return seg.r;
    if (typeof seg.w === "number" && Number.isFinite(seg.w)) return seg.w / 2;
  }
  return 0;
}

/**
 * Capsule-pair overlap: segment-segment distance < r1 + r2.
 *
 * Accepts either segment objects,
 *   segmentsOverlap({ax,ay,bx,by,r?|w?}, {ax,ay,bx,by,r?|w?}, r1?, r2?)
 * or raw coordinates,
 *   segmentsOverlap(ax1,ay1,ax2,ay2, bx1,by1,bx2,by2, r1, r2).
 * @returns {boolean}
 */
export function segmentsOverlap(a, b, c, d, e, f, g, h, r1, r2) {
  let ax;
  let ay;
  let bx;
  let by;
  let cx;
  let cy;
  let dx;
  let dy;
  let rad1;
  let rad2;
  if (a != null && typeof a === "object" && b != null && typeof b === "object") {
    ({ ax, ay, bx, by } = a);
    ({ ax: cx, ay: cy, bx: dx, by: dy } = b);
    rad1 = radiusOf(a, c);
    rad2 = radiusOf(b, d);
  } else {
    [ax, ay, bx, by, cx, cy, dx, dy] = [a, b, c, d, e, f, g, h];
    rad1 = typeof r1 === "number" && Number.isFinite(r1) ? r1 : 0;
    rad2 = typeof r2 === "number" && Number.isFinite(r2) ? r2 : 0;
  }
  const dist = segSegDist(ax, ay, bx, by, cx, cy, dx, dy);
  if (!Number.isFinite(dist)) return false;
  return dist < rad1 + rad2;
}
