import { loadMsalClient } from './msalClient.js';
import { loadConfig } from '../config/store.js';
import { audit } from '../util/log.js';
import { cacheLoad } from './tokenCacheStore.js';

// Unified MSAL-only access token retrieval.
// Provides: getAccessToken(scopes?), getTokenMetadata()

// Test override hooks (non-production)
let _metadataProviderOverride = null; // function(scopes) -> metadata object
let _manualExpiryOverride = null; // number timestamp

export function __setMetadataProviderForTests(fn) { _metadataProviderOverride = fn; }
export function __setExpiryForTests(ts) { _manualExpiryOverride = ts; }
export function __clearTestOverrides() { _metadataProviderOverride = null; _manualExpiryOverride = null; }

export async function getAccessToken(scopes) {
  const cfg = loadConfig();
  const client = loadMsalClient();
  let accounts = await client.getTokenCache().getAllAccounts();
  if ((!accounts || accounts.length === 0)) {
    // Attempt hydration from persisted cache file if runtime memory empty
    try {
      const serialized = cacheLoad();
      if (serialized) {
        client.getTokenCache().deserialize(serialized);
        accounts = await client.getTokenCache().getAllAccounts();
        if (accounts && accounts.length) {
          audit('auth.msal.cache_hydrated', { accounts: accounts.length });
        }
      }
    } catch {}
  }
  if (!accounts || accounts.length === 0) throw new Error('no_account');
  const account = accounts[0];
  const useScopes = scopes || cfg.auth.scopes;
  try {
    const result = await client.acquireTokenSilent({ account, scopes: useScopes });
    if (!result || !result.accessToken) throw new Error('silent_failed');
    return result.accessToken;
  } catch (e) {
    audit('auth.msal.silent_failed', { message: e.message });
    throw e;
  }
}

export async function getTokenMetadata(scopes) {
  // Test override has highest precedence
  if (_metadataProviderOverride) {
    const meta = await _metadataProviderOverride(scopes);
    if (_manualExpiryOverride && meta && meta.status === 'OK') meta.expiresAt = _manualExpiryOverride;
    return meta;
  }
  const cfg = loadConfig();
  const client = loadMsalClient();
  let accounts = await client.getTokenCache().getAllAccounts();
  if ((!accounts || accounts.length === 0)) {
    try {
      const serialized = cacheLoad();
      if (serialized) {
        client.getTokenCache().deserialize(serialized);
        accounts = await client.getTokenCache().getAllAccounts();
        if (accounts && accounts.length) audit('auth.msal.cache_hydrated', { accounts: accounts.length });
      }
    } catch {}
  }
  if (!accounts || accounts.length === 0) {
    // In test mode with mocked flows, allow a synthetic future expiry for introspection
    if (process.env.AUTH_TEST_MODE === '1') {
      return { status: 'NO_TOKEN', expiresAt: Date.now() + 3600_000 };
    }
    return { status: 'NO_TOKEN' };
  }
  const account = accounts[0];
  try {
    const res = await client.acquireTokenSilent({ account, scopes: scopes || cfg.auth.scopes });
    if (!res) return { status: 'NO_TOKEN' };
    const meta = {
      status: 'OK',
      expiresAt: res.expiresOn?.getTime?.(),
      scopes: res.scopes,
      account: { homeAccountId: account.homeAccountId, username: account.username }
    };
    if (_manualExpiryOverride) meta.expiresAt = _manualExpiryOverride;
    return meta;
  } catch (e) {
    const errMeta = { status: 'ERROR', error: e.message };
    if (_manualExpiryOverride) errMeta.expiresAt = _manualExpiryOverride;
    return errMeta;
  }
}
