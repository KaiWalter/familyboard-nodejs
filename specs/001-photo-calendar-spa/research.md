# Phase 0 Research: photo-calendar-spa

Date: 2025-10-18
Branch: 001-photo-calendar-spa
Spec: ./spec.md

## Purpose
Establish rationale for minimal technology choices and confirm no hidden complexities that violate Constitution (Simplicity, Minimal Dependencies, Pragmatic Testing).

## Functional Core Recap (from spec)
- 21-day calendar (current week + next two) with timezone conversion, localization, ordering of events, multi-day repetition.
- Photo rotation every 90s from OneDrive folder.
- Golden ratio layout (calendar wider) in monochrome styling.
- Operator-less authentication and token refresh (Microsoft Graph for calendars + OneDrive).
- Automatic calendar refresh every 180s + midnight rollover.

## Dependency Evaluation

| Candidate | Decision | Justification | Rejected Alternatives |
|-----------|----------|---------------|-----------------------|
| express | KEEP (likely) | Simple static file + lightweight JSON API & proxy. Mature, small cognitive load. | Native http module (more boilerplate for routing & static serving). Fastify (adds plugin surface we don't need). |
| msal-node | KEEP (required) | Handles OAuth flows, token refresh, scopes securely. Writing custom auth adds risk. | Manual OAuth implementation (security + maintenance burden). |
| luxon | KEEP (likely) | Clean API for timezone & DST; smaller surface than moment; no heavy tree-shaking concerns. | date-fns + manual TZ (needs extra libs for IANA zone). Intl only (harder multi-step calculations for DST & formatting). |
| dotenv | DEFER (optional) | Only if >2 environment vars emerge (e.g., CLIENT_ID, TENANT_ID). Could instead read from process.env directly. | Keep if env var count stays small. |
| node-fetch / axios | REJECT | Node 20 has global fetch; extra lib unnecessary. | axios (larger dependency). |
| state management lib (Redux, MobX) | REJECT | App state is tiny (config, events, photos, tokens) manageable with plain modules. | Complex libs add mental overhead. |
| build tool (Vite/Webpack) | REJECT (initial) | ES modules + modern browsers suffice. Possibly revisit for future bundling/performance. | Adds build complexity counter to simplicity. |
| CSS framework (Tailwind/Bootstrap) | REJECT | Monochrome custom minimal styling easier with hand-written CSS. | Unused classes inflate cognitive overhead. |
| Logging lib (winston/pino) | REJECT (initial) | Console logging adequate. Introduce only if persistent logs needed. | Adds config and dependency surface. |
| Testing framework (Jest/Vitest) | REJECT (initial) | Node built-in test runner meets pragmatic smoke + unit needs. | Slower startup + extra APIs to learn. |

### Dependency Risk Summary
All selected dependencies have high maintenance reputation and stable APIs. Total runtime deps targeted: 3 (express, msal-node, luxon). Optional dev dep for dotenv if needed.

## Authentication & Token Strategy
- Use msal-node public client application (Device Code or Authorization Code via temporary browser) one-time.
- Persist tokens (access + refresh) plus expiry timestamp in `data/tokens.json` (chmod 600 guidance in quickstart).
- Refresh scheduler checks every minute or on interval tick; triggers refresh when remaining lifetime <15% (FR-015). Backoff strategy: exponential starting 30s, doubling up to 5 attempts (FR-016).
- Failure path: continue serving cached events/photos (FR-017) and log status.

## Data Caching Approach
- `calendarService` fetches events -> store raw UTC + derived localized times for display to avoid recomputation on every render.
- On failure, serve cached `events.json` (FR-011). Refresh pre-render every 180s (FR-018a).
- Photos: store listing (filename + URL + orientation metadata if available) in memory; only refresh listing at startup or if a 404 occurs repeatedly.

## Timezone & Localization Handling
- Configure timezone string in `config.json` (FR-028).
- Use Luxon DateTime.fromISO(...).setZone(tz) for conversion (FR-029, FR-035). Avoid manual offset math.
- Weekday abbreviations: rely on Intl.DateTimeFormat(locale, { weekday: 'short' }) then slice first two letters (FR-020, FR-024); allow override by optional mapping in config (FR-026).
- ISO week number: Luxon DateTime.weekNumber (FR-021). Validate year boundary (FR-025) with test fixtures.
- Month abbreviation: Intl.DateTimeFormat(locale, { month: 'short' }) applied for first Monday & day-of-month=1 cells (FR-027).

## Event Ordering & Formatting
- All-day events: flagged by ms Graph (isAllDay). Sort pass: partition all-day vs timed; all-day alphabetical by title; timed by startDateTime ascending (FR-030..FR-033). Multi-day all-day expansion: generate sequence of days inclusive start-end minus 1 where appropriate.
- Formatting 24h: `${HH:mm} - ${HH:mm} Title` (FR-030) using DateTime.toFormat('H:mm').

## Photo Rotation Logic
- Maintain index pointer; setInterval 90s precise enough. If tab visibility change (future), could compensate, but kiosk assumed always visible.
- Orientation detection: width/height metadata from Graph response or fallback via CSS object-fit rules (FR-012b, FR-012c, FR-012d, FR-012e).

## Layout Implementation
- Flexbox container: calendar flex-grow with ratio calculation: set photo width = base; calendar width = photo * 1.618 (±5%). Actual: compute available viewport width; apply CSS calc with ratio; allow slight rounding.
- Monochrome palette: CSS variables (--bg, --fg, --border-accent). Current day highlight: thicker border + maybe subtle box-shadow (FR-037, FR-038, FR-039).

## Offline / Error Handling
- Distinguish fetch statuses: OK, Refreshing, Warning, Error (FR-018). Provide minimal debug panel hidden by default or just console logs.
- On network failure: no UI blocking; reuse cached events; show placeholder for photo if missing.

## Security & Privacy Considerations
- Tokens stored locally only; not synced. Document recommendation to limit file permissions.
- No PII beyond event summaries and times; avoid storing attendee lists or descriptions.
- CSRF risk minimal (same-origin kiosk). Avoid exposing refresh endpoint publicly beyond local network.

## Testing Strategy (Pragmatic)
- Smoke: start server, load index.html (potentially via jsdom or minimal fetch), confirm calendar grid structure.
- Unit: timezone conversion across DST boundary; event ordering; rotation interval logic (simulate timers).
- Integration: token refresh mock (msal stub); failure fallback uses cached events.
- No snapshot tests; no coverage tooling initially.

## Future Pivots (Documented Early)
| Potential Need | Trigger | Possible Change |
|----------------|--------|-----------------|
| Bundling/Minification | Performance on low-power hardware | Introduce Vite build for front-end only |
| Rich Styling / theming | Desire for custom themes | Consider CSS variables expansion; still no framework |
| Persistent analytics | Need historical event display metrics | Add lightweight sqlite (reasses constitution gate) |
| Multi-user calendars | Different households | Introduce per-user config folder structure |

## Confirmation of No Clarifications Needed
Spec explicitly enumerates layout, rotation intervals, timezone conversion, ordering, styling. No ambiguous placeholders remain. Defaults (24h format, alphabetical all-day ordering) recorded.

## Gate Re-affirmation (Pre-Design)
All selected choices adhere to Simplicity, Minimal Dependencies (3 core libs), Pragmatic Testing (targeting few high-value tests). No violations.

## Decision Log (Phase 0)
1. Chose express over native http for faster route/static implementation; cost vs value favorable.
2. Rejected build tooling to keep zero-step deployment (copy repo, run node server).
3. Chose luxon for clean API & timezone correctness; avoided date-fns complexity with additional libraries.
4. Deferred dotenv until env var count grows; currently manageable with raw process.env.
5. Selected built-in test runner to avoid dependency overhead.

## Open Questions (Deferred – Not Blocking)
- Device Code vs Authorization Code flow for msal-node (choose Device Code for kiosk simplicity?). Will finalize in Phase 1 contracts.
- Whether to implement photo orientation prefetch (fast) vs rely solely on object-fit (start with object-fit only).

End of Phase 0 research.
