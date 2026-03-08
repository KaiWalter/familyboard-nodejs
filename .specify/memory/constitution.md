<!--
Sync Impact Report
Version: (none) → 1.0.0
Modified Principles: (template placeholders replaced)
Added Sections: Additional Constraints & Guidelines; Development Workflow & Quality Gates
Removed Sections: None (all template placeholders instantiated)
Templates Updated: ✅ plan-template.md (Constitution Check gates) | ✅ tasks-template.md (testing guidance aligned) | ✅ spec-template.md (no change needed) 
Deferred TODOs: None
-->

# FamilyBoard Constitution

## Core Principles

### 1. Simplicity First
All design and code MUST favor the simplest workable approach. Avoid premature abstraction,
patterns, layers, or micro-optimizations. If a feature can be delivered with a single module
and a few functions, do not introduce frameworks or elaborate scaffolding. Complexity MUST be
justified by user-visible value. The default answer to "Should we add more structure?" is "Not yet." 
**Rationale**: This is a hobby project; simplicity keeps velocity high and maintenance low.

### 2. Maintainable Code
Code MUST be readable (clear names, small functions), lightly documented where intent is not
obvious, and organized so future you can modify it quickly. No giant files (>400 lines) without
explicit split evaluation. Public-facing modules MUST have a brief top comment describing purpose.
**Rationale**: Maintainability extends project life and reduces friction when returning after breaks.

### 3. Minimal Dependencies
Every third‑party dependency MUST provide clear, immediate value (e.g., OAuth helper, date handling).
Adding a dependency REQUIRES a one-line justification in the PR/commit message. Prefer native Node.js
and lightweight libraries over large frameworks. Remove unused deps promptly. **Rationale**: Fewer
dependencies reduce upgrade risk, security surface, and mental overhead.

### 4. Lightweight Testing
Automated tests cover only deterministic data conversions and isolated internal logic. Avoid scenarios that
require mocking external services, orchestrating background schedulers, or coordinating multiple processes.
Manual smoke checks remain the mechanism for verifying integrations (MSAL, Microsoft Graph, kiosk runtime).
Skip trivial getters/setters and UI wiring. **Rationale**: Keep testing effortless so the project stays fun
while still catching regressions in our core calculations.

### 5. Sustainable Pace & Fun
Work MUST remain enjoyable. If a refactor or feature drains motivation, pause and reassess simpler
alternatives. Time-box experimental complexity (e.g., 2 hours); if not resolved, revert to simpler path.
**Rationale**: Fun sustains continuity more than rigid process.

## Additional Constraints & Guidelines

1. Technology Stack: Node.js + Vanilla/Lightweight JS for SPA (consider minimal build tooling; avoid heavy frameworks unless a feature genuinely needs them).
2. Layout: Prefer visually pleasing proportions (e.g., golden ratio) for photo vs calendar panes, but do NOT sacrifice simplicity—manual CSS acceptable before introducing layout libraries.
3. Microsoft Integrations: Limit scope to a single configured OneDrive folder and a small set of Outlook calendars (up to 5). No multi-tenant complexity unless explicitly chosen later.
4. Data Privacy: Only cache metadata necessary for rendering (event summaries, photo filenames). Do not store personal sensitive data beyond what Microsoft APIs already expose.
5. Configuration: Prefer a single JSON/YAML config file or minimal UI settings page; avoid complex admin panels.
6. Performance: Accept reasonable load times (<2s initial render). Optimize only when user experience noticeably degraded.
7. Logging: Console logging acceptable; structured logging only if troubleshooting requires it.

## Development Workflow & Quality Gates

1. Branching: One feature branch per meaningful improvement; small, frequent commits.
2. Reviews: Optional; self-review by reading diff aloud for clarity before merging.
3. Feature Slice: Each user story should be independently demoable (e.g., calendar view before photo rotation).
4. Testing Gate: Before merge run smoke test (start app, verify calendar + placeholder panel). If broken, fix before merge.
5. Dependency Gate: New dependency justification present in commit message.
6. Simplicity Gate: If a PR adds >200 lines net new code, include a brief note: "Why not simpler?".
7. Documentation: Update README if user-facing behavior changes (e.g., new config keys).

## Governance

This constitution guides decisions; when in doubt, choose the path that preserves Simplicity and Fun.
Amendments: Edit this file in a PR/commit referencing changed principle(s); bump version (see policy below).
Versioning Policy: MAJOR for redefining/removing a principle; MINOR for adding a new principle or section;
PATCH for clarifications/typo fixes. Compliance Review: Quick checklist during smoke test (simplicity, deps,
tests for core flows). If a rule is intentionally broken, include justification and optional TODO to revert.
Disagreements resolved by asking: "Does this make the project easier to resume next month?".

**Version**: 1.0.0 | **Ratified**: 2025-10-18 | **Last Amended**: 2025-10-18
