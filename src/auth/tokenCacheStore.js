import fs from 'fs';
import path from 'path';
import { audit } from '../util/log.js';

// Simple file-based persistence for MSAL token cache state.
// Stores serialized cache JSON in data/msal_cache.json by default (override via MSAL_CACHE_PATH env).

const CACHE_PATH = path.resolve(process.env.MSAL_CACHE_PATH || 'data/msal_cache.json');

export function cacheLoad() {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    return raw;
  } catch (e) {
    return null;
  }
}

export function cacheSave(serialized) {
  try {
    const tmp = CACHE_PATH + '.tmp';
    fs.writeFileSync(tmp, serialized, 'utf-8');
    fs.renameSync(tmp, CACHE_PATH);
    audit('auth.cache.saved', { bytes: serialized.length });
  } catch (e) {
    audit('auth.cache.save_error', { message: e.message });
  }
}

export function cacheExists() {
  return fs.existsSync(CACHE_PATH);
}
