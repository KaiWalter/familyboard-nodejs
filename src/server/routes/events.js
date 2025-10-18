import { Router } from 'express';
import { transformEvents } from '../../services/eventTransform.js';
import { loadConfig } from '../../config/store.js';
import { setCache, getCache } from '../../services/cache.js';
import { DateTime } from 'luxon';

// Placeholder stub events for 21-day range
function generateSampleEvents(zone) {
  const now = DateTime.now().setZone(zone).startOf('day');
  const events = [];
  // Simple pattern: one all-day multi-day event spanning first 3 days
  const startMulti = now.plus({ days: 2 }).toISODate();
  const endMulti = now.plus({ days: 5 }).toISODate();
  events.push({ id: 'E1', subject: 'Trip', start: startMulti + 'T00:00:00Z', end: endMulti + 'T00:00:00Z', isAllDay: true });
  // Timed single-day events
  for (let i = 0; i < 7; i++) {
    const day = now.plus({ days: i }).toISODate();
    events.push({ id: 'E' + (i + 2), subject: 'Event ' + (i + 1), start: day + 'T09:00:00Z', end: day + 'T10:30:00Z', isAllDay: false });
  }
  return events;
}

const router = Router();

router.get('/', (req, res) => {
  const cfg = loadConfig();
  const zone = cfg.timezone || 'UTC';
  const cached = getCache('events');
  if (cached?.data) {
    return res.json(cached.data);
  }
  const raw = generateSampleEvents(zone);
  const transformed = transformEvents(raw, zone);
  setCache('events', transformed);
  res.json(transformed);
});

export default router;
