// graphClient.js - Microsoft Graph SDK singleton wrapper
// Provides authenticated client for calendar & OneDrive operations using current access token.
// NOTE: Token acquisition handled elsewhere (interactive auth). This wrapper injects token per request.

import { Client } from '@microsoft/microsoft-graph-client';
import { readTokens } from '../auth/tokenStore.js';
import { audit } from '../util/log.js';

let _client;
let _initCount = 0;

export function classifyAccessToken(token) {
  if (!token) return { type: 'none' };
  const parts = token.split('.');
  if (parts.length === 3 && parts.every(p => p.length > 0)) return { type: 'jwt' };
  return { type: 'opaque' };
}

function getAccessToken() {
  const tokens = readTokens();
  if (!tokens || !tokens.accessToken) throw new Error('no_access_token');
  const { type } = classifyAccessToken(tokens.accessToken);
  if (type === 'opaque') {
    // Accept opaque token but emit audit so operator can migrate to v2 JWT issuance.
    audit('graph.token.opaque_format', { length: tokens.accessToken.length });
  }
  return tokens.accessToken;
}

export function getGraphClient() {
  if (_client) return _client;
  _client = Client.init({
    authProvider: async (done) => {
      try {
        const token = getAccessToken();
        return done(null, token);
      } catch (e) {
        return done(e, null);
      }
    }
  });
  _initCount++;
  audit('graph.client.init', { count: _initCount });
  return _client;
}

export function getInitCount() { return _initCount; }

// Generic retry with exponential backoff for transient Graph errors (429, 503, 504)
async function graphRequestWithRetry(fn, context, { maxRetries = 4, baseDelayMs = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      const code = e.statusCode || e.code || e.status;
      const retryable = [429, 503, 504].includes(code) || (typeof code === 'string' && ['TooManyRequests','ServiceUnavailable'].includes(code));
      if (!retryable || attempt >= maxRetries) {
        audit('graph.retry.giveup', { context, attempt, code, message: e.message });
        throw e;
      }
      const delay = baseDelayMs * Math.pow(2, attempt); // exponential
      audit('graph.retry.backoff', { context, attempt, delay, code });
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}

// Helper: fetch calendar events for given calendarId between start and end ISO datetimes with pagination
export async function fetchCalendarView(calendarId, startISO, endISO) {
  const client = getGraphClient();
  const path = `/me/calendars/${calendarId}/calendarView`;
  const all = [];
  let nextLink;
  const context = `calendar:${calendarId}`;
  async function page(url) {
    return client
      .api(url || path)
      .query({ startDateTime: startISO, endDateTime: endISO })
      .select('id,subject,start,end,isAllDay')
      .top(50)
      .get();
  }
  try {
    do {
      const resp = await graphRequestWithRetry(() => page(nextLink), context);
      const events = Array.isArray(resp.value) ? resp.value : [];
      all.push(...events);
      nextLink = resp['@odata.nextLink'];
      audit('graph.calendar.page', { calendarId, pageCount: events.length, total: all.length, hasNext: !!nextLink });
    } while (nextLink);
    audit('graph.calendar.fetch.success', { calendarId, count: all.length });
    return all;
  } catch (e) {
    audit('graph.calendar.fetch.error', { calendarId, message: e.message, name: e.name });
    throw e;
  }
}

// Helper: list images in OneDrive folder (path) with pagination & retry
export async function fetchPhotoItems(folderPath) {
  const client = getGraphClient();
  const basePath = `/me/drive/root:/${folderPath}:/children`;
  let nextLink;
  const all = [];
  const context = `photos:${folderPath}`;
  async function page(url) {
    return client
      .api(url || basePath)
      .select('id,name,@microsoft.graph.downloadUrl,photo')
      .top(200)
      .get();
  }
  try {
    do {
      const resp = await graphRequestWithRetry(() => page(nextLink), context);
      const items = (resp.value || []).filter(i => i['@microsoft.graph.downloadUrl'] && i.photo);
      all.push(...items);
      audit('graph.photos.page', { folderPath, pageCount: items.length, total: all.length, hasNext: !!resp['@odata.nextLink'] });
      nextLink = resp['@odata.nextLink'];
    } while (nextLink);
    audit('graph.photos.fetch.success', { folderPath, count: all.length });
    return all.map(i => ({
      id: i.id,
      title: i.name,
      url: i['@microsoft.graph.downloadUrl'],
      width: i.photo?.width,
      height: i.photo?.height,
      orientation: (i.photo?.height >= i.photo?.width ? 'portrait' : 'landscape')
    }));
  } catch (e) {
    audit('graph.photos.fetch.error', { folderPath, message: e.message, name: e.name });
    throw e;
  }
}