import { Router } from 'express';
import { fetchEvents } from '../../services/calendarService.js';
import { audit } from '../../util/log.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const events = await fetchEvents();
    if (!Array.isArray(events) || events.length === 0) {
      audit('calendar.events.empty', {});
      return res.json([]);
    }
    res.json(events);
  } catch (e) {
    audit('calendar.events.error', { message: e.message });
    res.status(503).json({ error: 'calendar_unavailable' });
  }
});

export default router;
