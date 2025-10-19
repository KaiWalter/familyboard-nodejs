# Family Board Photo & Calendar SPA

Interactive-only authentication using MSAL for Node.js (`ConfidentialClientApplication`) with Authorization Code + Refresh Token. No client-credentials fallback is used; protected routes require a valid user token.

## Interactive Flow Overview
1. `GET /signin` – Issues a cryptographically strong `state`, constructs authorization URL using exactly the configured scopes (no implicit additions), returns JSON (or 302 redirect for browser UA without `format=json`).
2. User completes provider login/consent; provider redirects to configured `redirectUri` pointing to `GET /callback`.
3. `GET /callback` – Validates single-use `state`, exchanges `code` via MSAL, enforces scope boundary, persists normalized token set (`data/tokens.json`).
4. Refresh: Background scheduler (when enabled) and optional manual `POST /api/auth/rotate` extend lifetime using the refresh token.
5. `POST /signout` – Clears persisted tokens; protected routes return 401 until a new interactive sign-in completes.

## No App-Only Fallback
The application will return `401 not_authenticated` for protected resources until a user completes the `/signin` + `/callback` flow. Any previous client credentials module is retained only for historical reference and is not invoked.

## Key Files
| File | Purpose |
|------|---------|
| `src/auth/codeExchange.js` | Encapsulates authorization code -> token exchange (MSAL) |
| `src/server/routes/signin.js` | Initiate interactive login and generate state |
| `src/server/routes/callback.js` | Validate state & persist tokens |
| `src/server/routes/signout.js` | Clear tokens (end user session) |
| `src/server/routes/authRotate.js` | Manual refresh (test-mode simulation supported) |
| `src/auth/requireAuth.js` | Middleware enforcing presence of user token |
| `src/auth/tokenStore.js` | Atomic persistence, masking & status updates |
| `src/auth/clientCredentials.js` | (Legacy, unused) prior app-only acquisition module (scheduled for removal) |

## Configuration
All runtime configuration is file-based via `data/config.json` (no in-app configuration panel). On startup the SPA reads this file once and initializes layout (golden ratio, calendar IDs, photo folder path) and begins immediate photo rotation.

`data/config.json` example (delegated scopes + layout + rotation):
```jsonc
{
	"auth": {
		"clientId": "<app-client-id>",
		"clientSecret": "<client-secret>",
		"tenant": "<tenant-id-or-domain-or 'consumers'>",
		"redirectUri": "http://localhost:3000/callback",
		"scopes": ["User.Read", "Calendars.Read", "offline_access"]
	}
}
```
Additional settings:
- `photoFolderPath`: Path under user drive root (`Pictures/FamilyBoard`).
- `goldenRatio`: Boolean to enable calendar:photo width ≈ 1.618:1 pixel ratio.
- `photoRotationSeconds`: Rotation interval (default 90). Must be >5 to take effect.

Required delegated scopes for full functionality (calendar + photos):
- `User.Read` (baseline profile)
- `Calendars.Read` (fetch events)
- `Files.Read` (list and download OneDrive images)
Optionally `offline_access` if refresh tokens are desired. Without `Files.Read` photo fetch will fail with 401.

Environment overrides (not persisted): `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_TENANT`, `AUTH_REDIRECT_URI`, `AUTH_SCOPES` (comma delimited), `AUTH_RATE_LIMIT` (signin throttling), `AUTH_TEST_MODE` (enables deterministic refresh in tests).

If future requirements demand background (app-only) operations, reintroduce a separate service identity flow; current scope deliberately omits it for clearer user-driven consent.

## Token Schema
`tokenStore` persists a single JSON object:
```jsonc
{
	"accessToken": "...",
	"refreshToken": "...|no_refresh_token",
	"expiresAt": 1730000000000,
	"scopes": ["User.Read","offline_access"],
	"rotation": 2,
	"status": "OK",
	"provider": "msal",
	"tokenType": "user|application"
}
```
`tokenType` will be `user` (application tokens are not produced in interactive-only mode).

## Manual Refresh Endpoint
`POST /api/auth/rotate` – Attempts refresh using the stored refresh token. In test mode (`AUTH_TEST_MODE=1`) skips network exchange and simply extends expiry by 1 hour for deterministic assertions.

## Sign-Out
`POST /signout` – Deletes token file. Subsequent protected calls receive 401 until sign-in repeats.

## Callback Redirect Behavior
After a successful authorization code exchange at `/callback`, the server issues a `302` redirect to the kiosk root (`/`). To receive a JSON confirmation instead (useful for scripted or API-based automation), send `Accept: application/json` or append `?format=json`; the response will be `200 { "success": true, "redirect": "/" }`.

## Middleware Behavior
`requireAuth`:
1. If a user token exists (`tokenType: user`) – pass through.
2. Otherwise return 401 without attempting any fallback.

## Audit Events (subset)
Interactive: `auth.signin.initiated`, `auth.signin.authorization_url`, `auth.callback.tokens_persisted`, `auth.callback.invalid_state`, `auth.callback.scope_mismatch`, `auth.code_exchange.no_refresh_token`.
Client credential audit events are not expected in interactive-only mode.
Refresh / Rotation: `auth.refresh.initiated`, `auth.refresh.success`, `auth.rotate.success`, `auth.rotate.error`.
Security / Errors: `auth.middleware.error`, `auth.signout.cleared`.
Photos / Graph:
- `photos.fetch.no_token` – unauthenticated
- `photos.fetch.invalid_token` – persisted access token not in JWT compact serialization (format error)
- `photos.fetch.empty_folder` – folder path valid but no image items
- `graph.retry.backoff` – transient Graph error; exponential backoff applied
- `graph.retry.giveup` – retries exhausted; fallback to cached data

## Usage Examples
Interactive first-time sign-in:
```bash
curl http://localhost:3000/signin?format=json
# open authorizationUrl, then after redirect tokens are stored
```

Using middleware in a service route:
```js
import { requireAuth } from '../auth/requireAuth.js';
app.get('/api/calendar', requireAuth, async (req, res) => { /* downstream uses persisted token */ });
```

Manual rotation (optional):
```bash
curl -X POST http://localhost:3000/api/auth/rotate
```

Sign out:
```bash
curl -X POST http://localhost:3000/signout
```

## Testing
Run full suite:
```
npm test
```
Integration tests cover state validation, scope handling without implicit offline_access injection, manual rotate, signout clearing, and error paths (invalid state, scope issues).
Unit tests include pagination/retry logic, golden ratio width tolerance, immediate photo display, placeholder distinction (unauthenticated vs empty folder), and month abbreviation rendering.

Troubleshooting token format:
- If audit shows `photos.fetch.invalid_token` or `graph.retry.giveup` with code 401 and message referencing `IDX14100: JWT is not well formed`, delete `data/tokens.json` and re-run `/signin` ensuring you complete interactive consent. Token must contain three base64url segments separated by two dots.

### Token Health Helper Script

Use `scripts/tokenHealth.mjs` to quickly assess token validity and scope completeness.

Run (human-readable):
```bash
node scripts/tokenHealth.mjs
```

Run (JSON output):
```bash
node scripts/tokenHealth.mjs --json
```

Exit codes:
- 0: Healthy (well-formed JWT, required scopes present)
- 2: Invalid / unreadable token (file missing, malformed JWT, decode error)
- 3: Valid JWT format but missing required scopes

Required scopes checked: `User.Read`, `Calendars.Read`, `Files.Read`.

If missing scopes, sign out then sign in again requesting those scopes.

## Security Guidelines
Store secrets in environment or secret manager (avoid committing to repo). Limit delegated scopes to least privilege. Include `offline_access` only if refresh is required. Monitor audit logs for anomalies.

## Roadmap / Next Steps
1. Calendar auto-refresh every 180s (pending FR-018a).
2. Pagination/throttling for large OneDrive folders.
3. Expose `tokenType` (currently always `user`) explicitly in status endpoint.
4. Consider encrypting token file at rest (optional; local dev/demo scope).
5. Remove legacy client credentials code after confirming it is no longer referenced.

## Automation & Headless Operation

To avoid manual browser sign-in and copying console logs, several automation aids are available:

### Device Code Login
Use an out-of-band device code flow (no browser automation) to obtain tokens:
```bash
node -e "import('./scripts/deviceLogin.mjs').then(m=>m.run(['User.Read','Calendars.Read','Files.Read']))"
```
(Helper script to be added: `scripts/deviceLogin.mjs` – prompts with device code message, persists tokens.)

### Audit Log Streaming
Audit events are appended to `data/audit.log` (override with `AUDIT_FILE`). Tail them live:
```bash
node scripts/auditTail.mjs --follow 'photos.*' 'graph.*'
```
JSON output:
```bash
node scripts/auditTail.mjs --follow --json 'graph.retry.*'
```

### Token Health CI Check
Integrate `node scripts/tokenHealth.mjs --json` in CI to fail builds when scopes missing or token malformed (exit codes 2/3).

Opaque vs JWT Tokens:
If the token health script reports `accessToken not a well-formed JWT (opaque token?)`, ensure you are requesting Microsoft Graph scopes against the v2 endpoint (tenant set correctly). Tokens for Graph should be JWTs with three segments. Re-run interactive or device code login with explicit delegated scopes: `User.Read Calendars.Read Files.Read`.

### Temporary Opaque Token Acceptance
The application now accepts opaque access tokens (no dots) to avoid hard failures, but emits audit event `graph.token.opaque_format` with the token length. Treat this as a migration hint; switch to v2 delegated scopes so Graph returns a standard JWT. Advantages of JWT: easier diagnostics (can inspect expiry and scopes locally) and consistent validation logic.

### Status Endpoint Polling
Periodic `GET /status` returns remaining minutes and scopes; use it in monitoring to detect impending expiry and trigger refresh/login workflow.

### Headless Browser Option (Playwright)
If interactive consent pages must be automated, a future script can launch Chromium with a persistent session and complete login flow once, storing tokens automatically.

### Recommended Flow for Kiosk Boot
1. Run device code login (or headless script) if no valid token.
2. Verify with `node scripts/tokenHealth.mjs` (exit 0).
3. Start server; concurrently tail audit: `node scripts/auditTail.mjs --follow photos.* calendar.*`.
4. Monitor `/status` for health.

