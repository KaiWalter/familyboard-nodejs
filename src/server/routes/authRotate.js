import { Router } from 'express';
import { audit } from '../../util/log.js';
import { readTokens, writeTokens } from '../../auth/tokenStore.js';
import { loadMsalClient } from '../../auth/msalClient.js';

const router = Router();

router.post('/', async (_req, res) => {
  const tokens = readTokens();
  if (!tokens || tokens.tokenType !== 'user') {
    return res.status(400).json({ error: 'no_user_session' });
  }
  if (!tokens.refreshToken || tokens.refreshToken === 'no_refresh_token') {
    return res.status(400).json({ error: 'no_refresh_token' });
  }
  try {
    let next;
    if (process.env.AUTH_TEST_MODE === '1') {
      // Simulate refresh by extending expiry +1h
      next = { ...tokens, expiresAt: Date.now() + 3600_000 };
    } else {
      const client = loadMsalClient();
      const refreshed = await client.acquireTokenByRefreshToken({ refreshToken: tokens.refreshToken, scopes: tokens.scopes });
      if (!refreshed || !refreshed.accessToken) {
        audit('auth.rotate.failed');
        return res.status(500).json({ error: 'refresh_failed' });
      }
      next = {
        tokenType: 'user',
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || tokens.refreshToken,
        expiresAt: Date.now() + (refreshed.expiresIn || 0) * 1000,
        scopes: refreshed.scopes || tokens.scopes,
        provider: 'msal'
      };
    }
    writeTokens(next);
    audit('auth.rotate.success', { expiresAt: next.expiresAt });
    res.json({ success: true });
  } catch (e) {
    audit('auth.rotate.error', { message: e.message });
    res.status(500).json({ error: 'refresh_error' });
  }
});

export default router;