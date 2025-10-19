import { Router } from 'express';
import { loadMsalClient } from '../../auth/msalClient.js';
import { getTokenMetadata } from '../../auth/msalToken.js';
import { cacheExists } from '../../auth/tokenCacheStore.js';
import { audit } from '../../util/log.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const client = loadMsalClient();
    const accounts = await client.getTokenCache().getAllAccounts();
    const meta = await getTokenMetadata();
    audit('debug.auth.inspect', { accounts: accounts.length || 0, status: meta.status });
    res.json({
      accounts: accounts.map(a => ({ homeAccountId: a.homeAccountId, username: a.username, environment: a.environment })),
      metadata: meta,
      cacheFilePresent: cacheExists(),
      scopesConfigured: meta.scopes || []
    });
  } catch (e) {
    res.status(500).json({ error: 'debug_failed', message: e.message });
  }
});

export default router;