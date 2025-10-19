import { loadConfig } from '../config/store.js';
import { fetchPhotoItems } from './graphClient.js';
import { setCache, getCache } from './cache.js';
import { audit } from '../util/log.js';

export async function fetchPhotos() {
  const cached = getCache('photos');
  // Only reuse cache if it has non-empty data; empty array should not block re-fetch after auth or folder population
  if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) return cached.data;
  const cfg = loadConfig();
  const folder = cfg.photoFolderPath || '';
  if (!folder) {
    const empty = [];
    setCache('photos', empty);
    return empty;
  }
  try {
    const items = await fetchPhotoItems(folder);
    // Only cache non-empty results; allow future attempts if currently empty
    if (items.length > 0) setCache('photos', items);
    return items;
  } catch (e) {
    audit('photos.fetch.error', { folder, message: e.message });
    const fallback = cached?.data || [];
    return fallback;
  }
}