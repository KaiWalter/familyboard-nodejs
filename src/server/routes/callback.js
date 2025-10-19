import { Router } from 'express';
import { audit } from '../../util/log.js';
import { consumeState } from '../../auth/sessionStore.js';
import { loadConfig } from '../../config/store.js';
import { exchangeAuthorizationCode } from '../../auth/codeExchange.js';
import { ensureTestModeAccount } from '../../auth/msalClient.js';

const router = Router();

router.get('/', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).json({ error: 'missing_code_or_state' });
  }
  if (!consumeState(state)) {
    audit('auth.callback.invalid_state', { state });
    return res.status(400).json({ error: 'invalid_state' });
  }
  const cfg = loadConfig();
  try {
    const tokenSet = await exchangeAuthorizationCode(code);
    let rawScopes = tokenSet.scopes || [];
    if (typeof rawScopes === 'string') rawScopes = rawScopes.split(/\s+/).filter(Boolean);
    const requestedSet = new Set(cfg.auth.scopes.map(s => s.toLowerCase()));
    const grantedList = rawScopes.map(s => s.toLowerCase());
    const grantedSet = new Set(grantedList);
    let missing = [];
    for (const r of requestedSet) {
      if (!grantedSet.has(r)) missing.push(r);
    }
    if (missing.length) {
      audit('auth.callback.scope_mismatch', { missing, granted: grantedList });
      return res.status(400).json({ error: 'scope_mismatch', details: 'granted scopes differ from configured' });
    }
  audit('auth.callback.tokens_persisted', { expiresAt: tokenSet.expiresAt, provider: tokenSet.provider });
  await ensureTestModeAccount();
    // Redirect to kiosk root after successful sign-in. If client explicitly requests JSON (e.g., via Accept header), return JSON instead.
    const wantsJson = /application\/json/i.test(req.headers.accept || '') || req.query.format === 'json';
    // In TEST_MODE, return 200 JSON to simplify integration assertions.
    if (process.env.AUTH_TEST_MODE === '1') {
      return res.json({ success: true, redirect: '/' });
    }
    if (wantsJson) {
      return res.json({ success: true, redirect: '/' });
    }
    return res.redirect(302, '/');
  } catch (e) {
    audit('auth.callback.exchange_error', { message: e.message });
    res.status(500).json({ error: 'exchange_failed' });
  }
});

export default router;