import { apiGet } from './apiClient.js';
// Dynamic luxon import: prefer vendor path in browser, fallback to package in Node test environment.
let DateTime;
try {
  ({ DateTime } = await import('/vendor/luxon.js'));
} catch {
  ({ DateTime } = await import('luxon'));
}

export function dayRange21(zone) {
  const anchorMonday = DateTime.now().setZone(zone).startOf('week'); // Monday anchor per spec FR-023
  return Array.from({ length: 21 }, (_, i) => anchorMonday.plus({ days: i }));
}

export function weekdayAbbrev(dt, locale) {
  return dt.setLocale(locale).toFormat('ccc').slice(0, 2); // first two letters
}

async function loadConfig() {
  return apiGet('/api/config');
}

async function loadEvents() {
  return apiGet('/api/events');
}

export function renderGrid(days, cfg) {
  const panel = document.getElementById('calendar-panel');
  panel.innerHTML = '';
  const locale = cfg.locale;
  const override = cfg.weekdayAbbrevOverride || {};

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  grid.style.display = 'grid';
  // Add an extra first column for week numbers (row headers): 1 narrow + 7 day columns
  grid.style.gridTemplateColumns = 'minmax(2.2rem, 2.5rem) repeat(7, 1fr)';
  grid.style.gridAutoRows = '1fr';
  grid.style.gap = '4px';

  // Top-left corner (blank cell placeholder for column of week numbers)
  const corner = document.createElement('div');
  corner.className = 'corner-header';
  grid.appendChild(corner);

  // Weekday column headers
  for (let w = 0; w < 7; w++) {
    const h = document.createElement('div');
    const dt = days[w];
    const code = override[dt.weekday] || weekdayAbbrev(dt, locale);
    h.textContent = code;
    h.className = 'column-header';
    grid.appendChild(h);
  }

  const todayIso = DateTime.now().setZone(cfg.timezone).toISODate();

  // Render 3 week rows
  for (let row = 0; row < 3; row++) {
    const weekStart = days[row * 7];
    const weekNumberCell = document.createElement('div');
    weekNumberCell.className = 'row-header';
    weekNumberCell.textContent = String(weekStart.weekNumber);
    grid.appendChild(weekNumberCell);
    for (let col = 0; col < 7; col++) {
      const idx = row * 7 + col;
      const dt = days[idx];
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.border = '1px solid var(--border)';
      cell.style.padding = '2px';
      if (dt.toISODate() === todayIso) {
        cell.classList.add('current-day');
      }
      const head = document.createElement('div');
      head.className = 'cell-header';
      const dayNum = dt.toFormat('d');
      // Month abbreviation rule: first Monday cell OR any day-of-month = 1 cell
      if (idx === 0 || dt.day === 1) {
        head.textContent = `${dayNum} ${dt.toFormat('LLL')}`;
      } else {
        head.textContent = dayNum;
      }
      cell.appendChild(head);
      cell.dataset.date = dt.toISODate();
      grid.appendChild(cell);
    }
  }
  panel.appendChild(grid);
}

export function attachEvents(events, timezone) {
  const byDate = new Map();
  for (const ev of events) {
    const date = ev.dayDate ? ev.dayDate : DateTime.fromISO(ev.start).setZone(timezone).toISODate();
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(ev);
  }

  for (const [date, list] of byDate.entries()) {
    const cell = document.querySelector(`.cell[data-date="${date}"]`);
    if (!cell) continue;
    // Sort events: all-day first (alpha), then timed by start
    list.sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (a.isAllDay && b.isAllDay) {
        return a.subject.localeCompare(b.subject);
      }
      // both timed
      return new Date(a.start) - new Date(b.start);
    });
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No events';
      cell.appendChild(empty);
      continue;
    }
    for (const ev of list) {
      const div = document.createElement('div');
      div.className = 'event' + (ev.isAllDay ? ' all-day' : '');
      if (ev.isAllDay) {
        div.textContent = ev.subject + (ev.dayIndex && ev.dayIndex > 0 ? ' …' : '');
      } else {
        const start = DateTime.fromISO(ev.start).setZone(timezone);
        const end = DateTime.fromISO(ev.end).setZone(timezone);
        div.textContent = `${start.toFormat('H:mm')} - ${end.toFormat('H:mm')} ${ev.subject}`;
      }
      cell.appendChild(div);
    }
  }

  // Fill empty cells
  document.querySelectorAll('.cell').forEach(cell => {
    if (cell.children.length === 1) { // only header present
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No events';
      cell.appendChild(empty);
    }
  });

  // ARIA labeling
  document.querySelectorAll('.cell').forEach(cell => {
    const date = cell.dataset.date;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Events for ${date}`);
  });
}

let refreshTimer;
let midnightTimer;

function setupMidnightRollover(cfg) {
  if (midnightTimer) clearInterval(midnightTimer);
  midnightTimer = setInterval(() => {
    const currentDay = DateTime.now().setZone(cfg.timezone).toISODate();
    const highlighted = document.querySelector('.current-day');
    if (highlighted && highlighted.dataset.date !== currentDay) {
      initCalendar();
    }
  }, 60_000); // minute checks acceptable
}

function setupPeriodicRefresh(cfg) {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    // Refresh events (FR-018a) without rebuilding grid unless day changed
    const events = await loadEvents();
    // Clear old events (preserve headers & existing cells)
    document.querySelectorAll('.cell').forEach(c => {
      // Remove all children except the first (header)
      while (c.children.length > 1) c.removeChild(c.lastChild);
    });
    attachEvents(events, cfg.timezone);
  }, 180_000); // 180s
}

export async function initCalendar(preloadedCfg) {
  const cfg = preloadedCfg || await loadConfig();
  const days = dayRange21(cfg.timezone);
  renderGrid(days, cfg);
  const events = await loadEvents();
  attachEvents(events, cfg.timezone);
  setupMidnightRollover(cfg);
  setupPeriodicRefresh(cfg);
}
