# Tasks: Confidential Sign-In Flow (Archived)

**Input**: Design documents from `/specs/002-signin-client-secret/`
**Prerequisites**: spec.md (user stories & requirements)
**Status**: Closed / Superseded — All active development moved into `specs/001-photo-calendar-spa/spec.md`.

> Do NOT execute or update these tasks; they are preserved only for reference mapping. Equivalent or refined tasks should exist (or will be created) under the unified feature planning.

**Tests**: Included where they materially validate security and independent story completion.
**Organization**: Tasks grouped by user story for independent delivery.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure configuration and secure handling prerequisites before story work.

- [ ] T001 Create feature config section in `data/config.json` (placeholders for auth client settings)
- [ ] T002 Add secure config loading helper in `src/config/store.js` (extend to read client id/secret, redirect URI, scopes)
- [ ] T003 [P] Add environment variable documentation section to `README.md` for confidential auth settings
- [ ] T004 Add secrets example file `data/config.example.auth.json` (no real secrets)
- [ ] T005 Introduce `.env` ignore confirmation in `.gitignore` (verify secret files excluded)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth session & storage primitives required by all stories.
**CRITICAL**: Must finish before any user story phase.

- [ ] T006 Define `AuthSession` and `TokenSet` schema comment block in `src/auth/tokenStore.js` (non-breaking extension of existing store)
- [ ] T007 Implement secure token persistence extension in `src/auth/tokenStore.js` (support access/refresh/expiry/rotation counter)
- [ ] T008 [P] Create state generation utility `src/auth/state.js` (cryptographically strong, length config)
- [ ] T009 [P] Create audit logging helper `src/util/log.js` (add audit(level,event,details) wrapper)
- [ ] T010 Implement rate limit in-memory bucket in `src/services/cache.js` (generic counter with TTL)
- [ ] T011 Add auth config validation function `src/auth/configValidate.js` (checks client id, secret, redirect URI format, scope non-empty)
- [ ] T012 [P] Add placeholder protected route middleware file `src/auth/requireAuth.js` (stub returning 401 until US1 done)
- [ ] T013 Extend status route `src/server/routes/status.js` to surface auth config loaded flag
- [ ] T014 Add test scaffolding directory `tests/auth/` with README for test focus areas

**Checkpoint**: Foundation complete – user story implementation can begin.

---

## Phase 3: User Story 1 - Initiate Sign-In (Priority: P1) 🎯 MVP

**Goal**: Start auth flow via `/signin` and complete redirect to provider with state.
**Independent Test**: Visiting `/signin` redirects to provider with valid state; callback with code+state (no token exchange yet) is validated structurally.

### Tests (Write First)
- [ ] T015 [P] [US1] Unit test for state utility in `tests/unit/state.test.mjs`
- [ ] T016 [P] [US1] Integration test initial sign-in redirect in `tests/integration/signinRedirect.test.mjs`
- [ ] T017 [P] [US1] Integration test callback state mismatch rejection in `tests/integration/callbackStateReject.test.mjs`

### Implementation
- [ ] T018 [P] [US1] Implement `/signin` route in `src/server/routes/signin.js` (generate state, store pending session, redirect)
- [ ] T019 [P] [US1] Register `/signin` route in `src/server/app.js`
- [ ] T020 [US1] Implement pending session registry in `src/auth/sessionStore.js` (in-memory map: state -> session meta)
- [ ] T021 [US1] Implement `/callback` preliminary handler in `src/server/routes/callback.js` (validate state, detect errors, store interim session status)
- [ ] T022 [US1] Add audit events for sign-in start, callback success, callback state mismatch in `src/util/log.js`
- [ ] T023 [US1] Enhance rate limiting to count failed initiations (state mismatch) in `src/services/cache.js`
- [ ] T024 [US1] Update README usage section with sign-in initiation description

**Checkpoint**: User can initiate and return from provider with validated state; system rejects tampered callbacks.

---

## Phase 4: User Story 2 - Secure Token Handling (Priority: P2)

**Goal**: Exchange code for tokens, securely persist and refresh.
**Independent Test**: A valid callback triggers code exchange; tokens stored; refresh path exercised without re-login.

### Tests (Write First)
- [ ] T025 [P] [US2] Integration test code exchange success `tests/integration/codeExchange.test.mjs`
- [ ] T026 [P] [US2] Unit test token persistence & masking `tests/unit/tokenStore.test.mjs`
- [ ] T027 [P] [US2] Integration test refresh logic `tests/integration/refreshFlow.test.mjs`

### Implementation
- [ ] T028 [P] [US2] Implement code exchange logic in `src/auth/codeExchange.js` (function exchangeCode(session))
- [ ] T029 [P] [US2] Wire code exchange into `/callback` route post-validation in `src/server/routes/callback.js`
- [ ] T030 [US2] Implement refresh scheduler extension in `src/auth/refreshScheduler.js` (support refresh token & rotation)
- [ ] T031 [US2] Add refresh handling audit events in `src/util/log.js`
- [ ] T032 [US2] Add token masking utility `src/auth/mask.js` (return partially redacted token for logs)
- [ ] T033 [US2] Implement scope boundary check in `src/auth/scopeCheck.js`
- [ ] T034 [US2] Add rate limit on repeated failed exchanges in `src/services/cache.js`
- [ ] T035 [US2] Update protected middleware `src/auth/requireAuth.js` to validate active TokenSet
- [ ] T036 [US2] README: document token lifecycle & refresh semantics

**Checkpoint**: Tokens securely stored & refreshed; protected endpoints can distinguish authenticated sessions.

---

## Phase 5: User Story 3 - Sign-Out & Session Invalidity (Priority: P3)

**Goal**: Invalidate session & tokens, enforce post sign-out protection.
**Independent Test**: Sign-out clears session; protected route access fails until new sign-in.

### Tests (Write First)
- [ ] T037 [P] [US3] Integration test sign-out clears tokens `tests/integration/signout.test.mjs`
- [ ] T038 [P] [US3] Unit test tokenStore clear path `tests/unit/tokenClear.test.mjs`

### Implementation
- [ ] T039 [P] [US3] Implement `/signout` route in `src/server/routes/signout.js` (clear tokens & session)
- [ ] T040 [P] [US3] Register `/signout` route in `src/server/app.js`
- [ ] T041 [US3] Extend sessionStore to mark terminated sessions `src/auth/sessionStore.js`
- [ ] T042 [US3] Add audit sign-out event in `src/util/log.js`
- [ ] T043 [US3] Ensure `/callback` rejects when session already terminated `src/server/routes/callback.js`
- [ ] T044 [US3] README: add sign-out usage and security guidance

**Checkpoint**: Sign-out functioning; previously valid sessions cannot access protected endpoints.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Hardening & quality improvements.

- [ ] T045 [P] Add security considerations section to `README.md` (threats: CSRF, replay, secret leakage)
- [ ] T046 [P] Add audit event coverage test `tests/unit/auditCoverage.test.mjs`
- [ ] T047 [P] Add rate limit threshold configurability to `src/config/store.js`
- [ ] T048 Add metrics stub (counts for sign-in success/fail) in `src/util/log.js`
- [ ] T049 Review and sanitize all log statements in `src/util/log.js` & auth routes (no raw tokens)
- [ ] T050 Add quickstart snippet for auth flow to `specs/002-signin-client-secret/quickstart.md`
- [ ] T051 Run dependency & minimal footprint review update in `README.md`
- [ ] T052 Final pass: ensure all tasks referenced artifacts committed (manual checklist)

---

## Dependencies & Execution Order

### Phase Dependencies
- Setup → Foundational → (US1, US2, US3 parallel after Foundational) → Polish

### User Story Dependencies
- US1 independent after Foundational
- US2 depends on pending session & callback groundwork from US1 (code path hooks) but tests can stub provider
- US3 depends on token handling from US2

### Within Story Ordering
- Tests first (fail), then implementation primitives, then integration wiring, then docs.

## Parallel Opportunities
- Marked [P] tasks across phases (state gen, audit helper, route registrations, tests) can run concurrently.
- US1 & US2 partially parallel after Foundational if code exchange stubbed early.

## Independent Test Criteria Recap
- US1: Redirect + state validation & mismatch rejection
- US2: Code exchange, token persistence & refresh working isolated
- US3: Sign-out invalidates session; access blocked afterward

## MVP Scope Suggestion
- Complete through Phase 3 (US1) for initial demonstrable flow (initiation + validated callback without full token refresh logic) OR optionally include early part of US2 to store tokens.

## Format Validation
All tasks follow required format: `- [ ] T### [P]? [USn]? Description with file path`.
