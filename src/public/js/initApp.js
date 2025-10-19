import { apiGet } from './apiClient.js';
import { initCalendar } from './calendarView.js';
import { initPhotoRotation, initPhotoPanelImmediate } from './photoRotator.js';
import { initResponsive } from './layout.js';
import { initOfflineBanner } from './offlineBanner.js';
import { initAuthIndicator } from './authIndicator.js';

async function loadConfig() {
  return apiGet('/api/config');
}

async function boot() {
  const cfg = await loadConfig();
  // Apply layout immediately based on golden ratio setting.
  initResponsive(cfg);
  // Render calendar using preloaded config (avoid duplicate fetch).
  initCalendar(cfg);
  // Show first photo ASAP (placeholder replaced after fetch) & start rotation.
  await initPhotoPanelImmediate();
  initPhotoRotation();
  initOfflineBanner();
  initAuthIndicator();
}

boot();
