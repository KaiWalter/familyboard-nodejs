# Data Model: Confidential Sign-In Flow

## Overview
Lightweight in-memory + file-based models supporting confidential OAuth authorization code flow. No database introduced.

## Entities

### AuthSession
Represents a pending or completed sign-in attempt until code exchange finishes.
- `state`: string (base64url random 128-bit) – primary key (in-memory only)
- `createdAt`: epoch ms
- `status`: enum(`pending`,`callback_received`,`exchanged`,`terminated`,`error`)
- `errorCode`: optional string (state_mismatch, provider_error, exchange_failed)
- `redirectUri`: string (must match configured value)
- `scopesRequested`: string[]
- `scopesGranted`: string[] (populated post exchange)
- `expiresAt`: epoch ms (short TTL e.g. 10 minutes from creation)

Lifecycle:
`pending` → (`callback_received` → `exchanged`) OR (`error`) OR timeout cleanup. `terminated` after sign-out.

### TokenSet
Persisted secure token information (file-based) after successful exchange.
- `accessToken`: string (never logged raw)
- `refreshToken`: string (rotated)
- `issuedAt`: epoch ms
- `expiresAt`: epoch ms (access token)
- `scopes`: string[]
- `rotation`: integer (increment on refresh)
- `provider`: string (identifier of auth provider)

Validation:
- `expiresAt > issuedAt`
- `scopes` subset-of configured allowed scopes

### ClientCredentials
Configuration-only (never exposed)
- `clientId`: string
- `clientSecret`: string (masked when displayed)
- `redirectUri`: string
- `scopes`: string[] (allowed fixed set)

### AuditEvent
Ephemeral console output (not persisted)
- `time`: ISO timestamp
- `event`: enum(signin_start, callback_ok, callback_state_mismatch, code_exchange_ok, code_exchange_fail, refresh_ok, refresh_fail, signout, rate_limit_block)
- `sessionState`: string (first 6 chars for correlation)
- `details`: object (sanitized)

### RateLimitCounter
In-memory sliding TTL bucket
- `key`: string (source identifier, e.g. IP)
- `count`: number
- `resetAt`: epoch ms

## Relationships
- `AuthSession.state` correlates to `AuditEvent.sessionState` (partial)
- Successful `AuthSession` creation leads to a `TokenSet` persistence; after that `AuthSession` may be cleaned.
- `TokenSet` rotation increments `rotation` and triggers audit events.

## Derived / Computed Fields
- Remaining lifetime = `expiresAt - now` (ms)
- Refresh window threshold = 15% of `(expiresAt - issuedAt)`

## Constraints & Rules
- Only one active `TokenSet` at a time (overwrites file on new exchange or refresh)
- State uniqueness enforced in memory; collision extremely unlikely (128-bit randomness)
- Expired `AuthSession` entries purged on access attempts (lazy cleanup)

## Edge Conditions
- Orphaned AuthSession (no callback) -> removed after TTL
- Callback with unknown state -> rejection; no TokenSet change
- Refresh after token revocation -> remove TokenSet file; require new sign-in

## Future Extensions (Deferred)
- Encrypted fields for `accessToken` / `refreshToken`
- Multi-session support (array or map of TokenSets keyed by user principal id)
- Persistent rate limiter across restarts
