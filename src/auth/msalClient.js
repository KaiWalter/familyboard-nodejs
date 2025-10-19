import { PublicClientApplication, ConfidentialClientApplication } from '@azure/msal-node';
import { loadConfig } from '../config/store.js';
import { cacheLoad, cacheSave } from './tokenCacheStore.js';
import { audit } from '../util/log.js';

const cachePlugin = {
  beforeCacheAccess: async (ctx) => {
    const serialized = cacheLoad();
    if (serialized) ctx.tokenCache.deserialize(serialized);
  },
  afterCacheAccess: async (ctx) => {
    if (ctx.cacheHasChanged) {
      const s = ctx.tokenCache.serialize();
      cacheSave(s);
    }
  }
};

const cfg = loadConfig();
const tenant = process.env.AUTH_TENANT || cfg.auth?.tenant || process.env.MSAL_TENANT_ID || 'common';
const clientId = process.env.MSAL_CLIENT_ID || cfg.auth?.clientId || 'REPLACE_CLIENT_ID';
const clientSecret = process.env.AUTH_CLIENT_SECRET || cfg.auth?.clientSecret;
const isTestMode = process.env.AUTH_TEST_MODE === '1' || process.env.NODE_ENV === 'test';

let msalClient;
if (!clientSecret || isTestMode) {
  const publicConfig = {
    auth: { clientId, authority: `https://login.microsoftonline.com/${tenant}` },
    system: { loggerOptions: { loggerCallback() {}, piiLoggingEnabled: false, logLevel: 2 } },
    cache: { cachePlugin }
  };
  msalClient = new PublicClientApplication(publicConfig);
  audit('auth.client.type', { type: 'public', tenant, hasSecret: !!clientSecret });
} else {
  const confidentialConfig = {
    auth: { clientId, clientSecret, authority: `https://login.microsoftonline.com/${tenant}` },
    system: { loggerOptions: { loggerCallback() {}, piiLoggingEnabled: false, logLevel: 2 } },
    cache: { cachePlugin }
  };
  msalClient = new ConfidentialClientApplication(confidentialConfig);
  audit('auth.client.type', { type: 'confidential', tenant });
}

  // Named export for modules that import { msalClient }
  export { msalClient };

// Backwards-compatible loader used by routes needing direct client handle
export function loadMsalClient() {
  return msalClient;
}

export async function acquireTokenSilent(scopes) {
  try {
    const accounts = await msalClient.getTokenCache().getAllAccounts();
    if (!accounts || accounts.length === 0) return null;
    const account = accounts[0];
    return await msalClient.acquireTokenSilent({ account, scopes });
  } catch (e) {
    return null;
  }
}

export async function deviceCodeLogin(scopes) {
  const result = await msalClient.acquireTokenByDeviceCode({ scopes, deviceCodeCallback: (resp) => {
    console.log('[auth] device code:', resp.message);
  }});
  // MSAL cache plugin persists tokens automatically
  return result;
}

export function clearMsalCache() {
  try {
    msalClient.getTokenCache().deserialize('{}');
  } catch {}
}

// TEST_MODE synthetic account injection for integration tests that mock acquireTokenByCode without real AAD response
export async function ensureTestModeAccount() {
  if (process.env.AUTH_TEST_MODE !== '1') return;
  try {
    const cache = msalClient.getTokenCache();
    const accounts = await cache.getAllAccounts();
    if (accounts && accounts.length > 0) return; // already present
    // Construct a minimal serialized cache with an account entry
    const base = JSON.parse(cache.serialize());
    base.Account || (base.Account = {});
    const homeAccountId = 'test.synth.account';
    base.Account[homeAccountId] = {
      homeAccountId,
      environment: 'login.microsoftonline.com',
      tenantId: 'common',
      username: 'test@example.com'
    };
    cache.deserialize(JSON.stringify(base));
  } catch {
    // swallow
  }
}