// Mythduel frame lock: the 24 fps timeline grid.
//
// Every time value entering the renderer is quantized down to its frame
// boundary first, so scrubbing, pausing, seeking, and the capture loop all
// land on identical instants: same frame index => same pixels, always.
// The 12 fps ink boil divides the grid evenly (one boil slot per two frames).
export const FRAME_FPS = 24;

// Quantize t down to its frame boundary. Non-finite input maps to duel start.
export function frameTime(t) {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor(Math.max(0, t) * FRAME_FPS)) / FRAME_FPS;
}

// Frame index of t (0-based).
export function frameIndex(t) {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor(Math.max(0, t) * FRAME_FPS));
}

// Total frame count of a runtime in seconds.
export function frameCount(total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.ceil(total * FRAME_FPS);
}
