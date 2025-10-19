import { acquireTokenSilent } from './msalClient.js';
import { readTokens, writeTokens, updateStatus, clearTokens } from './tokenStore.js';
import { audit } from '../util/log.js';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { loadConfig } from '../config/store.js';

let intervalId;
let cancelled = false; // set true on signout to suppress writes
const CHECK_INTERVAL_MS = 60_000; // 1 min
const BACKOFFS = [30_000, 120_000, 240_000, 480_000, 960_000];

function remainingLifetimeMs(tokens) {
  const exp = tokens?.expiresAt || tokens?.expiresOn;
  if (!exp) return 0;
  return exp - Date.now();
}

// Attempt a refresh using available strategy:
// 1. If tokens.refreshToken present -> use confidential client acquireTokenByRefreshToken
// 2. Else attempt silent (legacy public client path)
async function performRefresh(scopes, acquireFn) {
  const cfg = loadConfig();
  const tokens = readTokens();
  if (!tokens) return null;
  // Test mode shortcut: just extend expiry
  if (process.env.AUTH_TEST_MODE === '1') {
    return { account: tokens.account || { homeAccountId: 'test' }, expiresOn: new Date(Date.now() + 55 * 60_000), accessToken: 'mock_refreshed', refreshToken: tokens.refreshToken };
  }
  if (tokens.refreshToken && cfg.auth?.clientId && cfg.auth?.clientSecret) {
    try {
  const tenant = process.env.AUTH_TENANT || cfg.auth?.tenant || process.env.MSAL_TENANT_ID || 'common';
      const authority = `https://login.microsoftonline.com/${tenant}`;
      const cca = new ConfidentialClientApplication({ auth: { clientId: cfg.auth.clientId, clientSecret: cfg.auth.clientSecret, authority } });
      const result = await cca.acquireTokenByRefreshToken({ refreshToken: tokens.refreshToken, scopes });
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
  const tokens = readTokens();
  if (!tokens) return { updated: false, error: 'no_tokens' };
  try {
    const res = await performRefresh(scopes, acquireFn);
    if (!res || !res.expiresOn) return { updated: false, error: 'refresh_failed' };
    if (cancelled) return { updated: false, error: 'cancelled' };
    writeTokens({ account: res.account, expiresAt: res.expiresOn.getTime(), scopes, refreshToken: res.refreshToken || tokens.refreshToken });
    audit('auth.refresh.manual_success', { newExpiry: res.expiresOn.getTime() });
    updateStatus('OK');
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
    const tokens = readTokens();
    if (!tokens) return;
    const remaining = remainingLifetimeMs(tokens);
    const assumedLifetime = 3600_000; // 1h
    const threshold = assumedLifetime * 0.15; // 15%
    if (remaining < threshold) {
      updateStatus('Refreshing');
      audit('auth.refresh.initiated', { remainingMs: remaining });
      try {
        const res = await performRefresh(scopes, acquireFn);
        if (!res || !res.expiresOn) throw new Error('refresh_failed');
        if (cancelled) return; // signout occurred
        writeTokens({ account: res.account, expiresAt: res.expiresOn.getTime(), scopes, refreshToken: res.refreshToken || tokens.refreshToken });
        attempt = 0;
        audit('auth.refresh.success', { newExpiry: res.expiresOn.getTime() });
        updateStatus('OK');
      } catch (e) {
        audit('auth.refresh.failed', { attempt, message: e.message });
        const isRevoked = /invalid_grant|interaction_required|AADSTS/.test(e.message || '');
        if (isRevoked) {
          audit('auth.refresh.revoked', {});
          clearTokens();
          updateStatus('Warning');
          return;
        }
        if (attempt < BACKOFFS.length) {
          const delay = BACKOFFS[attempt++];
          audit('auth.refresh.backoff_scheduled', { delayMs: delay });
          setTimeout(async () => {
            try {
              const retry = await performRefresh(scopes, acquireFn);
              if (!retry || !retry.expiresOn) throw new Error('retry_failed');
              if (cancelled) return;
              writeTokens({ account: retry.account, expiresAt: retry.expiresOn.getTime(), scopes, refreshToken: retry.refreshToken || tokens.refreshToken });
              attempt = 0;
              audit('auth.refresh.backoff_success', { newExpiry: retry.expiresOn.getTime() });
              updateStatus('OK');
            } catch (err2) {
              audit('auth.refresh.backoff_failed', { message: err2.message, attempt });
              if (attempt >= BACKOFFS.length) {
                updateStatus('Warning');
              }
            }
          }, delay);
        } else {
          updateStatus('Warning');
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