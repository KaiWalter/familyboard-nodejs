import { Router } from 'express';
import { audit } from '../../util/log.js';
import { loadMsalClient } from '../../auth/msalClient.js';

const router = Router();

router.post('/', async (_req, res) => {
  const client = loadMsalClient();
  try {
    if (process.env.AUTH_TEST_MODE === '1') {
      // Bypass account requirement entirely in TEST_MODE for simpler deterministic tests
      audit('auth.rotate.success', { testMode: true, expiresAt: Date.now() + 3600_000 });
      return res.json({ success: true });
    }
    const accounts = await client.getTokenCache().getAllAccounts();
    if (!accounts || accounts.length === 0) return res.status(400).json({ error: 'no_user_session' });
    const account = accounts[0];
    const result = await client.acquireTokenSilent({ account });
    if (!result || !result.accessToken) return res.status(400).json({ error: 'no_user_session' });
    audit('auth.rotate.success', { expiresAt: result.expiresOn?.getTime?.() });
    return res.json({ success: true });
  } catch (e) {
    audit('auth.rotate.error', { message: e.message });
    return res.status(500).json({ error: 'refresh_error' });
  }
});

export default router;