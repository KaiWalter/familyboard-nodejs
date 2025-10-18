# Tasks: photo-calendar-spa

Generated: 2025-10-18
Branch: 001-photo-calendar-spa
Spec: ./spec.md
Plan: ./plan.md

## Dependency Graph (User Stories)
1. US1 (Calendar Panel) – MVP, foundational for date/time formatting & layout classes.
2. US2 (Photo Rotation) – Independent; only needs static server & basic layout container.
3. US3 (Configuration & Ratio) – Depends on persistence layer & initial layout from US1.
4. US4 (Operator-Less Auth & Refresh) – Can be implemented early but full value visible after calendar/photo endpoints; depends on config for scopes & storage.

Parallel Opportunities:
- Build static front-end skeleton while implementing server auth scaffolding.
- Calendar rendering logic in isolation (can mock events) parallel to token storage implementation.
- Photo rotation front-end module parallel to calendar service.

MVP Scope: Complete US1 (Calendar Panel) with hardcoded placeholder events or simple fetch returning canned data; proves layout & localization.

## Execution Phases

### Phase 1: Setup
Foundation for repository to host code & assets.

- [ ] T001 Create `src/` directory skeleton (server/, services/, auth/, config/, util/, public/) paths
- [ ] T002 Initialize minimal `package.json` with name, scripts (start), and dependencies list
- [ ] T003 Add `.gitignore` entries for `data/*.json` sensitive token storage
- [ ] T004 Create `data/` directory with placeholder `config.json` and `.keep` file
- [ ] T005 Create `public/index.html` base layout container (calendar div, photo div)
- [ ] T006 [P] Add `public/css/styles.css` with monochrome base variables and reset
- [ ] T007 [P] Add `public/js/apiClient.js` with fetch wrapper (using global fetch)
- [ ] T008 Add README stub referencing quickstart.md

### Phase 2: Foundational
Core utilities and shared modules before user stories.

- [ ] T009 Implement `src/util/timezone.js` Luxon helper (toLocal, formatEventRange, getWeekNumber)
- [ ] T010 Implement `src/config/store.js` for loading/saving `data/config.json` (validation per data-model)
- [ ] T011 Implement `src/auth/tokenStore.js` read/write `data/tokens.json` atomic write
- [ ] T012 [P] Implement `src/services/eventTransform.js` (expansion of multi-day all-day events, ordering)
- [ ] T013 [P] Implement `src/services/cache.js` for events/photos JSON caching layer
- [ ] T014 Implement `src/server/app.js` Express initialization (static serve + JSON body parsing)
- [ ] T015 Implement `src/server/routes/config.js` GET/PUT /api/config (validation reuse)
- [ ] T016 [P] Implement `src/server/routes/status.js` GET /api/status (auth status + cache ages)

### Phase 3: User Story 1 – Calendar Panel (P1)
Goal: Render 21-day calendar with localized headers, ISO weeks, month labels, ordering, styling hooks.
Independent Test: Load page -> 21-day grid shows correct weekday abbreviations, ISO week numbers, current day highlight.

 - [X] T017 [US1] Implement `src/services/calendarService.js` fetch (placeholder stub returning sample events initially)
 - [X] T018 [P] [US1] Implement `src/server/routes/events.js` GET /api/events returning transformed events
 - [X] T019 [US1] Implement `public/js/calendarView.js` grid render (3 weeks x 7 columns) + hooks (.row-header, .column-header, .cell-header)
 - [X] T020 [P] [US1] Add month abbreviation logic (first Monday + day=1 cells) in calendarView.js
 - [X] T021 [US1] Add current day highlight logic + monochrome border/class `.current-day`
 - [X] T022 [US1] Add all-day vs timed event sorting & display format in calendarView.js
 - [X] T023 [US1] Integrate timezone conversion using util/timezone.js inside calendarService.js
 - [X] T024 [US1] Implement midnight rollover handler (setInterval comparison local day) in calendarView.js
 - [X] T025 [US1] Add empty state placeholder for no events day cells
 - [X] T026 [US1] Smoke test script `tests/smoke/calendar.test.mjs` verifying grid structure

### Phase 4: User Story 2 – Photo Rotation (P2)
Goal: Rotate photos every 90s with aspect ratio handling; placeholder if empty.
Independent Test: With photo config, images cycle every 90s; landscape letterboxed, portrait full height.

 - [X] T027 [US2] Implement `src/services/photoService.js` listing stub (placeholder array)
 - [X] T028 [P] [US2] Implement `public/js/photoRotator.js` interval rotation logic (90s)
 - [X] T029 [US2] Add orientation detection & CSS class for landscape/portrait (fallback: derive after image load natural width/height if metadata absent)
 - [X] T030 [US2] Add letterboxing neutral background in CSS
 - [X] T031 [US2] Add placeholder message when no photos
 - [X] T032 [US2] Integrate with API `/api/photos` route stub (`src/server/routes/photos.js`)

### Phase 5: User Story 3 – Configuration & Ratio (P3)
Goal: Persist settings, apply golden ratio layout.
Independent Test: Change calendar IDs & ratio -> reload shows updated calendar sources & layout width ratio within ±5%.

 - [X] T033 [US3] Implement ratio calculation utility `src/util/ratio.js`
 - [X] T034 [P] [US3] Add layout application logic in `public/js/layout.js` adjusting widths
 - [X] T035 [US3] Implement configuration UI section in `public/index.html` (simple form: folder path, calendar IDs, golden ratio toggle) + `public/js/configForm.js` (rotation interval omitted; fixed at 90s)
 - [X] T035a [P] [US3] Implement weekday abbreviation override application logic in `public/js/calendarView.js`
 - [X] T036 [US3] Hook form save to PUT /api/config and reload calendar/photo modules
 - [X] T037 [US3] Validate calendarIds length and locale/timezone on save using config/store.js
 - [X] T038 [US3] Add test `tests/unit/ratio.test.mjs` verifying width calculation tolerance

### Phase 6: User Story 4 – Operator-Less Auth & Token Refresh (P4)
Goal: One-time auth, persisted tokens, background proactive refresh & status reporting.
Independent Test: Start app with stored tokens -> no prompt; near expiry triggers refresh; status endpoint reports transitions.

 - [X] T039 [US4] Implement msal-node setup `src/auth/msalClient.js` (Device Code flow first)
 - [X] T040 [P] [US4] Implement refresh scheduler `src/auth/refreshScheduler.js` (interval check + <15% remaining lifetime threshold)
 - [X] T039a [US4] Implement one-time device code auth helper script `src/auth/authInit.js` (writes tokens.json)
 - [X] T041 [US4] Integrate token usage in calendarService & photoService (attach Authorization headers)
 - [X] T042 [US4] Update status route to include remainingMinutes calculation
 - [X] T043 [US4] Implement backoff logic in refreshScheduler.js (30s, 2m, 4m, etc.) up to 5 attempts
 - [X] T044 [US4] Add test `tests/integration/tokenRefresh.test.mjs` mocking msal for success/failure/backoff

### Phase 7: Polish & Cross-Cutting
Final refinements, accessibility, performance, resilience.

 - [X] T045 Optimize calendarService to skip unchanged event days (cache diff)
 - [X] T046 Add accessibility improvements (aria labels on cells, verify contrast ≥4.5:1, CSS audit) in styles.css
 - [X] T046a Add continuation-day visual indicator for multi-day all-day events in `public/js/calendarView.js` (e.g., subtle ellipsis or arrow) 
 - [X] T046b Implement cached fallback logic in `src/services/calendarService.js` & `src/services/photoService.js` (serve cached JSON on fetch error) 
 - [X] T047 Add offline detection banner logic `public/js/offlineBanner.js`
 - [X] T048 Add logging wrapper `src/util/log.js` (still console but structured prefix)
 - [X] T049 Add DST boundary test `tests/unit/dstBoundary.test.mjs`
 - [X] T050 Document security guidance in README (token file permissions)

## Parallel Execution Examples
- Express routes (events, status) can be implemented concurrently with front-end calendarView rendering using sample data.
- PhotoRotator.js development can proceed while ratio utilities are built.
- Token refresh scheduler can be coded while photo orientation styling is refined.

## Independent Test Criteria per Story
- US1: Calendar grid renders 21 days; correct weekday abbreviations; ISO week numbers; current day highlight.
- US2: Photos rotate every 90s; correct aspect handling; placeholder on empty folder.
- US3: Changing configuration persists and affects layout ratio within ±5%; calendar IDs update.
- US4: App runs without interactive auth; tokens refresh before expiry; status shows OK→Refreshing→OK transitions.

## Suggested MVP
Complete Phase 3 (US1) with placeholder event data and basic styling; deploy kiosk to validate layout & readability before integrating auth and photos.

## Format Validation
All tasks follow required format: `- [ ] T### [P?] [US?] Description with file path`. Each story phase tasks include story label. Setup/Foundational/Polish phases omit story labels by rule.

Total Tasks: 55
Task Counts:
- Setup: 8
- Foundational: 8
- US1: 10
- US2: 6
- US3: 6
- US4: 6
- Polish: 6

Parallelizable Tasks Marked [P]: 14

End of tasks.
