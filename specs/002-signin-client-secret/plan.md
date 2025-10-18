# Implementation Plan: Confidential Sign-In Flow (Closed / Superseded)

**Branch**: `002-signin-client-secret` | **Date**: 2025-10-18 | **Spec**: `specs/002-signin-client-secret/spec.md` | **Status**: Closed (Merged into `001-photo-calendar-spa`)
**Input**: Feature specification from `/specs/002-signin-client-secret/spec.md`

> NOTE: This plan is archived. All implementation work has migrated to the unified core feature spec at `specs/001-photo-calendar-spa/spec.md` (see FR-040..FR-056). Do not execute tasks below; they are retained for historical traceability.

## Summary

Add confidential (client secret) authorization code sign-in flow with `/signin`, `/callback`, and `/signout` endpoints. Provide secure state validation (CSRF mitigation), token exchange, secure persistence, refresh rotation, audit logging, and session invalidation in alignment with existing simple Node.js + Express architecture (current project uses Express for other routes). Maintain minimal dependencies (reuse existing logging & token storage patterns) and keep implementation self-contained in `src/auth/` and `src/server/routes/`.

## Technical Context

**Language/Version**: Node.js 20 (ES modules)  
**Primary Dependencies**: express (already in project); crypto (built-in); no new external deps anticipated for OAuth exchange (HTTP via built-in fetch or node https)  
**Storage**: File-based JSON (extending existing token store) + in-memory session state map  
**Testing**: Node built-in test runner (existing pattern) with unit + integration tests under `tests/`  
**Target Platform**: Linux server (local kiosk deployment)  
**Project Type**: Single project (backend + static SPA)  
**Performance Goals**: Auth endpoints low traffic; code exchange round-trip < 2s typical; internal state lookups O(1)  
**Constraints**: Minimal dependencies; no database introduction; secure secret handling (never log raw tokens / secret)  
**Scale/Scope**: Single-user kiosk / low concurrency (<= a few simultaneous sessions)  

No unresolved clarifications required; defaults are industry standard (Authorization Code w/ confidential client, state parameter, refresh tokens).

## Constitution Check

| Principle | Compliance | Notes |
|-----------|------------|-------|
| Simplicity First | PASS | Reusing existing Express app & file stores; no new framework. |
| Maintainable Code | PASS | Small focused modules: state util, session store, code exchange, middleware. |
| Minimal Dependencies | PASS | No added third-party packages planned. |
| Pragmatic Testing | PASS | Tests limited to state util, token store, key integration flows. |
| Sustainable Pace & Fun | PASS | Incremental user stories maintain demoable progress. |

No gate violations; proceed to research & design.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── auth/                # Existing auth utilities + new confidential flow modules
├── server/
│   ├── app.js           # Express app registration
│   └── routes/          # Add signin.js, callback.js, signout.js
├── services/            # Reuse cache for rate limiting extension
├── util/                # Logging (audit wrapper extension)
└── config/              # Config store extended for client id/secret

tests/
├── integration/         # sign-in redirect, callback, refresh, sign-out
├── unit/                # state util, token store, mask, audit coverage
└── auth/ (scaffolding)  # optional grouping README
```

**Structure Decision**: Retain single-project structure; add new route files under `src/server/routes/` and new small modules in `src/auth/` for state generation, code exchange, masking, scope check, session store.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | N/A | Existing architecture sufficient |

