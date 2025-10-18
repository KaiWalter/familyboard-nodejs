import { apiGet, apiPut } from './apiClient.js';
import { initCalendar } from './calendarView.js';
import { initPhotoRotation } from './photoRotator.js';
import { initResponsive } from './layout.js';

async function loadConfig() {
  return apiGet('/api/config');
}

function parseWeekdayOverride(raw) {
  const map = {};
  if (!raw) return map;
  raw.split(',').forEach(pair => {
    const [day, val] = pair.split('=');
    const d = parseInt(day.trim(), 10);
    if (!isNaN(d) && val) map[d] = val.trim();
  });
  return map;
}

export async function initConfigForm() {
  const cfg = await loadConfig();
  const form = document.getElementById('config-form');
  form.timezone.value = cfg.timezone;
  form.locale.value = cfg.locale;
  form.calendarIds.value = cfg.calendarIds.join(',');
  form.goldenRatio.checked = cfg.goldenRatio;
  form.weekdayOverride.value = Object.entries(cfg.weekdayAbbrevOverride || {}).map(([d,v]) => `${d}=${v}`).join(',');
  initResponsive(cfg);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newCfg = {
      timezone: form.timezone.value.trim() || 'UTC',
      locale: form.locale.value.trim() || 'en-US',
      calendarIds: form.calendarIds.value.trim() ? form.calendarIds.value.split(',').map(s => s.trim()).filter(Boolean) : [],
      goldenRatio: form.goldenRatio.checked,
      weekdayAbbrevOverride: parseWeekdayOverride(form.weekdayOverride.value)
    };
    try {
      await apiPut('/api/config', newCfg);
      await initCalendar();
      await initPhotoRotation();
      initResponsive(newCfg);
    } catch (err) {
      console.error('[config] save failed', err);
    }
  });
}