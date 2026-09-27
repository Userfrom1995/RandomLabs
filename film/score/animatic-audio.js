// Hearthlight animatic score performer (Phase 1 sketch of the cue map).
// WebAudio, no samples: triangle lead (woodwind-ish) + detuned sine pad
// (string-ish). Follows the screenplay cue per shot: motif row, tempo, and
// mood brightness. Real audio path so volume/mute are honest controls.
import { motifFor, semitoneToFreq } from './themes.js';

const ROOTS = { nia: 392.0, wind: 329.63, ruel: 146.83, cairn: 261.63 };

export function createPerformer() {
  let ctx = null;
  let master = null;
  let timer = null;
  let step = 0;
  let current = { motif: 'nia', raw: 'nia', tempo: 60, mood: '' };
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
    return true;
  }

  function noteFreq(motifName, degree) {
    const { row } = motifFor({ motif: motifName });
    const semi = row[degree % row.length] + 12 * Math.floor(degree / row.length);
    let f = semitoneToFreq(ROOTS[motifName] || 392, semi);
    // Keyed off the raw cue string ('wind+nia (major)'): motifFor stores the
    // resolved family name, which never contains 'major'.
    if ((current.raw || '').includes('major')) f = semitoneToFreq(ROOTS.wind || 329.63, semi + 4);
    return f;
  }

  function scheduleStep() {
    if (!playing || !ctx) return;
    const beat = 60 / Math.max(30, current.tempo);
    const t0 = ctx.currentTime + 0.02;
    const bright = /full|blaz|arrival|surge|scream|bells/.test(current.mood || '');
    // lead
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = noteFreq(current.motif, step);
    og.gain.setValueAtTime(0, t0);
    og.gain.linearRampToValueAtTime(bright ? 0.5 : 0.32, t0 + 0.03);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + beat * 0.95);
    osc.connect(og); og.connect(master);
    osc.start(t0); osc.stop(t0 + beat);
    // pad root every 4 steps
    if (step % 4 === 0) {
      for (const det of [-4, 4]) {
        const p = ctx.createOscillator();
        const pg = ctx.createGain();
        p.type = 'sine';
        p.frequency.value = (ROOTS[current.motif] || 392) / 2;
        p.detune.value = det;
        pg.gain.setValueAtTime(0, t0);
        pg.gain.linearRampToValueAtTime(0.08, t0 + beat);
        pg.gain.exponentialRampToValueAtTime(0.001, t0 + beat * 4);
        p.connect(pg); pg.connect(master);
        p.start(t0); p.stop(t0 + beat * 4);
      }
    }
    step++;
    timer = setTimeout(scheduleStep, beat * 1000);
  }

  return {
    // Must be called from a user gesture at least once (autoplay policy).
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setCue(music) {
      const m = motifFor(music);
      const next = { motif: m.name, raw: music.motif || '', tempo: music.tempo || 60, mood: music.mood || '' };
      if (next.motif !== current.motif) step = 0;
      current = next;
    },
    start() {
      if (!ensure()) return false;
      if (ctx.state === 'suspended') ctx.resume();
      if (playing) return true;
      playing = true;
      scheduleStep();
      return true;
    },
    stop() { playing = false; if (timer) { clearTimeout(timer); timer = null; } },
    setVolume(v) { volume = Math.min(1, Math.max(0, v)); if (master && !muted) master.gain.value = volume; },
    setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : volume; },
    getVolume() { return volume; },
    isMuted() { return muted; },
    isPlaying() { return playing; },
    audioAvailable() { return !!(window.AudioContext || window.webkitAudioContext); },
  };
}
