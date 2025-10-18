export function initOfflineBanner() {
  const banner = document.createElement('div');
  banner.textContent = 'Offline - using cached data';
  banner.style.position = 'fixed';
  banner.style.bottom = '0';
  banner.style.left = '0';
  banner.style.right = '0';
  banner.style.background = 'var(--error)';
  banner.style.color = '#fff';
  banner.style.padding = '0.25rem';
  banner.style.fontSize = '0.7rem';
  banner.style.display = 'none';
  banner.id = 'offline-banner';
  document.body.appendChild(banner);
  function update() {
    banner.style.display = navigator.onLine ? 'none' : 'block';
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}