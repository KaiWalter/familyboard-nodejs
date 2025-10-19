// graphClient.js - Microsoft Graph SDK singleton wrapper
// Provides authenticated client for calendar & OneDrive operations using current access token.
// NOTE: Token acquisition handled elsewhere (interactive auth). This wrapper injects token per request.

import { Client } from '@microsoft/microsoft-graph-client';
import { readTokens } from '../auth/tokenStore.js';
import { audit } from '../util/log.js';

let _client;
let _initCount = 0;

function getAccessToken() {
  const tokens = readTokens();
  if (!tokens || !tokens.accessToken) throw new Error('no_access_token');
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

// Helper: fetch calendar events for given calendarId between start and end ISO datetimes
export async function fetchCalendarView(calendarId, startISO, endISO) {
  const client = getGraphClient();
  // Using calendarView endpoint; expects startDateTime & endDateTime query params
  const path = `/me/calendars/${calendarId}/calendarView`;
  try {
    const resp = await client
      .api(path)
      .query({ startDateTime: startISO, endDateTime: endISO })
      .select('id,subject,start,end,isAllDay')
      .top(50) // basic limit; pagination could be added later
      .get();
    const events = Array.isArray(resp.value) ? resp.value : [];
    audit('graph.calendar.fetch.success', { calendarId, count: events.length });
    return events;
  } catch (e) {
    audit('graph.calendar.fetch.error', { calendarId, message: e.message, name: e.name });
    throw e;
  }
}

// Helper: list images in OneDrive folder (by path or item id). For simplicity using /me/drive/root:/{path}:/children
export async function fetchPhotoItems(folderPath) {
  const client = getGraphClient();
  const encodedPath = encodeURIComponent(folderPath);
  const apiPath = `/me/drive/root:/${folderPath}:/children`; // avoid double encoding for Graph path segment
  try {
    const resp = await client
      .api(apiPath)
      .select('id,name,webUrl,file,photo')
      .top(200)
      .get();
    const items = (resp.value || []).filter(i => i.file && i.photo); // ensure it's a photo
    audit('graph.photos.fetch.success', { folderPath, count: items.length });
    return items.map(i => ({ id: i.id, title: i.name, url: i.webUrl, orientation: (i.photo?.height >= i.photo?.width ? 'portrait' : 'landscape') }));
  } catch (e) {
    audit('graph.photos.fetch.error', { folderPath, message: e.message, name: e.name });
    throw e;
  }
}