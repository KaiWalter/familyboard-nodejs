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

const TOKEN_PATH = path.resolve('data/tokens.json');

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
  const rotation = (existing?.rotation ?? 0) + (existing ? 1 : 0);
  const toWrite = { rotation, status: 'OK', ...existing, ...tokens };
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
