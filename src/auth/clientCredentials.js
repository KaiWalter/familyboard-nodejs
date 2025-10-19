// clientCredentials.js - application-only token acquisition using MSAL ConfidentialClientApplication
// Replaces interactive auth flows (signin/callback). No redirects; server acquires tokens silently.
// Caches token in memory and persists summary to disk for observability (optional).

import { ConfidentialClientApplication } from '@azure/msal-node';
import { loadConfig } from '../config/store.js';
import { audit } from '../util/log.js';
import { writeTokens, readTokens } from './tokenStore.js';

let _cca; // singleton MSAL ConfidentialClientApplication
let _cached; // { accessToken, expiresAt, scopes }

function getClient() {
  if (_cca) return _cca;
  const cfg = loadConfig();
  const tenant = process.env.AUTH_TENANT || cfg.auth.tenant || process.env.MSAL_TENANT_ID || 'common';
  const authority = `https://login.microsoftonline.com/${tenant}`;
  _cca = new ConfidentialClientApplication({
    auth: {
      clientId: cfg.auth.clientId,
      clientSecret: cfg.auth.clientSecret,
      authority
    },
    system: { loggerOptions: { loggerCallback() {} } }
  });
  audit('auth.client_credentials.client_init', { authority, clientIdPrefix: cfg.auth.clientId?.slice(0,8) });
  return _cca;
}

function isValid(token) {
  if (!token) return false;
  const skewMs = 60_000; // 1 minute safety skew
  return token.expiresAt && token.expiresAt - skewMs > Date.now();
}

export async function acquireAppToken(scopesOverride) {
  const cfg = loadConfig();
  const scopes = scopesOverride || cfg.auth.scopes;

  if (isValid(_cached)) return _cached;

  // Attempt to use persisted tokens if present (in case of process restart)
  const persisted = readTokens();
  if (isValid(persisted)) {
    _cached = persisted;
    audit('auth.client_credentials.cache_hit_persisted', { expiresAt: _cached.expiresAt });
    return _cached;
  }

  const cca = getClient();
  audit('auth.client_credentials.request', { scopes });
  try {
    const result = await cca.acquireTokenByClientCredential({ scopes });
    if (!result || !result.accessToken) throw new Error('empty_result');
    const expiresAt = result.expiresOn instanceof Date ? result.expiresOn.getTime() : Date.now() + 3500_000;
    _cached = { accessToken: result.accessToken, expiresAt, scopes: scopes.slice(), provider: 'msal' };
    // Persist minimal set for diagnostics (no refresh token in client credentials flow)
    writeTokens(_cached);
    audit('auth.client_credentials.acquired', { expiresAt });
    return _cached;
  } catch (e) {
    audit('auth.client_credentials.error', { message: e.message, name: e.name });
    throw e;
  }
}

export function invalidateAppToken() {
  _cached = null;
  audit('auth.client_credentials.invalidated', {});
}
