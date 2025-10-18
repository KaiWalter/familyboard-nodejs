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
  writeTokens({ account: result.account, expiresOn: result.expiresOn.getTime(), scopes });
  return result;
}