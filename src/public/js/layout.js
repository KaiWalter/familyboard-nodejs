import { applyGoldenRatio } from '../../util/ratio.js';

export function applyLayout(cfg) {
  const app = document.getElementById('app');
  const calendar = document.getElementById('calendar-panel');
  const photos = document.getElementById('photo-panel');
  const width = window.innerWidth;
  if (cfg.goldenRatio) {
    const { photoWidth, calendarWidth } = applyGoldenRatio(width);
    calendar.style.width = calendarWidth + 'px';
    photos.style.width = photoWidth + 'px';
  } else {
    calendar.style.width = '60%';
    photos.style.width = '40%';
  }
}

export function initResponsive(cfg) {
  applyLayout(cfg);
  window.addEventListener('resize', () => applyLayout(cfg));
}