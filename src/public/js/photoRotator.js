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

async function isAuthenticated() {
  try {
    const status = await apiGet('/api/status');
    return status?.auth?.status && status.auth.status !== 'NO_TOKEN';
  } catch { return false; }
}

export function _getPhotos() { return photos; }
export function _getIndex() { return idx; }
export function _setPhotos(list) { photos = list; }
export function _setIndex(i) { idx = i; }
export function _clearInterval() { if (intervalId) clearInterval(intervalId); intervalId = undefined; }

function showCurrent(authenticated = true) {
  const panel = document.getElementById('photo-panel');
  panel.innerHTML = '';
  if (!photos.length) {
    const ph = document.createElement('div');
    ph.className = 'photo-placeholder';
    ph.textContent = authenticated ? 'No photos' : 'Sign in required';
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

async function loadRotationConfig() {
  try {
    const cfg = await apiGet('/api/config');
    return (cfg.photoRotationSeconds && cfg.photoRotationSeconds > 5 ? cfg.photoRotationSeconds : 90);
  } catch { return 90; }
}

export async function initPhotoRotation() {
  const authed = await isAuthenticated();
  await loadPhotos();
  idx = 0;
  showCurrent(authed);
  const seconds = await loadRotationConfig();
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(async () => {
    const a = await isAuthenticated();
    next();
    if (!photos.length) showCurrent(a);
  }, seconds * 1000);
}

// Immediately attempt to display first photo (if cache already has one or after quick fetch) without waiting for rotation setup.
export async function initPhotoPanelImmediate() {
  const authed = await isAuthenticated();
  // Load photos first so that if available we render immediately without interim placeholder.
  await loadPhotos();
  idx = 0;
  showCurrent(authed);
}