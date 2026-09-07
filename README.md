# rainbow

An archery training journal and community application for desktop and mobile.

rainbow helps archers record practice, track equipment, and understand their progress—even when training offline. Shared training will connect archers as the product grows.

## Status

Planning. No application code or GitHub remote has been configured yet.

## Product priorities

1. Individual training.
2. Community and visibility into other archers and their training.
3. Club management.
4. Events and competitions.
5. Equipment discovery and archery education.

Personal equipment tracking is part of the training foundation; product discovery comes later.

## Initial bow types

| French | English |
| --- | --- |
| Arc classique | Recurve |
| Arc à poulies | Compound |
| Arc nu | Barebow |

One profile can support multiple bow types. Bow type is separate from discipline, distance, target, and scoring format.

## Proposed technology

- Svelte, SvelteKit, and TypeScript for the responsive interface and application.
- A Progressive Web App with a service worker for installation and offline loading.
- IndexedDB through Dexie.js for local training data.
- Supabase PostgreSQL, Auth, and Storage for accounts, synchronized data, and media.
- An explicit synchronization queue and server API for safe retries and conflict handling.
- Capacitor as a possible later path to native mobile distribution.

## First milestone

Prove offline session entry: record a session in airplane mode, close and reopen the app, reconnect, and verify that all changes synchronize without duplicates or lost data.

See [the project plan](PROJECT_PLAN.md) for scope, architecture, and acceptance criteria.
