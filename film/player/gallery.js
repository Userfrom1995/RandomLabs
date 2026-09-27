// Hearthlight storyboard wall: act stills painted live by the film engine.
//
// No image files, no binaries: each card is a <canvas> rendered by the
// same pure renderAnimatic() that plays the film, frozen at the act
// midpoint. If the engine ever fails, the wall hides itself and the film
// keeps playing: a gallery must never break the theatre.
import { renderAnimatic } from '../engine/animatic.js';
import { formatTime } from '../engine/timeline.js';

export function paintGallery(tl, reducedMotion) {
  const grid = document.getElementById('galleryGrid');
  const note = document.getElementById('galleryNote');
  if (!grid || !tl) return;
  try {
    grid.innerHTML = '';
    for (const a of tl.acts) {
      const shots = tl.shots.filter((s) => s.act === a.n);
      const heroT = a.start + a.dur / 2;
      const fig = document.createElement('figure');
      const canvas = document.createElement('canvas');
      canvas.width = 480; canvas.height = 270;
      canvas.setAttribute('aria-label', 'Painted still from Act ' + a.n + ': ' + a.title);
      renderAnimatic(canvas.getContext('2d'), tl, heroT, {
        width: 480, height: 270, reducedMotion: !!reducedMotion,
      });
      const cap = document.createElement('figcaption');
      const title = document.createElement('strong');
      title.textContent = 'Act ' + a.n + ': ' + a.title;
      const meta = document.createElement('span');
      meta.textContent = formatTime(a.start) + ' - ' + formatTime(a.start + a.dur) +
        ' - ' + shots.length + ' shots';
      const jump = document.createElement('button');
      jump.type = 'button';
      jump.textContent = 'Watch from here';
      jump.setAttribute('aria-label', 'Play the film from Act ' + a.n);
      jump.addEventListener('click', () => {
        const seek = document.getElementById('seek');
        if (seek) {
          seek.value = String(a.start + 0.01);
          seek.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // Start playback only when the theatre is idle: the transport
        // button's label is the honest playing-state signal.
        const play = document.getElementById('btnPlay');
        if (play && String(play.getAttribute('aria-label') || '').startsWith('Play')) play.click();
        const stage = document.getElementById('stageWrap');
        if (stage && typeof stage.scrollIntoView === 'function') stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      cap.append(title, document.createElement('br'), meta, document.createElement('br'), jump);
      fig.append(canvas, cap);
      grid.append(fig);
    }
    if (note) note.hidden = true;
  } catch (err) {
    grid.innerHTML = '';
    if (note) {
      note.hidden = false;
      note.textContent = 'The stills wall could not be painted (' + err.message + '). The film above plays on.';
    }
  }
}
