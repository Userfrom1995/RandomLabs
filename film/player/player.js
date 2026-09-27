// Hearthlight theatre transport: play/pause, scrub/seek, chapters,
// captions, fullscreen, volume/mute. The player clock IS the timeline:
// time advances by rAF delta while playing, so pause/scrub are exact and
// the renderer stays a pure function of time.
import { buildTimeline, shotAt, actAt, captionAt, formatTime } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { buildTrailer, trailerToFilmTime } from '../engine/trailer.js';
import { renderAnimatic } from '../engine/animatic.js';
import { paintGallery } from './gallery.js';
import { createPerformer } from '../score/animatic-audio.js';

const $ = (id) => document.getElementById(id);
const SVG_SOUND_ON = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 7v4h3l4 3V4L5 7H2z" fill="currentColor"/><path d="M12 6c1.2 1.5 1.2 4.5 0 6M14 4c2 2.5 2 7.5 0 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const SVG_SOUND_OFF = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 7v4h3l4 3V4L5 7H2z" fill="currentColor"/><path d="M12 7l5 5M17 7l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const SILENT_NOTE = '  -  (this browser has no WebAudio: silent playback)';
function cueDisplay(cue) {
  return String(cue || '').split('-').map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}
const canvas = $('stage');
const ctx = canvas ? canvas.getContext('2d') : null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const END_CREDITS = "Nia the keeper-in-training, Yara the old keeper, Tam the ferryman's son, little Lumi, and the mountain wind itself. Original story, pictures, and orchestral score by the Random Lab, drawn and mixed in code from committed sources.";

const state = {
  tl: null,
  time: 0,
  playing: false,
  lastFrame: 0,
  captionsOn: true,
  performer: createPerformer(),
  audioUnlocked: false,
  silentNote: false,
  mode: 'film',
  trailer: null,
  trailerFailed: false,
};

// Length of the current cut in seconds (full film or 30 s trailer).
function modeTotal() {
  if (!state.tl) return 0;
  if (state.mode === 'trailer' && state.trailer) return state.trailer.total;
  return state.tl.total;
}

// Trailer time -> absolute film time. In film mode this is the identity.
function filmTimeOf(t) {
  if (state.mode === 'trailer' && state.trailer) return trailerToFilmTime(state.trailer, t);
  return t;
}

function trailerSegAt(t) {
  if (!state.trailer) return null;
  for (const seg of state.trailer.segments) {
    if (t >= seg.start && t < seg.end) return seg;
  }
  return state.trailer.segments[state.trailer.segments.length - 1];
}

function showError(title, msg) {
  $('overlayTitle').textContent = title;
  $('overlayMsg').textContent = msg;
  $('stageOverlay').hidden = false;
  $('bigPlay').hidden = true;
  const retry = $('overlayRetry');
  retry.textContent = 'Try again';
  retry.onclick = () => window.location.reload();
}

function renderFrame() {
  if (!state.tl) return;
  try {
  const W = canvas.width; const H = canvas.height;
  const ft = filmTimeOf(state.time);
  const { shot, local } = renderAnimatic(ctx, state.tl, ft, {
    width: W, height: H, reducedMotion,
  });
  // captions
  const cap = state.captionsOn ? captionAt(shot, local) : null;
  const capEl = $('captionLine');
  if (cap) {
    capEl.classList.remove('off');
    capEl.innerHTML = '';
    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = cap.who;
    const line = document.createElement('div');
    line.textContent = cap.line;
    capEl.append(who, line);
  } else {
    capEl.classList.add('off');
    capEl.innerHTML = '';
  }
  // now-playing + chapters
  const act = actAt(state.tl, ft);
  if (state.mode === 'trailer' && state.trailer) {
    const seg = trailerSegAt(state.time);
    $('npShot').textContent = 'TRAILER - ' + seg.label + ' (from ' + shot.id.toUpperCase() + ' - ' + shot.title + ')';
  } else {
    $('npShot').textContent = shot.id.toUpperCase() + ' - ' + shot.title;
  }
  $('npAct').textContent = 'Act ' + act.n + ': ' + act.title + '  -  Theme: ' + cueDisplay(shot.music.cue);
  // Re-applied every frame: renderFrame rewrites npAct, so a one-time
  // append in setPlaying would be wiped on the next frame.
  if (state.silentNote && !$('npAct').textContent.includes('silent playback')) {
    $('npAct').textContent += SILENT_NOTE;
  }
  document.querySelectorAll('#chapterList button').forEach((b) => {
    b.setAttribute('aria-current', String(Number(b.dataset.act) === act.n));
  });
  // scrub position (unless dragged)
  const seek = $('seek');
  if (document.activeElement !== seek) seek.value = String(state.time);
  seek.setAttribute('aria-valuetext', formatTime(state.time) + ' of ' + formatTime(modeTotal()));
  $('tCur').textContent = formatTime(state.time);
  // score follows picture (full shot: orchestration lines + wind-bed SFX)
  state.performer.setCue(shot.music, shot);
  } catch (err) {
    state.playing = false;
    showError('The reels are damaged', 'A damaged shot stopped playback (' + err.message + '). Reload to try again.');
  }
}

function showEndCard() {
  const card = $('endCard');
  if (!card) return;
  if (state.mode === 'trailer') {
    $('endTitle').textContent = 'Hearthlight - the full film';
    $('endMsg').textContent = 'That was the 30-second trailer. The full 4 minute 30 second film plays on the same stage.';
    $('btnModeSwap').textContent = 'Watch the full film';
  } else {
    $('endTitle').textContent = 'The End - Hearthlight';
    $('endMsg').textContent = 'Ember Hollow keeps its light. Thank you for watching the premiere cut.';
    $('btnModeSwap').textContent = 'Replay the trailer';
  }
  $('endCredits').textContent = END_CREDITS;
  card.hidden = false;
  $('bigPlay').hidden = true;
  const replay = $('btnReplay');
  if (replay && document.activeElement && document.activeElement.blur) {
    try { replay.focus({ preventScroll: true }); } catch { /* focus is a courtesy, never a crash */ }
  }
}

function hideEndCard() {
  const card = $('endCard');
  if (card) card.hidden = true;
}

function tick(now) {
  if (state.playing && state.tl) {
    const dt = (now - state.lastFrame) / 1000;
    state.time += dt;
    if (state.time >= modeTotal()) {
      state.time = modeTotal();
      setPlaying(false);
      showEndCard();
    }
    renderFrame();
  }
  state.lastFrame = now;
  requestAnimationFrame(tick);
}

function setPlaying(on) {
  if (!state.tl) return;
  if (on && state.time >= modeTotal()) state.time = 0;
  if (on) {
    hideEndCard();
    state.performer.unlock();
    state.audioUnlocked = true;
    if (!state.performer.audioAvailable()) {
      // Honest degradation: film plays, transport notes the missing audio.
      // Flag (not append): renderFrame rewrites npAct every frame.
      state.silentNote = true;
    }
    state.performer.start();
    $('btnPlay').innerHTML = '&#10074;&#10074;';
    $('btnPlay').setAttribute('aria-label', 'Pause (Space)');
    $('bigPlay').hidden = true;
  } else {
    state.performer.stop();
    $('btnPlay').innerHTML = '&#9654;';
    $('btnPlay').setAttribute('aria-label', 'Play (Space)');
    if (state.audioUnlocked) $('bigPlay').hidden = false;
  }
  state.playing = on;
  state.lastFrame = performance.now();
  renderFrame();
}

function seekTo(t) {
  if (!state.tl) return;
  // Snap to the 24 fps grid: every seek lands on the exact frame the
  // renderer will paint, so scrubbing is frame-exact, never between.
  state.time = frameTime(Math.min(Math.max(t, 0), modeTotal()));
  hideEndCard();
  renderFrame();
}

function setMode(mode) {
  if (!state.tl || (mode === 'trailer' && !state.trailer)) return;
  state.mode = mode;
  state.time = 0;
  setPlaying(false);
  hideEndCard();
  $('seek').max = String(modeTotal());
  $('tDur').textContent = formatTime(modeTotal());
  $('btnTrailer').hidden = mode !== 'film' || !state.trailer;
  $('btnFilm').hidden = mode !== 'trailer';
  renderFrame();
}

async function init() {
  if (!canvas || !ctx) {
    const veil = $('loadingVeil');
    if (veil) veil.hidden = true;
    showError('This browser cannot paint the film', 'The Hearthlight stage needs canvas 2D support, which this browser did not provide. Try a recent desktop or mobile browser.');
    return;
  }
  let sp;
  try {
    // Relative to the document (/film/index.html), not the module: fetch()
    // resolves against the document URL, so '../story/...' would 404 as
    // /story/... on Pages. 'story/...' resolves to /film/story/... .
    const res = await fetch('story/screenplay.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    sp = await res.json();
  } catch (err) {
    $('loadingVeil').hidden = true;
    showError('The reels did not arrive', 'Could not load the screenplay (' + err.message + '). Check your connection and press Try again.');
    return;
  }
  try {
    state.tl = buildTimeline(sp);
  } catch (err) {
    $('loadingVeil').hidden = true;
    showError('The reels are damaged', 'The screenplay failed validation: ' + err.message);
    return;
  }
  // Trailer spec loads beside the screenplay. A failed trailer load never
  // breaks the film: the trailer buttons hide and the premiere cut plays on.
  try {
    const tres = await fetch('story/trailer.json', { cache: 'no-store' });
    if (!tres.ok) throw new Error('HTTP ' + tres.status);
    state.trailer = buildTrailer(sp, await tres.json());
  } catch (err) {
    state.trailer = null;
    state.trailerFailed = true;
  }
  const trailerSection = $('trailerCall');
  if (trailerSection) trailerSection.hidden = !state.trailer;
  $('btnTrailer').hidden = !state.trailer;
  $('btnFilm').hidden = true;
  $('tDur').textContent = formatTime(state.tl.total);
  $('seek').max = String(state.tl.total);

  // chapters
  const list = $('chapterList');
  list.innerHTML = '';
  for (const a of state.tl.acts) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.act = String(a.n);
    b.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = a.n + '. ' + a.title;
    const time = document.createElement('span');
    time.className = 't';
    time.textContent = formatTime(a.start);
    const syn = document.createElement('span');
    syn.className = 's';
    syn.textContent = a.synopsis;
    b.append(title, time, syn);
    b.addEventListener('click', () => {
      if (state.mode === 'trailer') setMode('film');
      seekTo(a.start + 0.01); setPlaying(true);
    });
    li.append(b);
    list.append(li);
  }

  $('loadingVeil').hidden = true;
  renderFrame();
  $('bigPlay').hidden = false;
  paintGallery(state.tl, reducedMotion);

  // transport wiring
  $('btnPlay').addEventListener('click', () => setPlaying(!state.playing));
  $('bigPlay').addEventListener('click', () => setPlaying(true));
  $('btnRestart').addEventListener('click', () => { seekTo(0); setPlaying(true); });
  $('btnTrailer').addEventListener('click', () => {
    if (!state.trailer) {
      showError('The trailer reels did not arrive', 'Could not load the trailer cut. The full film above plays on: press Keep watching.');
      const retry = $('overlayRetry');
      retry.textContent = 'Keep watching';
      retry.onclick = () => { $('stageOverlay').hidden = true; $('bigPlay').hidden = state.playing; };
      return;
    }
    setMode('trailer');
    setPlaying(true);
  });
  $('btnFilm').addEventListener('click', () => { setMode('film'); });
  $('btnReplay').addEventListener('click', () => { seekTo(0); setPlaying(true); });
  $('btnModeSwap').addEventListener('click', () => {
    if (state.mode === 'trailer') { setMode('film'); setPlaying(true); }
    else if (state.trailer) { setMode('trailer'); setPlaying(true); }
    else { hideEndCard(); seekTo(0); setPlaying(true); }
  });
  $('btnDismiss').addEventListener('click', () => {
    hideEndCard();
    $('bigPlay').hidden = state.playing;
  });
  $('seek').addEventListener('input', (e) => { seekTo(Number(e.target.value)); });
  $('btnCaption').addEventListener('click', () => {
    state.captionsOn = !state.captionsOn;
    $('btnCaption').setAttribute('aria-pressed', String(state.captionsOn));
    renderFrame();
  });
  $('btnMute').addEventListener('click', () => {
    state.performer.unlock();
    state.performer.setMuted(!state.performer.isMuted());
    $('btnMute').innerHTML = state.performer.isMuted() ? SVG_SOUND_OFF : SVG_SOUND_ON;
  });
  $('vol').addEventListener('input', (e) => {
    state.performer.unlock();
    state.performer.setVolume(Number(e.target.value) / 100);
    if (Number(e.target.value) > 0 && state.performer.isMuted()) {
      state.performer.setMuted(false);
      $('btnMute').innerHTML = SVG_SOUND_ON;
    }
  });
  $('btnFull').addEventListener('click', async () => {
    const wrap = $('stageWrap');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrap.requestFullscreen();
    } catch (err) {
      showError('Fullscreen refused', 'This browser blocked fullscreen (' + err.message + '). The film keeps playing underneath.');
      $('stageOverlay').hidden = false;
      const retry = $('overlayRetry');
      retry.textContent = 'Keep watching';
      retry.onclick = () => {
        $('stageOverlay').hidden = true;
        // The film kept playing underneath: show bigPlay only when idle.
        $('bigPlay').hidden = state.playing;
      };
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') {
      // A focused button already fires natively on Space: running the
      // global toggle as well would cancel it out and look stuck.
      if (e.target.matches('button')) return;
      e.preventDefault(); setPlaying(!state.playing);
    }
    else if (e.key === 'ArrowRight') seekTo(state.time + 5);
    else if (e.key === 'ArrowLeft') seekTo(state.time - 5);
    else if (e.key === 'm' || e.key === 'M') $('btnMute').click();
    else if (e.key === 'c' || e.key === 'C') $('btnCaption').click();
    else if (e.key === 'f' || e.key === 'F') $('btnFull').click();
    else if ((e.key === 't' || e.key === 'T') && state.trailer) {
      if (state.mode === 'trailer') { setMode('film'); } else { setMode('trailer'); setPlaying(true); }
    }
  });
  requestAnimationFrame((n) => { state.lastFrame = n; requestAnimationFrame(tick); });
}

init();
