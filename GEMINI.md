# familyboard-nodejs Development Guidelines

Last updated: 2025-11-01
Source: Synthesized from `initial-requirements.md` and `AGENTS.md`.

This document provides development guidelines for autonomous agents and human developers working on the familyboard-nodejs project.

## 1. Architecture & Technology

### Core Technologies
- **Backend**: Node.js
- **Frontend**: Single-Page Application (SPA)
- **Data Source**: Microsoft Graph API (OneDrive for photos, Outlook for calendar)
- **MS Graph SDK**: `@microsoft/microsoft-graph-client` (mandatory for all Graph calls)
- **Authentication**: OAuth 2.0 Authorization Code Flow with refresh tokens.

### Architectural Principles
- **Design**: Kiosk-style, full-screen application for unattended operation.
- **Persistence**: Local file system for configuration (`config.json`), authentication tokens (`tokens.json`), and data caches.
- **Resilience**: Operates on cached data during network/API failures.
- **Configuration**: Key settings (locale, timezone, data sources) are managed via `config.json`. No on-screen UI for configuration in kiosk mode.

## 2. Project Structure

The repository is organized as follows:

```text
backend/      # Node.js server for authentication, Graph API interaction, and serving the frontend
frontend/     # SPA source code (HTML, CSS, JavaScript)
tests/        # Automated tests
specs/        # Feature specifications and planning documents
```

## 3. Key Functional Requirements

- **Display**: A 21-day calendar view (3 rows x 7 columns) next to a photo panel.
- **Layout**: Optional golden-ratio split (calendar ≈1.618× photo).
- **Data Refresh**:
    - Calendar: Refreshes every 180 seconds and at midnight.
    - Photos: Rotate every 90 seconds.
- **Localization**: All times are converted from UTC to a configured IANA timezone. UI text supports multiple locales (e.g., `en-US`, `de-DE`).

## 4. Code Style & Conventions

- **MS Graph Usage**: A single, shared Graph client instance must be used. Do not make raw HTTP requests to the Graph API.
- **File I/O**: All writes to JSON files (config, tokens) must be atomic to prevent data corruption.
- **UI Palette**: The application UI must use a monochrome (grayscale) color scheme.
- **CSS**: Use specified CSS hooks for styling calendar elements (`.row-header`, `.column-header`, `.cell-header`, `.event`, `.current-day`).
- **Security**: Never log raw secrets or tokens. Ensure persisted files have restrictive permissions.
- **Commits**: Align commit messages with specification IDs (e.g., `FR-CAL-001`) where applicable.

## 5. Commands

*This section should be updated with project-specific commands for building, running, and testing the application.*

```bash
# Example commands (to be defined)
npm install       # Install dependencies
npm run start     # Start the application
npm run test      # Run automated tests
```

## 6. Recent Changes

- `001-kiosk-display`: Initial feature specification and agent guidelines added.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->