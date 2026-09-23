/**
 * Umbra M5 audio: thin WebAudio wrapper (DOM-dependent).
 * Safe to import in Node: AudioContext is only looked up inside ensure(),
 * never at top level. Every method no-ops safely when no context exists.
 * Call ensure() from a user gesture before playing anything.
 * Mute persistence uses only the injected getMuted/setMuted callbacks;
 * this module never touches storage APIs directly.
 * @module umbra/src/audio/engine.js
 */

/**
 * @typedef {object} AudioCallbacks
 * @property {() => boolean} [getMuted] returns the persisted mute flag
 * @property {(muted: boolean) => void} [setMuted] persists the mute flag
 */

/**
 * @typedef {object} EngineSfxNode
 * @property {'osc'|'noise'} type node kind
 * @property {number} freq start Hz
 * @property {number} freqEnd end Hz
 * @property {number} dur seconds
 * @property {number} gain peak 0..1
 * @property {number} at offset seconds
 */

/**
 * @typedef {object} EngineSfxDesc
 * @property {string} name descriptor name
 * @property {EngineSfxNode[]} nodes nodes to render
 * @property {number} dur total seconds
 */

/**
 * @typedef {object} EnginePattern
 * @property {number} bpm tempo
 * @property {number[]} bass midi per quarter step, 0 = rest
 * @property {number[]} lead midi per 8th step, 0 = rest
 * @property {number[]} hats 0/1 per 8th step
 */

/**
 * @typedef {object} AudioEngine
 * @property {() => boolean} ensure create/resume the context (call from gesture)
 * @property {(m: unknown) => boolean} setMuted set mute flag
 * @property {() => boolean} isMuted read mute flag
 * @property {(desc: EngineSfxDesc) => boolean} playSfx render an SFX descriptor
 * @property {(pattern: EnginePattern) => boolean} startMusic start the loop sequencer
 * @property {() => boolean} stopMusic stop the loop sequencer
 * @property {(i: unknown) => number} setIntensity set live intensity 0..2
 */

/**
 * Convert a midi note to Hz.
 * @param {number} m midi note
 * @returns {number} frequency in Hz
 */
function midiHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/**
 * Deterministic noise sample in [-1, 1] from integer coords (hash-based).
 * @param {number} i sample index
 * @param {number} voice voice id for decorrelation
 * @returns {number} sample in [-1, 1]
 */
function noiseSample(i, voice) {
  let h = (Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(voice + 11, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return ((h >>> 0) / 2147483648) - 1;
}

/**
 * Create a UI audio engine. All methods are safe before ensure() and
 * without a browser: they return false and change nothing audible.
 * @param {AudioCallbacks} [callbacks] injected mute persistence callbacks
 * @returns {AudioEngine} engine handle
 */
export function createAudio(callbacks = {}) {
  const getMuted =
    callbacks && typeof callbacks.getMuted === 'function' ? callbacks.getMuted : null;
  const saveMuted =
    callbacks && typeof callbacks.setMuted === 'function' ? callbacks.setMuted : null;

  let muted = false;
  try {
    muted = getMuted ? getMuted() === true : false;
  } catch (err) {
    muted = false;
  }

  let ctx = null;
  let master = null;
  let musicBus = null;
  let timer = null;
  let music = null;
  let step = 0;
  let intensity = 1;

  /**
   * Look up the AudioContext constructor (inside a function on purpose,
   * so importing this module in Node never touches browser globals).
   * @returns {unknown} constructor or null
   */
  function audioCtor() {
    try {
      const g = globalThis;
      if (!g) return null;
      return g.AudioContext || g.webkitAudioContext || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Create or resume the context. Must be called from a user gesture.
   * @returns {boolean} true when the context is ready
   */
  function ensure() {
    if (ctx) {
      try {
        if (ctx.state === 'suspended') ctx.resume();
      } catch (err) {
        // resume is best-effort; context is still usable
      }
      return true;
    }
    const AC = audioCtor();
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.5;
      musicBus.connect(master);
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    } catch (err) {
      ctx = null;
      master = null;
      musicBus = null;
      return false;
    }
  }

  /**
   * Set the mute flag (applies to master gain, persists via callback).
   * @param {unknown} m truthy value mutes
   * @returns {boolean} current mute flag
   */
  function setMuted(m) {
    muted = m === true;
    try {
      if (ctx && master) master.gain.value = muted ? 0 : 0.9;
    } catch (err) {
      // gain apply is best-effort before ensure()
    }
    try {
      if (saveMuted) saveMuted(muted);
    } catch (err) {
      // persistence is best-effort
    }
    return muted;
  }

  /**
   * Read the mute flag.
   * @returns {boolean} mute flag
   */
  function isMuted() {
    return muted;
  }

  /**
   * Render one oscillator blip on the music bus.
   * @param {number} freqHz frequency
   * @param {number} at start time
   * @param {number} dur seconds
   * @param {number} gain peak gain
   * @param {string} kind oscillator type
   */
  function blip(freqHz, at, dur, gain, kind) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = kind;
    o.frequency.setValueAtTime(Math.max(20, freqHz), at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(musicBus);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  /**
   * Advance the 8th-note step sequencer once.
   */
  function tick() {
    if (!ctx || !music || !musicBus) return;
    const s = step;
    step += 1;
    const vel = [0.7, 1.0, 1.15][intensity] || 1.0;
    const t = ctx.currentTime;
    try {
      const bass = Array.isArray(music.bass) ? music.bass : [];
      const lead = Array.isArray(music.lead) ? music.lead : [];
      const hats = Array.isArray(music.hats) ? music.hats : [];
      if (lead.length > 0) {
        const n = lead[s % lead.length];
        if (n > 0) blip(midiHz(n), t, 0.18, 0.2 * vel, 'triangle');
      }
      if (hats.length > 0 && hats[s % hats.length] === 1) {
        blip(6500, t, 0.04, 0.07 * vel, 'square');
      }
      if (s % 2 === 0 && bass.length > 0) {
        const n = bass[(s / 2) % bass.length];
        if (n > 0) blip(midiHz(n), t, 0.22, 0.28 * vel, 'sine');
      }
    } catch (err) {
      // a bad step must never kill the sequencer
    }
  }

  /**
   * Render an SFX descriptor now. No-op without a context.
   * @param {EngineSfxDesc} desc descriptor from sfxDesc()
   * @returns {boolean} true when scheduled
   */
  function playSfx(desc) {
    if (!ctx || !master || !desc || !Array.isArray(desc.nodes)) return false;
    try {
      const t0 = ctx.currentTime;
      let voice = 0;
      for (const n of desc.nodes) {
        voice += 1;
        if (!n || (n.type !== 'osc' && n.type !== 'noise')) continue;
        const at = t0 + (Number.isFinite(n.at) ? Math.max(0, n.at) : 0);
        const dur = Number.isFinite(n.dur) ? Math.min(1.2, Math.max(0.01, n.dur)) : 0.1;
        const peak = Number.isFinite(n.gain) ? Math.min(1, Math.max(0, n.gain)) : 0.5;
        if (n.type === 'osc') {
          const f0 = Number.isFinite(n.freq) ? n.freq : 440;
          const f1 = Number.isFinite(n.freqEnd) ? n.freqEnd : f0;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(Math.max(20, f0), at);
          o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), at + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
          o.connect(g);
          g.connect(master);
          o.start(at);
          o.stop(at + dur + 0.02);
        } else {
          const f0 = Number.isFinite(n.freq) ? n.freq : 1200;
          const f1 = Number.isFinite(n.freqEnd) ? n.freqEnd : f0;
          const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
          const buf = ctx.createBuffer(1, len, ctx.sampleRate);
          const ch = buf.getChannelData(0);
          for (let i = 0; i < len; i++) {
            const k = i / len;
            ch[i] = noiseSample(i, voice) * (1 - k) * peak;
          }
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const flt = ctx.createBiquadFilter();
          flt.type = 'lowpass';
          flt.frequency.setValueAtTime(Math.max(40, f0), at);
          flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), at + dur);
          src.connect(flt);
          flt.connect(master);
          src.start(at);
          src.stop(at + dur + 0.02);
        }
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Start the loop sequencer on a pattern. No-op without a context.
   * @param {EnginePattern} pattern pattern from themePattern()
   * @returns {boolean} true when started
   */
  function startMusic(pattern) {
    if (!ctx || !musicBus || !pattern || !Array.isArray(pattern.bass)) return false;
    try {
      stopMusic();
      music = pattern;
      step = 0;
      const bpm = Number.isFinite(pattern.bpm) ? Math.max(40, pattern.bpm) : 112;
      const stepMs = Math.max(20, ((60 / bpm / 2) * 1000) | 0);
      timer = setInterval(tick, stepMs);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Stop the loop sequencer (safe to call anytime).
   * @returns {boolean} true
   */
  function stopMusic() {
    try {
      if (timer !== null) clearInterval(timer);
    } catch (err) {
      // clearing is best-effort
    }
    timer = null;
    music = null;
    return true;
  }

  /**
   * Set live sequencer intensity (velocity scaling, 0 calm, 1 fight, 2 boss).
   * @param {unknown} i requested level
   * @returns {number} active level
   */
  function setIntensity(i) {
    intensity = i === 0 || i === 1 || i === 2 ? i : 1;
    return intensity;
  }

  return { ensure, setMuted, isMuted, playSfx, startMusic, stopMusic, setIntensity };
}
