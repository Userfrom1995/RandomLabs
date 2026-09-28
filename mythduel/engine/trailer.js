// Mythduel trailer engine: pure functions over story/trailer.json.
//
// The trailer is a 25-35 s cut assembled from windows of the final timeline:
// each cut names a beat plus absolute duel seconds for in/out. Trailer mode
// plays the cuts back to back on a trailer clock; this module maps that
// clock back onto duel time so the stage paints identical pixels in both
// modes. No DOM, no clock, no I/O: shared by the browser player, the audit
// tool, and the premiere suite identically.
import { frameTime } from './frames.js';

export const TRAILER_MIN = 25;
export const TRAILER_MAX = 35;

export function buildTrailerPlan(tl, trailer) {
  if (!tl || !Array.isArray(tl.beats) || tl.beats.length === 0) {
    throw new Error('trailer needs a timeline with beats');
  }
  if (!trailer || !Array.isArray(trailer.cuts) || trailer.cuts.length === 0) {
    throw new Error('trailer.cuts must be a non-empty array');
  }
  let trailerStart = 0;
  let lastBeatStart = -1;
  const cuts = trailer.cuts.map((c, i) => {
    const beat = tl.beats.find((b) => b.id === c.beat);
    if (!beat) throw new Error('trailer cut ' + i + ' names an unknown beat: ' + c.beat);
    if (!Number.isFinite(c.tIn) || !Number.isFinite(c.tOut) || !(c.tIn < c.tOut)) {
      throw new Error('trailer cut ' + i + ' has an empty or non-finite window');
    }
    if (c.tIn < beat.start - 1e-9 || c.tOut > beat.end + 1e-9) {
      throw new Error('trailer cut ' + i + ' overflows beat ' + c.beat);
    }
    const tIn = frameTime(c.tIn);
    const tOut = frameTime(c.tOut);
    if (!(tIn < tOut)) throw new Error('trailer cut ' + i + ' collapses on the frame grid');
    if (beat.start < lastBeatStart) throw new Error('trailer cut ' + i + ' runs before the previous cut');
    lastBeatStart = beat.start;
    const dur = tOut - tIn;
    const planned = {
      index: i,
      beat: beat.id,
      beatTitle: beat.title,
      tIn,
      tOut,
      dur,
      note: c.note || '',
      trailerStart,
      trailerEnd: trailerStart + dur,
    };
    trailerStart += dur;
    return planned;
  });
  const total = trailerStart;
  if (!(total >= TRAILER_MIN && total <= TRAILER_MAX)) {
    throw new Error('trailer total ' + total + 's sits outside ' + TRAILER_MIN + '-' + TRAILER_MAX + 's');
  }
  return { cuts, total };
}

// Map a trailer-clock instant onto duel time: which cut is playing, the
// exact duel second to paint, and the cut progress for the caption band.
// Clamps past the end onto the final cut's last frame.
export function trailerCutAt(plan, trailerT) {
  if (!plan || !Array.isArray(plan.cuts) || plan.cuts.length === 0) {
    throw new Error('trailerCutAt needs a built plan');
  }
  const t = Number.isFinite(trailerT) ? Math.max(trailerT, 0) : 0;
  const last = plan.cuts[plan.cuts.length - 1];
  if (t >= plan.total) {
    return { cut: last, cutIndex: last.index, duelTime: frameTime(last.tOut - 0.001), progress: 1 };
  }
  for (const cut of plan.cuts) {
    if (t < cut.trailerEnd || cut.index === last.index) {
      const duelTime = frameTime(Math.min(cut.tIn + (t - cut.trailerStart), cut.tOut - 0.001));
      return { cut, cutIndex: cut.index, duelTime, progress: (duelTime - cut.tIn) / cut.dur };
    }
  }
  return { cut: last, cutIndex: last.index, duelTime: frameTime(last.tOut - 0.001), progress: 1 };
}
