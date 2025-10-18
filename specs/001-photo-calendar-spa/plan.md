# Implementation Plan: photo-calendar-spa

**Branch**: `001-photo-calendar-spa` | **Date**: 2025-10-18 | **Spec**: `specs/001-photo-calendar-spa/spec.md`
**Input**: Feature specification from `/specs/001-photo-calendar-spa/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a kiosk SPA displaying a 21-day calendar (current week + next two) beside a rotating photo pane with golden ratio layout. One-time Microsoft OAuth leads to unattended token refresh; data auto-updates (photos 90s rotation, calendar 180s refresh + midnight rollover). Monochrome styling, timezone conversion, proper all-day & multi-day event handling, and minimal dependencies (express, msal-node, luxon) satisfy constitution gates.

## Technical Context

**Language/Version**: Node.js 20 LTS (backend + static ES modules)
**Primary Dependencies**: express, msal-node, luxon (dotenv deferred unless env grows)
**Storage**: File-based JSON under `data/` (config, tokens, cached events/photos)
**Testing**: Node built-in `node:test` (smoke + targeted unit/integration)
**Target Platform**: Linux kiosk (Chromium in fullscreen)
**Project Type**: Single web app (server + static front-end)
**Performance Goals**: Initial render <2s; rotation timing accuracy ≥95%; refresh operations lightweight (<500ms typical)
**Constraints**: ≤5 runtime deps; unattended 24/7; offline tolerance with cached data; monochrome styling
**Scale/Scope**: Single household usage; ≤500 events window; ≤200 photos

## Constitution Check

Initial Gate (pre-Phase 0): PASS across Simplicity, Dependency, Test Scope.
Post-Phase 1 (after research, data-model, contracts, quickstart): Re-affirmed PASS.

| Gate | Status | Justification |
|------|--------|---------------|
| Simplicity | PASS | Single service + static front-end; no build tooling; small focused modules. |
| Dependencies | PASS | Only 3 core runtime libs; each maps directly to spec needs (HTTP, OAuth, timezone). |
| Test Scope | PASS | Planned tests limited to high-value flows (render, rotation, token refresh, DST conversion). Built-in runner only. |

## Project Structure

### Documentation (this feature)

```
specs/001-photo-calendar-spa/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 rationale & decisions
├── data-model.md        # Entities, validation rules
├── quickstart.md        # Setup & run instructions
├── contracts/openapi.yaml  # API surface definition
└── tasks.md             # (Future) Delivery tasks
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.

```
src/
```
src/
  server/              # Express app, token management, Graph proxy endpoints
  services/            # calendarService.js, photoService.js (fetch + cache logic)
  auth/                # msal configuration, token refresh scheduler
  config/              # config loader/saver (file-based JSON)
  util/                # formatting/timezone helpers (luxon wrappers)
  public/              # index.html, css/, js/ (ES modules: calendarView.js, photoRotator.js, apiClient.js)

data/                  # tokens.json, config.json, cached events/photos metadata

tests/
  smoke/               # start server, request root, basic assertions
  unit/                # helpers (timezone conversion, rotation timing)
  integration/         # token refresh flow (mock msal), calendar fetch ordering, photo list rotation
```

**Structure Decision**: Adopt single-project layout under `src/` combining backend and static front-end to satisfy Simplicity & Minimal Dependencies. No build step; static assets served directly. Tests segregated by scope for clarity without extra tooling.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | N/A | Current plan meets all gates without exceptions |

