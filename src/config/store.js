import fs from 'fs';
import path from 'path';
import { audit } from '../util/log.js';

const CONFIG_PATH = path.resolve('data/config.json');

const defaults = {
  calendarIds: [],
  locale: 'en-US',
  timezone: 'UTC',
  weekdayAbbrevOverride: {},
  photoFolderPath: '',
  goldenRatio: true,
  photoRotationSeconds: 90,
  auth: {
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['User.Read', 'offline_access'],
    rateLimitPerMinute: 5,
    tenant: 'consumers'
  }
};

export function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const merged = { ...defaults, ...cfg };
    // Environment variable overrides (do not persist)
    // AUTH_CLIENT_ID, AUTH_CLIENT_SECRET, AUTH_REDIRECT_URI, AUTH_SCOPES (comma-delimited), AUTH_RATE_LIMIT
    if (!merged.auth) merged.auth = { ...defaults.auth };
    merged.auth.clientId = process.env.AUTH_CLIENT_ID || merged.auth.clientId;
    merged.auth.clientSecret = process.env.AUTH_CLIENT_SECRET || merged.auth.clientSecret;
    merged.auth.redirectUri = process.env.AUTH_REDIRECT_URI || merged.auth.redirectUri;
    if (process.env.AUTH_TENANT) {
      merged.auth.tenant = process.env.AUTH_TENANT;
    }
    if (process.env.AUTH_SCOPES) {
      merged.auth.scopes = process.env.AUTH_SCOPES.split(',').map(s => s.trim()).filter(Boolean);
    }
    // Removed: offline_access auto-append; scopes now respected exactly as configured.
    if (process.env.AUTH_RATE_LIMIT) {
      const rl = parseInt(process.env.AUTH_RATE_LIMIT, 10);
      if (!Number.isNaN(rl) && rl > 0) merged.auth.rateLimitPerMinute = rl;
    }
    return merged;
  } catch (e) {
    return { ...defaults };
  }
}

export function saveConfig(newCfg) {
  // Basic validation (placeholder): ensure calendarIds is array
  if (!Array.isArray(newCfg.calendarIds)) throw new Error('calendarIds must be array');
  const merged = { ...defaults, ...newCfg };
  // Never persist env overrides: rely on runtime load only.
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  return merged;
}
