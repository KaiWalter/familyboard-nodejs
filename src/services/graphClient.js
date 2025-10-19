// graphClient.js - Microsoft Graph SDK singleton wrapper
// Provides authenticated client for calendar & OneDrive operations using current access token.
// NOTE: Token acquisition handled elsewhere (interactive auth). This wrapper injects token per request.

import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken as getMsalAccessToken } from '../auth/msalToken.js';
import { audit as baseAudit } from '../util/log.js';

let _client;
let _initCount = 0;
// Mutable audit function for test instrumentation; defaults to baseAudit.
let auditFn = baseAudit;

// Test-only setter (exposed via __test) allowing unit tests to capture audit events without monkey patching ESM exports.
function __setAudit(fn) {
  auditFn = typeof fn === 'function' ? fn : baseAudit;
}

export function classifyAccessToken(token) {
  if (!token) return { type: 'none' };
  const parts = token.split('.');
  if (parts.length === 3 && parts.every(p => p.length > 0)) return { type: 'jwt' };
  return { type: 'opaque' };
}

async function getAccessToken() {
  try {
    const token = await getMsalAccessToken();
    const { type } = classifyAccessToken(token);
    if (type === 'opaque') auditFn('graph.token.opaque_format', { length: token.length });
    return token;
  } catch (e) {
    auditFn('graph.token.acquire_failed', { message: e.message });
    throw e;
  }
}

export function getGraphClient() {
  if (_client) return _client;
  _client = Client.init({
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        return done(null, token);
      } catch (e) {
        return done(e, null);
      }
    }
  });
  _initCount++;
  auditFn('graph.client.init', { count: _initCount });
  return _client;
}

export function getInitCount() { return _initCount; }

// Error mapping: shape errors into consistent { statusCode, retryable, category }
function mapGraphError(e) {
  const statusCode = e.statusCode || e.code || e.status;
  const scNumeric = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
  const transientCodes = [429, 500, 502, 503, 504];
  const transientNames = ['TooManyRequests','ServiceUnavailable','GatewayTimeout'];
  const retryable = transientCodes.includes(scNumeric) || (typeof statusCode === 'string' && transientNames.includes(statusCode));
  let category = 'fatal';
  if (retryable) category = statusCode === 429 ? 'throttle' : 'transient';
  return { statusCode: scNumeric || statusCode, retryable, category, message: e.message };
}

// Generic retry with exponential backoff for transient Graph errors (429, 500, 502, 503, 504)
async function graphRequestWithRetry(fn, context, { maxRetries = 4, baseDelayMs = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (raw) {
      const info = mapGraphError(raw);
      if (!info.retryable || attempt >= maxRetries) {
        auditFn('graph.retry.giveup', { context, attempt, code: info.statusCode, category: info.category, message: info.message });
        throw raw;
      }
      const delay = baseDelayMs * Math.pow(2, attempt); // exponential
      auditFn('graph.retry.backoff', { context, attempt, delay, code: info.statusCode, category: info.category });
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}

// Export internals for test instrumentation (non-production usage)
export const __test = { mapGraphError, graphRequestWithRetry, __setAudit };

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
      auditFn('graph.calendar.page', { calendarId, pageCount: events.length, total: all.length, hasNext: !!nextLink });
    } while (nextLink);
    auditFn('graph.calendar.fetch.success', { calendarId, count: all.length });
    return all;
  } catch (e) {
    auditFn('graph.calendar.fetch.error', { calendarId, message: e.message, name: e.name });
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
      // Removed .select to allow presence of @microsoft.graph.downloadUrl (a computed property not reliably returned when selected explicitly)
      .top(200)
      .get();
  }
  try {
    do {
      const resp = await graphRequestWithRetry(() => page(nextLink), context);
      let itemsRaw = resp.value || [];
      // Filter only image-like items (presence of photo facet) initially
      let items = itemsRaw.filter(i => i.photo);
      all.push(...items);
      auditFn('graph.photos.page', { folderPath, pageCount: items.length, total: all.length, hasNext: !!resp['@odata.nextLink'] });
      if(items.length === 0) {
        // Verbose diagnostic snapshot (no photo items found)
        const diag = Object.keys(resp).reduce((o,k) => { if(k !== 'value') o[k]=resp[k]; return o; }, {});
        auditFn('graph.photos.page.empty_diag', { folderPath, keys: Object.keys(resp), diag });
      }
      nextLink = resp['@odata.nextLink'];
    } while (nextLink);
    // Detect missing downloadUrl values; fallback fetch per id for small batches
    const missingDl = all.filter(i => !i['@microsoft.graph.downloadUrl']);
    if (missingDl.length) {
      auditFn('graph.photos.downloadurl.missing', { folderPath, count: missingDl.length });
      // Fallback: fetch each item by id to retrieve download URL; limit to first 200 to avoid excessive calls
      const maxFallback = 200;
      const subset = missingDl.slice(0, maxFallback);
      for (const item of subset) {
        try {
          const detail = await client.api(`/me/drive/items/${item.id}`).get();
          if (detail['@microsoft.graph.downloadUrl']) {
            item['@microsoft.graph.downloadUrl'] = detail['@microsoft.graph.downloadUrl'];
          }
        } catch (e) {
          auditFn('graph.photos.downloadurl.fetch_error', { id: item.id, message: e.message });
        }
      }
    }
    auditFn('graph.photos.fetch.success', { folderPath, count: all.length });
    return all.map(i => ({
      id: i.id,
      title: i.name,
      url: i['@microsoft.graph.downloadUrl'],
      width: i.photo?.width,
      height: i.photo?.height,
      orientation: (i.photo?.height >= i.photo?.width ? 'portrait' : 'landscape')
    }));
  } catch (e) {
    auditFn('graph.photos.fetch.error', { folderPath, message: e.message, name: e.name });
    throw e;
  }
}