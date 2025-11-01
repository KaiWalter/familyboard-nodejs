# Agent Implementation Guidelines

Version: 2025-11-01
Source: `specs/001-photo-calendar-spa/spec.md`

This document distills the specification into actionable guardrails for autonomous coding agents contributing to the Photo & Calendar SPA. Follow these rules before committing code or configuration changes.

## 1. Architectural Assumptions
- Single-page web application (SPA) with kiosk-style full-screen layout: photo panel left, calendar panel right.
- Strict golden-ratio width split when enabled: calendar ≈1.618× photo (±5%).
- Photo content sourced from OneDrive via Microsoft Graph; calendar events from Outlook calendars via Microsoft Graph.
- Authentication uses OAuth 2.0 authorization code flow with confidential client and refresh tokens.
- Local file persistence for config (`config.json`), token store (`tokens.json`), calendar cache, and media cache.
- Locale/timezone configurable per deployment; default to environment if not specified.
- System operates unattended after initial sign-in; no on-screen configuration UI in kiosk mode.

## 2. Technology Requirements
- **Graph Access**: Must use `@microsoft/microsoft-graph-client` JavaScript SDK for both calendar and OneDrive calls. Raw HTTP requests to Graph are disallowed.
- **Token Handling**: Employ a single Graph client instance with an auth provider that injects the current access token; never scatter direct fetch calls.
- **Storage**: Read/write JSON files atomically; ensure permission hygiene (restrict to process user).
- **Frontend**: Enforce monochrome (grayscale) palette, responsive layout without scrollbars, `object-fit: cover` for photos, CSS hooks `.row-header`, `.column-header`, `.cell-header`, `.event`, `.current-day`.
- **Timezone/Locale**: Convert all UTC timestamps using configured IANA timezone; support at least `en-US` and `de-DE`. Provide two-letter weekday headers and ISO week numbers.

## 3. Authentication Workflow
- Provide public `/signin` endpoint initiating external login with unique state value; `/callback` exchanges code for tokens; `/signout` clears local session and token store.
- Persist token set securely (include issued/expiry timestamp, refresh token). Rotate tokens on refresh.
- Refresh before expiry when remaining lifetime <15%; retry with exponential backoff. On revocation or repeated failure, clear tokens and surface re-auth requirement.
- Prevent logging raw secrets; audit events must redact token values.
- Rate-limit failed sign-in attempts; reject callbacks with missing/mismatched state or provider errors.

## 4. Data Refresh & Resilience
- Calendar data refresh cadence: midnight rollover + every 180 seconds.
- Photo rotation interval fixed at 90 seconds; first image appears immediately.
- Cache last successful calendar/photo data; on network or Graph errors, continue displaying cached content and show concise warning.
- Handle Graph 429 throttling via retry/backoff per `Retry-After` guidance.
- Offline detection triggers banner without changing panel layout.

## 5. Layout & UX Rules
- Photo panel states: unauthenticated (“Sign in required”), authenticated empty (“No photos found”), authenticated with assets (slideshow).
- Use center-cropped aspect-fill images without visible letterboxing except during transitions; support extreme aspect ratios gracefully.
- Display localized month abbreviation for first Monday and day-of-month=1 cells; highlight current day with distinct monochrome border ≥2 px.
- Include favicon and suppress all scrollbars; kiosk screen should be full-viewport with no margins.

## 6. Functional Coverage Checklist
- 21-day calendar window anchored to Monday; three rows by seven columns.
- Sorting: all-day events (alphabetical) precede timed events (chronological). Multi-day all-day events repeat in each day.
- Format timed events as `H:MM - H:MM Title` using 24-hour clock.
- Provide configuration for up to five calendar IDs, photo folder path, golden ratio toggle, locale, timezone, optional weekday overrides.
- Maintain status indicators for auth state: `OK`, `Refreshing`, `Warning`, `Error`; surface via logs or diagnostics panel.

## 7. Testing & Metrics Expectations
- Implement hooks/tests aligning with spec success criteria (render speed, rotation accuracy, refresh reliability, audit logging completeness).
- Instrument metrics: render time, rotation accuracy, token refresh success, calendar refresh success, error rates, current-day recognition, sign-in duration.
- Ensure no raw tokens in logs; tests should verify sanitized logging.

## 8. Coding Agent Discipline
- Align commits with spec IDs (FR-xxx, SC-xxx) when applicable; include cross-references in PR descriptions.
- Refuse to introduce technologies or flows contradicting the spec (e.g., alternative auth providers, different SDKs, user-driven configuration UI, multi-profile support).
- When uncertainty arises, prefer updating this document or the formal specification rather than improvising behavior.
- Preserve kiosk assumptions: zero manual controls for rotation, no mid-session configuration UI, minimal color usage.

## 9. Open Questions for Human Review
- Encryption/enhanced protection for persisted tokens (currently unspecified beyond secure filesystem).
- Detailed audit log format and retention policy.
- Automated deployment considerations (CI/CD, bundling) beyond current scope.

Agents must comply with these guardrails to ensure consistency with the signed-off specification.