// Mythduel gallery: storyboard wall rendered from storyboard.json.
import { formatTime } from '../engine/timeline.js';

export function paintGallery(tl, board) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const p of board.panels) {
    const beat = tl.beats.find((b) => b.id === p.beat);
    const card = document.createElement('figure');
    card.className = 'board-card';
    const swatch = document.createElement('div');
    swatch.className = 'board-swatch';
    swatch.style.background = 'linear-gradient(180deg,' + p.palette.sky + ',' + p.palette.wash + ')';
    const cap = document.createElement('figcaption');
    const title = document.createElement('strong');
    title.textContent = p.beat + ' - ' + p.title;
    const meta = document.createElement('span');
    meta.textContent = formatTime(p.heroTime) + ' of ' + formatTime(tl.total) + ' - ' + p.comp + ' - ' + (beat ? beat.exchange : '');
    const pose = document.createElement('span');
    pose.className = 'board-pose';
    pose.textContent = (p.keyPoses || []).join(' ');
    cap.appendChild(title);
    cap.appendChild(meta);
    cap.appendChild(pose);
    card.appendChild(swatch);
    card.appendChild(cap);
    card.addEventListener('click', () => {
      const seek = document.getElementById('seek');
      if (seek) {
        seek.value = p.heroTime;
        seek.dispatchEvent(new Event('input', { bubbles: true }));
      }
      document.getElementById('stageWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    grid.appendChild(card);
  }
}
