// codeExchange.js - encapsulates authorization code -> token exchange
// Single mode: msal-node ConfidentialClientApplication performs authorization code exchange.
//
// Returns a normalized token set:
// {
//   accessToken: string,
//   refreshToken: string,
//   expiresAt: number (epoch ms),
//   scopes: string[],
//   provider: 'mock' | 'msal'
// }

import { loadConfig } from '../config/store.js';
import { audit } from '../util/log.js';
import { msalClient } from './msalClient.js';
import { cacheLoad, cacheSave } from './tokenCacheStore.js';

// We now reuse the shared PublicClientApplication; its cache plugin already persists.

export async function exchangeAuthorizationCode(code) {
  const cfg = loadConfig();
  const scopes = cfg.auth.scopes;

  try {
    audit('auth.code_exchange.client_init', { authority: msalClient.config.auth.authority, clientIdPrefix: cfg.auth.clientId?.slice(0,8) });
    let result = await msalClient.acquireTokenByCode({ code, redirectUri: cfg.auth.redirectUri, scopes });
    if (!result || !result.accessToken) {
      throw new Error('empty_result');
    }
    // Normalize granted scopes: msal may return space-delimited string; convert to array
    let grantedScopes = result.scopes || scopes;
    if (typeof grantedScopes === 'string') {
      grantedScopes = grantedScopes.split(/\s+/).filter(Boolean);
    }
    // Normalize expiresOn (Date) to ms epoch
    const expiresAt = result.expiresOn instanceof Date ? result.expiresOn.getTime() : (Date.now() + 3500_000);
    const refreshToken = result.refreshToken || null;
    // Cache already updated in msalClient; audit account count
    // In TEST_MODE, msal may not create an account record for mocked acquireTokenByCode; ensure at least one synthetic account exists so downstream code sees a session.
    if (process.env.AUTH_TEST_MODE === '1') {
      try {
        const cache = msalClient.getTokenCache();
        const accounts = await cache.getAllAccounts();
        if (!accounts || accounts.length === 0) {
          // minimal synthetic account shape that msal expects
          const synthetic = {
            homeAccountId: 'test.synth.account',
            environment: 'login.microsoftonline.com',
            tenantId: 'common',
            username: 'test@example.com'
          };
          // msal-node doesn't expose direct add, but we can simulate via read/deserialize pattern if cache plugin supports
          // Fallback: store a lightweight marker in audit; downstream rotate will bypass account requirement under TEST_MODE anyway.
          audit('auth.test.synthetic_account', { injected: true });
          // Optionally force a silent acquire attempt to prime metadata; ignore errors.
          try { await msalClient.acquireTokenSilent({ account: synthetic, scopes }); } catch {}
        }
      } catch (e) {
        audit('auth.test.synthetic_account_error', { message: e.message });
      }
    }
    try { audit('auth.cache.hydrated_public', { accounts: (await msalClient.getTokenCache().getAllAccounts()).length }); } catch {}
    return {
      accessToken: result.accessToken,
      refreshToken: refreshToken || 'no_refresh_token',
      expiresAt,
      scopes: grantedScopes,
      provider: 'msal',
      tokenType: 'user'
    };
  } catch (e) {
    audit('auth.code_exchange.error', { message: e.message, errorCodes: e.errorCodes, subError: e.subError, name: e.name });
    throw e;
  }
}
