// sessionStore.js - manages ephemeral auth state values (authorization code flow)
// State entries are single-use and expire after TTL.

const STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const sessions = new Map(); // state => { createdAt, consumedAt?, status }

function prune(now = Date.now()) {
  for (const [state, meta] of sessions.entries()) {
    if (!meta.consumedAt && (now - meta.createdAt) > STATE_TTL_MS) {
      sessions.delete(state);
    }
  }
}

export function createPendingState(state) {
  const now = Date.now();
  prune(now);
  sessions.set(state, { createdAt: now, status: 'pending' });
  return state;
}

export function consumeState(state) {
  const now = Date.now();
  prune(now);
  const meta = sessions.get(state);
  if (!meta || meta.status !== 'pending') return false;
  meta.consumedAt = now;
  meta.status = 'exchanged';
  sessions.set(state, meta);
  return true;
}

export function markError(state, errorCode) {
  const meta = sessions.get(state);
  if (!meta) return;
  meta.status = 'error';
  meta.errorCode = errorCode;
  sessions.set(state, meta);
}

export function getStateMeta(state) {
  return sessions.get(state) || null;
}

export function countActive() {
  prune();
  let count = 0;
  for (const meta of sessions.values()) {
    if (meta.status === 'pending') count++;
  }
  return count;
}

export function _debugAll() { // for tests
  return Array.from(sessions.entries());
}
