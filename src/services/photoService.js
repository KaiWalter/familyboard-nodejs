import { loadConfig } from '../config/store.js';
import { fetchPhotoItems } from './graphClient.js';
import { setCache, getCache } from './cache.js';
import { audit } from '../util/log.js';

export async function fetchPhotos() {
  const cached = getCache('photos');
  if (cached?.data) return cached.data;
  const cfg = loadConfig();
  const folder = cfg.photoFolderPath || '';
  if (!folder) {
    const empty = [];
    setCache('photos', empty);
    return empty;
  }
  try {
    const items = await fetchPhotoItems(folder);
    setCache('photos', items);
    return items;
  } catch (e) {
    audit('photos.fetch.error', { folder, message: e.message });
    const fallback = cached?.data || [];
    return fallback;
  }
}