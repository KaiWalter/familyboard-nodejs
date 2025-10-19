# Quickstart: FamilyBoard Photo & Calendar SPA

Branch: 001-photo-calendar-spa
Date: 2025-10-18
Spec: ./spec.md

## 1. Prerequisites
- Node.js 20+ installed
- Access to Microsoft account with target Outlook calendars & OneDrive folder
- A kiosk-capable machine (Linux) with Chromium or Chrome

## 2. Environment Variables (planned)
Create `.env` (optional if you choose to export manually):
```
MS_CLIENT_ID=your-app-client-id
MS_TENANT_ID=common
MS_SCOPES="Calendars.Read Files.Read"
PORT=3000
```
If `.env` not used, export variables directly in shell.

## 3. First-Time Auth (Confidential Authorization Code Flow)
1. Ensure environment variables (client id, secret, scopes) and `redirectUri` in config are set.
2. Start server: `node src/server/index.js`.
3. GET `http://localhost:3000/signin` to receive JSON with `authorizationUrl` and `state`.
4. Open `authorizationUrl` in a browser; complete provider login & consent.
5. Provider redirects to `/callback?code=...&state=...`; server exchanges code and stores tokens at `data/tokens.json`.
6. Subsequent launches reuse stored tokens automatically until refresh or revocation.
7. POST `/signout` (or delete token file) to force re-authentication.

## 4. Configuration File
Create `data/config.json`:
```json
{
  "photoFolderPath": "Pictures/FamilyBoard",
  "calendar": {
    "calendarIds": ["primary"],
    "locale": "en-US",
    "timezone": "Europe/Berlin"
  },
  "layout": {"goldenRatioEnabled": true, "ratio": 1.618},
  "rotation": {"intervalSeconds": 90}
}
```

## 5. Install Dependencies (once code added)
```bash
npm install express msal-node luxon
```

## 6. Run Server
```bash
node src/server/index.js
```
Server listens on `$PORT` (default 3000). Static UI served at `/`.

## 7. Launch Kiosk Browser
Chromium example:
```bash
chromium --kiosk --app=http://localhost:3000 --disable-pinch --overscroll-history-navigation=0
```

## 8. Verification Steps
- Load page: calendar grid shows 21 days.
- Photo pane shows placeholder or first image.
- After 90s photo rotates.
- After 180s events refetched (check console logs).
- Current day cell highlighted.

## 9. Logs & Troubleshooting
- Auth events: JSON lines (e.g., `auth.signin.initiated`, `auth.callback.tokens_persisted`, `auth.refresh.success`, `auth.refresh.failed`, `auth.signout`).
- If network drops: events fallback served from `data/events.json`; status may show Warning.
- Refresh failures trigger retries with exponential backoff; after exhaustion tokens remain until re-auth required.
- Remaining minutes & status visible via `/api/status`.

## 10. Safe Shutdown
- Ctrl+C server process.
- Browser kiosk can be exited with Alt+F4 (depends on window manager).

## 11. Updating Config
Send PUT to `/api/config` or edit `data/config.json` then restart server (hot reload optional later).

## 12. Minimal Testing
Manual smoke:
```bash
node src/server/index.js &
SERVER_PID=$!
# (Future) curl http://localhost:3000/api/status
kill $SERVER_PID
```
Automated tests will use `node:test` once added.

## 13. Security Notes
- Restrict permissions: `chmod 600 data/tokens.json` (and config containing client secret).
- Never log raw token or client secret values (masking utility enforced in code).
- Default rate limit: 5 failed sign-in initiations per minute; adjust in config if needed.
- Use reverse proxy & network segmentation for production kiosk deployments.

## 14. Next Enhancements (Optional)
- Device code fallback flow (headless maintenance usage).
- Event DST test fixture.
- Image preload for smoother transitions.
- Token at-rest encryption.

End of Quickstart.
