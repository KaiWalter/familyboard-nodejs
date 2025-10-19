import fs from 'fs';
import path from 'path';

/*
Schema: TokenSet (file-persisted)
{
  accessToken: string,
  refreshToken: string,
  expiresAt: number (epoch ms),
  scopes: string[],
  rotation: number,          // incremented each successful refresh
  lastRefreshAttempt?: number, // epoch ms of last attempt
  status?: 'OK' | 'Refreshing' | 'Warning' | 'Error',
  provider?: string
}

Notes:
- Unified on expiresAt (was expiresOn in some code) for consistency with spec.
- Only one active TokenSet at a time.
- File write is atomic (temp + rename) to prevent partial writes.
- Mask tokens before logging using maskToken().
*/

// Allow tests to isolate token persistence to avoid cross-test interference.
// Primary file remains data/tokens.json but can be swapped via setTokenPath() or TOKENS_PATH env.
let TOKEN_PATH = path.resolve(process.env.TOKENS_PATH || 'data/tokens.json');

export function setTokenPath(p) {
  TOKEN_PATH = path.resolve(p);
}

export function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  } catch (e) {
    return null;
  }
}

export function writeTokens(tokens) {
  const now = Date.now();
  const existing = readTokens();
  let rotation = existing?.rotation ?? 0;
  if (existing && tokens.accessToken && tokens.accessToken !== existing.accessToken) {
    rotation += 1; // genuine new access token
  }
  // Build object ensuring computed rotation overrides any existing value
  const toWrite = { ...existing, ...tokens };
  toWrite.rotation = rotation;
  toWrite.status = 'OK';
  if (!toWrite.tokenType) {
    // Heuristic: presence of refreshToken implies user token; else application
    toWrite.tokenType = toWrite.refreshToken && toWrite.refreshToken !== 'no_refresh_token' ? 'user' : 'application';
  }
  if (!toWrite.expiresAt && toWrite.expiresOn) {
    toWrite.expiresAt = toWrite.expiresOn; // back-compat
    delete toWrite.expiresOn;
  }
  toWrite.lastRefreshAttempt = now;
  const tmpPath = TOKEN_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(toWrite, null, 2));
  fs.renameSync(tmpPath, TOKEN_PATH);
}

export function clearTokens() {
  try { fs.unlinkSync(TOKEN_PATH); } catch (e) { /* ignore */ }
}

export function maskToken(token) {
  if (!token) return '';
  if (token.length <= 10) return '***';
  return token.slice(0,4) + '...' + token.slice(-4);
}

export function maskedSummary() {
  const t = readTokens();
  if (!t) return null;
  return {
    access: maskToken(t.accessToken),
    refresh: maskToken(t.refreshToken),
    rotation: t.rotation ?? 0,
    expiresAt: t.expiresAt || t.expiresOn,
    scopes: t.scopes
  };
}

export function updateStatus(status) {
  const t = readTokens();
  if (!t) return;
  t.status = status;
  writeTokens(t);
}
