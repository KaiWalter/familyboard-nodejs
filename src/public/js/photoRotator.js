import { apiGet } from './apiClient.js';

let photos = [];
let idx = 0;
let intervalId;

async function loadPhotos() {
  try {
    photos = await apiGet('/api/photos');
  } catch (e) {
    console.error('[photos] failed to load', e);
    photos = [];
  }
}

function showCurrent() {
  const panel = document.getElementById('photo-panel');
  panel.innerHTML = '';
  if (!photos.length) {
    const ph = document.createElement('div');
    ph.className = 'photo-placeholder';
    ph.textContent = 'No photos';
    panel.appendChild(ph);
    return;
  }
  const p = photos[idx];
  const img = document.createElement('img');
  img.src = p.url;
  img.alt = p.title || 'photo';
  img.className = 'photo ' + (p.orientation === 'portrait' ? 'photo-portrait' : 'photo-landscape');
  panel.appendChild(img);
}

function next() {
  if (!photos.length) return;
  idx = (idx + 1) % photos.length;
  showCurrent();
}

export async function initPhotoRotation() {
  await loadPhotos();
  idx = 0;
  showCurrent();
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(next, 90_000); // 90s fixed interval
}