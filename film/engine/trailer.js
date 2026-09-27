// Hearthlight trailer: a curated 30-second cut over the same timeline.
//
// The trailer is pure data (story/trailer.json: shot + local in-point +
// duration per segment) plus pure mapping functions here. The theatre plays
// it on the same stage through the same renderer, performer, and captions
// as the full film: trailer time maps to exactly one film time, so every
// trailer frame IS a film frame. No DOM, no clock, no I/O.
import { frameTime } from './frames.js';

export function buildTrailer(sp, spec) {
  if (!spec || !Array.isArray(spec.segments) || spec.segments.length === 0) {
    throw new Error('trailer.segments must be a non-empty array');
  }
  const byId = new Map((sp.shots || []).map((s) => [s.id, s]));
  let cursor = 0;
  const segments = spec.segments.map((seg, i) => {
    const shot = byId.get(seg.shot);
    if (!shot) throw new Error('trailer segment ' + i + ' names unknown shot ' + seg.shot);
    if (!Number.isFinite(seg.in) || !Number.isFinite(seg.dur) || seg.dur <= 0) {
      throw new Error('trailer segment ' + i + ' needs a finite in-point and positive duration');
    }
    if (seg.in < 0 || seg.in + seg.dur > shot.dur + 1e-9) {
      throw new Error('trailer segment ' + i + ' escapes shot ' + shot.id +
        ' (in ' + seg.in + ' + dur ' + seg.dur + ' vs shot dur ' + shot.dur + ')');
    }
    // Snap to the 24 fps grid so trailer frames land exactly on film frames.
    const start = frameTime(cursor);
    const filmStart = frameTime(shot.start + seg.in);
    const built = {
      shot: shot.id,
      in: seg.in,
      dur: seg.dur,
      label: seg.label || shot.title,
      start,
      end: frameTime(cursor + seg.dur),
      filmStart,
      filmEnd: frameTime(shot.start + seg.in + seg.dur),
    };
    cursor += seg.dur;
    return built;
  });
  return { title: spec.title || 'Trailer', total: frameTime(cursor), segments };
}

// Trailer time -> absolute film time. Clamped like shotAt: overshoot holds
// the final trailer frame instead of falling off the timeline.
export function trailerToFilmTime(trailer, t) {
  if (!trailer || !Array.isArray(trailer.segments) || trailer.segments.length === 0) {
    throw new Error('trailer.segments must be a non-empty array');
  }
  // Non-finite inputs: +Infinity holds the final frame like overshoot;
  // every other non-finite value (NaN, -Infinity, null, undefined)
  // restarts at the opening frame.
  if (t === Infinity) t = trailer.total;
  else if (!Number.isFinite(t)) t = 0;
  const tc = Math.min(Math.max(t, 0), Math.max(trailer.total - 1e-6, 0));
  for (const seg of trailer.segments) {
    if (tc >= seg.start && tc < seg.end) return seg.filmStart + (tc - seg.start);
  }
  const last = trailer.segments[trailer.segments.length - 1];
  return last.filmEnd - 1e-6;
}

export function formatTrailerNote(trailer) {
  return trailer.segments.length + ' moments, ' +
    trailer.segments.map((s) => s.shot.toUpperCase()).join(' / ');
}
