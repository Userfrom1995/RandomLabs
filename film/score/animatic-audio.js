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
import { shotWindows, livePeakFor, SCORE_FLOOR, SFX_FLOOR } from './duck.js';

const FALLBACK_LINE = { voice: 'woodwind', beatsPerNote: 1, gain: 0.5, fromBeat: 0, toBeat: 1e9, degreeOffset: 0 };

function windLevelFor(shot) {
  if (!shot || !Array.isArray(shot.sfx)) return 0;
  const tags = shot.sfx.join(' ');
  if (/wind-howling|sleet|white-water|storm|gust-hit/.test(tags)) return 0.16;
  if (/wind|spray|water/.test(tags)) return 0.09;
  return 0.02;
}

// Pure per-step trigger enumeration shared by the live scheduler and the
// regression suite. Offline plays n = floor((to - from) / bpn) notes per
// line (orchestra.js); the live grid must produce exactly those phrases:
// sub-beat lines (shaker bpn 0.5) expand to two hits per beat, and
// non-divisible grids (13 beats at bpn 2) suppress the surplus grid beat.
// Resolve is keyed off phrase === span - 1 (the true offline last note),
// never off the raw step counter.
export function livePhrasesForStep(ln, step) {
  const from = ln.fromBeat ?? 0;
  const to = ln.toBeat ?? 1e9;
  const bpn = ln.beatsPerNote;
  if (!Number.isFinite(bpn) || bpn <= 0) return [];
  if (step < from || step >= to) return [];
  const span = Math.max(1, Math.floor((to - from) / bpn));
  const out = [];
  if (bpn < 1) {
    const per = Math.max(1, Math.round(1 / bpn));
    const base = Math.round((step - from) / bpn);
    for (let j = 0; j < per; j++) {
      const phrase = base + j;
      if (phrase < 0 || phrase >= span) continue;
      out.push({ phrase, span, delayBeats: j * bpn, isLast: phrase === span - 1 });
    }
    return out;
  }
  const q = (step - from) / bpn;
  if (Math.abs(q - Math.round(q)) > 1e-9) return [];
  const phrase = Math.round(q);
  if (phrase < 0 || phrase >= span) return [];
  return [{ phrase, span, delayBeats: 0, isLast: phrase === span - 1 }];
}

export function createPerformer() {
  let ctx = null;
  let master = null;
  let windGain = null;
  let noiseBuf = null;
  let timer = null;
  let step = 0;
  let current = { motif: 'nia', family: 'nia', raw: 'nia', shotId: '', si: 0, tempo: 60, mood: '', lines: [FALLBACK_LINE], beat: 1, wind: 0, duck: [] };
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

  function playVoice(voice, freq, dur, peak, delaySec = 0) {
    const t0 = ctx.currentTime + 0.02 + delaySec;
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
    // Wall-clock position inside the cue, for dialogue-first ducking: notes
    // that start on a spoken line play at the same floor the WAV master
    // ducks to (duck.js), so the theatre breathes where the record breathes.
    const inShot = step * beat;
    // Wind bed ducks with the SFX floor, mirroring the offline master
    // (mix.js per-sample SFX_FLOOR envelope); notes below use SCORE_FLOOR.
    if (windGain && ctx) {
      windGain.gain.setTargetAtTime(
        current.wind * livePeakFor(current.duck, inShot, SFX_FLOOR),
        ctx.currentTime, 0.1);
    }
    for (const ln of current.lines) {
      const triggers = livePhrasesForStep(ln, step);
      for (const tr of triggers) {
        // Same degree formula as the offline master (orchestra.js),
        // including the resolving snap on each line's closing note: the
        // cue opening plays identical pitches live and on the WAV render.
        let deg = ln.degreeOffset + ((current.si * 3 + tr.phrase) % 48);
        if (tr.isLast) {
          const rowLen = (motifFor({ motif: current.family }).row || []).length || 8;
          deg -= ((deg % rowLen) + rowLen) % rowLen;
        }
        // Keyed off the raw cue string ('wind+nia (major)'): the resolved
        // family name never contains 'major'.
        const f = noteFreq(current.family, deg, ln.voice, (current.raw || '').includes('major'));
        const voice = VOICES[ln.voice];
        const atShot = inShot + tr.delayBeats * beat;
        const peak = ln.gain * voice.baseGain * (bright && ln.voice === 'woodwind' ? 1.4 : 1) *
          livePeakFor(current.duck, atShot, SCORE_FLOOR);
        playVoice(ln.voice, f, ln.beatsPerNote * beat * 0.95, Math.min(0.6, peak), tr.delayBeats * beat);
      }
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
        duck: shot ? shotWindows(shot) : [],
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
