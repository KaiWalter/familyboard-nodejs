import { Router } from 'express';
import { getCache, setCache } from '../../services/cache.js';
import { fetchPhotos } from '../../services/photoService.js';
import { readTokens } from '../../auth/tokenStore.js';
import { audit } from '../../util/log.js';

// Removed decorative sample images; empty list signals unauthenticated or empty folder.

const router = Router();

router.get('/', async (req, res) => {
  const cached = getCache('photos');
  if (cached?.data) return res.json(cached.data);
  const tokens = readTokens();
  let photos;
  if (!tokens || !tokens.accessToken) {
    audit('photos.fetch.no_token', { reason: 'no_tokens' });
    setCache('photos', []);
    return res.status(401).json({ error: 'UNAUTHENTICATED', photos: [] });
  }
  try {
    photos = await fetchPhotos();
    if (!photos.length) {
      audit('photos.fetch.empty_folder', { reason: 'empty_graph', count: 0 });
    } else {
      audit('photos.fetch.graph_success', { count: photos.length });
    }
    setCache('photos', photos);
    res.json(photos);
  } catch (e) {
    if (e.message === 'invalid_jwt_format') {
      audit('photos.fetch.invalid_token', { message: e.message });
      return res.status(401).json({ error: 'INVALID_TOKEN_FORMAT', photos: [] });
    }
    audit('photos.fetch.graph_error', { message: e.message });
    setCache('photos', []);
    res.status(502).json({ error: 'GRAPH_ERROR', photos: [] });
  }
});

export default router;