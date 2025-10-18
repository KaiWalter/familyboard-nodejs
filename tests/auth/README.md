Auth Test Scaffolding
=====================

Planned test coverage (foundational + user stories):

1. State Utility
   - Generates 22-char+ base64url string.
   - Uniqueness across multiple invocations.

2. Config Validation
   - Accepts valid minimal config.
   - Rejects missing clientId/clientSecret/redirectUri/scopes.

3. Rate Limiter (cache counters)
   - Increments within TTL window and resets after expiry.
   - isRateLimited returns true only after limit exceeded.

4. RequireAuth Middleware (stub)
   - Returns 401 when no token file or missing accessToken.
   - Passes through when accessToken present.

5. Status Route
   - authConfigured flag reflects presence of clientId+clientSecret.
   - remainingMinutes calculates from expiresOn.

Integration (later phases):
 - /signin sets state cookie (future implementation) and redirects.
 - /callback exchanges code and persists masked token summary.
 - Refresh flow updates tokens before expiry.
 - /signout clears tokens and returns expected JSON.

Use Node.js test runner (node --test). Keep tests deterministic and isolated (no real network calls; mock external requests when added).
