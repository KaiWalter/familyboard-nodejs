const caches = {
  events: { data: null, fetchedAt: null },
  photos: { data: null, fetchedAt: null }
};

// Generic in-memory counters with TTL for lightweight rate limiting or burst control.
// Structure: { key: { count: number, expiresAt: epochMs } }
const counters = {};

export function setCache(type, data, fetchedAt) {
  if (!caches[type]) throw new Error('Unknown cache type: ' + type);
  caches[type].data = data;
  caches[type].fetchedAt = fetchedAt ?? Date.now();
}

export function getCache(type) {
  return caches[type] || null;
}

export function cacheAgeMs(type) {
  const c = caches[type];
  if (!c || !c.fetchedAt) return null;
  return Date.now() - c.fetchedAt;
}

// Increment (or initialize) a counter with a TTL window. Returns current counter state.
export function incrCounter(key, ttlMs) {
  const now = Date.now();
  const existing = counters[key];
  if (!existing || existing.expiresAt <= now) {
    counters[key] = { count: 1, expiresAt: now + ttlMs };
  } else {
    counters[key].count += 1;
  }
  return { key, count: counters[key].count, expiresAt: counters[key].expiresAt };
}

export function getCounter(key) {
  const now = Date.now();
  const c = counters[key];
  if (!c) return null;
  if (c.expiresAt <= now) {
    delete counters[key];
    return null;
  }
  return { key, count: c.count, expiresAt: c.expiresAt };
}

export function counterRemainingMs(key) {
  const c = getCounter(key);
  if (!c) return 0;
  return Math.max(0, c.expiresAt - Date.now());
}

// Convenience: perform a rate check (increment first) and return whether limited.
// ttlMs defines the window size.
export function isRateLimited(key, limit, ttlMs) {
  const state = incrCounter(key, ttlMs);
  return state.count > limit;
}

export function _resetCounters() { // test-only
  for (const k of Object.keys(counters)) delete counters[k];
}
