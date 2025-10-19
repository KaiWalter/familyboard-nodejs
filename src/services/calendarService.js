import { DateTime } from 'luxon';
import { loadConfig } from '../config/store.js';
import { fetchCalendarView } from './graphClient.js';
import { transformEvents } from './eventTransform.js';
import { setCache, getCache } from './cache.js';
import { audit } from '../util/log.js';

// Fetch events across configured calendars using Microsoft Graph SDK
export async function fetchEvents() {
  const cfg = loadConfig();
  const zone = cfg.timezone || 'UTC';
  const calendarIds = cfg.calendarIds || [];
  const cached = getCache('events');
  if (cached?.data) return cached.data;

  const start = DateTime.now().setZone(zone).startOf('day');
  const end = start.plus({ days: 21 });
  const startISO = start.toISO();
  const endISO = end.toISO();

  let allRaw = [];
  for (const id of calendarIds) {
    try {
      const events = await fetchCalendarView(id, startISO, endISO);
      // Normalize payload to expected shape
      const normalized = events.map(e => ({
        id: e.id,
        subject: e.subject || '(No title)',
        start: e.start?.dateTime ? e.start.dateTime + 'Z' : e.start, // simplistic; refine timezone later
        end: e.end?.dateTime ? e.end.dateTime + 'Z' : e.end,
        isAllDay: e.isAllDay || false,
        calendarId: id
      }));
      allRaw = allRaw.concat(normalized);
    } catch (e) {
      audit('calendar.fetch.error', { calendarId: id, message: e.message });
    }
  }
  const transformed = transformEvents(allRaw, zone);
  setCache('events', transformed);
  return transformed;
}
