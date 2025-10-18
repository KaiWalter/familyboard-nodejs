# Data Model: photo-calendar-spa

Date: 2025-10-18
Branch: 001-photo-calendar-spa
Spec Reference: ./spec.md

## Overview
Minimal file-backed JSON persistence; no database. In-memory objects hydrated from JSON at startup and flushed when mutated. Entities reflect spec functional requirements (FR series) and support success criteria.

## Entities

### CalendarEvent
Represents a single event fetched from Microsoft Graph.
| Field | Type | Required | Constraints / Notes |
|-------|------|----------|----------------------|
| id | string | yes | Stable unique identifier from Graph. |
| title | string | yes | Non-empty; trimmed. |
| startUtc | string (ISO8601) | yes | UTC timestamp (original). |
| endUtc | string (ISO8601) | yes | UTC timestamp (original). endUtc >= startUtc. |
| allDay | boolean | yes | Derived from Graph isAllDay. |
| sourceCalendarId | string | yes | One of configured calendar IDs (FR-002). |
| localizedStart | string (ISO8601) | yes | Converted to configured timezone (FR-029). |
| localizedEnd | string (ISO8601) | yes | Converted timezone. |
| displayDateKey | string | yes | YYYY-MM-DD in configured timezone for grouping. |
| multiDayAllDay | boolean | no | True if spans >1 whole day and allDay (FR-033). |
| continuation | boolean | no | True if this instance is a repeated representation beyond the first day (FR-033/FR-034). |

Validation:
- Ensure ordering (startUtc < endUtc).
- All-day multi-day expansion creates synthetic CalendarEvent entries per day with continuation=true after first.
- Timed multi-day events: Only first day rendered with time range (assumption from spec scenario 12).

### CalendarConfig
| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| calendarIds | string[] | yes | Length 1..5 (FR-002). Unique. |
| locale | string | yes | e.g., "en-US", "de-DE" (FR-024). |
| timezone | string | yes | IANA zone (FR-028). Validate with Luxon setZone success. |
| weekdayAbbrevOverride | Record<string,string> | no | Optional mapping: Mon..Sun to 2-letter strings (FR-026). |

Validation:
- Each calendarId non-empty.
- timezone recognized by Intl / Luxon.
- Override keys subset of days.

### PhotoAsset
| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| id | string | yes | Unique within folder (e.g., fileId). |
| fileName | string | yes | Original filename. |
| url | string | yes | Direct/temporary fetch URL or proxy path. |
| orientation | 'landscape' | 'portrait' | no | Derived from metadata (width>=height => landscape). |
| width | number | no | Optional pixel width (if available). |
| height | number | no | Optional pixel height. |

### PhotoRotationSettings
| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| intervalSeconds | number | yes | Fixed 90 (FR-004); stored for clarity though immutable. |
| lastIndex | number | no | >=0; persists state across reload if desired. |

### LayoutSettings
| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| goldenRatioEnabled | boolean | yes | True/False (FR-005). |
| ratio | number | yes | Default 1.618; tolerance ±0.05 (SC-006). |

### AppConfig
Aggregates user-configurable + derived settings.
| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| oneDriveFolderId | string | yes | Non-empty (FR-003). |
| calendar | CalendarConfig | yes | Validated. |
| layout | LayoutSettings | yes | Validated. |
| rotation | PhotoRotationSettings | yes | interval fixed 90. |

### AuthTokenStore
| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| accessToken | string | yes | Non-empty. |
| refreshToken | string | yes | Non-empty (msal may abstract). |
| expiresAt | string (ISO8601) | yes | Future timestamp. |
| scopeHash | string | yes | Hash of scopes to detect mismatch. |
| lastRefreshAttempt | string (ISO8601) | no | Updated on each attempt. |
| status | 'OK' | 'Refreshing' | 'Warning' | 'Error' | yes | (FR-018). |

### CachedData
| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| events | CalendarEvent[] | no | May be empty on first run. |
| photos | PhotoAsset[] | no | Cached list. |
| lastCalendarFetch | string | no | Timestamp. |
| lastPhotoScan | string | no | Timestamp. |

## Relationships
- AppConfig.calendar.calendarIds link to CalendarEvent.sourceCalendarId.
- PhotoRotationSettings independent; used by photo rotator component.
- AuthTokenStore consumed by auth scheduler & Graph proxy.
- CachedData.events grouped by `displayDateKey` for UI cells; multi-day all-day events produce multiple entries.

## File Persistence Layout
```
data/
  config.json            # AppConfig
  tokens.json            # AuthTokenStore
  events.json            # CachedData.events (subset containing last successful window)
  photos.json            # CachedData.photos (optional if metadata extraction performed)
```

## Validation Rules Summary
| Rule | Enforcement Point | Failure Handling |
|------|-------------------|------------------|
| calendarIds length 1..5 | config load | Reject change; keep previous config. |
| timezone valid | config load/save | Fallback to 'UTC' + warning. |
| ratio within ±0.05 of 1.618 | layout compute | Log warning; adjust to boundary. |
| accessToken not expired on use | auth middleware | Attempt refresh; if fail use cached data. |
| event end >= start | fetch transform | Drop invalid event; log warning. |
| all-day multi-day expansion | event transform | Generate per-day entries. |
| photo URL reachable (optional ping) | initial scan | Skip & log if 404. |

## Derived Fields
- localizedStart/localizedEnd computed once per fetch. Not recomputed at render.
- displayDateKey derived from localizedStart date portion.
- orientation derived from width/height if available else inferred from aspect ratio after image natural size load (front-end fallback).

## Edge Cases Handling Mapping
| Edge Case | Data Model Response |
|-----------|---------------------|
| Rate limit -> stale events | events.json retains previous window; no mutation. |
| Multi-day timed events | Only first day CalendarEvent kept (assumption). |
| Timezone shift (DST) | Future events recalculated on next fetch; stored localized times reflect correct offset. |
| Empty photo folder | photos array empty; UI renders placeholder. |

## Minimal Schemas (JSON Schema Draft 2020-12 excerpts)

CalendarConfig (excerpt):
```json
{
  "$id": "CalendarConfig",
  "type": "object",
  "required": ["calendarIds", "locale", "timezone"],
  "properties": {
    "calendarIds": {"type": "array", "minItems": 1, "maxItems": 5, "items": {"type": "string"}},
    "locale": {"type": "string"},
    "timezone": {"type": "string"},
    "weekdayAbbrevOverride": {"type": "object", "additionalProperties": {"type": "string"}}
  }
}
```

CalendarEvent (excerpt):
```json
{
  "$id": "CalendarEvent",
  "type": "object",
  "required": ["id", "title", "startUtc", "endUtc", "allDay", "sourceCalendarId", "localizedStart", "localizedEnd", "displayDateKey"],
  "properties": {
    "id": {"type": "string"},
    "title": {"type": "string", "minLength": 1},
    "startUtc": {"type": "string", "format": "date-time"},
    "endUtc": {"type": "string", "format": "date-time"},
    "allDay": {"type": "boolean"},
    "sourceCalendarId": {"type": "string"},
    "localizedStart": {"type": "string", "format": "date-time"},
    "localizedEnd": {"type": "string", "format": "date-time"},
    "displayDateKey": {"type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$"},
    "multiDayAllDay": {"type": "boolean"},
    "continuation": {"type": "boolean"}
  }
}
```

AppConfig (excerpt):
```json
{
  "$id": "AppConfig",
  "type": "object",
  "required": ["oneDriveFolderId", "calendar", "layout", "rotation"],
  "properties": {
    "oneDriveFolderId": {"type": "string", "minLength": 1},
    "calendar": {"$ref": "CalendarConfig"},
    "layout": {"type": "object", "required": ["goldenRatioEnabled", "ratio"], "properties": {"goldenRatioEnabled": {"type": "boolean"}, "ratio": {"type": "number", "minimum": 1.568, "maximum": 1.668}}},
    "rotation": {"type": "object", "required": ["intervalSeconds"], "properties": {"intervalSeconds": {"type": "number", "const": 90}, "lastIndex": {"type": "number", "minimum": 0}}}
  }
}
```

## Implementation Notes
- Simple validation functions instead of full JSON Schema validator to avoid extra dependency; schemas documented for clarity/testing.
- Write operations: mutate in-memory object then atomic write (`fs.writeFile` to temp file then rename) to reduce corruption risk.
- Concurrency minimal; single process assumed.

End of Data Model.
