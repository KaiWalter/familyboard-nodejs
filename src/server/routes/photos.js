import { Router } from 'express';
import { getCache, setCache, cacheAgeMs } from '../../services/cache.js';
import { fetchPhotos, getPhotoCacheMaxAgeMs } from '../../services/photoService.js';
import { getTokenMetadata } from '../../auth/msalToken.js';
import { audit } from '../../util/log.js';

// Removed decorative sample images; empty list signals unauthenticated or empty folder.

const router = Router();

router.get('/', async (req, res) => {
  const force = ['1', 'true', 'force'].includes((req.query.force || '').toString().toLowerCase());
  const cached = getCache('photos');
  const age = cacheAgeMs('photos');
  const stale = typeof age === 'number' ? age > getPhotoCacheMaxAgeMs() : false;
  if (!force && cached?.data && Array.isArray(cached.data) && cached.data.length > 0 && !stale) {
    return res.json(cached.data);
  }
  const meta = await getTokenMetadata();
  let photos;
  if (meta.status !== 'OK') {
    audit('photos.fetch.no_token', { reason: 'no_tokens' });
    return res.status(401).json({ error: 'UNAUTHENTICATED', photos: [] });
  }
  try {
  photos = await fetchPhotos({ force });
    if (!photos.length) {
      audit('photos.fetch.empty_folder', { reason: 'empty_graph', count: 0 });
      // Do not cache empty result; client will retry on next rotation or refresh
      return res.json([]);
    } else {
      audit('photos.fetch.graph_success', { count: photos.length });
      setCache('photos', photos);
      return res.json(photos);
    }
  } catch (e) {
    if (e.message === 'invalid_jwt_format') {
      audit('photos.fetch.invalid_token', { message: e.message });
      return res.status(401).json({ error: 'INVALID_TOKEN_FORMAT', photos: [] });
    }
    audit('photos.fetch.graph_error', { message: e.message });
    // On error also avoid caching empty to allow quick recovery
    res.status(502).json({ error: 'GRAPH_ERROR', photos: [] });
  }
});

export default router;