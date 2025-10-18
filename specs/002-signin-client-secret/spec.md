# Feature Specification: Confidential Sign-In Flow

**Feature Branch**: `002-signin-client-secret`  
**Created**: 2025-10-18  
**Status**: Closed (Superseded)  
**Input**: User description: "implement authentication on a /signin endpoint with client_id and client_secret and store tokens on a /callback endpoint"

> This feature's requirements have been fully merged into `specs/001-photo-calendar-spa/spec.md` (see sections: User Story 4, FR-040..FR-056, SC-013..SC-020). This document is retained for historical traceability only and will not be planned independently.

## User Scenarios & Testing *(archival)*

### User Story 1 - Initiate Sign-In (Priority: P1)

An end user (viewer) needs to start an authentication process by visiting a public `/signin` entry point that begins a secure login with an external authorization service. The user is redirected to the provider, consents, and returns to `/callback`, after which they are considered signed in.

**Why this priority**: Without the ability to begin and complete sign-in, no other value (protected content, personalization) is accessible.

**Independent Test**: Visiting `/signin` triggers an external authorization page and, upon successful approval, the user lands back at `/callback` resulting in an established authenticated session.

**Acceptance Scenarios**:
1. **Given** an unauthenticated user, **When** they access `/signin`, **Then** they are redirected to the authorization provider with required parameters (client identifier, state, scope) and can proceed to login.
2. **Given** a user who completed provider login and consent, **When** they are redirected to `/callback` with a valid code and matching state, **Then** the system exchanges the code for tokens and marks the session authenticated.

---

### User Story 2 - Secure Token Handling (Priority: P2)

After successful sign-in, tokens (access, refresh, and related metadata) must be stored securely so subsequent protected resource requests succeed without re-prompting the user prematurely.

**Why this priority**: Secure handling protects sensitive credentials from leakage and enables continuity of user experience.

**Independent Test**: Completing sign-in yields a stored token set that is retrievable only within an authorized session context; unauthorized access attempts fail.

**Acceptance Scenarios**:
1. **Given** a successful code exchange, **When** tokens are stored, **Then** they are persisted with confidentiality (not exposed via unauthenticated endpoints) and include expiry metadata.
2. **Given** an active session approaching access token expiry, **When** a refresh is attempted, **Then** a new access token is obtained without user interaction (provided refresh policy allows) and old tokens are invalidated/rotated.

---

### User Story 3 - Sign-Out & Session Invalidity (Priority: P3)

A signed-in user chooses to terminate their authenticated session (e.g., leaving a shared screen). They invoke a sign-out action that removes local token data and prevents further protected access until a new sign-in occurs.

**Why this priority**: Enables privacy and operational control for shared or kiosk contexts; reduces risk of unauthorized subsequent use.

**Independent Test**: After sign-out, attempts to access protected areas fail and require a fresh `/signin` flow.

**Acceptance Scenarios**:
1. **Given** an authenticated session, **When** sign-out is requested, **Then** session markers and stored tokens are cleared and protected endpoints return an authentication-required response.
2. **Given** a previously authenticated user now signed out, **When** they directly access `/callback` without an active pending authorization state, **Then** the system rejects the request and instructs them to start at `/signin`.

---

### Edge Cases

- Callback received with missing or mismatched state parameter (prevent CSRF) → request rejected and audit entry recorded.
- Authorization code arrives already used or expired → user shown a restart message; no tokens stored.
- Invalid client credentials (identifier or secret) configured → `/signin` fails fast with a diagnostic user-facing error (non-sensitive wording) and internal alert logged.
- Refresh token revoked upstream → next refresh attempt fails gracefully; user prompted to re-authenticate.
- Concurrent callbacks for same pending state (double submission) → only first succeeds; later attempts produce an idempotent safe rejection.
- User abandons provider login then returns manually to `/callback` without parameters → system detects absence of code/state and instructs user to retry.
- Excessive failed sign-in attempts (provider errors) → system rate-limits initiation to protect from abuse (assumption of sensible threshold).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a publicly reachable `/signin` entry point initiating an external authorization request for end users not yet authenticated.
- **FR-002**: System MUST generate and bind a cryptographically strong state value to each sign-in initiation to prevent cross-site request forgery and validate it on `/callback`.
- **FR-003**: System MUST redirect the user to the external authorization service including client identifier, requested scopes, redirect URI, and state.
- **FR-004**: System MUST process the `/callback` request, verifying presence and integrity of the authorization response parameters (code, state, error indicators).
- **FR-005**: System MUST exchange a valid authorization code for a token set (access token, refresh token if granted, expiry/issued times) before marking session authenticated.
- **FR-006**: System MUST securely persist the token set so that subsequent protected requests can be authorized without repeating sign-in until expiry or revocation.
- **FR-007**: System MUST prevent token values from being exposed in client-visible responses or logs (only minimal masked audit entries permitted).
- **FR-008**: System MUST support refresh of expiring access tokens using the stored refresh token while validity permits, without user interaction.
- **FR-009**: System MUST invalidate/clear stored tokens and session indicators upon explicit sign-out action.
- **FR-010**: System MUST reject a `/callback` request lacking a valid matching state or containing an error parameter, providing a user-readable restart message.
- **FR-011**: System MUST rate-limit repeated failed sign-in initiations (configurable threshold) to mitigate abuse.
- **FR-012**: System MUST record audit entries for sign-in success, sign-out, refresh failures, and security-relevant rejections (state mismatch, invalid code) without storing raw secrets.
- **FR-013**: System MUST treat concurrent sign-in attempts for the same user gracefully—only the latest valid state may succeed; others produce safe rejections.
- **FR-014**: System MUST ensure stored tokens are associated with a specific session context and are not reused across unrelated sessions.
- **FR-015**: System MUST provide a clear user-facing outcome in all terminal states: success (authenticated), need to retry (expired/invalid code), or error (internal configuration issue).
- **FR-016**: System MUST enforce configured scope boundaries—disallow escalation to unapproved scopes at initiation or callback validation stages.
- **FR-017**: System MUST handle provider-side denial (user cancels) by presenting a non-error cancellation message and offering a retry path.
- **FR-018**: System MUST remove or rotate refresh tokens after successful refresh if the provider supplies a new token set, discarding prior values.
- **FR-019**: System MUST detect and handle upstream revocation (failed refresh with revocation semantics) by clearing local tokens and prompting re-authentication.
- **FR-020**: System MUST allow protected resource endpoints to distinguish authenticated vs unauthenticated requests reliably post sign-in.

### Key Entities *(include if feature involves data)*

- **AuthSession**: Represents an in-progress or established authentication context (state value, creation time, status, associated user identifier if available, expiry timestamp).
- **TokenSet**: Stores access token, refresh token (if provided), issued time, expiry time, scope list, rotation counter.
- **ClientCredentials**: Configuration container holding client identifier, confidential secret, configured scopes, redirect URI(s), and allowed provider domain; not exposed to end users.
- **AuditEvent**: Structured entry capturing event type (sign-in success, sign-out, refresh attempt, error), timestamp, session reference, non-sensitive reason/details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of successful sign-ins complete (from initial `/signin` request to authenticated state) in under 15 seconds of user active interaction time.
- **SC-002**: 100% of callback requests with invalid or mismatched state are rejected without storing any token data.
- **SC-003**: 0% of raw token values appear in user-visible responses, logs, or audit records (verified by automated scan).
- **SC-004**: Refresh extends authenticated sessions seamlessly with <2% refresh failure rate attributable to local handling (excluding upstream provider errors) over a 30-day measurement window.
- **SC-005**: Sign-out clears tokens and session indicators so that protected endpoint access attempts post sign-out fail 100% of the time until new sign-in.
- **SC-006**: Rate limiting prevents more than the configured threshold (assumed default 5) of failed initiation attempts per minute per source, with no false positives exceeding 1%.
- **SC-007**: User-initiated cancellation or provider denial results in a clear retry path with at least 90% of users able to successfully restart the flow within one additional attempt.
- **SC-008**: Audit coverage ensures ≥98% of security-relevant events (state mismatch, invalid code, refresh failure) have corresponding audit entries.

## Dependencies & Assumptions

- External authorization provider supports confidential client flows with code exchange and refresh tokens.
- Redirect URI `/callback` is pre-registered with the provider.
- Scope set is stable and managed outside this feature (no dynamic scope negotiation required).
- Rate limiting thresholds and session lifetimes are configurable but assumed to use sensible defaults if not explicitly set.
- Single user context per active browser session (multi-account switching out of scope for this feature).
- Encrypt-at-rest or equivalent secure storage mechanism is available (implementation detail deferred) for token persistence.

## Out of Scope

- Multi-factor authentication enforcement beyond provider default.
- Token introspection or revocation endpoints beyond clearing local storage on sign-out.
- Cross-application single sign-on propagation.

## Risks

- Misconfiguration of client secret could block all sign-ins (mitigated by early validation at `/signin`).
- Long-lived refresh tokens increase exposure if storage compromised (mitigated by secure storage assumption and rotation).
- Race conditions in concurrent callbacks (addressed via FR-013 single-success policy).

## Edge Case Testing Strategy

- Simulate replayed callback with identical code to confirm rejection.
- Force refresh token revocation upstream to verify graceful re-authentication prompt.
- Inject state mismatches to validate CSRF defense and audit logging.


