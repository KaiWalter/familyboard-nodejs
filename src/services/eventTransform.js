import { expandAllDayMultiDay } from '../util/timezone.js';

export function transformEvents(rawEvents, zone) {
  // rawEvents assumed list of { id, subject, start, end, isAllDay }
  const expanded = [];
  for (const ev of rawEvents) {
    if (ev.isAllDay) {
      const days = expandAllDayMultiDay(ev.start, ev.end, zone);
      for (let i = 0; i < days.length; i++) {
        expanded.push({ ...ev, dayIndex: i, dayDate: days[i].toISODate() });
      }
    } else {
      expanded.push(ev);
    }
  }
  // Sort: all-day first (alphabetical), then timed by start
  return expanded.sort((a, b) => {
    if (a.isAllDay && b.isAllDay) return a.subject.localeCompare(b.subject);
    if (a.isAllDay) return -1;
    if (b.isAllDay) return 1;
    return a.start.localeCompare(b.start);
  });
}
