import { DateTime } from 'luxon';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/store.js';
import { fetchCalendarView as fetchCalendarViewDefault } from './graphClient.js';
import { transformEvents } from './eventTransform.js';
import { setCache, getCache } from './cache.js';
import { audit } from '../util/log.js';

const EVENTS_CACHE_PATH_ENV = process.env.EVENTS_CACHE_PATH;
let eventsCachePath = path.resolve(EVENTS_CACHE_PATH_ENV || 'data/events.json');
let eventsHydratedFromDisk = false;
let fetchCalendarViewFn = fetchCalendarViewDefault;

function toUtcIso(graphDateTime) {
  if (!graphDateTime) return null;
  if (typeof graphDateTime === 'string') {
    const dt = DateTime.fromISO(graphDateTime);
    return dt.isValid ? dt.toUTC().toISO() : graphDateTime;
  }
  if (graphDateTime.dateTime) {
    const zone = graphDateTime.timeZone || graphDateTime.timezone || 'UTC';
    let dt = DateTime.fromISO(graphDateTime.dateTime, { zone });
    if (!dt.isValid) {
      dt = DateTime.fromISO(graphDateTime.dateTime, { zone: 'UTC' });
    }
    return dt.isValid ? dt.toUTC().toISO() : graphDateTime.dateTime;
  }
  return null;
}

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hydrateEventsFromDisk() {
  if (eventsHydratedFromDisk) return;
  eventsHydratedFromDisk = true;
  try {
    const raw = fs.readFileSync(eventsCachePath, 'utf-8');
    const payload = JSON.parse(raw);
    if (!payload || !Array.isArray(payload.events)) return;
    const fetchedAt = Date.parse(payload.fetchedAt || '') || Date.now();
    setCache('events', payload.events, fetchedAt);
    audit('calendar.cache.hydrated_disk', { count: payload.events.length });
  } catch (e) {
    // ignore missing/invalid cache files silently
  }
}

function persistEventsToDisk(events, fetchedAtMs) {
  try {
    ensureDirExists(eventsCachePath);
    const payload = {
      fetchedAt: new Date(fetchedAtMs).toISOString(),
      events
    };
    const tmpPath = `${eventsCachePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tmpPath, eventsCachePath);
  } catch (e) {
    audit('calendar.cache.persist_error', { message: e.message });
  }
}

// Fetch events across configured calendars using Microsoft Graph SDK
export async function fetchEvents() {
  hydrateEventsFromDisk();
  const cfg = loadConfig();
  const zone = cfg.timezone || 'UTC';
  const calendarIds = cfg.calendarIds || [];
  const cached = getCache('events');
  const cachedData = cached?.data || null;
  if (cachedData && cachedData.length) return cachedData;

  const startLocal = DateTime.now().setZone(zone).startOf('day');
  const endLocal = startLocal.plus({ days: 21 });
  const startISO = startLocal.toUTC().toISO();
  const endISO = endLocal.toUTC().toISO();

  let allRaw = [];
  for (const id of calendarIds) {
    try {
      const events = await fetchCalendarViewFn(id, startISO, endISO);
      // Normalize payload to expected shape
      const normalized = events.map(e => ({
        id: e.id,
        subject: e.subject || '(No title)',
        start: toUtcIso(e.start) || e.start,
        end: toUtcIso(e.end) || e.end,
        isAllDay: e.isAllDay || false,
        calendarId: id
      }));
      allRaw = allRaw.concat(normalized);
    } catch (e) {
      audit('calendar.fetch.error', { calendarId: id, message: e.message });
    }
  }
  if (allRaw.length === 0) {
    return cachedData || [];
  }
  const transformed = transformEvents(allRaw, zone);
  if (!transformed.length) {
    return cachedData || [];
  }
  const fetchedAt = Date.now();
  setCache('events', transformed, fetchedAt);
  persistEventsToDisk(transformed, fetchedAt);
  return transformed;
}

// --- Test helpers (not for production use) ---
export function __setFetchCalendarView(fn) {
  fetchCalendarViewFn = fn || fetchCalendarViewDefault;
}

export function __setEventsCachePath(filePath) {
  if (!filePath) {
    eventsCachePath = path.resolve(EVENTS_CACHE_PATH_ENV || 'data/events.json');
  } else {
    eventsCachePath = path.resolve(filePath);
  }
  eventsHydratedFromDisk = false;
}

export function __resetEventsCacheForTests() {
  eventsHydratedFromDisk = false;
  try { setCache('events', null); } catch {}
}
