// Hearthlight timeline: pure functions over screenplay data.
// No DOM, no clock, no I/O: usable from the browser player, the node audit
// tool, and the stills exporter identically.
export function buildTimeline(sp) {
  const shots = sp.shots.map((s) => ({ ...s, end: s.start + s.dur }));
  const total = shots.length ? shots[shots.length - 1].end : 0;
  return { seed: sp.seed, title: sp.title, total, acts: sp.acts, shots };
}

export function shotAt(tl, t) {
  const tc = Math.min(Math.max(t, 0), Math.max(tl.total - 1e-6, 0));
  for (const s of tl.shots) {
    if (tc >= s.start && tc < s.end) return { shot: s, local: tc - s.start, progress: (tc - s.start) / s.dur };
  }
  const last = tl.shots[tl.shots.length - 1];
  return { shot: last, local: last.dur, progress: 1 };
}

export function actAt(tl, t) {
  const tc = Math.min(Math.max(t, 0), Math.max(tl.total - 1e-6, 0));
  for (const a of tl.acts) {
    if (tc >= a.start && tc < a.start + a.dur) return a;
  }
  return tl.acts[tl.acts.length - 1];
}

// Active caption line at time t within a shot (each line shows 4.5 s).
export function captionAt(shot, local) {
  if (!shot.captions) return null;
  let active = null;
  for (const c of shot.captions) {
    if (local >= c.t && local < c.t + 4.5) active = c;
  }
  return active;
}

export function formatTime(t) {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
