ios/ or android/
# Implementation Plan: Unified Photo, Calendar & Confidential Auth

**Branch**: `001-photo-calendar-spa` | **Date**: 2025-10-18 | **Spec**: `specs/001-photo-calendar-spa/spec.md`
**Input**: Single feature specification (`specs/001-photo-calendar-spa/spec.md`)

## Summary
Deliver a kiosk-style single-page application that displays a continuously updated 21-day family calendar alongside a rotating photo panel (90s interval) with golden-ratio layout option. Configuration updates stay file-based (edit `data/config.json`), intentionally omitting any runtime configuration UI for kiosk stability. Add secure confidential authorization code sign-in (/signin → provider → /callback) with token persistence, proactive refresh, auditing, rate limiting, and sign-out. Non-goals: multi-user roles, at-rest encryption, push/webhook updates.

## Technical Context
**Language/Version**: Node.js 20 (ES modules)
**Primary Dependencies**: express, msal-node, luxon (optionally dotenv later)
**Storage**: File-based JSON (config, tokens, cached events/photos) + in-memory maps (state, rate limits)
**Testing**: Node built-in test runner (node:test) for unit & integration
**Target Platform**: Linux kiosk (Chromium) / local network
**Project Type**: Single web app (static front-end + lightweight API in same process)
**Performance Goals**: Initial calendar render <2s (SC-001); refresh logic overhead negligible (<50ms processing / cycle); photo swap jitter <100ms
**Constraints**: ≤3 runtime external dependencies; zero build step; offline resilience for cached data; minimal secret exposure
**Scale/Scope**: Single household usage; low concurrency (effectively 1 active session)

## Constitution Check
Principles (from constitution): Simplicity, Minimal Dependencies, Pragmatic Testing, Maintainability.

| Principle | Status | Notes |
|-----------|--------|-------|
| Simplicity | PASS | Single process, few deps, no build tool. |
| Minimal Dependencies | PASS | express, msal-node, luxon only. |
| Pragmatic Testing | PASS | Focused unit (timezones, ordering, state) + integration (signin, callback, refresh). |
| Maintainability | PASS | Small modules (auth, services, routes). |
| Security Posture | PASS | State validation, token rotation, rate limiting, audit events. |

No gate violations; no justifications required.

## Project Structure

### Documentation
```
specs/001-photo-calendar-spa/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── checklists/
    └── requirements.md
```

### Source Code (actual & planned additions)
```
src/
├── auth/
│   ├── msalClient.js            # (existing / enhance) msal confidential client wrapper
│   ├── state.js                 # state generation (exists)
│   ├── tokenStore.js            # file persistence (extend rotation, masking)
│   ├── refreshScheduler.js      # proactive refresh + backoff
│   ├── configValidate.js        # validate client credentials/scopes
│   ├── requireAuth.js           # middleware for protected API (extend)
│   └── sessionStore.js          # (add) pending AuthSession map abstraction
├── server/
│   ├── app.js                   # route registration
│   └── routes/
│       ├── signin.js            # initiation (exists - expand for provider config errors)
│       ├── callback.js          # code exchange (expand real HTTP call)
│       ├── signout.js           # (add) session/token clear
│       ├── status.js            # status (extend auth details)
│       ├── events.js            # calendar data
│       └── photos.js            # photo listing
├── services/
│   ├── calendarService.js       # fetch + transform
│   ├── photoService.js          # list photos
│   ├── eventTransform.js        # DST + multi-day logic
│   ├── cache.js                 # simple cache + rate limiting
│   └── ...
├── config/
│   └── store.js                 # loads config (extend auth block)
├── public/                      # SPA assets (calendar, photos UI)
└── util/
    └── log.js                   # add audit(event,data)

tests/
├── unit/
│   ├── state.test.mjs
│   ├── timezone.test.mjs        # DST conversions & week number
│   ├── eventOrdering.test.mjs
│   └── tokenStore.test.mjs
├── integration/
│   ├── signinRedirect.test.mjs
│   ├── callbackStateReject.test.mjs
│   ├── codeExchange.test.mjs    # real (mocked HTTP) exchange
│   ├── refreshFlow.test.mjs
│   └── signout.test.mjs
└── smoke/
    └── calendar.test.mjs
```

**Structure Decision**: Remain single project; integrated front-end + API share code; no monorepo split needed.

## Phases

### Phase 0 (Completed) – Research & Merge Alignment
- Confirm dependencies, auth flow variant, refresh strategy, rate limiting approach. (Recorded in `research.md` + addendum.)

### Phase 1 – Design & Contracts (In Progress)
- Update data model (done): added AuthSession, ClientCredentials, AuditEvent.
- Extend OpenAPI (done): /signin, /callback, /signout.
- Quickstart updated with confidential flow.
- Remaining: finalize msal usage decision (device code fallback documented) – non-blocking.

### Phase 2 – Foundational Implementation
1. Enhance `config/store.js` to include `auth` block (clientId, clientSecret, redirectUri, scopes, rateLimitPerMinute).
2. Implement `sessionStore.js` abstraction (wrap current pending state map; TTL pruning).
3. Add real MSAL confidential client in `msalClient.js` (authority, scopes, build auth code URL? may leverage generated URL or keep manual for transparency).
4. Extend `signin.js` to optionally use msal builder (validate config, produce URL, state persistence).
5. Extend `callback.js` for real token exchange via msal `acquireTokenByCode`; map response into TokenSet (accessToken, refreshToken/expiresAt rotated fields).
6. Implement `signout.js` (clear tokens + session). (Provider logout optional deferred.)
7. Add audit logging utility; replace ad-hoc console logs.
8. Implement refresh scheduler (interval 60s check) invoking msal `acquireTokenByRefreshToken` or silent API (depending on msal usage pattern) with exponential backoff.

### Phase 3 – Calendar & Photo Enhancements
1. Event transformation edge cases: multi-day all-day expansion, DST boundary tests.
2. Add caching fallback persistence (`events.json`).
3. Photo orientation fallback and graceful empty folder messaging improvements.
4. Layout golden ratio enforcement with ±5% tolerance test.
5. Remove the deprecated configuration form from public assets so kiosk mode relies solely on file-based settings.

### Phase 4 – Hardening & Quality
1. Rate limit tests (signin flood, state mismatch attempts).
2. Security tests: invalid state, replayed code, revoked refresh simulation.
3. Accessibility pass: contrast & current-day identification test.
4. Performance micro-bench (time event transform <50ms for 21 days of typical event volume).
5. Enforce kiosk fullscreen styling (viewport fill, no scrollbars) and back it with automated viewport overflow tests (FR-012f).

### Phase 5 – Documentation & Polishing
1. README auth section sync with quickstart.
2. Add operational runbook (token rotation troubleshooting, log event glossary).
3. Optional: metrics stub (counts) & export instructions.

## Task Extraction (High-Level Seeds)
(Detailed task list to be generated via `/speckit.tasks`; seeds below for traceability.)
- CONFIG: Add auth section parsing & validation.
- AUTH: State store, code exchange, token persistence rotation, refresh scheduler.
- ROUTES: /signin, /callback, /signout refinements; status enrichment.
- CALENDAR: ISO week tests, DST conversion tests, multi-day expansion.
- PHOTOS: Orientation & empty folder handling tests.
- UI: Golden ratio layout measurement test harness.
- LOGGING: Audit events & masking.
- TESTS: Unit (state, ordering, timezone, tokenStore), Integration (signin, callback, refresh, signout), Smoke (calendar render API shape).

## Risk & Mitigation Tracking
| Risk | Impact | Mitigation |
|------|--------|-----------|
| msal integration complexity | Delay Phase 2 | Start with manual exchange fallback stub; swap to msal incremental. |
| Token refresh edge errors | Stale auth leading to downtime | Backoff + clear & surface AUTH_REQUIRED in status. |
| Timezone misconfig | Incorrect event display | Validate on load; fallback to UTC with warning. |
| Large images slow load | Poor UX | Lazy loading + CSS scaling only. |

## Out-of-Scope Confirmation
- Multi-user sessions, push subscriptions, encryption at rest, analytics metrics, provider logout redirect.

## Complexity Tracking
| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | N/A | Current design remains within constitution limits |

## Success Alignment
Each Success Criterion (SC-001..SC-020) mapped to phases: SC-013..SC-020 covered by Phase 2 (auth) + Phase 4 (hardening), others by baseline implementation & enhancement.

End of Implementation Plan.

