// Mythduel gallery: storyboard wall rendered from storyboard.json.
//
// Each card carries a mini-scene: a deterministic inline SVG built from the
// panel palette (sky/wash bands, sea strip, ink ridge) with the two fighters
// spotted at their beat staging marks in design colors, plus the storm grade.
// Pure markup from committed sources: no network, no wall-clock, same values
// on every render.
import { formatTime } from '../engine/timeline.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function miniScene(p, beat) {
  const pal = p.palette || {};
  const sky = pal.sky || '#4a5468';
  const wash = pal.wash || '#8a93a8';
  const thorFill = pal.thor || '#a03c2e';
  const zeusFill = pal.zeus || '#2e5f8a';
  const ink = pal.ink || '#232a36';
  const thorX = beat && beat.staging && beat.staging.thor ? beat.staging.thor.x : 0.32;
  const zeusX = beat && beat.staging && beat.staging.zeus ? beat.staging.zeus.x : 0.68;
  const storm = beat && Number.isFinite(beat.storm) ? beat.storm : 0;
  const gid = 'g-' + p.beat;
  let rain = '';
  for (let i = 0; i < storm * 3; i++) {
    const rx = 12 + ((i * 53) % 216);
    rain += '<line x1="' + rx + '" y1="8" x2="' + (rx - 4) + '" y2="26" stroke="rgba(220,232,245,0.5)" stroke-width="1"/>';
  }
  return '<svg viewBox="0 0 240 120" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(p.title) + ' scene">' +
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + esc(sky) + '"/><stop offset="1" stop-color="' + esc(wash) + '"/>' +
    '</linearGradient></defs>' +
    '<rect x="0" y="0" width="240" height="66" fill="url(#' + gid + ')"/>' +
    '<rect x="0" y="66" width="240" height="10" fill="' + esc(wash) + '" opacity="0.55"/>' +
    '<polygon points="0,120 0,88 60,80 120,90 180,82 240,92 240,120" fill="' + esc(ink) + '"/>' +
    '<line x1="0" y1="96" x2="240" y2="96" stroke="rgba(235,242,248,0.35)" stroke-width="1"/>' +
    rain +
    '<circle cx="' + (thorX * 240).toFixed(1) + '" cy="88" r="6" fill="' + esc(thorFill) + '" stroke="' + esc(ink) + '" stroke-width="2"/>' +
    '<circle cx="' + (zeusX * 240).toFixed(1) + '" cy="88" r="5" fill="' + esc(zeusFill) + '" stroke="' + esc(ink) + '" stroke-width="2"/>' +
    '<text x="6" y="16" font-family="sans-serif" font-size="10" fill="#fff" opacity="0.85">storm ' + storm + '</text>' +
    '</svg>';
}

export function paintGallery(tl, board) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const p of board.panels) {
    const beat = tl.beats.find((b) => b.id === p.beat);
    const pos = board.panels.indexOf(p) + 1;
    const card = document.createElement('figure');
    card.className = 'board-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Jump the stage to ' + p.title + ' at ' + formatTime(p.heroTime));
    const swatch = document.createElement('div');
    swatch.className = 'board-swatch';
    swatch.innerHTML = miniScene(p, beat);
    const cap = document.createElement('figcaption');
    const title = document.createElement('strong');
    title.textContent = 'Beat ' + pos + ' of ' + board.panels.length + ' - ' + p.title;
    const meta = document.createElement('span');
    meta.textContent = formatTime(p.heroTime) + ' of ' + formatTime(tl.total) + ' - ' + p.comp + ' - ' + (beat ? beat.exchange : '');
    const pose = document.createElement('span');
    pose.className = 'board-pose';
    pose.textContent = (p.keyPoses || []).join(' ');
    cap.appendChild(title);
    cap.appendChild(meta);
    cap.appendChild(pose);
    for (const s of p.shots || []) {
      const shot = document.createElement('span');
      shot.className = 'board-shot';
      shot.textContent = formatTime((beat ? beat.start : 0) + s.t) + ' - ' + s.framing + ': ' + s.action;
      cap.appendChild(shot);
    }
    card.appendChild(swatch);
    card.appendChild(cap);
    const jumpToHero = () => {
      const seek = document.getElementById('seek');
      if (seek) {
        seek.value = p.heroTime;
        seek.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const wrap = document.getElementById('stageWrap');
      if (wrap) {
        const reduced = typeof window !== 'undefined' && window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        wrap.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      }
    };
    card.addEventListener('click', jumpToHero);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); jumpToHero(); }
    });
    grid.appendChild(card);
  }
}
