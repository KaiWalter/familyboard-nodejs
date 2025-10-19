const POLL_INTERVAL = 30000; // 30s

function formatRemaining(mins) {
  if (mins == null) return 'n/a';
  if (mins < 1) return '<1m';
  return mins + 'm';
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function updateUI(container, status) {
  if (!status) {
    container.textContent = 'Auth: unavailable';
    return;
  }
  const auth = status.auth;
  container.innerHTML = '';
  const line = document.createElement('div');
  line.textContent = `Auth: ${auth.status} | Expires: ${formatRemaining(auth.remainingMinutes)} | Refresh: ${auth.hasRefreshToken ? 'Yes' : 'No'}`;
  container.appendChild(line);
  if (auth.hasRefreshToken) {
    const btn = document.createElement('button');
    btn.textContent = 'Rotate Token';
    btn.style.marginLeft = '0.5rem';
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Rotating...';
      try {
        const r = await fetch('/api/auth/rotate', { method: 'POST' });
        btn.textContent = r.ok ? 'Rotate Token' : 'Failed (retry)';
        btn.disabled = false;
        // Force immediate refresh
        const s = await fetchStatus();
        updateUI(container, s);
      } catch {
        btn.textContent = 'Error';
        btn.disabled = false;
      }
    };
    container.appendChild(btn);
  }
}

export function initAuthIndicator() {
  const container = document.createElement('aside');
  container.id = 'auth-indicator';
  container.setAttribute('aria-label', 'authentication status');
  container.className = 'auth-indicator';
  document.body.appendChild(container);
  (async () => updateUI(container, await fetchStatus()))();
  setInterval(async () => updateUI(container, await fetchStatus()), POLL_INTERVAL);
}
