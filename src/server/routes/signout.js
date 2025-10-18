import { Router } from 'express';
import { clearTokens, maskedSummary } from '../../auth/tokenStore.js';
import { cancelRefreshes } from '../../auth/refreshScheduler.js';
import { audit } from '../../util/log.js';

const router = Router();

router.post('/', (req, res) => {
  const before = maskedSummary();
  if (!before) {
    return res.status(400).json({ error: 'no_active_session' });
  }
  clearTokens();
  cancelRefreshes();
  audit('auth.signout', { rotation: before.rotation });
  res.status(204).end();
});

export default router;