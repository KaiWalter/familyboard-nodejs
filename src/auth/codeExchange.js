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
import { ConfidentialClientApplication } from '@azure/msal-node';

let _cca; // singleton

function getClient(cfg) {
  if (_cca) return _cca;
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
  return _cca;
}

export async function exchangeAuthorizationCode(code) {
  const cfg = loadConfig();
  const scopes = cfg.auth.scopes;

  try {
  const cca = getClient(cfg);
  audit('auth.code_exchange.client_init', { authority: cca.config.auth.authority, clientIdPrefix: cfg.auth.clientId?.slice(0,8) });
    const result = await cca.acquireTokenByCode({
      code,
      redirectUri: cfg.auth.redirectUri,
      scopes
    });
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
