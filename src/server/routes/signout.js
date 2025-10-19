import { Router } from 'express';
import { audit } from '../../util/log.js';
import { clearMsalCache } from '../../auth/msalClient.js';

const router = Router();

router.post('/', async (_req, res) => {
  // Wipe MSAL cache file to clear accounts
  try {
    const { cacheSave } = await import('../../auth/tokenCacheStore.js');
    cacheSave('{}');
    clearMsalCache();
  } catch {}
  audit('auth.signout.cleared');
  res.json({ success: true });
});

export default router;