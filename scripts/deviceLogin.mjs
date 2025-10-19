#!/usr/bin/env node
/*
 * deviceLogin.mjs - Acquire tokens via MSAL device code flow without a browser.
 *
 * Usage:
 *   node scripts/deviceLogin.mjs User.Read Calendars.Read Files.Read
 *   AUTH_TENANT=consumers AUTH_CLIENT_ID=<id> node scripts/deviceLogin.mjs User.Read Calendars.Read Files.Read
 *
 * Persists tokens to data/tokens.json (respecting TOKENS_PATH env override).
 */
import { deviceCodeLogin } from '../src/auth/msalClient.js';
import { loadConfig } from '../src/config/store.js';

async function main(){
  const scopesFromArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const cfg = loadConfig();
  const scopes = scopesFromArgs.length ? scopesFromArgs : (cfg.auth?.scopes || ['User.Read']);
  console.log('[deviceLogin] requesting scopes:', scopes.join(', '));
  try {
    const result = await deviceCodeLogin(scopes);
    console.log('[deviceLogin] success; expiresAt:', result.expiresOn.toISOString());
  } catch (e){
    console.error('[deviceLogin] error:', e.message);
    process.exit(2);
  }
}

main();

export function run(scopes){
  return deviceCodeLogin(scopes);
}
