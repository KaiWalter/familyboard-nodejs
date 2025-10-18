import { Router } from 'express';
import { audit } from '../../util/log.js';
import { writeTokens } from '../../auth/tokenStore.js';
import { consumeState } from '../../auth/sessionStore.js';
import { loadConfig } from '../../config/store.js';
import { exchangeAuthorizationCode } from '../../auth/codeExchange.js';

const router = Router();

// Skeleton: For now simulate token exchange without outbound HTTP.
// Accepts query: code, state. Validates state. Persists mock tokens.
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
    // Validate scopes: require every configured scope to be present in granted.
    // Allow provider to add standard OIDC scopes (openid, profile, email, offline_access) or ordering differences.
    const requestedSet = new Set(cfg.auth.scopes.map(s => s.toLowerCase()));
    const grantedList = (tokenSet.scopes || []).map(s => s.toLowerCase());
    const grantedSet = new Set(grantedList);
    const ignore = new Set(['openid','profile','email','offline_access']);
    let missing = [];
    for (const r of requestedSet) {
      if (!grantedSet.has(r)) missing.push(r);
    }
    if (missing.length) {
      audit('auth.callback.scope_mismatch', { missing, granted: grantedList });
      try { (await import('../../auth/tokenStore.js')).clearTokens(); } catch {}
      return res.status(400).json({ error: 'scope_mismatch', details: 'granted scopes differ from configured' });
    }
    writeTokens(tokenSet);
    audit('auth.callback.tokens_persisted', { expiresAt: tokenSet.expiresAt, provider: tokenSet.provider });
    res.json({ success: true });
  } catch (e) {
    audit('auth.callback.exchange_error', { message: e.message });
    res.status(500).json({ error: 'exchange_failed' });
  }
});

export default router;