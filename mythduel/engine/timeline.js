// Mythduel timeline: pure functions over duel.json.
// No DOM, no clock, no I/O: shared by the browser player, the node audit
// tool, and the stills exporter identically.
export function buildTimeline(duel) {
  if (!duel || !Array.isArray(duel.beats) || duel.beats.length === 0) {
    throw new Error('duel.beats must be a non-empty array');
  }
  if (!Array.isArray(duel.chapters) || duel.chapters.length === 0) {
    throw new Error('duel.chapters must be a non-empty array');
  }
  const beats = duel.beats.map((b) => ({ ...b, end: b.start + b.dur }));
  const total = beats.length ? beats[beats.length - 1].end : 0;
  return { seed: duel.seed, title: duel.title, fps: duel.fps || 24, total, chapters: duel.chapters, beats };
}

export function beatAt(tl, t) {
  if (!tl || !Array.isArray(tl.beats) || tl.beats.length === 0) {
    throw new Error('duel.beats must be a non-empty array');
  }
  if (!Number.isFinite(t)) t = 0;
  const tc = Math.min(Math.max(t, 0), Math.max(tl.total - 1e-6, 0));
  for (const b of tl.beats) {
    if (tc >= b.start && tc < b.end) return { beat: b, local: tc - b.start, progress: (tc - b.start) / b.dur };
  }
  const last = tl.beats[tl.beats.length - 1];
  return { beat: last, local: last.dur, progress: 1 };
}

export function chapterAt(tl, t) {
  if (!Number.isFinite(t)) t = 0;
  const tc = Math.min(Math.max(t, 0), Math.max(tl.total - 1e-6, 0));
  for (const c of tl.chapters) {
    const cbeats = tl.beats.filter((b) => c.beats.includes(b.id));
    if (!cbeats.length) continue;
    const start = cbeats[0].start;
    const end = cbeats[cbeats.length - 1].end;
    if (tc >= start && tc < end) return { chapter: c, start, end };
  }
  const c = tl.chapters[tl.chapters.length - 1];
  const cbeats = tl.beats.filter((b) => c.beats.includes(b.id));
  return { chapter: c, start: cbeats[0].start, end: cbeats[cbeats.length - 1].end };
}

// Active caption line at local beat time (each line shows c.dur seconds).
export function captionAt(beat, local) {
  if (!beat || !Array.isArray(beat.captions)) return null;
  let active = null;
  for (const c of beat.captions) {
    if (!c) continue;
    const dur = c.dur || 4.0;
    if (local >= c.t && local < c.t + dur) active = c;
  }
  return active;
}

export function formatTime(t) {
  if (!Number.isFinite(t)) return '0:00';
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
