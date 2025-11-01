# Generic Application Requirements

Version: 2025-11-01
Status: Draft
Source Basis: Derived from feature specification (Photo & Calendar SPA) generalized for spec-driven / agentic development.

## 1. Overview

A single-page kiosk-style information display application that combines a forward-looking multi-week schedule view with a rotating media panel.
Designed for unattended operation, resilient data refresh, clear configurability, and deterministic UI layout.
Screen shall have 2 main panes: left for media items (images), right for calendar events.
Panes shall have a golden ratio width relationship where right pane takes up more space.

## 2. Objectives

- Provide immediate situational awareness of upcoming days (21-day horizon).
- Offer passive visual engagement via rotating media items.
- Support simple one-time interactive authentication then fully automated token refresh.
- Maintain operation under transient failures using cached data.
- Enable locale, timezone, and layout customization with persistent settings.

## 3. User Personas

- Primary Viewer: Passive consumer (e.g., household member) needing quick schedule glance.
- Operator / Maintainer: Performs initial auth and config; expects zero ongoing manual tasks.
- (Optional) Configurator: Adjusts settings (sources, layout) occasionally.

## 4. Core Use Cases (Independent Slices)

UC-01 View continuous 3-week schedule (current week + next two) from multiple sources.
UC-02 Display rotating media (e.g., images) from a configured folder.
UC-03 Persist and apply configuration (data sources, layout ratio, locale/timezone).
UC-04 Unattended auth: load stored tokens; proactive refresh before expiry.
UC-05 Resilient refresh cycle: periodic event + media list updates; fallback to cache on failure.

Each use case must deliver standalone value if implemented in isolation.

## 5. Domain Model (Conceptual)

Entity CalendarEvent: { id, title, startUTC, endUTC, isAllDay, sourceId }
Entity MediaItem: { id/filename, displayName, uri, orientation }
Entity AppConfig: { calendarIds[≤5], mediaFolderPath, ratioEnabled, locale, timezone, weekdayOverrides?, lastSaved }
Entity AuthTokenSet: { accessToken, refreshToken, expiresAtUTC, scopeHash, status }
Derived DisplayEvent: { originalStartUTC, originalEndUTC, localStart, localEnd, isContinuation(bool for multi-day all-day) }
Runtime State: { cachedEvents[], cachedMediaItems[], currentMediaIndex, lastCalendarRefresh, lastMediaScan }

## 6. Functional Requirements (Grouped)

### 6.1 Calendar Range & Structure

FR-CAL-001 System MUST render a continuous 21-day range beginning at local "today".
FR-CAL-002 System MUST anchor first displayed row to Monday of current week.
FR-CAL-003 System MUST render 3 rows (weeks) × 7 columns (Mon–Sun).
FR-CAL-004 System MUST include ISO week number labeling per row.
FR-CAL-005 System MUST show empty-state indicator for days without events.
FR-CAL-006 System MUST highlight current day cell distinctly within monochrome palette.
FR-CAL-007 System SHOULD correctly handle year boundary and week numbering transitions.
FR-CAL-008 System MUST update the 21-day window automatically at local midnight without manual action.
FR-CAL-009 System MUST auto-refresh calendar data at a fixed interval (e.g., 180s).

### 6.2 Event Rendering & Ordering

FR-EVT-001 System MUST display day header containing numeric day-of-month.
FR-EVT-002 System MUST include localized 3-letter month abbreviation in header of first Monday and any day with day-of-month=1.
FR-EVT-003 System MUST convert event UTC timestamps to configured timezone for display.
FR-EVT-004 System MUST handle daylight saving transitions correctly.
FR-EVT-005 System MUST format timed events as "H:MM - H:MM Title" using 24h clock.
FR-EVT-006 System MUST display all-day events by title only (no times).
FR-EVT-007 System MUST order all-day events first (alphabetical) then timed events by start time.
FR-EVT-008 System MUST repeat multi-day all-day events across all affected days.
FR-EVT-009 System SHOULD optionally mark continuation days (non-prescriptive styling).
FR-EVT-010 System MUST provide CSS hooks for styling: .row-header, .column-header, .cell-header, .event, .current-day.

### 6.3 Media Rotation

FR-MED-001 System MUST rotate through available media items from configured folder at fixed interval (e.g., 90s) with no manual controls.
FR-MED-002 System MUST show placeholder if folder empty (graceful message).
FR-MED-003 System MUST display exactly one media item at a time with no overflow scrollbars.
FR-MED-004 System MUST preserve aspect ratio (variance ≤1%).
FR-MED-005 System MUST center landscape items (letterboxing where needed) with neutral background.
FR-MED-006 System MUST scale portrait items to maximize height while fully visible.
FR-MED-007 System SHOULD skip unsupported or missing files without user disruption.

### 6.4 Layout & Ratio

FR-LAY-001 System MUST support optional layout where schedule pane width ≈ 1.618 × media pane width (golden ratio) tolerance ±5%.
FR-LAY-002 System MUST provide full-screen kiosk mode (use entire viewport, no scrollbars/margins).

### 6.5 Configuration & Persistence

FR-CONF-001 System MUST persist configuration locally (calendarIds, mediaFolderPath, ratioEnabled, locale, timezone, weekday overrides).
FR-CONF-002 System MUST load persisted configuration on startup before rendering.
FR-CONF-003 System SHOULD allow up to 5 distinct calendar/source IDs.
FR-CONF-004 System SHOULD allow override of weekday abbreviations.

### 6.6 Localization & Timezone

FR-LOC-001 System MUST support at least two locales (e.g., en-US, de-DE) for weekday abbreviations.
FR-LOC-002 System MUST label weekday columns with two-letter localized abbreviations.
FR-LOC-003 System MUST apply configured IANA timezone for all event time conversions.

### 6.7 Authentication & Token Lifecycle

FR-AUTH-001 System MUST use stored tokens at startup without interactive prompts (post initial setup).
FR-AUTH-002 System MUST persist newly acquired tokens securely on local filesystem.
FR-AUTH-003 System MUST proactively refresh tokens before expiry threshold (e.g., <15% remaining lifetime).
FR-AUTH-004 System SHOULD apply exponential/backoff retry on refresh failures (e.g., 30s, 120s ...) up to limit.
FR-AUTH-005 System MUST expose auth state statuses: OK, Refreshing, Warning, Error (internal or console).
FR-AUTH-006 System MUST continue using cached data if auth/refresh temporarily fails.

### 6.8 Refresh & Scheduling

FR-REF-001 System MUST periodically refresh calendar data (interval constant, e.g., 180s).
FR-REF-002 System SHOULD refresh media list on a schedule or detect changes (strategy unspecified).
FR-REF-003 System MUST perform midnight rollover recomputation of displayed range.

### 6.9 Resilience & Fallback

FR-RES-001 System MUST avoid hard failure on network/API errors (show fallback + concise status).
FR-RES-002 System SHOULD cache last successful calendar dataset for reuse when fetch fails.
FR-RES-003 System MUST keep displaying last cached media item on offline condition.
FR-RES-004 System SHOULD log concise warnings for rate limits / refresh retries.

### 6.10 Accessibility & UI Constraints

FR-ACC-001 System MUST use a monochrome (black/white/grayscale) palette for structural elements.
FR-ACC-002 System SHOULD meet text/background contrast baseline (≥4.5:1 primary text).
FR-ACC-003 System MUST clearly highlight current day cell (distinct border).

## 7. Non-Functional Requirements

NFR-PERF-001 Initial calendar view render ≤2s under nominal network conditions.
NFR-PREC-001 Media rotation timing accuracy ≥95% over 30-minute sample.
NFR-RELI-001 Token refresh success rate ≥95% under stable network.
NFR-RELI-002 Auto-refresh of calendar executes ≥95% of scheduled intervals in observation window.
NFR-ROBUST-001 System continues serving cached data for outages ≤30 minutes without crash.
NFR-USAB-001 Current day cell recognition by observer within 2s in usability check (>90% participants).
NFR-AUTH-001 Stored token cold starts succeed without interaction ≥99% of attempts after initial setup.

## 8. Edge Cases

EC-001 Offline at startup: load cached events/media, display offline indicator.
EC-002 Rate limit: reuse cached events until next successful window; log warning.
EC-003 Very large image dimensions: rely on CSS scaling only, no heavy preprocessing.
EC-004 Multi-day timed events: only start day shows time range (continuations out-of-scope for MVP).
EC-005 Daylight saving boundary: local times correct before/after shift.
EC-006 Empty media folder: show placeholder; no errors thrown.

## 9. Metrics & Instrumentation (for Agentic Testing)

Metric calendar_initial_render_ms
Metric media_rotation_interval_accuracy_pct
Metric token_refresh_success_pct
Metric calendar_refresh_success_pct
Metric cached_operation_duration_ms
Metric current_day_recognition_success_pct (usability test input)
Metric cold_start_noninteractive_success_pct

## 10. Acceptance Test Hooks

Hook AT-CAL-RANGE: Validate 21 distinct day cells starting Monday-of-week(today) .. +20 days.
Hook AT-CAL-DST: Provide events across DST change; assert local times match expected.
Hook AT-MEDIA-ROTATE: Measure rotation timestamps over ≥6 cycles; compute deviation.
Hook AT-AUTH-REFRESH: Simulate nearing expiry; assert refresh occurs and tokens updated.
Hook AT-FALLBACK-OFFLINE: Disable network; assert cached data persists; no unhandled exception.
Hook AT-LAYOUT-RATIO: Measure pane widths; assert ratio within ±5% of 1.618 when enabled.
Hook AT-ORDERING: Mixed events day: assert all-day alphabetical; timed ascending.
Hook AT-REPEAT-ALLDAY: Multi-day all-day event appears in each day spanned.

## 11. Configuration Schema (Abstract)

config.calendarIds: string[] (max 5) REQUIRED
config.mediaFolderPath: string REQUIRED
config.ratioEnabled: boolean DEFAULT false
config.locale: string DEFAULT "en-US"
config.timezone: string DEFAULT derived from environment
config.weekdayOverrides: Record<string,string> OPTIONAL (keys Mon..Sun)
config.lastSaved: ISO8601 timestamp

## 12. Token Store Schema (Abstract)

token.accessToken: string
token.refreshToken: string
token.expiresAtUTC: ISO8601
token.scopeHash: string
token.status: enum { OK, Refreshing, Warning, Error }

## 13. Operational States

STATE DisplayReady: Config loaded; initial range computed.
STATE AuthReady: Valid tokens loaded or acquired.
STATE Refreshing: Data or tokens actively updating.
STATE Degraded: Operating on cached data due to failure.
STATE Offline: Network unreachable; periodic retry scheduled.

## 14. Glossary

All-Day Event: Event without specific start/end times for display; spans full local day(s).
Continuation Day: Non-first day in multi-day all-day event span.
Golden Ratio Layout: Width(Photo):Width(Calendar) ≈ 1:1.618.
Kiosk Mode: Full-screen no-scroll operation intended for passive display.
UTC Conversion: Transform from stored UTC timestamps to configured timezone for presentation.

## 15. Exclusions (Out of Scope for Base Spec)

- Multi-user profiles or per-user calendars.
- Advanced filtering (categories, color coding per source).
- Video/media transitions beyond simple fade or swap.
- Mobile gesture optimization.

## 16. Risk Summary

RISK Rate limiting reduces freshness (Mitigation: cache + retry).
RISK Large media slows load (Mitigation: CSS scale, optional later optimization).
RISK DST / timezone complexity (Mitigation: rely on robust timezone library).

## 17. Agentic Guidance

- IDs follow pattern PREFIX-CATEGORY-NNN for traceability.
- All MUST requirements are mandatory for MVP; SHOULD are enhancements.
- Testing hooks map directly to functional IDs for automated validation.
- Metrics should be capturable via lightweight instrumentation without external dependencies.

END OF REQUIREMENTS
