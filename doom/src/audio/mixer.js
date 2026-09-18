// Mixer topology (research spec 5.3). Pure gain model plus a thin browser
// graph builder. Master gain feeds SFX and music buses into a compressor.
// Menu volumes are 0..15 mapped linearly; mute ramps stored gains to zero
// click-free via setTargetAtTime without destroying the graph.
export const MENU_MAX = 15;

export function menuToGain(v) {
  return Math.max(0, Math.min(1, Number(v ?? MENU_MAX) / MENU_MAX));
}

export function createMixer({ master = MENU_MAX, sfx = MENU_MAX, music = MENU_MAX, muted = false, mutedSfx = false, mutedMusic = false } = {}) {
  const state = { master, sfx, music, muted, mutedSfx, mutedMusic };
  return {
    state,
    set(part, value) {
      if (part === 'master' || part === 'sfx' || part === 'music') {
        state[part] = Math.max(0, Math.min(MENU_MAX, Math.round(Number(value))));
      } else if (part === 'muted' || part === 'mutedSfx' || part === 'mutedMusic') {
        state[part] = !!value;
      }
      return this.effective();
    },
    // Effective linear gains after mute flags (what the nodes carry).
    effective() {
      const m = state.muted ? 0 : menuToGain(state.master);
      return {
        master: m,
        sfx: state.muted || state.mutedSfx ? 0 : m * menuToGain(state.sfx),
        music: state.muted || state.mutedMusic ? 0 : m * menuToGain(state.music),
      };
    },
    // Persisted shape doom.audio.{master,sfx,music,muted*}.
    toJSON() {
      return {
        master: state.master,
        sfx: state.sfx,
        music: state.music,
        muted: state.muted,
        mutedSfx: state.mutedSfx,
        mutedMusic: state.mutedMusic,
      };
    },
  };
}

// Browser graph: master -> compressor -> destination; sfx/music buses feed
// master. Applies effective gains click-free. Returns null without WebAudio.
export function buildMixerGraph(ctx, mixer) {
  if (!ctx || typeof ctx.createGain !== 'function') return null;
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  const music = ctx.createGain();
  const comp = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
  sfx.connect(master);
  music.connect(master);
  if (comp) {
    master.connect(comp);
    comp.connect(ctx.destination);
  } else {
    master.connect(ctx.destination);
  }
  applyMixerGraph(ctx, mixer, { master, sfx, music });
  return { master, sfx, music, comp };
}

export function applyMixerGraph(ctx, mixer, nodes) {
  const e = mixer.effective();
  const t = ctx.currentTime;
  for (const [node, value] of [[nodes.master, e.master], [nodes.sfx, e.sfx], [nodes.music, e.music]]) {
    if (node && node.gain && typeof node.gain.setTargetAtTime === 'function') {
      node.gain.setTargetAtTime(value, t, 0.015);
    } else if (node) {
      node.gain.value = value;
    }
  }
  return e;
}
