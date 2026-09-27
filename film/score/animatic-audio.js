// Hearthlight full-orchestra live performer (Phase 4).
// WebAudio, no samples: every voice is synthesized (woodwind triangle,
// detuned-saw strings/cello, sine bass, bright-saw brass, inharmonic bells,
// slow-attack pad, dropping-sine timpani, noise shaker) plus a looping
// filtered-noise wind bed driven by each shot's sfx tags. The voice lines
// come from the shared orchestration spec (score/orchestra.js), so the live
// theatre plays the same rows, lines, and cue-opening phrases as the
// offline WAV master; mid-cue live timing follows the wall clock (a real
// performance), while the WAV render is the fixed deterministic record.
//
// Same public API as the Phase 1 sketch: unlock/setCue/start/stop/
// setVolume/setMuted/getVolume/isMuted/isPlaying/audioAvailable.
// setCue now optionally takes the full shot for orchestration + SFX.
import { motifFor } from './themes.js';
import { orchestrate, noteFreq, VOICES } from './orchestra.js';

const FALLBACK_LINE = { voice: 'woodwind', beatsPerNote: 1, gain: 0.5, fromBeat: 0, toBeat: 1e9, degreeOffset: 0 };

function windLevelFor(shot) {
  if (!shot || !Array.isArray(shot.sfx)) return 0;
  const tags = shot.sfx.join(' ');
  if (/wind-howling|sleet|white-water|storm|gust-hit/.test(tags)) return 0.16;
  if (/wind|spray|water/.test(tags)) return 0.09;
  return 0.02;
}

export function createPerformer() {
  let ctx = null;
  let master = null;
  let windGain = null;
  let noiseBuf = null;
  let timer = null;
  let step = 0;
  let current = { motif: 'nia', family: 'nia', raw: 'nia', shotId: '', si: 0, tempo: 60, mood: '', lines: [FALLBACK_LINE], beat: 1, wind: 0 };
  let volume = 0.8;
  let muted = false;
  let playing = false;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
    // Shared looping noise source for the wind bed + shaker.
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let seed = 20260927;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = (seed / 4294967296) * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    src.connect(lp); lp.connect(windGain); windGain.connect(master);
    src.start();
    return true;
  }

  function adsrGain(t0, peak, attack, decay, dur) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.6), t0 + attack + decay);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(attack + decay + 0.02, dur));
    return g;
  }

  function playVoice(voice, freq, dur, peak) {
    const t0 = ctx.currentTime + 0.02;
    if (voice === 'woodwind' || voice === 'pad') {
      const osc = ctx.createOscillator();
      osc.type = voice === 'pad' ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const g = adsrGain(t0, peak, voice === 'pad' ? 0.3 : 0.04, dur * 0.4, dur);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.1);
      if (voice === 'pad') {
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq / 2;
        osc2.detune.value = 5;
        const g2 = adsrGain(t0, peak * 0.6, 0.4, dur * 0.4, dur);
        osc2.connect(g2); g2.connect(master);
        osc2.start(t0); osc2.stop(t0 + dur + 0.1);
      }
    } else if (voice === 'strings' || voice === 'violin' || voice === 'cello') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2200;
      const g = adsrGain(t0, peak, 0.09, dur * 0.4, dur);
      lp.connect(g); g.connect(master);
      for (const det of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = det;
        osc.connect(lp);
        osc.start(t0); osc.stop(t0 + dur + 0.1);
      }
    } else if (voice === 'bass') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = adsrGain(t0, peak, 0.05, dur * 0.4, dur);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.1);
    } else if (voice === 'brass') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3200;
      const g = adsrGain(t0, peak, 0.05, dur * 0.3, dur);
      lp.connect(g); g.connect(master);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.connect(lp);
      osc.start(t0); osc.stop(t0 + dur + 0.1);
    } else if (voice === 'bells') {
      for (const [ratio, amp] of [[1, 1], [2.76, 0.35]]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(peak * amp, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(0.8, dur * 2));
        osc.connect(g); g.connect(master);
        osc.start(t0); osc.stop(t0 + Math.max(0.9, dur * 2));
      }
    } else if (voice === 'timpani') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(Math.max(45, freq), t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), t0 + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(peak, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(0.3, dur));
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + Math.max(0.4, dur));
    } else if (voice === 'shaker') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.playbackRate.value = 1.5;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5000;
      const g = adsrGain(t0, peak * 0.7, 0.005, 0.04, 0.09);
      src.connect(hp); hp.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + 0.15);
    }
  }

  function scheduleStep() {
    if (!playing || !ctx) return;
    const beat = current.beat;
    const bright = /full|blaz|arrival|surge|scream|bells/.test(current.mood || '');
    for (const ln of current.lines) {
      if (step < ln.fromBeat || step >= ln.toBeat) continue;
      if ((step - ln.fromBeat) % ln.beatsPerNote !== 0) continue;
      const phrase = Math.floor((step - ln.fromBeat) / ln.beatsPerNote);
      // Same degree formula as the offline master (orchestra.js): the cue
      // opening plays identical pitches live and on the WAV render.
      const deg = ln.degreeOffset + ((current.si * 3 + phrase) % 48);
      // Keyed off the raw cue string ('wind+nia (major)'): the resolved
      // family name never contains 'major'.
      const f = noteFreq(current.family, deg, ln.voice, (current.raw || '').includes('major'));
      const voice = VOICES[ln.voice];
      const peak = ln.gain * voice.baseGain * (bright && ln.voice === 'woodwind' ? 1.4 : 1);
      playVoice(ln.voice, f, ln.beatsPerNote * beat * 0.95, Math.min(0.6, peak));
    }
    step++;
    timer = setTimeout(scheduleStep, beat * 1000);
  }

  return {
    // Must be called from a user gesture at least once (autoplay policy).
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setCue(music, shot) {
      const m = motifFor(music);
      let lines = [FALLBACK_LINE];
      let beat = 60 / Math.max(30, music.tempo || 60);
      if (shot && Number.isFinite(shot.dur) && Number.isFinite(shot.start)) {
        try {
          const spec = orchestrate({ ...shot, music });
          lines = spec.lines;
          beat = spec.beat;
        } catch { lines = [FALLBACK_LINE]; }
      }
      const next = {
        motif: m.name, family: m.name, raw: music.motif || '',
        shotId: (shot && shot.id) || '',
        si: shot && /^s\d+$/.test(shot.id || '') ? parseInt(shot.id.slice(1), 10) - 1 : 0,
        tempo: music.tempo || 60, mood: music.mood || '',
        lines, beat,
        wind: windLevelFor(shot),
      };
      // Lines are per-cue bounded ([fromBeat, toBeat)), so the beat counter
      // resets on every cue change, not just on motif-family changes.
      if (next.motif !== current.motif || next.raw !== current.raw || next.shotId !== current.shotId) step = 0;
      current = next;
      if (ctx && windGain) {
        windGain.gain.setTargetAtTime(current.wind, ctx.currentTime, 0.4);
      }
    },
    start() {
      if (!ensure()) return false;
      if (ctx.state === 'suspended') ctx.resume();
      if (playing) return true;
      playing = true;
      if (windGain) windGain.gain.setTargetAtTime(current.wind, ctx.currentTime, 0.4);
      scheduleStep();
      return true;
    },
    stop() {
      playing = false;
      if (timer) { clearTimeout(timer); timer = null; }
      if (ctx && windGain) windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    },
    setVolume(v) { volume = Math.min(1, Math.max(0, v)); if (master && !muted) master.gain.value = volume; },
    setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : volume; },
    getVolume() { return volume; },
    isMuted() { return muted; },
    isPlaying() { return playing; },
    audioAvailable() { return !!(window.AudioContext || window.webkitAudioContext); },
  };
}
