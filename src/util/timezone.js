import { DateTime } from 'luxon';

export function toLocal(isoString, zone) {
  return DateTime.fromISO(isoString, { zone: 'utc' }).setZone(zone);
}

export function formatEventRange(startIso, endIso, zone) {
  const start = toLocal(startIso, zone);
  const end = toLocal(endIso, zone);
  // All-day heuristic: midnight to midnight
  if (start.hasSame(end.minus({ minutes: 1 }), 'day') && start.hour === 0 && end.hour === 0) {
    return 'All day';
  }
  return `${start.toFormat('H:mm')} - ${end.toFormat('H:mm')}`;
}

export function getWeekNumber(isoString, zone) {
  return toLocal(isoString, zone).weekNumber;
}

export function isSameDay(aIso, bIso, zone) {
  const a = toLocal(aIso, zone);
  const b = toLocal(bIso, zone);
  return a.hasSame(b, 'day');
}

export function expandAllDayMultiDay(startIso, endIso, zone) {
  // Return array of DateTime objects for each day covered by an all-day multi-day event
  const start = toLocal(startIso, zone).startOf('day');
  const end = toLocal(endIso, zone).startOf('day');
  const days = [];
  for (let d = start; d < end; d = d.plus({ days: 1 })) {
    days.push(d);
  }
  return days;
}
