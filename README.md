# rainbow

A lightweight archery training journal for desktop and mobile, with English and French interfaces and local offline storage.

## Current implementation

- Create equipment setups for recurve, compound, and barebow.
- Create, resume, edit, complete, and reopen training sessions.
- Record dates, locations, distances, targets, duration, arrow counts, and notes.
- Choose a target face from a dropdown: 40, 60, 80, or 122 cm standard faces, or four-point Beursault.
- Score standard 10-zone ends with X and misses, or individual Beursault arrows with 1, 2, 3, 4, and misses.
- View Beursault honneurs, points, chapelets, and noirs in both the editor and journal.
- Save unfinished ends and drafts automatically to IndexedDB.
- Preserve the equipment configuration used in each session.
- Search the journal and review completed-session totals.
- Switch between English and French. The preference stays on the device.
- Export a JSON backup, including the currently open editor.
- Load the production application offline after its initial cache is ready.

Cloud accounts, synchronization, media attachments, and community features are not implemented yet. Data belongs to the current browser profile and origin. Backup export is implemented; a backup import interface is not yet available. No real training data is preloaded.

## Run locally

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

For offline behavior, use the production build. The development server does not install the production service worker.

```sh
npm run build
npm run preview
```

Open the URL printed by the command. Wait for “Offline ready” before disconnecting. Keep using the same origin and port: changing them creates a separate browser storage area. Localhost works for desktop development; a phone visiting another device's HTTP address needs HTTPS for service-worker support.

Browser storage is subject to quotas, clearing, and eviction. The app requests persistent storage when a session is started, but the browser may decline. Export backups until cloud synchronization is available.

## Verification

```sh
npm run check
npm test
npm run build
npm run size
npm run format:check
```

Tests exercise IndexedDB behavior using fake-indexeddb and service-worker logic using an isolated harness. They do not replace airplane-mode, installability, and lifecycle tests on actual mobile devices. See [the manual checklist](docs/OFFLINE_TESTING.md).

The size check totals all shipped JavaScript after gzip compression and enforces a 300 KiB ceiling. This is stricter than counting only the initial training route, but excludes HTML, CSS, images, and user data.

## Code organization

| Location                  | Responsibility                                                          |
| ------------------------- | ----------------------------------------------------------------------- |
| `src/routes/+page.svelte` | Application state, navigation, and autosave orchestration               |
| `src/lib/components/`     | Session fields, journal, and scoring controls                           |
| `src/lib/model.ts`        | Training types, validation, dates, and score calculations               |
| `src/lib/db.ts`           | IndexedDB schema, migrations, transactions, revision checks, and export |
| `src/lib/i18n/`           | Typed English and French interface catalogs                             |
| `src/service-worker.ts`   | Versioned application-shell caching                                     |
| `tests/`                  | Persistence, conflict, scoring, translation, and cache behavior         |
| `scripts/check-size.mjs`  | Production JavaScript size budget                                       |

Interface labels are translated; stored bow values and status identifiers are stable. User-authored names and notes are not translated. Equipment is copied into a session so future setup changes do not rewrite training history.

Read [AGENTS.md](AGENTS.md) before contributing and [PROJECT_PLAN.md](PROJECT_PLAN.md) for the product roadmap.

## Beursault scoring

The four-point Beursault face uses these inclusive counts:

| Arrow    | Honneurs | Points | Chapelets | Noirs |
| -------- | -------- | ------ | --------- | ----- |
| Miss (M) | 0        | 0      | 0         | 0     |
| 1        | 1        | 1      | 0         | 0     |
| 2        | 1        | 2      | 0         | 0     |
| 3        | 1        | 3      | 1         | 0     |
| 4        | 1        | 4      | 1         | 1     |

Each entry records one arrow. The selected, unfinished arrow is saved locally but enters the totals only when added. Training can contain any number of arrows; this does not enforce a full competition round. The three-point Bouquet Provincial face is a different format and is not included.

Target face selection is locked while scores exist, including an unfinished entry, to avoid reinterpreting training history. Previous free-text target descriptions remain intact as saved dropdown values. The IndexedDB migration assigns existing sessions to their original ten-zone scoring format, even if a custom target description contained the word Beursault. Backup schema version 2 includes the explicit scoring format.

Scoring reference: [FFTA sporting rules, four-zone Beursault card, section C.5](https://www.ffta.fr/sites/default/files/2023-12/R%C3%A9glements%20Sportifs%20et%20Arbitrage_Version%20D%C3%A9cembre%202023%20Consolid%C3%A9e.pdf). Standard face sizes: [FFTA equipment summary](https://www.ffta.fr/sites/default/files/2025-05/Extrait%20RF%20et%20MPF%20pour%20Site%20internet.pdf).

## GitHub Pages

The `Check and deploy` workflow validates branches and pull requests. Pushes to main deploy the `build` directory to GitHub Pages through its protected `github-pages` environment. Enable Pages with GitHub Actions as the source in repository settings. Private-repository Pages requires a compatible GitHub plan.

The project URL is `https://scarfi.github.io/rainbow/`. CI builds with `BASE_PATH=/rainbow`; local development defaults to `/`. To reproduce the Pages build locally:

```sh
BASE_PATH=/rainbow npm run build
BASE_PATH=/rainbow npm run preview
```

Open `/rainbow/` on the preview origin. Icons, the manifest, navigation, and the service worker honor the deployment path. The installed app stays within that path. Service-worker caches are isolated by deployment path.

The deployed site uses a different browser origin from localhost. Local training does not automatically transfer to it; export a backup before moving away from your local journal. The application currently has no account synchronization or backup import interface.

All future changes must start on a dedicated Git branch and reach main through a pull request. See AGENTS.md.
