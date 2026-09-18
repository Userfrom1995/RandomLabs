// 8-voice SFX engine state model (research spec 5.1-5.2). Pure and headless:
// voice allocation, vanilla distance/stereo/pitch math, and steal policy run
// here; the browser adapter at the bottom only maps voice state onto
// AudioBufferSourceNode graphs when called from app code (never in tests).
//
// Vanilla model (s_sound.c): 8 polyphonic channels, overflow steals by
// priority. Volume 0..127, separation 0..255 (128 center), pitch 0..255
// (128 normal). Distance: full inside CLOSE_DIST (200 units), linear falloff
// to zero at CLIP_DIST (1200), culled beyond; MAP08 never goes fully silent
// (floor 15). Stereo follows 128 - swing*sin(relativeAngle), swing 96.
export const SFX_VOICES = 8;
export const SFX_CLOSE_DIST = 200;
export const SFX_CLIP_DIST = 1200;
export const SFX_PAN_SWING = 96;
export const SFX_MAP08_FLOOR = 15;

// Deterministic engine PRNG (mulberry32) so pitch jitter is testable.
export function createPrng(seed = 1234) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function distanceGain(dist, { map08 = false } = {}) {
  const d = Math.max(0, Number(dist) || 0);
  if (d <= SFX_CLOSE_DIST) return 1;
  if (d >= SFX_CLIP_DIST) return map08 ? SFX_MAP08_FLOOR / 127 : 0;
  const g = 1 - (d - SFX_CLOSE_DIST) / (SFX_CLIP_DIST - SFX_CLOSE_DIST);
  return map08 ? Math.max(g, SFX_MAP08_FLOOR / 127) : g;
}

// Separation 0..255 around center 128, swung by the source angle.
export function separationPan(separation, relativeAngleRad = 0) {
  const sep = Math.max(0, Math.min(255, Number(separation) || 0));
  const panned = 128 - SFX_PAN_SWING * Math.sin(relativeAngleRad || 0);
  const mixed = (sep + panned) / 2;
  return Math.max(-1, Math.min(1, (mixed - 128) / 128));
}

// Pitch jitter replicates vanilla: saw kinds +8-(rand&15), everything else
// except pickup/tink +16-(rand&31), clamped 0..255.
export function jitterPitch(base, kind, randUint8) {
  const b = Math.max(0, Math.min(255, Math.round(Number(base) || 0)));
  const r = randUint8 & 0xff;
  if (kind === 'saw') return Math.max(0, Math.min(255, b + 8 - (r & 15)));
  if (kind === 'pickup' || kind === 'tink') return b;
  return Math.max(0, Math.min(255, b + 16 - (r & 31)));
}

export function createSfxEngine({ seed = 1234 } = {}) {
  const prng = createPrng(seed);
  const voices = Array.from({ length: SFX_VOICES }, () => ({ busy: false }));
  const dropped = { count: 0 };
  let now = 0;

  function stealIndex(name) {
    // Same-origin sounds die first (vanilla S_GetChannel behavior).
    for (let i = 0; i < voices.length; i++) {
      if (voices[i].busy && voices[i].name === name) return i;
    }
    // Else steal the quietest, breaking ties by age (oldest first).
    let idx = 0;
    for (let i = 1; i < voices.length; i++) {
      const a = voices[i];
      const b = voices[idx];
      if (!a.busy) return i;
      if (!b.busy) { idx = i; continue; }
      if (a.priority < b.priority || (a.priority === b.priority && a.started < b.started)) idx = i;
    }
    return idx;
  }

  return {
    voices,
    dropped,
    get time() { return now; },
    // params: name, buffer {data,sampleRate}, volume 0..127, separation
    // 0..255, pitch 0..255, distance units, angleRad, kind, map08.
    play(params) {
      const p = params || {};
      if (!p.buffer || !p.buffer.data || p.buffer.data.length === 0) {
        dropped.count++;
        return -1;
      }
      const rawVolume = Number(p.volume ?? 127);
      if (Number.isNaN(rawVolume)) {
        dropped.count++;
        return -1;
      }
      const volume = Math.max(0, Math.min(127, rawVolume));
      const gain = (volume / 127) * distanceGain(p.distance ?? 0, { map08: !!p.map08 });
      if (!(gain > 0) || !Number.isFinite(gain)) {
        dropped.count++;
        return -1;
      }
      const pitch = jitterPitch(p.pitch ?? 128, p.kind || 'misc', Math.floor(prng() * 256));
      const rate = pitch / 128;
      const dur = p.buffer.data.length / Math.max(1, p.buffer.sampleRate) / Math.max(0.01, rate);
      let idx = voices.findIndex((v) => !v.busy);
      if (idx < 0) idx = stealIndex(p.name || '');
      voices[idx] = {
        busy: true,
        name: p.name || '',
        gain,
        pan: separationPan(p.separation ?? 128, p.angleRad || 0),
        rate,
        endsAt: now + dur * 1000,
        started: now,
        priority: volume,
      };
      return idx;
    },
    // Advance the clock; finished voices release. Returns live count.
    update(nowMs) {
      now = nowMs;
      let live = 0;
      for (const v of voices) {
        if (v.busy && nowMs >= v.endsAt) v.busy = false;
        if (v.busy) live++;
      }
      return live;
    },
    stopAll() {
      for (const v of voices) v.busy = false;
    },
  };
}

// Browser adapter: schedule live voices on a WebAudio graph. No-op without
// a context; app code calls this per frame after engine.update().
export function renderSfxFrame(engine, cache, ctx, bus, timer = 'setTargetAtTime') {
  if (!ctx || !bus) return 0;
  let scheduled = 0;
  for (const v of engine.voices) {
    if (!v.busy || v.node) continue;
    const entry = cache.has(v.name) ? cache.get(v.name) : null;
    if (!entry) continue;
    const buf = ctx.createBuffer(1, entry.data.length, entry.sampleRate);
    buf.getChannelData(0).set(entry.data);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = v.rate;
    const g = ctx.createGain();
    g.gain.value = v.gain;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(g);
    if (pan) {
      pan.pan.value = v.pan;
      g.connect(pan);
      pan.connect(bus);
    } else {
      g.connect(bus);
    }
    if (timer === 'setTargetAtTime') g.gain.setTargetAtTime(v.gain, ctx.currentTime, 0.015);
    src.start();
    v.node = src;
    scheduled++;
  }
  return scheduled;
}
