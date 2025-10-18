# Research & Decisions: Confidential Sign-In Flow

**Date**: 2025-10-18  
**Scope**: Authorization Code flow with client secret for kiosk-oriented single-session usage.

## Decisions

### 1. OAuth Grant Type
- **Decision**: Authorization Code (confidential client with client secret) + refresh tokens
- **Rationale**: Standard secure pattern for server-side apps; enables long-lived session via refresh; aligns with need to avoid repeated interactive login.
- **Alternatives Considered**:
  - Device Code: Already used in earlier feature; this feature explicitly adds client_secret scenario.
  - Implicit Flow: Deprecated; lacks refresh token issuance.
  - PKCE + Public Client: Unnecessary since confidential client with secret; could add later if provider policy evolves.

### 2. State Parameter Strategy
- **Decision**: 128-bit random value (base64url) per initiation; stored in in-memory map with timestamp.
- **Rationale**: Sufficient entropy, simple to implement, meets CSRF mitigation requirement.
- **Alternatives**: Signed JWT state (overkill), shorter random (lower entropy), server-side cookie nonce (equivalent complexity).

### 3. Session Representation
- **Decision**: In-memory `sessionStore` keyed by state until code exchange; after exchange, TokenSet persisted via existing tokenStore extension.
- **Rationale**: Single-user / low concurrency; avoids DB complexity.
- **Alternatives**: Redis (unnecessary), encrypted cookie (increases surface; tokens server-side anyway).

### 4. Token Persistence
- **Decision**: Reuse file-based JSON with atomic write pattern from existing tokenStore; extend schema fields.
- **Rationale**: Keeps dependency count zero; adequate for kiosk deployment.
- **Alternatives**: SQLite (extra dependency), memory-only (lost on restart), encrypted file (could add later if secrets risk increases).

### 5. Refresh Strategy
- **Decision**: Scheduler similar to existing refresh mechanism; triggers refresh when <15% lifetime remains or on access token error; rotate refresh token if new one issued.
- **Rationale**: Proven pattern from prior feature; minimal code duplication.
- **Alternatives**: Background cron task (duplicative), on-demand refresh only (risk of user-visible latency at expiry).

### 6. Rate Limiting
- **Decision**: Token bucket per IP (or generic source key) in existing cache service with TTL for failed initiation increments; threshold default 5/min.
- **Rationale**: Lightweight; no external store.
- **Alternatives**: Sliding window (more complexity), external rate limit service (overkill).

### 7. Scope Enforcement
- **Decision**: Hard-coded allowed scope list from config; compare returned scope set post exchange.
- **Rationale**: Simple and explicit; prevents privilege creep.
- **Alternatives**: Dynamic scope negotiation (unneeded), wildcard acceptance (insecure).

### 8. Logging & Auditing
- **Decision**: Extend `log.js` with `audit(event, details)` producing structured object; mask tokens via utility before logging.
- **Rationale**: Reuses console; adds semantic clarity.
- **Alternatives**: Dedicated logging library (dependency cost), JSON file logs (rotation concerns).

### 9. Secret Handling
- **Decision**: Load client secret via config (environment or config file) but never echo raw value in logs; mask length w/ last 4 chars at most.
- **Rationale**: Minimizes accidental leakage.
- **Alternatives**: External secret manager (not justified yet), full encryption at rest (future enhancement if threat model expands).

### 10. Testing Scope
- **Decision**: Unit: state generation, token masking, token store persistence. Integration: sign-in redirect, callback success/failure, refresh, sign-out.
- **Rationale**: Covers security-critical surfaces; avoids exhaustive trivial tests.
- **Alternatives**: Extensive mocking of provider API (complex), pure unit without integration (misses flow issues).

## Unresolved Clarifications
None (all assumptions standard & documented).

## Open Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| File token store compromise | Minimal permission set on file; consider OS-level restrictions. |
| Long-lived refresh token theft | Rotation + potential future encryption. |
| Server restart loses pending states | Short-lived window; instruct user to retry if mismatch; acceptable for low volume. |

## Future Enhancements (Deferred)
- Optional PKCE support for parity with public clients.
- Encrypted token file using OS keyring integration.
- Metrics endpoint exporting auth event counters.
- Pluggable session persistence (Redis) if scaling beyond kiosk.

