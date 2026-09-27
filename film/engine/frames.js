// Hearthlight frame lock: the 24 fps timeline grid.
//
// The film runs at 24 frames per second. Every time value entering the
// renderer is quantized down to its frame boundary first, so scrubbing,
// pausing, seeking, and the capture loop all land on identical instants:
// same frame index => same pixels, always. The 12 fps ink boil divides the
// grid evenly (one boil slot per two frames), so line-boil and camera sit
// on the same lattice with no shimmer mismatch.
export const FRAME_FPS = 24;

// Quantize t down to its frame boundary. Non-finite input (NaN, infinities
// from hostile seeks) maps to film start, matching the timeline clamp.
export function frameTime(t) {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor(Math.max(0, t) * FRAME_FPS)) / FRAME_FPS;
}

// Frame index of t (0-based). Useful for review cards and debug readouts.
export function frameIndex(t) {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor(Math.max(0, t) * FRAME_FPS));
}

// Total frame count of a runtime in seconds.
export function frameCount(total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.ceil(total * FRAME_FPS);
}
