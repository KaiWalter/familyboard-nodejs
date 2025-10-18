# Quickstart: Confidential Sign-In Flow

## 1. Configure Credentials

1. Obtain client ID & client secret from authorization provider (register redirect URI: `http://localhost:3000/callback`).
2. Add to `data/config.json` (or env vars) keys (example):
   ```json
   {
     "auth": {
       "clientId": "YOUR_CLIENT_ID",
       "clientSecret": "YOUR_CLIENT_SECRET",
       "redirectUri": "http://localhost:3000/callback",
       "scopes": ["User.Read"],
       "rateLimitPerMinute": 5
     }
   }
   ```
3. Ensure secret files are git-ignored.

## 2. Start Application

Run the existing server start command (see root README). Confirm `/status` shows base app healthy.

## 3. Initiate Sign-In

Open: `http://localhost:3000/signin` – you should be redirected to provider login.

## 4. Complete Authorization

After credentials & consent, provider redirects to `/callback?code=...&state=...`.
- On success you should be redirected (302) to a landing page (TBD) or receive a success message placeholder.

## 5. Verify Token Persistence

Check token store file (path to be implemented) contains masked / structured token JSON (do **not** log raw tokens).

## 6. Test Protected Endpoint

Call: `GET /protected/example` – should return 200 when authenticated, 401 otherwise.

## 7. Test Refresh

Manually reduce `expiresAt` in token file (simulate near-expiry) and trigger protected endpoint; refresh should occur (audit log entry `refresh_ok`).

## 8. Sign Out

POST `http://localhost:3000/signout` → expect 204. Subsequent `/protected/example` calls return 401.

## 9. Edge Case Simulation

| Scenario | Action | Expected |
|----------|--------|----------|
| State mismatch | Modify `state` query param before hitting `/callback` | 400 + audit `callback_state_mismatch` |
| Replayed code | Reuse same `code` param after success | 400/500 with no new tokens |
| Rate limit | Rapidly hit `/signin` > threshold | 400/429 with audit `rate_limit_block` |
| Revoked refresh | Delete/alter refresh token then force refresh | `refresh_fail` audit and requirement to re-auth |

## 10. Cleanup

Remove testing credentials or rotate secret if exposed during testing.

## Notes
- Do not commit real credentials.
- Enable verbose logging temporarily only when diagnosing issues.
