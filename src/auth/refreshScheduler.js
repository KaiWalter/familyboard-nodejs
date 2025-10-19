import { acquireTokenSilent, loadMsalClient } from './msalClient.js';
import { getTokenMetadata, __setExpiryForTests } from './msalToken.js';
import { setCache } from '../services/cache.js';
import { audit } from '../util/log.js';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { loadConfig } from '../config/store.js';

let intervalId;
let cancelled = false; // set true on signout to suppress writes
const CHECK_INTERVAL_MS = 60_000; // 1 min
const BACKOFFS = [30_000, 120_000, 240_000, 480_000, 960_000];

function remainingLifetimeMs(meta) {
  const exp = meta?.expiresAt;
  if (!exp) return 0;
  return exp - Date.now();
}

// Attempt a refresh using available strategy:
// 1. If tokens.refreshToken present -> use confidential client acquireTokenByRefreshToken
// 2. Else attempt silent (legacy public client path)
async function performRefresh(scopes, acquireFn) {
  const cfg = loadConfig();
  const meta = await getTokenMetadata(scopes);
  if (!meta || meta.status !== 'OK') return null;
  // Test mode shortcut: just extend expiry
  if (process.env.AUTH_TEST_MODE === '1') {
    const newExpiry = Date.now() + 55 * 60_000;
    // Update test override so subsequent metadata fetch reflects extended expiry
    try { __setExpiryForTests(newExpiry); } catch {}
    return { account: { homeAccountId: meta.account?.homeAccountId || 'test' }, expiresOn: new Date(newExpiry), accessToken: 'mock_refreshed' };
  }
  // If a custom acquire function was injected (e.g., tests) use it directly to avoid real network
  if (acquireFn && acquireFn !== acquireTokenSilent) {
    try {
      return await acquireFn(scopes);
    } catch (e) {
      throw e;
    }
  }
  // Attempt silent first (MSAL handles refresh internally)
  try {
    const client = loadMsalClient();
    const accounts = await client.getTokenCache().getAllAccounts();
    if (accounts && accounts.length) {
      const account = accounts[0];
      const result = await client.acquireTokenSilent({ account, scopes });
      return result;
    }
  } catch (e) {
    // fall through to confidential refresh if configured
  }
  if (cfg.auth?.clientId && cfg.auth?.clientSecret) {
    try {
  const tenant = process.env.AUTH_TENANT || cfg.auth?.tenant || process.env.MSAL_TENANT_ID || 'common';
      const authority = `https://login.microsoftonline.com/${tenant}`;
      const cca = new ConfidentialClientApplication({ auth: { clientId: cfg.auth.clientId, clientSecret: cfg.auth.clientSecret, authority } });
      // Without explicit refresh token, attempt acquireTokenByClientCredential if scopes are app-only, else bail
      let result;
      try {
        result = await cca.acquireTokenByClientCredential({ scopes });
      } catch (clientCredErr) {
        throw clientCredErr;
      }
      return result;
    } catch (e) {
      throw e;
    }
  }
  // fallback
  const silent = await acquireFn(scopes);
  return silent;
}

// One-shot manual refresh (no scheduler/backoff). Returns { updated: boolean, error?: string }
export async function performSingleRefresh(scopes, acquireFn = acquireTokenSilent) {
  const meta = await getTokenMetadata(scopes);
  if (!meta || meta.status !== 'OK') return { updated: false, error: 'no_tokens' };
  try {
    const res = await performRefresh(scopes, acquireFn);
    if (!res || !res.expiresOn || !res.accessToken) return { updated: false, error: 'refresh_failed' };
    if (cancelled) return { updated: false, error: 'cancelled' };
    // Invalidate cached protected-resource data if token changed; we cannot compare old token now (no file persistence), assume change.
    try { setCache('photos', null); } catch {}
    try { setCache('events', null); } catch {}
  audit('auth.refresh.manual_success', { newExpiry: res.expiresOn.getTime() });
    return { updated: true };
  } catch (e) {
    audit('auth.refresh.manual_failed', { message: e.message });
    return { updated: false, error: e.message };
  }
}

export function startRefreshScheduler(scopes, acquireFn = acquireTokenSilent, checkIntervalMs = CHECK_INTERVAL_MS) {
  if (intervalId) clearInterval(intervalId);
  cancelled = false;
  let attempt = 0;
  intervalId = setInterval(async () => {
  const meta = await getTokenMetadata(scopes);
  if (!meta || meta.status !== 'OK') return;
  const remaining = remainingLifetimeMs(meta);
    // Refresh when <10 minutes remaining OR already expired
    if (remaining < 10 * 60_000) {
      audit('auth.refresh.initiated', { remainingMs: remaining });
      try {
        const res = await performRefresh(scopes, acquireFn);
        if (!res || !res.expiresOn || !res.accessToken) throw new Error('refresh_failed');
        if (cancelled) return; // signout occurred
        try { setCache('photos', null); } catch {}
        try { setCache('events', null); } catch {}
        attempt = 0;
  audit('auth.refresh.success', { newExpiry: res.expiresOn.getTime() });
      } catch (e) {
        audit('auth.refresh.failed', { attempt, message: e.message });
        const isRevoked = /invalid_grant|interaction_required|AADSTS/.test(e.message || '');
        if (isRevoked) {
          audit('auth.refresh.revoked', {});
          // signout will clear cache; nothing done here
          return;
        }
        if (attempt < BACKOFFS.length) {
          const delay = BACKOFFS[attempt++];
          audit('auth.refresh.backoff_scheduled', { delayMs: delay });
          setTimeout(async () => {
            try {
              const retry = await performRefresh(scopes, acquireFn);
              if (!retry || !retry.expiresOn || !retry.accessToken) throw new Error('retry_failed');
              if (cancelled) return;
              try { setCache('photos', null); } catch {}
              try { setCache('events', null); } catch {}
              attempt = 0;
              audit('auth.refresh.backoff_success', { newExpiry: retry.expiresOn.getTime() });
            } catch (err2) {
              audit('auth.refresh.backoff_failed', { message: err2.message, attempt });
              if (attempt >= BACKOFFS.length) {
                // terminal backoff state logged only
              }
            }
          }, delay);
        } else {
          // terminal failure logged only
        }
      }
    }
  }, checkIntervalMs);
}

export function stopRefreshScheduler() {
  if (intervalId) clearInterval(intervalId);
}

// Called by signout to prevent late writes after tokens cleared
export function cancelRefreshes() {
  cancelled = true;
}