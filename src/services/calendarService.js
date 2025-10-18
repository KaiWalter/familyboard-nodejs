import { apiGet } from '../public/js/apiClient.js';
import { readTokens } from '../auth/tokenStore.js';
import { setCache, getCache } from './cache.js';
// Note: front-end will import this via relative path rewriting when bundled; placeholder here for structure.

export async function fetchEvents() {
  // Placeholder: tokens would be used for Graph API authorization headers later
  readTokens(); // stub usage
  const cached = getCache('events');
  const previous = cached?.data;
  const events = await apiGet('/api/events');
  if (!previous || JSON.stringify(previous) !== JSON.stringify(events)) {
    setCache('events', events);
  }
  return events;
}
