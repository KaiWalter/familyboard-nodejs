// Inlined golden ratio function (was imported from ../../util/ratio.js which is not served to browser)
function applyGoldenRatio(containerWidth) {
  const phi = 1.618;
  const photoWidth = Math.round(containerWidth / (phi + 1));
  const calendarWidth = Math.round(photoWidth * phi);
  return { photoWidth, calendarWidth };
}

export function applyLayout(cfg) {
  const app = document.getElementById('app');
  const calendar = document.getElementById('calendar-panel');
  const photos = document.getElementById('photo-panel');
  const width = window.innerWidth;
  if (cfg.goldenRatio) {
    const { photoWidth, calendarWidth } = applyGoldenRatio(width);
    // Ensure ratio is close to 1.6; apply pixel widths for deterministic layout.
    calendar.style.width = calendarWidth + 'px';
    photos.style.width = photoWidth + 'px';
  } else {
    // Fallback proportional layout.
    calendar.style.width = '60%';
    photos.style.width = '40%';
  }
}

export function initResponsive(cfg) {
  applyLayout(cfg);
  window.addEventListener('resize', () => applyLayout(cfg));
}