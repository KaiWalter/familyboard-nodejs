import { Router } from 'express';
import { cacheAgeMs } from '../../services/cache.js';
import { getTokenMetadata } from '../../auth/msalToken.js';
import { loadConfig } from '../../config/store.js';

const router = Router();

router.get('/', async (req, res) => {
  const meta = await getTokenMetadata();
  const exp = meta.expiresAt;
  let remainingMinutes = exp ? Math.round((exp - Date.now()) / 60000) : null;
  const cfg = loadConfig();
  const authConfigured = !!(cfg.auth && cfg.auth.clientId && cfg.auth.clientSecret);
  res.json({
    auth: {
      status: meta.status,
      configured: authConfigured,
      expiresAt: exp || null,
      remainingMinutes,
      scopes: meta.scopes || [],
      source: 'msal-cache'
    },
    eventsCacheAgeMs: cacheAgeMs('events'),
    photosCacheAgeMs: cacheAgeMs('photos')
  });
});

export default router;
