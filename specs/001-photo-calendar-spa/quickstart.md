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

## 3. First-Time Auth (Device Code Flow Option)
1. Start server in auth-init mode (future script): `node src/server/auth-init.js` (to be implemented).
2. Follow printed device code URL; sign in once.
3. Tokens saved to `data/tokens.json`.
4. Stop auth-init process after success.

(Alternative Authorization Code flow may be documented later.)

## 4. Configuration File
Create `data/config.json`:
```json
{
  "oneDriveFolderId": "YOUR_FOLDER_ID",
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
- Console output indicates auth refresh attempts (statuses: OK, Refreshing, Warning, Error).
- If network drops: events fallback served from `data/events.json`.
- Token refresh failures: check timestamp in `data/tokens.json` and remaining minutes reported by `/api/status`.

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
- Restrict permissions: `chmod 600 data/tokens.json`.
- Do not expose port publicly unless behind reverse proxy + auth.

## 14. Next Enhancements (Optional)
- Add script for device code auth.
- Add event DST test fixture.
- Add image preload for smoother transitions.

End of Quickstart.
