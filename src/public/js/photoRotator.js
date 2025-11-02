import { apiGet } from './apiClient.js';

let photos = [];
let idx = 0;
let intervalId;
let retryTimerId;
let refreshIntervalId;

// Configurable retry parameters (exported for tests via underscored getters)
const RETRY_SCHEDULE_MS = [1000, 2000, 4000, 8000, 16000]; // stop after ~31s
const PHOTO_REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes keeps downloadUrl fresh before expiry
let retryAttempts = 0;

export function _getRetryAttempts() { return retryAttempts; }
export function _clearRetryTimer() { if (retryTimerId) clearTimeout(retryTimerId); retryTimerId = undefined; }

async function loadPhotos(force = false) {
  try {
    const suffix = force ? '?force=1' : '';
    photos = await apiGet(`/api/photos${suffix}`);
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
export function _clearRefreshInterval() { if (refreshIntervalId) clearInterval(refreshIntervalId); refreshIntervalId = undefined; }

async function handleImageError(photoId) {
  console.warn('[photos] image failed; refreshing list', { photoId });
  await loadPhotos(true);
  const authed = await isAuthenticated();
  if (!photos.length) {
    showCurrent(authed);
    if (authed) scheduleRetry();
    return;
  }
  idx = idx % photos.length;
  showCurrent(authed);
}

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
  img.className = 'photo ' + (p.orientation === 'portrait' ? 'photo-portrait' : 'photo-landscape'); // orientation classes retained for potential future logic; CSS now uses cover
  img.addEventListener('error', () => { handleImageError(p.id).catch(err => console.error('[photos] refresh failed after image error', err)); }, { once: true });
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
  return (cfg.photoRotationSeconds && cfg.photoRotationSeconds >= 5 ? cfg.photoRotationSeconds : 90);
  } catch { return 90; }
}

export async function initPhotoRotation() {
  const authed = await isAuthenticated();
  await loadPhotos();
  idx = 0;
  showCurrent(authed);
  if (authed && photos.length === 0) scheduleRetry();
  const seconds = await loadRotationConfig();
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(async () => {
    const a = await isAuthenticated();
    next();
    if (!photos.length) showCurrent(a);
  }, seconds * 1000);
  schedulePhotoRefresh();
}

// Immediately attempt to display first photo (if cache already has one or after quick fetch) without waiting for rotation setup.
export async function initPhotoPanelImmediate() {
  const authed = await isAuthenticated();
  // Load photos first so that if available we render immediately without interim placeholder.
  await loadPhotos();
  idx = 0;
  showCurrent(authed);
  if (authed && photos.length === 0) scheduleRetry();
  schedulePhotoRefresh();
}

async function retryFetch() {
  const authed = await isAuthenticated();
  if (!authed) return; // stop retrying if user signed out
  await loadPhotos(true);
  if (photos.length > 0) {
    showCurrent(true);
    retryAttempts++; // count final success attempt
    _clearRetryTimer();
    return;
  }
  retryAttempts++;
  scheduleRetry();
}

function scheduleRetry() {
  if (retryAttempts >= RETRY_SCHEDULE_MS.length) return; // exhausted
  const delay = RETRY_SCHEDULE_MS[retryAttempts];
  _clearRetryTimer();
  retryTimerId = setTimeout(retryFetch, delay);
}

async function refreshPhotosTask() {
  const authed = await isAuthenticated();
  if (!authed) return;
  await loadPhotos(true);
  if (!photos.length) {
    showCurrent(authed);
    scheduleRetry();
    return;
  }
  idx = idx % photos.length;
  showCurrent(authed);
}

function schedulePhotoRefresh() {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  refreshIntervalId = setInterval(refreshPhotosTask, PHOTO_REFRESH_INTERVAL_MS);
}