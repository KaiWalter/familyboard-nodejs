import { Router } from 'express';
import { cacheAgeMs } from '../../services/cache.js';
import { readTokens, maskedSummary } from '../../auth/tokenStore.js';
import { loadConfig } from '../../config/store.js';

const router = Router();

router.get('/', (req, res) => {
  const tokens = readTokens();
  let authStatus = tokens?.status || (tokens ? 'OK' : 'NO_TOKEN');
  const exp = tokens?.expiresAt || tokens?.expiresOn;
  let remainingMinutes = exp ? Math.round((exp - Date.now()) / 60000) : null;
  const cfg = loadConfig();
  const authConfigured = !!(cfg.auth && cfg.auth.clientId && cfg.auth.clientSecret);
  res.json({
    auth: {
      status: authStatus,
      configured: authConfigured,
      expiresAt: exp || null,
      remainingMinutes,
      rotation: tokens?.rotation ?? 0,
      scopes: tokens?.scopes || [],
      hasRefreshToken: !!(tokens?.refreshToken && tokens.refreshToken !== 'no_refresh_token')
    },
    eventsCacheAgeMs: cacheAgeMs('events'),
    photosCacheAgeMs: cacheAgeMs('photos')
  });
});

export default router;
