import { Router } from 'express';
import { audit } from '../../util/log.js';
import { clearTokens } from '../../auth/tokenStore.js';

const router = Router();

router.post('/', (_req, res) => {
  clearTokens();
  audit('auth.signout.cleared');
  res.json({ success: true });
});

export default router;