#!/usr/bin/env node
import { deviceCodeLogin } from './msalClient.js';

const scopes = [ 'User.Read', 'Calendars.Read', 'Files.Read' ];

console.log('[auth-init] Starting device code flow...');
await deviceCodeLogin(scopes);
console.log('[auth-init] Success. Tokens stored.');