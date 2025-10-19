import { apiGet } from './apiClient.js';
// Dynamic luxon import: prefer vendor path in browser, fallback to package in Node test environment.
let DateTime;
try {
  ({ DateTime } = await import('/vendor/luxon.js'));
} catch {
  ({ DateTime } = await import('luxon'));
}

export function dayRange21(zone) {
  const start = DateTime.now().setZone(zone).startOf('week'); // Monday assumed locale default
  return Array.from({ length: 21 }, (_, i) => start.plus({ days: i }));
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

  // Month labels logic
  const firstMonday = days[0];
  const monthLabelDiv = document.createElement('div');
  monthLabelDiv.className = 'month-label';
  monthLabelDiv.textContent = firstMonday.toFormat('LLL');
  panel.appendChild(monthLabelDiv);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.style.gridAutoRows = '1fr';
  grid.style.gap = '4px';

  // headers
  for (let w = 0; w < 7; w++) {
    const h = document.createElement('div');
    const dt = days[w];
    const code = override[dt.weekday] || weekdayAbbrev(dt, locale);
    h.textContent = code;
    h.className = 'column-header';
    grid.appendChild(h);
  }

  const todayIso = DateTime.now().setZone(cfg.timezone).toISODate();

  // 3 rows (weeks)
  for (let row = 0; row < 3; row++) {
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
      // Month abbreviation rules: first Monday cell (days[0]) already handled separately above.
      // For any cell where day-of-month = 1 include month (e.g., '1 Nov').
      const dayNum = dt.toFormat('d');
      if (dt.day === 1) {
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
        div.textContent = ev.subject + (ev.dayIndex && ev.dayIndex > 0 ? ' …' : ''); // continuation indicator
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

function setupMidnightRollover(cfg) {
  setInterval(() => {
    const currentDay = DateTime.now().setZone(cfg.timezone).toISODate();
    const highlighted = document.querySelector('.current-day');
    if (highlighted && highlighted.dataset.date !== currentDay) {
      // Re-render grid on rollover
      initCalendar();
    }
  }, 60_000); // check each minute
}

export async function initCalendar(preloadedCfg) {
  const cfg = preloadedCfg || await loadConfig();
  const days = dayRange21(cfg.timezone);
  renderGrid(days, cfg);
  const events = await loadEvents();
  attachEvents(events, cfg.timezone);
  setupMidnightRollover(cfg);
}
