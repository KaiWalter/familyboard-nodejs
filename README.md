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
`data/config.json` (or env overrides) example for delegated scopes:
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

## Security Guidelines
Store secrets in environment or secret manager (avoid committing to repo). Limit delegated scopes to least privilege. Include `offline_access` only if refresh is required. Monitor audit logs for anomalies.

## Roadmap / Next Steps
1. Add automated background refresh using refresh token path with configurable threshold.
2. Expose `tokenType` (currently always `user`) explicitly in status endpoint.
3. Consider encrypting token file at rest (optional; local dev/demo scope).
4. Remove legacy client credentials code after confirming it is no longer referenced.

