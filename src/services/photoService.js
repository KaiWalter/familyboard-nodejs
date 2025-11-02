import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/store.js';
import { fetchPhotoItems as fetchPhotoItemsDefault } from './graphClient.js';
import { setCache, getCache, cacheAgeMs } from './cache.js';
import { audit } from '../util/log.js';

const PHOTOS_CACHE_PATH_ENV = process.env.PHOTOS_CACHE_PATH;
let photosCachePath = path.resolve(PHOTOS_CACHE_PATH_ENV || 'data/photos.json');
let photosHydratedFromDisk = false;
let fetchPhotoItemsFn = fetchPhotoItemsDefault;
const PHOTO_CACHE_MAX_AGE_MS = Number(process.env.PHOTO_CACHE_MAX_AGE_MS || 15 * 60 * 1000);

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hydratePhotosFromDisk() {
  if (photosHydratedFromDisk) return;
  photosHydratedFromDisk = true;
  try {
    const raw = fs.readFileSync(photosCachePath, 'utf-8');
    const payload = JSON.parse(raw);
    if (!payload || !Array.isArray(payload.photos)) return;
    const fetchedAt = Date.parse(payload.fetchedAt || '') || Date.now();
    setCache('photos', payload.photos, fetchedAt);
    audit('photos.cache.hydrated_disk', { count: payload.photos.length });
  } catch (e) {
    // ignore missing/invalid cache files silently
  }
}

function persistPhotosToDisk(photos, fetchedAtMs) {
  try {
    ensureDirExists(photosCachePath);
    const payload = {
      fetchedAt: new Date(fetchedAtMs).toISOString(),
      photos
    };
    const tmpPath = `${photosCachePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tmpPath, photosCachePath);
  } catch (e) {
    audit('photos.cache.persist_error', { message: e.message });
  }
}

export function getPhotoCacheMaxAgeMs() {
  return PHOTO_CACHE_MAX_AGE_MS;
}

export async function fetchPhotos(options = {}) {
  const { force = false } = options;
  hydratePhotosFromDisk();
  const cached = getCache('photos');
  const age = cacheAgeMs('photos');
  const stale = typeof age === 'number' ? age > PHOTO_CACHE_MAX_AGE_MS : false;
  // Only reuse cache if it has non-empty data; empty array should not block re-fetch after auth or folder population
  if (!force && cached?.data && Array.isArray(cached.data) && cached.data.length > 0 && !stale) {
    return cached.data;
  }
  const cfg = loadConfig();
  const folder = cfg.photoFolderPath || '';
  if (!folder) {
    const empty = [];
    const fetchedAt = Date.now();
    setCache('photos', empty, fetchedAt);
    persistPhotosToDisk(empty, fetchedAt);
    return empty;
  }
  try {
  const items = await fetchPhotoItemsFn(folder);
    const fetchedAt = Date.now();
    setCache('photos', items, fetchedAt);
    persistPhotosToDisk(items, fetchedAt);
    return items;
  } catch (e) {
    audit('photos.fetch.error', { folder, message: e.message });
    const fallback = cached?.data || [];
    return fallback;
  }
}

// --- Test helpers (not for production use) ---
export function __setFetchPhotoItems(fn) {
  fetchPhotoItemsFn = fn || fetchPhotoItemsDefault;
}

export function __setPhotosCachePath(filePath) {
  if (!filePath) {
    photosCachePath = path.resolve(PHOTOS_CACHE_PATH_ENV || 'data/photos.json');
  } else {
    photosCachePath = path.resolve(filePath);
  }
  photosHydratedFromDisk = false;
}

export function __resetPhotosCacheForTests() {
  photosHydratedFromDisk = false;
  try { setCache('photos', null); } catch {}
}