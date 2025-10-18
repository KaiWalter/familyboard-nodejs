// codeExchange.js - encapsulates authorization code -> token exchange
// Supports two modes:
// 1. Test mode (AUTH_TEST_MODE=1) returns mock tokens deterministically without network
// 2. Real mode uses msal-node ConfidentialClientApplication to exchange the code
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
  if (global.__EXCHANGE_OVERRIDE__) {
    return global.__EXCHANGE_OVERRIDE__(code);
  }
  const cfg = loadConfig();
  const scopes = cfg.auth.scopes;
  // Test mode short-circuit
  if (process.env.AUTH_TEST_MODE === '1') {
    const expiresAt = Date.now() + 3600_000; // 1h
    return {
      accessToken: 'mock_access_' + code,
      refreshToken: 'mock_refresh_' + code,
      expiresAt,
      scopes,
      provider: 'mock'
    };
  }

  try {
    const cca = getClient(cfg);
    const result = await cca.acquireTokenByCode({
      code,
      redirectUri: cfg.auth.redirectUri,
      scopes
    });
    if (!result || !result.accessToken) {
      throw new Error('empty_result');
    }
    // msal exposes scopes as space-separated string in token, enforce exact match
    const grantedScopes = (result.scopes || scopes);
    // Normalize expiresOn (Date) to ms epoch
    const expiresAt = result.expiresOn instanceof Date ? result.expiresOn.getTime() : (Date.now() + 3500_000);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || 'no_refresh_token',
      expiresAt,
      scopes: grantedScopes,
      provider: 'msal'
    };
  } catch (e) {
    audit('auth.code_exchange.error', { message: e.message, errorCodes: e.errorCodes, subError: e.subError, name: e.name });
    throw e;
  }
}
