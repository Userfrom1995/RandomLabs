// Hearthlight theatre transport: play/pause, scrub/seek, chapters,
// captions, fullscreen, volume/mute. The player clock IS the timeline:
// time advances by rAF delta while playing, so pause/scrub are exact and
// the renderer stays a pure function of time.
import { buildTimeline, shotAt, actAt, captionAt, formatTime } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import { createPerformer } from '../score/animatic-audio.js';

const $ = (id) => document.getElementById(id);
const SVG_SOUND_ON = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 7v4h3l4 3V4L5 7H2z" fill="currentColor"/><path d="M12 6c1.2 1.5 1.2 4.5 0 6M14 4c2 2.5 2 7.5 0 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const SVG_SOUND_OFF = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 7v4h3l4 3V4L5 7H2z" fill="currentColor"/><path d="M12 7l5 5M17 7l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const SILENT_NOTE = '  -  (this browser has no WebAudio: silent playback)';
function cueDisplay(cue) {
  return String(cue || '').split('-').map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}
const canvas = $('stage');
const ctx = canvas.getContext('2d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  tl: null,
  time: 0,
  playing: false,
  lastFrame: 0,
  captionsOn: true,
  performer: createPerformer(),
  audioUnlocked: false,
};

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
  const W = canvas.width; const H = canvas.height;
  const { shot, local } = renderAnimatic(ctx, state.tl, state.time, {
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
  const act = actAt(state.tl, state.time);
  $('npShot').textContent = shot.id.toUpperCase() + ' - ' + shot.title;
  $('npAct').textContent = 'Act ' + act.n + ': ' + act.title + '  -  Theme: ' + cueDisplay(shot.music.cue);
  document.querySelectorAll('#chapterList button').forEach((b) => {
    b.setAttribute('aria-current', String(Number(b.dataset.act) === act.n));
  });
  // scrub position (unless dragged)
  const seek = $('seek');
  if (document.activeElement !== seek) seek.value = String(state.time);
  seek.setAttribute('aria-valuetext', formatTime(state.time) + ' of ' + formatTime(state.tl.total));
  $('tCur').textContent = formatTime(state.time);
  // score follows picture
  state.performer.setCue(shot.music);
}

function tick(now) {
  if (state.playing && state.tl) {
    const dt = (now - state.lastFrame) / 1000;
    state.time += dt;
    if (state.time >= state.tl.total) {
      state.time = state.tl.total;
      setPlaying(false);
    }
    renderFrame();
  }
  state.lastFrame = now;
  requestAnimationFrame(tick);
}

function setPlaying(on) {
  if (!state.tl) return;
  if (on && state.time >= state.tl.total) state.time = 0;
  if (on) {
    state.performer.unlock();
    state.audioUnlocked = true;
    if (!state.performer.audioAvailable()) {
      // Honest degradation: film plays, transport notes the missing audio.
      if (!$('npAct').textContent.includes('silent playback')) {
        $('npAct').textContent += SILENT_NOTE;
      }
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
  state.time = Math.min(Math.max(t, 0), state.tl.total);
  renderFrame();
}

async function init() {
  let sp;
  try {
    const res = await fetch('../story/screenplay.json', { cache: 'no-store' });
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
    b.addEventListener('click', () => { seekTo(a.start + 0.01); setPlaying(true); });
    li.append(b);
    list.append(li);
  }

  $('loadingVeil').hidden = true;
  renderFrame();
  $('bigPlay').hidden = false;

  // transport wiring
  $('btnPlay').addEventListener('click', () => setPlaying(!state.playing));
  $('bigPlay').addEventListener('click', () => setPlaying(true));
  $('btnRestart').addEventListener('click', () => { seekTo(0); setPlaying(true); });
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
      retry.onclick = () => { $('stageOverlay').hidden = true; };
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!state.playing); }
    else if (e.key === 'ArrowRight') seekTo(state.time + 5);
    else if (e.key === 'ArrowLeft') seekTo(state.time - 5);
    else if (e.key === 'm' || e.key === 'M') $('btnMute').click();
    else if (e.key === 'c' || e.key === 'C') $('btnCaption').click();
    else if (e.key === 'f' || e.key === 'F') $('btnFull').click();
  });
  $('overlayRetry').addEventListener('click', () => window.location.reload());

  requestAnimationFrame((n) => { state.lastFrame = n; requestAnimationFrame(tick); });
}

init();
