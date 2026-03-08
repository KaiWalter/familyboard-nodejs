Auth Test Scaffolding
=====================

Planned test coverage (foundational + user stories):

> **Testing Policy Update (2025-11-02):** Automated tests remain limited to deterministic helpers and internal
> logic. Do not mock MSAL or Microsoft Graph, and avoid scenarios that need background schedulers or multiple
> processes. Use manual smoke checks for end-to-end authentication flows.

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

Integration flows are verified manually during smoke testing (sign-in, callback, refresh, sign-out). Keep
automated cases deterministic and isolated—no external network calls or mocks.
