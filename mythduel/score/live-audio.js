// Mythduel live performer (Phase 4): original score in the theatre.
// WebAudio, no samples: every voice is synthesized (membrane frame drum,
// detuned-saw northern horn, fast-decay pluck, inharmonic bronze, noise war
// shaker, deep storm pad) plus a looping filtered-noise storm bed driven by
// each beat's sfx tags and storm grade. The voice lines come from the shared
// orchestration spec (score/orchestra.js), so the live theatre plays the
// same rows, lines, and cue-opening phrases as the offline WAV master;
// mid-cue live timing follows the wall clock (a real performance), while
// the WAV render is the fixed deterministic record.
//
// Same public API as other lab performers: unlock/setCue/start/stop/
// setVolume/setMuted/getVolume/isMuted/isPlaying/audioAvailable.
// setCue takes the beat music, the full beat, and the beat index.
import { motifFor } from './themes.js';
import { orchestrate, noteFreq, VOICES } from './orchestra.js';
import { beatWindows, livePeakFor, SCORE_FLOOR, SFX_FLOOR } from './duck.js';

const FALLBACK_LINE = { voice: 'horn', beatsPerNote: 1, gain: 0.5, fromBeat: 0, toBeat: 1e9, degreeOffset: 0 };

function windLevelFor(beat) {
  if (!beat || !Array.isArray(beat.sfx)) return 0;
  const tags = beat.sfx.join(' ');
  let base = 0.02;
  if (/rain-wall|sky-crack|rockfall|shield-brace/.test(tags)) base = 0.16;
  else if (/surf|wind|wash|thunder|cloak/.test(tags)) base = 0.09;
  return base + (beat.storm || 0) * 0.015;
}

// Pure per-step trigger enumeration shared by the live scheduler and the
// regression suite. Offline plays n = floor((to - from) / bpn) notes per
// line (orchestra.js); the live grid must produce exactly those phrases:
// sub-beat lines (shaker bpn 0.5) expand to two hits per beat, and
// non-divisible grids suppress the surplus grid beat. Resolve is keyed off
// phrase === span - 1 (the true offline last note), never off the raw
// step counter.
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

// Live head frequency for the frame drum: mirrors voices.js renderDrum
// (freq/2 clamped to [45, 140]). Exported for the regression suite so the
// live-vs-offline parity is asserted without an AudioContext.
export function liveDrumFreq(freq) {
  return Math.max(45, Math.min(140, freq / 2));
}

export function createPerformer() {
  let ctx = null;
  let master = null;
  let windGain = null;
  let noiseBuf = null;
  let stormSrc = null;
  let timer = null;
  let step = 0;
  let current = { motif: 'thor-row', family: 'thor-row', beatId: '', bi: 0, tempo: 60, cue: '', lines: [FALLBACK_LINE], beat: 1, wind: 0, duck: [] };
  let volume = 0.8;
  let muted = false;
  let playing = false;

  function ensure() {
    if (ctx) return true;
    if (typeof window === 'undefined') return false;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
    // Shared looping noise source for the storm bed + shaker.
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let seed = 470470;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = (seed / 4294967296) * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    stormSrc = src;
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

  // Release per-note nodes once they finish: prevents unbounded growth of
  // live AudioNode graphs over a full watch-through. Safe under stubs.
  function release(src, ...rest) {
    const all = [src, ...rest];
    try {
      src.onended = () => {
        for (const n of all) {
          try {
            if (n && typeof n.disconnect === 'function') n.disconnect();
          } catch { /* already collected */ }
        }
      };
    } catch { /* stub contexts without onended */ }
  }

  function playVoice(voice, freq, dur, peak, delaySec = 0) {
    const t0 = ctx.currentTime + 0.02 + delaySec;
    if (voice === 'horn' || voice === 'deeppad') {
      const osc = ctx.createOscillator();
      osc.type = voice === 'deeppad' ? 'sine' : 'sawtooth';
      osc.frequency.value = freq;
      const g = adsrGain(t0, peak, voice === 'deeppad' ? 0.3 : 0.06, dur * 0.4, dur);
      if (voice === 'horn') {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1800;
        osc.connect(lp); lp.connect(g); g.connect(master);
      } else {
        osc.connect(g); g.connect(master);
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq / 2;
        const g2 = adsrGain(t0, peak * 0.6, 0.4, dur * 0.4, dur);
        osc2.connect(g2); g2.connect(master);
        osc2.start(t0); osc2.stop(t0 + dur + 0.1);
        release(osc2, g2);
      }
      osc.start(t0); osc.stop(t0 + dur + 0.1);
      release(osc, g);
    } else if (voice === 'pluck') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(peak, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(0.4, dur));
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + Math.max(0.5, dur));
      release(osc, g);
    } else if (voice === 'bronze') {
      for (const [ratio, amp] of [[1, 1], [2.71, 0.35]]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(peak * amp, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(0.8, dur * 2));
        osc.connect(g); g.connect(master);
        osc.start(t0); osc.stop(t0 + Math.max(0.9, dur * 2));
        release(osc, g);
      }
    } else if (voice === 'drum') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      // Same octave/clamp as the offline master (voices.js renderDrum):
      // the event pitch arrives an octave high and the head sounds at
      // freq/2 clamped to [45, 140].
      const f0 = Math.max(45, Math.min(140, freq / 2));
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * 0.6), t0 + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(peak, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(0.3, dur));
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + Math.max(0.4, dur));
      release(osc, g);
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
      release(src, hp, g);
    }
  }

  function scheduleStep() {
    if (!playing || !ctx) return;
    const beat = current.beat;
    // Live-room presence lift for the weapon-beat horn calls
    // (storm-answers, thrown-sky, first-clash): small speakers need the
    // extra bite. Intentionally live-only: the offline WAV master carries
    // the exact mix with no bright boost, so the committed master is the
    // fixed record and the theatre is the louder room.
    // Live bus balance note: the offline master applies SCORE_BUS/SFX_BUS
    // plus per-beat BEAT_RIDES at mix time (mix.js). The live performer
    // balances through the same duck envelopes and the master volume
    // instead, so rides are not re-applied per note here.
    const bright = /storm-answers|thrown-sky|first-clash/.test(current.cue || '');
    // Wall-clock position inside the cue, for voiced-line-first ducking:
    // notes that start on a spoken line play at the same floor the WAV
    // master ducks to (duck.js), so the theatre breathes where the record
    // breathes.
    const inBeat = step * beat;
    // Storm bed ducks with the SFX floor, mirroring the offline master
    // (mix.js per-sample SFX_FLOOR envelope); notes below use SCORE_FLOOR.
    if (windGain && ctx) {
      windGain.gain.setTargetAtTime(
        current.wind * livePeakFor(current.duck, inBeat, SFX_FLOOR),
        ctx.currentTime, 0.1);
    }
    for (const ln of current.lines) {
      const triggers = livePhrasesForStep(ln, step);
      for (const tr of triggers) {
        // Same degree formula as the offline master (orchestra.js),
        // including the resolving snap on each line's closing note: the
        // cue opening plays identical pitches live and on the WAV render.
        let deg = ln.degreeOffset + ((current.bi * 5 + tr.phrase) % 48);
        if (tr.isLast) {
          const rowLen = (motifFor({ motif: current.family }).row || []).length || 8;
          deg -= ((deg % rowLen) + rowLen) % rowLen;
        }
        const f = noteFreq(current.family, deg, ln.voice);
        const voice = VOICES[ln.voice];
        const atBeat = inBeat + tr.delayBeats * beat;
        const peak = ln.gain * voice.baseGain * (bright && ln.voice === 'horn' ? 1.4 : 1) *
          livePeakFor(current.duck, atBeat, SCORE_FLOOR);
        playVoice(ln.voice, f, ln.beatsPerNote * beat * 0.95, Math.min(0.6, peak), tr.delayBeats * beat);
      }
    }
    step++;
    timer = setTimeout(scheduleStep, beat * 1000);
  }

  return {
    // Must be called from a user gesture at least once (autoplay policy).
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setCue(music, beat, beatIndex) {
      const m = motifFor(music);
      let lines = [FALLBACK_LINE];
      let beatSec = 60 / Math.max(30, (music && music.tempo) || 60);
      if (beat && Number.isFinite(beat.dur) && Number.isFinite(beat.start)) {
        try {
          const spec = orchestrate({ ...beat, music });
          lines = spec.lines;
          beatSec = spec.beat;
        } catch (err) { console.warn('mythduel: orchestrate failed, fallback line', err); lines = [FALLBACK_LINE]; }
      }
      const next = {
        motif: m.name, family: m.name,
        beatId: (beat && beat.id) || '',
        bi: Number.isFinite(beatIndex) ? beatIndex : 0,
        tempo: (music && music.tempo) || 60, cue: (music && music.cue) || '',
        lines, beat: beatSec,
        wind: windLevelFor(beat),
        duck: beat ? beatWindows(beat) : [],
      };
      // Lines are per-cue bounded ([fromBeat, toBeat)), so the beat counter
      // resets on every cue change, not just on motif-family changes.
      if (next.motif !== current.motif || next.beatId !== current.beatId) step = 0;
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
    // Full teardown: stops the looping storm-bed source and closes the
    // context. stop() pauses scheduling and ducks the bed; dispose()
    // releases the shared graph (call on page hide/unmount).
    dispose() {
      playing = false;
      if (timer) { clearTimeout(timer); timer = null; }
      try {
        if (stormSrc && typeof stormSrc.stop === 'function') stormSrc.stop();
      } catch { /* already stopped */ }
      try {
        if (stormSrc && typeof stormSrc.disconnect === 'function') stormSrc.disconnect();
      } catch { /* already collected */ }
      stormSrc = null;
      const c = ctx;
      ctx = null; master = null; windGain = null; noiseBuf = null;
      try {
        if (c && typeof c.close === 'function') c.close();
      } catch { /* stub contexts without close */ }
    },
    setVolume(v) { volume = Math.min(1, Math.max(0, v)); if (master && !muted) master.gain.value = volume; },
    setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : volume; },
    getVolume() { return volume; },
    isMuted() { return muted; },
    isPlaying() { return playing; },
    audioAvailable() {
      if (typeof window === 'undefined') return false;
      return !!(window.AudioContext || window.webkitAudioContext);
    },
  };
}
