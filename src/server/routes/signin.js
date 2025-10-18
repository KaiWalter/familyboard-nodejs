import { Router } from 'express';
import { loadConfig } from '../../config/store.js';
import { validateAuthConfig } from '../../auth/configValidate.js';
import { generateState } from '../../auth/state.js';
import { isRateLimited } from '../../services/cache.js';
import { audit } from '../../util/log.js';
import { createPendingState } from '../../auth/sessionStore.js';

const router = Router();

router.get('/', (req, res) => {
  const cfg = loadConfig();
  try {
    validateAuthConfig(cfg.auth);
  } catch (e) {
    return res.status(500).json({ error: 'auth_not_configured', details: e.details || e.message });
  }

  const limit = cfg.auth.rateLimitPerMinute || 5;
  const limited = isRateLimited('signin_global', limit, 60 * 1000);
  if (limited) {
    audit('auth.signin.rate_limited', { limit });
    return res.status(429).json({ error: 'rate_limited' });
  }

  const state = generateState();
  createPendingState(state);
  // Basic scope validation: ensure none contain illegal whitespace sequences (defense-in-depth)
  if (cfg.auth.scopes.some(s => !s || /\s{2,}/.test(s))) {
    audit('auth.signin.invalid_scopes', { scopes: cfg.auth.scopes });
    return res.status(500).json({ error: 'invalid_scopes' });
  }
  audit('auth.signin.initiated', { state, scopes: cfg.auth.scopes.length });

  const params = new URLSearchParams({
    client_id: cfg.auth.clientId,
    response_type: 'code',
    redirect_uri: cfg.auth.redirectUri,
    scope: cfg.auth.scopes.join(' '),
    state
  });
  const tenant = process.env.AUTH_TENANT || cfg.auth.tenant || process.env.MSAL_TENANT_ID || 'common';
  const authorizationUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  // Heuristic: if this looks like a human-operated browser request, perform an immediate redirect
  // API clients / tests can explicitly request JSON by either sending an Accept header for JSON only
  // or by adding ?format=json. This dual behavior keeps tests stable while enabling natural UX.
  const wantsJson = (req.query.format === 'json') || /application\/json/.test(req.headers.accept || '');
  const ua = req.headers['user-agent'] || '';
  const looksLikeBrowser = /Mozilla\//.test(ua);
  if (!wantsJson && looksLikeBrowser) {
    audit('auth.signin.redirect', { state });
    return res.redirect(302, authorizationUrl);
  }
  res.json({ authorizationUrl, state });
});

export default router;