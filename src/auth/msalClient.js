import { PublicClientApplication } from '@azure/msal-node';
import { readTokens, writeTokens } from './tokenStore.js';

const config = {
  auth: {
    clientId: process.env.MSAL_CLIENT_ID || 'REPLACE_CLIENT_ID',
  // Tenant precedence: explicit AUTH_TENANT > legacy MSAL_TENANT_ID > common
  authority: `https://login.microsoftonline.com/${process.env.AUTH_TENANT || process.env.MSAL_TENANT_ID || 'common'}`,
  },
  system: { loggerOptions: { loggerCallback() {}, piiLoggingEnabled: false, logLevel: 2 } }
};

export const msalClient = new PublicClientApplication(config);

// Backwards-compatible loader used by routes needing direct client handle
export function loadMsalClient() {
  return msalClient;
}

export async function acquireTokenSilent(scopes) {
  const tokens = readTokens();
  if (!tokens) return null;
  try {
    const account = tokens.account;
    const result = await msalClient.acquireTokenSilent({ account, scopes });
    return result;
  } catch (e) {
    return null;
  }
}

export async function deviceCodeLogin(scopes) {
  const result = await msalClient.acquireTokenByDeviceCode({ scopes, deviceCodeCallback: (resp) => {
    console.log('[auth] device code:', resp.message);
  }});
  // Persist tokens in same schema expected by downstream Graph client
  writeTokens({
    account: result.account,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken || 'no_refresh_token',
    expiresAt: result.expiresOn.getTime(),
    scopes: scopes
  });
  return result;
}