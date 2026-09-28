// Mythduel voiced-line-first ducking (Phase 4).
// The fighters speak over the storm beds: for every caption line [a, b]
// (absolute duel seconds), the score bus dips to SCORE_FLOOR and the SFX bed
// bus to SFX_FLOOR, with a short attack into the line and a 0.5 s release
// after it. This module is the single source of truth for the duck envelope,
// shared by the offline WAV master (score/mix.js) and the live WebAudio
// performer (score/live-audio.js), so both duck the same windows to the
// same floors.
//
// All windows derive from the committed duel captions, so the curve is
// deterministic, scrub-exact, and reproducible. Overlapping or adjacent
// lines merge into one hold: the envelope never pumps between back-to-back
// lines.
export const DUCK_VERSION = 'mythduel-duck/1';

// Score yields further than the bed: words first, music second, air third.
export const SCORE_FLOOR = 0.45;
export const SFX_FLOOR = 0.7;
export const DUCK_ATTACK = 0.25;
export const DUCK_RELEASE = 0.5;

// Absolute dialogue windows for a timeline: sorted, merged, non-overlapping
// [a, b] pairs in duel seconds. Merge gap: lines closer than one release
// hold the duck instead of breathing (no pumping on stacked lines).
export function dialogueWindows(tl, mergeGap = DUCK_RELEASE) {
  const raw = [];
  for (const beat of tl.beats) {
    for (const c of beat.captions || []) {
      const a = beat.start + c.t;
      const b = a + (c.dur || 4.0);
      raw.push([a, b]);
    }
  }
  raw.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const w of raw) {
    const last = merged[merged.length - 1];
    if (last && w[0] <= last[1] + mergeGap) {
      last[1] = Math.max(last[1], w[1]);
    } else {
      merged.push([w[0], w[1]]);
    }
  }
  return merged;
}

// Envelope level in [floor, 1] at absolute duel time t. Linear attack in,
// flat hold, linear release out. Pure function of (t, windows): the offline
// mixer evaluates it per sample, the live performer per scheduled note.
export function duckLevelAt(t, windows, floor, attack = DUCK_ATTACK, release = DUCK_RELEASE) {
  let level = 1;
  for (const [a, b] of windows) {
    if (t < a - attack || t > b + release) continue;
    let v;
    if (t < a) v = 1 - (1 - floor) * ((t - (a - attack)) / attack);
    else if (t <= b) v = floor;
    else v = floor + (1 - floor) * ((t - b) / release);
    if (v < level) level = v;
  }
  return level;
}

// Time-in-beat variant for the live performer: the performer plays a cue
// loop on the wall clock, so it ducks by position inside the current beat
// rather than by absolute duel time. beatWindows precomputes the merged
// caption windows of one beat relative to its start.
export function beatWindows(beat) {
  const raw = [];
  for (const c of beat.captions || []) {
    raw.push([c.t, c.t + (c.dur || 4.0)]);
  }
  raw.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const w of raw) {
    const last = merged[merged.length - 1];
    if (last && w[0] <= last[1] + DUCK_RELEASE) {
      last[1] = Math.max(last[1], w[1]);
    } else {
      merged.push([w[0], w[1]]);
    }
  }
  return merged;
}

// Peak multiplier for one live note starting at timeInBeat seconds into the
// beat. Same floors as the offline master, so the theatre ducks what the
// WAV ducks. Exported pure for the regression suite.
export function livePeakFor(windows, timeInBeat, floor = SCORE_FLOOR) {
  return duckLevelAt(timeInBeat, windows, floor);
}
