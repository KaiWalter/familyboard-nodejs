# Feature Specification: Photo & Calendar SPA

**Feature Branch**: `001-photo-calendar-spa`  
**Created**: 2025-10-18  
**Status**: Draft  
**Input**: User description: "build an node js javascript spa application, it aims to rotate through a set of photos on the left hand side from a onedrive folder to be configured, on the right hand side a 3 weeks overview from to be configured outlook calendars shall be displayed, the ratio photo pane to calendar pane shall follow the golden rule with more space for calendar"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - View 3-Week Calendar Panel (Priority: P1)

User opens the SPA and immediately sees a right-hand calendar panel showing events spanning
the current week plus the next two weeks across selected Outlook calendars (configurable).

**Why this priority**: Core utility is the forward-looking family schedule; provides immediate value
even without photos.

**Independent Test**: Launch app with configured calendars; calendar panel renders 21-day range with
events grouped by day. Photos may still be placeholder; story remains useful alone.

**Acceptance Scenarios**:

1. **Given** valid calendar IDs configured, **When** user loads the app, **Then** a 3-week continuous range (today through +20 days) with events is displayed.
2. **Given** no events on a particular day, **When** calendar renders, **Then** that day shows an empty state indicator (e.g., "No events").
3. **Given** the localization is set to a supported locale (e.g., "de-DE"), **When** the calendar renders, **Then** weekday headers use two-letter localized abbreviations and ISO week numbers appear in row headers.
4. **Given** the current date is mid-week (e.g., Thursday), **When** calendar renders, **Then** the first row still starts with Monday of the current week.
5. **Given** the 3-week display spans a year boundary, **When** calendar renders, **Then** week numbers reflect correct ISO week numbering for each week.
6. **Given** the first Monday cell of the calendar, **When** it renders, **Then** its day header includes the localized 3-letter month abbreviation (e.g., "Oct" / "Okt").
7. **Given** a month boundary occurs within any week row, **When** the cell for the first day of the new month (day-of-month = 1) renders, **Then** its header includes the localized 3-letter month abbreviation to signal the change.
8. **Given** a configured timezone different from UTC (e.g., Europe/Berlin), **When** events are fetched, **Then** each event's displayed start/end times reflect conversion from UTC to that timezone.
9. **Given** an all-day event, **When** the day cell renders, **Then** the event appears at the top with only its title (no time range).
10. **Given** multiple events including all-day and timed events, **When** the day cell renders, **Then** all-day events appear first (sorted alphabetically by title) followed by timed events sorted by start time.
11. **Given** a multi-day all-day event spanning several days, **When** the calendar renders, **Then** the event appears once in each affected day cell.
12. **Given** a multi-day timed event (rare; assumed out of initial scope), **When** displayed, **Then** only the start day shows the time range (assumption documented); continuation days are not rendered for timed events in MVP.
13. **Given** the calendar renders, **When** viewing the interface, **Then** visual styling uses a simple black/white (grayscale) palette with sufficient contrast (WCAG AA for text assumed) and no distracting colors.
14. **Given** today's date is within the displayed range, **When** the calendar renders, **Then** the current day cell shows a clearly visible highlighted border.
15. **Given** developer needs to tweak styling, **When** inspecting elements, **Then** distinct CSS classes exist for row header, column header, cell header, event, and current-day cell.

---

### User Story 2 - Rotate Photos from OneDrive Folder (Priority: P2)

User sees left-hand photo pane cycling through images from a configured single OneDrive folder
at a gentle interval (e.g., every 30 seconds) while calendar stays visible.

**Why this priority**: Enhances engagement/aesthetic after core scheduling utility; depends only on basic config.

**Independent Test**: With only photo configuration set (calendar can be disabled), the app cycles through
available photos without error; provides standalone value as a slideshow.

**Acceptance Scenarios**:

1. **Given** a folder configured with at least 2 images, **When** the app runs, **Then** the photo pane displays each image in rotation at the set interval.
2. **Given** an empty folder, **When** the app runs, **Then** a friendly placeholder message is shown (not an error stack).
3. **Given** a landscape-oriented image wider than the pane, **When** it is displayed, **Then** it is scaled and centered with letterboxing and no overflow.
4. **Given** a portrait-oriented image taller than it is wide, **When** it is displayed, **Then** it fills height proportionally without cropping and remains fully visible within bounds.

---

and optional golden ratio layout preference (calendar width > photo width). Settings persist between sessions.
### User Story 3 - Configure Sources & Display Ratio (Priority: P3)

User can adjust: OneDrive folder path, list of calendar IDs (up to 5), and optional golden ratio layout preference (calendar width > photo width). Settings persist between sessions.
Photo rotation interval is fixed at 90 seconds for kiosk simplicity and is NOT user-configurable.

**Why this priority**: Configuration enables personalization; golden ratio preference improves readability.

**Independent Test**: Configuration UI alone (without active photo or calendar integration) saves and loads
settings correctly; placeholder panels respect ratio values.

**Acceptance Scenarios**:

1. **Given** user changes calendar list and saves, **When** app reloads, **Then** new calendars appear in the 3-week view.
2. **Given** user enables ratio layout, **When** app renders, **Then** calendar pane width ≈ 1.618× photo pane width (±5%).

---

### User Story 4 - Operator-Less Auth & Token Refresh (Priority: P4)

An operator performs a one-time interactive authentication (e.g., via SSH tunnel with browser access) to Microsoft services (Graph for calendars & OneDrive). After this, stored tokens on the target system enable automatic, scheduled refreshes without further human intervention.

**Why this priority**: Enables unattended display device operation (e.g., wall-mounted screen) ensuring calendar/photo data stays current.

**Independent Test**: With only this story implemented, system uses previously stored tokens to fetch calendar events and photo list at startup and successfully refreshes tokens before expiry.

**Acceptance Scenarios**:

1. **Given** valid tokens stored locally, **When** app starts, **Then** authentication uses stored tokens without prompting for login.
2. **Given** token nearing expiry (e.g., <10 minutes remaining), **When** background refresh job runs, **Then** new tokens are stored and subsequent API calls succeed.
3. **Given** refresh fails due to network error, **When** retry logic activates, **Then** system retries at defined interval and logs concise warning without crashing.

### Edge Cases

- No network connectivity at load (show offline banner; continue showing last cached photo if any).
- Calendar API rate limit encountered (fallback to previously cached events for current day; log concise warning).
- Photo missing or unsupported format (skip and move to next; record in console).
- Folder with very large images (display scaled version; do not attempt client-side heavy processing beyond basic CSS sizing).
- Timezone shifts (midnight local rollover updates 3-week range without manual refresh).

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST display a continuous 21-day calendar range starting at local today.
- **FR-002**: System MUST fetch and render events from up to 5 configured Outlook calendars.
- **FR-003**: System MUST allow configuration of OneDrive folder path for photo source.
- **FR-004**: System MUST rotate through available photos at a fixed 90-second cycle (no manual controls).
- **FR-005**: System MUST provide a layout where calendar pane width is greater than photo pane width using golden ratio (~1.618) when enabled.
- **FR-006**: System MUST persist configuration (calendar IDs, folder path, ratio enabled) locally. (Photo rotation interval is fixed and excluded.)
- **FR-007**: System MUST gracefully handle empty photo folder by showing a placeholder message.
- **FR-008**: [Removed – manual controls out of scope per kiosk automation requirement]
- **FR-009**: System MUST update the 3-week window at midnight without manual refresh.
- **FR-010**: System MUST operate without hard failure when network/API errors occur (show fallback state + concise message).
- **FR-011**: System SHOULD cache last successful calendar data to display if new fetch fails.
- **FR-012**: System SHOULD skip unsupported/missing images without user disruption.
- **FR-012a**: System MUST render exactly one image at a time fully contained within the photo pane (no scrollbars, no overflow).
- **FR-012b**: System MUST center landscape images with preserved aspect ratio (letterboxing where needed).
- **FR-012c**: System MUST scale portrait images to maximize height while retaining full visibility and aspect ratio.
- **FR-012d**: System MUST avoid distortion (aspect ratio variance ≤1%).
- **FR-012e**: System SHOULD show a neutral background color behind letterboxed areas.
- **FR-012f**: System MUST run in kiosk full-screen mode utilizing entire viewport with no browser chrome/margins and no scrollbars.
- **FR-013**: System MUST load and use previously stored auth tokens (if present) at startup without interactive prompts.
- **FR-014**: System MUST persist newly acquired tokens securely on local filesystem after one-time interactive auth.
- **FR-015**: System MUST refresh tokens proactively before expiry (target: refresh when remaining lifetime <15%).
- **FR-016**: System SHOULD retry failed token refresh attempts with backoff (e.g., first retry after 30s, then 2m) up to a reasonable limit (e.g., 5 attempts) before falling back to cached data.
- **FR-017**: System MUST continue serving last cached calendar/photo data if refresh/auth fails temporarily.
- **FR-018**: System MUST provide a simple status indicator (internal or console) for auth state: OK, Refreshing, Warning, Error.
- **FR-018a**: System MUST refresh calendar data automatically every 180 seconds while running (in addition to midnight rollover) without user interaction.
- **FR-019**: System MUST display calendar as 3 horizontal week rows × 7 weekday columns (Mon–Sun) per row.
- **FR-020**: System MUST label weekday columns with two-letter localized abbreviations per configured locale.
- **FR-021**: System MUST label each week row with its ISO week number.
- **FR-022**: System MUST render each day cell with numeric day-of-month as a header element.
- **FR-023**: System MUST anchor the first row to Monday of the current week regardless of current day.
- **FR-024**: System MUST support at least locales "en-US" and "de-DE" for weekday abbreviations.
- **FR-025**: System SHOULD correctly handle year boundary transitions (e.g., week 52/53 to week 1) without mislabeling.
- **FR-026**: System SHOULD allow override of weekday abbreviations via configuration.
- **FR-027**: System MUST include localized 3-letter month abbreviation in the header of the first Monday cell and any cell where day-of-month = 1 within the displayed range.
- **FR-028**: System MUST allow configuration of a timezone identifier (IANA string) used for event time display.
- **FR-029**: System MUST convert all fetched UTC event timestamps to the configured timezone for display purposes.
- **FR-030**: System MUST format timed events as "H:MM - H:MM Title" using 24-hour clock respecting locale for month/day names (assumption: 24h format acceptable in target locales).
- **FR-031**: System MUST display all-day events using only their title (no time range).
- **FR-032**: System MUST sort all-day events to the top of the day cell followed by timed events sorted ascending by start time.
- **FR-033**: System MUST repeat multi-day all-day events across each day they span (one entry per day) to indicate continuation.
- **FR-034**: System SHOULD optionally mark continuation days (e.g., subtle indicator) without prescribing implementation specifics.
- **FR-035**: System MUST correctly handle daylight saving transitions when converting UTC (events show correct local times pre/post shift).
- **FR-036**: System MUST provide CSS class hooks: `.row-header`, `.column-header`, `.cell-header`, `.event`, `.current-day` for respective elements.
- **FR-037**: System MUST highlight the current day cell with a visually distinct border (e.g., thicker or contrasting monochrome) while retaining monochrome scheme.
- **FR-038**: System MUST implement a monochrome (black/white/grayscale) color palette avoiding saturated colors for calendar structural elements and events.
- **FR-039**: System SHOULD ensure text/background contrast meets an accessibility baseline (assumption: contrast ratio ≥4.5:1 for primary text) without specifying implementation details.

No critical ambiguities require clarification beyond reasonable defaults; no NEEDS CLARIFICATION markers added.

### Key Entities *(include if feature involves data)*

- **CalendarEvent**: Represents a single event (id, title, startDateTime, endDateTime, allDay flag, sourceCalendarId).
- **CalendarConfig**: User configuration for list of calendar IDs (array of strings, max length 5).
- **PhotoAsset**: Represents an image (filename, displayName, url/reference, orientation metadata optional).
- **PhotoRotationSettings**: Interval (seconds), paused flag, lastShownIndex.
- **LayoutSettings**: Golden ratio enabled flag, computed widths (calendarWidthPx, photoWidthPx) derived at runtime.
- **AppConfig**: Aggregates CalendarConfig, PhotoRotationSettings, LayoutSettings, OneDrive folder path.
- **AuthTokenStore**: Represents persisted credential set (accessToken, refreshToken, expiresAt, scopeHash, lastRefreshAttempt, status).
  - Extended: stores original UTC start/end for events and derived localized displayStart/displayEnd; continuation flag for multi-day all-day events.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Calendar view renders initial 21-day range within 2 seconds on first load (normal connection).
- **SC-002**: Photo rotation advances automatically at configured interval with ≥95% timing accuracy over 10 minutes.
- **SC-003**: Users can configure and persist settings (folder, calendars, ratio) in under 1 minute.
- **SC-004**: App handles offline or API error scenarios by showing fallback content without crashing 100% of tested cases.
- **SC-005**: Photo rotation advances precisely every 90s with ≥95% timing accuracy over a 30-minute observation.
- **SC-006**: Layout ratio accuracy: calendar pane width within ±5% of 1.618× photo pane width when enabled.
- **SC-007**: App starts and authenticates using stored tokens with zero interactive steps in ≥99% of cold starts after initial setup.
- **SC-008**: Token refresh succeeds before expiry in ≥95% of attempts under stable network conditions.
- **SC-009**: On refresh failure scenarios, system continues displaying cached data with no hard failure (100% of tested simulated outages ≤30 minutes).
- **SC-010**: Calendar auto-refresh executes successfully at 180s intervals with ≥95% success rate over 30 minutes under stable network.
- **SC-011**: 100% of sampled events (≥30 mixed timed/all-day/multi-day including DST boundary) display correct localized times, ordering (all-day first), and repetition rules in validation tests.
- **SC-012**: In a usability check, >90% of observers identify the current day cell within 2 seconds using only the monochrome border highlight.

## Assumptions

1. Authentication for Microsoft APIs will use existing personal access context (e.g., OAuth token acquisition handled externally or minimal integrated login later).
2. Caching uses simple in-memory or local storage—no database layer introduced initially.
3. Timezone based on user browser locale; all-day events displayed distinctly.
4. Performance targets are modest; no server-side rendering required for MVP.
5. OneDrive folder contains only images; non-image files ignored.

## Out of Scope (Current Version)

- Multi-user profiles.
- Advanced calendar filtering (categories, colors per source).
- Video playback or complex transitions for photos.
- Mobile-specific gesture optimizations.

## Risks

- Microsoft API rate limiting could degrade calendar freshness.
- Very large image files may slow initial load; mitigation via CSS scaling only.

## Success Validation Strategy

Manual smoke test covering: initial load (SC-001), photo rotation over 10 minutes (SC-002), settings modify & persist (SC-003), offline simulation (disable network) (SC-004), control responsiveness (SC-005), layout measurement (SC-006).

