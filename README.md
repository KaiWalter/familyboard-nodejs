# Family Board Photo & Calendar SPA

See `specs/001-photo-calendar-spa/quickstart.md` for setup and run instructions.

## Development
- Start server (pending implementation) then open kiosk browser pointing at host.
- Configuration stored in `data/config.json`.

## Security
Ensure `data/tokens.json` (once created) has restrictive permissions (600) to protect refresh tokens.

Recommended:
- Run `chmod 600 data/tokens.json` after first auth init.
- Avoid committing any JSON under `data/` that contains tokens.
- Set environment variables MSAL_CLIENT_ID and MSAL_TENANT_ID rather than hardcoding.
- If deploying beyond local network, consider reverse proxy restricting /api/config PUT.

## Confidential Auth Environment Variables

The confidential sign-in feature supports overriding config file values via environment variables (not persisted):

| Variable | Purpose | Example |
|----------|---------|---------|
| AUTH_CLIENT_ID | OAuth client identifier | `00000000-0000-0000-0000-000000000000` |
| AUTH_CLIENT_SECRET | OAuth client secret (never logged) | `superSecretValue` |
| AUTH_REDIRECT_URI | Redirect URI (must match provider registration) | `http://localhost:3000/callback` |
| AUTH_SCOPES | Comma-delimited scopes list | `User.Read,Calendars.Read` |
| AUTH_RATE_LIMIT | Failed sign-in attempts per minute threshold | `5` |

Environment overrides take precedence at runtime but are not written back to `data/config.json`.
