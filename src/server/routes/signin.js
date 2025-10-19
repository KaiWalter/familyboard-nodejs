import { Router } from 'express';
import { loadConfig } from '../../config/store.js';
import { validateAuthConfig } from '../../auth/configValidate.js';
import { generateState } from '../../auth/state.js';
import { isRateLimited } from '../../services/cache.js';
import { audit } from '../../util/log.js';
import { createPendingState } from '../../auth/sessionStore.js';
import { ConfidentialClientApplication } from '@azure/msal-node';

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

  // Warm / validate confidential client early so configuration errors surface at /signin
  try {
    const tenant = process.env.AUTH_TENANT || cfg.auth.tenant || process.env.MSAL_TENANT_ID || 'common';
    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: cfg.auth.clientId,
        clientSecret: cfg.auth.clientSecret,
        authority: `https://login.microsoftonline.com/${tenant}`
      },
      system: { loggerOptions: { loggerCallback() {}, piiLoggingEnabled: false, logLevel: 2 } }
    });
    // Lightweight no-op property access to ensure instantiation doesn't throw
    if (!cca) throw new Error('cca_init_failed');
    audit('auth.signin.client_warm', { authority: `https://login.microsoftonline.com/${tenant}`, clientIdPrefix: cfg.auth.clientId.slice(0,8) });
  } catch (e) {
    audit('auth.signin.client_warm_error', { message: e.message });
    return res.status(500).json({ error: 'client_init_failed' });
  }
  createPendingState(state);
  if (cfg.auth.scopes.some(s => !s || /\s{2,}/.test(s))) {
    audit('auth.signin.invalid_scopes', { scopes: cfg.auth.scopes });
    return res.status(500).json({ error: 'invalid_scopes' });
  }
  audit('auth.signin.initiated', { state, scopes: cfg.auth.scopes.length });

  const scopeString = cfg.auth.scopes.join(' ');
  audit('auth.signin.scope_string', { scopeString });
  const params = new URLSearchParams({
    client_id: cfg.auth.clientId,
    response_type: 'code',
    redirect_uri: cfg.auth.redirectUri,
    scope: scopeString,
    state
  });
  if (req.query.forceConsent === '1') {
    params.set('prompt', 'consent');
    audit('auth.signin.force_consent', { state });
  }
  const tenant = process.env.AUTH_TENANT || cfg.auth.tenant || process.env.MSAL_TENANT_ID || 'consumers';
  const authorizationUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  const wantsJson = (req.query.format === 'json') || /application\/json/.test(req.headers.accept || '');
  const ua = req.headers['user-agent'] || '';
  const looksLikeBrowser = /Mozilla\//.test(ua);
  audit('auth.signin.authorization_url', { state, authorizationUrl });
  if (!wantsJson && looksLikeBrowser) {
    audit('auth.signin.redirect', { state });
    return res.redirect(302, authorizationUrl);
  }
  res.json({ authorizationUrl, state });
});

export default router;